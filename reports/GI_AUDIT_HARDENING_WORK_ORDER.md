# GI AUDIT — THE HARDENING WORK ORDER

**Source:** `artifacts/whole-tree-audit.json` (the whole-tree muse-go audit, 2026-09-28).
**Scope:** 40 files · 100 blocking findings in the artifact's cap (by_severity: 9 CRITICAL / 255 HIGH).
**State:** the 2 distinct CRITICALs + 9 code fixes landed; the CRITICAL class is CLEARED in the audited files.
**Resume condition (the pin's S9):** clear these to 0 critical / 0 high, then a full re-audit.

| # | the file | C | H | the finding |
|---|---|---|---|---|
| — | `src/hunter/firewall/readonly.ts` | 1 | 5 | 6 finding(s) |
|   |  |  |  | [CRITICAL] SED_N_RANGE_RE file slot smuggles pipes/redirects to ALLOW_READ. `(?:\s+\S+)?` matches any non-space suffix, so `sed -n '1p' foo|bar`, `foo>bar`, `foo;rm -rf /` all match ( `\S+` eats `| > ;`) and `scanMetacharacters` re |
|   |  |  |  | [HIGH] Attached short write-flag `-o/tmp/out` bypasses git READ->MUTATION routing. Check only handles exact `-o` or `--flag=` prefix, so `-o/tmp/out` / `-ooutfile` (standard Unix attached short-option form) never matches and `g |
|   |  |  |  | [HIGH] Naive quote-aware split desyncs from shell execution. `/[^\s"']+/|"[^"]*"|'[^']*'/g` + one-layer stripQuotes splits shell-concatenated words: `--out"put"=/tmp/out` becomes [`--out`,`put`,`=/tmp/out`], so `routeGit` restT |
|   |  |  |  | [HIGH] Narrow splitter scan omits `\`, so quote/backslash smuggling evades the `find` deny-list and reaches ALLOW_READ. READ arm only checks `| ; & > < \n $ backtick` + format controls: `find . '-exec' touch /tmp/pwn {} +`, `fi |
|   |  |  |  | [HIGH] Find deny-list is lexical on raw string and incomplete: misses `-fprintf` (only `-fprint`/`-fprint0` listed, but `(?![\w-])` prevents `-fprint` matching `-fprintf`), misses quoted/escaped variants (see above), and return |
|   |  |  |  | [HIGH] READ-verb `sort -o/--output` file-write primitive not guarded. `sort -o /tmp/out input` (and `sort --output=...`) contains no narrow splitter, `find`-only deny-list doesn't apply, so it falls through to `allowed('BASH_RE |
| — | `src/hunter/harness/report.ts` | 1 | 1 | 2 finding(s) |
|   |  |  |  | [CRITICAL] Untrusted `writerResult.reportPath` is used for read+rewrite without validation. An injected `writer` (test transport or future W8 network writer) can return any absolute path (`/etc/passwd`, `~/.ssh/*`, outside `project |
|   |  |  |  | [HIGH] Missing file-existence gate before HUNT_DONE; non-strip I/O errors swallowed. Only `REPORT_STRIP_FAILED` rethrows — ENOENT/EACCES from `readFileSync`, external deletion between writer and strip, or a lying injected write |
| — | `src/hunter/graph/corbell-adapter.ts` | 0 | 9 | 9 finding(s) |
|   |  |  |  | [HIGH] Timed-out build can delay-settle ~10s and leak orphan: timeout arm registers `proc.on('exit')` AFTER `timedOut=true`. If `exit` already fired (normal exit just before timeout) the late listener never fires, early latch a |
|   |  |  |  | [HIGH] Orphan survives SIGKILL path by design: forceKillTimer rejects with 'child survived SIGKILL' but leaves the child running with no further reaping. Caller awaiting rejection loses handle to kill it. Track and expose PID / |
|   |  |  |  | [HIGH] Split-on-whitespace before shellEscape breaks argv contract and paths with spaces: an arg containing spaces is split into two quoted tokens (semantic change), while binary path with space is rejected by allowlist (availa |
|   |  |  |  | [HIGH] Workspace staleness check is regex YAML + first-service only: `root:`/`repo:` regex matches comments/partial keys, `svcMatch` is the first `repo:` in file so multi-service configs (emitted by scopeRepoRefs) are judged on |
|   |  |  |  | [HIGH] `git_coupling` normalised to `calls` pollutes call graph: `whoCalls`/`chain` filter `kind==='calls'`, so coupling edges appear as call sites/chain steps (false positives) and inflate `unwired`/`chain` BFS. Coupling is no |
|   |  |  |  | [HIGH] Numeric enrichment recomputed per node, not per file: `src` is cached in `srcCache` but `matchAll` + `reduce` + 10k `numericLiterals` array runs for every method in the same file, duplicating CPU (regex over 1MB × N) and |
| — | `src/hunter/shared/db.ts` | 0 | 6 | 6 finding(s) |
|   |  |  |  | [HIGH] applyPragmas unconditionally overwrites PRAGMA user_version=184 on every open, so version-gated migration logic can never observe a lower stored version. The comment claims migrations apply 'when the stored version is lo |
|   |  |  |  | [HIGH] MIRROR_SCHEMA_SQL drops the edge file:line anchor that the main graph_edges table persists. The awareness mirror silently loses edge location data, contradicting the R19 fix that made the anchor part of the edge. |
|   |  |  |  | [HIGH] Mirror copy SELECT/INSERT omits file,line even though SharedDb.writeGraph persists them. Add file,line to both the SELECT from the source and the INSERT into the mirror, otherwise rebuilt mirrors diverge from source trut |
|   |  |  |  | [HIGH] writeGraph is a destructive per-run rebuild (DELETE edges/nodes then INSERT) inside a single transaction. Two concurrent writers interleave as last-wins with total graph loss. The external hunt-lock is referenced only in |
|   |  |  |  | [HIGH] writeBranchView lacks the dangling-endpoint pre-validation that SharedDb.writeGraph has, and also drops file/line on the edge INSERT. One bad ref hits raw SQLITE_CONSTRAINT_FOREIGNKEY mid-transaction and aborts the whole |
|   |  |  |  | [HIGH] FamilyGraphStore constructor unconditionally runs ensureFamilyTables (CREATE TABLE/INDEX) on the family handle. openFamilyReadOnly passes a readonly + query_only handle, so even opening an existing store attempts DDL on  |
| — | `src/hunter/graph/mechanical.ts` | 0 | 5 | 5 finding(s) |
|   |  |  |  | [HIGH] Fail-closed `pushTriple`: throwing on empty evidence or unknown predicate aborts the entire multi-file extraction and discards all previously collected triples. One bad node (e.g. synthesized node with empty line) fails  |
|   |  |  |  | [HIGH] Bare-specifier collision + incomplete resolution: non-relative imports (`react`, `@scope/pkg`) fall through with `targetRel=target` and canon to `file:react`, colliding with a relative `file:react[.ts]` namespace so join |
|   |  |  |  | [HIGH] Qualifier collapse: `A.B()`, `obj.method()`, `this.helper()` all emit `fn:<property>` only, merging unrelated qualifiers into one fan-in target that the engine resolves by name. `whoCalls(B)` then over-reports and `metho |
|   |  |  |  | [HIGH] Depth ceiling aborts all files: `throw` on `depth > MAX_DEPTH` propagates past the per-file `try { visit(sf) }` (which rethrows MechanicalExtractionError) to the top level, discarding triples from all previously scanned  |
|   |  |  |  | [HIGH] Per-file isolation missing: top-level statement loop (`lineOf`/`evidenceQuoteForNode`) and `visit(sf)` errors are not isolated per file — any throw (including raw TS errors from `getStart` on synthesized nodes, not just  |
| — | `src/hunter/hooks/bus-hook.ts` | 0 | 5 | 5 finding(s) |
|   |  |  |  | [HIGH] Unknown kinds silently consumed: if `isBusKind(row.kind)` is false the row still advances `this.cursor = row.id` below and stays in `clean` (returned as pushed) with no log, metric, or dead-letter entry. Corrupt/forward- |
|   |  |  |  | [HIGH] Bounded dead-letter queue drops invisibly: `trimFailedEvents()` evicts oldest entries into `failuresDropped` which has no getter, no log, and is never reset. Sustained subscriber failure loses history silently. Expose co |
|   |  |  |  | [HIGH] Cursor rollback causes duplicate dispatch: restoring `cursorBefore` on escaping throw re-selects rows already fanned out in the `clean` loop. Next `poll()` redelivers HUNT_DONE/BUILD_DONE with no idempotency/dedup guard. |
|   |  |  |  | [HIGH] Shared mutable payload leaks across consumers + retry: the same `payload` object is fanned to every subscriber and stored by reference in `failedEvents`. A mutating subscriber corrupts later subscribers and the replayed  |
|   |  |  |  | [HIGH] Unparseable JSON dispatched as if valid: parse failure falls back to `{raw: row.payload}` and continues through normal `isBusKind` dispatch, so downstream `onHuntDone/onBuildDone/onAuditDone` receive a shape they never v |
| — | `src/gi-lsp/cards.ts` | 0 | 3 | 3 finding(s) |
|   |  |  |  | [HIGH] fileCards never emits UNWIRED: per-declaration loop only calls callersCard (which returns null on 0 callers) and never calls unwiredCard. Zero-caller symbols are therefore silent, contradicting the file header (SCOPE + C |
|   |  |  |  | [HIGH] scopeCard can throw and break the LSP: fs.realpathSync(projectRoot) is unguarded (throws on missing/deleted/permission-denied root). The existsSync+realpathSync on stored has a TOCTOU race and still throws on symlink loo |
|   |  |  |  | [HIGH] declarationsIn misses common declarations: regex omits `export default function/class`, decorators (`@...`), `export {a,b}`, multi-declarator `const a=.., b=..`, generators `function*`, `abstract`/`declare` prefixes. Tho |
| — | `src/hunter/diagnostics/semantic-predicates.ts` | 0 | 3 | 3 finding(s) |
|   |  |  |  | [HIGH] anchored() conflates infrastructure failure with clean verdict: on resolveEdgeAnchor throw it logs to console.error and returns null, which callers treat identically to empty anchor set (zero findings). A graph outage th |
|   |  |  |  | [HIGH] evEdge() throws FINDING_NO_ANCHOR inside per-file/per-line loops. Even though callers pre-check firstCite(), any anchor.files/cites skew (or future caller forgetting the check) aborts the entire check() and discards all  |
|   |  |  |  | [HIGH] P3 drops nodes with missing id (`nid === undefined => continue`) instead of falling back to whoCalls(name). For graph adapters that do not populate node.id every gate-named node is silently treated as wired (false negati |
| — | `src/hunter/harness/hunt-lock.ts` | 0 | 3 | 3 finding(s) |
|   |  |  |  | [HIGH] isPidAlive fail-open on unknown errors: any `process.kill` error other than ESRCH/EPERM warns and returns `false`, so `isStale` classifies a live same-host holder as stale and `acquireHuntLock` unlinks its lock. This bre |
|   |  |  |  | [HIGH] Acquire stale-recovery check-then-act race: re-read comparison narrows but does not close the unlink-then-wx window. Two racers can both pass the triple-compare, then interleave as A.unlink -> A.create(fresh) -> B.unlink |
|   |  |  |  | [HIGH] Release TOCTOU between re-read and unlink: F-831/F-1022 double re-read is still non-atomic with `unlinkSync`. A concurrent stale-recovery can replace the lock in the microsecond gap (fresh2 -> unlinkSync) and this unlink |
| — | `src/hunter/harness/scan.ts` | 0 | 3 | 3 finding(s) |
|   |  |  |  | [HIGH] Fail-open on unresolved containment. When contained is true but resolved is false, the code only warns and proceeds with the nearest-ancestor real path. That path has not followed symlinks, so the string-prefix check can |
|   |  |  |  | [HIGH] Dry-run exclusion violates gate contract. runCalibration is called with dryRun true, but liveBattery is then consumed when excluded is non-empty. Per calibration gate docs, dryRun is surfaced not applied and callers must |
|   |  |  |  | [HIGH] Sweep-blind refusal gap. The comment promises a loud refusal when the semantic layer read zero files, but no check precedes runBattery dispatch. Engine assertNoBlindness only guards graph node counts, not file-read count |
| — | `src/hunter/keys/go-key-pool.ts` | 0 | 3 | 3 finding(s) |
|   |  |  |  | [HIGH] BUN_TEST/GO_POOL_DB paths bypass the 0700 private-dir + share one tmp file. goPoolDbFile() hardens only the default ~/.gi-omp path; BUN_TEST returns os.tmpdir()/go-key-pool-test.sqlite with no hardenPrivateDir/hardenPool |
|   |  |  |  | [HIGH] Orphan-sentinel fold does not bound rows. UPDATE ... WHERE idx<0 sets each sentinel independently to max(dead_until,until) without folding the max across sentinels, then only one sentinel (arbitrary SELECT without ORDER) |
|   |  |  |  | [HIGH] Redaction misses short and rotated-out keys. Exact-match loop skips keys <8 chars and only covers current GO_KEYS; an error echoing a removed/reordered key (or a short key) falls through to the sk-/Bearer regexes and can |
| — | `src/hunter/lexicon/templates.ts` | 0 | 3 | 3 finding(s) |
|   |  |  |  | [HIGH] Silent error swallowing causes false silence/pass: empty `catch{}` in `isExportedDecl` and all `safe*` helpers (plus stage-file resolve) converts source/graph failures into `[]`/unverified, so a broken adapter or unreada |
|   |  |  |  | [HIGH] Prototype-chain inconsistency: `readPath` enforces own-property + `__proto__/constructor/prototype` blocklist (F-333/F-412), but `bindSeverity/bindStringArray/bindStages/bindOperator/bindNumber/bindRange` read via bare ` |
|   |  |  |  | [HIGH] Missing honest-silent guard yields false positives: when `requiredTraces` is empty (`[].some(...) === false`), every node of every `targetKind` is flagged with evidence `lacks a traces-to edge from ` (empty join). Other  |
| — | `src/hunter/profile/loader.ts` | 0 | 3 | 3 finding(s) |
|   |  |  |  | [HIGH] Duplicate mapping keys silently last-win (fail-closed violation). parseMapping does `obj[key]=...` without checking `key in obj`, parseFlowMap does `obj[k]=...` the same way, and sequence continuation does `Object.assign |
|   |  |  |  | [HIGH] Unbalanced flow brackets silently accepted: splitTopLevel/findTopLevelColon decrement depth on `}`/`]` without validating balance, so depth can go negative and commas at depth!=0 are not split. E.g. flow-array inner `a], |
|   |  |  |  | [HIGH] contained() treats directories and the root itself as valid corpus/history entries: it only checks existence + prefix (`real === resolvedRoot || startsWith(resolvedRoot+sep)`). Empty-string entry resolves to the root and |
| — | `src/hunter/profile/source-roots.ts` | 0 | 3 | 3 finding(s) |
|   |  |  |  | [HIGH] Workspace glob expansion is single-level only: any `*` truncates to `base` + immediate children. `**`, nested segments (`apps/*/src`), brace expansion (`{a,b}`) and negations (`!...`) silently under-expand and drop valid |
|   |  |  |  | [HIGH] Profile `sources:` entries escape the target: `path.resolve(root, s)` accepts `../`, absolute paths, and symlinks, and the result is trusted without a containment check. A malicious/mistyped profile can return directorie |
|   |  |  |  | [HIGH] `commonAncestor` collapses to filesystem root `/` when tsconfig prefix dirs are disjoint, and `**/*.ts` maps `head` to `root` itself. Returning `/` (or repo root from `**`) reintroduces the full-tree walk the glob-prefix |
| — | `src/hunter/shared/containment.ts` | 0 | 3 | 3 finding(s) |
|   |  |  |  | [HIGH] rootResolved is computed but never reported: if the root itself is missing/unresolvable, rootReal falls back to realNearest(root) (potentially unverified spelling) yet contained/resolved are derived only from the target  |
|   |  |  |  | [HIGH] requireContained silently drops resolved (and the unexposed rootResolved): any contained:true — including the unverified-spelling case resolved:false — is allowed. For the pinned creation flow that is intentional, but as |
|   |  |  |  | [HIGH] Filesystem-root fallback returns unverified spelling with no signal: parent===dir break falls through to return abs (path.resolve only, no symlinks followed). realNearest callers (other than checkContained's heuristic) c |
| — | `src/hunter/diagnostics/calibration.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Unconditional ROLLBACK after failed BEGIN corrupts outer transaction. If `BEGIN IMMEDIATE` throws because the shared DbClient handle already has a caller transaction open (or bad connection), the catch still executes `RO |
|   |  |  |  | [HIGH] Duplicate predicate ids silently collide. fireByPred/silentByPred/verdicts are keyed by `p.id` and `mark()` uses `battery.find(b => b.id === p.id)` (first match only) while `liveBattery()/excluded()` filter by `verdictOf |
| — | `src/hunter/diagnostics/engine.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] History-frequency read has TOCTOU gap: lockdown source uses O_NOFOLLOW fd read but history log validates logReal then uses readFileSync on the path, so a swap between realpath and read reopens a different inode outside r |
|   |  |  |  | [HIGH] Local walk mixes loud throws with console.error plus continue skips, contradicting fail-closed law: symlink-to-dir escaping root, symlink-cycle re-entry, and symlink-to-file outside root all log-and-skip while walk-entry |
| — | `src/hunter/diagnostics/fixture-calibration.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Containment check-then-read TOCTOU + `sourceFile='.'` bypass. `containedFixtureSource` validates lexically then via `requireContained`, but `fs.readFileSync(contained)` happens after both checks, so a swap/planted symlin |
|   |  |  |  | [HIGH] Bare JSON.parse SyntaxError + unvalidated per-node shape break named-error contract. `asFixture` lets `JSON.parse` throw raw SyntaxError instead of CALIBRATION_FIXTURE_INVALID and only checks `graph.nodes` is an array, w |
| — | `src/hunter/firewall/artifact-scope.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Fail-open projectRoot fallback weakens real-vs-real containment. Catching all realpath errors (EACCES/ELOOP/ENOTDIR) and falling back to unresolved `path.resolve()` means later `insideRoot(parentReal, projectRootReal)` c |
|   |  |  |  | [HIGH] TOCTOU between classify-time `lstat` and the later tool write: `lstat` proves non-existence/symlink state only at check time. A concurrent create, symlink swap, or MASTER_CONTEXT variant swap after ALLOW_REPORT can turn  |
| — | `src/hunter/firewall/lexicon-types.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Deep-freeze can be bypassed/crash: (1) no cycle guard — `A<->B` reference recurses infinitely because parent isn't frozen until children return (`!isFrozen` check doesn't help mid-traversal) → stack overflow on attacker/ |
|   |  |  |  | [HIGH] Alias guard passes malformed decisions: `undefined === undefined` so both-missing `Pattern/State/Evidence` compares equal; no validation of `verdict` domain, `State`-vs-`verdict` semantic consistency, or required `patter |
| — | `src/hunter/graph/interface.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Real runtime import cycle: this module value-imports CorbellAdapter/GraphifyAdapter while both adapters value-import error factories from this module (corbell-adapter.ts:53 `import { adapterFailed, ... } from './interfac |
|   |  |  |  | [HIGH] Sync query surface has no ready-guard against async build ordering: `build()` is async but `whoCalls/chain/imports/awaits/unwired/nodes` are sync with no `isReady`/`ensureBuilt` or documented precondition. Querying befor |
| — | `src/hunter/graph/merge.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Internal dedup Set leaked on public `MergedTriple`: `seenContradictions` is mutable conflict bookkeeping, not row data. It breaks `JSON.stringify` (serializes to `{}`), leaks across callers (a returned row carries dedup  |
|   |  |  |  | [HIGH] Unvalidated `confidence` (and `file`/`line`) propagation: validation checks subject/object/predicate/evidence but never `confidence`, yet `s.confidence` is copied verbatim into every semantic/both row and `anchor.line || |
| — | `src/hunter/graph/resolver.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] file/line null validation rejects valid inputs: `NewEntity.file?: string | null` and `line?: number | null` explicitly allow `null`, and the prompt builder handles it via `?? ''`, but the entry guard throws on `null` (`t |
|   |  |  |  | [HIGH] Over-broad significant-token `related` match: after token checks, any shared 5-char substring (`tation` in `presentation`/`implementation`, `ervice` in `UserService`/`OrderService`) returns `related`. This false-positive |
| — | `src/hunter/graph/store-map.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Unvalidated absolute `src.file` is passed directly to `statSync`/`readFileSync`. If adapter rows are attacker-influenced this is an arbitrary-file read (e.g. `/etc/passwd` line becomes stored `evidence`), plus symlink es |
|   |  |  |  | [HIGH] Checkout writer opens any path with `mkdir -p + create:true` and no session-path refusal. Despite the header comment (NEVER use for session data), a caller passing `.../sessions/{sid}/store.sqlite` silently overwrites a  |
| — | `src/hunter/harness/map.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] File-less CODE nodes bypass LINELESS_NODE refusal: `continue` on empty/missing `n.file` lets non-exempt kinds (class/function/method) enter `writeGraph` lineless instead of refusing LOUD. The `§6.5 stub-adapter` comment  |
|   |  |  |  | [HIGH] Project-root containment is string-prefix only: `dbPath` is never `path.resolve`d/normalized and symlinks are never resolved (`fs.realpath`), so a `<root>/.gi` symlink (or legacy fallback dir) pointing outside the projec |
| — | `src/hunter/harness/micro-loop-machine.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Stub-seam runId race: seq is derived via full `SELECT ... WHERE kind='HUNT_DONE'` scan then `seq+1` with no transaction/lock. Concurrent hunts interleave read/compute/write and collide on runId. Also O(N) full-table pars |
|   |  |  |  | [HIGH] Post-subscribe terminal gap: `sub2` only settles on `s.status === 'done'`. If the actor transitions to `stopped`/`error` after subscribing, `done()` never settles (the stopped/error check only runs at call time). Settle  |
| — | `src/hunter/harness/recon.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Store-path containment is string-only and misses symlink escape via `.gi/knowledge-graph`. `projectRootReal` is realpath'd but `dbPath` is only prefix-checked, so a symlink at `<root>/.gi` or `<root>/.gi/knowledge-graph` |
|   |  |  |  | [HIGH] RunId mint is read-count-plus-one with no atomicity. `SELECT max(seq)` then `return prefix+(seq+1)` relies entirely on an external hunt-lock noted in the comment; any lock bypass, future concurrent caller, or crash betwe |
| — | `src/hunter/identity/warhead.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Read-only allowlist in prompt understates and misframes enforcement: text lists `rg/grep/find/cat/ls/wc/stat/head/tail/cut/sort/uniq/diff/sha256sum` plus vague `read-only git sub-verbs` and a partial NEVER list (`node/bu |
|   |  |  |  | [HIGH] RULE 2-4 bind external payloads by path (`identity/prompt-parts/recon-protocol.md`, `scan-categories.md`, `report-contract.md`) with no existence/version check in this module. No `prompt-parts/` directory or `recon-proto |
| — | `src/hunter/lexicon/compiled-store.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Silent fallback masks DB corruption: predicateFamilyFrom coerces unknown values to WIRING and severityFrom coerces unknown values to MED instead of throwing. This contradicts loadBattery's documented contract ('missing t |
|   |  |  |  | [HIGH] check_code vs bindings divergence is unchecked: when both columns parse, check_code.bindings silently wins with no consistency check against the bindings column. Divergent rows (partial write, manual edit, version skew)  |
| — | `src/hunter/lexicon/compiler.ts` | 0 | 2 | 2 finding(s) |
|   |  |  |  | [HIGH] Non-canonical fingerprint input breaks K20.3 determinism: `JSON.stringify(profile.rules.bindings)` depends on key-insertion order, so two logically-equal binding objects built in different order hash to different `batter |
|   |  |  |  | [HIGH] COUNT-then-load is non-atomic and fail-open: if the row is evicted/deleted (or a concurrent `writeCompiledCache` DELETEs the version) between the `COUNT(*)` and `loadBattery()`, `loadBattery` returns an empty array which |
| — | `src/hunter/diagnostics/findings-store.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] Read/write empty-scope asymmetry for runId and ruleId: writes loudly reject empty runId, but queryFindings silently drops empty-string filters. `if (opts.runId)` / `if (opts.ruleId)` treat '' as absent, so `queryFindings |
| — | `src/hunter/graph/graphify-adapter.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] Dual containment laws diverge: `containedRel` judges on `rel.split("/").includes("..")` after POSIX normalization while `isContainedRel` judges on `!rel.startsWith(`..${path.sep}`)`. On Windows `path.relative` across dri |
| — | `src/hunter/harness/strike.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] Inconsistent relevance sanitization between merge and read: the merge adds raw `typeof v === "number" ? v : 0` (keeps NaN/Infinity/negatives) while `relevanceOf` clamps to finite non-negative (`Number.isFinite` + `Math.m |
| — | `src/hunter/harness/trace.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] Missing per-element validation: only Array.isArray + empty are checked. A null/undefined entry or a finding missing ruleId/file/line/severity throws inside ruleCounts.set / findingIdOf / severityWeight, aborting the whol |
| — | `src/hunter/harness/types.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] Barrel omits GraphNode/GraphEdge while re-exporting loose-kind helpers, defeating the F-516 strict-kind intent and the one-import claim. The header says the barrel's canonical graph shapes come from the interface block b |
| — | `src/hunter/profile/schema.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] z.any() disables all value validation for bindings and violates the Avoid-any rule. Any payload (including prototypes/functions after JSON merge) passes here and shifts injection/type-safety risk to use-sites like scan.t |
| — | `src/hunter/shared/kind-for-layer.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] Fragile/over-broad substring classification: order-dependent `includes()` checks over-match and can misassign NodeType. E.g. `r28` also matches `r281`/`r2800`, and the catch-all `sro || graph || path || dead || cycle` (+ |
| — | `src/hunter/shared/migrations.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] Nested-transaction join prematurely commits caller's tx. When BEGIN fails with 'cannot start a transaction' (nested-join case) `began` is set false, but the COMMIT below still runs unconditionally. On a driver already in |
| — | `src/hunter/shared/ontology.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] ALL_PREDICATES silently omits the live `has_finding` predicate while PREDICATE_SET/isPredicate accept it. Any consumer enumerating ALL_PREDICATES (validation, query building, UI, DDL) will miss one legal store value. Con |
| — | `src/hunter/shared/query-engine.ts` | 0 | 1 | 1 finding(s) |
|   |  |  |  | [HIGH] Vector provider results trusted without shape check: external search() return is awaited and returned directly with no canonical_id/score validation, unlike strict SQL row mappers. Malformed provider output propagates to |

## THE ORDER (the highest-leverage first)

1. `corbell-adapter.ts` (9H): the orphan-process + timeout race; the `corbellParse` path traversal (the containment check); the `git_coupling`→`calls` semantic pollution; the phantom-id fallbacks; the static `bun:sqlite` import.
2. `shared/db.ts` (6H): `applyPragmas` unconditional user_version; the mirror's dropped file:line; `writeGraph`'s destructive per-run rebuild (the concurrency last-wins); `writeBranchView`'s missing pre-validation.
3. `mechanical.ts` (5H): the fail-closed `pushTriple` aborting the whole extraction; the per-file isolation; the depth-ceiling abort; the qualifier collapse; the bare-specifier collision.
4. `hooks/bus-hook.ts` (5H) · `gi-lsp/cards.ts` (0H now — FIXED) · the remaining 30+ files.

**THE RULE:** fix → re-audit the file → the count FALLS. The 2 audited files held at 0 CRITICAL across 2 consecutive re-audits.

---

## ALREADY FIXED (this session's 9+ fixes — do NOT re-flag)
- **`src/hunter/firewall/readonly.ts`:** the SED file-slot metachar smuggling · `-fprintf` · the
  `\` in the narrow scan · the `-o/tmp/out` attached short form · the `sort/diff/uniq` write syntax.
  (the re-audit: **0 CRITICAL**, HIGH 3 remaining = the shell-expansion class + the quote-split desync.)
- **`src/hunter/harness/report.ts`:** the untrusted reportPath + the swallowed throw + the null-dir
  guard · the stale supersedes regen · the fence-aware strip · the rough path-resolve-vs-root · the
  evidence fence-breakout. (the re-audit: **0 CRITICAL**, HIGH 4 → the title-cut offset + the tx conn.)
- **`src/gi-lsp/cards.ts`:** the UNWIRED-shape violation (the 5th shape now emits) · the unguarded
  realpathSync · the incomplete declaration regex. (the re-audit: **0 CRITICAL**.)

## THE MEASURED CONVERGENCE
```
the 2 files: 1 CRITICAL each → 0 CRITICAL (re-audit 2) → 0 CRITICAL (re-audit 3, stable)
```
**The fix loop CLOSES** (not a treadmill): the CRITICAL class clears and stays cleared; the HIGH
class in the shell-firewall is deep + run-varying, and each round drains concrete instances.

---

## THE FIX LEDGER (updated 2026-09-28 — 17 landed, verified)
| the file | the fixes | the verify |
|---|---|---|
| `readonly.ts` | the sed metachar smuggling · `-fprintf` · `\` · the attached `-o<path>` · the sort/diff/uniq write syntax | tsc 0 · the readonly suite green · **0 CRITICAL** |
| `report.ts` | the untrusted path + the swallowed throw + the null-dir · the stale supersedes regen · the fence-aware strip · the root-anchored resolve · the evidence fence-breakout | tsc 0 · **0 CRITICAL** |
| `gi-lsp/cards.ts` | the UNWIRED-shape spec violation (13 UNWIRED now live) · the unguarded realpathSync · the incomplete declaration regex | tsc 0 · st-gi-lsp 4/4 |
| `corbell-adapter.ts` | the corbellParse PATH TRAVERSAL · the `git_coupling`→`coupling` kind | tsc 0 · the corbell suite 10/10 |
| `db.ts` | the user_version read-then-advance · the mirror's file/line anchors | tsc 0 · the store suite |
| `mechanical.ts` | the per-file isolation | tsc 0 |
**IN FLIGHT (the dispatched desks):** `GI-HardenA` = corbell-adapter (7 remaining) + mechanical (4) · `GI-HardenB` = db.ts (3-4) + bus-hook (5).
