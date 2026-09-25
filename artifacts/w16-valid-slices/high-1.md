# HIGH slice 1 — 23 findings across 9 files

## src/hunter/diagnostics/fixture-calibration.ts
- **src/hunter/diagnostics/fixture-calibration.ts:126-131** (bug)
  Missing graph dereference guard: `asFixture` only validates `graph.nodes` when `graph` is present (`if (g !== undefined)`), but `loadFireFixture`/`loadGoldenFixture` unconditionally dereference `manifest.graph.nodes`. A manifest with no `graph` key passes the guard then dies with bare `TypeError: Cannot read properties of undefined`, not `CALIBRATION_FIXTURE_INVALID`. Make `graph` required in the guard (fail when missing/null/non-object/nodes-non-array).
  ```existing
  const g = (parsed as { graph?: unknown }).graph;
      if (g !== undefined) {
        if (typeof g !== 'object' || g === null || !Array.isArray((g as { nodes?: unknown }).nodes)) {
          throw new Error(`CALIBRATION_FIXTURE_INVALID: ${label} graph.nodes must be an array`);
        }
      }
  ```
  ```suggested
  const g = (parsed as { graph?: unknown }).graph;
if (typeof g !== 'object' || g === null || !Array.isArray((g as { nodes?: unknown }).nodes)) {
  throw new Error(`CALIBRATION_FIXTURE_INVALID: ${label} graph.nodes must be an array`);
}
  ```
- **src/hunter/diagnostics/fixture-calibration.ts:177-180** (bug)
  Unvalidated `sourceFile` before `path.resolve` (fire + golden): `manifest.sourceFile` is used with no typeof/non-empty check in both `loadFireFixture` and `loadGoldenFixture`. Missing/non-string throws bare `TypeError [ERR_INVALID_ARG_TYPE]` and `""` resolves to `dir` itself (later `EISDIR`), neither surfacing as `CALIBRATION_FIXTURE_INVALID`. Validate `typeof === 'string' && length > 0` immediately after `asFixture`, before any filesystem touch, in both loaders.
  ```existing
  const manifest = asFixture<FireFixtureManifest>(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'), 'fire manifest');
  // The manifest's own SPELLING is still checked lexically (a `..` that escapes is refused
  // on the string form — the shape question, asked before any filesystem touch).
  const spelled = path.resolve(dir, manifest.sourceFile);
  ```
  ```suggested
  const manifest = asFixture<FireFixtureManifest>(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'), 'fire manifest');
if (typeof manifest.sourceFile !== 'string' || manifest.sourceFile.length === 0) {
  throw new Error(`CALIBRATION_FIXTURE_INVALID: fire fixture ${dir} carries a missing/empty sourceFile`);
}
const spelled = path.resolve(dir, manifest.sourceFile);
  ```

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:245-248** (bug)
  Existing-canonical validation gap: only `canonical_id` is checked, but `heuristicDecide`/`shareSignificantToken` immediately call `normalizeLabel(c.label)`, `normalizeLabel(c.kind)`, `tokenize()` on them. A missing/non-string `label`/`kind` escapes validation and crashes with raw `TypeError: Cannot read properties of undefined (reading 'trim')` instead of `ResolverError`. Validate `label` and `kind` as non-empty strings like `newEntities`.
  ```existing
  for (const c of existing) {
    if (!c || typeof c !== 'object') throw new ResolverError(`RESOLVER_FAILED: existing entry must be object, got ${typeof c}`);
    if (typeof c.canonical_id !== 'string' || c.canonical_id.trim().length === 0) throw new ResolverError(`RESOLVER_FAILED: existing canonical_id must be non-empty`);
  }
  ```
  ```suggested
  for (const c of existing) {
    if (!c || typeof c !== 'object') throw new ResolverError(`RESOLVER_FAILED: existing entry must be object, got ${typeof c}`);
    if (typeof c.canonical_id !== 'string' || c.canonical_id.trim().length === 0) throw new ResolverError(`RESOLVER_FAILED: existing canonical_id must be non-empty`);
    if (typeof c.label !== 'string' || c.label.trim().length === 0) throw ne
  ```
