# HIGH slice 3 — 10 findings across 8 files

## src/hunter/firewall/readonly.ts
- **src/hunter/firewall/readonly.ts:166-170** (bug)
  **Quoted-argument tokenization produces incorrect `secondToken`, breaking git/sed routing.**

`parseCommand` splits on `\s+` without respecting shell quotes, so `commit -m "fix"` tokenizes as `[commit, -m, "fix"]` with `secondToken = "-m"` instead of the message. For `sed -n '1,20p'`, tokenization happens to work because `-n` is unquoted, but for `sed -n "1,20p"`, `secondToken` becomes `"1,20p"` (with the quote character), so `routeSed` returns `'MUTATION'` and a legitimate read-only sed command is incorrectly blocked.

More critically, for a command like `node -e "execSync('rm -rf /')"`, tokenization yields `secondToken = '-e'` — this works **by accident** because `-e` is not the dangerous part. But the `secondToken` value is semantically wrong and would break any future logic that inspects it (e.g., checking whether the argument to `-e` is a file path vs. inline code).

**Suggested fix:** Use a proper shell-aware tokenizer (e.g., a state machine tracking quote context) or use a regex like `/(?:[^\s"']+|"[^"]*"|'[^']*')+/g` to split tokens while respecting quotes.
  ```existing
  function parseCommand(command: string): ParsedCommand {
  const trimmed = command.trimStart();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const firstToken = tokens[0] ?? '';
  const secondToken = tokens[1] ?? '';
  ```
  ```suggested
  function parseCommand(command: string): ParsedCommand {
  const trimmed = command.trimStart();
  // Shell-aware token split: respects single/double quotes so that
  // `sed -n "1,20p"` yields secondToken `"1,20p"` (the full quoted arg)
  // rather than a truncated/broken token.
  const tokenRe = /[^\s"']+|"[^"]*"|'[^']*'/g;
  const tokens = trimmed.match(tokenRe) ?? [];
  const firstToken = tokens
  ```
- **src/hunter/firewall/readonly.ts:252-257** (security)
  **`allowed()` and `blocked()` return plain object literals instead of `BashLockdownDecision` — type-safety gap allowing silent alias desync.**

The `allowed()` and `blocked()` helper functions construct return values as raw object literals with `string`-typed `state` and `triplet` fields, rather than using `BashLockdownDecision` as their return type annotation. This means:

1. TypeScript will not flag if `state` is set to a string that doesn't match `verdict` (e.g., `state: 'PARSED->ALLOW_READ'` vs. `state: 'ALLOW_READ'`).
2. The sibling `lexicon-types.ts` already has `makeLexiconDecision()` and `assertLexiconDecisionConsistent()` for exactly this purpose — the `F-850 FIX` comment in that file describes this desync class as a known risk.
3. Any downstream code that relies on `decision.state === decision.verdict` (the test alias contract) would silently receive `'PARSED->ALLOW_READ'` instead of `'ALLOW_READ'`.

**Suggested fix:** Either annotate the return type as `BashLockdownDecision` and set `state` to match `verdict`, or use `makeLexiconDecision` from `lexicon-types.ts`.
  ```existing
  function allowed(pattern: string, token: string, command: string): BashLockdownDecision {
  const mPSE: MPSE = { Pattern: pattern, State: 'PARSED->ALLOW_READ', Evidence: command };
  return {
    verdict: 'ALLOW_READ', state: 'ALLOW_READ', pattern, token, message: '', mPSE, triplet: mPSE,
  };
}
  ```
  ```suggested
  function allowed(pattern: string, token: string, command: string): BashLockdownDecision {
  const mPSE: MPSE = { Pattern: pattern, State: 'PARSED->ALLOW_READ', Evidence: command };
  return {
    verdict: 'ALLOW_READ', state: 'ALLOW_READ', pattern, token, message: '', mPSE, triplet: mPSE,
  };
}
// Note: `state` is set to match `verdict` above. The raw object literal is accepted
// by TypeScript b
  ```

