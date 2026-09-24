# HIGH slice 1 — 12 findings across 9 files

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:285-288** (bug)
  `text.split(id).length - 1` matches substrings of unrelated identifiers, inflating frequency counts and biasing ranking. For example, ruleId `eqeqeq` would match inside `eqeqeq-ban`, and ruleId `no-unsafe` would match inside `no-unsafe-assignment`. Use a word-boundary regex or a dedicated counting method.
  ```existing
  for (const id of ruleIds) {
      const occurrences = text.split(id).length - 1;
      counts.set(id, (counts.get(id) ?? 0) + occurrences);
    }
  ```
  ```suggested
  for (const id of ruleIds) {
      // Use word-boundary regex to avoid substring false positives
      // (e.g., 'error' matching inside 'errorHandler').
      const pattern = new RegExp(`\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\$&')}\b`, 'g');
      const matches = text.match(pattern);
      const occurrences = matches ? matches.length : 0;
      counts.set(id, (counts.get(id) ?? 0) + occurrences);
  ```
- **src/hunter/diagnostics/engine.ts:523-527** (bug)
  `unwired()` only considers `calls` edges when determining dead nodes. Functions that are exclusively `await`-ed (never directly called) are incorrectly classified as unwired/dead. This misclassifies legitimate async call-sites.
  ```existing
  unwired(): DeadNode[] {
    const targets = new Set(this.links.filter((e) => e.kind === 'calls').map((e) => e.targetId));
    return [...this.nodeById.values()]
      .filter((n) => (n.kind === 'function' || n.kind === 'method' || n.kind === 'class') && !targets.has(n.id))
      .map((n) => ({ id: n.id, name: n.name, file: n.file ?? '', line: n.line ?? 0 }));
  ```
  ```suggested
  unwired(): DeadNode[] {
    const targets = new Set(
      this.links
        .filter((e) => e.kind === 'calls' || e.kind === 'awaits')
        .map((e) => e.targetId),
    );
    return [...this.nodeById.values()]
      .filter((n) => (n.kind === 'function' || n.kind === 'method' || n.kind === 'class') && !targets.has(n.id))
      .map((n) => ({ id: n.id, name: n.name, file: n.file ?? '', line: n
  ```
- **src/hunter/diagnostics/engine.ts:753-757** (bug)
  A malformed `data` JSON column in `graph_nodes` silently defaults to `{}` with only a `console.error`. Predicates that read `node.data` receive degraded/partial input and may emit incorrect findings without any loud signal that the graph was corrupted. This contradicts the file's fail-closed law: a template defect is a loud named error, never a silent degradation.

Consider either throwing on malformed data (fail-closed) or at minimum including a flag in the normalized finding that data was degraded, so downstream consumers know.
  ```existing
  try {
            data = JSON.parse(r.data) as Record<string, unknown>;
          } catch (e: unknown) {
            console.error(`[engine:graph-logic] graph_nodes row ${r.id} carries malformed data JSON — defaulting to {}: ${String(e)}`);
          }
  ```
  ```suggested
  try {
            data = JSON.parse(r.data) as Record<string, unknown>;
          } catch (e: unknown) {
            // Fail-closed: a corrupted row risks wrong predicate results.
            throw sourceReadFailed(
              dbPath,
              `graph_nodes row ${r.id} carries malformed data JSON: ${String(e)} — refusing to load a degraded graph`,
            );
          }
  ```

## src/hunter/graph/graphify-adapter.ts
- **src/hunter/graph/graphify-adapter.ts:194-194** (bug)
  Bug: `loadGraphifyFileSync` hardcodes the normalize root as `dirname(dirname(graphPath))` (line 194), but `buildSync()` resolves the effective root from `effectiveProfile.project.root` (line 937). When `graphPath` is overridden via `GRAPHIFY_OUT` env var, `graphifyOut` profile field, or `override` parameter, these two roots diverge. The node file anchors inside the returned `GraphifyGraph` are normalized against the wrong base. Then `projectGraphifyGraph(graph, root)` at line 943 re-resolves against the profile root, but the `normalizeGraphifyGraph` containment pass (line 194) already dropped or mis-anchored nodes relative to `dirname(dirname(graphPath))`. This causes inconsistent containment: some nodes may be dropped by normalize (wrong base) but would have been kept by project, or vice versa. The `build()` async path avoids this by calling `normalizeGraphifyGraph(raw, { root: path.resolve(profile.project.root) })` directly at line 828. Fix: either accept an explicit `root` parameter in `loadGraphifyFileSync`, or extract the normalize call and let `buildSync` invoke `normalizeGraphifyGraph` directly with the profile root (matching `build()`'s pattern).
  ```existing
  return normalizeGraphifyGraph(raw, { root: path.dirname(path.dirname(graphPath)) });
  ```
  ```suggested
  export function loadGraphifyFileSync(graphPath: string, rootOverride?: string): GraphifyGraph {
  let text: string;
  try {
    text = statAndReadGraphJson(graphPath).text;
  } catch (e: unknown) {
    if (e instanceof Error && e.message.startsWith("GRAPHIFY_STAT_FAILED:")) {
      throw new Error(
        `GRAPHIFY_NOT_WARM:no-graph at ${graphPath} (rebuild with: bun scripts/graphify-build.ts --t
  ```

## src/hunter/harness/strike.ts
- **src/hunter/harness/strike.ts:37-38** (bug)
  Map collision silently drops earlier traces: If multiple TraceRow entries in the `traces` array share the same `findingId`, the `Map.set()` on line 46 silently overwrites the earlier entry, keeping only the last one. This changes the relevance score for that finding and can silently reorder results, breaking the documented determinism guarantee. Consider grouping traces by findingId (e.g., summing or averaging relevance values) or at minimum emitting a warning when a collision is detected.
  ```existing
  const traceByFinding = new Map<string, TraceRow>();
  for (const t of traces) traceByFinding.set(t.findingId, t);
  ```
  ```suggested
  const traceByFinding = new Map<string, TraceRow>();
  for (const t of traces) {
    const existing = traceByFinding.get(t.findingId);
    if (existing) {
      // Merge relevance scores when multiple traces map to the same finding.
      const mergedRelevance = { ...existing.relevance };
      for (const [k, v] of Object.entries(t.relevance)) {
        mergedRelevance[k] = (mergedRelevance[k] ?? 0
  ```

## src/hunter/lexicon/templates.ts
- **src/hunter/lexicon/templates.ts:202-208** (bug)
  `bindStages` confirms `Array.isArray(v)` but performs no element-level validation before casting to `{ id: string; entry: string }[]`. If any element is `null`, a primitive, or an object missing the `id`/`entry` keys, `PROCESS_GATES_OUTPUTS` will crash at runtime when accessing `cur.entry` / `next.entry`. Although the zod schema in `compileTemplate` validates the shape at compile time, this R16 runtime guard is presented as a type-certainty guarantee — it should validate each element defensively (similar to how `bindStringArray` filters non-string elements).
  ```existing
  function bindStages(bindings: Record<string, unknown>): { id: string; entry: string }[] {
  const v = bindings['stages'];
  if (Array.isArray(v)) {
    return v as { id: string; entry: string }[];
  }
  return [];
}
  ```
  ```suggested
  function bindStages(bindings: Record<string, unknown>): { id: string; entry: string }[] {
  const v = bindings['stages'];
  if (Array.isArray(v)) {
    return v.filter(
      (el): el is { id: string; entry: string } =>
        typeof el === 'object' && el !== null &&
        typeof (el as Record<string, unknown>).id === 'string' &&
        typeof (el as Record<string, unknown>).entry === 'string'
  ```
- **src/hunter/lexicon/templates.ts:562-566** (bug)
  In `PROCESS_GATES_OUTPUTS`, the finding sets `file: cur.entry` where `cur.entry` is an entry-point symbol/name (from the stages binding), NOT a file path. The `Finding` interface expects `file` to be a filesystem path. Downstream consumers (diagnostics, reports) will treat this symbol as a file path, causing incorrect display or failed lookups.
  ```existing
  findings.push({
          ruleId: 'process.gates-measure-outputs-not-logic',
          severity: sev,
          file: cur.entry,
          line: 0,
  ```
  ```suggested
  findings.push({
          ruleId: 'process.gates-measure-outputs-not-logic',
          severity: sev,
          file: cur.entry,  // TODO: resolve to actual file path via graph lookup
          line: 0,
  ```

## src/hunter/surface/query-tool.ts
- **src/hunter/surface/query-tool.ts:390-393** (performance)
  **Performance: `violations` fetches ALL matching rows into memory before pagination.** The SQL query has no `LIMIT`/`OFFSET` clause — it materializes the entire `findings` table matching the filter into a JS array, then slices. On a store with thousands of violations this is wasteful and can cause memory pressure. The database should handle pagination natively (e.g., `LIMIT ? OFFSET ?` in the SQL) so only the requested page is fetched. The current `MAX_QUERY_ROWS_FULL` (2000) cap applied after the full fetch means up to 2000 rows are always loaded even if only 10 are needed.
  ```existing
  const rows = rowsAs<Record<string, unknown>>(
    db.prepare(`SELECT rule_id, severity, file, line, evidence, verdict, week, run_id FROM findings WHERE verdict = 'VIOLATION'${byRun}${byWeek} ORDER BY CASE severity WHEN 'CRIT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MED' THEN 2 ELSE 3 END`).all(...params),
    'violations',
  );
  ```
  ```suggested
  // Push LIMIT/OFFSET params at the end so they come after runId/week params.
  const effectiveCap = input.format === 'llm' ? MAX_QUERY_ROWS : MAX_QUERY_ROWS_FULL;
  const off = Math.max(0, Math.floor(input.offset ?? 0));
  const lim = input.limit !== undefined
    ? Math.min(Math.max(0, Math.floor(input.limit)), effectiveCap)
    : effectiveCap;
  const rows = rowsAs<Record<string, unknown>>(
    
  ```

## src/kernel/graph-diff.ts
- **src/kernel/graph-diff.ts:67-70** (bug)
  **Bug: Label collision silently corrupts `inboundByLabel`.** When multiple nodes share the same `label` (e.g., two functions with the same name in different modules but distinct `canonical_id`), the later node's inbound count overwrites the earlier one. This causes `diffGraphs` to compare incorrect before/after values for that label — a blast-radius jump could be missed or fabricated. The same issue affects the `topDegree` array (duplicate label entries), but `inboundByLabel` is worse because it silently drops data via `Record` key overwrite.

Suggestion: Either aggregate (sum) inbound counts when labels collide, or switch to using `canonical_id` as the comparison key throughout `diffGraphs`.
  ```existing
  const inboundByLabel: Record<string, number> = {};
    for (const [cid, n] of inbound) {
      inboundByLabel[nodes.find((nn) => nn.canonical_id === cid)?.label ?? cid] = n;
    }
  ```
  ```suggested
  // Pre-build a canonical_id → label lookup to avoid O(n) find() per edge.
    const cidToLabel = new Map<string, string>();
    for (const nn of nodes) cidToLabel.set(nn.canonical_id, nn.label);

    const inboundByLabel: Record<string, number> = {};
    for (const [cid, n] of inbound) {
      const label = cidToLabel.get(cid) ?? cid;
      // Aggregate inbound counts when labels collide to avoid 
  ```

## src/omp/enforcement.ts
- **src/omp/enforcement.ts:275-275** (bug)
  Bug: Non-timeout errors in the close layer's bind (evidence scan) catch block are assigned the error code `"TSG_TIMEOUT"` even when the failure was NOT a timeout. This mislabels engine crashes, network errors, or any non-timeout exception as a timeout, making it impossible for callers to distinguish "slow" from "broken" (the exact distinction the fire-gate vocabulary is designed to preserve). The code should be `"TSG_DOWN"` or should extract the actual error code from the thrown error (same as the JEV catch does below with `GI_JEV_DOWN`).
  ```existing
  code: "TSG_TIMEOUT",
  ```
  ```suggested
  // Extract the real error code so callers can distinguish TSG crashes from timeouts.
    const tsgCode = e instanceof Error && "code" in e && typeof (e as { code?: unknown }).code === "string"
      ? String((e as { code: unknown }).code)
      : "TSG_DOWN";
    return {
      verdict: "FAIL_CLOSED",
      code: tsgCode,
      reason: "the evidence scan failed (fail-closed)",
      evidence: e ins
  ```

## src/omp/jev.ts
- **src/omp/jev.ts:216-216** (security)
  The Bearer token redaction regex `[A-Za-z0-9_-]+` does not cover API keys containing characters like `.`, `+`, `/`, `=` (common in base64-encoded or vendor-format keys). Additionally, if the key somehow appears in error messages outside the Bearer format (e.g., `String(e)` path for non-Error rejections), it won't be redacted at all. Consider a broader regex or a centralized redaction utility that scrubs the actual key value.
  ```existing
  error: e instanceof Error ? e.message.replace(/Bearer [A-Za-z0-9_-]+/g, "Bearer <redacted>") : String(e),
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:79-88** (bug)
  Bug: When `testFile` is `'~/'`, the `startsWith(TILDE_SLASH)` branch fires, `slice(2)` yields `''`, and `path.join(home, '')` returns the bare HOME directory — not a file path. The function then returns this directory as the DB path, which would silently corrupt resolution. The bare `'~'` case correctly appends `spec.fileName`, but `'~/'` does not. Consider normalizing: if the resolved path is a directory or ends with a separator, append `spec.fileName`.
  ```existing
  if (testFile === TILDE || testFile.startsWith(TILDE_SLASH)) {
        const home = process.env.HOME ?? process.env.USERPROFILE;
        if (!home) {
          throw new Error(
            `[db-path] HOME_NOT_SET: neither HOME nor USERPROFILE env var is set ` +
            `(fileName="${spec.fileName}") - cannot resolve testFile`,
          );
        }
        return testFile === TILDE ? path.join
  ```
