# HIGH slice 4 — 10 findings across 8 files

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:90-90** (bug)
  **Bug: P1 regex second alternative is asymmetric — misses valid detections.**

The detection regex in P1 has two alternatives (OR-separated at the top level). The first alternative covers `.trident` appearing AFTER a file operation:
```
(writeFile(Sync)?|appendFile(Sync)?|mkdir(Sync)?|createWriteStream|(?:path\.)?join|(?:path\.)?resolve).*\.trident
```
The second alternative covers `.trident` appearing BEFORE a file operation:
```
\.trident.*(writeFile(Sync)?|mkdir(Sync)?|(?:path\.)?join)
```

The second alternative is **missing** `appendFile(Sync)?`, `createWriteStream`, and `(?:path\.)?resolve` — so patterns like `.trident.appendFile(...)` or `.trident + resolve(...)` will not be detected even though the equivalent forward patterns are. Given that P1_SPEC's callSymbols include all of these, the second half of the regex should mirror the first to avoid false negatives.
  ```existing
  if (/(writeFile(Sync)?|appendFile(Sync)?|mkdir(Sync)?|createWriteStream|(?:path\.)?join|(?:path\.)?resolve).*\.trident|\.trident.*(writeFile(Sync)?|mkdir(Sync)?|(?:path\.)?join)/.test(win)) {
  ```
  ```suggested
  if (/(writeFile(Sync)?|appendFile(Sync)?|mkdir(Sync)?|createWriteStream|(?:path\.)?join|(?:path\.)?resolve).*\.trident|\.trident.*(writeFile(Sync)?|appendFile(Sync)?|mkdir(Sync)?|createWriteStream|(?:path\.)?join|(?:path\.)?resolve)/.test(win)) {
  ```

## src/hunter/harness/map.ts
- **src/hunter/harness/map.ts:119-119** (bug)
  The `n.line ?? undefined` nullish coalescing does NOT convert `0` to `undefined`. The comments reference an "old line-0 class" (line 50) as a legacy silent-drop behavior, suggesting `line: 0` was historically used to mean "no line". If a node has `n.line = 0`, it will be passed to `resolveLine` as `0` rather than `undefined`, and depending on how `resolveLine` handles the value `0`, this could allow a lineless node to bypass the guard (false negative) or be incorrectly resolved. Consider using `n.line || undefined` or an explicit `n.line && n.line > 0 ? n.line : undefined` guard to ensure `0` is treated as unresolved.
  ```existing
  { line: n.line ?? undefined, data, source_location: data['source_location'] },
  ```
  ```suggested
  { line: n.line || undefined, data, source_location: data['source_location'] },
  ```

## src/hunter/lexicon/templates.ts
- **src/hunter/lexicon/templates.ts:396-397** (security)
  **Prototype-safety bypass:** `node.data?.['interface']` directly indexes the object without going through the `readPath` helper that enforces own-property + blocklist checks (F-333/F-412). If `node.data` is constructed via `Object.create(nullPrototypeObj)` or the prototype is polluted, an inherited or crafted `interface` property could surface, violating the file's own A3 trust-boundary law.

Similarly, `bindStringArray(node.data, 'members')` on line 335 also bypasses `readPath`'s prototype guards for the `members` key.

Both reads should route through `readPath` for consistency with the other predicates' trust-boundary discipline.
  ```existing
  if (node.name !== declaredInterface && node.data?.['interface'] !== declaredInterface) continue;
      const members = node.data !== undefined && node.data !== null ? bindStringArray(node.data, 'members') : [];
  ```
  ```suggested
  const nodeInterface = readPath(node.data ?? {}, 'interface');
      if (node.name !== declaredInterface && nodeInterface !== declaredInterface) continue;
      const members = node.data !== undefined && node.data !== null
        ? bindStringArray(node.data, 'members')  // bindStringArray reads own keys only via typeof
        : [];
  ```

