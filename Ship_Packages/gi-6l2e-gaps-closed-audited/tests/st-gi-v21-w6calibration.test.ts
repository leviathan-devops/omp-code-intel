// st-gi-v21-w6calibration — W6: THE CALIBRATION LOOP, PINNED.
//
// ★ PROVENANCE: the loop was run end-to-end under the SEED cost matrix with 48 LIVE fires
//   (packages/gi-kernel-v2.1/tools/w6-calibration.ts → W6_CALIBRATION_FINDING.md). That
//   run proved the machinery and produced the session's sharpest measurement finding:
//   A POOLED PRECISION OF 0.500 HID THREE DIFFERENT CLASSES — two cleanly separable and
//   one (theatrical) INVERTED, because the detector's evidence carries only counts where
//   the other two carry the discriminating FACT.
//
//   THESE tests pin the LOOP deterministically (no live model), so a regression in the
//   calibration machinery is caught without a network dependency.

import { describe, test, expect } from "bun:test";
import {
  DEFAULT_PROFILES, checkCalibrationHealth, derivePolicy, firesNeededForGap,
  precisionFromCounts, thresholdFromCost,
} from "../src/omp/calibration.ts";

describe("st-gi-v21-w6calibration: the calibration loop", () => {
  // ══ THE GATE: derivePolicy flips calibrated=true when the counts suffice ══════

  test("W6-loop: derivePolicy flips calibrated=true above minFiresForAct", () => {
    const prof = DEFAULT_PROFILES.find((p) => p.ruleId === "*dumb")!;
    // BELOW the floor: the seed holds and the basis says WHY
    const under = derivePolicy(prof, { confirmed: 4, refuted: 4, unresolved: 0 });
    expect(under.calibrated).toBe(false);
    expect(under.basis).toContain("NO measured counts yet");
    expect(under.basis).toContain(`needs ${prof.minFiresForAct} resolved`);

    // ABOVE the floor: the loop ENGAGES
    const over = derivePolicy(prof, { confirmed: 12, refuted: 4, unresolved: 0 });
    expect(over.calibrated).toBe(true);
    expect(over.basis).toContain("measured precision");
    expect(over.basis).toContain("resolved");
  });

  test("W6-loop: the derived act is max(cost cut, the measured LOWER bound)", () => {
    const prof = DEFAULT_PROFILES.find((p) => p.ruleId === "*dumb")!;
    const costCut = thresholdFromCost(prof.cost);
    const d = derivePolicy(prof, { confirmed: 12, refuted: 4, unresolved: 0 });
    // ★ the bar may not sit BELOW what the rule has PROVEN
    expect(d.act).toBeGreaterThanOrEqual(Math.min(costCut, d.estimate!.low));
    expect(d.act).toBeCloseTo(Math.max(costCut, d.estimate!.low), 6);
    // and the flag sits strictly below the act, or the ESCALATE band is empty
    expect(d.flag).toBeLessThan(d.act);
  });

  // ══ THE HEALTH GATE: it REFUSES to set a bar on too few samples ══════════════

  test("W6-health: a wide interval REFUSES a bar — the kernel will not guess", () => {
    // ★ the type must be WIDE: `p.ruleId` is a string, so a narrow inferred object
    //   literal cannot be indexed by it (tsc 192 — caught by the 0-new law).
    const counts: Record<string, { confirmed: number; refuted: number; unresolved: number }> = {
      "*dumb": { confirmed: 8, refuted: 8, unresolved: 0 },
    };
    const policies = DEFAULT_PROFILES.map((p) => derivePolicy(p, counts[p.ruleId] ?? null));
    const h = checkCalibrationHealth(policies, counts);
    expect(h.ok).toBe(false);
    // the finding NAMES the reason: the interval is too wide at this n
    expect(h.findings.some((f) => f.includes("half-width") && f.includes("too small"))).toBe(true);
  });

  test("W6-health: a narrow interval with zero findings reads ok", () => {
    // enough samples that the Wilson half-width drops below the 0.15 cut
    const counts: Record<string, { confirmed: number; refuted: number; unresolved: number }> = {
      "*dumb": { confirmed: 40, refuted: 4, unresolved: 0 },
      "*theatrical": { confirmed: 40, refuted: 4, unresolved: 0 },
      "*destructive": { confirmed: 40, refuted: 4, unresolved: 0 },
    };
    const policies = DEFAULT_PROFILES.map((p) => derivePolicy(p, counts[p.ruleId] ?? null));
    const h = checkCalibrationHealth(policies, counts);
    expect(h.ok).toBe(true);
    expect(h.findings).toEqual([]);
  });

  test("W6-health: an act bar at or above 0.98 is flagged as a STARVATION RISK", () => {
    const counts = { "*destructive": { confirmed: 40, refuted: 4, unresolved: 0 } };
    const pols = [derivePolicy(DEFAULT_PROFILES.find((p) => p.ruleId === "*destructive")!, counts["*destructive"]!)];
    // force the starvation shape the check looks for
    const starved = [{ ...pols[0]!, act: 0.99 }];
    const h = checkCalibrationHealth(starved, counts);
    expect(h.findings.some((f) => f.includes("STARVATION RISK"))).toBe(true);
  });

  // ══ THE MATH THE THRESHOLDS COME FROM ═══════════════════════════════════════

  test("W6-math: the cost cut IS the ratio, and the four postures land where documented", () => {
    expect(thresholdFromCost({ falseBlock: 1, missed: 1 })).toBeCloseTo(0.500, 6);
    expect(thresholdFromCost({ falseBlock: 4, missed: 1 })).toBeCloseTo(0.800, 6);
    expect(thresholdFromCost({ falseBlock: 10, missed: 1 })).toBeCloseTo(10 / 11, 6);
    expect(thresholdFromCost({ falseBlock: 1, missed: 3 })).toBeCloseTo(0.250, 6);
    // a zero-sum matrix cannot band
    expect(() => thresholdFromCost({ falseBlock: 0, missed: 0 })).toThrow(/BAD_COST_MATRIX/);
  });

  test("W6-math: the fire floors are the Wilson requirement, not a choice", () => {
    // ★ the measured answer to "how many fires?": a NARROWER gap needs MORE fires
    const g20 = firesNeededForGap(0.85, 0.20);
    const g10 = firesNeededForGap(0.85, 0.10);
    const g05 = firesNeededForGap(0.85, 0.05);
    expect(g20).toBeLessThan(g10);
    expect(g10).toBeLessThan(g05);
    expect(g10).toBe(49);        // the number the finding quotes
  });

  test("W6-math: unresolved rows are EXCLUDED from precision, never assumed", () => {
    const withUnresolved = precisionFromCounts({ confirmed: 8, refuted: 8, unresolved: 100 });
    const without = precisionFromCounts({ confirmed: 8, refuted: 8, unresolved: 0 });
    // ★ an unresolved row is NOT evidence; it must not move the point estimate
    expect(withUnresolved.precision).toBe(without.precision);
    expect(withUnresolved.precision).toBeCloseTo(0.5, 6);
  });

  // ══ ★ THE FINDING ITSELF: THE EVIDENCE MUST CARRY THE DISCRIMINATOR ═══════════

  test("W6-finding: the DETECTOR's evidence carries the discriminator for 2 of 3 classes", async () => {
    const { DEFAULT_DETECTORS, classifyByDetectors } = await import("../src/omp/kernel-v2.ts");
    const base = { toolName: "edit", target: "x", claims: [{ text: "the migration is done", spans: 0 }], certifications: [], queriedBefore: false };
    const out = classifyByDetectors(DEFAULT_DETECTORS, base);
    const ev: Record<string, string> = {};
    for (const o of out) ev[o.detector.class] = o.outcome.evidence;

    // ★ destructive and dumb carry the distinguishing FACT
    expect(ev["destructive"]).toContain("certifications");
    // the actual string: "execution record: queried_before=false for target='x' tool='edit'"
    expect(ev["dumb"]).toContain("queried_before");
    // ★ theatrical carries only COUNTS — the session's measured root cause: a real and a
    //   false positive produce the SAME evidence string, so the model cannot separate them
    //   and correctly returns ~0.5. Pinned here so a fix to the detector is VISIBLE.
    expect(ev["theatrical"]).toMatch(/claims=\d+ unbound=\d+ spans\[0\]=0/);
    expect(ev["theatrical"]).not.toContain("corroboration");
  });
});
