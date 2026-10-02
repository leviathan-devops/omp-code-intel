<!-- 6L+2E + AUDIT UPDATE — 2026-10-03 (supercedes the 2026-09-30 banner below) -->
# ★ CURRENT — 2026-10-03: THE 6L+2E GAPS CLOSED + AUDITED
- GI ext `extensions/graph-intelligence/index.js` sha256 879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741 — DEPLOYED == SOURCE
- the 8 consumers CONSUMED across the SUBJECT UNION: `bun scripts/consumption-audit.ts . --gate` -> `union=8/8`
  (6 per-subject rows; the register reads consumed:6/8 for the canonical subject)
- ABIDE observable: a judge verdict writes a gate-ledger row `Pattern=ABIDE_JUDGE p=0.703` + ABIDE-R1/R2/R3
- C2KG edges=411 (the adapter reads them: L4_C2KG CONSUMED, an edge subject)
- L2_ARSUMBRIS: the symbol/file-space read (facts=50 on `populateSessionStore`)
- the AUDIT: `qwen-code-audit` (poolside-laguna-s) 3 rounds — 1 crit + 2 high FIXED+PROVEN; 0 crit/high OPEN
- the checker: `bun scripts/consumption-audit.ts <root> --gate` (EXIT 0 = predicate passed)

# COMPACTION_SURVIVAL — the state at a glance + the operating laws (as of 2026-09-30)

## THE STATE
The JEV wire is LIVE + PROVEN: the 4 gates judge (the corpus 40/40, the proof 10/10, the container 10/10, the red-team all-caught, the ledger 1987+ rows). The docs are current (the ship-docs gate PASSED; the canon U-gates below). The seal exists (153 files). The audit gate is BLOCKED (scope-mismatch) — the next session runs WAVE A first.

## THE OPERATING LAWS (verbatim, unchanged)
- FIX, NEVER REPORT: a fixable blocker is a task, never a finding.
- THE CONTAINER IS THE TEST: host-only or source-import proofs are not verification.
- EVIDENCE DISCIPLINE: every verdict carries a tool-result excerpt; an agent-typeable token is CIRCULAR.
- APPEND-ONLY: the logs and the history accumulate; never edit, delete, or reorganize.
- RIPWIRE FIRST-CLASS: map structure before every coding edit; never a blind patch.


**Read THIS first. It conveys the SHAPE of the entire build.**
**The dist SHA (the deployment fingerprint): 879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741**

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
dist      879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741  (613,039 B)
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

## ★ V2.2 SURVIVAL NOTE (2026-09-26)

**THE SESSION RECORD:** the V2.2 rebuild (GI_KERNEL_V2.2_REBUILD_SPEC §3 W1-W6) executed in one session — W1 purge · W2 source-roots · W3 scoping · W4 self-populate · W5a/b/c the judge · W6 the 3-tier testing. Every wave audited by the orchestrator (the builder-under-audit law). D1-D8 ALL GREEN.
**dist:** `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741` · **checkpoint:** `Checkpoints/gi-kernel-v2.2-self-populate-d1d8-green/`.
**THE 3 DEFECTS FOUND BY RUNNING:** (1) corbell's `rebuild=false` on a fresh store; (2) rule 3's common-ancestor over-scan; (3) the session-path enforcement on a project-scope store. Each a MECHANISM in the design.
**A FRESH AGENT RESUMES FROM DISK** — the checkpoint + `context_management/POST-COMPACTION_PROMPT.md` — never from this note's frozen numbers.

---
## V2.3 SESSION RECORD (2026-09-28)

**Session:** the V2.3 reflexive-kernel build. **The operator's interjections:** (1) mint an
OPERATOR_MANUAL + a discoverable skill so sessions use GI; (2) run the runtime-testing ladder +
runtime-grade + gi-live-store-hotseat + container-data-logging (meta-observe the kernel).

**Delivered:** the GI LSP + cards + HUD + the JEV route (`OPERATOR_MANUAL.md` 1032L + the managed
skill `graph-intelligence`) · the W0-W9 waves (dist `7d4e9db83263ba22`) · the live forensic
(`reports/GRAPH_GATE_live_forensic.md` 635L) · `host-test-failure-log.md` (12 bugs) · the seal
`Checkpoints/gi-kernel-v2.3-reflexive-kernel-7d4e9db8/` · `RECEIPT_V2.3.md`.

