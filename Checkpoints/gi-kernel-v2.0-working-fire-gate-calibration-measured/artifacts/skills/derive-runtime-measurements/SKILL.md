---
name: derive-runtime-measurements
description: "Turn an ABSTRACT target (\"the kernel must be intelligent\", \"the thresholds must function efficiently\", \"is it close to runtime-ready\") into CONCRETE MEASURED numbers, by building the instrument that produces the quantity instead of reasoning about it. Use when the operator says \"get accurate measurements\", \"what are these numbers based on\", \"what should they be\", \"how close is it\", \"prove it works\", \"measure X\", \"is this calibrated\", or when a constant/threshold/percentage has been a judgement call. Also use when a build's numbers are asserted (a green battery, a coverage percent, a score) and nobody has tested the DENOMINATOR. Do NOT use for running an existing test suite (that is script-test / container-testing) — this is for when the number does not exist yet and you must construct its measurement."
---

# Derive Runtime Measurements

## THE LAW

```
AN ABSTRACT TARGET HAS AN ANSWER. THE JOB IS TO BUILD THE INSTRUMENT
THAT PRODUCES IT — NOT TO REASON ABOUT IT, AND NOT TO CHOOSE A NUMBER
THAT SOUNDS RIGHT.

"sounds right"          → a constant wearing the clothes of a design
"we'll calibrate later" → the calibration debt, unpaid at ship time
"that's my choice"      → the admission that no instrument was built
```

The failure this skill kills: **a number that reads as measured but is not.** In the instance that minted this skill, six thresholds sat in architecture docs, SC tables and a package audit beside genuinely measured values — and the operator had to ask *"what are these numbers based on"*. The answer was "my choice, chosen for coherence". The instrument existed but had never been run.

**THE TEST BEFORE SHIPPING ANY NUMBER:** name the command that produced it. If there is no command, there is no number — there is a preference.

---

## THE SEVEN STEPS

### 1 · NAME THE ABSTRACT TARGET AS AN ANSWERABLE QUESTION

An abstract target is not measurable; a question is. Rewrite it until a quantity is named.

```
ABSTRACT                            QUESTION WITH AN ANSWER
"the kernel must be intelligent"    at what P(real) does a fire become right?
"it should function efficiently"    what n resolves the precision to ±0.10?
"is it close to runtime-ready"      which components have a live receipt?
"the tests are green"               green IN WHICH ENVIRONMENT, with what state?
```

If you cannot write the question, you do not yet understand the target — and every number you would produce is a guess wearing a label.

### 2 · FIND THE DECIDABLE DENOMINATOR

For the question, name **what is counted, over what population, from what source.**

```
┌──────────────────────┬────────────────────────────┬─────────────────────────┐
│ the quantity          │ the denominator            │ the source              │
├──────────────────────┼────────────────────────────┼─────────────────────────┤
│ a threshold           │ the labelled firing corpus │ the ledger + a harness  │
│ a coverage percent    │ the ENUMERATED items       │ the spec's own list     │
│ an accuracy           │ the paired cases           │ the instrument's run    │
│ a latency             │ the operations, measured   │ the real process        │
└──────────────────────┴────────────────────────────┴─────────────────────────┘
```

**THE DENOMINATOR IS THE WHOLE JOB.** A percentage without its denominator is a rumour. Two denominators that look alike but measure different populations (the host vs the container; the fixture vs the live store) will produce two contradictory "measured" numbers — and the one that looks better is the one that will be published.

### 3 · BUILD THE INSTRUMENT — CODE, NOT PROSE

The instrument is a runnable thing that emits the number. Three shapes cover most cases:

```
A · THE PAIRED CORPUS      for discrimination questions.
    every TRUE case gets a FALSE twin that differs ONLY in the dimension
    under test. If the twins differ in two ways, you have measured neither.
    → run it, get the separation, sweep the threshold, read the ROC.

B · THE LIVE PROBE         for "does this actually work" questions.
    call the real thing (the real API, the real store, the real container)
    and record what comes back. Stubs measure the stub.

C · THE COUNTED INVENTORY  for "where are we" questions.
    enumerate EVERY item from the spec, then classify each against the
    live artifact. The denominator is the enumeration, never an estimate.
```

