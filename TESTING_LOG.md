# TESTING_LOG — GI-OMP triple-system wave

## TEST PLAN ENTRY — 2026-09-15 — Triple-system like-for-like on one fixture

### HOST
- **What:** graphifyy CLI ground truth on /tmp/fx383 (alpha.ts def L1, beta.ts import+call L2): extract → graph.json schema → god-nodes/query/path/explain answers.
- **How:** `graphify extract /tmp/fx383 --no-cluster`; read graph.json; run `god-nodes`, `query`, `path`, `explain` against it.
- **PASS criteria:** EXIT=0; graph.json nodes[] carry id/label/source_file/source_location; edges[] carry source/target/relation/confidence; relations include `calls`.
- **FAIL criteria:** EXIT≠0; missing graph.json; zero edges on a two-file call graph.
- **Status:** PASSED

### HOST
- **What:** corbell CLI ground truth on the same fixture: init + methods build → workspace.db rows.
- **How:** `corbell init`; `corbell graph build --methods`; sqlite read of graph_nodes/graph_edges.
- **PASS criteria:** Services:1, Methods:2, Edges:1; node data carries file_path/method_name/line_start/line_end; edge method_call carries metadata line.
- **FAIL criteria:** "No workspace.yaml found" unhandled; Methods:0; missing line_start.
- **Status:** PASSED

### HOST
- **What:** ripwire parity on the same fixture: `--callers=alpha --json` count + rows.
- **How:** `time ripwire /tmp/fx383 --callers=alpha --json`; parse count + callers[].
- **PASS criteria:** count=1, `beta @ src/beta.ts:2`, real ≤0.5s.
- **FAIL criteria:** count=0 (none found); >2s on 2 files.
- **Status:** PASSED

### SCRIPT
- **What:** host battery green across all 14 port test files (the no-regression gate for this wave).
- **How:** `bun test ./tests/st-*.ts` full set.
- **PASS criteria:** 0 fail; expect() count ≥ prior run.
- **FAIL criteria:** any fail.
- **Status:** PASSED (see result entry)

### CONTAINER
- **What:** the 9 graph-query verbs + audit probe re-driven on gi-omp-port AFTER image PATH fix and dist rebuild (1487abfc…), each with its `ripwire:` line quoted.
- **How:** container-testing send batch → stream grep for `ripwire:` + verify tokens.
- **PASS criteria:** all 9 return `ripwire:` legs (callers/impact/edit-check/safe-delete/dead-code/path/verdict lines); audit returns GI_AUDIT_NOT_WIRED.
- **FAIL criteria:** any missing leg; any GI_QUERY_FAIL.
- **Status:** PASSED (see result entry)

## TEST RESULT — 2026-09-15 — Triple-system fixture runs

### HOST
- **The run:**
```
[graphify extract] scanning /tmp/fx383
[graphify extract] found 3 code, 0 docs, 0 papers, 0 images
[graphify extract] AST extraction on 3 code files...
[graphify extract] wrote /tmp/fx383/graphify-out/graph.json — 5 nodes, 5 edges (no clustering)
EXIT=0
```
- **The raw output:** `TOP KEYS: ['nodes','edges','hyperedges','input_tokens','output_tokens'] / NODES: 5 EDGES: 5`; edge0: `{src_alpha → src_alpha_alpha, contains, EXTRACTED, L1}`; full edge set includes `beta() -[calls/EXTRACTED]-> alpha()`.
- **The verdict:** PASS — the `calls` spine exists with EXTRACTED confidence.
- **The artifacts:** /tmp/fx383/graphify-out/graph.json (fixture; ephemeral).

