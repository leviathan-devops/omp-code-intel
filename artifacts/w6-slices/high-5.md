# R6-HIGH slice 5 — 9 findings across 8 files

## src/hunter/firewall/artifact-scope.ts
- **src/hunter/firewall/artifact-scope.ts:122-128** (bug)
  On the CREATE path (masterReal is null), the check validates `parentReal` is inside `projectRootReal`. However, if the target's immediate parent directory doesn't exist yet, `fs.realpath(path.dirname(targetNorm))` will fail with ENOENT and the function will return BLOCKED (F-9 fix). This means the CREATE path for the very first report requires the `MASTER_CONTEXT` directory to already exist on disk — but the code's own comments describe this as 'the CREATE path'. If the directory doesn't exist, the first report can never be written. Verify this is the intended behavior or add logic to create the directory before the ALLOW verdict is returned.
  ```existing
  let parentReal: string;
  try {
    parentReal = await fs.realpath(path.dirname(targetNorm));
  } catch (e: unknown) {
    console.warn(`[artifact-scope] parent realpath failed (fail-closed): ${e instanceof Error ? e.message : String(e)}`);
    return blocked('REPORT_SCOPE_BLOCKED', base, input.target);
  }
  ```

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:99-104** (bug)
  `edgeLocByTarget` only retains the **first** edge per `targetId` (the `=== undefined` guard). If multiple edges target the same node and the first edge lacks `source_location`/`metadata` while a later edge carries valid line information, the line resolution will miss it and may produce a spurious LINELESS_NODE refusal. Consider aggregating all edge locations per target (or at minimum, falling through to later edges when earlier ones yield no line data).
  ```existing
  for (const e of buildResult.edges) {
    if (edgeLocByTarget[e.targetId] === undefined) {
      const rec = e as unknown as Record<string, unknown>;
      edgeLocByTarget[e.targetId] = { source_location: rec['source_location'], metadata: rec['metadata'] };
    }
  }
  ```

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:97-110** (performance)
  `batteryVersionAsync` and `batteryVersion` both call `batteryName(profile)`, which internally calls `extractRuleCards(profile.rules.corpus)`. `extractRuleCards` (rule-card.ts:252) reads every corpus file via synchronous `fs.readFileSync` (rule-card.ts:278). This means: (1) the async path in `batteryVersionAsync` is undermined — the sync reads in `batteryName` defeat the purpose of the async version; (2) every corpus file is read and parsed TWICE for the same version string — once for the hash computation and again inside `batteryName` via `extractRuleCards`. This is wasteful and creates a subtle consistency window: if a file changes between the two reads, the hash and the battery name are derived from different file contents. Fix: make `batteryName` async (accept already-read corpus texts or use async file reads) and share the read corpus content between hash computation and card extraction so the entire path is non-blocking and consistent.
  ```existing
  export async function batteryVersionAsync(profile: ProjectProfile): Promise<string> {
  const texts = await Promise.all(profile.rules.corpus.map(async (p) => {
    let text: string;
    try {
      text = await readFile(p, 'utf8');
    } catch (e: unknown) {
      throw corpusUnreadable(p, String(e));
    }
    return `${p}\n${text}`;
  }));
  const corpusText = texts.join('\n');
  const hash = sh
  ```
  ```suggested
  export async function batteryVersionAsync(profile: ProjectProfile): Promise<string> {
  const texts = await Promise.all(profile.rules.corpus.map(async (p) => {
    let text: string;
    try {
      text = await readFile(p, 'utf8');
    } catch (e: unknown) {
      throw corpusUnreadable(p, String(e));
    }
    return `${p}\n${text}`;
  }));
  const corpusText = texts.join('\n');
  const hash = sh
  ```

## src/hydra/map-reader.ts
- **src/hydra/map-reader.ts:228-240** (performance)
  The BFS uses `Array.shift()` which is O(n) per dequeue, combined with `[...cur, nb]` which copies the entire path array on each expansion. For large graphs (potentially up to the 128MB budget), this results in O(V×E×L) time complexity where L is path length. Use an index-based approach or a real queue data structure, and store paths via parent pointers instead of copying arrays.
  ```existing
  const queue: string[][] = [[fromId]];
    const visited = new Set<string>([fromId]);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const last = cur[cur.length - 1]!;
      if (last === toId) return { from, to, hops: cur, length: cur.length - 1 };
      for (const nb of adj.get(last) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push([.
  ```
