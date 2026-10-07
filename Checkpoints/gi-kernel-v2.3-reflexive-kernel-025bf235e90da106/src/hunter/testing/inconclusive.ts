// PORTED FROM the archived upstream skill tree/testing/inconclusive.ts (10L) — the ::INCONCLUSIVE( marker + thrower
// Ported 2026-09-14 (port wave W3-P1/P2). Verbatim bytes; do not edit in place without re-diffing the source.
export const inconclusiveMarker = '::INCONCLUSIVE(';

// ★ R15 FIX: control flow no longer depends ONLY on substring-matching a plain
//   Error's message through wrappers — InconclusiveError carries the signal as a
//   TYPE (the legacy marker stays in its message, so existing string matchers and
//   serialized-message checks keep working; markInconclusive's message is unchanged).
export class InconclusiveError extends Error {
  readonly testName: string;
  readonly reason: string;
  readonly evidenceLine: string;
  constructor(testName: string, reason: string, evidenceLine: string) {
    super(`${inconclusiveMarker}${reason}):: ${testName} — ${evidenceLine}`);
    this.name = 'InconclusiveError';
    this.testName = testName;
    this.reason = reason;
    this.evidenceLine = evidenceLine;
  }
}

export function isInconclusiveResult(v: unknown): boolean {
  if (typeof v === 'string') return v.includes(inconclusiveMarker);
  if (v instanceof InconclusiveError) return true;
  if (v instanceof Error) return v.name === 'InconclusiveError' || v.message.includes(inconclusiveMarker);
  return false;
}

export function markInconclusive(testName: string, reason: string, evidenceLine: string): never {
  throw new InconclusiveError(testName, reason, evidenceLine);
}