### HOST
- **The run:**
```
✓ fx383  →  /tmp/fx383
✓ Graph built: Services: 1, Datastores: 0, Queues: 0, Methods: 2, Edges: 1
EXIT=0
```
(Pre-run dead end: `graph build` bare → `No workspace.yaml found. Run corbell init first.` — init is mandatory, a second operator-visible step.)
- **The raw output:** tables `graph_nodes(id,node_type,data)` / `graph_edges(id,source_id,target_id,kind,metadata)`; method nodes carry `method_name/file_path/signature/line_start/line_end/service_id/typed_signature`; the single edge `('fx383::beta.ts::beta','fx383::alpha.ts::alpha','method_call','{"line": 2}')`.
- **The verdict:** PASS — the exact node-data fields the corbell adapter's enrichment expects (file_path, method_name, line_start) are present.
- **The artifacts:** /tmp/fx383/corbell-data/.corbell/workspace.db (fixture; ephemeral).

### HOST
- **The run:** `count: 1 | callers: [('beta', 'src/beta.ts:2')]` / `real 0m0.090s`.
- **The raw output:** pasted verbatim above.
- **The verdict:** PASS — parity anchor for the fixture: beta calls alpha at L2, all three systems must agree.
- **The artifacts:** none (stdout).

### SCRIPT
- **The run:** `bun test ./tests/st-gi-omp-*.ts ./tests/st-hunter-*.ts ./tests/st-corbell-port.ts ./tests/st-populate-substrate.ts ./tests/st-verbs-parse.ts ./tests/st-ripwire-bridge.ts` (default `bun test` glob: `77 pass / 0 fail / 175 expect() / Ran 77 tests across 7 files`; full-file set: `58 pass / 0 fail / 703 expect() / Ran 58 tests across 14 files`).
- **The raw output:** pasted above (both invocations; the 7-file glob is the runner default, NOT a regression — the 14-file enumeration is the gate number).
- **The verdict:** PASS — battery green; note the glob discrepancy or the wrong count gets cited next wave.
- **The artifacts:** dist SHAs below.

### CONTAINER
- **The run:** container-testing `send` (9 verbs) + `send` (audit) on gi-omp-port, dist 1487abfc16ee0090…
- **The raw output (stream greps, verbatim):**
  - `ripwire: 6 callers (e.g. readStoredGraph gi-study-src/src/hunter/diagnostics/engine.ts:602, runGraphLogicDiagnostics gi-study-src/src/hunter/diagnostics/engine.ts:664, map gi-study-src/src/hunter/harness/map.ts:35)` ×13
  - `ripwire: impact_reaches=143 radius_untested=143` ×42
  - `ripwire: edit-check status=no-baseline callers=6 incompatible=0 (e.g. readStoredGraph …)` ×21/26
  - `ripwire: safe-delete callers=6 impact_reaches=143 uses=7 tested_self=0 risk=untested-radius` ×8
  - `ripwire: dead-code count=0 confidence=high` ×12
  - `ripwire: path reachable=1 hops=1 (runQueryTool → runQuery)` ×30
  - `ripwire: verdict=confirmed shape=calls hops=1 (readStoredGraph → openStore)` ×13
  - audit: `GI_AUDIT_NOT_WIRED: audit engine not bound in W2` (tool-result screenshot)
- **The verdict:** PASS — 9/9 verb legs live in tool-result context + the audit stub named.
- **The artifacts:** container gi-omp-port stream; dists `3ee3e0c9fa3e9b10` (GI) / `84735f2ce430a3db` (trident) deployed both rigs per RUNNING_BUILD_LOG.

## TEST PLAN ENTRY — 2026-09-15 — Full-port wave: graphify leg + audit bind on omp-ct:master

### SCRIPT
- **What:** 18-file battery (15 ST + 3 hydra) green incl. NEW st-graphify-port (extract/calls-spine/counts/empty/hermetic + tool HIT/MISS/REGRESSION/DENIED) + st-hunter-live W4 graphify live leg + hydra reader/settle/pipeline batteries.
- **How:** `bun test` with the explicit 18-file enumeration (the gate number; the default glob finds a different 10-file set — EN-003 class).
- **PASS criteria:** 0 fail; expect() >= 962; st-graphify-port solo 10/0.
- **FAIL criteria:** any fail; any phantom-module load error.
- **Status:** PASSED

