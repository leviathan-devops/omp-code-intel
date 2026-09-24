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

## src/hunter/shared/containment.ts
- **src/hunter/shared/containment.ts:101-104** (bug)
  **Contradictory 'NEVER throws' contract**: The doc comment on `checkContained` (line 99) states 'NEVER throws', but `realNearest` rethrows non-ENOENT/ENOTDIR errors (lines 77-78), and `checkContained` itself calls `realpathSync(root)` which can throw EACCES/ELOOP before the `realNearest` fallback is reached. `requireContained` (line 128) also has no try-catch around `checkContained`, so any of these thrown errors propagate to the caller, violating the stated contract. Either the contract should be softened to document the specific error codes that CAN escape, or the throws should be wrapped and routed through `onViolation`.
  ```existing
  * THE CHECK — resolve both sides and answer containment. NEVER throws; the caller owns the
 * error vocabulary (each subsystem has its own named code: HUNT_SCOPE_INVALID,
 * SOURCE_READ_FAILED, GI_SHARED_PROJECT_STORE …). Returning the values lets the caller name
 * BOTH paths in its message, which is what makes a refusal debuggable.
  ```

## src/kernel/graph-pre-flight.ts
- **src/kernel/graph-pre-flight.ts:65-65** (bug)
  **Double DB connection to the same store.** `getTestTargets(storePath, target, 5)` opens its own `openTypedStore(storePath)` (see graph-test-target.ts:24), meaning two independent handles are open concurrently on the same SQLite file. Depending on the driver's concurrency model this can cause 'database is locked' errors, stale reads, or WAL-mode anomalies. Either (a) refactor `getTestTargets` to accept an already-open `db` handle, or (b) ensure the driver explicitly supports concurrent handles with appropriate journaling mode.
  ```existing
  const testTargets = getTestTargets(storePath, target, 5);
  ```
  ```suggested
  // Option A: refactor getTestTargets to accept a db handle
const testTargets = getTestTargets(db, target, 5);
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

## src/omp/calibration.ts
- **src/omp/calibration.ts:154-154** (bug)
  Bug: `flag` can exceed `act` in both uncalibrated and calibrated branches due to the unconditional `Math.max(0.05, ...)` floor when `act` is small. This inverts the intended warning zone semantics where flag should be below act. Fix: cap flag so it never exceeds act.
  ```existing
  flag: Math.max(0.05, costCut / 2),
  ```
  ```suggested
  flag: Math.min(costCut * 0.9, Math.max(0.05, costCut / 2)),
  ```

## src/omp/jev.ts
- **src/omp/jev.ts:39-52** (security)
  TOCTOU race condition: Between `statSync` (permission check) and `readFileSync`, the file can be replaced (e.g., symlink swap to a world-readable file or a different file entirely). This undermines the 0600 enforcement the code claims. Use `fs.openSync` with `O_NOFOLLOW` + `fs.fstatSync` + `fs.readFileSync` on the same fd to atomically check permissions and read. Alternatively, at minimum, read the file then check permissions on the opened fd before returning the value.
  ```existing
  try {
        const mode = fs.statSync(KEY_FILE).mode;
        if ((mode & 0o077) !== 0) {
          throw new JevError(
            "GI_JEV_KEY_PERMS",
            `key file ${KEY_FILE} has insecure permissions ${(mode & 0o777).toString(8)} (expected 0600 — chmod 600 ${KEY_FILE})`,
          );
        }
      } catch (e) {
        if (e instanceof JevError) throw e;
        // stat failed (e.g. 
  ```
  ```suggested
  // Open the file once, fstat the fd, then read from the same fd — no TOCTOU.
    const fd = fs.openSync(KEY_FILE, 'r');
    try {
      const mode = fs.fstatSync(fd).mode;
      if ((mode & 0o077) !== 0) {
        throw new JevError(
          "GI_JEV_KEY_PERMS",
          `key file ${KEY_FILE} has insecure permissions ${(mode & 0o777).toString(8)} (expected 0600 — chmod 600 ${KEY_FILE})`,
       
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