- **src/hydra/map-reader.ts:136-141** (performance)
  readGraphJson is declared `async` but uses `fs.statSync` and `fs.readFileSync`, which are synchronous blocking calls that stall the event loop. This contradicts the async contract and can block all concurrent I/O in the process. Use `fs.promises.stat` and `fs.promises.readFile` (or `fs.promises.access` for the stat check) instead.
  ```existing
  let stat: fs.Stats;
  try {
    stat = fs.statSync(resolved);
  } catch {
    throw new Error(`GRAPHIFY_NOT_WARM: graph.json not found at ${resolved} — remedy: run the explicit graphify build for this target, then re-run the audit`);
  }
  ```

## src/kernel/graph-pre-flight.ts
- **src/kernel/graph-pre-flight.ts:15-19** (maintainability)
  **Misleading field name**: `riskProfile.testCoverage` is set to `testTargets.length` (a count of suggested test targets), but the name `testCoverage` strongly implies a percentage or ratio (e.g., 0.0–1.0 or 0–100). Any caller inspecting this field to gauge risk will draw incorrect conclusions — e.g., a value of 3 does not mean 3% coverage. Rename to `suggestedTestTargetCount` or `potentialTestTargets` to match actual semantics.
  ```existing
  riskProfile: {
    callers: number;
    uses: number;
    testCoverage: number;
  };
  ```
  ```suggested
  riskProfile: {
    callers: number;
    uses: number;
    /** Number of suggested test targets returned by the graph query, NOT a coverage ratio. */
    suggestedTestTargetCount: number;
  };
  ```

## src/omp/calibration.ts
- **src/omp/calibration.ts:76-77** (bug)
  Input validation is missing for negative count values. If `confirmed`, `refuted`, or `unresolved` are negative, the function silently produces mathematically invalid results — negative denominators in Wilson formulas, imprecision values below 0, and potentially misleading `sufficient`/`starved` flags. The resolved count on line 81 could become negative, causing the Wilson denominator to flip sign. Add validation at the top of `precisionFromCounts` to reject negative values.
  ```existing
  export function precisionFromCounts(c: ResolvedCounts, z = 1.96): PrecisionEstimate {
  const resolved = c.confirmed + c.refuted;
  ```
  ```suggested
  export function precisionFromCounts(c: ResolvedCounts, z = 1.96): PrecisionEstimate {
  if (c.confirmed < 0 || c.refuted < 0 || c.unresolved < 0) {
    throw new Error(`CALIBRATION_BAD_COUNTS: counts must be non-negative (confirmed=${c.confirmed}, refuted=${c.refuted}, unresolved=${c.unresolved})`);
  }
  const resolved = c.confirmed + c.refuted;
  ```

## src/omp/graph-facts.ts
- **src/omp/graph-facts.ts:103-103** (bug)
  The `LIKE` helper wraps every target in `%target%` (line 100), causing ALL queries (`known` check, `inDegree`, `outD`, self-edge) to perform **substring matching** on `canonical_id`. This means unrelated symbols that merely *contain* the target as a substring will be conflated — producing false positives or false negatives across all five rules.

For example, `target = "User"` will match `UserProfile`, `UserService`, `AdminUser`, etc. The `known` node-count check (line 167) will think multiple unrelated nodes are 'the target', and `inDegree` (line 130) will aggregate edges belonging to different symbols.

The self-edge query (line 240) is especially sensitive, as it requires both `src_canonical` and `dst_canonical` to match `%target%`, leading to false self-edge counts for M-GRAPH-5 when multiple nodes share the substring.

Consider using exact match (`=`) or, if prefix matching is needed, use `LIKE 'prefix%'` without the leading wildcard.
  ```existing
  const LIKE = (target: string) => `%${target.replace(/[%_]/g, "")}%`;
  ```
  ```suggested
  const LIKE = (target: string) => `${target.replace(/[%_]/g, "")}%`;
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:525-532** (bug)
  Indentation mismatch in `writeGraphifyCheckout` suggests a misplaced `try` block around COMMIT. The `db.exec("COMMIT;")` and its catch/rollback are indented inside an extra level, implying they sit inside a nested `try` that does NOT have a corresponding outer `catch`/`finally` for the ROLLBACK path. If the COMMIT is indeed nested inside two `try` blocks, the inner catch's ROLLBACK fires, but the outer catch also fires and issues a SECOND ROLLBACK — a double-rollback. More critically, the intent of the F-127 fix was to keep the COMMIT inside the same `try` that runs the inserts, but the current indentation places COMMIT and its catch in a scope that could mask commit failures from the outer catch. Verify the brace nesting matches the single-transaction contract.
  ```existing
  db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["populated_at", new Date().toISOString()]);
      try {
    db.exec("COMMIT;");
  } catch (commitErr) {
    try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
    throw commitErr;
  }
    } catch (e) {
  ```
  ```suggested
  db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["populated_at", new Date().toISOString()]);
      try {
        db.exec("COMMIT;");
      } catch (commitErr) {
        try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        throw commitErr;
      }
    } catch (e) {
  ```
