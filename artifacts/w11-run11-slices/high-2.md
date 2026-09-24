# HIGH slice 2 — 12 findings across 9 files

## src/hunter/graph/mechanical.ts
- **src/hunter/graph/mechanical.ts:131-133** (bug)
  Class member iteration only checks for `isMethodDeclaration`, `isPropertyDeclaration`, and `isConstructorDeclaration`. Getters (`isGetAccessorDeclaration`) and setters (`isSetAccessorDeclaration`) are silently skipped, meaning a class like `class Foo { get bar() { ... } set bar(v) { ... } }` will not produce a `method:Foo.bar` triple for those accessors. This creates incomplete class topology — downstream consumers looking for all members of a class will miss getter/setter accessors.
  ```existing
  for (const member of stmt.members) {
          if ((ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member) || ts.isConstructorDeclaration(member)) && member.name && ts.isIdentifier(member.name)) {
            const mName = member.name.text;
  ```
  ```suggested
  for (const member of stmt.members) {
          if ((ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member)) && member.name && ts.isIdentifier(member.name)) {
            const mName = member.name.text;
  ```
- **src/hunter/graph/mechanical.ts:186-188** (bug)
  The code only handles `ExportDeclaration` (re-exports like `export { x }` and `export * from './mod'`). It does NOT handle:

1. **`ExportAssignment`** (`export default <expression>`) — these produce no `exports` triple at all.
2. **Inline exports** (`export class Foo`, `export function bar()`, `export const x = 1`) — the declaration triples are generated, but no `exports` triple links the declared entity back to the file as an exported symbol.

This means the graph cannot distinguish between a locally-declared symbol and an exported one for most export patterns. Only re-export syntax generates `exports` triples.
  ```existing
  if (ts.isExportDeclaration(stmt)) {
        const expLine = lineOf(sf, stmt);
        const expEvidence = evidenceQuoteForNode(sf, stmt);
  ```
  ```suggested
  // Handle export default expressions
      if (ts.isExportAssignment(stmt)) {
        const expLine = lineOf(sf, stmt);
        const expEvidence = evidenceQuoteForNode(sf, stmt);
        pushTriple(fileCanon, 'exports', `default:${relPosix}`, expEvidence, relPosix, expLine);
      }
      // Handle inline exports (export class/function/const)
      const hasExportModifier = ts.canHaveModifiers(st
  ```

## src/hunter/graph/merge.ts
- **src/hunter/graph/merge.ts:166-167** (bug)
  `conflictReason` deduplication uses `String.includes()` to check whether a contradiction has already been recorded. This produces **false positives** when an object name is a strict prefix of another object name. For example, if a prior addition appended `; ALSO vs semantic predicate=isA for node->container`, and a new semantic triple has object `contain`, the `add` string `; ALSO vs semantic predicate=isA for node->contain` is a prefix-substring of the existing entry and `includes()` returns `true` — silently skipping a real, distinct contradiction.

Suggested fix: use a `Set<string>` to track which semantic triples have already been appended, keyed by a stable composite (e.g. `predicate + subject + object`), and check `set.has(...)` instead of string-level includes.
  ```existing
  const add = `; ALSO vs semantic predicate=${s.predicate} for ${s.subject}->${s.object}`;
          if (existing.conflictReason !== null && !existing.conflictReason.includes(add)) existing.conflictReason = `${existing.conflictReason}${add}`;
  ```
  ```suggested
  const dedupKey = `${s.predicate}|${s.subject}|${s.object}`;
          if (!existing.seenContradictions.has(dedupKey)) {
            existing.seenContradictions.add(dedupKey);
            const add = `; ALSO vs semantic predicate=${s.predicate} for ${s.subject}->${s.object}`;
            existing.conflictReason = `${existing.conflictReason}${add}`;
          }
  ```

