# HIGH slice 4 — 11 findings across 9 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:260-267** (bug)
  The `graph.nodes()` calls are unguarded — if a graph adapter throws (e.g., a corrupted or misbehaving adapter), the entire `serializeFixtures` call crashes with no diagnostic. The `whoCalls` calls are already wrapped in try/catch (F-335 FIX), but the `nodes()` calls feeding the nodes array and the edges map are not. A throwing adapter here would break version hash computation without a clear error message.
  ```existing
  const graphOf = (graph: GraphAdapter): unknown => {
      const nodes = graph.nodes().map((n) => ({
        id: n.id, kind: n.kind, name: n.name,
        file: n.file ?? null, line: n.line ?? null, lineage: n.lineage, source: n.source,
        data: n.data ?? null,
      }));
      nodes.sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const edges = graph.nodes().map((n) => {
  ```
  ```suggested
  const graphOf = (graph: GraphAdapter): unknown => {
      let nodes;
      try {
        nodes = graph.nodes().map((n) => ({
          id: n.id, kind: n.kind, name: n.name,
          file: n.file ?? null, line: n.line ?? null, lineage: n.lineage, source: n.source,
          data: n.data ?? null,
        }));
      } catch (e) {
        console.warn(`[calibration] graph.nodes() threw: ${e instanceo
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:402-408** (bug)
  **DB connection resource leak — no cleanup on any terminal path.**

The `db: DbClient` assigned in the `map` state's `onDone` (line ~153) is passed to `scan` and `report` actors, but is **never closed** — not in `stop()`, not in the `done` final state, and not in the `inconclusive` final state. The `map.ts` comment (F-1 FIX) explicitly transfers ownership of the open `DbClient` to the micro-loop, and `DbClient` declares a `close()` method (db.ts:203). Since the machine has no teardown hook in its final states and `stop()` doesn't close it, the SQLite WAL connection leaks on every run — both success and error paths.

Suggested fix: close the `db` in `stop()` and/or add an `always` transition from both `done` and `inconclusive` that invokes a cleanup actor, or close it in the `stop()` method of the handle:

```typescript
stop(): void {
  sub.unsubscribe();
  if (pendingSettle !== null) { pendingSettle(); pendingSettle = null; }
  for (const d of handleDisposables.splice(0)) d.unsubscribe();
  // Close the db handle if the map phase opened one
  try { snapshot.db?.close(); } catch { /* idempotent */ }
  try { actor.stop(); } catch (e) { console.error('[micro-loop] actor stop failed:', e instanceof Error ? e.message : String(e)); }
}
```
  ```existing
  stop(): void {
      sub.unsubscribe();
      // ★ F-408: resolve any pending done() promise BEFORE teardown
      if (pendingSettle !== null) { pendingSettle(); pendingSettle = null; }
      for (const d of handleDisposables.splice(0)) d.unsubscribe();
      try { actor.stop(); } catch (e) { console.error('[micro-loop] actor stop failed:', e instanceof Error ? e.message : String(e)); }
    },
  ```

## src/hunter/hooks/bus-hook.ts
- **src/hunter/hooks/bus-hook.ts:160-167** (bug)
  retryFailed uses a single try/catch wrapping ALL subscribers. If the first subscriber throws, remaining subscribers never receive the retried event. In contrast, `poll()` (line 105-111) correctly uses per-subscriber try/catch. This bug means retryFailed silently drops delivery to later subscribers for any event where an earlier subscriber faults.
  ```existing
  for (const f of pending) {
      try {
        for (const fn of this.subscribers) fn(eventKind(f.row.kind), f.payload);
      } catch (e: unknown) {
        console.error(`[hydra-bus] retry for ${f.row.kind} (attempt ${f.attempt + 1}) threw: ${e instanceof Error ? e.message : String(e)}`);
        this.failedEvents.push({ ...f, error: e, attempt: f.attempt + 1 });
      }
    }
  ```
  ```suggested
  for (const f of pending) {
      let lastError: unknown = null;
      for (const fn of this.subscribers) {
        try {
          fn(eventKind(f.row.kind), f.payload);
        } catch (e: unknown) {
          console.error(`[hydra-bus] retry for ${f.row.kind} (attempt ${f.attempt + 1}) subscriber threw: ${e instanceof Error ? e.message : String(e)}`);
          lastError = e;
        }
      }
  
  ```

## src/hunter/keys/go-key-pool.ts
- **src/hunter/keys/go-key-pool.ts:510-517** (bug)
  **`resolveGoKeyIndex` always returns index 0 — no round-robin or load distribution.** The loop returns the first key whose `dead_until <= now`, which is always index 0 unless it has been explicitly dead-marked. This means key 0 bears 100% of the traffic until it hits a rate limit, then key 1 takes over 100%, and so on — effectively a failover cascade, not a pool. The pool's cross-process sharing and SQLite-backed state are wasted because there is no rotation. Consider maintaining a counter (file-based or SQLite row) for round-robin, or at minimum randomizing the scan start index.
  ```existing
  export function resolveGoKeyIndex(now: number = Date.now(), sessionId?: string): { idx: number; alive: boolean; expiryKnown: boolean } {
  // W13 (frozen-scan HIGH): the low-level API fails LOUD on an empty pool —
  // the old idx:-1 fallthrough made callers believe in a nonexistent key.
  if (GO_KEYS.length === 0) throw new Error('GO_POOL_EMPTY: no Go keys configured (provision ~/.gi-keys.json or
  ```
- **src/hunter/keys/go-key-pool.ts:379-386** (bug)
  **`markGoKeyDead` displaced-key re-homing can silently lose rate-limit state after a `reloadGoKeys()`.** The function hashes the displaced key's `keyid` and searches `GO_KEYS` for its current position via `findIndex`. If `GO_KEYS` was reloaded (by `reloadGoKeys()`) between the time the displaced row was written and now, the key may have been removed or reordered — `findIndex` returns -1, and the displaced key's exile row is **deleted** (the `else` branch). This means a key that is genuinely rate-limited loses its protection after a key-reload, and the pool will hammer it. Since `GO_KEYS` is a module-level mutable array with no lock, this race is real in multi-call scenarios.
  ```existing
  if (displaced && typeof displaced.keyid === 'string' && displaced.keyid.length > 0) {
        const home = GO_KEYS.findIndex((k) => createHash('sha256').update(k).digest('hex').slice(0, 16) === displaced.keyid);
        if (home >= 0 && home !== idx) {
          conn.run('UPDATE go_key_pool SET idx = ? WHERE keyid = ? AND idx = ?', [home, displaced.keyid, idx]);
        } else {
          conn.run
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:512-512** (bug)
  The `glob` tool case strips ALL glob characters (`*?[]{}`) from `args.pattern`, producing a bare path like `src/.ts` from `src/*.ts`. This stripped string is then passed to `resolveTouchedFiles`, which at line 242 immediately returns `[]` because the string contains no glob chars (`/[*?[]/.test(candidate)` is false). Consequently, glob tool results **never** receive diagnostic blocks, even when the server has diagnostics for files the glob matched. The fix: strip only regex-dangerous chars (`[]{}.`) while preserving `*` and `?` so `resolveTouchedFiles` can compile a regex to match state keys.
  ```existing
  case 'glob':    return typeof args.pattern === 'string' ? args.pattern.replace(/[*?[\]{}]/g, '') : null;
  ```
  ```suggested
  case 'glob':    return typeof args.pattern === 'string' ? args.pattern.replace(/[.[\]{}]/g, '\$&').replace(/\*/g, '*').replace(/\?/g, '?') : null;
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:176-180** (bug)
  The substring matching logic (`hay.includes(subject)`) has two correctness issues:

