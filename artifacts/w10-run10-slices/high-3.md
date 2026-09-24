# HIGH slice 3 — 10 findings across 8 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:560-571** (bug)
  **Non-atomic file write leaves empty calibration file on crash.** After `closeSync(fd)` creates the empty file and before `writeFileSync(file, body)` writes content, a process crash or power loss leaves an empty `CALIBRATION_vN.md` file on disk. On the next run, `readdirSync` counts this empty file, incrementing N, and the empty file persists as phantom data. Additionally, a concurrent reader could observe the empty file mid-write and interpret it as a valid (but empty) calibration record.

The standard fix is an atomic write: write to a temporary file in the same directory, then call `fs.renameSync(tmpFile, file)`. The `rename` is atomic on POSIX and ensures readers only ever see the complete file or nothing.
  ```existing
  let fd: number;
      try {
        fd = fs.openSync(file, 'wx', 0o644);
      } catch (e: unknown) {
        const code = (e as NodeJS.ErrnoException)?.code;
        if (code === 'EEXIST') { n += 1; file = path.join(recordPath, `CALIBRATION_v${n}.md`); continue; }
        throw e;
      }
      fs.closeSync(fd);
      break;
    }
    const rows = data.records
  ```
  ```suggested
  let fd: number;
      try {
        fd = fs.openSync(file, 'wx', 0o644);
      } catch (e: unknown) {
        const code = (e as NodeJS.ErrnoException)?.code;
        if (code === 'EEXIST') { n += 1; file = path.join(recordPath, `CALIBRATION_v${n}.md`); continue; }
        throw e;
      }
      fs.closeSync(fd);
      break;
    }
    // Atomic write: content goes to a temp file first, then renam
  ```

## src/hunter/diagnostics/engine.ts
- **src/hunter/diagnostics/engine.ts:231-237** (bug)
  `severityScore` defaults to 1 (WARN) for unrecognized severity strings instead of throwing. The engine's `run()` validates severities via `SEVERITIES.includes()` before this function is called, but `severityScore` is exported and can be used externally. A future code path passing an invalid severity would silently rank it as WARN-level rather than failing loud — contradicting the D23 severity canon and the file's own fail-closed law ("an out-of-canon severity/verdict is FINDING_INVALID"). The default branch should throw an EngineError.
  ```existing
  switch (s) {
    case 'CRIT': return SEVERITY_RANK_CRIT;
    case 'HIGH': return 3;
    case 'MED': return 2;
    case 'WARN': return 1;
    default: return 1;
  }
  ```
  ```suggested
  switch (s) {
    case 'CRIT': return SEVERITY_RANK_CRIT;
    case 'HIGH': return 3;
    case 'MED': return 2;
    case 'WARN': return 1;
    default: throw new EngineError(
      'FINDING_INVALID',
      `FINDING_INVALID: severity=${s} (the D23 canon recognizes only CRIT|HIGH|MED|WARN — an unrecognized severity is a loud fail, never a silent default)`,
    );
  }
  ```
- **src/hunter/diagnostics/engine.ts:781-787** (bug)
  The crash-recovery lock logic has a multi-process race: when process A finds a stale lock (lines 562-565), it unlinks and re-writes with `wx`, but process B can simultaneously do the same. Both `fs.writeFileSync(..., { flag: 'wx' })` calls can succeed if the unlink happens between them, causing two processes to concurrently build and persist the graph — risking SQLite corruption (concurrent writers to the same DB file) and data loss (last-writer-wins overwrites). Additionally, the `wx` write itself can throw if another process re-created the lock between the `unlinkSync` and the `writeFileSync`. This entire section should be wrapped in a try/catch to prevent the secondary `wx` failure from crashing without cleanup.
  ```existing
  if (rows === null && !haveLock) {
      // Lock holder vanished without persisting (crash between lock and write):
      // take over rather than deadlock on its stale lock.
      try { fs.unlinkSync(lockPath); } catch { /* already gone */ }
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      haveLock = true;
    }
  ```
  ```suggested
  if (rows === null && !haveLock) {
      // Lock holder vanished without persisting (crash between lock and write):
      // take over rather than deadlock on its stale lock.
      try { fs.unlinkSync(lockPath); } catch { /* already gone */ }
      try {
        fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
        haveLock = true;
      } catch {
        // Another process re-ac
  ```

## src/hunter/harness/strike.ts
- **src/hunter/harness/strike.ts:53-53** (bug)
  The sort comparator violates the JavaScript sort contract: when `findingIdOf(a)` equals `findingIdOf(b)`, it returns 1 instead of 0. A comparator that returns a non-zero value for two elements that should be considered equal breaks transitivity (if A === B but cmp(A,B) !== 0, then cmp(B,A) !== -cmp(A,B)). This can cause runtime exceptions in some JavaScript engines and non-deterministic sort results in others. Even if IDs are guaranteed unique by contract, a robust comparator should handle equality explicitly.
  ```existing
  return findingIdOf(a) < findingIdOf(b) ? -1 : 1;
  ```
  ```suggested
  const idA = findingIdOf(a);
    const idB = findingIdOf(b);
    return idA < idB ? -1 : idA > idB ? 1 : 0;
  ```

