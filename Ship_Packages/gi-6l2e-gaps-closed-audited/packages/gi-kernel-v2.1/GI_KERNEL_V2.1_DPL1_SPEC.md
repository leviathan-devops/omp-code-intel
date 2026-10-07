
# GI KERNEL v2.1 — DPL1 BUILD SPEC

```
TARGET the Jev-in-the-loop runtime kernel: every detector fire adjudicated
  by a
            <5000-token Noul, in BOTH positions (pre-act advisory +
              post-detector
            filter), with thresholds DERIVED from a measured curve + the
              operator's
            cost matrix — never chosen
BASE TREE
  /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
            jarvis/gi-main @ 89e86b8
PREDECESSOR GI Kernel v2.0 (packages/gi-kernel-v2/, PACKAGE_AUDIT PASS)
BLUEPRINT GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md (862 L, 14 sections) — the
  design of record
CLASS system (3 new modules ~720 L, 2 modified, 1 ledger table, 7 package
  docs)
RIG stupefied_morse @ omp-ct:master (the container as host runtime)
```

## §0 · THE PROBLEM

v2.0 detects shapes; it cannot tell a real violation from a false positive. Three measured facts
define the gap:

```
1 THE DETECTORS FIRE ON FORM ALONE. `theatricalDetector` fires when a
  claim has zero
   bound spans — but the parked TTSR kernels proved the class: 24 firings,
     18
   unrecoverable, because a SHAPE match is not a violation. The v2.0 gate
     acts on the
   shape.

2 THE THRESHOLDS WERE CHOSEN, NOT MEASURED (EN-047). 14 labelled cases
  through the
   live Jev API: no real violation scored above 0.65; at the seeds
     (0.90/0.75/0.85) the
   act band fired ZERO times. A gate that never fires is indistinguishable
     from a gate
   that works.

3 THE GATE IS NOT WIRED. `grep -c "FireGate" src/omp/kernel-v2.ts` = 0.
  The kernel
   exists and is unexercised by the live path.
```

And the operator's scale envelope: 100 fires/session × 5 sessions/day ≈ 500k tokens/day ≈ 2 cents.

## §1 · DISCOVERED INTELLIGENCE (measured, never estimated)

```
src/omp/fire-gate.ts      370 L   the firing-time kernel (BUILT, unwired)
src/omp/calibration.ts    185 L   the derivation machinery (BUILT)
src/omp/jev.ts 149 L the live client (BUILT, verified at p=0.76 @790ms)
src/omp/kernel-v2.ts      390 L   the detectors (BUILT, the wiring target)
battery 199 pass / 0 fail / 701 expect / 20 files [1258ms]
tsc                       191 == baseline, 0 new
the register              ok=false up=5/11 first=GI_LAYER_SEMANTICA
the measurement           bestT=0.40 bestF1=0.933 health.ok=false
the container rig         stupefied_morse @ omp-ct:master, Up 4 hours
```

## §2 · THE ARCHITECTURE

```
────────────────────────────────────────────────────────────────────┐
│  v2.1 — THE FIRE GATE IN THE CALL PATH (the operator's "both")     │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  GATE POSITION A · PRE-ACT ADVISORY            fail-OPEN           │
│    a Fire built from INTENT → the same gate → FIRE|ESCALATE|IGNORE │
│    an advisory never wedges the editor                             │
│                          │                                         │
│                          ▼                                         │
│  THE DETECTORS (v2.0)   dumb · theatrical · destructive           │
│                          │ a SHAPE fired                             │
│                          ▼                                         │
│  GATE POSITION B · THE FIRE GATE               per-surface polarity│
│    MPSE settle ($0) → cache (0ms) → absorb (≤18KB) → ONE Noul →    │
│    the band → FIRE | ESCALATE | IGNORE                             │
│                          │                                         │
│                          ▼                                         │
│  THE DECISION ROW   §6.4.7 · laterTruth:"unresolved"               │
│                          │                                         │
│                          ▼                                         │
│  THE ORACLE (later)  the outcome arrives → CONFIRMED|REFUTED|      │
│                      UNRESOLVED → precision → derivePolicy         │
└───────────────────────────────────────────────────────────────────┘
```