- **src/hunter/graph/resolver.ts:185-185** (bug)
  Dangling `canonicalId` persisted for `unrelated`: F-254 fallback only triggers for `same`/`related`. An `unrelated` harness record with unknown `canonical_id` keeps the arbitrary string (`canonicalId || alias`) with `existingCanonical: null` and the `else` DB branch later writes that dangling id into `resolutions`, corrupting integrity. Unrelated should canonicalize to its own alias (`newEnt.id`), or fall back to heuristic like same/related.
  ```existing
  return { alias, canonicalId: canonicalId || alias, verdict, reasoning, destructive: Boolean(rec.destructive), newEntity: newEnt, existingCanonical: existCanon };
  ```
  ```suggested
  if (!existCanon) {
    // Unrelated (or any verdict) with dangling canonical must not persist the arbitrary string.
    const h = heuristicDecide(newEnt, existing);
    if (verdict === 'unrelated') return { alias, canonicalId: newEnt.id, verdict, reasoning, destructive: Boolean(rec.destructive), newEntity: newEnt, existingCanonical: null };
  }
  return { alias, canonicalId: canonicalId || alias, 
  ```
- **src/hunter/graph/resolver.ts:321-325** (bug)
  `db.exec('BEGIN')` is outside the `try/ROLLBACK` scope, so a BEGIN failure (locked DB, nested transaction, I/O error) escapes as a raw driver error instead of `ResolverError`. Move BEGIN inside the try (or wrap it) so all transaction-lifecycle failures share the rollback/error contract.
  ```existing
  if (db) {
    // ★ F-4 FIX (2026-09-24): atomic resolutions commit — one BEGIN/COMMIT
    // around the loop; a mid-loop failure rolls back instead of half-writing.
    db.exec('BEGIN');
    try {
  ```
  ```suggested
  if (db) {
    try {
      db.exec('BEGIN');
  ```

## src/hunter/graph/store-map.ts
- **src/hunter/graph/store-map.ts:192-194** (bug)
  Empty input wipes the store: the global `UPDATE ... WHERE superseded_run IS NULL` runs unconditionally before inserts, so `nodes=[]/edges=[]` tombstones every live row with no replacements. `GraphEmptyError` in `interface.ts` shows empty builds are meant to fail loud. Guard: return early / throw on `nodeRows.length===0` or skip supersede when there is nothing to insert.
  ```existing
  db.exec("BEGIN IMMEDIATE;");
    try {
      db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
  ```
  ```suggested
  if (nodeRows.length === 0 && edgeRows.length === 0) throw new Error("CORBELL_STORE_WRITE: refusing to supersede store with empty input");
    db.exec("BEGIN IMMEDIATE;");
    try {
      db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
  ```
