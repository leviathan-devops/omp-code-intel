# HIGH slice 2 — 13 findings across 9 files

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:439-451** (bug)
  Double-unsubscribe risk: In `done()`, the `settle()` function (lines 331-336) calls `sub2.unsubscribe()` and `sub3.unsubscribe()`, but does NOT remove them from `handleDisposables`. Then in `stop()` (line 290), the loop `for (const d of handleDisposables.splice(0)) d.unsubscribe()` calls `unsubscribe()` on `sub2` and `sub3` a second time. If the XState subscription's `unsubscribe()` is not idempotent, this will throw inside the `stop()` loop (which is unguarded), crashing the caller's teardown. Even if it is idempotent in xstate v5, the pattern is fragile — if the subscription implementation changes or a different runtime is used, this becomes a runtime error during cleanup.

Fix: Either remove `sub2`/`sub3` from `handleDisposables` inside `settle()`, or guard the `stop()` disposal loop with a try/catch per element.
  ```existing
  function settle(): void {
          if (settled) return;
          settled = true;
          pendingSettle = null;
          sub2.unsubscribe();
          sub3.unsubscribe();
          resolve();
        }
        pendingSettle = settle;
        // THE OWNED TELEMETRY (the R19 orphaned-subscription fix): the progress
        // subscriptions ride the run scope and tear down with it — registered
  
  ```
  ```suggested
  function settle(): void {
          if (settled) return;
          settled = true;
          pendingSettle = null;
          sub2.unsubscribe();
          sub3.unsubscribe();
          resolve();
        }
        pendingSettle = settle;
        // THE OWNED TELEMETRY (the R19 orphaned-subscription fix): the progress
        // subscriptions ride the run scope and tear down with it — registered
  
  ```

