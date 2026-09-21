// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/testing/inconclusive.ts (10L) — the ::INCONCLUSIVE( marker + thrower
// Ported 2026-09-14 (port wave W3-P1/P2). Verbatim bytes; do not edit in place without re-diffing the source.
export const inconclusiveMarker = '::INCONCLUSIVE(';

export function isInconclusiveResult(v: unknown): boolean {
  return typeof v === 'string' && v.includes(inconclusiveMarker);
}

export function markInconclusive(testName: string, reason: string, evidenceLine: string): never {
  const msg = `${inconclusiveMarker}${reason}):: ${testName} — ${evidenceLine}`;
  throw new Error(msg);
}
