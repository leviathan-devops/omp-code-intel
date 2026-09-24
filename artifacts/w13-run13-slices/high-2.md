# HIGH slice 2 — 12 findings across 9 files

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:194-201** (bug)
  Bug: The early-return guard `decisions.length === newEntities.length` does not guarantee all entities are uniquely covered. If the harness produces two decisions that both resolve to the same entity (e.g., two records whose aliases both match the same `newEntity.id`), the decisions array length equals `newEntities.length` even though some entity has no decision. The `resolvedEntityIds` set on line 201 was specifically built to track per-entity coverage (per the F-932 comment), but the early return on line 194 bypasses it entirely, re-introducing the silent-drop bug the fix was meant to prevent.

Fix: replace the length check with a set-size check, or move the early return after building the set.
  ```existing
  if (decisions.length === newEntities.length) return decisions;
  if (decisions.length === 0) return null;
  // ★ F-932 FIX (2026-09-24): the resolved set carried the harness-provided alias STRINGS
  //   matched against BOTH id and label — an alias equal to A's id that also equaled B's label
  //   skipped B from heuristic fallback entirely (SILENT drop: B missing from the final
  //   decisions a
  ```
  ```suggested
  const resolvedEntityIds = new Set(decisions.map((d) => d.newEntity.id));
  if (resolvedEntityIds.size === newEntities.length) return decisions;
  if (resolvedEntityIds.size === 0) return null;
  ```

## src/hunter/harness/trace.ts
- **src/hunter/harness/trace.ts:68-68** (bug)
  `deriveRootCause` calls `f.evidence.split(...)` without a null/undefined guard. If a `NormalizedFinding` arrives with `evidence` as `undefined`, `null`, or a non-string, this will throw a runtime TypeError (`Cannot read properties of undefined (reading 'split')`). Given that this function is called unconditionally inside the solver loop, one malformed finding will crash the entire batch. Recommend adding a defensive guard or defaulting to an empty string.
  ```existing
  const first = f.evidence.split(/\n|\.\s/)[0]?.trim() ?? f.evidence;
  ```
  ```suggested
  const evidenceText = typeof f.evidence === 'string' ? f.evidence : '';
  const first = evidenceText.split(/\n|\.\s/)[0]?.trim() ?? evidenceText;
  ```

## src/hunter/shared/containment.ts
- **src/hunter/shared/containment.ts:111-115** (bug)
  **`checkContained` can throw despite its `"NEVER throws"` contract.**

The contract says: "NEVER throws; the caller owns the error vocabulary." However, two paths through this function can throw:

1. **Target resolution**: `const real = realNearest(target)` (line 86) is not wrapped in try/catch. If `target` has an EACCES (permission denied) or ELOOP (symlink loop) error, `realNearest` re-throws it per the F-604 fix, and that exception propagates uncaught out of `checkContained`.

2. **Root fallback**: If `realpathSync(root)` fails (caught by the try/catch), `realNearest(root)` is called in the catch block. If root's error is also EACCES/ELOOP rather than ENOENT/ENOTDIR, `realNearest` re-throws, and this second throw propagates out of the catch block — also uncaught.

Both violate the documented contract. Callers relying on `checkContained` to always return a result (and then naming the violation via `onViolation`) will instead crash with an unhandled exception.

Suggested fix: wrap `realNearest(target)` in the same try/catch pattern and propagate the error via the return value (e.g., set `contained = false` and populate an error field), or clarify the contract to state that I/O errors (EACCES/ELOOP) propagate while containment violations do not.
  ```existing
  let rootReal: string;
  let rootResolved: boolean;
  try { rootReal = fs.realpathSync(root); rootResolved = true; }
  catch { rootReal = realNearest(root); rootResolved = false; }
  const real = realNearest(target);
  ```
- **src/hunter/shared/containment.ts:137-139** (bug)
  **`requireContained` silently returns the uncontained path if `onViolation` returns normally.**

`onViolation` is typed as returning `never`, but TypeScript's `never` is a compile-time-only constraint. If a caller provides a handler that returns normally (e.g., a logging handler that doesn't throw), execution falls through to `return real` — returning the path that was just determined to be OUTSIDE the root. The guard is silently bypassed.

This is a defense-in-depth concern: a single caller mistake (forgetting to throw in the callback) defeats the entire containment check.

