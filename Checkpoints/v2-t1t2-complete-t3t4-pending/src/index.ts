// src/index.ts — omp-code-intel plugin entry (W1-D + W2-C hooks).
// MiMo's loader imports this module and the tool registry consumes the
// returned Hooks: tool-map KEYS become registered tool ids verbatim
// (tool/registry.ts:246-249, 336-337 — custom ids REPLACE same-id
// builtins, so W1 registers ONLY additive ids: ast_grep, ast_edit,
// resolve, omp_edit; shadow ids grep/lsp are W4 opt-in (registered ONLY via
// opts.shadow — AP-6 zero-opt-in law) plus the advisor hook (default OFF).
// Loader shapes served: named `server` fn + function default export
// (plugin/index.ts applyPlugin: V1 `mod.default.server` detect, else the
// legacy per-export scan; server and default share one ref so the legacy
// scan dedupes them into a single invocation).
// LOADER LAW (0.1.14): the legacy per-export scan throws on ANY
// non-function export value and applyPlugin swallows the throw into
// "failed to load plugin" — a silent plugin drop. This module therefore
// exports FUNCTIONS ONLY: no `export const id` string (it poisoned the
// legacy scan); the id lives in package.json. W2 keeps this law: the
// module-level consts below (MUTATING_TOOLS, maps, pipeline slot) are
// NOT exported.

import path from "node:path";
import { z } from "zod";
import { loadOptions } from "./config";
import { astEditTool, astGrepTool, resolveTool } from "./ast";
import { ompEditTool } from "./edit";
import { evidenceTool } from "./evidence";
import { KernelManager } from "./eval/kernels";
import { newPipeline } from "./merkle";
import { compileRules, scan, reminderLine, persistContext, pushViolations, takeViolations, takeLastViolations } from "./ttsr";
import { grepTool } from "./grep";
import { lspTool } from "./lsp/tool";
import { shadowReadTool } from "./read";
import { ompMvTool } from "./mv";
import { startWatcher, PREAMBLE_PY } from "./eval/rpc";
import { advisorHooks } from "./advisor";
import { store } from "./tagstore";
import type { Ctx } from "./types";

// W2-C: exact mutating-tool set from CONTRACTS-W2 — membership gates the
// merkle record() call ("read" and other observers never append a row).
const MUTATING_TOOLS = ["edit", "write", "apply_patch", "multiedit", "notebook_edit", "omp_edit", "resolve"];

// W2-C: lazy singleton pipeline; base defaults to relative ".mimocode/omp-intel"
// inside newPipeline(). NOTE: that resolves against process.cwd() of the MiMo
// server process — in practice the project dir (per-project server), so the
// chain lands at <project>/.mimocode/omp-intel/merkle-chain.jsonl. Laziness
// keeps plugin init free of fs work; record() mkdir -ps on first write.
let pipeline: ReturnType<typeof newPipeline> | null = null;
function getPipeline() {
  return (pipeline ??= newPipeline());
}

// W3-C: lazy KernelManager singleton; base matches the merkle home
// (<project>/.mimocode/omp-intel). Laziness keeps init free of fs work.
// V2: preamble param wires the RPC injectors; extraEnv passes the RPC dir.
let km: KernelManager | null = null;
function getKm() {
  return (km ??= new KernelManager(path.join(process.cwd(), ".mimocode", "omp-intel"), undefined, {
    py: PREAMBLE_PY,
  }, { OMP_INTEL_RPC_DIR: path.join(process.cwd(), ".mimocode", "omp-intel", "eval-rpc") }));
}

// W4-C: the per-session violation store moved to src/ttsr.ts
// (pushViolations/takeViolations/takeLastViolations) so the advisor reuses the
// same consume-on-read mechanics. W2 behavior preserved: per-key consume, and
// the documented no-identity last-batch fallback (transform input carries no
// session identity, so takeLastViolations() applies the LAST stored batch —
// in a multi-session server that can misattribute one reminder by one message;
// store is consumed on read; a keyed lookup runs whenever sessionID IS present).

// W2-C: capability brief injected once per system array by
// "experimental.chat.system.transform" (gated on opts.ast).
const CAPABILITY_BRIEF =
  "omp-code-intel active: ast_grep/ast_edit/omp_edit provide hashline-tagged structural editing — prefer [path]#tag anchors from ast_grep output when editing.";

// W3-C: OMP evalSchema subset (language/code/title/timeout/reset).
const evalArgs = { language: z.enum(["py", "js"]), code: z.string(), title: z.string().optional(), timeout: z.number().optional(), reset: z.boolean().optional() };

