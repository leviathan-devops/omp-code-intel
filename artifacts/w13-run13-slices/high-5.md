# HIGH slice 5 — 9 findings across 8 files

## src/hunter/diagnostics/semantic-predicates.ts
- **src/hunter/diagnostics/semantic-predicates.ts:268-268** (bug)
  P6's else-if branch checks for `Checkpoints` and `.trident` in the exclusion list but does NOT check for `dist`, which is explicitly part of the remediation (UNSCOPED_WALKER_REMEDIATION = 'add EXCLUDED_DIRS with Checkpoints .trident dist'). A walker that excludes Checkpoints and .trident but not dist will incorrectly pass this check. The condition should also verify dist is present.
  ```existing
  } else if (!/Checkpoints/i.test(win) || !/\.trident/i.test(win)) {
  ```
  ```suggested
  } else if (!/Checkpoints/i.test(win) || !/\.trident/i.test(win) || !/\bdist\b/i.test(win)) {
  ```

## src/hunter/graph/corbell-adapter.ts
- **src/hunter/graph/corbell-adapter.ts:210-212** (bug)
  Bug: When `opts.timeout` is `undefined` (the common case — no static timeout), the fallback path computes `execTimeout` as `Math.min(undefined, ...)` → `NaN` → `Infinity`. `execSync` with `timeout: Infinity` is not a documented contract in Node.js — it works by accident in some runtimes (treated as no timeout) but is undefined behavior. Should pass `undefined` to execSync to let it run without a timeout.

Additionally, when `retryDeadline === Number.POSITIVE_INFINITY`, the ternary `retryTimeout ?? Number.POSITIVE_INFINITY` always yields `Infinity`, ignoring the `execBudget` calculation that just ran. The intent seems to be that when no deadline exists, each attempt uses the full caller timeout — but the `Math.min` with `Infinity` makes the budget check dead code.

Suggested fix: pass `undefined` as the timeout to execSync when the deadline is infinite, and use explicit branching instead of NaN-coalescing arithmetic.
  ```existing
  const execBudget = retryDeadline - Date.now();
      if (execBudget <= 0) break;
      const execTimeout = retryDeadline === Number.POSITIVE_INFINITY ? retryTimeout : Math.min(retryTimeout ?? Number.POSITIVE_INFINITY, Math.max(1, execBudget));
  ```
  ```suggested
  const execBudget = retryDeadline - Date.now();
      if (execBudget <= 0) break;
      let execTimeout: number | undefined;
      if (retryDeadline === Number.POSITIVE_INFINITY) {
        // No overall deadline — use the caller's per-attempt timeout as-is (or undefined = no timeout).
        execTimeout = retryTimeout;
      } else {
        execTimeout = Math.max(1, Math.min(retryTimeout ?? Infin
  ```
- **src/hunter/graph/corbell-adapter.ts:102-103** (bug)
  Bug (behavioral divergence): `buildCorbellGraphAsync` accepts `opts?.env` but does not inject the `CORBELL_COUPLING_*`, `CORBELL_WALK_EXCLUDE_DIRS`, or `CORBELL_COUPLING_SCOPE` environment variables that the sync `build()` path carefully constructs (lines ~250-280). If an external caller uses the async path for graph builds, the corbell vendor will walk the entire enclosing git repo (months=6, no path filter), reproducing the 742MB store / 30-min D-state stall that the coupling env was specifically designed to prevent.

The sync path even has a comment (line 208) noting this is intentional for the stubbed-exec contract, but the async path is exported as a public function — any caller using it gets a silently different (and dangerous) build behavior.

Suggested fix: accept the same coupling env parameters in `buildCorbellGraphAsync`'s opts, or extract the coupling-env construction into a shared helper that both paths call.
  ```existing
  export function buildCorbellGraphAsync(bin: string, cwd: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): Promise<string> {
  // ★ F-252 FIX (2026-09-24): closed the async twin's two gaps vs the sync path — (1) env passthrough (CORBELL_COUPLING_*/WALK_EXCLUDE knobs were dropped); (2) optional timeoutMs SIGTERMs a hung child and rejects NAMED (default none, per no-static-timeouts or
  ```
  ```suggested
  export function buildCorbellGraphAsync(bin: string, cwd: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): Promise<string> {
  // NOTE: callers MUST pass the coupling env (CORBELL_COUPLING_*, CORBELL_WALK_EXCLUDE_DIRS,
  // CORBELL_COUPLING_SCOPE) to avoid an unbounded git walk. Extract coupling-env construction
  // into a shared helper used by both CorbellAdapter.build() and this 
  ```

## src/hunter/harness/recon.ts
- **src/hunter/harness/recon.ts:118-122** (bug)
  If the SQLite driver used by `openStore` returns `payload` as an already-parsed JavaScript object (some better-sqlite3 configurations do this), `String(row['payload'])` produces `'[object Object]'` and `JSON.parse` throws. The `catch` silently skips the entry, which could suppress a legitimate prior `runId` and produce a duplicate. Consider checking `typeof row['payload']` first: if it is already an object, assign directly; otherwise parse.
  ```existing
  try {
        // THE R16 TYPE_CERTAINTY FIX — JSON.parse returns `any`; the assignment
        // to the typed variable needs no cast at all (no AsExpression to flag),
        // and the runId read below is typeof-guarded before use.
        payload = JSON.parse(String(row['payload'] ?? '{}'));
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
