# HIGH slice 1 — 9 findings across 7 files

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:343-353** (security)
  TOCTOU race in `lockdownReadSource`: Between `realpathSync(abs)` (containment check, line 344) and `readFileSync(fileReal, ...)` (the read, line 353), an attacker with filesystem write access can swap the symlink target. The `realpathSync` validates one inode, then `readFileSync` opens a potentially different inode. The same pattern exists in `violationFrequencies` (lines 271–275, 281). Fix: open the file descriptor first, then fstat to validate containment on the fd itself, then read from the same fd:
```typescript
const fd = fs.openSync(fileReal, 'r');
try {
  const stat = fs.fstatSync(fd);
  const realFd = fs.readlinkSync(`/proc/self/fd/${fd}`); // or realpath on the open path
  if (!inside(realFd)) throw ...;
  text = fs.readFileSync(fd, 'utf8');
} finally {
  fs.closeSync(fd);
}
```
  ```existing
  let fileReal = abs;
      try { fileReal = fs.realpathSync(abs); } catch { /* the file may not exist yet — the read below reports it loud */ }
      if (!inside(fileReal)) throw sourceReadFailed(abs, `symlink escapes project root (root=${rootReal} file=${fileReal})`);
      let text: string;
      try {
        // ★ F-441 FIX (2026-09-24): READ THE RESOLVED PATH. The containment above resolved
   
  ```
