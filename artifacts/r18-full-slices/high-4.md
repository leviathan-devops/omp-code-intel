# HIGH slice 4 — 6 findings across 5 files

## src/hunter/firewall/artifact-scope.ts
- **src/hunter/firewall/artifact-scope.ts:198-202** (bug)
  TOCTOU vulnerability / logic bug in the target-existence check: `fs.lstat` already confirms the file exists at `targetNorm` (otherwise it throws ENOENT and is caught below). If it is not a symlink, the subsequent `fs.stat` is 100% redundant — it will always succeed and the code will always return BLOCKED. Worse, the `stat` call creates a TOCTOU window: between `lstat` and `stat`, an attacker (or concurrent process) could replace the regular file with a dangling symlink. `fs.stat` follows the symlink, the dangling target yields ENOENT, the catch block treats ENOENT as "does not exist" and falls through to `return allowed(...)`. The write then follows the dangling symlink, creating a file at an attacker-controlled location — AND bypassing the overwrite-prevention gate. Fix: remove the `await fs.stat(targetNorm)` call entirely; after `lstat` succeeds and confirms the target is not a symlink, the file unambiguously exists, so return BLOCKED immediately.
  ```existing
  const lt = await fs.lstat(targetNorm);
    if (lt.isSymbolicLink()) return blocked('REPORT_SCOPE_BLOCKED', base, input.target);
    await fs.stat(targetNorm);
    // The target EXISTS -> the explicit overwrite is BLOCKED (the N-versioning: v1 exists -> v2 allowed).
    return blocked('REPORT_SCOPE_BLOCKED', base, input.target);
  ```
  ```suggested
  const lt = await fs.lstat(targetNorm);
    if (lt.isSymbolicLink()) return blocked('REPORT_SCOPE_BLOCKED', base, input.target);
    // lstat succeeded and the entry is not a symlink → the file exists.
    // No redundant fs.stat: it would always succeed here and adds a TOCTOU window
    // (dangling-symlink replacement between lstat and stat would yield ENOENT,
    // causing an incorrect fallthro
  ```