## src/hunter/lexicon/compiled-store.ts
- **src/hunter/lexicon/compiled-store.ts:94-104** (bug)
  `del` is prepared on line 96 BEFORE the try block. If `db.prepare(ins)` on line 100 throws, `del` is never finalized and leaks a native handle. The finally block (lines 112-115) only runs if the try block is entered, but the failure of `ins` preparation prevents entry into that try. This is the same class of native-handle leak that F-358/F-358b were designed to fix, but it was missed for `del`.
  ```existing
  export function writeRuleCards(db: DbClient, cards: RuleCard[], corpusHash: string): void {
  db.exec('BEGIN');
  const del = db.prepare('DELETE FROM rule_cards WHERE corpus_hash = ?');
  // ★ F-358b FIX (2026-09-24): `ins` is declared BEFORE the try — the finally block
  //   finalizes it, and a `const` inside the try is out of scope there (TS2304 on the
  //   finally's `ins.finalize()`). Scope 
  ```
  ```suggested
  export function writeRuleCards(db: DbClient, cards: RuleCard[], corpusHash: string): void {
  db.exec('BEGIN');
  let del: Statement | undefined;
  let ins: Statement | undefined;
  try {
    del = db.prepare('DELETE FROM rule_cards WHERE corpus_hash = ?');
    ins = db.prepare(
      'INSERT INTO rule_cards (quote,anchor,classification,severity,proposed,corpus_hash) VALUES (?,?,?,?,?,?)',
    );

  ```

## src/hydra/client-reader.ts
- **src/hydra/client-reader.ts:74-77** (bug)
  When `old.close()` wins the race (resolves before 5000ms), the timeout timer is never cleared. Its `setTimeout` callback will still fire later, calling `rej()` on an already-resolved race — producing an unhandled promise rejection in Node.js. Conversely, when the timeout fires first, `old.close()` continues running in the background and its eventual resolution also becomes unhandled. In both cases the losing promise is abandoned without `.catch()`. Fix by clearing the timer on close success and adding `.catch()` to both branches:
```ts
let timer: ReturnType<typeof setTimeout> | undefined;
const result = await Promise.race([
  old.close(),
  new Promise<never>((_, rej) => {
    timer = setTimeout(() => rej(new Error('TRANSPORT_CLOSE_TIMEOUT')), 5000);
  }),
]);
if (timer) clearTimeout(timer);
return result;
```
  ```existing
  await Promise.race([
            old.close(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('TRANSPORT_CLOSE_TIMEOUT: close() exceeded 5000ms — releasing the reference anyway')), 5000).unref?.()),
          ]);
  ```
  ```suggested
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
          await Promise.race([
            old.close().catch(() => {}),
            new Promise<never>((_, rej) => {
              closeTimer = setTimeout(
                () => rej(new Error('TRANSPORT_CLOSE_TIMEOUT: close() exceeded 5000ms — releasing the reference anyway')),
                5000,
              );
            }),
       
  ```

## src/omp/adapters/arsumbris.ts
- **src/omp/adapters/arsumbris.ts:94-106** (bug)
  The recursive `walk` function in the filter callback has no depth limit. A deeply nested daemon payload (up to 32 MB) could blow the call stack. Consider adding a `maxDepth` parameter (e.g., 64) and bailing out when exceeded, consistent with the existing fail-closed philosophy elsewhere in this file.
  ```existing
  const walk = (v: unknown): void => {
              if (typeof v === "string") values.push(v);
              else if (Array.isArray(v)) {
                if (seen.has(v)) return;
                seen.add(v);
                for (const x of v) walk(x);
              } else if (v && typeof v === "object") {
                if (seen.has(v as object)) return;
                seen.add(v as object);
    
  ```
  ```suggested
  const walk = (v: unknown, depth = 0): void => {
              if (depth > 64) return;
              if (typeof v === "string") values.push(v);
              else if (Array.isArray(v)) {
                if (seen.has(v)) return;
                seen.add(v);
                for (const x of v) walk(x, depth + 1);
              } else if (v && typeof v === "object") {
                if (seen.has(v as 
  ```