**HARD RULES for the instrument:**
- **real inputs, never synthetic** — a number from synthetic data measures your imagination
- **a label for every case** — an unlabelled case cannot produce precision, only a distribution
- **the instrument is code and it can be wrong** — if a result contradicts a proven fact, suspect the instrument before the world
- **state the cost** — token cost, wall time, dollars, so the measurement can be re-run cheaply

### 4 · RUN IT ON REAL DATA, AND RECORD THE RAW OUTPUT

Paste the run. Every number in the conclusion cites a line in the output. A measurement summarized rather than pasted is a claim again.

### 5 · CONFRONT THE NUMBER WITH THE ASSUMPTION — THE DELTA IS THE FINDING

This is the step that produces value, and it is the one people skip.

```
BEFORE the run:  write down what you EXPECT the number to be.
AFTER  the run:  compare.
                 the DELTA is the finding, not the number.

no delta?       either the assumption was already measured (rare), or the
                instrument is measuring what you assumed (common trap:
                a fixture built from the same belief it is meant to test).
```

**In the worked instance below, the assumed thresholds were off by ~2× and the direction was wrong.** Without the expectation written first, the same output would have been read as "the thresholds are roughly fine".

### 6 · DERIVE, DO NOT CHOOSE

The value comes out of the measurement, and where a policy must enter, it enters as a NAMED, STATED input — not as a vibe.

```
t = C_false_block / (C_false_block + C_missed)

  the OPERATOR owns C_block and C_missed (their risk appetite — a taste/priority
  call, legitimately theirs).
  the MEASUREMENT owns the curve those costs are applied to.
  NEVER let a cost asymmetry be invented by the agent: state the costs you used
  and who set them, or the derived number is a hidden opinion.
```

And **per-population, never global**: a threshold for "stopping legitimate work" and a threshold for "shaping advice" are different numbers. One global constant is the tell that the instrument was never run per-class.

### 7 · RECORD THE MEASUREMENT AND ITS COST OF ERROR

The run goes to the durable record (the log, the doc, the ledger) with: the instrument, the raw output, the derived value, **the assumption it replaced**, and **what the wrong assumption would have cost**. That last field is what makes the next person take the instrument seriously.

---

## THE WORKED INSTANCE (real, 2026-09-21)

```
ABSTRACT TARGET   "what should the thresholds be for the runtime kernels to
                    function efficiently"
```

**Step 1 — the question:** *at what P(real) does a firing become right, per class?*

**Step 2 — the denominator:** the labelled firing corpus, from live judgments.

**Step 3 — the instrument:** `src/omp/measure-fire-gate.ts` — 7 paired cases (each TRUE violation with a FALSE twin differing only in CONTEXT), fired through the **live** Jev API (the same endpoint production uses), scored by the gate, swept across thresholds.

**Step 4 — the raw run:**
```
real violations : n=7 mean P=0.581 min=0.490
false positives : n=7 mean P=0.253 max=0.530
SEPARABLE (min(real) > max(fp)): false

  t      TP  FP  FN  TN   precision  recall
  0.20    7   4   0   3   0.636     1.000
  0.40    7   1   0   6   0.875     1.000
  0.55    5   0   2   7   1.000     0.714
  0.60    3   0   4   7   1.000     0.429
  0.70    0   0   7   7   1.000     0.000   <- STARVATION
  BEST F1=0.933 at t=0.40
```

**Step 5 — THE DELTA (the finding):**
```
ASSUMED  act=0.90 destructive · 0.75 dumb · 0.85 theatrical
MEASURED best F1 at t=0.40; NO real violation scored above 0.65; at the
         assumed bars the act band fired ZERO times — the starvation trap,
         measured, on a corpus of 14

⇒ the seeds were ~2x too high AND the direction was wrong: Jev's absolute
  probabilities for clear violations sit near 0.5-0.6, not 0.9. An intuitive
  bar ("block only at 90 % sure") would have produced a gate that never fires
  and a ledger that looks calm while every violation passes.
```

