# HIGH slice 5 — 11 findings across 10 files

## src/hunter/diagnostics/calibration.ts
- **src/hunter/diagnostics/calibration.ts:513-516** (bug)
  The catch block for ROLLBACK is empty — if ROLLBACK itself throws (e.g. connection lost, disk full), the original exception is re-thrown but the database connection is left in a broken transaction state. Any subsequent operations on the same DbClient will fail or produce corrupt results. At minimum, the connection should be flagged as unusable (e.g. call `db.close()` or destroy the client) to prevent silent data corruption.
  ```existing
  } catch (e: unknown) {
      try { db.exec('ROLLBACK'); } catch { /* best-effort: the original error below is what the caller sees */ }
      throw e;
    }
  ```

## src/hunter/firewall/artifact-scope.ts
- **src/hunter/firewall/artifact-scope.ts:163-167** (security)
  Security: When `masterReal` is not null (the master dir exists), the code verifies that `parentReal` is inside `masterReal`, but it never verifies that `masterReal` itself is inside `projectRootReal`. If `MASTER_CONTEXT` (or any variant) exists as a symlink pointing outside the project root (e.g., `/project/MASTER_CONTEXT → /tmp/evil`), then `masterReal` resolves to `/tmp/evil`, `parentReal` resolves through the same symlink to `/tmp/evil/`, and the containment check passes. The caller then writes the report to `/tmp/evil/bug_hunter_report_v<N>.md`, escaping the project boundary entirely. A defending check should verify `masterReal` is within `projectRootReal` before trusting it as the containment boundary.
  ```existing
  if (masterReal !== null) {
    if (parentReal !== masterReal && !parentReal.startsWith(masterReal + path.sep)) {
      return blocked('REPORT_SCOPE_BLOCKED', base, input.target);
    }
  } else {
  ```
  ```suggested
  if (masterReal !== null) {
    // F-NEW: verify the resolved master dir itself is inside the project root —
    // a variant symlink (e.g. MASTER_CONTEXT -> /tmp) would otherwise let writes
    // escape the project boundary.
    if (masterReal !== projectRootReal && !masterReal.startsWith(projectRootReal + path.sep)) {
      console.warn(`[artifact-scope] master realpath escapes project root (mas
  ```

## src/hunter/graph/store-map.ts
- **src/hunter/graph/store-map.ts:194-195** (bug)
  If the same `runTag` is passed on a re-run (or the generated `Date.now()` tag collides with a previous run), the supersede UPDATE `WHERE superseded_run IS NULL` becomes a no-op: the previous successful insert already left all rows with `superseded_run = <this runTag>` (not NULL). The subsequent INSERT then adds duplicate live rows alongside the original ones from that same run, corrupting the store. Consider either: (a) generating a new unique runTag and using a different mechanism to supersede, or (b) explicitly superseding rows with the same runTag too: `UPDATE ... SET superseded_run = ?1 WHERE superseded_run IS NULL OR superseded_run = ?1`.
  ```existing
  db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
  ```

## src/hunter/lexicon/templates.ts
- **src/hunter/lexicon/templates.ts:135-140** (security)
  readPath allows traversal into `constructor` as an own property: for a standard object, `Object.hasOwn(obj, 'constructor')` returns `true` because `constructor` is an inherited but also own-key-accessible property. A crafted `node.data` with a poisoned `constructor.prototype` chain (e.g., via a polluted dependency writing to `Object.prototype.constructor`) would let `readPath` walk into the prototype. Consider blocklisting `__proto__` and `constructor` explicitly — the F-333 fix was on the right track but the set of dangerous keys is larger than just prototype-chain walks via inherited properties.
  ```existing
  // ★ F-333 FIX (2026-09-24): OWN-PROPERTY ONLY. A bare `obj[part]` walks the
    //   prototype chain — a polluted Object.prototype (or an Object.create'd node.data)
    //   could surface an INHERITED value as if it were a binding. The predicate's
    //   bindings are the template's INPUT, so the read is a trust boundary.
    if (!Object.hasOwn(cur, part)) return undefined;
    cur = (cur as Rec
  ```
  ```suggested
  // The F-333 trust-boundary guard: own-property only, PLUS blocklist of
    // keys that are unsafe even as own properties.
    if (!Object.hasOwn(cur, part)) return undefined;
    if (part === '__proto__' || part === 'constructor') return undefined;
    cur = (cur as Record<string, unknown>)[part];
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

## src/omp/oracle.ts
- **src/omp/oracle.ts:251-253** (bug)
  When `notAfter` is set to a timestamp BEFORE the row's `at`, the window becomes inverted (`to < from`), which silently returns zero evidence — every record fails the `at <= from || at > to` filter. This is a caller error (an inverted resolution window), but it is handled as a silent no-op: the row is classified `unresolved` with no indication that the constraint was self-defeating. Compare with the time-travel check above, which loudly throws. The two are symmetric caller errors, but only one is caught.

After `to` is computed on line ~158, add an explicit check:
  ```existing
  // `cap` is authoritative: a caller-supplied windowMs can only NARROW it, never
  // widen past the resolution stamp (the R4c bypass the pass-3 scan found).
  const to = Math.min(from + windowMs, cap);
  ```
  ```suggested
  const to = Math.min(from + windowMs, cap);
  if (to < from) {
    throw new Error(
      `GI_ORACLE_INVERTED_WINDOW: notAfter ${JSON.stringify(opts.notAfter)} (${to}) is before the fire at ${JSON.stringify(row.at)} (${from}) — the resolution window is inverted, so no evidence can be gathered. This is a caller error: the resolution stamp must be AFTER the fire.`,
    );
  }
  ```

## src/scoping/db-path.ts
- **src/scoping/db-path.ts:54-56** (bug)
  Using `startsWith('/')` to detect absolute paths is not cross-platform safe. On Windows, absolute paths start with a drive letter (e.g., `C:\Users\...`), so this check would incorrectly treat a Windows absolute path as relative and incorrectly join it with `os.tmpdir()`. Use `path.isAbsolute()` instead, which correctly handles all platforms.
  ```existing
  return spec.testFile.startsWith('/')
        ? spec.testFile
        : path.join(os.tmpdir(), spec.testFile);
  ```
  ```suggested
  return path.isAbsolute(spec.testFile)
        ? spec.testFile
        : path.join(os.tmpdir(), spec.testFile);
  ```
