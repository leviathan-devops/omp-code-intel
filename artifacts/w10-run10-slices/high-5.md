# HIGH slice 5 — 10 findings across 8 files

## src/hunter/graph/mechanical.ts
- **src/hunter/graph/mechanical.ts:30-35** (performance)
  Performance issue: `evidenceQuoteForNode` calls `sf.getFullText().split('\n')` on every invocation. For a file with N nodes, this creates N copies of the full line array — O(fileSize × numNodes) per file. On large source files (thousands of lines, hundreds of nodes) this is a significant waste. Consider caching the split lines per source file (e.g., in a `Map<ts.SourceFile, string[]>`) or using `sf.getLineAndCharacterOfPosition` + text slicing to extract the line without splitting the entire file.
  ```existing
  function evidenceQuoteForNode(sf: tsImport.SourceFile, node: tsImport.Node): string {
  const line = lineOf(sf, node);
  try {
    const text = sf.getFullText();
    const lines = text.split('\n');
    const raw = lines[line - 1] ?? node.getText(sf);
  ```
  ```suggested
  // Cache lines per source file to avoid re-splitting on every call.
const lineCache = new WeakMap<tsImport.SourceFile, string[]>();

function evidenceQuoteForNode(sf: tsImport.SourceFile, node: tsImport.Node): string {
  const line = lineOf(sf, node);
  try {
    let lines = lineCache.get(sf);
    if (!lines) {
      lines = sf.getFullText().split('\n');
      lineCache.set(sf, lines);
    }
    c
  ```

## src/hunter/keys/go-key-pool.ts
- **src/hunter/keys/go-key-pool.ts:499-500** (bug)
  The `dropped` variable in `goEarliestDeadIdx` is declared as `let dropped = 0` on line 499, returned in the object on line 513, but is **never incremented anywhere** in the function body. The only iteration logic is the `GO_KEYS.forEach` loop which calls `seen++` but never `dropped++`. This means `dropped` is always 0, making the return field useless dead data. Either the increment was lost during the V21/C7 merge, or the field should be removed from the return type and callers. If any consumer relies on `dropped > 0` to detect degraded state, it will silently never trigger.
  ```existing
  let dropped = 0;
    let best = -1;
  ```
  ```suggested
  // If 'dropped' is meant to track rows discarded during merge, add the increment:
//   if (/* row was merged away */) dropped++;
// If 'dropped' is vestigial, remove from the return type and all callers.
  ```