**Step 6 — the derivation:** `t = C_block/(C_block+C_miss)` per class, with the operator's costs as the input, and the fire floor from the interval: `n = 49` resolved firings to resolve a 0.10 gap at p≈0.85 (the honest answer to "10 fires is not enough").

**Step 7 — the record:** the thresholds marked UNCALIBRATED, the assumption named, and the cost of error written down: *a gate that never fires is indistinguishable from a gate that is working — until the violations land.*

---

## THE COMPANION NUMBERS (carry these in every derivation)

```
WILSON INTERVAL    for a proportion from counts — the correct interval near
                   0/1 and at small n, where the normal approximation lies.
                   half-width ≈ z*sqrt(p(1-p)/n)
                   n to resolve a gap g at p≈0.85:  g=0.20→13, 0.15→22,
                   0.10→49, 0.05→196
                   ⇒ "10 fires" looks measured and cannot tell 0.90 from 0.72.

COST-DERIVED CUT   t = C_block/(C_block+C_miss)
                   equal 0.50 · block 4x 0.80 · block 10x 0.909 · miss 3x 0.25

THE TWO TRAPS      INFLATION: copying a reported bar (someone's 0.95) without
                   calibrating on your data.
                   STARVATION: a bar so high the act band never fires — you pay
                   for every judgment and use none. Symptom: flag rows pile up,
                   act rows are zero.
```

---

## ANTI-PATTERNS

| The anti-pattern | Why it fails | The fix |
|---|---|---|
| **Choosing a number that sounds right** | it is a preference in a measurement's clothing | step 3: build the instrument, or label it a preference |
| **Inheriting another system's default** | its corpus is not yours; its thresholds are not calibrated here | derive, or state explicitly that it is inherited and uncalibrated |
| **Deferring as "an open question"** | often decidable from artifacts you already hold | check decidability first: if a read settles it, decide and state the basis |
| **A green number published for the wrong population** | the host battery vs the container is the measured instance | state the environment IN the number, and re-run where the contract says |
| **Measuring against a fixture built from the belief** | it confirms the assumption by construction | the twins must differ in ONE dimension, and from real data |
| **A percentage with no denominator** | unanswerable, unfalsifiable | step 2 |
| **One global threshold for asymmetric costs** | two decisions with different cost ratios share a bar | derive per class |
| **Not writing the expectation first** | the output is retro-fitted as "about right" | step 5, before the run |
| **Summarizing the run** | it is a claim again | paste the raw output |
| **Leaving the derived value in a chat** | it decays; the next session re-guesses | step 7: the durable record, with the cost of error |

---

## TROUBLESHOOTING

- **"There is no data to measure from."** Then the first measurement is the INVENTORY (instrument C): enumerate every item the target names, classify each against the live artifact. A count of 0 measured of 12 is a measurement.
- **The numbers contradict a proven fact.** Suspect the instrument. In the instance above, an instrumented run and a standalone probe disagreed on the same file — the instrument's module graph was the cause, not the code.
- **The measurement is too expensive.** Measure a bounded slice and SAY the slice — a 14-case corpus is a real measurement of 14 cases, reported as such. Never inflate it into a claim about the population.
- **The operator's costs are unknown.** Ask for them WITH context (see the `copilot-intelligence` thread's rule: what it is · why it exists · the options with consequences · your default · what is blocked). Never invent the asymmetry — an invented cost is the hidden opinion the derivation was meant to remove.
- **The derived value disagrees with a deployment that works.** Do not silently override the measurement. Record the disagreement as a finding and investigate which denominator is wrong.

---

## THE ONE-LINE VERSION

**An abstraction is a question you have not asked yet; a number is an answer you have not measured yet; the delta between what you assumed and what the instrument returned IS the finding — build the instrument, write the expectation first, and paste the run.**
