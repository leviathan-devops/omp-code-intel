# HIGH slice 4 — 12 findings across 10 files

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:134-136** (bug)
  P3 bypasses the edge-anchored traversal contract: `ctx.graph.nodes()` iterates ALL graph nodes directly, contradicting the module's architectural mandate (header: 'never nodes() as a file list'). Every other predicate (P1, P2, P4, P5, P6) uses `resolveEdgeAnchor` to scope candidates through traversed edges. P3's direct node iteration means ANY function/method/class whose name matches `/(enforce|gate|guard|STATE_GATE)/i` becomes a candidate regardless of edge participation, generating false positives from orphaned or unrelated nodes. The edge-anchored design exists so that `DELETE FROM graph_edges` vanishes all findings — P3 violates this invariant.
  ```existing
  for (const node of ctx.graph.nodes()) {
      if (node.kind !== 'function' && node.kind !== 'method' && node.kind !== 'class') continue;
      if (!/(enforce|gate|guard|STATE_GATE)/i.test(node.name)) continue;
  ```
  ```suggested
  // Use resolveEdgeAnchor like P1-P6: define a P3_SPEC with defMatchers
    // matching /enforce|gate|guard|STATE_GATE/i, then iterate anchor.files
    // instead of ctx.graph.nodes(). The unwired-enforcement check would then
    // read the source of each edge-resolved file and inspect its exported
    // symbols for zero-caller gates — preserving the edge-anchor contract.
    const anchor = ancho
  ```

## src/hunter/graph/resolver.ts
- **src/hunter/graph/resolver.ts:225-226** (bug)
  Bug (asymmetry with `decide` path): The `run()` path resolves `newEnt` via `n.id === alias` only, while the `decide()` path uses `n.id === alias || n.label === alias` (line 193). If the AI harness returns an entity's label rather than its ID in the `alias` field, the `run()` path silently drops that record and falls back to heuristic — producing an incorrect or inconsistent result without any diagnostic signal.

