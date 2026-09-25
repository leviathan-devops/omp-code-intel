# HIGH slice 4 — 7 findings across 6 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:415-417** (bug)
  The compensation DELETE failure is silently swallowed (`catch { /* best-effort */ }`). If the DELETE fails, the DB retains half-evidence rows for this session with no corresponding record file. The caller sees `CALIBRATION_PERSIST_SPLIT` but has no signal that the DB was **not** compensated — a subsequent operator or automation checking the DB would find orphaned calibration rows with no way to distinguish them from valid records. At minimum, the caught error should be included in the thrown CalibrationError's message so the operator knows the DB state is inconsistent.
  ```existing
  try {
            write.db.prepare('DELETE FROM calibrations WHERE run_id = ? AND created_at = ?').run(`calibration-${fixtureVersion}`, this.calibratedAt);
          } catch { /* best-effort compensation; the persist error below stands */ }
  ```
  ```suggested
  let deleteErr: unknown;
          try {
            write.db.prepare('DELETE FROM calibrations WHERE run_id = ? AND created_at = ?').run(`calibration-${fixtureVersion}`, this.calibratedAt);
          } catch (e: unknown) { deleteErr = e; }
          const deleteDetail = deleteErr instanceof Error ? deleteErr.message : String(deleteErr);
          throw new CalibrationError(
            'CALIBRATIO
  ```

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

## src/omp/adapters/arsumbris.ts
- **src/omp/adapters/arsumbris.ts:84-88** (bug)
  No null/non-object guard on the parsed JSON result. `auEngineRead` returns `JSON.parse(out)`, which can合法地 be `null`, a number, a string, or an array. The `facts()` callback casts it with `as` but immediately accesses `res.reply` — if `res` is `null` or a primitive, this throws an uncaught `TypeError` that is not wrapped in any error boundary. Add a guard after the cast:
```
if (res === null || typeof res !== "object" || Array.isArray(res)) {
  throw new Error(`GI_LAYER_ARSUMBRIS: daemon returned non-object JSON`);
}
```
This should be placed right after the `as` cast inside `facts()`.
  ```existing
  const res = auEngineRead(scopeRoot, "instances", subject) as {
        socket?: string;
        reply?: { result?: { count?: number; instances?: Array<Record<string, unknown>> } };
      };
      const instances = res.reply?.result?.instances ?? [];
  ```

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:25-32** (bug)
  `eachDestructuredName` extracts the local binding name (right side of `:`) instead of the exported name (left side of `:`) for rename patterns. For `export const { a: b } = obj`, the exported symbol visible to consumers is `a`, but this function yields `b`. This means the gate's `before`/`after` diff will use the wrong name, so renaming an export via destructuring could silently evade detection.

Specifically, the code at line 28 splits on `:` and takes the last segment (line 29), which is the local binding — the opposite of the export semantics described in the comment at line 24 (`b: c` binds `c`). In export destructuring the alias is what consumers see, not the local name.
  ```existing
  function eachDestructuredName(list: string, cb: (name: string) => void): void {
  for (const spec of list.split(",")) {
    const noDefault = spec.split("=")[0] ?? "";
    const parts = noDefault.split(":");
    const name = (parts[parts.length - 1] ?? "").trim().replace(/^\.\.\./, "");
    if (/^[A-Za-z_$][\w$]*$/.test(name)) cb(name);
  }
}
  ```
  ```suggested
  function eachDestructuredName(list: string, cb: (name: string) => void): void {
  for (const spec of list.split(",")) {
    const noDefault = spec.split("=")[0] ?? "";
    const parts = noDefault.split(":");
    // In `export const { a: b } = …`, the exported name (what consumers import) is the
    // LEFT side of the colon (`a`), not the local binding (`b`). Take the first non-empty
    // trimme
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:61-65** (bug)
  Bug: `openTypedStore(storePath)` on line 61 is outside any try/catch. If the store file is corrupt, locked, or inaccessible, this call throws an uncaught exception that escapes `populateSessionStore` — violating the stated contract (see F-711 comment on line 73-76) that the function returns a `PopulateResult` and never throws past its caller. The graphify path (line 143) has the same issue but is protected by the caller's try/catch at line 42. The corbell path has no such outer guard. Wrap this in a try/catch that returns a `skipped: true, fallbackReason` result on failure.
  ```existing
  const db = openTypedStore(storePath);
    // ★ F-854 FIX (2026-09-24): the degradation flag — set in the catch below, read in the return.
    let metaDegraded = false;
    try {
      db.exec("BEGIN IMMEDIATE;");
  ```
  ```suggested
  let db;
    try {
      db = openTypedStore(storePath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[gi-omp] GI_STORE_OPEN_FAILED: cannot open ${storePath} (${msg})`);
      return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: false, substrate: "corbell",
               metaDegraded: true, fallbackReason: `GI_STORE_OPEN_FAILED:${ms
  ```
- **src/omp/populate.ts:0-0** (bug)
  Bug: if `db.exec("BEGIN IMMEDIATE;")` throws, execution skips the inner try/catch (lines 66-81) entirely — `metaDegraded` stays `false`, the `finally` closes the db, and the function returns a success result as if meta was written. This is a silent data inconsistency: the caller believes metadata is current when it was never persisted. Add a catch for the outer try that sets `metaDegraded = true` (and attempts ROLLBACK), mirroring the inner catch's degradation logic.
  ```existing
  try {
      db.exec("BEGIN IMMEDIATE;");
      try {
        db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["substrate", "corbell"]);
        db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["corbell_checkout", corbell.checkoutPath]);
        db.run("INSERT INTO gi_meta (
  ```
  ```suggested
  try {
      db.exec("BEGIN IMMEDIATE;");
      try {
        db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["substrate", "corbell"]);
        db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["corbell_checkout", corbell.checkoutPath]);
        db.run("INSERT INTO gi_meta (
  ```

## src/scoping/gi-ecosystem.ts
- **src/scoping/gi-ecosystem.ts:16-16** (security)
  The exported `GI_TMP_DIR` constant provides a direct handle to the shared parent directory. Any sibling module can import it and call `mkdirSync(GI_TMP_DIR, { recursive: true })` or `writeFileSync` directly under it, completely bypassing the symlink-plant defenses in `makeGiTmpDir`. Consider removing the export (or restricting it to `makeGiTmpDir` internally) and exporting only `makeGiTmpDir` as the sole public API for creating temporary directories.
  ```existing
  export const GI_TMP_DIR = join(tmpdir(), "gi-omp-tmp");
  ```
