# HIGH slice 3 — 11 findings across 9 files

## src/hunter/harness/hunt-lock.ts
- **src/hunter/harness/hunt-lock.ts:195-198** (bug)
  The outer try-catch silently swallows ALL exceptions (including unexpected ones like EACCES, EMFILE, ENOSPC) with only a console.warn. The caller never learns the lock file was leaked, which means every future `acquireHuntLock` on this target path will throw HUNT_ALREADY_RUNNING indefinitely. At minimum, unexpected (non-ENOENT, non-EACCES) errors should be re-thrown so callers can handle them.
  ```existing
  } catch (e: unknown) {
    console.warn(`[hunt-lock] release failed for ${lockPath}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
  ```
  ```suggested
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Only swallow race-condition / benign errors; re-throw unexpected failures
    // so the caller can decide whether the lock is leaked.
    if (msg.includes('the lock changed') || msg.includes('the lock vanished')) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: ${msg}`);
      return;
    }

  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:0-0** (bug)
  **Bug: `actorError` returns `undefined` for malformed events → `namedError` produces the string `"undefined"` as the error message.**

When the `onError` handler fires with a malformed event (e.g., missing or non-object shape), `actorError` returns `undefined`. Then `namedError(undefined)` hits the `String(e)` branch and returns `"undefined"`. The INCONCLUSIVE result's `error` field becomes the unhelpful string `"undefined"` instead of a meaningful diagnostic message. This masks the real failure cause in production.

Fix: `namedError` should treat `undefined`/`null` as an unknown-error sentinel, and/or `actorError` should return a descriptive fallback string.
  ```existing
  function actorError(event: unknown): unknown {
  if (typeof event !== 'object' || event === null) return undefined;
  if (!('error' in event)) return undefined;
  return (event as { error: unknown }).error;
}

/** THE R16 TYPE_CERTAINTY GUARDED ACCESSOR — the onError event's `error` is
 *  read behind the typeof/null guard (the assertion is earned by the check). */
function namedError(e: unknown):
  ```
  ```suggested
  function actorError(event: unknown): unknown {
  if (typeof event !== 'object' || event === null) return undefined;
  if (!('error' in event)) return undefined;
  return (event as { error: unknown }).error;
}