// NOTE(types): prefer `import type { Plugin } from "@mimo-ai/plugin"`
// once node_modules lands (W1-A's bun install owns that) and type the
// signature as `Plugin`. Until then the signature is structural so this
// entry typechecks standalone.
// V2 W1-E: RPC watcher lifecycle. Started lazily on first plugin() call
// when eval is enabled; the dispatch map resolves session-scoped paths
// against process.cwd() (documented limitation — the dispatch signature
// carries no ctx; per-session worktrees resolve to the server cwd).
let rpcStop: () => void = () => {};
function ensureRpcWatcher() {
  try {
    rpcStop();
  } catch {
    // never started
  }
  rpcStop = startWatcher(path.join(process.cwd(), ".mimocode", "omp-intel"), async (name, args) => {
    if (name === "read") {
      const { readFileSync } = await import("node:fs");
      const p = String((args as Record<string, unknown>).path ?? "");
      const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
      return readFileSync(abs, "utf8");
    }
    if (name === "grep") {
      const { grep } = await import("@oh-my-pi/pi-natives");
      const a = args as Record<string, unknown>;
      return grep({ pattern: String(a.pat ?? ""), path: String(a.path ?? ".") } as never);
    }
    throw new Error(`RPC_UNKNOWN_TOOL:${name}`);
  });
}