## src/hunter/lexicon/templates.ts
- **src/hunter/lexicon/templates.ts:188-194** (bug)
  `bindStringArray` returns `string[]` but `Array.isArray(v)` only confirms the value is an array — it does not validate that elements are strings. The unsafe `as string[]` cast means non-string elements (numbers, objects, booleans) will pass through. Downstream code like `requiredMembers.filter(m => !members.includes(m))` in `CONTRACT_MUST_IMPLEMENT` and `e.to.includes(m)` in `PROVENANCE_TRACES_TO_SOURCE` will produce incorrect results (e.g. `Array.prototype.includes` does type-sensitive comparison, and `.includes` on a non-string will throw or silently mismatch).
  ```existing
  function bindStringArray(bindings: Record<string, unknown>, key: string): string[] {
  const v = bindings[key];
  if (Array.isArray(v)) {
    return v as string[];
  }
  return [];
}
  ```
  ```suggested
  function bindStringArray(bindings: Record<string, unknown>, key: string): string[] {
  const v = bindings[key];
  if (Array.isArray(v) && v.every((el) => typeof el === 'string')) {
    return v;
  }
  if (Array.isArray(v)) {
    // Some elements are not strings — filter to strings only, like the old behaviour
    // but with the type safety gap closed.
    return v.filter((el): el is string => typ
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:786-796** (bug)
  **`sealFamily` leaves inconsistent in-memory state on partial failure.** If `fs.chmodSync` succeeds (making the file physically read-only at 0o444) but `applyFamilyPragmas` throws, `this.sealed` is never set to `true`. Subsequent write attempts (e.g. `registerFamilyNode`, `setContractHash`) will bypass the `this.sealed` check and fail with a confusing OS/SQLite-level error instead of the clean `FAMILY_ROOT_READONLY` named error. The fix is to set `this.sealed = true` before the pragma step, or to combine the steps so that any failure rolls back the chmod (or at minimum marks sealed to keep the fail-closed invariant consistent).
  ```existing
  sealFamily(): void {
    this.familyDb.prepare("INSERT OR REPLACE INTO family_metadata (key, value) VALUES ('promotion_state','FAMILY_ROOT_READONLY')").run();
    // ★ F-517 FIX (2026-09-24): chmod is NOT an idempotent guard — chmod succeeds on an
    //   already-read-only file, so ANY failure (ENOENT, EROFS, EPERM) means the seal did NOT
    //   land. The old swallow hid a still-writable family
  ```
  ```suggested
  sealFamily(): void {
    this.familyDb.prepare("INSERT OR REPLACE INTO family_metadata (key, value) VALUES ('promotion_state','FAMILY_ROOT_READONLY')").run();
    try { fs.chmodSync(this.familyPath, 0o444); } catch (e: unknown) {
      throw new Error(`FAMILY_SEAL_CHMOD_FAILED: cannot seal ${this.familyPath} read-only (${e instanceof Error ? e.message : String(e)})`);
    }
    try { applyFamilyPr
  ```
- **src/hunter/shared/db.ts:811-816** (bug)
  **`requestPromotion` is missing the `this.sealed` guard.** All other write methods (`registerFamilyNode`, `setContractHash`, `writeBranchView`) check `if (this.sealed) throw familyRootReadonly(...)` at the top. `requestPromotion` writes to `familyDb` without this check. When the family store is sealed (read-only + chmod 0o444), the INSERT OR REPLACE statements throw `SQLITE_READONLY`, which is silently swallowed by the idempotent guard. The pending promotion is recorded only in the in-memory `pendingPromotions` Map and silently lost on process restart, while the DB never reflects the promotion request. Add `if (this.sealed) throw familyRootReadonly(...)` at the top of the method, consistent with the other write paths.
  ```existing
  requestPromotion(hash: string, detail: string): void {
    this.pendingPromotions.set(hash, detail);
    try { this.familyDb.prepare("INSERT OR REPLACE INTO family_metadata (key, value) VALUES (?,?)").run(`promotion_pending:${hash}`, detail); } catch (idemErr) { /* idempotent guard */ console.debug("[kg-store] idempotent guard #6:", idemErr instanceof Error ? idemErr.message : String(idemErr)); }

  ```
  ```suggested
  requestPromotion(hash: string, detail: string): void {
    if (this.sealed) throw familyRootReadonly(`cannot request promotion on sealed family store: ${hash}`);
    this.pendingPromotions.set(hash, detail);
    try { this.familyDb.prepare("INSERT OR REPLACE INTO family_metadata (key, value) VALUES (?,?)").run(`promotion_pending:${hash}`, detail); } catch (idemErr) { /* idempotent guard */ console
  ```

## src/omp/adapters/semantica.ts
- **src/omp/adapters/semantica.ts:24-29** (security)
  Security concern: The F-356 mitigation for symlink attacks is incomplete. When `realpathSync` throws during initialization, `resolvedRoot` falls back to unresolved path, bypassing the fix for non-existent paths. Additionally, even if mitigated initially, `facts()` should re-validate via `realpathSync` when the file exists to prevent symlink insertion in the interim. Consider storing intent to validate and re-checking in `facts()` to ensure no symlink bypasses the intended tree.
  ```existing
  let resolvedRoot: string;
  try {
    resolvedRoot = fs.realpathSync(path.resolve(scopeRoot));
  } catch {
    resolvedRoot = path.resolve(scopeRoot);
  }
  ```
  ```suggested
  let resolvedRoot: string;
  let needsRealpathCheck = false;
  try {
    resolvedRoot = fs.realpathSync(path.resolve(scopeRoot));
  } catch {
    // Path doesn't exist yet — defer symlink validation to up()/facts() time.
    resolvedRoot = path.resolve(scopeRoot);
    needsRealpathCheck = true;
  }
  ```

## src/omp/fire-gate.ts
- **src/omp/fire-gate.ts:752-757** (bug)
  The doc comment claims `/opt/kill/process.txt` does NOT produce a false match, but the `DESTRUCTIVE_TOKEN` regex DOES match it: the `/` character before and after `kill` are both in the boundary class `[\s"'\\;:|&/]`, so the pattern `(?:^|[\s"'\\;:|&/])kill(?:$|[\s"'\\;:|&/])` succeeds. This means an intent like `edit /opt/kill/process.txt` is incorrectly classified as `destructive`, raising the gate threshold to 0.9 and potentially blocking or escalating a benign edit. The F-40 fix comment says "path components no longer produce false matches" but the implementation contradicts it. The root cause is that `/` appears in both the prefix and suffix boundary classes, treating any slash-delimited path segment as a command token.
  ```existing
  const DESTRUCTIVE_TOKEN = /(?:^|[\s"'\\;:|&/])(rm|rmdir|dd|mkfs|shutdown|reboot|kill|pkill|drop|truncate)(?:$|[\s"'\\;:|&/])/i;
/** Whole-token test: path components no longer produce false matches (`/opt/kill/process.txt`), but real command tokens still match even with adjacent slashes or quotes. Case-insensitive. */
export function hasDestructiveToken(probe: string): boolean {
  if (DESTRUCTIVE_
  ```
  ```suggested
  // Option A — Use the already-declared DESTRUCTIVE_COMMANDS Set with proper tokenization:
// export function hasDestructiveToken(probe: string): boolean {
//   if (DESTRUCTIVE_FLAG.test(probe)) return true;
//   const tokens = probe.toLowerCase().split(/[\s"'\\;:|&/]+/).filter(Boolean);
//   return tokens.some(t => DESTRUCTIVE_COMMANDS.has(t));
// }
//
// Option B — Remove `/` from the boundary cl
  ```

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:214-215** (bug)
  **Validation divergence between auditOne and factsFor on malformed up() results.**

auditOne (lines 134-140) validates the up() result with:
```ts
raw !== null && raw !== undefined && typeof raw.up === "boolean"
```
This accepts `{ up: false, evidence: "..." }` as a VALID shape (substrate is down but the probe answered correctly) and returns a DOWN verdict with evidence.

factsFor (lines 157-158) validates with:
```ts
typeof rawProbe !== "object" || rawProbe === null || (rawProbe as { up?: unknown }).up !== true
```
This uses `.up !== true` (strict), which treats `{ up: false }` as 'not UP' and `continue`s — silently skipping the consumer with no traceability.

While both paths agree a `{ up: false }` consumer doesn't contribute facts, they diverge on the **visible state**: auditOne records it as a valid DOWN (with evidence), while factsFor silently discards it. More critically, if a probe returns a truthy non-boolean for `up` (e.g., `{ up: 1, evidence: "ok" }`), auditOne accepts it as a valid shape with `up: 1` (truthy), but factsFor rejects it (`1 !== true`). The same malformed probe appears UP in the audit view but is invisible in the decision view — the exact class of two-view drift F-520 was meant to prevent.

Suggestion: factsFor should mirror auditOne's validation exactly, or both should delegate to a shared `normalizeProbe()` helper.
  ```existing
  const rawProbe: unknown = p.up();
          if (typeof rawProbe !== "object" || rawProbe === null || (rawProbe as { up?: unknown }).up !== true) continue;
  ```
  ```suggested
  const rawUp = p.up() as SubstrateProbe | null | undefined;
          const valid = rawUp !== null && rawUp !== undefined && typeof rawUp.up === "boolean";
          if (!valid || !rawUp!.up) continue;
  ```
- **src/omp/layer-registry.ts:225-229** (bug)
  **factsFor silently skips consumers that auditOne flags as GI_LAYER_ERROR — two-view disagreement.**

When factsFor calls p.facts() and it throws (line 179), the catch block just `continue`s — the consumer vanishes from the decision's fact set with zero traceability. Similarly, when p.facts() returns a non-array (line 175), `if (!Array.isArray(got)) continue` causes the same silent disappearance. Meanwhile, auditOne returns a full GI_LAYER_ERROR report with evidence and the specific consumer id (line 148) for both cases.

This means the audit view says "consumer X faulted mid-query" but the factsFor view says nothing — the consumer is simply absent. The F-519 fix correctly upgraded auditOne from DOWN to GI_LAYER_ERROR for non-array returns, but the parallel code in factsFor was not given equivalent treatment. This is the same class of two-view drift that the F-520, F-354, and F-405 fixes were meant to prevent.

Suggestion: factsFor could either (a) accept a registry-level option to include ERROR markers, or (b) the LayerRegistry interface could expose an `errorsFor(subject)` method that returns the GI_LAYER_ERROR evidence from audit, so the decision layer can inspect faults without changing factsFor's contract.
  ```existing
  } catch {
          // a throwing consumer contributes nothing to the decision — it is
          // reported DOWN by audit(), never smuggled in as an empty answer.
          continue;
        }
  ```
- **src/omp/layer-registry.ts:237-240** (bug)
  **GI_LAYER_ERROR verdicts are invisible in summary() — mid-query faults silently dropped from operator output.**

The summary() method (lines 187-200) classifies reports into consumed, down, and unconsumed buckets, but completely ignores any report with a `GI_LAYER_ERROR:...` verdict. A consumer that THROWS mid-query (e.g., facts() throws) or returns a non-array (F-519 case) is classified as GI_LAYER_ERROR by auditOne, but summary() never surfaces it. The operator sees `consumed:6/8` with no indication that 2 consumers faulted mid-query.

This contradicts the file's stated design: "A break at any link is a NAMED, LOUD state — never a silent pass". The GI_LAYER_ERROR state is named in audit() but silenced in summary().

Suggestion: add an error bucket to summary() that reports GI_LAYER_ERROR consumers with their evidence.
  ```existing
  const reports = registry.audit(subject);
      const consumed = reports.filter((r) => r.consumed);
      const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
      const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
  ```
  ```suggested
  const reports = registry.audit(subject);
      const consumed = reports.filter((r) => r.consumed);
      const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
      const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
      const errors = reports.filter((r) => r.verdict.startsWith("GI_LAYER_ERROR"));
  ```

## src/omp/populate-corbell.ts
- **src/omp/populate-corbell.ts:174-185** (performance)
  The second call to `isCorbellCheckoutFreshFor(root, warmPath)` performs a full recursive directory walk (up to 50k stat budget) and is completely redundant with the `warmStoreUnchanged(stBefore, stAfter)` check on the next line. If `warmStoreUnchanged` returns `true`, the warm store file's mtime hasn't changed, so the freshness-vs-source-files result is identical to the first probe. If `warmStoreUnchanged` returns `false`, the function already returns `changed-mid-read` and ignores `freshnessAfter` entirely. In both cases the second full directory walk is wasted work. Remove the second `isCorbellCheckoutFreshFor` call and rely solely on the stat-based TOCTOU guard.
  ```existing
  const freshnessAfter = isCorbellCheckoutFreshFor(root, warmPath);
  // W3-scan highs fixed: (a) the cap is DETERMINISTIC (sorted by canonical_id
  // before slicing — the old arbitrary slice biased by SQLite row order);
  // (b) edges keep referential integrity — an edge whose endpoint was
  // dropped/invalid is skipped, never a dangling row in the store.
  const sortedValid = [...validRows].sort
  ```
  ```suggested
  // W3-scan highs fixed: (a) the cap is DETERMINISTIC (sorted by canonical_id
  // before slicing — the old arbitrary slice biased by SQLite row order);
  // (b) edges keep referential integrity — an edge whose endpoint was
  // dropped/invalid is skipped, never a dangling row in the store.
  const sortedValid = [...validRows].sort((a, b) => a.canonical_id.localeCompare(b.canonical_id));
  const ma
  ```
- **src/omp/populate-corbell.ts:76-86** (bug)
  The recursive `walk` function does not track visited inodes. A symlink cycle (e.g., `a/link → b` and `b/link → a`) or hardlinked directories would cause infinite recursion. The budget counter only decrements for stat'd files (line 77), not for directory traversal, so it cannot bound directory-depth recursion. A cycle would exhaust the call stack before the budget fires, producing an uncaught `RangeError: Maximum call stack size exceeded` instead of the intended `stale-budget` verdict. Add an `inode: Set<number>` parameter to `walk` and skip any directory whose inode has already been visited.
  ```existing
  const walk = (dir: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      // V21 cleanup fix-now: ANY unreadable dir sets walkFresh → stale-read-failed.
      // returning made newest stay 0 and an unreadable tree read "fresh".
      walkFailed = true; // ANY u
  ```
  ```suggested
  const visitedInodes = new Set<number>();
  const walk = (dir: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      walkFailed = true;
      return;
    }
    for (const entry of entries) {
      if (budget.n <= 0) { exhausted = true; return; }
      if (entry
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:515-515** (bug)
  The validation only checks `nodeRows.length === 0` and throws, but does NOT guard `edgeRows.length === 0`. If `nodeRows` has entries but `edgeRows` is empty, the unconditional `UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL` (line 535) will supersede ALL existing live edges — silently wiping inspection data. The session-path helper `supersedeThenInsert` correctly checks `nodeRows.length === 0 && edgeRows.length === 0` before refusing, and only conditionally runs the UPDATE when the respective batch is non-empty (lines 480-487). `writeGraphifyCheckout` should apply the same bidirectional guard: refuse if BOTH are empty, and only run the UPDATE+INSERT when the batch is non-empty.
  ```existing
  if (nodeRows.length === 0) throw new Error("GRAPH_EMPTY:graphify checkout refusing empty input (would wipe live inspection rows)");
  ```
  ```suggested
  if (nodeRows.length === 0 && edgeRows.length === 0) throw new Error("GRAPH_EMPTY:graphify checkout refusing empty input (would wipe live inspection rows)");
  ```

## src/scoping/scope-resolver.ts
- **src/scoping/scope-resolver.ts:138-138** (bug)
  The bare `catch` block silently swallows ALL exceptions from `readActivity` and the entire scoring pipeline — including filesystem permission errors, encoding issues, or unexpected data shapes. This makes it impossible to diagnose why a session fell back to cwd. At minimum, log the error. Consider logging at `warn` level to match the vanished-cache warning above.
  ```existing
  } catch { /* activity read failure → fall through to cwd */ }
  ```
  ```suggested
  } catch (err) { console.warn(`[scope-resolver] auto-detect failed for session ${sessionId}:`, err); }
  ```