## src/omp/evidence-producer.ts
- **src/omp/evidence-producer.ts:134-137** (bug)
  The undefined-gate spread `{...(e.repair === undefined ? {} : { repair: e.repair })}` (and the identical pattern for `passed` on line 137) allows `null` through. If a caller passes `repair: null` or `passed: null` (not `undefined`), the record will contain `{ repair: null }` or `{ passed: null }` — which the downstream oracle (oracle.ts) will see as a *present* field rather than an *absent* one. The oracle treats absent `passed` as NO SIGNAL (a deliberate O1 fix), but `{ passed: null }` is a *present* field — the oracle may interpret it differently (e.g., `record.passed === true` is false, but `record.passed !== undefined` is true, potentially changing branching logic). Use `e.repair != null` (loose null-check) or `e.repair !== undefined && e.repair !== null` to reject both `undefined` and `null`, preserving the 'absent means unknown' contract the oracle relies on. Apply the same guard to `passed`.
  ```existing
  out.push({
        kind: "edit", at: e.at, target: e.target ?? subject.target, tool: e.tool,
        ...(e.repair === undefined ? {} : { repair: e.repair }),
      });
  ```
  ```suggested
  out.push({
        kind: "edit", at: e.at, target: e.target ?? subject.target, tool: e.tool,
        ...(e.repair != null ? { repair: e.repair } : {}),
      });
  ```

## src/omp/fire-ledger.ts
- **src/omp/fire-ledger.ts:358-362** (bug)
  **Bug: `all(limit)` and `byRule(limit)` return the WRONG rows when `limit` is specified.**

When a `limit` is passed, the SQL queries fetch the N **most recent** rows (ORDER BY id DESC LIMIT N) and then reverse them in JavaScript. This means a caller passing `limit: 100` expecting the 100 oldest fires actually gets the 100 **newest** fires reversed. The method name `all()` and the parameter name `limit` unambiguously imply "first N" (oldest). This silently returns the wrong calibration data — the oldest rows, which are the most important for establishing a calibration baseline, are excluded.

Additionally, the `.reverse()` allocates a new array and is wasted work for callers that only need a count or existence check.

Suggested fix: use a subquery to select the oldest N rows:
```sql
SELECT * FROM (
  SELECT * FROM fire_decisions ORDER BY id DESC LIMIT ?1
) sub ORDER BY id ASC
```
  ```existing
  const raw = (limit === undefined
        ? this.db.query(`SELECT * FROM fire_decisions ORDER BY id ASC`).all()
        : this.db.query(`SELECT * FROM fire_decisions ORDER BY id DESC LIMIT ?1`).all(limit)) as Record<string, unknown>[];
      const rows = raw.map(toPersisted);
      return limit === undefined ? rows : rows.reverse();   // keep oldest-first
  ```
- **src/omp/fire-ledger.ts:377-381** (bug)
  **Bug: `byRule(ruleId, limit)` has the same wrong-limit semantics as `all(limit)`.**

Same issue as `all()` — when a `limit` is provided, the query fetches the N most recent rows for the rule and reverses them in memory, returning the wrong rows. A caller wanting "the oldest 50 fires for rule X" gets the newest 50 reversed instead.

Suggested fix (same subquery pattern as `all()`):
```sql
SELECT * FROM (
  SELECT * FROM fire_decisions WHERE rule_id = ?1 ORDER BY id DESC LIMIT ?2
) sub ORDER BY id ASC
```
  ```existing
  const raw = (limit === undefined
        ? this.db.query(`SELECT * FROM fire_decisions WHERE rule_id = ?1 ORDER BY id ASC`).all(ruleId)
        : this.db.query(`SELECT * FROM fire_decisions WHERE rule_id = ?1 ORDER BY id DESC LIMIT ?2`).all(ruleId, limit)) as Record<string, unknown>[];
      const rows = raw.map(toPersisted);
      return limit === undefined ? rows : rows.reverse();
  ```

