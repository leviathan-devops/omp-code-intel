

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
dist 47bf33443f4e9e83bb708c0a831fa083109942cc1d5692adc4533c8e38df991d · src_newer 0 · the dist-content gate PASS · the container MATCH.
## THE RETRY CONDITION
```
ocr review --from 640da98 --to HEAD --provider openrouter-laguna-s-free \
           --effort high --concurrency 1 --timeout 60 --format json
```
after the OpenRouter daily reset, or with a paid lane, at a **2-hour** cap.

# POST-COMPACTION_PROMPT — the fresh agent's entry sequence

**The dist SHA: 47bf33443f4e9e83bb708c0a831fa083109942cc1d5692adc4533c8e38df991d**

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
dist sha     47bf33443f4e9e83bb708c0a831fa083109942cc1d5692adc4533c8e38df991d
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

## 11 · THE ANTI-DERAIL LIST (this project's known failures — do not re-live them)

```
A-1  THE RIG SUBSTITUTION — running a container-minted row host-side and calling it passed.
     Measured cost: the container then found TWO real defects. Use the named rig.
A-2  THE CHOSEN CONSTANT — publishing a threshold without its derivation. Measured cost:
     a 2x error that made the act band fire ZERO times (a gate that never fires looks
     exactly like a gate that works).
A-3  THE UNWIRED KERNEL — a module that exists, is tested, and is called by nothing.
     The detection: grep -c "FireGate" src/omp/kernel-v2.ts must be > 0 after W4.
A-4  THE INVENTED COMPONENT — naming a store that does not exist (gi_exec_graph).
A-5  SCOPE SHRINK under pressure — "too big" is never a finding; decompose instead.
A-6  APPROVAL-GATING required work — the remedy IS the work order; execute it.
A-7  THEORETICAL fixes without runs — a mechanism described but not executed is a claim.
A-8  BLIND / syntax-only coding — a grep or a file read is not a graph. Map first.
```

## 12 · THE ANTI-STOP LIST (these never close the run)

```
· STATIONARITY — "no change in N turns" is not done.
· A SUB-INNER PASS as complete — one wave's green with siblings open is progress.
· MEMORY-COMPLETE — "I already verified this" without a this-turn re-run is STALE.
· THEATER-COMPLETE — prose summaries, typed-but-unrun commands, verdicts without outputs.
· BLOCKED-AS-DONE — a block names its resume condition; it is never a stop.
· A PARTIAL-SCOPE close — the board must read all-green.
· "ZERO BUGS" as success — the push set must have run.
· AN EMPTY RUNTIME LEDGER — nothing was operated; it was inspected.
· A GREEN BATTERY as capability — the battery is an effort receipt.
```

## 13 · THE CONTAINER DISCIPLINE (the rig of record)

```
THE COMMAND   docker exec stupefied_morse sh -lc 'rm -rf /tmp/fx383; cd /work/gi && \
                /root/.bun/bin/bun test ./tests/ ./src/hydra/__tests__/'
STAGING       docker cp <src>/. <dest>/     ← the trailing /. copies CONTENTS.
              WITHOUT it, docker cp NESTS the directory (measured: __tests__/__tests__).
THE DEPS      bun add zod xstate (the container has no node_modules for /work/gi)
THE ARTIFACT  ★ THE DELIVERABLE IS .trident/container-test-results.json (Phase F), not the
              terminal output. The current run has terminal evidence ONLY.
```

## 14 · THE ECONOMICS (the operator's envelope, checked)

```
per fire          ~1,200-3,000 input tokens (the 18KB cap ≈ 4,500 tokens worst case)
fires per session ~100 · sessions per day 5 · fires per day ~500
cost per day      ~$0.021-0.063 at $0.042/1M input tokens
★ THE ENVELOPE HOLDS with headroom. The 18KB cap is the guard: a fire that would exceed it
  TRIMS (and reports the trim) rather than growing the bill.
★ THE ORACLE ADDS ~1 fire per resolution — batch resolutions at session end, not per firing.
```

## 15 · THE THREADS (durable memory, outside this project tree)

```
~/.omp/threads/store.sqlite
  omp/system-debugging/global-debug-log     EN-001..EN-047 (the bug ledger)
  omp/copilot-intelligence                   the operator-interface rules (D-06's standing
                                             rule: a question always carries its context)
  omp/copilot-agents                         the copilot machinery
READ THEM with: bun /home/leviathan/JARVIS_WORKSPACE/OMP/threads/omp-threads.ts \
                  micro-thread read system-debugging global-debug-log
```

## 16 · THE DENSITY NOTE (why this doc is not 400 lines)

This doc is the ENTRY SEQUENCE, not the encyclopedia. The depth lives in the blueprint
(862 L), the DPL1 spec (505 L), and the other canon docs. When this doc names a fact, the
detail is one read away — the referenced doc is named beside it. A fresh agent that wants
MORE reads: the blueprint (the design), the spec (the contract), CURRENT_STATE (the
architecture as it is), DECISION_CHAIN (the rulings verbatim).
