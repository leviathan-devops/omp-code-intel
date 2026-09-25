# HIGH slice 5 — 7 findings across 6 files

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:115-118** (bug)
  The `GraphEdge` interface (both in `interface.ts:69-78` and `db.ts:125-130`) does NOT declare `source_location` or `metadata` fields. The double-cast `(e as unknown as Record<string, unknown>)` accesses these fields at runtime, but the TypeScript type system cannot verify they exist. If adapters never populate these properties on edge objects, the entire `edgeLocByTarget` map always contains `{ source_location: undefined, metadata: undefined }` entries, making the F-332 fix and all edge-based line resolution dead code — nodes that depend solely on edge metadata for line resolution will be falsely refused as LINELESS_NODE.

Either the `GraphEdge` interface should be extended with `source_location?: unknown` and `metadata?: Record<string, unknown>` (if adapters actually produce them), or this edge resolution path should be documented as a no-op placeholder for a future adapter wave.
  ```existing
  const edgeLocByTarget: Record<string, { source_location?: unknown; metadata?: unknown }> = {};
  for (const e of buildResult.edges) {
    const rec = e as unknown as Record<string, unknown>;
    const cand = { source_location: rec['source_location'], metadata: rec['metadata'] };
  ```
  ```suggested
  // NOTE: if adapters produce edges with source_location/metadata at runtime,
  // the GraphEdge interface in interface.ts and db.ts should declare these fields
  // so the TypeScript compiler can verify this access:
  //   source_location?: unknown;
  //   metadata?: Record<string, unknown>;
  const edgeLocByTarget: Record<string, { source_location?: unknown; metadata?: unknown }> = {};
  for (con
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:819-819** (bug)
  **Fail-closed violation in fallback path**: The outer `catch` on line 819 catches ANY error from the family read (including DB corruption, permission errors, connection failures), but only re-throws `FAMILY_NODE_CORRUPT`. All other errors are silently logged at debug level, and the method returns *partial* data (delta nodes only, family silently dropped). This contradicts the file's stated fail-closed philosophy (the R15 FIX on the inner try already enforces it for JSON corruption). A corrupt or inaccessible family DB should be loud, not silently swallowed — returning partial union data is worse than failing, because downstream consumers trust the result is complete.
  ```existing
  } catch (famErr) { if (famErr instanceof Error && famErr.message.startsWith('FAMILY_NODE_CORRUPT')) throw famErr; console.debug('[kg-store] family_nodes fallback read failed:', famErr instanceof Error ? famErr.message : String(famErr)); }
  ```
  ```suggested
  } catch (famErr) {
      if (famErr instanceof Error && famErr.message.startsWith('FAMILY_NODE_CORRUPT')) throw famErr;
      // Any other error (DB corruption, I/O, permission) must be loud — returning partial
      // union data silently is worse than failing, because callers trust completeness.
      throw new Error(`FAMILY_READ_FAILED: ${famErr instanceof Error ? famErr.message : String(famErr
  ```

## src/hunter/shared/query-engine.ts
- **src/hunter/shared/query-engine.ts:194-208** (maintainability)
  **Edge row mapper is copy-pasted identically** in `buildPathEdges` and `temporal()`. Both perform the same field validation (EDGE_ROW_SHAPE check) and the same fallback-default mapping for `evidence_quote`, `confidence`, `created_run`, and `superseded_run`. If the `typed_edges` schema evolves (e.g., a new column is added or a field changes nullability), one copy will be updated and the other silently drifts. Extract a private `mapEdgeRow(r: Record<string, unknown>): TypedEdgeRow` helper and call it from both sites.
  ```existing
  edges = rows.map((r) => {
          if (typeof r.id !== 'number' || typeof r.src_canonical !== 'string' || typeof r.dst_canonical !== 'string' || typeof r.predicate !== 'string') {
            throw new Error(`EDGE_ROW_SHAPE: the typed_edges row ${JSON.stringify(r).slice(0, 120)} is missing id/src_canonical/dst_canonical/predicate`);
          }
          return {
            id: r.id,
           
  ```
  ```suggested
  private static mapEdgeRow(r: Record<string, unknown>): TypedEdgeRow {
  if (typeof r.id !== 'number' || typeof r.src_canonical !== 'string' || typeof r.dst_canonical !== 'string' || typeof r.predicate !== 'string') {
    throw new Error(`EDGE_ROW_SHAPE: the typed_edges row ${JSON.stringify(r).slice(0, 120)} is missing id/src_canonical/dst_canonical/predicate`);
  }
  return {
    id: r.id,
    src
  ```
- **src/hunter/shared/query-engine.ts:293-308** (maintainability)
  **Temporal filter SQL clause construction is duplicated** for nodes and edges. The `createdRun`, `liveOnly`, and `supersededRun` filter logic is repeated independently for both the node query and the edge query, with subtly different SQL fragments and parameter arrays. A change applied to one branch (e.g., adding a new filter dimension) that is not mirrored to the other will silently return inconsistent node/edge sets. Extract a helper like `buildTemporalWhere(tableAlias: string, filter: TemporalFilter): { sql: string; params: unknown[] }`.
  ```existing
  let nodeSql = 'SELECT id, canonical_id, kind, label, file, line, created_run, superseded_run FROM typed_nodes WHERE 1=1';
      const nodeParams: unknown[] = [];
      if (filter.createdRun !== undefined) {
        if (typeof filter.createdRun !== 'string' || filter.createdRun.trim().length === 0) throw new Error('TEMPORAL_INVALID: createdRun must be non-empty string');
        nodeSql += ' AND cr
  ```
  ```suggested
  private buildTemporalClauses(filter: TemporalFilter): { where: string; params: unknown[] } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.createdRun !== undefined) {
    if (typeof filter.createdRun !== 'string' || filter.createdRun.trim().length === 0) throw new Error('TEMPORAL_INVALID: createdRun must be non-empty string');
    clauses.push('AND created_run = ?');
  ```

## src/omp/adapters/_shared.ts
- **src/omp/adapters/_shared.ts:226-233** (bug)
  `storeFacts` returns facts from the store without verifying freshness, yet `assertStoreFresh` exists as a separate exported function. If a caller omits the freshness check (or a new adapter is added without it), stale / superseded graph data is silently served. Since `storeFacts` is the single public entry point for store reads, the freshness gate should be enforced here to make staleness bugs structurally impossible rather than relying on every caller's discipline.
  ```existing
  export function storeFacts(
  consumer: ConsumerId,
  rung: Rung,
  storePath: string,
  subject: string,
  limit = 50,
): LayerFact[] {
  const db = openReadOnly(storePath);
  ```
  ```suggested
  export function storeFacts(
  consumer: ConsumerId,
  rung: Rung,
  storePath: string,
  subject: string,
  limit = 50,
): LayerFact[] {
  assertStoreFresh(storePath); // enforce staleness gate at the single read entry point
  const db = openReadOnly(storePath);
  ```

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:0-0** (maintainability)
  **Duplicated probe validation logic between `auditOne` and `factsForWithFaults` is the root cause of the F-405 through F-1209 bug class.** The probe-shape validation (lines 146-149 vs 247-258), the up()-throw handling (lines 150-152 vs 264-270), and the facts-shape validation (lines 170-186 vs 275-288) are independently implemented in two separate code paths. Despite the comments explicitly naming this as the drift class, the fix pattern so far has been to patch each path separately and add a comment noting the other must also be patched. This is inherently fragile — the next consumer addition or probe contract change will likely reintroduce two-view drift.

**Recommendation**: Extract the shared probe+facts validation into a helper function that returns a discriminated result (e.g., `{status: 'down', evidence} | {status: 'error', reason} | {status: 'ok', facts: LayerFact[]}`), then have both `auditOne` and `factsForWithFaults` consume that single result. This eliminates the entire two-view drift class in one structural change.
  ```existing
  const auditOne = (p: ConsumerProbe, subject: string): ConsumptionReport => {
    let probe: SubstrateProbe;
    try {
      const raw = p.up() as SubstrateProbe | null | undefined;
      probe = raw !== null && raw !== undefined && typeof raw.up === "boolean"
        ? { up: raw.up, evidence: typeof raw.evidence === "string" ? raw.evidence : "" }
        : { up: false, evidence: "the probe returne
  ```
  ```suggested
  /** Shared probe+facts validation — single source of truth for both audit and factsFor views. */
  type ProbeResult = 
    | { status: 'down'; evidence: string }
    | { status: 'error'; reason: string }
    | { status: 'ok'; facts: LayerFact[] };

  const probeAndQuery = (p: ConsumerProbe, subject: string): ProbeResult => {
    let probe: SubstrateProbe;
    try {
      const raw = p.up() as Subs
  ```

## src/omp/typed-write.ts
- **src/omp/typed-write.ts:404-410** (bug)
  Both catch blocks silently swallow ALL errors with a comment about fresh stores. A real failure — permission denied (EACCES), corrupt database, disk full — would also be swallowed here, leaving the caller unaware that layer_id columns were never added. Only catch specific error codes (e.g., SQLITE_ERROR for 'no such table') and rethrow everything else.
  ```existing
  } catch { /* no rows to backfill on a fresh store */ }
  try {
    db.run(
      `UPDATE typed_edges SET layer_id = substr(src_canonical, 1, instr(src_canonical, ':') - 1)
       WHERE layer_id IS NULL AND instr(src_canonical, ':') > 0`,
    );
  } catch { /* fresh store */ }
  ```
  ```suggested
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!/no such table|no such column/i.test(msg)) throw e;
    /* fresh store without typed_nodes */
  }
  try {
    db.run(
      `UPDATE typed_edges SET layer_id = substr(src_canonical, 1, instr(src_canonical, ':') - 1)
       WHERE layer_id IS NULL AND instr(src_canonical, ':') > 0`,
    );
  } catch (e) {
    const msg
  ```