- **src/hunter/graph/store-map.ts:118-120** (performance)
  Blocking arbitrary file reads with unbounded whole-file cache: `edgeEvidence` does `readFileSync(file)` on node-controlled `file` for every distinct file in the hot `edges.map` loop, caches the full split lines with only a 500-entry count cap (no byte-size cap, no mtime/TTL so stale lines in long-lived processes). This blocks the event loop, can OOM on large files, and reads any absolute path the adapter supplies. Cap file size/lines, use async/batched reads or pre-index only needed lines, normalize + restrict to workspace root, and invalidate on mtime.
  ```existing
  let lines = edgeEvidenceLineCache.get(file);
      if (!lines) {
        lines = fs.readFileSync(file, "utf8").split("\n");
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:109-109** (bug)
  targetPath is accepted and stored in context but never forwarded to any invoke input (recon/map/scan/trace/strike/report). recon derives root from profile.project.root instead, so a caller passing targetPath != profile root gets silently ignored — wrong directory scanned with no error. Validate targetPath against profile.project.root (fail-closed) or thread it into map/scan inputs.
  ```existing
  const { targetPath, profilePath } = options;
  ```
  ```suggested
  const { targetPath, profilePath } = options;
  // Fail-closed: targetPath must match the profile root or be forwarded explicitly.
  // e.g. assert options.profile?.project.root === targetPath when profileOverride is set.
  ```
- **src/hunter/harness/micro-loop-machine.ts:417-417** (bug)
  DbClient lifetime is owned only by stop(): awaiting done() without stop() leaks the SQLite WAL handle (SharedDb holds open fd + -wal/-shm). Conversely context.db stays exposed after stop() closes it, so the documented post-done() read (context.db.prepare(...).all()) throws use-after-close. Either document stop()-is-mandatory + invalidate context.db (null it after close), or transfer ownership to a finally that callers cannot forget.
  ```existing
  try { snapshot.db?.close(); } catch (e) { console.error('[micro-loop] db close failed:', e instanceof Error ? e.message : String(e)); }
  ```
  ```suggested
  try { snapshot.db?.close(); } catch (e) { console.error('[micro-loop] db close failed:', e instanceof Error ? e.message : String(e)); }
      // Consider: snapshot = { ...snapshot, db: null }; + document that context.db is only valid between scan and stop().
  ```
- **src/hunter/harness/micro-loop-machine.ts:289-289** (bug)
  Stub-profile recon path re-implements runId sequencing instead of reusing recon.ts openAndNextRunId, and is weaker: unbounded SELECT without day-prefix filter, silent `catch {}` on corrupt payloads (no F-1201 salvage), and openStore(dbPath) as a side effect creates <project>/.trident/shared.db on disk even in unit tests. A corrupt high-seq row is skipped so seq regresses -> duplicate runId on next hunt. Extract/share the helper and avoid disk creation in the stub seam.
  ```existing
  const store = openStore(dbPath);
  ```
  ```suggested
  // Reuse recon's openAndNextRunId(token, dbPath) instead of duplicating the scan;
          // stub seam should not openStore/create files — derive runId in-memory or inject it.
  ```
- **src/hunter/harness/micro-loop-machine.ts:441-443** (bug)
  done() subscribes twice where the first already covers both finals: XState actor snapshot status==='done' fires when the machine hits ANY final (done or inconclusive), so sub2 settles inconclusive too and sub3 (value==='inconclusive' check) is redundant. Combined with cached pendingDone that is never reset and pendingSettle/stop() interplay, concurrent done()+stop() ordering is fragile (stop() resolves without unsubscribing first in all paths). Keep a single subscription on status==='done' (or s.value) and reset/clear pendingDone+pendingSettle deterministically.
  ```existing
  const sub2 = actor.subscribe((s): void => {
          if (s.status === 'done') { settle(); }
        });
  ```
  ```suggested
  // Single terminal subscription: actor status 'done' already covers done+inconclusive finals.
        // const sub = actor.subscribe((s): void => { if (s.status === 'done') settle(); });
  ```

## src/hunter/harness/strike.ts
- **src/hunter/harness/strike.ts:50-54** (bug)
  relevanceOf does not sanitize t.relevance while the merge above does: non-numeric values, NaN/Infinity, or missing relevance break the tie-break. `Object.values(...).reduce((s,v)=>s+v)` with a string value coerces to string concatenation (return type lies), NaN poisons the total so `rb - ra` is NaN (comparator returns NaN, treated as 0), and `Object.values(undefined/null)` throws TypeError instead of scoring 0. Apply the same `typeof v === 'number' && Number.isFinite(v)` guard used in the merge (and guard `t.relevance == null`).
  ```existing
  const relevanceOf = (f: NormalizedFinding): number => {
    const t = traceByFinding.get(findingIdOf(f));
    if (!t) return 0;
    return Object.values(t.relevance).reduce((s, v) => s + v, 0);
  };
  ```
  ```suggested
  const relevanceOf = (f: NormalizedFinding): number => {
    const t = traceByFinding.get(findingIdOf(f));
    if (!t || t.relevance == null) return 0;
    return Object.values(t.relevance).reduce((s, v) => s + (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0), 0);
  };
  ```

## src/hunter/lexicon/templates.ts
- **src/hunter/lexicon/templates.ts:220-226** (bug)
  Silent `operator` fallback to `'gt'` is inconsistent with `bindSeverity` (loud `TEMPLATE_BINDING_INVALID`) and risks inverted threshold verdicts on loader-bypassing bindings. `compileTemplate` zod-validates, but `template.check()` can be invoked directly with raw `bindings` — an invalid/typo operator (`'gte '` / `'GT'`) silently becomes `gt`. Throw the named error instead.
  ```existing
  function bindOperator(bindings: Record<string, unknown>): 'lt' | 'lte' | 'gt' | 'gte' {
  const v = bindings['operator'];
  if (typeof v === 'string' && (v === 'lt' || v === 'lte' || v === 'gt' || v === 'gte')) {
    return v;
  }
  return 'gt';
}
  ```
  ```suggested
  function bindOperator(bindings: Record<string, unknown>): 'lt' | 'lte' | 'gt' | 'gte' {
  const v = bindings['operator'];
  if (typeof v === 'string' && (v === 'lt' || v === 'lte' || v === 'gt' || v === 'gte')) {
    return v;
  }
  throw templateBindingInvalid('domain.numeric-threshold', `the operator binding must be one of lt|lte|gt|gte, got ${JSON.stringify(v)}`);
}
  ```
- **src/hunter/lexicon/templates.ts:715-715** (bug)
  Stateful `RegExp.test` with a global (`g`/`y`) flag advances `lastIndex`, so `rx.test(n.name)` alternates true/false across nodes. A caller-supplied `defMatchers: [/foo/g]` nondeterministically admits candidates, violating the K20.3 determinism law stated at the top of this file. Reset `lastIndex` before each test (or clone without `g`/`y`).
  ```existing
  if (!spec.defMatchers.some((rx) => rx.test(n.name))) continue;
  ```
  ```suggested
  if (!spec.defMatchers.some((rx) => { rx.lastIndex = 0; const hit = rx.test(n.name); rx.lastIndex = 0; return hit; })) continue;
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:551-555** (bug)
  Mirror handle leaks when applyPragmas throws: `mirror = new Database(mirrorPath)` succeeds but `applyPragmas(mirror)` throws, the catch throws mirrorWriteFailed without closing the just-opened handle (WAL file + -shm/-wal descriptors leak). Close the handle in the open-failure path or open with try/finally.
  ```existing
  let mirror: Database;
    try {
      fs.mkdirSync(mirrorDir, { recursive: true });
      mirror = new Database(mirrorPath);
      applyPragmas(mirror);
  ```
  ```suggested
  let mirror: Database | undefined;
    try {
      fs.mkdirSync(mirrorDir, { recursive: true });
      mirror = new Database(mirrorPath);
      applyPragmas(mirror);
    } catch (e: unknown) {
      try { mirror?.close(); } catch { /* best-effort */ }
      throw mirrorWriteFailed(mirrorPath, `mirror open failed: ${String(e)}`);
    }
  ```