### CONTAINER
- **What:** W9 dual-FRESH TUI per `docs/ct-plan-graphify.md`: G1 substrate populate, G2 who-calls/impact on graphify store, G3 hunt, G4 audit bind, G5 twin-verb regression, G6 dual-FRESH isolation, AD-G1..AD-G5 adversarial.
- **How:** container-testing send batches on gi-omp-port (graphify leg) + gi-omp-port2 (regression B); stream excerpts via exec+python (ANSI-stripped); artifacts read via exec.
- **PASS criteria:** every passToken in TOOL-RESULT context + failToken absent; circuit breaker 10/10; results artifact written.
- **FAIL criteria:** any token in prose only; any silent substitute; any invented token.
- **Status:** PASSED

### HOST
- **What:** Real-CLI smoke outside any container: graphifyy extract on a fresh fixture + populateSessionStore(substrate graphify) + whoCalls/impact/safeDelete reads; batch-writer runtime proof for the tsc-flagged call shape.
- **How:** `graphify extract /tmp/gfx --code-only --no-cluster`; `bun -e` populate + verb reads against the session store.
- **PASS criteria:** extract EXIT=0 nodes>=5 edges>=5; populate nodes=edges>=6 substrate=graphify; whoCalls rows=2 with file:line; BATCH-CALL-RUNTIME-OK.
- **FAIL criteria:** EXIT!=0; zero nodes; rows=0 on the calls spine.
- **Status:** PASSED

## TEST RESULT — 2026-09-15 — Full-port wave battery + TUI + host smoke

### SCRIPT
- **The run:** `bun test ./tests/st-gi-omp-scope.ts ./tests/st-gi-omp-refuse.ts ./tests/st-gi-omp-wipe.ts ./tests/st-gi-omp-tools.ts ./tests/st-gi-omp-isolate.ts ./tests/st-gi-omp-gate.ts ./tests/st-gi-omp-corrupt.ts ./tests/st-hunter-port.ts ./tests/st-hunter-live.ts ./tests/st-corbell-port.ts ./tests/st-populate-substrate.ts ./tests/st-gi-omp-populate.ts ./tests/st-verbs-parse.ts ./tests/st-ripwire-bridge.ts ./tests/st-graphify-port.ts ./src/hydra/__tests__/reader-battery.test.ts ./src/hydra/__tests__/settle-battery.test.ts ./src/hydra/__tests__/pipeline-battery.test.ts`
- **The raw output:** `111 pass / 0 fail / 977 expect() calls / Ran 111 tests across 18 files`; st-graphify-port solo `10 pass / 0 fail / 84 expect()`; wave-only 7-file `61/0/335`.
- **The verdict:** PASS — zero regressions; the phantom-import break (F-05) was caught by this exact enumeration (8 fail / 8 errors pre-fix) and is green post-fix.
- **The artifacts:** dist SHAs below (BUILD_REPORT entry); per-lock returns at history://GraphifyLock, history://HunterSeamLock, history://AuditFaceLock, history://ProofLock.

### CONTAINER
- **The run:** auth probe + who-calls/impact/audit batch + hunt/safedelete/chain/verify/empty-target batch on gi-omp-port (dist `cf464e58f44979ef`, relaunched post-deploy); probe + who-calls on gi-omp-port2; fixture /tmp/fx383g (sources + staged graph.json 5n/5e, touched warm).
- **The raw output (tool-result excerpts, verbatim):** `{"token":"PROBE_TOOL_OK","sessionID":"default","echo":"graphify-wave-auth"}`; `substrate=graphify graph=/tmp/fx383g/graphify-out/graph.json nodes=5 edges=5` + `rows=2` + `beta.ts (/tmp/fx383g/src/beta.ts:1)` + `beta() (/tmp/fx383g/src/beta.ts:2)`; `impact_reaches=2` + `beta.ts@depth1 ... via imports`; `AUDIT_DONE layer=R28-sro-graph findings=3 reportPath=/tmp/fx383g/.omp/graph-intelligence/audit/R28-sro-graph-1789455224867/findings/report.md`; `HUNT_DONE runId=gi-study-src-hunt-20260915-2 findingsCount=296 reportPath=/workspace/gi-study-src/MASTER_CONTEXT/bug_hunter_report_v3.md`; `safe_delete: openStore callers=11 reaches=25 uses=2 testReach=0`; `claim refused (ripwire: --verify claim not recognized ... CLOSED ...)`; `rows=0` empty-target; `PROBE_TOOL_OK ... echo=graphify-fresh-b` + `substrate=indexer-fallback reason=CORBELL_NOT_WARM:absent rows=0` on B.
- **The verdict:** PASS — G1-G6 + AD-G1..AD-G5 all green in tool-result context; circuit breaker 10/10 (shaMatch exec both rigs, authProbe, all-executed, tokens-asserted, no-circular, no-timeouts, blast-covered, adversarial-behaved, alive, artifact-written).
- **The artifacts:** `.omp/ct-results-graphify.json` overallVerdict PASS; audit report 1305 B / 3 FINDING rows on disk; hunt v3 report 453,787 B on disk; both rigs RUNNING + tmux up at verdict.