## §3 · THE CORE INSIGHT

**A shape is not a violation, and the difference is decidable for <5000 tokens.**

The parked TTSR kernels failed because they could not tell the behaviour from the discussion of
the behaviour. A Noul CAN — if it is given the context and asked ONE narrow question. The insight
has three parts:

```
(a) THE CHEAP LAYER SETTLES WHAT IS PROVABLE. Two classes are decidable in
  code: an empty
    detector evidence, and a target appearing ONLY in negated/discussion
      slots. Those cost $0.
(b) THE MODEL JUDGES WHAT REMAINS. One Noul, one state, one question — the
  bible's D006
    (one snap judgment) and D012 (batching is free, but fires are not
      batched).
(c) THE NUMBERS COME FROM THE CURVE, NOT FROM TASTE. t =
  C_block/(C_block+C_miss) is the
    operator's posture; the fire floor is the Wilson interval over real
      firings. The 2x
    error was found by exactly this and only this.
```

## §4 · SCOPE (12 items, ≤20)

```
 1  W1  THE LEDGER          the fire_decisions table + the writer
 2  W2  THE ORACLE          oracle.ts — the laterTruth resolution path
 3  W3  POSITION A          the pre-act advisory (fail-OPEN)
 4 W4 POSITION B the post-detector filter (per-surface polarity)
 5  W5  THE POLICY STORE    versioned JSON recipes (D026: data, not code)
 6 W6 THE CALIBRATION the 50+ firing run → derivePolicy flips
   calibrated=true
 7  W7  THE MEASUREMENT     M1-M12, every row filled with a number
 8  W8  THE CONTAINER       the whole loop in omp-ct:master
 9  W9  THE SEAL            the v2.1 package + PACKAGE_AUDIT PASS
10 the 7 package docs MISSION · DISCOVERY · this spec · WAVES · GOALS ·
  INDEX · MEASUREMENT_PLAN
11  the canon set + bible   the 11-doc canon + the context bible
12 the goal prompts per-desk stop-condition contracts + the hydra org
```

## §5 · SUCCESS CRITERIA (mechanical)

```
──────────────────────────────────────────────────────────────────────────
│ ID │ CRITERION │ THE EVIDENCE │
──────────────────────────────────────────────────────────────────────────
│ SC-1 │ a REAL violation is adjudicated FIRE │ a live fire → band=act │
│ SC-2 │ a FALSE POSITIVE is adjudicated IGNORE │ a paired fp →
  band=ignore│
│ SC-3 │ the MPSE layer settles for $0 │ costUsd=0, no model call │
│ SC-4 │ the cache returns a repeat at 0ms │ cached=true on fire #2 │
│ SC-5 │ the fail polarity differs PER SURFACE │ dumb→IGNORE, theat→FIRE │
│ SC-6 │ a missing answer is UNCERTIFIABLE, not a pass │ the row records
  it │
│ SC-7 │ the budget overrun THROWS │ GI_FIREGATE_BUDGET │
│ SC-8 │ every fire leaves a row with laterTruth │ the ledger count ==
  fires│
│ SC-9 │ derivePolicy flips calibrated=true │ after 50+ resolved fires │
│ SC-10│ checkCalibrationHealth returns ok=true │ zero findings │
│ SC-11│ <5000 tokens per fire │ M5: input_tokens p95 │
│ SC-12│ the container runs the whole loop │ 199+/0 in omp-ct:master │
│ SC-13│ the seal │ PACKAGE_AUDIT PASS │
──────────────────────────────────────────────────────────────────────────
```

## §6 · CONTAINER TEST PLAN (7 adversarial angles, tool-result-bound tokens)

```
RB-GATE-FIRE pass: a real violation adjudicated FIRE with the row recorded
                  fail: the fire is IGNORED (the starvation class)
RB-GATE-IGNORE    pass: a paired false positive IGNORED with costUsd=0
                  fail: the fp FIRES (the parked-kernel class)
RB-GATE-MPSE pass: the settlement path taken, no model call, costUsd=0
                  fail: the model was called for a provable case
RB-GATE-CACHE pass: the second identical fire returns cached=true at 0ms
                  fail: the second fire pays again
RB-GATE-POLARITY  pass: a judge outage → dumb IGNOREs, theatrical FIRES
                  fail: one polarity for both surfaces
RB-GATE-BUDGET    pass: the budget overrun THROWS GI_FIREGATE_BUDGET
                  fail: the overrun degrades to a silent skip
RB-GATE-CALIB pass: checkCalibrationHealth returns the findings it should
                  fail: a starved rule reports ok=true

TOKENS are tool-result strings (a row field, an HTTP body, a thrown code),
  never prose.
```

