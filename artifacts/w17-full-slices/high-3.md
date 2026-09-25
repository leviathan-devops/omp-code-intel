# HIGH slice 3 — 7 findings across 6 files

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:589-592** (bug)
  **Silent scope reduction contradicts fail-closed law in `collectLocalTsFiles`**. Two branches use `console.error` + `continue` (or `skip`) instead of throwing `SOURCE_READ_FAILED`, silently dropping files from the local-build scope:
1. Symlink cycle (line ~400): logs and continues instead of the named throw used by every other I/O failure in this file.
2. Symlink-to-file target outside root (F-1600, line ~413): logs and continues.

This directly contradicts the file's own fail-closed law (stated at line 14: "an unreadable source is a loud named fail, never an empty read") and the precedent set by F-243 (unreadable subdir → throw). Every other I/O failure in this file throws a named `EngineError` via `sourceReadFailed`, `historyLogUnreadable`, etc. — the `console.error` for symlink cycles is the only place where a failure is swallowed into stderr. A predicate that depends on a symlinked file silently never sees it, producing incomplete scope as if it were whole — the exact class of bug F-243 was filed against.
  ```existing
  if (visitedRealDirs.has(real)) {
            console.error(`[engine:local-build] symlink cycle skipped LOUD: ${abs} -> ${real}`);
            continue;
          }
  ```
- **src/hunter/diagnostics/engine.ts:615-619** (security)
  **Containment validation divergence: `collectLocalTsFiles` lacks the filesystem-root rejection** present in `lockdownReadSource` (line ~183) and `violationFrequencies` (line ~164). When `root` resolves to `/`, the local-build walk proceeds without a containment boundary — every path is "contained" vacuously. The other two I/O surfaces explicitly refuse this case with a named error. This inconsistency means a filesystem-root project can be scanned via the local-build path but not via the source-read or history-read paths — a potential exploit surface if the local-build results feed into predicates that trust the scope boundary.
  ```existing
  let rootReal = root;
  try { rootReal = fs.realpathSync(root); } catch (err: unknown) {
    throw sourceReadFailed(root, `local build root realpath failed: ${String(err)}`);
  }
  walk(root);
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:480-484** (bug)
  **Bug (high): `pendingDone` is never reset after resolution.**

After `done()` resolves, `pendingDone` remains assigned to the resolved promise forever. A subsequent call to `done()` (e.g., by code that awaits one phase, inspects context, then awaits again) silently returns the stale resolved promise. If the caller has called `stop()` in between, the snapshot will be from the stopped/stale actor, not a fresh one. More critically, this means the done() promise can never be recycled for a new machine lifecycle.

**Fix:** Reset `pendingDone = null` inside `settle()` after calling `resolve()`.
  ```existing
  function settle(): void {
          if (settled) return;
          settled = true;
          pendingSettle = null;
          sub2.unsubscribe();
  ```
  ```suggested
  function settle(): void {
          if (settled) return;
          settled = true;
          pendingSettle = null;
          sub2.unsubscribe();
          for (let i = handleDisposables.length - 1; i >= 0; i--) {
            if (handleDisposables[i] === sub2) handleDisposables.splice(i, 1);
          }
          // Reset so a subsequent done() call re-subscribes rather than returning
          // 
  ```

## src/hydra/client-reader.ts
- **src/hydra/client-reader.ts:74-77** (bug)
  The `.unref?.()` call on the timeout promise (not the timer) in `attach()` and `disconnect()` is a no-op: `Promise` objects do not have an `unref` method — only `Timeout` objects from `setTimeout` do. The code `setTimeout(...).unref?.()` works because `setTimeout` returns a `Timeout` with `.unref()`. But the expression `new Promise(...).unref?.()` in the `attach()`/`disconnect()` race patterns is dead code — it silently does nothing. This is harmless but misleading. In `listTools` and `callTimer` paths the `.unref?.()` is correctly placed on the timer. In `attach`/`disconnect` the `.unref?.()` is placed on the Promise, not the timer, so the timer is never unref'd and stays referenced until it fires or is cleared. The timer is never cleared in `attach()`/`disconnect()` after a successful close, so the abandoned timer holds a reference on the event loop for up to 5 seconds. Fix by capturing the timer and calling `.unref()` on it, and clearing it after success.
  ```existing
  await Promise.race([
            old.close(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('TRANSPORT_CLOSE_TIMEOUT: close() exceeded 5000ms — releasing the reference anyway')), 5000).unref?.()),
          ]);
  ```
  ```suggested
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
          try {
            await Promise.race([
              old.close(),
              new Promise<void>((_, rej) => {
                closeTimer = setTimeout(() => rej(new Error('TRANSPORT_CLOSE_TIMEOUT: close() exceeded 5000ms — releasing the reference anyway')), 5000);
                closeTimer?.unref?.();
              }),
        
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:59-66** (security)
  The ancestor walk in `abideEventsPath` traverses up to 6 parent directories looking for `.abide/events.jsonl`. If an attacker can create a `.abide/events.jsonl` file at a directory ancestor of the workspace, the adapter will silently read attacker-controlled content, which flows into `LayerFact` values and is used for repair decisions. Consider restricting the ancestor walk to known-safe roots or validating the file's ownership/permissions before trusting it.
  ```existing
  let dir = base;
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, ABIDE_EVENTS_REL);
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  ```

## src/omp/extension.ts
- **src/omp/extension.ts:125-127** (bug)
  `writeWipeAudit` opens a new `Database(regPath)` without setting a busy timeout or enabling WAL journal mode. If a concurrent reader or writer holds a lock on `registry.sqlite`, this call throws `SQLITE_BUSY` immediately. Since this is the audit trail for global wipes, a silent failure means every subsequent wipe reports `WIPE_AUDIT_FAILED` with no actionable recovery path.

Suggestion: set a busy timeout after opening the connection, and consider enabling WAL mode for better concurrent-read tolerance:
```ts
db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA busy_timeout=5000');
```
  ```existing
  const db = new Database(regPath);
  try {
    db.exec("CREATE TABLE IF NOT EXISTS gi_meta (key TEXT PRIMARY KEY, value TEXT)");
  ```
  ```suggested
  const db = new Database(regPath);
  try {
    db.exec('PRAGMA journal_mode=WAL');
    db.exec('PRAGMA busy_timeout=5000');
    db.exec("CREATE TABLE IF NOT EXISTS gi_meta (key TEXT PRIMARY KEY, value TEXT)");
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:92-92** (bug)
  Relative `defaultDir` is not resolved to an absolute path. Only tilde-prefixed values are expanded; a relative value like `'./data'` or `'data'` produces a relative output path (e.g. `./data/file.db`) whose correctness depends entirely on the caller's cwd at call time — the exact silent-wrong-location class this module exists to prevent. The comment on `DbPathSpec.defaultDir` even says 'absolute' but there's no enforcement or fallback. Consider resolving relative defaultDir values via `path.resolve()` (or against HOME) to guarantee an absolute result.
  ```existing
  let dir = spec.defaultDir;
  ```
  ```suggested
  let dir = spec.defaultDir;
    // If not absolute and not tilde-prefixed, resolve against HOME (or cwd as last resort)
    // to guarantee the output is always an absolute path.
    if (!path.isAbsolute(dir) && !(dir === TILDE || dir.startsWith(TILDE_SLASH))) {
      const home = process.env.HOME ?? process.env.USERPROFILE;
      dir = home ? path.resolve(home, dir) : path.resolve(dir);
    }
  ```