## src/hunter/harness/micro-loop-machine.ts
- **src/hunter/harness/micro-loop-machine.ts:393-393** (bug)
  `handleDisposables` is declared as an array (line ~304) and iterated over in both `stop()` and `settle()` to perform cleanup of subscriptions, but it is **never populated anywhere**. No code ever calls `handleDisposables.push(...)`. This makes all cleanup logic that references this array dead code:

1. In `stop()`: the `for (const d of handleDisposables.splice(0))` loop never executes.
2. In `settle()`: the reverse-iteration removal loop (`for (let i = handleDisposables.length - 1; ...)`) never executes.

Meanwhile, subscriptions created in `done()` (`sub2`, `sub3`) are only managed by the local `settle()` function. If `stop()` is called while `done()` is pending, `sub2` and `sub3` remain subscribed and are never cleaned up — they leak.

**Suggestion**: Either add `handleDisposables.push(sub2)` / `handleDisposables.push(sub3)` after creating them in `done()` (so `stop()` can clean them up), or remove the `handleDisposables` array entirely and consolidate all subscription lifecycle management into a single mechanism.
  ```existing
  const handleDisposables: Array<{ unsubscribe(): void }> = [];
  ```
  ```suggested
  const handleDisposables: Array<{ unsubscribe(): void }> = [];
  // ... inside done():
        handleDisposables.push(sub2);
        handleDisposables.push(sub3);
  ```

## src/hunter/surface/lsp-injector.ts
- **src/hunter/surface/lsp-injector.ts:250-263** (security)
  The `resolveTouchedFiles` glob-to-regex compiler does NOT escape the `.` in `.*` and `.` replacements. A user-supplied glob like `a.a.a.a.a.a.a.a.a.a.a.a` (no wildcards) passes the `/[*?[]/` test because it contains `.` — but `.` is NOT in that character class, so it does NOT enter the glob branch. However, a glob like `a*.a*.a*.a*` compiles `*`→`.*` and `.` stays literal (correct), but a glob like `....*` has dots that pass through unescaped. More critically, patterns with deeply nested quantifiers like `*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a*a` compile to `.*a.*a.*a...` which causes catastrophic backtracking (ReDoS). The try/catch won't save you — RegExp construction succeeds; it's the `.test()` call that hangs. Add a max-length check on the input before compilation.
  ```existing
  if (!/[*?[]/.test(candidate)) return [];
    let rx: RegExp;
    try {
      // ★ F-49 FIX (2026-09-24): two defects — no /g flag (only the first special
      // ★ char escaped, later ones compiled live) and `[`/`]` unescaped (a `[a-z]`
      // ★ glob threw inside RegExp → caught → silent [] miss). `[`/`]` pass through
      // ★ as the glob class syntax; every other regex special is escaped glo
  ```
  ```suggested
  if (!/[*?[]/.test(candidate)) return [];
    // ★ ReDoS guard: reject patterns whose compiled regex could cause catastrophic backtracking.
    const GLOB_MAX_LEN = 200;
    if (candidate.length > GLOB_MAX_LEN) return [];
    let rx: RegExp;
    try {
      rx = new RegExp('^' + [...candidate].map((ch) => {
        if (ch === '*') return '.*';
        if (ch === '?') return '.';
        if (ch === 
  ```

