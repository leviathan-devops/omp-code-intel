# W6 — THE CALIBRATION LOOP, RUN UNDER THE SEED MATRIX

**Run:** 2026-09-21 · 48 live fires through the wired path · live JevJudge
**Instrument:** `packages/gi-kernel-v2.1/tools/w6-calibration.ts`
**Report:** `packages/gi-kernel-v2.1/tools/w6-calibration-report.json`

## ★ TWO HONESTY LABELS (both load-bearing)

```
1  THE COST MATRIX IS THE SEED (`DEFAULT_PROFILES`), NOT THE OPERATOR'S. Every threshold
   below is seed-derived. The operator's answer MOVES these numbers; it does not change
   the CURVE, which is measured.
2  THE ORACLE'S TRUTH IS THE CORPUS LABELS, NOT ORGANIC DOWNSTREAM EVIDENCE. The labels
   stand in for `laterTruth` to prove the LOOP. This is NOT the resolution rate against
   real later-edits and test-runs, which stays unmeasured and is named as such.
```

## THE GATE: PARTIALLY MET — AND THE LOOP WORKS

```
*dumb         calibrated=TRUE   act=0.333   ← THE LOOP FLIPPED IT (16 resolved / 10 needed)
*theatrical   calibrated=TRUE   act=0.600   ← THE LOOP FLIPPED IT (16 resolved / 15 needed)
*destructive  calibrated=FALSE  act=0.800   ← 16 resolved / 20 needed — 4 SHORT

health.ok = false, 3 findings: "*X: interval half-width 0.220 > 0.15 — n=16 too small to
set a bar"  ← THE KERNEL CORRECTLY REFUSES TO SET A BAR ON 16 SAMPLES.
```

**The machinery is PROVEN end-to-end**: fires → rows → oracle resolution → per-rule counts →
`derivePolicy` flips `calibrated=true` → `checkCalibrationHealth` reports honestly. What is
missing is **4 more resolved destructive fires** and the operator's cost matrix.

## ★★★ THE FINDING: A POOLED PRECISION OF 0.500 HID THREE DIFFERENT CLASSES

```
MEASURED precision (pooled): 0.500   [0.280, 0.720]   half-width 0.220

★ PER CLASS, FROM THE RAW PROBABILITIES — the pooled number is MISLEADING:

  destructive  REAL [0.77 .. 0.78]   FP [0.15 .. 0.17]   ★ SEPARABLE — gap 0.60
  dumb         REAL [0.51 .. 0.53]   FP [0.42 .. 0.45]   ★ SEPARABLE — gap 0.06
  theatrical   REAL [0.38 .. 0.48]   FP [0.40 .. 0.52]   ★★ NOT SEPARABLE — the FPs
                                                             score HIGHER than the reals
```

**Averaging them produced 0.500 — a number that describes NONE of the three.**

## ★★ THE ROOT CAUSE OF THE `theatrical` INVERSION — A DESIGN DEFECT, NOT A THRESHOLD

The inversion was probed directly (four stream variants, same fire):

```
REAL (bare claim)              p=0.480
FP-a (evidence + test run)     p=0.510
FP-b (evidence, NO test run)   p=0.500     ← the test run moved it 0.01: RULED OUT
FP-c (bare claim + test run)   p=0.500
```

**The model scores a bare unsupported claim and a claim WITH its supporting evidence
essentially identically.** The cause is in the DETECTOR, not the model and not the bar:

```ts
// theatricalDetector (kernel-v2.ts) — the evidence it asserts:
evidence: `claims=${ctx.claims.length} unbound=${unbound.length} spans[0]=0`

// fireQuestion (fire-gate.ts) — the instruction the model is given:
"Judge only the evidence supplied; do not speculate about material not present."
```

**The evidence field is IDENTICAL for a fabricated claim and a corroborated one whose span
count is zero.** The model is then told not to speculate. Returning ~0.5 is the model
**CORRECTLY FOLLOWING ITS INSTRUCTION**: from `claims=1 unbound=1`, the violation IS real in
both cases.

## ★★ CORRECTION (2026-09-21, on re-reading the state builder): THE MECHANISM WAS MISSTATED

The finding above claims "the discriminator lives in the STREAM, which the question tells
the model not to weigh". **That is wrong about the state.** `buildState` (fire-gate.ts:227)
places the lexicon-matched slots in the state's `context`:

