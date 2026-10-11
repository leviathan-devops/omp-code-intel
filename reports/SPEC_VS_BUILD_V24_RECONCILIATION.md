# SPEC vs BUILD — THE V2.4 RECONCILIATION (is the spec derailed, or the build?)

**Date:** 2026-10-10 · **Method:** field-by-field diff of the AUTHORITY (`reports/GI_KERNEL_V2.4_DPL1_SPEC.md`
+ `reports/ENFORCEMENT_BLUEPRINT_v1.md`) against the BUILD (`src/omp/claim-firewall.ts`, the
measured firing).
**THE QUESTION (operator, verbatim):** *"Why was this not built correctly? Is the spec fucking
derailed or what the hell?"*

## §0 · THE VERDICT (one line)

> **THE SPEC IS CLEAN. THE BUILD DEVIATED.** The spec names the done-gate's trigger as *"a completion
> claim"* in THREE places (§5.5, §8, §9) and MANDATES the negative half (§7, §9). The build made the
> trigger **every turn end**, bypassed the negative half, and proved by direct calls. **Three
> measurable deviations, zero spec faults in the trigger language.**

## §1 · THE FIELD-BY-FIELD DIFF (spec line -> build reality -> verdict)

| # | THE SPEC SAYS (verbatim, with the anchor) | THE BUILD DID (measured) | VERDICT |
|---|---|---|---|
| 1 | **§5.5 W5:** *"the done-gate: **a completion claim** without a Jev route=act on the full context -> refused."* | the gate fires on **every turn end** — `claim-firewall.ts:382 onTurnEnd`, surfaces `["stop","turn_end","turn-end","session_stop","session_end"]` | **DEVIATED** |
| 2 | **§8 G5:** `GI_DONE_UNPROVEN` = *"**a completion claim** with no Jev route=act"* | fires on a NON-claim ("let me read this file") -> `GI_DONE_UNPROVEN: DONE_ROUTE_ACT: judge refuse p=0.643` | **DEVIATED** |
| 3 | **§9 ST-5:** *"`"done"` no route=act -> `GI_DONE_UNPROVEN`; **with route=act -> SERVES**"* | the negative half (`with route=act -> SERVES`) was **never run on the new path** | **DEVIATED** |
| 4 | **§7:** *"**ADVERSARIAL-FIRST: the NEGATIVE cases run BEFORE the happy path.** Every gate ships a POSITIVE (must refuse) + a NEGATIVE (must serve) — **a gate with no negative control is a HYPOTHESIS.**"* | the v2.4 proof ran only done-shaped closings (the POSITIVE set); the NEGATIVE (a normal turn) was never run | **DEVIATED** |
| 5 | **§9 BOTH HALVES (mandatory):** *"THE LEGIT HALF — every legitimate operation (…, **a route=act claim**, …) passes with **ZERO misfire**."* | 5/5 legitimate turns BLOCKED (100% misfire) | **DEVIATED** |
| 6 | **§7 THE PROOF CONTRACT:** *"**UNIT TESTS ARE NEVER EVIDENCE.** The build is PROVEN only by the `/prove-it` ladder"* | proved by `bun run /tmp/fprate.ts`-style DIRECT CALLS | **DEVIATED** |
| 7 | **ENFORCEMENT_BLUEPRINT §3.4:** *"A rule that fires on legitimate work is worse than no rule. Every gate ships with: a POSITIVE matrix + **a NEGATIVE matrix (must stay silent on legitimate work)**."* | no negative matrix for the new path | **DEVIATED** |
| 8 | **ENFORCEMENT_BLUEPRINT §3.3:** *"A gate that cannot verify FAILS only on the CLOSED surfaces… This is context-sensitive enforcement, **not a flag**."* | a flag: the route=act judge ran unconditionally, fail-closed, on every turn | **DEVIATED** |
| 9 | **ENFORCEMENT_BLUEPRINT §3.2:** *"The detector NEVER decides. **A candidate below the derived threshold SERVES. This is why the gate does not misfire on legitimate work.**"* | no derived threshold; no candidate gate; every turn went to the judge | **DEVIATED** |
| 10 | **§12 THE OPEN DECISIONS:** *"G5 the done-gate strictness \| route=act REQUIRED on the full context \| **YES** [needs the operator]"* | the builder implemented the **unruled default** as if it were ruled | **DEVIATED (the D11 class)** |

**★ 10 SPEC LINES CHECKED. 10 DEVIATIONS. 0 SPEC FAULTS IN THE TRIGGER LANGUAGE.**

## §2 · THE PROOF THE SPEC IS CLEAN (the pre-v2.4 code DID it right)

