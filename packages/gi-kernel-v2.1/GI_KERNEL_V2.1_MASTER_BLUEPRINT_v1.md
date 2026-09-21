# GI KERNEL v2.1 — MASTER BLUEPRINT v1
**THE JEV-IN-THE-LOOP RUNTIME KERNEL — every fire adjudicated, every threshold measured.**

```
System GI Kernel v2.1 (gen-2, rev 2.1) — the Jev-in-the-loop enforcement
  kernel
Supersedes v2.0 (the six-layer stack + the RSI layer; PACKAGE_AUDIT PASS)
Extends v2.0 with the FIRE GATE: a firing-time judgment on every detector
  fire
Status        BLUEPRINT — the design is complete; the build is not started
Date          2026-09-21
Authority     JEV_ENGINEERING_BIBLE.md (D001-D026, §6.4, §6.5, §6.12)
              + the 14-case measurement (EN-047) + the container heritage
                (EN-046)

OPERATOR RULINGS (verbatim, binding):
  "1) both" — the gate sits BOTH before the act AND
                                               as a filter on the
                                                 detector's output
  "2) get proper measurements for everything. no guesses"
  "each fire should be < 5000 tokens"        the per-fire budget
  "100 fires per session x 5 sessions/day" the scale envelope (~2
    cents/day)
```

---

## §1 · MACRO BLUEPRINT — the whole machine on one page

```
┌────────────────────────────────────────────────────────────────────┐
│       GI KERNEL v2.1 — THE JEV-IN-THE-LOOP RUNTIME KERNEL          │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  AN AGENT ACTS                                                     │
│      │                                                             │
│      ▼                                                             │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ GATE POSITION A · BEFORE THE ACT  (the operator's "both")    │  │
│  │   a pre-act advisory check — the gate answers "is the SHAPE  │  │
│  │   of what you are ABOUT to do a violation?"                  │  │
│  │   fail polarity: OPEN (an advisory never wedges the editor)  │  │
│  └───────────────────────────┬─────────────────────────────────┘  │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ THE DETECTORS (v2.0, unchanged)                              │  │
│  │   dumb.grounding-precondition · theatrical.claim-without-span│  │
│  │   · destructive.layer-certification                          │  │
│  │   each returns {verdict, tier, reason, evidence}             │  │
│  └───────────────────────────┬─────────────────────────────────┘  │
│                              │ a SHAPE fired                       │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ GATE POSITION B · THE FIRE GATE (v2.1, NEW)                  │  │
│  │                                                              │  │
│  │   MPSE settlement   ── settles for $0 ──────────────┐        │  │
│  │        │ cannot settle                              │        │  │
│  │        ▼                                            │        │  │
│  │   CACHE lookup      ── a hit returns at 0ms ────────┤        │  │
│  │        │ miss                                       │        │  │
│  │        ▼                                            │        │  │
│  │   CONTEXT ABSORB    lexicon-filtered, byte-capped,  │        │  │
│  │                     windowed, trim REPORTED         │        │  │
│  │        ▼                                            │        │  │
│  │   JEV · ONE NOUL    "is the shape REAL given the    │        │  │
│  │                     context, or a false positive?"  │        │  │
│  │        ▼                                            │        │  │
│  │   THE BAND          act | escalate | ignore  ◄──────┘        │  │
│  │        ▼                                                     │  │
│  │   THE DECISION ROW  §6.4.7 — laterTruth:"unresolved"         │  │
│  └───────────────────────────┬─────────────────────────────────┘  │
│                              │                                     │
│              ┌───────────────┼───────────────┐                     │
│              ▼               ▼               ▼                     │
│           FIRE          ESCALATE          IGNORE                   │
│        the act is      a human or a      the shape was             │
│        refused         bigger model      noise; the act            │
│        (the v2.0       decides           proceeds                  │
│         verdict)                                                   │
│                              │                                     │
│                              ▼                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ THE ORACLE (v3 substrate, v2.1 fills laterTruth)             │  │
│  │   later, the outcome arrives → CONFIRMED | REFUTED |         │  │
│  │   UNRESOLVED → precision → derivePolicy → the thresholds move│  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

**The one-paragraph what-it-is.** v2.0 detects; v2.1 **adjudicates**. Every detector fire — a shape
matching a rule — passes through a fire gate that spends at most one Noul's worth of judgment
(<5000 tokens) to decide whether the shape is a REAL violation given the context that surrounds it.
The answer routes to FIRE, ESCALATE or IGNORE under a **named policy** whose numbers are **derived
from a measured precision curve plus the operator's stated cost posture**, never chosen. The gate
sits in BOTH positions the operator ruled: a pre-act advisory ("is what you are about to do a
violation?") and a post-detector filter ("is this firing real?"). Every decision leaves a row
carrying the thresholds in force and a `laterTruth` slot that only the oracle fills — which makes
the whole system calibratable over time instead of frozen at its seed guesses.

---

## §2 · LIFECYCLE — the stages, cheapest first

```
S0  PRE-ACT ADVISORY        gate position A      cost: 1 fire, fail-OPEN
S1  DETECT                  the v2.0 detectors   cost: 0
S2 SETTLE mpsePreFilter cost: 0 (settles ~?% — M8 measures)
S3 REMEMBER the cache cost: 0ms, $0 (bible: 60-80% hit)
S4  ABSORB                  the context builder  cost: 0
S5 JUDGE ONE Noul cost: ~$0.00005, ~300-800ms
S6  BAND + ACT              code, never the model
S7  RECORD                  the decision row
S8 (LATER) RESOLVE the oracle cost: 1 fire per resolution
S9  (LATER) RE-DERIVE       derivePolicy         cost: 0
```

### S0 · PRE-ACT ADVISORY — gate position A

**WHAT:** before the act runs, the gate asks whether the SHAPE of the intended act is a violation.
**HOW:** the same `FireGate.judge` with a `fire` built from the *intent* rather than the *act*.
**WHY position A:** an act not yet taken can be steered for free; the v2.0 post-hoc refusal costs
the agent the whole edit. **FAIL POLARITY: OPEN** — an advisory that cannot reach the model must
never block a legitimate act.

### S1 · DETECT — the v2.0 detectors, unchanged

**WHERE:** `src/omp/kernel-v2.ts:138/:155/:173` · `:208` classifyByDetectors
**WHY UNCHANGED:** the detector's job is to be CHEAP and to produce a SHAPE. Adjudication is this
blueprint's job. Mixing them would make the detector expensive and the gate untestable.

### S2 · SETTLE — `mpsePreFilter` (`fire-gate.ts:196`)

**WHAT:** two provably-decidable classes are settled for $0.
```
RULE 1  empty detector evidence → IGNORE (fail-closed-to-ignore, recorded)
RULE 2  the target appears ONLY in negated/discussion slots → IGNORE
        (the parked-kernel class: 24 firings, 18 unrecoverable)
