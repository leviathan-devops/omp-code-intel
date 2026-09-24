# HIGH slice 2 — 12 findings across 9 files

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:322-329** (security)
  TOCTOU race in symlink containment check: `realpathSync` validates the resolved real path for containment, but then `readFileSync(abs)` reads from the original (potentially swapped) path. Between these two calls, a concurrent process or attacker can swap the symlink target at `abs` to an arbitrary file outside the project root. The check validates path A but the read follows path B. This pattern exists in both `lockdownReadSource` (symlink containment) and `violationFrequencies` (log containment). A robust fix is to read via the resolved real path when it differs from `abs`, or use `fs.open` + `fstat` + `read` on the same fd to make check+read atomic.
  ```existing
  const parentReal = fs.realpathSync(path.dirname(abs));
      if (!inside(parentReal)) throw sourceReadFailed(abs, `path escapes project root (root=${rootReal} parent=${parentReal})`);
      let fileReal = abs;
      try { fileReal = fs.realpathSync(abs); } catch { /* the file may not exist yet — the read below reports it loud */ }
      if (!inside(fileReal)) throw sourceReadFailed(abs, `symlink e
  ```
  ```suggested
  const parentReal = fs.realpathSync(path.dirname(abs));
      if (!inside(parentReal)) throw sourceReadFailed(abs, `path escapes project root (root=${rootReal} parent=${parentReal})`);
      let fileReal = abs;
      try { fileReal = fs.realpathSync(abs); } catch { /* the file may not exist yet — the read below reports it loud */ }
      if (!inside(fileReal)) throw sourceReadFailed(abs, `symlink e
  ```
- **src/hunter/diagnostics/engine.ts:696-701** (bug)
  Any error reading the stored graph (including transient DB errors like a locked file, a permission glitch, or disk I/O error) causes `readStoredGraph` to return null. The caller then treats null as 'no stored graph exists' and triggers a full local build + DB overwrite — silently destroying the existing graph data. This violates the file's own fail-closed principle. The catch block should propagate critical errors (DB corruption, permission denied) as loud failures rather than conflating them with 'empty graph'. At minimum, distinguish between 'graph is empty' (nrows.length === 0 → return null) and 'graph read failed' (catch → throw or return a tagged sentinel).
  ```existing
  } catch (e: unknown) {
    console.error(`[engine:graph-logic] stored-graph read failed for ${dbPath}: ${String(e)}`);
    return null;
  } finally {
    try { db.close(); } catch { /* the close is best-effort after a read failure */ }
  }
  ```
  ```suggested
  } catch (e: unknown) {
    // Re-throw critical DB errors instead of silently returning null,
    // which triggers a full rebuild + overwrite (data loss on transient errors).
    const msg = String(e);
    if (msg.includes(' SQLITE_') || msg.includes('EACCES') || msg.includes('EIO') || msg.includes('locked')) {
      throw sourceReadFailed(dbPath, `stored-graph read critical failure: ${msg}`);
  
  ```

## src/hunter/graph/mechanical.ts
- **src/hunter/graph/mechanical.ts:182-185** (bug)
  Export re-export path resolution is missing extension handling that imports correctly apply. For a relative re-export like `export { foo } from './bar'`, the target stays `file:./bar` instead of `file:./bar.ts`, creating an inconsistency: the import side would produce `file:./bar.ts` for the same target. This means the downstream graph cannot match imports to exports for the same module, silently breaking relationship resolution.

Suggested fix: apply the same `knownExts` extension resolution logic to the export re-export branch.
  ```existing
  if (stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
          const target = stmt.moduleSpecifier.text;
          const targetRel = target.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(relPosix), target)) : target;
          pushTriple(fileCanon, 'exports', `file:${targetRel}`, expEvidence, relPosix, expLine);
  ```
  ```suggested
  if (stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
          const target = stmt.moduleSpecifier.text;
          let targetRel = target;
          if (target.startsWith('.')) {
            targetRel = path.posix.normalize(path.posix.join(path.posix.dirname(relPosix), target));
            const knownExts = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];
            if (!knownExts.some
  ```

## src/hunter/harness/trace.ts
- **src/hunter/harness/trace.ts:46-48** (bug)
  The composite key delimiter `:` collides with Windows drive letters (e.g. `C:\foo.ts`) and namespaced rule IDs (e.g. `security:xss`). Two distinct findings could map to the same key, causing silent downstream collisions when results are indexed by `findingId`. Consider a delimiter that cannot appear in rule IDs or paths, such as `::`, or use a tuple-based key with an encoding step.
  ```existing
  export function findingIdOf(f: { ruleId: string; file: string; line: number }): string {
  return `${f.ruleId}:${f.file}:${f.line}`;
}
  ```

## src/hunter/lexicon/templates.ts
- **src/hunter/lexicon/templates.ts:508-510** (bug)
  NaN/Infinity silently suppresses violations: `typeof NaN === 'number'` is `true` in JavaScript, so a NaN value returned by `readPath(node.data, valuePath)` (e.g., from a `0/0` computation in graph data) passes the `typeof value !== 'number'` guard on line 509 and enters `compareOperator`. Since NaN comparisons are always false, the violation is silently suppressed with no diagnostic. Similarly, `Infinity` as a threshold (accepted by `z.number()`) would make `value > Infinity` always false for `gt` operator, suppressing violations. Add an explicit guard: `if (!Number.isFinite(value)) continue;` after the typeof check, and validate `threshold` is finite in `bindNumber` or the check body.
  ```existing
  const value = readPath(node.data ?? {}, valuePath);
      if (typeof value !== 'number') continue;
      if (compareOperator(operator, value, threshold)) {
  ```
  ```suggested
  const value = readPath(node.data ?? {}, valuePath);
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      if (compareOperator(operator, value, threshold)) {
  ```

## src/hunter/surface/query-tool.ts
- **src/hunter/surface/query-tool.ts:243-247** (performance)
  The BFS queue in `chain()` has no size bound — only the depth is capped at 64 (MAX_DEPTH). On a dense graph with high fan-out, each depth level could multiply the queue by hundreds or thousands. The `queue`, `visited`, `parent`, and `depthOf` maps all grow proportionally, risking memory exhaustion or OOM well before the depth limit is reached. Consider adding a `MAX_QUEUE` constant (e.g., 100,000) and breaking out of the BFS loop when the queue exceeds it.
  ```existing
  while (head < queue.length) {
    const curId = queue[head]!;
    const curDepth = depthOf.get(curId) ?? 0;
    head += 1;
    if (curDepth >= MAX_DEPTH) continue;
  ```
- **src/hunter/surface/query-tool.ts:304-309** (bug)
  The empty `catch` block silently swallows ALL errors from the typed_nodes query — not just 'table missing' scenarios. Database corruption, permission errors, or disk I/O failures will be discarded, causing `codeNameSet` to fall back to only the graph_nodes leg. This can make `mustImplement` and `consistency` return wrong answers (e.g., false DRIFT/MUST_IMPLEMENT positives) without any diagnostic signal. Consider catching a specific 'table not found' error code and re-throwing unexpected errors, or at minimum logging a warning with the error details.
  ```existing
  try {
    for (const r of rowsAs<{ label: string }>(
      db.prepare('SELECT label FROM typed_nodes WHERE superseded_run IS NULL').all(), 'code-names typed')) {
      if (r.label) names.add(r.label);
    }
  } catch { /* typed leg absent on this store — the graph_nodes leg below decides */ }
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:41-69** (bug)
  All three `getKey()` functions (`getGoKey`, `getOpenRouterKey`, `getNvidiaKey`) catch all exceptions and silently return `''`. A permission error, missing file, wrong JSON schema, or path change produces an empty key with zero diagnostics — the rung is skipped as 'NO-KEY' and the chain appears healthy when it is not. At minimum, log a warning (e.g. `console.warn`) with the error message so degraded providers are diagnosable.
  ```existing
  function getGoKey(): string {
  // The go-key-pool cycles; any live key works (6/7 down, 1 serves union-alpha)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { resolveGoKeyIndex } = require('./go-key-pool') as { resolveGoKeyIndex: (n: number) => { idx: number; alive: boolean } };
    const r = resolveGoKeyIndex(Date.now());
    return r.alive ? `idx-${r.idx}` 
  ```

## src/omp/fire-ledger.ts
- **src/omp/fire-ledger.ts:513-522** (bug)
  **Lack of defensive validation in toPersisted for corrupted DB data** — The `toPersisted` function converts raw DB data into typed objects without validating that the types match expectations. For numeric fields like `probability` and `cost_usd`, `Number()` can silently produce `NaN` when the data is corrupted (e.g., non-numeric strings). For string fields like `ruleId` and `cls`, `String(null)` and `String(undefined)` produce literal 'null' and 'undefined', which are accepted as valid. This violates the module's contract of reliable data representation and can lead to silent propagation of corruption into downstream calculations.
  ```existing
  function toPersisted(raw: Record<string, unknown>): PersistedFireRow {
  return {
    id: Number(raw["id"]),
    at: String(raw["at"]),
    ruleId: String(raw["rule_id"]),
    cls: String(raw["cls"]),
    questionVersion: String(raw["question_version"]),
    probability: Number(raw["probability"]),
    band: String(raw["band"]),
    action: String(raw["action"]),
  ```
  ```suggested
  function toPersisted(raw: Record<string, unknown>): PersistedFireRow {
  const id = Number(raw["id"]);
  if (!Number.isInteger(id)) throw new LedgerError("CORRUPT_ROW", `id is not an integer: ${String(raw["id"])}");
  const probability = Number(raw["probability"]);
  if (!Number.isFinite(probability)) throw new LedgerError("CORRUPT_ROW", `probability is not finite: ${String(raw["probability"])}");
  ```
- **src/omp/fire-ledger.ts:330-335** (bug)
  **Non-LedgerError thrown in appendManyDetailed bypasses per-row retry** — In the transaction fallback catch block, the code only wraps `LedgerError` instances explicitly, but non-LedgerError exceptions (e.g., a `RangeError` from a bug, or a `TypeError`) are re-thrown directly. This propagates to `drain()`, which catches and calls `ledger.notePersistFailure()`. The code then normalizes the error code, but since the error is a plain LedgerError wrapping `APPEND_MANY_FAILED`, it is NOT in `POISON_CODES`. The row never gets quarantined. On every subsequent drain, the same row is retried, hits the same non-LedgerError, and the cycle repeats — `persistFailureCount` grows without bound and the row is permanently retried. This contradicts the F-341 design intent of quarantining deterministic failures.
  ```existing
  for (const r of rows) {
        try {
          this.append(r);
          committed.push(r);
        } catch (inner) {
          const err = inner instanceof LedgerError ? inner : new LedgerError("APPEND_FAILED", "row did not commit", inner);
  ```
  ```suggested
  for (const r of rows) {
        try {
          this.append(r);
          committed.push(r);
        } catch (inner) {
          const err = inner instanceof LedgerError ? inner : new LedgerError("APPEND_FAILED", "row did not commit", inner);
          failed.push({ row: r, error: err });
          const bare45 = err.code.startsWith("GI_LEDGER_") ? err.code.slice("GI_LEDGER_".length) : err.code;
 
  ```

## src/omp/graph-facts.ts
- **src/omp/graph-facts.ts:200-206** (bug)
  M-GRAPH-2 condition is overly strict: `outD === 0 && inD.n === 0` means FIRE only when a symbol has ZERO edges of any kind. This misses the case where a symbol is produced (has incoming edges, `inD.n > 0`) but never consumed (`outD === 0`) — a declared field that other code references/populates but nothing reads. This is a real gap matching the D-6 class (config promising consumption). The reason text "declared, never consumed" also misstates the situation: it claims the symbol is never consumed, but the condition allows `outD > 0` (i.e. the symbol IS consumed) as long as `inD.n === 0`, which is the wrong axis.

The condition should be `outD === 0` alone — if nothing reads from a symbol, it is unreferenced regardless of how many producers exist. Update the two branches to distinguish zero-edges from produced-but-unconsumed.
  ```existing
  verdicts.push(outD === 0 && inD.n === 0
        ? { rule: "M-GRAPH-2", settles: true, action: "FIRE",
            reason: `the declared symbol "${input.target}" has ZERO edges in or out — declared, never consumed`,
            evidence: "in-degree 0 · out-degree 0" }
        : { rule: "M-GRAPH-2", settles: true, action: "IGNORE",
            reason: `the declared symbol "${input.target}" is refere
  ```
  ```suggested
  verdicts.push(outD === 0
        ? { rule: "M-GRAPH-2", settles: true, action: "FIRE",
            reason: inD.n === 0
              ? `the declared symbol "${input.target}" has ZERO edges in or out — declared, never consumed`
              : `the declared symbol "${input.target}" is produced (${inD.n} incoming) but never consumed (zero outgoing)`,
            evidence: `in-degree ${inD.n} · out-d
  ```

## src/scoping/gi-session-path.ts
- **src/scoping/gi-session-path.ts:96-100** (security)
  **Security: Session ID collision from slug truncation at 24 characters**

Two distinct project roots whose resolved paths produce identical `scope-{slug}` strings after `.slice(0, 24)` will silently share the same session ID and therefore the same drift bucket, violating core isolation.

Example: two projects at `/data/repo-alpha-v2/team-alpha/research` and `/data/repo-alpha-v2/team-alpha/results` both slug to `scope-data-repo-alpha-v-team-alpha-res` after truncation.

**Fix:** At minimum, emit a warning when truncation occurs. Better: use a content hash (e.g. truncated SHA-256 of the full slug) as the suffix to make collisions astronomically unlikely while keeping the ID within the 24-char limit.
  ```existing
  const slug = path.resolve(root).replace(/[^A-Za-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  // ★ F-164 FIX (2026-09-24): floor the id at 8 chars — an all-punctuation root
  //   (e.g. "/") yields slug "" → "scope-" (6 chars), which fails the
  //   SESSION_STORE_RE {8,24} check downstream. sessionStorePath pads the same way.
  let id = (`scope-${slug}`).slice(0, 24);
  ```
  ```suggested
  const slug = path.resolve(root).replace(/[^A-Za-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  // Use a content hash when the slug exceeds 18 chars (24 - 6 for 'scope-')
  // to prevent silent truncation-based collisions.
  let id: string;
  if (slug.length <= 18) {
    id = `scope-${slug}`;
  } else {
    const { createHash } = await import("node:crypto");
    const h = createHash("sh
  ```
