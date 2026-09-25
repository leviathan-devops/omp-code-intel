# COMPACTION_SURVIVAL — GI Kernel v2.1 (the resume anchor)

**Read THIS first. It conveys the SHAPE of the entire build.**
**The dist SHA (the deployment fingerprint): bf94ce1ec725ca811f4ff81f56915523cb7faae5ab2d3dcf81c01b5171dc1c42**

## THE MISSION (one line)

Turn GI Kernel v2.0 from a shape-matcher into an ADJUDICATED kernel: every detector fire
passes a <5000-token Jev Noul that decides whether the shape was a REAL violation given the
context, in BOTH positions the operator ruled (pre-act advisory + post-detector filter),
with thresholds DERIVED from a measured curve + the operator's cost matrix — never chosen.

## THE ONE-PARAGRAPH ORIENTATION

The v2.1 core is BUILT and measured but UNWIRED: `src/omp/fire-gate.ts:262` (370 L) is the
firing-time kernel and `src/omp/calibration.ts:38` (185 L) is the derivation machinery;
**`grep -c FireGate src/omp/kernel-v2.ts` = 0** — nothing calls them. The 9-wave build
(`packages/gi-kernel-v2.1/06-WAVES.md`, WAVES: 9) wires them. The thresholds are UNCALIBRATED:
a 14-case live measurement (EN-047) found the seeds were ~2x too high and the act band fired
ZERO times. The kernel's own verdict on itself: `checkCalibrationHealth` returns ok=false,
`derivePolicy` returns calibrated=false with the basis "cost matrix only ... NO measured
counts yet". The next action is W1 (the ledger), and W6 is blocked on M2 (the operator's
cost matrix).

## THE OPERATING LAWS (the full set, each with its rationale)

```
 1 RIPWIRE FIRST-CLASS — map structure before every coding edit; a blind edit is AP-10.
 2 BUILDER-UNDER-AUDIT — a subagent return is a CLAIM; re-run the gates yourself.
 3 EVIDENCE OR NOTHING — every verdict carries a quoted tool result, never prose.
 4 NO GUESSES — every constant carries its derivation or the label UNCALIBRATED.
 5 ENGINES BEFORE REGISTRATION — the register reads up=5/11; registering the gate first
   refuses every tool call on this host (the measured STAGE 0 consequence).
 6 THE CONTAINER IS THE TEST — a host green is an effort receipt, not a capability measure.
 7 NO FALLBACKS — a down dependency is a LOUD named failure (the F-48 substrate law).
 8 SECRETS OUT-OF-BAND — the Jev key lives at ~/.config/typesafe/key mode 0600.
 9 APPEND-ONLY LOGS — the ship docs and canon logs never rewrite history.
10 THE CHECKPOINT SAVES AFTER THE DELIVERABLE — a baseline that predates its artifact lies.
11 ONE SNAP JUDGMENT PER QUESTION — a composite scores ~0.4 on everything (bible D006).
12 THE STATE IS THE EVIDENCE ONLY — no conversation, no instructions (bible D004).
13 THE FAIL POLARITY IS PER SURFACE — dumb OPEN; theatrical/destructive CLOSED (D010).
14 laterTruth IS WRITTEN "unresolved" AT FIRING TIME — only the oracle changes it (S6.4.7).
15 THE CACHE KEY IS THE CANONICAL STATE — a question edit is a NEW instrument (D013).
```

## SETTLED DOCTRINE (each ruling verbatim + why)

```
"destructive, dumb, or theatrical. explicitly all 3 of these."
   → the three violation classes; the kernel guards all three, 80% being dumb+theatrical.
"dumb and theatrical is 80% of the kernel's work. destructive rarely happens."
   → the weighting that made the detectors a separate stage from the certification.
"the main issues are theatrical and fucking stupid."
   → the RSI layer's design: every reflex carries its own measured precision.
"NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK. HARD DEPENDENCIES ON EVERYTHING.
 LOUD FAIL CRASH IF ANYTHING IS NOT WORKED W/ CLEAR ERROR CODES"
   → hard-deps.ts; the register; every GI_* error code.
"if it exists on github we can use it. period."
   → license status is a NON-ISSUE, permanently.
"1) both"  (where the gate sits)     → W3 the pre-act advisory + W4 the post-detector filter
"2) get proper measurements for everything. no guesses"
   → the M1-M12 plan; the calibration machinery; the minted skill.
"make sure whenever you ask me questions, you always provide the relevant context"
   → the copilot-intelligence thread's standing rule: what it is / why it exists / the
     options with consequences / my recommended default / what is blocked.
"each fire should be < 5000 tokens"  → the 18_000-byte state cap (fire-gate.ts:139)
"we can safely assume this fires 100 times per session across 5 parallel session per day =
 500k tokens a day, costs me literally 2 cents"
   → the economics check (the DPL1 spec S18).
"CONTAINER. THATS WHY ITS THERE."     → the container is the rig of record.
```