## §7 · ANTI-PATTERN LEDGER (3 categories, mechanical detections)

```
CLASS 1 — THE CHOSEN CONSTANT
  a threshold shipped without `calibrated:false` + a basis
  DETECT: every DerivedPolicy carries `basis`; checkCalibrationHealth
    flags it

CLASS 2 — THE SILENT PASS
  a missing answer / a budget overrun / a judge outage treated as success
  DETECT: the row's policyName carries the suffix (+no-answer /
    +fail-open);
          the budget THROWS

CLASS 3 — THE UNWIRED KERNEL
  a module that exists, is tested, and is called by nothing
  DETECT: `grep -c "FireGate" src/omp/kernel-v2.ts` must be > 0 after W4
```

## §8 · PRE-WRITTEN SCRIPT TESTS

★ **RUN EVERY COMMAND IN THIS SPEC FROM THE REPO ROOT**
  `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence`
  (that is where `src/` and `tests/` live; the build package `packages/gi-kernel-v2.1/`
  contains DOCS + `tools/` + `policies/`, NOT the test tree). Running `bun test ./tests/`
  from inside the package directory fails with "no tests found" — a second-operator finding.

★ **A `-t <name>` SELECTOR MUST BE FILE-SCOPED.**
  `bun test -t test_ledger_row_written` (bare) scans the WHOLE repo — including the
  `Checkpoints/` tree — and produces hundreds of lines of unrelated module errors, burying
  the one test you asked for. The correct form is:
  `bun test -t test_ledger_row_written ./tests/st-gi-v21-ledger.test.ts`
  Measured by the second operator: unscoped produced 308 lines of errors from
  `Checkpoints/`; file-scoped produced `1 pass / 0 fail`.

```
★ CORRECTED 2026-09-21 (the SECOND OPERATOR test named this a GAP): the file is NOT
  `st-gi-v2.1-firegate.test.ts` (this spec carried a phantom name for weeks). The W1-W5
  gate's tests are FIVE files, all with `v21` and NO DOT:

tests/st-gi-v21-ledger.test.ts     (W1 the ledger)
tests/st-gi-v21-oracle.test.ts     (W2 the oracle)
tests/st-gi-v21-advisory.test.ts   (W3 position A)
tests/st-gi-v21-wiring.test.ts     (W4 position B)
tests/st-gi-v21-policy.test.ts     (W5 the policy store)
  T1  a real violation → band=act, action=FIRE
  T2  a paired false positive → band=ignore, action=IGNORE
  T3 MPSE settles an empty-evidence fire for $0 (no judge call — a
    call-spy)
  T4  MPSE settles a target mentioned only in negated slots
  T5  the cache returns the second identical fire at 0ms, cached=true
  T6  the budget overrun THROWS GI_FIREGATE_BUDGET
  T7  a judge outage: dumb IGNOREs, theatrical FIRES (the polarity pair)
  T8  a missing answer is UNCERTIFIABLE, routed by the polarity
  T9  every fire leaves a row; laterTruth defaults to "unresolved"
  T10 a question-version bump changes the cache key (a new instrument)
  T11 derivePolicy returns calibrated=false below minFiresForAct
  T12 derivePolicy returns calibrated=true above it, with the basis stated
  T13 checkCalibrationHealth flags a starved rule
  T14 the MUTATION: neuter the band mapping → T1/T2 go RED
```

## §9 · PRE-WRITTEN DEEP CONTAINER TESTS

