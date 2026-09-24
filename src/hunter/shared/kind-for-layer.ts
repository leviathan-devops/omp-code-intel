// PORTED FROM fork-v143 live-tree/graph-intelligence/shared/knowledge-graph/kind-for-layer.ts (19L) — layerId -> NodeType
// Ported 2026-09-14 (port wave W3-P1/P2). Verbatim bytes; do not edit in place without re-diffing the source.
export function kindForLayer(layerId: string): string {
  // ★ F-7 FIX (2026-09-24): the null/undefined guard. Callers pass `layerId` read off graph
  //   data, which can be null; the old `.toLowerCase()` threw a TypeError (a crash-wearing-
  //   failure). The honest degrade: the 'Threshold' default.
  // ★ F-922 NOTE (2026-09-24): NOT-A-BUG — `== null` (null+undefined) is idiomatic here, not a
  //   standards violation: the repo has no eqeqeq lint surface (root holds only package.json +
  //   tsconfig.json) and `== null`/`!= null` guards are used project-wide (findings-store.ts:164,181;
  //   graphify-adapter.ts:658). The strict expansion is behavior-identical; churn refused.
  if (layerId == null || typeof layerId !== 'string') return 'Threshold';
  const low = layerId.toLowerCase();
  if (low.includes('r28')) return 'Gate';
  if (low.includes('r29')) return 'File';
  if (low.includes('r30')) return 'File';
  if (low.includes('r31')) return 'Container';
  if (low.includes('lexicon')) return 'Lexicon';
  if (low.includes('actor')) return 'Actor';
  if (low.includes('state-machine') || low.includes('state_machine')) return 'Machine';
  if (low.includes('engine')) return 'Engine';
  if (low.includes('adapter')) return 'Adapter';
  if (low.includes('contract')) return 'Contract';
  if (low.includes('oracle')) return 'Threshold';
  if (low.includes('stage')) return 'Gate';
  if (low.includes('provenance')) return 'SpecClause';
  if (low.includes('mpse')) return 'Threshold';
  if (low.includes('sro') || low.includes('graph') || low.includes('path') || low.includes('dead') || low.includes('cycle')) return 'Gate';
  return 'Threshold';
}
