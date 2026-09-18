// GI-OMP extension factory — T-4. Dedicated sibling to trident-omp.
// pi.zod schemas (JSON-schema-only is a silent skip on this runtime).

import * as fs from "node:fs";
import * as path from "node:path";
import { blastRadius, chainCalls, countTypedNodes, gateAdvisory, getMeta, impact, safeDelete, unwiredNodes, whoCalls, wouldBreak } from "./typed-write.ts";
import { GiScopeError, openSessionStore } from "./store-open.ts";
import { GiPathError } from "../scoping/index.ts";
import { attachGiGraphGate } from "./gate-hook.ts";
import { clearGiRegistry, GiClearError } from "./gi-registry.ts";
import { populateSessionStore } from "./populate.ts";
import { corbellCheckoutPath, isCorbellCheckoutFreshFor } from "./populate-corbell.ts";
import { graphifyOutPath, isGraphifyCheckoutFreshFor } from "./populate-graphify.ts";
import { ripwireCallers, ripwireDeadCode, ripwireEditCheck, ripwireImpact, ripwirePath, ripwireSafeDelete, ripwireVerify, type RipwireLeg } from "./ripwire-bridge.ts";
import { createBugHuntTool } from "../hunter/tools/bug-hunt.ts";
import { runQueryTool } from "../hunter/tools/query-registration.ts";
import type { QueryVerb } from "../hunter/surface/query-tool.ts";

export const GI_TOOL_NAMES = ["graph-probe", "graph-query", "bug-hunt", "aether-code-audit"] as const;
// Backwards-compatible alias: the pre-rename tool name. Registered alongside
// aether-code-audit with the SAME execute (one shared handler, zero drift).
// Removal: only on explicit operator order (never silently drop the alias).
export const GI_TOOL_NAMES_ALIASES = { "graph-code-audit": "aether-code-audit" } as const;
  // Shared H12 confinement — used by BOTH graph-query and aether-code-audit.
// The parse→confine→error pattern at each call site is intentionally thin:
// the LOGIC lives in confineTargetPath (single implementation).
// realpath,
// isDirectory, and the GI_TARGET_ROOTS/cwd+/tmp allowlist.
// W11 (frozen-scan HIGH): populate serialization — concurrent graph-query
// calls raced countTypedNodes + repopulate on the same store (double-repop,
// interleaved supersede). One in-process lane; queries await their turn.
let populateLane: Promise<void> = Promise.resolve();
const withPopulateLane = async <T>(fn: () => Promise<T>): Promise<T> => {
  const run = populateLane.then(fn, fn);
  populateLane = run.then(() => undefined, () => undefined);
  return run;
};
// W44 (qwen scan HIGH): the audit-ledger containment judged the mkdtemp dir
// with a raw `ledgerReal.startsWith(resolve(targetRoot) + path.sep)` — a
// string PREFIX check (the exact W16 class: breaks for targetRoot "/" which
// builds "//", and for any sibling sharing the prefix when sep is dropped).
// The verdict is component-based, one exported seam, tested.
export function ledgerDirConfined(ledgerReal: string, targetReal: string): boolean {
  const rel = path.relative(targetReal, ledgerReal);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
const confineTargetPath = (normalized: string, callerCwd: string): { ok: true; real: string } | { ok: false; error: string } => {
  let real = normalized;
  try { real = fs.realpathSync(normalized); } catch {
    return { ok: false, error: `GI_PATH_DENIED: targetPath does not exist: '${normalized.slice(0, 120)}'` };
  }
  let st: import("node:fs").Stats | null = null;
  try { st = fs.statSync(real); } catch { st = null; }
  if (!st || !st.isDirectory()) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath is not a directory: '${real.slice(0, 120)}'` };
  }
  // V21 cleanup: separator ':' on this Linux host; '|' also accepted so
  // Windows-style drive-letter roots can be listed unsplit (documented escape).
  const allowRoots = (process.env.GI_TARGET_ROOTS ?? "")
    .split('|').flatMap((p2) => /^[A-Za-z]:$/.test(p2.trim()) ? [p2.trim()] : p2.split(':')).map((r) => r.trim()).filter((r) => r.length > 0);
  const roots = allowRoots.length > 0 ? allowRoots : [callerCwd, "/tmp"];
  const within = roots.some((root) => {
    // P1.2.3 (W2/W3): the allowlist ROOT is canonicalized before the compare —
    // a symlinked GI_TARGET_ROOTS entry (or symlinked cwd) vs the realpath'd
    // target compared against a resolve-only base was a false-allow/deny class.
    let rootReal: string | null = null;
    try { rootReal = fs.realpathSync(root); } catch { rootReal = null; }
    if (rootReal === null) return false; // unresolvable root proves nothing — fail closed
    const rel = path.relative(rootReal, real);
    return rel === "" || (!rel.split(/[\\/]/).includes("..") && !path.isAbsolute(rel));
  });
  if (!within) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath '${real.slice(0, 120)}' is outside the allowed roots (${roots.join(":").slice(0, 120)}); set GI_TARGET_ROOTS to extend` };
  }
  return { ok: true, real };
};


