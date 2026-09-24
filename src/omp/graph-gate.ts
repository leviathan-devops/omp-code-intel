// graph-gate — GI kernel v1.3 intelligent graph gate (LASME: lexicon detects,
// state machine decides, tier ladder enforces).
//
// The gate is NOT a blind "call the graph before every edit". It classifies
// each edit/write tool call (severity NONE/LOW/MEDIUM/HIGH), tracks the
// session's unverified-edit drift over a 5-minute decay window, and escalates
// proportionally: T0 pass → T1 advise → T2 block → T3 TTSR abort. Graph
// queries on a touched symbol reset drift for that symbol — the gate rewards
// verification coverage, never edit count.
import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";

export type EditSeverity = "NONE" | "LOW" | "MEDIUM" | "HIGH";
export type GateTier = "T0" | "T1" | "T2" | "T3";
export type GateStateName = "IDLE" | "TRACKING" | "WARNING" | "GATE_ON" | "HARD_STOP";

export interface EditClassification {
  severity: EditSeverity;
  structuralFlags: string[];
  touchedSymbols: string[];
  targetFile: string;
}

export interface DriftResult {
  drift: number;
  unverifiedCount: number;
  verifiedSymbols: string[];
  lastGraphQuery: number | null;
}

export interface GateDecision {
  tier: GateTier;
  state: GateStateName;
  advisory?: string;
  blockReason?: string;
  ttsrRuleName?: string;
}

export interface GateEditRecord {
  timestamp: number;
  severity: EditSeverity;
  symbols: string[];
}

export interface GateQueryRecord {
  timestamp: number;
  tool: string;
  target: string;
  /** ★ whether the query RETURNED a non-empty answer — only a resolved query covers an edit. */
  resolved?: boolean;
}

export interface GraphGateSessionState {
  editLog: GateEditRecord[];
  graphQueries: GateQueryRecord[];
  gateState: GateStateName;
  drift: number;
}

export const DRIFT_WINDOW_MS = 300_000;
export const TIER_T1_CUT = 0.4;
export const TIER_T2_CUT = 0.6;
export const TIER_T3_CUT = 0.8;
export const TIER_T3_MIN_CONSECUTIVE = 5;

const SEV_WEIGHT: Record<EditSeverity, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };

const DOC_SUFFIXES = [".md", ".json", ".yaml", ".yml", ".toml", ".txt", ".lock"];
const TEST_HINTS = ["test", "spec", "fixture", "__tests__", "__mocks__"];

function baseName(p: string): string {
  return p.split("/").pop() ?? p;
}

function extractExportSymbols(text: string): string[] {
  const out: string[] = [];
  const re = /\bexport\s+(?:async\s+)?(?:function|class|const|let|var|type|interface|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[1]);
  const braceRe = /export\s*\{([^}]{1,400})\}/g;
  while ((m = braceRe.exec(text)) !== null) {
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim() ?? "";
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) out.push(name);
    }
  }
  return [...new Set(out)];
}