## src/omp/populate.ts
- **src/omp/populate.ts:52-59** (bug)
  Corbell meta-write degradation is silent to the caller. When the meta INSERT fails (lines 68-75), the catch logs to stderr but the function returns `skipped: false` with `substrate: "corbell"` — the same shape as a fully successful populate. Callers have no programmatic way to detect the stale metadata. Because the data already committed and there is no retry loop, this inconsistency becomes permanent. Either (a) return a degradation flag in `PopulateResult` (e.g. `metaDegraded: true`) so callers can warn or retry, or (b) re-throw after logging so callers see the failure (preferred if metadata is contractually required).
  ```existing
  } catch (e) {
        try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        // ★ F-711 FIX (2026-09-24): the corbell data already committed - a meta-row failure must
        // DEGRADE, not throw past a PopulateResult-typed function (no live caller catches
        // GI_META_WRITE_FAILED; it escaped as an uncaught exception). LOUD on stderr, honest
        // success for the da
  ```
  ```suggested
  } catch (e) {
        try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        console.error(`[gi-omp] GI_META_WRITE_FAILED: batch meta write for ${storePath} did not commit (${e instanceof Error ? e.message : String(e)}) - data populated, meta degraded`);
        // Return a degraded result so callers can detect and act on stale metadata
        return {
          filesIndexed: 0
  ```

## src/scoping/gi-session-path.ts
- **src/scoping/gi-session-path.ts:159-163** (bug)
  **Bug: `forbiddenGlobalHomeGraph()` uses native `path.join` but `isGlobalHomeGraph()` uses `path.posix.join` — they will never agree on Windows.**

`forbiddenGlobalHomeGraph()` (line 154) returns e.g. `C:\Users\x\.omp\graph-intelligence\store.sqlite` on Windows. `isGlobalHomeGraph()` (line 164) builds the banned string with `path.posix.join`, producing `C:/Users/x/.omp/graph-intelligence/store.sqlite`. Since the comparison is `norm === banned`, these differ by separators and the guard will **never reject** a global home graph store on Windows.

The same applies to the test `tests/st-gi-omp-scope.ts:67-75` — it feeds `forbiddenGlobalHomeGraph()` into `assertSessionStorePath`, which would fail on Windows due to the same mismatch.

Fix `isGlobalHomeGraph` to use `path.join` (native) instead of `path.posix.join`, or ensure `norm` is always compared in a platform-consistent way.
  ```existing
  function isGlobalHomeGraph(norm: string): boolean {
  const home = (process.env.HOME ?? os.homedir()).replace(/\\/g, "/");
  const banned = path.posix.join(home, ".omp/graph-intelligence/store.sqlite");
  return norm === banned;
}
  ```
- **src/scoping/gi-session-path.ts:80-87** (security)
  **Security (high): TOCTOU race in the F-434b symlink guard — the parent directory can be swapped for a symlink between the `try { fs.realpathSync(parent) }` call and the preceding logic.**

The guard (line 78-84) resolves the parent's real path, then compares session IDs. An attacker who can create/delete files in the scope root could: (1) ensure the parent dir does not exist yet so `realpathSync` throws and the check is skipped, (2) create a symlink at the parent path pointing outside the scope, (3) the store file is then created through the symlink. The regex shape check (line 64) provides defense-in-depth — the logical path still must match the session pattern — but an attacker controlling the parent directory name could craft a symlink target that retains the same session ID segment.

Consider opening the store file descriptor with `O_NOFOLLOW` or using `fs.lstatSync` to detect symlinks, and/or holding a directory lock from scope root down to the session dir.
  ```existing
  const parent = path.dirname(resolved);
  let parentReal: string | null = null;
  try { parentReal = fs.realpathSync(parent); } catch { parentReal = null; }
  if (parentReal !== null) {
    const parentNorm = parentReal.replace(/\\/g, "/");
    const want = /\/sessions\/([A-Za-z0-9_-]{8,24})\/?$/.exec(norm);
    const got = /\/sessions\/([A-Za-z0-9_-]{8,24})\/?$/.exec(parentNorm);
    if (want !== 
  ```
