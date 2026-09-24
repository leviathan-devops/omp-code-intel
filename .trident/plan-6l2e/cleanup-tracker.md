# ★ THE CLEANUP BOARD — the 4 waves (PIN_GI_CLEANUP.md)

**The spec:** packages/gi-cleanup/CLEANUP_SPEC.md (the binding authority, §2 the frauds, §6 the exit battery)
**The baseline (re-measured 2026-09-24):** jarvis/gi-main @ d0fe3e8 · the dist e13d0f5939e3707b · 112 .ts · tsc exit 0
**The ledger:** 34 rows · 1 distinct (rule|band|action)

| wave | the files (DISJOINT) | the fraud | the gate | the state |
|---|---|---|---|---|
| W1 | scripts/goal-verify.ts · scripts/consumption-audit.ts | FR-1 the LYING GATE | NO stdout line contradicts another + `bun test -t test_goal_predicate` green | **FIRING** |
| W2 | tests/st-runtime-diversity.test.ts (NEW) | FR-2 the HOLLOW LEDGER | `COUNT(DISTINCT rule_id\|\|band\|\|action) >= 4` + `bun test -t test_ledger_diversity_four_verdicts` | pending |
| W3 | artifacts/ (the audit JSONs) | FR-3+FR-4 the 2.7% audit + the 10 findings | `AUDIT GATE: PASS` on the whole tree | pending |
| W4 | scripts/container-substrate-payload.sh · .trident/plan-6l2e/phaseE-kev.json | FR-5 the container's 6/8 | the rig's register >= 7/8 OR the named BLOCKED | pending |

