# TASK_QUEUE — gates, active, completed, blocked

**The dist SHA: 812e3c6987027b19123db135f268c746657b7dbac4aadf7dd6e75b40b077683d**

## THE GATES (current state of each)

```
GATE v1.3 SEALED       PASS  the ship package exists; PACKAGE_AUDIT PASS; 12/12 tests.
GATE v2.0 PACKAGE      PASS  packages/gi-kernel-v2/ (11 docs / 3246 L); SC-1..SC-10 MET.
GATE v2.1 BLUEPRINT    PASS  862 L, 14 sections, 25/25 components mapped.
GATE v2.1 SPEC         PASS  DPL1 505 L, 19 sections.
GATE v2.1 WIRING       OPEN  0 call sites; W3+W4 unbuilt.
GATE v2.1 CALIBRATION  ★ BLOCKED ON M2
GATE THE CONTAINER CT  PARTIAL — the battery ran in-container (199/0); the Phase F
                       artifact was NEVER WRITTEN (the run was by hand).
GATE THE CANON         PARTIAL — the 9 docs written this prep; the floors measured below.
GATE THE AUDIT         NOT RUN — no code-audit artifact exists on disk.
```

## ACTIVE TASKS (owner + done-when + dependencies)

```
T-1  W1 THE LEDGER       owner: d1  done-when: a row per fire, laterTruth='unresolved'
     deps: none
T-2  W2 THE ORACLE       owner: d2  done-when: one real firing resolved with the evidence
     deps: T-1
T-3  W3 POSITION A       owner: d3  done-when: an advisory fires; the battery 199/0
     deps: T-2
T-4  W4 POSITION B       owner: d3  done-when: grep -c FireGate > 0; a FIRE + an IGNORE
     deps: T-3
T-5  W5 THE POLICY       owner: d4  done-when: a policy edit reloads without a rebuild
     deps: T-4
T-6  W6 THE CALIBRATION  owner: d4  done-when: health.ok=true
     deps: T-5 + ★ M2
T-7  W7 THE MEASUREMENT  owner: d5  done-when: zero TBD rows in MEASUREMENT_PLAN.md
     deps: T-6
T-8  W8 THE CONTAINER    owner: the orch  done-when: 199+/0 + THE PHASE F ARTIFACT JSON
     deps: T-7
T-9  W9 THE SEAL         owner: the orch  done-when: PACKAGE_AUDIT PASS
     deps: T-8
```

## COMPLETED TASKS (with the evidence they closed on)

```
C-1  T-1 layer_id + derivation      CLOSED  1266→1424 nodes, layer_id NULL=0 (LIVE)
C-2  T-8 confidence derivation      CLOSED  distinct=2 over the real 2714-edge corpus
C-3  SC-7 staleness                 CLOSED  GI_LAYER_STALE:explicit, ageMs 128,234,269
C-4  T-3 the stage machine          CLOSED  14 tests; SC-2 token verbatim
C-5  T-4 the three detectors        CLOSED  14 tests; ONE interface
C-6  T-7 the RSI layer              CLOSED  the mutation bites (6/2 → 9/0)
C-7  T-6 the register               CLOSED  11 tests; the live audit up=5/11
C-8  T-5 the enforcement kernel     CLOSED  16 tests; both polarities on one outage
C-9  EN-041 the lineless drop       CLOSED  0 → 23,086 edges on the real corpus
C-10 F-50 the malformed-sig crash   CLOSED  length-check + a regression test
C-11 F-51 the mutation claim        CLOSED  T8 now re-runs T2's assertion under the mutation
C-12 EN-044 the phantom sessionID   CLOSED  0 phantoms across 6 resolver cases
C-13 F-52 the SC-8 evidence split   CLOSED  one evidence source + an agreement assertion
C-14 THE CONTAINER battery          CLOSED  199/0 in-container; 2 defects found + fixed
C-15 THE THEATRICALITY LOG          CLOSED  361 L, T-01..T-11, the root pattern
C-16 THE v2.1 PACKAGE               CLOSED  19 files / 2091 L, box-law clean
C-17 THE CREATE PIN                 CLOSED  validator PASS (145 lines, 7/7 slots)
```

