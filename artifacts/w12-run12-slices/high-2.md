# HIGH slice 2 — 12 findings across 9 files

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

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:195-201** (bug)
  The D13 verbatim-quote guard is bypassable for non-string truthy values in declared predicates. `String(binding['verbatimQuote'] ?? '')` coerces any truthy non-string (e.g. number `42` → `'42'`, boolean `true` → `'true'`, object `{}` → `'[object Object]'`) into a non-empty string that passes the trim check. A declared predicate with `verbatimQuote: 42` would pass D13 without containing actual quoted doctrine text. The corpus path (`compileCards`) does not have this issue because `card.verbatimQuote` is already typed as `string | undefined` by the parser. Add an explicit `typeof` guard for the declared path.
  ```existing
  const verbatimQuote = String(binding['verbatimQuote'] ?? '');
    if (!verbatimQuote || verbatimQuote.trim() === '') {
      throw new LexiconError(
        'D13_VIOLATION',
        `D13_VIOLATION: declaredPredicate ${ruleId} lacks a verbatim quote — doctrine is QUOTED, never synthesized`,
      );
    }
  ```
  ```suggested
  const rawQuote = binding['verbatimQuote'];
    if (typeof rawQuote !== 'string' || rawQuote.trim() === '') {
      throw new LexiconError(
        'D13_VIOLATION',
        `D13_VIOLATION: declaredPredicate ${ruleId} lacks a verbatim quote — doctrine is QUOTED, never synthesized`,
      );
    }
    const verbatimQuote = rawQuote;
  ```

## src/hunter/shared/kind-for-layer.ts
- **src/hunter/shared/kind-for-layer.ts:7-7** (bug)
  Uses loose equality `==` for the null/undefined check, which violates the project's coding standard prohibiting `==` and `!=`. While `== null` is an intentional pattern to catch both `null` and `undefined`, it should be replaced with strict checks to comply with the rule. The null guard itself is correct and necessary.
  ```existing
  if (layerId == null || typeof layerId !== 'string') return 'Threshold';
  ```
  ```suggested
  if (layerId === null || layerId === undefined || typeof layerId !== 'string') return 'Threshold';
  ```

## src/kernel/graph-diff.ts
- **src/kernel/graph-diff.ts:136-141** (bug)
  The blast-radius comparison only checks nodes present in `after.topDegree` (top-5) against `before.topDegree`. A node that was NOT in the top-5 before (e.g., had 2 inbound edges) but now has a very high inbound count (e.g., 50) will appear in `after.topDegree`, but `beforeDeg.get(t.label)` returns `undefined` and the node is silently skipped. This means the most dramatic blast-radius jumps — nodes going from near-zero to very high — can go entirely undetected if they weren't already in the before snapshot's top-5. To properly detect all blast-radius jumps, consider maintaining the full inbound map (not just top-5) in the snapshot, or at minimum building a complete `beforeDeg` map from the full snapshot data.
  ```existing
  const beforeDeg = new Map(before.topDegree.map((t) => [t.label, t.inbound]));
  const blastRadiusChanges: GraphDiffResult["blastRadiusChanges"] = [];
  for (const t of after.topDegree) {
    const b = beforeDeg.get(t.label);
    if (b !== undefined && t.inbound > b) blastRadiusChanges.push({ label: t.label, before: b, after: t.inbound });
  }
  ```
  ```suggested
  // Build full inbound maps for complete blast-radius comparison
  const beforeInbound = new Map<string, number>();
  for (const [cid, count] of before.fullInbound) {
    const node = beforeNodesByCid.get(cid);
    beforeInbound.set(node?.label ?? cid, count);
  }
  const afterInbound = new Map<string, number>();
  for (const [cid, count] of after.fullInbound) {
    const node = afterNodesByCid.get
  ```

## src/omp/enforcement.ts
- **src/omp/enforcement.ts:128-128** (bug)
  The design comments promise fail-OPEN handles timeouts ("a timeout … SKIPS with a named reason") and the evidence scan catch labels itself "TSG_TIMEOUT", but no timeout is enforced on either `deps.judge.evaluate()` or `deps.loadUnit.retrieve()`. If an engine hangs (e.g., model cold-start, network stall), these `await` calls block indefinitely — the caller (an editor surface per R5) wedges, contradicting the fail-OPEN/fail-CLOSED polarity contract. Wrap calls in `Promise.race` with a timeout (e.g., via `AbortController` or a `setTimeout`-based reject) appropriate to each layer.
  ```existing
  answers = await deps.judge.evaluate({ diff: input.diff, task: input.task }, input.rules);
  ```
  ```suggested
  // Enforce the ~300ms fail-open budget stated in the kernel header.
    const JUDGE_TIMEOUT_MS = 5_000;
    answers = await Promise.race([
      deps.judge.evaluate({ diff: input.diff, task: input.task }, input.rules),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("judge timeout")), JUDGE_TIMEOUT_MS),
      ),
    ]);
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

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:228-228** (bug)
  `factsFor()` silently drops consumers that return non-array `facts()` via `console.error` + `continue`, but `auditOne()` returns a `GI_LAYER_ERROR` verdict. This is by design (documented as F-707), but `console.error` output is ephemeral and may be lost in production log aggregation. If the caller relies on `factsFor()` alone (without also calling `audit()`), the non-array fault is invisible. The method should consider returning an augmented result or a second return value that surfaces faults, so callers get the same fidelity as `audit()`.
  ```existing
  if (!Array.isArray(got)) { console.error('[layer-registry] factsFor: consumer ' + p.id + ' returned non-array facts - see audit GI_LAYER_ERROR:' + p.id); continue; }
  ```
  ```suggested
  // Option: return { facts: LayerFact[], faults: { consumer: ConsumerId; reason: string }[] }
// so callers of factsFor() can detect mid-query faults without calling audit() separately.
  ```

## src/scoping/scope-binding.ts
- **src/scoping/scope-binding.ts:109-118** (maintainability)
  The longest-prefix matching pattern (`[...allPrefixes].sort((a, b) => b.length - a.length)` + linear scan) is duplicated in `ownerOf`, `isForeignWave`, `assertOwnWave`, and `assertAliasNamespace` (4 places). This increases maintenance burden and the risk of inconsistency if one site is updated but others are missed. Extract a shared helper (e.g., `findLongestMatchingPrefix(waveId, prefixes)`) and reuse it everywhere.
  ```existing
  ownerOf(waveId: string): ScopeBinding | null {
    // ★ F-207 FIX (2026-09-24): LONGEST-prefix match — first-match over
    //   registration order misattributes overlapping namespaces (wave- vs
    //   wave-extra-). F-132 only refused exact duplicates, not overlaps.
    const sorted = [...this.prefixes.entries()].sort((a, b) => b[0].length - a[0].length);
    for (const [, b] of sorted) {
      
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
