# HIGH slice 1 — 12 findings across 10 files

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:544-551** (bug)
  BUG: `visitedDirs` and `visitedRealDirs` are two separate sets tracking the same concept (visited real directory paths), causing inconsistent cycle detection. In the symlink branch (lines 584-588), `visitedRealDirs.has(real)` is checked, but the new directory is only added to `visitedRealDirs` — NOT to `visitedDirs`. This means a real directory entered via a symlink path can later be re-entered through a non-symlink path because `visitedDirs` (checked at line 548) was never updated for it. The root cause is that the F-813 fix added the symlink branch using `visitedRealDirs` (declared at line 610) while the original cycle guard at the top of `walk` uses `visitedDirs` (declared at line 544). Both sets should be merged into one to ensure uniform cycle detection.
  ```existing
  const visitedDirs = new Set<string>();
  const walk = (dir: string): void => {
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { realDir = dir; }
    if (visitedDirs.has(realDir)) {
      throw sourceReadFailed(dir, `symlink cycle: ${dir} resolves to ${realDir}, already visited — refusing to recurse forever`);
    }
    visitedDirs.add(realDir);
  ```
  ```suggested
  const visitedDirs = new Set<string>();
  const walk = (dir: string): void => {
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { realDir = dir; }
    if (visitedDirs.has(realDir)) {
      throw sourceReadFailed(dir, `symlink cycle: ${dir} resolves to ${realDir}, already visited — refusing to recurse forever`);
    }
    visitedDirs.add(realDir);
  ```
- **src/hunter/diagnostics/engine.ts:636-637** (bug)
  BUG: On Windows, `path.relative(root, abs)` returns backslash-separated paths (e.g. `src\lib\file.ts`). The node ID `file:${rel}` (line 636) uses this backslash form, while the import-edge `targetId` (line 683) is computed via `path.posix` operations which produce forward-slash IDs. This creates a path-separator mismatch: the source side of an import edge uses `file:src\lib\file.ts` (backslash) while the target side resolves to `file:src/lib/file.ts` (forward slash), causing `keptIds` (line 716) to miss the match and the edge to be silently dropped. The F-4 path escape fix on the POSIX join side is correct, but the `rel` variable needs the same normalization.
  ```existing
  for (const abs of collectLocalTsFiles(root)) {
    const rel = path.relative(root, abs);
  ```
  ```suggested
  for (const abs of collectLocalTsFiles(root)) {
    const rel = path.relative(root, abs).split(path.sep).join('/');
  ```

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:205-207** (maintainability)
  `mergePartialHarness` mutates the caller's `decisions` array in-place via `decisions.length = 0; decisions.push(...uniqDecisions)` (lines 166-168). While the current callers use local arrays so this is contained, the side-effecting contract is fragile — any future caller passing a shared or reusable array will be surprised. Consider creating and returning a new array instead of mutating the input, which also simplifies the caller's reasoning about the returned value.
  ```existing
  decisions.length = 0;
  decisions.push(...uniqDecisions);
  const resolvedEntityIds = new Set(decisions.map((d) => d.newEntity.id));
  ```
  ```suggested
  const seenIds = new Set<string>();
  const uniqDecisions: ResolutionDecision[] = [];
  for (const d of decisions) {
    if (seenIds.has(d.newEntity.id)) continue;
    seenIds.add(d.newEntity.id);
    uniqDecisions.push(d);
  }
  const resolvedEntityIds = new Set(uniqDecisions.map((d) => d.newEntity.id));
  ```

## src/hunter/harness/trace.ts
- **src/hunter/harness/trace.ts:81-81** (bug)
  **Bug — `mechanism` is computed but never used; long evidence is no longer truncated.**

The variable `mechanism` (line 72) applies the intended 120-character truncation with ellipsis, but the return statement (line 75) uses `first` instead of `mechanism`. The F-1032b fix correctly fixed the `mechanism`→`first` naming error in the return, but should have returned `mechanism` (the truncated form) rather than `first` (the raw form). As a result, the root-cause string can now contain arbitrarily long evidence text, and the `mechanism` variable is dead code. Fix: return `mechanism` in the template literal.
  ```existing
  return `the ${f.ruleId} violation at ${anchor} (${depth}): ${first}`;
  ```
  ```suggested
  const mechanism = first.length > 120 ? `${first.slice(0, 120)}\u2026` : first;
  const depth = evidenceLen > 3 ? 'a multi-step edge chain' : 'single-edge mechanism';
  return `the ${f.ruleId} violation at ${anchor} (${depth}): ${mechanism}`;
  ```