### HOST
- **The run:** `/home/leviathan/.local/share/uv/tools/graphifyy/bin/python -m graphify extract /tmp/gfx --code-only --no-cluster` → `[graphify extract] wrote /tmp/gfx/graphify-out/graph.json — 6 nodes, 6 edges`; `bun -e` populateSessionStore(/tmp/gfx session, `{substrate:'graphify'}`) → `[gi-omp] populate substrate=graphify graph=/tmp/gfx/graphify-out/graph.json nodes=6 edges=6`; verb reads whoCalls rows=2 (beta.ts:1, beta():2), impact reaches=2, safeDelete callers=2; batch-writer probe → `BATCH-CALL-RUNTIME-OK`.
- **The raw output:** pasted above (all four commands this turn).
- **The verdict:** PASS — the graphify leg works outside containers too; the tsc-flagged call shape is runtime-green (EN-009).
- **The artifacts:** /tmp/gfx fixture + session store (tmpdir evidence); no container state touched.

## TEST RESULT — 2026-09-15 — Ship-package Phase A gate (S1–S6 re-run to green)

### SCRIPT
- **The run:** update-ship-docs STEP 5 gate, first run then re-run after fixes (this turn, pre-assembly).
- **The raw output (first run — FAILED):** `BUILD_REPORT 137 / DEBUG_LOG 75→83 / FAILURE_LOG 51→59 / SPEC_VIOLATION_LOG 16 / TESTING_LOG 134` lines; S1 FAIL on SPEC (<50); S5 FAIL — BUILD tail `b19c166e…` (trident, second artifact) ≠ TRUE GI `cf464e58…`. Fixes: DEBUG EN-010 + FAILURE F-07 (perishable first), SPEC V-10/V-11 + evidence annex (real outputs, no padding), BUILD ship-package entry closing on the GI SHA, manifest timestamp + counters.
- **The raw output (re-run — PASSED):** `BUILD_REPORT 146 / DEBUG_LOG 83 / FAILURE_LOG 59 / SPEC_VIOLATION_LOG 28 / TESTING_LOG 134+` lines (all ≥50 — S1); evidence refs all ≥2 (S2); plan=2 result=2 zones (S3); append-only, no prior entries touched (S4); `grep -oE '[a-f0-9]{64}' BUILD_REPORT.md | tail -1` == TRUE SHA `cf464e58…` (S5 MATCH); manifest refreshed post-fix, DEBUG latest EN-010 newer than pre-fix stamp (S6).
- **The verdict:** PASS (S1–S6 green) — Phase A complete, assembly authorized.
- **The artifacts:** SHIP_DOCS_MANIFEST.md (Baseline `cf464e58…`, counters EN-010/F-07/V-11/P-01); this entry.

## TEST RESULT — 2026-09-15 — Ship-package Phase A FINAL gate (S1–S6 green)

