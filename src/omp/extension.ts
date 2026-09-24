// GI-OMP extension factory — T-4. Dedicated sibling to trident-omp.
// pi.zod schemas (JSON-schema-only is a silent skip on this runtime).

import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { blastRadius, chainCalls, countTypedNodes, gateAdvisory, getMeta, impact, safeDelete, unwiredNodes, whoCalls, wouldBreak } from "./typed-write.ts";
import { GiScopeError, openSessionStore } from "./store-open.ts";
import { GiPathError, resolveSessionId } from "../scoping/index.ts";
import { attachGiGraphGate, registerGraphGate } from "./gate-hook.ts";
import { clearGiRegistry, GiClearError } from "./gi-registry.ts";
import { populateSessionStore, type PopulateResult } from "./populate.ts";
import { corbellCheckoutPath, isCorbellCheckoutFreshFor } from "./populate-corbell.ts";
import { graphifyOutPath, isGraphifyCheckoutFreshFor } from "./populate-graphify.ts";
import { ripwireCallers, ripwireDeadCode, ripwireEditCheck, ripwireImpact, ripwirePath, ripwireSafeDelete, ripwireVerify, type RipwireLeg } from "./ripwire-bridge.ts";
import { createBugHuntTool } from "../hunter/tools/bug-hunt.ts";
import { runQueryTool } from "../hunter/tools/query-registration.ts";
import type { QueryVerb } from "../hunter/surface/query-tool.ts";
// ★ D-2 (the 6L+2E WIRING): the registry assembly. THIS import is the edge that
// makes the 8 adapters + the registry REACHABLE from the entry point. Without it
// bun tree-shakes all of them and the bundle carries zero v2.x symbols — the
// measured F-95 defect (12 of 23 src/omp modules unreachable, dist symbol count 0).
import { consumptionAudit, SIX_L2E_CONSUMERS } from "./layer-consumption.ts";
import { decideFromRegistry, decideFireFromGraph } from "./decision.ts";
import type { KernelRun } from "./kernel-v2.ts";
import type { DecisionRow } from "./fire-gate.ts";

export const GI_TOOL_NAMES = ["graph-probe", "graph-query", "bug-hunt", "aether-code-audit", "gi-consumption", "gi-decide"] as const;
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
// ★ F-817 FIX (2026-09-24): wipe serialization — two interleaved action=wipe executes
//   both passed the env gate + audit and both called clearGiRegistry (double wipe, one
//   audit-visible trail entry). JS is single-threaded but these executes INTERLEAVE at
//   awaits (the executor yields between tool calls). A module-level in-flight flag
//   serializes: a second wipe while one runs is LOUD-refused (GI_WIPE_INFLIGHT), never
//   silently merged. Released in finally on EVERY path (incl. the WIPE_AUDIT_FAILED
//   early return — otherwise one failed audit pins all later wipes forever).
let wipeInFlight = false;
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
// ★ F-1016 FIX (2026-09-25): the non-recursive audit-root builder — walks the components
//   of auditRoot under targetReal, lstat-ing each level (never following) and creating
//   missing levels with a NON-recursive mkdir. Returns null on success, the refusal
//   reason otherwise. A symlink at any level (final or intermediate) refuses BEFORE any
//   directory is created outside the root.
export function ensureAuditRoot(targetReal: string, auditRoot: string): string | null {
  const rel = path.relative(targetReal, auditRoot);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel)) return "audit root escapes the target root";
  const parts = rel.split(path.sep).filter((p) => p.length > 0);
  let cur = targetReal;
  try {
    for (const part of parts) {
      if (part === ".." || part === "." || path.isAbsolute(part)) return "audit root escapes the target root";
      cur = path.join(cur, part);
      let st: fs.Stats | null = null;
      try { st = fs.lstatSync(cur); } catch { st = null; }
      if (st && st.isSymbolicLink()) return "audit root is a symlink plant";
      if (!st) fs.mkdirSync(cur);
    }
  } catch (mkErr: unknown) {
    return `cannot create audit root: ${mkErr instanceof Error ? mkErr.message : String(mkErr)}`;
  }
  return null;
}
export function ledgerDirConfined(ledgerReal: string, targetReal: string): boolean {
  const rel = path.relative(targetReal, ledgerReal);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}
