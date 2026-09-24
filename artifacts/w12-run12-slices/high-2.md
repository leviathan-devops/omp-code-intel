# HIGH slice 2 — 11 findings across 8 files

## src/hunter/graph/mechanical.ts
- **src/hunter/graph/mechanical.ts:242-245** (bug)
  The `visit` function recurses via `ts.forEachChild` with no depth guard. While typical TypeScript ASTs are not deeply nested, pathological inputs (deeply chained expressions like `a + b + c + ... + z` with hundreds of operands, or deeply nested arrow callbacks) can produce ASTs thousands of nodes deep, blowing the Node.js default call stack (~11k–15k frames). Consider converting to an explicit stack-based iterative traversal, or at minimum adding a depth counter that throws `MechanicalExtractionError` at a configurable ceiling (e.g., 1000).
  ```existing
  const visit = (node: tsImport.Node, parent: tsImport.Node | undefined): void => {
      const prevClass = currentClass;
      const prevFn = currentFnId;
      try {
  ```
  ```suggested
  const MAX_DEPTH = 1000;
    const visit = (node: tsImport.Node, parent: tsImport.Node | undefined, depth = 0): void => {
      if (depth > MAX_DEPTH) {
        throw new MechanicalExtractionError(`AST depth exceeds ${MAX_DEPTH} at ${relPosix}:${lineOf(sf, node)} — possible pathological input`);
      }
      const prevClass = currentClass;
      const prevFn = currentFnId;
      try {
  ```

## src/hunter/log.ts
- **src/hunter/log.ts:7-11** (bug)
  Null/undefined safety: If `p` is null or undefined, `p.length` will throw a TypeError at runtime. Since this is a utility function that may receive user-provided paths, add a guard clause to handle falsy input gracefully.
  ```existing
  export function shortFile(p: string, n = 46): string {
  // ★ F-242 FIX (2026-09-24): small-n correctness — slice(-(n-1)) with n=1 is
  //   slice(0), the WHOLE string, so '…'+p came out longer than p. n<=1 returns a
  //   truncated ellipsis; n>=2 behavior is unchanged.
  if (p.length <= n) return p;
  ```
  ```suggested
  export function shortFile(p: string, n = 46): string {
  if (p == null) return '';
  if (p.length <= n) return p;
  ```

