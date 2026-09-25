# HIGH slice 2 — 13 findings across 11 files

## src/hunter/diagnostics/findings-store.ts
- **src/hunter/diagnostics/findings-store.ts:162-165** (bug)
  The `week` filter in `queryFindings` uses `if (opts.week)` which is falsy for an empty string `''`. If a caller passes `week: ''` intending to query records stored with that exact value, the clause will be silently omitted and return a superset of expected results. This is inconsistent with the `append` function which uses `week ?? null` (so `''` would be stored as-is). Use an explicit null/undefined check instead of a truthiness check to distinguish 'not provided' from 'provided as empty string'.
  ```existing
  if (opts.week) {
    clauses.push('week = ?');
    params.push(opts.week);
  }
  ```
  ```suggested
  if (opts.week != null) {
    clauses.push('week = ?');
    params.push(opts.week);
  }
  ```

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:0-0** (security)
  Shell injection risk in exported defaultExec: This function passes cmdRaw directly to execSync (which invokes /bin/sh -c) with zero sanitization. While internal callers construct commands from resolveCorbell()-validated paths, the function itself is a public export. Any external caller or future internal caller passing user-influenced input enables shell metacharacter injection. Since resolveCorbell already validates paths, consider adding a guard here as defense-in-depth, or remove the export so only guarded internal call-sites can use it.
  ```existing
  export const defaultExec: ExecFn = (cmdRaw, opts) => {
  const cmd = 'exec ' + cmdRaw;
  const ATTEMPTS = 8;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      return execSync(cmd, {
  ```
  ```suggested
  export const defaultExec: ExecFn = (cmdRaw, opts) => {
  if (/[;&|`$(){}!<>\n]/.test(cmdRaw)) {
    throw new Error(`CORBELL_EXEC_UNSAFE: command contains shell metacharacters: ${cmdRaw.slice(0, 120)}`);
  }
  const cmd = 'exec ' + cmdRaw;
  ```
- **src/hunter/graph/corbell-adapter.ts:135-135** (bug)
  Async timeout SIGKILL is fire-and-forget: When the timeout fires, the Promise is rejected immediately and the 5-second SIGKILL fallback runs on an unref'd timer. If SIGTERM does not terminate the child, the SIGKILL is never awaited and the child process can outlive the caller. Consider waiting for proc.on('exit') before settling the rejection, so the caller is not left with an orphaned process.
  ```existing
  reject(new Error(`corbell graph build timed out after ${timeoutMs}ms (cwd: ${cwd}) — child SIGTERMed (SIGKILL in 5s), no partial graph accepted`));
  ```
  ```suggested
  proc.on('exit', () => {
          done(() => reject(new Error(`corbell graph build timed out after ${timeoutMs}ms (cwd: ${cwd}) — child killed, no partial graph accepted`)));
        });
  ```

## src/hunter/graph/mechanical.ts
- **src/hunter/graph/mechanical.ts:167-169** (bug)
  Import path normalization misses `.mjs` and `.cjs` extensions. When a relative import has no recognized extension, the code always appends `.ts`, producing incorrect URIs for modules authored as `.mjs` or `.cjs`. Downstream consumers resolving `file:foo.mjs.ts` will fail to match actual files, silently corrupting the graph.
  ```existing
  if (!targetRel.endsWith('.ts') && !targetRel.endsWith('.tsx') && !targetRel.endsWith('.js')) {
            targetRel = `${targetRel}.ts`;
          }
  ```
  ```suggested
  const knownExts = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];
          if (!knownExts.some((ext) => targetRel.endsWith(ext))) {
            targetRel = `${targetRel}.ts`;
          }
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:399-403** (bug)
  BUG (High): `done()` + `stop()` lifecycle race — the pending promise never resolves.

When `done()` is called while the machine is still running, `sub2` and `sub3` are registered on the actor and pushed to `handleDisposables`. If `stop()` is then called before the machine reaches a terminal state, `handleDisposables.splice(0)` unsubscribes both `sub2` and `sub3` (the only callbacks that can call `settle()` and resolve the promise), then `actor.stop()` kills the actor. The `pendingDone` promise is left pending forever, causing any caller awaiting `handle.done()` to hang indefinitely.

