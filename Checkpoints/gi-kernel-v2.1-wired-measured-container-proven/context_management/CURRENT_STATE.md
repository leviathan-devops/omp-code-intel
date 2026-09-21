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

## THE DETECTOR MECHANICS (what each one actually keys on)

```
dumbDetector         kernel-v2.ts:138
  KEYS ON  ctx.queriedBefore — was the target queried before the act?
  FIRES    queriedBefore=false → VIOLATION tier T1 → STEER (advisory)
  WHY T1   a blind edit is a PROCESS defect, not a safety one; the first occurrence
           steers, and repeats escalate through the drift ladder.
  THE v1 LINEAGE  replaces the parked basic-logic-check.md regex ("let me guess") with
           a FACT read off the execution record. A fact cannot be phrased around.

theatricalDetector  kernel-v2.ts:155
  KEYS ON  ctx.claims[].spans — does any claim have ZERO bound evidence?
  FIRES    an unbound claim → VIOLATION tier T2 → REFUSE
  WHY T2   a false "done" IS the defect; the cost asymmetry justifies refusal.
  THE CHEAP GATE  zero spans is decided in CODE; the model is never called
           (asserted with a call-spy in the enforce tests: called=false).

destructiveDetector  kernel-v2.ts:173
  KEYS ON  ctx.certifications[] — the six layers' verdicts
  FIRES    no certifications → UNCERTIFIABLE (NOT a pass); a VIOLATION → REFUSE
  WHY      T-6: the gate cannot certify what it cannot check.
```

## THE STAGE MACHINE (the exact order + what each stage records)

```
STAGE 0 PREFLIGHT  kernel-v2.ts:268   every layer probed; one DOWN ⇒ GI_STACK_INCOMPLETE
STAGE 1 CLASSIFY   :283               the classes asked (dumb|theatrical|destructive)
STAGE 2 BIND+INDEX :292               claims bound; the count recorded
STAGE 3 DETECT     :208/:299          the three detectors; the outcomes recorded
STAGE 4 KERNEL     :308               the worst verdict wins; a tie takes the HEAVIER class
STAGE 5 VERDICT    :328               ALLOW | STEER | REFUSE | ABORT
STAGE 6 RECORD     :366               the optional sink; a failing sink is REPORTED
★ AN ALL-PASS RUN IS `benign`, NOT the first detector's class (a mis-report the W2 test
  caught: the reduce kept the FIRST element on a rank tie).
```

## THE RSI LAYER (the 3.0 substrate, already built)

```
rsi.ts:138  RsiStore — signed rows (HMAC-SHA256, key 0600, dir 0700) + a prev_hash chain.
rsi.ts:248  verify — the length check BEFORE the constant-time compare (the F-50 fix:
            timingSafeEqual THROWS on a length mismatch, so a malformed sig used to
            crash the reader instead of being ABSENT).
rsi.ts:290  retire — VERIFIED RETIREMENT: a supersede is honored ONLY if the SUPERSEDING
            row exists, is live, and VERIFIES. ★ THE DISABLEMENT HOLE, found by a live
            attack: signatures stop INJECTION; they do nothing about DISABLEMENT, because
            the attacker only has to touch the victim's row.
rsi.ts:365  recount — precision RECOMPUTED from the ledger, never incremented.
rsi.ts:380  supersede — an ATOMIC retire-then-insert (G5 preserved by atomicity).
rsi.ts:103  deriveTier — the tier is a PURE FUNCTION. Floors at BOTH promoting tiers:
            GUARD (prec>=0.90, fires>=10, unres<=0.20) · REFLEX (>=0.70, >=3, <=0.50) ·
            RETIRED (fires>=20 below the floor) · HOLD (everything else, CAN NEVER PROMOTE).
```

## THE ENFORCEMENT KERNEL (the two polarities, measured)

```
E1 WORK  enforcement.ts:99   Abide judges the DIFF          fail-OPEN
    an act-band verdict appends REPAIR TEXT, never a rollback (R3).
    a down engine / a throwing judge ⇒ SKIPPED with the NAMED code.
    a judge answering UNKNOWN rule ids ⇒ a REPORTED defect, not a violation.
E2 CLOSE enforcement.ts:172  the firewall judges the CLAIM   fail-CLOSED
    DETECT → BIND (coverage FIRST; zero spans ⇒ FABRICATED, the model NEVER called) →
    JUDGE (one question over the BOUND spans) → ROUTE (code applies 0.8/0.5).
BANDS  ACT_PROBABILITY 0.8 (:80) · FLAG_PROBABILITY 0.5 (:81)
★ THE TWO POLARITIES ON THE SAME OUTAGE (measured):
    engine outage → work=SKIPPED (the edit proceeds) · close=FAIL_CLOSED (done blocked)
```

## THE DEBUGGING STATE (what is being worked on + the last insight)

```
EN-041  the lineless-edge drop — FIXED. Two field-name mismatches: (1) both line-resolution
        calls passed only the node's `data`, never `source_location` — the field the real
        schema uses; (2) GraphifyEdge's TYPE declares src/dst while the JSON emits
        source/target, so every edge resolved to graphify:undefined and counted DANGLING.
        MEASURED: 0 → 23,086 edges survive; 9,797/9,814 nodes with lines.
        LEFTOVER: 1,671 edges genuinely dangling; the OLD store shows pre-fix values.
EN-043  the freshness DEADLOCK — FIXED. The probe reads .graph_hash (written ONLY by the
        populate path); the build regenerated graph.json but never the sidecar, so
        build → stale sidecar → populate refuses → the sidecar never rewrites. The build
        now MARKS ITS OWN OUTPUT fresh.
EN-044  the phantom sessionID — FIXED. ctx.sessionID ?? "default" resolved to "default" on
        EVERY live call; every session shared one drift bucket. resolveSessionId: ctx →
        GI_SESSION_ID → the SCOPE ROOT (the gate's actual ownership boundary).
F-50    the malformed-sig crash — FIXED. Found ONLY by the first live-store run.
F-51    the mutation reading conflict — the TEST is fixed; the module-instance split is
        MEASURED (a call counter reading a CONSTANT hits=7 while verifyRow printed varying
        verdicts) but not root-caused.
```

## THE SYSTEM'S OWN VERDICT ON ITSELF (the honesty signal)

```
checkCalibrationHealth(policies, ledgers) → { ok: false, findings: [...3 items...] }
  the findings say: "NO LEDGER — threshold is uncalibrated" for all three rules.
derivePolicy(profile, counts) → { calibrated: false,
  basis: "cost matrix only (C_block=4, C_miss=1) → t=0.800; NO measured counts yet (needs 20 resolved)" }

★ THIS IS THE DESIGN WORKING. The kernel refuses to claim a calibration it does not have.
  A fresh agent should READ these two returns as the authoritative statement of the
  calibration state — not any prose anywhere, including this doc.
```
