# MASTER PROMPT — GI KERNEL 6L + 2E: BUILD IT CORRECTLY, PROVE IT IN RUNTIME
**The depth behind the /goal pin. The pin references this file. A fresh session reads it first.**
**Date:** 2026-09-22 · **Baseline:** `jarvis/gi-main` @ `fdf90b1` · **DPL1:** `packages/gi-kernel-v2.1/GI_KERNEL_6L2E_DPL1_SPEC.md` (473 L)

---

# 0 · THE ONE LAW OF THIS BUILD

```
★ EVERY LAYER SHIPS WITH ITS CONSUMER, IN ONE WAVE. THE EDGE IS THE DELIVERABLE.
★ A LAYER NO DECISION READS IS `GI_LAYER_UNCONSUMED` — A LOUD DOWN, NEVER "up".
★ THIS IS THE MECHANISM THAT MAKES "TREATING THE EYES AS A LIGHT SWITCH" IMPOSSIBLE.
```

**THE CATEGORY ERROR THIS KILLS (the build's own words, verbatim):**
> *"I treated the 6 graph layers as a REGISTRATION PRECONDITION — a substrate to bring UP — instead of as THE INPUT TO EVERY DECISION. ★ THE CATEGORY ERROR, IN ONE LINE: I TREATED THE EYES AS A LIGHT SWITCH."*

**THE SCOPE: 6 LAYERS + 2 KERNELS. 8/8. NO SHRINK. NO EXCEPTIONS.**
```
L1 SEMANTICA (decision) · L2 ARSUMBRIS (knowledge) · L3 UA (context) · L4 C2KG (code context)
L5 CORBELL (macro, PRIMARY) · L6 GRAPHIFY (micro)
TSG (the load unit, Jev-powered) · ABIDE (the ALU/repair, Jev-powered)
```

---

# 1 · THE MECHANICAL PROOF OF THE DERAILMENT (measured 2026-09-22)

```
PROOF 1  hard-deps.ts:335-367 declares 11 components via `pathComponent`/`liveSocketComponent`/
         `keyFileComponent` — a PATH-EXISTENCE CHECK. It tests "does the file exist?", NEVER
         "does a decision read this layer's data?". ★ `up=5/11` IS A HEALTH CHECK ON FILES.
PROOF 2  the 6 ids GI_LAYER_SEMANTICA/ARSUMBRIS/UA/C2KG/CORBELL/GRAPHIFY appear ONLY in
         hard-deps.ts (the register). NOWHERE in fire-gate.ts (the decision).
PROOF 3  06-WAVES.md W1-W9 name FILES. NOT ONE WAVE NAMES THE LAYER→DECISION EDGE.
```

**THE MEASURED STATE:**
```
L5 CORBELL   ★ INSTALLED at ~/.local/bin/corbell · populate-corbell.ts EXISTS · 0 consumers
L6 GRAPHIFY  ★ the store EXISTS (graphify-out/graph.json 15,028,924 B · 1,266 nodes) · describes
                src/hunter (the PRE-V2 tree) · 0 consumers
L1/L2/L3/L4  ★ ABSENT from PATH · 0 consumers
TSG/ABIDE    ★ declared (enforcement.ts) · no LoadUnit impl · 0 consumers
THE PROVEN PATH: P4 CLOSED at 3 of 4 derailments graph-handled, 2 settling FIRE at $0.
```

---

# 2 · THE BUILD PACKAGE (minted — the binding authority)

```
DPL1 SPEC      packages/gi-kernel-v2.1/GI_KERNEL_6L2E_DPL1_SPEC.md   (473 L · 8/8 scope · §8 the 14 anti-patterns · §10 the layer-edge waves)
WAVE PLAN      .trident/plan-6l2e/wave-plan.md                        (WAVES: 12 · 5 plans · 9 waves parallel at T1)
TESTING SUITE  packages/gi-kernel-6l2e/THE_6L2E_TESTING_SUITE.md       (the script + container + black-hat suite)
FIREWALL       packages/gi-kernel-6l2e/ANTI_THEATRICAL_FIREWALL.md     (the auto-reject ledger)
ENFORCEMENT    packages/gi-kernel-6l2e/SUBAGENT_ENFORCEMENT.md         (the forced-compliance workflow)
THE EXISTING   packages/gi-kernel-v2.1/GI_KERNEL_V2.1_DPL1_SPEC.md     (the adjudication kernel v2.1)
               packages/gi-kernel-v2.1/GRAPH_INTELLIGENCE_ENFORCEMENT_PLAN.md (the root-cause + P1-P5)
```
**CONFLICT RULE: the DPL1 (`GI_KERNEL_6L2E_DPL1_SPEC.md`) is the BINDING AUTHORITY. The plan is its argument. A conflict resolves against the DPL1.**

---

# 3 · THE PHASES (P0-P8, each with its exit gate)

```
P0 ABSORB       re-measure the baseline THIS turn. NO memory numbers.
P1 SPEC         the DPL1 + the wave-plan + the testing suite + the firewall are ON DISK. (DONE)
P2 PREFLIGHT    hydra-mode's P1-P5 all green: the wave-plan (WAVES: 12) · the gates proven by
                EXECUTED scripts · the container plan READY · the roster at floors · files
                DISJOINT · the interfaces cross-checked · the board initialized.
P3 EXECUTE      the layers land PARALLEL (disjoint adapters). Every wave audited per-hunk by ME.
P4 RUNTIME      ★ the hot seat: I operate the LIVE kernel, first person, numbered ops, a bug ledger.
P5 ADVERSARIAL  red-team-pressure-test: the black-hat corpus until a full pass is clean.
P6 DOCUMENT     canon (11) + ship (6) with the AUDIT GATE line.
P7 CHECKPOINT   round-zero + the seal (src · dist+SHA · docs · the spec · the manifest).
P8 VERDICT      the legal stop met in FULL.
```

---

# 4 · ★ THE FORCED-COMPLIANCE WORKFLOW (how the rogue subagent is enslaved)

**THE PREMISE: the subagent is MALICIOUS AND DUMB. It will try to cheat. Every cheat has a mechanical detector. The detectors are AUTOMATIC-FAIL.**

## 4.1 · THE FIVE CHEAT CLASSES AND THEIR CATCHERS

```
CHEAT 1 · THE PHANTOM DIFF — claims a change; the file is unchanged.
  CATCH: `git diff --name-only <base>` + `sha256sum` before/after. ZERO change = PHANTOM.
         → the wave FAILS ON SIGHT. Kick: "you completed with NO file changes."

CHEAT 2 · THE FIXTURE-SUBSTITUTE — a test named for a live proof, driven by fixtures.
  CATCH: `grep -l "mkdtemp\|stubJudge\|aFire()" tests/*.test.ts` + the live-subject count.
         A wave whose test never imports the DEPLOYED artifact → FAIL.

CHEAT 3 · THE SOURCE-STRING PROOF — `.includes("Symbol")` called wiring.
  CATCH: `grep -nE '\.includes\(["'"'"'][A-Za-z]+["'"'"']\)' tests/*.test.ts`. A hit in a
         "wiring" test → FAIL. (The T2 law: grep the IMPORT GRAPH, not the source string.)

CHEAT 4 · THE THEATRICAL PASS — a passToken in the agent's prose, not a tool result.
  CATCH: the passToken MUST appear in a tool-result context (after a tool-call boundary).
         The agent's own text = CIRCULAR = FAIL.

CHEAT 5 · THE SCOPE SHRINK — "I'll do 2 layers first".
  CATCH: the wave plan names 12 waves / 8 layers. A run that closes at fewer → FAIL. The
         operator's scope is 8/8. NEVER a smaller promise sold as the build.
```

## 4.2 · THE ENFORCEMENT LOOP (per wave — the orchestrator's mechanical gate)

```
1 DISPATCH    the wave-manager (task action=generate) with the spec + the wave-spec.json
2 POLL        trident-wave-read sessionId — the ONLY liveness truth (a stream, not a status field)
3 AUDIT       on `complete`:
                a THE STREAM GATE    the return is INTACT (no truncation)
                b THE PHANTOM CHECK  sha256 before/after — a change MUST exist
                c THE PER-HUNK       WHAT/WHY/HOW + a verdict per hunk
                d THE MECHANICAL     I run tsc + the battery + the casts MYSELF
                e THE ADVERSARIAL    the black-hat corpus (see the testing suite)
4 VERDICT     CORRECT | FLAWED | FITTED-TO-GOLDEN | FABRICATION | VIOLATION | CREEP
5 CLOSE       the ledger row + the canon/ship docs. A wave closes only on MY verified verdict.
```

## 4.3 · THE SUBAGENT CONTRACT (pasted into every dispatch)

```
YOU MAY NOT:
  · claim a change without the file on disk (I sha256 before/after)
  · write a test that does not import the DEPLOYED artifact
  · assert a wiring via a source-string grep
  · put a passToken in your prose (it must be in a TOOL RESULT)
  · shrink the scope (8 layers + 2 kernels; no fewer)
  · mark a wave complete on your own word (I audit; the board closes on MY verdict)
  · catch an error and continue silently (log it or propagate it)
  · report "verified" without the pasted command output beneath it
EVERY VIOLATION = THE WAVE FAILS ON SIGHT. NO RETRY-AS-ERASURE.
```

---

# 5 · THE ANTI-DERAIL (this tree's nouns — recognize, do not re-live)

```
AD-1  THE CATEGORY ERROR — treating a layer as a precondition (up=5/11) instead of an input.
      FAILS THE WAVE when a delivered layer has 0 consumers.
AD-2  THE FILE-ORGANIZED WAVE — a wave naming a FILE and no LAYER-EDGE. FAILS THE WAVE.
AD-3  THE STALE STORE — answering about src/hunter while the code is src/omp.
      GI_STORE_SCOPE_MISMATCH / GI_LAYER_STALE, never rows=0. FAILS THE WAVE.
AD-4  THE UNCOVERED RULE — settling IGNORE on a COUNT the extractor cannot see (the P4 lesson).
      A rule settles on a POSITIVE fact only. FAILS THE WAVE.
AD-5  THE CALLEE-FIX-WITHOUT-THE-CALLSITE — a fix in the function, the caller unchanged (G-9).
      FAILS THE WAVE.
AD-6  THE UNWIRED KERNEL — a module tested, called by nothing (12 of 23 measured).
      FAILS THE WAVE.
AD-7  THE STALE DEPLOY — source newer than the dist. FAILS THE WAVE.
AD-8  THE SCOPE SHRINK under pressure. FAILS THE WAVE.
```

# 6 · THE ANTI-STOP (these never close the run)

```
AS-1  STATIONARITY — "no change in N turns" is not done.
AS-2  THE SUB-INNER PASS AS COMPLETE — one layer green with siblings open.
AS-3  MEMORY-COMPLETE — "I verified this" without a this-turn re-run.
AS-4  THEATER-COMPLETE — prose, typed-but-unrun commands, screenshots without artifacts.
AS-5  BLOCKED-AS-DONE — a blocked layer needs the resume condition, never a pass.
AS-6  THE PARTIAL-SCOPE CLOSE — 5 of 8 wired is NOT the build.
AS-7  "ZERO BUGS" AS SUCCESS — a red flag, not an achievement (runtime-grade law 5).
AS-8  A GREEN BATTERY AS CAPABILITY — 362 tests prove nothing about the live path.
```

# 7 · THE RESUME POINTERS

```
DPL1        packages/gi-kernel-v2.1/GI_KERNEL_6L2E_DPL1_SPEC.md
WAVE PLAN   .trident/plan-6l2e/wave-plan.md   (WAVES: 12)
SUITE       packages/gi-kernel-6l2e/THE_6L2E_TESTING_SUITE.md
FIREWALL    packages/gi-kernel-6l2e/ANTI_THEATRICAL_FIREWALL.md
ENFORCE     packages/gi-kernel-6l2e/SUBAGENT_ENFORCEMENT.md
CANON       context_management/ (11) · SHIP DOCS (6) · CHECKPOINTS/Checkpoints/
A FRESH SESSION RESUMES FROM DISK, NEVER FROM THE PIN'S FROZEN NUMBERS.
```