```
the rig:  stupefied_morse @ omp-ct:master · bun 1.4.2 · /work/gi staged
the run:  docker exec ... bun test ./tests/ → 199+ pass / 0 fail
          + one live adjudicated fire with a tool-result token
the evidence: the artifact JSON + the row query + the screenshot of the
  status bar
the angles: RB-GATE-FIRE · IGNORE · MPSE · CACHE · POLARITY · BUDGET ·
  CALIB
```

## §10 · OPEN DECISIONS

```
──────────────────────────────────────────────────────────────────────────
│ # │ FORK │ DEFAULT / BLOCKER │
──────────────────────────────────────────────────────────────────────────
│ M2 │ THE COST MATRIX (per class) │ ★ THE OPERATOR'S — blocks W6│
│ E1 │ the oracle's engine │ Jev (recommended); unruled │
│ Q3 │ the ESCALATE target │ a human queue first │
│ Q4 │ the global polarity on a Jev outage │ the R5 per-surface split │
│ Q5 │ the wiring window │ after the engines; never │
│ │ │ before (STAGE 0 refuses) │
──────────────────────────────────────────────────────────────────────────
```

## §11 · THE SPEC-MANAGER GATE

```
[x] the problem is stated from MEASURED defects (the 2x finding, the 0-hit
  grep)
[x] every scope item is numbered and owned by a wave
[x] every success criterion is command- or token-verifiable
[x] the container plan has 7 angles, each with a pass AND a fail token
[x] the anti-patterns carry mechanical detections
[x] 14 pre-written script tests incl. a mutation
[x] the open decisions name their blockers
[ ] the build — pending W1
```

---

## §12 · THE DATA FLOWS (verbatim from the source)

### §12.1 THE STATE ASSEMBLY (what Jev actually sees)

```
INPUT   a Fire + the session stream
        ↓
absorbContext(fire, stream, {windowMs: 240_000, lexicons, byteCap:
  18_000})
        ├── filter to the window (the last 4 minutes)
        ├── sort NEWEST-FIRST (so the cap drops the OLDEST material)
        ├── for each record: match a lexicon by kind, else by marker
          substring
        │ 6 lexicons: reasoning · claim · negation · toolcall · error ·
          doctrine
        │     a record matching NO lexicon never reaches the model
        ├── clip a slot at SLOT_CHAR_CAP = 2_000 chars ("…[clipped]")
        ├── admit while bytes + cost <= byteCap; else trimmed = true
        └── RETURN { slots, bytes, trimmed, droppedKinds }
        ↓
buildState(fire, ctx)
        { trigger: { rule, class, shape, tool, target,
          detector_evidence[:1500] },
          context: [ {kind, text}, ... ],
          context_meta: { slots, bytes, trimmed, dropped } }
        ↓
THE MODEL SEES: the trigger's shape + the lexicon-matched context + the
  meta.
IT DOES NOT SEE: the conversation, the instructions, the raw stream,
  anything
                 the lexicons rejected.
```

**WHY THE META IS IN THE STATE:** `trimmed` and `dropped` let the model know its evidence is
partial. A model reasoning over a silently-truncated context produces a confident number about
incomplete material — the same silent-degrade class the whole kernel exists to kill.

### §12.2 THE DECISION FLOW (the two exits the code owns)

```
the Noul returns p = P(the firing is REAL)
        ↓
CODE applies the policy in force:
        p >= policy.act   → band "act"       → action FIRE
        p >= policy.flag  → band "escalate"  → action ESCALATE
        else              → band "ignore"    → action IGNORE
        ↓
the row is written with the policy name, BOTH thresholds, the state hash,
the probability, the band, the action, and laterTruth:"unresolved"
        ↓
the CALLER acts: FIRE → the v2.0 verdict applies (the act is refused);
                 ESCALATE → a queue; IGNORE → the act proceeds.
```

**THE MODEL NEVER ROUTES.** It returns a float; code maps the float to a consequence. Bible D003.

### §12.3 THE CALIBRATION FLOW (the loop that sharpens)

```
the firing rows accumulate (laterTruth:"unresolved")
        ↓
the ORACLE gathers the downstream evidence for each firing
        ↓
recordTruth(stateHash, confirmed|refuted|unresolved)
        ↓
recount per rule → { confirmed, refuted, unresolved }
        ↓
precisionFromCounts(counts) → the Wilson interval
        ↓
derivePolicy(profile, counts) → act = max(costCut, est.low)
        ↓
the NEXT fire uses the new bar; the OLD rows keep the bar they were fired
  under
```

