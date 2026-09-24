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

## src/hydra/map-reader.ts
- **src/hydra/map-reader.ts:84-90** (bug)
  **Bug: Nesting depth scanner doesn't skip JSON string literals.** The character-by-character scan in `parseGraphJson` counts `{`, `}`, `[`, `]` inside JSON string values as real nesting changes. For example, `{"data": "value with } brace"}` would decrement depth at the `}` inside the string, causing the counter to go negative and potentially miss real deep nesting or falsely reject valid payloads.

For a defense-in-depth guard this is problematic: an adversary could encode deeply nested `{` sequences inside string values to inflate `maxDepth` and bypass the check (since the actual parse nesting stays low), while legitimate payloads with braces in string values could be falsely rejected.

A simple fix is to skip string literals during the scan:
  ```existing
  let maxDepth = 0;
  let depth = 0;
  for (let i = 0; i < contents.length; i++) {
    const c = contents.charCodeAt(i);
    if (c === 0x7B /* { */ || c === 0x5B /* [ */) { depth++; if (depth > maxDepth) maxDepth = depth; }
    else if (c === 0x7D /* } */ || c === 0x5D /* ] */) depth--;
  }
  ```
  ```suggested
  let maxDepth = 0;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < contents.length; i++) {
    const c = contents.charCodeAt(i);
    if (escaped) { escaped = false; continue; }
    if (c === 0x5C /* \ */ && inString) { escaped = true; continue; }
    if (c === 0x22 /* " */) { inString = !inString; continue; }
    if (inString) continue;
    if (c === 0x7B /* { 
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

## src/omp/calibration.ts
- **src/omp/calibration.ts:97-102** (bug)
  The Wilson interval clamping to [0, 1] creates asymmetric distortion of `halfWidth`. When `low` is clamped upward to 0, the reported `halfWidth = (high - low) / 2` doesn't equal `(high - centre)`, so it overstates the true distance from centre to the lower bound. The opposite happens when `high` is clamped to 1. Since `halfWidth` directly gates the `sufficient` flag (`halfWidth <= 0.10`), this asymmetry can cause `sufficient` to be incorrect near boundaries — the interval appears tighter on one side than it truly is, potentially passing the sufficiency gate when the interval is not actually narrow enough to support a threshold decision. This is the same class of issue noted in the focus area as 'clamping silently distorts halfWidth'.
  ```existing
  const low = Math.max(0, centre - margin);
  const high = Math.min(1, centre + margin);
  return {
    precision: p, low, high, halfWidth: (high - low) / 2,
    resolved, unresolvedRatio,
    sufficient: (high - low) / 2 <= 0.10,
  ```
  ```suggested
  const low = Math.max(0, centre - margin);
  const high = Math.min(1, centre + margin);
  // Use max distance from centre to either bound as the halfWidth,
  // because clamping breaks the symmetry that (high-low)/2 assumes.
  const halfWidth = Math.max(centre - low, high - centre);
  return {
    precision: p, low, high, halfWidth,
    resolved, unresolvedRatio,
    sufficient: halfWidth <= 0.10,
  ```

## src/omp/gate-hook.ts
- **src/omp/gate-hook.ts:218-224** (bug)
  **Bug: Query resolution silently lost for the last pending query in a session.**

The cleanup logic on lines 155–156 deletes the `states` entry BEFORE `recordGraphQuery` is called on line 167. When a session's `pendingQueries` queue becomes empty after a `splice`, line 152 deletes the entry from `pendingQueries`, and line 155 then deletes the corresponding state — so `states.get(sid)` returns `undefined`, causing an early return on line 160. The resolution is never recorded.

Consequence: the last graph-query result for any session never purchases drift coverage. If a graph-query result is the only query and arrives after (or alongside) an edit, the edit gets no drift credit from that query. This reintroduces the core problem the GATE-DEFECT FIX (2026-09-22) was meant to solve — for exactly this edge case.

**Fix:** Move the cleanup to AFTER `recordGraphQuery`. Retrieve the state reference before deleting, or restructure so recording happens before eviction:

```typescript
// After line 151 (splice)
const st = states.get(sid);
if (st) {
  const details = (typeof event.details === "object" && event.details !== null ? event.details : {}) as { ok?: unknown; error?: unknown };
  const errored = /* ... existing checks ... */;
  const hasRows = /* ... */;
  recordGraphQuery({ tool: q.tool, target: q.target, resolved: !errored && hasRows, rows: hasRows ? 1 : 0 }, st);
}
// NOW clean up
if (queue.length === 0) pendingQueries.delete(sid);
if (!pendingQueries.has(sid)) states.delete(sid);
```
  ```existing
  if (queue.length === 0) pendingQueries.delete(sid);
    // ★ F-GH-MEM FIX (2026-09-24): the per-session maps grew indefinitely in long-lived hosts; release session bookkeeping once both queues drain so stale sessions do not accumulate.
    // ★ F-GH-MEM (2026-09-24): only the maps in THIS function's scope are checked (pendingSteer
    //   lives in the tool_call handler); a session with a drained 
  ```
  ```suggested
  const st = states.get(sid);
    if (queue.length === 0) pendingQueries.delete(sid);
    if (!st) {
      // ★ F-GH-MEM FIX: release session bookkeeping once both queues drain.
      if (!pendingQueries.has(sid)) states.delete(sid);
      return undefined;
    }
    // ★ AUDIT H-7 FIXED: ...
    const details = (typeof event.details === "object" && event.details !== null ? event.details : {}) as { 
  ```

## src/omp/ripwire-bridge.ts
- **src/omp/ripwire-bridge.ts:137-138** (security)
  All public consult functions (`ripwireCallers`, `ripwireImpact`, `ripwireEditCheck`, etc.) accept `root`, `symbol`, and other string parameters and pass them directly to the ripwire binary via `spawnSync` array arguments. While `spawnSync` with an array prevents shell-level injection, unsanitized values could still exploit vulnerabilities in ripwire's own argument parsing (e.g. a `symbol` containing `--` followed by unexpected flags, or a `claim` string with embedded parens/shell metacharacters that trick ripwire's internal parser). Consider validating/sanitizing these inputs (e.g., rejecting values containing `--`, newlines, or non-identifier characters) at the bridge boundary.
  ```existing
  export function ripwireCallers(root: string, symbol: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): RipwireLeg {
  const run = runRaw(root, [`--callers=${symbol}`, "--json"], opts?.timeoutMs, opts?.env);
  ```
  ```suggested
  function sanitizeArg(value: string): string {
  if (/[\n\r\-\-]/.test(value)) throw new Error(`Invalid ripwire argument: ${value}`);
  return value;
}

export function ripwireCallers(root: string, symbol: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): RipwireLeg {
  const run = runRaw(root, [`--callers=${sanitizeArg(symbol)}`, "--json"], opts?.timeoutMs, opts?.env);
  ```