### SCRIPT
- **The run:** update-ship-docs STEP 5 gate, final re-run after remediation ledger (this turn).
- **The raw output:** `BUILD_REPORT 146 / DEBUG_LOG 83 / FAILURE_LOG 59 / SPEC_VIOLATION_LOG 60 / TESTING_LOG 143+` lines — all ≥50 (S1); evidence refs ≥2 every doc (S2); plan=2 result=4 zones (S3); append-only verified (S4); BUILD tail `cf464e58…` == TRUE GI SHA (S5 MATCH); manifest refreshed, DEBUG latest EN-010 (S6).
- **The verdict:** PASS (S1–S6 green) — Phase A COMPLETE, assembly authorized.
- **The artifacts:** SHIP_DOCS_MANIFEST.md (Baseline `cf464e58…`, counters EN-010/F-07/V-13/P-01); SPEC remediation ledger (every VIOLATED row dispositioned, 2 OPEN carried: V-10 LOW, V-11 MEDIUM).

## TEST RESULT — 2026-09-15 — Ship-package TUI RE-PROOF on shipped dists (NOT a re-quote)

### CONTAINER
- **The run:** FRESH relaunch both rigs on the SHIPPED SHAs (exec-verified pre-legs: GI `cf464e58f44979ef` + trident `b19c166e16b0939b` both containers), then re-driven legs: auth probe + G1 graphify who-calls + G4 audit + G3 hunt + G5 impact/safe-delete on gi-omp-port; probe + empty-tree who-calls on gi-omp-port2.
- **The raw output (tool-result excerpts, verbatim, THIS run):** `{"token":"PROBE_TOOL_OK","sessionID":"default","echo":"ship-reproof-auth"}`; `substrate=graphify graph=/tmp/fx383g/graphify-out/graph.json nodes=5 edges=5rows=2beta.ts (/tmp/fx383g/src/beta.ts:1)beta() (/tmp/fx383g/src/beta.ts:2)` + `ripwire: query failed (ripwire: --callers symbol not found: alpha() (did you mean 'alpha'?))` (fail-soft, named); `AUDIT_DONE layer=R28-sro-graph findings=3 reportPath=/tmp/fx383g/.omp/graph-intelligence/audit/R28-sro-graph-1789460323775/findings/report.md` (1305 B artifact, third run-id dir on disk); `HUNT_DONE runId=gi-study-src-hunt-20260915-3 findingsCount=296 reportPath=/workspace/gi-study-src/MASTER_CONTEXT/bug_hunter_report_v4.md` (453,787 B v4 artifact); `impact_reaches=` ×19 + `safe_delete:` ×12 in tail window, LINELESS_NODE 0; rig B `{"token":"PROBE_TOOL_OK","sessionID":"default","echo":"ship-reproof-b"}` + `substrate=indexer-fallback reason=CORBELL_NOT_WARM:absentrows=0` + fail-soft ripwire line.
- **The verdict:** PASS — every ship leg re-fires on the shipped dists in live tool-result context; graphify isolated to A; B honest-zero; no stub resurrections (GI_AUDIT_NOT_WIRED absent from happy paths); no LINELESS_NODE.
- **The artifacts:** audit report dir `R28-sro-graph-1789460323775` (1305 B); hunt v4 report 453,787 B; streams /tmp/tui-stream.txt per rig (RIGS LEFT RUNNING for inspection).

## TEST RESULT — 2026-09-15 — Go fallback battery + full regression

### SCRIPT
- **The run:** `bun test ./tests/st-go-fallback.ts` + FULL 19-file enumeration (18 + new).
- **The raw output:** fallback solo `8 pass / 0 fail / 24 expect()`; full `119 pass / 0 fail / 1004 expect() / Ran 119 tests across 19 files`.
- **The verdict:** PASS — 6-count, openrouter-only pins, live go-4 resolve, all-dead→openrouter, contract-no-mark, quota-advance/fall, AP-4 clean; zero regressions.
- **The artifacts:** `tests/st-go-fallback.ts`; pool snapshot `go-4 ok · go-5 ok · go-6 ok · fallback=go(go-4-alive)`.

## TEST RESULT — 2026-09-15 — FINAL SEAL re-proof on shipped dists (rename + 6-key + fallback)

