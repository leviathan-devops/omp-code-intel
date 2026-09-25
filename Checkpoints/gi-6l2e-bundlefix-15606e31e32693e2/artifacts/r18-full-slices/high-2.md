# HIGH slice 2 — 8 findings across 6 files

## src/hunter/hooks/bus-hook.ts
- **src/hunter/hooks/bus-hook.ts:65-65** (performance)
  The `failedEvents` array grows without bound. If subscribers repeatedly throw, every failed event is pushed and never evicted — even after `retryFailed` is called, failed retries are re-pushed. Over a long-running session this is a memory leak. Consider adding a maximum size (e.g., 1000) with oldest-first eviction, or at minimum document the expected bound.
  ```existing
  private readonly failedEvents: Array<{ row: EventRow; payload: Record<string, unknown>; error: unknown; attempt: number; failedIndex: number }> = [];
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:583-609** (bug)
  mirrorToMasterContext reads graph_nodes, graph_edges, findings, and events via four separate SELECT statements without wrapping them in a source-level read transaction. Under concurrent WAL writes (the two-agent concurrency model), the source DB state can change between the first SELECT (graph_nodes) and the last (events). This can produce a mirror with orphaned edges referencing nodes that no longer exist in the source, or findings referencing run_ids whose events are partially copied. The mirror is supposed to be a faithful SUMMARY snapshot (D27), but this can yield an internally inconsistent copy. Wrap all four source reads inside `this.handle.transaction(...)` (a read-only transaction) to get a consistent snapshot.
  ```existing
  try {
      const rebuild = openMirror.transaction((): void => {
        openMirror.exec('DROP TABLE IF EXISTS events; DROP TABLE IF EXISTS findings; DROP TABLE IF EXISTS graph_edges; DROP TABLE IF EXISTS graph_nodes;');
        openMirror.exec(MIRROR_SCHEMA_SQL);
        // the graph (the nodes + the edges)
        const nodeIns = openMirror.prepare('INSERT OR REPLACE INTO graph_nodes VALUES (?,?
  ```
  ```suggested
  try {
      // Wrap source reads in a read-only transaction for consistent snapshot
      const snapshot = this.handle.transaction((): {
        nodes: Record<string, SQLQueryBindings>[];
        edges: Record<string, SQLQueryBindings>[];
        findings: Record<string, SQLQueryBindings>[];
        events: Record<string, SQLQueryBindings>[];
      } => ({
        nodes: this.handle.prepare('SELEC
  ```
- **src/hunter/shared/db.ts:819-819** (bug)
  The catch-all in the family_nodes fallback read swallows ALL non-FAMILY_NODE_CORRUPT errors (I/O errors, disk-full, schema drift, connection failure) by debug-logging and continuing with an empty `out`. This means the caller gets a partial result (delta nodes only, family nodes silently missing) with no indication anything went wrong — directly contradicting the file's stated fail-closed contract. A corrupt DB, unmounted disk, or schema mismatch would produce a silently incomplete union. Re-throw non-FAMILY_NODE_CORRUPT errors so the caller sees the real failure.
  ```existing
  } catch (famErr) { if (famErr instanceof Error && famErr.message.startsWith('FAMILY_NODE_CORRUPT')) throw famErr; console.debug('[kg-store] family_nodes fallback read failed:', famErr instanceof Error ? famErr.message : String(famErr)); }
  ```
  ```suggested
  } catch (famErr) {
      if (famErr instanceof Error && famErr.message.startsWith('FAMILY_NODE_CORRUPT')) throw famErr;
      throw new Error(`FAMILY_READ_FAILED: fallback read of family_nodes failed (${famErr instanceof Error ? famErr.message : String(famErr)})`);
    }
  ```

## src/hunter/shared/migrations.ts
- **src/hunter/shared/migrations.ts:24-24** (maintainability)
  Hardcoded `'has_finding'` string literal is not derived from a shared constant (e.g., from `ontology.ts`). If the predicate string in `report.ts` changes, this CHECK constraint silently becomes stale — writes using the new predicate will be rejected, or worse, if the CHECK is on a pre-existing table (as documented), new predicates will pass through unchecked with no runtime detection.
  ```existing
  const GRAPH_FACT_PREDICATES_SQL = `${PREDICATES_SQL},'has_finding'`;
  ```
  ```suggested
  // Import the predicate from its canonical source to keep DDL in sync.
// e.g. import { HAS_FINDING } from './ontology.ts';
const GRAPH_FACT_PREDICATES_SQL = `${PREDICATES_SQL},'${HAS_FINDING}'`;
  ```

## src/omp/fire-ledger.ts
- **src/omp/fire-ledger.ts:609-615** (bug)
  **[Concurrency] TOCTOU race in `drain()` — concurrent async `judgeWithPersist` calls can double-write rows.**

Between checking `!seen.has(row)` and the eventual `seen.add(row)` (after `appendManyDetailed` returns), another concurrent `drain()` call can observe the same row as unseen, create its own `fresh` array containing it, and both calls persist the same row. This is the exact watermark-integrity bug the module exists to prevent (§8.1: "a fire is persisted exactly once").

The fix is to snapshot unseen rows and mark them seen **before** committing, then remove marks only on failure. Alternatively, use an atomic set-then-add pattern (e.g., pre-add a sentinel to prevent re-draining while the write is in flight).
  ```existing
  const fresh: DecisionRow[] = [];
  let poison = poisoned.get(key);
  if (poison === undefined) { poison = new Set<string>(); poisoned.set(key, poison); }
  for (const row of gate.rows()) {
    if (!seen.has(row) && !poison.has(poisonSignature(row))) fresh.push(row);
  }
  if (fresh.length === 0) return 0;
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:0-0** (bug)
  If `db.exec("BEGIN IMMEDIATE;")` itself throws (e.g., database locked, disk full), the exception bypasses the inner try/catch entirely and goes straight to the finally block. The db handle is closed but no ROLLBACK is attempted. While technically no transaction is active (BEGIN never completed), the caller has no way to distinguish this failure from a COMMIT failure — the `metaDegraded` flag remains `false` and the success result is returned with stale/missing meta. The outer try should catch this and set metaDegraded = true.
  ```existing
  const db = openTypedStore(storePath);
    let metaDegraded = false;
    try {
      db.exec("BEGIN IMMEDIATE;");
  ```
  ```suggested
  const db = openTypedStore(storePath);
    let metaDegraded = false;
    try {
      db.exec("BEGIN IMMEDIATE;");
      db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["substrate", "corbell"]);
      db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["corbell_checkout", corbe
  ```

## src/omp/rsi.ts
- **src/omp/rsi.ts:525-527** (security)
  `forgeForTest()` and `forceSupersedeForTest()` are test-only helpers that bypass all HMAC signing and verified-retirement invariants, yet they are `public` methods on `RsiStore`. Any production code that holds a reference to the store can call them, inserting arbitrary forged rows or force-retiring live rows without a verifying successor. If the test helper cannot be moved to a subclass or test-only module, at minimum consider gating these behind a flag or moving them to a separate test-utility export so they are not accessible through the normal API surface.
  ```existing
  /** A FORGED WRITE — the attack shape, used by the tests to prove the reader
   *  rejects it. Never called by the kernel path. */
  forgeForTest(row: Partial<ReflexRow> & { canonicalId: string; createdRun: string }, sig: string): void {
  ```
  ```suggested
  // Move to a test-only module or subclass, e.g.:
  //   export class RsiStoreForTest extends RsiStore { forgeForTest(...) { ... } }
  // Or gate behind a debug flag:
  //   if (!this.debugMode) throw new Error('forgeForTest is test-only');
  ```
- **src/omp/rsi.ts:417-419** (bug)
  `recount()` is a public method but performs per-row HMAC verification across the entire evidence ledger for a given `canonical_id`. When called externally (outside a `BEGIN IMMEDIATE` transaction), concurrent `appendFiring`/`appendOutcome` calls can commit mid-recount, producing a stale or internally-inconsistent count. Consider either (a) making `recount()` private and only callable from within transaction-holding methods, or (b) having it acquire its own `BEGIN IMMEDIATE` transaction if not already in one, or (c) at least documenting that callers MUST hold an IMMEDIATE transaction.
  ```existing
  /** RECOMPUTE from the ledger — the SC-4 self-reference kill. Counts the
   *  outcome rows; NEVER reads or increments a counter on the row. */
  recount(canonicalId: string): { confirmed: number; refuted: number; unresolved: number } {
  ```
  ```suggested
  // Option A: make private, only called from supersede()
  private recount(canonicalId: string): { confirmed: number; refuted: number; unresolved: number } {
  // Option B: self-acquire transaction if not already in one
  recount(canonicalId: string): { confirmed: number; refuted: number; unresolved: number } {
    const inTx = this.db.query('SELECT * FROM pragma_database_list').all().length > 0; /
  ```
