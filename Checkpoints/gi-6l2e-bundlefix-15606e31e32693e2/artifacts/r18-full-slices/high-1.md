# HIGH slice 1 — 9 findings across 6 files

## src/hunter/harness/hunt-lock.ts
- **src/hunter/harness/hunt-lock.ts:142-152** (bug)
  In `acquireHuntLock`, the `fs.unlinkSync(lockPath)` call after the stale-recovery re-validation block (line ~112) is NOT wrapped in a try-catch for unexpected OS errors. If unlink fails with EACCES, EMFILE, ENOSPC, or another non-ENOENT error, the exception propagates out of the function unhandled — the caller receives an opaque OS error instead of `HUNT_ALREADY_RUNNING`. Contrast with `releaseHuntLock` which wraps unlink in try-catch and re-throws after warning. This is inconsistent and leaves a gap: the stale lock file persists, and every subsequent `acquireHuntLock` call will keep trying and failing (or worse, the caller may not distinguish an unlink failure from a legitimate lock-hold). Wrap in try-catch, handle non-ENOENT errors with a warning + re-throw (same pattern as `releaseHuntLock`), and treat ENOENT as peer-won.
  ```existing
  try {
        fs.unlinkSync(lockPath);
      } catch (err: unknown) {
        const unlinkCode = err !== undefined && err !== null && typeof err === 'object' && 'code' in err
          ? (err as { code: unknown }).code
          : undefined;
        if (unlinkCode === 'ENOENT') {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the 
  ```
  ```suggested
  try {
        fs.unlinkSync(lockPath);
      } catch (err: unknown) {
        const unlinkCode = err !== undefined && err !== null && typeof err === 'object' && 'code' in err
          ? (err as { code: unknown }).code
          : undefined;
        if (unlinkCode === 'ENOENT') {
          throw new Error(`HUNT_ALREADY_RUNNING: the lock at ${lockPath} changed during stale-recovery (a peer won the 
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:429-432** (bug)
  `stop()` is not idempotent: the very first operation `sub.unsubscribe()` is unprotected by try/catch. If `stop()` is called twice (or if unsubscribe throws for any reason), the function aborts immediately — the DB close, the disposable drain, and `actor.stop()` on lines 444–445 are all skipped. Every other operation in `stop()` is individually guarded, but this one is not. Wrap it to match the defensive pattern used for the rest of the method.
  ```existing
  stop(): void {
      sub.unsubscribe();
      // ★ F-408: resolve any pending done() promise BEFORE teardown
      if (pendingSettle !== null) { pendingSettle(); pendingSettle = null; }
  ```
  ```suggested
  stop(): void {
      try { sub.unsubscribe(); } catch (e) { console.error('[micro-loop] subscription unsubscribe failed:', e instanceof Error ? e.message : String(e)); }
      // ★ F-408: resolve any pending done() promise BEFORE teardown
      if (pendingSettle !== null) { pendingSettle(); pendingSettle = null; }
  ```
- **src/hunter/harness/micro-loop-machine.ts:510-513** (bug)
  DbClient resource leak when `done()` is used without `stop()`. The `done()` promise resolves when the actor reaches a final state, but it does NOT close the SQLite DbClient, stop the actor, or unsubscribe the `sub` subscription. The F-1202 revert intentionally keeps `close()` out of `settle()` (to support post-done store reads), but the public API contract provides no guard or documentation that `stop()` MUST be called. A consumer that does `await loop.done()` without `loop.stop()` leaks the SQLite file descriptor and the actor. Consider either (a) adding a `finally`-style guarantee in `done()` that calls `stop()` when the post-done pin is no longer needed, or (b) adding a `Symbol.asyncDispose` / `using` support so the handle cleans up when the scope exits.
  ```existing
  return pendingDone;
    },
    get state(): { value: string } {
      return { value: snapshotState(actor.getSnapshot()) };
  ```
  ```suggested
  return pendingDone;
    },
    async [Symbol.asyncDispose](): Promise<void> {
      await this.done();
      this.stop();
    },
    get state(): { value: string } {
      return { value: snapshotState(actor.getSnapshot()) };
  ```
- **src/hunter/harness/micro-loop-machine.ts:122-126** (bug)
  `targetPath` is stored in context but never forwarded to any actor input. Every actor reads the target directory through `profile.project.root` (set by recon), never through `context.targetPath`. In the no-override path, the caller's `targetPath` could differ from the loaded profile's `project.root` — the machine would silently scan the profile's root, not the caller's intended target. The override path has an explicit agreement check (lines 215–218), but the no-override path has no equivalent guard. At minimum, recon (or a post-recon action) should verify `context.targetPath === loadedProfile.project.root` and throw a named error on mismatch.
  ```existing
  if (options.profile) {
    if (options.profile.project.root !== targetPath) {
      throw new Error(`[micro-loop] targetPath=${targetPath} disagrees with profile.project.root=${options.profile.project.root} — pass one root (the hunt target IS the profile root)`);
    }
  }
  ```
  ```suggested
  // Validate targetPath against profile root for BOTH paths.
  // In the no-override path the profile is loaded by the recon actor;
  // add a post-recon guard in the onDone action:
  //   onDone: {
  //     target: 'map',
  //     actions: [
  //       assign({ profile: ..., intendedBehavior: ..., runId: ... }),
  //       guard(({ context }) => {
  //         if (context.profile!.project.root !==
  ```

## src/hunter/log.ts
- **src/hunter/log.ts:7-7** (bug)
  The parameter `p` is typed as `string`, yet the code explicitly handles `null`/`undefined` inputs. This means callers are passing values that don't match the declared type, and TypeScript is not catching it. The type annotation should reflect the actual contract of the function to prevent silent misuse at call sites.
  ```existing
  export function shortFile(p: string, n = 46): string {
  ```
  ```suggested
  export function shortFile(p: string | null | undefined, n = 46): string {
  ```

## src/omp/enforcement.ts
- **src/omp/enforcement.ts:104-112** (bug)
  Abandoned promise causes unhandled rejection risk. When the timer wins the `Promise.race`, the original `call` promise continues executing in the background. If it eventually rejects, that rejection is never observed — in Node.js this triggers an unhandled promise rejection warning (or process termination with `--unhandled-rejections=throw`). Any side-effects in the engine (state mutation, resource leaks) also continue silently after timeout.

This is the most common pitfall of `Promise.race` with a cancellation timer.
  ```existing
  async function withEngineTimeout<T>(engine: string, ms: number, call: Promise<T>): Promise<T> {
  const timer = Promise.withResolvers<never>();
  const handle = setTimeout(() => timer.reject(new EngineTimeout(ms, engine)), ms);
  try {
    return await Promise.race([call, timer.promise]);
  } finally {
    clearTimeout(handle);
  }
}
  ```
  ```suggested
  async function withEngineTimeout<T>(engine: string, ms: number, call: Promise<T>): Promise<T> {
  const timer = Promise.withResolvers<never>();
  const handle = setTimeout(() => timer.reject(new EngineTimeout(ms, engine)), ms);
  try {
    return await Promise.race([call, timer.promise]);
  } finally {
    clearTimeout(handle);
    // Prevent unhandled rejection if the abandoned promise eventually
  ```

## src/omp/evidence-producer.ts
- **src/omp/evidence-producer.ts:237-240** (bug)
  `persistRecords` appends NDJSON via `appendFileSync` with no file locking. The F-1006 comment in `resolveFromSession` acknowledges that concurrent sessions must use distinct `recordsPaths`, but the underlying persistence function has no guard. If two processes share a path, interleaved partial writes produce corrupt lines in the reproducibility ledger, violating Law 1. At minimum, `persistRecords` should atomically write (e.g., write to a temp file + rename) or acquire an exclusive lock (`fs.openSync` with `wx`/lock) so the ledger—the single source for re-derivation—cannot be silently corrupted.
  ```existing
  fs.mkdirSync(path.dirname(recordsPath), { recursive: true });
  const lines = records.map((r) => JSON.stringify({ fireStateHash, ...r })).join("\n");
  if (lines === "") return 0;
  fs.appendFileSync(recordsPath, `${lines}\n`, "utf8");
  ```
  ```suggested
  fs.mkdirSync(path.dirname(recordsPath), { recursive: true });
  const lines = records.map((r) => JSON.stringify({ fireStateHash, ...r })).join("\n");
  if (lines === "") return 0;
  // Atomic append: write to a temp file, then concatenate under a lock to avoid
  // interleaved partial writes from concurrent sessions.
  const tmpPath = `${recordsPath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFi
  ```
- **src/omp/evidence-producer.ts:202-206** (bug)
  `laterEditFromGraph` uses `LIKE '%target%'` — a plain substring match — while `touches()` in the event path uses boundary-aware `containsAtBoundary()`. This semantic mismatch means the graph source can emit false-positive edit records. For example, subject target `app` would match `application.ts` and `append.txt` in the database via LIKE, but `touches()` would reject those as mid-token matches. Since `produceAndPersist` falls back to the graph source when no event-derived edits exist, a false-positive graph match can fabricate evidence for an unrelated file. The SQL should replicate the boundary-aware logic, or at least tighten the LIKE pattern (e.g., `%/{target}` or `%.{target}`) to reduce false matches.
  ```existing
  const rows = db
      .query(`SELECT file, created_run, superseded_run FROM typed_nodes
              WHERE layer_id = 'structural' AND (file LIKE ?1 ESCAPE '\\' OR label LIKE ?2 ESCAPE '\\')
              ORDER BY id DESC LIMIT 50`)
      .all(`%${escapeLike(subject.target)}%`, `%${escapeLike(subject.target)}%`) as { file: string; created_run: string; superseded_run: string | null }[];
  ```
  ```suggested
  // Tighten the LIKE pattern to reduce false-positive substring matches.
    // At minimum, require a path separator or dot before the target.
    const pattern = `%/${escapeLike(subject.target)}%`;
    const labelPattern = `%/${escapeLike(subject.target)}%`;
    const rows = db
      .query(`SELECT file, created_run, superseded_run FROM typed_nodes
              WHERE layer_id = 'structural' AND (
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:156-159** (maintainability)
  The hardcoded skip-directory list is duplicated verbatim between the freshness probe walk (line 156) and the hash tree walk (line 297). If a directory name is added or removed from one site and not the other, the freshness probe and content hash will disagree — the probe may report 'fresh' while the hash reports 'stale' (or vice versa). Extract to a module-level `const SKIPPED_DIRS: readonly string[]` and reference it from both walks.
  ```existing
  if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"].includes(entry.name)) continue;
        if (excludes.includes(entry.name)) continue;
        // dirs walk free: do not count directories toward budget
        walk(path.join(dir, entry.name));
  ```
  ```suggested
  const SKIPPED_DIRS = Object.freeze(["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"]) as readonly string[];

// ... in the freshness probe walk:
        if (SKIPPED_DIRS.includes(entry.name)) continue;
        if (excludes.includes(entry.name)) continue;
        // dirs walk free: do not count directories toward budget
        walk(path.join(dir, entry.na
  ```