- **src/hunter/shared/db.ts:498-498** (bug)
  Evidence column mutated with '| TRIAD <json>' suffix breaks round-trip fidelity, LIKE/search on evidence, and downstream parsing (triad JSON itself may contain '|' and is not escaped; JSON.stringify can also throw raw on circular triad). Store triad in its own column/payload or keep evidence verbatim and expose triad separately.
  ```existing
  const persistedEvidence = (finding as FindingInput & { triad?: unknown }).triad ? `${finding.evidence} | TRIAD ${JSON.stringify((finding as FindingInput & { triad?: unknown }).triad)}` : finding.evidence;
  ```
  ```suggested
  const triad = (finding as FindingInput & { triad?: unknown }).triad;
    const persistedEvidence = finding.evidence;
    // TODO: persist triad in a dedicated column instead of string-concat onto evidence.
  ```
- **src/hunter/shared/db.ts:787-787** (bug)
  Silent JSON fallback hides corruption: node_json/data parse failures are debug-logged and replaced with {} or skipped rows, so corrupt graph data propagates as valid nodes. Fail-closed contract requires a named throw (or at minimum a corruption counter) rather than success-shaped empty objects.
  ```existing
  } catch (pe) { console.debug('[kg-store] family node_json parse failed — skipped:', pe instanceof Error ? pe.message : String(pe)); }
  ```
  ```suggested
  } catch (pe) { throw new Error(`FAMILY_NODE_CORRUPT: id=${r['id']} cause=${pe instanceof Error ? pe.message : String(pe)}`); }
  ```
- **src/hunter/shared/db.ts:477-482** (bug)
  FK violations surface as raw sqlite throws: writeGraph/writeBranchView validate lineage but never check edge endpoint existence. With foreign_keys=ON a dangling source_id/target_id throws raw SQLITE_CONSTRAINT_FOREIGNKEY instead of the file's named fail-closed error, and the transaction rollback reason is undiagnosable.
  ```existing
  const edgeStmt = this.handle.prepare(
        'INSERT INTO graph_edges (source_id,target_id,kind,lineage) VALUES (?,?,?,?)',
      );
      for (const e of edges) {
        edgeStmt.run(e.sourceId, e.targetId, e.kind, e.lineage);
      }
  ```
  ```suggested
  const nodeIds = new Set(nodes.map(n => n.id));
      for (const e of edges) {
        if (!nodeIds.has(e.sourceId) || !nodeIds.has(e.targetId)) throw lineageMissing(`edge ${e.sourceId} -> ${e.targetId}`);
      }
      const edgeStmt = this.handle.prepare(
        'INSERT INTO graph_edges (source_id,target_id,kind,lineage) VALUES (?,?,?,?)',
      );
      for (const e of edges) {
        edgeStmt
  ```