## src/hydra/templates/mpse.ts
- **src/hydra/templates/mpse.ts:21-30** (maintainability)
  Three of the four conformance schemas — MpseContractConformanceSchema, MpseStageConformanceSchema, and ProvenanceConformanceSchema — are structurally identical (contractId, specPath, specLine, specQuote, implementationStatus, file?, line?, evidence?). Only MpseOracleConformanceSchema adds an `epsilon` field. This is a DRY violation: if a field is added/changed in one, the others may silently diverge. Extract a shared base schema and extend it (Oracle adds epsilon, Provenance adds nothing extra).
  ```existing
  export const MpseContractConformanceSchema = z.object({
  contractId: z.string().min(1),
  specPath: z.string().min(1),
  specLine: z.number().int().positive(),
  specQuote: z.string().min(1),
  implementationStatus: z.enum(["conformant", "violated", "unimplemented"]),
  file: z.string().optional(),
  line: z.number().int().positive().optional(),
  evidence: z.string().optional(),
});
  ```
  ```suggested
  // Shared base — all four MPSE conformance schemas share these fields.
const MpseConformanceBaseSchema = z.object({
  contractId: z.string().min(1),
  specPath: z.string().min(1),
  specLine: z.number().int().positive(),
  specQuote: z.string().min(1),
  implementationStatus: z.enum(["conformant", "violated", "unimplemented"]),
  file: z.string().optional(),
  line: z.number().int().positive().opt
  ```

