# HIGH slice 2 — 11 findings across 9 files

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

## src/hydra/client-reader.ts
- **src/hydra/client-reader.ts:95-99** (bug)
  `listTools()` and `callTool()` both call their respective transport methods (`await t.listTools()` and `await t.callTool(name, args ?? {})`) without any timeout guard, identical to the `attach()` and `disconnect()` hazard (F-611/F-612). A stalled or hung transport call in either method would block the caller indefinitely, holding the captured transport reference and deadlocking subsequent operations. Apply the same `Promise.race` timeout pattern used in `attach()`/`disconnect()` to both `listTools()` and `callTool()` for consistency with the F-611/F-612 rationale.
  ```existing
  try {
      return await t.listTools();
    } catch (err) {
      throw new Error(`GRAPHIFY_MCP_LIST_FAILED: ${String((err as Error).message ?? err)}`);
    }
  ```
  ```suggested
  try {
      return await Promise.race([
        t.listTools(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('GRAPHIFY_LIST_TIMEOUT: listTools() exceeded 5000ms')), 5000)),
      ]);
    } catch (err) {
      throw new Error(`GRAPHIFY_MCP_LIST_FAILED: ${String((err as Error).message ?? err)}`);
    }
  ```

## src/omp/adapters/tsg.ts
- **src/omp/adapters/tsg.ts:123-131** (security)
  **Redaction bypass: only exact full-key and tail-8 partial matches are redacted, leaving first-N or middle portions of the key exposed.** The F-914 fix adds a tail-8 heuristic, but if the CLI or error path echoes the first 4+ characters, or a middle substring of the key, neither the exact split/join nor the tail heuristic will match. For example, a log that prints `key.slice(0, 12)` or a server-echoed context showing a prefix would survive redaction. Consider also redacting the first N characters (e.g., first 8) when key length >= 16, or using a regex-based approach that matches any contiguous 8+ character substring of the key.
  ```existing
  const redact = (s: string): string => {
          if (key === null || key.length === 0) return s;
          let out: string = s.split(key).join(key.slice(0, 4) + '...[redacted]');
          if (key.length >= 16) {
            const tail: string = key.slice(-8);
            if (tail.length >= 8) out = out.split(tail).join('...[redacted-tail]');
          }
          return out;
        };
  ```
  ```suggested
  const redact = (s: string): string => {
          if (key === null || key.length === 0) return s;
          // Exact full-key match (metachar-safe via split/join)
          let result: string = s.split(key).join(key.slice(0, 4) + '...[redacted]');
          if (key.length >= 16) {
            // Tail-8 heuristic (existing F-914 fix)
            const tail: string = key.slice(-8);
            if (t
  ```

## src/omp/fire-gate.ts
- **src/omp/fire-gate.ts:368-372** (bug)
  The MPSE negation regex is missing common affirmative action verbs. F-266 added `execut|perform|applied|deployed|shipped|complet|ran|went ahead|carried out`, but real-world slots use forms like "deleted", "removed", "destroyed", "dropped", "killed", "erased", "wiped", and "nuked" — none of which match. A slot like `"discussed removing the server and then deleted it"` passes `every()` because "deleted" is not matched by the affirmative regex, so the entire slot is treated as negated/discussion. The fire is settled IGNORE on a REAL violation. The comment says "F-266 FIX" but the verb list is incomplete — consider matching against the DESTRUCTIVE_COMMANDS vocabulary or broadening the affirmative regex.
  ```existing
  const onlyNegated = mentionsTarget.every((s) => {
      const t = s.text.toLowerCase();
      if (/(execut|perform|applied|deployed|shipped|complet|\bran\b|did (it|this|that)|went ahead|carried out)/.test(t)) return false;
      return /(not |never|won't|don't|without|skip|avoid|discuss|mention|about the rule)/.test(t);
    });
  ```
  ```suggested
  const onlyNegated = mentionsTarget.every((s) => {
      const t = s.text.toLowerCase();
      if (/(execut|perform|applied|deployed|shipped|complet|\bran\b|did (it|this|that)|went ahead|carried out|deleted|removed|destroyed|dropped|killed|erased|wiped|nuked)/.test(t)) return false;
      return /(not |never|won't|don't|without|skip|avoid|discuss|mention|about the rule)/.test(t);
    });
  ```

