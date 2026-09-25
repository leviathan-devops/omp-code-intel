# R6-HIGH slice 2 — 11 findings across 9 files

## src/hunter/graph/graphify-adapter.ts
- **src/hunter/graph/graphify-adapter.ts:646-657** (bug)
  Null line guard leak: when both `e.line` and `src?.line` are `null` (not `undefined`), the `??` chain short-circuits and `tryResolveGraphifyLine` is never called. The `line` variable remains `null`, which passes the `=== undefined` drop guard and flows into `graphifyEvidence()` as `line: null`, producing evidence strings like `explicit: wraps in source X->Y @ file.ts:null`. This violates the documented contract that lineless edges are dropped. The root cause is that `GraphEdge.line` is typed `number | null | undefined` — null and undefined both mean 'lineless', but `??` only coalesces `undefined`.
  ```existing
  const line = e.line
      ?? src?.line
      ?? tryResolveGraphifyLine(
        { data: src?.data ?? {}, source_location: rawSourceLocation(src) },
        e as unknown as { source_location?: unknown },
      );
    // W9 CONTRACT RESOLUTION (pipeline contradiction): projectGraphifyGraph
    // DELIBERATELY keeps lineless edges (danglingNoLine count) — the map
    // branch now SKIPS + counts them
  ```
  ```suggested
  const line = (e.line ?? src?.line) != null
      ? (e.line ?? src?.line)
      : tryResolveGraphifyLine(
          { data: src?.data ?? {}, source_location: rawSourceLocation(src) },
          e as unknown as { source_location?: unknown },
        );
    // null OR undefined both mean lineless — the drop guard must catch both.
    if (line == null) { linelessEdgesDropped++; return []; }
  ```

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:226-227** (bug)
  Inconsistent alias matching between decide() and run() harness paths: The `decide` path matches aliases via `n.id === alias || n.label === alias` (line ~108), but the `run` path only checks `n.id === alias` (line ~132). This means the `run` path silently drops valid harness decisions that use labels as aliases, causing those entities to fall through to full heuristic resolution — an inconsistency that could produce different resolution outcomes depending on which harness path is used.
  ```existing
  const newEnt = newEntities.find((n) => n.id === alias);
              if (!newEnt) continue;
  ```
  ```suggested
  const newEnt = newEntities.find((n) => n.id === alias || n.label === alias);
if (!newEnt) continue;
  ```
- **src/hunter/graph/resolver.ts:204-204** (bug)
  Harness partial-match silently discards all valid decisions: When the harness returns decisions for only a subset of entities (e.g., some filtered by hallucination checks or dangling canonical fallbacks), the `decisions.length === newEntities.length` check discards the entire harness result and falls back to full heuristic resolution. This means correct harness decisions for the subset that were processed are silently lost. Consider merging harness decisions with heuristic fallback for the remaining entities instead of discarding everything.
  ```existing
  if (decisions.length === newEntities.length) harnessDecisions = decisions;
  ```
  ```suggested
  if (decisions.length > 0) {
  // Merge: use harness decisions for resolved entities, heuristic for the rest
  const resolvedAliases = new Set(decisions.map(d => d.alias));
  for (const ne of newEntities) {
    if (!resolvedAliases.has(ne.id)) {
      const h = heuristicDecide(ne, existing);
      decisions.push({ alias: ne.id, canonicalId: h.canonical ? h.canonical.canonical_id : ne.id, verdict: h
  ```