## src/hunter/shared/containment.ts
- **src/hunter/shared/containment.ts:137-139** (security)
  `requireContained` returns `real` without checking or exposing the `resolved` flag. When `resolved` is false, the returned path is just the caller's absolute spelling (e.g. after maxClimb exhaustion), not the actual filesystem path. A caller using this return value for file I/O could operate on a path that, when accessed, follows a different symlink chain than the containment check evaluated. This is the same class of issue F-602 was created to prevent for callers of `checkContained`, but `requireContained` bypasses it.
  ```existing
  const { real, rootReal, contained } = checkContained(target, root);
  if (!contained) onViolation({ real, rootReal, target, root });
  return real;
  ```
  ```suggested
  const { real, rootReal, contained, resolved } = checkContained(target, root);
  if (!contained || !resolved) onViolation({ real, rootReal, target, root });
  return real;
  ```

## src/hydra/map-reader.ts
- **src/hydra/map-reader.ts:195-204** (security)
  TOCTOU race between stat and readFile: the file size is validated via `fs.promises.stat`, then the file content is fetched in a separate `fs.promises.readFile` call. Between these two calls the file could grow beyond the 128MB `GRAPH_LOAD_BUDGET_BYTES` budget, allowing an OOM via `JSON.parse` on a much larger payload than the stat guard authorized. This defeats the core EN-38 OOM protection.
  ```existing
  const gSize = Number.isFinite(stat.size) && stat.size > 0 ? stat.size : Number.MAX_SAFE_INTEGER;
  if (gSize > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${gSize} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower graph cardinality.`);
  }
  if (gSize > GRAPH_PARSE_YIELD_BYTES) {
    await new Promise<void>((res) => setIm
  ```
  ```suggested
  if (stat.size > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${stat.size} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower graph cardinality.`);
  }
  if (stat.size > GRAPH_PARSE_YIELD_BYTES) {
    await new Promise<void>((res) => setImmediate(() => res()));
  }
  let raw: Record<string, unknown>;
  try {
    const conten
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:123-128** (performance)
  When `st` is null (stat failed), the 32 MiB safety guard is bypassed entirely. The condition `if (st && st.size > MAX_SAFE_FULL_READ)` evaluates to `false` when `st` is null, so the subsequent `readFileSync` proceeds without any size bound. If the file exists but `statSync` fails (e.g., a platform-specific permission issue or a race with file removal/recreation), a multi-gigabyte ledger would be fully materialized into memory. The F-842 fix correctly handles read *errors*, but does not protect against a successful read of an oversized file when stat is unavailable.
  ```existing
  const MAX_SAFE_FULL_READ = 32 * 1024 * 1024; // 32 MiB
  if (st && st.size > MAX_SAFE_FULL_READ) {
    throw new Error(
      `GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} (${st.size}B) and full read exceeds ${MAX_SAFE_FULL_READ}B — refusing to materialize the ledger`,
    );
  }
  ```
  ```suggested
  const MAX_SAFE_FULL_READ = 32 * 1024 * 1024; // 32 MiB
  if (st !== null && st.size > MAX_SAFE_FULL_READ) {
    throw new Error(
      `GI_ENFORCE_ABIDE: bounded tail failed for ${eventsPath} (${st.size}B) and full read exceeds ${MAX_SAFE_FULL_READ}B — refusing to materialize the ledger`,
    );
  }
  // When st is null (stat failed), attempt to stat again after read failure —
  // but refuse an u
  ```

## src/omp/gate-hook.ts
- **src/omp/gate-hook.ts:143-145** (bug)
  FIFO matching by tool name only — if the same tool (e.g., `edit` or `graph-query`) is called twice concurrently, `findIndex((e) => e.tool === name)` always returns the FIRST pending entry regardless of which call the result belongs to. This misattribution affects both the steer-note path and the query-resolution path: the wrong steer note can be attached to a tool result, or drift coverage can be granted to the wrong edit, defeating the gate's purpose. A unique correlation ID (or at minimum the file path / input fingerprint) should be carried from tool_call through to tool_result to guarantee correct pairing.
  ```existing
  const qi = queue.findIndex((e) => e.tool === name);
    if (qi === -1) return undefined;
    const note = queue.splice(qi, 1)[0]!.note;
  ```

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:321-327** (bug)
  saveGateState opens a brand-new SQLite connection on every call, executes CREATE IF NOT EXISTS + an INSERT/UPDATE, then closes. For concurrent sessions writing to the same storePath this has three problems: (1) no WAL mode and no busy timeout means a second writer can immediately get SQLITE_BUSY and throw; (2) even with sequential access, the CREATE TABLE DDL re-executes on every save, which is wasteful; (3) the finally block's close() swallows errors, masking close failures.

Suggestion: open the Database once (or use a connection pool), set journal_mode=WAL and a busy_timeout (e.g. 5000 ms), and remove the redundant GATE_DDL execution after initial creation. This applies equally to loadGateState.
  ```existing
  function openSessionDb(storePath: string): Database {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(storePath);
  db.exec(GATE_DDL);
  return db;
}
  ```
  ```suggested
  function openSessionDb(storePath: string): Database {
  const dir = path.dirname(storePath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(storePath);
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA busy_timeout=5000");
  db.exec(GATE_DDL); // only needed on first open, could be guarded
  return db;
}
  ```
- **src/omp/graph-gate.ts:185-187** (performance)
  editLog and graphQueries arrays grow without bound — there is no eviction of entries older than DRIFT_WINDOW_MS. Over a long-running session the arrays accumulate indefinitely, causing: (1) O(n) linear scans on every computeDrift call; (2) O(n²) total work across the session; (3) unbounded JSON blob size on every saveGateState call, eventually hitting SQLite's blob limits or blowing up memory.

Suggestion: evict expired entries periodically, e.g. in computeDrift or a dedicated prune function:
  state.editLog = state.editLog.filter(e => now - e.timestamp < DRIFT_WINDOW_MS);
  state.graphQueries = state.graphQueries.filter(q => now - q.timestamp < DRIFT_WINDOW_MS);
  ```existing
  for (const edit of state.editLog) {
    const age = Math.max(0, now - edit.timestamp);
    if (age >= DRIFT_WINDOW_MS) continue;
  ```
  ```suggested
  // Add at the start of computeDrift:
state.editLog = state.editLog.filter(e => now - e.timestamp < DRIFT_WINDOW_MS);
state.graphQueries = state.graphQueries.filter(q => now - q.timestamp < DRIFT_WINDOW_MS);
  ```

## src/omp/rsi.ts
- **src/omp/rsi.ts:389-400** (security)
  appendOutcome signs `${prevHash}|{c, o}` but NOT `fired_at` or `outcome_evidence`. An attacker with direct DB write access could forge the timestamp (e.g., backdate outcomes to change temporal analysis) or modify the evidence text without invalidating the HMAC. Since the goal of the append-only ledger is to provide trustworthy evidence, both `fired_at` and `outcome_evidence` should be included in the signed body. Note: `appendOutcome` generates `fired_at` itself (`new Date().toISOString()`), so signing it is straightforward. verifyEvidenceRow would also need corresponding updates to the verification forms.
  ```existing
  appendOutcome(canonicalId: string, outcome: Outcome, evidence: string): void {
    // ★ F-272 FIX (2026-09-24): tip-read+INSERT autocommit pair, same fork class as write() — one IMMEDIATE txn.
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const prev = this.db
        .query(`SELECT sig FROM ${this.evidenceTable} ORDER BY id DESC LIMIT 1`)
        .get() as { sig: string } | null;
      con
  ```

## src/scoping/session-state.ts
- **src/scoping/session-state.ts:54-58** (bug)
  **No `fsync` before rename — data durability risk**

`writeSessionStateRaw` calls `writeFileSync` then `renameSync`, but `writeFileSync` does not guarantee the data is flushed to persistent storage — it may only reside in the OS page cache. On a system crash or power loss, the rename could complete with only a partial or empty tmp file on disk, silently losing the entire session state.

Use `fs.writeFileSync` followed by `fsyncSync` (via `fs.openSync` + `fs.fsyncSync`) before the rename to ensure the data is durable. Alternatively, document that this level of durability is acceptable for the tool's use case.

```typescript
function writeSessionStateRaw(statePath: string, state: SessionStateMap): void {
  const tmp = statePath + '.tmp';
  const fd = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fd, JSON.stringify(state, null, 2));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, statePath);
}
```
  ```existing
  function writeSessionStateRaw(statePath: string, state: SessionStateMap): void {
  const tmp = statePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, statePath); // the atomic swap — a concurrent reader never sees torn JSON
}
  ```
