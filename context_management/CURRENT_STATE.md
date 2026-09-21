# CURRENT_STATE — GI Kernel v2.0 + v2.1 (the architecture AS IT ACTUALLY IS)

**dist SHA: 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709** · 2026-09-21

## THE ARCHITECTURE NOW (not as designed — as it is)

```
the omp tool_call event
      │
      ▼
gate-hook.ts:117  registerGraphGate(pi)      [the v2.0 single call site — FROZEN, count=1]
      ├── attachGiGraphGate(pi)   :56        the per-edit middleware (SIGNATURE_BREAK)
      └── pi.on("tool_call")      :126       the drift layer (throws T2/T3)
      │
      ▼
kernel-v2.ts:264  runKernelV2(input)         STAGE 0..6
      ├── preflight(layers)       :57        the six layers; one DOWN ⇒ REFUSE
      ├── classifyByDetectors     :208       three detectors, ONE shape
      │     dumb :138 · theatrical :155 · destructive :173
      └── [v2.1] the fire gate — NOT WIRED (grep -c FireGate = 0)
      │
      ▼
fire-gate.ts:262  FireGate.judge(fire, ctx)  [v2.1 — BUILT, UNWIRED]
      ├── mpsePreFilter           :196       the settlement engine ($0)
      ├── the cache               :289       the canonical state is the key
      ├── absorbContext           :150       the lexicon-filtered, byte-capped slice
      ├── JevJudge.evaluate       :72        → POST api.typesafe.ai/v1/systemone
      └── the band                :354       act|escalate|ignore → FIRE|ESCALATE|IGNORE
      │
      ▼
calibration.ts  thresholdFromCost :38 · precisionFromCounts :52 · derivePolicy :118
      │
      ▼
rsi.ts:138  RsiStore  the reflex layer (signed rows · VERIFIED RETIREMENT :290)
```

## PER-MODULE STATUS (built / solid / broken / open)

```
typed-write.ts 1243 L  SOLID  migrated LIVE: 1424 nodes, layer_id NULL=0, confidence
                              distinct=2 (the B1+B3 kills, measured on the real store).
kernel-v2.ts 390 L     SOLID  STAGE 0..6 green; 14 tests; the gate NOT wired.
rsi.ts 448 L           SOLID  VERIFIED RETIREMENT proven by attack; the mutation bites
                              (6 pass/2 FAIL neutered → 9/0 restored).
hard-deps.ts 220 L     SOLID  the register; up=5/11 on this host.
enforcement.ts 270 L   SOLID  TSG+Abide seams; the engines NOT installed.
jev.ts 149 L           SOLID  LIVE: probe ok=true p=0.76 @790ms; the kernel judged a
                              real claim at p=0.980 with the live model.
fire-gate.ts 370 L     BUILT  UNWIRED. 0 call sites. The v2.1 core.
calibration.ts 185 L   BUILT  14 cases measured; health.ok=FALSE.
the ledger             OPEN   W1 — fire_decisions does not exist.
the oracle             OPEN   W2 — oracle.ts does not exist; laterTruth always "unresolved".
```

## THE PROVEN MACHINERY INVENTORY (what NOT to re-open, and why)

```
· the v1.3 gate (graph-gate.ts 308 L + gate-hook.ts) — 12/12 tests, deployed, FROZEN.
  Re-opening breaks the single call site and the sealed v1.3 package.
· the three detectors (kernel-v2.ts:138/:155/:173) — 14 tests. The gate ADJUDICATES their
  output; it does not replace them.
· VERIFIED RETIREMENT (rsi.ts:290) — proven by a live attack that FOUND the disablement
  hole; the fix is pinned. Re-opening re-opens a closed defect class.
· the Jev client (jev.ts) — the live endpoint verified. Do NOT add a fallback judge.
· the calibration maths (calibration.ts) — the Wilson interval + the cost cut. The SHAPE is
  right; only the DATA is missing.
· the hermetic fixture (src/hydra/__tests__/fx383-fixture.ts) — the container proved the
  batteries were machine-dependent; the helper fixed it. Do NOT revert to a /tmp dependency.
```

## THE OPEN ITEMS (blocker + the next attempted fix)

```
1  W1 THE LEDGER      no blocker. src/omp/fire-ledger.ts + the DDL (blueprint S8.2).
2  W2 THE ORACLE      no blocker; starts with the MPSE-decidable outcomes.
3  W6 THE CALIBRATION ★ BLOCKED ON M2 — the operator's cost matrix per class.
                      Until it arrives, derivePolicy returns calibrated=false.
4  THE CONTAINER CT   the Phase F artifact is MISSING — the run was by hand. Re-run via
                      the CT tool, OR record the terminal evidence as such.
5  THE CANON DOCS     written this prep; the floors measured below.
6  F-51               the module-instance split: measured, not root-caused.
7  EN-041             the lineless-drop defect FIXED (23,086 edges) but the OLD store
                      needs a re-populate to show it.
```

## THE FULL FROZEN LIST (file:line, what is locked and why)

```
extensions/graph-intelligence/index.js   sha 83eb7bba... — the deployed artifact
src/omp/graph-gate.ts:208                the v1.3 tier ladder (T0/T1/T2/T3)
src/omp/graph-gate.ts:136                recordGraphQuery (the drift reset)
src/omp/gate-hook.ts:117                 registerGraphGate (grep count must stay 1)
src/omp/graph-gate.ts:247/:250/:254      the 3 PROPOSED v2 hooks
src/omp/populate.ts:21                   "There is NO third substrate" (the F-48 law)
```

## THE DEVIATIONS FROM DESIGN (noted, never smoothed over)

```
· the v2.1 gate exists but is not in the call path — the blueprint's W3/W4 are UNBUILT.
· the oracle is a seam with no implementation — laterTruth never leaves "unresolved".
· the policy store is hardcoded (SEED_POLICY) rather than data (D026's intent).
· the container evidence is terminal output, not the Phase F artifact.
· no Effect-TS harness: the script tests are bun:test with real modules + real stores
  (the observation-channel discipline holds; the Effect wrapper is not used).
· the register is up=5/11 — the six layers are DESIGNED, one (graphify) is POPULATED.
```