## src/hunter/harness/report.ts
- **src/hunter/harness/report.ts:288-288** (bug)
  `COMMIT` is called **outside** the try-catch block that wraps the transaction body. If `COMMIT` itself throws (e.g. disk-full, I/O error, database locked), the error propagates uncaught through the outer try, gets logged and re-thrown — but **no rollback is attempted**, leaving the transaction in an indeterminate state. The caller receives an error but the report file has already been written to disk, creating an inconsistency between the durable file and the database. Move `COMMIT` inside the try block (just before the closing `}`) and handle its failure with a rollback, or at minimum wrap it in its own try-catch with rollback.
  ```existing
  input.db.exec('COMMIT');
  ```
  ```suggested
  input.db.exec('COMMIT');
    } catch (dbErr: unknown) {
      try { input.db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        throw new Error(`REPORT_COMMIT_FAILED: commit error=${dbErr instanceof Error ? dbErr.message : String(dbErr)} rollback error=${rbErr instanceof Error ? rbErr.message : String(rbErr)} (the transaction may still be open — do not reuse this handle for writes)`);
      }
  
  ```

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:719-730** (bug)
  **Bug: `branch_union_view` is dropped but never recreated in `writeBranchView`**

After the `DELETE FROM graph_edges/graph_nodes` + re-inserts in the transaction, `writeBranchView` drops `branch_union_view` and then creates `branch_union_attached` (inside a try-catch). However, `getBranchUnion()` queries `branch_union_view` — NOT `branch_union_attached`. This means after the first `writeBranchView` call, the primary view path in `getBranchUnion` will always fail (the view no longer exists), forcing every subsequent call through the fallback manual union. The `branch_union_attached` view is created but never queried anywhere, making it dead code.

