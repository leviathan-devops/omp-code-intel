// PORTED FROM fork-v143 live-tree/graph-intelligence/shared/knowledge-graph/ontology.ts (18L) — node kinds + predicate families (LASME/MPSE/SRO/wiring)
// Ported 2026-09-14 (port wave W3-P1/P2). Verbatim bytes; do not edit in place without re-diffing the source.
export const NODE_TYPES = ['File','Class','Function','Interface','Module','Machine','Actor','Engine','Adapter','Container','Lexicon','Contract','Threshold','Gate','EvidenceFile','SpecClause','Graph','Path'] as const;
export type NodeType = typeof NODE_TYPES[number];
export const PREDICATES = {
  lasme: ['declares','implements','triggers','violates','shouldBe','wraps'] as const,
  mpse: ['evaluates_to','contradicts_oracle','grounded_through','unguarded_threshold'] as const,
  sro: ['caused','derived_from','resolved_to','superseded_by','flagged_by'] as const,
  wiring: ['calls','imports','awaits','exports','unwired'] as const,
} as const;
// ★ R21-HIGH ADJUDICATION (2026-09-25): `Predicate` deliberately EXCLUDES `has_finding` — that
//   predicate is the ONE off-canon member, carried as the separate `HAS_FINDING_PREDICATE` const so
//   `isPredicate()`'s type guard can return `Predicate | typeof HAS_FINDING_PREDICATE` (see line 31).
//   Adding it to the union would make the guard's second arm redundant. The reviewer's "union
//   excludes it" is BY DESIGN; `PREDICATE_SET` (the runtime set) includes it, which is what the
//   guard checks. Documented, not changed.
export type Predicate = (typeof PREDICATES)[keyof typeof PREDICATES][number];
// ★ R18-HIGH FIX (2026-09-25): `has_finding` is the ONE predicate NOT in the canon — it is
//   written by a single live producer (report.ts) and appears verbatim in the graph_facts
//   CHECK constraint (migrations.ts). It was a bare string literal in BOTH places: if either
//   side is edited the constraint goes stale SILENTLY (a committed write becomes a violation,
//   or a new predicate is refused at runtime). One exported constant, both consumers.
export const HAS_FINDING_PREDICATE = 'has_finding' as const;
export const ALL_PREDICATES: readonly Predicate[] = [...PREDICATES.lasme, ...PREDICATES.mpse, ...PREDICATES.sro, ...PREDICATES.wiring] as const;
export const NODE_TYPES_SET: ReadonlySet<string> = new Set(NODE_TYPES as readonly string[]);
// ★ R19-HIGH FIX (2026-09-25): the constant above was added WITHOUT adding it here — so
//   `isPredicate('has_finding')` returned FALSE while the graph_facts CHECK accepts it and
//   report.ts writes it. Any validation path routed through `isPredicate` (a DB-sourced or
//   user-supplied predicate string) would REJECT a legitimate, live predicate — a validator
//   that contradicts the schema it validates. The one predicate outside the canon is now IN
//   the lookup set; the `Predicate` TYPE union stays canon-only (the type describes the
//   declared canon; this set describes what the store can legally hold).
export const PREDICATE_SET: ReadonlySet<string> = new Set([...(ALL_PREDICATES as readonly string[]), HAS_FINDING_PREDICATE]);
export function isNodeType(v: unknown): v is NodeType {
  return typeof v === 'string' && (NODE_TYPES_SET as Set<string>).has(v);
}
export function isPredicate(v: unknown): v is Predicate | typeof HAS_FINDING_PREDICATE {
  return typeof v === 'string' && (PREDICATE_SET as Set<string>).has(v);
}
