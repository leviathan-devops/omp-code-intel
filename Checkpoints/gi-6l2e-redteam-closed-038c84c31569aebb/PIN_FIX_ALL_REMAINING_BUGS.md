# /goal — GI KERNEL 6L+2E: FIX AND TEST ALL REMAINING BUGS (the red-team close)

## GOAL
Fix and test EVERY remaining bug in the GI 6L+2E kernel — the 5 declined audit findings, the
artifact-coverage gap (1 of 51 test files mounts the deployed bundle), the container's 7 absent
substrates, and everything a full red-team pass surfaces — and STOP only when every finding is
either FIXED-with-a-pinned-proof or proven NOT-A-BUG with its evidence, the whole suite green,
and a fresh code-audit artifact covering the FINAL dist reads 0 critical / 0 high.

## BASELINE
Re-measure ALL of these on the FIRST REPLY (inherited numbers are STALE). ★ THE SUITE HAS TWO
SUBJECTS AND TWO COMMANDS:
```
  repo / branch     Graph_Intelligence @ jarvis/gi-main @ fff3d4f
  the dist (THE ARTIFACT)  extensions/graph-intelligence/index.js
      sha256 d4872b4814fc07c5baf0735c947c9fdacf2b970bb03560375aeb466a2b210ea5 · 9,478,634 B
      ★ IT IS THE DEPLOYED BUNDLE (byte-identical to ~/.omp/agent/extensions/graph-intelligence/index.js)
  the source            112 .ts / 27,645 L
  ★ bun test                -> `370 pass · 0 fail · Ran 370 tests across 34 files`   (the *.test.ts default)
  ★ bun test ./tests/st-*.ts -> `98 pass · 0 fail`                                  (the 17 st-*.ts, explicit ./ path)
  ★ bun run test            -> BOTH in one command                                  (fixed this session)
  ★ THE SUBJECT AUDIT (measured): 1 of 51 files MOUNTS the deployed bundle
      (tests/st-gi-audit-fixes.test.ts — `await import(BUNDLE)`); 1 checks its existence
      (st-package-audit.test.ts); 50 of 51 import ../src — THE SOURCE.
      → THE BACKLOG: the DEPLOYED ARTIFACT is proven by the dist-content gate + the container, NOT the suite
  the bug ledger / audit  45 F-entries · ocr sessions 2bced5f8 (2 high) -> e0c136e3 (0 high, 6 med, 4 low)
      ★ 5 of 10 findings DECLINED-WITH-REASONS — the backlog's core · ★ the artifact covers the PRIOR dist
  the container           gi-kev-ct (omp-ct:master) up: 14/14 host + 7/7 KEV · its register consumed:1/8
                          (the other 7 substrates absent FROM THE RIG) · gi-6l2e-ct DOWN
  the register            bun scripts/consumption-audit.ts . evidence --gate -> consumed:8/8 · exit 0
  the predicate           bun scripts/goal-verify.ts . evidence -> 5/5 · exit 0 (the control exits 1)
  the tsc                 bunx tsc --noEmit -> exit 0
```

## WAVES
W1→W5, each with DISJOINT files. W1/W3/W5 independent; W2 the only `src/omp/` writer; W4 owns the rig.
### W1 — THE ARTIFACT-COVERAGE FRONT (the §7 gap made mechanical)
- files: `tests/st-artifact-coverage.test.ts` (NEW ONLY — no other file)
- build the missing instrument: a suite that **MOUNTS THE DEPLOYED BUNDLE** (the
  `st-gi-audit-fixes.test.ts` `mountBundle` pattern) and asserts the artifact's OWN behavior — the
  tool registry, the decision, the ledger row, the refusal on a missing substrate — all against
  `extensions/graph-intelligence/index.js`, never `../src`.
- named tests: `bun test -t test_artifact_registry_matches_source` ·
  `bun test -t test_artifact_decide_on_known_subject` · `bun test -t test_artifact_ledger_row_written` ·
  `bun test -t test_artifact_refuses_missing_substrate`
- gate: `bun test ./tests/st-artifact-coverage.test.ts` exits 0 AND the suite reads the dist's
  sha (so a stale dist FAILS the suite, not just the gate). The ST ids: ST-AC-1..ST-AC-4.