```
**WHY:** the cheapest judgment is the one not made. **M8 measures its yield.**

### S3 · REMEMBER — the cache (`fire-gate.ts:289`)

**KEY:** `sha256(buildState(fire, ctx)).slice(0,16)` — the CANONICAL STATE, not the fire id.
**WHY THE STATE IS THE KEY:** two fires producing the same evidence share one judgment; a question
version bump changes the state and therefore the key (a question edit is a NEW INSTRUMENT).

### S4 · ABSORB — `absorbContext` (`fire-gate.ts:150`)

**THE BOUND:** `STATE_BYTE_CAP = 18_000` (~4 KB/token → <5000 tokens with headroom).
**THE ORDER:** newest-first, so the cap drops the OLDEST material.
**THE REPORT:** `trimmed: boolean` + `droppedKinds: string[]` — a silent drop is a defect.
**THE LEXICONS:** six kinds (reasoning · claim · negation · toolcall · error · doctrine); a record
matching no lexicon never reaches the model. **M7 measures the trim rate.**

### S5 · JUDGE — one Noul (`fire-gate.ts:158`)

**THE QUESTION:** versioned `fire-legitimacy-v1`; four defensive clauses (the shape referent · three
named factors · the mention/negation/quotation exclusion · the anti-hallucination clause).
**THE CALL:** `judge.evaluate(state, [fireQuestion()])` — ONE question per fire. Bible D012: the
marginal question is nearly free; the marginal FIRE is not, so fires are not batched (each carries
its own state).
**M5/M6 measure the tokens and the latency.**

### S6 · BAND + ACT — code, never the model

```
p >= policy.act   → FIRE      (the v2.0 verdict applies)
p >= policy.flag  → ESCALATE  (a human queue / a bigger model / a re-ask)
else              → IGNORE    (the act proceeds; the firing was noise)
```

### S7 · RECORD — the decision row (`fire-gate.ts:96`)

```
{ at, ruleId, cls, questionVersion, probability, band, action,
  policyName, actThreshold, flagThreshold, stateHash, costUsd,
  laterTruth: "unresolved" }