type Zodish = {
string: () => { optional: () => unknown };
enum: (v: [string, ...string[]]) => unknown;
object: (shape: Record<string, unknown>) => unknown;
};

export interface GiExtensionAPI {
zod: Zodish;
registerTool: (tool: {
  name: string;
  description: string;
  parameters: unknown;
  execute: (...args: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }>;
}) => void;
on?: (event: string, handler: (event: unknown, ctx: unknown) => unknown) => void;
}
function textResult(text: string, details: Record<string, unknown>) {
return { content: [{ type: "text" as const, text }], details };
}

/** Fail-soft ripwire leg (qwen 8a24ae08): store-primary survives a leg throw. */
function safeRipwire(fn: () => import("./ripwire-bridge.ts").RipwireLeg): import("./ripwire-bridge.ts").RipwireLeg {
try {
  return fn();
} catch (e) {
  return { present: false, ok: false, summary: "absent (leg threw: " + String(e instanceof Error ? e.message : e).slice(0, 80) + ")", data: {} };
}
}

/** layerId sanitize (qwen 8a24ae08: no ../ or separators into ledgerDir).
 *  V21 cleanup: an EXPLICIT invalid template is a loud rejection
 *  (HUNTER_TEMPLATE_INVALID) — silent coercion to the default masked caller
 *  mistakes. Empty/absent still resolves to the documented default. */
function sanitizeLayerId(raw: string): { ok: true; layerId: string } | { ok: false; error: string } {
const t = raw.trim();
if (t === "") return { ok: true, layerId: "R28-sro-graph" };
if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/.test(t)) {
return { ok: false, error: `HUNTER_TEMPLATE_INVALID: '${t.slice(0, 64)}' is not a valid layerId (allowed: alnum . _ -, <= 64 chars)` };
}
return { ok: true, layerId: t };
}