## src/hunter/tools/report-writer-local.ts
- **src/hunter/tools/report-writer-local.ts:53-59** (bug)
  The regex `/^#{2,6} /m` does not exclude Markdown fenced code blocks (``` ... ```). If the report body contains a fenced code block with lines like `## Example` or `### ```json`, the `s.search(/^#{2,6} /m)` at line 43 will match inside the code fence, causing unintended heading promotion and corruption of the report's code-block content. Consider using a regex that skips fenced code blocks (e.g., strip fenced blocks before matching, or use a state-machine scan).
  ```existing
  const deepIdx = s.search(/^#{2,6} /m);
    if (deepIdx !== -1) {
      const before = s.slice(0, deepIdx);
      const after = s.slice(deepIdx).replace(/^#{2,6}[ ]?/, "# ");
      s = before + after;
      idx = s.search(/^# /m);
    }
  ```

## src/omp/adapters/tsg.ts
- **src/omp/adapters/tsg.ts:122-123** (security)
  **Key redaction is fragile and may leak partial key material**: The `split(key).join(replacement)` approach only catches *exact, contiguous* occurrences of the key. It will miss:
1. Partial key exposure (e.g., the last 8 chars of the key in a stack trace or echo)
2. Key encoded via base64, URL-encoding, or case changes by the CLI or an intermediate layer
3. A key that is a substring of a longer token that happens to be printed

Consider redacting via a regex `new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')` for correctness, and additionally scrubbing the last N characters of the key as a partial-match heuristic.
  ```existing
  const redact = (s: string): string =>
          key !== null && key.length > 0 ? s.split(key).join(key.slice(0, 4) + '...[redacted]') : s;
  ```

## src/omp/gate-hook.ts
- **src/omp/gate-hook.ts:71-71** (bug)
  **`pendingSteer` memory leak — no TTL sweep or cap**: Unlike `pendingQueries` (which has `sweepStaleQueries` with a 120s TTL and a per-sid cap of 10), `pendingSteer` has no cleanup mechanism. If a `tool_result` never arrives (agent abort, timeout, crash, or an exception thrown by `attachGiGraphGate`'s `tool_call` handler cancelling the frame before the tool executes), the entry in `pendingSteer` persists for the lifetime of the process. Over long-running sessions with repeated aborted tool calls, this Map grows without bound.

Suggestion: Add a TTL sweep and/or a max-entries cap analogous to `pendingQueries`, e.g.:
```typescript
const PENDING_STEER_TTL_MS = 120_000;
// In each tool_call, sweep stale entries:
const now = Date.now();
for (const [sid, q] of pendingSteer) {
  const live = q.filter((e) => now - (e.enqueuedAt ?? 0) <= PENDING_STEER_TTL_MS);
  if (live.length === 0) pendingSteer.delete(sid);
  else pendingSteer.set(sid, live);
}
// Also add `enqueuedAt: Date.now()` to the pushed object.
```
  ```existing
  const pendingSteer = new Map<string, Array<{ tool: string; note: string }>>();
  ```
- **src/omp/gate-hook.ts:193-197** (bug)
  **`states` map memory leak for edit-only sessions**: The `states` Map is only evicted inside the `tool_result` handler for graph queries (line 300: `if (!pendingQueries.has(sid)) states.delete(sid)`). Sessions that only perform write/edit operations and never issue graph queries will accumulate `GraphGateSessionState` entries in `states` that are never deleted. Over time, this is an unbounded memory leak for edit-heavy workflows.

Suggestion: Add eviction logic when a session's drift is reset or when a session is detected as inactive. For example, evict the state entry when the session has been idle for a prolonged period, or when `gateDecision` returns T3 (the session is already aborting, so the state can be cleaned up):
```typescript
if (g.tier === "T3") {
  states.delete(sid); // session is aborting; no further edits from this session will be processed
  throw new Error(...);
}
```
  ```existing
  let st = states.get(sid);
    if (!st) {
      st = createEmptyState();
      states.set(sid, st);
    }
  ```

## src/omp/layer-consumption.ts
- **src/omp/layer-consumption.ts:117-124** (bug)
  `consumptionAudit` builds its own summary string (lines 117-121) but omits `GI_LAYER_ERROR` verdicts, which were added to `layer-registry.ts`'s `summary()` in the F-708 FIX. Consumers that threw mid-query (`verdict.startsWith('GI_LAYER_ERROR')`) are excluded from the summary string, so an operator sees `consumed:6/8` with no hint that some consumers faulted. The registry's own `summary()` method already handles this (line 252 of layer-registry.ts). This creates a two-view drift: `consumptionAudit.summary` and `registry.summary(subject)` disagree for the same subject when `GI_LAYER_ERROR` consumers exist. Either reuse `registry.summary(subject)` here, or add the missing `GI_LAYER_ERROR` bucket to match.
  ```existing
  const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
  const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
  const parts = [
    `consumed:${consumed.length}/${reports.length}`,
    `rungs=${[...new Set(consumed.map((r) => r.rung))].sort().join(",") || "none"}`,
  ];
  if (unconsumed.length > 0) parts.push(`GI_LAYER_UNCONSUMED=${unconsumed.map((r) => r.cons
  ```
  ```suggested
  const errors = reports.filter((r) => r.verdict.startsWith("GI_LAYER_ERROR"));
  const down = reports.filter((r) => r.verdict === "GI_LAYER_DOWN");
  const unconsumed = reports.filter((r) => r.verdict === "GI_LAYER_UNCONSUMED");
  const parts = [
    `consumed:${consumed.length}/${reports.length}`,
    `rungs=${[...new Set(consumed.map((r) => r.rung))].sort().join(",") || "none"}`,
  ];
  if (uncon
  ```

## src/omp/typed-write.ts
- **src/omp/typed-write.ts:367-369** (bug)
  BUG: NaN propagation bypasses the [0,1] clamp. If `opts.ageDays` is NaN (e.g., caller passes an undefined arithmetic result), `Math.exp(-NaN / tau)` evaluates to NaN. Then `base * corr * NaN` = NaN. The final `Math.max(0, Math.min(1, NaN))` evaluates to NaN because `Math.min(1, NaN)` = NaN and `Math.max(0, NaN)` = NaN. This stores a non-numeric confidence in SQLite, which downstream consumers may not expect. Add a NaN guard after the multiplication or on the input.
  ```existing
  const fresh =
    typeof opts.ageDays === "number" && opts.ageDays > 0 ? Math.exp(-opts.ageDays / tau) : 1.0;
  const confidence = Math.max(0, Math.min(1, base * corr * fresh));
  ```
  ```suggested
  const fresh =
    typeof opts.ageDays === "number" && opts.ageDays > 0 ? Math.exp(-opts.ageDays / tau) : 1.0;
  const raw = base * corr * fresh;
  const confidence = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : DERIVATION_BASE["unknown"]!;
  ```

## src/scoping/scoped-store.ts
- **src/scoping/scoped-store.ts:62-65** (bug)
  WAL mode failure is silently swallowed. The entire module's design ("the 8-session law") exists to prevent the whole-file-rewrite race by using SQLite WAL mode. If WAL silently falls back to rollback journal mode, the fundamental safety property of this module is lost — concurrent writers will clobber each other's rows again. This should at minimum log a loud warning so operators know the race condition mitigation is degraded.
  ```existing
  try {
    fresh.exec('PRAGMA journal_mode = WAL;');
    fresh.exec('PRAGMA busy_timeout = 5000;');
  } catch (_nonfatal) { /* some filesystems refuse WAL — non-fatal */ }
  ```
  ```suggested
  try {
    fresh.exec('PRAGMA journal_mode = WAL;');
    fresh.exec('PRAGMA busy_timeout = 5000;');
  } catch (walErr) {
    // WAL is the ONLY protection against the whole-file-rewrite race.
    // Falling back to rollback journal silently reintroduces the race.
    console.error(`[scoped-store${opts?.id ? ' ' + opts.id : ''}] WAL mode FAILED — falling back to rollback journal (race-condition prot
  ```
- **src/scoping/scoped-store.ts:74-77** (bug)
  After 3 failed schema attempts the broken handle is still assigned to `storeDb` and returned to callers. Every subsequent operation will fail with missing-table errors, and the broken handle will be reused indefinitely (the health-check SELECT 1 passes even without the tables). The handle should be closed and NOT cached so the next call retries fresh.
  ```existing
  if (attempt === 2) {
          console.error(`[scoped-store${opts.id ? ' ' + opts.id : ''}] schema setup failed after 3 attempts:`, e instanceof Error ? e.message : String(e));
          break; // boot continues; downstream fails WARN-soft (the v6 behavior)
        }
  ```
  ```suggested
  if (attempt === 2) {
          console.error(`[scoped-store${opts.id ? ' ' + opts.id : ''}] schema setup failed after 3 attempts — evicting broken handle:`, e instanceof Error ? e.message : String(e));
          try { fresh.close(); } catch { /* best effort */ }
          throw e; // do not cache a broken handle; caller retries or fails loud
        }
  ```
- **src/scoping/scoped-store.ts:95-96** (bug)
  closeStoreDb() clears storeOpenInFlightByPath without resolving or rejecting the pending promises. Any caller awaiting a gate promise from that map will hang indefinitely — the Promise never settles. Before clearing, all pending gates should be rejected so callers fail fast and can retry.
  ```existing
  // ★ F-537 FIX (2026-09-24): the in-flight async-open gate survived close — a later getStoreDbAsync reused the resolved gate and returned a stale/closed handle. Close clears every pending gate so the next open starts fresh.
  storeOpenInFlightByPath.clear();
  ```
  ```suggested
  // ★ F-537 FIX (2026-09-24): the in-flight async-open gate survived close — a later getStoreDbAsync reused the resolved gate and returned a stale/closed handle. Close clears every pending gate so the next open starts fresh.
  for (const [k, gate] of storeOpenInFlightByPath) {
    // Reject pending gates so callers fail-fast instead of hanging forever.
    // The rejection is caught by caller try/c
  ```
