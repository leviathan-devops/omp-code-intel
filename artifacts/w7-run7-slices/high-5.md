# HIGH slice 5 — 8 findings across 7 files

## src/hunter/graph/merge.ts
- **src/hunter/graph/merge.ts:113-116** (bug)
  Semantic triples are not deduplicated by key. Mechanical triples are deduplicated via `seenMechanicalKeys` (lines 105-108), but the semantic loop (line 116) iterates over all semantic triples without any key-based dedup. If two semantic triples share the same subject|predicate|object key (e.g. extracted by overlapping sources), both will be pushed into `merged`, producing duplicate output rows. Add a `seenSemanticKeys` set analogous to the mechanical one, or deduplicate `semantic` before the loop.
  ```existing
  for (const s of semantic) {
    const k = tripleKey(s);
    const pair = subjectObjectKey(s);
    const mechExact = index.byKey.get(k);
  ```
  ```suggested
  const seenSemanticKeys = new Set<string>();
  for (const s of semantic) {
    const k = tripleKey(s);
    if (seenSemanticKeys.has(k)) continue;
    seenSemanticKeys.add(k);
    const pair = subjectObjectKey(s);
    const mechExact = index.byKey.get(k);
  ```

## src/hunter/hooks/bus-hook.ts
- **src/hunter/hooks/bus-hook.ts:98-103** (bug)
  The `break` on a non-numeric-id poison row halts intake without advancing the cursor past it. On the next poll, `WHERE id > ?` re-selects the same poison row, breaking again — a permanent stall. The F-348 comment claims "the cursor already covers every clean row before it," but it does NOT cover the poison row itself. Additionally, all clean rows *after* the poison row are lost from both `clean` and cursor advancement, so they will be re-fetched (and re-broken) on every subsequent poll. Since this is supposed to be defense-in-the-depth, it should use `continue` after logging (accepting that the poison row id is unusable for the cursor) or otherwise ensure forward progress.
  ```existing
  const sig = JSON.stringify(row).slice(0, 160);
        if (!this.poisonLogged.has(sig)) {
          this.poisonLogged.add(sig);
          console.error(`[hydra-bus] POISON events row (non-numeric id, intake halted past cursor ${this.cursor}): ${sig}`);
        }
        break;
  ```
  ```suggested
  const sig = JSON.stringify(row).slice(0, 160);
        if (!this.poisonLogged.has(sig)) {
          this.poisonLogged.add(sig);
          console.error(`[hydra-bus] POISON events row (non-numeric id, skipped past cursor ${this.cursor}): ${sig}`);
        }
        // Advance cursor so this non-numeric row is never re-selected.
        // We cannot use row.id (it is not a number), so the cursor sta
  ```

## src/hydra/auditor.ts
- **src/hydra/auditor.ts:517-517** (bug)
  **Bug (buffer corruption in multi-chunk reads):** The 3rd argument to `fs.readSync` (buffer destination offset) is hardcoded to `0` instead of `total`. On each loop iteration, data is written to the **beginning** of the buffer, overwriting the previous chunk. Compare with the correct implementation in `makeCappedReadTool` (line 138) which correctly passes `total` as the buffer offset.

Currently latent because the files quoted for evidence are typically small enough to fit in a single read call, but this is a correctness bug that will silently produce corrupted/wrong evidence quotes if any source file exceeds a single read chunk (~16KB on most systems).

Additionally, the ternary `total >= 0 ? buf.subarray(total) : buf` is always true (total starts at 0 and only increases), making the dead branch unreachable and misleading.
  ```existing
  const n = fs.readSync(fd, total >= 0 ? buf.subarray(total) : buf, 0, size - total, total);
  ```
  ```suggested
  const n = fs.readSync(fd, buf, total, size - total, total);
  ```