/** Shared graph-query verb dispatch (default + graphify legs — identical verbs, different popNote). */
async function runGraphQueryVerbs(
verb: string,
p: Record<string, unknown>,
storePath: string,
scopeRoot: string,
sessionId: string,
popNote: string,
substrate?: string,
): Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }> {
if (verb === "who-calls") {
  const sym = String(p.target ?? p.symbol ?? "");
  if (sym.trim() === "") return textResult("QUERY_INVALID: target required (who-calls needs a symbol)", { ok: false, error: "QUERY_INVALID", verb });
  const q = whoCalls(storePath, sym); // (legs isolated below — a ripwire throw keeps this primary)
  const head = q.callers.slice(0, 20).map((c) => `${c.caller} (${c.file}:${c.line})`).join("\n");
  // RIPWIRE CROSS-CHECK (complete delegation): the session-store callers
  // stay primary; the live-tree ripwire leg rides the same result, named.
  const rw = safeRipwire(() => ripwireCallers(scopeRoot, sym));
  return textResult(`${popNote}rows=${q.rows}\n${head}\nripwire: ${rw.summary}`, { ok: true, rows: q.rows, names: q.names, callers: q.callers, substrate: substrate ?? "indexer-fallback", ripwire: rw });
}
if (verb === "blast-radius") {
  const b = blastRadius(storePath, String(p.target ?? p.symbol ?? ""));
  const rw = safeRipwire(() => ripwireImpact(scopeRoot, String(p.target ?? p.symbol ?? "")));
  return textResult(`rows=${b.nodes.length} root=${b.root} depth=${b.depth}\nripwire: ${rw.summary}`, { ok: true, rows: b.nodes.length, root: b.root, depth: b.depth, nodes: b.nodes, ripwire: rw });
}
if (verb === "would-break") {
  const sym = String(p.target ?? p.symbol ?? "");
  const w = wouldBreak(storePath, sym, String(p.proposed ?? ""));
  const rw = safeRipwire(() => ripwireEditCheck(scopeRoot, sym));
  return textResult(`callers=${w.callers} argsUnknown=${w.argsUnknown}\nripwire: ${rw.summary}`, { ...w, ripwire: rw, ok: (w as { ok?: boolean }).ok !== false });
}
if (verb === "unwired") {
  const u = unwiredNodes(storePath);
  const head = u.slice(0, 20).map((r) => `${r.name} (${r.file}:${r.line})`).join("\n");
  const rw = safeRipwire(() => ripwireDeadCode(scopeRoot));
  return textResult(`rows=${u.length}\n${head}\nripwire: ${rw.summary}`, { ok: true, rows: u.length, names: u.map((r) => r.name), unwired: u, ripwire: rw });
}
if (verb === "chain") {
  const from = String(p.from ?? p.target ?? p.symbol ?? "");
  const to = String(p.to ?? "");
  const steps = chainCalls(storePath, from, to);
  const head = steps.map((s) => `${s.from} -> ${s.to} [${s.kind}]`).join("\n");
  const rw = safeRipwire(() => (to.length > 0 ? ripwirePath(scopeRoot, from, to) : { present: true, ok: false, summary: "skipped (no `to` argument)", data: {} }));
  return textResult(`rows=${steps.length}\n${head}\nripwire: ${rw.summary}`, { ok: true, rows: steps.length, steps, ripwire: rw });
}
if (verb === "impact") {
  const sym = String(p.target ?? p.symbol ?? "");
  const im = impact(storePath, sym, 8);
  const head = im.ledger.slice(0, 20).map((r) => `${r.symbol}@depth${r.depth} (${r.file}:${r.line}) via ${r.via}`).join("\n");
  const rw = safeRipwire(() => ripwireImpact(scopeRoot, sym));
  return textResult(`${popNote}impact_reaches=${im.reaches}\n${head}\nhint=${im.hint}\nripwire: ${rw.summary}`, { ok: true, rows: im.reaches, impact_reaches: im.reaches, ledger: im.ledger, hint: im.hint, ripwire: rw });
}
if (verb === "safe-delete") {
  const sym = String(p.target ?? p.symbol ?? "");
  const sd = safeDelete(storePath, sym);
  const head = sd.callers.slice(0, 20).map((c) => `${c.caller} (${c.file}:${c.line})`).join("\n");
  const rw = safeRipwire(() => ripwireSafeDelete(scopeRoot, sym));
  return textResult(`${popNote}safe_delete: ${sym} callers=${sd.callers.length} reaches=${sd.reaches} uses=${sd.uses.length} testReach=${sd.testReach.length}\n${head}\nripwire: ${rw.summary}`, { ...sd, ripwire: rw, ok: (sd as { ok?: boolean }).ok !== false });
}
if (verb === "gate") {
  const dialRaw = String((p as Record<string, unknown>).dial ?? "STEER").toUpperCase();
  const sym = String(p.target ?? p.symbol ?? "");
  // RIPWIRE EDIT-CHECK DELEGATION (the W4 seam): the mandate's own verb —
  // "did SYM's contract change, and which callers no longer fit".
  const rw = safeRipwire(() => ripwireEditCheck(scopeRoot, sym));
  const ga = gateAdvisory(storePath, [sym], dialRaw === "FULL" ? "FULL" : "STEER", { ok: rw.ok, summary: rw.summary });
  return textResult(`${popNote}${ga.advisory}`, { ...ga, ripwire: rw, ok: (ga as { ok?: boolean }).ok !== false });
}
if (verb === "verify") {
  // RIPWIRE CLAIM VERIFY (new verb): the claim language is CLOSED —
  // calls(A,B) · uses(SYM) · unused(SYM) · contains(FILE,"LIT") ·
  // defines(FILE,SYM) · reaches(SYM,"FILE"|LAYER). Refused/absent are named.
  const claim = String(p.target ?? p.symbol ?? "");
  if (claim.length === 0) {
    return textResult("VERIFY_INVALID: claim required (closed shapes: calls(A,B), uses(SYM), unused(SYM), contains(FILE,\"LIT\"), defines(FILE,SYM), reaches(SYM,FILTER))", { ok: false, error: "VERIFY_INVALID" });
  }
  const rw = safeRipwire(() => ripwireVerify(scopeRoot, claim));
  return textResult(`${popNote}verify: ${rw.summary}`, { ...rw.data, ripwire: rw, ok: rw.ok, error: rw.ok ? undefined : (rw.present ? "VERIFY_FAILED" : "RIPWIRE_ABSENT") });
}
if (verb === "must-implement" || verb === "rule" || verb === "violations" || verb === "consistency") {
  // COVERAGE DELEGATION: these verbs have no typed-write twin — they read
  // the hunt substrate (graph_nodes lineage / compiled_predicates /
  // findings) through the ported runQueryTool, READ-ONLY over THIS
  // session store. The 5 verbs above stay on typed-write (no regression).
  const sym = String(p.target ?? p.symbol ?? "");
  const delegated = await runQueryTool({
    sessionId,
    scopeRoot,
    verb: verb as QueryVerb,
    symbol: sym || undefined,
    from: typeof p.from === "string" ? p.from : undefined,
    to: typeof p.to === "string" ? p.to : undefined,
    ruleId: sym || undefined,
    proposed: typeof p.proposed === "string" ? p.proposed : undefined,
  });
  let items: unknown[];
  try {
    const parsed: unknown = JSON.parse(delegated);
    if (!Array.isArray(parsed)) return textResult(`QUERY_DELEGATION_INVALID: verb ${verb} delegation returned non-array`, { ok: false, error: "QUERY_DELEGATION_INVALID", verb });
    items = parsed;
  } catch {
    return textResult(`QUERY_DELEGATION_INVALID: verb ${verb} delegation unparseable`, { ok: false, error: "QUERY_DELEGATION_INVALID", verb });
  }
  return textResult(`${popNote}rows=${items.length}\n${delegated}`, { ok: true, verb, rows: items.length, items });
}
return textResult(`rows=0`, { ok: true, rows: 0, verb });
}

