# HIGH slice 4 — 9 findings across 8 files

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:262-262** (bug)
  **Bug (Logic error):** The condition `!/Checkpoints/i.test(win) || !/\.trident/i.test(win)` uses OR (`||`), meaning a finding is emitted if **either** 'Checkpoints' or '.trident' is missing from the window. But the preceding `else` branch already confirmed the file *has* some `exclude|EXCLUDED_DIRS` directive. The likely intent (consistent with the REMEDIATION message 'add EXCLUDED_DIRS with Checkpoints .trident') is to check whether the exclusion list covers **both** required entries — i.e., the exclusion is incomplete if either is absent. With `||`, even a file that correctly excludes 'Checkpoints' but doesn't mention '.trident' (or vice versa) gets flagged, which may be overly aggressive. Conversely, a file that mentions both 'Checkpoints' and '.trident' as separate, unrelated strings (not in the same exclude list) would be silently accepted. Consider whether the intent is `&&` (both must be present for the exclusion to be valid) or whether the current `||` is deliberately strict.
  ```existing
  } else if (!/Checkpoints/i.test(win) || !/\.trident/i.test(win)) {
  ```

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:63-78** (bug)
  **F-244 comment is factually wrong — the LINELESS guard runs AFTER db open, not before.** The comment block claims "the LINELESS guard (line above) runs BEFORE the open (line below), so a guard throw leaves no handle behind." In the actual code, `openStore(dbPath)` is called on line 57 (outside the try block), and the guard (`assertMappableLines`) is called on line 64 inside the try block — AFTER the db is opened. If the guard throws, the `DbClient` handle is leaked: the catch block on line 71 only catches errors from `writeGraph`/`mirrorToMasterContext`, not from the guard above them. This is a **resource leak** (file handle + WAL state). The fix is either (a) move `assertMappableLines` before the `openStore` call, or (b) add a guard-specific catch that closes the db before rethrowing.
  ```existing
  // ★ F-244 NOTE (2026-09-24): NOT-A-BUG — the LINELESS guard (line above) runs
//   BEFORE the open (line below), so a guard throw leaves no handle behind. The
//   error-path close covers only post-open failures (writeGraph/mirror).
  const dbPath = path.join(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
  const db: DbClient = openStore(dbPath);

  try {
    writeGraph(db, bu
  ```
  ```suggested
  const dbPath = path.join(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
  assertMappableLines(buildResult);
  const db: DbClient = openStore(dbPath);

  try {
    writeGraph(db, buildResult.nodes, buildResult.edges);
    const mirrorPath = mirrorToMasterContext(db, profile);
    return { adapter, buildResult, db, dbPath, mirrorPath };
  } catch (e: unknown) {
    try { db.close
  ```

## src/hunter/profile/loader.ts
- **src/hunter/profile/loader.ts:314-325** (bug)
  **Flow-value parser has no recursion-depth cap (stack overflow / denial-of-service).**

The block-level parser correctly caps recursion at depth 100 (F-67 fix), but `parseFlowValue` → `parseFlowMap`/`parseFlowArray` → `parseFlowValue` can recurse without any depth bound. A crafted YAML profile with a single-line value like `{a:{b:{c:{…}}}}` nested >10,000 levels deep would overflow the call stack with a `RangeError`, which would be caught by the generic `catch` in `loadProfile` (line 498) and surfaced as a generic `PROFILE_INVALID` — losing the named-error contract and the specific field context.

