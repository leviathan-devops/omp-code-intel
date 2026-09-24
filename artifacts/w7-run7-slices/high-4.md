# HIGH slice 4 — 8 findings across 7 files

## src/hunter/graph/mechanical.ts
- **src/hunter/graph/mechanical.ts:167-169** (bug)
  Import path normalization misses `.mjs` and `.cjs` extensions. When a relative import has no recognized extension, the code always appends `.ts`, producing incorrect URIs for modules authored as `.mjs` or `.cjs`. Downstream consumers resolving `file:foo.mjs.ts` will fail to match actual files, silently corrupting the graph.
  ```existing
  if (!targetRel.endsWith('.ts') && !targetRel.endsWith('.tsx') && !targetRel.endsWith('.js')) {
            targetRel = `${targetRel}.ts`;
          }
  ```
  ```suggested
  const knownExts = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];
          if (!knownExts.some((ext) => targetRel.endsWith(ext))) {
            targetRel = `${targetRel}.ts`;
          }
  ```

## src/hunter/harness/report.ts
- **src/hunter/harness/report.ts:282-288** (bug)
  If `COMMIT` fails (e.g., disk full, I/O error), the transaction remains open on the `DbClient` handle. Unlike the inner DB operation block which has explicit ROLLBACK handling, the COMMIT path has no error recovery. A subsequent operation on this handle could silently operate inside the stale transaction or fail in confusing ways.

Suggested fix: wrap the COMMIT in a try/catch and attempt ROLLBACK on failure, throwing a descriptive error.
  ```existing
  } catch (dbErr: unknown) {
      try { input.db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        throw new Error(`REPORT_ROLLBACK_FAILED: batch error=${dbErr instanceof Error ? dbErr.message : String(dbErr)} rollback error=${rbErr instanceof Error ? rbErr.message : String(rbErr)} (the transaction may still be open — do not reuse this handle for writes)`);
      }
      throw dbErr;
    }
    i
  ```
  ```suggested
  } catch (dbErr: unknown) {
      try { input.db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        throw new Error(`REPORT_ROLLBACK_FAILED: batch error=${dbErr instanceof Error ? dbErr.message : String(dbErr)} rollback error=${rbErr instanceof Error ? rbErr.message : String(rbErr)} (the transaction may still be open — do not reuse this handle for writes)`);
      }
      throw dbErr;
    }
    t
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