## src/hunter/lexicon/compiler.ts
- **src/hunter/lexicon/compiler.ts:87-101** (bug)
  The sync `batteryVersion` function reads each corpus file once in its `.map()` for the hash, then calls `batteryName(profile)` which internally calls `extractRuleCards(profile.rules.corpus)` → `readLinesOrThrow(file)` → `fs.readFileSync()` — reading each file a SECOND time. If a corpus file changes between the two reads, the battery name is derived from different bytes than the hash fingerprint, producing an inconsistent version string. This is the exact class of TOCTOU/double-read bug that the W16-HIGH FIX resolved for the async path in `batteryVersionWithCardsAsync`, but the sync twin was never patched. The fix should follow the same pattern: extract cards once, derive both the name and the hash from the same in-memory bytes.
  ```existing
  export function batteryVersion(profile: ProjectProfile): string {
  const corpusText = profile.rules.corpus
    .map((p) => {
      let text: string;
      try {
        text = fs.readFileSync(p, 'utf8');
      } catch (e: unknown) {
        throw corpusUnreadable(p, String(e));
      }
      return `${p}\n${text}`;
    })
    .join('\n');
  const hash = sha256(`${corpusText}\n${JSON.stringify(pro
  ```

## src/hunter/tools/report-writer-local.ts
- **src/hunter/tools/report-writer-local.ts:103-103** (bug)
  The comment at line 109 promises 'stable tie-break by original index' but the comparator at lines 112-113 only compares severity ranks. When two findings share the same severity, their relative order depends on the engine's sort stability — the code silently violates its own documented contract. Although modern V8 sorts stably, the contract should be made explicit in the comparator to guard against non-V8 runtimes (e.g., Deno/alternative JS engines) and future refactors that might re-introduce instability.
  ```existing
  const ranked = [...findings].sort((a, b) => (severityRank[a.severity] ?? 99) - (severityRank[b.severity] ?? 99));
  ```
  ```suggested
  const ranked = [...findings].map((f, i) => ({ f, i })).sort((a, b) => {
      const sa = severityRank[a.f.severity] ?? 99;
      const sb = severityRank[b.f.severity] ?? 99;
      return sa !== sb ? sa - sb : a.i - b.i; // stable tie-break by original index
    }).map(({ f }) => f);
  ```

## src/kernel/graph-pre-flight.ts
- **src/kernel/graph-pre-flight.ts:59-59** (bug)
  The docstring contract states: '≥50 → domain-level (architectural review BEFORE coding)'. However, the commit strategy also escalates to 'domain-level' when `directInbound >= 20`, which has no corresponding warning. If `imp.reaches` is e.g. 10 but `directInbound` is 25, the result is `commitStrategy: 'domain-level'` without the 'WIDE BLAST RADIUS: … architectural review required' warning. This means callers relying on the warnings to gate architectural review will miss it. Either add a matching warning for the `directInbound` path, or update the docstring to document the dual-trigger contract.
  ```existing
  if (imp.reaches >= 50) warnings.push(`WIDE BLAST RADIUS: ${imp.reaches} nodes reached — architectural review required before coding`);
  ```
- **src/kernel/graph-pre-flight.ts:43-52** (bug)
  The `srcIds` query has no LIMIT clause and feeds into a dynamically constructed SQL `IN (...)` clause. If the target label maps to a large number of live canonical IDs (the upstream `impactInDb` caps at 500, but this query does not), the generated SQL could contain hundreds or thousands of `?` placeholders, approaching SQLite's SQLITE_MAX_VARIABLE_NUMBER (default 999) and causing a runtime error. Consider adding a cap (e.g., `.slice(0, 500)`) to `srcIds` before building the IN clause, consistent with the 500-cap used in `impactInDb`.
  ```existing
  const srcIds = (db.query(
      "SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL",
    ).all(target) as Array<{ canonical_id: string }>).map((r) => r.canonical_id);
    let uses = 0;
    if (srcIds.length > 0) {
      const ph = Array.from({ length: srcIds.length }, () => "?").join(", ");
      const rows = db.query(
        `SELECT COUNT(*) AS n FROM typed_edges e

  ```

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:20-22** (bug)
  EXPORT_PARSE_RE's `function\*?` does NOT match `export function * foo()` (with space before `*`), because the `\*?` requires the asterisk to be immediately adjacent to `function`. Only EXPORT_GEN_RE (which uses `function\s*\*`) catches this spaced form. This means GEN is not merely "defense in depth" — it is the sole regex that handles `export function * foo()` and `export async function * foo()`. If a future maintainer sees the comment "defense in depth" and removes GEN thinking PARSE fully covers generators, these forms would silently be missed, allowing export removals to evade the gate.

Suggestion: either (a) fix PARSE to also handle the spaced form (`function\s*\*?`) so each regex is self-sufficient, or (b) update the comment to clearly state that GEN is NOT redundant and must not be removed.
  ```existing
  const EXPORT_PARSE_RE = /export\s+(?:async\s+)?(?:function\*?|const|class|let|var|type|interface|enum)\s+(\w+)/g;
// ★ F-41 FIX (2026-09-24): `export function*` (the `*` between function and name) and `export const {a}/[a]` never matched — stripped exports evaded the gate. Generator + destructured forms covered in both fns below.
const EXPORT_GEN_RE = /export\s+(?:async\s+)?function\s*\*\s*(\w+)/g
  ```
  ```suggested
  const EXPORT_PARSE_RE = /export\s+(?:async\s+)?(?:function\s*\*?|const|class|let|var|type|interface|enum)\s+(\w+)/g;
// GEN still kept as defense-in-depth, but PARSE now independently covers the spaced form.
const EXPORT_GEN_RE = /export\s+(?:async\s+)?function\s*\*\s*(\w+)/g;
  ```