### W2 — THE AUDIT-FINDINGS FRONT (the 5 declined, each resolved)
- files: `src/omp/adapters/**` · `src/omp/decision.ts` · `artifacts/AUDIT_GATE_F98.md`
- for EACH of the 5 declined findings, choose and EXECUTE one:
  (a) FIX it and pin the fix with a test, or (b) prove NOT-A-BUG with a measurable argument +
  a test that would fail if the claim were true. Record the verdict in the adjudication table.
- the 5 (READ the table for each reason, never this summary): `buildRegistry` uncached (the probes
  read LIVE state) · the sync SQLite open · the returned ledger handle · the `substrate` param
  (INEXACT — 8 of 9 verbs drop it) · `GI_TARGET_ROOTS` TOCTOU · `GI_TOOL_NAMES_ALIASES`
- named tests: `bun test -t test_declined_buildregistry_live_state` ·
  `bun test -t test_declined_sync_sqlite_row_lands_with_run` · `bun test -t test_declined_toctou_scope_guard`
- gate: every row carries a verdict + its evidence; `bun test ./tests/st-gi-audit-fixes.test.ts` green. ST ids: ST-AF-1..ST-AF-5.

### W3 — THE KERNEL RED-TEAM FRONT (the adversarial hunt)
- files: `tests/st-redteam-kernel.test.ts` (NEW) · `reports/REDTEAM_KERNEL_<date>.md` (NEW)
- attack the DECISION SURFACE, adversarial-first: a forged delimiter in the KEV state · an empty
  options list · a distribution that is exactly uniform (the guard must THROW) · a fact whose
  consumer is not a LayerId · a certification from a kernel consumer (TSG/ABIDE) · a scope whose
  ledger dir is read-only · a scope with a MALFORMED policy.json · a concurrent `gi-decide` from
  two processes on one ledger · a target path with `..` traversal · a subject of 10k chars.
- EVERY probe that fails gets the TWO-SIDED adjudication (probe-error vs real defect) before any
  verdict — a probe-error is recorded as a probe-error, NEVER as a defect.
- named tests: `bun test -t test_redteam_uniform_distribution_throws` ·
  `bun test -t test_redteam_nonlayer_consumer_rejected` · `bun test -t test_redteam_forged_delimiter` ·
  `bun test -t test_redteam_concurrent_decide_one_ledger`
- gate: the suite exits 0; every confirmed defect is FIXED with its pin; the report names each
  probe + its observed + its verdict. ST ids: ST-RT-1..ST-RT-10.

### W4 — THE CONTAINER-COVERAGE FRONT (the 7 absent substrates)
- files: `scripts/container-substrate-payload.sh` (NEW) · the rig state
- ship the host-side substrates into the rig (the SAME payload pattern that carried KEV:
  transformers + the ONNX weights + onnxruntime-node/dist + the deps): L1 SEMANTICA · L2 ARSUMBRIS
  (the au daemon — a PROCESS) · L3 UA · L4 C2KG · L5 CORBELL (the store) · L6 GRAPHIFY · ABIDE.
- named tests: `bun test -t test_container_register_reads_eight_of_eight` ·
  `bun test -t test_container_substrate_absent_is_named`
- gate: the CONTAINER TUI's `gi-consumption` reads `consumed:8/8` (not 1/8) with the SUBJECT
  named — a tool-result token in the headed omp, not prose; a `phaseE-kev.json` update with the
  per-substrate verdicts; every absence NAMED, never assumed. ST ids: ST-CT-1..ST-CT-7.

### W5 — THE FRESH-AUDIT FRONT (the ship gate, on the FINAL dist)
- files: `artifacts/` · `TESTING_LOG.md` · `SHIP_DOCS_MANIFEST.md`
- re-run the code audit on the FINAL dist via the live lane (`muse on GO` / `mimo-v2.5` on the GO
  proxy — NEVER verboo); record the artifact + the `AUDIT GATE:` line.
- named tests: `bun test -t test_audit_artifact_covers_final_dist_sha` ·
  `bun test -t test_audit_gate_line_present_in_testing_log`
- ★ THE INDEPENDENT RE-VERIFICATION: a zero-trust pass re-ran every claim in the BASELINE from
  scratch (the two suite subjects, the dist sha, the predicate, the exit codes) and a claims
  table records each claim → its instrument → its artifact. A diff against the blast radius of
  every changed symbol closes the front.
- gate: `AUDIT GATE: PASS (0 critical/high)` on the FINAL dist sha; a BLOCKED run is recorded
  BLOCKED with its retry condition — never upgraded to PASS. ST ids: ST-AU-1..ST-AU-2.

