# HIGH slice 3 — 10 findings across 8 files

## src/hunter/diagnostics/fixture-calibration.ts
- **src/hunter/diagnostics/fixture-calibration.ts:335-335** (bug)
  Bug: `profileFromDisk` flag is silently dropped, contradicting the documented design intent. `loadFixtureProfile` returns `{ profile, profileFromDisk }` (line 313) and the JSDoc on lines 324–325 explicitly states: 'The coordination fact (the profileFromDisk flag) rides the loader's FixtureLoadResult; the caller reports it, never hides it.' However, only `{ profile }` is destructured on line 335, so the flag is discarded. Any caller of `runFixtureCalibration` has no way to know whether the profile was loaded from disk or synthetically constructed, making the coordination gap invisible — exactly the anti-pattern the code is designed to prevent.
  ```existing
  const { profile } = loadFixtureProfile(fixtureProfileDir);
  ```
  ```suggested
  const { profile, profileFromDisk } = loadFixtureProfile(fixtureProfileDir);
    // ... later, include profileFromDisk in the return or a richer result type
  ```
- **src/hunter/diagnostics/fixture-calibration.ts:170-173** (security)
  Security: The path-traversal containment check uses `path.resolve` which normalizes the logical path but does **not** follow symlinks. A symlink placed inside the fixture directory (e.g., `fixtures/fire/link -> /etc`) that points outside the boundary will pass the `startsWith` check because `path.resolve(dir, '../etc')` resolves to a path that does not start with `dir + path.sep`. However, when `readFileSync` follows the symlink, it reads arbitrary files outside the fixture boundary. Use `fs.realpathSync` to resolve symlinks before the containment comparison. This same issue exists in both `loadFireFixture` (line 170–171) and `loadGoldenFixture` (line 193–194).
  ```existing
  const resolvedSource = path.resolve(dir, manifest.sourceFile);
  if (resolvedSource !== path.resolve(dir) && !resolvedSource.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: fire fixture ${dir} sourceFile '${manifest.sourceFile}' escapes the fixture directory`);
  }
  ```
  ```suggested
  const resolvedSource = path.resolve(dir, manifest.sourceFile);
  // Resolve symlinks so a symlink inside the dir pointing outside is caught.
  const realSource = fs.realpathSync(resolvedSource);
  const realDir = fs.realpathSync(path.resolve(dir));
  if (realSource !== realDir && !realSource.startsWith(realDir + path.sep)) {
    throw new Error(`CALIBRATION_FIXTURE_INVALID: fire fixture ${dir} sou
  ```

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:196-198** (bug)
  **Bug — entity silently dropped from output.** `resolvedAliases` is built from each decision's `alias` field, which is the *harness-provided alias string* — it could match either a new entity's `id` or `label`. If entity A is resolved by the harness with alias="foo" (matching A.id), and a distinct entity B has `label="foo"`, then `resolvedAliases.has(ne.label)` is `true` for entity B, so B is skipped from heuristic fallback and is **missing from the final decisions array entirely**.

Fix: build the resolved set from the *entity identity* that was actually matched, not from the harness alias string:
```ts
const resolvedEntityIds = new Set(decisions.map((d) => d.newEntity.id));
for (const ne of newEntities) {
  if (!resolvedEntityIds.has(ne.id)) {
```
  ```existing
  const resolvedAliases = new Set(decisions.map((d) => d.alias));
  for (const ne of newEntities) {
    if (!resolvedAliases.has(ne.id) && !resolvedAliases.has(ne.label)) {
  ```
  ```suggested
  const resolvedEntityIds = new Set(decisions.map((d) => d.newEntity.id));
  for (const ne of newEntities) {
    if (!resolvedEntityIds.has(ne.id)) {
  ```

## src/hunter/log.ts
- **src/hunter/log.ts:7-11** (bug)
  Null/undefined safety: If `p` is null or undefined, `p.length` will throw a TypeError at runtime. Since this is a utility function that may receive user-provided paths, add a guard clause to handle falsy input gracefully.
  ```existing
  export function shortFile(p: string, n = 46): string {
  // ★ F-242 FIX (2026-09-24): small-n correctness — slice(-(n-1)) with n=1 is
  //   slice(0), the WHOLE string, so '…'+p came out longer than p. n<=1 returns a
  //   truncated ellipsis; n>=2 behavior is unchanged.
  if (p.length <= n) return p;
  ```
  ```suggested
  export function shortFile(p: string, n = 46): string {
  if (p == null) return '';
  if (p.length <= n) return p;
  ```

## src/hunter/shared/query-engine.ts
- **src/hunter/shared/query-engine.ts:369-370** (bug)
  SQL LIKE wildcard injection: User-supplied query is interpolated into `LIKE '%..%'` without escaping SQL wildcard characters (`%` and `_`). A query like `a_b` will match `axb`, `ayb`, etc., and `100%` will match any string containing `100`. This degrades search precision silently and could return unexpected results. Escape `%` and `_` in the trimmed query before wrapping.
  ```existing
  const like = `%${query.trim()}%`;
      const rows = this.db.prepare('SELECT canonical_id, label FROM typed_nodes WHERE superseded_run IS NULL AND (label LIKE ? OR canonical_id LIKE ? OR kind LIKE ?) LIMIT ?').all(like, like, like, topK) as Array<{ canonical_id: string; label: string }>;
  ```
  ```suggested
  const escaped = query.trim().replace(/%/g, '\\%').replace(/_/g, '\\_');
      const like = `%${escaped}%`;
      const rows = this.db.prepare('SELECT canonical_id, label FROM typed_nodes WHERE superseded_run IS NULL AND (label LIKE ? ESCAPE '\\' OR canonical_id LIKE ? ESCAPE '\\' OR kind LIKE ? ESCAPE '\\') LIMIT ?').all(like, like, like, topK) as Array<{ canonical_id: string; label: string }>;
  ```

## src/kernel/graph-test-target.ts
- **src/kernel/graph-test-target.ts:77-79** (bug)
  **Partial batch failure corrupts degree cache (Bug)**: If the second batch loop (`allIds` at lines ~78-85) throws mid-iteration, `degByDst` will contain partially-computed counts. The aggregation loop (lines ~86-89) will then set `degreeCache` entries for labels whose IDs were already processed, using incomplete `degByDst` values. In the catch block, only labels *absent* from `degreeCache` get the per-label fallback — labels with partial/stale entries are never corrected. This means some callers get silently wrong `inboundDegree` values, corrupting the priority ranking.

Suggestion: Clear `degreeCache` at the start of the catch block (or reset it) so the fallback path regenerates all entries, or guard the aggregation loop to only run if the full batch succeeded.
  ```existing
  } catch (e) {
  console.warn(`[graph-test-target] batch degree query failed, falling back to per-label reads: ${e instanceof Error ? e.message : String(e)}`);
}
  ```
  ```suggested
  } catch (e) {
  console.warn(`[graph-test-target] batch degree query failed, falling back to per-label reads: ${e instanceof Error ? e.message : String(e)}`);
  degreeCache.clear();
}
  ```

## src/omp/gi-registry.ts
- **src/omp/gi-registry.ts:0-0** (bug)
  **Reliability: `GI_OMP_DB_DIR` completely bypasses test-vs-production isolation.** When `GI_OMP_DB_DIR` is set, the outer `if (!process.env.GI_OMP_DB_DIR)` short-circuits and the entire test-context detection block (BUN_TEST, BUN_TEST_PID, argv1 prefix) is skipped. A misconfigured CI environment or local developer shell that exports `GI_OMP_DB_DIR` pointing at a shared directory will silently route all traffic (test and prod) to that path, defeating the safety heuristics that multiple historical fixes (F-GR1, F-14, F-710) labored to establish. Consider moving the test-context check OUTSIDE the env-var guard so it takes precedence, or at minimum log a warning when `GI_OMP_DB_DIR` is set in a test context.
  ```existing
  if (!process.env.GI_OMP_DB_DIR) {
    const argv1 = process.argv[1] ?? "";
    const inTestContext = process.env.BUN_TEST != null
      || process.env.BUN_TEST_PID != null
      || argv1.includes("/tests/st-");
    if (inTestContext) {
      return path.join(os.tmpdir(), "gi-omp-registry-test.sqlite");
    }
  }
  ```
  ```suggested
  // Test-context detection takes precedence over GI_OMP_DB_DIR — a misconfigured
  // CI environment that exports GI_OMP_DB_DIR must NOT silently route test traffic
  // to a shared production registry.
  const argv1 = process.argv[1] ?? "";
  const inTestContext = process.env.BUN_TEST != null
    || process.env.BUN_TEST_PID != null
    || argv1.includes("/tests/st-");
  if (inTestContext) {
    re
  ```

## src/omp/populate-corbell.ts
- **src/omp/populate-corbell.ts:78-83** (bug)
  Recursive walk has no depth limit — only a cycle guard (visited set) and a file budget (budget.n). A deeply nested directory tree without cycles and with few or no indexed files (e.g., many empty nested directories) can exhaust the call stack before the budget fires. For example, a node_modules tree or a vendored SDK with 10k+ nested directories containing zero .ts/.js/.py files would cause an unhandled RangeError: Maximum call stack size exceeded instead of returning stale-budget or stale-read-failed. Add a depth counter (e.g., `depth` parameter with a cap like 256) or convert the recursion to an iterative stack-based traversal.
  ```existing
  const walk = (dir: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { walkFailed = true; return; }
    if (visited.has(realDir)) return;
    visited.add(realDir);
  ```
  ```suggested
  const walk = (dir: string, depth: number): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    if (depth > 256) { walkFailed = true; return; } // stack-overflow guard
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { walkFailed = true; return; }
    if (visited.has(realDir)) return;
    visited.add(realDir);
    // ... (rest unchanged, but recursive calls 
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:268-276** (bug)
  **Missing symlink cycle guard in hashSourceTree — potential infinite loop**

The freshness probe walk (isGraphifyCheckoutFreshFor) has a `visited` Set keyed on `fs.realpathSync(dir)` to prevent infinite recursion from symlink cycles (F-846 FIX). However, the `walk` function inside `hashSourceTree` (used by computeSourceHash / computeSourceHashWithBudget) does NOT have any equivalent cycle guard. If `src/` contains a symlink cycle (e.g., `src/self -> src`), the freshness probe correctly detects and reports `stale-read-failed`, but `computeSourceHash` will recurse forever (until the Node.js stack overflows), bypassing the budget counter (which only counts files, not directory visits). This is especially dangerous because `computeSourceHash` is called in the populate path after the freshness gate passes — a project that somehow passes freshness (via sidecar match on a cached hash) but then triggers a rehash (e.g., sidecar write failed last time, next run uses mtime path) would hang or crash.
  ```existing
  const visitedDirs = new Set<string>();
  const walk = (dir: string, prefix: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { hash.update(`skip-dir:${prefix}\n`); return; }
    if (visitedDirs.has(realDir)) return;
    visitedDirs.add(realDir);
    let entries: fs.Dirent[];
    try { entries = fs.rea
  ```
  ```suggested
  const visitedDirs = new Set<string>();
  const walk = (dir: string, prefix: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { hash.update(`skip-dir:${prefix}\n`); return; }
    if (visitedDirs.has(realDir)) { hash.update(`skip-cycle:${prefix}\n`); return; }
    visitedDirs.add(realDir);
    let entri
  ```
- **src/omp/populate-graphify.ts:433-449** (bug)
  **Sidecar write failure creates an unbounded rebuild loop with no circuit-breaker**

If the sidecar write (`fs.writeFileSync(hashPath, vettedHash, "utf8")`) fails persistently (read-only filesystem, disk full, permissions), every subsequent `populateFromGraphifyCheckout` call will:
1. Find no sidecar → fall back to mtime freshness check
2. Mtime check may prove the graph 'fresh' (mtime hasn't changed)
3. Rebuild, populate, try sidecar write, fail again

The error is logged loudly (good), but there is no backoff, no circuit-breaker, and no persistent failure counter. On a read-only filesystem, this loops indefinitely on every invocation. Consider writing a failure marker (e.g., a `.graph_hash_FAILED` sentinel) that the freshness probe can detect to short-circuit to stale immediately, or implement exponential backoff.
  ```existing
  try {
      // W46: write the VETTED hash captured at gate-pass — the post-commit
      // rehash used to absorb mid-populate edits (stale-wins laundering).
      fs.writeFileSync(hashPath, vettedHash, "utf8");
    } catch (hashErr) {
      // ★ F-400 FIX (2026-09-24, the run-7 CRITICAL): the sidecar write failure was
      //   logged at `console.log` — INVISIBLE to an operator watching errors, a
  ```