## src/hydra/map-reader.ts
- **src/hydra/map-reader.ts:243-244** (bug)
  **MCP call result silently discarded — `query()` always returns local `tokenScan` regardless of MCP success.** Lines 243-244 fire `this.mcp.callTool('query_graph', ...)` but immediately discard the result with `void String(...)` and return `tokenScan(graph, question)`. On MCP success, the expensive remote call is wasted; on MCP failure, the catch block logs but falls through to the same local path. The `query()` method's MCP branch is effectively dead code — the MCP result is never used to influence the return value. Same pattern in `path()` (line 259) and `explain()` (line 306). If the intent is purely a connectivity probe, the MCP call should be skipped or its result used. As written, every MCP-connected call incurs unnecessary network latency for zero benefit.
  ```existing
  void String(await this.mcp.callTool("query_graph", { question }));
        return tokenScan(graph, question);
  ```
  ```suggested
  const mcpResult = await this.mcp.callTool("query_graph", { question });
        // Use MCP result if available, fall back to local scan
        return mcpResult ? parseMcpSubgraph(mcpResult, graph, question) : tokenScan(graph, question);
  ```
- **src/hydra/map-reader.ts:127-136** (bug)
  **Empty node IDs silently collide, corrupting graph topology.** When a node object lacks both `id` and `label` fields, the expression `String(r["id"] ?? r["label"] ?? "")` produces `id: ""` (empty string). Multiple such nodes share the same key, causing: (1) degree counts to accumulate across phantom nodes, (2) godNodes selection to be skewed, (3) community membership to merge unrelated nodes. The F-403 validation on lines 113-120 checks for non-objects but not for missing `id`+`label` combinations. Add validation that `id` resolves to a non-empty string after normalization.
  ```existing
  const nodes: GraphifyNode[] = rawNodes.map((n) => {
    const r = n as Record<string, unknown>;
    return {
      id: String(r["id"] ?? r["label"] ?? ""),
      label: String(r["label"] ?? r["id"] ?? ""),
      type: String(r["file_type"] ?? r["type"] ?? "unknown"),
      file: String(r["source_file"] ?? r["file"] ?? ""),
      data: r as Record<string, unknown>,
    };
  });
  ```
  ```suggested
  const nodes: GraphifyNode[] = rawNodes.map((n, i) => {
    const r = n as Record<string, unknown>;
    const id = String(r["id"] ?? r["label"] ?? "").trim();
    if (!id) {
      throw new Error(`GRAPHIFY_PARSE_INVALID: nodes[${i}] has no id or label — cannot normalize to a unique key`);
    }
    return {
      id,
      label: String(r["label"] ?? r["id"] ?? ""),
      type: String(r["file_type"
  ```

## src/omp/adapters/abide.ts
- **src/omp/adapters/abide.ts:130-130** (bug)
  The fallback path in `tailEvents` re-reads the file with `readFileSync` after the bounded-tail loop fails. The earlier guard checks `st.size > MAX_SAFE_FULL_READ` and throws, but if `st` is null (stat failed), the code falls through to `readFileSync` with no size guard at all — a missing ledger's ENOENT will surface as an unhandled crash rather than the structured `GI_ENFORCE_ABIDE` error. Add a null-check on `st` before `readFileSync`.
  ```existing
  const raw = fs.readFileSync(eventsPath, "utf8");
  ```

## src/omp/decision.ts
- **src/omp/decision.ts:0-0** (bug)
  The `intent` parameter is not validated, unlike every other public input in this file. The file's own F-1 FIX (line 96-104) and the comment on line 131 explicitly document that an empty/undefined input silently propagates into downstream functions producing wrong results. `GraphFactInput.intent` is typed as `"consume" | "declare" | "mutate" | "measure"` but TypeScript does not prevent `undefined` at runtime. An undefined `intent` would silently reach `graphFacts`, skip the M-GRAPH-5 rule (which checks `input.intent === "measure"`), and yield a potentially wrong verdict set. This is the exact same defect class the file has already fixed twice (the F-1 FIX for `decideFromRegistry` act fields, and the W5 audit for `decideFireFromGraph` scopeRoot/target) — `intent` was missed. Add a validation guard consistent with the existing pattern.
  ```existing
  const target: string,
  intent: GraphFactInput["intent"],
): FireEvidence {
  ```
  ```suggested
  const target: string,
  intent: GraphFactInput["intent"],
): FireEvidence {
  // ★ AUDIT HIGH: validate `intent` — the same missing-input class as scopeRoot/target.
  //   An undefined intent silently propagates into graphFacts, skipping rules.
  const VALID_INTENTS: readonly string[] = ["consume", "declare", "mutate", "measure"];
  if (!VALID_INTENTS.includes(intent as string)) {
    throw new Er
  ```

