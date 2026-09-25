# R16 group C — 6 findings across 5 files

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:184-185** (high · bug)
  `computeDrift` silently mutates the caller's `state` in three ways: (1) it splices `state.editLog` and `state.graphQueries` via `filter` reassignment (lines 203–204), destroying entries the caller may still reference; (2) it writes `state.drift = drift` as a side-effect of what reads like a pure computation; (3) `gateDecision` also mutates `state.gateState` without documenting the mutation contract. These hidden side-effects are dangerous if any caller expects a read-only drift check (e.g., previewing a gate decision without committing the pruning). The mutation of editLog/graphQueries is irreversible — once entries are pruned, `saveGateState` persists the shortened arrays, permanently losing history that might still be within the window on another clock read.
  ```existing
  state.editLog = state.editLog.filter((e) => now - e.timestamp < DRIFT_WINDOW_MS);
  state.graphQueries = state.graphQueries.filter((q) => now - q.timestamp < DRIFT_WINDOW_MS);
  ```
  ```suggested
  // Option A: make computeDrift pure — compute on local copies, return result without mutating state.
  const activeEdits = state.editLog.filter((e) => now - e.timestamp < DRIFT_WINDOW_MS);
  const activeQueries = state.graphQueries.filter((q) => now - q.timestamp < DRIFT_WINDOW_MS);
  // ... compute on activeEdits / activeQueries ...
  // Return drift without writing to state; let the caller decid
  ```
- **src/omp/graph-gate.ts:389-390** (high · bug)
  `loadGateState` returns `null` when the persisted row is corrupt, tampered, or fails shape validation. Most callers interpret `null` as 'no prior state' and create a fresh gate via `createEmptyState()`, which silently erases the entire accumulated drift history for that session. The error is logged to console but the gate itself has no signal that history was lost — a session that was at T2 WARNING can silently reset to IDLE. This is a data-loss path that should either throw (forcing callers to handle corruption explicitly) or return a degraded state that preserves the non-corrupt fields.
  ```existing
  console.error(`GI_GATE_STATE_LOAD_FAILED: ${storePath} session=${sessionId} err=${e instanceof Error ? e.message : String(e)}`);
    return null;
  ```
  ```suggested
  console.error(`GI_GATE_STATE_LOAD_FAILED: ${storePath} session=${sessionId} err=${e instanceof Error ? e.message : String(e)}`);
    // Throw instead of returning null so callers cannot silently discard history.
    throw new Error(`GI_GATE_STATE_CORRUPT: ${storePath} session=${sessionId}`);
  ```

## src/hydra/client-reader.ts
- **src/hydra/client-reader.ts:99-102** (critical · bug)
  Unhandled promise rejections from timeout promises can crash the process.

When the main operation wins `Promise.race` (e.g., `t.listTools()` resolves), the losing timeout promise remains alive. After 5000ms it calls `rej(new Error(...))`, but no one handles that rejection. In Node.js 15+ (which is the default runtime), unhandled rejections throw and crash the process — this means a **successful** `listTools()` or `callTool()` can still crash the process 5 seconds later when the abandoned timeout fires.

The same pattern exists in `attach()` and `disconnect()` timeout promises.

Fix: clear the timer in a `finally` block so the timeout promise never rejects after the operation completes:

```typescript
let timer: ReturnType<typeof setTimeout> | undefined;
const timeout = new Promise<never>((_, rej) => {
  timer = setTimeout(() => rej(new Error('GRAPHIFY_LIST_TIMEOUT: listTools() exceeded 
  ```existing
  return await Promise.race([
        t.listTools(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('GRAPHIFY_LIST_TIMEOUT: listTools() exceeded 5000ms')), 5000).unref?.()),
      ]);
  ```
  ```suggested
  let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new Error('GRAPHIFY_LIST_TIMEOUT: listTools() exceeded 5000ms')), 5000);
        timer?.unref?.();
      });
      try {
        return await Promise.race([t.listTools(), timeout]);
      } finally {
        if (timer) clearTimeout(timer);
      }
  ```

## src/omp/calibration.ts
- **src/omp/calibration.ts:80-82** (high · bug)
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

## src/omp/kernel-v2.ts
- **src/omp/kernel-v2.ts:561-561** (high · bug)
  Unsafe type assertion: `d.action as GateAdjudication["action"]` silently accepts any string returned by `gate.judge()`. If the gate returns an unexpected action value (e.g. "ALLOW"), this cast would mask the invalid value and downstream code would treat it as FIRE/ESCALATE/IGNORE without any runtime validation. Add a guard to reject unknown action values.
  ```existing
  action: d.action as GateAdjudication["action"],
  ```
  ```suggested
  action: validateAction(d.action),

// ... add helper:
const VALID_ACTIONS = new Set<GateAdjudication["action"]>(["FIRE", "ESCALATE", "IGNORE"]);
function validateAction(action: string): GateAdjudication["action"] {
  if (!VALID_ACTIONS.has(action as GateAdjudication["action"])) {
    throw new Error(`unexpected gate action: ${action}`);
  }
  return action as GateAdjudication["action"];
}
  ```

## src/omp/store-open.ts
- **src/omp/store-open.ts:100-105** (critical · bug)
  Missing orphan cleanup in post-upsert race verify — same bug class as F-1210.

Scenario:
1. Opener A wins `wx` (created = true), opener B gets EEXIST (created = false)
2. Both read `current` → null (no registry row yet)
3. A upserts ownerKey A, B upserts ownerKey B (overwrites A's row)
4. A's verify finds written.session_id = B ≠ A → throws GI_SCOPE_REFUSED
5. **But A does NOT unlink the store file it created** → orphan on disk

Future openers hit EEXIST on `wx` with no matching registry row, unable to recover.

The fix mirrors the earlier F-1210 check (lines 78-79): before throwing, unlink the file if `created` is true. The pattern already exists 12 lines above.
  ```existing
  const written = findGiSessionByStorePath(storePath);
  if (written && written.session_id !== ownerKey) {
    throw new GiScopeError(
      `GI_SCOPE_REFUSED: store ${storePath} raced to ${written.session_id}; caller ${callerKey} lost`,
    );
  }
  ```
  ```suggested
  const written = findGiSessionByStorePath(storePath);
  if (written && written.session_id !== ownerKey) {
    if (created) {
      try { fs.unlinkSync(storePath); } catch (e) { console.warn(`[store-open] orphan cleanup failed for ${storePath}: ${e instanceof Error ? e.message : String(e)}`); }
    }
    throw new GiScopeError(
      `GI_SCOPE_REFUSED: store ${storePath} raced to ${written.session_i
  ```
