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

---

## ★★ RUN-19 PROGRESS — 23 OF 37 HIGHS FIXED

**HEAD `4116f86` · uncommitted 0 · dist `ff824230566881c7` · tsc 0 · battery 441/0 + 539/0 exit 0**

```
 21  report.ts:145    the retry wrote a document built from the INITIAL version — the file NAME
                      said v(N+1) while its own header said v(N): a report disagreeing with
                      itself about which report it is. Only line 0 embeds the version; it is now
                      regenerated per attempt.
 22  populate.ts:50   the graphify catch produced the SAME shape a freshness MISS produces, but a
                      catch means a THROW — and the inner leg RETURNS (never throws) for a miss.
                      A BUILD failure was indistinguishable from "the store is stale". The
                      distinction is structural, so it is now NAMED: `GRAPHIFY_BUILD_FAILED:`.
 23  artifact-scope:198  the `fs.stat` after a successful lstat was REDUNDANT (lstat proves
                      existence) and opened a TOCTOU window — a swap leaving the path absent made
                      stat throw ENOENT, which the catch reads as "does not exist" and routes to
                      the CREATE path.
```

**THE REMAINING 14** are in `artifacts/r19-full-slices/`.
**★ A NOTE ON MY OWN EDITS:** the report.ts fix's FIRST attempt was a larger refactor (turning the
`lines` array into a function) — the array literal closes BEFORE the later `lines.push()` calls, so
it broke `tsc`. The surgical fix (regenerate line 0 per attempt) is both smaller and correct.
`tsc` caught it in the same step, which is why every edit here runs the compiler before the claim.

---

## ★★ RUN-19 PROGRESS — 24 OF 37 HIGHS FIXED

**HEAD `9baac8f` · uncommitted 0 · dist `b7f27f700573c7fa` · tsc 0 · battery 441/0 + 539/0 exit 0**

```
 24  map.ts:115 + interface.ts:70 + db.ts:125   GraphEdge declared id/sourceId/targetId/kind/
        lineage/file/line — NOT source_location or metadata. The adapters CARRY both and the line
        resolver READS them, so every consumer reached them through
        `e as unknown as Record<string, unknown>`. A double-cast is the type system told to look
        away: it erases the shape AND kills the compiler's ability to catch a renamed field.
        Declared on both interfaces; the cast retires; the read is compiler-checked.
```
**Plus a hygiene item the status line surfaced:** SQLite `*.db-shm` / `*.db-wal` sidecars are
runtime artifacts (they appear on every store read, vanish on checkpoint) — now gitignored, since a
half-written sidecar committed beside a clean db is worse than no sidecar.

**THE REMAINING 13** are in `artifacts/r19-full-slices/`.

---

## ★★ RUN-19 PROGRESS — 25 OF 37 HIGHS FIXED

**HEAD `c699aa5` · uncommitted 0 · tsc 0 · battery 441/0 + 539/0 exit 0**

**★★ THE STRONGEST EVIDENCE OF THE RUN — `lsp-injector.ts:245`, the ReDoS class REMOVED (not bounded):**
```
  THE OLD PATH:  glob -> `^.*a.*a.*…$` -> .test()
                 with k stars the engine explores every way to split the subject across k `.*`
                 groups. EIGHT stars on a long path is ALREADY catastrophic — `GLOB_MAX_STARS`
                 reduced the exponent, it never removed it.
  THE NEW PATH:  the two-pointer matcher, ONE star-backtrack point, O(pattern × subject).
                 '*a*a*a*a*a*a*a*a' vs a 4001-char subject -> FALSE in 0.36 ms.
                 Both sites (DB-backed + state-key expansion) share it; the compiler and its
                 star guard are DELETED.
  ★ THE DIFFERENTIAL: old compiler vs new matcher over 144 pattern × subject pairs ->
    **0 disagreements**. And the differential CAUGHT A REAL DRIFT: the old compiler ESCAPED `^`
    (it was in its escape set), so `[^a]` compiled to `[\^a]` — matching the literal caret OR 'a',
    NOT a negation. A negating matcher matched "xbc" where the old one did not. Behaviour
    preservation wins: no negation; `^`/`!` are ordinary class members.
```

**THE REMAINING 12** are in `artifacts/r19-full-slices/`.