## THE STATE AT A GLANCE (measured, the true numbers)

```
battery   199 pass / 0 fail / 701 expect / 20 files
tsc       191 == the pre-session baseline, 0 NEW
dist      bf94ce1ec725ca811f4ff81f56915523cb7faae5ab2d3dcf81c01b5171dc1c42  (613,039 B)
src       94 .ts / 29,028 lines
rig       stupefied_morse @ omp-ct:master (the container as host runtime)
register  ok=false up=5/11 first=GI_LAYER_SEMANTICA
v2.1 core fire-gate.ts 370 L · calibration.ts 185 L · WIRED? NO (0 call sites)
the 14-case measurement  bestT=0.40 bestF1=0.933 health.ok=false
```

## THE DOC MAP (what each doc contains + path + line count)

```
context_management/COMPACTION_SURVIVAL.md      this — the resume anchor
context_management/CURRENT_STATE.md            per-module status + the proven inventory
context_management/NEXT_STEPS.md               the W1-W9 wave plan + the risk register
context_management/TASK_QUEUE.md               gates + active + completed + blocked
context_management/BUILD_STATE.md              the SHA chain + the module inventory
context_management/CHANGELOG.md                the session history + what FAILED
context_management/POST-COMPACTION_PROMPT.md   the fresh agent's entry sequence
context_management/DECISION_CHAIN.md           the rulings verbatim + rejected alternatives
context_management/EVIDENCE_STATE.md           the behavioral evidence + the honest gaps
packages/gi-kernel-v2.1/GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md   862 L — the design
packages/gi-kernel-v2.1/GI_KERNEL_V2.1_DPL1_SPEC.md             505 L — the contract
packages/gi-kernel-v2.1/06-WAVES.md                             132 L — the waves
packages/gi-kernel-v2.1/MEASUREMENT_PLAN.md                      53 L — M1-M12
.trident/CREATE_PIN_v2.1.txt                                    145 L — the /goal pin
```

## FRESH-AGENT ENTRY RULES (the exact first five actions)

```
1  READ this doc + POST-COMPACTION_PROMPT.md
2  RE-MEASURE the baseline: bun test ./tests/ ./src/hydra/__tests__/ (expect 199/0/701)
   and sha256sum extensions/graph-intelligence/index.js (expect 83eb7bba...)
3  RUN  grep -c FireGate src/omp/kernel-v2.ts  (expect 0 — the wiring IS the build)
4  READ packages/gi-kernel-v2.1/06-WAVES.md (WAVES: 9) — W1 is the ledger
5  DO NOT register the gate before the engines: the register reads up=5/11 and STAGE 0
   would refuse every tool call on this host.
```

## THE HONEST GAPS THIS DOC CARRIES (named, never hidden)

```
· the container Phase F artifact (.trident/container-test-results.json) DOES NOT EXIST —
  the container battery ran by hand via docker exec, so the behavioral tokens were observed
  in terminal output, not written to the handoff artifact. EVIDENCE_STATE records what was
  actually observed and marks it as such.
· the 9-doc canon was 2 docs until this prep; the shortfall is recorded, not papered.
· the thresholds are UNCALIBRATED — health.ok=false, and the 2x error is the evidence.
· TSG is BUILT (cargo release, 54.50s) but not wired as a running LoadUnit.
· Abide is source-only; the oracle has never scored a real firing.
```

**One-line position: v2.1 is designed (blueprint 862 L) and its core is built (555 L) and
measured (14 live firings), but UNWIRED (0 call sites) and UNCALIBRATED (health.ok=false);
the next action is W1, and W6 waits on the operator's M2 cost matrix.**

## THE FULL RULING SET (every operator statement that constrains the build)