function namedError(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e === undefined || e === null) return 'unknown error (no error payload)';
  return String(e);
}
  ```
- **src/hunter/harness/micro-loop-machine.ts:402-419** (bug)
  **Bug: `DbClient` is only closed in `stop()`, not on the normal `done()` completion path.**

The SQLite WAL handle opened during the MAP phase is transferred into the context (`context.db`). `stop()` calls `snapshot.db?.close()`, but a caller that awaits `done()` without calling `stop()` — which is the natural happy-path usage — will leak the file descriptor until GC collects the snapshot reference. This is especially problematic in server/CI environments that run many hunts in sequence.

Fix: close the db in the `settle()` function (the terminal-resolution path shared by both `done()` and `stop()`), or add a `db.close()` call in the `report` state's `onDone` handler since report is the last consumer.
  ```existing
  stop(): void {
      sub.unsubscribe();
      // ★ F-408: resolve any pending done() promise BEFORE teardown
      if (pendingSettle !== null) { pendingSettle(); pendingSettle = null; }
      // ★ F-700 FIX (2026-09-24): the disposal loop was unguarded AND settle() left
      // ★ already-unsubscribed subs in this list (double-unsubscribe — LOUD crash inside
      // ★ teardown if a subscription i
  ```
  ```suggested
  stop(): void {
      sub.unsubscribe();
      if (pendingSettle !== null) { pendingSettle(); pendingSettle = null; }
      for (const d of handleDisposables.splice(0)) {
        try { d.unsubscribe(); } catch (e) { console.error('[micro-loop] disposable unsubscribe failed:', e instanceof Error ? e.message : String(e)); }
      }
      closeDb();
      try { actor.stop(); } catch (e) { console.erro
  ```

## src/hunter/keys/go-key-pool.ts
- **src/hunter/keys/go-key-pool.ts:229-234** (bug)
  LRU eviction at the end of `db()` closes Database handles that may be actively referenced by another call stack within the same process. For example, `markGoKeyDead` calls `db(sessionId)` which returns a connection, then begins a transaction (`BEGIN IMMEDIATE`). If a concurrent async path (or a synchronous re-entry) triggers `db()` again and the LRU is full, the eviction closes the still-open transaction handle — the original caller gets a 'database is closed' error mid-transaction. The LRU eviction should be deferred (e.g., deferred close after release), or the eviction should skip handles that are known to be in use.
  ```existing
  while (poolDbByPath.size > POOL_DB_LRU_MAX) {
    const oldest = poolDbByPath.keys().next();
    if (oldest.done) break;
    try { poolDbByPath.get(oldest.value)?.close(); } catch { /* already closed */ }
    poolDbByPath.delete(oldest.value);
  }
  ```
  ```suggested
  // Defer closes to avoid closing handles that are mid-transaction in another call frame.
  const toClose: Database[] = [];
  while (poolDbByPath.size > POOL_DB_LRU_MAX) {
    const oldest = poolDbByPath.keys().next();
    if (oldest.done) break;
    const db = poolDbByPath.get(oldest.value);
    poolDbByPath.delete(oldest.value);
    if (db) toClose.push(db);
  }
  for (const db of toClose) {
    
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:767-767** (bug)
  The catch-all `catch (idemErr)` in `getBranchUnion` masks ALL errors from the view query — not just the expected 'view does not exist' case. If the view exists but has a schema mismatch (e.g., a column was added/removed), or if the underlying database file is corrupted, this silently falls back to the manual union path which may return incomplete or different results. The 'idempotent guard' label is misleading here — this should only catch the specific 'no such table: branch_union_view' error and re-throw anything else.
  ```existing
  } catch (idemErr) { /* idempotent guard */ console.debug("[kg-store] idempotent guard #4:", idemErr instanceof Error ? idemErr.message : String(idemErr)); }
  ```
  ```suggested
  } catch (viewErr) {
      const msg = viewErr instanceof Error ? viewErr.message : String(viewErr);
      if (/no such table/.test(msg)) {
        console.debug('[kg-store] branch_union_view not yet created — using fallback:', msg);
      } else {
        throw viewErr; // real error — do not mask
      }
    }
  ```

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:185-186** (bug)
  Evidence logged after `buildOutput` (the `PIPELINE_DONE` entry) is appended to the local `evidence` array, but `buildOutput` was already called with the earlier snapshot. More critically, if `synthesizer` or a post-gate throws, the local evidence (including `SYNTHESIZE_START` or the failed gate check) is never published to `this.evidence` — it's lost. Since `this.evidence` is the only externally-readable diagnostic surface, callers have no way to observe what happened in a failed run. Consider publishing on all exit paths (success, gate failure, and exception) or at minimum around the try/catch boundaries.
  ```existing
  const output = this.config.buildOutput(synthesis, results, evidence);
    this.log("PIPELINE_DONE", { name: this.config.name, totalDurationMs: Date.now() - t0 }, evidence);
  ```

## src/omp/adapters/kev.ts
- **src/omp/adapters/kev.ts:102-107** (performance)
  The `facts` function uses `execFileSync` which **blocks the Node.js event loop** for up to 120 seconds. In a server or concurrent probe-runner context, a single slow/hung CLI invocation stalls ALL other work on the thread. Consider using `execFile` (async) with `await`, or at minimum document that this probe must only run in a worker thread or dedicated process.
  ```existing
  out = execFileSync(process.execPath, [cli, "--json", JSON.stringify({ state: buildState(scopeRoot, subject), questions: [MEANING_QUESTION] })], {
          encoding: "utf8",
          timeout: 120_000,
          maxBuffer: 8 * 1024 * 1024,
          cwd: scopeRoot,
        });
  ```

## src/omp/graph-facts.ts
- **src/omp/graph-facts.ts:203-209** (?)
  **M-GRAPH-2 condition is overly strict, missing real D-6 class defects.**

The rule is named HAS-READER and its comment says "a declared field must have ≥1 reading edge", yet the FIRE condition requires `outD === 0 && inD.n === 0` — both zero. This means a declared field that has outgoing references (outD > 0) but no incoming references (inD === 0) — i.e. nothing reads it — falls through to the IGNORE branch with the reason `"is referenced"`. But `inD.n === 0` means it is NOT referenced! The reason string is factually contradicted by its own evidence.

The `outD === 0` conjunct is incorrect for the HAS-READER semantic. A reader of a declared symbol is an incoming edge (`inD`); outgoing edges (`outD`) represent what the symbol itself references, which is irrelevant to whether anyone reads it. The condition should be `inD.n === 0` to fire, matching the D-6 class ("ledgerPath, 0 readers").

Concrete example: a config field `ledgerPath` that is declared, imports a path utility (outD = 1), but is never consumed by any other module (inD = 0). The current code would settle IGNORE and miss the defect.
  ```existing
  verdicts.push(outD === 0 && inD.n === 0
        ? { rule: "M-GRAPH-2", settles: true, action: "FIRE",
            reason: `the declared symbol "${input.target}" has ZERO edges in or out — declared, never consumed`,
            evidence: "in-degree 0 · out-degree 0" }
        : { rule: "M-GRAPH-2", settles: true, action: "IGNORE",
            reason: `the declared symbol "${input.target}" is refere
  ```
  ```suggested
  verdicts.push(inD.n === 0
        ? { rule: "M-GRAPH-2", settles: true, action: "FIRE",
            reason: `the declared symbol "${input.target}" has ZERO incoming edges — declared, never read`,
            evidence: `in-degree 0 · out-degree ${outD}` }
        : { rule: "M-GRAPH-2", settles: true, action: "IGNORE",
            reason: `the declared symbol "${input.target}" is referenced`,
      
  ```

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:232-240** (bug)
  **Two-view drift when `up()` throws:** The `factsForWithFaults` method wraps both `p.up()` (line 240) and `p.facts()` (line 261) in a SINGLE try/catch (line 232/273). If `p.up()` throws, the catch records a fault with the message `"facts() threw mid-query"` referencing `GI_LAYER_ERROR`. But in `auditOne`, the same `up()` throw is caught in a SEPARATE try/catch (line 150) and classified as `GI_LAYER_DOWN` — a fundamentally different operator-facing token (substrate absent vs. mid-query fault). This contradicts the error taxonomy the file enforces everywhere else and is exactly the class of two-view drift the F-405/F-706/F-1007 fixes were trying to eliminate.

The fix is to split the try/catch in `factsForWithFaults` so `p.up()` has its own try/catch (mirroring `auditOne`), and the `p.facts()` call has a separate one.
  ```existing
  try {
          // ★ F-405 FIX (2026-09-24): auditOne validates the probe shape (malformed → DOWN
          //   with evidence); factsFor trusted p.up().up, so a non-object truthy return
          //   silently skipped the consumer and the two views disagreed. Same rule here:
          //   only boolean-true up contributes; malformed-or-DOWN contributes nothing.
          // ★ F-706 FIX (2026-09-2
  ```
  ```suggested
  // Probe phase — mirrors auditOne's separate try/catch so that an up() throw
        // is classified GI_LAYER_DOWN (substrate absent), not GI_LAYER_ERROR (mid-query fault).
        let probeUp = false;
        let probeEvidence = "";
        try {
          const rawProbe: unknown = p.up();
          const probeValid = typeof rawProbe === "object" && rawProbe !== null && typeof (rawProbe as { up?
  ```
- **src/omp/layer-registry.ts:231-231** (bug)
  **Reentrancy hazard — direct Map iteration vs. snapshot:** `factsForWithFaults` iterates `byId.values()` directly (line 231), while `audit()` and `consumers()` correctly snapshot via `[...byId.values()]`. If any consumer's `up()` or `facts()` reentrantly calls `register()` (e.g., a dynamic adapter that lazily registers sub-consumers), the Map mutation during iteration causes undefined behavior per the JS Map spec. The rest of the file already treats this as a real scenario — the multiple F-series fixes exist precisely because probes can have unexpected behaviors. Snapshot the Map like `audit()` does.
  ```existing
  for (const p of byId.values()) {
  ```
  ```suggested
  for (const p of [...byId.values()]) {
  ```

## src/omp/store-open.ts
- **src/omp/store-open.ts:0-0** (bug)
  Orphaned store file when post-create registry check fails: If `writeFileSync` with `wx` succeeds (this opener created the file on disk), but then the registry check at lines 76–78 discovers a foreign owner and throws `GiScopeError`, the newly created file is never removed from disk. This leaves an orphaned store that may confuse future openers (they'll get EEXIST from `wx` but no matching registry entry) or waste disk space. Consider wrapping the `wx` + registry-upsert sequence in a try/catch that cleans up the file on failure, or deferring file creation until after the registry check is guaranteed to succeed.
  ```existing
  let created = false;
  try {
    fs.writeFileSync(storePath, "", { flag: "wx" });
    created = true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  // ★ F-43 FIX ... Re-verify after winning the create; never overwrite a foreign owner.
  const current = findGiSessionByStorePath(storePath);
  if (current && current.session_id !== ownerKey) {
    throw new GiS
  ```
  ```suggested
  let created = false;
  try {
    fs.writeFileSync(storePath, "", { flag: "wx" });
    created = true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  const current = findGiSessionByStorePath(storePath);
  if (current && current.session_id !== ownerKey) {
    // Clean up the orphaned file we just created before throwing.
    if (created) {
      try { fs.unlin
  ```