export default async function plugin(input: any, options?: Record<string, unknown>) {
  const opts = loadOptions(options);
  // V2 W1-E: start the RPC watcher when eval is on (idempotent —
  // ensureRpcWatcher closes any previous one first).
  if ((opts.eval as unknown) !== false && (opts.eval?.py !== false || opts.eval?.js !== false)) {
    try {
      ensureRpcWatcher();
    } catch {
      // watcher failure must never fail plugin init
    }
  }
  // W1 tool map — FROZEN. W2 MUST NOT change keys or flag behavior
  // (W1 container proofs depend on the exact registration surface).
  const tool: Record<string, unknown> = {};
  if (opts.ast !== false) Object.assign(tool, { ast_grep: astGrepTool, ast_edit: astEditTool, resolve: resolveTool });
  if (opts.hashline !== false) Object.assign(tool, { omp_edit: ompEditTool });
  if (opts.merkle !== false) Object.assign(tool, { evidence: evidenceTool });
  // W3-C: persistent py/js kernels via the lazy singleton. State persists
  // across calls in the driver process; reset:true wipes that language.
  // Gates run BEFORE exec and return named rejections (never throw).
  const evalTool = {
    description:
      "Execute code in persistent py/js kernels. State persists across calls within the session; reset:true wipes that language's state and starts fresh.",
    args: evalArgs,
    async execute(args: z.infer<z.ZodObject<typeof evalArgs>>, ctx: Ctx) {
      if (args.code.trim().length === 0)
        return { output: "eval code must be non-empty", metadata: { error: "EVAL_EMPTY" } };
      if (args.language === "py" && opts.eval?.py === false)
        return { output: "eval python is disabled by plugin options", metadata: { error: "EVAL_DISABLED_PY" } };
      if (args.language === "js" && opts.eval?.js === false)
        return { output: "eval javascript is disabled by plugin options", metadata: { error: "EVAL_DISABLED_JS" } };
      const t = args.timeout;
      const timeoutMs = t === undefined || !Number.isFinite(t) ? 30000 : Math.min(120000, Math.max(1000, t));
      const dir = typeof ctx?.directory === "string" && ctx.directory.length > 0 ? ctx.directory : process.cwd();
      const r = await getKm().exec(args.language, args.code, dir, timeoutMs, args.reset === true);
      if (r.ok)
        return { output: r.stdout.trim() || "(no output)", metadata: { language: args.language, title: args.title, exit: "ok" } };
      const err = r.error ?? "EVAL_ERROR";
      const tail = (r.stdout ?? "").trim();
      return {
        output: tail.length > 0 ? `${err}\n${tail.slice(-2000)}` : err,
        metadata: {
          language: args.language,
          title: args.title,
          error: err.startsWith("KERNEL_MISSING")
            ? "KERNEL_MISSING"
            : err.startsWith("EVAL_DISABLED")
              ? err
              : err === "EVAL_TIMEOUT"
                ? "EVAL_TIMEOUT"
                : "EVAL_ERROR",
        },
      };
    },
  };
  // W3-C: eval registers iff at least one language is enabled. The !== false
  // guard is runtime-defensive (loadOptions only yields objects/undefined).
  if ((opts.eval as unknown) !== false && (opts.eval?.py !== false || opts.eval?.js !== false))
    Object.assign(tool, { eval: evalTool });
  // W4-C: shadow registration — opt-in ONLY. ids "grep"/"lsp" replace same-id
  // builtins via the registry; absent without explicit opts.shadow (AP-6).
  for (const id of opts.shadow ?? []) { if (id === "grep") Object.assign(tool, { grep: grepTool }); else if (id === "lsp") Object.assign(tool, { lsp: lspTool }); }
  // V2 W1-E: omp_mv is always additive; read shadow is opt-in ONLY
  // (replacing the hottest builtin by default would be aggressive — AP-6).
  Object.assign(tool, { omp_mv: ompMvTool });
  if ((opts.shadow ?? []).includes("read")) Object.assign(tool, { read: shadowReadTool });
  const base = {
    tool,
    // MERKLE RECORDING ORDER LAW: record() appends the JSONL row BEFORE the
    // hook returns (side-effect-before-claim). Observer-only: output NEVER mutated.
    "tool.execute.after": async (hookInput: any, output: any) => {
      if (
        opts.merkle !== false &&
        MUTATING_TOOLS.includes(hookInput.tool) &&
        !(output.metadata && (output.metadata as any).error)
      ) {
        getPipeline().record(hookInput.tool, hookInput.args, true);
      }
      const compiled = compileRules(opts.ttsr?.rules ?? []);
      const violations = scan(compiled, output.output ?? "");
      if (violations.length > 0) {
        pushViolations(hookInput.sessionID, violations);
      }
      return output;
    },
    "experimental.chat.messages.transform": async (hookInput: any, output: any) => {
      const sid = hookInput != null && typeof hookInput.sessionID === "string" ? hookInput.sessionID : undefined;
      // W4-C: consume-on-read via the shared ttsr store. Keyed lookup when a
      // sessionID IS present, else the documented last-batch fallback.
      const batch = sid !== undefined ? takeViolations(sid) : takeLastViolations();
      if (batch === null || batch.length === 0) return output; // zero-misfire: no violations → unchanged.
      output.messages.push({
        info: { role: "user", id: `omp-intel-rule-${Date.now()}` },
        parts: [{ type: "text", text: batch.map(reminderLine).join("\n") }],
      });
      return output;
    },
    "experimental.chat.system.transform": async (_hookInput: any, output: any) => {
      if (opts.ast !== false && !output.system.some((l: string) => l.includes("omp-code-intel active:"))) {
        output.system.push(CAPABILITY_BRIEF);
      }
      return output;
    },
    "experimental.session.compacting": async (_hookInput: any, output: any) => {
      const compiled = compileRules(opts.ttsr?.rules ?? []);
      if (compiled.length > 0) output.context.push(...persistContext(compiled));
      return output; // never touch output.prompt.
    },
    event: async (hookInput: any) => {
      try {
        if (hookInput?.event?.type === "file.edited") {
          const p =
            hookInput.event.properties?.file ?? hookInput.event.file ?? hookInput.event.properties?.filePath;
          // TagStore keys are absolute (src/edit.ts resolveAbs): resolve relative
          // event paths against the server cwd to hit the same key space.
          if (typeof p === "string") store.invalidate(path.isAbsolute(p) ? p : path.join(process.cwd(), p));
        }
      } catch (e) {
        console.warn("[omp-code-intel] event hook:", (e as any)?.message ?? e);
      }
    },
    // W3-C (SC-11): kernels die with the session (the killAll swallow is this module's only catch-all).
    // V2 W1-E: the RPC watcher stops alongside (returns are fire-and-forget;
    // the watcher's own close is guarded inside its stop fn).
    "session.post": async (_hookInput: any, _output: any) => {
      try {
        rpcStop();
      } catch {
        // watcher never started or already stopped
      }
      getKm().killAll().catch(() => {});
    },
  };
  // W4-C: advisor wiring — default OFF. advisorHooks returns {} unless
  // opts.advisor?.model is set, so the key stays absent unless opted in.
  // (Spread form keeps the literal's method types for the ST suite's indexed calls.)
  const adv = advisorHooks(opts);
  if (adv["session.userQuery.post"]) return { ...base, "session.userQuery.post": adv["session.userQuery.post"] };
  return base;
}

export const server = plugin;