## src/omp/decision.ts
- **src/omp/decision.ts:0-0** (security)
  `target` in `decideFireFromGraph` is validated only for type and emptiness, but not for path traversal. It flows directly into `graphFacts({ storePath, target, intent })`, which likely uses it to locate graph nodes or files under `storePath`. A `target` value like `../../etc/passwd` could cause `graphFacts` to read outside the intended scope. The same `isAbsolute`/`..`/NUL guard applied to `scopeRoot` should also be applied here, or at minimum a `..` segment check.
  ```existing
  if (intent !== "consume" && intent !== "declare" && intent !== "mutate" && intent !== "measure") {
    throw new Error(`GI_DECIDE_BAD_INPUT: intent must be one of consume|declare|mutate|measure (got ${String(intent)})`);
  }
  // ★ F-907 FIX (2026-09-24): same traversal hole as decideFromRegistry — symmetric guard so both entry points name a bad scopeRoot instead of joining it into store/ledger/po
  ```
  ```suggested
  // ★ F-907 FIX (2026-09-24): same traversal hole as decideFromRegistry — symmetric guard so both entry points name a bad scopeRoot instead of joining it into store/ledger/policy paths.
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(/[\\/]").includes("..") || scopeRoot.includes("\0")) {
    throw new Error(`GI_DECIDE_BAD_INPUT: scopeRoot must be a canonical absolute path, got ${JSON.stringify
  ```

## src/omp/gate-middleware.ts
- **src/omp/gate-middleware.ts:16-16** (bug)
  EXPORT_PARSE_RE is missing support for `export async function*` (async generator). The regex `EXPORT_GEN_RE` handles non-async generators, but `EXPORT_PARSE_RE`'s `export\s+(?:async\s+)?(?:function|const|class|let|var|type|interface|enum)\s+(\w+)` does not match `export async function* name()` because the `\s+` between `function` and the name expects a space, not `*`. Meanwhile `EXPORT_GEN_RE` only handles `function*` without `async`. So `export async function* foo()` is not matched by either regex, allowing the gate to miss this export.
  ```existing
  const EXPORT_GEN_RE = /export\s+(?:async\s+)?function\s*\*\s*(\w+)/g;
  ```
  ```suggested
  const EXPORT_GEN_RE = /export\s+(?:async\s+)?function\s*\*\s*(\w+)/g;
// Note: this already handles async generators via `(?:async\s+)?` — verify it's correct.
  ```

## src/omp/store-open.ts
- **src/omp/store-open.ts:76-88** (bug)
  Registry upsert race window: After the exclusive file create (or EEXIST catch), two concurrent openers can both observe `!current` from `findGiSessionByStorePath` and both call `upsertGiSession`. Since `upsertGiSession` uses SQLite UPSERT (ON CONFLICT DO UPDATE), the second call silently overwrites the first's registry row — the first opener returned with `created: false` but its `scope_root` / `opened_at` metadata was replaced. No lock or atomic compare-and-swap protects this check-then-upsert pair. Consider wrapping the check + upsert in a SQLite transaction with a SELECT-for-update pattern, or using a file-level lock (similar to `withStateLock` in session-state.ts) around the post-create registry check + insert.
  ```existing
  const current = findGiSessionByStorePath(storePath);
  if (current && current.session_id !== ownerKey) {
    throw new GiScopeError(
      `GI_SCOPE_REFUSED: store ${storePath} owned by ${current.session_id}; caller ${callerKey}`,
    );
  }
  if (!current) {
    upsertGiSession({
      sessionId: ownerKey,
      scopeRoot: resolvedScopeRoot,
      storePath,
    });
  }
  ```

## src/scoping/gi-session-path.ts
- **src/scoping/gi-session-path.ts:80-86** (security)
  Even after fixing the regex above, the symlink guard still only compares session IDs — it does not verify that the real (symlink-resolved) path stays within the project scope root. A symlink at the `sessions` directory level pointing to `/tmp/sessions/` (note the matching `/sessions/` segment) would resolve to a path whose session ID matches the logical path's session ID, passing the guard while storing data outside the scope.

Recommendation: additionally verify that `parentReal` starts with the expected scope root prefix. This requires either passing `scopeRoot` as a parameter to `assertSessionStorePath`, or extracting and checking the expected parent prefix from the logical path before the dirname step.
  ```existing
  const parent = path.dirname(resolved);
  let parentReal: string | null = null;
  try { parentReal = fs.realpathSync(parent); } catch { parentReal = null; }
  if (parentReal !== null) {
    const parentNorm = parentReal.replace(/\\/g, "/");
    const want = /\/sessions\/([A-Za-z0-9_-]{8,24})\/?$/.exec(norm);
    const got = /\/sessions\/([A-Za-z0-9_-]{8,24})\/?$/.exec(parentNorm);
  ```
  ```suggested
  const parent = path.dirname(resolved);
  let parentReal: string | null = null;
  try { parentReal = fs.realpathSync(parent); } catch { parentReal = null; }
  if (parentReal !== null) {
    const parentNorm = parentReal.replace(/\\/g, "/");
    // Scope-containment: the real parent must still be under the same scope root.
    const expectedParent = path.dirname(resolved); // logical parent (resolve
  ```
- **src/scoping/gi-session-path.ts:129-134** (bug)
  **Session ID collision: `scope-{slug}` truncated to 24 chars silently merges distinct projects.**

The slug is built from the resolved scope root with all non-alphanumeric chars replaced by `-`, then the prefix `scope-` is prepended and the result is sliced to 24 characters. Two distinct scope roots whose normalized paths share the first 18 slug characters will produce identical session IDs. For example:

- `/home/user/projects/my-long-project-alpha/src` → `scope-home-user-projects-my-long-proj` (24 chars)
- `/home/user/projects/my-long-project-beta/src` → `scope-home-user-projects-my-long-proj` (24 chars)

Both projects then share the same drift bucket and probe identity — the exact problem this function was designed to prevent. Consider using a hash (e.g., truncated SHA-256) of the scope root instead of prefix-truncation to keep the ID stable within the {8,24} bound while avoiding collisions.
  ```existing
  const slug = path.resolve(root).replace(/[^A-Za-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  // ★ F-164 FIX (2026-09-24): floor the id at 8 chars — an all-punctuation root
  //   (e.g. "/") yields slug "" → "scope-" (6 chars), which fails the
  //   SESSION_STORE_RE {8,24} check downstream. sessionStorePath pads the same way.
  let id = (`scope-${slug}`).slice(0, 24);
  if (id.length
  ```
  ```suggested
  // Use a truncated hash of the resolved root to avoid collisions from prefix-truncation.
  import { createHash } from "node:crypto";
  const rootResolved = path.resolve(root);
  const hash = createHash("sha256").update(rootResolved).digest("hex");
  // 18 hex chars after "scope-" = 24 total; hex chars are all in [A-Za-z0-9] (actually 0-9, a-f).
  let id = `scope-${hash.slice(0, 18)}`;
  // F-164: 
  ```
