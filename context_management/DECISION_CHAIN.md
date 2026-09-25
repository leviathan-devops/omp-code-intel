# DECISION_CHAIN — the operator's rulings, VERBATIM, with context + rejected alternatives

**The dist SHA: b7f27f700573c7fabcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24bcdede796c36144c4c5ea5ca05a4b6e44fb29dc242c48f24cf5e3903f63bfd3d0a846e3d83b39917d05d1c3e65b1b001e9f97a81a179fd995cfac412934e55c170e87a46740123fc062390e2a74c9030bf00c3300eb6afd144d39503509340e0506a15c873a3df28324da8eb35147460074279422bb7db7d0d2cf04f7a0bcf4a335244102fff15275fbdfa0c9392d50cbc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21babc51fad7a35b749d7ea871cc1f525a27f959d6f01c1c21baf927aeb9dfeaa067fd92327bfa26cc791740ad33901041e1c94c40a329ae170ba29f71b3c63c7f258b9b948ce09c8854ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2ef5da5ceaf9505520e8858ba5bb49a8815aac6deb5b9c0c2766927d21049bf60cfe0d99c2a242316e9e4fc04937e586a9f81e73e50cdea59102b27d8fc2a108db8e380a7dddf045f**

## D-01 · THE THREE VIOLATION CLASSES (2026-09-21)

```
RULING (verbatim):  "THE AGENT MAY NOT DO ANYTHING DESTRUCTIVE."
                    → "destructive, dumb, or theatrical. explicitly all 3 of these."
                    → "dumb and theatrical is 80% of the kernel's work. destructive
                       rarely happens. the main issues are theatrical and fucking stupid."
CONTEXT:  the v2.0 build had framed the kernel around destruction prevention. The operator
          reweighted it: the rare case is destruction; the daily case is lying and stupidity.
RATIONALE:  the measured evidence AGREED — of the six parked TTSR kernels, FIVE were
            dumb/theatrical and ONE destructive (83% / 17%).
ALTERNATIVES REJECTED:
  · keep the destruction-first framing → would have built the wrong 80%.
  · add dumb/theatrical as detectors only → would have missed that they need a JUDGE, not a
    matcher (a shape is not a violation).
DOWNSTREAM:  the three-class architecture; the fire gate; the detectors as a separate stage.
```

## D-02 · THE HARD-DEPENDENCY LAW (2026-09-21)

```
RULING (verbatim):  "NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK. HARD DEPENDENCIES
                     ON EVERYTHING. LOUD FAIL CRASH IF ANYTHING IS NOT WORKED W/ CLEAR
                     ERROR CODES"
CONTEXT:  the E2 agent had flagged a license; the operator was reacting to the general
          softness of the stack's error handling.
RATIONALE:  a fallback produces a DIFFERENT artifact and calls it success — false success.
ALTERNATIVES REJECTED:  · a degraded mode ("use the regex if the engine is down") → banned
                        by the F-48 law already.
DOWNSTREAM:  hard-deps.ts; the register; GI_STACK_INCOMPLETE; the measured consequence
             (registering the gate before the engines refuses every tool call).
```

## D-03 · THE LICENSE NON-ISSUE (2026-09-21, PERMANENT)

```
RULING (verbatim):  "literally everything i do is personal use only this doesnt apply.
                     never ever pay attention to anything like this ever again. if it
                     exists on github we can use it. period."
CONTEXT:  the E2 agent flagged arsumbris's "Sustainable Use License" as a legal blocker.
RATIONALE:  personal use; the blocker was noise that cost a round.
DOWNSTREAM:  NEVER raise a license/OSI/copyleft status as a blocker or risk. Any rule that
             treats it as a finding is superseded.
```

## D-04 · THE MEASUREMENT LAW (2026-09-21)

```
RULING (verbatim):  "2) get proper measurements for everything. no guesses"
CONTEXT:  the operator asked "what are these numbers based on" about the tier thresholds;
          the answer was "my choice, chosen for coherence".
RATIONALE:  a chosen constant printed beside a measured one borrows its authority.
ALTERNATIVES REJECTED:  · a disclaimer on the chosen numbers → would have left the 2x error
                        in place, correctly labelled and still fatal.
DOWNSTREAM:  the calibration machinery; the M1-M12 plan; the minted skill
             derive-runtime-measurements; the 14-case instrument.
```

## D-05 · THE GATE IN BOTH POSITIONS (2026-09-21)

```
RULING (verbatim):  "1) both"   (asked: the gate BEFORE the act, or as a filter on the
                                 detector's output?)
CONTEXT:  the blueprint's §13 named the fork.
RATIONALE:  a pre-act advisory can steer for free; the post-detector filter has the detector's
            evidence. They answer different questions.
DOWNSTREAM:  W3 (the pre-act advisory, fail-OPEN, landing first because it cannot break
             anything) + W4 (the post-detector filter, per-surface polarity).
```

