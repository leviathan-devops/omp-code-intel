# R6-HIGH slice 4 — 10 findings across 9 files

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:0-0** (bug)
  P3 uses `ctx.graph.nodes()` directly to iterate candidates, bypassing the edge-anchored traversal pattern that every other predicate in this file enforces. The file's architecture preamble explicitly states the rule: 'THE ANCHOR — candidate files resolve through the graph edges (resolveEdgeAnchor …), never nodes() as a file list' and 'an empty anchor set returns ZERO findings (no anchor = no scan).' P3 violates this invariant by scanning every function/method/class node in the graph and then independently querying `whoCalls()` for each. This means P3 will scan files outside the project's edge-scoped working set, produce findings for nodes that no edge traversal would ever reach, and emit evidence strings that manually construct the 'edge NONE' leg rather than citing a real traversed edge. This should be converted to use `resolveEdgeAnchor` with an appropriate AnchorSpec (callSymbols + defMatchers matching the enforcement/gate/guard identifiers) so that P3's findings carry genuine edge citations and respect the zero-anchor = zero-scan invariant.
  ```existing
  check(ctx) {
    const findings: Finding[] = []; const sev = bindSeverity(ctx.bindings);
    for (const node of ctx.graph.nodes()) {
      if (node.kind !== 'function' && node.kind !== 'method' && node.kind !== 'class') continue;
      if (!/(enforce|gate|guard|STATE_GATE)/i.test(node.name)) continue;
      let callers: { file: string; line: number; caller: string }[];
      try {
        callers 
  ```