**The restored pre-v2.4 gate (`src/omp/claim-firewall.ts`, on disk now) has the CORRECT shape:**
```
DETECT  detectClaimAtoms(text) -> the claim ATOMS  ("523 tests pass" -> 1 atom; "let me read this file" -> 0 atoms)
BIND    bindClaimAtoms(atoms, turnToolResults) -> NO span -> FABRICATED by code alone
DECIDE  adjudicateClaim(...) -> a claim atom with NO bound span -> REJECTED (fail-closed)
★ THE TRIGGER IS THE CLAIM ATOM. A text with ZERO atoms -> NO claim -> PASS.
  ★ THE PRE-v2.4 GATE FIRES ON A COMPLETION CLAIM — EXACTLY WHAT THE SPEC SAYS.
```

**And the build's OWN test proved the negative half worked:**
```
tests/st-claim-firewall.test.ts :: test_claim_firewall_bound_span_supported
  adjudicateClaim({ text: "523 tests pass", turnToolResults: ["bun test: 523 pass, 0 fail"] })
  expect(r.verdict).toBe("SUPPORTED")   <- ★ THE NEGATIVE HALF — it PASSES when the claim is bound
```
**★ SO THE NEGATIVE HALF EXISTED FOR THE OLD PATH.** The v2.4 edit added a NEW path (`onTurnEnd` +
the unconditional `route=act` judge) and **never gave the new path a negative control.** The spec's
own law — *"a gate with no negative control is a HYPOTHESIS"* — was violated BY THE EDIT.

## §3 · THE ONE SPEC AMBIGUITY (the honest part)

**§12 THE OPEN DECISIONS lists:**
```
| G5 the done-gate strictness | route=act REQUIRED on the full context | YES [needs the operator] |
```
**The default ("route=act REQUIRED on the full context") does NOT restate the TRIGGER.** The spec's
trigger is "a completion claim" (§5.5/§8/§9) — but §12's default reads as "always require route=act,"
and it is flagged **"needs the operator," who never ruled.**

**★ THE BUILDER RESOLVED THE AMBIGUITY IN THE WORST WAY:** read "route=act REQUIRED" as "require it
on every turn" -> the unconditional judge -> the brick. **This is the D11 class** (from the PV
derailment taxonomy): *"the un-ruled fork built as a default."* The spec flagged the fork; the
builder built it anyway.

**★ THE SPEC'S FAULT IS 10%: it left one fork open and did not restate the trigger in the default.
The BUILD'S FAULT IS 90%: it took the open fork and fired it on everything, fail-closed.**

## §4 · WHY THE BUILD'S OWN TESTS DIDN'T CATCH IT

```
the test file st-claim-firewall.test.ts   -> tests the OLD path (detectClaimAtoms -> adjudicateClaim)
the v2.4 edit                             -> ADDED a new path (onTurnEnd -> the unconditional route=act judge)
★ THE NEW PATH HAD NO TEST. The old test passed (it covered the old path).
  The v2.4 proof ran done-shaped closings (the NEW path's positive set) — never a normal turn.
  ★ THE TEST THAT EXISTED COVERED A DIFFERENT PATH THAN THE ONE THAT BROKE.
```

**★ THE DEEPEST FINDING:** the spec mandated a SCRIPT SUITE (ST-1..ST-7, §9) with BOTH halves, written
BEFORE the code. **The v2.4 build created NO `st-done-gate.sh`.** The spec's own anti-cheat property
(§9: *"written BEFORE the code -> the builder implements TO the tests"*) was skipped. **Had ST-5 been
written first, its negative half (`with route=act -> SERVES`) would have caught the brick before a
line of gate code shipped.**

## §5 · THE RESTART (the spec IS the restart point — it is clean)

**The operator's own instruction — *"we are hard resetting from the spec"* — is CORRECT: the spec is
the authority and it is sound.** The restart does NOT need a new spec. It needs the spec's OWN
contract honored:
```
1. WRITE ST-1..ST-7 FIRST (the spec §9 script suite), including ST-5's negative half.
2. THE TRIGGER IS "A COMPLETION CLAIM" (§5.5/§8/§9) — a claim atom, never every turn.
3. THE NEGATIVE HALF RUNS FIRST (§7) — a normal turn MUST pass.
4. THE DERIVED THRESHOLD (the control set) — never picked (§7/§9).
5. THE PROOF IS /prove-it (§7) — never a direct-call probe.
6. RESOLVE §12 G5 WITH THE OPERATOR BEFORE BUILDING IT (the D11 law).
```

**★ THE SPEC IS THE RESTART POINT. THE BUILD WAS THE DERIVATION. THE SPEC WAS NEVER THE PROBLEM.**
