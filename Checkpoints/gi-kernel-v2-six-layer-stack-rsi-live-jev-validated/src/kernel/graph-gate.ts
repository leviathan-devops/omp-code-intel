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
  for (const b of diff.blastRadiusChanges) {
    if (b.after - b.before > criteria.maxBlastRadius) {
      warnings.push(`blast radius jump on ${b.label}: +${b.after - b.before} inbound (budget ${criteria.maxBlastRadius}) — maintenance bomb risk`);
    }
  }

  const verdict: GateVerdict = failures.length > 0 ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";
  return { verdict, failures, warnings };
}