## PREFLIGHT + EXECUTION
PREFLIGHT (before any front fires): re-measure the baseline (the two suite subjects · the dist sha ·
the predicate) · confirm the worktree (pwd is .omp/wt/graph-intelligence-* · the way in is
`path=gi-link`) · compare the dist sha to the deployed bundle (a mismatch = STOP + rebuild) · probe
the lanes LIVE (one direct curl each, the audit lane NAMED) · list the rigs (W4's environment) · READ
the 5 declined findings from `artifacts/AUDIT_GATE_F98.md` (never this pin's summary) · write the
board `.trident/plan-6l2e/redteam-tracker.md``
- N fronts → `actor` batches with DISJOINT file ownership (W2 is the only `src/omp/` writer).
- The tracker `.trident/plan-6l2e/redteam-tracker.md` is the board; a front is DONE only when its
  DoD holds with a tool-result token.
- A fork the agent cannot settle headless → the RECOMMENDED default is taken and RECORDED
  (never a stall): (a) a declined finding with a plausible security argument → FIX it (the
  conservative branch); (b) a container substrate that will not start → BLOCKED + the retry
  condition; (c) an audit lane 429 → switch lane, never wait.

## ANTI-DERAIL (THIS tree's observed derailments — recognize, do not re-live)
- **THE DEAD-PROCESS MONITOR:** a build judged by ELAPSED TIME (measured here: ~2.5 h watching a
  `D`-state corbell build). FIRST CHECK: `ps -o %cpu,time,stat` + delta-bytes/interval.
- **THE SOURCE-SUBJECT GREEN:** the register imported `../src/…` while the deployed dist carried
  ZERO kernel symbols (F-98). Any "consumed" claim NAMES its subject.
- **THE TYPE-ONLY ERASED EDGE:** `import type` → the bundler deleted the kernel. After ANY src
  edit that must ship: `grep -c <symbol> <the dist>`.
- **THE ERROR'S NOUN IS NOT THE MECHANISM:** `Cannot find package 'onnxruntime-node'` while the
  package WAS present — only its `main` target was absent. Anchor to the artifact.
- **THE PROBE BUG READ AS A SUITE FAILURE:** `bun test tests/x.ts` (no `./`) is a FILTER, not a
  path → "17 files, 0 tests". Validate the instrument on a KNOWN-PASS input first.
- **SCOPE SHRINK UNDER PRESSURE:** "the remaining findings look acceptable" is never a finding.
- **THEIR-LANE DEFAULT:** verboo or an unlisted model. The lanes: muse-GO / mimo-v2.5-GO /
  openrouter-free / poolside-direct.

## ANTI-STOP (false-complete shapes that must never close this run)
- **STATIONARITY:** "no new bug in N probes" is not done — widen the lens or escalate.
- **SUB-INNER PASS:** a green SOURCE suite, a green rig, or the predicate alone NEVER closes the
  run — only the STOP definition does. **MEMORY-COMPLETE:** "verified earlier" without a THIS-TURN
  re-run is STALE. **THEATER-COMPLETE:** prose, typed-but-unrun commands, a verdict with no quoted
  result. **BLOCKED-AS-DONE:** a BLOCKED lane/rig requires its retry condition + a re-fire.
- **PARTIAL-SCOPE CLOSE:** W1 green with W2–W5 open is progress, not completion.
- **THE 5 DECLINED READ AS ACCEPTABLE:** each is FIXED or proven NOT-A-BUG.


## LAWS
0. **THE BUILD PACKAGE (this pin's authority, ON DISK):** the DPL1 spec at
   `packages/gi-kernel-v2.1/GI_KERNEL_6L2E_DPL1_SPEC.md` · the wave plan at
   `.trident/plan-6l2e/wave-plan.md` (`WAVES: 12`) · the package at `packages/gi-kernel-6l2e/`.
   READ them before W1; a wave that contradicts the DPL1 is a finding, not a re-plan.
1. **RIPWIRE FIRST-CLASS.** Every coding edit is preceded THIS TURN by `ripwire` `verb=callers`
   or `verb=for` on the symbol you will change (or `graph-query` `verb=who-calls`). The session
   cwd is a worktree — `path=gi-link` is the way in. NO blind edits, NO grep-then-edit, NO
   "it looks small".
2. **THE ARTIFACT IS THE SUBJECT.** A green suite proves the SOURCE unless it MOUNTS the deployed
   bundle. Every "it works" claim names which of the two it measured.
3. **THE EXIT TEST.** A condition with no command that exits NONZERO when violated is
   DOCUMENTATION. Every DONE condition gets its predicate; the predicate is run against a
   KNOWN-PASS state first (it will catch a bug in itself).
4. **TWO-SIDED ADJUDICATION.** Every failure is adjudicated BOTH ways before any verdict; a
   declined finding records its reason (silence reads as "never found").
5. **EVIDENCE OR DELETE.** No PASS without a tool-result excerpt in the same turn. An
   unverifiable ok:true downgrades to not_met.
6. **APPEND-ONLY DOCS.** The 6 ship docs append; the ONE permitted edit is a TESTING_LOG plan
   entry's `Status:` field. **ONE WRITER PER FILE** — W2 is the only writer under `src/omp/`.

## HARD STOPS
- **SECRETS:** never in the repo, the chat, the docs, or the ledger — the key scripts
  (`~/.omp/agent/bin/{go,poolside,openrouter}-key.sh`) resolve them; reference the path only.
- **THE LANES:** `muse on GO` needs the RESPONSES api; `mimo-v2.5` works on chat completions.
  NEVER verboo. A 429/402/503 is a SIGNAL TO SWITCH LANE, never a stall.
- **THE RIG:** a container step that cannot run reports BLOCKED + its retry condition — never a
  fabricated PASS. `gi-6l2e-ct` DOWN; `gi-kev-ct` up. **OPERATOR-OWNED:** nothing awaits the
  operator — this scope is fully agent-executable.
- **DEAD PATHS:** do NOT rebuild the corbell store from the repo root (F-96: it walks 2.1 GB and
  D-state-stalls 90+ min) — the adapter's `scopeRepoRef` scopes it; do not un-scope it.
  Do NOT re-run the audit on OpenRouter free + poolside direct in a loop (measured 429s).

## PROOF CONTRACT
- Pass tokens bound to TOOL RESULTS, never prose. Corpus: `consumed:8/8` · `THE PREDICATE PASSED:
  5/5` · `AUDIT GATE: PASS` · `468 pass · 0 fail across 51 files` · the dist sha on the deployed
  bundle · `TSG\tCONSUMED`.
- Fail tokens: `consumed:1/8` · `GI_GOAL_NOT_MET` · `GI_LEDGER_OPEN_FAILED` · `GI_STACK_INCOMPLETE`
  (where the stack is expected up) · `AUDIT GATE: FAIL|BLOCKED` · a uniform KEV distribution.
- ★ **A VIOLATION FAILS THE WAVE ON SIGHT — AUTOMATIC FAILURE:** theatrical slop (a PASS with no
  tool-result token; a green on the wrong SUBJECT; a screenshot without its artifact) · derailment
  (a blind edit; a scope-shrink; a stall on a live lane) · cheating (a weakened assertion; a skipped
  test; a test bent to the golden value; a fabricated row). Each VOIDS the wave and is logged to
  THEATRICALITY_LOG with the verbatim evidence.
- The results artifact: `.trident/plan-6l2e/redteam-<date>.json` per front + the per-finding rows.
- CIRCUIT BREAKER before any green claim: the dist sha matches the deployed bundle, `tsc` exits 0,
  `bun run test` exits 0, the goal predicate exits 0, OR the claim is not made.
- ZERO-BROKEN-WINDOWS: a fix that breaks a sibling test is not a fix — re-run the full suite.

## STOP
The run closes ONLY when: every W1–W5 gate green WITH its tool-result token; every audit finding carries
FIXED+pin or NOT-A-BUG+evidence; the fresh `AUDIT GATE:` line reads PASS on the FINAL dist;
`bun run test` exits 0; `bun scripts/goal-verify.ts . evidence` exits 0; the receipt updated with
the new findings; the checkpoint refreshed (Mode B — `cp -r src/. "$CP/src/"`, never `cp -r src`);
git clean.

**FIRST REPLY:** re-measure the BASELINE (the two suite subjects, the dist sha, the predicate),
then FIRE W1 THE SAME TURN. Do not report the baseline as work.

**ANYTHING LESS IS OPEN.** Stationarity, fatigue, a BLOCKED lane, a green SOURCE suite with an
unmounted artifact, or "the remaining findings look acceptable" NEVER closes this run.
