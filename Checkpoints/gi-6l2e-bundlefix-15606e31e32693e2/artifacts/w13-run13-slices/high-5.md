# HIGH slice 5 — 9 findings across 8 files

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

## src/hunter/tools/bug-hunt.ts
- **src/hunter/tools/bug-hunt.ts:268-272** (bug)
  **Race condition: status action reads session store without holding the hunt lock.**

The `hunt` action acquires a hunt lock (line 121) before running the micro-loop, which populates and modifies the session store. However, the `status` action (lines 168–205) opens the same session store, calls `countTypedNodes`/`populateSessionStore`/`unwiredNodes` **without acquiring the hunt lock**. This means:

1. A concurrent `hunt` could be mid-`populateSessionStore`, and the `status` call reads a half-written store — returning partial or inconsistent results.
2. `populateSessionStore` could be called concurrently by both a `hunt` and a `status`, corrupting the store.
3. `unwiredNodes` could read while the hunt's strike phase is writing findings, yielding a snapshot that reflects neither the before nor after state.

**Suggestion:** Acquire the hunt lock (or a read-lock/shared-lock variant) in the status action before accessing the session store, or at minimum document that concurrent status + hunt is unsupported.
  ```existing
  try {
        const opened = openSessionStore({ sessionId: callerId, scopeRoot, callerSessionId: callerId });
        if (countTypedNodes(opened.storePath) === 0) {
          populateSessionStore(opened.storePath, scopeRoot);
        }
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:193-196** (bug)
  **Over-broad subject matching — false positives**: The bidirectional `includes()` filter on lines 161–170 has two over-matching paths:
1. `hay.includes(subject)`: `hay` is three fields concatenated with spaces (e.g. `"matched_span verdict rule"`). A short subject like a single word (`"error"`) can match across field boundaries — e.g., a `matched_span` ending in `"error"` followed by a `verdict` starting with `"ful"` would match subject `"errorful"` which never appeared in any single field.
2. `subject.includes(span)`: A short `matched_span` (even 2–3 chars) can appear incidentally inside the subject text, causing a repair fact for an unrelated flag.

This over-reporting could flood downstream consumers with spurious repair opportunities. Consider matching against individual fields separately, or requiring a minimum span length for the reverse match.
  ```existing
  const hay = `${e.matched_span ?? ""} ${e.verdict ?? ""} ${e.rule ?? ""}`;
        if (hay.includes(subject)) return true;
        const span = (e.matched_span ?? "").trim();
        if (span.length > 0 && subject.includes(span)) return true;
  ```
  ```suggested
  // Match against individual fields to avoid cross-boundary false positives
        const span = (e.matched_span ?? "").trim();
        const verdict = (e.verdict ?? "").trim();
        const rule = (e.rule ?? "").trim();
        if (span.length > 0 && span.includes(subject)) return true;
        if (span.length > 0 && subject.includes(span)) return true;
        // Fall back to verdict/rule only f
  ```

## src/omp/evidence-producer.ts
- **src/omp/evidence-producer.ts:344-351** (bug)
  **Concurrent sessions sharing `recordsPath` will conflate evidence**: `resolveFromSession` first appends records via `produceAndPersist` (which calls `persistRecords` / `fs.appendFileSync`), then reads the entire file via `readRecordsAll` and partitions in memory by `fireStateHash`. If two concurrent sessions (e.g., parallel agent workers) share the same `recordsPath`:

1. Session A appends its records for fire X
2. Session B appends its records for fire Y (and possibly overlapping fire X)
3. Session A reads the file — sees session B's records mixed in

If both sessions produce records for the **same** `fireStateHash`, the evidence will be conflated, and `resolveAll` may reach a different conclusion than either session intended. Even for distinct fires, the file grows with interleaved records from unrelated sessions.

At minimum, add a comment documenting that `recordsPath` must not be shared across concurrent sessions. Ideally, use a per-session file (e.g., append a session ID) or a file lock.
  ```existing
  export function resolveFromSession(
  ledger: FireLedger,
  events: readonly ToolEvent[],
  opts: {
    recordsPath: string;
    /** state_hash → the subject the fire was about. The caller holds it; the DDL does not
     *  carry a target column (§8.2 — the named gap). */
    subjects: ReadonlyMap<string, Subject>;
  ```

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:240-242** (bug)
  Two-view drift bug: malformed `up()` causes `GI_LAYER_DOWN` in `auditOne` but an invisible omission in `factsForWithFaults`. When `up()` returns a malformed shape (e.g., truthy non-object, or object without boolean `up`), `auditOne` (lines 147-149) coerces it to DOWN with evidence. Here, the same scenario hits `continue` with NO fault recorded — the consumer vanishes entirely from `facts`, `faults`, and `decisionsInfluenced`. This is the exact class of two-view drift that F-405/F-706 aimed to fix but did not close for the malformed-shape path. Add a fault record before the `continue`, mirroring the `GI_LAYER_DOWN` semantics from auditOne.
  ```existing
  const rawProbe: unknown = p.up();
          const probeValid = typeof rawProbe === "object" && rawProbe !== null && typeof (rawProbe as { up?: unknown }).up === "boolean";
          if (!probeValid || (rawProbe as { up?: unknown }).up !== true) continue;
  ```
  ```suggested
  const rawProbe: unknown = p.up();
          const probeValid = typeof rawProbe === "object" && rawProbe !== null && typeof (rawProbe as { up?: unknown }).up === "boolean";
          if (!probeValid || (rawProbe as { up?: unknown }).up !== true) {
            // Mirror auditOne's GI_LAYER_DOWN semantics: malformed or DOWN substrate is a named
            // fault, not an invisible omission. Without
  ```

## src/scoping/gi-ecosystem.ts
- **src/scoping/gi-ecosystem.ts:21-29** (security)
  TOCTOU race condition: The `lstatSync` symlink check and subsequent `mkdirSync`/`mkdtempSync` are not atomic. Between the lstat check (line 26) passing and `mkdtempSync` executing (line 31), an attacker with local access can replace the directory at `GI_TMP_DIR` with a symlink pointing to a sensitive location (e.g., a directory containing secrets). `mkdtempSync`'s internal `O_EXCL` only prevents the *final component* (the minted temp dir name) from being a symlink — it does NOT protect against the *parent* (`GI_TMP_DIR`) being a symlink. If `GI_TMP_DIR` is swapped to a symlink during the race window, the temp file is created under the attacker-controlled target. Consider using a platform-specific atomic approach (e.g., `mkdtempSync` directly under `os.tmpdir()` without the intermediate shared parent, or verify the fd opened by mkdtemp with `fstat` to confirm it is not on a symlinked path).
  ```existing
  export function makeGiTmpDir(prefix = "gi-"): string {
  let pre: { isSymbolicLink(): boolean } | null = null;
  try { pre = lstatSync(GI_TMP_DIR); } catch { pre = null; }
  if (pre && pre.isSymbolicLink()) {
    throw new Error(`GI_TMP_PLANT: scratch base ${GI_TMP_DIR} is a symlink plant — refusing`);
  }
  mkdirSync(GI_TMP_DIR, { recursive: true });
  return mkdtempSync(join(GI_TMP_DIR, prefix))
  ```
