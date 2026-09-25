# HIGH slice 4 — 9 findings across 8 files

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:262-262** (bug)
  **Bug (Logic error):** The condition `!/Checkpoints/i.test(win) || !/\.trident/i.test(win)` uses OR (`||`), meaning a finding is emitted if **either** 'Checkpoints' or '.trident' is missing from the window. But the preceding `else` branch already confirmed the file *has* some `exclude|EXCLUDED_DIRS` directive. The likely intent (consistent with the REMEDIATION message 'add EXCLUDED_DIRS with Checkpoints .trident') is to check whether the exclusion list covers **both** required entries — i.e., the exclusion is incomplete if either is absent. With `||`, even a file that correctly excludes 'Checkpoints' but doesn't mention '.trident' (or vice versa) gets flagged, which may be overly aggressive. Conversely, a file that mentions both 'Checkpoints' and '.trident' as separate, unrelated strings (not in the same exclude list) would be silently accepted. Consider whether the intent is `&&` (both must be present for the exclusion to be valid) or whether the current `||` is deliberately strict.
  ```existing
  } else if (!/Checkpoints/i.test(win) || !/\.trident/i.test(win)) {
  ```

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:63-78** (bug)
  **F-244 comment is factually wrong — the LINELESS guard runs AFTER db open, not before.** The comment block claims "the LINELESS guard (line above) runs BEFORE the open (line below), so a guard throw leaves no handle behind." In the actual code, `openStore(dbPath)` is called on line 57 (outside the try block), and the guard (`assertMappableLines`) is called on line 64 inside the try block — AFTER the db is opened. If the guard throws, the `DbClient` handle is leaked: the catch block on line 71 only catches errors from `writeGraph`/`mirrorToMasterContext`, not from the guard above them. This is a **resource leak** (file handle + WAL state). The fix is either (a) move `assertMappableLines` before the `openStore` call, or (b) add a guard-specific catch that closes the db before rethrowing.
  ```existing
  // ★ F-244 NOTE (2026-09-24): NOT-A-BUG — the LINELESS guard (line above) runs
//   BEFORE the open (line below), so a guard throw leaves no handle behind. The
//   error-path close covers only post-open failures (writeGraph/mirror).
  const dbPath = path.join(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
  const db: DbClient = openStore(dbPath);

  try {
    writeGraph(db, bu
  ```
  ```suggested
  const dbPath = path.join(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
  assertMappableLines(buildResult);
  const db: DbClient = openStore(dbPath);

  try {
    writeGraph(db, buildResult.nodes, buildResult.edges);
    const mirrorPath = mirrorToMasterContext(db, profile);
    return { adapter, buildResult, db, dbPath, mirrorPath };
  } catch (e: unknown) {
    try { db.close
  ```

## src/hunter/shared/kind-for-layer.ts
- **src/hunter/shared/kind-for-layer.ts:7-7** (bug)
  Uses loose equality `==` for the null/undefined check, which violates the project's coding standard prohibiting `==` and `!=`. While `== null` is an intentional pattern to catch both `null` and `undefined`, it should be replaced with strict checks to comply with the rule. The null guard itself is correct and necessary.
  ```existing
  if (layerId == null || typeof layerId !== 'string') return 'Threshold';
  ```
  ```suggested
  if (layerId === null || layerId === undefined || typeof layerId !== 'string') return 'Threshold';
  ```

## src/hunter/surface/query-tool.ts
- **src/hunter/surface/query-tool.ts:259-262** (bug)
  Bug: The `chain` BFS never assigns a `step` number to path rows. Each step object (line ~162) has `from`, `to`, `kind`, `file`, `line` — but no `step` property. Then `formatRows` (line ~375) reads `r.step ?? 1`, which always resolves to `1` since `r.step` is never set. Every step in the LLM output will display `step=1`, losing positional information. The `buildPath` function should assign sequential step numbers when materializing the path.
  ```existing
  const step: QueryRow = {
    from: curId, to: e.dst_label, kind: e.predicate,
    file: e.dst_file ?? '', line: e.dst_line ?? 0,
  };
  ```
  ```suggested
  // Assign a sequential step number when the path is materialized in buildPath
  const step: QueryRow = {
    from: curId, to: e.dst_label, kind: e.predicate,
    file: e.dst_file ?? '', line: e.dst_line ?? 0,
  };
  ```
- **src/hunter/surface/query-tool.ts:0-0** (bug)
  Bug: 7 of 12 verb implementations (`mustImplement`, `unwired`, `rule`, `violations`, `consistency`, `blastRadius`, `wouldBreak`) return raw rows without calling `formatRows`, so the `format` parameter in `QueryInput` is silently ignored for these verbs. Compare with `whoCalls`, `chain`, `semanticVerb`, and `docsPatternsVerb` which all pass through `formatRows`. A caller requesting `format: 'llm'` for the `violations` verb gets the full-size rows instead of the token-minimal records. At minimum, flat-row verbs (`violations`, `mustImplement`, `unwired`, `consistency`) should route through `formatRows` for consistency.
  ```existing
  const effectiveCap = input.format === 'llm' ? MAX_QUERY_ROWS : MAX_QUERY_ROWS_FULL;
  const off = Math.max(0, Math.floor(input.offset ?? 0));
  const lim = input.limit !== undefined ? Math.min(Math.max(0, Math.floor(input.limit)), effectiveCap) : effectiveCap;
  return rows.slice(off, off + lim);
  ```
  ```suggested
  const effectiveCap = input.format === 'llm' ? MAX_QUERY_ROWS : MAX_QUERY_ROWS_FULL;
  const off = Math.max(0, Math.floor(input.offset ?? 0));
  const lim = input.limit !== undefined ? Math.min(Math.max(0, Math.floor(input.limit)), effectiveCap) : effectiveCap;
  return formatRows(rows.slice(off, off + lim), input.format);
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

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:109-118** (maintainability)
  The longest-prefix matching pattern (`[...allPrefixes].sort((a, b) => b.length - a.length)` + linear scan) is duplicated in `ownerOf`, `isForeignWave`, `assertOwnWave`, and `assertAliasNamespace` (4 places). This increases maintenance burden and the risk of inconsistency if one site is updated but others are missed. Extract a shared helper (e.g., `findLongestMatchingPrefix(waveId, prefixes)`) and reuse it everywhere.
  ```existing
  ownerOf(waveId: string): ScopeBinding | null {
    // ★ F-207 FIX (2026-09-24): LONGEST-prefix match — first-match over
    //   registration order misattributes overlapping namespaces (wave- vs
    //   wave-extra-). F-132 only refused exact duplicates, not overlaps.
    const sorted = [...this.prefixes.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [, b] of sorted) {
      
  ```
