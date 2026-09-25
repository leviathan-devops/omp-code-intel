# HIGH slice 5 — 12 findings across 10 files

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

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:139-142** (bug)
  When `conformanceZero` is true, `onAuditDone` clears `this.state` but does NOT clear `this.recent` (the dedup window). The dedup map retains stale file+rule counters from prior findings. On the next `diagnosticsFor` + `inject` cycle, the stale `recent` entries cause already-cleared diagnostics to display as 'N repeated' instead of being omitted. The `recent` map should be cleared alongside `state`.
  ```existing
  onAuditDone({ conformanceZero }: { conformanceZero: boolean }): void {
    this.conformanceZero = conformanceZero;
    if (conformanceZero) this.state.clear();
  }
  ```
  ```suggested
  onAuditDone({ conformanceZero }: { conformanceZero: boolean }): void {
    this.conformanceZero = conformanceZero;
    if (conformanceZero) {
      this.state.clear();
      this.recent.clear();
    }
  }
  ```
- **src/hunter/surface/lsp-injector.ts:352-358** (bug)
  `enforceBacklog` deduplicates the queue by `path.basename(f)`, keeping only the last occurrence per basename. Under rapid file churn in a monorepo, this silently drops events for files with the same basename in different directories (e.g. `src/utils/index.ts` vs `lib/utils/index.ts` — both basenames 'index.ts', only the last path survives). The dropped files will never be reparsed, causing stale diagnostics. Consider deduplicating by full path, or at least warning which files were dropped.
  ```existing
  private enforceBacklog(): void {
    if (this.queue.length > WATCHER_BACKLOG_CAP) {
      console.warn(WATCHER_STALLED);
      const folded = new Map<string, string>();
      for (const f of this.queue) folded.set(path.basename(f), f);
      this.queue = [...folded.values()];
    }
  ```
  ```suggested
  private enforceBacklog(): void {
    if (this.queue.length > WATCHER_BACKLOG_CAP) {
      console.warn(WATCHER_STALLED);
      // Keep only the most recent entry per full path to avoid cross-directory basename collisions.
      const folded = new Map<string, string>();
      for (const f of this.queue) folded.set(f, f);
      this.queue = [...folded.values()];
    }
  ```

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:179-183** (bug)
  The splice fix still has a race condition. Two concurrent `execute()` calls each build their own local `evidence` array, then both perform `this.evidence.splice(0, this.evidence.length, ...evidence)`. The second caller's splice overwrites the first caller's snapshot entirely. Since JavaScript is single-threaded, the splice itself is atomic, but the window between two awaits in different execute() calls means one run's snapshot is silently replaced. If the public `this.evidence` field is read between runs (as documented for 'sequential readers'), it will contain data from the wrong run. Consider using a generation counter, a lock, or simply removing the shared mutable snapshot in favor of returning evidence from execute().
  ```existing
  // ★ F-212 FIX (2026-09-24): single-call snapshot — the length=0+push pair
    //   exposed an empty array to any reader between the two statements.
    //   splice() publishes the run in one synchronous call (same reference,
    //   sequential readers keep working; no intermediate empty is observable).
    this.evidence.splice(0, this.evidence.length, ...evidence);
  ```

