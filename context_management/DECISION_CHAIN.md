# DECISION_CHAIN — the operator's rulings, VERBATIM, with context + rejected alternatives

**The dist SHA: 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709**

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
