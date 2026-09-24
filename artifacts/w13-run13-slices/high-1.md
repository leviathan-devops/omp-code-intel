# HIGH slice 1 — 12 findings across 9 files

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

## src/hydra/auditor.ts
- **src/hydra/auditor.ts:1074-1074** (security)
  Double-quote escape missing in evidence field: `sanitizeReportField` does NOT escape double-quote characters (`"`). When evidence contains `"`, the report line `- evidence: "<evidence>"` produces a broken/gforgeable block. Specifically, evidence like `foo"\n## FINDING: injected —\n- predicate: x\n- file: a:1\n- evidence: y\n- spec: z` would inject a phantom `## FINDING:` block that `parseFindingsMarkdown` would accept as a real candidate. Fix: escape embedded double quotes in the evidence value before embedding it in the quoted markdown field, e.g. `v.replace(/"/g, '\"')`.
  ```existing
  `- evidence: "${sanitize(c.evidence)}"`,
  ```

## src/hydra/map-reader.ts
- **src/hydra/map-reader.ts:356-360** (bug)
  The dedup key `${e.src}→${e.dst}:${e.relation}` omits the `confidence` field. If an EXTRACTED edge exists for a triplet, any INFERRED edge with the same src/dst/relation is silently discarded. This causes data loss — the INFERRED edge carries different provenance semantics that consumers may rely on. Either include confidence in the key, or prefer the higher-confidence edge when merging duplicates.
  ```existing
  const key = `${e.src}→${e.dst}:${e.relation}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push(e);
        }
  ```
- **src/hydra/map-reader.ts:186-186** (security)
  `graphPath` is resolved via `path.resolve(graphPath)` (relative to CWD) but never validated against any allowed base directory. A crafted path such as `../../etc/shadow` or an absolute path to a sensitive file would be read in full via `fs.promises.readFile(resolved, 'utf-8')`. Add a confinement check, e.g. verify that `resolved` starts with an expected base directory, or reject absolute paths that escape a configured root.
  ```existing
  const resolved = path.resolve(graphPath);
  ```

## src/omp/adapters/semantica.ts
- **src/omp/adapters/semantica.ts:76-78** (bug)
  Bug: If `kg.json` contains the literal JSON value `null` (or the file is empty and `JSON.parse` somehow yields null), the F-825/F-944 guard correctly short-circuits at `kg !== null`, but execution then reaches `(kg.entities ?? []).filter(...)` which accesses `.entities` on `null`, throwing an unhandled `TypeError: Cannot read properties of null`. The guard should either reject non-object-top-level shapes outright, or a null/typeof check should be added before the `kg.entities` access.

Suggested fix: add a guard that throws for non-object kg values (null, array, or primitive) right after JSON.parse, since none of those are valid KG store shapes.
  ```existing
  if (kg !== null && typeof kg === "object" && !Array.isArray(kg) && kg.entities !== undefined && !Array.isArray(kg.entities)) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store has an invalid 'entities' field (expected array, got ${typeof kg.entities})`);
      }
  ```
  ```suggested
  if (kg === null || typeof kg !== "object" || Array.isArray(kg)) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store root is not a valid object (got ${kg === null ? "null" : Array.isArray(kg) ? "array" : typeof kg})`);
      }
      if (kg.entities !== undefined && !Array.isArray(kg.entities)) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store has an invalid 'entities' field (expec
  ```

## src/omp/extension.ts
- **src/omp/extension.ts:606-611** (security)
  The lstat→mkdirSync TOCTOU window at the audit root creation: `lstatSync(auditRoot)` checks for a pre-planted symlink, then `mkdirSync(auditRoot, { recursive: true })` follows it in the gap. The post-mkdir `realpathSync` + `path.relative` check catches the escape, but `mkdirSync(recursive)` has already created intermediate directories outside the root. Consider using `fs.mkdirSync` without `recursive` after ensuring the parent exists, or performing the confinement check *after* mkdir on the final component only, since the recursive flag is what creates the out-of-root side effect.
  ```existing
  if (auditPre && auditPre.isSymbolicLink()) {
        return textResult("GI_LEDGER_DENIED: audit root is a symlink plant", { ok: false, error: "GI_LEDGER_DENIED" });
      }
      try {
        fs.mkdirSync(auditRoot, { recursive: true });
      } catch (mkErr: unknown) {
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:40-42** (bug)
  **Exception-handling inconsistency (Critical):** `populateGraphifySessionStore` can throw on multiple paths — `buildSync()` (line 101), `mapGraphifyToTyped()` (line 102), or the re-wrapped `GRAPHIFY_WRITE_FAILED` error (line 133) — but `populateSessionStore` does NOT wrap the call on line 50 in a try-catch. This breaks the `PopulateResult` contract: callers of `populateSessionStore` that expect a result object will receive an unhandled exception on the graphify path. In contrast, every corbell failure path returns a proper `{ skipped: true, fallbackReason: ... }` result. The fix is to wrap the graphify call in a try-catch that returns a PopulateResult with `skipped: true` and the error reason, mirroring the corbell path's pattern.
  ```existing
  if (opts?.substrate === "graphify") {
    return populateGraphifySessionStore(storePath, root, runTag);
  }
  ```

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:213-215** (bug)
  `assertOwnSession` silently proceeds when the session is not bound to any ecosystem (only a `console.warn`). This breaks the contract name `assert*` which callers reasonably expect to guarantee provenance. Any caller that skips its own validation because `assertOwnSession` already ran will silently allow unbound sessions through the scope boundary. Either throw by default and provide a separate `warnOwnSession` variant, or rename to `checkOwnSession` to make the non-throwing behavior explicit.
  ```existing
  console.warn(
      `[${this.label} SCOPE] unbound session: ${action} with session ${sessionId} — bound to NO known ecosystem (neither ${this.ecosystem} nor any sibling); proceeding to the action's own not-found handling. A typo'd or stale session id surfaces here first.`,
    );
  ```