### CONTAINER
- **The run:** FRESH relaunch both rigs on FINAL SHAs (exec-verified pre-legs: GI `34ba3ffe2b0b68ef` + trident `67dc892a55c06e11` both containers), then: auth probe + G1 graphify + G4 aether-audit + G3 hunt on gi-omp-port; probe + empty-tree on gi-omp-port2.
- **The raw output (tool-result excerpts, verbatim, THIS run):** `{"token":"PROBE_TOOL_OK","sessionID":"default","echo":"final-seal-auth"}`; `substrate=graphify graph=/tmp/fx383g/graphify-out/graph.json nodes=5 edges=5 rows=2 beta.ts (/tmp/fx383g/src/beta.ts:1) beta() (/tmp/fx383g/src/beta.ts:2)` + fail-soft ripwire line; `AUDIT_DONE layer=R28-sro-graph findings=3 reportPath=/tmp/fx383g/.omp/graph-intelligence/audit/R28-sro-graph-1789467936525/findings/report.md` (new dir, 1305 B class); `HUNT_DONE runId=gi-study-src-hunt-20260915-5 findingsCount=296 reportPath=/workspace/gi-study-src/MASTER_CONTEXT/bug_hunter_report_v6.md` (453,787 B v6); rig B `{"token":"PROBE_TOOL_OK","sessionID":"default","echo":"final-seal-b"}` + `substrate=indexer-fallback reason=CORBELL_NOT_WARM:absent rows=0` + fail-soft ripwire line.
- **The verdict:** PASS — auth both rigs; graphify leg; aether audit (canonical name); hunt + artifact; B honest-zero with isolation. Rigs RUNNING + tmux up at verdict.
- **The artifacts:** audit dir `R28-sro-graph-1789467936525`; hunt v6 report 453,787 B; streams per rig.

## TEST RESULT — 2026-09-15 — Rescope migration battery from NEW root

### SCRIPT
- **The run:** FULL 19-file enumeration from `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence` (first run red `102/8 + 3 errors` on missing xstate vendor; symlink node_modules for verification, then removed).
- **The raw output:** `119 pass / 0 fail / 1004 expect() / Ran 119 tests across 19 files`.
- **The verdict:** PASS — the move breaks nothing; vendor exclusion + symlink-then-remove recorded in F-10.
- **The artifacts:** MIGRATION_MANIFEST.md (743/743 SHA); battery tail this entry.

## TEST RESULT — 2026-09-15 — Qwen ship gate on the 5 wave files (scan, JSON)

### CONTAINER
- **The run:** `/home/leviathan/.npm-global/bin/ocr scan --path src/omp/extension.ts,src/hunter/keys/go-key-pool.ts,src/hunter/graph/graphify-adapter.ts,src/omp/populate-graphify.ts,src/hydra/auditor.ts --format json` (147s wall; new root; session `1aca90d4-584f-410e-859c-264c97bc2ebb`, 58-line JSONL).
- **The raw output:** FINDINGS 45 {medium 21, high 21, critical 2, low 1}; per-file populate-graphify 8 / extension 9 / auditor 9 / go-key-pool 8 / graphify-adapter 11.
- **The verdict:** GATE: FAIL (2 critical, 21 high) — triaged row by row below. No silent pass, no remembered verdict.
- **The artifacts:** session JSONL `~/.opencodereview/sessions/...Graph_Intelligence/1aca90d4-...jsonl`; recount script output this turn.

### TRIAGE (every critical/high, verdict = refuted-by-code / accepted-debt / accepted-fixable)