## src/omp/adapters/c2kg.ts
- **src/omp/adapters/c2kg.ts:32-38** (bug)
  After `JSON.parse`, the `as C2kgIndex` cast is a compile-time-only assertion — it does not validate the runtime structure. If `idx.symbols` exists but is not an array (e.g., a string, number, or object), the subsequent `.filter()` call will throw an uncaught `TypeError` ("idx.symbols.filter is not a function"). This TypeError will bubble up with a raw JS error message instead of the intended `GI_LAYER_C2KG`-prefixed error, bypassing the design contract. The `.filter()` and `.map()` chain should either be wrapped in the existing try/catch, or `idx.symbols` should be validated with `Array.isArray()` before use.
  ```existing
  let idx: C2kgIndex;
      try {
        idx = JSON.parse(fs.readFileSync(indexPath, "utf8")) as C2kgIndex;
      } catch (e) {
        throw new Error(`GI_LAYER_C2KG: the index is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      const hits = (idx.symbols ?? []).filter((s) => (s.name ?? "").includes(subject));
  ```
  ```suggested
  let idx: C2kgIndex;
      try {
        idx = JSON.parse(fs.readFileSync(indexPath, "utf8")) as C2kgIndex;
      } catch (e) {
        throw new Error(`GI_LAYER_C2KG: the index is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      const symbols = Array.isArray(idx.symbols) ? idx.symbols : [];
      const hits = symbols.filter((s) => (s.name ?? "").includes(s
  ```

## src/omp/gate-hook.ts
- **src/omp/gate-hook.ts:186-187** (bug)
  The `classifyEdit` call at line 145 receives `{ file: rec.file, oldString: rec.oldText, newString: rec.newText }`. For the `write`/`write_file` tool path in `reconstruct`, `rec.oldText` is the current file content and `rec.newText` is the new content. But `classifyEdit` in graph-gate.ts expects `oldString` and `newString` as the *diff components* (old patch vs new patch), not full file contents. This means `classifyEdit` will extract export symbols from the entire old and new file contents rather than just the changed parts, potentially marking the edit as `HIGH` severity when only a comment was changed in a large file with many exports.

Suggestion: pass the actual diff components (the strings being substituted) rather than full file contents for the write path.
  ```existing
  const rec = reconstruct(name, eventInput(event));
    const c = classifyEdit(name, { file: rec.file, oldString: rec.oldText, newString: rec.newText });
  ```

## src/omp/kernel-v2.ts
- **src/omp/kernel-v2.ts:357-357** (bug)
  Inconsistency between tie-breaking in `worstOutcome` and the verdict computation in stage 5. `worstOutcome` uses class priority (destructive > theatrical > dumb) as a tiebreaker and may select, say, `theatricalDetector` when it ties with `dumbDetector` on VIOLATION. But stage 5's verdict ternary checks `worst.detector.class === "destructive"` to decide REFUSE vs STEER — if the tiebreaker selected theatrical, this check is false, so a theatrical VIOLATION at tier T1 gets STEER. However, if `destructiveDetector` also returned VIOLATION at the same tier, `worstOutcome` would have selected it (higher class priority), and stage 5 would emit REFUSE. The same logical severity level produces different verdicts depending on which detectors happen to be present. Consider basing the REFUSE escalation on `worst.outcome.tier` alone, or ensure the code path aligns with the tie-breaking semantics.
  ```existing
  verdict = TIER_ORDER[worst.outcome.tier] >= TIER_ORDER["T2"] || worst.detector.class === "destructive" ? "REFUSE" : "STEER";
  ```
  ```suggested
  // Escalate to REFUSE for T2+ violations or destructive class violations
    if (
      TIER_ORDER[worst.outcome.tier] >= TIER_ORDER["T2"] ||
      worst.detector.class === "destructive"
    ) {
      verdict = "REFUSE";
    } else {
      verdict = "STEER";
    }
  ```

## src/omp/store-open.ts
- **src/omp/store-open.ts:0-0** (security)
  The scopeRoot validation rejects `..` segments and NUL bytes, but does **not** resolve or check for symlinks. A malicious or compromised process can place a symlink at, e.g., `scopeRoot/link` → `/etc`, and subsequent `fs.mkdirSync` / `fs.writeFileSync` calls will follow it, escaping the intended directory tree entirely. To harden: resolve `scopeRoot` via `fs.realpathSync` (which rejects dangling / symlinked components) **after** the `isAbsolute` + `..` + NUL checks, and verify the resolved path still starts with the intended root prefix.
  ```existing
  if (!path.isAbsolute(input.scopeRoot) || input.scopeRoot.split(/[\/]/).includes("..") || input.scopeRoot.includes("\0")) {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot must be a canonical absolute path, got ${JSON.stringify(input.scopeRoot)}`);
  }
  ```
  ```suggested
  if (!path.isAbsolute(input.scopeRoot) || input.scopeRoot.split(/[\/]/).includes("..") || input.scopeRoot.includes("\0")) {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot must be a canonical absolute path, got ${JSON.stringify(input.scopeRoot)}`);
  }
  let resolvedScopeRoot: string;
  try {
    resolvedScopeRoot = fs.realpathSync(input.scopeRoot);
  } catch {
    throw new GiScopeError(`G
  ```

## src/scoping/scoped-store.ts
- **src/scoping/scoped-store.ts:128-132** (performance)
  The synchronous busy-wait `while (Date.now() < until)` blocks the event loop for up to 50+100+150 = 300ms across retries. This starves all other async work in the process. The sibling function `withImmediateTx` correctly uses `await setTimeout`, but `runWithRetry` is synchronous and cannot. Consider making this function `async` and using `await new Promise(r => setTimeout(r, wait))` to yield the event loop, consistent with `withImmediateTx`'s pattern. If sync is truly required, document the event-loop-blocking trade-off explicitly.
  ```existing
  closeStoreDb();
      const wait = 50 * (attempt + 1);
      const until = Date.now() + wait;
      while (Date.now() < until) { /* the bounded busy-wait */ }
      void until;
  ```
  ```suggested
  closeStoreDb();
      const wait = 50 * (attempt + 1);
      // NOTE: this blocks the event loop for `wait` ms — acceptable for the
      // retry-ladder's short durations but should be migrated to async if
      // the wait budget ever grows.
      const until = Date.now() + wait;
      while (Date.now() < until) { /* the bounded busy-wait */ }
  ```
- **src/scoping/scoped-store.ts:123-128** (bug)
  Both `runWithRetry` and `withImmediateTx` call `closeStoreDb()` on failure, then re-enter `getStoreDb()` — but without `opts`, so no `schema` is passed. If the DB file was deleted or corrupted between close and reopen, SQLite silently creates an empty file with no tables. The next SQL call will fail with 'no such table'. The callers of `runWithRetry`/`withImmediateTx` typically don't re-supply schema. Consider: (a) having the retry functions accept and forward `ScopedStoreOptions` so schema is re-run on reopen, or (b) having `getStoreDb()` remember the last-used opts and replay schema automatically on fresh opens.
  ```existing
  try {
      getStoreDb().run(sql, params as never);
      return true;
    } catch (e) {
      lastErr = e;
      closeStoreDb();
  ```
  ```suggested
  try {
      getStoreDb().run(sql, params as never);
      return true;
    } catch (e) {
      lastErr = e;
      closeStoreDb();
      // Consider: store last opts so getStoreDb() can re-run schema on reopen
  ```