- **src/hunter/keys/go-key-pool.ts:172-178** (bug)
  In the `db()` function's error handling (line 181), the caught error is unconditionally cast to `NodeJS.ErrnoException` via `const c = e as NodeJS.ErrnoException` without a type guard. If the thrown error is not an `ErrnoException` (e.g., a string or a custom error class), `c.code` will be `undefined`, causing both `if (c.code === 'ELOOP')` and `if (c.code !== 'EEXIST')` to fall through — the function would silently skip both branches and proceed to create a `Database` on a potentially compromised path. Use a proper type guard: `e && typeof e === 'object' && 'code' in e`.
  ```existing
  const c = e as NodeJS.ErrnoException;
    if (c.code === 'ELOOP') {
      // W20: ELOOP = pre-planted SYMLINK — refuse loudly, never chmod/open
      // through it (the old branch hardened the PLANT's target).
      throw new Error(`GO_POOL_SYMLINK: ${want} is a symlink plant — refusing (remove it or set GO_POOL_DB)`);
    }
    if (c.code !== 'EEXIST') throw e;
  ```
  ```suggested
  if (e && typeof e === 'object' && 'code' in e) {
      const c = e as { code: string };
      if (c.code === 'ELOOP') {
        throw new Error(`GO_POOL_SYMLINK: ${want} is a symlink plant — refusing (remove it or set GO_POOL_DB)`);
      }
      if (c.code !== 'EEXIST') throw e;
    } else {
      throw e;
    }
  ```

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:127-132** (bug)
  `loadBattery` acquires a prepared statement via `db.prepare(...)` but never finalizes it. In bun:sqlite (which this codebase targets, per the F-358 comments), `prepare()` allocates a native handle per statement. `stmt.all()` executes and returns results, but the `Statement` object is immediately discarded without `finalize()`, leaking the native handle on every call. This is the exact class of leak that the F-358 fixes addressed in `writeBattery` and `writeRuleCards`.
  ```existing
  export function loadBattery(db: DbClient, batteryVersion: string): CompiledPredicate[] {
  const rows = db.prepare(
    'SELECT id,family,template,bindings,verbatim_quote,anchor,severity,check_code,battery_version FROM compiled_predicates WHERE battery_version = ?',
  ).all(batteryVersion);
  return rows.map((row) => rehydrate(row));
}
  ```
  ```suggested
  export function loadBattery(db: DbClient, batteryVersion: string): CompiledPredicate[] {
  const stmt = db.prepare(
    'SELECT id,family,template,bindings,verbatim_quote,anchor,severity,check_code,battery_version FROM compiled_predicates WHERE battery_version = ?',
  );
  try {
    const rows = stmt.all(batteryVersion);
    return rows.map((row) => rehydrate(row));
  } finally {
    try { stmt.fi
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:140-142** (bug)
  **Bug: `response.text()` throw inside `!response.ok` block loses the HTTP error context.**

If `response.text()` throws (network error, body already consumed, etc.), the inner catch swallows it and `detail` stays `""`. The `return` on the next line still executes and produces `"SCAN_HTTP_500: Internal Server Error"` (no body detail — acceptable). **However**, the real bug is that if `response.text()` is itself a network-level failure (e.g., connection reset mid-read of the error body), the thrown error propagates to the **outer** catch block (line 201) instead of being caught by the inner catch. The outer catch then returns `"ERROR: Unknown error"` — the HTTP status code, status text, and the entire reason string are lost. The retry logic (line 252) then sees an unrecognized `ERROR:` message, which doesn't match `RETRYABLE_RE`, and immediately breaks to the next rung. A transient 500 that temporarily fails to yield its body is thus treated as fatal.

**Fix:** Return directly from the inner catch, or restructure so the `return` is inside the try block after `detail` is assigned.
  ```existing
  let detail = "";
      try { detail = (await response.text()).slice(0, 200); } catch { /* body unreadable — status alone is the signal */ }
      return { ok: false, reason: `SCAN_HTTP_${response.status}: ${response.statusText ?? ""}${detail ? ` — ${detail}` : ""}` };
  ```
  ```suggested
  let detail = "";
      try { detail = (await response.text()).slice(0, 200); } catch { /* body unreadable — status alone is the signal */ }
      return { ok: false, reason: `SCAN_HTTP_${response.status}: ${response.statusText ?? ""}${detail ? ` — ${detail}` : ""}` };
  ```
- **src/kernel/scan-chain.ts:167-172** (bug)
  **Bug: Race between `setInterval` callback and `clearInterval` can cause false-positive STALL on a stream that completed normally.**

The `setInterval` (line 117) and `clearInterval` (line 170) are not atomic with respect to the `dead` flag. A false-positive STALL occurs in this sequence:
1. Stream loop breaks on `done === true` (line 158) — the response is complete.
2. Main thread returns from `reader.read()`, executes `reader.cancel()` in `finally`, and is about to call `clearInterval`.
3. The interval callback fires (it was already queued in the event loop). `dead` is still `false`. `Date.now() - lastActivity` may exceed `stallMs` (if processing took time). Callback sets `dead = true` and calls `controller.abort()`.
4. Main thread calls `clearInterval(stallTimer)` — too late, the callback already ran.
5. Main thread reaches line 172: `if (dead)` is `true`. Returns `STALL` — **incorrectly** discarding a fully-received response.

**Fix:** Check `done`/completion state before the `dead` flag, or use a `completed` boolean set immediately after the read loop to gate the stall check:
```typescript
let completed = false;
try { for (;;) { ... } } finally { reader.cancel(); }
completed = true; // set before clearInterval
if (dead && !completed) return { ok: false, reason: `STALL: ...` };
```
  ```existing
  } finally {
      reader.cancel().catch(() => {}); // release the underlying connection
    }
    clearInterval(stallTimer);

    if (dead) return { ok: false, reason: `STALL: no tokens for ${stallMs / 1000}s` };
  ```
  ```suggested
  } finally {
      reader.cancel().catch(() => {}); // release the underlying connection
    }
    clearInterval(stallTimer);

    // Guard: even if `dead` was set by a late-firing interval callback after
    // the loop completed normally, the stream is not stalled.
    if (dead && !streamComplete) return { ok: false, reason: `STALL: no tokens for ${stallMs / 1000}s` };
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

