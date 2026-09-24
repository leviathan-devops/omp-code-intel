# HIGH slice 5 — 10 findings across 8 files

## src/hunter/firewall/lexicon-types.ts
- **src/hunter/firewall/lexicon-types.ts:81-85** (bug)
  The `state` and `triplet` test aliases in `LexiconDecision` are plain properties with no enforced synchronization to their sources (`verdict` and `mPSE`). Any code constructing a `LexiconDecision` must manually keep these in sync — there is no compile-time or runtime guarantee. A safer design would be to derive `state` and `triplet` as getter-based properties, or to restructure the interface so these aliases are not independently assignable fields. As-is, a caller can set `verdict: 'BLOCKED'` but `state: 'ALLOW_READ'` without a type error (since both are the same union type), silently producing an inconsistent decision record.
  ```existing
  // THE TEST ALIASES (the spec's 6.2 pseudocode asserts these names — §6.2:2588-2594):
  /** Alias of verdict — the pseudocode asserts d.state. */
  state: LexiconDecision['verdict'];
  /** Alias of mPSE — the pseudocode asserts d.triplet.Pattern. */
  triplet: MPSE;
  ```

## src/hunter/harness/scan.ts
- **src/hunter/harness/scan.ts:104-112** (bug)
  The calibration fixture extraction uses a deep double-cast chain (`as unknown as { rules?: ... }` then `as Record<string, unknown>`) with only runtime `typeof` checks. If the ProjectProfile schema evolves (e.g. `rules.bindings` is restructured or renamed), this extraction silently yields `undefined` → empty arrays → `hasFixtures = false`, causing the entire D17 calibration gate to no-op. This is a fail-open path that contradicts the fail-closed philosophy documented in the surrounding comments (F-347, F-64, etc.).

Consider extracting the fixtures via a typed accessor or a dedicated validation function that throws when the bindings shape is unexpected but present — so schema drift produces a loud error rather than a silent skip.
  ```existing
  const bindingsAny = (normalized as unknown as { rules?: { bindings?: Record<string, unknown> } }).rules?.bindings ?? {};
      const rawFixtures: unknown = (bindingsAny as Record<string, unknown>).calibrationFixtures;
      const isRecord = typeof rawFixtures === 'object' && rawFixtures !== null;
      const fireField: unknown = isRecord ? (rawFixtures as Record<string, unknown>).fire : undefined;
  ```
  ```suggested
  // Extract with a typed guard that fails loudly on unexpected shape:
function extractCalibrationFixtures(bindings: Record<string, unknown>): { fire: FireFixture[]; golden: GoldenFixture[] } | null {
  const raw = bindings.calibrationFixtures;
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') throw new Error('SCAN_INVALID_BINDINGS: calibrationFixtures must be an o
  ```

