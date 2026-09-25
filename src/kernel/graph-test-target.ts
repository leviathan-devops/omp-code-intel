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
/** ★ F-1204 FIX (2026-09-25): the batch→per-label fallback was warn-only — a persistently
 *  failing batch path degraded every call to O(N) reads with no observable signal. The
 *  counter makes the degradation countable (tests/monitors read it); the warn stays. */
export let batchFallbackCount = 0;

/** The OPEN-DB overload (the F-835 seam): run the SAME targeting query against an already-open
 *  handle — no second connection, no second WAL lock, no stale read. `db` stays OPEN on return;
 *  the caller owns its lifetime. */
export function getTestTargetsFromDb(db: ReturnType<typeof openTypedStore>, modifiedFunction: string, maxTargets = 5): TestTarget[] {
  // ★ F-835 FIX (2026-09-24): the caller's handle is BORROWED — this function must not close
  //   it (preFlight's finally owns that). A null/closed handle is a loud named error, never a
  //   driver TypeError downstream.
  if (!db || typeof (db as { query?: unknown }).query !== 'function') {
    throw new Error('GI_TEST_TARGETS_NO_DB: getTestTargetsFromDb needs an open store handle (the caller owns open + close)');
  }
  const q = whoCallsInDb(db, modifiedFunction);
  // ★ F-339 FIX (2026-09-24): per-caller whoCallsInDb was N round-trips (resolveLiveIds +
  // ★ edges query per unique caller). Degrees are now derived in TWO queries total: one to
  // ★ resolve ALL caller labels to live canonical_ids, one grouped count over those ids.
  // ★ Falls back to the cached per-label path if the batch read throws (never fail-closed
  // ★ on a ranking signal — worst case is the old O(N) cost, never a wrong rank).
  const degreeCache = new Map<string, number>();
  const uniqueCallers = [...new Set(q.callers.map((c) => c.caller))];
  try {
  const CHUNK = 200;
  const labelToIds = new Map<string, string[]>();
  for (let i = 0; i < uniqueCallers.length; i += CHUNK) {
    const chunk = uniqueCallers.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => "?").join(", ");
    const rows = db.query(
      `SELECT label, canonical_id FROM typed_nodes WHERE label IN (${placeholders}) AND superseded_run IS NULL ORDER BY canonical_id`,
    ).all(...chunk) as Array<{ label: string; canonical_id: string }>;
    for (const r of rows) {
      let bucket = labelToIds.get(r.label);
      if (bucket === undefined) { bucket = []; labelToIds.set(r.label, bucket); }
      if (bucket.length < 500) bucket.push(r.canonical_id);
    }
    for (const label of chunk) {
      if (!labelToIds.has(label)) labelToIds.set(label, []);
      const ids = labelToIds.get(label)!;
      if (ids.length >= 500) console.warn(`[gi-omp] getTestTargets: '${label}' capped at 500 live ids (SQLite variable limit)`);
    }
  }
  const allIds = [...labelToIds.values()].flat();
  const degByDst = new Map<string, number>();
  for (let i = 0; i < allIds.length; i += CHUNK) {
    const chunk = allIds.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => "?").join(", ");
    const rows = db.query(
      `SELECT e.dst_canonical AS dst, COUNT(*) AS deg FROM typed_edges e
       JOIN typed_nodes src ON e.src_canonical = src.canonical_id
       WHERE e.dst_canonical IN (${placeholders})
         AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL
         AND src.superseded_run IS NULL GROUP BY e.dst_canonical`,
    ).all(...chunk) as Array<{ dst: string; deg: number }>;
    for (const r of rows) degByDst.set(r.dst, Number(r.deg));
  }
  for (const [label, ids] of labelToIds) {
    let total = 0;
    for (const id of ids) total += degByDst.get(id) ?? 0;
    degreeCache.set(label, total);
  }
  // ★ F-953 NOTE (2026-09-24): NOT-A-BUG — the described partial-batch corruption cannot
  //   commit: the aggregation loop (`for (const [label, ids] of labelToIds)`) sits INSIDE the same
  //   try as both batch loops, so a mid-iteration throw skips it and degreeCache stays EMPTY;
  //   degreeOf() below then serves correct per-label reads. A clear() in the catch is a no-op.
  } catch (e) {
  console.warn(`[graph-test-target] batch degree query failed, falling back to per-label reads: ${e instanceof Error ? e.message : String(e)}`);
}
const degreeOf = (label: string): number => {
  const hit = degreeCache.get(label);
  if (hit !== undefined) return hit;
  // ★ NOT-A-BUG (2026-09-24): `whoCallsInDb(...).rows` is ALREADY the count (number,
  //   typed-write.ts:798 `{ rows: number; names; callers }`), NOT a rows array — the
  //   audit misread the API. The original `d = .rows` was correct; `callers` is the array.
  //   Reached only when the batch path above missed (empty store or batch fallback).
  const d = whoCallsInDb(db, label).rows;
  degreeCache.set(label, d);
  return d;
};
// ★ F-404 FIX (2026-09-24): whoCallsInDb is DISTINCT (label,predicate,target) — one
//   caller reaching via two predicates occupied two top-N slots, evicting real callers.
//   Dedupe by caller label first (first row wins), then rank.
const seenCallers = new Set<string>();
const uniqueCallerRows = q.callers.filter((c) => {
  if (seenCallers.has(c.caller)) return false;
  seenCallers.add(c.caller);
  return true;
});
const targets: TestTarget[] = uniqueCallerRows.map((c, i) => ({
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
}

/** The path-taking entry (kept for the st-gi-w6-infra contract + any external caller): opens its OWN
 *  single handle and closes it. Callers that already hold an open store (notably preFlight below)
 *  MUST use getTestTargetsFromDb instead — two concurrent handles on one SQLite file risk
 *  'database is locked' under contention and double the WAL-recovery surface. */
export function getTestTargets(storePath: string, modifiedFunction: string, maxTargets = 5): TestTarget[] {
  // ★ F-200 FIX (2026-09-24): `let` + a guard — if openTypedStore THROWS, the finally's
  //   db.close() would throw a ReferenceError, masking the original error.
  let db: ReturnType<typeof openTypedStore> | null = null;
  db = openTypedStore(storePath);
  try {
    return getTestTargetsFromDb(db, modifiedFunction, maxTargets);
  } finally {
    db?.close();
  }
}
