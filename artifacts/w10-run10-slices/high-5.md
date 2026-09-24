# HIGH slice 5 — 10 findings across 8 files

## src/hunter/graph/mechanical.ts
- **src/hunter/graph/mechanical.ts:30-35** (performance)
  Performance issue: `evidenceQuoteForNode` calls `sf.getFullText().split('\n')` on every invocation. For a file with N nodes, this creates N copies of the full line array — O(fileSize × numNodes) per file. On large source files (thousands of lines, hundreds of nodes) this is a significant waste. Consider caching the split lines per source file (e.g., in a `Map<ts.SourceFile, string[]>`) or using `sf.getLineAndCharacterOfPosition` + text slicing to extract the line without splitting the entire file.
  ```existing
  function evidenceQuoteForNode(sf: tsImport.SourceFile, node: tsImport.Node): string {
  const line = lineOf(sf, node);
  try {
    const text = sf.getFullText();
    const lines = text.split('\n');
    const raw = lines[line - 1] ?? node.getText(sf);
  ```
  ```suggested
  // Cache lines per source file to avoid re-splitting on every call.
const lineCache = new WeakMap<tsImport.SourceFile, string[]>();

function evidenceQuoteForNode(sf: tsImport.SourceFile, node: tsImport.Node): string {
  const line = lineOf(sf, node);
  try {
    let lines = lineCache.get(sf);
    if (!lines) {
      lines = sf.getFullText().split('\n');
      lineCache.set(sf, lines);
    }
    c
  ```

## src/hunter/keys/go-key-pool.ts
- **src/hunter/keys/go-key-pool.ts:499-500** (bug)
  The `dropped` variable in `goEarliestDeadIdx` is declared as `let dropped = 0` on line 499, returned in the object on line 513, but is **never incremented anywhere** in the function body. The only iteration logic is the `GO_KEYS.forEach` loop which calls `seen++` but never `dropped++`. This means `dropped` is always 0, making the return field useless dead data. Either the increment was lost during the V21/C7 merge, or the field should be removed from the return type and callers. If any consumer relies on `dropped > 0` to detect degraded state, it will silently never trigger.
  ```existing
  let dropped = 0;
    let best = -1;
  ```
  ```suggested
  // If 'dropped' is meant to track rows discarded during merge, add the increment:
//   if (/* row was merged away */) dropped++;
// If 'dropped' is vestigial, remove from the return type and all callers.
  ```
- **src/hunter/keys/go-key-pool.ts:172-178** (bug)
  In the `db()` function's error handling (line 181), the caught error is unconditionally cast to `NodeJS.ErrnoException` via `const c = e as NodeJS.ErrnoException` without a type guard. If the thrown error is not an `ErrnoException` (e.g., a string or a custom error class), `c.code` will be `undefined`, causing both `if (c.code === 'ELOOP')` and `if (c.code !== 'EEXIST')` to fall through — the function would silently skip both branches and proceed to create a `Database` on a potentially compromised path. Use a proper type guard: `e && typeof e === 'object' && 'code' in e`.
  ```existing
  const c = e as NodeJS.ErrnoException;
    if (c.code === 'ELOOP') {
      // W20: ELOOP = pre-planted SYMLINK — refuse loudly, never chmod/open
      // through it (the old branch hardened the PLANT's target).
      throw new Error(`GO_POOL_SYMLINK: ${want} is a symlink plant — refusing (remove it or set GO_POOL_DB)`);
    }
    if (c.code !== 'EEXIST') throw e;
  ```
  ```suggested
  if (e && typeof e === 'object' && 'code' in e) {
      const c = e as { code: string };
      if (c.code === 'ELOOP') {
        throw new Error(`GO_POOL_SYMLINK: ${want} is a symlink plant — refusing (remove it or set GO_POOL_DB)`);
      }
      if (c.code !== 'EEXIST') throw e;
    } else {
      throw e;
    }
  ```

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:127-132** (bug)
  `loadBattery` acquires a prepared statement via `db.prepare(...)` but never finalizes it. In bun:sqlite (which this codebase targets, per the F-358 comments), `prepare()` allocates a native handle per statement. `stmt.all()` executes and returns results, but the `Statement` object is immediately discarded without `finalize()`, leaking the native handle on every call. This is the exact class of leak that the F-358 fixes addressed in `writeBattery` and `writeRuleCards`.
  ```existing
  export function loadBattery(db: DbClient, batteryVersion: string): CompiledPredicate[] {
  const rows = db.prepare(
    'SELECT id,family,template,bindings,verbatim_quote,anchor,severity,check_code,battery_version FROM compiled_predicates WHERE battery_version = ?',
  ).all(batteryVersion);
  return rows.map((row) => rehydrate(row));
}
  ```
  ```suggested
  export function loadBattery(db: DbClient, batteryVersion: string): CompiledPredicate[] {
  const stmt = db.prepare(
    'SELECT id,family,template,bindings,verbatim_quote,anchor,severity,check_code,battery_version FROM compiled_predicates WHERE battery_version = ?',
  );
  try {
    const rows = stmt.all(batteryVersion);
    return rows.map((row) => rehydrate(row));
  } finally {
    try { stmt.fi
  ```

