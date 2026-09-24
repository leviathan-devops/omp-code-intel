// calibration — THE MEASUREMENT MACHINERY. Thresholds EARNED, never chosen.
//
// THE DEBT THIS PAYS (the operator, 2026-09-21): the tier thresholds were
// "my choice, not a measurement... they have never seen a real firing."
//
// THE FOUR STEPS, each a function:
//   1  THE COST MATRIX      t = C_false_block / (C_false_block + C_missed)
//   2  THE PRECISION CURVE  Wilson interval over the ledger's resolved rows
//   3  PER-RULE THRESHOLDS  never one global number
//   4  RE-DERIVE ON SUPERSEDE  the threshold rides the same loop as precision
//
// THE BIBLE'S LAWS THIS IMPLEMENTS:
//   §6.4.2  calibration is a GROUP property — p=0.8 happens ~80% of the time,
//           it is NOT "this answer is 80% true"
//   §6.4.3  (1) the policy is a NAMED object  (3) the threshold in force is
//           recorded on every row  (4) re-routing never re-infers
//   §6.4.6  the two traps: inflation (copying a reported 0.95) and starvation
//           (an act band that never fires = paying for judgments and using none)
//   §6.4.7  `later_truth` is the column everything reads

export interface CostMatrix {
  /** The cost of stopping a LEGITIMATE act (a false block). */
  falseBlock: number;
  /** The cost of letting a REAL violation through (a miss). */
  missed: number;
}

/** STEP 1 — THE DERIVED THRESHOLD. The Bayes-optimal cut for a binary decision
 *  under asymmetric cost: act only when P(real) exceeds the cost ratio's break-
 *  even point. Equal costs → 0.50; block 4× a miss → 0.80; block 10× → 0.909. */
export function thresholdFromCost(c: CostMatrix): number {
  const denom = c.falseBlock + c.missed;
  if (denom <= 0) throw new Error("CALIBRATION_BAD_COST_MATRIX: the two costs must sum above zero");
  return c.falseBlock / denom;
}

/** The smallest n at which a proportion can be resolved to a given gap — used
 *  to set the FIRE FLOOR honestly (§6.4.6, the starvation trap's inverse). */
export function firesNeededForGap(p: number, gap: number, z = 1.96): number {
  // ★ F-31 FIX (2026-09-24): at p=0|1 the variance is 0 so the formula returned 0 ("no fires needed") — the opposite of truth. A boundary proportion needs an unbounded sample.
  if (!(p > 0 && p < 1)) return Number.POSITIVE_INFINITY;
  if (!(gap > 0) || !Number.isFinite(gap)) return Number.POSITIVE_INFINITY;
  // the Wilson half-width at n is ~ z*sqrt(p(1-p)/n); solve for the gap.
  // ★ F-CAL-Z FIX (2026-09-24): a public z <= 0 collapsed the Wilson half-width to 0, so the derived sample size underflowed to 0 ("zero fires needed") — the opposite of truth.
  const zAbs = Math.abs(z) || 1.96;
  const hw = zAbs * Math.sqrt(p * (1 - p));
  return Math.ceil((hw / gap) ** 2);
}

// ── STEP 2 — THE PRECISION CURVE (Wilson) ───────────────────────────────────
export interface ResolvedCounts {
  confirmed: number;
  refuted: number;
  unresolved: number;
}

export interface PrecisionEstimate {
  /** confirmed / (confirmed + refuted) — unresolved EXCLUDED, never assumed. */
  precision: number;
  /** The 95% Wilson interval — the honest band around the point estimate. */
  low: number;
  high: number;
  /** The width of that interval. A width above your decision gap means n is too small. */
  halfWidth: number;
  resolved: number;
  unresolvedRatio: number;
  /** §6.4.6: is this rule's evidence strong enough to set a threshold from? */
  sufficient: boolean;
  /** true when the act band has NEVER fired — the starvation trap. */
  starved: boolean;
}

/** The Wilson score interval — the correct interval for a proportion from
 *  counts (the normal approximation misbehaves exactly where thresholds live,
 *  near 0 and 1, and at small n). */
export function precisionFromCounts(c: ResolvedCounts, z = 1.96): PrecisionEstimate {
  // ★ F-337 FIX (2026-09-24): fail-closed on negative counts — a negative input
  //   silently produced a negative denominator / out-of-range precision and bogus
  //   sufficient/starved flags. Counts are cardinalities; negatives are caller bugs.
  if (c.confirmed < 0 || c.refuted < 0 || c.unresolved < 0) {
    throw new Error(`CALIBRATION_BAD_COUNTS: counts must be non-negative (confirmed=${c.confirmed}, refuted=${c.refuted}, unresolved=${c.unresolved})`);
  }
  const resolved = c.confirmed + c.refuted;
  const fires = resolved + c.unresolved;
  const p = resolved === 0 ? 0 : c.confirmed / resolved;
  const unresolvedRatio = fires === 0 ? 1 : c.unresolved / fires;
  if (resolved === 0) {
    return { precision: 0, low: 0, high: 1, halfWidth: 0.5, resolved: 0, unresolvedRatio, sufficient: false, starved: true };
  }
  // ★ F-406 FIX (2026-09-24): a negative z made margin negative (low > high, negative
  // ★ halfWidth, sufficient stuck true) — the F-CAL-Z pattern from firesNeededForGap.
  const zSafe = Math.abs(z) || 1.96;
  const z2 = zSafe * zSafe;
  const denom = 1 + z2 / resolved;
  const centre = (p + z2 / (2 * resolved)) / denom;
  const margin = (zSafe * Math.sqrt((p * (1 - p) + z2 / (4 * resolved)) / resolved)) / denom;
  const low = Math.max(0, centre - margin);
  const high = Math.min(1, centre + margin);
  return {
    precision: p, low, high, halfWidth: (high - low) / 2,
    resolved, unresolvedRatio,
    sufficient: (high - low) / 2 <= 0.10,
    starved: false,
  };
}

