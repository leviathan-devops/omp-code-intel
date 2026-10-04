// PORTED FROM fork-v143 live-tree/graph-intelligence/utils.ts (20L) — giLog + shortFile + the confidence-label ladder.
// SEAM: none (zero-dep). CorbellAdapter imports this as its logger.
// GI-PORT SEAM: giLog (src/utils.js) — console-backed (see BUILD_STATE).
export function giLog(level: string, ns: string, msg: string): void {
  console.error(`[${level} ${ns}] ${msg}`)
}
// ★ R18-HIGH FIX (2026-09-25): the parameter was typed `string` while the body explicitly
//   handles null/undefined (the F-912 guard below). A type that contradicts the body means
//   TypeScript CANNOT catch a caller passing null — the guard is doing type-level work the
//   signature denies. The type now states what the function accepts.
export function shortFile(p: string | null | undefined, n = 46): string {
  // ★ F-912 FIX (2026-09-24): null/undefined input threw TypeError on p.length — fail-closed to ''.
  // ★ R18-HIGH FIX (2026-09-25): `(p as unknown) == null` DEFEATED narrowing — the cast
  //   erased the check's effect, so TypeScript still saw `p` as its declared type on every
  //   line below (and could not catch a null caller). With the signature now honest, the
  //   plain check narrows: below this line `p` is `string`, provably.
  if (p == null) return '';
  // ★ F-242 FIX (2026-09-24): small-n correctness — slice(-(n-1)) with n=1 is
  //   slice(0), the WHOLE string, so '…'+p came out longer than p. n<=1 returns a
  //   truncated ellipsis; n>=2 behavior is unchanged.
  if (p.length <= n) return p;
  if (n <= 1) return '…'.slice(0, n);
  return '…' + p.slice(-(n - 1));
}
// ── THE CONFIDENCE-LABEL LADDER (the mpse threshold contract — named members
// with calib: provenance; the audit report's confidenceLabel vocabulary) ──
// calib: 0.98 — VERIFIED floor (tool-evidence-adjacent certainty)
const CONF_LABEL_VERIFIED = 0.98
// calib: 0.9 — HIGH floor (the report's HIGH band)
const CONF_LABEL_HIGH = 0.9
// calib: 0.85 — MED floor (the emit-confidence base — the W3 calibration)
const CONF_LABEL_MED = 0.85
// calib: 0.7 — LOW floor (below it the finding is NOISE — the scoring cutoff)
const CONF_LABEL_LOW = 0.7
export function confidenceLabel(c: number): string {
  // ★ F-31 FIX (2026-09-24): the nested-ternary chain violated the no-nested-ternary
  //   standard — if/else ladder, identical thresholds.
  if (c >= CONF_LABEL_VERIFIED) return 'VERIFIED';
  if (c >= CONF_LABEL_HIGH) return 'HIGH';
  if (c >= CONF_LABEL_MED) return 'MED';
  if (c >= CONF_LABEL_LOW) return 'LOW';
  return 'NOISE';
}