// W44 (extension:371): the populate DECISION as one seam — empty store, or a
// warm corbell checkout with the store NOT on corbell (fallback or pre-ledger),
// means repopulate. Evaluated INSIDE the populate lane so a queued concurrent
// query that already populated skips cleanly (no double repopulate).
export function substrateNeedsPopulate(storePath: string, scopeRoot: string): boolean {
  if (countTypedNodes(storePath) === 0) return true;
  const stored = getMeta(storePath, "substrate");
  const warm = isCorbellCheckoutFreshFor(scopeRoot, corbellCheckoutPath(scopeRoot));
  return warm.fresh && stored !== "corbell";
}
// W44 (qwen scan HIGH): the settlement re-confine rode the GENERAL allowlist
// (confineTargetPath with targetRoot as callerCwd). With GI_TARGET_ROOTS
// unset the default roots were [targetRoot, /tmp] — so a compromised auditor
// returning ANY /tmp ledger passed the W28/W40 check without ever being
// under the audit target. The verdict is the component check against the
// AUDIT TARGET root, nothing else.
export function settlementLedgerConfined(ledgerPath: string, targetReal: string): { ok: true; real: string } | { ok: false; error: string } {
  let real = ledgerPath;
  try {
    real = fs.realpathSync(ledgerPath);
  } catch {
    return { ok: false, error: "GI_PATH_DENIED: settlement ledger does not exist" };
  }
  if (!ledgerDirConfined(real, targetReal)) {
    return { ok: false, error: "GI_LEDGER_DENIED: settlement ledger outside the audit target root" };
  }
  return { ok: true, real };
}
// W44 (qwen scan HIGH): the wipe audit line rode setMeta(registry.sqlite) —
// but setMeta routes through openTypedStore, which ENFORCES the
// sessions/{id}/store.sqlite shape. A registry path can never satisfy it, so
// the audit write threw on EVERY wipe (WIPE_AUDIT_FAILED forever — an
// unauditable global wipe). The trail writes through a registry-shaped
// store of its own (same gi_meta schema, no session-shape law).
export function writeWipeAudit(giDir: string, note: string): void {
  fs.mkdirSync(giDir, { recursive: true });
  const regPath = path.join(giDir, "registry.sqlite");
  const db = new Database(regPath);
  try {
    db.exec("CREATE TABLE IF NOT EXISTS gi_meta (key TEXT PRIMARY KEY, value TEXT)");
    db.run("INSERT INTO gi_meta (key, value) VALUES ('last_wipe', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [note]);
  } finally {
    db.close();
  }
}
// W45/F24 (frozen-scan HIGH): the wipe's audit outcome as one seam — a skipped
// audit (confine failed, write threw) is reported audited:false WITH the
// reason; only a landed registry row is audited:true. The old flow left
// auditNote empty on confinement failure and claimed wipeAudited:true.
// cwdOf is injected (it is a registerGiOmpTools parameter, not module scope).
export function graphProbeWipeAudited(
  ctx: { cwd?: string; sessionID?: string } | undefined,
  cwdOf: (ctx?: { cwd?: string; sessionID?: string }) => string,
): { audited: boolean; text: string } {
  const wipeCwd = cwdOf(ctx);
  const wipeConfined = confineTargetPath(path.normalize(wipeCwd), wipeCwd);
  if (!wipeConfined.ok) {
    return { audited: false, text: `WIPE_AUDIT_FAILED: ${wipeConfined.error}` };
  }
  try {
    writeWipeAudit(path.join(wipeConfined.real, ".omp", "graph-intelligence"), `${ctx?.sessionID ?? "unknown-session"}@${new Date().toISOString()}`);
    return { audited: true, text: "" };
  } catch (auditErr) {
    return { audited: false, text: `WIPE_AUDIT_FAILED: ${auditErr instanceof Error ? auditErr.message : String(auditErr)}` };
  }
}
// W44 (qwen scan HIGH): GI_TARGET_ROOTS split on '|' AND ':' — the ':' split
// corrupted legal colon-bearing Linux paths (~/my:project) AND allowlisted
// their truncated prefix as a phantom root. '|' is the documented universal
// separator; ':' now survives whole (a bare Windows drive root included).
export function parseTargetRoots(raw: string): string[] {
  return raw.split("|").map((r) => r.trim()).filter((r) => r.length > 0);
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
  // W44 (supersedes the V21 ':' note): the split lives in parseTargetRoots
  // ('|' only — never ':').
  const allowRoots = parseTargetRoots(process.env.GI_TARGET_ROOTS ?? "");
  // ★ F-558 NOTE (2026-09-24, REAL-DEFERRED): the "/tmp" fallback is a deliberate sandbox-scoped
  //   grant — the battery pins mkdtemp scopes under /tmp and GI_TARGET_ROOTS overrides for tighter
  //   scope. Narrowing the default is an operator threat-model call (single-user scope guard vs
  //   multi-user boundary); deferred rather than breaking the suite silently.
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
    // ★ the message TEACHES the syntax: the parser splits on '|' ONLY (W44), so the
    //   roots must be shown joined with '|'. The first version joined with ':' —
    //   the very separator W44 REMOVED — so the error told an operator to write a
    //   form the parser rejects, and a single root printed as if it were two.
    return { ok: false, error: `GI_PATH_DENIED: targetPath '${real.slice(0, 120)}' is outside the allowed roots (${roots.join("|").slice(0, 120)}); set GI_TARGET_ROOTS to extend (separator '|')` };
  }
  // ★ TOCTOU RE-VALIDATION (audit finding #10, 2026-09-23 — the conservative branch).
  //   THE MECHANISM: `real` was resolved at step 1, statED at step 2, and CHECKED against the
  //   roots at step 3. A swap of a path component between step 1 and step 3 leaves the check
  //   comparing a STALE `real` while the consumer opens a different file. THE FIX: re-resolve
  //   AFTER the check and require STABILITY — a path that changed during the check is DENIED,
  //   so the window shrinks from "the whole check" to the re-resolve's own syscall.
  let realAfter: string | null = null;
  try { realAfter = fs.realpathSync(normalized); } catch { realAfter = null; }
  if (realAfter !== real) {
    return { ok: false, error: `GI_PATH_DENIED: the path changed during the confinement check (TOCTOU) — '${normalized.slice(0, 120)}'` };
  }
  // ★ F-339 FIX (2026-09-24): re-stat AFTER the re-resolve — the first type check ran against the pre-check resolution, so a dir-to-file swap between statSync and realpathSync passed a stale verdict. The confined handle is the re-resolved path only if it is still a directory.
  let stAfter: { isDirectory: () => boolean } | null = null;
  try { stAfter = fs.statSync(realAfter); } catch { stAfter = null; }
  if (!stAfter || !stAfter.isDirectory()) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath is not a directory after re-resolve: '${realAfter.slice(0, 120)}'` };
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
  return textResult(`${popNote}rows=${q.rows}\n${head}\nripwire: ${rw.summary}`, { ok: true, rows: q.rows, names: q.names, callers: q.callers, substrate: substrate && substrate.length > 0 ? substrate : "GI_SUBSTRATE_UNKNOWN", ripwire: rw });
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
      if (wipeInFlight) {
        return textResult("GI_WIPE_INFLIGHT: a wipe is already running — serialize wipe operations, retry after it completes", { ok: false, error: "GI_WIPE_INFLIGHT" });
      }
      // ★ F-817c FIX (2026-09-24): the env-gate refusal is NOT a wipe run — it sits
      //   BEFORE the flag. The prior shape returned GI_CLEAR_REFUSED from inside the
      //   outer try but outside the inner try/finally, permanently pinning later wipes
      //   as GI_WIPE_INFLIGHT.
      if (process.env.GI_OMP_ALLOW_CLEAR !== "1") {
        return textResult("GI_CLEAR_REFUSED: action=wipe requires GI_OMP_ALLOW_CLEAR=1 in the environment", { ok: false, error: "GI_CLEAR_REFUSED" });
      }
      wipeInFlight = true;
      try {
        // CRITICAL fix (frozen scan): defense-in-depth AT the tool layer — the
        // description promises an env gate; the deep gate lives inside
        // clearGiRegistry (GI_OMP_ALLOW_CLEAR, code GI_CLEAR_REFUSED). The tool
        // now refuses with the SAME env + code before touching the registry.
        try {
        const wipeAudit = graphProbeWipeAudited(ctx as { cwd?: string; sessionID?: string } | undefined, cwdOf);
          // ★ AUDIT HIGH #2 (2026-09-23): the first version returned `GI_CLEARED` with
          //   `ok: true` when the audit had FAILED (wipeAudited:false) — a false success —
          //   AND never called `clearGiRegistry()` at all (it was imported but DEAD), so the
          //   tool reported `GI_CLEARED` without ever clearing. A failed audit is a LOUD
          //   failure; a reported clear is an ACTUAL clear.
          if (!wipeAudit.audited) {
            return textResult(`WIPE_AUDIT_FAILED\n${wipeAudit.text}`, { ok: false, error: "WIPE_AUDIT_FAILED", wipeAudited: false });
          }
          // ★ THE ACTUAL WIPE — the deep gate (GI_OMP_ALLOW_CLEAR) lives inside this call.
          clearGiRegistry();
          return textResult("GI_CLEARED", { ok: true, token: "GI_CLEARED", wipeAudited: true });
        } finally {
          wipeInFlight = false;
        }
      } catch (e) {
        // frozen-scan HIGH: `"code" in err` threw on a primitive rejection —
        // narrow with in/typeof instead (checked surface kept small).
        let code = "GI_CLEAR_REFUSED";
        const c = (e as { code?: unknown })?.code;
        if (typeof c === "string" && c.length > 0) code = c;
        return textResult(`${code}: ${String(e)}`, { ok: false, error: code });
      }
    }
    // SESSION-IDENTITY FIX: was `?? "default"` — a phantom that merged every
    // session into one bucket. The resolver returns a REAL identity and its
    // source, which the probe now reports so the provenance is visible.
    const sid = resolveSessionId(ctx, process.env);
    const sessionID = sid.id;
    return textResult(
      JSON.stringify({ token: "PROBE_TOOL_OK", sessionID, sessionIDSource: sid.source, echo: p.echo ?? null }),
      { ok: true, token: "PROBE_TOOL_OK", sessionID, sessionIDSource: sid.source },
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
    // ★ AUDIT LOW (2026-09-23): `cwdOf(ctx)` was called TWICE with the identical argument
    //   here AND twice more in the default branch below — four resolutions of one value.
    //   Resolve the caller's context ONCE and reuse it.
    const callerCtx = ctx && typeof ctx === "object" && "cwd" in ctx ? (ctx as { cwd?: string }) : undefined;
    let scopeRoot = cwdOf(callerCtx);
    const callerCwd = scopeRoot;
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
      const defaultConfined = confineTargetPath(callerCwd, callerCwd);
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
        // ★ F-818b FIX (2026-09-24): a populate MISS is a retryable LOUD state, never a
        //   cached verdict — the old shape read `skipped` straight through the shared lane
        //   with no retry, so a transient miss (warm-check race, contended write) pinned
        //   the leg as NOT_WARM until process restart. Retry ONCE inside the same lane
        //   acquisition; a second miss is the honest NOT_WARM (rebuild remedy named).
        let pop = await withPopulateLane(async () => populateSessionStore(opened.storePath, scopeRoot, "graphify-" + Date.now().toString(36), { substrate: "graphify" }));
        if (pop.skipped || (pop.fallbackReason ?? "").length > 0) {
          pop = await withPopulateLane(async () => populateSessionStore(opened.storePath, scopeRoot, "graphify-" + Date.now().toString(36), { substrate: "graphify" }));
        }
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
      // W44 (extension:371): the DECISION moves INSIDE the lane callback —
      // the W19 comment claimed an in-callback recheck but the check sat
      // BEFORE lane acquisition, so two queued queries both saw empty/stale
      // and double-populated. substrateNeedsPopulate is the authoritative
      // verdict, evaluated AFTER acquiring the lane.
      const pop = await withPopulateLane<PopulateResult | null>(async () => {
        if (!substrateNeedsPopulate(opened.storePath, scopeRoot)) return null;
        return populateSessionStore(opened.storePath, scopeRoot);
      });
      if (pop === null) {
        const storedNow = getMeta(opened.storePath, "substrate") ?? "GI_SUBSTRATE_UNKNOWN";
        popNote = `substrate=${storedNow}\n`;
        return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, storedNow);
      }
      popNote = `substrate=${pop.substrate}${pop.fallbackReason ? ` reason=${pop.fallbackReason}` : ""}\n`;
      return await runGraphQueryVerbs(verb, p, opened.storePath, scopeRoot, sessionId, popNote, pop.substrate);
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
      // ★ F-340 FIX (2026-09-24): lstat BEFORE mkdir — mkdirSync recursive follows a pre-planted symlink at auditRoot and builds outside the root before the realpath verdict below can refuse. lstat never follows; a symlink at the final component is refused with no side effect. (The post-mkdir realpath check stays for parent-component plants.)
      // ★ F-1016 FIX (2026-09-25): mkdirSync(recursive) follows a symlink planted at an
      //   INTERMEDIATE component (.omp/, graph-intelligence/) and creates the leaf outside
      //   the root before the realpath verdict below can refuse (the pre-mkdir lstat only
      //   covered the final component). The chain is built level by level via ensureAuditRoot
      //   (exported seam, probed): lstat each level, symlink at ANY level refuses with zero
      //   side effects, mkdir is never recursive. The post-build realpath verdict stays.
      const rootRefusal = ensureAuditRoot(targetReal, auditRoot);
      if (rootRefusal !== null) {
        return textResult(`GI_LEDGER_DENIED: ${rootRefusal}`.slice(0, 200), { ok: false, error: "GI_LEDGER_DENIED" });
      }
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
        // W28/W40 (frozen-scan HIGH) + W44: the re-confine verdict is the
        // AUDIT TARGET root component check — never the general allowlist
        // (whose /tmp default accepted an outside-ledger escape).
        const reportConfined = settlementLedgerConfined(settlement.ledgerDir, targetReal);
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

  // ★ D-2: THE CONSUMPTION TOOL. The decision asks the REGISTRY, never a raw store.
  // It reports `consumed:N/8` — which consumers actually contributed an ANCHORED fact
  // about the subject — with every non-consumer named and its substrate evidence shown.
  // `up=11/11` (a health check on files) is deliberately NOT this tool's answer.
  const consumptionParams = obj({ i: zstr().optional(), subject: zstr().optional(), scopeRoot: zstr().optional() });
  pi.registerTool({
    name: "gi-consumption",
    description: "THE 6L+2E CONSUMPTION PROBE. Reports `consumed:N/8` over the 8 consumers (6 graph layers L1 SEMANTICA/L2 ARSUMBRIS/L3 UA/L4 C2KG/L5 CORBELL/L6 GRAPHIFY + 2 Jev kernels TSG/ABIDE), each asked for an ANCHORED fact about `subject`. A layer is CONSUMED iff its substrate answers AND it contributed >=1 anchored fact; a wired-but-silent consumer is GI_LAYER_UNCONSUMED; an absent substrate is GI_LAYER_DOWN. NEVER reports a green on file existence alone.",
    parameters: consumptionParams,
    execute: (async (_id: unknown, params: unknown, _sig: unknown, _upd: unknown, ctx: unknown) => {
      const p = (params ?? {}) as { subject?: string; scopeRoot?: string };
      // ★ AUDIT F-6 FIXED: thread the tool-call ctx (every other tool in this file does),
      //   so scopeRoot defaults to the CALLER's cwd, not process.cwd().
      const callerCwd = cwdOf(ctx as { cwd?: string; sessionID?: string } | undefined);
      const rawRoot = p.scopeRoot && p.scopeRoot.length > 0 ? p.scopeRoot : callerCwd;
      // ★ AUDIT F-5 FIXED: an operator-controlled scopeRoot reached consumptionAudit with
      //   no confinement, unlike graph-query. A probe derives join(root, …) and then
      //   statSync/readdir — arbitrary-path probing. Confine it first, exactly as
      //   graph-query does, and refuse on failure BEFORE any audit runs.
      const confined = confineTargetPath(path.normalize(rawRoot), callerCwd);
      if (!confined.ok) {
        return textResult(`GI_PATH_DENIED: ${confined.error}`, { ok: false, error: "GI_PATH_DENIED" });
      }
      const root = confined.real;
      const subject = p.subject && p.subject.length > 0 ? p.subject : "populateSessionStore";
      try {
        const audit = consumptionAudit(root, subject);
        const lines = audit.reports.map(
          (r) => `${r.consumer}\t${r.verdict}\trung=${r.rung}\tfacts=${r.factsReturned}`,
        );
        return textResult(
          `${audit.summary}\nsubject=${subject}\nscopeRoot=${root}\n${lines.join("\n")}`,
          { ok: audit.influenced.length > 0, summary: audit.summary, influenced: audit.influenced, offenders: audit.offenders, consumers: SIX_L2E_CONSUMERS },
        );
      } catch (e) {
        // A registry that cannot build is a LOUD named failure — never an empty table.
        const msg = e instanceof Error ? e.message : String(e);
        return textResult(`GI_CONSUMPTION_FAILED: ${msg}`, { ok: false, error: "GI_CONSUMPTION_FAILED" });
      }
    }) as (...args: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }>,
  });

  // ★ D-2: THE DECISION TOOL — THE LAYER-EDGE. The KERNEL decides, and its layer
  // declarations come FROM THE REGISTRY (never a raw store, never a file check).
  // ★ WHY THIS TOOL EXISTS (the measured defect): the deployed bundle carried ZERO
  // kernel symbols (dumbDetector=0 · classifyByDetectors=0 · runKernelV2=0 · FireGate=0)
  // because the kernel was reached ONLY through type-only imports — erased at build.
  // This tool VALUE-imports `decideFromRegistry`, so the bundler keeps the kernel, and
  // the DECISION consults the REGISTRY on every call.
  const decideParams = obj({
    i: zstr().optional(),
    subject: zstr().optional(),
    scopeRoot: zstr().optional(),
    target: zstr().optional(),
    toolName: zstr().optional(),
    // ★ F-122 FIX (2026-09-24): the tool HARDCODED queriedBefore:false, so it could ONLY ever
    //   record the dumb class — the live ledger read 1-distinct across 34 rows. These inputs
    //   let the CALLER state the act's shape, so the tool records varied decisions.
    queriedBefore: zstr().optional(), // "true" ⇒ the target was queried before the act
    claims: zstr().optional(), // a JSON array of {text, spans}; "" / absent ⇒ no claims
  });
  pi.registerTool({
    name: "gi-decide",
    description: "THE 6L+2E DECISION. Runs the KERNEL over the layer REGISTRY: the registry's 6 graph layers become the kernel's PREFLIGHT declarations, its ANCHORED facts become the certifications the detectors read, and the kernel returns the verdict (ALLOW/STEER/REFUSE/ABORT) with the class (dumb/theatrical/destructive/benign). A layer DOWN refuses the stack with `GI_STACK_INCOMPLETE:<id>` — never an empty pass. The decision consults the REGISTRY, never a raw store.",
    parameters: decideParams,
    execute: (async (_id: unknown, params: unknown, _sig: unknown, _upd: unknown, ctx: unknown) => {
      const p = (params ?? {}) as { subject?: string; scopeRoot?: string; target?: string; toolName?: string; queriedBefore?: string; claims?: string };
      const callerCwd = cwdOf(ctx as { cwd?: string; sessionID?: string } | undefined);
      const rawRoot = p.scopeRoot && p.scopeRoot.length > 0 ? p.scopeRoot : callerCwd;
      const confined = confineTargetPath(path.normalize(rawRoot), callerCwd);
      if (!confined.ok) {
        return textResult(`GI_PATH_DENIED: ${confined.error}`, { ok: false, error: "GI_PATH_DENIED" });
      }
      const root = confined.real;
      const subject = p.subject && p.subject.length > 0 ? p.subject : "populateSessionStore";
      try {
        // ★ THE L5/L6 GRAPH RUNG: the decision ALSO reads the parse-grade graph. A fact
        //   the graph settles is never worth a model call — this is that rung, reported.
        const fireTarget = p.target && p.target.length > 0 ? p.target : subject;
        const fire = decideFireFromGraph(root, fireTarget, "consume");
        // ★ P4 — THE RUNTIME LEDGER. The kernel's RECORD stage (6) writes every run. The
        //   sink is the FireLedger the graph rung opened — stage 6 goes from SKIPPED to
        //   WRITTEN, so the ledger that RUNNING produced is non-empty.
        const recordSink = (run: KernelRun): void => {
          // ★ the ledger's domains are validated (BAD_DOMAIN): band ∈ act|escalate|ignore,
          //   action ∈ FIRE|ESCALATE|IGNORE. The kernel's verdict maps onto them:
          //   REFUSE/ABORT → a FIRE (the act is refused), STEER → ESCALATE, ALLOW → IGNORE.
          const band = run.verdict === "REFUSE" || run.verdict === "ABORT" ? "act" : run.verdict === "STEER" ? "escalate" : "ignore";
          const action = band === "act" ? "FIRE" : band === "escalate" ? "ESCALATE" : "IGNORE";
          const row: DecisionRow = {
            at: new Date().toISOString(),
            ruleId: `kernel-v2:${run.class}:${run.verdict}`,
            cls: run.class,
            questionVersion: "kernel-v2",
            probability: band === "act" ? 1 : band === "escalate" ? 0.5 : 0,
            band,
            action,
            policyName: `kernel-v2.${run.class}`,
            actThreshold: 0.5,
            flagThreshold: 0.25,
            stateHash: (run.reason || run.evidence || "kernel-v2").slice(0, 16),
            target: fireTarget,
            costUsd: 0,
            laterTruth: "unresolved",
          };
          fire.ledger.append(row);
        };
        // ★ F-122 FIX: honor the caller's queriedBefore + claims (never hardcode false).
        let callClaims: Array<{ text: string; spans: number }> = [];
        if (typeof p.claims === "string" && p.claims.trim().length > 0) {
          try { callClaims = JSON.parse(p.claims) as Array<{ text: string; spans: number }>; } catch { callClaims = []; }
        }
        const ev = decideFromRegistry(root, subject, {
          toolName: p.toolName && p.toolName.length > 0 ? p.toolName : "gi-decide",
          target: fireTarget,
          queriedBefore: p.queriedBefore === "true",
          claims: callClaims,
        }, recordSink);
        const stageLines = ev.run.stages.map((s) => `  stage ${s.stage} ${s.name}\t${s.outcome}\t${s.detail}`);
        const fireLines = fire.verdicts.map((v) => `  ${v.rule}\tsettles=${v.settles}\taction=${v.action ?? "none"}\t${v.reason}`);
        return textResult(
          `verdict=${ev.run.verdict}\tclass=${ev.run.class}\tcode=${ev.run.code ?? "none"}\nsubject=${subject}\nscopeRoot=${root}\nlayersWired=${ev.layersWired}/${ev.consumersTotal}\ninfluenced=${ev.influenced.join(",") || "none"}\nreason=${ev.run.reason}\n${stageLines.join("\n")}\ngraph: store=${fire.storePath}\tsettles=${fire.settles}\tfires=${fire.fires}\tpolicy=${fire.policyCount}@${fire.policySource}\tledger=${fire.ledgerPath}\n${fireLines.join("\n")}`,
          { ok: ev.run.verdict === "ALLOW", verdict: ev.run.verdict, class: ev.run.class, code: ev.run.code, layersWired: ev.layersWired, influenced: ev.influenced, graphSettles: fire.settles, graphFires: fire.fires, policyCount: fire.policyCount },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return textResult(`GI_DECIDE_FAILED: ${msg}`, { ok: false, error: "GI_DECIDE_FAILED" });
      }
    }) as (...args: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }>,
  });

  return [...GI_TOOL_NAMES];
}

export default function giOmpExtension(pi: GiExtensionAPI): void {
  const names = registerGiOmpTools(pi, (ctx) => ctx?.cwd ?? process.cwd());
  if (typeof pi.on === "function") {
    // W2: registerGraphGate = attachGiGraphGate (per-edit middleware) + the
    // v1.3 drift layer (graph-gate.ts). One call site — grep count must stay 1.
    registerGraphGate(pi as { on: (ev: string, h: (e: Record<string, unknown>, c: unknown) => unknown) => void });
  }
  console.error("[gi-omp] registered " + names.join(", "));
}
