# HIGH slice 2 — 12 findings across 8 files

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

## src/omp/adapters/tsg.ts
- **src/omp/adapters/tsg.ts:117-119** (security)
  The last 400 bytes of stdout and 200 bytes of stderr are embedded into the thrown error message. If the `tsg` CLI ever echoes the API key in its output (debug mode, verbose logging, or error messages from the server that include request context), the key will propagate to callers and potentially into logs or monitoring systems. Consider redacting any value that matches the key pattern before surfacing CLI output.
  ```existing
  const err = e as { message?: string; stdout?: unknown; stderr?: unknown };
        const out = String(err.stdout ?? "").slice(-400);
        const errOut = String(err.stderr ?? "").slice(-200);
  ```
  ```suggested
  const err = e as { message?: string; stdout?: unknown; stderr?: unknown };
        let stdoutSnippet = String(err.stdout ?? "").slice(-400);
        let stderrSnippet = String(err.stderr ?? "").slice(-200);
        // Redact the API key if it appears in CLI output
        if (key != null && key.length > 4) {
          const redacted = key.slice(0, 4) + "…";
          stdoutSnippet = stdoutSnippet.
  ```

## src/omp/fire-ledger.ts
- **src/omp/fire-ledger.ts:330-336** (bug)
  In `appendManyDetailed`'s fallback catch, the inner loop wraps non-LedgerError exceptions via `const err = inner instanceof LedgerError ? inner : new LedgerError(...)`, so raw driver exceptions are currently handled. However, the safety depends on `append` never throwing outside the LedgerError hierarchy (e.g. a corrupt DB handle throwing a raw driver exception that bypasses `guard()`). If that invariant breaks, the loop terminates, `notePersistFailure` is never called for the offending row, and the caller receives a partial/inaccurate result — defeating the 'every fire gets a row or a named failure' contract. A defensive outer catch around the entire fallback loop (or broadening the inner catch to always wrap) would make this robust against future refactors.

Suggested robust wrapping:
```typescript
for (const r of rows) {
  try {
    this.append(r);
    committed.push(r);
  } catch (inner) {
    const err = inner instanceof LedgerError
      ? inner
      : new LedgerError('APPEND_FAILED', 'row did not commit', inner);
    failed.push({ row: r, error: err });
    const bare = err.code.startsWith('GI_LEDGER_') ? err.code.slice('GI_LEDGER_'.length) : err.code;
    this.notePersistFailure(`GI_LEDGER_${bare}`, err.message);
  }
}
```
  ```existing
  for (const r of rows) {
        try {
          this.append(r);
          committed.push(r);
        } catch (inner) {
          const err = inner instanceof LedgerError ? inner : new LedgerError("APPEND_FAILED", "row did not commit", inner);
          failed.push({ row: r, error: err });
  ```
  ```suggested
  for (const r of rows) {
        try {
          this.append(r);
          committed.push(r);
        } catch (inner) {
          const err = inner instanceof LedgerError
            ? inner
            : new LedgerError("APPEND_FAILED", "row did not commit", inner);
          failed.push({ row: r, error: err });
          const bare = err.code.startsWith("GI_LEDGER_") ? err.code.slice("GI_LEDGER_"
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

## src/omp/populate.ts
- **src/omp/populate.ts:52-55** (bug)
  When the corbell meta-write succeeds (lines 44-58), execution continues to line 59+. However, when the meta-write fails (inner catch on line 52), the ROLLBACK is attempted, and then a `new Error(...)` is thrown on line 54. This error propagates out of `populateSessionStore` as an **uncaught exception** — the function's return type promises `PopulateResult` but callers will receive a thrown Error instead. The corbell populate itself already succeeded (data was written by `populateFromCorbellCheckout`), so this meta-write failure should degrade gracefully: log the warning and return a successful `PopulateResult` rather than crashing the caller. Alternatively, wrap the entire corbell success path in a try/catch that returns a `PopulateResult` with a degraded flag.
  ```existing
  } catch (e) {
        try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        throw new Error(`GI_META_WRITE_FAILED: batch meta write for ${storePath} did not commit (${e instanceof Error ? e.message : String(e)})`);
      }
  ```
