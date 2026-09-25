# CURRENT_STATE — GI Kernel v2.0 + v2.1 (the architecture AS IT ACTUALLY IS)

**dist SHA: 822eb8d15b75f6744cfec2abe89bf9db3ac81066ef18a9c37fc3454cec6ddb26bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24cf5e3903f63bfd3d0a846e3d83b39917d05d1c3e65b1b001e9f97a81a179fd995cfac412934e55c170e87a46740123fc062390e2a74c9030bf00c3300eb6afd144d39503509340e0506a15c873a3df28324da8eb35147460074279422bb7db7d0d2cf04f7a0bcf4a335244102fff15275fbdfa0c9392d50cbc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21baf927aeb9dfeaa067fd92327bfa26cc791740ad33901041e1c94c40a329ae170ba29f71b3c63c7f258b9b948ce09c8854ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f** · 2026-09-21

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
      └── [v2.1] THE FIRE GATE — WIRED (grep -c FireGate = 3; gate.judge ×1)
                 runKernelV2Gated wraps the stage machine (the sync kernel is unchanged)
      │
      ▼
fire-gate.ts:316  FireGate.judge(fire, ctx)  [v2.1 — WIRED via runKernelV2Gated]
      ├── mpsePreFilter           :275       the settlement engine ($0)
      ├── the cache               :342       ★ keyed (QUESTION_VERSION, stateHash) — R-D
      ├── the gate's OWN ceiling  :374       ★ DEFAULT_JUDGE_TIMEOUT_MS — H4-5
      ├── single-flight           :469       ★ one model call per state IN FLIGHT — W2-1
      ├── absorbContext           :186       the lexicon-filtered, byte-capped slice
      ├── buildState              :217       ★ the model DOES see ctx.slots → context
      ├── JevJudge.evaluate       :72        → POST api.typesafe.ai/v1/systemone
      └── the band / degradation  :446/:494  act|escalate|ignore · +timeout/+fail/+no-answer/
                                             +bad-answer via degradationOf()
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
fire-gate.ts 590 L     WIRED  ★ the v2.1 core. The gate's OWN judge ceiling (H4-5), the
                              single-flight cache (W2-1), the version-scoped cache key (R-D),
                              the degradation vocabulary (degradationOf), the advisory (W3).
                              Called by kernel-v2.ts (gate.judge ×1).
calibration.ts 185 L   PROVEN 14 cases + the 48-fire loop run under the seed matrix;
                              health.ok=FALSE (correct — it refuses a bar on 16 samples).
fire-ledger.ts 590 L   WIRED  ★ W1. The §8.2 fire_decisions table + drain + withLedger.
oracle.ts 381 L        WIRED  ★ W2. The 4 gatherers + classify + resolveAll (atomic batch).
policy-store.ts 343 L  WIRED  ★ W5. Versioned JSON + atomic write + loud validation.
kernel-v2.ts 571 L     WIRED  ★ W4. runKernelV2GATED — the post-detector filter. The v1.3
                              stage machine unchanged; worstOutcome shared.