This defeats the purpose of the view-based optimization and means the `ATTACH DATABASE` + `branch_union_attached` code path is entirely unused.
  ```existing
  try {
      this.branchDb.exec("DROP VIEW IF EXISTS branch_union_view");
      this.branchDb.exec("CREATE VIEW branch_union_view AS SELECT id, kind, name, file, line, lineage, source, data, 'family' as origin FROM family_nodes UNION ALL SELECT id, kind, name, file, line, lineage, source, data, 'delta' as origin FROM graph_nodes");
    } catch (idemErr) { /* idempotent guard */ console.debug("[kg-s
  ```
  ```suggested
  try {
      this.branchDb.exec("DROP VIEW IF EXISTS branch_union_attached");
      this.branchDb.exec(`ATTACH DATABASE '${this.familyPath.replace(/'/g, "''")}' AS family_attached`);
      this.branchDb.exec("CREATE VIEW branch_union_attached AS SELECT id, kind, name, file, line, lineage, source, data, 'family' as origin FROM family_attached.family_nodes UNION ALL SELECT id, kind, name, file, line,
  ```

## src/omp/adapters/arsumbris.ts
- **src/omp/adapters/arsumbris.ts:91-97** (bug)
  The `walk` function recursively traverses all object values without a visited-set to guard against circular references. If the daemon output contains circular references (e.g., a prototype chain or malformed JSON), this will cause infinite recursion and a stack overflow, crashing the Node.js process.
  ```existing
  const values: string[] = [];
            const walk = (v: unknown): void => {
              if (typeof v === "string") values.push(v);
              else if (Array.isArray(v)) for (const x of v) walk(x);
              else if (v && typeof v === "object") for (const x of Object.values(v as Record<string, unknown>)) walk(x);
            };
            walk(i);
  ```
  ```suggested
  const values: string[] = [];
            const seen = new WeakSet<object>();
            const walk = (v: unknown): void => {
              if (typeof v === "string") values.push(v);
              else if (Array.isArray(v)) for (const x of v) walk(x);
              else if (v && typeof v === "object") {
                if (seen.has(v as object)) return;
                seen.add(v as object);
     
  ```

## src/omp/extension.ts
- **src/omp/extension.ts:136-170** (security)
  **TOCTOU gap: statSync on stale `real` before the re-resolve guard** — The `statSync` at line ~133 checks that `real` is a directory using the first-resolved path. However, the TOCTOU re-validation at lines 166-170 only re-resolves `normalized` via `realpathSync` and compares path *identity* (`realAfter !== real`) — it does NOT re-check the directory type. An attacker who swaps a symlink target from a directory to a file between the `statSync` and the final `realpathSync` can pass the type check with the stale `real` while the re-resolve still matches (same symlink, different target). The re-resolve should also re-stat to confirm the target remains a directory.

Suggested fix: after line 168 (`if (realAfter !== real)`), add a second stat check on `realAfter`:
```typescript
if (realAfter !== real) {
  return { ok: false, error: `GI_PATH_DENIED: the path changed during the confinement check (TOCTOU) — '${normalized.slice(0, 120)}'` };
}
let stAfter: import("node:fs").Stats | null = null;
try { stAfter = fs.statSync(realAfter); } catch { stAfter = null; }
if (!stAfter || !stAfter.isDirectory()) {
  return { ok: false, error: `GI_PATH_DENIED: targetPath is not a directory after re-resolve: '${realAfter.slice(0, 120)}'` };
}
```
  ```existing
  if (!st || !st.isDirectory()) {
    return { ok: false, error: `GI_PATH_DENIED: targetPath is not a directory: '${real.slice(0, 120)}'` };
  }
  // W44 (supersedes the V21 ':' note): the split lives in parseTargetRoots
  // ('|' only — never ':').
  const allowRoots = parseTargetRoots(process.env.GI_TARGET_ROOTS ?? "");
  const roots = allowRoots.length > 0 ? allowRoots : [callerCwd, "/tmp"];
  co
  ```
- **src/omp/extension.ts:563-573** (security)
  **Security: `fs.mkdirSync(auditRoot, { recursive: true })` runs BEFORE the symlink-plant check** — Line 565 creates the audit directory before the `realpathSync` + `path.relative` confinement check at lines 569-571. If an attacker pre-creates a symlink at the `auditRoot` path (`.omp/graph-intelligence/audit`) pointing to an external directory, `mkdirSync` with `recursive: true` will follow the symlink and create the directory tree at the attacker's target location. The subsequent symlink check detects the escape and returns an error, but the directory has already been created outside the confinement boundary.

The W12/W15 comments describe the fix as checking *before* `mkdtemp`, but `mkdirSync` (which also follows symlinks) is not guarded. Suggested fix: use `fs.mkdirSync` followed by an immediate `realpathSync` check *before* the `mkdtempSync` call, and `fs.rmdirSync(auditRoot)` (or a cleanup) if the check fails — or, better yet, create the parent directory chain with `mkdirSync` after resolving each component:
```typescript
const auditRoot = join(targetReal, ".omp", "graph-intelligence", "audit");
const auditRootReal = fs.realpathSync(auditRoot);
// Re-resolve after creation to detect symlink plant:
const ledgerRel = path.relative(targetReal, auditRootReal);
if (ledgerRel === "" || ledgerRel.startsWith("..") || path.isAbsolute(ledgerRel)) {
  // clean up the planted symlink's target before refusing
  return textResult("GI_LEDGER_DENIED: audit root is a symlink plant", ...);
}
```
Or more robustly: create the `.omp/graph-intelligence/audit` path with `mkdirSync` inside a try, immediately `realpathSync`, and if it escaped, remove the created directory tree before returning the error.
  ```existing
  const targetReal = resolve(targetRoot);
      const auditRoot = join(targetReal, ".omp", "graph-intelligence", "audit");
      fs.mkdirSync(auditRoot, { recursive: true });
      // W15/W16 (frozen-scan HIGH): component containment on the AUDIT ROOT —
      // refuse a pre-planted symlink BEFORE mkdtemp (path.relative verdict,
      // never a string prefix).
      const auditRootReal = fs.realpat
  ```

## src/omp/fire-ledger.ts
- **src/omp/fire-ledger.ts:617-617** (bug)
  Persistent malformed rows cause an unbounded retry loop. When `drain()` is called (from `judgeWithPersist`), it collects ALL unseen rows from `gate.rows()` and passes them to `appendManyDetailed`. If one row is persistently malformed (e.g., bad domain, bad probability), it fails in the per-row fallback, is never added to the `seen` WeakSet, and is retried on EVERY subsequent `judge()` call. This floods `persistFailureCount` and overwrites `lastPersistError` indefinitely. Each retry also re-attempts all previously failed rows, not just the latest one.

Suggested fix: in `judgeWithPersist`, instead of calling `drain(original, ledger)` which re-attempts all stale failures, only persist the specific decision just produced. Alternatively, `drain` should cap how many stale failures it re-attempts per call, or the fallback should add persistently-failing rows to a dead-letter set that is skipped on future drains.
  ```existing
  drain(original, ledger);
  ```
  ```suggested
  try {
      drain(original, ledger);
    } catch (e) {
      const bare45 = e instanceof LedgerError ? (e.code.startsWith("GI_LEDGER_") ? e.code.slice("GI_LEDGER_".length) : e.code) : "PERSIST_FAILED";
      const code = `GI_LEDGER_${bare45}`;
      const message = e instanceof Error ? e.message : String(e);
      ledger.notePersistFailure(code, message);
      // NOTE: a persistently malformed ro
  ```

## src/omp/kernel-v2.ts
- **src/omp/kernel-v2.ts:357-357** (bug)
  Inconsistency between tie-breaking in `worstOutcome` and the verdict computation in stage 5. `worstOutcome` uses class priority (destructive > theatrical > dumb) as a tiebreaker and may select, say, `theatricalDetector` when it ties with `dumbDetector` on VIOLATION. But stage 5's verdict ternary checks `worst.detector.class === "destructive"` to decide REFUSE vs STEER — if the tiebreaker selected theatrical, this check is false, so a theatrical VIOLATION at tier T1 gets STEER. However, if `destructiveDetector` also returned VIOLATION at the same tier, `worstOutcome` would have selected it (higher class priority), and stage 5 would emit REFUSE. The same logical severity level produces different verdicts depending on which detectors happen to be present. Consider basing the REFUSE escalation on `worst.outcome.tier` alone, or ensure the code path aligns with the tie-breaking semantics.
  ```existing
  verdict = TIER_ORDER[worst.outcome.tier] >= TIER_ORDER["T2"] || worst.detector.class === "destructive" ? "REFUSE" : "STEER";
  ```
  ```suggested
  // Escalate to REFUSE for T2+ violations or destructive class violations
    if (
      TIER_ORDER[worst.outcome.tier] >= TIER_ORDER["T2"] ||
      worst.detector.class === "destructive"
    ) {
      verdict = "REFUSE";
    } else {
      verdict = "STEER";
    }
  ```

## src/omp/store-open.ts
- **src/omp/store-open.ts:0-0** (security)
  The scopeRoot validation rejects `..` segments and NUL bytes, but does **not** resolve or check for symlinks. A malicious or compromised process can place a symlink at, e.g., `scopeRoot/link` → `/etc`, and subsequent `fs.mkdirSync` / `fs.writeFileSync` calls will follow it, escaping the intended directory tree entirely. To harden: resolve `scopeRoot` via `fs.realpathSync` (which rejects dangling / symlinked components) **after** the `isAbsolute` + `..` + NUL checks, and verify the resolved path still starts with the intended root prefix.
  ```existing
  if (!path.isAbsolute(input.scopeRoot) || input.scopeRoot.split(/[\/]/).includes("..") || input.scopeRoot.includes("\0")) {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot must be a canonical absolute path, got ${JSON.stringify(input.scopeRoot)}`);
  }
  ```
  ```suggested
  if (!path.isAbsolute(input.scopeRoot) || input.scopeRoot.split(/[\/]/).includes("..") || input.scopeRoot.includes("\0")) {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot must be a canonical absolute path, got ${JSON.stringify(input.scopeRoot)}`);
  }
  let resolvedScopeRoot: string;
  try {
    resolvedScopeRoot = fs.realpathSync(input.scopeRoot);
  } catch {
    throw new GiScopeError(`G
  ```