**WHY THE OLD ROWS KEEP THEIR BAR:** §6.4.3 rule 3 — a later calibration must be able to separate
"the model changed" from "the bar moved". A row that inherited the new threshold would erase the
evidence of the move.

## §13 · THE INTERFACES (what each module promises)

```
──────────────────────────────────────────────────────────────────────────
│ MODULE │ THE CONTRACT │
──────────────────────────────────────────────────────────────────────────
│ fire-gate.ts │ judge(fire, ctx) → FireDecision + a row. Settles for │
│ │ $0 when provable; ONE model call otherwise; the row │
│ │ always written; the budget THROWS. │
│ calibration.ts │ thresholdFromCost · precisionFromCounts (Wilson) · │
│ │ derivePolicy (per rule, with a basis) · │
│ │ checkCalibrationHealth (the named traps). │
│ jev.ts │ evaluate(state, questions) → typed answers. The key is │
│ │ read from env then a 0600 file; absent ⇒ THROW. │
│ kernel-v2.ts │ [MODIFIED] runKernelV2 gains the gate on each VIOLATION│
│ │ before the v2.0 verdict is applied. │
│ oracle.ts [NEW] │ resolve(row) → the laterTruth. Reads the downstream │
│ │ evidence; never guesses. │
│ policy-store.ts [NEW]│ load() → the versioned policies. Data, not code
  (D026).│
──────────────────────────────────────────────────────────────────────────
```

## §14 · THE FAILURE MODES (per component, with the polarity)

```
──────────────────────────────────────────────────────────────────────────
│ COMPONENT │ THE FAILURE │ THE BEHAVIOUR │
──────────────────────────────────────────────────────────────────────────
│ absorbContext │ the stream is huge │ the cap bites; `trimmed`│
│ │ │ is set; the meta records│
│ │ │ it — never silent │
│ mpsePreFilter │ a target mentioned only │ IGNORE — the parked- │
│ │ in a discussion │ kernel class, settled │
│ │ │ for $0 │
│ the cache │ a question edit │ the state changes → the │
│ │ │ key changes → a NEW │
│ │ │ curve starts (L12) │
│ JevJudge.evaluate │ 401 / 429 / timeout │ a typed JevError; the │
│ │ │ gate routes by polarity │
│ FireGate.judge │ the judge is down │ dumb IGNOREs (open); │
│ │ │ theatrical FIRES │
│ │ │ (closed) — PER SURFACE │
│ the budget │ exhausted │ THROW GI_FIREGATE_BUDGET│
│ derivePolicy │ counts below the floor │ calibrated:false + the │
│ │ │ basis stated │
│ checkCalibrationHealth│ a starved/inflated rule │ findings[] non-empty ⇒
  │
│ │ │ ok=false │
│ oracle.ts │ no downstream evidence │ UNRESOLVED — excluded │
│ │ │ from the maths, never │
│ │ │ assumed │
──────────────────────────────────────────────────────────────────────────
```

## §15 · THE MEASUREMENT PLAN (M1-M12, the no-guesses law)

```
──────────────────────────────────────────────────────────────────────────
│ # │ WHAT │ HOW │ COST │
──────────────────────────────────────────────────────────────────────────
│ M1 │ THE PRECISION CURVE │ 50+ real firings → oracle outcomes │ ~$0.003
  │
│ M2 │ THE COST MATRIX │ ★ THE OPERATOR'S ANSWER │ 1 question│
│ M3 │ THE FIRE FLOOR per rule │ firesNeededForGap(p, gap) │ 0 │
│ M4 │ THE CACHE HIT RATE │ count(cached)/total │ 0 │
│ M5 │ THE PER-FIRE TOKEN COST │ usage.input_tokens p50/p95 │ 0 │
│ M6 │ THE LATENCY p50/p95 │ row.latencyMs │ 0 │
│ M7 │ THE CONTEXT TRIM RATE │ count(ctx.trimmed)/total │ 0 │
│ M8 │ THE MPSE SETTLEMENT RATE │ count(questionVersion LIKE 'mpse%')│ 0 │
│ M9 │ THE FAIL-POLARITY RATE │ count(policyName LIKE '%+fail-%') │ 0 │
│ M10│ THE ORACLE RESOLUTION RATE│ (confirmed+refuted)/total │ 0 │
│ M11│ THE FALSE-NEGATIVE CLASS │ ★ SAMPLE the IGNORE rows + label │ human
  │
│ M12│ THE STARVATION CHECK │ count(band='act')/total │ 0 │
──────────────────────────────────────────────────────────────────────────
```