## src/hunter/shared/containment.ts
- **src/hunter/shared/containment.ts:137-139** (bug)
  `requireContained` checks only `contained` but ignores the `resolved` flag. A path whose `resolved` is false means the real path was never determined (the result is the caller's unresolved spelling), so the containment check was performed against a possibly-symlink-escaping string. Callers using this convenience function get no indication that the containment guarantee is weak. Consider either asserting `resolved` or surfacing it to the caller.
  ```existing
  const { real, rootReal, contained } = checkContained(target, root);
  if (!contained) onViolation({ real, rootReal, target, root });
  return real;
  ```
  ```suggested
  const { real, rootReal, contained, resolved } = checkContained(target, root);
  if (!contained || !resolved) onViolation({ real, rootReal, target, root, resolved });
  return real;
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:575-577** (bug)
  The spec comment on line 16-17 states 'a file+rule shown in the last 3 results collapses to the count line', but the implementation uses `shown > 0` (line 575) — meaning the collapse kicks in after the very FIRST showing, not after 3. Either the comment is stale or the threshold is wrong. If the intent is truly to show 3 times before collapsing, the check should be `shown >= 3` (or similar).
  ```existing
  if (shown > 0) repeated += 1;
      else lines.push(`  ${severityPrefix(d.severity)}   ${d.ruleId}  ${d.message}  :${d.line}`);
      server.recordShow(touched, d.ruleId);
  ```
- **src/hunter/surface/lsp-injector.ts:345-350** (bug)
  `acquireWriteLock` calls `this.pause()` unconditionally, and `releaseWriteLock` calls `this.resume()` unconditionally. If the watcher was already paused before `acquireWriteLock`, then `releaseWriteLock` will incorrectly resume it. The resume should only occur if the write lock caused the pause, or the original paused state should be saved and restored.
  ```existing
  acquireWriteLock(): void {
    if (this.writeLock) throw new EngineError(GRAPH_UPDATE_CONFLICT, `${GRAPH_UPDATE_CONFLICT}: a write is already in progress — the watcher is paused`);
    this.writeLock = true; this.pause();
  }

  releaseWriteLock(): void { this.writeLock = false; this.resume(); }
  ```

## src/omp/adapters/tsg.ts
- **src/omp/adapters/tsg.ts:117-119** (security)
  The last 400 bytes of stdout and 200 bytes of stderr are embedded into the thrown error message. If the `tsg` CLI ever echoes the API key in its output (debug mode, verbose logging, or error messages from the server that include request context), the key will propagate to callers and potentially into logs or monitoring systems. Consider redacting any value that matches the key pattern before surfacing CLI output.
  ```existing
  const err = e as { message?: string; stdout?: unknown; stderr?: unknown };
        const out = String(err.stdout ?? "").slice(-400);
        const errOut = String(err.stderr ?? "").slice(-200);
  ```
  ```suggested
  const err = e as { message?: string; stdout?: unknown; stderr?: unknown };
        let stdoutSnippet = String(err.stdout ?? "").slice(-400);
        let stderrSnippet = String(err.stderr ?? "").slice(-200);
        // Redact the API key if it appears in CLI output
        if (key != null && key.length > 4) {
          const redacted = key.slice(0, 4) + "…";
          stdoutSnippet = stdoutSnippet.
  ```

## src/omp/fire-ledger.ts
- **src/omp/fire-ledger.ts:330-336** (bug)
  In `appendManyDetailed`'s fallback catch, the inner loop wraps non-LedgerError exceptions via `const err = inner instanceof LedgerError ? inner : new LedgerError(...)`, so raw driver exceptions are currently handled. However, the safety depends on `append` never throwing outside the LedgerError hierarchy (e.g. a corrupt DB handle throwing a raw driver exception that bypasses `guard()`). If that invariant breaks, the loop terminates, `notePersistFailure` is never called for the offending row, and the caller receives a partial/inaccurate result — defeating the 'every fire gets a row or a named failure' contract. A defensive outer catch around the entire fallback loop (or broadening the inner catch to always wrap) would make this robust against future refactors.

Suggested robust wrapping:
```typescript
for (const r of rows) {
  try {
    this.append(r);
    committed.push(r);
  } catch (inner) {
    const err = inner instanceof LedgerError
      ? inner
      : new LedgerError('APPEND_FAILED', 'row did not commit', inner);
    failed.push({ row: r, error: err });
    const bare = err.code.startsWith('GI_LEDGER_') ? err.code.slice('GI_LEDGER_'.length) : err.code;
    this.notePersistFailure(`GI_LEDGER_${bare}`, err.message);
  }
}
```
  ```existing
  for (const r of rows) {
        try {
          this.append(r);
          committed.push(r);
        } catch (inner) {
          const err = inner instanceof LedgerError ? inner : new LedgerError("APPEND_FAILED", "row did not commit", inner);
          failed.push({ row: r, error: err });
  ```
  ```suggested
  for (const r of rows) {
        try {
          this.append(r);
          committed.push(r);
        } catch (inner) {
          const err = inner instanceof LedgerError
            ? inner
            : new LedgerError("APPEND_FAILED", "row did not commit", inner);
          failed.push({ row: r, error: err });
          const bare = err.code.startsWith("GI_LEDGER_") ? err.code.slice("GI_LEDGER_"
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:52-55** (bug)
  When the corbell meta-write succeeds (lines 44-58), execution continues to line 59+. However, when the meta-write fails (inner catch on line 52), the ROLLBACK is attempted, and then a `new Error(...)` is thrown on line 54. This error propagates out of `populateSessionStore` as an **uncaught exception** — the function's return type promises `PopulateResult` but callers will receive a thrown Error instead. The corbell populate itself already succeeded (data was written by `populateFromCorbellCheckout`), so this meta-write failure should degrade gracefully: log the warning and return a successful `PopulateResult` rather than crashing the caller. Alternatively, wrap the entire corbell success path in a try/catch that returns a `PopulateResult` with a degraded flag.
  ```existing
  } catch (e) {
        try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        throw new Error(`GI_META_WRITE_FAILED: batch meta write for ${storePath} did not commit (${e instanceof Error ? e.message : String(e)})`);
      }
  ```
