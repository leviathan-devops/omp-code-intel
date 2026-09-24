# HIGH slice 4 — 10 findings across 8 files

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:997-998** (bug)
  The `update()` method mutates the adapter's internal state (`cachedNodes`, `cachedEdges`) but does NOT set `this.built = true`. If `update()` is called before `build()`, the adapter will have nodes/edges but `ensureBuilt()` in query methods will throw because `this.built` remains `false`. Either `update()` should set `this.built = true`, or the `ensureBuilt()` check should also verify that cached data exists.
  ```existing
  update(nodes: GraphNode[], edges: GraphEdge[]): void {
    const byId = new Map(this.cachedNodes.map((n) => [n.id, n] as const));
  ```
  ```suggested
  update(nodes: GraphNode[], edges: GraphEdge[]): void {
    this.built = true;
    const byId = new Map(this.cachedNodes.map((n) => [n.id, n] as const));
  ```

## src/hunter/harness/report.ts
- **src/hunter/harness/report.ts:265-269** (bug)
  Non-fatal thinking-strip error after `writeFileSync` has already replaced the file on disk. On line 211, `fs.writeFileSync(reportPath, stripped, 'utf-8')` succeeds and the file now holds the stripped content. If the subsequent `readFileSync` (line 212) fails for any I/O reason (permission, disk error), the catch block treats it as non-fatal (doesn't start with `REPORT_STRIP_FAILED`), logs a warning, and execution continues. The `HUNT_DONE` event is then recorded pointing at a report file whose integrity was never verified — and the original unstripped file is permanently lost because `writeFileSync` already replaced it. The read-back integrity gate only protects against a read failure, not against a silent write corruption (e.g., partial write on a full disk). Consider: (a) write to a temp file first, then `fs.renameSync(tempPath, reportPath)` which is atomic on POSIX; or (b) at minimum, do NOT treat read-back failures as non-fatal since the original file is already gone.
  ```existing
  fs.writeFileSync(writerResult.reportPath, stripped, 'utf-8');
        const sealed = fs.readFileSync(writerResult.reportPath, 'utf-8');
        if (sealed !== stripped) {
          throw new Error(`REPORT_STRIP_FAILED: read-back mismatch on ${writerResult.reportPath} (wrote ${stripped.length} chars, read ${sealed.length}) — refusing to record HUNT_DONE on an unverified artifact`);
        }
  ```
  ```suggested
  // Write to a temp file then atomic-rename — the original file is untouched until the
        // rename succeeds, so a read-back failure never leaves a corrupted artifact on disk.
        const tmpPath = `${writerResult.reportPath}.tmp.${process.pid}`;
        fs.writeFileSync(tmpPath, stripped, 'utf-8');
        const sealed = fs.readFileSync(tmpPath, 'utf-8');
        if (sealed !== stripped) {

  ```
- **src/hunter/harness/report.ts:311-324** (bug)
  The `graph_facts` inserts run outside the atomic transaction and catch all errors silently. If a UNIQUE constraint violation or CHECK constraint fails on the Nth finding, the first N-1 facts are already committed to the database with no rollback mechanism. The cross-run memory is left in an inconsistent state: the caller never learns which facts were lost or that a partial insert occurred. At minimum, wrap the loop in its own BEGIN/COMMIT transaction so a constraint failure rolls back all graph_facts inserts for this run atomically, or at least log the specific finding IDs that were committed vs. skipped.
  ```existing
  try {
      const insertFact = input.db.prepare(
        'INSERT INTO graph_facts (subject, predicate, object, evidence, confidence, created_at) VALUES (?,?,?,?,?,?)',
      );
      for (const f of input.findings) {
        if (f.verdict === 'VIOLATION') {
          insertFact.run(f.file, 'has_finding', f.ruleId, String(f.evidence).slice(0, 500), 0.8, Date.now());
        }
      }
    } catch (m
  ```
  ```suggested
  try {
      input.db.exec('BEGIN');
      try {
        const insertFact = input.db.prepare(
          'INSERT INTO graph_facts (subject, predicate, object, evidence, confidence, created_at) VALUES (?,?,?,?,?,?)',
        );
        for (const f of input.findings) {
          if (f.verdict === 'VIOLATION') {
            insertFact.run(f.file, 'has_finding', f.ruleId, String(f.evidence).slice(0, 50
  ```

## src/hunter/hooks/bus-hook.ts
- **src/hunter/hooks/bus-hook.ts:0-0** (bug)
  retryFailed re-invokes ALL subscribers for every failed event, meaning subscribers that already succeeded in the original poll() receive the event a second time. This violates the at-most-once delivery semantics claimed in the code comments. For example, if subscribers [A, B, C] were called in poll() and B threw, A and C already processed the event. On retry, A and C are called again with the same event, producing duplicate dispatches. Fix: record which subscriber index failed (not just the event), and on retry only re-invoke from that index onward.
  ```existing
  retryFailed(): number {
    const pending = this.failedEvents.splice(0, this.failedEvents.length);
    for (const f of pending) {
      let lastError: unknown = null;
      for (const fn of this.subscribers) {
        try {
          fn(eventKind(f.row.kind), f.payload);
        } catch (e: unknown) {
          console.error(`[hydra-bus] retry for ${f.row.kind} (attempt ${f.attempt + 1}) subscribe
  ```

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:78-84** (performance)
  Performance: Graph is loaded from disk N+1 times. The pipeline loads the graph via `readGraphJson(graphPath)` at line 91 and passes it as the `graph` parameter to each `spec.run(input, graph)`. However, `specForTemplate` ignores the pre-loaded graph (`_graph` parameter) and passes the `graphPath` string to `runTemplateAudit`, which calls `readGraphJson(graphPath)` again internally (auditor.ts:990). `readGraphJson` has no caching — it performs a full stat, read, parse, and normalize on every call. For a pipeline with N subagents, this means N+1 full graph loads from disk. The fix is to either pass the already-loaded `GraphifyGraph` directly into `runTemplateAudit` (adding a `graph?: GraphifyGraph` field to `RunTemplateAuditArgs`), or have `specForTemplate`'s `run` closure capture and use the `_graph` parameter instead of re-loading.
  ```existing
  run: async (input, _graph) =>
      runTemplateAudit({
        template,
        ledgerDir: `${ledgerRoot}/${template.layerId}`,
        targetRoot: input.targetRoot,
        graphPath: input.graphPath,
      }),
  ```
  ```suggested
  run: async (input, graph) =>
      runTemplateAudit({
        template,
        ledgerDir: `${ledgerRoot}/${template.layerId}`,
        targetRoot: input.targetRoot,
        graphPath: input.graphPath,
        graph, // pass pre-loaded graph to avoid redundant disk I/O
      }),
  ```

## src/kernel/graph-pre-flight.ts
- **src/kernel/graph-pre-flight.ts:65-65** (performance)
  Double DB connection: `getTestTargets` (line 71) opens a second `openTypedStore` handle to the same `storePath` while the outer `db` is still open. Both handles are simultaneously live, which can cause SQLite WAL contention or `SQLITE_BUSY` errors depending on the driver's locking mode. Consider passing `db` into `getTestTargets` (or a wrapper variant) instead of having it open its own connection.
  ```existing
  const testTargets = getTestTargets(storePath, target, 5);
  ```
  ```suggested
  // Prefer passing the existing db handle to avoid double-open contention.
    // This requires getTestTargets to accept a db parameter:
    const testTargets = getTestTargets(db, target, 5);
  ```
- **src/kernel/graph-pre-flight.ts:47-54** (bug)
  Unchunked IN-clause: `srcIds` are gathered from a query on `typed_nodes` where `label = target`, and then all of them are stuffed into a single `IN (?)` clause via spread. Unlike `getTestTargets` (which chunks at 200), this code has no chunking. A label with >999 live canonical_ids will exceed SQLite's default `SQLITE_MAX_VARIABLE_NUMBER` and throw a runtime error. Add chunking consistent with the pattern already used in `graph-test-target.ts`.
  ```existing
  if (srcIds.length > 0) {
      const ph = Array.from({ length: srcIds.length }, () => "?").join(", ");
      const rows = db.query(
        `SELECT COUNT(*) AS n FROM typed_edges e
         WHERE e.src_canonical IN (${ph}) AND e.predicate IN ('calls', 'traces-to', 'imports') AND e.superseded_run IS NULL`,
      ).all(...srcIds) as Array<{ n: number }>;
      uses = Number(rows[0]?.n ?? 0);
    }
  ```
  ```suggested
  if (srcIds.length > 0) {
      const CHUNK = 200;
      let totalUses = 0;
      for (let i = 0; i < srcIds.length; i += CHUNK) {
        const chunk = srcIds.slice(i, i + CHUNK);
        const ph = Array.from({ length: chunk.length }, () => "?").join(", ");
        const rows = db.query(
          `SELECT COUNT(*) AS n FROM typed_edges e
           WHERE e.src_canonical IN (${ph}) AND e.predicate
  ```

## src/omp/decision.ts
- **src/omp/decision.ts:211-212** (bug)
  Missing runtime validation for `intent` — the same defect pattern that was fixed for every other public parameter (`scopeRoot`, `target`, `act.toolName`, `act.target`, `act.queriedBefore`). `intent` is typed as a string union (`"consume" | "declare" | "mutate" | "measure"`) but TypeScript types are erased at runtime; an invalid value (e.g., `undefined`, `"delete"`) propagates silently into `graphFacts`, which may produce unexpected verdicts or SQL errors. Add a typeof+allowlist guard consistent with the sibling entry point's discipline.
  ```existing
  const storePath = corbellCheckoutPath(scopeRoot);
  const verdicts = graphFacts({ storePath, target, intent });
  ```
  ```suggested
  const validIntents = ["consume", "declare", "mutate", "measure"] as const;
  if (typeof intent !== "string" || !validIntents.includes(intent as typeof validIntents[number])) {
    throw new Error(`GI_DECIDE_BAD_INPUT: intent must be one of ${validIntents.join(", ")}; got ${JSON.stringify(intent)}`);
  }
  const storePath = corbellCheckoutPath(scopeRoot);
  const verdicts = graphFacts({ storePath, 
  ```

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:219-221** (bug)
  `computeDrift` mutates `state.gateState` as a side-effect, but `gateDecision` also sets `gateState`. Both functions independently overwrite the same field, creating conflicting state transitions. Specifically, when `d.drift === 0`, `computeDrift` sets `gateState = "IDLE"`, but if prior edits exist (even if fully verified), `gateDecision` immediately overwrites it to `"TRACKING"` (because `d.drift > 0` is checked separately). The real danger: if `computeDrift` is called independently or out of order (e.g. for reporting/dashboarding), it silently resets `gateState` to IDLE/TRACKING regardless of the actual gate tier that was enforced. `computeDrift` should NOT set `gateState` — that is `gateDecision`'s exclusive responsibility. Remove the two assignments from `computeDrift`.
  ```existing
  state.drift = drift;
  return { drift, unverifiedCount, verifiedSymbols, lastGraphQuery };
}
  ```
  ```suggested
  state.drift = drift;
  return { drift, unverifiedCount, verifiedSymbols, lastGraphQuery };
}

// NOTE: state.gateState is set exclusively by gateDecision(). computeDrift
// only computes the numeric drift value — it must not modify gateState.
  ```

## src/scoping/gi-session-path.ts
- **src/scoping/gi-session-path.ts:150-152** (security)
  `forbiddenSharedProjectStore` returns a raw joined path without validating that `scopeRoot` is absolute. Any caller using this returned path for security decisions (e.g., 'is this store forbidden?') would get a relative path when given a relative `scopeRoot`, which is silently wrong. The sibling functions `sessionStorePath` and `assertSessionStorePath` both enforce `path.isAbsolute(scopeRoot)` — this function should do the same for consistency and safety.
  ```existing
  export function forbiddenSharedProjectStore(scopeRoot: string): string {
  return path.join(scopeRoot, GI_STATE_DIR, "store.sqlite");
}
  ```
  ```suggested
  export function forbiddenSharedProjectStore(scopeRoot: string): string {
  if (!path.isAbsolute(scopeRoot)) {
    throw new GiPathError("GI_PATH_DENIED", `GI_PATH_DENIED: scopeRoot must be absolute, got ${scopeRoot}`);
  }
  return path.join(scopeRoot, GI_STATE_DIR, "store.sqlite");
}
  ```