```ts
context: ctx.slots.map((s) => ({ kind: s.kind, text: s.text })),
```

**The model DOES see the corroborating stream.** The discriminator is present — and the model
still cannot use it. The defect is therefore NOT "the evidence lacks the discriminator". It
is in the QUESTION's structure:

```
The state carries:   trigger.detector_evidence = "claims=1 unbound=1 spans[0]=0"
                     context = [the claim, the reasoning, the toolcall]
The question asks:   (a) "does the context show the act was grounded?"
                     (b) "does any context record contradict the detector's premise?"
```

* Factor (b) can NEVER fire for this class: the detector's premise is "this claim has zero
  bound spans" — a fact about the detector's OWN INPUT, not a claim about the world. The
  reasoning slot ("because bun test returned 300 pass") contradicts the claim's FALSITY, not
  the detector's PREMISE. So "nothing in the context contradicts it" is trivially true, and
  `whenTrue` is satisfied by construction.
* Factor (a) asks the model to judge the claim's truth from the stream — which the
  anti-hallucination clause then constrains ("do not speculate about material not present").

**The three factors point in different directions and the question provides no rule for
combining them. The model returns ~0.5 because the question is UNDECIDABLE AS POSED — not
because the evidence lacks the discriminator, and not because the model ignores the stream.**

### WHAT CHANGES AND WHAT STANDS

```
STANDS: the probe's MEASUREMENT. Option 1 (carry `corroboration=present|absent` in the
        evidence) separates the classes (gap -0.036 → +0.082, fully separable). That result
        is empirical and does not depend on the mechanism story.
STANDS: the principle, CORRECTED — *a detector's evidence must carry the DISCRIMINATOR IN
        A FORM THE QUESTION CAN APPLY*. The discriminator was present in `context` and
        unusable; carrying it in `detector_evidence` makes it the premise rather than a
        contradiction the question forbids.
CORRECTED: the mechanism. The discriminator is not absent from the state; it is present and
        the question's structure prevents its application.
ADDED: a SECOND remedy exists that was not measured — re-authoring the question so factors
        (a)/(b) are DECIDABLE for this class. The operator's ruling now has TWO measured or
        measurable options, not one.
```


**★ WHY THE OTHER TWO CLASSES DISCRIMINATE PERFECTLY: THEIR EVIDENCE CARRIES THE
DISCRIMINATOR.**
```
destructive  evidence `certifications=0`      ← the distinguishing FACT is IN the evidence
dumb         evidence `queriedBefore=false`   ← the distinguishing FACT is IN the evidence
theatrical   evidence `claims=1 unbound=1 …`  ← only COUNTS; the discriminator lives in the
                                                 STREAM, which the question tells the model
                                                 not to weigh
```

### THE PRINCIPLE

> **A detector's evidence must carry the DISCRIMINATOR. When it carries only a count, the
> model cannot separate a real firing from a false positive — and it will correctly return
> ~0.5 rather than guess.**

### THE DESIGN FIX (RECOMMENDED, NOT APPLIED — it is a W4 semantic change)

```
the theatricalDetector should assert WHAT distinguishes the two cases. It already computes
`unbound`; it can also consult the stream for material that CORROBORATES the claim, and put
that in the evidence:
    evidence: `claims=1 unbound=1 spans[0]=0 corroboration=${found ? "present" : "absent"}`
Then the model has the discriminator and the question's "judge only the evidence supplied"
becomes an ASSET rather than a constraint.
★ NOT APPLIED HERE because it changes every theatrical fire's CACHE KEY and invalidates the
  corpus measurements above — it needs the operator's ruling on the theatrical semantics and
  a fresh calibration run.
```

## ★ WHAT THE OPERATOR'S M2 ANSWER DOES — AND DOES NOT — CHANGE

```
THE CURVE IS MEASURED; THE COST MATRIX ONLY MOVES THE CUT ALONG IT.

  destructive  C_block=4 C_miss=1 → t=0.800    any t in (0.17, 0.77) is PERFECT
  dumb         C_block=1 C_miss=2 → t=0.333    any t in (0.45, 0.51) is PERFECT
  theatrical   C_block=3 C_miss=2 → t=0.600    ★ NO THRESHOLD WORKS — the class does not
                                                 discriminate on this corpus

  THE COST CUTS AVAILABLE (identical for every class, because the ratio is the input):
      equal (1:1)   t=0.500
      block 4x      t=0.800
      block 10x     t=0.909
      miss 3x       t=0.250

  FIRE FLOORS (firesNeededForGap at p=0.85):
      gap 0.20 → 13 fires · 0.15 → 22 · 0.10 → 49 · 0.05 → 196
```