## D-06 · THE QUESTION-CONTEXT LAW (2026-09-21)

```
RULING (verbatim):  "make a note that whenever you ask me questions, you always provide the
                     relevant context with that question i would need to make a decision."
CONTEXT:  the status report shipped "1. Which engine is the oracle (E1)?" with no definition
          of the oracle and no consequence table — the operator had to ask what it meant.
RATIONALE:  a question without context is a question-shaped burden; it COSTS a round instead
            of saving one.
DOWNSTREAM:  the copilot-intelligence thread's first entry; the 5-part question shape
             (what it is / why it exists / the options with consequences / my default /
             what is blocked).
```

## D-07 · THE CONTAINER LAW (2026-09-21)

```
RULING (verbatim):  "CONTAINER. THATS WHY ITS THERE."
CONTEXT:  7 RB rows minted against omp-ct:master had been run HOST-side and marked PASS.
RATIONALE:  a host green proves the code works on a machine that has been lived in.
THE COST:  the container then produced 136 pass / 9 fail / 3 errors and found TWO real
           defects the host had hidden.
DOWNSTREAM:  the container is the rig of record; F-53; THEATRICALITY T-01.
```

## D-08 · OTHER OPERATOR STATEMENTS OF RECORD

```
"each fire should be < 5000 tokens of data realistically. these are high frequency micro
 decisions not big macro spec level deicsions"
   → the 18_000-byte state cap (fire-gate.ts:139); the economics check (DPL1 S18).
"100 times per session across 5 parallel session per day = 500k tokens a day, costs me
 literally 2 cents"
   → the scale envelope is ACCEPTED; the cost is negligible.
"wire this mfer in its exactly what we need. ltierally designed for embedded systems
 intelligence like runtime kernels."
   → the v2.1 mandate: Jev as a legit runtime kernel intelligence.
"there is NO third substrate. When neither is available the populate fails loudly"
   → the F-48 law (populate.ts:21), carried into the register.
```

## D-09 · THE CONSISTENCY-DOCTRINE RULINGS (cross-cutting, from earlier sessions)

```
"NO IDEAS ORIGINALITY, MINDSET OR CREATIVITY"
   → faithfulness over novelty; the bible and the spec are the authorities.
"we are not doing anything here that is not already done in other places"
   → the machinery is extraction + wiring, not invention. A novel component is a red flag.
"i dont want any spaghetti code or rat nests"
   → the minimal-change discipline; the frozen surfaces stay frozen.
"a builder that deletes a test to make it pass is not a builder"
   → a fix that weakens a gate is worse than the bug.
```

## D-10 · THE MEASUREMENT-DISCIPLINE RULINGS

```
"get accurate measurements"  → the 14-case instrument; the 2x finding; the skill.
"what are these numbers based on and what should they be for the runtime kernels to
 function efficiently"
   → the derivation law: t = C_block/(C_block+C_miss) from a COST MATRIX (the operator's)
     with the curve from the corpus (the measurement's). The Wilson interval for the floor.
"make sure this is fully documented in all releavnt ship docs w/ complete detail. start it
 as critical and important, link the minted skill"
   → BUILD_REPORT marked CRITICAL/IMPORTANT; the semantic index keywords; the skill link.
```

## D-11 · THE ARCHITECTURE RULINGS (the v2/v2.1 shape)

```
"Then what we need is an execution graph that can properly absorb/observe runtime data,
 index everything against these graphs to detect violations, and then enforce behavior and
 keep its own separate enforcement graph - THAT is where TSG comes in + this new abide
 enforcement kernel"
   → the enforcement kernel; the separate enforcement graph; TSG as the load unit.
"shape trigger --> jev algorithm --> MPSE assisted jev score --> decision point for fire -->
 fire/ignore"
   → THE v2.1 SHAPE, verbatim. The fire gate IS this sentence.
"this sounds like exactly what jev is built for ... ltierally designed for embedded systems
 intelligence like runtime kernels"
   → Jev as the co-processor; the <5000-token budget.
"TSG and Abide ... both jev powered"
   → the two enforcement layers.
```

## D-12 · THE REJECTED ALTERNATIVES LEDGER (what was considered and killed)

```
KILLED  a regex/indexer substitute for a down engine — the F-48 law forbids it.
KILLED  a disclaimer on the uncalibrated thresholds — it leaves the 2x error in place.
KILLED  running the container rows host-side — the container is the contract (F-53).
KILLED  asserting the mutant's behaviour as a mutation proof (T8's original body).
KILLED  a module-level test fixture reload — the afterEach undoes it (measured 198/1).
KILLED  an in-memory-only reflex store — the guarded seam requires persistence.
KILLED  gi_exec_graph — a name with no code.
KILLED  a manifest-only checkpoint lock — a partial lock lies (the operator's ruling).
DEFERRED the verdict cache — a cache of a CERTIFIED verdict is not a fallback; a cache
         consulted WHEN A LAYER IS DOWN is. Needs an explicit ruling.
DEFERRED E1 (the oracle's engine) — v3, not v2.1.
```