export function registerGiOmpTools(pi: GiExtensionAPI, cwdOf: (ctx?: { cwd?: string; sessionID?: string }) => string): string[] {
const zstr = () => pi.zod.string();
const obj = (shape: Record<string, unknown>) => pi.zod.object(shape);

pi.registerTool({
  name: "graph-probe",
  description: "GI-OMP health probe. Returns PROBE_TOOL_OK + session identity. action=wipe is env-gated.",
  parameters: obj({ i: zstr().optional(), echo: zstr().optional(), action: zstr().optional() }),
  execute: async (_id, params, _sig, _upd, ctx) => {
    const p = (params && typeof params === "object" ? params : {}) as { echo?: string; action?: string };
    if (String(p.action ?? "").toLowerCase() === "wipe") {
      // CRITICAL fix (frozen scan): defense-in-depth AT the tool layer — the
      // description promises an env gate; the deep gate lives inside
      // clearGiRegistry (GI_OMP_ALLOW_CLEAR, code GI_CLEAR_REFUSED). The tool
      // now refuses with the SAME env + code before touching the registry.
      if (process.env.GI_OMP_ALLOW_CLEAR !== "1") {
        return textResult("GI_CLEAR_REFUSED: action=wipe requires GI_OMP_ALLOW_CLEAR=1 in the environment", { ok: false, error: "GI_CLEAR_REFUSED" });
      }
      try {
        clearGiRegistry();
        // W11 (frozen-scan HIGH): the wipe leaves an audit trail (who/when) —
        // an unlogged global wipe from a session-scoped tool was unauditable.
        // W13 (frozen-scan HIGH): the audit write is CONFINED (raw cwdOf no
        // longer derives the registry path) and its failure is LOUD in the
        // response — a silently-dropped audit line was unauditable.
        const wipeCwd = cwdOf(ctx);
        const wipeConfined = confineTargetPath(path.normalize(wipeCwd), wipeCwd);
        let auditNote = "";
        if (wipeConfined.ok) {
          try {
            const { setMeta } = await import("./typed-write.ts");
            setMeta(path.join(wipeConfined.real, ".omp", "graph-intelligence", "registry.sqlite"), "last_wipe", `${ctx?.sessionID ?? "unknown-session"}@${new Date().toISOString()}`);
          } catch (auditErr) {
            auditNote = `\nWIPE_AUDIT_FAILED: ${auditErr instanceof Error ? auditErr.message : String(auditErr)}`;
          }
        } else {
          auditNote = `\nWIPE_AUDIT_FAILED: ${wipeConfined.error}`;
        }
        if (auditNote) {
          // W17: machine-readable — details.ok stays true (the wipe happened)
          // but wipeAudited=false lets programmatic callers detect the gap.
          return textResult("GI_CLEARED" + auditNote, { ok: true, token: "GI_CLEARED", wipeAudited: false });
        }
        return textResult("GI_CLEARED", { ok: true, token: "GI_CLEARED", wipeAudited: true });
      } catch (e) {
        // frozen-scan HIGH: `"code" in err` threw on a primitive rejection —
        // narrow with in/typeof instead (checked surface kept small).
        let code = "GI_CLEAR_REFUSED";
        if (e !== null && typeof e === "object" && "code" in e) {
          const c: unknown = e.code;
          if (typeof c === "string" && c.length > 0) code = c;
        }
        return textResult(`${code}: ${String(e)}`, { ok: false, error: code });
      }
    }
    const sessionID = String((ctx as { sessionID?: string } | undefined)?.sessionID ?? "default");
    return textResult(
      JSON.stringify({ token: "PROBE_TOOL_OK", sessionID, echo: p.echo ?? null }),
      { ok: true, token: "PROBE_TOOL_OK", sessionID },
    );
  },
});
pi.registerTool({
  name: "graph-query",
  description: "Parse-grade GI query against THIS session store only. Verbs: who-calls, blast-radius, would-break, unwired, chain, impact (upstream closure + depth ledger), safe-delete (callers + reaches + uses + test-reach), gate (STEER/FULL caller advisory), verify (ripwire claim check: calls(A,B) uses(SYM) unused(SYM) contains(FILE,LIT) defines(FILE,SYM) reaches(SYM,FILTER)), must-implement, rule, violations, consistency. Params substrate+targetPath select the graphify leg (explicit absolute targetPath). Every twin verb appends a `ripwire:` cross-check line (store-primary, live-tree ripwire leg named).",
  parameters: obj({
    i: zstr().optional(),
    verb: zstr(),
    target: zstr().optional(),
    symbol: zstr().optional(),
    from: zstr().optional(),
    to: zstr().optional(),
    proposed: zstr().optional(),
    sessionId: zstr().optional(),
    dial: zstr().optional(),
    substrate: zstr().optional(),
    targetPath: zstr().optional(),
  }),
  execute: async (_id, params, _sig, _upd, ctx) => {
    const p = params && typeof params === "object" ? params as Record<string, unknown> : {};
    const verb = String(p.verb ?? "");
    const verbs = ["who-calls", "blast-radius", "would-break", "unwired", "chain", "impact", "safe-delete", "gate", "verify", "must-implement", "rule", "violations", "consistency"];
    if (!verbs.includes(verb)) {
      return textResult("QUERY_INVALID: " + verb, { ok: false, error: "QUERY_INVALID" });
    }
    // W8 (frozen-scan HIGH): twin verbs require a non-empty target — an empty
    // one resolved to garbage or a full-table scan in the dispatcher below.
    if (["who-calls", "impact", "safe-delete", "gate", "blast-radius", "would-break"].includes(verb) && String(p.target ?? p.symbol ?? "").trim() === "") {
      return textResult(`QUERY_INVALID: verb '${verb}' requires a non-empty target`, { ok: false, error: "QUERY_INVALID" });
    }
    let callerId = "omp-default-session";
    if (ctx && typeof ctx === "object" && "sessionID" in ctx && typeof (ctx as { sessionID?: unknown }).sessionID === "string" && String((ctx as { sessionID: string }).sessionID).length > 0) {
      callerId = String((ctx as { sessionID: string }).sessionID);
    }
    const sessionId = callerId;
    const substrate = typeof p.substrate === "string" ? p.substrate : "";
    const targetPathRaw = typeof p.targetPath === "string" ? p.targetPath : "";
    // TARGET-PATH SCOPE (graphify leg): an explicit absolute targetPath pins
    // the query root (the operator-built graph.json tree); otherwise the
    // caller cwd. A non-absolute targetPath is the named GI_PATH_DENIED.
    let scopeRoot = cwdOf(ctx && typeof ctx === "object" && "cwd" in ctx ? ctx as { cwd?: string } : undefined);
    const callerCwd = cwdOf(ctx && typeof ctx === "object" && "cwd" in ctx ? ctx as { cwd?: string } : undefined);
    if (targetPathRaw.length > 0) {
      if (!path.isAbsolute(targetPathRaw)) {
        return textResult(`GI_PATH_DENIED: targetPath must be absolute, got '${targetPathRaw.slice(0, 120)}'`, { ok: false, error: "GI_PATH_DENIED" });
      }
      const confined = confineTargetPath(path.normalize(targetPathRaw), callerCwd);
      if (!confined.ok) {
        return textResult(confined.error, { ok: false, error: "GI_PATH_DENIED" });
      }
      scopeRoot = confined.real;
    } else {
      const defaultConfined = confineTargetPath(cwdOf(ctx), cwdOf(ctx));
      if (!defaultConfined.ok) {
        return textResult(defaultConfined.error, { ok: false, error: "GI_PATH_DENIED" });
      }
      scopeRoot = defaultConfined.real;
    }
    try {
      const opened = openSessionStore({ sessionId, scopeRoot, callerSessionId: callerId });
      // THE GRAPHIFY LEG (GI-OMP full-port W1 follow-up): substrate==='graphify'
      // routes to the graphify graph.json leg — freshness vs graph.json mtime,
      // then populateSessionStore(..., {substrate:'graphify'}). HIT flows into
      // the SAME verb dispatch below with a substrate=graphify note; MISS is
      // LOUD (ok:false + GRAPHIFY_NOT_WARM/GRAPH_EMPTY + the rebuild remedy),
      // never a corbell substitute.
      if (substrate === "graphify") {
        const graphPath = graphifyOutPath(scopeRoot);
        const fresh = isGraphifyCheckoutFreshFor(scopeRoot, graphPath);
        if (!fresh.fresh) {
          const reason = `GRAPHIFY_NOT_WARM:${fresh.reason}`;
          return textResult(`${reason}: no warm graphify graph at ${graphPath} (rebuild with: bun scripts/graphify-build.ts --target '${scopeRoot}')`, { ok: false, error: reason.split(":")[0], reason, graphPath });
        }
        const pop = await withPopulateLane(() => populateSessionStore(opened.storePath, scopeRoot, "graphify-" + Date.now().toString(36), { substrate: "graphify" }));
        if (pop.skipped || (pop.fallbackReason ?? "").length > 0) {
          const reason = pop.fallbackReason ?? "GRAPHIFY_NOT_WARM:miss";
          return textResult(`${reason}: graphify populate missed (graph=${graphPath}; rebuild with: bun scripts/graphify-build.ts --target '${scopeRoot}')`, { ok: false, error: reason.split(":")[0], reason, graphPath });
        }
        const popNote = `substrate=graphify graph=${graphPath} nodes=${pop.nodes} edges=${pop.edges}\n`;
        return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, "graphify");
      }
      // THE SUBSTRATE LAW, reconcile edition: the store RECORDS its substrate
      // (gi_meta). Queries SURFACE it ALWAYS - a regex-populated store must
      // never silently masquerade once corbell is warm. When a warm checkout
      // exists and the store was populated by the fallback (or predates the
      // ledger), repopulate from corbell so the upgrade takes effect.
      let popNote = "";
      // W17+W19: the emptiness/stale reads below are the FAST PATH; the
      // authoritative emptiness re-check runs INSIDE the populate lane
      // callback (a concurrent query that populated first makes this one
      // skip cleanly — no duplicate repopulates).
      const stored = getMeta(opened.storePath, "substrate");
      const empty = countTypedNodes(opened.storePath) === 0;
      const warmPath = corbellCheckoutPath(scopeRoot);
      const warm = empty ? { fresh: false } : isCorbellCheckoutFreshFor(scopeRoot, warmPath);
      if (empty || (warm.fresh && stored !== "corbell")) {
        const pop = await withPopulateLane(() => populateSessionStore(opened.storePath, scopeRoot));
        popNote = `substrate=${pop.substrate}${pop.fallbackReason ? ` reason=${pop.fallbackReason}` : ""}\n`;
        return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, pop.substrate);
      } else {
        popNote = `substrate=${stored ?? "indexer-fallback"}\n`;
        return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, stored ?? "indexer-fallback");
      }
    } catch (e) {
      const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code: unknown }).code) : "GI_QUERY_FAIL";
      return textResult(`${code}: ${String(e instanceof Error ? e.message : e)}`, { ok: false, error: code });
    }
  },
});