## src/hydra/map-reader.ts
- **src/hydra/map-reader.ts:83-84** (bug)
  `normalizeGraph` casts raw JSON arrays (`rawNodes`, `rawLinks`) to `Record<string, unknown>[]` without verifying element types. If `graph.json` contains non-object elements (numbers, nulls, strings) in the nodes or edges arrays, property access like `r["id"]`, `e["source"]` silently produces empty-string IDs rather than failing with a clear parse-time error. This can cause subtle downstream bugs (phantom empty-ID nodes, broken edge references) that are hard to trace back to the source file.
  ```existing
  const rawNodes = (raw["nodes"] as unknown[]) ?? [];
  const rawLinks = ((raw["links"] as unknown[]) ?? (raw["edges"] as unknown[]) ?? []) as Record<string, unknown>[];
  ```
  ```suggested
  const rawNodes = (raw["nodes"] as unknown[]) ?? [];
  const rawLinks = ((raw["links"] as unknown[]) ?? (raw["edges"] as unknown[]) ?? []) as unknown[];

  // Validate elements are objects before mapping
  for (const [i, n] of rawNodes.entries()) {
    if (n === null || typeof n !== "object" || Array.isArray(n)) {
      throw new Error(`GRAPHIFY_PARSE_INVALID: nodes[${i}] is not an object — got ${t
  ```
- **src/hydra/map-reader.ts:74-79** (security)
  The 128MB `GRAPH_LOAD_BUDGET_BYTES` budget guards file size on disk, but `JSON.parse` can expand deeply nested or adversarial payloads to many multiples of their byte size in memory. A 128MB file with deeply nested objects could consume gigabytes of heap during parse, bypassing the intended OOM protection. Consider adding a runtime heap-usage check before/after parse, or using a streaming JSON parser for large graphs.
  ```existing
  function parseGraphJson(contents: string, size: number): Record<string, unknown> {
  const byteLen = size > 0 ? size : Buffer.byteLength(contents, "utf-8");
  if (byteLen > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${byteLen} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`);
  }
  return JSON.p
  ```
  ```suggested
  function parseGraphJson(contents: string, size: number): Record<string, unknown> {
  const byteLen = size > 0 ? size : Buffer.byteLength(contents, "utf-8");
  if (byteLen > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${byteLen} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`);
  }
  // Post-parse
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:155-164** (bug)
  When the abort controller fires or an exception is thrown, the ReadableStream reader is never cancelled. This leaks the underlying TCP/socket connection held by the Response body. The reader should be cancelled in both the normal break/error paths within the loop and in the outer catch block to ensure deterministic resource cleanup.
  ```existing
  for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      lastActivity = Date.now(); // ← THE EVENT: tokens are flowing, reset the timer
      full += decoder.decode(value, { stream: true });
      if (dead) break;
    }
    clearInterval(stallTimer);

    if (dead) return { ok: false, reason: `STALL: no tokens for ${stallMs / 1000}s` };
  ```
  ```suggested
  try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        lastActivity = Date.now();
        full += decoder.decode(value, { stream: true });
        if (dead) break;
      }
    } catch {
      // Read may throw after abort — fall through to cleanup
    } finally {
      reader.cancel().catch(() => {}); // release the underlying connection
      
  ```

## src/omp/fire-ledger.ts
- **src/omp/fire-ledger.ts:642-646** (bug)
  Proxy method identity is broken for ALL methods except `judge`. The `get` trap calls `v.bind(target)` on every access, returning a new function object each time. This means `gated.close === gated.close` is always false, breaking any caller that relies on method reference equality (memoisation keys, effect deps, spy assertions, `instanceof`-style checks). The comment on line 397 explicitly acknowledges this was fixed for `judge` (Audit Finding 6 — "ONE wrapper, built once"), but the identical problem remains for every other method. Apply the same caching pattern to all bound methods.
  ```existing
  get(target, prop) {
      if (prop === "judge") return judgeWithPersist;
      const v = Reflect.get(target, prop, target);
      return typeof v === "function" ? v.bind(target) : v;
    },
  ```
  ```suggested
  // ★ AUDIT FINDING 6 EXTENDED — ALL bound methods must be cached, not just judge.
    // A new .bind() on every get() breaks method identity (gated.close === gated.close).
    const methodCache = new Map<string | symbol, Function>();
    get(target, prop) {
      if (prop === "judge") return judgeWithPersist;
      const v = Reflect.get(target, prop, target);
      if (typeof v !== "function") ret
  ```

## src/omp/ripwire-bridge.ts
- **src/omp/ripwire-bridge.ts:156-160** (bug)
  `Number()` can return `NaN` when the external binary's output drifts (e.g. `j.reaches` is a non-numeric string or absent in an unexpected format). NaN silently propagates into the `data` record and summary strings (e.g. `"impact_reaches=NaN"`). Add validation or a safe-parse helper: `const safeNum = (v: unknown, fallback: number) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; }` and use it consistently instead of bare `Number()`.
  ```existing
  const reaches = Number(j.reaches ?? 0);
  return {
    present: true, ok: true,
    summary: `impact_reaches=${reaches} radius_untested=${String(j.radius_untested ?? "?")}`,
    data: { reaches, radius_tested: j.radius_tested, radius_untested: j.radius_untested },
  ```
