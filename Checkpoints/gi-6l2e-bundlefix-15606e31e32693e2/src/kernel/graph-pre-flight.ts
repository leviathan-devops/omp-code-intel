// P2.3 (W6 gi-infra-pre): the automated pre-coding sequence — one call runs
// the mandatory pre-flight queries (whoCalls depth-1, impact depth-8, risk
// profile) and returns the scoped plan: commit strategy + prioritized test
// targets (the GRAPH_BASED_STAIRSTEPPING_BIBLE §4 contract, automated).
import { openTypedStore, impactInDb, whoCallsInDb } from "../omp/typed-write.ts";
import { getTestTargetsFromDb, type TestTarget } from "./graph-test-target.ts";

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
    // ★ F-336 FIX (2026-09-24): `testCoverage` implied a ratio but held a raw count
    // ★ of suggested test targets — callers gauging risk misread it (3 ≠ 3%). Renamed
    // ★ to the measured semantics. No in-repo readers of the old name exist
    // ★ (gi-cli + tests read callers/testTargets only), so the rename is total.
    suggestedTestTargetCount: number;
  };
  commitStrategy: "single" | "split" | "domain-level";
  testTargets: TestTarget[];
  warnings: string[];
}

/** Blast radius ≤5 → single commit. 6–49 → split into micro-commits.
 *  ≥50 → domain-level (architectural review BEFORE coding).
 *  ★ R18-HIGH FIX (2026-09-25): the docstring named ONE leg and the code has TWO. The
 *    strategy ALSO escalates on the DIRECT inbound count — a symbol called directly by
 *    ≥20 sites is domain-level, ≥4 is split — because a wide DIRECT fan-in breaks as many
 *    call sites as a deep transitive reach, and the reader of this contract could not
 *    predict the function's own output. Both legs are named here now.
 *    The ladder is: domain-level if (reaches ≥ 50 OR directInbound ≥ 20); else split if
 *    (reaches ≥ 6 OR directInbound ≥ 4); else single. */
export function preFlight(storePath: string, target: string): PreFlightResult {
  const db = openTypedStore(storePath);
  // ★ F-162 FIX (2026-09-24): name the failing leg — propagation stays LOUD (no
  //   swallow; finally still closes the DB), but the error carries target + leg
  //   instead of a raw driver TypeError.
  try {
    const q = whoCallsInDb(db, target);
    const imp = impactInDb(db, target, 8);

    const byDepth: Record<number, number> = {};
    for (const row of imp.ledger) byDepth[row.depth] = (byDepth[row.depth] ?? 0) + 1;

    // ★ R18-HIGH FIX (2026-09-25): this read had NO LIMIT and its result is interpolated
    //   into a dynamic `IN (?, ?, …)` — one bind parameter per row. A label mapping to tens
    //   of thousands of live canonical IDs builds a statement past SQLite's variable limit
    //   (SQLITE_MAX_VARIABLE_NUMBER) AND past the driver's own arg ceiling: the query throws
    //   instead of answering, on exactly the wide-fan-in symbol this pre-flight exists to
    //   warn about. Capped, and the cap is OBSERVABLE — a truncated read says so in warnings.
    const SRC_ID_CAP = 900; // under SQLITE_MAX_VARIABLE_NUMBER (999) with headroom
    const srcIdRows = db.query(
      "SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL LIMIT ?",
    ).all(target, SRC_ID_CAP + 1) as Array<{ canonical_id: string }>;
    const srcIdsTruncated = srcIdRows.length > SRC_ID_CAP;
    const srcIds = srcIdRows.slice(0, SRC_ID_CAP).map((r) => r.canonical_id);
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
    if (srcIdsTruncated) warnings.push(`USES TRUNCATED: the label ${target} resolves to more than ${SRC_ID_CAP} live canonical IDs — the uses count covers the first ${SRC_ID_CAP} only (the raw-fan-in is larger than reported)`);
    if ((imp as { truncated?: boolean }).truncated === true) warnings.push(`IMPACT TRUNCATED: blast-radius ledger capped at 5000 rows — reachability UNDER-REPORTED for ${target}; commit strategy may be too lenient`);
    if (q.rows === 0 && uses === 0) warnings.push(`NO CONSUMERS: ${target} has zero callers and zero uses — dead-code candidate, safe-delete before building on it`);
    if (imp.reaches >= 50) warnings.push(`WIDE BLAST RADIUS: ${imp.reaches} nodes reached — architectural review required before coding`);

    const directInbound = q.rows;
    let commitStrategy: PreFlightResult["commitStrategy"] = "single";
    if (imp.reaches >= 50 || directInbound >= 20) commitStrategy = "domain-level";
    else if (imp.reaches >= 6 || directInbound >= 4) commitStrategy = "split";

    // ★ F-835 FIX (2026-09-24): the double-handle defect — getTestTargets(storePath) opened a
    //   SECOND openTypedStore handle on the same SQLite file while `db` above was still open
    //   (two WAL locks, 'database is locked' under contention, stale-read surface). The targeting
    //   query now runs on the ALREADY-OPEN `db` (one connection; the finally below still owns it).
    const testTargets = getTestTargetsFromDb(db, target, 5);
    return {
      target,
      directCallers: q.callers.map((c) => ({ caller: c.caller, file: c.file, line: c.line, via: c.predicate ?? "" })),
      blastRadius: { reaches: imp.reaches, byDepth },
      riskProfile: { callers: q.rows, uses, suggestedTestTargetCount: testTargets.length },
      commitStrategy,
      testTargets,
      warnings,
    };
  } catch (e) {
    throw new Error(`GI_PREFLIGHT_FAILED: target ${target} — ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    // ★ F-205 FIX (2026-09-24): a throwing close() must not swallow the
    //   GI_PREFLIGHT_FAILED root cause — close best-effort, the error stands.
    try { db.close(); } catch { /* the pre-flight error (or result) stands */ }
  }
}