export function classifyEdit(toolName: string, args: { file?: string; path?: string; oldString?: string; newString?: string; content?: string }): EditClassification {
  const targetFile = args.file ?? args.path ?? "";
  const lowered = targetFile.toLowerCase();
  if (DOC_SUFFIXES.some((s) => lowered.endsWith(s))) {
    return { severity: "NONE", structuralFlags: ["doc-only"], touchedSymbols: [], targetFile };
  }
  const base = baseName(lowered);
  const isTest = TEST_HINTS.some((h) => base.includes(h) || lowered.includes(`/${h}/`));
  const body = `${args.oldString ?? ""}\n${args.newString ?? ""}\n${args.content ?? ""}`;
  // ★ F-352 FIX (2026-09-24): oldString and newString fell back to the FULL file
  //   `content` — when only one side was given, that side parsed the whole file and
  //   every unrelated export inflated touchedSymbols (false HIGH / false coverage).
  //   oldString with no fallback is the honest unknown (empty); newString keeps the
  //   content fallback (a whole-file write's symbols ARE the new symbols).
  const oldSyms = extractExportSymbols(args.oldString ?? "");
  const newSyms = extractExportSymbols(args.newString ?? args.content ?? "");
  const structural = oldSyms.length > 0 || newSyms.length > 0
    || /\bimport\s+.*\bfrom\b/.test(body)
    || /\bexport\s+default\b/.test(body)
    || /\bdelete\s+function\b/.test(body)
    // ★ F-GG1 FIX (2026-09-24): the trailing && binds tighter than || — parenthesized to
    //   NAME the intent: an annotation change is structural only on an EXPORTED
    //   type/interface (a `: string`→`: number` tweak on module-private code stays MEDIUM).
    || (/:\s*[A-Za-z_$][A-Za-z0-9_$<>[\]|]*\s*[=;{]/.test(body) && /export\s+(type|interface)/.test(body));
  const touchedSymbols = [...new Set([...oldSyms, ...newSyms])];
  const flags: string[] = [];
  if (oldSyms.length > 0 || newSyms.length > 0) flags.push("export_change");
  if (/\bimport\s+.*\bfrom\b/.test(body)) flags.push("import_change");
  if (/\bexport\s+default\b/.test(body)) flags.push("default_export");
  if (isTest) {
    return { severity: "LOW", structuralFlags: flags.length > 0 ? flags : ["test-only"], touchedSymbols, targetFile };
  }
  if (structural) {
    return { severity: "HIGH", structuralFlags: flags.length > 0 ? flags : ["structural"], touchedSymbols, targetFile };
  }
  return { severity: "MEDIUM", structuralFlags: ["logic"], touchedSymbols, targetFile };
}

export function createEmptyState(): GraphGateSessionState {
  return { editLog: [], graphQueries: [], gateState: "IDLE", drift: 0 };
}

function normTarget(t: string): string {
  // RULING (W1): case-insensitive symbol matching — graphify labels carry
  // Title-Case kinds (Function/Class/Method) while ripwire and queries use
  // the bare symbol; a case mismatch must never read as uncovered.
  return t.replace(/\(\)$/, "").trim().toLowerCase();
}

export function recordEdit(c: EditClassification, state: GraphGateSessionState, ts: number = Date.now()): void {
  if (c.severity === "NONE") return;
  state.editLog.push({ timestamp: ts, severity: c.severity, symbols: c.touchedSymbols.map(normTarget) });
  if (state.gateState === "IDLE") state.gateState = "TRACKING";
}

/** ★★★ THE RITUAL-QUERY FIX (2026-09-22). MEASURED DEFECT: this recorded a query
 *  whenever it carried a TARGET STRING — it NEVER checked whether the query RETURNED ROWS or
 *  ERRORED. So `graph-query verb=who-calls target=classify` → `rows=0` + a ripwire error
 *  STILL reset the drift. THE GATE REWARDED THE CALL, NOT THE ANSWER, which is why T-16
 *  ("the ritual query") worked: the gate literally cannot tell a query that informed from one
 *  that was purchased, because it only ever saw the target.
 *  THE FIX: a query resets drift ONLY IF IT RESOLVED. `resolved` is the caller's report of a
 *  non-empty answer; absent means UNRESOLVED, so the default is the honest one — an unverified
 *  query cannot purchase coverage. (Rows=0 is a legitimate answer, but it is not COVERAGE of
 *  the edit; the edit remains unverified.) */
export function recordGraphQuery(
  q: { tool: string; target: string; resolved?: boolean; rows?: number },
  state: GraphGateSessionState,
  ts: number = Date.now(),
): void {
  const target = normTarget(q.target ?? "");
  if (target.length === 0) return;
  const resolved = q.resolved === true || (typeof q.rows === "number" && q.rows > 0);
  state.graphQueries.push({ timestamp: ts, tool: q.tool, target, resolved });
}

export function resetDriftForSymbol(target: string, state: GraphGateSessionState): void {
  const t = normTarget(target);
  if (t.length === 0) return;
  state.graphQueries.push({ timestamp: Date.now(), tool: "reset", target: t, resolved: true });
}

function symbolVerified(sym: string, state: GraphGateSessionState): boolean {
  const t = normTarget(sym);
  // ★ A QUERY ONLY COVERS AN EDIT IF IT RESOLVED. An unresolved query (rows=0, an error, or
  //   an unrecorded outcome) is not evidence, so it cannot purchase coverage (the T-16 fix).
  return state.graphQueries.some((q) => q.target === t && q.resolved === true);
}

export function computeDrift(state: GraphGateSessionState, now: number = Date.now()): DriftResult {
  let unverifiedWeight = 0;
  let totalWeight = 0;
  let unverifiedCount = 0;
  const verifiedSymbols: string[] = [];
  for (const edit of state.editLog) {
    const age = Math.max(0, now - edit.timestamp);
    if (age >= DRIFT_WINDOW_MS) continue;
    const decay = 1 - age / DRIFT_WINDOW_MS;
    const weight = SEV_WEIGHT[edit.severity] * decay;
    const verifiedHere = edit.symbols.filter((s) => symbolVerified(s, state));
    for (const v of verifiedHere) if (!verifiedSymbols.includes(v)) verifiedSymbols.push(v);
    if (edit.symbols.length === 0) {
      // CONTAINER ANGLE 5 FIX: symbol-less comment-only edits carry ZERO
      // drift — they cannot break callers. Weighting them at MEDIUM let 10
      // comment edits alone reach T2.
      continue;
    } else if (verifiedHere.length > 0) {
      // RULING (W1): edit-level coverage — a query on ANY touched symbol
      // covers the edit. Per-symbol pro-rating demanded agents query a new
      // name that did not exist at query time (rename solo→solo2 after
      // querying solo scored 0.5 forever). The covered unit is the
      // check-then-edit operation, not the symbol.
      // ★ F-895 FIX (2026-09-25, run-13 CRITICAL): the verified branch `continue`d WITHOUT
      //   adding to totalWeight — so the ratio was `unverifiedWeight / unverifiedWeight`,
      //   ALWAYS exactly 1.0 whenever any unverified edit existed. Drift could never be
      //   anything but 1.0 or 0.0: the decay window, the severity weights and the T1 tier
      //   were all dead. A VERIFIED edit is still an edit — it belongs in the denominator.
      totalWeight += weight;
      continue;
    } else {
      totalWeight += weight;
      unverifiedWeight += weight;
      unverifiedCount += 1;
    }
  }
  // ★ F-GG-VER FIX (2026-09-24): verifiedSymbols included targets from ALL queries including unresolved ones (rows=0, errors); only resolved queries constitute evidence.
  for (const q of state.graphQueries) {
    if (q.resolved === true && !verifiedSymbols.includes(q.target)) verifiedSymbols.push(q.target);
  }
  const drift = totalWeight <= 0 ? 0 : Math.min(1, unverifiedWeight / totalWeight);
  let lastGraphQuery: number | null = null;
  for (const q of state.graphQueries) {
    if (lastGraphQuery === null || q.timestamp > lastGraphQuery) lastGraphQuery = q.timestamp;
  }
  state.drift = drift;
  return { drift, unverifiedCount, verifiedSymbols, lastGraphQuery };
}

function consecutiveUnverified(state: GraphGateSessionState, now: number = Date.now()): number {
  let n = 0;
  for (let i = state.editLog.length - 1; i >= 0; i--) {
    const edit = state.editLog[i];
    if (now - edit.timestamp >= DRIFT_WINDOW_MS) break;
    // ★ F-35 FIX (2026-09-24): symbol-less edits were counted here as unverified while computeDrift gives them zero weight — comment edits inflated the T2/T3 consecutive gate. Skipped, matching computeDrift.
    if (edit.symbols.length === 0) continue;
    // ★ F-267 FIX (2026-09-24): edit-level coverage is the W1 ruling in computeDrift above — an edit with ANY verified symbol is covered. Counting it unverified here fired T2/T3 on zero drift.
    if (edit.symbols.some((s) => symbolVerified(s, state))) break;
    n += 1;
  }
  return n;
}

export function gateDecision(d: DriftResult, state: GraphGateSessionState, now: number = Date.now()): GateDecision {
  // CONTAINER ANGLE 4 FIX: minimum-evidence floor — a SINGLE edit can never
  // block, no matter how high the ratio reads. Drift of 1.0 on one edit is a
  // sample-size artifact, not a pattern. T2 needs ≥3 unverified edits; T3
  // keeps its 5-consecutive rule on top.
  const n = consecutiveUnverified(state, now);
  // ★ F-620 FIX (2026-09-24): A GATE WHOSE REMEDY IS UNREACHABLE IS AN OUTAGE.
  //   The blocking tiers demand a ripwire/graph-query call on the edited symbols. When the
  //   session's cwd is a DIFFERENT tree from the one being edited (a sibling worktree, the
  //   common subagent case), ripwire returns RIPWIRE_PATH_DENIED / symbol-not-found — so NO
  //   query can EVER resolve, the drift can NEVER fall, and the agent is permanently blocked
  //   from work it is authorised to do. This killed two agents (R8High2, R10High2/R10High4)
  //   whose only escapes were to bypass the gate. THE MECHANICAL SIGNAL: queries were
  //   ATTEMPTED but NONE ever RESOLVED — the substrate cannot serve this session. In that
  //   state the gate DEGRADES TO ADVISORY (T1): it still reports the drift, it never blocks.
  //   (A session with zero attempts is unaffected — the gate arms normally.)
  const attempts = state.graphQueries.filter((q) => q.tool !== "reset").length;
  const resolvedAny = state.graphQueries.some((q) => q.resolved === true);
  const substrateUnreachable = attempts > 0 && !resolvedAny;
  if (substrateUnreachable && d.drift >= TIER_T1_CUT) {
    state.gateState = "WARNING";
    return {
      tier: "T1",
      state: "WARNING",
      advisory: `[GATE STEER] ${d.unverifiedCount} structural edits without a RESOLVABLE graph query — the graph substrate cannot serve this session (${attempts} query attempt(s), 0 resolved). Per the law, record RIPWIRE_MISSING and use grep as the structural map; the gate stays advisory.`,
    };
  }
  if (d.drift >= TIER_T3_CUT && n >= TIER_T3_MIN_CONSECUTIVE) {
    state.gateState = "HARD_STOP";
    return {
      tier: "T3",
      state: "HARD_STOP",
      ttsrRuleName: "graph-before-structural-edit",
      blockReason: `GRAPH_GATE_ABORT: drift ${d.drift.toFixed(2)} with ${d.unverifiedCount} unverified structural edits — reasoning rewound, query the graph`,
    };
  }
  if (d.drift >= TIER_T2_CUT && n >= 3) {
    state.gateState = "GATE_ON";
    return {
      tier: "T2",
      state: "GATE_ON",
      blockReason: `GRAPH_GATE_DRIFT_HIGH: ${d.unverifiedCount} structural edits without graph query. Call ripwire verb=callers or graph-query verb=who-calls on the symbols you are modifying.`,
    };
  }
  if (d.drift >= TIER_T1_CUT) {
    state.gateState = "WARNING";
    return {
      tier: "T1",
      state: "WARNING",
      advisory: `[GATE STEER] ${d.unverifiedCount} symbols modified without graph query — consider ripwire verb=callers before the next structural edit`,
    };
  }
  if (d.drift > 0) state.gateState = "TRACKING";
  else state.gateState = "IDLE";
  return { tier: "T0", state: state.gateState };
}

// V2 scaffold — PROPOSED extension points (empty in v1.3, never implemented).
// PROPOSED: SpecDriftLexicon plugs into onEditClassified to classify edits
// against spec requirements (severity forced CRITICAL on spec violation).
export function onEditClassified(_c: EditClassification): void { /* PROPOSED v2 hook — empty in v1.3 */ }
// PROPOSED: BlastRadiusWeighter plugs into onDriftComputed to weight severity
// by live caller counts (whoCalls/impact) instead of static class weights.
export function onDriftComputed(_d: DriftResult): void { /* PROPOSED v2 hook — empty in v1.3 */ }
// PROPOSED: ReasoningTokenAnalyzer plugs into onGateDecision to adjust tier
// tolerance from the agent's reasoning quality; ContextGraphBridge adds
// spec/decision-chain continuity checks here.
export function onGateDecision(_g: GateDecision): void { /* PROPOSED v2 hook — empty in v1.3 */ }

const GATE_DDL = `CREATE TABLE IF NOT EXISTS graph_gate_state (
  session_id TEXT PRIMARY KEY,
  drift REAL NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'IDLE',
  edits_json TEXT NOT NULL DEFAULT '[]',
  queries_json TEXT NOT NULL DEFAULT '[]',
  updated_ms INTEGER NOT NULL DEFAULT 0
)`;

function openSessionDb(storePath: string): Database {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(storePath);
  db.exec(GATE_DDL);
  return db;
}

export function saveGateState(storePath: string, sessionId: string, state: GraphGateSessionState): void {
  const db = openSessionDb(storePath);
  try {
    db.run(
      "INSERT INTO graph_gate_state (session_id, drift, state, edits_json, queries_json, updated_ms) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET drift = excluded.drift, state = excluded.state, edits_json = excluded.edits_json, queries_json = excluded.queries_json, updated_ms = excluded.updated_ms",
      [sessionId, state.drift, state.gateState, JSON.stringify(state.editLog), JSON.stringify(state.graphQueries), Date.now()],
    );
  } catch (e) {
    console.error(`GI_GATE_STATE_SAVE_FAILED: ${storePath} session=${sessionId} err=${e instanceof Error ? e.message : String(e)}`);
    throw e;
  } finally {
    try { db.close(); } catch { /* already closed */ }
  }
}

export function loadGateState(storePath: string, sessionId: string): GraphGateSessionState | null {
  let db: Database | null = null;
  try {
    db = openSessionDb(storePath);
    const row = db.query("SELECT drift, state, edits_json, queries_json FROM graph_gate_state WHERE session_id = ?").get(sessionId) as {
      drift: number; state: GateStateName; edits_json: string; queries_json: string;
    } | null;
    if (!row) return null;
    // ★ F-353 FIX (2026-09-24): the two JSON.parse results were cast, never validated —
    //   a tampered/corrupt row with severity "CRITICAL" missed every SEV_WEIGHT key and
    //   poisoned drift to NaN (silent gate death), and a non-boolean `resolved` could
    //   ride the rows>0 path. Every record is shape-checked; anything off-shape fails
    //   CLOSED (null, same as the corrupt-row path below) instead of a NaN gate.
    const SEVS: ReadonlySet<string> = new Set(["NONE", "LOW", "MEDIUM", "HIGH"]);
    const STATES: ReadonlySet<string> = new Set(["IDLE", "TRACKING", "WARNING", "GATE_ON", "HARD_STOP"]);
    const rawEdits: unknown = JSON.parse(row.edits_json);
    const rawQueries: unknown = JSON.parse(row.queries_json);
    if (!Array.isArray(rawEdits) || !Array.isArray(rawQueries)) throw new Error("GI_GATE_STATE_SHAPE: editLog/queries not arrays");
    const editLog: GateEditRecord[] = rawEdits.map((e) => {
      const r = e as { timestamp?: unknown; severity?: unknown; symbols?: unknown };
      if (typeof r.timestamp !== "number" || !Number.isFinite(r.timestamp)) throw new Error("GI_GATE_STATE_SHAPE: bad edit.timestamp");
      if (typeof r.severity !== "string" || !SEVS.has(r.severity)) throw new Error(`GI_GATE_STATE_SHAPE: bad edit.severity=${JSON.stringify(r.severity)}`);
      if (!Array.isArray(r.symbols) || !r.symbols.every((s) => typeof s === "string")) throw new Error("GI_GATE_STATE_SHAPE: bad edit.symbols");
      return { timestamp: r.timestamp, severity: r.severity as GateEditRecord["severity"], symbols: r.symbols as string[] };
    });
    const graphQueries: GateQueryRecord[] = rawQueries.map((q) => {
      const r = q as { timestamp?: unknown; tool?: unknown; target?: unknown; resolved?: unknown };
      if (typeof r.timestamp !== "number" || !Number.isFinite(r.timestamp)) throw new Error("GI_GATE_STATE_SHAPE: bad query.timestamp");
      if (typeof r.tool !== "string" || typeof r.target !== "string") throw new Error("GI_GATE_STATE_SHAPE: bad query.tool/target");
      return { timestamp: r.timestamp, tool: r.tool, target: r.target, resolved: r.resolved === true };
    });
    if (typeof row.drift !== "number" || !Number.isFinite(row.drift)) throw new Error("GI_GATE_STATE_SHAPE: bad drift");
    if (!STATES.has(row.state)) throw new Error(`GI_GATE_STATE_SHAPE: bad gateState=${JSON.stringify(row.state)}`);
    return { editLog, graphQueries, gateState: row.state, drift: row.drift };
  } catch (e) {
    // ★ F-GG-LOAD FIX (2026-09-24): the gate silently swallowed corruption/permission errors and reset drift from scratch; log the failure so stale state is diagnosable.
    console.error(`GI_GATE_STATE_LOAD_FAILED: ${storePath} session=${sessionId} err=${e instanceof Error ? e.message : String(e)}`);
    return null;
  } finally {
    try { db?.close(); } catch { /* already closed */ }
  }
}

// ★ F-211 FIX (2026-09-24): the dead DUPLICATE `registerGraphGate` stub REMOVED — the real,
// wired implementation lives in gate-hook.ts (extension.ts:10 imports from there). This stub
// (0 importers) shadowed the name and misled the whole-tree audit into flagging a no-op gate.