```
**WHY EVERY FIELD:** §6.4.3 rule 3 — a later calibration must separate "the model changed" from
"the bar moved". `reroute()` re-decides a stored probability under a new policy **without
re-inferring**.

### S8/S9 · RESOLVE + RE-DERIVE — the oracle and the loop

**S8:** the outcome arrives from the system's own operation (a later edit, a test run, a
withdrawal, a downstream permit) → `recordTruth(stateHash, confirmed|refuted|unresolved)`.
**S9:** `derivePolicy(profile, counts)` re-derives per rule; the act bar = `max(cost cut, the
measured lower bound)`.

---

## §3 · DISPATCH TRACES — every hop, with the exact call shape

### TRACE A — a fire that SETTLES (the cheapest path, $0)

```
detector fires: {ruleId:"*theatrical", cls:"theatrical",
                 shape:"claim with zero bound spans", target:"migration",
                 evidence:"claims=1 unbound=1 spans[0]=0"}
  │
  ▼ FireGate.judge(fire, ctx)                          fire-gate.ts:262
  │   1 stateHash = sha256(buildState(fire,ctx))       :267
  │   2 mpsePreFilter(fire, ctx)                       :271 → :196
  │ → settle: null (the evidence is non-empty, the target is not negated)
  ▼ (cannot settle)
  3 cache.get(stateHash) → miss                        :289
  4 budget: 0/1200                                     :306
  ▼
  5 judge.evaluate(state, [fireQuestion()])            :313
       → POST https://api.typesafe.ai/v1/systemone
         {"model":"jev-latest",
            "state":{trigger:{...},context:[{kind,text}...],context_meta:{...}},
          "questions":{"fire_is_real":{"type":"noul",
             "instructions":"A detector fired on this act because its
               SHAPE
                             matched a rule. Judge whether the SHAPE is a
                               REAL
                             violation given the surrounding context...",
             "criteria":{"true":"the detector's premise holds...",
                         "false":"the shape matched but the act is
                           legitimate..."}}}}
  ▼
  6 answers: {"fire_is_real":{"type":"noul","noul":0.58}}
    usage:{input_tokens:N}
  7 band: 0.58 < act 0.85 → but >= flag 0.45 → ESCALATE
  8 row: {…, probability:0.58, band:"escalate", action:"ESCALATE",
          policyName:"theatrical-seed", actThreshold:0.85,
            flagThreshold:0.45,
          laterTruth:"unresolved"}
  ▼
  the caller ESCALATES — the act is not refused, it is queued for a human
    or a
  bigger model, and the row records WHY with the threshold that was in
    force.
```

### TRACE B — a fire that SETTLES at MPSE ($0, no model call)

```
detector fires: {ruleId:"*theatrical", target:"tests", evidence:"claims=1
  ..."}
  │
  ▼ mpsePreFilter                                     fire-gate.ts:196
      mentions = slots containing "tests"
        [{kind:"reasoning", text:"I should NOT claim the tests pass until
          I
                                  re-run them."},
         {kind:"negation", text:"do not claim verified without the
           output"}]
      every mention matches /(not |never|don't|without|...)/ → YES
  ▼ settle: "IGNORE"
      reason: "MPSE: target 'tests' appears only in negated/discussion
        slots (2)
               — the shape matched a mention, not the act"
  ▼ row: {probability:0, band:"ignore", action:"IGNORE", costUsd:0,
          questionVersion:"mpse:fire-legitimacy-v1"}
  ▼
  NO MODEL CALL. The parked-kernel false-positive class, settled for free,
    and
  the row still records it (so M8 can measure the free layer's yield).
```

### TRACE C — the judge is DOWN (the fail polarity, per surface)

```
same fire, cls="dumb", judge.evaluate THROWS (timeout)
  ▼ catch                                               fire-gate.ts:316
      policy.failPolarity === "open"  (dumb is advisory)
      → probability 0, band "ignore", action "IGNORE"
      → policyName: "dumb-seed+fail-open"
      → reason: "judge unavailable (...) — fail-open for the dumb surface"
  ▼
  the EDIT PROCEEDS. The miss is recorded, not hidden.

same fire, cls="theatrical", judge THROWS
      policy.failPolarity === "closed"
      → probability 1, band "act", action "FIRE"
      → policyName: "theatrical-seed+fail-closed"
  ▼
  the ACT IS REFUSED. A false "done" is the defect; the gate fails toward
    refusal.
```

---

## §4 · TYPES + ENGINE CHECKS

### §4.1 THE TYPES (verbatim from the source, with the contract each encodes)

```ts
// ── THE TRIGGER (what a detector hands the gate) fire-gate.ts:38
export interface Fire {
  ruleId: string; // the rule identity — the cache and the policy key on
    it
  cls: string; // destructive | dumb | theatrical — selects the seed
    policy
  shape: string;       // ONE line the operator would read
  tool: string;        // the act's tool
  target: string; // the symbol/file — the mention-vs-act settlement's
    referent
  evidence: string;    // the detector's OWN evidence, verbatim
}

// ── THE ABSORBED CONTEXT (bounded by construction) fire-gate.ts:51
export interface AbsorbedContext {
  slots: Array<{ kind: string; text: string }>;
  bytes: number;       // measured, not estimated
  trimmed: boolean;    // TRUE when the cap forced a drop — never silent
  droppedKinds: string[];
}

// ── THE DECISION (what the caller routes on) fire-gate.ts:78
export interface FireDecision {
  ruleId: string;
  probability: number;          // the Noul — P(the firing is REAL)
  band: "act" | "escalate" | "ignore";
  action: "FIRE" | "ESCALATE" | "IGNORE"; // code's mapping, never the
    model's
  reason: string; // carries WHICH policy and WHICH thresholds
  row: DecisionRow;
  cached: boolean;              // M4 measures this
  latencyMs: number;            // M6 measures this
}

// ── THE ROW (§6.4.7 — the calibration substrate) fire-gate.ts:96
export interface DecisionRow {
  at: string; ruleId: string; cls: string;
  questionVersion: string;      // a question edit = a new instrument
  probability: number; band: string; action: string;
  policyName: string; // carries the fail-polarity suffix when it fired
  actThreshold: number; // §6.4.3 rule 3: the bar IN FORCE is recorded
  flagThreshold: number;
  stateHash: string; // the cache key — also the oracle's join key
  costUsd: number;
  laterTruth: "confirmed" | "refuted" | "unresolved"; // ONLY the oracle
    writes this
}

// ── THE POLICY (§6.4.3 rule 1: named, never magic numbers)
  fire-gate.ts:110
export interface Policy {
  name: string;
  act: number;     // p >= act → FIRE
  flag: number;    // flag <= p < act → ESCALATE
  failPolarity: "open" | "closed";   // D010: PER SURFACE
}

// ── THE MEASUREMENT SURFACE calibration.ts
export interface CostMatrix { falseBlock: number; missed: number }
export interface ResolvedCounts { confirmed: number; refuted: number;
  unresolved: number }
export interface PrecisionEstimate {
  precision: number; low: number; high: number; halfWidth: number;
  resolved: number; unresolvedRatio: number;
  sufficient: boolean;   // half-width <= 0.10
  starved: boolean;      // the act band never fired
}
export interface DerivedPolicy {
  ruleId: string; policyName: string; act: number; flag: number;
  basis: string; // the HUMAN-READABLE derivation — why these numbers
  calibrated: boolean;   // false until the counts clear minFiresForAct
  estimate: PrecisionEstimate | null;
}
```

### §4.2 THE ENGINE CHECKS, in execution order

```
──────────────────────────────────────────────────────────────────────────
│ # │ CHECK │ GUARD │
──────────────────────────────────────────────────────────────────────────
│ 1 │ fire.evidence.trim() === "" │ → IGNORE, recorded │
│ 2 │ every target-mention is negated/discussion │ → IGNORE, recorded │
│ 3 │ cache.get(stateHash) │ → return, cached:true │
│ 4 │ budgetUsed >= budgetFires │ → THROW (loud) │
│ 5 │ judge.evaluate throws │ → route by failPolarity │
│ 6 │ answers.find(id === "fire_is_real") absent │ → UNCERTIFIABLE, same │
│ 7 │ p >= policy.act │ → FIRE │
│ 8 │ p >= policy.flag │ → ESCALATE │
│ 9 │ else │ → IGNORE │
│ 10 │ ctx.trimmed │ → recorded, drives M7 │
│ 11 │ row.laterTruth written as "unresolved" │ the firing never │
│ │ │ assumes correctness │
│ 12 │ derivePolicy: counts < minFiresForAct │ → calibrated:false │
│ 13 │ checkCalibrationHealth: starved / inflated / │ → findings[] │
│ │ interval-too-wide │ │
──────────────────────────────────────────────────────────────────────────
```

---

## §5 · INVOKE PSEUDOCODE — the mechanisms

### §5.1 THE GATE

```
INPUT:  a Fire (the detector's shape) + the session stream
OUTPUT: a FireDecision + a DecisionRow

  state = buildState(fire, ctx) // evidence only; no conversation
  hash  = sha256(state)[0..16]

  settle, reason = mpsePreFilter(fire, ctx)     // the free layer
  if settle is not null:
      record(settle, reason, cost=0); RETURN

  if cache has hash:
      record(cached, cost=0); RETURN

  if budget exhausted:
      THROW GI_FIREGATE_BUDGET // loud, never a silent skip

  TRY:
      answers = judge.evaluate(state, [fireQuestion()])
  CATCH:
      p = (failPolarity == closed) ? 1 : 0       // D010, PER SURFACE
      record(p, "judge unavailable", policyName+suffix); RETURN

  a = answers["fire_is_real"]
  if a is absent:
      p = (failPolarity == closed) ? 1 : 0       // UNCERTIFIABLE ≠ pass
      record(p, "no answer"); RETURN

  band = p >= act ? "act" : p >= flag ? "escalate" : "ignore"
  action = band == "act" ? FIRE : band == "escalate" ? ESCALATE : IGNORE
  cache[hash] = p
  record(p, band, action, policyName, act, flag); RETURN
```

### §5.2 THE DERIVATION (the no-guesses law, mechanized)

```
INPUT:  a RuleProfile { cost: {falseBlock, missed}, minFiresForAct }
        + the rule's counts from the ledger
OUTPUT: a DerivedPolicy with its BASIS stated

  costCut = falseBlock / (falseBlock + missed)          // STEP 1
  if counts is null OR resolved < minFiresForAct:
      RETURN { act: costCut, flag: costCut/2, calibrated: false,
               basis: "cost matrix only … NO measured counts yet" }

  est = precisionFromCounts(counts)                     // STEP 2 — Wilson
  act = max(costCut, est.low) // STEP 4 — re-derived
  RETURN { act, flag: min(act/2, est.high), calibrated: true,
           basis: "cost t=… vs measured precision … [low, high] over N
             resolved" }
```

### §5.3 THE HEALTH GATE (the named traps, mechanically checked)

```
FOR each derived policy:
    counts = ledger[ruleId]
    if counts is absent        → FINDING "threshold is uncalibrated"
    if est.starved             → FINDING "the act band has never fired"
    if p.act >= 0.98           → FINDING "STARVATION RISK"
    if p.act < est.low         → FINDING "INFLATED risk"
    if est.halfWidth > 0.15    → FINDING "n too small to set a bar"
    if p.act < 0.05            → FINDING "degenerate"
RETURN { ok: findings.isEmpty(), findings }
```

---

## §6 · TREES

### §6.1 THE CALL TREE of one fire

```
the omp tool_call event
└── gate-hook.ts:117 registerGraphGate(pi) [the v2.0 single call site]
    └── runKernelV2(input)                            kernel-v2.ts:264
        ├── preflight(layers) :57 the six layers
        ├── classifyByDetectors(detectors, ctx)       :208
        │   ├── dumbDetector.detect                   :138
        │   ├── theatricalDetector.detect             :155
        │   └── destructiveDetector.detect            :173
        └── [v2.1 NEW] the fire gate on each VIOLATION
            └── FireGate.judge(fire, ctx)             fire-gate.ts:262
                ├── buildState(fire, ctx)             :186
                ├── mpsePreFilter(fire, ctx)          :196
                ├── cache.get(stateHash)              :289
                ├── JevJudge.evaluate(state, qs)      jev.ts:72
                │   └── POST api.typesafe.ai/v1/systemone
                └── the band + the row                :354
```

### §6.2 THE COMPONENT TREE (v2.1's shape on disk)

```
src/omp/
├── typed-write.ts 1243 L EXISTING the store (+ layer_id, derivation,
  freshness)
├── kernel-v2.ts 390 L MODIFIED → +the fire-gate call on each VIOLATION
├── rsi.ts 448 L EXISTING the reflex store + VERIFIED RETIREMENT
├── hard-deps.ts        220 L  EXISTING  the register (no fallbacks)
├── enforcement.ts 270 L EXISTING TSG + Abide (the two-layer kernel)
├── jev.ts 149 L EXISTING the live Jev client (the real endpoint)
├── fire-gate.ts        370 L  NEW       the firing-time decision kernel
├── calibration.ts      185 L  NEW       the derivation machinery
├── oracle.ts ~220 L NEW laterTruth resolution + the re-derive loop
── policy-store.ts ~120 L NEW the versioned policies (D026: data, not
  code)
```

### §6.3 THE FILE TREE the build creates

```
packages/gi-kernel-v2.1/
├── GI_KERNEL_V2.1_MASTER_BLUEPRINT_v1.md      this document
├── 00-MISSION.md                              the mission + the 2 rulings
├── 01-DISCOVERY.md                            the measured inventory
├── GI_KERNEL_V2.1_DPL1_SPEC.md                the build spec
├── 06-WAVES.md                                the wave plan + the gates
├── 07-GOALS.md                                the per-desk contracts
├── 00-INDEX.md                                the read order
── MEASUREMENT_PLAN.md M1-M12 with the method + cost per row
```

---

## §7 · LAWS + INVARIANTS

```
L1 CODE OWNS EVERY BRANCH. Jev returns a probability; the band, the action
  and
    the consequence are code. fire-gate.ts:354 · bible D003
L2 ONE SNAP JUDGMENT PER QUESTION. A composite scores ~0.4 on everything
  and
    never fires (the silent-failure class).      bible D006 · :166
L3 THE STATE IS THE EVIDENCE ONLY. No conversation, no instructions to the
    model. bible D004 · Red Pill #12
L4 BOUNDED STATE, REPORTED TRIM. 18_000 bytes, newest-first, `trimmed` and
    `droppedKinds` always set.                    :139/:176
L5 THE CACHE KEY IS THE CANONICAL STATE. A question-version bump changes
  it,
    so a question edit starts a NEW precision curve.  bible D013 · :267
L6 THE FAIL POLARITY IS PER SURFACE. dumb OPEN, theatrical/destructive
  CLOSED.
    A judge outage must never silently become either.   bible D010 · :316
L7 UNCERTIFIABLE IS NOT A PASS. A missing answer routes by the polarity
  and is
    recorded as such.                             :340
L8  THE BUDGET THROWS. An exhausted budget is LOUD; it never degrades to
    "skip the judgment".                          bible D017 · :306
L9 `laterTruth` IS WRITTEN "unresolved" AT FIRING TIME. Only the oracle
  may
    change it. The firing never assumes its own correctness.  bible §6.4.7
L10 THE THRESHOLD IN FORCE IS RECORDED ON EVERY ROW, so a later
  calibration can
    separate "the model changed" from "the bar moved".    bible §6.4.3 (3)
L11 RE-ROUTING NEVER RE-INFERS. `reroute()` re-decides a stored
  probability
    under a new policy from the ledger alone.             bible §6.4.3 (4)
L12 A QUESTION EDIT IS A NEW INSTRUMENT. `QUESTION_VERSION` is part of the
    cache key and (with the state) invalidates the calibration.   :155
L13 NO CHOSEN CONSTANT SHIPS UNLABELLED. `calibrated:false` + the BASIS
  string
    is the minimum; the health gate is the enforcement. calibration.ts:118
L14 EVERY FIRE LEAVES A ROW. A fire with no row cannot be calibrated,
  cannot be
    audited and cannot be counted.                :358
L15 THE CHEAPEST RUNG THAT CAN ANSWER DOES. MPSE → cache → model, in that
    order, and every rung records its reason.           :271/:289/:313
```

---

## §8 · ERROR VOCABULARY + SCHEMA + SHELL

### §8.1 THE ERROR VOCABULARY (v2.1's new tokens)

```
GI_FIREGATE_BUDGET:<n>/<N>     the per-run fire budget is exhausted (LOUD)
GI_FIREGATE_NO_QUESTION fireQuestion() failed to build (a code defect)
GI_FIREGATE_BAD_COST_MATRIX    C_block + C_miss <= 0 (calibration.ts)
GI_FIREGATE_STARVED:<rule> the act band has never fired — the health gate
GI_FIREGATE_INFLATED:<rule>    act < the measured lower bound
GI_FIREGATE_WIDE:<rule> the interval half-width > 0.15 — n too small
GI_JEV_NO_KEY no key in env and none readable at the key path
GI_JEV_AUTH                    401 from the gateway
GI_JEV_RATE_LIMIT              429 from the gateway
GI_JEV_HTTP:<status>           any other non-2xx
GI_JEV_DOWN the judge threw (the fail polarity routes it)
[carried from v2.0]
GI_STACK_INCOMPLETE:<layer> · GI_LAYER_STALE:<derivation> · GI_BLIND_ACT ·
GI_FABRICATED_CLAIM · CLAIM_REJECTED · GI_VIOLATION · GI_POPULATE_FAILED
```

### §8.2 THE LEDGER SCHEMA (the calibration substrate)

```sql
CREATE TABLE IF NOT EXISTS fire_decisions (
  id               INTEGER PRIMARY KEY,
  at               TEXT NOT NULL,
  rule_id          TEXT NOT NULL,
  cls              TEXT NOT NULL,
  question_version TEXT NOT NULL,
  probability      REAL NOT NULL,
  band             TEXT NOT NULL,
  action           TEXT NOT NULL,
  policy_name      TEXT NOT NULL,
  act_threshold    REAL NOT NULL,
  flag_threshold   REAL NOT NULL,
  state_hash       TEXT NOT NULL,
  cost_usd         REAL NOT NULL DEFAULT 0,
  later_truth      TEXT NOT NULL DEFAULT 'unresolved',
  truth_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_fd_rule_truth ON fire_decisions(rule_id,
  later_truth);
CREATE INDEX IF NOT EXISTS idx_fd_hash ON fire_decisions(state_hash);
```

### §8.3 THE FORKABLE SHELL (the smallest correct fire)

```ts
import { FireGate, absorbContext } from "./src/omp/fire-gate.ts";
import { JevJudge } from "./src/omp/jev.ts";

const gate = new FireGate({ judge: new JevJudge({ timeoutMs: 8000 }),
  budgetFires: 1200 });

const fire = {
  ruleId: "*theatrical", cls: "theatrical",
  shape: "claim with zero bound spans", tool: "goal.complete",
  target: "migration", evidence: "claims=1 unbound=1 spans[0]=0",
};
const ctx = absorbContext(fire, streamRecords); // the lexicon-filtered
  slice
const d = await gate.judge(fire, ctx);

if (d.action === "FIRE") throw new Error(`GI_FABRICATED_CLAIM:
  ${d.reason}`);
// ESCALATE → a human queue · IGNORE → the act proceeds, the row still
  recorded
```

---

## §9 · BACKWARDS MAP + PROVENANCE

### §9.1 Every source component → its blueprint section

```
src/omp/kernel-v2.ts:138/:155/:173  the detectors      §2.S1 · §6.1
src/omp/kernel-v2.ts:264            runKernelV2        §6.1
src/omp/fire-gate.ts:38             Fire               §4.1
src/omp/fire-gate.ts:51             AbsorbedContext    §4.1 · §2.S4
src/omp/fire-gate.ts:78             FireDecision       §4.1 · §2.S6
src/omp/fire-gate.ts:110            Policy             §4.1 · §5.2
src/omp/fire-gate.ts:120 SEED_POLICY §4 · the 2x finding §11
src/omp/fire-gate.ts:150            absorbContext      §2.S4 · §5.1
src/omp/fire-gate.ts:158            fireQuestion       §2.S5
src/omp/fire-gate.ts:196            mpsePreFilter      §2.S2 · §5.1
src/omp/fire-gate.ts:262            FireGate.judge     §2 · §5.1
src/omp/fire-gate.ts:96             DecisionRow        §4.1 · §8.2
src/omp/calibration.ts              the derivation     §5.2 · §5.3
src/omp/jev.ts:72                   JevJudge.evaluate  §2.S5
JEV_ENGINEERING_BIBLE D001-D026     the design laws    §7
JEV_ENGINEERING_BIBLE §6.4.3/6/7    threshold/traps    §7 L10-L13
the 14-case measurement             the first evidence §11
```
**25 of 25 mapped. Zero orphans.**

### §9.2 The variant table

```
──────────────────────────────────────────────────────────────────────────
│ variant │ lines │ deltas │ verdict │
──────────────────────────────────────────────────────────────────────────
│ src/omp/fire-gate.ts │ 370 │ the NEW kernel │ WINNER │
│ src/omp/calibration.ts │ 185 │ the NEW derivation │ WINNER │
│ src/omp/jev.ts │ 149 │ the live client │ WINNER │
│ JEV_ENGINEERING_BIBLE.md │ 3006 │ the design authority │ context │
│ the v2.0 package │ 3246 │ the machinery this extends │ context │
│ the 14-case measurement │ JSON │ the first evidence │ evidence │
──────────────────────────────────────────────────────────────────────────
```

### §9.3 WHAT WAS LEFT OUT and why

```
· the ORACLE's engine (E1) — UNRULED by the operator; the blueprint
  designs the
  seam (oracle.ts, ~220 L) and leaves the engine choice open.
· the ESCALATE target (a human queue? a bigger model? a re-ask?) — a
  policy call;
  the blueprint names the three options and does not pick.
· the per-fire TOKEN budget measurement (M5) — needs a live wired path.
· the TIER LADDER's own thresholds — the same instrument applies; deferred
  until
  the fire gate's curve exists, because the fire gate's numbers are
    upstream of
  every tier decision.
```

---

## §10 · THE BUILD ORDER (waves, with the operator's rulings folded in)

```
W1 THE LEDGER the fire_decisions table + the writer.
    GATE: a row per fire, `laterTruth` defaulting to unresolved.
W2 THE ORACLE (the resolution path) `oracle.ts` — read the firing rows,
  gather
    the downstream evidence, write the outcome. GRADUAL: it can start with
      the
    MPSE-decidable outcomes and grow.
    GATE: a real firing resolved end-to-end with a row.
W3  THE PRE-ACT ADVISORY (position A)   ← the operator's "both"
    the same gate, a Fire built from INTENT, fail-OPEN.
    GATE: an advisory fires on an intended blind edit; a legitimate intent
      passes.
W4  THE POST-DETECTOR FILTER (position B)  ← the operator's "both"
    the gate inserted between the detector's VIOLATION and the v2.0
      verdict.
    GATE: a REAL violation adjudicated FIRE; a false positive IGNORED.
W5 THE POLICY STORE (D026: data, not code) versioned JSON recipes; humans
  edit.
    GATE: a policy edit reloads without a rebuild; the cache key changes.
W6 THE CALIBRATION LOOP the 50+ firing run → derivePolicy flips
    calibrated=true; the health gate goes ok=true.
    GATE: `checkCalibrationHealth` returns ok=true with zero findings.
W7  THE MEASUREMENT SWEEP (M1-M12)   every row in the plan, measured.
    GATE: MEASUREMENT_PLAN.md fully filled with numbers, zero TBD.
W8  THE CONTAINER VERIFICATION       the whole loop in omp-ct:master.
    GATE: 199+/0 in the container + one live adjudicated fire with a
      token.
W9 THE SEAL the v2.1 package + PACKAGE_AUDIT PASS.
```

**W3 and W4 are the operator's "both", and the order matters:** the pre-act advisory lands first
because it is fail-open and cannot break anything, which lets the live path be exercised while the
post-detector filter is still being built.

---

## §11 · THE MEASUREMENT PLAN (NO GUESSES — the operator's ruling 2)

```
──────────────────────────────────────────────────────────────────────────
│ # │ WHAT │ HOW (the instrument) │ COST │ BLOCKS │
──────────────────────────────────────────────────────────────────────────
│ M1 │ THE PRECISION CURVE │ 50+ real firings → oracle outcomes │ ~50
  fires │ W6 │
│ │ per rule │ → Wilson per rule → derivePolicy │ ≈$0.003 │ │
│ M2 │ THE COST MATRIX │ ASK THE OPERATOR per class: │ 1 question│ W6 │
│ │ (the taste input) │ "when this rule is wrong, which │ │ │
│ │ │ error costs more, and by how much"│ │ │
│ M3 │ THE FIRE FLOOR per rule │ firesNeededForGap(p, gap) where │ 0
  derived │ W6 │
│ │ │ gap = the smallest precision delta │ │ │
│ │ │ that changes a decision │ │ │
│ M4 │ THE CACHE HIT RATE │ count(row.cached) / count(rows) │ 0 │ W7 │
│ M5 │ THE PER-FIRE TOKEN COST │ Jev's usage.input_tokens p50/p95 │ 0 │ W7
  │
│ │ vs the <5000 budget │ vs the 18KB state cap │ │ │
│ M6 │ THE LATENCY p50/p95 │ row.latencyMs over N fires │ 0 │ W7 │
│ M7 │ THE CONTEXT TRIM RATE │ count(ctx.trimmed) / total fires │ 0 │ W7 │
│ M8 │ THE MPSE SETTLEMENT RATE │ count(questionVersion LIKE 'mpse%')│ 0 │
  W7 │
│ │ │ / total — the free layer's yield │ │ │
│ M9 │ THE FAIL-POLARITY RATE │ count(policyName LIKE '%+fail-%') │ 0 │ W7
  │
│ │ │ / total — the judge's availability │ │ │
│ M10│ THE ORACLE RESOLUTION │ (confirmed+refuted)/total │ 0 │ W6 │
│ │ RATE (unresolved_ratio) │ — the gate on promotion │ │ │
│ M11│ THE FALSE-NEGATIVE CLASS │ SAMPLE the IGNORE rows and label │ human
  │ W7 │
│ │ (what the gate silently │ them — the ONLY way to see what the│ review
  │ │
│ │ lets through) │ gate ignores wrongly │ │ │
│ M12│ THE STARVATION CHECK │ count(band='act') / total — 0 means│ 0
  (health │ W7 │
│ │ │ the bar is too high │ gate) │ │
──────────────────────────────────────────────────────────────────────────
```

**The three that decide everything:** **M1** (the curve), **M2** (your cost posture — the only input
I cannot measure), **M11** (the class nobody measures: the gate's silent false negatives, visible
only by sampling the IGNORE rows).

**Total cost to close M1-M3: ~$0.003 and one question.** The rest are counters over rows that
already exist.

---

## §12 · THE FIRST MEASUREMENT (carried forward — the 2x finding)

```
14 labelled cases (7 real, each with a false twin differing ONLY in
  context),
through the LIVE Jev API:

real violations  n=7  mean P=0.581  min=0.490
false positives  n=7  mean P=0.253  max=0.530
SEPARABLE (min(real) > max(fp)): false     BEST F1=0.933 at t=0.40
   t=0.70 → precision 1.000 recall 0.000   ← STARVATION

THE SEEDS (0.90 / 0.75 / 0.85) were ~2x too high; the act band fired ZERO
  times.
⇒ A GATE THAT NEVER FIRES IS INDISTINGUISHABLE FROM A GATE THAT WORKS.
   The error was in the FATAL direction and only the instrument could see
     it.

THE MEASURED ANSWER to the fire-floor question: 49 resolved firings to
  resolve a
0.10 gap at p≈0.85 — not the 10 that was guessed.
```

---

## §13 · SELF-CHECK + THE NAMED RESIDUAL

```
[✓] the macro map + the per-stage lifecycle + three dispatch traces
[✓] every type verbatim with its contract (§4.1)
[✓] 13 engine checks in execution order (§4.2)
[✓] pseudocode for the gate, the derivation, the health gate (§5)
[✓] the call tree + the component tree + the file tree (§6)
[✓] 15 laws, each anchored (§7)
[✓] the error vocabulary + the ledger schema + the forkable shell (§8)
[✓] 25/25 source components mapped, zero orphans (§9.1)
[✓] the variant table + what was left out and why (§9.2, §9.3)
[✓] the build order W1-W9 with the operator's "both" as W3+W4 (§10)
[✓] the measurement plan M1-M12 with cost per row and what each blocks
  (§11)
```

**THE RESIDUAL (named, not papered):**
```
1 E1 (the oracle's engine) is UNRULED — oracle.ts is designed as a seam,
  unbuilt.
2  the ESCALATE target is unpicked (human queue / bigger model / re-ask).
3 M2 (your cost matrix) is unanswered — the derivation cannot complete
  without it.
4  every M-row except the 14-case baseline is UNMEASURED.
5 the v2.0 container RB re-run is still OPEN (the 5 PASS rows are
  host-run).
6 W3/W4 change the live gate path — the wiring-order warning stands: with
  L1..L5
   ENOENT and JEV absent, STAGE 0 refuses everything. Engines before
     registration.
```

---

## §14 · THE ONE-PARAGRAPH HANDOFF

v2.1 turns v2.0's detectors from **shape matchers into adjudicated judges**: every fire spends at
most one Noul to decide whether the shape was real, in front of the act (an advisory, fail-open)
and behind the detector (a filter, per-surface polarity), leaving a row that carries the threshold
in force and a `laterTruth` only the oracle may fill. Its numbers are not chosen — they come from
`t = C_block/(C_block+C_miss)` (your posture) combined with a Wilson curve over real firings (the
measurement), and the first instrument run already caught a 2x error in the fatal direction. The
build order is W1 ledger → W2 oracle → **W3 pre-act advisory + W4 post-detector filter (your
"both")** → W5 policy data → W6 the calibration loop → W7 the M1-M12 sweep → W8 container → W9
seal. **The next action is yours: M2 — the cost matrix — because every derived threshold is
waiting on it, and it is the one number only you can give.**