## src/hydra/pipeline.ts
- **src/hydra/pipeline.ts:78-84** (performance)
  Performance: Graph is loaded from disk N+1 times. The pipeline loads the graph via `readGraphJson(graphPath)` at line 91 and passes it as the `graph` parameter to each `spec.run(input, graph)`. However, `specForTemplate` ignores the pre-loaded graph (`_graph` parameter) and passes the `graphPath` string to `runTemplateAudit`, which calls `readGraphJson(graphPath)` again internally (auditor.ts:990). `readGraphJson` has no caching — it performs a full stat, read, parse, and normalize on every call. For a pipeline with N subagents, this means N+1 full graph loads from disk. The fix is to either pass the already-loaded `GraphifyGraph` directly into `runTemplateAudit` (adding a `graph?: GraphifyGraph` field to `RunTemplateAuditArgs`), or have `specForTemplate`'s `run` closure capture and use the `_graph` parameter instead of re-loading.
  ```existing
  run: async (input, _graph) =>
      runTemplateAudit({
        template,
        ledgerDir: `${ledgerRoot}/${template.layerId}`,
        targetRoot: input.targetRoot,
        graphPath: input.graphPath,
      }),
  ```
  ```suggested
  run: async (input, graph) =>
      runTemplateAudit({
        template,
        ledgerDir: `${ledgerRoot}/${template.layerId}`,
        targetRoot: input.targetRoot,
        graphPath: input.graphPath,
        graph, // pass pre-loaded graph to avoid redundant disk I/O
      }),
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:140-142** (bug)
  **Bug: `response.text()` throw inside `!response.ok` block loses the HTTP error context.**

If `response.text()` throws (network error, body already consumed, etc.), the inner catch swallows it and `detail` stays `""`. The `return` on the next line still executes and produces `"SCAN_HTTP_500: Internal Server Error"` (no body detail — acceptable). **However**, the real bug is that if `response.text()` is itself a network-level failure (e.g., connection reset mid-read of the error body), the thrown error propagates to the **outer** catch block (line 201) instead of being caught by the inner catch. The outer catch then returns `"ERROR: Unknown error"` — the HTTP status code, status text, and the entire reason string are lost. The retry logic (line 252) then sees an unrecognized `ERROR:` message, which doesn't match `RETRYABLE_RE`, and immediately breaks to the next rung. A transient 500 that temporarily fails to yield its body is thus treated as fatal.

**Fix:** Return directly from the inner catch, or restructure so the `return` is inside the try block after `detail` is assigned.
  ```existing
  let detail = "";
      try { detail = (await response.text()).slice(0, 200); } catch { /* body unreadable — status alone is the signal */ }
      return { ok: false, reason: `SCAN_HTTP_${response.status}: ${response.statusText ?? ""}${detail ? ` — ${detail}` : ""}` };
  ```
  ```suggested
  let detail = "";
      try { detail = (await response.text()).slice(0, 200); } catch { /* body unreadable — status alone is the signal */ }
      return { ok: false, reason: `SCAN_HTTP_${response.status}: ${response.statusText ?? ""}${detail ? ` — ${detail}` : ""}` };
  ```
- **src/kernel/scan-chain.ts:167-172** (bug)
  **Bug: Race between `setInterval` callback and `clearInterval` can cause false-positive STALL on a stream that completed normally.**

The `setInterval` (line 117) and `clearInterval` (line 170) are not atomic with respect to the `dead` flag. A false-positive STALL occurs in this sequence:
1. Stream loop breaks on `done === true` (line 158) — the response is complete.
2. Main thread returns from `reader.read()`, executes `reader.cancel()` in `finally`, and is about to call `clearInterval`.
3. The interval callback fires (it was already queued in the event loop). `dead` is still `false`. `Date.now() - lastActivity` may exceed `stallMs` (if processing took time). Callback sets `dead = true` and calls `controller.abort()`.
4. Main thread calls `clearInterval(stallTimer)` — too late, the callback already ran.
5. Main thread reaches line 172: `if (dead)` is `true`. Returns `STALL` — **incorrectly** discarding a fully-received response.

**Fix:** Check `done`/completion state before the `dead` flag, or use a `completed` boolean set immediately after the read loop to gate the stall check:
```typescript
let completed = false;
try { for (;;) { ... } } finally { reader.cancel(); }
completed = true; // set before clearInterval
if (dead && !completed) return { ok: false, reason: `STALL: ...` };
```
  ```existing
  } finally {
      reader.cancel().catch(() => {}); // release the underlying connection
    }
    clearInterval(stallTimer);

    if (dead) return { ok: false, reason: `STALL: no tokens for ${stallMs / 1000}s` };
  ```
  ```suggested
  } finally {
      reader.cancel().catch(() => {}); // release the underlying connection
    }
    clearInterval(stallTimer);

    // Guard: even if `dead` was set by a late-firing interval callback after
    // the loop completed normally, the stream is not stalled.
    if (dead && !streamComplete) return { ok: false, reason: `STALL: no tokens for ${stallMs / 1000}s` };
  ```

## src/omp/decision.ts
- **src/omp/decision.ts:211-212** (bug)
  Missing runtime validation for `intent` — the same defect pattern that was fixed for every other public parameter (`scopeRoot`, `target`, `act.toolName`, `act.target`, `act.queriedBefore`). `intent` is typed as a string union (`"consume" | "declare" | "mutate" | "measure"`) but TypeScript types are erased at runtime; an invalid value (e.g., `undefined`, `"delete"`) propagates silently into `graphFacts`, which may produce unexpected verdicts or SQL errors. Add a typeof+allowlist guard consistent with the sibling entry point's discipline.
  ```existing
  const storePath = corbellCheckoutPath(scopeRoot);
  const verdicts = graphFacts({ storePath, target, intent });
  ```
  ```suggested
  const validIntents = ["consume", "declare", "mutate", "measure"] as const;
  if (typeof intent !== "string" || !validIntents.includes(intent as typeof validIntents[number])) {
    throw new Error(`GI_DECIDE_BAD_INPUT: intent must be one of ${validIntents.join(", ")}; got ${JSON.stringify(intent)}`);
  }
  const storePath = corbellCheckoutPath(scopeRoot);
  const verdicts = graphFacts({ storePath, 
  ```

## src/omp/graph-gate.ts
- **src/omp/graph-gate.ts:219-221** (bug)
  `computeDrift` mutates `state.gateState` as a side-effect, but `gateDecision` also sets `gateState`. Both functions independently overwrite the same field, creating conflicting state transitions. Specifically, when `d.drift === 0`, `computeDrift` sets `gateState = "IDLE"`, but if prior edits exist (even if fully verified), `gateDecision` immediately overwrites it to `"TRACKING"` (because `d.drift > 0` is checked separately). The real danger: if `computeDrift` is called independently or out of order (e.g. for reporting/dashboarding), it silently resets `gateState` to IDLE/TRACKING regardless of the actual gate tier that was enforced. `computeDrift` should NOT set `gateState` — that is `gateDecision`'s exclusive responsibility. Remove the two assignments from `computeDrift`.
  ```existing
  state.drift = drift;
  return { drift, unverifiedCount, verifiedSymbols, lastGraphQuery };
}
  ```
  ```suggested
  state.drift = drift;
  return { drift, unverifiedCount, verifiedSymbols, lastGraphQuery };
}

// NOTE: state.gateState is set exclusively by gateDecision(). computeDrift
// only computes the numeric drift value — it must not modify gateState.
  ```

## src/omp/rsi.ts
- **src/omp/rsi.ts:272-275** (security)
  `Buffer.from(r.sig, "hex")` silently drops non-hex characters rather than throwing or returning an error. A malformed signature like `"a".repeat(64) + "ZZ"` (66 chars) produces a 32-byte buffer, while a valid 32-byte HMAC produces a 64-char hex string — so the length check `a.length !== b.length` passes despite the signature being invalid. The `timingSafeEqual` then incorrectly returns `true`, causing a forged row to be treated as verified.

Add explicit hex-format validation before the comparison:
  ```existing
  const a = Buffer.from(expect, "hex");
    const b = Buffer.from(r.sig, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  ```
  ```suggested
  // Reject non-hex signatures outright — Buffer.from silently drops invalid chars
    if (!/^[0-9a-f]{64}$/i.test(r.sig)) return false;
    const a = Buffer.from(expect, "hex");
    const b = Buffer.from(r.sig, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  ```
