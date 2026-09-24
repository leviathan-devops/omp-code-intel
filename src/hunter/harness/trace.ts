// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/harness/trace.ts:1-113 (LEGACY fallback path) + :169-179/:288-292 (degrade contract).
// SEAMS: Severity -> ../shared/db.ts (REAL); NormalizedFinding ->
// ../diagnostics/findings-store.ts (REAL); GraphAdapter -> ../graph/interface.ts (REAL).
// DEVIATION (named, per the port work order — "port with the legacy fallback;
// L6 agent optional"): the L6-agent path (runL6Loop/buildL6Demand/tryGetEngine/
// verifyClaim/classifyFact + QueryEngine/Database/file probes) is NOT ported —
// the L6 agent is another wave's port and tryGetEngine's cwd-probing store open
// would couple the harness to ambient process state. solveTrace.runL6Loop is
// therefore the LEGACY deterministic relevance matrix unconditionally (the
// fork's own MC-B-09 fallback law: the 44 committed hunter tests STAY GREEN
// even when the SRO store is absent — here the store is always absent by
// construction, so the fallback IS the behavior, never a silent degrade).
// A future wave may add the L6 loop behind the same solveTrace signature.
import type { Severity } from '../shared/db.ts';
import type { NormalizedFinding } from '../diagnostics/findings-store.ts';
import type { GraphAdapter } from '../graph/interface.ts';

/** The 6 mental frameworks (Warhead 3.10 — the batched solver's columns). Kept for compat + fallback. */
export const SOLVER_FRAMEWORKS = [
  'first-principles',
  'systematic-debugging',
  'problem-solving',
  'own-every-problem',
  'steve-jobs-energy',
  'scale-is-infinite',
] as const;

export type SolverFramework = (typeof SOLVER_FRAMEWORKS)[number];

/** One finding's trace row — the relevance column per framework + the root cause. */
export interface TraceRow {
  findingId: string;
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  relevance: Record<SolverFramework, number>;
  rootCause: string;
  /** SRO enrichment — populated when L6 loop ran. */
  l6GapClosed?: boolean;
  l6Evidence?: string;
  l7Verdict?: string;
}

/** The finding's stable id — ruleId:file:line (the report + the strike share it). */
export function findingIdOf(f: { ruleId: string; file: string; line: number }): string {
  // ★ F-442 REVERTED (2026-09-24): I rewrote this as JSON.stringify([...]) to dodge a `:`
  //   collision — but st-hunter-port PINS the `ruleId:file:line` shape, and a pin is a
  //   CONTRACT. ruleIds here are dotted (no colons) and paths are POSIX, so the collision I
  //   "fixed" is NOT REACHABLE in this project. Changing a pinned contract for a theoretical
  //   risk is the defect — the pin wins. (The concern is recorded in the ship docs as a
  //   known-watch item, never silently re-specified.)
  return `${f.ruleId}:${f.file}:${f.line}`;
}

function severityWeight(s: Severity): number {
  switch (s) {
    case 'CRIT': return 1;
    case 'HIGH': return 0.75;
    case 'MED': return 0.5;
    case 'WARN': return 0.25;
    default: return 0.5;
  }
}

function deriveRootCause(f: NormalizedFinding, evidenceLen: number): string {
  const anchor = `${f.file}:${f.line}`;
  // ★ F-1032 FIX (2026-09-25): evidence is typed string, but a malformed row
  //   (undefined/null/non-string evidence smuggled past the type boundary, e.g. a
  //   hand-built NormalizedFinding or a JS caller) threw TypeError inside .split()
  //   and crashed the whole batch. Coerce non-strings to '' — same class fixed at
  //   line 83 below (the evidenceLen split in legacySolveTrace).
  const evidenceText = typeof f.evidence === 'string' ? f.evidence : '';
  const first = evidenceText.split(/\n|\.\s/)[0]?.trim() ?? evidenceText;
  const depth = evidenceLen > 3 ? 'a multi-step edge chain' : 'a single-edge mechanism';
  // ★ F-1032b FIX (2026-09-25): the F-1032 edit referenced an undefined `mechanism` — the
  //   intended payload is the FIRST EVIDENCE SEGMENT (`first`), which the edit computed and
  //   then dropped (TS1128/TS2304 territory: a half-applied edit). `first` is what the
  //   sentence needs.
  return `the ${f.ruleId} violation at ${anchor} (${depth}): ${first}`;
}

/** Legacy deterministic solver — the port's sole path (MC-B-09 fallback law). */
function legacySolveTrace(findings: NormalizedFinding[], graph: GraphAdapter): TraceRow[] {
  const ruleCounts = new Map<string, number>();
  for (const f of findings) {
    ruleCounts.set(f.ruleId, (ruleCounts.get(f.ruleId) ?? 0) + 1);
  }
  const total = findings.length === 0 ? 1 : findings.length;
  return findings.map((f) => {
    const blast = ruleCounts.get(f.ruleId) ?? 0;
    const evText = typeof f.evidence === 'string' ? f.evidence : '';
    const evidenceLen = evText.split(/\s+->\s+|,|\n/).filter((s) => s.trim().length > 0).length;
    // ★ F-4 FIX (2026-09-24): the dead footprint block REMOVED. It ran a per-finding
    //   graph.whoCalls() query then `void footprint` — the L6 call-site agent is not ported
    //   (see this file's header), so the result was computed and discarded on every finding.
    const relevance: Record<SolverFramework, number> = {
      'first-principles': severityWeight(f.severity),
      'systematic-debugging': Math.min(1, evidenceLen / 6),
      'problem-solving': f.file && f.line > 0 ? 1 : 0.5,
      'own-every-problem': 1,
      'steve-jobs-energy': Math.min(1, severityWeight(f.severity) * (0.5 + blast / total)),
      'scale-is-infinite': Math.min(1, blast / total),
    };
    const rootCause = deriveRootCause(f, evidenceLen);
    return {
      findingId: findingIdOf(f),
      ruleId: f.ruleId,
      severity: f.severity,
      file: f.file,
      line: f.line,
      relevance,
      rootCause,
    };
  });
}

/** THE BATCHED SOLVER — legacy deterministic matrix (the L6 loop is a future
 *  wave's port; the signature stays async so the upgrade is drop-in).
 *  Async: the machine's fromPromise awaits the Promise. */
export async function solveTrace(findings: NormalizedFinding[], graph: GraphAdapter): Promise<TraceRow[]> {
  if (!Array.isArray(findings)) {
    throw new Error('TRACE_INVALID: findings must be array');
  }
  if (findings.length === 0) return [];
  // No typed store in this port — the legacy deterministic matrix (keeps the
  // hunter tests green per the fork's own MC-B-09 fallback law).
  return legacySolveTrace(findings, graph);
}
