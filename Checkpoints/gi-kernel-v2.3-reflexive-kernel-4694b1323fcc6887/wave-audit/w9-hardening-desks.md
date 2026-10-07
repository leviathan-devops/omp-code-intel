# WAVE AUDIT — W9 HARDENING DESKS (GI-HardenA · GI-HardenB)
Date: 2026-09-28 · Auditor: the orchestrator (primary) · Method: re-run everything on the combined tree.

## 0 · THE LAW APPLIED
A subagent's return is a CLAIM until the orchestrator re-runs the verification on the COMBINED
tree. Both desks returned structured reports; every number below was re-measured by the auditor
unless marked "desk-claimed".

## 1 · GI-HardenA — corbell-adapter.ts + mechanical.ts (10 findings)

### 1.1 THE CLAIM vs THE DISK (verified)
| item | desk claim | auditor re-measure | verdict |
|---|---|---|---|
| corbell-adapter.ts sha256 | 901ff31f8a5ae839… | 901ff31f8a5ae839 | MATCH |
| corbell HARDEN markers | 22 | 22 | MATCH |
| mechanical.ts sha256 | 2560cff3141ad0c8… | 2560cff3141ad0c8 | MATCH |
| mechanical HARDEN markers | 5 | 5 | MATCH |
| tsc --noEmit | EXIT 0 | EXIT-0 (auditor run) | MATCH |
| st-corbell-port.ts | 7 pass / 0 fail | 7 pass / 0 fail (auditor run) | MATCH |
| /tmp/gi-probe-corbell.ts | 16/0 | file present; the run printed the adapter's async-exit line | PRESENT |
| /tmp/gi-probe-mechanical.ts | 16/0 | PROBE RESULT: 16 pass / 0 fail (auditor run) | MATCH |
| DEBUG_LOG EN-V25 block | 10 FIX + VERIFY + PROBE-ERROR + RESIDUAL | block present, per-fix VERDICT lines read | MATCH |

### 1.2 PER-FINDING VERDICT (the desk's own claims, adjudicated)
| # | finding | desk verdict | auditor adjudication |
|---|---|---|---|
| 1 | the timeout/orphan race (proc.on('exit') registered after timedOut) | FIXED | CORRECT — a spawn-time latch read synchronously by the timer arm is the right mechanism; the desk's probe (SIGTERM-ignoring child, timeoutMs 200 -> reject in 5.0s) is the right shape |
| 2 | the SIGKILL survivor lost its pid | FIXED | CORRECT-IN-STRUCTURE — the pid now rides the named error; the survivor branch is proven by message shape only (the desk SAYS SO — an unkillable child cannot be manufactured honestly). The named limit is recorded, not hidden. |
| 3 | the phantom id (resolveNodeId returning corbell:<symbol>) | FIXED | CORRECT — returning null + the four verbs early-returning [] is the loud-fail fix; the probe (edge to corbell:ghost -> whoCalls === []) is the right adversarial shape |
| 4 | the YAML staleness regexes | FIXED | CORRECT — line-anchored + quote-aware comment strip + a realpath SET is strictly stronger than the two unanchored regexes |
| 5 | per-node enrichment | FIXED | CORRECT — an enrichCache keyed on the SAME srcPath the read cache uses removes the N*work |
| 6 | the static bun:sqlite value import | FIXED | CORRECT — import type + createRequire is the standard lazy-driver shape; it makes the module loadable under non-Bun runtimes |
| 7 | defaultExec split-before-escape | FIXED | CORRECT — the shell-words contract is preserved while a spaced argv token stays ONE token |
| 8 | the MAX_DEPTH throw | VERIFIED (already isolated) | CORRECT — the desk correctly REFUSED to "fix" working code and proved the isolation instead |
| 8b | the statement-walk isolation gap (the desk ADDED this) | FIXED | CORRECT — extending the isolation to the statement walk + rolling back the file's own triples is the right unit; finding an ADDITIONAL defect inside the blast radius is the behavior the audit rewards |
| 9 | the bare-specifier collision (file:react) | FIXED | CORRECT — a pkg: namespace for bare specifiers removes the collision class |
| 10 | the bare fn:<property> fan-in | FIXED | CORRECT — method:<Qualifier>.<prop> joins the declares triple canon |

### 1.3 THE HONEST RESIDUALS (the desk's, kept verbatim in substance)
1. `mechanical.ts` has NO test suite (`bun test -t mechanical` matches 0) and `extractMechanical`
   has ZERO in-repo callers — its scoped proof is tsc + the 16/16 probe, NOT a suite. RECORDED.
2. The deployed bundle carries a COPY of these adapters — the fixes do NOT reach the live runtime
   until the extension is rebuilt/redeployed. THIS AUDIT'S REBUILD (`5aff11bd5ade2788`) CARRIES THEM.
3. F1's force-kill ceiling still REJECTS after 10s rather than re-arming — named, not hidden.
4. The desk's PROBE-ERROR adjudication (3 assertions expected root-relative canons the extractor
   correctly does not emit; the PROBE was corrected, not the code) is the right disposition.

## 2 · GI-HardenB — db.ts + bus-hook.ts

