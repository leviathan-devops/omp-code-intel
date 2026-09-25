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

---

## ★ W3-FOLLOW-ON #2 — COMPLETE (2026-09-24)

| agent | files | REAL | NOT-A-BUG |
|---|---|---|---|
| R3GraphLexicon2 | 6 | 11 | 6 |
| R3HarnessSharedHooks2 | 11 | 16 | 7 |
| R3SurfaceDiagFirewall2 | 8 | 9 | 4 |
| R3Omp2 | 20 | ~20 | ~5 |
| R3HydraKernelScoping2 | 10 | 16 | 1 |
| the orchestrator (F-23..F-28, F-35, F-36) | 8 | 8 | — |
| **★ THE TOTAL** | **36 files** | **~80 REAL FIXED** | **~23 NOT-A-BUG** |

**THE VERIFICATION (the orchestrator's own runs, post-wave):**
- `bunx tsc --noEmit` → **exit 0**
- `bun run test` → **430 pass / 0 fail** + **528 pass / 0 fail**, exit 0
- goal-verify → **5/5** (C1 `consumed:7/8`, the per-domain union) — RESTORED after the L2 daemon restart
- the red-team corpus → **70 pass / 0 fail**
- the dist **ca1d04645cc29d33** carries every fix; the canon docs synced.

★ **THE RESTART LESSON (recorded):** the host restart killed the au-engine daemon (L2's Rust
per-repo serve process) — the substrate, not the code. `au daemon start <repo>` restores it.
The audit5 run is now measuring the post-wave tree.


---

## ★ THE 2026-09-25 RUN — THE PIN'S BASELINE IS STALE; W1/W2/W4 VERIFIED BY THE ORCHESTRATOR

**The baseline re-measured from disk (the pin's numbers were frozen at 2026-09-24):**

| the number | the pin (frozen) | DISK (measured 2026-09-25) |
|---|---|---|
| HEAD | 2cc1fee | **2ec8cc3** |
| the dist | e13d0f5939e3707b | **1c73723445f65973** |
| the tree | 112 .ts / 27686 L | **113 .ts / 33616 L** |
| the ledger | 34 rows · 1 distinct | **168 rows · 4 distinct** |
| C1 stdout | PASS consumed:8 (contradicts its detail) | **PASS + detail both honest-phrased** |

**THE GATES THE ORCHESTRATOR RE-RAN (builder-under-audit — not trusted, re-executed):**

```
bun test -t test_goal_predicate ................ 4 pass / 0 fail   (434 filtered)
bun test -t test_goal_predicate_honest_text .... 1 pass / 0 fail   (437 filtered)
bun test -t test_ledger_diversity_four_verdicts  1 pass / 0 fail   (437 filtered)
sqlite3 fire_decisions: 168 rows · 4 DISTINCT (rule_id,band,action):
     kernel-v2:benign:ALLOW|ignore|IGNORE        ×1
     kernel-v2:destructive:REFUSE|act|FIRE       ×1
     kernel-v2:theatrical:REFUSE|act|FIRE        ×1
     kernel-v2:dumb:STEER|escalate|ESCALATE      ×165
```

**THE STATE:** W1 ★DONE · W2 ★DONE · W4 ★DONE (honest 6/8) · **W3 = THE CRITICAL PATH.**

**W3's position:** the board's last read was `FAIL (6 critical, 82 high)` across 105 files — from
the OLD audit. Since then the R14/R15/R16 waves fixed ~120 findings (~54 src files changed,
battery 438/0 + 536/0 exit 0, tsc 0). **A FRESH whole-tree audit (RUN 17) is now the gate.**

---

## ★ RUN 17 — THE FRESH WHOLE-TREE AUDIT (2026-09-25, the W3 gate)

**THE MEASUREMENT (two lanes, disjoint halves, both pre-flight-probed):**
```
  lane A  the go lane      50 files · 8 workers · 50/50 parts · 0 EMPTY
  lane B  the go lane      63 files · 8 workers · in flight
  ────────────────────────────────────────────────────────────────────────
  lane A: 141 comments · {critical: 1, high: 13, medium: 67, low: 60}
  ★ down from run 16's {critical: 3, high: 99} on comparable coverage
```

**THE ONLY CRITICAL — F-123, the line-eating edit (FIXED + PINNED).**
`src/hunter/shared/migrations.ts:85` — `ensureTypedGraphSchema` began a transaction, committed it,
and executed NO DDL. `git show HEAD~15` carries `db.exec(TYPED_GRAPH_DDL)`; HEAD did not. The
R15H5 BEGIN/COMMIT restructure (commit `dff6aa2`) consumed the statement between the two nested
trys. Two blind spots hid it: `db.ts:965` execs the DDL on the normal open path, and the
function's own verification was gated `if (!began)` — skipping exactly the path the DDL runs on.
**FIXED** (the exec restored + the assertion made unconditional) with a negative control that
reproduces both the defect AND the guard; `tests/st-migration-ddl.test.ts` 3/0.

**THE INSTRUMENT DEFECT FOUND AND FIXED (it would have blocked the gate forever).**
The audit aggregator's `empty = comments.length === 0` conflated three states and so fired on the
BEST outcome: a **CLEAN REVIEW** (`status:"success"`, `"No comments generated. Looks good to me."`,
files_reviewed:1, tokens spent) counted as an instrument failure. Under the operator's stop
("0 critical / 0 high") a mostly-clean tree would be flagged VOID by construction. Now the three
states are distinct: **instrument-dead** (the EMPTY_RESULT marker only) · **CLEAN REVIEWS** ·
**out-of-scope skips** (the ocr CLI scopes to git-changed paths).

**THE W3 FIX WAVE (4 agents, 12 highs + the critical, disjoint files):** dispatching.
**P6 GATE CHECKED:** the 5 read-first canon docs ALL read `1c73723445f65973` (the live dist).

---

## ★ RUN 17 CLOSED · RUN 18 IN FLIGHT (2026-09-25)

**RUN 17 — THE FIRST WHOLE-TREE AUDIT (113/113 files, set-proven A∪B = the tree):**
```
  parts 113/113 · comments 351
  ★ instrument: 0 dead · 19 CLEAN REVIEWS · 4 out-of-scope
  critical 1 · high 33 · medium 166 · low 151      ← measured DURING the fix wave
  ★ THE GATE: CRITICAL=1 HIGH=33 → FAIL
```

**THE FIXES THAT ANSWERED IT (all committed, all battery-verified):**
| what | the fix | the evidence |
|---|---|---|
| ★ THE CRITICAL — F-123 the line-eating edit | `ensureTypedGraphSchema` began+committed a tx and executed NO DDL (the R15H5 restructure consumed `db.exec(TYPED_GRAPH_DDL)`); the DDL restored + the schema assertion made UNCONDITIONAL | probe 0→4 tables; the negative control reproduces BOTH the defect AND the guard; `tests/st-migration-ddl.test.ts` 3/0 |
| the instrument's false-positive gate | `empty = comments.length === 0` counted a CLEAN REVIEW as an instrument failure — the gate would fire on the BEST outcome | three states now distinct: instrument-dead · CLEAN REVIEWS · out-of-scope |
| W3FixA (4 REAL) | recon.ts symlink containment (realpath BOTH sides) · recon.ts's adjacent LIKE-anchor mismatch (a seq-1 COLLISION on hunt 2+) · map.ts traversal · bug-hunt.ts null-scope (containment DISABLED) → fail-loud | probes per finding; st-hunter-port 3/0 |
| W3FixB/C/D | lsp-injector · micro-loop · query-registration · hunt-lock · compiler (single-read) · rule-card (`cardsFromText`) · resolver · compiled-store · calibration · arsumbris | probes: cards async=5 text=5 IDENTICAL; resolver 3 probes; compiled-store 5 probes |

**★ THE SUBSTRATE REBUILD (a src edit makes the graph stores STALE):** the battery went 434/7 —
every failure in the register's own suite (`GI_LAYER_STALE:explicit` on L5/L6) because editing src
invalidated the corbell/graphify stores. Rebuilt BOTH with the F-96 scope fix: corbell **17.2 s**
(nodes=1116 edges=4731) · graphify **32.5 s** (nodes=1745 edges=3860). Register recovered to 7/8;
the predicate 5/5; the battery 441/0 + 539/0.

**★ THE W17 WAVE WAS CANCELLED AFTER ~1.5h WITH ZERO DISK OUTPUT** — 5 agents whose verification
never reached a verdict. **The measurement replaced it: RUN 18 (a fresh whole-tree audit on the
current tree) is the instrument.** 22 of run 17's 33 highs sat in files the waves had already
touched, so the fresh audit is the honest way to see what actually remains.

**RUN 18 — LAUNCHED BOTH LANES (57 + 56 = 113), both pre-flight-probed HTTP 200.**

---

## ★ THE RESUME POINT (2026-09-25, end of the run) — THE STOP IS NOT MET

**HEAD `17bdeae` · uncommitted 0 · dist `4479ff564450e219` (deployed == repo) · src newer 0**

```
  ★ THE §6 SNAPSHOT, MEASURED
  tsc --noEmit ............ exit 0
  bun run test ............ 441 pass / 0 fail + 539 pass / 0 fail, exit 0
  goal-verify ............. PASSED: 5/5 (C1 carries the honest 7/8 qualifier in the PASS line)
  consumption-audit ....... consumed:7/8 (L2_ARSUMBRIS — the honest repo-name domain)
  fire_decisions .......... 4 DISTINCT (rule_id,band,action); 1 critical-class row set
  the whole-tree audit .... RUN 18: 113/113 files · 0 CRITICAL · 35 high · 20 CLEAN REVIEWS
  ★ THE GATE .............. CRITICAL=0 HIGH=35 → FAIL (on the highs)
```

**WHAT IS DONE (verified this run):**
- **FR-1** (the lying gate) — the C1 PASS line carries the honest reading; both pins green.
- **FR-2** (the hollow ledger) — 4 DISTINCT tuples, each from a REAL varied act with correct
  thresholds (theatrical 1.0/act · destructive 1.0/act · benign 0.0/ignore · dumb).
- **FR-3+FR-4** (the 2.7% audit) — **the whole tree is now covered**: run 17 (113/113) proved the
  coverage by set algebra (A∪B = the tree, disjoint) and run 18 re-measured it.
- **★ THE CRITICAL IS ELIMINATED (1 → 0).** F-123: a structural edit in an earlier wave ate
  `db.exec(TYPED_GRAPH_DDL)` between two nested trys, making `ensureTypedGraphSchema` a SILENT
  NO-OP. Restored + the assertion made unconditional; a negative control reproduces BOTH the
  defect AND the guard; `tests/st-migration-ddl.test.ts` 3/0.
- **★ THE INSTRUMENT'S FALSE-POSITIVE CLASS FIXED.** The aggregator counted a **CLEAN REVIEW** as
  an instrument failure — the gate would have fired on the BEST outcome. Three states now distinct.
- **THE SUBSTRATE DISCIPLINE.** A src edit makes the corbell/graphify stores stale
  (`GI_LAYER_STALE:explicit`). Rebuild both with the F-96 scope fix: corbell **17.2 s** · graphify
  **32.5 s**. Never a repo-root rebuild.
- **6 run-18 highs fixed** (the export regex's `function * foo` gap · the tsg API-key PREFIX in
  redactions · the report-writer's promised-but-absent tie-break · log.ts's type-vs-body lie +
  its narrowing-defeating cast · whoCalls' missing LIMIT · enforcement's unhandled rejection ·
  bus-hook's unbounded failure log) + **1 refuted** (populate-corbell's `storePath` IS used — tsc
  named the use when the rename broke it).

**WHAT REMAINS (~28 highs, adjudicated in `artifacts/r18-full-slices/`):** each needs FIXED or a
NOT-A-BUG with quoted/executed proof. The loop is: fix → re-audit → the gate moves. **A BLOCKED
state names its resume condition; this one's is: clear the run-18 highs, then re-run the
whole-tree audit until the gate reads 0/0.**

---

## ★★ THE FINAL RESUME POINT (run 19) — THE STOP IS NOT MET

**HEAD `3d79c73` · uncommitted 0 · dist `2685321fcd8e9d6c` (deployed == repo) · src newer 0 · tsc 0**

```
  ★ THE §6 SNAPSHOT, MEASURED THIS TURN
  tsc --noEmit ............ exit 0
  bun run test ............ 441 pass / 0 fail + 539 pass / 0 fail, exit 0
  goal-verify ............. PASSED: 5/5 (C1's PASS line carries the honest 7/8 qualifier)
  consumption-audit ....... consumed:7/8 (L2_ARSUMBRIS — the honest repo-name domain)
  fire_decisions .......... 4 DISTINCT (rule_id,band,action)
  ★ the whole-tree audit ... RUN 19: 113/113 parts · 0 instrument-dead · 20 CLEAN REVIEWS
  ★ THE GATE .............. CRITICAL=0 HIGH=37 → FAIL
```

**THE THREE-RUN RECORD (the honest convergence shape):**
| run | files | critical | high |
|---|---|---|---|
| 17 | 113 | 1 | 33 |
| 18 | 113 | **0** | 35 |
| 19 | 113 | **0** | 37 |
**The CRITICAL column converged (1 → 0 → 0) and holds. The HIGH column does NOT fall monotonically:
each run samples a fresh reviewer comment set, so the count measures the reviewer's draw as much
as the tree. Per the operator's ruling, every finding is legit and the remedy is to keep fixing.**

**THE RESUME CONDITION:** clear run 19's 37 highs (`artifacts/r19-full-slices/` — the aggregator
wrote the 5 slices), then re-run the whole-tree audit (`scripts/whole-tree-audit.sh`, TWO lanes,
`AUDIT_PROVIDER=muse-go-mimo`) until the gate reads `CRITICAL=0 HIGH=0`. Every fix must carry
`tsc` 0 and the full battery (441/0 + 539/0); a src edit makes the corbell/graphify stores stale —
rebuild with `bun scripts/corbell-build.ts --target . --rebuild` (17 s) and
`bun scripts/graphify-build.ts --target . --extract` (32 s) BEFORE believing a register failure.

---

## ★★ RUN-19 PROGRESS — 10 OF 37 HIGHS FIXED (2026-09-25)

**HEAD `524561e` · uncommitted 0 · dist `4e41cdd65c988b42` · tsc 0 · battery 441/0 + 539/0 exit 0**

**★ THE FINDING THE FRESH RUN CAUGHT IN MY OWN LAST BATCH** (the reason the loop runs):
`ontology.ts` — I exported `HAS_FINDING_PREDICATE` but never added it to `PREDICATE_SET`, so
`isPredicate('has_finding')` returned **FALSE** while the `graph_facts` CHECK accepts it and
`report.ts` writes it. **A validator that contradicts the schema it validates.** The type union
stays canon-only (it describes the declared canon); the SET now describes what the store can hold.
Probe: 6 cases / 0 wrong · `PREDICATE_SET.has` → true.

**THE TEN FIXED, EACH BY MECHANISM:**
| the finding | the mechanism |
|---|---|
| `ontology.ts` ×2 — `has_finding` outside `PREDICATE_SET` + `isPredicate` blind to it | added to the set; the guard's return type widened |
| `strike.ts:46` — `Object.entries(null)` THREW | the spread arm above tolerated what the loop threw on — one loop, two polarities; now both tolerate |
| `fire-gate.ts:542` — the timer's rejection unobserved when the judge won | an UNHANDLED rejection (process-fatal under Node defaults); same class as the enforcement.ts fix |
| `gi-ecosystem.ts:16/:37` — the scratch base `mkdir`'d with NO mode | umask-dependent (commonly 0755 — world-searchable: the very plant surface the function defends). Now 0700 |
| `gi-session-path.ts:84` — the catch swallowed EVERY realpath error | the symlink containment guard was **silently skipped** on EACCES/ELOOP/EIO. Only ENOENT (the stated intent) may skip; the rest is LOUD |
| `typed-write.ts:404` ×2 — both backfill catches swallowed everything | EACCES/SQLITE_CORRUPT/SQLITE_FULL left `layer_id` NULL for every row and returned clean. Only the schema-shape error is benign |
| `resolver.ts:80` — entity ids/labels/kinds interpolated RAW into the SRO prompt | these come from PARSED SOURCE — a crafted symbol name is attacker-controlled text in an instruction channel. Normalized: one line per entry, delimiters stripped, bidi overrides removed, bounded |
| `tsg.ts:53` — a bare `readFileSync(KEY_FILE)` | follows a planted symlink, no mode check, while the register's own `keyFileComponent` uses O_NOFOLLOW + mode. Now: lstat (never follows), refuse a link, refuse group/other-readable |

**THE REMAINING ~27** are in `artifacts/r19-full-slices/` — each needs FIXED or a NOT-A-BUG with a
quoted/executed proof. **A w44 suite test appeared once as a failure and did NOT reproduce:
isolated 34/0, the re-run green — an order-dependence flake (the shared-temp-dir class), recorded
not buried.**

---

## ★★ RUN-19 PROGRESS — 13 OF 37 HIGHS FIXED (2026-09-25, continued)

**HEAD `c3d171a` · uncommitted 0 · tsc 0 · battery 441/0 + 539/0 exit 0**

**ADDED THIS BATCH:**
| the finding | the mechanism |
|---|---|
| `migrations.ts:128` | **my own unconditional assertion introduced a FALSE FAILURE** — it requires a readable `sqlite_master` (`db.query` is OPTIONAL on the handle), so a driver with BEGIN but no `query` threw on a migration that had just COMMITTED. Now `assertSchema(db, began)`: after a COMMIT the atomicity is proven by the commit itself (unverifiable ≠ failed); without BEGIN the verification is the ONLY guarantee and stays REQUIRED. **The pin re-specified with MORE assertions (11 expect calls, from 9) — the literal moved because the design improved; the intent is now asserted directly.** |
| `db.ts:819` | the family_nodes fallback catch swallowed EVERY error (I/O, disk-full, locked/corrupt DB) as a debug line and returned the branch delta as if the family store had been EMPTY — **a degraded read reported as a complete one.** Only a MISSING table is benign now. |

**★ THE FLAKE, MEASURED TWICE, RECORDED NOT BURIED:** `st-gi-w44-highs
> test_w44_sidecar_writes_vetted_hash_not_post_commit_rehash` failed twice in the FULL suite and
**did not reproduce** either time under isolation — **34/0 alone**, **46/0 alongside two sibling
suites**. It is an order-dependence (the shared-temp-dir class), not a regression; every one of my
edits between the two occurrences was verified green on a re-run.

**THE RUN-19 TOTAL: 13 of 37 highs fixed, each with its mechanism. The remaining ~24 are in
`artifacts/r19-full-slices/`.**

---

## ★★ RUN-19 PROGRESS — 16 OF 37 HIGHS FIXED (the accurate count)

**HEAD `a34b1b1` · uncommitted 0 · dist `bc953b15a193785c` · tsc 0 · battery 441/0 + 539/0 exit 0**

**THE FIXED FINDINGS, ONE PER LINE (the count is 16, not 19 — the paired ones were two findings
against one fix site, and the count states findings):**
```
  1  ontology.ts:17      has_finding was outside PREDICATE_SET
  2  ontology.ts:24      isPredicate() blind to it (a validator contradicting the schema)
  3  strike.ts:46        Object.entries(null) THREW mid-merge
  4  fire-gate.ts:542    the timer's rejection unobserved (an unhandled rejection)
  5  gi-ecosystem.ts:16  GI_TMP_DIR exported raw
  6  gi-ecosystem.ts:37  the scratch base mkdir'd with NO mode (umask → world-searchable)
  7  gi-session-path:84  the catch swallowed every realpath error (guard SILENTLY SKIPPED)
  8  typed-write.ts:404  both backfill catches swallowed everything (silent NULL layer_id)
  9  resolver.ts:80      entity ids/labels interpolated RAW into the SRO prompt (injection)
 10  tsg.ts:53           a bare readFileSync(KEY_FILE) (followed a plant, no mode check)
 11  migrations.ts:128   my unconditional assertion created a FALSE FAILURE (+ a pin re-spec)
 12  db.ts:819           the family-read catch returned a degraded union as if EMPTY
 13  mechanical.ts:216   `export default class/function` produced no exports edge
 14  mechanical.ts:272   member/qualified calls (A.B()) produced NO call edge
 15  readonly.ts:75      the BIDI/Trojan-Source disguise (ASCII-only scan)
 16  gate-hook.ts:122    the cancel path discarded every steer for the tool, not the call
```

**★★ THE PROBE THAT CAUGHT MY OWN WRONG FIX.** Finding 15's first attempt edited the BYPASS set —
but for a READ verb the scan takes the NARROW arm and **returns before that set is reached**, so
the probe still read `ALLOW_READ` on an RLO-laced `cat`. Fixed with `FORMAT_CONTROL_CHARS`
checked in BOTH arms, and NOT the C0 range (which contains SPACE and TAB — refusing those would
block every read carrying an argument separator). **PROBE, both halves: plain read ALLOWS; RLO,
LRI, zero-width, and pipe all BLOCK.** The lesson is the one this run keeps re-teaching: a fix
without its probe is a hypothesis.

**THE REMAINING 21** are in `artifacts/r19-full-slices/`.

---

## ★★ RUN-19 PROGRESS — 20 OF 37 HIGHS FIXED

**HEAD `43f1943` · uncommitted 0 · dist `2cff6b7d9b42c2d5` · tsc 0 · battery 441/0 + 539/0 exit 0**

**ADDED SINCE THE LAST ENTRY:**
```
 17  scan-chain.ts:188   `streamComplete = !dead` ran AFTER the loop, so a timer callback queued
                         in the microtask gap flipped a COMPLETE stream to STALL and discarded
                         the buffered body — the F-705 comment above it said the OPPOSITE.
                         Completion is now recorded WHEN OBSERVED.
 18  recon.ts:198        a raw db.close() in `finally` REPLACED any in-flight exception: the
                         original cause was lost and the caller chased the wrong fault.
 19  _shared.ts:226      storeFacts served facts with the freshness check OUTSIDE it (the
                         adapters remembered to call it). A NEW consumer that forgets serves
                         stale facts with no signal. The bound now rides the PATH.
 20  rsi.ts:165          WAL with no busy_timeout (SQLite default 0) — every contended write
                         failed INSTANTLY with SQLITE_BUSY. PRAGMA busy_timeout=5000.
```

**THE REMAINING 17** are in `artifacts/r19-full-slices/`. **THE RESUME CONDITION** is unchanged:
fix or prove each, then re-run the whole-tree audit (two lanes, `AUDIT_PROVIDER=muse-go-mimo`)
until the gate reads `CRITICAL=0 HIGH=0`; after ANY src edit rebuild the corbell/graphify stores
(17 s / 32 s) before believing a register failure.