## src/hunter/tools/bug-hunt.ts
- **src/hunter/tools/bug-hunt.ts:97-98** (bug)
  **Bug: Lock release when `acquireHuntLock` throws corrupts lock state.** If `acquireHuntLock(absTarget)` throws (e.g., lock corruption, concurrent hold), the outer `finally` block (lines 153–156) still calls `releaseHuntLock(absTarget)` on a lock that was never acquired. This could corrupt the lock file, unlock another process's held lock, or mask the original acquisition error. The fix is to track whether acquisition succeeded with a boolean flag and guard the release.
  ```existing
  acquireHuntLock(absTarget);
  try {
  ```
  ```suggested
  let lockHeld = false;
  acquireHuntLock(absTarget);
  lockHeld = true;
  try {
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:257-259** (bug)
  STALL errors from `callWithStallDetection` (reason starting with `STALL:`) do not match `RETRYABLE_RE` (`/429|rate.?limit|too many|quota|5\d\d/i`) and are not caught by the 401/404 early-exit either. This means a stall on rung 0 immediately falls through to the next rung without any retry on the same provider. A single transient stall (e.g., a cold start) on the primary GO pool rung would bypass it entirely. Consider whether STALL should be retryable once or twice before moving to the next rung, or document this as intentional.
  ```existing
  const rmsg = result.reason ?? "";
      if (/SCAN_HTTP_(401|404)\b/.test(rmsg)) break; // fail-fast: auth/not-found never heals on retry
      if (!RETRYABLE_RE.test(rmsg)) break; // fatal/non-transient → next rung, no backoff burn
  ```
  ```suggested
  const rmsg = result.reason ?? "";
      if (/SCAN_HTTP_(401|404)\b/.test(rmsg)) break; // fail-fast: auth/not-found never heals on retry
      if (!RETRYABLE_RE.test(rmsg) && !/^STALL:/.test(rmsg)) break; // fatal/non-transient → next rung
      // STALL and retryable errors → backoff and retry on same rung
  ```
- **src/kernel/scan-chain.ts:190-194** (bug)
  The `full` string is built by concatenating raw decoded bytes from `reader.read()` chunks. SSE streams can split a single `data: {...}\n\n` event across multiple TCP chunks, meaning `full.split('\n')` on line 155 may split a JSON payload mid-line if a chunk boundary falls inside the JSON. This would cause `JSON.parse(line.slice(6))` to fail silently (caught by the inner catch), potentially dropping valid content. Use a proper SSE line-buffer that accumulates partial lines across chunks rather than splitting the raw concatenated bytes.
  ```existing
  const lines = full.split('\n').filter(l => l.startsWith('data: '));
      // ★ F-206 FIX (2026-09-24): CONCATENATE every delta in stream order — the
      //   old reverse()+first-match returned only the LAST chunk, truncating
      //   every multi-event streaming response to its tail.
      const parts: string[] = [];
  ```
  ```suggested
  // SSE line-buffer: accumulate partial lines across chunks to avoid
      // splitting JSON payloads at chunk boundaries.
      const parts: string[] = [];
      const sseLines = full.split('\n');
      for (const line of sseLines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const chunk = JSON.parse(line.slice(6));
          const delta = chunk.choices?.[0]?.delta?.
  ```

## src/omp/adapters/arsumbris.ts
- **src/omp/adapters/arsumbris.ts:94-106** (bug)
  The recursive `walk` function in the filter callback has no depth limit. A deeply nested daemon payload (up to 32 MB) could blow the call stack. Consider adding a `maxDepth` parameter (e.g., 64) and bailing out when exceeded, consistent with the existing fail-closed philosophy elsewhere in this file.
  ```existing
  const walk = (v: unknown): void => {
              if (typeof v === "string") values.push(v);
              else if (Array.isArray(v)) {
                if (seen.has(v)) return;
                seen.add(v);
                for (const x of v) walk(x);
              } else if (v && typeof v === "object") {
                if (seen.has(v as object)) return;
                seen.add(v as object);
    
  ```
  ```suggested
  const walk = (v: unknown, depth = 0): void => {
              if (depth > 64) return;
              if (typeof v === "string") values.push(v);
              else if (Array.isArray(v)) {
                if (seen.has(v)) return;
                seen.add(v);
                for (const x of v) walk(x, depth + 1);
              } else if (v && typeof v === "object") {
                if (seen.has(v as 
  ```

## src/omp/evidence-producer.ts
- **src/omp/evidence-producer.ts:134-137** (bug)
  The undefined-gate spread `{...(e.repair === undefined ? {} : { repair: e.repair })}` (and the identical pattern for `passed` on line 137) allows `null` through. If a caller passes `repair: null` or `passed: null` (not `undefined`), the record will contain `{ repair: null }` or `{ passed: null }` — which the downstream oracle (oracle.ts) will see as a *present* field rather than an *absent* one. The oracle treats absent `passed` as NO SIGNAL (a deliberate O1 fix), but `{ passed: null }` is a *present* field — the oracle may interpret it differently (e.g., `record.passed === true` is false, but `record.passed !== undefined` is true, potentially changing branching logic). Use `e.repair != null` (loose null-check) or `e.repair !== undefined && e.repair !== null` to reject both `undefined` and `null`, preserving the 'absent means unknown' contract the oracle relies on. Apply the same guard to `passed`.
  ```existing
  out.push({
        kind: "edit", at: e.at, target: e.target ?? subject.target, tool: e.tool,
        ...(e.repair === undefined ? {} : { repair: e.repair }),
      });
  ```
  ```suggested
  out.push({
        kind: "edit", at: e.at, target: e.target ?? subject.target, tool: e.tool,
        ...(e.repair != null ? { repair: e.repair } : {}),
      });
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:52-59** (bug)
  Corbell meta-write degradation is silent to the caller. When the meta INSERT fails (lines 68-75), the catch logs to stderr but the function returns `skipped: false` with `substrate: "corbell"` — the same shape as a fully successful populate. Callers have no programmatic way to detect the stale metadata. Because the data already committed and there is no retry loop, this inconsistency becomes permanent. Either (a) return a degradation flag in `PopulateResult` (e.g. `metaDegraded: true`) so callers can warn or retry, or (b) re-throw after logging so callers see the failure (preferred if metadata is contractually required).
  ```existing
  } catch (e) {
        try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        // ★ F-711 FIX (2026-09-24): the corbell data already committed - a meta-row failure must
        // DEGRADE, not throw past a PopulateResult-typed function (no live caller catches
        // GI_META_WRITE_FAILED; it escaped as an uncaught exception). LOUD on stderr, honest
        // success for the da
  ```
  ```suggested
  } catch (e) {
        try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        console.error(`[gi-omp] GI_META_WRITE_FAILED: batch meta write for ${storePath} did not commit (${e instanceof Error ? e.message : String(e)}) - data populated, meta degraded`);
        // Return a degraded result so callers can detect and act on stale metadata
        return {
          filesIndexed: 0
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:59-60** (bug)
  Bare `~` (without trailing slash) is not expanded. If `defaultDir` is exactly `'~'`, `startsWith('~/')` is false and the value falls through to `path.join('~', spec.fileName)`, producing a literal relative path like `~/<fileName>`. This is the exact class of silent misresolution this module was built to prevent — the production DB silently ends up in an unintended location. The fix should handle both `'~'` and `'~/…'`.
  ```existing
  let dir = spec.defaultDir;
    if (dir.startsWith('~/')) {
  ```
  ```suggested
  let dir = spec.defaultDir;
    if (dir === '~' || dir.startsWith('~/')) {
  ```
- **src/scoping/db-path.ts:55-57** (bug)
  `testFile` values beginning with `~/…` are not home-dir-expanded. `path.isAbsolute('~/fixtures/test.db')` returns `false` on POSIX (tilde expansion is a shell feature, not an OS path feature), so the value is joined to `os.tmpdir()`, producing an unexpected path like `/tmp/~/fixtures/test.db`. Test isolation silently targets the wrong file.
  ```existing
  return path.isAbsolute(spec.testFile)
        ? spec.testFile
        : path.join(os.tmpdir(), spec.testFile);
  ```
  ```suggested
  const testFile = spec.testFile as string;
      if (path.isAbsolute(testFile)) return testFile;
      if (testFile.startsWith('~/') || testFile === '~') {
        const home = process.env.HOME ?? process.env.USERPROFILE;
        if (!home) throw new Error(
          `[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` +
          `(fileName="${spec.fileName}") — cannot resolve te
  ```
