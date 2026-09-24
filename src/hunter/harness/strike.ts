// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/harness/strike.ts:1-76.
// SEAMS: ProjectProfile -> ../profile/schema.ts (REAL); NormalizedFinding ->
// ../diagnostics/findings-store.ts (REAL); dedupe/rankFindings/severityScore ->
// ../diagnostics/engine.ts (REAL ported siblings); findingIdOf/TraceRow ->
// ./trace.ts (this port's own harness file).
// Verbatim otherwise: identical-triplet collapse, D13 rank reuse, D12
// trace-relevance tie-break, fix-order emission.
import type { ProjectProfile } from '../profile/schema.ts';
import type { NormalizedFinding } from '../diagnostics/findings-store.ts';
import { dedupe, rankFindings, severityScore } from '../diagnostics/engine.ts';
import { findingIdOf, type TraceRow } from './trace.ts';

/** The STRIKE actor's output — the deduped + ranked findings + the fix order. */
export interface StrikeResult {
  findings: NormalizedFinding[];
  fixOrder: string[];
}

/** THE STRIKE ACTOR — dedupe + rank (D13) + the fix order. Deterministic:
 *  the same findings + the same profile + the same traces → the same order. */
export function strike(
  findings: NormalizedFinding[],
  profile: ProjectProfile,
  traces: TraceRow[] = [],
): StrikeResult {
  // THE IDENTICAL-TRIPLET COLLAPSE (K4.3) — the within-run duplicates die first.
  const deduped = dedupe(findings);

  // THE D13 RANK (K21.3) — the engine's deterministic severity × the bounded
  // history-frequency order (the HISTORY_LOG_UNREADABLE propagates — a loud
  // fail, never a silent frequency of 1).
  const ranked = rankFindings(deduped, profile);

  // THE D12 TIE-BREAK — the trace relevance matrix over the engine's base
  // order: a same-score pair leads by the higher total relevance, then the
  // higher severity, then the stable id (the deterministic final fallback).
  // ★ F-1001 FIX (2026-09-25): duplicate findingIds OVERWROTE (last-wins) so the
  //   relevance total depended on trace ORDER, breaking the determinism guarantee.
  //   Same findingId now SUMS per-framework relevance (order-independent total);
  //   first row's metadata wins. PROBE: two rows same id with {a:1}/{a:2} → 3 either order.
  const traceByFinding = new Map<string, TraceRow>();
  for (const t of traces) {
    const existing = traceByFinding.get(t.findingId);
    if (!existing) { traceByFinding.set(t.findingId, { ...t, relevance: { ...t.relevance } }); continue; }
    const merged = { ...existing.relevance } as Record<string, number>;
    for (const [k, v] of Object.entries(t.relevance)) merged[k] = (merged[k] ?? 0) + (typeof v === "number" ? v : 0);
    traceByFinding.set(t.findingId, { ...existing, relevance: merged as TraceRow["relevance"] });
  }

  const relevanceOf = (f: NormalizedFinding): number => {
    const t = traceByFinding.get(findingIdOf(f));
    if (!t) return 0;
    return Object.values(t.relevance).reduce((s, v) => s + v, 0);
  };

  const ordered = [...ranked].sort((a, b) => {
    const ra = relevanceOf(a);
    const rb = relevanceOf(b);
    if (ra !== rb) return rb - ra;
    const sa = severityScore(a.severity);
    const sb = severityScore(b.severity);
    if (sa !== sb) return sb - sa;
    // ★ F-750 FIX (2026-09-24, run-10): the comparator returned 1 for EQUAL ids —
    //   a sort contract violation (equal elements must return 0). It breaks transitivity
    //   and can produce a nondeterministic order across engines. Three-way compare.
    const ia = findingIdOf(a), ib = findingIdOf(b);
    return ia < ib ? -1 : ia > ib ? 1 : 0;
  });

  // THE FIX ORDER — the ranked finding ids (the report's section-5 worklist).
  const fixOrder = ordered.map((f) => findingIdOf(f));

  return { findings: ordered, fixOrder };
}