// bug-hunt is owned by the ported adapter (src/hunter/tools/bug-hunt.ts):
// action=status reads the session store (unwired count + fix order);
// action=hunt runs the REAL micro-loop under hunt-lock (fail-closed
// INCONCLUSIVE as RESULT, HUNT_DONE + report artifact on success).
createBugHuntTool(pi, { cwdOf });

// aether-code-audit: bound to the hydra auditor run path (W7). execute routes
  // {targetPath} → runTemplateAudit (src/hydra/auditor.ts, deterministic sweep over
  // the operator-built graph.json via the EN-38 guarded reader) → findings +
  // reportPath, {ok:true, findings, reportPath}. Default template R28-sro-graph;
  // {template} selects any of the 14 layerIds. GI_AUDIT_NOT_WIRED SURVIVES as the
  // degraded path ONLY after a real attempt: graph.json missing (GRAPHIFY_NOT_WARM),
  // oversize (GRAPHIFY_GRAPH_TOO_LARGE), unparseable (GRAPHIFY_EXTRACT_FAILED), or
  // template invalid (HUNTER_TEMPLATE_INVALID) — a stub-shaped error is legal ONLY
  // when named after a real attempt. PORTED FROM v443-en38 fork hydra/aether-auditor.ts
  // runLayerHunter settlement contract (fulfilled → ok:true, rejected → ok:false).
  // NAME (operator order 2026-09-15): aether-code-audit — the fork file is
  // aether-auditor.ts, the engine is the aether audit engine; graph-code-audit
  // survives ONLY as the backwards-compatible alias below (same execute).
  const aetherAuditExecute = async (_id: unknown, params: unknown, _sig: unknown, _upd: unknown, ctx: unknown) => {
    const p = (params && typeof params === "object" ? params : {}) as { targetPath?: string; template?: string };
    const scopeRoot = cwdOf(ctx && typeof ctx === "object" && "cwd" in ctx ? ctx as { cwd?: string } : undefined);
    const targetRaw = String(p.targetPath ?? "").trim();
    if (targetRaw !== "" && !path.isAbsolute(targetRaw)) {
      return textResult(`GI_PATH_DENIED: targetPath must be absolute, got '${targetRaw.slice(0, 120)}'`, { ok: false, error: "GI_PATH_DENIED" });
    }
    // CRITICAL fix (qwen 6768692f): the audit handler gets the SAME H12
    // confinement as graph-query — realpath + isDirectory + GI_TARGET_ROOTS/
    // cwd+/tmp allowlist, BEFORE any ledgerDir write or graph read.
    let targetRoot: string;
    if (targetRaw !== "") {
      const confined = confineTargetPath(path.normalize(targetRaw), scopeRoot);
      if (!confined.ok) {
        return textResult(confined.error, { ok: false, error: "GI_PATH_DENIED" });
      }
      targetRoot = confined.real;
    } else {
      // V21 cleanup: the default root is confined too — resolve + verify the
      // cwd exists (a deleted cwd must not become a ghost ledger root).
      const confined = confineTargetPath(path.resolve(scopeRoot), scopeRoot);
      if (!confined.ok) {
        return textResult(confined.error, { ok: false, error: "GI_PATH_DENIED" });
      }
      targetRoot = confined.real;
    }
    const sanitized = sanitizeLayerId(String(p.template ?? ""));
    if (!sanitized.ok) {
      return textResult(sanitized.error, { ok: false, error: "HUNTER_TEMPLATE_INVALID" });
    }
    const layerId = sanitized.layerId;
    try {
      // Function-local dynamic imports (NOT top-of-file statics): the audit-bind
      // Named exception to the static-import law: the specifiers are tree-relative
      // and bun-bundler-visible (bun inlines static-string dynamic imports at build
      // time — verified — so the deployed bundle carries the auditor).
      const [{ templateByLayerId }, { runTemplateAudit }] = await Promise.all([
        import("../hydra/templates/index.ts"),
        import("../hydra/auditor.ts"),
      ]);
      const { join, resolve } = await import("node:path");
      const template = templateByLayerId(layerId);
      if (!template) {
        return textResult(`GI_AUDIT_NOT_WIRED: HUNTER_TEMPLATE_INVALID: unknown template '${layerId}' | ripwire: engine-binding=auditor template=invalid`, {
          error: "GI_AUDIT_NOT_WIRED",
          cause: "HUNTER_TEMPLATE_INVALID",
        });
      }
      // frozen-scan HIGH: Date.now() alone collides on concurrent audits —
      // add an entropy suffix.
      // W12 (frozen-scan HIGH): mkdtemp creates the dir ATOMICALLY (unique +
      // 0700, O_EXCL semantics) — the old mkdirSync(recursive) on a
      // predictable prefix followed a pre-planted symlink and created
      // directories outside the root before the confine check ran.
      // W44: ONE canonical base for every ledger verdict below (the old code
      // re-resolved targetRoot per check).
      const targetReal = resolve(targetRoot);
      const auditRoot = join(targetReal, ".omp", "graph-intelligence", "audit");
      fs.mkdirSync(auditRoot, { recursive: true });
      // W15/W16 (frozen-scan HIGH): component containment on the AUDIT ROOT —
      // refuse a pre-planted symlink BEFORE mkdtemp (path.relative verdict,
      // never a string prefix).
      const auditRootReal = fs.realpathSync(auditRoot);
      const ledgerRel = path.relative(targetReal, auditRootReal);
      if (ledgerRel === "" || ledgerRel.startsWith("..") || path.isAbsolute(ledgerRel)) {
        return textResult("GI_LEDGER_DENIED: audit root is a symlink plant", { ok: false, error: "GI_LEDGER_DENIED" });
      }
      const ledgerDir = fs.mkdtempSync(join(auditRoot, `${layerId}-`));
      const ledgerReal = fs.realpathSync(ledgerDir);
      if (!ledgerDirConfined(ledgerReal, targetReal)) {
        return textResult("GI_LEDGER_DENIED: evidence dir escaped the target root (symlink plant?)", { ok: false, error: "GI_LEDGER_DENIED" });
      }
      const graphPath = join(resolve(targetRoot), "graphify-out", "graph.json");
      const settlement = await runTemplateAudit({ template, ledgerDir, targetRoot, graphPath });
      if (settlement.status === "fulfilled") {
        // W28 (frozen-scan HIGH): re-confine the auditor-returned ledgerDir —
        // a divergent/compromised return must not point reads outside the root.
        // W40: allowlist base = the AUDIT TARGET root (a settlement ledger
        // under a different root than the query target is the escape case).
        const reportConfined = confineTargetPath(settlement.ledgerDir, targetRoot);
        if (!reportConfined.ok) {
          return textResult(`GI_LEDGER_DENIED: settlement ledger escaped the root (${reportConfined.error})`, { ok: false, error: "GI_LEDGER_DENIED" });
        }
        const reportPath = join(reportConfined.real, "findings", "report.md");
        return textResult(`AUDIT_DONE layer=${layerId} findings=${(settlement.findings as { candidates?: unknown[] }).candidates?.length ?? "?"} reportPath=${reportPath}`, {
          ok: true,
          findings: settlement.findings,
          reportPath,
          layerId,
        });
      }
      return textResult(`GI_AUDIT_NOT_WIRED: ${settlement.error} | ripwire: engine-binding=auditor attempt=real`, {
        ok: false,
        error: "GI_AUDIT_NOT_WIRED",
        cause: settlement.error,
      });
    } catch (e) {
      return textResult(`GI_AUDIT_NOT_WIRED: ${String(e instanceof Error ? e.message : e).slice(0, 300)} | ripwire: engine-binding=auditor attempt=real`, {
        ok: false,
        error: "GI_AUDIT_NOT_WIRED",
        cause: String(e instanceof Error ? e.message : e).slice(0, 300),
      });
    }
  };
  const aetherAuditParams = obj({ i: zstr().optional(), targetPath: zstr().optional(), template: zstr().optional() });
  pi.registerTool({
    name: "aether-code-audit",
    description: "GI-OMP aether code audit over the graphify graph (EN-38 guards intact, fork aether-auditor.ts runLayerHunter contract). Runs one hunter template (default R28-sro-graph) over targetPath's graphify-out/graph.json → findings + reportPath. Degraded refusal GI_AUDIT_NOT_WIRED only after a real attempt (missing/oversize/unparseable graph, invalid template).",
    parameters: aetherAuditParams,
    execute: aetherAuditExecute as (...args: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }>,
  });
  pi.registerTool({
    name: "graph-code-audit",
    description: "ALIAS of aether-code-audit (pre-rename name, same execute, removal only on operator order).",
    parameters: aetherAuditParams,
    execute: aetherAuditExecute as (...args: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }>,
  });

  return [...GI_TOOL_NAMES];
}

export default function giOmpExtension(pi: GiExtensionAPI): void {
  const names = registerGiOmpTools(pi, (ctx) => ctx?.cwd ?? process.cwd());
  if (typeof pi.on === "function") {
    attachGiGraphGate(pi as { on: (ev: string, h: (e: unknown, c: unknown) => unknown) => void });
  }
  console.error("[gi-omp] registered " + names.join(", "));
}