## THE BACKLOG (prioritized + rationale)

```
B-1  TSG wired as a running LoadUnit     the binary is BUILT (cargo release, 54.50s);
                                         the seam exists; no spawn site. HIGH.
B-2  Abide installed                     source-only; the kernel is native. MEDIUM.
B-3  the oracle's engine (E1)            the operator's ruling. Blocks v3.
B-4  the 9 canon docs to the 200 floor   this prep wrote them short. MEDIUM.
B-5  the code audit (the AUDIT GATE)     no artifact exists. Blocks ship-ready claims.
B-6  F-51's module-instance split        measured, not root-caused. LOW (contained).
B-7  the OLD store re-populate           EN-041's fix is not visible in the baseline store.
```

## THE BLOCKED ITEMS (blocker + the unblock path)

```
★ M2 THE COST MATRIX — blocker: the operator has not answered.
  UNBLOCK: ask with full context (the copilot-intelligence rule): what it is, why it
  exists, the options with their consequences, my recommended default, what is blocked.
★ E1 THE ORACLE'S ENGINE — blocker: unruled. UNBLOCK: the same question shape.
★ THE ENGINES (L1..L5) — blocker: not installed. UNBLOCK: the operator's install order.
★ THE PHASE F ARTIFACT — blocker: the CT tool was not used. UNBLOCK: re-run via the tool.
```

## THE FILE:LINE ANCHORS (the substance surface)

```
src/omp/fire-ledger.ts      W1's new module (does not exist yet)
src/omp/oracle.ts           W2's new module (does not exist yet)
src/omp/fire-gate.ts:262    FireGate.judge — the v2.1 core, unwired
src/omp/fire-gate.ts:196    mpsePreFilter — the $0 settlement engine
src/omp/calibration.ts:38   thresholdFromCost — the derived threshold
src/omp/calibration.ts:118  derivePolicy — per-rule, calibrated=false
src/omp/kernel-v2.ts:264    runKernelV2 — the W3/W4 wiring target
src/omp/kernel-v2.ts:57     preflight — the STAGE 0 refusal
src/omp/jev.ts:72           JevJudge.evaluate — the live model call
```

## THE GATE DEFINITIONS (what each gate MEANS, mechanically)

```
GATE v1.3 SEALED      the ship package exists at SHIP_PACKAGES/Graph_Intel_v1.3/ with
                      PACKAGE_AUDIT PASS; verified by ls + the audit grep.
GATE v2.0 PACKAGE     packages/gi-kernel-v2/ holds 11 docs; SC-1..SC-10 each carry a token.
GATE v2.1 BLUEPRINT   862 L at packages/gi-kernel-v2.1/, 14 sections, 25/25 mapped.
GATE v2.1 WIRING      grep -c "FireGate" src/omp/kernel-v2.ts > 0 AND a real FIRE + a real
                      IGNORE adjudicated.
GATE v2.1 CALIBRATION checkCalibrationHealth(...).ok === true with zero findings.
GATE THE CONTAINER    .trident/container-test-results.json EXISTS and the per-scenario
                      verdicts are in it. Terminal output does NOT satisfy this gate.
GATE THE CANON        every doc at 200+ lines, 3+ file:line refs, and the 5 read-first
                      docs agreeing on the dist SHA.
GATE THE AUDIT        an artifact exists on disk (sg-ocr-*.json) AND the TESTING_LOG
                      carries "AUDIT GATE: PASS". Currently NOT RUN — every ship-ready
                      claim is WITHHELD.
```

## THE DEPENDENCY GRAPH (what unblocks what)

```
M2 (the operator) ────────────────┐
                                  ▼
W1 ──► W2 ──► W3 ──► W4 ──► W5 ──► W6 ──► W7 ──► W8 ──► W9
                                  ▲
E1 (the operator, for v3) ────────┘  (not on the v2.1 critical path)

THE ENGINES (L1..L5 install) ──► the register goes up ──► the gate may be REGISTERED.
  ★ THE ORDER IS LAW: engines → register → wire the live path.
```

## THE OWNERS