- **src/hunter/diagnostics/engine.ts:755-755** (bug)
  Edge `file` and `line` metadata is silently lost on the stored-graph REUSE path. The `graph_edges` database table (db.ts line 239) only stores `source_id,target_id,kind,lineage` — it has no `file` or `line` columns. When `readStoredGraph` maps `StoredEdgeRow` to `GraphEdge` (line 774), it produces edges with `file: undefined` and `line: undefined`. But `buildLocalGraph` (line 719) creates edges WITH `file: rel, line: callLine`. This means the STORED path degrades edge provenance compared to the LOCAL BUILD path: `whoCalls` (line 485), `chain` (lines 498, 503), and `imports` (line 513) all silently fall back to empty/zero values for edges loaded from the DB. Either add `file`/`line` columns to the `graph_edges` schema and persist them in `writeGraph`, or document this as a known limitation of the REUSE path.
  ```existing
  const erows = db.prepare('SELECT source_id,target_id,kind,lineage FROM graph_edges').all() as unknown as StoredEdgeRow[];
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:451-454** (bug)
  **Database handle leak when `done()` is called without `stop()`**: The `done()` path never closes `snapshot.db`. If a caller does `await loop.done()` without subsequently calling `stop()`, the SQLite WAL file descriptor leaks permanently. The code comments acknowledge this (F-1202 reverted closing in `settle()`), and the intended contract is 'stop() owns teardown' — but the `done()` path silently leaves the fd open with no warning, no documentation on the returned promise, and no auto-cleanup. Consider either (a) closing `db` inside `settle()` and removing the st-hunter-port pin, (b) adding a `finally` / `await done().then(() => stop())` pattern to all callers, or (c) logging a warning when `done()` resolves but `stop()` has not yet been called.
  ```existing
  done(): Promise<void> {
      if (pendingDone !== null) return pendingDone;
      pendingDone = new Promise<void>((resolve): void => {
        if (actor.getSnapshot().status === 'done') { resolve(); return; }
  ```
  ```suggested
  done(): Promise<void> {
      if (pendingDone !== null) return pendingDone;
      pendingDone = new Promise<void>((resolve): void => {
        if (actor.getSnapshot().status === 'done') { cleanupAndResolve(); return; }
        const snapStatus: unknown = (actor.getSnapshot() as { status?: unknown }).status;
        if (snapStatus === 'stopped' || snapStatus === 'error') { cleanupAndResolve(); retu
  ```

## src/hunter/shared/migrations.ts
- **src/hunter/shared/migrations.ts:128-128** (bug)
  The `assertNonTransactionalSchema` function is called unconditionally (line 100), but it relies on `db.query` which is an optional method. When the driver doesn't support `BEGIN` (i.e., `began` is false) AND `db.query` is undefined, the function will throw the 'cannot verify' error. However, in the transactional path where `began` is true, a successful COMMIT already implies the DDL succeeded — yet `assertNonTransactionalSchema` is still called. If `db.query` happens to be undefined on a driver that does support BEGIN/COMMIT, this verification will throw a misleading error after a successful migration. The check should either be conditional (`if (!began)`) or the `query` method should be required for the non-transactional path specifically.
  ```existing
  assertNonTransactionalSchema(db);
  ```
  ```suggested
  db.exec(TYPED_GRAPH_DDL);
    try { db.exec('COMMIT'); } catch (commitErr: unknown) { if (began) throw commitErr; /* else: nothing to commit */ }
    if (!began) {
      assertNonTransactionalSchema(db);
    }
  ```

## src/omp/adapters/tsg.ts
- **src/omp/adapters/tsg.ts:53-58** (security)
  The adapter's `tsgKey` reads `KEY_FILE` via a plain `readFileSync(KEY_FILE, "utf8")` which follows symlinks and performs no permission check. The register's own keyFileComponent in `jev.ts` deliberately uses `fs.openSync(KEY_FILE, O_RDONLY | O_NOFOLLOW)` with a 0600 permission check to prevent TOCTOU symlink-swap attacks. The inconsistency means an attacker who can plant a symlink at `~/.config/typesafe/key` can cause the adapter to read an arbitrary file and inject its contents into the child process environment as `TYPESAFE_API_KEY`. Even though the CLI will likely reject the value, the file contents are sent over the network to the TypeSafe API. Adopt the same `O_NOFOLLOW` open + permission check pattern used in jev.ts, or call the existing jev.ts key-reader instead of duplicating the read.
  ```existing
  try {
    const v = fs.readFileSync(KEY_FILE, "utf8").trim();
    return v.length > 0 ? v : null;
  } catch {
    return null;
  }
  ```
  ```suggested
  try {
    const fd = fs.openSync(KEY_FILE, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try {
      const v = fs.readFileSync(fd, "utf8").trim();
      return v.length > 0 ? v : null;
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return null;
  }
  ```

## src/omp/oracle.ts
- **src/omp/oracle.ts:218-221** (bug)
  Invalid `windowMs` handling is inconsistent with `notAfter` and lacks pre-validation. In `gather`, it silently returns an empty Evidence bag, while `notAfter` throws. In `resolveAll`, it is not pre-validated, leading to silent failures for the entire batch. Consider throwing for invalid `windowMs` in `gather` or pre-validating it in `resolveAll` to match error handling and provide clear diagnostics.
  ```existing
  if (typeof windowMs !== "number" || !Number.isFinite(windowMs) || windowMs <= 0) {
    const note = `windowMs ${JSON.stringify(windowMs)} is not a positive finite number — refusing to derive a window`;
    return { laterEdit: false, testsAfter: 0, testsPassed: 0, testsFailed: 0, withdrawn: false, permitted: false, signals: [], notes: [note], dismissed: [note] };
  }
  ```

## src/scoping/gi-ecosystem.ts
- **src/scoping/gi-ecosystem.ts:16-16** (security)
  `GI_TMP_DIR` is exported directly as a constant, allowing any consumer to `mkdirSync`, `writeFile`, `symlink`, or otherwise manipulate it without going through `makeGiTmpDir()`. This undermines the entire TOCTOU mitigation chain: an attacker-controlled module could write a symlink at `GI_TMP_DIR` (or a child path) before `makeGiTmpDir` runs, and the defensive checks inside `makeGiTmpDir` would catch it — but a future caller that writes directly under `GI_TMP_DIR` would never be guarded. The comment at line 12 says "CALLERS must not write directly under it" but there is no enforcement. Consider either removing the re-export from `index.ts` (line 25) and exposing only `makeGiTmpDir` + `createGiBinding`, or making `GI_TMP_DIR` non-exported (a module-private `const`) with `createGiBinding` reading it internally.
  ```existing
  export const GI_TMP_DIR = join(tmpdir(), "gi-omp-tmp");
  ```
  ```suggested
  // Make GI_TMP_DIR module-private so consumers can only reach it via makeGiTmpDir().
// If the re-export in index.ts is needed for binding-spec compat, export a
// read-only accessor (e.g. getGiTmpDirBase()) instead of the raw const.
const GI_TMP_DIR = join(tmpdir(), "gi-omp-tmp");

export function getGiTmpDirBase(): string {
  return GI_TMP_DIR;
}
  ```
- **src/scoping/gi-ecosystem.ts:37-37** (security)
  `mkdirSync(GI_TMP_DIR, { recursive: true })` does not set an explicit `mode`. When the directory is newly created, the actual permissions depend on the process umask (typically 0o777 & ~0o022 = 0o755), meaning group and other can read/list the temp base. The function's doc comment promises 0700, and the security rationale ("a foreign parent owner still cannot read inside it") only holds if the directory is actually 0o700. Add `{ recursive: true, mode: 0o700 }` to enforce the advertised permission.
  ```existing
  mkdirSync(GI_TMP_DIR, { recursive: true });
  ```
  ```suggested
  mkdirSync(GI_TMP_DIR, { recursive: true, mode: 0o700 });
  ```

## src/scoping/gi-session-path.ts
- **src/scoping/gi-session-path.ts:84-85** (security)
  Symlink traversal guard (F-434b / F-1048) is silently skipped when `fs.realpathSync(parent)` throws (e.g. parent directory does not yet exist). The broad `catch` swallows ALL errors — not just ENOENT — so any transient I/O error (EMFILE, EACCES, etc.) would also disable the guard. This is a security-critical path; at minimum, distinguish ENOENT (expected — store not created yet) from unexpected errors and rethrow the latter. Example: catch specific error codes or at least log a warning when an unexpected error disables the guard.
  ```existing
  let parentReal: string | null = null;
  try { parentReal = fs.realpathSync(parent); } catch { parentReal = null; }
  ```
  ```suggested
  let parentReal: string | null = null;
  try {
    parentReal = fs.realpathSync(parent);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code && code !== "ENOENT" && code !== "ENOTDIR") {
      // Unexpected I/O error — do not silently disable the security guard.
      throw new GiPathError(
        "GI_SHARED_PROJECT_STORE",
        `GI_SHARED_PROJECT_STORE: realpathSy
  ```
