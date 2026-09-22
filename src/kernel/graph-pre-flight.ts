// P2.3 (W6 gi-infra-pre): the automated pre-coding sequence — one call runs
// the mandatory pre-flight queries (whoCalls depth-1, impact depth-8, risk
// profile) and returns the scoped plan: commit strategy + prioritized test
// targets (the GRAPH_BASED_STAIRSTEPPING_BIBLE §4 contract, automated).
import { openTypedStore, impactInDb, whoCallsInDb } from "../omp/typed-write.ts";
import { getTestTargets, type TestTarget } from "./graph-test-target.ts";

export interface PreFlightResult {
  target: string;
  directCallers: Array<{ caller: string; file: string; line: number; via: string }>;
  blastRadius: {
    reaches: number;
    byDepth: Record<number, number>;
  };
  riskProfile: {
    callers: number;
    uses: number;
    testCoverage: number;
  };
  commitStrategy: "single" | "split" | "domain-level";
  testTargets: TestTarget[];
  warnings: string[];
}

/** Blast radius ≤5 → single commit. 6–49 → split into micro-commits.
 *  ≥50 → domain-level (architectural review BEFORE coding). */
export function preFlight(storePath: string, target: string): PreFlightResult {
  const db = openTypedStore(storePath);
  try {
    const q = whoCallsInDb(db, target);
    const imp = impactInDb(db, target, 8);

    const byDepth: Record<number, number> = {};
    for (const row of imp.ledger) byDepth[row.depth] = (byDepth[row.depth] ?? 0) + 1;

    const srcIds = (db.query(
      "SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL",
    ).all(target) as Array<{ canonical_id: string }>).map((r) => r.canonical_id);
    let uses = 0;
    if (srcIds.length > 0) {
      const ph = Array.from({ length: srcIds.length }, () => "?").join(", ");
      const rows = db.query(
        `SELECT COUNT(*) AS n FROM typed_edges e
         WHERE e.src_canonical IN (${ph}) AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL`,
      ).all(...srcIds) as Array<{ n: number }>;
      uses = Number(rows[0]?.n ?? 0);
    }

    const warnings: string[] = [];
    if (q.rows === 0 && uses === 0) warnings.push(`NO CONSUMERS: ${target} has zero callers and zero uses — dead-code candidate, safe-delete before building on it`);
    if (imp.reaches >= 50) warnings.push(`WIDE BLAST RADIUS: ${imp.reaches} nodes reached — architectural review required before coding`);

    const directInbound = q.rows;
    let commitStrategy: PreFlightResult["commitStrategy"] = "single";
    if (imp.reaches >= 50 || directInbound >= 20) commitStrategy = "domain-level";
    else if (imp.reaches >= 6 || directInbound >= 4) commitStrategy = "split";

    const testTargets = getTestTargets(storePath, target, 5);
    return {
      target,
      directCallers: q.callers.map((c) => ({ caller: c.caller, file: c.file, line: c.line, via: c.predicate ?? "" })),
      blastRadius: { reaches: imp.reaches, byDepth },
      riskProfile: { callers: q.rows, uses, testCoverage: testTargets.length },
      commitStrategy,
      testTargets,
      warnings,
    };
  } finally {
    db.close();
  }
}
