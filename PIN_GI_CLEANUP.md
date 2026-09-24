# /goal — GI CLEANUP: MAKE EVERY CLAIM TRUE WITHOUT REDEFINITION

## GOAL
Clean the GI 6L+2E kernel so every claim is true at face value: the register honest, the fire
ledger DIVERSE (a real operating record, not one decision repeated 34 times), the code audit
covering the whole tree, the 10 open findings resolved, the testing suites properly written.
DONE only when the spec's §6 exit battery is green AND the seal + receipt exist.

## BASELINE (re-measured THIS turn — inherited numbers are STALE)
- repo Graph_Intelligence @ jarvis/gi-main 52f4d0c   dist sha256 e13d0f5939e3707b8d0fb1ff16a7faded33a228091ca20dea9157553bf998663
- tests 496 pass / 0 fail via `bun run test`   tree 112 .ts / 27686 L   ledger 34 rows (1 distinct)
- rigs: gi-kev-ct (omp-ct:master)   models: mimo-v2.5-GO (never verboo)
- build package: packages/gi-cleanup/ (the CLEANUP_SPEC + WAVE-PLAN) — minted BEFORE this pin
FIRST REPLY must re-run these and post the diff before W1.

## BUILD PACKAGE (exists before pinning — G2)
- DPL1 spec: packages/gi-cleanup/CLEANUP_SPEC.md · wave-plan: packages/gi-cleanup/WAVE-PLAN.md
  (`WAVES: 4`)
- the spec is the BINDING AUTHORITY; §2 is the fraud ledger; §6 is the exit battery.

## PHASES (owner skill -> exit gate)
P0 ABSORB -> the baseline re-measured, no memory numbers
P1 SPEC -> the CLEANUP_SPEC read (it exists; §2 is the fraud map)
P2 PREFLIGHT -> the wave files disjoint; the test ids named; the board written
P3 EXECUTE -> every wave audited (per-hunk verdicts + a mechanical re-verify), battery green
P4 RUNTIME -> the live ledger DIVERSE (>=4 distinct verdicts, each from a REAL varied act)
P5 ADVERSARIAL -> the red-team corpus re-run; ZERO confirmed defects; the docs sweep clean
P6 DOCUMENT -> the canon + ship docs updated; the AUDIT GATE line recorded
P7 CHECKPOINT -> the structure gate passed (src, dist+SHA, docs, manifest, ONE seal mode)
P8 VERDICT -> the spec §6 exit battery green in FULL

## WAVES (PARALLEL — 4 fronts, DISJOINT file ownership; derived from the DPL1
spec packages/gi-cleanup/CLEANUP_SPEC.md §5 and the wave-plan WAVES: 4)
| wave | DISJOINT files | deliverable | gate | test ids |
|---|---|---|---|---|
| W1 the honest register | scripts/goal-verify.ts + scripts/consumption-audit.ts | FR-1: no self-contradicting stdout; the honest number at face value | `bun test -t test_goal_predicate` green AND the stdout has NO line that contradicts another | test_goal_predicate · test_goal_predicate_honest_text |
| W2 the diverse ledger | tests/st-runtime-diversity.test.ts (NEW) | FR-2: >=4 DISTINCT (rule_id, band, action) tuples in fire-decisions.db, each from a REAL act | `bun test -t test_ledger_diversity_four_verdicts` green | test_ledger_diversity_four_verdicts · test_act_theatrical_fires · test_act_destructive_fires · test_act_grounded_allows |
| W3 the whole-tree audit | artifacts/ (the new audit JSONs) | FR-3+FR-4: a fresh audit over ALL 112 files; each of the 10 findings fixed or proven | `AUDIT GATE: PASS` on the whole tree | test_audit_whole_tree_coverage |
| W4 the container ceiling | scripts/container-substrate-payload.sh + phaseE-kev.json | FR-5: both absent substrates attempted; what starts, starts; what cannot is BLOCKED | the rig's register >= 7/8 OR the named BLOCKED | test_container_register_reads_eight_of_eight |
Run the ids via `bun test -t <name>`; the ST labels live in the spec. The board
.trident/plan-6l2e/cleanup-tracker.md is initialized BEFORE the first dispatch.

## LAWS
- RIPWIRE FIRST-CLASS: map structure (verb=callers / verb=for, path=gi-link) before EVERY coding
  edit. Blind or syntax-only patches are FORBIDDEN. Missing tool -> RIPWIRE_MISSING.
- BUILDER-UNDER-AUDIT: a subagent's return is a CLAIM. Re-run tsc + the battery YOURSELF.
- EVIDENCE DISCIPLINE: every verdict carries a quoted tool result (a verbatim output, an
  artifact path, an exit code). No prose verdicts.
- VIOLATION IS AUTOMATIC FAILURE: theatrical slop, a fabricated PASS, a skipped gate, a
  self-contradicting output line, or a weakened assertion FAILS THE WAVE ON SIGHT.