**★ THE METHOD NOTE FOR THE NEXT SESSION:** the differential probe is what made this fix
trustworthy — a unit probe alone would have shipped the `[^a]` drift. When replacing a mechanism,
run the OLD and the NEW over a matrix and require zero disagreements; the disagreement is the bug.

---

## ★★ RUN-19 PROGRESS — 28 OF 37 ADDRESSED (27 fixed + 1 refuted)

**HEAD `473d9df` · uncommitted 0 · tsc 0 · battery 441/0 + 539/0 exit 0**

**★★★ THE PIN LED TO THE DEEPER BUG — the reviewer described only half of it.**
```
 26  store-open.ts:89   the losing opener's throw left an ORPHAN file it had created (no registry
                        row) — the first branch already knew to clean it; same discipline here.
 27  oracle.ts:218      the invalid-windowMs guard returned an empty bag with the explanation in
                        `notes` — and **NO CALLER READS .notes** (checked: every consumer reads
                        laterEdit/permitted/…). So an invalid window reached the caller as
                        `laterEdit: false` — a SILENT FALSE NEGATIVE dressed as a clean answer —
                        while the sibling parameter `notAfter` THROWS on the same class of input.
                        Aligned: windowMs THROWS.
 27b evidence-producer:202   the graph source narrowed with `LIKE '%target%'` (a plain substring)
                        while the event path decided with containsAtBoundary — the graph could
                        serve a fact the event source refuses. The LIKE is now the candidate
                        narrowing only; the predicate decides in JS.
     ★★ AND FIXING THAT EXPOSED: containsAtBoundary's guard was `hay.length <= needle.length` —
        FALSE when the two are THE SAME LENGTH, i.e. **AN EXACT MATCH IS NOT A TOUCH.** Both callers
        pair the predicate both ways, so whenever an event's target EQUALLED the subject's target
        the match was dropped: a silent false negative on the most obvious case. `<=` → `<`.
        PROBE (extracted verbatim from disk): 5 cases / 0 wrong incl. the exact-match control.
        THE PIN: 11 pass / 0 fail (40 expect calls, from 38).
```

**★★ THE METHOD NOTE, EXTENDED:** the differential probe found the glob drift; the PIN found this
one. Both instruments earn their keep — a probe you wrote tests your model of the mechanism, a
pin you did not write tests the mechanism. **Keep both.**

**THE REMAINING 9** are in `artifacts/r19-full-slices/`.

---

## ★★ RUN-19 PROGRESS — 29 OF 37 ADDRESSED (27 fixed + 2 refuted)

**HEAD updated · tsc 0 · battery 441/0 + 539/0 exit 0**

```
 28  fire-ledger.ts:609   ADJUDICATED NOT-A-BUG, proven mechanically: the drain is SYNCHRONOUS
                          end-to-end. appendManyDetailed returns a PLAIN OBJECT, and there are
                          **0 'await' occurrences** in the 954-char check-to-mark window. JS runs a
                          synchronous block to completion — no other drain can interleave, so the
                          window cannot be entered twice. A lock would guard a window that does not
                          exist. (The real invariants — watermark-after-confirm, poison quarantine —
                          are already implemented and pinned.)
```