```
1  "destructive, dumb, or theatrical. explicitly all 3 of these."
2  "dumb and theatrical is 80% of the kernel's work."
3  "the main issues are theatrical and fucking stupid."
4  "NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK. HARD DEPENDENCIES ON EVERYTHING.
    LOUD FAIL CRASH IF ANYTHING IS NOT WORKED W/ CLEAR ERROR CODES"
5  "if it exists on github we can use it. period." (license = a permanent NON-ISSUE)
6  "1) both"  — the gate in BOTH positions
7  "2) get proper measurements for everything. no guesses"
8  "CONTAINER. THATS WHY ITS THERE."
9  "each fire should be < 5000 tokens"
10 "100 fires per session across 5 parallel session per day ... costs me literally 2 cents"
11 "whenever you ask me questions, you always provide the relevant context"
12 "wire this mfer in its exactly what we need. ltierally designed for embedded systems
    intelligence like runtime kernels."
13 "THE AGENT MAY NOT DO ANYTHING DESTRUCTIVE." (extended to dumb + theatrical)
```

## THE ARCHITECTURAL INVARIANTS (break one and the kernel is wrong)

```
I-1  THE MODEL NEVER ROUTES. Jev returns a float; code maps it to a consequence.
     fire-gate.ts:354. A design where the model chooses the action is a non-starter.
I-2  THE STATE IS EVIDENCE ONLY. No conversation, no instructions (bible D004).
     buildState at fire-gate.ts:186 — trigger + context + context_meta, nothing else.
I-3  ONE SNAP JUDGMENT PER QUESTION. Never a composite (D006). A vague question scores
     ~0.4 on everything and never fires — the silent-failure class.
I-4  UNCERTIFIABLE IS NOT A PASS. A missing answer routes by the fail polarity and is
     RECORDED as such (fire-gate.ts:340).
I-5  EVERY FIRE LEAVES A ROW. A fire with no row cannot be calibrated, audited or counted.
I-6  laterTruth IS WRITTEN "unresolved" AT FIRING TIME. Only the oracle changes it.
I-7  THE THRESHOLD IN FORCE IS RECORDED ON EVERY ROW (bible S6.4.3 rule 3) — so a later
     calibration separates "the model changed" from "the bar moved".
I-8  RE-ROUTING NEVER RE-INFERS. reroute() re-decides a stored probability (rule 4).
I-9  A QUESTION EDIT IS A NEW INSTRUMENT. QUESTION_VERSION is in the cache key.
I-10 THE CHEAPEST RUNG THAT CAN ANSWER DOES. MPSE → cache → model, in that order.
```

## THE MEASURED FACTS THAT SHOULD NEVER BE RE-DERIVED

```
· typed_edges.confidence was the DDL DEFAULT 1.0 on 2714/2714 live rows — ONE distinct
  value. The PREFIX "explicit:" is on ALL of them, so the prefix cannot discriminate;
  the PREDICATE can (imports=observed 0.99, calls=inferred 0.72).
· the live store was 2 days stale with NO marker: gi_meta.populated_at existed and nothing
  compared it to anything.
· the graphify projector's edgeRows carried NO confidence field at all.
· the real graph.json has 24,757 edges and 9,814 nodes; the store held 2,713 / 1,266 —
  the store came from an OLDER graph.
· the real schema uses source_location ("L54") and source/target, NOT line and src/dst.
· the register reads up=5/11 on this host; JEV is DOWN without the env shim.
· the container found 2 defects the host battery hid: a /tmp/fx383 fixture dependency and
  the ESM-hoisting GO_KEYS trap.
· the 14-case measurement: real mean P=0.581 (min 0.490), fp mean P=0.253 (max 0.530),
  best F1=0.933 at t=0.40, and the act band fired ZERO times at the seeds.
```

## THE DERIVATION DEEP-DIVE (what the numbers mean, for a fresh agent)

```
t = C_false_block / (C_false_block + C_missed)
  equal costs → 0.500 · block 4x → 0.800 · block 10x → 0.909 · miss 3x → 0.250
  ★ the C's are the OPERATOR'S risk posture; the CURVE is the measurement's.

THE WILSON INTERVAL (calibration.ts:52) — the correct interval for a proportion from
counts. The normal approximation misbehaves exactly where thresholds live (near 0/1 and
at small n). half-width ≈ z*sqrt(p(1-p)/n).

FIRES NEEDED (calibration.ts:106) — to resolve a gap g at p≈0.85:
  g=0.20 → 13 · g=0.15 → 22 · g=0.10 → 49 · g=0.05 → 196
  ★ THE MEASURED ANSWER to the fire-floor question: 49, not the 10 that was guessed.

THE TWO TRAPS (bible S6.4.6)
  INFLATION: copying a reported bar (someone's 0.95) without calibrating on your data.
  STARVATION: a bar so high the act band never fires — you pay for every judgment and use
  none. Symptom: flag rows pile up, act rows are zero. ★ MEASURED on this corpus.
```