Fix: resolve `pendingDone` inside `stop()` before tearing down subscriptions.
  ```existing
  stop(): void {
      sub.unsubscribe();
      for (const d of handleDisposables.splice(0)) d.unsubscribe();
      try { actor.stop(); } catch (e) { console.error('[micro-loop] actor stop failed:', e instanceof Error ? e.message : String(e)); }
    },
  ```
  ```suggested
  stop(): void {
      sub.unsubscribe();
      for (const d of handleDisposables.splice(0)) d.unsubscribe();
      // F-337 follow-up: resolve any pending done() promise so the caller
      // never hangs after an explicit stop().
      if (pendingDone !== null && !settled) {
        settled = true;
        pendingDone.resolve();
      }
      try { actor.stop(); } catch (e) { console.error('[micro
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:307-313** (bug)
  `fs.watch` does not handle the `'error'` event. When the OS file-watch limit is exceeded (a common scenario on macOS/inotify), `fs.watch` emits an `'error'` event. Without a listener, this becomes an uncaught exception that crashes the process. Add an `error` event handler to the watcher to gracefully degrade.
  ```existing
  this.watcher = fs.watch(absDir, { recursive: true }, (_event: string, filename: string | null) => {
        if (!filename) return;
        if (this.pausedFlag || this.writeLock) { this.queue.push(filename); this.enforceBacklog(); return; }
        this.queue.push(path.resolve(absDir, filename));
        this.enforceBacklog();
        this.scheduleDrain(onChange, absDir);
      });
  ```

## src/hydra/templates/mpse.ts
- **src/hydra/templates/mpse.ts:151-160** (bug)
  Missing `filterTags` on `mpseProvenanceTemplate`. All other three MPSE templates (R24 contract, R25 oracle, R26 stage) define `filterTags` arrays, but R27 provenance omits it entirely. While `filterTags` is typed as optional in `AuditorTemplate` (types.ts line 51), downstream filtering logic that iterates `MPSE_TEMPLATES` and reads `.filterTags` will silently get `undefined` for this template, causing it to be skipped or mishandled by tag-based filtering. This is almost certainly a copy-paste omission.
  ```existing
  export const mpseProvenanceTemplate: AuditorTemplate = {
  layerId: "R27-mpse-provenance",
  anchorPredicate: "provenance",
  layerNumber: 27,
  graphQueries: [
    "path spec clause reference to code implementation",
    "find unreachable spec declarations",
  ],
  // ★ F-213 FIX (2026-09-24): direct assignment (see contract — same F-160 precedent).
  outputSchema: MpseProvenanceOutputSchema,
  ```
  ```suggested
  export const mpseProvenanceTemplate: AuditorTemplate = {
  layerId: "R27-mpse-provenance",
  anchorPredicate: "provenance",
  layerNumber: 27,
  graphQueries: [
    "path spec clause reference to code implementation",
    "find unreachable spec declarations",
  ],
  filterTags: ["trace-gap", "unreachable", "provenance"],
  outputSchema: MpseProvenanceOutputSchema,
  ```

## src/omp/adapters/c2kg.ts
- **src/omp/adapters/c2kg.ts:0-0** (bug)
  Untrusted JSON field `s.name` is not type-validated. If the index file contains a symbol entry where `name` is a number (valid JSON), the nullish coalescing `s.name ?? ''` will not trigger (number is not nullish), and `Number.prototype.includes` does not exist — this throws a TypeError at runtime, bypassing the GI_LAYER_C2KG contract. The F-346 fix addressed `idx.symbols` not being an array, but individual item fields need the same defensive treatment since this is runtime-untrusted JSON. Use `String(s.name ?? '')` to coerce safely.
  ```existing
  const symbols = Array.isArray(idx.symbols) ? idx.symbols : [];
      const hits = symbols.filter((s) => (s.name ?? '').includes(subject));
  ```
  ```suggested
  const symbols = Array.isArray(idx.symbols) ? idx.symbols : [];
      const hits = symbols.filter((s) => String(s.name ?? '').includes(subject));
  ```

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:303-311** (bug)
  `saveGateState` finally block calls `db.close()` without try/catch — if `db.run()` throws (e.g., disk full) and then `db.close()` also throws (possible when the DB is in a bad state), the close exception replaces the original write error, masking the root cause. Compare with `loadGateState` which correctly wraps `db?.close()` in try/catch. Additionally, unlike `loadGateState`, there is no error logging here — a silent failure leaves the caller unaware that state was not persisted.
  ```existing
  const db = openSessionDb(storePath);
  try {
    db.run(
      "INSERT INTO graph_gate_state (session_id, drift, state, edits_json, queries_json, updated_ms) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET drift = excluded.drift, state = excluded.state, edits_json = excluded.edits_json, queries_json = excluded.queries_json, updated_ms = excluded.updated_ms",
      [sessionId, state
  ```
  ```suggested
  const db = openSessionDb(storePath);
  try {
    db.run(
      "INSERT INTO graph_gate_state (session_id, drift, state, edits_json, queries_json, updated_ms) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET drift = excluded.drift, state = excluded.state, edits_json = excluded.edits_json, queries_json = excluded.queries_json, updated_ms = excluded.updated_ms",
      [sessionId, state
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:44-58** (bug)
  Corbell path has a two-phase non-atomic write. `populateFromCorbellCheckout` writes data to the store on one handle/transaction, then lines 61-80 open a *second* `openTypedStore` handle to write three meta rows in its own separate transaction. A crash or competing writer between the two commits leaves the store in a half-populated state — data rows exist but substrate metadata is missing. Consider integrating the meta writes into the same transaction used by `populateFromCorbellCheckout`, or verify that the caller guarantees exclusive access.
  ```existing
  const db = openTypedStore(storePath);
    try {
      db.exec("BEGIN IMMEDIATE;");
      try {
        db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["substrate", "corbell"]);
        db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["corbell_checkout", corbell.checkoutPat
  ```

## src/omp/typed-write.ts
- **src/omp/typed-write.ts:994-996** (bug)
  `chainCalls` return type `ChainStep[] & { truncated?: boolean }` is silently erased — TypeScript merges intersection with the array's own type. On the success path (`return [...cur.steps, step]`), the `truncated` flag accumulated during BFS is discarded. A truncated-then-found result reports untruncated to callers. The `out` variable is constructed but never returned when a path is found.
  ```existing
  if (toSet.has(e.dst_id) && !(from === to && cur.steps.length === 0)) {
          return [...cur.steps, step];
        }
  ```
  ```suggested
  if (toSet.has(e.dst_id) && !(from === to && cur.steps.length === 0)) {
          const result = [...cur.steps, step] as ChainStep[] & { truncated?: boolean };
          if (truncated) result.truncated = true;
          return result;
        }
  ```
- **src/omp/typed-write.ts:1120-1125** (bug)
  `impactInDb` ledger cap does not bound work: when `ledger.length >= LEDGER_CAP` the code sets `ledgerTruncated = true` but still pushes into `next` and continues BFS for remaining depths. `seen` / `frontier` grow unbounded on mega-stores despite the comment claiming the cap stops expansion (see the F-TW-CAP FIX comment above the loop). Break out of the frontier loop once truncated.
  ```existing
  if (ledger.length < LEDGER_CAP) {
          ledger.push({ symbol: c.caller, depth: d, file: c.file ?? "", line: c.line ?? 0, via: c.predicate ?? "" });
        } else {
          ledgerTruncated = true;
        }
        next.push(c.id);
  ```
  ```suggested
  if (ledger.length < LEDGER_CAP) {
          ledger.push({ symbol: c.caller, depth: d, file: c.file ?? "", line: c.line ?? 0, via: c.predicate ?? "" });
          next.push(c.id);
        } else {
          ledgerTruncated = true;
          // Stop expanding frontier — only ledger-full, not work-full
        }
  ```

## src/scoping/scoped-store.ts
- **src/scoping/scoped-store.ts:105-113** (bug)
  The module-scoped `storeOpenInFlight` gate is shared across ALL database paths. If two different `dbPath` values are used concurrently (e.g., `registry.sqlite` and `sessions.sqlite`), the second async caller returns the first caller's promise and receives the wrong database handle. The gate should be keyed by `dbPath`.
  ```existing
  let storeOpenInFlight: Promise<Database> | null = null;
export async function getStoreDbAsync(opts?: ScopedStoreOptions): Promise<Database> {
  if (!opts && storeDb) {
    try {
      storeDb.query('SELECT 1').get();
      return storeDb;
    } catch (_sick) { /* fall through to the shared open below */ }
  }
  if (storeOpenInFlight) return storeOpenInFlight;
  ```
  ```suggested
  const storeOpenInFlightByPath = new Map<string, Promise<Database>>();
export async function getStoreDbAsync(opts?: ScopedStoreOptions): Promise<Database> {
  if (!opts && storeDb) {
    try {
      storeDb.query('SELECT 1').get();
      return storeDb;
    } catch (_sick) { /* fall through to the shared open below */ }
  }
  const want = opts?.dbPath ?? storeDbPath;
  if (want && storeOpenInFlight
  ```
