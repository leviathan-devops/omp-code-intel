/**
 * tests/st/w4.st.ts — Mode B script tests for W4 shadows + advisor (desk W4-E).
 *
 * Through the REAL modules only: src/index.ts (pluginFn — SC-14 shadow swap,
 * AP-6 zero-opt-in proof, advisor OFF/ON), src/lsp/tool.ts + src/lsp/client.ts
 * (SC-16 NO_LSP_SERVER), src/grep.ts (shadow grep output grammar), and the
 * W2 violation-store mechanics for advisor concern injection.
 *
 * CONTRACTS-W4.md (W4-E section) is the spec, row by row. DPL1 §6 SC-14/SC-16
 * and §8.6 (AP-6 shadow-without-opt-in) are the parent criteria.
 *
 * ISOLATION LAW (from harness.ts + run.ts ordering law):
 *  - Every sibling import is DYNAMIC and INSIDE the scenario body (W3-D's
 *    promoted pattern). A not-yet-landed sibling (W4-A/B/C land in parallel)
 *    degrades to an honest FAIL row carrying the import-crash message — never
 *    a suite load crash, never a fake pass.
 *  - Sandbox-absolute dirs only for fixtures. The advisor/store flow touches
 *    NO disk (module-level store only). Unique sessionIDs per scenario + each
 *    scenario drains its own violation batch, so the module-level store shared
 *    with hooks.st.ts (same plugin module instance in-process) is left empty.
 *  - Run order per run.ts: w4 scenarios run BEFORE the hooks arrays, and every
 *    w4 scenario is self-contained (own plugin() call, own sessionID).
 *
 * ROW DISCIPLINE: exact tokens only. A "SKIP …" / "PARTIAL …" prefix inside a
 * FAIL row's `got` is the honest mid-flight signal (the harness Row verdict
 * union is PASS|FAIL; orch reconciles SKIP/PARTIAL rows, never counts them
 * as passes).
 */

import { Effect } from "effect";
import { join } from "node:path";
import { writeFileSync } from "node:fs";
import { callTool, fail, mkCtx, pass, type Row, type Scenario, type TagFailure, type ToolResult } from "./harness";

/** Sibling specifiers as non-literals: tsc never resolves a module that may not have landed yet; bun resolves at call time. */
const INDEX_SPEC: string = "../../src/index";
const GREP_SPEC: string = "../../src/grep";
const LSP_TOOL_SPEC: string = "../../src/lsp/tool";
const LSP_CLIENT_SPEC: string = "../../src/lsp/client";
const NATIVES_SPEC: string = "@oh-my-pi/pi-natives";

/**
 * Run a REAL tool, capturing BOTH channels into one discriminated value:
 * `{ crashed: TagFailure }` (import crash / throw) or `{ ok: ToolResult }`
 * (returned rejection or success). Implemented on Effect.either — never
 * Effect.flip (flip would re-throw the success channel past runPromise).
 */
const runTool = (
  mod: string,
  toolId: string,
  args: Record<string, unknown>,
  ctx: ReturnType<typeof mkCtx>,
): Promise<{ crashed: TagFailure } | { ok: ToolResult }> =>
  Effect.runPromise(
    Effect.map(
      Effect.either(callTool(mod, toolId, args, ctx)),
      (e) => (e._tag === "Left" ? { crashed: e.left } : { ok: e.right }),
    ),
  );

/** A scenario body that may throw: a throw becomes an honest FAIL row. */
const asyncScenario = (name: string, body: (dir: string) => Promise<Row>): Scenario => ({
  name,
  run: (dir) =>
    Effect.catchAll(
      Effect.tryPromise({ try: () => body(dir), catch: (e) => e as Error }),
      (e) =>
        Effect.succeed(
          fail(name, `w4-crash (expected contract behavior, got throw): ${e instanceof Error ? e.message : String(e)}`),
        ),
    ),
});