## src/omp/populate-corbell.ts
- **src/omp/populate-corbell.ts:174-174** (performance)
  The freshness probe `isCorbellCheckoutFreshFor` is called twice: once at line 123 (before reads) and once at line 166 (after reads). Each call walks the entire workspace tree with up to `CORBELL_FRESHNESS_BUDGET` (50,000) `statSync` calls — that's potentially 100k stat syscalls per invocation of this function. The second call's primary purpose is to detect a rebuild that happened during the read, but the `warmStoreUnchanged` (mtime+size+ino snapshot) comparison at line 168 already covers that case. Consider removing the second `isCorbellCheckoutFreshFor` call and relying solely on the `warmStoreUnchanged` comparison, or caching the freshness walk result if both checks are deemed necessary.
  ```existing
  const freshnessAfter = isCorbellCheckoutFreshFor(root, warmPath);
  ```
  ```suggested
  // Rely on the stat-snapshot comparison (stBefore vs stAfter) to detect
  // mid-read swaps — avoids a second full filesystem walk (50k stat calls).
  // If freshness semantics beyond stat-snapshot are needed, consider caching
  // the walk result from the first probe above.
  ```

## src/omp/populate-graphify.ts
- **src/omp/populate-graphify.ts:132-146** (bug)
  **Stack overflow on circular symlinks (no cycle detection in directory walks)**.

Both the freshness-probe `walk` and the `hashSourceTree` `walk` recurse into directories without a visited-set. A circular symlink in a scope entry (e.g., `src/self → src`) causes unbounded recursion → stack overflow. The budget counter only decrements for FILES, not directories, so it provides no protection. The `hashSourceTree` walk in `typed-write.ts` (chainCalls, etc.) correctly uses a `visited` Set, but these two walks do not.

**Fix**: Add a `visited = new Set<string>()` that records `fs.realpathSync(dir)` (or the raw path with a best-effort try/catch) before recursing, and skip directories already in the set.
  ```existing
  const walk = (dir: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (budget.n <= 0) { exhausted = true; return; }
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "buil
  ```
  ```suggested
  const visited = new Set<string>();
  const walk = (dir: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    // Cycle detection: a symlink loop would otherwise blow the stack.
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { return; }
    if (visited.has(realDir)) return;
    visited.add(realDir);
    let entries: fs.Dirent[];
    try {
      entr
  ```
- **src/omp/populate-graphify.ts:0-0** (bug)
  The `supersedeThenInsert` function incorrectly closes the caller-owned Database connection in its `finally` block, leading to a double-close when the caller also closes it. Additionally, the JSDoc and inline comments contradict this behavior by stating that the helper never closes a connection it did not open. Fix: Remove the `db.close()` call from `supersedeThenInsert`'s `finally` block to align with the caller-owns-close contract, and update the comments to reflect the correct ownership.
  ```existing
  } catch (e) {
    try { db.exec("ROLLBACK;"); } catch { /* already-rolled-back — close still runs */ }
    throw e;
  }
  // Caller owns close (typed-write batch-writer contract) — the helper never
  // closes a connection it did not open (re-run-V high: close+leak pair).
}
  ```
  ```suggested
  } catch (e) {
    try { db.exec("ROLLBACK;"); } catch { /* already-rolled-back */ }
    throw e;
  }
  // Caller owns close (typed-write batch-writer contract) — the helper never
  // closes a connection it did not open (re-run-V high: close+leak pair).
}
  ```