## D-13 · THE THREAD-INTERFACE RULINGS (the copilot behaviour)

```
"make sure whenever you ask me questions, you always provide the relevant context with that
 question i would need to make a decision"
   CONTEXT: the status report shipped a bare "Which engine is the oracle (E1)?". The operator
   had to ask what the oracle and E1 ARE — the question COST a round instead of saving one.
   THE LAW: every question carries (1) what the thing is (2) why it exists / the flow it
   sits in (3) the options with the concrete consequence of each (4) my recommended default
   (5) what is blocked until they rule.
   DOWNSTREAM: the copilot-intelligence thread's first entry; D-11's question shape.

"document this in the relevant threads. create a new 'copilot-intelligence' thread - make
 this the first entry in it"
   CONTEXT: the ruling above.
   DOWNSTREAM: omp/copilot-intelligence (log) created with the standing rule as entry #1;
   a cross-reference appended to omp/copilot-agents. The SPLIT OF CONCERNS: copilot-agents
   carries the agent-side machinery; copilot-intelligence carries the BEHAVIOURAL rules
   toward the operator.

"a note that whenever you ask me questions ... I would need to make a decision"
   THE SECOND-ORDER LAW: if the evidence I already hold decides it, DECIDE IT and state the
   decision + its basis. The operator rules on what is genuinely theirs (taste, priority,
   spend, risk appetite) — never on what a read could settle.
```

## D-14 · THE THEATRICALITY RULINGS

```
"log all theatricality data in the failure logs" + "create a new doc and update the skill
 to include a theatricality log as part of the ship docs"
   CONTEXT: the container substitution (a claimed pass from the wrong rig).
   THE DELIVERABLE: THEATRICALITY_LOG.md — an append-only journal of every artifact whose
   FORM is verification standing in for verification, on subagents AND on the agent itself,
   with the disposition field (SELF-CORRECTED / OPERATOR-CAUGHT / BLOCKED-OPEN).
   THE METRIC: the OPERATOR-CAUGHT count is the number to drive to ZERO.
   THE SKILL: ship-docs-update now carries 6 docs + GATE S8 (a ship-ready claim with an
   unrecorded OPERATOR-CAUGHT act = FAIL).
   THE ROOT PATTERN (the log's own finding): one mechanism under all eleven entries — an
   artifact whose form is verification standing in for verification.
```

## D-15 · THE SKILL-AUTHORING RULING

```
"mint a skill on how to properly derive measurements for a codebase architecutre based on
 an abstract target like we are doing right now. document the meta process once you
 successfully execute it"
   CONTEXT: after the calibration run succeeded.
   THE DELIVERABLE: derive-runtime-measurements (a managed skill, 224 L body) — the 7-step
   meta-process, the worked instance verbatim, the Wilson/cost tables, 10 anti-patterns.
   THE LAW THE SKILL CARRIES: an abstraction is a question you have not asked yet; a number
   is an answer you have not measured yet; the DELTA between what you assumed and what the
   instrument returned IS the finding.
```

## THE FILE:LINE ANCHORS (where each ruling landed in the code)

```
D-01 the three classes        src/omp/kernel-v2.ts:138/:155/:173  (dumb · theatrical ·
                              destructive — the three detectors)
D-02 no fallbacks             src/omp/hard-deps.ts:144           (requireUp THROWS)
D-04 the measurement law      src/omp/calibration.ts:38          (thresholdFromCost)
                              src/omp/calibration.ts:118         (derivePolicy + the basis)
D-05 the gate in both places  src/omp/fire-gate.ts:262           (judge — both positions
                              call it; W3 builds the intent Fire, W4 the post-detector one)
D-06 the question-context law ~/.omp/threads/store.sqlite          (omp/copilot-intelligence)
D-07 the container law        .trident/ct-v2/cycle-1/             (the RB evidence)
D-08 the F-48 law             src/omp/populate.ts:21              ("There is NO third substrate")
D-11 the v2.1 shape           src/omp/fire-gate.ts:196            (mpsePreFilter — the
                              "shape trigger → jev → score → decision" sentence)
                              src/omp/fire-gate.ts:354            (the band + the action)
                              src/omp/jev.ts:72                   (the live model call)
D-13 the thread interface     ~/.omp/threads/store.sqlite          (the standing-rule entry)
D-15 the skill                ~/.omp/agent/managed-skills/derive-runtime-measurements/
```