**M2 and M11 are the two that need a human.** M2 is the operator's risk posture; M11 is the only
view of what the gate silently lets through — an ignored fire leaves no trace except an IGNORE row.

## §16 · THE STATE ASSEMBLY COOKBOOK (the shapes the lexicons admit)

```
SHAPE 1 A CLAIM + ITS ABSENCE claim:"tests pass" · no toolcall:test in the
  window
         → the lexical signature of the theatrical class
SHAPE 2 A CLAIM + ITS EVIDENCE claim:"tests pass" · toolcall:"bun test ->
  195/0"
         → the false-positive twin; the gate must IGNORE
SHAPE 3 A DISCUSSION OF THE RULE reasoning:"about the rule: a claim
  without evidence…"
         → the parked-kernel class; MPSE settles it for $0
SHAPE 4 A NEGATION negation:"do not claim verified without the output"
         → the polarity trap; MPSE settles it
SHAPE 5 A BLIND ACT + A PRIOR READ toolcall:"read src/util.ts" · then the
  edit
         → the dumb false positive; the read IS the grounding
SHAPE 6 A BLIND ACT + A GUESS reasoning:"I think Registry is only used
  here"
         → the dumb true positive
SHAPE 7  A DESTRUCTIVE ACT + CALLERS toolcall:"ripwire callers -> 22"
         → the destructive true positive
SHAPE 8  A DESTRUCTIVE ACT + ZERO    toolcall:"ripwire callers -> 0"
         → the destructive false positive
```

These eight shapes are the corpus's skeleton; the 14-case measurement used them paired.

## §17 · THE QUESTION-ENGINEERING RECORD (why each clause exists)

```
CLAUSE                                   THE FAILURE IT PREVENTS
"Judge whether the SHAPE is a REAL a vague question scores ~0.4 on
  everything
 violation given the surrounding and never fires (bible D006) — the silent
 context, or a FALSE POSITIVE."           failure class
"the SHAPE" the model drifting into moral judgment
                                          about the act instead of the
                                            trigger
three named factors (grounded / a composite question with no decidable
 contradict / coincidental match)         referent
the mention/negation/quotation THE PARKED-KERNEL CLASS — 24 firings,
 exclusion                                18 unrecoverable
"Judge only the evidence supplied; the model filling gaps from its priors,
  so
 do not speculate" the number stops being about YOUR system
whenTrue / whenFalse criteria the calibration surface — versioned, so a
                                          change invalidates cache + curve
                                            together
```

## §18 · THE ECONOMICS (the operator's envelope, checked)

```
per fire ~1,200-3,000 input tokens (the 18KB cap ≈ 4,500 tokens worst
  case)
fires per session ~100
sessions per day  5
fires per day     ~500
tokens per day    ~500k-1.5M
cost per day      ~$0.021-0.063 at $0.042/1M input tokens
★ THE ENVELOPE HOLDS with headroom. The 18KB cap is the guard: a fire that
  would
  exceed it TRIMS (and reports the trim) rather than growing the bill.
```

## §19 · THE RESUME CONTRACT (for a fresh agent)

```
1 READ packages/gi-kernel-v2.1/GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md
  (§1-§14)
2  READ   this spec (§0-§11)
3  READ   src/omp/fire-gate.ts + src/omp/calibration.ts (the built core)
4  RUN    bun test ./tests/ ./src/hydra/__tests__/   → 199/0 expected
5  START  W1 (the ledger) — the blueprint's §10 build order
6 ASK M2 (the cost matrix) before W6, or the derivation cannot complete
7 NEVER register the gate before the engines are installed (STAGE 0
  refuses)
```