**★★ THE REFUTATION PATTERN (this run's second):** both refuted findings (rsi.recount, fire-ledger.drain)
were "concurrency" claims about code that is **synchronous**. The proof is mechanical and cheap:
count the `await`s between the check and the effect. **A concurrency finding against a
run-to-completion block is refuted by the absence of a suspension point, not by an argument.**

**THE REMAINING 8** are in `artifacts/r19-full-slices/`.

---

## ★★ RUN-19 PROGRESS — 30 OF 37 ADDRESSED (28 fixed + 2 refuted)

**HEAD `091d0a1` · uncommitted 0 · dist `69e7d4ae7eb7da13` · tsc 0 · battery 441/0 + 539/0 exit 0**

```
 29  engine.ts:343   THE READ TOCTOU CLASS — CLOSED, not narrowed. F-441 removed the first gap
                     (the read used `abs` while the check resolved `fileReal`) but `fileReal` is
                     STILL A PATH: the read re-traverses it, so swapping the RESOLVED path
                     between the resolve and the open re-opened the class one layer down. The
                     complete form binds the read to the INODE the check saw — open with
                     O_NOFOLLOW and read from the DESCRIPTOR; no path is traversed after the
                     open, so there is no second resolution to race.
                     PROBE: normal read OK · symlink-inside-root-pointing-out REFUSED · ranged OK.
```

**THE INHERITED-FIX PATTERN (a third method note):** F-441's fix and this one differ by ONE LAYER of
the same class. **When a fix narrows a race rather than removing the resolution point, look one
layer down** — the same defect usually survives as "the new path is also a path".

**THE REMAINING 7** are in `artifacts/r19-full-slices/`.

---

## ★★ RUN-19 PROGRESS — 31 OF 37 ADDRESSED (29 fixed + 2 refuted)

**HEAD `04ba26b` · uncommitted 0 · dist `69e7d4ae7eb7da13` · tsc 0 · battery 441/0 + 539/0 exit 0**

```
 30  pipeline.ts:142   THE SAME FIX AT THREE SITES, ONE OF THEM DONE. The R16D fix published the
                       partial evidence trail before throwing on PRE-GATE rejections — but the
                       input-extractor throw, the 'required fields' throw, and the graph-load
                       failure were left bare, so a failing run at any of them left concurrent
                       readers on a STALE snapshot: exactly the defect R16D set out to kill. All
                       three now log PIPELINE_FAILED, publish, then throw.
```

**★ THE ONE-SITE-OF-THREE PATTERN (a fourth method note):** R16D named its finding as ONE site and
fixed it; the reviewer found the SECOND; grepping the class found the THIRD. **A fix that names one
site has not fixed the class — count the throw sites of the kind it names before closing it.**

**THE REMAINING 6** are in `artifacts/r19-full-slices/`: engine.ts:755 (edge metadata on the reuse
path) · kernel-v2.ts:550 (prose-keyed classification) · the duplication set (query-engine ×2,
fixture-calibration, layer-registry) · micro-loop-machine.ts:451 (the DbClient residual, which the
st-hunter-port pin deliberately holds open).

---

## ★★ RUN-19 PROGRESS — 32 OF 37 ADDRESSED (30 fixed + 2 refuted)

**HEAD `ee5ad19` · uncommitted 0 · dist `a5b3382bda79c52d` · tsc 0 · battery 441/0 + 539/0 exit 0**

```
 31  engine.ts:755 + db.ts   THE EDGE'S ANCHOR — the loss was STRUCTURAL and FOUR LINKS LONG, each
                             invisible from the one before it:
                               1. the DDL    graph_edges stored endpoints+kind+lineage only: no file, no line
                               2. the write  inserted 4 columns
                               3. the read   selected 4 columns
                               4. the MAP    built the edge from 4 fields and DISCARDED the anchor
                                             in the same expression — even after the SELECT was
                                             taught to read it
                             Fixed at all four + an idempotent column-existence migration (CREATE
                             TABLE IF NOT EXISTS cannot ALTER an existing table).
                             PROBE: write an edge with file:'src/a.ts' line:7 -> read the raw row:
                             {"file":"src/a.ts","line":7} — THE ANCHOR SURVIVES THE STORE.
```

**★ THE FOUR-LINK PATTERN (a fifth method note):** a value that is "lost" is lost at **one link of
a chain** (DDL → write → read → map) — and fixing the links you can see still yields the loss if
the map discards it. **Trace the value end to end; the bug is the link you did not check.**

**THE FIVE METHOD NOTES, each earned in this run:**
1. the **differential probe** (old vs new over a matrix)
2. the **refutation by suspension point** (count the `await`s)
3. the **inherited-fix pattern** (look one layer down)
4. the **one-site-of-three pattern** (count the sites of the kind the finding names)
5. the **four-link pattern** (trace the value through the whole chain)

**THE REMAINING 5** are in `artifacts/r19-full-slices/`: kernel-v2.ts:550 (prose-keyed
classification) · the duplication set (query-engine ×2, fixture-calibration, layer-registry) ·
micro-loop-machine.ts:451 (the DbClient residual, pinned open by st-hunter-port).

---

## ★★ THE PRECISE COUNT — A CORRECTION (the running count was an OVERCOUNT)

**A count carried forward in prose drifted above the measured number.** Re-derived from the artifact
(37 high findings in `artifacts/r19-full.json`, minus the five verified still-open sites):

```
  ★ ADDRESSED: 32 of 37   (30 fixed + 2 refuted)
  ★ OPEN:       5
      src/hunter/lexicon/compiler.ts:127           the empty-corpus asymmetry (sync vs async)
      src/hunter/lexicon/compiler.ts:271           the cache-hit COUNT + write without a transaction
      src/hunter/diagnostics/fixture-calibration.ts:194   duplicated containment logic
      src/omp/layer-registry.ts:0                  duplicated probe-shape validation
      src/hunter/harness/micro-loop-machine.ts:451 the DbClient residual — HELD OPEN by the
                                                   st-hunter-port pin (a caller may read
                                                   loop.context.db after done())
```

**★ THE LESSON (a sixth method note): A RUNNING COUNT IN PROSE DRIFTS; THE ARTIFACT DOES NOT.**
Every "N of M" in this file must be re-derived from `artifacts/r19-full.json` (the set of findings)
minus the open set — never carried forward by increment. The same discipline the rest of this run
applies to code applies to the report's own arithmetic.

*(The fixes themselves are unaffected and each is committed with tsc + the battery. One fix —
evidence-producer — also uncovered a bug NOT in the reviewer's list: containsAtBoundary returned
false on an exact match.)*

---

## ★★★ RUN 19 EXHAUSTED — 36 OF 37 ADDRESSED (33 fixed + 3 refuted)

**HEAD `43b820e` · uncommitted 0 · dist `04840c57105a7837` · tsc 0 · battery 441/0 + 539/0 exit 0**

```
 35  fixture-calibration.ts:194   the two-question containment check was copied into both loaders
                                  and fixed IN LOCKSTEP three times (F-702, F-931, R15) — the cost
                                  of the copy. Extracted to containedFixtureSource(); both loaders
                                  ask it.
 36  layer-registry.ts:0          ★ THE ONE THAT HAD ALREADY DRIFTED FOUR TIMES. auditOne and
                                  factsForWithFaults each called p.up() + validated + interpreted
                                  INDEPENDENTLY, and drifted on F-405, F-706, F-1007 and F-1208 —
                                  EVERY one a "two-view drift" fix, each patching one side while
                                  the other kept the old rule. FOUR unlucky edits is not bad luck;
                                  it is the signature of a missing unit. Extracted probeConsumer();
                                  both views read the SAME normalized result.
```

**THE ONE REMAINING (`micro-loop-machine.ts:451`)** is DELIBERATELY HELD OPEN: the `st-hunter-port`
pin (3/0) records that a caller may legitimately read `loop.context.db` AFTER `await loop.done()`,
so the DbClient stays open by contract and teardown is `stop()`'s job. Adjudicated, pinned,
documented — not open work.

---

## ⚠ RUN 20 — BLOCKED (the audit lane), WITH ITS RESUME CONDITION

**BOTH lanes are down, and the probe said so before a second was burned:**
```
  the go lane  (:4097/zen/go/v1)   → HTTP 403
     "Upstream request failed: An active OpenCode Go subscription is required to use Go models."
     ★ THIS IS NOT A RATE LIMIT — the SUBSCRIPTION has lapsed. Terminal until it is renewed.
  the zen-free lane (:4098 adapter) → HTTP 429 FreeUsageLimitError
     ★ A burst window; it RECOVERS (it carried runs 16-19's re-audits after the same refusal).
```
**THE PRE-FLIGHT PROBE REFUSED BOTH LAUNCHES** — run 20 produced ZERO parts and ZERO findings.
A refused launch is the guard working, not a failure of the run.

**THE RESUME CONDITION (one of two):**
1. the zen-free lane answers 200 — a retry launcher is ARMED (`/tmp/r20-launcher.sh`: re-probes
   every 4 min for up to ~2.7 h and fires both halves the moment it is live); **or**
2. the Go subscription is renewed, which restores the primary lane.

**★ A BLOCKED STATE IS NEVER A STOP.** The gate cannot move until a lane is live; everything else
the run owes is already green (tsc 0 · battery 441/0 + 539/0 · goal-verify 5/5 · register 7/8 ·
ledger 4 distinct · the whole tree audited through run 19).

---

## ★★ RUN-20 CONTAINER VERIFICATION (L3) — PARTIAL, AND IT FOUND A RIG DEFECT

**The rig:** `omp-ct-gi20` from `omp-ct:master`, plan accepted (3,635 chars), provisioned.

**WHAT PASSED — SC-2, the artifact claim:**
```
  the container's deployed bundle, read INSIDE the container:
    /root/.omp/agent/extensions/graph-intelligence/index.js
    sha256 04840c57105a7837…   ← EQUALS the repo's dist and the deployed host bundle
    9,560,079 bytes · mtime 2026-09-25 07:38Z
```
★ **This is the claim the checkpoint could not make**: the CURRENT dist loads in a container at the
right sha. Before deploying it explicitly, the container carried a **BAKED** bundle at
`34b9d7df93f9429d` — the image ships its own copy, so `distPath` at setup did NOT overwrite it; the
explicit cp did.

**★ THE DEFECT THE RUN FOUND (a rig defect, not a dist defect):** `omp-ct:master`'s baked config
points its default role at **`opencode-go/muse-spark-1.3-contributor`** — **the lane whose
subscription has LAPSED.** Every fresh rig therefore boots onto a dead lane, falls through to an
OpenRouter free model, and hits `404 No endpoints found for arcee-ai/trinity-large-preview:free`
(a RETIRED free model). The container's own status bar carried the proof: `✘ 404 No endpoints found`.
**The rig's lane table and the allowed-model law have diverged.** Remedy applied live: the default
was moved to `opencode-zen-free/muse-spark-1.3-contributor-free` (confirmed by the status bar:
`Muse Spark 1.3 Contributor Free / opencode-zen-free`). **The IMAGE should be rebuilt with that
default — a fresh rig inheriting a dead lane wastes a full verification round.**

**WHAT DID NOT COMPLETE — the behavioral scenarios (SC-1/SC-3/A-1/A-2):** the container's first turn
carries a **262K-token** payload (the extension's full tool surface + skills), so each turn on the
poolside lane was minutes long, and the rig's tmux session reset before the result was readable. No
passToken was captured in a tool-result context. **Reported as INCOMPLETE, never as PASS.**

**★ THE HONEST VERDICT FOR THIS LAYER:** the container proves the ARTIFACT (the dist loads, at the
right bytes); it does NOT yet prove the BEHAVIOR. The gap is the rig's lane configuration and the
payload size, both named, both fixable, neither a defect in the dist.

---

## ★★★ THE CONTAINER ROUND — SCENARIO RESULTS + TWO DEFECTS THE LLM AUDIT NEVER REPORTED

**The rig:** `omp-ct-gi20` from `omp-ct:master` · the deployed dist read INSIDE the container:
`sha256 574dc94c008133d2` (after the fix below; `04840c57105a7837` at the round's start).

| scenario | the pre-registered expectation | the observed | verdict |
|---|---|---|---|
| SC-1 the auth probe | a model-backed tool call yields a TOOL RESULT | `GI_SC1_OK` appeared in the stream after the bash call | ★ **PASS** |
| SC-2 the dist loads | the deployed sha == the repo's | `04840c57105a7837` → then `574dc94c008133d2` after the fix | ★ **PASS** |
| SC-3 the tool surface | the surface answers with its own output | `GI_TOOL_NAMES` = `["graph-probe","graph-query","bug-hunt","aether-code-audit","gi-consumption","gi-decide"]` + 1 alias | ★ **PASS** |
| A-1 the absent substrate | a NAMED refusal, never a silent empty answer | `GiPathError: GI_SHARED_PROJECT_STORE: path must include /sessions/{sid24}/store.sqlite, got /workspace` | ★ **PASS (loud-fail proven)** |
| A-2 the malformed argument | a named argument error, never a bare stack trace | ★ **FAILED FIRST, THEN PASSED** — see below | ★ **PASS after the fix** |

**★★ DEFECT 1 — A REAL DIST DEFECT, FOUND ONLY BY THE CONTAINER (A-2).**
```
  parseTargetRoots(null)          → TypeError: null is not an object (evaluating 'raw.split')
  parseTargetRoots({})            → TypeError: raw.split is not a function
  ledgerDirConfined("", undefined)→ TypeError [ERR_INVALID_ARG_TYPE]
```
These are **EXPORTED surface** (the bundle re-exports them), so a malformed argument reaches them
from outside the module — and they threw **bare `TypeError`s** instead of the codebase's named
`GI_<AREA>_INVALID` refusals. **A crash is not a refusal**: the caller cannot tell "you passed
garbage" from "the filesystem broke". **THE LLM AUDIT NEVER REPORTED THIS — all three runs of the
whole tree missed it.** Fixed with named guards (two throw; `settlementLedgerConfined` RETURNS a
named refusal, preserving its own never-throws contract). **RE-PROBED IN THE CONTAINER after the
redeploy — every malformed input now yields a NAMED refusal, zero bare TypeErrors.**

**★★ DEFECT 2 — A RIG DEFECT (not the dist).** `omp-ct:master` bakes its default role as
`opencode-go/muse-spark-1.3-contributor` — **the lane whose subscription has LAPSED.** Every fresh
rig boots onto a dead lane, falls through to a retired OpenRouter free model, and dies on
`404 No endpoints found for arcee-ai/trinity-large-preview:free`. Remedy applied live; **the IMAGE
should be rebuilt with an allowed default** (and the free tier needs the opencode fingerprint, which
an omp TUI does not carry — so the rig's default must be a PAID-credentialed allowed lane:
`poolside/poolside/laguna-s-2.1`).

**★ THE LESSON (the eighth method note): THE CONTAINER FINDS WHAT THE AUDIT CANNOT.** Three
whole-tree LLM audits missed three exported functions that crash on a malformed argument, because a
reviewer reads the SOURCE and the container CALLS it. **The adversarial half of a runtime round is
not optional polish — it is a different instrument.**

---

## ★★★ RUN 20 UNBLOCKED — THE LANE WAS THE PROBE'S BUG, AND THE CONTAINER ROUND FOUND IT

**THE CHAIN (each step measurable):**
```
  1 · the go lane        → 403 "an active OpenCode Go subscription is required"  (SUBSCRIPTION LAPSED)
  2 · the zen-free lane   → 429 FreeUsageLimitError (a burst window)
                            ★ AND, measured inside the container: 403 "OpenCode's free tier can only be
                            used from within OpenCode" — the free tier needs the OPENCODE FINGERPRINT,
                            which an omp TUI does not carry. The lane is unusable from this harness
                            without a fingerprint-injecting proxy (which the HOST has on :4097).
  3 · ★ THE POOLSIDE LANE → HTTP 200 (the host's own sky_pl… key, 45 chars)
```
**★ AND THE PRE-FLIGHT PROBE WAS REFUSING THE HEALTHY LANE.** My probe resolved the **GO pool's key**
for EVERY provider speaking the openai protocol — so poolside probed with a GO key, read `403
{"error":"please check the api-key you provided"}`, and was reported DEAD. **The guard was rejecting
a live lane.** The probe now resolves the provider's OWN credential from its config: `api_key_cmd`
(the key script) first, then `api_key`, then the GO pool as the last resort.

**RUN 20 IS LIVE ON POOLSIDE** — both halves probed `✓ lane probe: poolside-laguna-s (openai) → HTTP
200` and are producing parts with **0 EMPTY**. **This is the first whole-tree audit since the go lane
died, and it exists because the container round independently proved the poolside credential works.**

**★ THE LESSON (the ninth method note): A PROBE THAT HARDCODES ONE LANE'S CREDENTIAL TESTS THE
CREDENTIAL, NOT THE LANE.** The pre-flight guard did its job for the GO lane and lied for every other
one; a second lane in the allowed set was invisible to it. **When a guard is introduced for one
route, the OTHER routes must be re-measured through it before it is trusted.**

---

## ★★★ C1 FIXED — THE PER-CONSUMER DOMAIN MAP WAS DEAD (the register's last non-literal criterion)

**THE MEASUREMENT.** `bun scripts/consumption-audit.ts <root> --gate` reported:
```
  GI_CONSUMPTION_BELOW_EXPECTED: consumers NEVER consumed for any domain subject: ABIDE
```
**THE ROOT CAUSE (measured, not guessed).** TWO scripts (`consumption-audit.ts --gate`, `goal-verify.ts` C1)
declared a `DOMAIN_SUBJECTS`/`DOMAINS` map as the authoritative per-consumer domain table — and then
**iterated a HARDCODED subject list instead**. The map was **never read**. Three facts then met:
1. **ABIDE's domain is AGENT PROSE**, not code symbols. Its ledger (`.abide/events.jsonl`, 64.7 MB,
   234,120 rows, fresh) carries rubric flags over agent text: 1002 flag rows in the last 4000, rules
   `smoke-lexicon`/`l0-decide`/`claim-bind`/`red-team-default`, verdicts like `CLAIM_SLOP — the evidence
   machine scores the subject UNEVIDENCED`.
2. **The hardcoded list was code subjects** (`populateSessionStore`/`arsumbris`/`au-mcp-sdk`/`au-engine`),
   which appear in **ZERO flag rows** of the ledger.
3. So **ABIDE was structurally un-consumnable** — the gate asked it the wrong question, forever.
   **AND `goal-verify`'s C1 could only pass on a COINCIDENCE**: its default subject `evidence` occurs
   *inside ABIDE's verdict TEMPLATE* ("the evidence machine scores the subject UNEVIDENCED"), so the
   substring match fired without ABIDE ever answering a question in its own domain.

**★★ THE PROOF ABIDE IS HEALTHY** (so the fix belongs in the gate, not the adapter):
```
  'Live-proven'      → ABIDE CONSUMED  facts=8
  'obscura CDP chain'→ ABIDE CONSUMED  facts=4
  'CLAIM_SLOP'       → ABIDE CONSUMED  facts=925
  'smoke-lexicon'    → ABIDE CONSUMED  facts=925
```

**THE FIX.** Add ABIDE's own domain subjects (`CLAIM_SLOP`, `Live-proven`) to both maps, and derive the
probe's subject suite from the **UNION of every consumer's domain subjects** — the map is now read,
the single source of truth.

**THE RESULT.**
```
  consumption-audit --gate → ★ THE PREDICATE PASSED: all 8 consumers CONSUMED for their domains
  goal-verify              → ★ THE PREDICATE PASSED: 5/5 conditions met
                             C1·C2·C3·C4·C5 all PASS — C1 now for a REAL reason.
```
**★ THE METHOD NOTE (the tenth): A DECLARED TABLE THAT IS NEVER READ IS A COMMENT.** Both scripts
carried the correct abstraction and bypassed it; the gate's failure was invisible until the
`--gate` predicate was run and the one offender read. **When a control structure declares its own
parameters and then hardcodes them, the declaration is decoration — and the gate lies quietly.**

---

## ★★★ RUN 20 — THE LANE MATRIX, RE-MEASURED (the go lane was NOT dead)

**THE FALSE VERDICT.** The earlier runs concluded "the go lane is dead (403, subscription lapsed)".
**THE MEASUREMENT (this turn):**
```
  :4097/zen/go/v1  model=muse-spark-1.3-contributor  → 403 (THAT model's subscription lapsed)
  :4097/zen/go/v1  model=mimo-v2.5                    → ★ 200  (a PAID GO model, an ACTIVE key)
```
**THE WHOLE LANE WAS NEVER DEAD — ONE MODEL'S SUBSCRIPTION HAD LAPSED.** The `muse-go-mimo` provider
(`http://127.0.0.1:4097/zen/go/v1`, model `mimo-v2.5`, openai protocol) answers **200** and is the
goal's own approved lane ("mimo-v2.5-GO, never verboo"). **A per-model 403 was read as a per-lane
403 — the same class as the probe's hardcoded credential: a single route's failure generalized into
a lane's death.**

**RUN 20, MEASURED ACROSS THREE LANES:**
```
  zen-free      → 403 (needs the opencode fingerprint; an omp TUI does not carry it)
  openrouter    → 404 (the free model is retired)
  poolside      → 200 but RATE-LIMITED: 37 files in 1.5 h, and files whose retries exhausted
                  landed as `{"comments":[],"note":"EMPTY_RESULT"}` — the rate limit was silently
                  producing UNCOVERED files (the dead-audit-lane false-green in a new dress)
  muse-go-mimo  → ★ 200, PAID, no rate limit — RUN 20 RELAUNCHED HERE (8 workers/half)
```
**★ THE METHOD NOTE (the eleventh): A 403 NAMES A SUBSCRIPTION, NOT A LANE.** The error body named
one model; the conclusion named the whole lane. **When a lane reports dead, probe EACH model on it
before retiring the lane** — and when a rate-limited lane writes EMPTY parts, the audit's coverage is
a lie the count hides (37/113 "parts" can be 37 minus the empties).

**★ THE POOL FINDING (the same class, the second instance).** The go lane's key pool:
```
  n=8 | go-3 ok · go-8 ok · go-1 dead until 2026-09-25T10:20 · go-6 dead until 09:28 · go-7 dead until 09:34
        go-2 dead until 2026-10-25 · go-4 dead until 2026-10-25 · go-5 dead until 2026-10-25
```
**THREE keys are dead for a MONTH** (go-2/4/5) — the pool is 5-usable-of-8, and a pick that lands on a
dead key refuses the launch. **`pick` returned good keys 6/6 when measured**, so the lane is healthy
and the 403 was a transient bad pick. **The audit's retry-on-refuse (5 attempts per half) absorbs it.**
**★ A pool whose dead entries persist for a month is a pool at 62% — the maintenance defect is the
dead keys, not the lane.**

**★ THE 0-BYTE PARTS WERE TRANSIENT AND SELF-HEALED.** The r20-seq run's first parts (13:24) were
0 bytes; within 10 minutes the SAME files held real findings (`findings-store.ts` 8130B,
`engine.ts` 9227B, `fixture-calibration.ts` 13300B). **The script's retry OVERWRITES the empty part
on the next attempt** — so an EMPTY_RESULT marker is a transient, not a final state, PROVIDED the run
is watched. **The measurement: 10 parts / 10 min, 0 EMPTY, 4 workers on `muse-go-mimo`.** At that
rate the 113-file tree completes in ~2 h. **★ A count read at the wrong moment reports a lane dead
that is merely between retries — read the SIZE, not the count.**

**★ P7 ITEM — THE SEAL IS STALE (measured this turn).**
```
  sealed dist sha:  e13d0f5939e3707b
  current dist sha: 574dc94c008133d2   ← the A-2 fix (the exported-surface named guards)
```
The checkpoint `gi-6l2e-redteam-closed-e13d0f5939e3707b` predates the container round's fix. **Its
"honest gaps" #1 reads: *"ABIDE's substrate is ABSENT ON THE HOST"* — DISPROVEN this session**
(`.abide/events.jsonl` is 64.7 MB, fresh, and ABIDE consumes 1002 facts for `CLAIM_SLOP`). **A seal
whose gap list names a resolved blocker is a stale seal; P7 re-seals with the current dist + the
corrected gaps.**

**★ P6 ITEM — THE CANON DOCS' DIST SHA IS INCONSISTENT (measured this turn).**
```
  current dist:                    574dc94c008133d2
  context_management refs:         04840c57105a7837 × 54  ·  e13d0f5939e3707b × 6
```
The canon references TWO stale SHAs, not one — so the DOC CONTRACT's *"the 5 read-first docs agree on
the dist SHA"* is violated in BOTH directions (stale AND self-inconsistent). **The update runs ONCE,
after run 20 finalizes the dist** (a fix now would be overwritten if the audit lands a defect): the
STATE docs move to the current SHA, the LOGS keep their historical SHAs (an append-only record is not
retroactively rewritten).

---

## ★★ W3 — ALL 37 RUN-19 HIGHS REFUTED/FIXED (measured this turn)

**THE MEASUREMENT.** `grep -rl "R19-HIGH FIX" src/` returns **30 files carrying 42 fix markers**;
`bunx tsc --noEmit` → **0 errors**. So the run-19 highs are all addressed in the SOURCE:

| run-19 high | the file | the fix marker |
|---|---|---|
| the TOCTOU class (engine.ts:343) | `hunter/diagnostics/engine.ts` | ★ the fd-based complete fix (F-441 removed the first gap; the R19 fix closes the re-traverse) |
| `HAS_FINDING_PREDICATE` / `isPredicate` | `hunter/shared/ontology.ts` | ★ `PREDICATE_SET` now includes the one off-canon predicate |
| + 35 more | `hunter/**` · `kernel/**` · `omp/**` · `scoping/**` · `hydra/**` | 42 markers total |

**★ WHY THE TREE LOOKED UNCLEAN AND ISN'T.** The run-19 artifact (`/tmp/r19-full.json`, 0 critical /
37 high) is a SNAPSHOT — the fixes landed AFTER it, each tagged `R19-HIGH FIX`. **A finding list is
evidence about the tree AT the audit's timestamp, never the tree NOW** — reading it as current is the
stale-artifact class. **The re-audit is the only instrument that can say what remains.**

**RUN 20 RELAUNCHED ON TWO LANES IN PARALLEL** (A → `muse-go-mimo`/`mimo-v2.5`, B → `poolside-laguna-s`),
both probed HTTP 200, 4 workers each. **Measured lane throughput earlier: the go lane ~0.7 files/min
(the per-key rate limit caps concurrency), so two lanes halve the wall time.**
