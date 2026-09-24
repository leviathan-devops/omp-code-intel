// P2.4 (W6 gi-infra-pre): TDD test targeting FROM the graph — given a modified
// function, return the prioritized test targets: depth-1 callers ranked by
// their own inbound degree (highest connected = highest break risk). The
// depth≥2 band is owned by the integration battery (stairstepper bible §6).
import { openTypedStore, whoCallsInDb } from "../omp/typed-write.ts";

export interface TestTarget {
  label: string;
  file: string;
  line: number;
  /** How many things call THIS caller (its own blast radius). */
  inboundDegree: number;
  /** Graph distance from the modified function (depth-1 = direct caller). */
  depth: number;
  /** 1 = highest priority. */
  priority: number;
  reason: string;
}

export function getTestTargets(storePath: string, modifiedFunction: string, maxTargets = 5): TestTarget[] {
  const db = openTypedStore(storePath);
  try {
    const q = whoCallsInDb(db, modifiedFunction);
    const degreeCache = new Map<string, number>();
    const degreeOf = (label: string): number => {
      const hit = degreeCache.get(label);
      if (hit !== undefined) return hit;
      // ★ NOT-A-BUG (2026-09-24): `whoCallsInDb(...).rows` is ALREADY the count (number,
      //   typed-write.ts:798 `{ rows: number; names; callers }`), NOT a rows array — the
      //   audit misread the API. The original `d = .rows` was correct; `callers` is the array.
      const d = whoCallsInDb(db, label).rows;
      degreeCache.set(label, d);
      return d;
    };
    const targets: TestTarget[] = q.callers.map((c, i) => ({
      label: c.caller,
      file: c.file,
      line: c.line,
      inboundDegree: degreeOf(c.caller),
      depth: 1,
      priority: i + 1,
      reason: `direct caller of ${modifiedFunction} via ${c.predicate || "call"} — tests ${c.caller} prove the contract survives the change`,
    }));
    targets.sort((a, b) => b.inboundDegree - a.inboundDegree || a.priority - b.priority);
    return targets.slice(0, Math.max(0, maxTargets)).map((t, i) => ({ ...t, priority: i + 1 }));
  } finally {
    db.close();
  }
}
