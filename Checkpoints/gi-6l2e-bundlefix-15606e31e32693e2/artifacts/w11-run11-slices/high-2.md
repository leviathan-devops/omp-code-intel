# HIGH slice 2 — 11 findings across 8 files

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

## src/hydra/templates/types.ts
- **src/hydra/templates/types.ts:49-49** (bug)
  `outputSchema` is typed as `z.ZodSchema` (equivalent to `z.ZodSchema<any, any, any>`), which accepts **any** Zod schema. This means a caller can assign a schema that does not produce `SubagentOutput` (or even a compatible shape), and TypeScript will not flag it. The mismatch would only surface at runtime when the auditor attempts to validate or parse output. Consider tightening this to a concrete generic type so misuse is caught at compile time.
  ```existing
  outputSchema: z.ZodSchema;
  ```
  ```suggested
  outputSchema: z.ZodType<SubagentOutput>;
  ```

## src/omp/adapters/semantica.ts
- **src/omp/adapters/semantica.ts:65-70** (bug)
  JSON.parse is followed by a direct `as SemanticaKg` cast with no runtime validation. If `kg.json` is corrupted or adversarially shaped — e.g. `entities` is a string, number, object, or missing — the code will silently produce an empty result set from the `.filter()` call, or throw an unguarded TypeError if `entities` is not iterable. Add a runtime check after parsing to validate that `kg.entities` is actually an array (or absent/undefined). This gives callers a clear diagnostic instead of a silent wrong answer or an opaque crash.
  ```existing
  let kg: SemanticaKg;
      try {
        kg = JSON.parse(raw) as SemanticaKg;
      } catch (e) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
  ```
  ```suggested
  let kg: SemanticaKg;
      try {
        kg = JSON.parse(raw) as SemanticaKg;
      } catch (e) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      if (kg.entities !== undefined && !Array.isArray(kg.entities)) {
        throw new Error(`GI_LAYER_SEMANTICA: the KG store has an invalid 'entities' fi
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

## src/omp/graph-facts.ts
- **src/omp/graph-facts.ts:0-0** (bug)
  M-GRAPH-1 IGNORE branch evidence reports `inD.n` (total in-degree, no predicate filter) but the verdict decision was based on `producers.n` (calls-only in-degree). This produces an audit trail where the evidence string does not match the fact that was actually checked. Should be `producers.n` to match the decision criteria.
  ```existing
  : { rule: "M-GRAPH-1", settles: true, action: "IGNORE",
            reason: `the consumed symbol "${input.target}" has producers`,
            evidence: `in-degree ${inD.n} · sample: ${producers.sample.slice(0, 3).join(", ")}` });
  ```
  ```suggested
  : { rule: "M-GRAPH-1", settles: true, action: "IGNORE",
            reason: `the consumed symbol "${input.target}" has producers`,
            evidence: `in-degree (calls) ${producers.n} · sample: ${producers.sample.slice(0, 3).join(", ")}` });
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
