# TASK_QUEUE — gates, active, completed, blocked

**The dist SHA: 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709**

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
