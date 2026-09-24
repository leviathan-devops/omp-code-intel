// P2.2 (W5 gi-infra-diff): stairstepper gate criteria — wire graph metrics
// into the 3-gate review system. Gate levels (the stairstepper bible §9):
//   micro→micro    maxBlastRadius 10
//   micro→category maxBlastRadius 50
//   category→domain maxBlastRadius 200
// FAIL breaches are hard (edges lost, new cycles); unwired and blast-radius
// breaches downgrade to WARN when no hard breach exists (a maintenance bomb
// is a warning, a broken dependency is a stop).
import type { GraphDiffResult } from "./graph-diff.ts";

export interface GateCriteria {
  maxBlastRadius: number;
  maxNewUnwired: number;
  maxNewCycles: number;
  maxEdgesLost: number;
}

export type GateVerdict = "PASS" | "WARN" | "FAIL";

export interface GateResult {
  verdict: GateVerdict;
  failures: string[];
  warnings: string[];
}

export const GATE_LEVELS: Record<string, GateCriteria> = {
  micro: { maxBlastRadius: 10, maxNewUnwired: 0, maxNewCycles: 0, maxEdgesLost: 0 },
  category: { maxBlastRadius: 50, maxNewUnwired: 0, maxNewCycles: 0, maxEdgesLost: 0 },
  domain: { maxBlastRadius: 200, maxNewUnwired: 0, maxNewCycles: 0, maxEdgesLost: 0 },
};

export function gateCheck(diff: GraphDiffResult, criteria: GateCriteria): GateResult {
  const failures: string[] = [];
  const warnings: string[] = [];
  // ★ F-145 FIX (2026-09-24): fail CLOSED on a null/malformed diff — property
  //   access on null threw a raw TypeError past the gate boundary.
  if (!diff || typeof diff !== "object") {
    return { verdict: "FAIL", failures: ["GATE_DIFF_INVALID: diff is null or not an object — refusing to pass an unmeasured gate"], warnings };
  }

  // ★ F-204 FIX (2026-09-24): fail CLOSED on a malformed-but-object diff —
  //   {} or { edgesDelta: undefined } made every comparison NaN-false and the
  //   gate returned PASS on an unmeasured diff (fail-open). Non-finite deltas
  //   or a non-array blastRadiusChanges now FAIL loud.
  const numericDeltas = [diff.edgesDelta, diff.newCycles, diff.unwiredDelta];
  if (
    numericDeltas.some((n) => typeof n !== "number" || !Number.isFinite(n)) ||
    (diff.blastRadiusChanges !== undefined && !Array.isArray(diff.blastRadiusChanges))
  ) {
    return { verdict: "FAIL", failures: ["GATE_DIFF_MALFORMED: diff is missing finite numeric deltas (edgesDelta/newCycles/unwiredDelta) or blastRadiusChanges is not an array — refusing to pass an unmeasured gate"], warnings };
  }

  const edgesLost = Math.max(0, -diff.edgesDelta);
  if (edgesLost > criteria.maxEdgesLost) {
    failures.push(`edges lost ${edgesLost} > budget ${criteria.maxEdgesLost} (broken dependencies are a stop)`);
  }
  if (diff.newCycles > criteria.maxNewCycles) {
    failures.push(`new cycles ${diff.newCycles} > budget ${criteria.maxNewCycles} (circular dependencies are a stop)`);
  }
  const unwiredNew = Math.max(0, diff.unwiredDelta);
  if (unwiredNew > criteria.maxNewUnwired) {
    warnings.push(`new unwired nodes ${unwiredNew} > budget ${criteria.maxNewUnwired} (dead code introduced — justify or delete)`);
  }
  // ★ F-161 FIX (2026-09-24): default a missing blastRadiusChanges to [] — a
  //   malformed diff threw TypeError on for..of instead of gating.
  for (const b of diff.blastRadiusChanges ?? []) {
    // ★ F-534 FIX (2026-09-24): a null/primitive entry crashed on b.after BEFORE the F-204 finite check ran (TypeError past the gate boundary). Non-object or non-numeric entries fail closed with a named failure.
    if (!b || typeof b !== "object" || typeof (b as { before?: unknown }).before !== "number" || typeof (b as { after?: unknown }).after !== "number" || typeof (b as { label?: unknown }).label !== "string") {
      failures.push("malformed blastRadiusChanges entry — not a {label, before, after} object, refusing to pass an unmeasured gate");
      continue;
    }
    // ★ F-204 FIX (2026-09-24): a malformed entry fails closed, never NaN-passes.
    const jump = b.after - b.before;
    if (!Number.isFinite(jump)) {
      failures.push(`malformed blastRadiusChanges entry for "${b.label}" — non-numeric before/after, refusing to pass an unmeasured gate`);
      continue;
    }
    if (jump > criteria.maxBlastRadius) {
      warnings.push(`blast radius jump on ${b.label}: +${jump} inbound (budget ${criteria.maxBlastRadius}) — maintenance bomb risk`);
    }
  }

  const verdict: GateVerdict = failures.length > 0 ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";
  return { verdict, failures, warnings };
}