hard-deps.ts 390 L     SOLID  the register; ★ now CORRECT about JEV (reads KEY_FILE) and L5
                              (imports the consumer's constant). up=5/11: L5+L6+TSG+ABIDE+
                              JEV+RSI+GI_STORE_DIR up; L1-L4 down (genuinely).
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
1  W6 THE CALIBRATION ★ BLOCKED ON M2 — the operator's cost matrix. The LOOP is PROVEN
                      (2 of 3 rules flipped calibrated=true under the seed matrix). ★ AND
                      M2 ALONE WILL NOT SUFFICE: the theatrical class does not discriminate,
                      and BOTH remedies are now MEASURED (option 1 evidence +0.082 · option 2
                      question +0.322). See W6_CALIBRATION_FINDING.md.
2  REGISTRATION       4 layers genuinely down (L1 semver/absent · L2 the au daemon is DEAD ·
                      L3 no UA graph · L4 no c2kg tooling). L5 is UP. The ENGINES-BEFORE-
                      REGISTRATION law blocks registering the gate until they are up.
3  THE AUDIT GATE     ★ FAIL. Four passes, a fixed point at 19 findings each time. Every
                      ship-ready claim is WITHHELD. RECOMMENDATION: a STANDING PROCESS,
                      not a one-shot pre-ship gate.
4  E1                 the oracle's engine — the operator's, v3.
5  F-51               the module-instance split: measured, not root-caused.
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
· ★ RESOLVED: W3/W4 ARE BUILT and the gate IS in the kernel's call path (runKernelV2Gated).
  NOT in the LIVE TOOL path — that is the registration, blocked by the engines law.
· ★ RESOLVED: the oracle IS implemented (oracle.ts) and resolves laterTruth through the
  ledger; its truth source for the W6 run was the CORPUS LABELS, not organic downstream
  evidence — the organic resolution rate stays unmeasured and is named as such.
· ★ RESOLVED: the policy store IS data (policy-store.ts + policies.json) — D026 honoured.
· ★ RESOLVED: the Phase F artifact EXISTS (.trident/container-test-results.json) — its own
  method.honestScope names it the BATTERY run, not the scenario-driver Phase F.
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

---

# ★ THE 6L+2E STATE (2026-09-22, HEAD f6fca91)

## THE DIST (the artifact)
`extensions/graph-intelligence/index.js` sha256_16 **`822eb8d15b75f6744cfec2abe89bf9db3ac81066ef18a9c37fc3454cec6ddb26bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24cf5e3903f63bfd3d0a846e3d83b39917d05d1c3e65b1b001e9f97a81a179fd995cfac412934e55c170e87a46740123fc062390e2a74c9030bf00c3300eb6afd144d39503509340e0506a15c873a3df28324da8eb35147460074279422bb7db7d0d2cf04f7a0bcf4a335244102fff15275fbdfa0c9392d50cbc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21baf927aeb9dfeaa067fd92327bfa26cc791740ad33901041e1c94c40a329ae170ba29f71b3c63c7f258b9b948ce09c8854ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f`** · **9,426,889 B**
★ 613 KB → 9.42 MB. **THE DIST-CONTENT GATE PASSES** — every v2.x symbol is present
(`consumptionAudit` `createLayerRegistry` `corbellProbe` `graphifyProbe` `arsumbrisProbe`
`tsgProbe` `abideProbe` `gi-consumption` all = 2). `find src -newer <dist>` = **0**.

## THE TREE
`bunx tsc --noEmit` → **exit 0, 0 errors** (was 191). `bun test` → ** 336 pass  0 fail **.

## THE CONSUMPTION STATE (the register's REAL answer)
```
consumed:2/8 rungs=settlement
  L5_CORBELL   CONSUMED             rung=settlement  facts=16
  L6_GRAPHIFY  CONSUMED             rung=settlement  facts=8
  L1_SEMANTICA GI_LAYER_DOWN        rung=decision    (no KG store exists on the host)
  L2_ARSUMBRIS GI_LAYER_DOWN        rung=knowledge   (the daemon is DEAD — connect refused)
  L3_UA        GI_LAYER_DOWN        rung=context     (no .ua/knowledge-graph.json)
  L4_C2KG      GI_LAYER_DOWN        rung=context     (nothing named c2kg exists)
  TSG          GI_LAYER_UNCONSUMED  rung=meaning     (a Rust SOURCE repo; no client)
  ABIDE        GI_LAYER_UNCONSUMED  rung=repair      (a handover DOC set; no client)
```
**★ `consumed:8` IS BLOCKED on 6 substrates that DO NOT EXIST on this host** — each with its
evidence and its unblock option in `packages/gi-kernel-6l2e/6L2E_COMPLETION_REPORT.md §6`.

## THE FILES (the 6L+2E surface)
```
src/omp/layer-registry.ts          211 L  ★ the T0 interface (types only)
src/omp/layer-consumption.ts        97 L  ★ the assembly (D-1) + the closed set
src/omp/adapters/_shared.ts         128 L   probePath · probeSocketDir · probeSocketConnect ·
                                            openReadOnly · liveEdgesFor · storeFacts
src/omp/adapters/{corbell,graphify,c2kg,ua,arsumbris,semantica,tsg,abide}.ts
scripts/consumption-audit.ts        24 L  the runnable verdict
tests/st-gi-6l2e.test.ts           244 L  the 13-test adversarial-first suite
```

---

# ★ THE TRUE DIST (re-stamped 2026-09-23 after the zero-trust audit)

** sha256_16 `822eb8d15b75f6744cfec2abe89bf9db3ac81066ef18a9c37fc3454cec6ddb26bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24cf5e3903f63bfd3d0a846e3d83b39917d05d1c3e65b1b001e9f97a81a179fd995cfac412934e55c170e87a46740123fc062390e2a74c9030bf00c3300eb6afd144d39503509340e0506a15c873a3df28324da8eb35147460074279422bb7db7d0d2cf04f7a0bcf4a335244102fff15275fbdfa0c9392d50cbc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21baf927aeb9dfeaa067fd92327bfa26cc791740ad33901041e1c94c40a329ae170ba29f71b3c63c7f258b9b948ce09c8854ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f`** (9,434,756 B).
★ THE AUDIT FOUND SHA DRIFT: this doc carried `a8583082…` / `822eb8d15b75f6744cfec2abe89bf9db3ac81066ef18a9c37fc3454cec6ddb26bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24cf5e3903f63bfd3d0a846e3d83b39917d05d1c3e65b1b001e9f97a81a179fd995cfac412934e55c170e87a46740123fc062390e2a74c9030bf00c3300eb6afd144d39503509340e0506a15c873a3df28324da8eb35147460074279422bb7db7d0d2cf04f7a0bcf4a335244102fff15275fbdfa0c9392d50cbc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21baf927aeb9dfeaa067fd92327bfa26cc791740ad33901041e1c94c40a329ae170ba29f71b3c63c7f258b9b948ce09c8854ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f` (two rebuilds
stale). The dist was rebuilt after the 8 HIGH gate fixes; **this is the TRUE sha**.
Evidence: `sha256sum extensions/graph-intelligence/index.js` → `822eb8d15b75f6744cfec2abe89bf9db3ac81066ef18a9c37fc3454cec6ddb26bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24cf5e3903f63bfd3d0a846e3d83b39917d05d1c3e65b1b001e9f97a81a179fd995cfac412934e55c170e87a46740123fc062390e2a74c9030bf00c3300eb6afd144d39503509340e0506a15c873a3df28324da8eb35147460074279422bb7db7d0d2cf04f7a0bcf4a335244102fff15275fbdfa0c9392d50cbc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21baf927aeb9dfeaa067fd92327bfa26cc791740ad33901041e1c94c40a329ae170ba29f71b3c63c7f258b9b948ce09c8854ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f`; `find src -newer` = 0;
the container deploy sha MATCHES.

---

# ★★★ THE IMMUTABLE SHIP GATE (the operator's order, 2026-09-23) — READ THIS FIRST

> **"EVERY SINGLE 'SHIP' ATTEMPT MUST HAVE A MANDATORY ZERO TRUST AUDIT + QWEN CODE REVIEW.
> UNTIL THIS TANGIBLY FULLY CLEARS — THE GOAL IS NOT COMPLETE."**

## THE LAW
**NO ship-ready / production-grade / merge / "done and verified" claim without BOTH:**
1. **a ZERO-TRUST AUDIT** (skill `zero-trust-audit`) — the claims table with REAL reproduction
   rows, the fraud hunt, an **independent blind subagent** (contaminated context = disqualified),
   the verdict VERIFIED / VERIFIED WITH CAVEATS / REFUTED; **AND**
2. **a QWEN CODE REVIEW** (skill `qwen-code-audit`) — a **COMPLETED** run at **0 critical / 0 high**.

## THE STATE MACHINE
```
BLOCKED  != PASS      PARTIAL != PASS      CLEARED == PASS (a COMPLETED 0-crit/0-high run)
```

## THE ORDER
fix the findings → **RE-RUN the gate** → the re-run's verdict IS the gate.
*Fixes then a silent re-claim = theater; fixes then a re-run = the gate.*

## THE COMPLETION LAW
The goal is **NOT complete** until the gate **tangibly fully clears**. FORBIDDEN: a scope shrink ·
BLOCKED-as-done · a partial-scope close · "zero bugs" as success · a green battery as capability.

## ★ THE AUDIT LANE (2026-09-25) — ★ THE GO LANE EXHAUSTS; THE ZEN-FREE LANE IS THE FALLBACK

```
the go lane (muse-go-mimo, :4097/zen/go/v1)   ← the primary; 3 of 8 pool keys hit the
                                                 MONTHLY quota (dead until 2026-10-25),
                                                 4 hourly-reset, go-8 → 403. EXHAUSTIBLE.
the zen-free lane (muse-free, :4098/zen/v1)   ← the fallback; NO subscription needed,
                                                 80 models, 10 `-free` variants. Wired via
                                                 /home/leviathan/.omp/agent/bin/zen-free-adapter.mjs
                                                 (a Bun SSE-decoding bridge — ocr cannot
                                                 decode text/event-stream, and the proxy
                                                 enforces the 4-gate fingerprint).
★ THE PRE-FLIGHT PROBE: scripts/whole-tree-audit.sh now probes the lane with ONE real
  completion BEFORE launching the wave and REFUSES on a non-200. Run 15 burned 113 parts
  onto an exhausted lane and returned 109 EMPTY_RESULT markers — 40 minutes for nothing.
  The probe makes that class impossible. (The F-607 instrument gate still catches a
  mid-run death: ≥50% empty parts ⇒ AUDIT_INSTRUMENT_DEAD ⇒ the run is VOID.)
★ LANE SWITCH: AUDIT_PROVIDER=muse-free bash scripts/whole-tree-audit.sh …  (default muse-free)
```

## ★ THE CURRENT GATE STATE (2026-09-23) — ★★★ CLEARED
```
qwen-code-audit:  ★ COMPLETED — DONE rc=0
                  provider: muse-go-mimo (the ACTIVE HOST's key + the go gateway + mimo-v2.5)
                  files_reviewed: 34 · comments: 35 · elapsed 52m14s
                  ★ BY SEVERITY: 0 CRITICAL · 0 HIGH · 18 MEDIUM · 17 LOW
                  ★ THE 8 HIGH THAT BLOCKED THE EARLIER RUN ARE CLEARED.
                  ★ ALL 35 ADJUDICATED: the real ones FIXED (M-1/M-5/M-6/M-7/M-9/M-12);
                    M-18 was a FALSE POSITIVE (7.0.2 is the Go CLI with NO API);
                    L-4/5/17 were POSITIVE comments.
zero-trust-audit: COMPLETE — reports/ZERO_TRUST_AUDIT_6L2E.md (617 L)
                  11/11 claims + 9/9 by a blind subagent · 3 frauds FIXED · 8 HIGH FIXED
                  + §14 the gate clearance + the independent re-audit of the cleared state
★ THE GATE IS **CLEARED**: AUDIT GATE: PASS (0 critical / 0 high).
```
**THE STATE:** tsc exit 0 · 26 pass / 0 fail · 349 pass / 0 fail · consumed:7/8 ·
dist 822eb8d15b75f6744cfec2abe89bf9db3ac81066ef18a9c37fc3454cec6ddb26bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24cf5e3903f63bfd3d0a846e3d83b39917d05d1c3e65b1b001e9f97a81a179fd995cfac412934e55c170e87a46740123fc062390e2a74c9030bf00c3300eb6afd144d39503509340e0506a15c873a3df28324da8eb35147460074279422bb7db7d0d2cf04f7a0bcf4a335244102fff15275fbdfa0c9392d50cbc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21baf927aeb9dfeaa067fd92327bfa26cc791740ad33901041e1c94c40a329ae170ba29f71b3c63c7f258b9b948ce09c8854ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f · src_newer 0 · the dist-content gate PASS · the container MATCH.
## THE RETRY CONDITION
```
ocr review --from 640da98 --to HEAD --provider openrouter-laguna-s-free \
           --effort high --concurrency 1 --timeout 60 --format json
```
after the OpenRouter daily reset, or with a paid lane, at a **2-hour** cap.