Fix: add the same `|| n.label === alias` fallback to the `run()` path for parity.
  ```existing
  // ★ F-253 FIX (2026-09-24): run path — same no-fabrication rule as the decide path (skip hallucinated aliases).
              const newEnt = newEntities.find((n) => n.id === alias);
  ```
  ```suggested
  // ★ F-253 FIX (2026-09-24): run path — same no-fabrication rule as the decide path (skip hallucinated aliases).
              const newEnt = newEntities.find((n) => n.id === alias || n.label === alias);
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

## src/hunter/shared/db.ts
- **src/hunter/shared/db.ts:844-844** (bug)
  The `readonly` option is cast to `Record<string, unknown>`, bypassing TypeScript's type checking. If bun:sqlite's API changes or a typo is introduced (e.g., `{ readonly: true }` vs `{ readOnly: true }`), this will silently fail to enforce read-only mode, allowing writes to what should be a protected family store. Use the correct bun:sqlite options type directly.
  ```existing
  const handle = new Database(familyPath, { readonly: true } as unknown as Record<string, unknown>);
  ```
  ```suggested
  const handle = new Database(familyPath, { readonly: true });
  ```
- **src/hunter/shared/db.ts:735-737** (bug)
  Each call to `writeBranchView` ATTACHes the family database as `family_attached` without first checking if it is already attached. In SQLite, re-attaching an already-attached alias fails with 'database family_attached is already in use'. The error is silently swallowed by the idempotent guard, which means the attached-database view (`branch_union_attached`) silently becomes unavailable on the second and all subsequent calls, degrading to the non-attached union view that misses cross-database queries. Check for existing attachment before re-attaching, or DETACH first.
  ```existing
  this.branchDb.exec(`ATTACH DATABASE '${this.familyPath.replace(/'/g, "''")}' AS family_attached`);
      this.branchDb.exec("DROP VIEW IF EXISTS branch_union_attached");
      this.branchDb.exec("CREATE VIEW branch_union_attached AS SELECT id, kind, name, file, line, lineage, source, data, 'family' as origin FROM family_attached.family_nodes UNION ALL SELECT id, kind, name, file, line, lineage, so
  ```
  ```suggested
  try {
        this.branchDb.exec(`ATTACH DATABASE '${this.familyPath.replace(/'/g, "''")}' AS family_attached`);
      } catch (attachErr) {
        // Already attached — ignore
      }
      this.branchDb.exec("DROP VIEW IF EXISTS branch_union_attached");
      this.branchDb.exec("CREATE VIEW branch_union_attached AS SELECT id, kind, name, file, line, lineage, source, data, 'family' as origin FRO
  ```

## src/hunter/triad.ts
- **src/hunter/triad.ts:49-49** (bug)
  `ev.line` is only checked for `typeof` and `Number.isFinite`, but line numbers must be positive integers. As written, negative numbers, zero, and fractional values (e.g., -1, 0, 3.7) all pass validation. Add a check that `ev.line >= 1` and `Number.isInteger(ev.line)` to ensure a valid line reference.
  ```existing
  if (typeof ev.line !== 'number' || !Number.isFinite(ev.line)) return false;
  ```
  ```suggested
  if (typeof ev.line !== 'number' || !Number.isFinite(ev.line) || ev.line < 1 || !Number.isInteger(ev.line)) return false;
  ```

## src/kernel/graph-test-target.ts
- **src/kernel/graph-test-target.ts:87-95** (bug)
  Duplicate callers can appear in the output. `whoCallsInDb` uses `SELECT DISTINCT src.label, predicate, target_canonical`, so the same caller label can appear multiple times in `q.callers` when it reaches the modified function via different predicates (e.g., 'calls' + 'traces-to') or through different target canonical IDs. Since `targets` is built directly from `q.callers.map(...)` without deduplication, the same caller can occupy multiple slots in the top-N result, pushing out other legitimate callers. Consider deduplicating by caller label before building targets, or merging predicates into a single entry per caller.
  ```existing
  const targets: TestTarget[] = q.callers.map((c, i) => ({
      label: c.caller,
      file: c.file,
      line: c.line,
      inboundDegree: degreeOf(c.caller),
      depth: 1,
      priority: i + 1,
      reason: `direct caller of ${modifiedFunction} via ${c.predicate || "call"} — tests ${c.caller} prove the contract survives the change`,
    }));
  ```
  ```suggested
  // Deduplicate callers by label — whoCallsInDb may return the same caller
    // via different predicates or target canonical IDs.
    const seen = new Set<string>();
    const targets: TestTarget[] = [];
    for (let i = 0; i < q.callers.length; i++) {
      const c = q.callers[i];
      if (seen.has(c.caller)) continue;
      seen.add(c.caller);
      targets.push({
        label: c.caller,
    
  ```

## src/omp/enforcement.ts
- **src/omp/enforcement.ts:119-120** (bug)
  **Fragile error code derivation via variable-existence heuristic.** The catch block at line 100 determines the error code by checking whether `abideDecl` was defined — a side-effect of control flow — rather than reading the error code from the thrown exception. This produces a **wrong error code** when `requireUp(abideDecl)` fails: the HardDependencyError carries code `GI_ENFORCE_ABIDE`, but because `abideDecl` is defined at that point, the catch block overwrites it to `GI_ENFORCE_JEV`. The `HardDependencyError` class (hard-deps.ts:41-51) already carries the correct `code` property; the catch should read it directly instead of re-deriving it from control flow. Additionally, the same pattern in the close layer (line 184) has a different subtle issue: `tsgDecl` is always defined in the catch (declared as `const` before any throw), so the fallback `?? "CLAIM_FW_JEV_NO_KEY"` is unreachable dead code.
  ```existing
  const code = (e as { code?: string }).code ?? (abideDecl ? "GI_ENFORCE_JEV" : "GI_ENFORCE_ABIDE");
    return { verdict: "SKIPPED", repair: null, reason: `work layer skipped: ${code}`, evidence: (e as Error).message };
  ```
  ```suggested
  // HardDependencyError always carries .code — read it directly.
    const code = (e instanceof Error && "code" in e) ? String((e as { code: unknown }).code) : "GI_ENFORCE_ABIDE";
    return { verdict: "SKIPPED", repair: null, reason: `work layer skipped: ${code}`, evidence: e instanceof Error ? e.message : String(e) };
  ```

## src/omp/layer-registry.ts
- **src/omp/layer-registry.ts:203-209** (bug)
  `factsFor` calls `p.up()` and does `if (!p.up().up) continue;` but does NOT validate the return shape like `auditOne` does. If a probe's `up()` returns a non-object truthy value (e.g., a string `"ok"` or a number `1`), the `.up` property access on line `p.up().up` returns `undefined`, which is falsy — so the consumer is silently skipped. However, if it returns an object like `{ up: 0 }`, it is correctly skipped. The deeper issue is that `factsFor` and `auditOne` disagree on the fate of a malformed probe: `auditOne` marks it DOWN with an explicit evidence string, while `factsFor` silently skips it, meaning the decision view omits facts that `audit` reports as DOWN — the two views are inconsistent. Consider extracting the validated probe access into a shared helper.
  ```existing
  try {
          if (!p.up().up) continue;
          // ★ F-354 FIX (2026-09-24): a null/non-object fact used to throw inside
          //   isAnchored, and the catch dropped the consumer's ENTIRE contribution —
          //   auditOne already filtered before isAnchored, factsFor did not. Same
          //   filter here: only the bad fact is discarded, never the whole consumer.
          const got:
  ```

## src/omp/rsi.ts
- **src/omp/rsi.ts:444-448** (bug)
  TOCTOU race condition: `liveIncludingForgedRetirement()` is called BEFORE `BEGIN IMMEDIATE`, so `current` may be stale. A concurrent `write()` with the same `canonicalId` could insert a new live row between the read and the lock acquisition. The subsequent `head()` (inside the txn) would then correctly read the new tip, but the early-return guard `current.kind === d.tier` still uses the stale `current`. Additionally, the `label` and `evidenceQuote` inherited from `current` may correspond to the wrong row. The derivation (`recount`) and `head()` are correctly inside the txn, but `current` is not. Either move `liveIncludingForgedRetirement()` inside the transaction, or re-read it after BEGIN IMMEDIATE.
  ```existing
  this.db.exec("BEGIN IMMEDIATE;");
    try {
      const counts = this.recount(canonicalId);
      const d = deriveTier(counts.confirmed, counts.refuted, counts.unresolved);
      const current = this.liveIncludingForgedRetirement(canonicalId);
  ```

## src/scoping/session-state.ts
- **src/scoping/session-state.ts:0-0** (bug)
  **Lock reclaim timeout (5s) can silently break mutual exclusion.** If the critical section `fn()` takes longer than 5 seconds (e.g., slow I/O on a large state file, NFS latency, or disk pressure), a waiting peer will reclaim the lock at `ageMs > 5000` and enter the critical section concurrently. This defeats the purpose of the lock — both processes will perform read-modify-write on the same state file simultaneously, and the lost-tick / clobbered-latch problem that F-130 was meant to fix will recur.

The5s floor was chosen to avoid false reclaim on coarse-granularity filesystems (F-158), but it introduces a correctness ceiling. Options:
 1. Add a `lastHeartbeat` timestamp to the token file that the lock holder periodically updates, so reclaim is based on heartbeat staleness rather than creation time.
 2. At minimum, log a warning when `fn()` exceeds 4s so the issue is observable.
 3. Document the5s hard limit on critical-section duration as a contract that callers must respect.
  ```existing
  function withStateLock<T>(statePath: string, fn: () => T): T {
  const lockPath = statePath + ".lock";
  const token = `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  for (;;) {
    try { fs.writeFileSync(lockPath, token, { flag: "wx" }); break; }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      let ageMs = Infinity;

  ```
- **src/scoping/session-state.ts:54-58** (bug)
  `fs.renameSync(tmp, statePath)` will throw `EXDEV` (Invalid cross-device link) if `statePath` and the `.tmp` file happen to reside on different filesystems. This can occur if the session state directory is on a symlinked mount, a bind mount, or a tmpfs-backed location. The exception is unhandled and will crash the process.

Since `tmp` is derived as `statePath + '.tmp'` in the same directory, this is only a risk when the parent directory itself is on a different device (e.g., a symlink where the parent is a mount point). Consider adding a copy+unlink fallback:
```typescript
try {
  fs.renameSync(tmp, statePath);
} catch (e) {
  if ((e as NodeJS.ErrnoException).code === 'EXDEV') {
    fs.copyFileSync(tmp, statePath);
    fs.unlinkSync(tmp);
  } else {
    throw e;
  }
}
```
  ```existing
  function writeSessionStateRaw(statePath: string, state: SessionStateMap): void {
  const tmp = statePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, statePath); // the atomic swap — a concurrent reader never sees torn JSON
}
  ```