## src/omp/enforcement.ts
- **src/omp/enforcement.ts:201-201** (bug)
  Unsafe type assertion on caught exception in catch blocks. The pattern `(e as { code?: string }).code ?? fallback` is unsafe because if `e` is not an object (e.g., null, undefined), accessing `.code` throws a secondary TypeError, making the `??` fallback unreachable. This affects both instances with codes "CLAIM_FW_TSG_DOWN" and "GI_JEV_DOWN". Apply a guarded extraction pattern similar to the work-layer catch, using `e instanceof Error && "code" in e` to safely extract the code string.
  ```existing
  code: (e as { code?: string }).code ?? "CLAIM_FW_TSG_DOWN",
  ```

## src/omp/kernel-v2.ts
- **src/omp/kernel-v2.ts:305-305** (bug)
  Empty `detectors` array causes an unhandled exception. `runKernelV2` uses `input.detectors ?? DEFAULT_DETECTORS`, so passing `detectors: []` (an explicit empty array, not `undefined`) bypasses the default and flows into `worstOutcome`, which throws `Error("worstOutcome requires at least one outcome")`. This is a synchronous throw in `runKernelV2`, which promises to return `KernelRun` — callers will get an uncaught exception instead of a structured ABORT/REFUSE. The guard at `worstOutcome` should be replaced with a structured refusal, or `runKernelV2` should treat an empty array the same as `undefined`.
  ```existing
  const detectors = input.detectors ?? DEFAULT_DETECTORS;
  ```
  ```suggested
  const detectors = input.detectors?.length ? input.detectors : DEFAULT_DETECTORS;
  ```

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:224-235** (bug)
  `assertAliasNamespace` iterates `allPrefixes` in insertion order without longest-prefix sorting. This is inconsistent with the F-207 fix applied to `ownerOf`, `isForeignWave`, and `assertOwnWave`, all of which sort by descending length. If one foreign prefix is a prefix of another (e.g., `wave-` vs `wave-extra-`), the shorter match fires first with the wrong remediation message, even though the longer prefix is the true owner of the alias's namespace.
  ```existing
  export function assertAliasNamespace(binding: ScopeBinding, alias: unknown, allPrefixes: string[]): void {
  if (typeof alias !== 'string' || alias.trim().length === 0) return;
  const a = alias.trim();
  for (const prefix of allPrefixes) {
    if (prefix === binding.wavePrefix) continue;
    if (a.startsWith(prefix)) {
      throw new Error(
        `[${binding.label} SCOPE] the waveId alias "${a
  ```
  ```suggested
  export function assertAliasNamespace(binding: ScopeBinding, alias: unknown, allPrefixes: string[]): void {
  if (typeof alias !== 'string' || alias.trim().length === 0) return;
  const a = alias.trim();
  // Longest-prefix match — consistent with ownerOf / isForeignWave (F-207).
  const sorted = [...allPrefixes].sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (prefix =
  ```