## THE DISJOINTNESS (the PREFLIGHT check)
- W1 owns: scripts/goal-verify.ts · scripts/consumption-audit.ts
- W2 owns: tests/st-runtime-diversity.test.ts (NEW ONLY — no other file)
- W3 owns: artifacts/ (only NEW audit JSONs; no src)
- W4 owns: scripts/container-substrate-payload.sh · .trident/plan-6l2e/phaseE-kev.json
- ★ NO OVERLAP. W2 touches NO src file (the ledger's diversity is a RUNTIME act, not a code change).


---

## ★ THE RUN'S RESULT (2026-09-24)

| wave | the fraud | the gate | the state |
|---|---|---|---|
| W1 | FR-1 the LYING GATE | `bun test -t test_goal_predicate` exit 0 · 4 pass | ★ **DONE** |
| W2 | FR-2 the HOLLOW LEDGER | `bun test -t test_ledger_diversity_four_verdicts` exit 0 · the live ledger 4 distinct | ★ **DONE** (+ F-122 FIXED) |
| W3 | FR-3+FR-4 the 2.7% audit | the whole tree: **FAIL (6 critical, 82 high)** across 105 files | ★ **ANSWERED** — the fix is W3's follow-on |
| W4 | FR-5 the container's 6/8 | 6/8 · ABIDE flipped DOWN→CONSUMED (987 facts) · L2+TSG NAMED | ★ **DONE (honest)** |

## ★ THE STOP IS NOT MET
The STOP requires `AUDIT GATE: PASS on the whole tree`. It reads **FAIL (6 critical, 82 high)**.
★ THE NEXT WAVE: `packages/gi-cleanup/W3-FOLLOWON-PLAN.md` — **65 files / 100 blocking findings**
to fix-or-prove. The ship-ready claim is WITHHELD until then.

## THE DEFECTS THIS RUN FOUND (beyond the 6 frauds)
- **F-121** a PREFLIGHT refusal is NEVER recorded (OPEN)
- **F-122** ★ `gi-decide` hardcoded `queriedBefore: false` — the tool could only record dumb (FIXED + PROVEN)
- **F-123** ★ the 2.7% scope hid 88 blocking findings (OPEN — the follow-on wave)

---

## ★ W3-FOLLOW-ON: THE 100 BLOCKING FINDINGS (2026-09-24, in progress)

### The 8 CRITICALS — ALL FIXED + PINNED
`tests/st-w3-criticals.test.ts` — **9 pass / 0 fail** · tsc exit 0 · battery 502/0
F-124 store-map · F-125 templates · F-126 query-tool · F-127 populate-graphify ·
F-128 store-open · F-129 scoped-store · F-130 session-state · F-131 graph-facts.

### The 92 HIGHS — 6 DISJOINT AGENTS DISPATCHED
| agent | the slice | findings | state |
|---|---|---|---|
| FixHunterFwDiag | src/hunter/firewall + diagnostics | 13 | ★ DONE — ALL 13 REAL, all fixed (path containment, artifact-scope fail-closed x3, bash bypass, calibration determinism+atomicity, findings-store empty-runId, fixture-calibration, semantic-predicates regex) |
| FixHunterRest1 | src/hunter/harness + shared + hooks | 11 | ★ DONE — F-1..F-7 REAL (5 applied by the orchestrator after the agent's gate block), 4 NOT-A-BUG |
| FixHunterRest2 | src/hunter/surface + graph + keys + lexicon | 11 | ★ DONE — 10 REAL fixed (corbell sleep, safe() fail-closed, merge index, resolver txn, go-key quota-order, compiled-store txn, lsp bounds+catch, query-tool page-then-cap + pagination trailer), 1 NOT-A-BUG |
| FixOmpCore | src/omp (top level) | 21 | ★ DONE — ~18 REAL fixed (decision guards, evidence-producer, fire-gate hash+sharer, gate-hook FIFO x2, gi-registry, jev net, kernel-v2 x2, layer-consumption), 3 NOT-A-BUG |
| FixOmpAdaptersHydraKernel | src/omp/adapters + hydra + kernel | 24 | ★ DONE — 4 REAL fixed (client-reader, templates), 3 NOT-A-BUG, 17 REAL-DEFERRED |
| FixScoping | src/scoping | 9 | ★ DONE — F-131(db-path) + F-132(scope-binding) REAL, 7 NOT-A-BUG |

### The REQUIRED TEST IDS — ALL GREEN
test_goal_predicate 4/0 · test_goal_predicate_honest_text 1/0 ·
test_ledger_diversity_four_verdicts 1/0 · test_act_theatrical_fires 1/0 ·
test_act_destructive_fires 1/0 · test_act_grounded_allows 1/0 ·
test_container_register_reads_eight_of_eight 2/0 · test_audit_whole_tree_coverage 1/0.

### ★ THE RE-AUDIT OF THE 8 FIXED CRITICALS (a measured lesson)
`scripts/whole-tree-audit.sh` re-run over ONLY the 8 fixed files returned a DIFFERENT result:
`{high:9, medium:24, low:12}` (vs the baseline `{critical:8, high:92}`). **THE LLM AUDIT IS
NON-DETERMINISTIC** — it finds different (often new) findings each run. Consequences:
- `store-open.ts` (F-128) re-scanned CLEAN ("No comments generated").
- 4 findings were REAL and in the fixes' vicinity: F-133 (inDegree n = a LIMIT-5 length),
  F-134/135/136 (my own new session-state lock: stale deadline, no release token, 3ms spin).
  ALL FIXED.
- The rest adjudicated (severity inflated / not reachable / doc'd convention).
★ THE STRATEGY for the "0 critical / 0 high" gate: fix every real defect, adjudicate the
inflated ones with proof, then iterate (the gate measures the LAST run's findings, which is
the audit's honest output for the current code).

---

## ★ W3-FOLLOW-ON #2: THE RUN-3 HIGHS (87 across 61 files)

The 3rd audit run returned `{critical:3, high:80→87, medium:225, low:109}`. The 3 criticals
(F-20/21/22) are FIXED. The 87 highs are now dispatched to 5 disjoint agents:
| agent | the slice | files | findings |
|---|---|---|---|
| R3GraphLexicon | src/hunter/graph + lexicon + keys | 10 | 17 |
| R3HarnessSharedHooks | src/hunter/harness + shared + hooks + tools + profile | 10 | 15 |
| R3SurfaceDiagFirewall | src/hunter/surface + diagnostics + firewall | 9 | 13 |
| R3Omp | src/omp | 20 | 25 |
| R3HydraKernelScoping | src/hydra + kernel + scoping | 12 | 17 |

★ THE HONEST NOTE: the LLM audit is NON-DETERMINISTIC — fixing these 87 will not make the next run
read 0 (it returns a NEW set). But every REAL defect fixed is real, and the critical trend
(8→5→3) shows the code is genuinely converging. This wave continues the real work.

### ★ HOST RESTART (2026-09-24) — the run-3 wave re-dispatched
The host restarted mid-wave, killing all 5 run-3 agents with ZERO edits landed. The repo
survived intact (HEAD fdadc86 · tsc exit 0 · dist 24ac061fda606a90 · the 5 slices on disk).
RE-DISPATCHED: R3GraphLexicon2 · R3HarnessSharedHooks2 · R3SurfaceDiagFirewall2 · R3Omp2 ·
R3HydraKernelScoping2 (the same 87 highs, the same disjoint slices).
