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
