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
  const oldSyms = extractExportSymbols(args.oldString ?? args.content ?? "");
  const newSyms = extractExportSymbols(args.newString ?? args.content ?? "");
  const structural = oldSyms.length > 0 || newSyms.length > 0
    || /\bimport\s+.*\bfrom\b/.test(body)
    || /\bexport\s+default\b/.test(body)
    || /\bdelete\s+function\b/.test(body)
    || /:\s*[A-Za-z_$][A-Za-z0-9_$<>[\]|]*\s*[=;{]/.test(body) && /export\s+(type|interface)/.test(body);
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

export function recordGraphQuery(q: { tool: string; target: string }, state: GraphGateSessionState, ts: number = Date.now()): void {
  const target = normTarget(q.target ?? "");
  if (target.length > 0) state.graphQueries.push({ timestamp: ts, tool: q.tool, target });
}

export function resetDriftForSymbol(target: string, state: GraphGateSessionState): void {
  const t = normTarget(target);
  if (t.length === 0) return;
  state.graphQueries.push({ timestamp: Date.now(), tool: "reset", target: t });
}

function symbolVerified(sym: string, state: GraphGateSessionState): boolean {
  const t = normTarget(sym);
  return state.graphQueries.some((q) => q.target === t);
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
      // Symbol-less edits (logic bodies with no exports) can only be covered
      // by a same-file graph query — weight them in full when uncovered.
      totalWeight += weight;
      unverifiedWeight += weight;
      unverifiedCount += 1;
    } else if (verifiedHere.length > 0) {
      // RULING (W1): edit-level coverage — a query on ANY touched symbol
      // covers the edit. Per-symbol pro-rating demanded agents query a new
      // name that did not exist at query time (rename solo→solo2 after
      // querying solo scored 0.5 forever). The covered unit is the
      // check-then-edit operation, not the symbol.
      continue; // fully verified: contributes to neither side
    } else {
      totalWeight += weight;
      unverifiedWeight += weight;
      unverifiedCount += 1;
    }
  }
  for (const q of state.graphQueries) {
    if (!verifiedSymbols.includes(q.target)) verifiedSymbols.push(q.target);
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
    const unverified = edit.symbols.length === 0
      ? true
      : edit.symbols.some((s) => !symbolVerified(s, state));
    if (!unverified) break;
    n += 1;
  }
  return n;
}

export function gateDecision(d: DriftResult, state: GraphGateSessionState, now: number = Date.now()): GateDecision {
  if (d.drift >= TIER_T3_CUT && consecutiveUnverified(state, now) >= TIER_T3_MIN_CONSECUTIVE) {
    state.gateState = "HARD_STOP";
    return {
      tier: "T3",
      state: "HARD_STOP",
      ttsrRuleName: "graph-before-structural-edit",
      blockReason: `GRAPH_GATE_ABORT: drift ${d.drift.toFixed(2)} with ${d.unverifiedCount} unverified structural edits — reasoning rewound, query the graph`,
    };
  }
  if (d.drift >= TIER_T2_CUT) {
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
  } finally {
    db.close();
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
    return {
      editLog: JSON.parse(row.edits_json) as GateEditRecord[],
      graphQueries: JSON.parse(row.queries_json) as GateQueryRecord[],
      gateState: row.state,
      drift: row.drift,
    };
  } catch {
    return null;
  } finally {
    try { db?.close(); } catch { /* already closed */ }
  }
}

export function registerGraphGate(api: { onBeforeToolCall?: unknown; onAfterToolCall?: unknown; onTurnEnd?: unknown }): void {
  void api;
}
