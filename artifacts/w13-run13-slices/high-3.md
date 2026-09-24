# HIGH slice 3 — 11 findings across 9 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:669-669** (bug)
  **Bug: try-catch in `runCalibration` does not catch errors from `gate.run()`.**

`gate.run()` is an `async` method that always returns a `Promise`. When the promise is returned directly from the `async runCalibration` function (without `await`), the returned promise's rejection is **not** intercepted by the surrounding try-catch. Only synchronous errors and the `await compile(profile)` rejection are caught. This means:

1. DB/file persistence failures from `gate.run()` bypass the `console.warn` — the intended diagnostic logging is dead code for the most common error path.
2. The caller sees the raw `CalibrationError` without any logging.

Fix: `await` the promise so the try-catch captures its rejections:
```typescript
const result = await gate.run(profile, fixtureVersion, opts.db || opts.recordPath ? { db: opts.db, recordPath: opts.recordPath } : undefined);
return result;
```
  ```existing
  return gate.run(profile, fixtureVersion, opts.db || opts.recordPath ? { db: opts.db, recordPath: opts.recordPath } : undefined);
  ```
  ```suggested
  const result = await gate.run(profile, fixtureVersion, opts.db || opts.recordPath ? { db: opts.db, recordPath: opts.recordPath } : undefined);
    return result;
  ```
- **src/hunter/diagnostics/calibration.ts:680-686** (bug)
  **In-place mutation of shared `CompiledPredicate` objects via `markCalibrated`.**

`markCalibrated` (called from `mark()`) writes `p.calibrated = verdict` directly onto the `CompiledPredicate` that was passed into the gate. Since `CalibrationGate` receives the battery by reference (not a copy), this mutates the original objects in the caller's scope. Consequences:

1. If the same battery array is reused across multiple `CalibrationGate` sessions (e.g., a re-calibration attempt), the first session's verdicts silently contaminate the second session's starting state.
2. If a live scan holds a reference to the same `CompiledPredicate` objects, it sees the calibration side-effects without an explicit contract for it.
3. The mutation is not idempotent — calling `fireTest` then `silentTest` (or vice versa) produces different intermediate `p.calibrated` states that external observers may read inconsistently.

Suggestion: either deep-clone the battery in the gate constructor, or maintain the calibration state entirely in the gate's internal maps (which already exist as `this.verdicts`) and expose it only through `verdictOf()`.
  ```existing
  function markCalibrated(p: CompiledPredicate, verdict: 'CALIBRATED' | 'FLAGGED' | 'PENDING'): void {
  if (p !== undefined && p !== null) {
    (p as CalibratedPredicate).calibrated = verdict;
    return;
  }
  throw calibrationFixtureInvalid('the predicate row is missing for the calibrated mark');
}
  ```
  ```suggested
  function markCalibrated(p: CompiledPredicate, verdict: 'CALIBRATED' | 'FLAGGED' | 'PENDING'): void {
  if (p === undefined || p === null) {
    throw calibrationFixtureInvalid('the predicate row is missing for the calibrated mark');
  }
  // Mutation-free: calibration state lives in CalibrationGate.verdicts.
  // This function is retained as a guard that p is a valid reference;
  // remove it enti
  ```

## src/hunter/harness/hunt-lock.ts
- **src/hunter/harness/hunt-lock.ts:166-171** (bug)
  TOCTOU race between re-read comparison and unlinkSync in releaseHuntLock. After the F-831 re-read confirms the ownership triple matches (line 157-159), unlinkSync (line 161) is not atomic with that read. A concurrent process could be running stale-recovery in acquireHuntLock during this window: (1) it reads the lock as stale, (2) re-reads and confirms the same payload, (3) unlinks the stale lock, (4) writes a fresh lock with wx. Then this unlinkSync on line 161 deletes the stranger's freshly-acquired lock. This can occur when the lock's TTL has expired and the releasing process takes long enough for another process to attempt stale recovery — a realistic scenario since work approaching the 30-min boundary triggers both release and stale-recovery simultaneously.
  ```existing
  const fresh = readPayload(lockPath);
    if (!fresh || fresh.pid !== existing.pid || fresh.acquiredAt !== existing.acquiredAt || fresh.hostname !== existing.hostname) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: the lock changed during release (a peer won the race) — keeping the current holder's lock`);
      return;
    }
    fs.unlinkSync(lockPath);
  ```
  ```suggested
  const fresh = readPayload(lockPath);
    if (!fresh || fresh.pid !== existing.pid || fresh.acquiredAt !== existing.acquiredAt || fresh.hostname !== existing.hostname) {
      console.warn(`[hunt-lock] release skipped for ${lockPath}: the lock changed during release (a peer won the race) — keeping the current holder's lock`);
      return;
    }
    try {
      // unlink may delete a stranger's loc
  ```

## src/hunter/hooks/bus-hook.ts
- **src/hunter/hooks/bus-hook.ts:74-81** (bug)
  If `poll()` throws (e.g., the database call fails), `this.polling` is correctly reset in `finally`, but `this.cursor` is NOT rolled back to its pre-call value. This means partial batch processing could leave the cursor advanced past some rows that were never delivered, causing silent event loss. On the next successful poll the already-advanced cursor skips those rows. Consider saving the cursor at entry and restoring it on exception.
  ```existing
  poll(db: DbClient): EventRow[] {
    if (this.polling) {
      console.warn('[hydra-bus] poll reentered concurrently — skipped (the in-flight poll owns the cursor)');
      return [];
    }
    this.polling = true;
    try {
    const rows = rowsAs<EventRow>(db.prepare('SELECT id, kind, payload FROM events WHERE id > ? ORDER BY id ASC').all(this.cursor), 'events');
  ```
  ```suggested
  poll(db: DbClient): EventRow[] {
    if (this.polling) {
      console.warn('[hydra-bus] poll reentered concurrently — skipped (the in-flight poll owns the cursor)');
      return [];
    }
    this.polling = true;
    const cursorBefore = this.cursor;
    try {
    const rows = rowsAs<EventRow>(db.prepare('SELECT id, kind, payload FROM events WHERE id > ? ORDER BY id ASC').all(this.cursor), 'even
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