## src/omp/oracle.ts
- **src/omp/oracle.ts:441-446** (bug)
  The subject pre-validation in `resolveAll` (line 441) and the equivalent check in `gather` (line 199) both use `row.target !== undefined && row.target !== ''` to decide whether the row supplies its own subject. However, the DDL column `target TEXT` is nullable, and rows written before the EN-090 migration have `NULL` targets (line 78 of fire-ledger.ts: "NULL is the honest value for them"). At runtime `null !== undefined` evaluates to `true`, so `fromRow` becomes `true` for a `NULL` target. `gather` then does `subject = { target: row.target as string, ... }`, casting `null` to `string` — a type-level lie. Since `null` will never match any record's target in the evidence loop (`r.target !== subject.target` is always `true`), no evidence is gathered and the fire is silently classified as `unresolved` instead of being rejected with a clear error. The `as string` cast masks a real null-pointer hazard: any future code that calls `.length`, `.includes()`, or template-interpolates `subject.target` on this value will get a TypeError at runtime.
  ```existing
  const fromRow = row.target !== undefined && row.target !== '';
  if (!fromRow && subj === undefined) {
      throw new Error(
        `GI_ORACLE_NO_SUBJECT: pair for state ${row.stateHash} has no row.target and no caller-supplied subject — refusing the WHOLE batch so no partial write can occur`,
      );
    }
  ```
  ```suggested
  const fromRow = row.target != null && row.target !== '';
  if (!fromRow && subj === undefined) {
      throw new Error(
        `GI_ORACLE_NO_SUBJECT: pair for state ${row.stateHash} has no row.target and no caller-supplied subject — refusing the WHOLE batch so no partial write can occur`,
      );
    }
  ```
- **src/omp/oracle.ts:199-199** (bug)
  The same null-unsafe check appears in `gather` at line 199. A `NULL` `target` from the database passes the `!== undefined` guard, causing `null` to be cast to `string` and used as the subject target for evidence matching. This should use a nullish check (`!= null`) to treat `null` the same as `undefined` — meaning the row does NOT name its own subject, and the caller-supplied subject should be used instead.
  ```existing
  const fromRow = row.target !== undefined && row.target !== "";
  ```
  ```suggested
  const fromRow = row.target != null && row.target !== "";
  ```

## src/omp/ripwire-bridge.ts
- **src/omp/ripwire-bridge.ts:0-0** (bug)
  The ENOBUFS error code may not be emitted by all Node.js versions on maxBuffer overflow. In some Node.js versions the error code is `ERR_CHILD_PROCESS_STDIO_MAXBUFFER` (or the error object may not have a `.code` property at all). This means the TRUNCATED diagnostic could silently fall through to the generic `rawErr.message` path, producing a less informative 'query failed' leg instead of the intended 'TRUNCATED' label. Consider checking for both codes, or falling back to a heuristic (e.g. stdout.length >= RIPWIRE_MAX_BUFFER).
  ```existing
  execError = rawErr.code === "ENOBUFS"
      ? `TRUNCATED: stdout exceeded maxBuffer ${RIPWIRE_MAX_BUFFER}B — ${rawErr.message}`
      : rawErr.message;
  ```
  ```suggested
  const isTruncated = rawErr.code === "ENOBUFS" || rawErr.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
    execError = isTruncated
      ? `TRUNCATED: stdout exceeded maxBuffer ${RIPWIRE_MAX_BUFFER}B — ${rawErr.message}`
      : rawErr.message;
  ```

## src/scoping/scoped-store.ts
- **src/scoping/scoped-store.ts:124-129** (bug)
  Race condition in getStoreDbAsync: The early-return path at lines 101-104 bypasses the in-flight gate, allowing concurrent callers to open multiple handles. This defeats the purpose of the guard added in F-288. Fix: always go through the gate, or at minimum acquire the gate even on the early-return path.
  ```existing
  if (!opts && storeDb) {
    try {
      storeDb.query('SELECT 1').get();
      return storeDb;
    } catch (_sick) { /* fall through to the shared open below */ }
  }
  ```
