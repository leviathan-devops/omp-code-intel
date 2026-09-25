# HIGH slice 1 — 14 findings across 11 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:256-267** (bug)
  graph.nodes() return ordering is not enforced to be deterministic, yet the result is fed directly into JSON.stringify for fixturesHash computation. If the adapter returns nodes in a non-deterministic order (e.g., from a Set or Map with insertion-order iteration), the same logical fixture set produces different batteryVersion hashes across runs, silently invalidating valid calibrations. The callers are sorted but the nodes themselves are not.
  ```existing
  const graphOf = (graph: GraphAdapter): unknown => ({
      nodes: graph.nodes().map((n) => ({
        id: n.id, kind: n.kind, name: n.name,
        file: n.file ?? null, line: n.line ?? null, lineage: n.lineage, source: n.source,
        data: n.data ?? null,
      })),
      edges: graph.nodes().map((n) => {
        try {
          return { to: n.id, callers: graph.whoCalls(n.name).map((c) => `${
  ```
  ```suggested
  const graphOf = (graph: GraphAdapter): unknown => {
      const nodes = graph.nodes().map((n) => ({
        id: n.id, kind: n.kind, name: n.name,
        file: n.file ?? null, line: n.line ?? null, lineage: n.lineage, source: n.source,
        data: n.data ?? null,
      }));
      nodes.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      return {
        nodes,
        edges: graph.no
  ```
- **src/hunter/diagnostics/calibration.ts:263-265** (bug)
  When whoCalls() throws, the catch silently coerces the callers to an empty array, masking a real data-integrity or adapter-error condition. This means a topology-breaking change that causes whoCalls to throw escapes the fixturesHash, producing a stale batteryVersion and allowing a potentially invalid calibration to be reused. The error should be logged or the serialization should fail loudly rather than silently degrading.
  ```existing
  try {
          return { to: n.id, callers: graph.whoCalls(n.name).map((c) => `${c.caller}@${c.file}:${c.line}`).sort() };
        } catch { return { to: n.id, callers: [] }; }
  ```
  ```suggested
  try {
          return { to: n.id, callers: graph.whoCalls(n.name).map((c) => `${c.caller}@${c.file}:${c.line}`).sort() };
        } catch (e) {
          console.warn(`[calibration] whoCalls threw for node ${n.name}: ${e instanceof Error ? e.message : String(e)} — including empty callers in version hash`);
          return { to: n.id, callers: [] };
        }
  ```

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:118-123** (bug)
  **Process not killed on timeout, leaks after rejection.** When `timeoutMs` fires, the timer calls `proc.kill('SIGTERM')` inside a try/catch, but if SIGTERM doesn't terminate the process (e.g., the process traps SIGTERM), the child continues running indefinitely. The `settled` guard prevents the close/error handlers from calling `reject` again — but `proc` is never explicitly unref'd or escalated to SIGKILL. Additionally, stdout/stderr accumulate unbounded during the leaked process lifetime. Fix: add SIGKILL escalation after a short grace period (e.g., 5s), and consider unrefing the timer so it doesn't keep the event loop alive after rejection.
  ```existing
  timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { proc.kill('SIGTERM'); } catch { /* already exited */ }
        reject(new Error(`corbell graph build timed out after ${timeoutMs}ms (cwd: ${cwd}) — child SIGTERMed, no partial graph accepted`));
      }, timeoutMs);
  ```
  ```suggested
  timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try { proc.kill('SIGTERM'); } catch { /* already exited */ }
        // Escalate to SIGKILL after 5 s grace if the child survives SIGTERM.
        const killTimer = setTimeout(() => {
          try { proc.kill('SIGKILL'); } catch { /* already exited */ }
        }, 5_000);
        killTimer.unref();
        rej
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:0-0** (bug)
  The `done()` method creates two new actor subscriptions (`sub2`, `sub3`) every time it is called, even if a previous invocation is still pending resolution. The `settled` flag only prevents duplicate *resolution* — it does not prevent duplicate *subscription creation*. If `done()` is called twice before the actor terminates, four subscriptions are created, and `handleDisposables` accumulates stale entries. Each call should either reuse an existing pending promise or guard against re-subscription.
  ```existing
  done(): Promise<void> {
      return new Promise<void>((resolve): void => {
        if (actor.getSnapshot().status === 'done') { resolve(); return; }
        const snapStatus: unknown = (actor.getSnapshot() as { status?: unknown }).status;
        if (snapStatus === 'stopped' || snapStatus === 'error') { resolve(); return; }
        let settled = false;
        const sub2 = actor.subscribe((s): vo
  ```
  ```suggested
  private _pendingDone: Promise<void> | null = null;
    done(): Promise<void> {
      if (this._pendingDone) return this._pendingDone;
      this._pendingDone = new Promise<void>((resolve): void => {
        if (actor.getSnapshot().status === 'done') { resolve(); return; }
        const snapStatus: unknown = (actor.getSnapshot() as { status?: unknown }).status;
        if (snapStatus === 'stopped' 
  ```

## src/hunter/profile/loader.ts
- **src/hunter/profile/loader.ts:0-0** (bug)
  **Dead/unreachable tab detection — `raw.trim()` strips leading tabs, so the regex `/^\t/` on `trimmed` can never match.**

`raw.trim()` removes all leading whitespace including tabs. The resulting `trimmed` string will never start with a `\t` character, making the `/^\t/.test(trimmed)` check always `false`. This means tab-indented YAML is silently accepted instead of rejected — a direct violation of the stated fail-closed contract (the file header explicitly says "tabs are not allowed in indentation").

Fix: test against the raw line or the leading whitespace portion, e.g.:
```
const leadingWhitespace = raw.slice(0, raw.length - raw.trimStart().length);
if (/	/.test(leadingWhitespace)) yamlErr([], raw, i + 1, 'tabs are not allowed in indentation (the subset is space-indented)');
```
  ```existing
  const trimmed = raw.trim();
    if (trimmed === '') continue;
    if (/^	/.test(trimmed)) yamlErr([], trimmed, i + 1, 'tabs are not allowed in indentation (the subset is space-indented)');
  ```
  ```suggested
  const trimmed = raw.trim();
    if (trimmed === '') continue;
    const leadingWhitespace = raw.slice(0, raw.length - raw.trimStart().length);
    if (/	/.test(leadingWhitespace)) yamlErr([], raw.trim(), i + 1, 'tabs are not allowed in indentation (the subset is space-indented)');
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

## src/kernel/graph-diff.ts
- **src/kernel/graph-diff.ts:41-44** (security)
  SQL injection / correctness risk: predicate values are interpolated directly into the SQL string via template-literal concatenation. If any predicate in `PREDICATES` ever contains a single-quote character, the query will break or become exploitable. Use parameterized queries instead:
```ts
const placeholders = PREDICATES.map(() => '?').join(', ');
const edges = db.query(
  `SELECT src_canonical, dst_canonical, predicate FROM typed_edges
   WHERE superseded_run IS NULL AND predicate IN (${placeholders})`,
  [...PREDICATES],
).all() as Array<...>;
```
  ```existing
  const edges = db.query(
      `SELECT src_canonical, dst_canonical, predicate FROM typed_edges
       WHERE superseded_run IS NULL AND predicate IN (${[...PREDICATES].map((p) => `'${p}'`).join(", ")})`,
    ).all() as Array<{ src_canonical: string; dst_canonical: string; predicate: string }>;
  ```
  ```suggested
  const placeholders = PREDICATES.map(() => '?').join(', ');
    const edges = db.query(
      `SELECT src_canonical, dst_canonical, predicate FROM typed_edges
       WHERE superseded_run IS NULL AND predicate IN (${placeholders})`,
      [...PREDICATES],
    ).all() as Array<{ src_canonical: string; dst_canonical: string; predicate: string }>;
  ```

## src/omp/adapters/semantica.ts
- **src/omp/adapters/semantica.ts:18-19** (security)
  The `..` segment check prevents directory traversal via literal `..` but does not defend against symlink-based escapes. If any ancestor directory within `scopeRoot` is a symlink pointing outside the intended tree, `path.join(scopeRoot, '.omp/…')` resolves through it silently. Use `fs.realpathSync(scopeRoot)` to canonicalize before joining and compare the resolved path against an allow-list root, or at minimum assert that `realpathSync(kgPath).startsWith(allowedRoot)`.
  ```existing
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(path.sep).includes("..")) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  const kgPath = path.join(path.resolve(scopeRoot), ".omp/graph-intelligence/layers/semantica/kg.json");
  ```
  ```suggested
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(path.sep).includes("..")) throw new Error(`GI_LAYER_SEMANTICA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  // Canonicalize through the real filesystem to collapse symlinks and prevent symlink-based escapes.
  let resolvedRoot: string;
  try {
    resolvedRoot = fs.realpathSync(scopeRoot);
  } catch (e) {
    
  ```

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:28-66** (maintainability)
  `parseExports` and `parseExportSites` contain near-identical regex iteration and name-extraction logic (same five regexes, same destructuring parser, same braces/default handling). This duplication means any fix to export-parsing semantics (like the F-41 fix for generators) must be applied in two places. Extract the shared iteration into a single internal helper (e.g., `iterExportNames(src, cb)`) and have both public functions delegate to it — `parseExports` collects names into a Set, `parseExportSites` captures name-to-offset via the callback.
  ```existing
  export function parseExports(src: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  EXPORT_PARSE_RE.lastIndex = 0;
  while ((m = EXPORT_PARSE_RE.exec(src))) out.add(m[1]);
  EXPORT_GEN_RE.lastIndex = 0;
  while ((m = EXPORT_GEN_RE.exec(src))) out.add(m[1]);
  EXPORT_DESTRUCT_RE.lastIndex = 0;
  while ((m = EXPORT_DESTRUCT_RE.exec(src))) eachDestructuredName(m[
  ```

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:205-205** (bug)
  `factsFor` doesn't filter null/non-object elements from `facts()` before passing to `isAnchored`. If a consumer's `facts()` returns `[null, {…}, …]`, then `isAnchored(null)` throws a TypeError. The outer try-catch catches this, but the consequence is that ALL remaining facts from that consumer are silently dropped — not just the null ones. Compare with `auditOne` (line 148), which explicitly filters out nulls/non-objects BEFORE calling `isAnchored`. This inconsistency means `auditOne` correctly discards only bad facts while `factsFor` loses an entire consumer's contribution on the first null.
  ```existing
  for (const f of p.facts(subject)) if (isAnchored(f)) out.push(f);
  ```
  ```suggested
  const got = p.facts(subject);
if (Array.isArray(got)) {
  for (const f of got) {
    if (f !== null && typeof f === "object" && isAnchored(f as LayerFact)) out.push(f as LayerFact);
  }
}
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:60-60** (bug)
  When neither `HOME` nor `USERPROFILE` is set (e.g., in some containerized or CI environments), the fallback to `'.'` silently resolves the DB path relative to the current working directory. This is dangerous: the production DB would be written to an unpredictable location that varies between invocations. Given that this entire module exists to **prevent silent DB pollution**, this silent fallback contradicts the module's core guarantee. Consider throwing an error instead, similar to the `GI_TEST_ISOLATION_BROKEN` pattern above.
  ```existing
  dir = path.join(process.env.HOME ?? process.env.USERPROFILE ?? '.', dir.slice(2));
  ```
  ```suggested
  const home = process.env.HOME ?? process.env.USERPROFILE;
      if (!home) {
        throw new Error(
          `[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` +
          `(fileName="${spec.fileName}") — cannot resolve defaultDir`,
        );
      }
      dir = path.join(home, dir.slice(2));
  ```

## src/scoping/scope-resolver.ts
- **src/scoping/scope-resolver.ts:150-152** (bug)
  The `scoreProjectRoots` function receives a weighted map (`Map<string, number>`) from the resolver, but completely ignores the weight values — only iterating over the keys (`for (const [p] of paths)`). The resolver carefully assigns ×2 weight to workdir anchors and ×1 to file/command paths, but this information is discarded. Either the weights should influence candidate selection (e.g., as a tiebreaker or boost), or the weight-assignment code in resolve() is dead logic that should be simplified.
  ```existing
  for (const [p] of paths) {
    // THE PATH-AS-ROOT: test the candidate itself before ascending.
    let d = isRoot(p) ? p : path.dirname(p);
  ```
  ```suggested
  for (const [p, weight] of paths) {
    // THE PATH-AS-ROOT: test the candidate itself before ascending.
    let d = isRoot(p) ? p : path.dirname(p);
  ```
- **src/scoping/scope-resolver.ts:157-157** (bug)
  Depth is computed using `d.split('/').length`, which is incorrect on Windows where paths use backslashes (`C:\Users\...`). This would yield depth=1 for any Windows absolute path. Use a platform-independent method to compute depth.
  ```existing
  candidates.push({ d, depth: d.split('/').length, hasState: has(d, stateDir) });
  ```
  ```suggested
  candidates.push({ d, depth: d.split(path.sep).length, hasState: has(d, stateDir) });
  ```