1. **Direction mismatch**: The check tests whether the `subject` (which could be a long paragraph) is a substring of the event fields. But often the `matched_span` is a *excerpt* of the subject — a shorter portion. In that case, the subject won't be found inside the span, causing the method to MISS legitimate repair opportunities.

2. **False positives on short subjects**: If `subject` is a common short word (e.g., "the", "flag", "repair"), it will match any event whose concatenated span/verdict/rule contains that word, producing spurious repair facts.

Consider reversing the match direction for the span (`e.matched_span?.includes(subject)` or vice versa) or using a word-boundary-aware match to reduce false positives.
  ```existing
  const hits = events.filter((e) => {
        if (e.band !== "flag") return false; // ★ only a FLAG is a repair opportunity
        const hay = `${e.matched_span ?? ""} ${e.verdict ?? ""} ${e.rule ?? ""}`;
        return hay.includes(subject);
      });
  ```
  ```suggested
  const hits = events.filter((e) => {
        if (e.band !== "flag") return false; // ★ only a FLAG is a repair opportunity
        // Check both directions: subject contains span (subject is broader text)
        // or span contains subject (span excerpt matches subject keyword)
        const span = e.matched_span ?? "";
        const verdict = e.verdict ?? "";
        const rule = e.rule ?? "";
  
  ```
