# HIGH slice 5 — 4 findings across 3 files

## src/omp/calibration.ts
- **src/omp/calibration.ts:80-82** (bug)
  NaN counts bypass the negative-count guard silently. The check `c.confirmed < 0` evaluates to `false` when `c.confirmed` is `NaN` (all relational comparisons with NaN return false). This causes all downstream Wilson calculations to propagate NaN — `p` becomes NaN, `centre` becomes NaN, `low`/`high` become NaN, and `sufficient`/`starved` flags are incorrect. Since these counts come from external ledger reads, a corrupted or uninitialized ledger entry could inject NaN. Add an explicit guard: `Number.isFinite(c.confirmed) && Number.isFinite(c.refuted) && Number.isFinite(c.unresolved)` before the existing negative check. The same issue applies to `firesNeededForGap` where `p` or `gap` could be NaN.
  ```existing
  if (c.confirmed < 0 || c.refuted < 0 || c.unresolved < 0) {
    throw new Error(`CALIBRATION_BAD_COUNTS: counts must be non-negative (confirmed=${c.confirmed}, refuted=${c.refuted}, unresolved=${c.unresolved})`);
  }
  ```
  ```suggested
  if (!Number.isFinite(c.confirmed) || !Number.isFinite(c.refuted) || !Number.isFinite(c.unresolved)) {
    throw new Error(`CALIBRATION_BAD_COUNTS: counts must be finite numbers (confirmed=${c.confirmed}, refuted=${c.refuted}, unresolved=${c.unresolved})`);
  }
  if (c.confirmed < 0 || c.refuted < 0 || c.unresolved < 0) {
    throw new Error(`CALIBRATION_BAD_COUNTS: counts must be non-negative (con
  ```

## src/omp/populate-corbell.ts
- **src/omp/populate-corbell.ts:110-112** (bug)
  In `isCorbellCheckoutFreshFor`, when `fs.statSync` throws on an individual source file (line 128 catch block), `walkFailed` is not set — the file is silently skipped. If the most recently modified source file is unreadable (e.g., permission denied, broken symlink), `newest` stays artificially low and the function reports `fresh`. This is a false-fresh bug: a changed-but-unreadable source doesn't trigger staleness. Since unreadable directories already set `walkFailed`, files with matched extensions should follow the same fail-closed discipline.
  ```existing
  const m = fs.statSync(path.join(dir, entry.name)).mtimeMs;
          if (m > newest) newest = m;
        } catch { /* unreadable file — skip */ }
  ```
  ```suggested
  const m = fs.statSync(path.join(dir, entry.name)).mtimeMs;
          if (m > newest) newest = m;
        } catch {
          // Unreadable source file: fail-closed (same as unreadable dir).
          // If the newest file can't be stat'd, we cannot confirm freshness.
          walkFailed = true;
          return;
        }
  ```

## src/scoping/session-state.ts
- **src/scoping/session-state.ts:75-77** (bug)
  `writeSessionState` accepts a full state map and overwrites it, but the caller may have read that state *before* acquiring the lock. Classic read-then-write TOCTOU: if another process runs `tickSessionBudget` between the caller's read and this write, the other process's update is silently clobbered. Consider changing the API to accept a mutation function `(current: SessionStateMap) => SessionStateMap` so the read and write happen atomically inside the lock, similar to `tickSessionBudget`.
  ```existing
  export function writeSessionState(statePath: string, state: SessionStateMap): void {
  withStateLock(statePath, () => { writeSessionStateRaw(statePath, state); });
}
  ```
  ```suggested
  export function writeSessionState(statePath: string, mutator: (current: SessionStateMap) => SessionStateMap): void {
  withStateLock(statePath, () => {
    const state = readSessionState(statePath);
    writeSessionStateRaw(statePath, mutator(state));
  });
}
  ```
- **src/scoping/session-state.ts:88-91** (bug)
  The `for (;;)` lock-acquisition loop has no upper bound. If the lock holder crashes and the stale-reclaim path consistently fails (e.g., `statSync` or `unlinkSync` throws due to permissions or filesystem errors), this spins forever, deadlocking the process. Add a maximum iteration count or wall-clock deadline after which the function throws a descriptive error.
  ```existing
  for (;;) {
    try { fs.writeFileSync(lockPath, token, { flag: "wx" }); break; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  ```
  ```suggested
  const MAX_LOCK_ATTEMPTS = 300; // ~3s at 10ms spin per attempt
  for (let attempt = 0; attempt < MAX_LOCK_ATTEMPTS; attempt++) {
    try { fs.writeFileSync(lockPath, token, { flag: "wx" }); break; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      // ... existing stat/unlink/spin logic ...
    }
  }
  throw new Error(`[session-state] failed to acquire lock a
  ```