Suggested fix: add a runtime guard after the callback:

```typescript
if (!contained) {
  onViolation({ real, rootReal, target, root });
  // Defense-in-depth: onViolation is typed as `never` (must throw), but
  // TypeScript cannot enforce this at runtime. If it returns normally,
  // we must not propagate the uncontained path.
  throw new Error('CONTAINMENT_BUG: onViolation returned normally');
}
```
  ```existing
  const { real, rootReal, contained } = checkContained(target, root);
  if (!contained) onViolation({ real, rootReal, target, root });
  return real;
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:879-881** (maintainability)
  `openFamilyReadOnly` sets the private `sealed` field via an unsafe double cast through `Record<string, unknown>`. This bypasses TypeScript's access modifiers entirely — if the field is ever renamed, refactored, or removed, this code will silently set a property on a plain object with zero compile-time or runtime error, leaving the store writable against a physically read-only file. A proper solution is to expose a `sealed` setter on `FamilyGraphStore`, or pass `sealed` as a constructor option.
  ```existing
  const store = new FamilyGraphStore(familyPath, handle, ':memory:', branchHandle);
  (store as unknown as Record<string, unknown>)['sealed'] = true;
  return store;
  ```
  ```suggested
  const store = new FamilyGraphStore(familyPath, handle, ':memory:', branchHandle);
  store.markSealed(); // add a public method: markSealed() { this.sealed = true; }
  return store;
  ```
- **src/hunter/shared/db.ts:734-738** (bug)
  The `branch_union_view` and `branch_union_attached` view rebuilds, as well as the ATTACH DATABASE statement, all execute OUTSIDE the transaction that commits the graph data. If the transaction succeeds but any of these DDL steps fails, the graph data is committed while the views remain stale or missing. The catches only `console.debug` without throwing, so callers receive incorrect union results with no indication of failure. These DDL steps should either be inside the transaction or should propagate errors to the caller.
  ```existing
  tx();
    try {
      this.branchDb.exec("DROP VIEW IF EXISTS branch_union_view");
      this.branchDb.exec("CREATE VIEW branch_union_view AS SELECT id, json_extract(node_json,'$.kind') as kind, json_extract(node_json,'$.name') as name, json_extract(node_json,'$.file') as file, json_extract(node_json,'$.line') as line, json_extract(node_json,'$.lineage') as lineage, json_extract(node_json,'$.sourc
  ```
  ```suggested
  const rebuild = this.branchDb.transaction((): void => {
      this.branchDb.prepare('DELETE FROM graph_edges').run();
      this.branchDb.prepare('DELETE FROM graph_nodes').run();
      // ... node + edge inserts ...
      this.branchDb.exec("DROP VIEW IF EXISTS branch_union_view");
      this.branchDb.exec("CREATE VIEW branch_union_view AS ...");
    });
    rebuild();
    try {
      this.branch
  ```
- **src/hunter/shared/db.ts:454-465** (bug)
  Despite the comments claiming the hunt-lock prevents interleaving, `writeGraph` provides no in-process concurrency guard. If two callers share the same `DbClient` instance and call `writeGraph` concurrently (e.g., from different async tasks), the SQLite transaction serialization alone does not prevent interleaved DELETE-INSERT cycles — one transaction could DELETE the graph after another has committed fresh nodes but before it commits its edges, leaving dangling FK references. An advisory mutex (e.g., a `Mutex` or `Semaphore` wrapping the transaction) would make the concurrency contract enforced at this layer rather than relying on an external lock whose existence is only asserted in comments.
  ```existing
  writeGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
    for (const n of nodes) {
      if (!isNodeLineage(n.lineage)) {
        throw lineageMissing(n.id);
      }
    }
    for (const e of edges) {
      if (!isNodeLineage(e.lineage)) {
        throw lineageMissing(`edge ${e.sourceId} -> ${e.targetId}`);
      }
    }
    const tx = this.handle.transaction((): void => {
  ```
  ```suggested
  private writeMutex = Promise.resolve();

  writeGraph(nodes: GraphNode[], edges: GraphEdge[]): void {
    // ... validation ...
    const tx = this.handle.transaction((): void => { /* ... */ });
    // Serialize via a promise chain so concurrent callers don't interleave
    this.writeMutex = this.writeMutex.then(() => { tx(); });
    // For synchronous callers, still run inline:
    tx();
  }
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
