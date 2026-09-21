# POST-COMPACTION_PROMPT — the fresh agent's entry sequence

**The dist SHA: 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709**

You are resuming the GI Kernel v2.1 build. Read this; then read the docs in the order below;
then prove you read them; then execute. Do not ask questions the docs answer.

## 1 · THE MISSION

Wire, runtime-test and seal GI Kernel v2.1 — the Jev-in-the-loop runtime kernel. The core is
BUILT (`src/omp/fire-gate.ts:262`, 370 L; `src/omp/calibration.ts:38`, 185 L) and UNWIRED
(`grep -c FireGate src/omp/kernel-v2.ts` = 0). The 9 waves are in
`packages/gi-kernel-v2.1/06-WAVES.md`. W6 is BLOCKED on M2 (the operator's cost matrix).

## 2 · THE WORKSPACE ROOT

```
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
branch jarvis/gi-main · rig stupefied_morse @ omp-ct:master
```

## 3 · THE READING ORDER (numbered; read before any code)

```
1  context_management/COMPACTION_SURVIVAL.md     the resume anchor — the shape of the build
2  THIS doc                                      the entry sequence
3  context_management/CURRENT_STATE.md           the architecture as it IS + the proven inventory
4  context_management/BUILD_STATE.md             the SHA chain + the module inventory
5  context_management/EVIDENCE_STATE.md          what is PROVEN vs merely CLAIMED
6  context_management/DECISION_CHAIN.md          the operator's rulings VERBATIM
7  packages/gi-kernel-v2.1/GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md   (862 L — the design)
8  packages/gi-kernel-v2.1/GI_KERNEL_V2.1_DPL1_SPEC.md             (505 L — the contract)
9  packages/gi-kernel-v2.1/06-WAVES.md                             (132 L — the waves)
10 .trident/CREATE_PIN_v2.1.txt                                    (145 L — the /goal pin)
```

## 4 · THE VERIFIED STATE (do-not-re-litigate)

```
battery      199 pass / 0 fail / 701 expect / 20 files
tsc          191 == the pre-session baseline, 0 NEW
dist sha     83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709
container    199 pass / 0 fail / 705 expect (clean /tmp, no ambient keys)
checkpoint   Checkpoints/gi-kernel-v2.0-working-fire-gate-calibration-measured/ (175 files)
register     ok=false up=5/11 first=GI_LAYER_SEMANTICA
v2.1 core    fire-gate.ts 370 L · calibration.ts 185 L · WIRED: NO
```

## 5 · THE CRITICAL DOCTRINE (the operator's rulings, verbatim)

```
"destructive, dumb, or theatrical. explicitly all 3 of these."
"dumb and theatrical is 80% of the kernel's work."
"NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK. HARD DEPENDENCIES ON EVERYTHING."
"if it exists on github we can use it. period."
"1) both"    — the gate in BOTH positions (pre-act + post-detector)
"2) get proper measurements for everything. no guesses"
"CONTAINER. THATS WHY ITS THERE."
"whenever you ask me questions, you always provide the relevant context"
"each fire should be < 5000 tokens"
```

## 6 · THE BUILD PLAN (the waves — see 06-WAVES.md for the full gates)

```
W1 THE LEDGER      src/omp/fire-ledger.ts      test_ledger_row_written
W2 THE ORACLE      src/omp/oracle.ts           test_oracle_resolves
W3 POSITION A      fire-gate.ts + kernel-v2    test_advisory_open   ← lands FIRST (fail-open)
W4 POSITION B      kernel-v2.ts                test_gate_fire · test_gate_ignore
W5 THE POLICY      src/omp/policy-store.ts     test_policy_reload
W6 THE CALIBRATION calibration.ts (the loop)   test_calib_flips     ← ★ BLOCKED ON M2
W7 THE MEASUREMENT MEASUREMENT_PLAN.md         zero TBD rows
W8 THE CONTAINER   .trident/ct-v2.1/           test_clean_container ← produce the PHASE F ARTIFACT
W9 THE SEAL        packages/gi-kernel-v2.1/**  PACKAGE_AUDIT PASS
```

## 7 · THE ACCEPTANCE

```
· the battery 199/0 on the host AND in the container (the container produces the artifact)
· tsc 191 == baseline (0 new)
· every wave's named test green, verified by re-running it YOURSELF
· checkCalibrationHealth ok=true (after 50+ real firings)
· MEASUREMENT_PLAN.md with ZERO TBD rows
· PACKAGE_AUDIT PASS + a refreshed checkpoint
```

## 8 · THE OPERATING RULES

```
· EVIDENCE OR NOTHING — every verdict carries a quoted tool result (the row query, the
  artifact path, RC=0), never prose.
· THE CONTAINER IS THE RIG OF RECORD — and it produces the Phase F artifact
  (.trident/container-test-results.json), not terminal output.
· PARALLEL WAVES, DISJOINT FILES — interfaces land first; boundary checks at every
  dependency point; never dispatch a dependent on a CLAIMED-complete predecessor.
· THE BUILDER-UNDER-AUDIT LAW — re-run tsc/battery/casts yourself on the combined tree.
· NO GUESSES — every constant carries its derivation or the label UNCALIBRATED.
· MINIMAL CHANGE — the frozen surfaces (gate-hook.ts:117, graph-gate.ts:208) survive.
```

## 9 · THE DO-NOTs (the frozen list + the anti-patterns)

```
DO NOT register the gate before the engines — the register reads up=5/11 and STAGE 0 would
  refuse EVERY tool call on this host (gate-hook.ts:117 → kernel-v2.ts:57).
DO NOT choose a threshold — derive it (calibration.ts:38) or label it UNCALIBRATED.
DO NOT invent a component — gi_exec_graph was a name with no code (T-02).
DO NOT substitute a rig — the container is the contract (F-53, T-01).
DO NOT revert the hermetic fixture (src/hydra/__tests__/fx383-fixture.ts) to a /tmp dependency.
DO NOT re-open the proven machinery (CURRENT_STATE's proven-machinery inventory).
DO NOT cite a number without its instrument (the measurement law).
DO NOT save a checkpoint before its deliverable exists.
```

## 10 · THE FIRST ACTION (the proof-of-context)

Give a 5-line state summary naming ALL FIVE of these, then EXECUTE:
```
1  the dist sha (83eb7bba...)
2  the battery count (199 pass / 0 fail / 701 expect)
3  the v2.1 core's wiring state (fire-gate 370 L, calibration 185 L, 0 call sites)
4  which wave is FIRST and why it is fail-open (W3, the pre-act advisory)
5  what W6 is blocked on (M2 — the operator's cost matrix)
```
Then fire W1 the same turn. Do not stop between waves — drive W1 → W2 → W3 → W4 → W5,
re-running every gate yourself, and report at W6's blocker or at the seal.