- **src/omp/adapters/abide.ts:152-160** (performance)
  Both `facts` and `up` use synchronous file system operations (`statSync`, `openSync`, `readSync`, `closeSync`, `readFileSync`, `existsSync`). These block the Node.js event loop for the entire duration of the read. On a large ledger (up to 64 MiB in the tail window, or 32 MiB in the fallback), this could cause significant latency for concurrent requests.

Consider using the async variants (`fs.promises.stat`, `fs.promises.open`, etc.) or offloading to a worker thread, especially for the `facts` method which reads and parses potentially thousands of JSON lines.
  ```existing
  const eventsPath = abideEventsPath(abideRoot ?? scopeRoot);
  return {
    id: "ABIDE",
    rung: "repair",
    dependency: "the Abide source — the ALU (repair, never block)",
    errorCode: "GI_ENFORCE_ABIDE",
    up: () => {
      try {
        const st = fs.statSync(eventsPath);
  ```

## src/omp/evidence-producer.ts
- **src/omp/evidence-producer.ts:293-296** (bug)
  The `catch` block silently swallows the error from `laterEditFromGraph` with no logging whatsoever. A genuine bug in the graph query (e.g., schema migration broke the LIKE clause, or the table is missing) becomes invisible — the system silently degrades. This violates the module's own 'LOUD refusal' law. At minimum, log the error to `console.error` with a diagnostic message, and consider pushing 'graph:ERROR' (not just 'graph:UNAVAILABLE') to `sources` so the caller can tell a genuine failure from a missing table.
  ```existing
  } catch {
      // the graph source is OPTIONAL and its absence must not void the event-derived records
      sources.push("graph:UNAVAILABLE");
    }
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:147-154** (bug)
  Missing file-level `excludes` check in the mtime fallback walk. The `walk` function applies `excludes` to directories (line 144) but NOT to individual files (lines 147-154). In contrast, `hashSourceTree`'s walk function applies `excludes` to both directories AND files (line ~224). This means the mtime-based freshness fallback can include excluded files when computing `newest`, making it more conservative than the hash-based path — the probe reports `stale-mtime` even when the content hash would report `fresh`. This is a correctness inconsistency between the two freshness paths. The file branch (line 147) should check `if (excludes.includes(entry.name)) continue;`.
  ```existing
  } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const m = fs.statSync(path.join(dir, entry.name)).mtimeMs;
          if (m > newest) newest = m;
          filesSeen += 1;
        } catch { /* unreadable file — skip */ }
      }
  ```

## src/scoping/scope-resolver.ts
- **src/scoping/scope-resolver.ts:95-96** (bug)
  When the cached path has vanished (fs.existsSync returns false), the resolver silently falls through to auto-detect which may pin a completely different directory. There is no logging, warning, or metric emitted. This means the session's state dir could be silently re-scoped to an unintended project root (e.g., a foreign repo the user merely browsed). Consider at minimum adding a diagnostic log/warning so mis-scoping is diagnosable.
  ```existing
  const cached = this.cache.get(sessionId);
      if (cached && fs.existsSync(cached)) return cached;
  ```
  ```suggested
  const cached = this.cache.get(sessionId);
      if (cached) {
        if (fs.existsSync(cached)) return cached;
        // TODO: emit diagnostic — cached path vanished, falling through to re-detect
      }
  ```