```
d1  THE LEDGER DESK       src/omp/fire-ledger.ts
d2  THE ORACLE DESK       src/omp/oracle.ts
d3  THE GATE DESK         src/omp/kernel-v2.ts (+ fire-gate.ts's intent path)
d4  THE POLICY DESK       src/omp/policy-store.ts (+ the calibration loop)
d5  THE MEASUREMENT DESK  MEASUREMENT_PLAN.md (+ the instruments)
the orch                  W8 (the container) + W9 (the seal)
★ min 5 live desks per turn · cap 4 product-file writers · disjoint write-sets.
```

## THE COMPLETED-TASK EVIDENCE (the exact artifact each closed on)

```
C-1  the LIVE migration        the store query: 1424 nodes, layer_id NULL=0
C-2  the confidence derivation the corpus query: distinct=2 over 2714 real edges
C-3  the staleness gate        storeFreshness(...) → {"stale":true,"code":"GI_LAYER_STALE:explicit"}
C-4  the stage machine         bun test -t sc2_one_down_layer_refuses_the_whole_stack
C-5  the three detectors       bun test -t t4_all_three_detectors_share_one_shape
C-6  the RSI layer             the mutation: 6 pass/2 FAIL → 9 pass/0 fail
C-7  the register              bun test -t t6_the_v2_register_declares_ALL_six_layers...
C-8  the enforcement kernel    bun test -t e2_the_two_polarities_differ_on_the_SAME_outage
C-9  EN-041                    the real-corpus run: 23,086 edges survive (was 0)
C-10 F-50                      the regression test: sc4_a_MALFORMED_sig_is_REJECTED...
C-11 F-51                      T8's rewritten assertion (the expect count 50 → 51)
C-12 EN-044                    the resolver probe: 0 phantoms across 6 cases
C-13 F-52                      the driver's agreement assertion (it caught the drift)
C-14 the container battery     docker exec ... → 199 pass / 0 fail / 705 expect
C-15 the theatricality log     THEATRICALITY_LOG.md 361 L, T-01..T-11
C-16 the v2.1 package          19 files / 2091 L, box-law clean (0 over-width)
C-17 the create pin            the validator stdout: PASS (145 lines, 7/7 slots)
```

## THE BLOCKED ITEMS — THE EXACT QUESTION TO ASK (per the copilot-intelligence rule)

```
★ M2 — THE COST MATRIX. Ask it in the 5-part shape:
  1 WHAT   the two costs per violation class: the cost of a FALSE BLOCK (stopping a
           legitimate act) vs the cost of a MISS (letting a violation through).
  2 WHY    t = C_block/(C_block+C_miss) IS the act threshold. Without the ratio, every
           derived threshold is a guess — the exact failure the operator banned.
  3 OPTIONS  equal (t=0.50) · block 4x (0.80) · block 10x (0.909) · miss 3x (0.25)
           per class — destructive, dumb, theatrical may differ.
  4 DEFAULT  destructive block 4x (a false block stops work; a miss ships damage) ·
           dumb miss 2x (an advisory is cheap) · theatrical block 3x (a false done is the
           defect). STATED as a seed, to be overridden.
  5 BLOCKED  W6 (the calibration) and therefore W7-W9. W1-W5 are unblocked and buildable.
★ E1 — THE ORACLE'S ENGINE: Jev (recommended) / MPSE-only / JESL. Blocks v3, not v2.1.
★ THE ENGINES: the L1..L5 install order. Blocks the live registration.
```

## THE WORKING DISCIPLINE (how the queue is worked)

```
· ONE wave in flight per desk; the board is updated the moment a state changes.
· A wave CLOSES on its AUDIT VERDICT, never on a subagent's return.
· A FLAWED verdict puts the wave back to in_progress with the fix note.
· A BLOCKED wave names its unblock path — it is never silently parked.
· The orchestrator re-runs EVERY gate itself before closing (the builder-under-audit law).
· Docs update the MOMENT a wave closes (the 2 logs first).
```

## THE RESUME COMMAND (one line for a fresh session)

```
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence && \
  cat context_management/COMPACTION_SURVIVAL.md
# then read POST-COMPACTION_PROMPT.md and give the 5-line proof-of-context
```
