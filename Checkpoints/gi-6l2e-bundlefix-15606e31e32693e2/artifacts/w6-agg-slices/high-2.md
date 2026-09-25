# HIGH slice 2 — 14 findings across 11 files

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:753-759** (bug)
  TOCTOU race in stale-lock recovery: after `fs.unlinkSync(lockPath)` (line 756) and before the `writeFileSync` with `wx` flag (line 757), another process can successfully acquire the lock. Both processes then proceed to build and persist concurrently, with no mutual exclusion. The `wx` flag only prevents creation-race; the window between unlink+recreate is the gap. Consider replacing the unlink+recreate with a compare-and-swap pattern (e.g., read the lock file PID, check if it's still alive via `kill(pid, 0)`, then only replace if dead), or use a file-locking library with proper advisory locking.
  ```existing
  if (rows === null && !haveLock) {
      // Lock holder vanished without persisting (crash between lock and write):
      // take over rather than deadlock on its stale lock.
      try { fs.unlinkSync(lockPath); } catch { /* already gone */ }
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      haveLock = true;
    }
  ```
  ```suggested
  if (rows === null && !haveLock) {
      // Lock holder vanished without persisting (crash between lock and write):
      // take over rather than deadlock on its stale lock — but verify the
      // holder is actually dead before unlinking to avoid the TOCTOU gap.
      let stalePid: number | null = null;
      try {
        const content = fs.readFileSync(lockPath, 'utf8').trim();
        stalePi
  ```
- **src/hunter/diagnostics/engine.ts:590-594** (bug)
  On Windows, `rel` (line 547) uses native separators (e.g., `src\subdir\file.ts`), so the file node ID is `file:src\subdir\file.ts`. But the import edge `targetId` on line 592-594 is constructed using `path.posix` operations, yielding `file:src/subdir/../lib/other.ts` with forward slashes. These two ID formats will never match in the `internal` edge filter (line 627: `keptIds.has(e.sourceId)`), causing all import edges on Windows to be silently dropped as "dangling". Use `path.normalize` instead of `path.posix.*` for the import target ID construction, or normalize both sides.
  ```existing
  if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
        const target = stmt.moduleSpecifier.text;
        const targetId = target.startsWith('.')
          ? `file:${path.posix.normalize(path.posix.join(path.posix.dirname(rel.split(path.sep).join('/')), target))}`
          : `file:${target}`;
  ```
  ```suggested
  if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
        const target = stmt.moduleSpecifier.text;
        const targetId = target.startsWith('.')
          ? `file:${path.normalize(path.join(path.dirname(rel), target))}`
          : `file:${target}`;
  ```

## src/hunter/graph/graphify-adapter.ts
- **src/hunter/graph/graphify-adapter.ts:646-657** (bug)
  Null line guard leak: when both `e.line` and `src?.line` are `null` (not `undefined`), the `??` chain short-circuits and `tryResolveGraphifyLine` is never called. The `line` variable remains `null`, which passes the `=== undefined` drop guard and flows into `graphifyEvidence()` as `line: null`, producing evidence strings like `explicit: wraps in source X->Y @ file.ts:null`. This violates the documented contract that lineless edges are dropped. The root cause is that `GraphEdge.line` is typed `number | null | undefined` — null and undefined both mean 'lineless', but `??` only coalesces `undefined`.
  ```existing
  const line = e.line
      ?? src?.line
      ?? tryResolveGraphifyLine(
        { data: src?.data ?? {}, source_location: rawSourceLocation(src) },
        e as unknown as { source_location?: unknown },
      );
    // W9 CONTRACT RESOLUTION (pipeline contradiction): projectGraphifyGraph
    // DELIBERATELY keeps lineless edges (danglingNoLine count) — the map
    // branch now SKIPS + counts them
  ```
  ```suggested
  const line = (e.line ?? src?.line) != null
      ? (e.line ?? src?.line)
      : tryResolveGraphifyLine(
          { data: src?.data ?? {}, source_location: rawSourceLocation(src) },
          e as unknown as { source_location?: unknown },
        );
    // null OR undefined both mean lineless — the drop guard must catch both.
    if (line == null) { linelessEdgesDropped++; return []; }
  ```

## src/hunter/harness/report.ts
- **src/hunter/harness/report.ts:288-288** (bug)
  `COMMIT` is called **outside** the try-catch block that wraps the transaction body. If `COMMIT` itself throws (e.g. disk-full, I/O error, database locked), the error propagates uncaught through the outer try, gets logged and re-thrown — but **no rollback is attempted**, leaving the transaction in an indeterminate state. The caller receives an error but the report file has already been written to disk, creating an inconsistency between the durable file and the database. Move `COMMIT` inside the try block (just before the closing `}`) and handle its failure with a rollback, or at minimum wrap it in its own try-catch with rollback.
  ```existing
  input.db.exec('COMMIT');
  ```
  ```suggested
  input.db.exec('COMMIT');
    } catch (dbErr: unknown) {
      try { input.db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        throw new Error(`REPORT_COMMIT_FAILED: commit error=${dbErr instanceof Error ? dbErr.message : String(dbErr)} rollback error=${rbErr instanceof Error ? rbErr.message : String(rbErr)} (the transaction may still be open — do not reuse this handle for writes)`);
      }
  
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:719-730** (bug)
  **Bug: `branch_union_view` is dropped but never recreated in `writeBranchView`**

After the `DELETE FROM graph_edges/graph_nodes` + re-inserts in the transaction, `writeBranchView` drops `branch_union_view` and then creates `branch_union_attached` (inside a try-catch). However, `getBranchUnion()` queries `branch_union_view` — NOT `branch_union_attached`. This means after the first `writeBranchView` call, the primary view path in `getBranchUnion` will always fail (the view no longer exists), forcing every subsequent call through the fallback manual union. The `branch_union_attached` view is created but never queried anywhere, making it dead code.

This defeats the purpose of the view-based optimization and means the `ATTACH DATABASE` + `branch_union_attached` code path is entirely unused.
  ```existing
  try {
      this.branchDb.exec("DROP VIEW IF EXISTS branch_union_view");
      this.branchDb.exec("CREATE VIEW branch_union_view AS SELECT id, kind, name, file, line, lineage, source, data, 'family' as origin FROM family_nodes UNION ALL SELECT id, kind, name, file, line, lineage, source, data, 'delta' as origin FROM graph_nodes");
    } catch (idemErr) { /* idempotent guard */ console.debug("[kg-s
  ```
  ```suggested
  try {
      this.branchDb.exec("DROP VIEW IF EXISTS branch_union_attached");
      this.branchDb.exec(`ATTACH DATABASE '${this.familyPath.replace(/'/g, "''")}' AS family_attached`);
      this.branchDb.exec("CREATE VIEW branch_union_attached AS SELECT id, kind, name, file, line, lineage, source, data, 'family' as origin FROM family_attached.family_nodes UNION ALL SELECT id, kind, name, file, line,
  ```

## src/kernel/graph-pre-flight.ts
- **src/kernel/graph-pre-flight.ts:15-19** (maintainability)
  **Misleading field name**: `riskProfile.testCoverage` is set to `testTargets.length` (a count of suggested test targets), but the name `testCoverage` strongly implies a percentage or ratio (e.g., 0.0–1.0 or 0–100). Any caller inspecting this field to gauge risk will draw incorrect conclusions — e.g., a value of 3 does not mean 3% coverage. Rename to `suggestedTestTargetCount` or `potentialTestTargets` to match actual semantics.
  ```existing
  riskProfile: {
    callers: number;
    uses: number;
    testCoverage: number;
  };
  ```
  ```suggested
  riskProfile: {
    callers: number;
    uses: number;
    /** Number of suggested test targets returned by the graph query, NOT a coverage ratio. */
    suggestedTestTargetCount: number;
  };
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:107-108** (security)
  `scopeRoot` is accepted but never referenced inside `abideProbe`. Every other adapter (c2kg, corbell, graphify, kev, semantica, tsg, ua) uses `scopeRoot` to scope file access to the workspace. Here the events path is resolved from the separate `abideRoot` param (or a hardcoded absolute default), completely bypassing the scope boundary that `scopeRoot` is meant to enforce. This means any caller that passes a confined `scopeRoot` gets no isolation — the adapter reads from an absolute path regardless. Either `scopeRoot` should be used to derive `abideRoot` (e.g., `path.join(scopeRoot, ABIDE_EVENTS_REL)`), or the parameter should be removed to make the omission explicit.
  ```existing
  export function abideProbe(scopeRoot: string, abideRoot?: string): ConsumerProbe {
  const eventsPath = abideEventsPath(abideRoot);
  ```
  ```suggested
  export function abideProbe(scopeRoot: string, abideRoot?: string): ConsumerProbe {
  const eventsPath = abideEventsPath(abideRoot ?? scopeRoot);
  ```
- **src/omp/adapters/abide.ts:38-40** (maintainability)
  Hardcoded absolute workspace path `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace` as the default. This is a user-specific, environment-specific path baked into production code. If the deployment environment changes or another user runs this, it silently resolves to a non-existent directory (or worse, a different agent's ledger). The default should come from an environment variable or be derived from `scopeRoot`.
  ```existing
  export function abideEventsPath(abideRoot?: string): string {
  return path.join(abideRoot ?? "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace", ABIDE_EVENTS_REL);
}
  ```
  ```suggested
  export function abideEventsPath(abideRoot?: string): string {
  const root = abideRoot ?? process.env.JARVIS_WORKSPACE ?? "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace";
  return path.join(root, ABIDE_EVENTS_REL);
}
  ```

## src/omp/calibration.ts
- **src/omp/calibration.ts:76-77** (bug)
  Input validation is missing for negative count values. If `confirmed`, `refuted`, or `unresolved` are negative, the function silently produces mathematically invalid results — negative denominators in Wilson formulas, imprecision values below 0, and potentially misleading `sufficient`/`starved` flags. The resolved count on line 81 could become negative, causing the Wilson denominator to flip sign. Add validation at the top of `precisionFromCounts` to reject negative values.
  ```existing
  export function precisionFromCounts(c: ResolvedCounts, z = 1.96): PrecisionEstimate {
  const resolved = c.confirmed + c.refuted;
  ```
  ```suggested
  export function precisionFromCounts(c: ResolvedCounts, z = 1.96): PrecisionEstimate {
  if (c.confirmed < 0 || c.refuted < 0 || c.unresolved < 0) {
    throw new Error(`CALIBRATION_BAD_COUNTS: counts must be non-negative (confirmed=${c.confirmed}, refuted=${c.refuted}, unresolved=${c.unresolved})`);
  }
  const resolved = c.confirmed + c.refuted;
  ```

## src/omp/gi-registry.ts
- **src/omp/gi-registry.ts:13-21** (performance)
  Missing index on `store_path` column. `findGiSessionByStorePath` performs a WHERE filter on `store_path`, but the schema only defines a PRIMARY KEY on `session_id`. As the number of sessions grows, every lookup via this function becomes a full table scan. Add an explicit index in the schema (e.g., `CREATE INDEX IF NOT EXISTS idx_gi_sessions_store_path ON gi_sessions(store_path)`) to make this query O(log n).
  ```existing
  export const GI_REGISTRY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS gi_sessions (
    session_id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    scope_root TEXT NOT NULL,
    store_path TEXT NOT NULL,
    opened_at TEXT NOT NULL
  )`,
];
  ```
  ```suggested
  export const GI_REGISTRY_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS gi_sessions (
    session_id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',
    scope_root TEXT NOT NULL,
    store_path TEXT NOT NULL,
    opened_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_gi_sessions_store_path ON gi_sessions(store_path)`,
];
  ```

## src/omp/oracle.ts
- **src/omp/oracle.ts:445-464** (bug)
  **Partial write on `gather` throw violates O4 pre-validate invariant.**

The `gather` call at line 295 is OUTSIDE the try/catch that wraps `recordTruth` (lines 307-311). `gather` can throw `GI_ORACLE_NO_SUBJECT` when a pair has neither `row.target` nor a caller-supplied `subject`. If this throws after earlier rows have already been committed via `recordTruth`, the function exits with an unhandled exception — no report is returned, and the caller receives a raw error while the ledger contains a partial write.

This directly violates the O4 principle stated at line 259: "PRE-VALIDATE THE WHOLE BATCH BEFORE THE FIRST WRITE … refusing the WHOLE batch so no partial write can occur." The `notAfter` validation (line 273) was correctly moved up for this exact reason (F-OR1 fix), but subject validation was not.

**Suggested fix:** Either (a) add subject validation to the pre-validation section (checking that every unresolved pair in `unresolved` has a resolvable subject — `row.target` present or `subject` non-undefined), OR (b) wrap `gather` in a try/catch that pushes to `report.failed` and continues, consistent with how `recordTruth` failures are handled.
  ```existing
  const c = classify(gather(row, subject, records, opts));
    if (c.truth === "unresolved") { report.leftUnresolved += 1; continue; }

    // the stamp was validated for the WHOLE batch above (O4) — one `now()` for the
    // batch also means every row in it carries the SAME resolution time.
    // ★ PASS-3 HIGH, RE-APPLIED (EN-064): THE RETURN VALUE IS READ, and the two
    //   counters are now W
  ```
  ```suggested
  // Pre-validate subject: every unresolved pair must be resolvable.
    for (const { row, subject: subj } of unresolved) {
      const fromRow = row.target !== undefined && row.target !== '';
      if (!fromRow && subj === undefined) {
        throw new Error(
          `GI_ORACLE_NO_SUBJECT: pair for state ${row.stateHash} has no row.target and no caller-supplied subject — ` +
          `refusing 
  ```

## src/scoping/gi-session-path.ts
- **src/scoping/gi-session-path.ts:41-55** (security)
  `assertSessionStorePath` only validates the path *tail* via `SESSION_STORE_RE` but does not verify the `GI_STATE_DIR` (`.omp/graph-intelligence`) prefix. A crafted path like `/tmp/sessions/abcdefgh/store.sqlite` would pass this guard but is not under the expected state directory. This weakens the anti-leak defense. Consider verifying that the path contains `GI_STATE_DIR` as a segment before the `/sessions/` portion.
  ```existing
  export function assertSessionStorePath(p: string): void {
  const norm = p.replace(/\\/g, "/");
  if (isGlobalHomeGraph(norm)) {
    throw new GiPathError(
      "GI_GLOBAL_HOME_GRAPH",
      `GI_GLOBAL_HOME_GRAPH: session store must not be ${norm}`,
    );
  }
  if (!SESSION_STORE_RE.test(norm)) {
    throw new GiPathError(
      "GI_SHARED_PROJECT_STORE",
      `GI_SHARED_PROJECT_STORE: path mus
  ```
  ```suggested
  const GI_STATE_SEG = GI_STATE_DIR.replace(/\\/g, "/");

export function assertSessionStorePath(p: string): void {
  const norm = p.replace(/\\/g, "/");
  if (isGlobalHomeGraph(norm)) {
    throw new GiPathError(
      "GI_GLOBAL_HOME_GRAPH",
      `GI_GLOBAL_HOME_GRAPH: session store must not be ${norm}`,
    );
  }
  if (!norm.includes(`/${GI_STATE_SEG}/`)) {
    throw new GiPathError(
      "GI_
  ```

## src/scoping/session-state.ts
- **src/scoping/session-state.ts:85-87** (bug)
  TOCTOU race in lock release: Between `readFileSync(lockPath)` returning our token and the subsequent `unlinkSync(lockPath)`, a peer can reclaim the expired lock (creating a new lock file with its own token). Our unlink then destroys the peer's fresh lock, breaking mutual exclusion for the peer's critical section. The token check mitigates the simpler case where the peer's lock already exists when we read, but the non-atomic read-then-unlink window is a genuine race. Consider using an exclusive operation or at minimum catching and ignoring EEXIST/ENOENT scenarios more carefully. In practice the window is tiny (two syscalls), but under the very conditions that trigger reclaim (>5s hold), it coincides exactly with when the race is live.
  ```existing
  let holder = "";
    try { holder = fs.readFileSync(lockPath, "utf8").trim(); } catch { /* gone */ }
    if (holder === token) { try { fs.unlinkSync(lockPath); } catch { /* gone */ } }
  ```
- **src/scoping/session-state.ts:83-88** (bug)
  No heartbeat inside critical section: The lock file's mtime is set once at creation (`writeFileSync` with `flag: 'wx'`) and never updated. The 5s stale-reclaim threshold (line 90) compares against this creation mtime. If the wrapped `fn()` takes longer than 5s to complete, another process will consider the lock abandoned, reclaim it, and enter the critical section concurrently — silently breaking mutual exclusion with no error or log. This is especially dangerous because the caller has no way to know the lock was lost. Consider either (a) extending the reclaim threshold well beyond any realistic critical-section duration, (b) periodically touching the lock file's mtime during execution, or (c) documenting that `withStateLock` callers must guarantee fn() completes in under 5s.
  ```existing
  try { return fn(); }
  finally {
    let holder = "";
    try { holder = fs.readFileSync(lockPath, "utf8").trim(); } catch { /* gone */ }
    if (holder === token) { try { fs.unlinkSync(lockPath); } catch { /* gone */ } }
  }
  ```