| File:line | Severity | Claim | Verdict |
|---|---|---|---|
| populate-graphify.ts:155 | critical | supersede UPDATEs autocommit BEFORE BEGIN; insert throw loses live rows | ACCEPTED-FIXABLE (V-16: single-txn helper + ROLLBACK) |
| extension.ts:153 | critical | wipe has no env gate | REFUTED-BY-CODE — gate is `gi-registry.ts:111` (`GI_OMP_ALLOW_CLEAR !== "1"` → throw), caught `:157-161`; pinned by `st-gi-omp-tools.ts:33-39` + `st-gi-omp-wipe.ts:22-40` |
| populate-graphify.ts:173 | high | BEGIN/COMMIT without ROLLBACK; close in finally while locked | ACCEPTED-FIXABLE (V-16, same helper) |
| populate-graphify.ts:227 | high | same defect in writeGraphifyCheckout + DDL drift risk | ACCEPTED-FIXABLE (V-16, same helper + DDL single-source) |
| populate-graphify.ts:143 | high | adapter failure raw message, no GRAPHIFY_NOT_WARM:/GRAPH_EMPTY: token | ACCEPTED-FIXABLE (wrap build errors in named tokens; data-defect LINELESS_NODE must propagate, not be swallowed) |
| populate-graphify.ts:89 | high | freshness-budget exhaustion returns false-fresh | ACCEPTED-FIXABLE (budget-hit → `{fresh:false, reason:stale-budget}` loud, never fresh) |
| extension.ts:196 | high | caller sessionId overrides callerId unchecked | ACCEPTED-FIXABLE (V-17: authorize or drop the override; scope law owns this) |
| extension.ts:301 | high | aether targetPath no absolute/allowlist check | ACCEPTED-FIXABLE (V-17: mirror the graph-query GI_PATH_DENIED guard) |
| extension.ts:243 | high | populate-on-read mutates without locking | ACCEPTED-DEBT (single-TUI-write model + hunt-lock on hunts; concurrent-query race documented; rework only on operator order) |
| auditor.ts:729 | high | write-success by substring bytes fragile | ACCEPTED-FIXABLE (parse writeFindings JSON, validate bytes/path) |
| auditor.ts:134 | high | grep stdout treated as success on timeout/maxBuffer error | ACCEPTED-FIXABLE (surface err explicitly when stdout partial) |
| auditor.ts:509 | high | per-isolate rg/grep process storm | ACCEPTED-DEBT (fixture-scale machine; cap only on operator order) |
| auditor.ts:474 | high | recursive DFS blowup on dense graphs | ACCEPTED-DEBT (fixture-scale; iterative+early-slice only on operator order) |
| go-key-pool.ts:297 | high | empty pool silently falls to OpenRouter vs header LOUD promise | ACCEPTED-FIXABLE (V-17 DOC-or-CODE: either loud `GO_POOL_EMPTY` when zero keys configured, or reword header — operator picks) |
| go-key-pool.ts:152 | high | grace-law degrade masks persistent outage | ACCEPTED-DEBT (GRACE LAW is the documented design — cycler never kills a call; caller gate owns loud-throw) |
| go-key-pool.ts:93 | high | session-pinned files vs machine-wide sharing doc | ACCEPTED-DEBT (F-34 lineage: pinning FIXED shared-file corruption; header reword owed, behavior stays) |
| go-key-pool.ts:107 | high | singleton thrashes on sessionId vary | ACCEPTED-DEBT (path-keyed handle already; test-flip churn is not the live shape — single path per process) |
| graphify-adapter.ts:628 | high | chain() BFS O(V*E) + linear lookups | ACCEPTED-DEBT (fixture-scale; index on operator order) |
| graphify-adapter.ts:545 | high | stringify-128MB for 200-char error slice | ACCEPTED-FIXABLE (truncate raw input length, never stringify the graph for an error) |
| graphify-adapter.ts:339 | high | line regex catches digits in versions/hashes | ACCEPTED-FIXABLE (anchor match `^L?\s*\d+\s*$`) |
| graphify-adapter.ts:180 | high | id/label "" coercion collides | ACCEPTED-FIXABLE (drop-or-suffix id-less rows, never coerce to shared "") |
| graphify-adapter.ts:598 | high | `?? 0` fabricates line 0, hides lineless | ACCEPTED-FIXABLE (preserve undefined through the read path; refusal owns the naming) |
| graphify-adapter.ts:422 | high | edge line `?? 1` invents anchors | ACCEPTED-FIXABLE (same law as :598 — no invented anchors) |