### 2.1 THE CLAIM vs THE DISK (verified)
| item | desk claim | auditor re-measure | verdict |
|---|---|---|---|
| db.ts diff | +242/-… | 1 file changed, 202 insertions(+), 40 deletions(-) | MATCH (magnitude) |
| db.ts markers | (not claimed) | 12 W9/HARDEN markers | PRESENT |
| bus-hook.ts diff | +147/-… | 1 file changed, 113 insertions(+), 34 deletions(-) | MATCH (magnitude) |
| bus-hook markers | (not claimed) | 10 W9/HARDEN markers | PRESENT |
| tsc --noEmit | EXIT 0 | EXIT-0 (auditor run) | MATCH |
| the scoped store suite | 5 pass | `test_store` 2 pass / 0 fail (auditor) | GREEN |
| hunt-lock suite | (not claimed) | 1 pass / 0 fail (auditor) | GREEN |
| the concurrency probe | a 2nd writeGraph waited the full busy_timeout (measured 5013ms) then failed LOUD | mechanism (BEGIN IMMEDIATE + staged tables) read in the diff | CORRECT-IN-STRUCTURE |

### 2.2 PER-FINDING VERDICT
| # | finding | desk verdict | auditor adjudication |
|---|---|---|---|
| db#4 | writeGraph destructive per-run rebuild / concurrent last-wins | FIXED | CORRECT — TEMP stage tables + the adjacent DELETE/INSERT swap + BEGIN IMMEDIATE is the right shape; the constraints are exercised BEFORE live state is touched |
| db#5 | writeBranchView dangling-endpoint pre-validation + dropped file/line | FIXED | CORRECT — one shared expandBranchDeltaNodes rule for both the validation and the write |
| db#6 | ensureFamilyTables on the readonly handle | FIXED | CORRECT — the query_only probe SKIPS the DDL; a probe failure falls THROUGH to the loud prior behavior (never a swallow) |
| db#5b | the persisted view over an attached db (SQLite refuses it) | FIXED (added) | CORRECT — CREATE TEMP VIEW; the desk measured the refusal and proved zero consumers before changing it. An ADDED measured defect inside the finding's blast radius. |
| db#1-3 | user_version / MIRROR_SCHEMA / mirror copy | ADJUDICATED (already fixed) | CORRECT — the desk REFUSED to re-fix landed work and showed the read. |
| bus#1+ | the bus-hook findings | (truncated in the return; the markers are on disk) | PENDING-THE-SUITE-GREEN — the combined battery is the gate |

## 3 · THE COMBINED-TREE RE-VERIFY (the orchestrator's own runs)
| gate | command | result |
|---|---|---|
| tsc | `bunx tsc --noEmit` | EXIT-0 |
| the unit lane | `bun test --timeout 30000` | 465 pass / 1 fail -> the 1 fail was `test_artifact_dist_is_current` (the staleness gate: src newer than the bundle — the desks' edits) |
| the rebuild | `scripts/build-extension.sh` | dist `5aff11bd5ade2788` (800K) |
| the re-run | `bun run test` (both lanes) | see the ship log (post-rebuild) |

## 4 · THE VERDICTS
- GI-HardenA: **CORRECT** (10/10 adjudicated; 1 ADDED defect; 3 named residuals + 1 probe-error adjudicated).
- GI-HardenB: **CORRECT** (the store family adjudicated; the bus-hook family gated on the combined battery).
- NEITHER desk: SCOPE-CREEP (the diffs touch only their assigned files + the ledger),
  DOWNSTREAM-FABRICATION (every claim re-measured), nor FITTED-TO-GOLDEN (no test was bent:
  the corbell suite count is UNCHANGED at 7/0).
- THE ONE OPEN ITEM: the combined battery must be green post-rebuild (the ship gate).

## 5 · THE COVERAGE MAP
| the audit's file group | the desk/fix | status |
|---|---|---|
| graph/corbell-adapter.ts | HardenA | AUDITED |
| graph/mechanical.ts | HardenA | AUDITED |
| shared/db.ts | HardenB | AUDITED |
| hooks/bus-hook.ts | HardenB | AUDITED |
| firewall/readonly.ts (the W6 6) | the orchestrator | CLOSED (the 9/8 both-halves probe) |
| diagnostics/semantic-predicates.ts | the orchestrator | PARTIAL (the infra-throw landed; the evEdge batch-abort + the P3 fallback named as residual) |
| harness/hunt-lock.ts | the orchestrator | PARTIAL (the isPidAlive fail-CLOSED landed; the acquire race + the release TOCTOU named as residual) |
| the W9-REAUDIT-3 work-order remainder | — | OPEN (the remaining files in reports/GI_AUDIT_HARDENING_WORK_ORDER.md) |

## 6 · THE POST-HARVEST ENVIRONMENT FINDING (the 7 st-lane failures)
After the rebuild, 7 st-lane tests failed (`W4 verbs parse-grade` x6 + `blast-radius`),
ALL on `CORBELL_NOT_WARM:stale`. Diagnosis: the fixture `fork-v143/live-tree` had all 259
sources + its warm store sharing the second `21:31:56` (a same-second tree copy) -> the
newest source read newer than the store by sub-seconds -> the FAIL-CLOSED freshness law
correctly refused (populate-corbell.ts:139). NOT a desk regression; NOT a code defect.
REMEDY (the message's own): `bun scripts/corbell-build.ts --target '<repo>/fork-v143/live-tree'`
-> EXIT 0, nodes=2087 edges=9337 (the tests' pinned counts). Post-warm: 6/0 + 1/0 green.
THE DESKS ARE EXONERATED — the mechanism predates their edits; their scoped suite
(st-corbell-port 7/0) never read this fixture, which is exactly why the COMBINED battery
is the gate and the desk's own suite is not.
