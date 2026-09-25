# HIGH slice 2 — 3 findings across 2 files

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:111-115** (bug)
  **Standalone `writeBattery` lacks F-1204 eviction — orphaned stale rows.**

When `writeBattery` is called standalone (not via `writeCompiledCache`), it performs `INSERT OR REPLACE` keyed by `id` but never deletes pre-existing rows for the same `battery_version`. If a recompile changes the set of predicate ids (some added, some removed), the dropped ids remain as orphans in the table. `loadBattery` reads by `battery_version`, so these stale rows are served back to callers.

`writeCompiledCache` has the fix (the `DELETE FROM compiled_predicates WHERE battery_version = ?` block), but the standalone `writeBattery` path does not. Consider adding the same pre-insertion eviction, or documenting that `writeBattery` must only be called when the id set is a strict superset of the previous version (which is an undocumented invariant).
  ```existing
  export function writeBattery(db: DbClient, battery: CompiledPredicate[]): void {
  if (battery.length === 0) return;
  // ★ F-6 FIX (2026-09-24): atomic battery commit — BEGIN/COMMIT/ROLLBACK like
  // writeRuleCards below; a mid-loop failure rolls back instead of half-writing.
  db.exec('BEGIN');
  ```
  ```suggested
  export function writeBattery(db: DbClient, battery: CompiledPredicate[], batteryVersion: string): void {
  if (battery.length === 0) return;
  db.exec('BEGIN');
  let committed = false;
  try {
    // F-1204: evict stale rows for this version before inserting, same as writeCompiledCache.
    const del = db.prepare('DELETE FROM compiled_predicates WHERE battery_version = ?');
    try {
      del.ru
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:166-171** (bug)
  Non-transactional DB reads in `diagnosticsFromDb`: Three separate SQL queries (AUDIT_DONE lookup, HUNT_DONE lookup, then findings + graph_facts) execute outside any transaction. A concurrent write (e.g., a new HUNT_DONE event arriving between the second and third queries) can produce an inconsistent snapshot — the runId from the old HUNT_DONE is used to query findings, but new findings for a new run are already present. Consider wrapping these reads in a single transaction or using a single correlated subquery.
  ```existing
  const auditRow = rowAs<{ payload?: string }>(
        this.db!.prepare(
          "SELECT payload FROM events WHERE kind = 'AUDIT_DONE' ORDER BY id DESC LIMIT 1",
        ).get(),
        'AUDIT_DONE row',
      );
  ```
- **src/hunter/surface/lsp-injector.ts:0-0** (bug)
  Race condition in `acquireWriteLock`: `this.pausedByWriteLock = !this.pausedFlag` reads `pausedFlag` and then `pause()` sets it to `true`, but there is no atomicity guarantee. If an external caller calls `pause()` between the flag read and the `this.pause()` call inside `acquireWriteLock`, `pausedByWriteLock` will be `true` (because the external pause was not yet visible), and a subsequent `releaseWriteLock` will call `resume()`, undoing the external pause. This is an inherent single-threaded-event-loop race in microtask interleaving.
  ```existing
  acquireWriteLock(): void {
    if (this.writeLock) throw new EngineError(GRAPH_UPDATE_CONFLICT, `${GRAPH_UPDATE_CONFLICT}: a write is already in progress — the watcher is paused`);
    this.writeLock = true;
    this.pausedByWriteLock = !this.pausedFlag;
    this.pause();
  }
  ```