- **src/hunter/shared/db.ts:680-680** (maintainability)
  Swallowed DDL hides wrong-shape views: CREATE VIEW failure is debug-logged and execution continues, so a view with missing columns (the F-432 class) leaves a stale/missing view while the caller trusts success. Only ignore 'already exists' errors; re-throw anything else as a named BRANCH_VIEW_REBUILD_FAILED.
  ```existing
  try { this.branchDb.exec("CREATE VIEW IF NOT EXISTS branch_union_view AS SELECT id, json_extract(node_json,'$.kind') as kind, json_extract(node_json,'$.name') as name, json_extract(node_json,'$.file') as file, json_extract(node_json,'$.line') as line, json_extract(node_json,'$.lineage') as lineage, json_extract(node_json,'$.source') as source, json_extract(node_json,'$.data') as data, 'family' as 
  ```
- **src/hunter/shared/db.ts:846-847** (maintainability)
  Swallowed metadata writes hide lost operator-gate state: requestPromotion Map.set succeeds in memory but both family_metadata INSERTs are debug-only guards. On a sealed/readonly DB the promotion lives only in memory and is lost on restart while the call still threw PROMOTION_PENDING as if recorded. Propagate metadata failures loud.
  ```existing
  try { this.familyDb.prepare("INSERT OR REPLACE INTO family_metadata (key, value) VALUES (?,?)").run(`promotion_pending:${hash}`, detail); } catch (idemErr) { /* idempotent guard */ console.debug("[kg-store] idempotent guard #6:", idemErr instanceof Error ? idemErr.message : String(idemErr)); }
    try { this.familyDb.prepare("INSERT OR REPLACE INTO family_metadata (key, value) VALUES ('promotion_s
  ```

## src/hunter/shared/query-engine.ts
- **src/hunter/shared/query-engine.ts:275-277** (bug)
  Community fail-loud errors are double-wrapped. `COMMUNITY_TOO_LARGE` / `COMMUNITY_UNMEASURABLE` thrown inside the try are caught by the unconditional `COMMUNITY_QUERY_FAILED` wrapper, producing e.g. `COMMUNITY_QUERY_FAILED: COMMUNITY_TOO_LARGE: ...`. This obscures the guard and breaks callers matching on prefix. Preserve the prefix like `path()`/`temporal()` do: `if (e instanceof Error && e.message.startsWith('COMMUNITY_')) throw e;`.
  ```existing
  return components.sort((a, b) => a.componentId - b.componentId);
    } catch (e: unknown) {
      throw new Error(`COMMUNITY_QUERY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
  ```
- **src/hunter/shared/query-engine.ts:16-25** (bug)
  Mapper output lies about nullability: `TypedEdgeRow` declares `evidence_quote: string; confidence: number; created_run: string` (non-null) but the mapper emits `null`/`1`/`''` defaults and silences it with `as TypedEdgeRow`. Callers trusting `string` will hit `null` at runtime. Fix the interface to `evidence_quote: string | null` (and audit `confidence`/`created_run` defaults) or enforce non-null and throw ROW_SHAPE instead of defaulting.
  ```existing
  export interface TypedEdgeRow {
  id: number;
  src_canonical: string;
  dst_canonical: string;
  predicate: string;
  evidence_quote: string;
  confidence: number;
  created_run: string;
  superseded_run: string | null;
}
  ```

## src/hunter/testing/inconclusive.ts
- **src/hunter/testing/inconclusive.ts:5-7** (bug)
  Fragile Error-message control flow: markInconclusive() throws an Error, but isInconclusiveResult() only accepts string. `catch(e){ isInconclusiveResult(e) }` will always be false, and any wrapping/re-throwing (e.g. `new Error('wrap: '+e.message)`, framework prefixing, JSON serialization of Error dropping message) silently loses the signal. Control flow should not depend on substring match of Error.message.
  ```existing
  export function isInconclusiveResult(v: unknown): boolean {
  return typeof v === 'string' && v.includes(inconclusiveMarker);
}
  ```
  ```suggested
  export class InconclusiveError extends Error {
  readonly testName: string;
  readonly reason: string;
  readonly evidenceLine: string;
  constructor(testName: string, reason: string, evidenceLine: string) {
    super(`${inconclusiveMarker}${reason}):: ${testName} — ${evidenceLine}`);
    this.name = 'InconclusiveError';
    this.testName = testName;
    this.reason = reason;
    this.evidenceLine
  ```