The fix should mirror the block-level guard: add a `depth` parameter (default 0) to `parseFlowValue`, `parseFlowMap`, and `parseFlowArray`, and reject with `YamlParseError` at depth > 100.
  ```existing
  /** Parse a single-line flow value: flow map | flow array | quoted | scalar. */
function parseFlowValue(token: string, line: number): unknown {
  const t = token.trim();
  if (t === '') return null;
  if (t.startsWith('{')) {
    if (!t.endsWith('}')) yamlErr([], t, line, `flow map is not closed on a single line: "${t}"`);
    return parseFlowMap(t.slice(1, -1), line);
  }
  if (t.startsWith('['))
  ```
  ```suggested
  /** Parse a single-line flow value: flow map | flow array | quoted | scalar. */
function parseFlowValue(token: string, line: number, depth = 0): unknown {
  if (depth > 100) yamlErr([], token, line, 'maximum flow-nesting depth (100) exceeded');
  const t = token.trim();
  if (t === '') return null;
  if (t.startsWith('{')) {
    if (!t.endsWith('}')) yamlErr([], t, line, `flow map is not closed on
  ```

## src/hunter/surface/query-tool.ts
- **src/hunter/surface/query-tool.ts:259-262** (bug)
  Bug: The `chain` BFS never assigns a `step` number to path rows. Each step object (line ~162) has `from`, `to`, `kind`, `file`, `line` — but no `step` property. Then `formatRows` (line ~375) reads `r.step ?? 1`, which always resolves to `1` since `r.step` is never set. Every step in the LLM output will display `step=1`, losing positional information. The `buildPath` function should assign sequential step numbers when materializing the path.
  ```existing
  const step: QueryRow = {
    from: curId, to: e.dst_label, kind: e.predicate,
    file: e.dst_file ?? '', line: e.dst_line ?? 0,
  };
  ```
  ```suggested
  // Assign a sequential step number when the path is materialized in buildPath
  const step: QueryRow = {
    from: curId, to: e.dst_label, kind: e.predicate,
    file: e.dst_file ?? '', line: e.dst_line ?? 0,
  };
  ```
- **src/hunter/surface/query-tool.ts:0-0** (bug)
  Bug: 7 of 12 verb implementations (`mustImplement`, `unwired`, `rule`, `violations`, `consistency`, `blastRadius`, `wouldBreak`) return raw rows without calling `formatRows`, so the `format` parameter in `QueryInput` is silently ignored for these verbs. Compare with `whoCalls`, `chain`, `semanticVerb`, and `docsPatternsVerb` which all pass through `formatRows`. A caller requesting `format: 'llm'` for the `violations` verb gets the full-size rows instead of the token-minimal records. At minimum, flat-row verbs (`violations`, `mustImplement`, `unwired`, `consistency`) should route through `formatRows` for consistency.
  ```existing
  const effectiveCap = input.format === 'llm' ? MAX_QUERY_ROWS : MAX_QUERY_ROWS_FULL;
  const off = Math.max(0, Math.floor(input.offset ?? 0));
  const lim = input.limit !== undefined ? Math.min(Math.max(0, Math.floor(input.limit)), effectiveCap) : effectiveCap;
  return rows.slice(off, off + lim);
  ```
  ```suggested
  const effectiveCap = input.format === 'llm' ? MAX_QUERY_ROWS : MAX_QUERY_ROWS_FULL;
  const off = Math.max(0, Math.floor(input.offset ?? 0));
  const lim = input.limit !== undefined ? Math.min(Math.max(0, Math.floor(input.limit)), effectiveCap) : effectiveCap;
  return formatRows(rows.slice(off, off + lim), input.format);
  ```

## src/hunter/tools/query-registration.ts
- **src/hunter/tools/query-registration.ts:85-87** (bug)
  `db.close()` in the `finally` block may throw (e.g., SQLite I/O error during flush or a corrupt database). If it does, the thrown exception will mask the original error from the `try` block, making debugging significantly harder. The downstream `close()` implementations (`db.ts:433-438`) call `this.handle.close()` with no error guard. Wrap in try-catch to preserve the original error:
```typescript
finally {
  try { db.close(); } catch { /* close failure is non-fatal; original error preserved */ }
}
```
  ```existing
  } finally {
    db.close();
  }
  ```
  ```suggested
  } finally {
    try { db.close(); } catch { /* close failure is non-fatal; original error preserved */ }
  }
  ```

## src/kernel/scan-chain.ts
- **src/kernel/scan-chain.ts:138-143** (bug)
  **Resource leak risk on non-ok HTTP responses**: When `response.ok` is false, `response.text()` is called to read the error body, but this is wrapped in a try/catch that silently ignores failures. If `response.text()` throws (e.g., the body stream is interrupted or the connection drops mid-read), the response body is not fully drained. In Node.js `fetch`, undrained response bodies prevent the underlying TCP connection from being returned to the agent pool. With up to 30 requests per chain run, this can exhaust connections. Ensure the body is always consumed, even if the read fails.
  ```existing
  if (!response.ok) {
      clearInterval(stallTimer);
      let detail = "";
      try { detail = (await response.text()).slice(0, 200); } catch { /* body unreadable — status alone is the signal */ }
      return { ok: false, reason: `SCAN_HTTP_${response.status}: ${response.statusText ?? ""}${detail ? ` — ${detail}` : ""}` };
    }
  ```
  ```suggested
  if (!response.ok) {
      clearInterval(stallTimer);
      let detail = "";
      try { detail = (await response.text()).slice(0, 200); } catch {
        try { await response.body?.cancel(); } catch { /* best-effort drain */ }
      }
      return { ok: false, reason: `SCAN_HTTP_${response.status}: ${response.statusText ?? ""}${detail ? ` — ${detail}` : ""}` };
    }
  ```

## src/omp/hard-deps.ts
- **src/omp/hard-deps.ts:330-330** (bug)
  `join` filters out zero-length strings before joining. When `scopeRoot` is `""`, every `join(cfg.scopeRoot, ...)` produces a bare relative path like `.omp/graph-intelligence/layers/semantica`. This resolves against `process.cwd()` at probe time — silently UP on a machine whose CWD contains that structure, DOWN on others. The hard-dependency philosophy requires an explicit, loud failure when `scopeRoot` is missing, not a CWD-dependent guess. Add a guard that rejects an empty `scopeRoot` at the top of `buildRegister`.
  ```existing
  const join = (...parts: string[]): string => parts.filter((p) => p.length > 0).join("/").replace(/\/{2,}/g, "/");
  ```
  ```suggested
  if (!cfg.scopeRoot) {
    throw new Error("REGISTER_CONFIG: scopeRoot is required — an empty scope root would produce relative paths that resolve against CWD, not a loud failure");
  }
  const join = (...parts: string[]): string => parts.filter((p) => p.length > 0).join("/").replace(/\/{2,}/g, "/");
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:138-139** (bug)
  The original exception `e` is discarded when re-wrapping as a new Error. The original stack trace, cause chain, and any structured error properties are lost, making production debugging significantly harder. Use `{ cause: e }` to preserve the original exception.
  ```existing
  } catch (e) {
      throw new Error(`GRAPHIFY_WRITE_FAILED: session store write for ${resolvedRoot} did not commit (${e instanceof Error ? e.message : String(e)})`);
  ```
  ```suggested
  } catch (e) {
      throw new Error(`GRAPHIFY_WRITE_FAILED: session store write for ${resolvedRoot} did not commit (${e instanceof Error ? e.message : String(e)})`, { cause: e });
  ```