## PROOF CONTRACT (four tiers; every wave's gate cites the DPL1 spec §6 and its
artifact under packages/gi-cleanup/ or artifacts/ — a claim without its tier is VOID)
| tier | what | artifact |
|---|---|---|
| L0 | `bunx tsc --noEmit` / the build | the exit code |
| L1 | unit — the pure functions | the test run |
| L2 | SCRIPT TEST — real modules, real side effects | the PASS/FAIL table + exit |
| L3 | the rig (the container AND the host-live) | the results JSON + the ledger rows |
Named tests: test_goal_predicate · test_goal_predicate_honest_text ·
test_ledger_diversity_four_verdicts · test_act_theatrical_fires · test_audit_whole_tree_coverage
(>=3 selectable via `bun test -t`; the live/container angle is W4; the independent
re-verification is the orchestrator re-running every prior gate on the combined tree).
EVERY enforcement is tested as POSITIVE + NEGATIVE halves; ADVERSARIAL FIRST — the attack cases
run BEFORE the happy path. Bound every token to a TOOL RESULT (a verbatim output, an artifact
path, `exit 0`, `RC=0`), never to agent prose. NO ARTIFACT, NO CLAIM.

## RUNTIME SEAT (mandatory — the author's seat is the default failure)
"I am the driver of the GI kernel on this host." H1 start the real instance (the deployed
bundle + the live registry). H2 operate it FIRST PERSON: drive a THEATRICAL act (a claim with
no evidence), a DESTRUCTIVE act, a WELL-GROUNDED act (queriedBefore: true + real graph facts),
and a DUMB act — each with a PRE-REGISTERED expectation. H3 every break is the deliverable:
op#, expected, actual VERBATIM, the mechanism, the fix, the retest. H4 push it: two at once;
kill it mid-decision; the legit path twice. H5 fix IN the seat; the retest is the NEXT op on
the SAME battered instance. H6 the runtime ledger: >=4 DISTINCT verdicts. H7 close only when
nothing unexperienced remains. ZERO NEW BUGS FOUND IS A RED FLAG. THE SECOND OPERATOR: a
zero-context subagent, given ONLY the README, must operate the kernel and get a verdict.

## ADVERSARIAL LOOP (adversarial-first; the corpus-exhaustion contract)
Map every exported decision function (decideFromRegistry, decideFireFromGraph, runKernelV2,
the 3 detectors); the surface map IS the probe plan. For each: the positive + the negative +
the edge + the FULL evasion family. Probes run against the DEPLOYED runtime (source-import
BANNED). Adjudicate EVERY failure BOTH ways before any fix. The loop terminates only when a
FULL pass returns ZERO confirmed defects AND the docs sweep is clean.

## DOC CONTRACT
- canon: context_management/ — 11 docs; the 2 logs update at the MOMENT of work. Gate: 200+
  lines, >=3 file:line refs, the 5 read-first docs agree on the dist SHA.
- ship: BUILD_REPORT (500+), DEBUG_LOG (500+), FAILURE_LOG, SPEC_VIOLATION_LOG, TESTING_LOG.
- AUDIT GATE: a code-audit artifact exists on disk AND the TESTING_LOG carries
  `AUDIT GATE: PASS|FAIL|BLOCKED`. FAIL blocks every ship-ready claim; BLOCKED is never PASS.

## CHECKPOINT CONTRACT
Enter P3 with a ROUND-ZERO checkpoint. At P7: src (the full tree, the count verified) · the
dist + its SHA · the 11 canon · the 5 ship docs · the spec + artifacts · CHECKPOINT_MANIFEST
(state + HONEST GAPS) · ONE seal mode (full-tree lock OR no-lock — NEVER manifest-only).

## HARD STOPS
- Secrets: keys live out-of-band (the key scripts); never in the repo, chat, logs, or rows.
- The lanes: muse on GO needs the RESPONSES api; mimo-v2.5 works on chat completions. NEVER
  verboo. A 429/402/503 is a SIGNAL TO SWITCH LANE, never a stall.
- Rig down -> BLOCKED + the retry condition. Never PASS.
- Do NOT rebuild the corbell store from the repo root (F-96: 2.1 GB, 90+ min D-state stall).

## STOP
The run stops only when the spec's §6 exit battery is green — tsc exit 0; `bun run test` 0
fail; goal-verify 5/5 with NO self-contradicting line; the register honest at face value;
`COUNT(DISTINCT rule_id||band||action) >= 4`; the whole-tree audit 0 critical/0 high — AND the
seal + receipt exist. A BLOCKED state is never a stop: it names its resume condition.
FIRST REPLY: re-measure the baseline, post the diff, fire W1 the same turn.

## ANTI-DERAIL (recognize these; do not re-live them)
- THE LYING GATE: a PASS line that the next line contradicts FAILS THE WAVE ON SIGHT.
- THE HOLLOW LEDGER: COUNT(*) >= 1 proves a write path, never a decision diversity.
- THE SOURCE-SUBJECT GREEN: a suite that imports ../src proves the source; mount the dist.
- THE DEAD-PROCESS MONITOR: judge a build by ps stat + delta-bytes, never elapsed time.
- SCOPE SHRINK: "the remaining findings look acceptable" is never a finding.
- THE PROXY GUARD: a guard that checks a proxy quantity (questions.length) guards nothing.

## ANTI-STOP (these never close the run)
- Stationarity · a sub-inner pass as complete · memory-complete · theater-complete ·
  blocked-as-done · partial-scope close · "zero bugs" as success · an EMPTY or UNIFORM runtime
  ledger · a green battery presented as capability.

## RESUME POINTERS
- board .trident/plan-6l2e/cleanup-tracker.md · the spec packages/gi-cleanup/CLEANUP_SPEC.md
- the fraud ledger FAILURE_LOG.md · the runtime ledger .omp/graph-intelligence/fire-decisions.db
- docs context_management/ + the 5 ship docs · checkpoint Checkpoints/<TOKEN>/
A fresh session resumes from DISK, never from this pin's frozen numbers.