## src/hunter/harness/hunt-lock.ts
- **src/hunter/harness/hunt-lock.ts:10-14** (bug)
  The `hostname` field in `HuntLockPayload` is always written during `acquireHuntLock` but is never read or validated anywhere in the codebase — not during stale detection, not during release, not during the race-condition re-read. This means two machines sharing a filesystem could hold the same lock if their PIDs and timestamps happen to collide. Consider validating `hostname` in `isStale` (e.g., stale if hostname differs from the current host) or documenting that single-host is a hard prerequisite.
  ```existing
  export interface HuntLockPayload {
  pid: number;
  acquiredAt: string;
  hostname: string;
}
  ```

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:46-49** (bug)
  Missing `finalize()` calls for prepared statements. The `StatementLike` interface (db.ts:177-182) exposes a `finalize()` method, and bun:sqlite requires it to release the native handle. In `writeBattery`, the INSERT statement is not finalized if the loop or COMMIT throws, leaking the native handle. In `writeRuleCards`, neither the DELETE statement nor the INSERT statement (`ins`) are finalized — same resource-leak issue. Both statements should be finalized in a `finally` block or after the loop completes.
  ```existing
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  for (const p of battery) {
  ```
  ```suggested
  const stmt = db.prepare(
    `INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  try {
    for (const p of battery) {
      const checkCode = JSON.stringify({ template: p.template, bindings: p.bindings });
      stmt.run(
        p.id, p.family, p.template, JSON.stringify(p.bindings),
        p.verbatimQuote, p.anchor, p.severity, chec
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:139-142** (bug)
  When `conformanceZero` is true, `onAuditDone` clears `this.state` but does NOT clear `this.recent` (the dedup window). The dedup map retains stale file+rule counters from prior findings. On the next `diagnosticsFor` + `inject` cycle, the stale `recent` entries cause already-cleared diagnostics to display as 'N repeated' instead of being omitted. The `recent` map should be cleared alongside `state`.
  ```existing
  onAuditDone({ conformanceZero }: { conformanceZero: boolean }): void {
    this.conformanceZero = conformanceZero;
    if (conformanceZero) this.state.clear();
  }
  ```
  ```suggested
  onAuditDone({ conformanceZero }: { conformanceZero: boolean }): void {
    this.conformanceZero = conformanceZero;
    if (conformanceZero) {
      this.state.clear();
      this.recent.clear();
    }
  }
  ```
- **src/hunter/surface/lsp-injector.ts:352-358** (bug)
  `enforceBacklog` deduplicates the queue by `path.basename(f)`, keeping only the last occurrence per basename. Under rapid file churn in a monorepo, this silently drops events for files with the same basename in different directories (e.g. `src/utils/index.ts` vs `lib/utils/index.ts` — both basenames 'index.ts', only the last path survives). The dropped files will never be reparsed, causing stale diagnostics. Consider deduplicating by full path, or at least warning which files were dropped.
  ```existing
  private enforceBacklog(): void {
    if (this.queue.length > WATCHER_BACKLOG_CAP) {
      console.warn(WATCHER_STALLED);
      const folded = new Map<string, string>();
      for (const f of this.queue) folded.set(path.basename(f), f);
      this.queue = [...folded.values()];
    }
  ```
  ```suggested
  private enforceBacklog(): void {
    if (this.queue.length > WATCHER_BACKLOG_CAP) {
      console.warn(WATCHER_STALLED);
      // Keep only the most recent entry per full path to avoid cross-directory basename collisions.
      const folded = new Map<string, string>();
      for (const f of this.queue) folded.set(f, f);
      this.queue = [...folded.values()];
    }
  ```

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:179-183** (bug)
  The splice fix still has a race condition. Two concurrent `execute()` calls each build their own local `evidence` array, then both perform `this.evidence.splice(0, this.evidence.length, ...evidence)`. The second caller's splice overwrites the first caller's snapshot entirely. Since JavaScript is single-threaded, the splice itself is atomic, but the window between two awaits in different execute() calls means one run's snapshot is silently replaced. If the public `this.evidence` field is read between runs (as documented for 'sequential readers'), it will contain data from the wrong run. Consider using a generation counter, a lock, or simply removing the shared mutable snapshot in favor of returning evidence from execute().
  ```existing
  // ★ F-212 FIX (2026-09-24): single-call snapshot — the length=0+push pair
    //   exposed an empty array to any reader between the two statements.
    //   splice() publishes the run in one synchronous call (same reference,
    //   sequential readers keep working; no intermediate empty is observable).
    this.evidence.splice(0, this.evidence.length, ...evidence);
  ```

## src/omp/adapters/semantica.ts
- **src/omp/adapters/semantica.ts:18-19** (security)
  The `..` segment check prevents directory traversal via literal `..` but does not defend against symlink-based escapes. If any ancestor directory within `scopeRoot` is a symlink pointing outside the intended tree, `path.join(scopeRoot, '.omp/…')` resolves through it silently. Use `fs.realpathSync(scopeRoot)` to canonicalize before joining and compare the resolved path against an allow-list root, or at minimum assert that `realpathSync(kgPath).startsWith(allowedRoot)`.
  ```existing
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(path.sep).includes("..")) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  const kgPath = path.join(path.resolve(scopeRoot), ".omp/graph-intelligence/layers/semantica/kg.json");
  ```
  ```suggested
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(path.sep).includes("..")) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  // Canonicalize through the real filesystem to collapse symlinks and prevent symlink-based escapes.
  let resolvedRoot: string;
  try {
    resolvedRoot = fs.realpathSync(scopeRoot);
  } catch (e) {
    
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

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:171-187** (security)
  assertOwnSession silently permits an action when the session belongs to no known ecosystem (neither this one nor any sibling). An unbound, stale, or typo'd session id bypasses the mutual-exclusivity contract without any warning. Consider logging a warning or throwing when the session is unbound and the caller expects it to be bound — at minimum, the operator should be told that the session is unknown.
  ```existing
  assertOwnSession(sessionId: string, action: string): void {
    const own = this.spec.registry.findWaveBySession(sessionId);
    if (own) return; // the session belongs to THIS ecosystem — proceed.
    // The READ-ONLY sibling check (auto-wired by the manager): is the session
    // a FOREIGN wave's agent? Refuse with the remedy. If no registry knows
    // it, the session is unbound — proceed; th
  ```
  ```suggested
  assertOwnSession(sessionId: string, action: string): void {
    const own = this.spec.registry.findWaveBySession(sessionId);
    if (own) return; // the session belongs to THIS ecosystem — proceed.
    for (const [eco, surface] of Object.entries(this.siblingsFn ? this.siblingsFn() : {})) {
      const hit = surface.findWaveBySession(sessionId);
      if (hit) {
        throw new Error(
          `
  ```