type PluginFn = (input: unknown, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
type HookFn = (input: unknown, output: unknown) => Promise<unknown>;

/** Dynamic pluginFn load — throws past the asyncScenario boundary on absence (honest FAIL). */
const loadPluginFn = async (): Promise<PluginFn> => {
  const mod = (await import(INDEX_SPEC)) as Record<string, unknown>;
  const fn = (mod["default"] ?? mod["server"] ?? mod["plugin"]) as PluginFn;
  if (typeof fn !== "function") throw new Error("src/index.ts has no plugin fn export (default/server)");
  return fn;
};

const toolKeysOf = (hooks: Record<string, unknown>): string[] =>
  typeof hooks["tool"] === "object" && hooks["tool"] !== null
    ? Object.keys(hooks["tool"] as Record<string, unknown>)
    : [];

/* ------------------------------------------------------------------ */
/* SC-14 / AP-6: shadow swap through the REAL pluginFn.                */
/* ------------------------------------------------------------------ */

const sc14NoShadowClean: Scenario = asyncScenario("w4-sc14-no-shadow-no-grep-no-lsp", async () => {
  const pluginFn = await loadPluginFn();
  const hooks = await pluginFn({}, {});
  const keys = toolKeysOf(hooks);
  const hasGrep = keys.includes("grep");
  const hasLsp = keys.includes("lsp");
  const need = ["ast_grep", "omp_edit", "evidence", "eval"];
  const missing = need.filter((k) => !keys.includes(k));
  const ok = !hasGrep && !hasLsp && missing.length === 0;
  return ok
    ? pass("w4-sc14-no-shadow-no-grep-no-lsp", `AP-6 held: keys=[${keys.sort().join(",")}]`)
    : fail(
        "w4-sc14-no-shadow-no-grep-no-lsp",
        `AP-6 broken: grep=${hasGrep} lsp=${hasLsp} missingBuiltins=[${missing.join(",")}] keys=[${keys.sort().join(",")}]`,
      );
});

const sc14ShadowHasBoth: Scenario = asyncScenario("w4-sc14-shadow-has-grep-lsp", async () => {
  const pluginFn = await loadPluginFn();
  const hooks = await pluginFn({}, { shadow: ["grep", "lsp"] });
  const keys = toolKeysOf(hooks);
  const hasGrep = keys.includes("grep");
  const hasLsp = keys.includes("lsp");
  // Builtin ids must be otherwise unaffected by opting into shadows.
  const need = ["ast_grep", "omp_edit", "evidence", "eval"];
  const missing = need.filter((k) => !keys.includes(k));
  const ok = hasGrep && hasLsp && missing.length === 0;
  return ok
    ? pass("w4-sc14-shadow-has-grep-lsp", `shadow swap: keys=[${keys.sort().join(",")}]`)
    : fail(
        "w4-sc14-shadow-has-grep-lsp",
        `expected grep+lsp present and builtins intact: grep=${hasGrep} lsp=${hasLsp} missing=[${missing.join(",")}] keys=[${keys.sort().join(",")}]`,
      );
});

/* ------------------------------------------------------------------ */
/* SC-16: NO_LSP_SERVER through the REAL src/lsp modules.              */
/* ------------------------------------------------------------------ */

const NO_LSP_SERVER = "NO_LSP_SERVER";

const sc16Zzz: Scenario = asyncScenario("w4-sc16-zzz-no-lsp-server", async (dir) => {
  const ctx = mkCtx(dir, "st-w4-sc16");
  const filePath = join(dir, "x.zzz");
  writeFileSync(filePath, "zzz body\n");
  // runTool dynamic-imports src/lsp/tool (lspTool) — a missing W4-A module
  // maps to the crashed channel, i.e. an honest FAIL, never a load crash.
  const res = await runTool(LSP_TOOL_SPEC, "lspTool", { operation: "hover", file_path: filePath, line: 1, character: 1 }, ctx);
  if ("crashed" in res) {
    return fail("w4-sc16-zzz-no-lsp-server", `lspTool unreachable (W4-A not landed?): ${res.crashed.token}`);
  }
  const r16: ToolResult = res.ok;
  const want = "No LSP server available for .zzz files";
  const ok = r16.output === want && r16.metadata["error"] === NO_LSP_SERVER;
  return ok
    ? pass("w4-sc16-zzz-no-lsp-server", `exact output + metadata.error=${NO_LSP_SERVER}`)
    : fail(
        "w4-sc16-zzz-no-lsp-server",
        `expected output=${JSON.stringify(want)} error=${NO_LSP_SERVER} got output=${JSON.stringify(r16.output)} metadata=${JSON.stringify(r16.metadata)}`,
      );
});

const sc16BogusServer: Scenario = asyncScenario("w4-sc16-bogus-server-enoent-or-partial", async (dir) => {
  let clientMod: Record<string, unknown>;
  try {
    clientMod = (await import(LSP_CLIENT_SPEC)) as Record<string, unknown>;
  } catch (e) {
    return fail(
      "w4-sc16-bogus-server-enoent-or-partial",
      `PARTIAL no spec-override hook and no client module (W4-A not landed?): ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const servers = clientMod["BUILTIN_SERVERS"] as unknown;
  if (!Array.isArray(servers)) {
    return fail(
      "w4-sc16-bogus-server-enoent-or-partial",
      "PARTIAL BUILTIN_SERVERS not exported from src/lsp/client.ts — no mutable-override path and no documented spec hook; gap reported, not faked",
    );
  }
  if (Object.isFrozen(servers)) {
    return fail(
      "w4-sc16-bogus-server-enoent-or-partial",
      "PARTIAL BUILTIN_SERVERS is frozen — copy-then-mutate override path unavailable; gap reported, not faked",
    );
  }
  const probe = join(dir, "probe.ts");
  writeFileSync(probe, "export const probe = 1;\n");
  const saved: unknown[] = [...servers];
  const BOGUS = "__omp_intel_bogus_ts_server__";
  try {
    (servers as unknown[]).length = 0;
    (servers as unknown[]).push({ command: BOGUS, args: [], fileTypes: [".ts"] });
    const ctx = mkCtx(dir, "st-w4-sc16-bogus");
    const res = await runTool(
      LSP_TOOL_SPEC,
      "lspTool",
      { operation: "hover", file_path: probe, line: 1, character: 1 },
      ctx,
    );
    if ("crashed" in res) {
      // A throw carrying ENOENT-ish text is the crash-channel form of the same
      // expectation — accept it only if it names the bogus binary.
      const msg = `${res.crashed.token} ${res.crashed.detail}`;
      const ok = /not installed|ENOENT/i.test(msg) && msg.includes(BOGUS);
      return ok
        ? pass("w4-sc16-bogus-server-enoent-or-partial", `ENOENT crash channel names ${BOGUS}`)
        : fail("w4-sc16-bogus-server-enoent-or-partial", `expected ENOENT naming ${BOGUS}, got throw: ${msg.slice(0, 300)}`);
    }
    const r16b: ToolResult = res.ok;
    const ok = typeof r16b.output === "string" && r16b.output.includes("not installed") && r16b.metadata["error"] === NO_LSP_SERVER;
    return ok
      ? pass("w4-sc16-bogus-server-enoent-or-partial", `output=${JSON.stringify(r16b.output.slice(0, 120))} error=${NO_LSP_SERVER}`)
      : fail(
          "w4-sc16-bogus-server-enoent-or-partial",
          `expected output containing "not installed" + error=${NO_LSP_SERVER} got output=${JSON.stringify(r16b.output.slice(0, 300))} metadata=${JSON.stringify(r16b.metadata)}`,
        );
  } finally {
    (servers as unknown[]).length = 0;
    (servers as unknown[]).push(...saved);
  }
});

/* ------------------------------------------------------------------ */
/* Grep shadow grammar through the REAL src/grep.ts (or the named      */
/* GREP_NATIVE_UNAVAILABLE branch, whichever the d.ts reality allows). */
/* ------------------------------------------------------------------ */

const scGrepGrammar: Scenario = asyncScenario("w4-grep-grammar-or-unavailable", async (dir) => {
  let grepMod: Record<string, unknown>;
  try {
    grepMod = (await import(GREP_SPEC)) as Record<string, unknown>;
  } catch (e) {
    return fail(
      "w4-grep-grammar-or-unavailable",
      `SKIP grep grammar: src/grep.ts not landed (W4-B in flight); natives grep export present so the real-grammar branch is expected on landing: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (typeof (grepMod["grepTool"] as { execute?: unknown } | undefined)?.execute !== "function") {
    return fail(
      "w4-grep-grammar-or-unavailable",
      "SKIP grep grammar: src/grep.ts landed without an executable grepTool export; cannot assert grammar against a missing tool",
    );
  }
  writeFileSync(join(dir, "g.ts"), 'console.log("a");\nconsole.log("b");\nconst q = 1;\n');
  const ctx = mkCtx(dir, "st-w4-grep");
  const res = await runTool(GREP_SPEC, "grepTool", { pattern: "console\\.log", path: dir }, ctx);
  if ("crashed" in res) {
    if (res.crashed.token === "GREP_NATIVE_UNAVAILABLE" || res.crashed.token.includes("GREP_NATIVE_UNAVAILABLE")) {
      // Named-absent branch: valid ONLY if the natives runtime truly lacks grep.
      let nativesHasGrep = false;
      try {
        const natives = (await import(NATIVES_SPEC)) as Record<string, unknown>;
        nativesHasGrep = typeof natives["grep"] === "function";
      } catch {
        nativesHasGrep = false;
      }
      return !nativesHasGrep
        ? pass("w4-grep-grammar-or-unavailable", "exact GREP_NATIVE_UNAVAILABLE on a runtime without natives grep (named branch correct)")
        : fail(
            "w4-grep-grammar-or-unavailable",
            "GREP_NATIVE_UNAVAILABLE thrown but the natives runtime HAS a grep export — wrong branch (a silent-fallback/misroute class defect)",
          );
    }
    return fail("w4-grep-grammar-or-unavailable", `grepTool crashed: ${res.crashed.token}`);
  }
  const err = res.ok.metadata["error"];
  if (typeof err === "string" && err.includes("GREP_NATIVE_UNAVAILABLE")) {
    return fail(
      "w4-grep-grammar-or-unavailable",
      "tool returned GREP_NATIVE_UNAVAILABLE but the natives runtime HAS a grep export (d.ts line 1648) — wrong branch",
    );
  }
  const rg: ToolResult = res.ok;
  const lines = rg.output.split("\n");
  const firstOk = /^matches=\d+ files=\d+$/.test(lines[0] ?? "");
  // Canonical per-file header grammar is `[relPath]#tag` (src/ast.ts:202 and
  // src/grep.ts:180 emit the identical form — "same as ast_grep" per
  // CONTRACTS-W4 W4-B). Assert the ]# + 4-hex-tag shape, not a bare "#" lead.
  const tagHeaderOk = lines.some((l: string) => /\]#[0-9a-f]{4}/.test(l));
  const countOk = typeof rg.metadata["matchCount"] === "number" && (rg.metadata["matchCount"] as number) > 0;
  const ok = firstOk && tagHeaderOk && countOk;
  return ok
    ? pass(
        "w4-grep-grammar-or-unavailable",
        `first=${JSON.stringify(lines[0])} matchCount=${String(rg.metadata["matchCount"])} fileCount=${String(rg.metadata["fileCount"])}`,
      )
    : fail(
        "w4-grep-grammar-or-unavailable",
        `grammar broken: firstOk=${firstOk} tagHeaderOk=${tagHeaderOk} countOk=${countOk} first=${JSON.stringify(lines[0] ?? "")} metadata=${JSON.stringify(rg.metadata)} outputHead=${JSON.stringify(rg.output.slice(0, 300))}`,
      );
});

/* ------------------------------------------------------------------ */
/* Advisor OFF/ON + concern injection through the REAL pluginFn.       */
/* ------------------------------------------------------------------ */

const ADVISOR_RULES = [{ key: "no-cl", re: "console\\.log", body: "use logger" }];
const ADVISOR_OPTS = { advisor: { model: "x" }, ttsr: { rules: ADVISOR_RULES } };
const ADVISOR_MARKER = "[omp-intel rule advisor:no-cl]";

const scAdvisorOff: Scenario = asyncScenario("w4-advisor-off-no-userquery-post", async () => {
  const pluginFn = await loadPluginFn();
  const hooks = await pluginFn({}, {});
  const keys = Object.keys(hooks);
  const ok = !keys.includes("session.userQuery.post");
  return ok
    ? pass("w4-advisor-off-no-userquery-post", `advisor OFF by default: keys=[${keys.sort().join(",")}]`)
    : fail("w4-advisor-off-no-userquery-post", `advisor leaked into default hooks: keys=[${keys.sort().join(",")}]`);
});

const scAdvisorOn: Scenario = asyncScenario("w4-advisor-on-injects-concern", async () => {
  const pluginFn = await loadPluginFn();
  const hooks = await pluginFn({}, ADVISOR_OPTS);
  const post = hooks["session.userQuery.post"] as HookFn | undefined;
  if (typeof post !== "function") {
    return fail(
      "w4-advisor-on-injects-concern",
      `advisor key absent with opts {advisor:{model:"x"}} (W4-C not landed?): keys=[${Object.keys(hooks).sort().join(",")}]`,
    );
  }
  const sid = "st-w4-adv-inject";
  await post({ sessionID: sid, trajectory: [{ role: "assistant", content: "console.log(1)" }] }, {});
  const transform = hooks["experimental.chat.messages.transform"] as HookFn | undefined;
  if (typeof transform !== "function") {
    return fail("w4-advisor-on-injects-concern", "messages.transform hook missing — cannot observe concern injection");
  }
  const out = { messages: [] as unknown[] };
  const ret = await transform({}, out);
  const msgs =
    typeof ret === "object" && ret !== null && Array.isArray((ret as { messages?: unknown }).messages)
      ? ((ret as { messages: unknown }).messages as Array<{ parts?: Array<{ text?: string }> }>)
      : (out.messages as Array<{ parts?: Array<{ text?: string }> }>);
  const text = msgs.length === 1 ? (msgs[0].parts?.[0]?.text ?? "") : "";
  // Drain unconditionally so the shared module store is empty for later rows.
  await transform({}, { messages: [] });
  const ok = msgs.length === 1 && text.includes(ADVISOR_MARKER);
  return ok
    ? pass("w4-advisor-on-injects-concern", `1 concern message text=${JSON.stringify(text.slice(0, 100))}`)
    : fail(
        "w4-advisor-on-injects-concern",
        `expected 1 message including ${JSON.stringify(ADVISOR_MARKER)} got=${msgs.length} text=${JSON.stringify(text.slice(0, 300))}`,
      );
});

const scAdvisorCleared: Scenario = asyncScenario("w4-advisor-second-transform-cleared", async () => {
  const pluginFn = await loadPluginFn();
  const hooks = await pluginFn({}, ADVISOR_OPTS);
  const post = hooks["session.userQuery.post"] as HookFn | undefined;
  const transform = hooks["experimental.chat.messages.transform"] as HookFn | undefined;
  if (typeof post !== "function" || typeof transform !== "function") {
    return fail("w4-advisor-second-transform-cleared", "advisor post/transform hooks absent (W4-C not landed?) — store-consumed check unobservable");
  }
  await post({ sessionID: "st-w4-adv-cleared", trajectory: [{ role: "assistant", content: "console.log(1)" }] }, {});
  const first = (await transform({}, { messages: [] })) as { messages?: unknown[] };
  const firstLen = Array.isArray(first?.messages) ? first.messages.length : -1;
  const second = (await transform({}, { messages: [] })) as { messages?: unknown[] };
  const secondLen = Array.isArray(second?.messages) ? second.messages.length : -1;
  const ok = firstLen === 1 && secondLen === 0;
  return ok
    ? pass("w4-advisor-second-transform-cleared", "first=1 second=0 (W2 store consumed)")
    : fail("w4-advisor-second-transform-cleared", `expected first=1 second=0 got first=${firstLen} second=${secondLen}`);
});

export const scenarios: ReadonlyArray<Scenario> = [
  sc14NoShadowClean,
  sc14ShadowHasBoth,
  sc16Zzz,
  sc16BogusServer,
  scGrepGrammar,
  scAdvisorOff,
  scAdvisorOn,
  scAdvisorCleared,
];

export const scenarioNames: ReadonlyArray<string> = scenarios.map((s) => s.name);