**THE PREDICATE:** REFLEXIVE (18 diagnostics · 6 layers · a confidence 0.514).
**THE ONE OPEN:** the S9 audit artifact (running) → the battery's 2 staleness fails close with it.

---

## ★ THE CURRENT-REALITY MARKER (2026-09-29 — updated by canon-doc-update)

**THE DEPLOYED DIST: `4694b1323fcc6887b89264c9262701ae3ebaf31b97bd19302256c9eefe964494`**
(`extensions/graph-intelligence/index.js`, 817806 B) — the hash the deployed artifact carries.
It is BIT-IDENTICAL to `Checkpoints/gi-kernel-v2.3-reflexive-kernel-4694b1323fcc6887/`.

**THE MEASURED STATE (this update's ground truth):**
- the battery `bun run test` -> 466 pass / 0 fail + 564 pass / 0 fail, EXIT=0 · tsc EXIT-0
- the 8 named G3 tests 8/8 · W7 (the brand scan) 0 offenders
- the Jev judge LIVE: `{"ok":true,"model":"jevk5-4b-v0.2-Q8_0"}` · the meaning card 104ms
- the live host reflex FIRED (a real write -> the diagnostics after the edit; the Jev confidence)
- the production suite 9/9 live (the sustained reflex 25/25) · the pressure sweep 105/105

**THE OPEN (the operator's mandate — the plan `PLAN-CLEANUP-JEV.md`):**
1. THE JEV DECISION LAYER IS NOT WIRED INTO THE GATES — the judge answers in 104ms and the
   adapters exist (`src/omp/jev.ts` · `adapters/jevk5.ts` · `kev.ts` · `abide.ts`), but the four
   gates decide by regex (`pbk-v2/src/firewalls/semantic-smoke-firewall.ts:209`).
2. the GI extension fails to load in the container (3x `resolving package 'typescript'`).
3. the prose rule layer is unbound on the host (the registry 0; 9 files deployed).
4. the W6 firewall still has no live caller (`enforceBashLockdown`: 0 in the bundle).
5. DEPLOYED-NOT-RUNNING: the running sessions hold the pre-restart bundle in memory.

**THE REVERTED (the operator's rejection):** the FR-11 bash-lockdown hook — removed from the
source, the repo, the host and the container; the bundle restored bit-identical.

---

## THE JEV ROUND — THE SESSION RECORD (2026-09-29)

**THE ARC:** P0 (the baseline, diff zero) → W1 (the interface, `src/omp/jev.ts`) → W2 (the live
judge contract, the choice shape) → W3 (the pbk-v2 gates wired; the first wiring WRONG — the claim
candidate broke 10 tests — corrected to the smoke candidate) → W4 (the 40-case corpus; 33/40 → the
threshold + the detector over-mark diagnosed → 40/40) → the deploy (pbk-v2 + GI) → the F-144
mechanism pinned + fixed + proven → the deployed-bundle proof (4/6 → the hardcoded-0.8 bug found →
6/6) → the docs.

**THE STATE A FRESH SESSION INHERITS:** the wire is LIVE and DEPLOYED; the corpus + the deployed
proof both green; the ledger carrying judge calls; the F-144 closed. THE OPEN: 2 gates unwired, the
escalation ladder, the host-bridge, the audit artifact, the pre-existing ledger-span failure.

**THE HARD-WON LESSONS:**
1. A HARDCODED TWIN of a derived constant is the same defect class the derivation exists to kill
   (F-145: the 0.8 in the smoke wiring vs the derived 0.5).
2. A UNIT TEST SUITE IS THE CHEAPEST AUDIT — the wrong STTGF wiring was invisible until 10 tests
   went red; had they not run, the F-141 heredoc would still block in the deployed artifact.
3. THE CHAIN THROWS ITS BLOCK (a StructuredBlockError), it does not return a verdict — a harness
   must classify the throw, and the throw's MESSAGE carries the gate's block text.
4. THE DEPLOYED ARTIFACT ≠ THE SOURCE — the corpus (a source import) and the deployed bundle
   disagreed until the bundle was driven directly (the fake-pi harness).
