# COMPACTION_SURVIVAL — GI Kernel v2.1 (the resume anchor)

**Read THIS first. It conveys the SHAPE of the entire build.**
**The dist SHA (the deployment fingerprint): 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709**

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
dist      83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709  (613,039 B)
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