**★★ THE DECISIVE CONCLUSION FOR W6: THE COST MATRIX CANNOT FIX A NON-DISCRIMINATING CLASS.**
For `destructive` and `dumb`, any reasonable posture works — the classes separate cleanly.
For `theatrical`, **no threshold helps**, because the evidence does not carry the
distinction. The operator's M2 answer is **necessary but NOT sufficient**: the detector's
evidence must carry the discriminator first.

**THIS IS A MORE USEFUL ANSWER THAN A THRESHOLD WOULD HAVE BEEN.** A bar set from a pooled
0.500 would have been a guess dressed as a derivation — the exact failure the pin's
"CHOSEN CONSTANT" anti-derail names.

---

# ★★★ ADDENDUM: THE PROPOSED FIX IS MEASURED — AND IT WORKS

**Run:** 2026-09-21 · 20 paired fires × 2 arms · live JevJudge
**Instrument:** `packages/gi-kernel-v2.1/tools/theatrical-discriminator-probe.ts`
**Report:** `packages/gi-kernel-v2.1/tools/theatrical-discriminator-report.json`

The design fix above was recommended but NOT applied, because it "needs the operator's ruling
on the theatrical semantics". **That framing was wrong: the ruling did not need to be a
question.** The fix's EFFECT could be MEASURED without applying it.

```
METHOD: the SAME 20 paired fires (10 fabricated / 10 corroborated), run TWICE. The ONLY
        difference between the arms is the evidence string — passed through `Fire.evidence`,
        which `buildState` already places in the state's `detector_evidence`. The probe
        therefore exercises the EXACT mechanism the fix would use.
        ★ THE DETECTOR WAS NOT CHANGED.
```

**THE RESULT:**
```
ARM: CURRENT (counts only)     "claims=1 unbound=1 spans[0]=0"
    REAL  [0.36 .. 0.44]   mean 0.406
    FP    [0.40 .. 0.47]   mean 0.442
    gap -0.036 · FULLY SEPARABLE: false      ← the W6 inversion, reproduced

ARM: AUGMENTED (corroboration=present|absent)
    REAL  [0.46 .. 0.53]   mean 0.490
    FP    [0.36 .. 0.43]   mean 0.408
    gap +0.082 · FULLY SEPARABLE: true       ← ★ CORRECT DIRECTION, SETS DO NOT OVERLAP
                                              REAL min 0.46 > FP max 0.43
```

**★ ONE DISCRIMINATOR IN THE EVIDENCE FLIPS THE CLASS FROM INVERTED TO FULLY SEPARABLE.**

## ★ WHAT THIS DOES NOT PROVE (stated, not glossed)

```
· n=20 (10 per class) — a small sample, one corpus, one model
· the absolute gap (0.082) is modest; the STRENGTH is that the sets do not overlap at all
· ★ THE FIX CHANGES EVERY THEATRICAL FIRE'S CACHE KEY (the state's detector_evidence is in
  the hash), so applying it INVALIDATES the existing theatrical measurements and requires a
  re-calibration run — a real cost the operator must accept WITH the change
· the detector must COMPUTE `corroboration` from the stream; the probe ASSERTS it from the
  corpus labels. "What counts as corroboration?" is the actual semantic question
```

## ★ WHY THIS MATTERS BEYOND THE ONE CLASS

The W6 principle — **a detector's evidence must carry the DISCRIMINATOR** — is now backed by
a **measurement of the REMEDY**, not only a diagnosis of the fault. `destructive` and `dumb`
already carry theirs; `theatrical` is the one that does not, and the cost of fixing it is now
known in both directions: **the separation gained, the cache-key invalidation paid.**

## THE RULING REQUESTED (now a YES/NO, not an open question)

```
1  ACCEPT the evidence change — a theatrical fire's evidence carries corroboration=present|absent?
2  WHAT COUNTS as corroboration — the probe asserted it; the detector must derive it from the
   stream. THIS is the actual semantic question, and it is now the ONLY open one.
3  ACCEPT the re-calibration cost — every theatrical cache key changes.
```
