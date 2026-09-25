# HIGH slice 3 — 6 findings across 5 files

## src/hunter/diagnostics/fixture-calibration.ts
- **src/hunter/diagnostics/fixture-calibration.ts:265-267** (bug)
  `loadCalibrationFixtures` can return `{ fire: [], golden: [] }` when the fixture directories exist but contain no subdirectories with `manifest.json`. The closed-loop check in `runFixtureCalibration` (line 299-305) passes vacuously over an empty `fixtures.fire` array, and `runCalibration` is called with zero fixtures — likely producing a meaningless pass verdict that proves nothing. Guard against empty fixture arrays after loading (e.g., throw `CALIBRATION_FIXTURE_INVALID: fire fixture directory is empty — at least one fixture is required`).
  ```existing
  const fire = withManifest(fireDir).map((d) => loadFireFixture(d));
  const golden = withManifest(goldenDir).map((d) => loadGoldenFixture(d));
  return { fire, golden };
  ```

## src/hunter/keys/go-key-pool.ts
- **src/hunter/keys/go-key-pool.ts:243-247** (security)
  In the `db()` function, after the main file handle is inserted into `poolDbByPath` (line 264), the sidecar hardening loop (lines 235-249) may throw on a symlink-planted sidecar. The ELOOP catch deletes the plant and re-throws. This propagates out of `db()` and the caller (e.g., `markGoKeyDead`) catches the error in its outer try/catch. However, the `fresh` handle is already in `poolDbByPath` (set on line 264). A subsequent call to `db()` returns this handle (it passes the `SELECT 1` health check), but the sidecar symlink may still be planted (the `fs.unlinkSync` inside the ELOOP catch may have raced with another process recreating it, or the `-shm` plant may still exist). SQLite WAL operations that write to the planted sidecar would follow the symlink. Consider: (a) moving `poolDbByPath.set(want, fresh)` to after the sidecar hardening succeeds, or (b) adding a post-throw cleanup that removes the handle from the map. As written, the throw leaves a usable handle in the cache while the security invariant (no symlink sidecars) is violated.
  ```existing
  const code = (e as NodeJS.ErrnoException)?.code;
      if (code === 'ELOOP') {
        try { fs.unlinkSync(side); } catch { /* already gone */ }
        throw new Error(`GO_POOL_SYMLINK: ${side} is a symlink plant — refusing (removed; retry the open)`);
      }
  ```
  ```suggested
  const code = (e as NodeJS.ErrnoException)?.code;
      if (code === 'ELOOP') {
        try { fs.unlinkSync(side); } catch { /* already gone */ }
        // Remove the main handle from the cache so the caller gets a fresh
        // connection on retry (the next db() open will re-check sidecars).
        poolDbByPath.delete(want);
        throw new Error(`GO_POOL_SYMLINK: ${side} is a symlink plant
  ```

## src/hunter/shared/query-engine.ts
- **src/hunter/shared/query-engine.ts:194-208** (maintainability)
  **Row mapper duplication violates ISE discipline**: The exact same edge row-mapper (shape validation + default fallback) is copy-pasted in `buildPathEdges` (~lines 155-170) and `temporal()` (~lines 253-272). If a new field is added to `TypedEdgeRow`, or a default changes, both copies must be updated in lock-step — a miss silently breaks the other, defeating the stated ISE discipline. Extract a private `mapEdgeRow(r)` method to make the mapping single-source-of-truth.
  ```existing
  edges = rows.map((r) => {
          if (typeof r.id !== 'number' || typeof r.src_canonical !== 'string' || typeof r.dst_canonical !== 'string' || typeof r.predicate !== 'string') {
            throw new Error(`EDGE_ROW_SHAPE: the typed_edges row ${JSON.stringify(r).slice(0, 120)} is missing id/src_canonical/dst_canonical/predicate`);
          }
          return {
            id: r.id,
           
  ```
- **src/hunter/shared/query-engine.ts:246-248** (performance)
  **`community()` has no node-count cap — OOM risk with disconnected singletons**: The 500K-edge guard (line ~188) is necessary but not sufficient. A graph with 499K edges but millions of disconnected singleton nodes (each a live `typed_nodes` row with no edges) passes the edge guard, yet the `nodes` query (line ~192) loads all of them into the adjacency map, potentially exhausting memory. Add a node-count guard analogous to the edge-count guard.
  ```existing
  if (edgeCount > 500000) throw new Error(`COMMUNITY_TOO_LARGE: edges=${edgeCount} exceeds the 500000 in-memory BFS cap (page by predicate or raise the cap deliberately)`);
      const edges = this.db.prepare('SELECT src_canonical, dst_canonical FROM typed_edges WHERE superseded_run IS NULL').all() as Array<{ src_canonical: string; dst_canonical: string }>;
      const nodes = this.db.prepare('SELEC
  ```

## src/hunter/surface/query-tool.ts
- **src/hunter/surface/query-tool.ts:183-197** (performance)
  `whoCalls` returns ALL matching callers with no LIMIT clause, unlike the `violations` verb which caps at MAX_QUERY_ROWS_FULL (2000). On a hub-scale graph a widely-called symbol (e.g. a utility function) could return tens of thousands of rows, consuming unbounded memory and tokens in the caller's context window. Consider clamping the result to `MAX_QUERY_ROWS_FULL` (or accepting `input.limit` / `input.offset`) for consistency with the other verbs.
  ```existing
  const edges = rowsAs<{ src_label: string; src_file: string; src_line: number }>(
    db.prepare(`
      SELECT DISTINCT src.label AS src_label, src.file AS src_file, src.line AS src_line
      FROM typed_edges e
      JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id AND dst.label = ?
      JOIN typed_nodes src ON e.src_canonical = src.canonical_id
      WHERE e.predicate IN ('calls', 'im
  ```

## src/omp/gate-hook.ts
- **src/omp/gate-hook.ts:224-226** (bug)
  The drift-layer `tool_call` handler in `registerGraphGate` does NOT check `event.isAgentOrigin`, unlike the inner `attachGiGraphGate` handler which explicitly filters with `if (event.isAgentOrigin === false) return undefined;`. This means non-agent-origin edits (e.g., programmatic/external writes) still advance drift counters and trigger T2/T3 gate blocks, which is likely unintended. An edit that didn't come from the agent shouldn't count toward the agent's drift budget.
  ```existing
  pi.on("tool_call", (event: Record<string, unknown>) => {
    const name = String(event.toolName ?? "").toLowerCase();
    const isEdit = name === "write" || name === "write_file" || name === "edit" || name === "patch";
  ```
  ```suggested
  pi.on("tool_call", (event: Record<string, unknown>) => {
    const name = String(event.toolName ?? "").toLowerCase();
    if (event.isAgentOrigin === false) return undefined;
    const isEdit = name === "write" || name === "write_file" || name === "edit" || name === "patch";
  ```