// ── STEP 3 — PER-RULE THRESHOLDS ────────────────────────────────────────────
/** A rule's cost asymmetry. `claim-without-span` and `removing-an-export` do
 *  not share a threshold — one shapes advice, the other stops work. */
export interface RuleProfile {
  ruleId: string;
  cls: string;
  cost: CostMatrix;
  /** The floor the operator will accept before the rule may FIRE at all. */
  minFiresForAct: number;
}

/** The measured defaults: the OPERATOR'S cost posture, not mine. These are
 *  SEEDS with a stated basis until the ledger overrides them. */
export const DEFAULT_PROFILES: readonly RuleProfile[] = [
  // a false block on a destructive rule stops legitimate work; a miss ships damage
  { ruleId: "*destructive", cls: "destructive", cost: { falseBlock: 4, missed: 1 }, minFiresForAct: 20 },
  // a blind-edit steer is cheap and advisory: a false steer costs a glance
  { ruleId: "*dumb", cls: "dumb", cost: { falseBlock: 1, missed: 2 }, minFiresForAct: 10 },
  // a false completion is the defect itself: the bar is high
  { ruleId: "*theatrical", cls: "theatrical", cost: { falseBlock: 3, missed: 2 }, minFiresForAct: 15 },
];

export interface DerivedPolicy {
  ruleId: string;
  policyName: string;
  act: number;
  flag: number;
  basis: string;
  /** true when the threshold came from measured counts, not the cost matrix alone. */
  calibrated: boolean;
  estimate: PrecisionEstimate | null;
}

/** STEP 4 — RE-DERIVE. The act threshold is the MAX of (the cost-derived cut,
 *  the precision's lower bound raised by the gap it must resolve). A rule whose
 *  precision is not yet sufficient keeps the seed and says so. */
export function derivePolicy(profile: RuleProfile, counts: ResolvedCounts | null): DerivedPolicy {
  const costCut = thresholdFromCost(profile.cost);
  if (counts === null || counts.confirmed + counts.refuted < profile.minFiresForAct) {
    return {
      ruleId: profile.ruleId,
      policyName: `${profile.cls}-seed`,
      act: costCut,
      flag: Math.max(0.05, costCut / 2),
      basis: `cost matrix only (C_block=${profile.cost.falseBlock}, C_miss=${profile.cost.missed}) → t=${costCut.toFixed(3)}; NO measured counts yet (needs ${profile.minFiresForAct} resolved)`,
      calibrated: false,
      // ★ F-CAL-EST FIX (2026-09-24): expose the raw estimate alongside calibrated:false only when counts exist; a null counts set should not pretend a numeric estimate exists downstream.
      estimate: counts !== null && counts.confirmed + counts.refuted > 0 ? precisionFromCounts(counts) : null,
    };
  }
  const est = precisionFromCounts(counts);
  // The act bar may not sit below the lower bound of what this rule has proven.
  const act = Math.max(costCut, est.low);
  return {
    ruleId: profile.ruleId,
    policyName: `${profile.cls}-calibrated`,
    act,
    flag: Math.max(0.05, Math.min(act / 2, est.high)),
    basis: `cost t=${costCut.toFixed(3)} vs measured precision ${est.precision.toFixed(3)} [${est.low.toFixed(3)}, ${est.high.toFixed(3)}] over ${est.resolved} resolved → act=${act.toFixed(3)}`,
    calibrated: true,
    estimate: est,
  };
}

// ── THE REGRESSION DETECTOR (the calibration-health gate) ───────────────────
export interface CalibrationHealth {
  ok: boolean;
  findings: string[];
}

/** The named traps, checked mechanically — this is what makes a threshold set
 *  auditable rather than trusted. */
export function checkCalibrationHealth(
  policies: readonly DerivedPolicy[],
  ledgersByRule: Record<string, ResolvedCounts>,
): CalibrationHealth {
  const findings: string[] = [];
  for (const p of policies) {
    const counts = ledgersByRule[p.ruleId];
    if (counts === undefined) { findings.push(`${p.ruleId}: NO LEDGER — threshold is uncalibrated (${p.basis})`); continue; }
    const est = precisionFromCounts(counts);
    // TRAP: starvation — paying for judgments and using none.
    if (est.starved) findings.push(`${p.ruleId}: STARVED — the act band has never fired (0 resolved)`);
    // TRAP: an act bar so high only perfect answers fire.
    if (p.act >= 0.98) findings.push(`${p.ruleId}: act=${p.act.toFixed(3)} >= 0.98 — STARVATION RISK (only near-perfect answers fire)`);
    // TRAP: inflation — the bar set below what the evidence supports.
    if (p.calibrated && p.act < est.low) findings.push(`${p.ruleId}: act=${p.act.toFixed(3)} BELOW the measured lower bound ${est.low.toFixed(3)} — INFLATED risk`);
    // A wide interval means n is too small to set a bar from.
    if (!est.starved && est.halfWidth > 0.15) findings.push(`${p.ruleId}: interval half-width ${est.halfWidth.toFixed(3)} > 0.15 — n=${est.resolved} too small to set a bar`);
    // The cost matrix must be the operator's, and stated.
    if (p.act < 0.05) findings.push(`${p.ruleId}: act=${p.act.toFixed(3)} is degenerate`);
  }
  return { ok: findings.length === 0, findings };
}
