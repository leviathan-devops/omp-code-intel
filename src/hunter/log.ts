// PORTED FROM fork-v143 live-tree/graph-intelligence/utils.ts (20L) — tridentLog + shortFile + the confidence-label ladder.
// SEAM: none (zero-dep). CorbellAdapter imports this as its logger.
// GI-PORT SEAM: tridentLog (src/utils.js) — console-backed (see BUILD_STATE).
export function tridentLog(level: string, ns: string, msg: string): void {
  console.error(`[${level} ${ns}] ${msg}`)
}
export function shortFile(p: string, n = 46): string {
  return p.length > n ? '…' + p.slice(-(n - 1)) : p
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
