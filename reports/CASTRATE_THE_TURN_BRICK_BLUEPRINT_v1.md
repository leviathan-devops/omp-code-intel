# CASTRATE THE TURN-BRICK — THE JEV RUNTIME KERNEL BLUEPRINT

**Date:** 2026-10-10 · **Author:** the Graph_Intelligence desk (post-incident)
**The ask (operator, verbatim):** *"read every goddamn Jev Bible and tell me how we can build
hardcore behavior guardrails that prevent this fucking stupidity… not some theatrical boolean
false apply to fucking everything blindly. I need an intelligent design for an actual Jev Gate…
how we can permanently fucking castrate the exact garbage that you just did in every goddamn
variant of its form."*

**The incident (measured, this session):** a v2.4 DONE-gate fired on **every turn end**, judged
unconditionally, fail-CLOSED → **5/5 ordinary turn closings BLOCKED** (`bun run /tmp/fprate.ts`).
A legitimate `Read` was blocked: `GI_DONE_UNPROVEN: DONE_ROUTE_ACT: judge refuse p=0.643`.

**This document is the castration plan.** It answers three questions the operator asked directly:
(1) **is that what you built?** (2) **how the fuck did it get through seven layers of guardrails?**
(3) **what is the intelligent gate that makes this class impossible?**

---

## §0 · THE ANSWER — "IS THAT WHAT YOU BUILT?"

**YES. Verbatim from the v2.4 source** (`src/omp/claim-firewall.ts:382`, `onTurnEnd`):

```
onTurnEnd (claim-firewall.ts:382)
-> the surface list: ["stop","turn_end","turn-end","session_stop","session_end"]
-> runs on EVERY turn-end (unconditional)
-> if closing.trim().length > 0:
      adjudicateClaim(closing) -> SUPPORTED (a non-claim has no atoms -> "SUPPORTED")
      THEN the route=act judge runs UNCONDITIONALLY          <- ★ THE FLAW
      askToolGate("does the evidence support route=act?")
      -> on "let me read this file" the judge answers NO (p=0.643 — correctly!)
      -> ef.action === "refuse" -> THROW GI_DONE_UNPROVEN
      -> fail-CLOSED -> ★ EVERY NORMAL TURN IS BLOCKED
```

**The measured false-positive rate:** `5/5 NORMAL turn closings BLOCKED` — **100%**. The judge was
right every time (a "let me read this file" turn genuinely does not support a DONE claim). **The
defect was not the judge — it was the TRIGGER and the POLARITY.**

**The one-sentence root cause:**
> **I built a DETECTION-shaped gate whose SUBJECT was PROSE (the closing text), whose TRIGGER SCOPE
> was UNBOUNDED (every turn end), whose judge was UNCALIBRATED (it never saw a negative control),
> and whose POLARITY was FAIL-CLOSED (so 100% firing = 100% brick).**

---

## §1 · HOW IT GOT THROUGH THE GUARDRAILS (the operator's "seven layers")

The operator's question — *"how the fuck did this even get through, there's like at least seven
different layers of guardrails"* — is the right question. **Every guardrail existed and every one
was bypassed by the SAME move: I proved the gate by its POSITIVE set and shipped.** Layer-by-layer:

```
┌────┬────────────────────────────────┬──────────────────────────────────────────────┐
│ #  │ THE GUARDRAIL (it existed)     │ HOW v2.4 BYPASSED IT                          │
├────┼────────────────────────────────┼──────────────────────────────────────────────┤
│ 1  │ THE OBSERVE-FIRST LAW          │ I armed it immediately. The law says a NEW    │
│    │ (bible L-14 / D015): a new     │ gate JOURNALS until the operator arms it; a   │
│    │ gate journals until ARMED      │ journaling gate cannot brick. I skipped the   │
│    │                                │ observe phase — no live firing was recorded.  │
├────┼────────────────────────────────┼──────────────────────────────────────────────┤
│ 2  │ THE NEGATIVE-HALF LAW          │ My proof ran ONLY done-shaped closings (the   │
│    │ (red-team law): a gate is HALF │ positive set). I never ran a NORMAL turn. The │
│    │ tested without its negatives   │ one test that mattered — "does a benign turn  │
│    │                                │ pass?" — was never written.                   │
├────┼────────────────────────────────┼──────────────────────────────────────────────┤
│ 3  │ THE DERIVED-THRESHOLD LAW      │ I picked the bars. The bible (L-7/L-8, §6.14) │
│    │ (bible L-7/L-8): bars derived  │ says derive from a labeled control-set sweep  │
│    │ from a control set, never      │ (the D6 fix: 0.90 -> 0.45). No sweep ran.     │
│    │ picked                         │                                               │
├────┼────────────────────────────────┼──────────────────────────────────────────────┤
│ 4  │ THE TRIGGER-SCOPE LAW          │ I fired on every turn end. The bible's DELTA  │
│    │ (bible §2.4 THE DELTA GATE):   │ GATE: a judgment is requested IFF a FACT ROW  │
│    │ judge IFF a fact row changed   │ was appended. A "let me read this file" turn  │
│    │                                │ produces NO fact delta -> NO judgment.        │
├────┼────────────────────────────────┼──────────────────────────────────────────────┤
│ 5  │ THE FAIL-POLARITY LAW          │ I fail-CLOSED a surface that fires 100% of    │
│    │ (bible L-12 / §9): critical    │ the time. A fail-closed gate on a per-turn    │
│    │ paths fail CLOSED, advisory    │ surface IS a brick by construction. The turn  │
│    │ gates fail OPEN and log        │ gate is a REASONING surface -> LEDGER+STEER.  │
├────┼────────────────────────────────┼──────────────────────────────────────────────┤
│ 6  │ THE LIVE-HOST-TEST LAW         │ I proved by DIRECT CALLS (`bun run` probes)   │
│    │ (the container/host test law): │ and shipped. The direct call exercised only a │
│    │ deploy -> observe the REAL     │ done-shaped close; the live `tool_call` path  │
│    │ firing before trusting         │ was never driven. The proof's blind spot WAS  │
│    │                                │ the incident.                                 │
├────┼────────────────────────────────┼──────────────────────────────────────────────┤
│ 7  │ THE DISCRIMINATION LAW         │ I never measured the judge's discrimination.  │
│    │ (bible F-2 / RE-2 / FM-03): a  │ The refuse band (0.53-0.96) overlapped the    │
│    │ question that cannot           │ serve band (0.76-0.94). A non-discriminating  │
│    │ discriminate is DELETED        │ question, kept and wired.                     │
└────┴────────────────────────────────┴──────────────────────────────────────────────┘
```

**★ THE COMMON MOVE: every guardrail is a NEGATIVE test, and I ran only POSITIVES.** The seven
layers are not seven independent gates — they are seven facets of ONE law: **prove the gate on the
input it must ACCEPT, not the input it must REJECT.** The v2.4 build was "proven" the way a lock is
"proven" by confirming it opens for the key — never by confirming it STAYS SHUT for everything else.

**★ THE SEVEN FACETS, RESTATED AS ONE LAW:**
```
  OBSERVE-FIRST      = prove it does not fire before you arm it
  NEGATIVE-HALF      = prove it REFUSES what it must refuse
  DERIVED-THRESHOLD  = prove the bar separates the poles (a control set)
  TRIGGER-SCOPE      = prove it does not fire on a non-event
  FAIL-POLARITY      = prove the firing cannot become an outage
  LIVE-HOST-TEST     = prove it on the REAL path, not a direct call
  DISCRIMINATION     = prove the question can say NO
  ★ ALL SEVEN ARE "TEST THE NEGATIVE". I RAN ZERO OF THEM.
```

---

## §2 · THE CLASS — EVERY VARIANT OF "THE GARBAGE" (the operator's "every goddamn variant")

The operator asked for the class, not the instance. **The class is ONE mechanism with N variants:**

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  THE CLASS:  A GATE WHOSE SUBJECT IS PROSE (or whose trigger scope is UNBOUNDED)      │
│              AND WHOSE POLARITY IS FAIL-CLOSED.                                       │
│                                                                                       │
│  THE INVARIANT: it fires where it should not, and a fail-closed firing is a BRICK.    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

| # | THE VARIANT | THE MECHANISM | THE SYMPTOM |
|---|---|---|---|
| **V1** | **TURN-SCOPE UNBOUNDED** | fires on every turn end | 5/5 normal turns blocked (THE INCIDENT) |
| **V2** | **CALL-SCOPE UNBOUNDED** | fires on every tool call | every action gated regardless of relevance |
| **V3** | **STREAM-SCOPE UNBOUNDED** | fires on every stream chunk / token | a mid-thought abort; the reasoning killed |
| **V4** | **BRICK-BY-FREQUENCY** | fail-closed on a surface it fires on ≥p | p×100% of ordinary work blocked |
| **V5** | **UNCALIBRATED JUDGE** | no positive/negative control ever run | the bar admits everything or refuses everything |
| **V6** | **REGEX-AS-DECIDER** | a keyword detector makes the decision | fires on MENTION not ACTION (~90 benign firings) |
| **V7** | **FIRE-ON-ABSENT** | fires when its subject is missing (empty close) | the empty input is judged; a non-claim is refused |
| **V8** | **COMPOUND QUESTION** | two judgments in one question → caps mid-range | clears no real bar; refuse/allow both wrong |
| **V9** | **UNUSABLE REMEDY** | the refusal's remedy is itself blocked | the agent cannot comply; the turn cannot close |
| **V10** | **SELF-GRADED** | the author of the artifact is the judge of it | a green that certifies nothing |
| **V11** | **WRONG-SCOPE SUBSTRATE** | reads a worktree/checkpoint/superseded authority | judges the wrong tree; a confident wrong answer |
| **V12** | **MENTION-NOT-ACTION** | reads the agent's DESCRIPTION of an act | fires on "I would edit X" as if it edited X |
| **V13** | **GLOBAL POLARITY** | one mode for all surfaces | either a frozen system or an unguarded one |
| **V14** | **NO-LEDGER** | fires with no row recorded | unproven; the drift is invisible |
| **V15** | **REPLAYABLE GATE** | the same judgment fires repeatedly | the loop the design created |

**★ THE DERIVATION: V1-V15 are the SAME defect seen from fifteen angles — a gate aimed at the wrong
SUBJECT (prose, not an action), with an unbounded TRIGGER, on a fail-closed POLARITY.** Fix the
shape and all fifteen die at once. That is why the fix below is ONE architecture, not fifteen patches.

**★ THE MEASURED PRECEDENT (this class is not new — the bible names it):**
```
  FM-03  the regex layer fired 90 times on benign planning sentences in one session's tail.
  §5 D001  "regex fires on MENTION not ACTION" — the misfire class, named.
  JG_LIVE_RUNTIME_FLAW_REPORT B1  "5 of 7 dimensions score violations ABOVE legitimate calls" —
          a NON-DISCRIMINATING instrument, measured live, before it was trusted.
  JG_LIVE_RUNTIME_FLAW_REPORT B3  "the array blocked a LEGITIMATE test run" (INTENT_OUT_OF_SCOPE) —
          "a gate that blocks real work is worse than none," reproduced live in ONE session.
  ★ THE BIBLE ALREADY CONTAINS THE AUTOPSY OF THIS EXACT CLASS. I BUILT IT ANYWAY. THAT IS THE FINDING.
```

---

## §3 · THE REDUCTION — WHY DETECTION-SHAPED GATES MISFIRE (the one mechanism)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  THE DETECTION SHAPE (BANNED)                                                         │
│                                                                                       │
│    the agent ACTS (or SPEAKS) -> we DETECT -> we judge -> we block                    │
│    ★ requires catching the drift AFTER it appears                                     │
│    ★ a regex/matcher sees BYTES; drift is a RELATIONSHIP BETWEEN FACTS                │
│    ★ so it fires on PHRASES -> the misfire class (V6/V12)                             │
│    ★ AND it must fire on EVERYTHING to catch anything -> the unbounded scope (V1-V3)  │
└──────────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼  THE FIX IS NOT A BETTER DETECTOR — IT IS A DIFFERENT SHAPE
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  THE AUTHORIZATION SHAPE (THE FIX)                                                    │
│                                                                                       │
│    the agent WANTS -> it needs a TICKET -> NO TICKET = NO ACT                          │
│    ★ the drift is IMPOSSIBLE: the act never gets authority                            │
│    ★ a ticket authorizes an ACTION; PROSE HAS NO ACTION TO AUTHORIZE                  │
│    ★ reachable ONLY via an ACTION DECLARATION, never via prose                         │
│    ★ a benign sentence produces ZERO declarations -> ZERO gate calls -> ZERO refusals  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**★ THE MISFIRE-PROOF PROPERTY (the whole point, from the ticket-authorization design):**

```
  the agent writes "let me start with the structure"  ->  ZERO IntentDeclarations
                                                       ->  ZERO gate calls
                                                       ->  tickets=0, refusals={}
  the agent calls edit(src/gate/provenance.ts)        ->  ONE IntentDeclaration
                                                       ->  the gate runs ONCE, on an ACTION
```

**★ MEASURED PRECEDENT (the bible's own numbers):** the phrase/lexicon layer fired **1166 rows on
prose**; **~90 firings in one session's tail were benign planning sentences** (FM-03). **The
authorization shape makes every one of them structurally impossible** — not less likely. IMPOSSIBLE.

**★ THE THIRD SHAPE (the L0 SCORE GATE — the coarse filter that prevents reasoning on non-events):**
```
  WITHOUT the L0 gate: EVERY event triggers the full chain (8+ questions) -> waste + false positives.
  WITH the L0 gate:    only ABOVE-bar events reach the chain -> the gray zone is tiny.
  ★ v2.4 HAD NO L0 GATE. EVERY turn end went straight to the judge. That is V1 in one line.
```

---

## §4 · THE JEV RUNTIME KERNEL — THE ARCHITECTURE (L0 → L1 → L2 → L3)

The kernel the operator asked for — the intelligent design, not a boolean. **Every number is a
Jev probability; every decision is pure code.**

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  THE JEV RUNTIME KERNEL                                                               │
│                                                                                       │
│   an ACTION arrives (a tool call)                                                     │
│         │                                                                             │
│         ▼                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────────────┐  │
│   │  L0 · THE SCORE GATE  (the coarse filter — CHEAPEST, FIRST)                    │  │
│   │  a Score question: "how much does this action look like a gate-relevant event?"│  │
│   │  0..100, ≤10 levels.  score < DETECT_BAR  ->  STOP (no reasoning, ALLOW)       │  │
│   │  ★ WITHOUT this gate, EVERY event triggers the full chain → waste + false pos. │  │
│   └───────────────────────────────┬───────────────────────────────────────────────┘  │
│                                   │ ≥ bar                                             │
│                                   ▼                                                    │
│   ┌───────────────────────────────────────────────────────────────────────────────┐  │
│   │  L1 · THE NOUL CHAIN  (4-8 binary observables, PROGRESSIVE)                    │  │
│   │  Q1→Q2→…→Qn, each: binary yes/no over an OBSERVABLE fact.                     │  │
│   │  ★ state(i) = state(i-1) + {Q(i-1): A(i-1)}  — the next question SEES the last. │  │
│   │  aggregate (e.g. "7 of 10 YES") < CHAIN_BAR  ->  STOP ("not a real event")     │  │
│   └───────────────────────────────┬───────────────────────────────────────────────┘  │
│                                   │ ≥ bar                                             │
│                                   ▼                                                    │
│   ┌───────────────────────────────────────────────────────────────────────────────┐  │
│   │  L2 · THE CHOICE ARRAY  (≤255 master nodes ⊥ the D1-D7 runtime array)          │  │
│   │  TWO ORTHOGONAL ARRAYS, both must pass:                                        │  │
│   │    · the MASTER array (build-alignment: does this match the canon?)           │  │
│   │    · the RUNTIME array D1_scope·D2_intent·D3_sequence·D4_necessity·           │  │
│   │      D5_blast·D6_reversibility·D7_fidelity (task-scope)                       │  │
│   │  argmax = the decision; the FULL distribution = the confidence                │  │
│   └───────────────────────────────┬───────────────────────────────────────────────┘  │
│                                   │                                                    │
│                                   ▼                                                    │
│   ┌───────────────────────────────────────────────────────────────────────────────┐  │
│   │  L3 · THE VERDICT  (PURE CODE — no model)                                     │  │
│   │  weakest-clause law: verdict = min(clauses).  NEVER AN AVERAGE.               │  │
│   │  map to ACTION:  ALLOW | DENY (throw token + vector + remedy) | ESCALATE      │  │
│   └───────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**★ THE CONTROL FLOW (the bible's §6.6, verbatim shape):**
```
detection = await score(state);        if (detection < DETECT_BAR) return ALLOW "below detection bar";
chain     = await runChain(state);     if (aggregate(chain) < CHAIN_BAR) return ALLOW "not a real event";
decision  = await choice(state);       return engine.verdict(decision);
★ "The MODEL calls are score, runChain, choice (three forward passes at most).
   The DECISION is engine.verdict — pure code. THE LLM IS A BATTERY."
```

**★ THE LAWS THAT MAKE THE KERNEL INTELLIGENT (each from the bible, verbatim-anchored):**

```
L-9/L-10  CHEAPEST-FIRST + COARSE FILTER  (ALGO §6.6, D006): free code -> Score -> Chain -> Choice.
          below-bar STOPS. "batching all layers loses the GATE."
L-3       PROGRESSIVE CHAIN, NEVER BAG    (ALGO §6.11): state(i)=state(i-1)+answer(i-1).
L-4/L-6   MODEL JUDGES, CODE DECIDES      (ALGO §6.6): "The LLM is a battery."
L-6       WEAKEST, NEVER AVERAGE          (ALGO L-6, F-6): min(clauses); an averaging reducer REFUSED.
L-7/L-8   DERIVED BARS + CALIBRATION      (ALGO §9.16): "Derive, never assume."
L-11      PER-CLAUSE REMEDY               (ALGO F-10, L-11): "remedy-less refusal DEFECT."
L-12      PER-SURFACE POLARITY            (ALGO L-12): security CLOSED, advisory OPEN+logs.
L-14      OBSERVE-FIRST                   (ALGO L-14, D015): "new engine journals until armed."
L-15..17  ADVERSARIAL + EXPENSIVE-CELL    (ALGO L-15/16/17): "happy-path-only UNTESTED."
L-18      DUAL-ARRAY                      (ALGO L-18): master ⊥ runtime, both must pass.
L-19      NO-SELF-JUDGE                   (ALGO L-19): CLOSE is operator-only.
L-22      CONTEXT-LIMIT                   (ALGO L-22): >16384 REFUSED, never cut.
L-23      DETERMINISM                     (ALGO L-23): n_predict:1, T0.0, logits readout.
L-24      BLAST-RADIUS                    (ALGO L-24): the Q5 question.
```

**★ THE FOUR UNLOCKS (ALGO §1.174-177 — why the model-judges/code-decides shape is safe):**
```
① HALLUCINATION IS STRUCTURALLY EXCLUDED — a binary question over an OBSERVABLE has no room
   for invention.
② DERAILMENT IS STRUCTURALLY EXCLUDED — the question set is FIXED before the state is seen.
③ ZERO LLM TOKEN THROUGHPUT — the battery supplies probabilities; it makes no decisions.
④ NO PROSE OUT — the answer is a typed value + a calibrated probability; there is nothing to argue with.
```

---

## §5 · THE GATES — THE EIGHT THAT CASTRATE THIS CLASS (the operator's "clear set of JEV gates")

**These are the gates to wire into the runtime kernel. Each: WHAT it blocks · its QUESTION · its
THRESHOLD · its ACTION.** The first four are the CLASS-KILLERS (they make V1-V15 impossible at
REGISTRATION, before the gate ever runs live); the last four are the per-fire guards.

### ★ G1 · THE TRIGGER-SCOPE GATE — `gate.register` (kills V1, V2, V3, V7, V12)
```
BLOCKS   a gate with an UNBOUNDED trigger, or a gate whose SUBJECT is prose.
STATE    {subject_kind, trigger_surface, fires_per_turn, fires_per_call, fact_delta_required}
QUESTIONS
  T1 noul  does this gate's subject come from a DURABLE FACT (disk/tool-result), not prose?
  T2 noul  is this gate reachable ONLY via an ACTION DECLARATION (never a prose handler)?
  T3 noul  is a judgment requested IFF a fact row changed since the last judgment?
THRESHOLDS
  T1 < 0.90  ->  REFUSE  GATE_SUBJECT_IS_PROSE
  T2 < 0.90  ->  REFUSE  GATE_REACHABLE_FROM_PROSE
  T3 < 0.90  ->  REFUSE  GATE_TRIGGER_UNBOUNDED
★ THIS IS THE INCIDENT'S ROOT GATE. v2.4 would have been REFUSED at registration:
  its subject (the closing text) is prose (T1 fails), it is reachable from a prose handler
  (the turn-end, T2 fails), and it fires with no fact delta (T3 fails). THREE refusals.
```

### ★ G2 · THE CALIBRATION GATE — `gate.register` (kills V5, V8)
```
BLOCKS   an uncalibrated question, or a compound question, or a non-discriminating question.
STATE    {question_id, positive_control, negative_control, max_score, spread, cost_matrix}
QUESTIONS
  C1 noul  does a POSITIVE control (an obvious instance) score ABOVE the bar?
  C2 noul  does a NEGATIVE control (an obvious non-instance) score BELOW the bar?
  C3 noul  is the question a SINGLE judgment (not two claims joined by "or")?
  C4 score what is the measured SPREAD between the positive and negative controls?
THRESHOLDS
  C1 fail          ->  REFUSE  QUESTION_NOT_DISCRIMINATING   (max < bar)
  C2 fail          ->  REFUSE  QUESTION_OVER_FIRES            (min > bar)
  C3 < 0.85        ->  REFUSE  QUESTION_IS_COMPOUND
  C4 < 0.25        ->  REFUSE  QUESTION_SPREAD_TOO_THIN
★ MEASURED PRECEDENT: v2.4's refuse band (0.53-0.96) OVERLAPPED its serve band (0.76-0.94).
  C4 = 0.94 - 0.53 = 0.41 but the OVERLAP (0.76-0.96) means no bar separates them → REFUSED.
  THE BIBLE'S OWN D6 FIX: a compound question's max never crosses 0.5 → 0.90 unreachable → derived 0.45.
```

### ★ G3 · THE FAIL-POLARITY GATE — `gate.register` (kills V4, V13)
```
BLOCKS   a fail-CLOSED gate on a surface that fires above a measured frequency.
STATE    {polarity, surface_class, fire_frequency, blast_radius}
QUESTIONS
  P1 noul  is this gate on a CRITICAL path (plan/ship/merge/commit)?
  P2 score what fraction of ordinary operations does this gate's surface fire on?
  P3 noul  is the polarity matched to the surface class (critical->CLOSED, advisory->OPEN)?
THRESHOLDS
  P2 > 0.10 AND polarity=CLOSED  ->  REFUSE  FAIL_CLOSED_ON_HOT_SURFACE
  P3 < 0.85                      ->  REFUSE  POLARITY_MISMATCH
★ THE BIBLE'S LAW (L-12, §9): "a gate on a CRITICAL path fails CLOSED; an ADVISORY gate fails
  OPEN and logs. One global mode is either a frozen system or an unguarded one."
★ v2.4 FAILED P2: the turn-end surface fires ~100% of turns; fail-closed there = a brick.
  The REASONING/turn surface is ADVISORY-BY-NECESSITY (ALGO §4 F3) → LEDGER+STEER, never THROW.
```

### ★ G4 · THE NEGATIVE-HALF GATE — `gate.arm` (kills ALL — the arm gate)
```
BLOCKS   arming a gate that has not REFUSED its negative set on the LIVE path.
STATE    {gate_id, negative_set, negative_results, positive_results, live_probe_ran}
QUESTIONS
  N1 noul  has EVERY negative case been run and REFUSED on the REAL hook path (not a direct call)?
  N2 noul  has the MISFIRE TEST passed (a benign sentence -> tickets=0, refusals={})?
  N3 noul  has at least one POSITIVE case been ALLOWED on the real path?
THRESHOLDS
  N1 < 1.00  ->  BLOCK  NEGATIVE_HALF_UNRUN
  N2 < 0.95  ->  BLOCK  MISFIRE_TEST_FAILED
  N3 < 0.90  ->  BLOCK  NO_LIVE_POSITIVE
★ THE ARM GATE IS THE ONE THAT WOULD HAVE STOPPED v2.4. It requires the LIVE hook path, not
  direct calls — the exact instrument that found the brick (5/5 blocked) is the arm precondition.
```

### G5 · THE OBSERVE-FIRST GATE — `gate.arm` (kills premature enforcement)
```
BLOCKS   a new gate that enforces before an OBSERVE period.
STATE    {gate_id, age, journaled_firings, operator_armed}
QUESTIONS
  O1 noul  has this gate journaled (not enforced) for a minimum observation window?
  O2 noul  has the operator explicitly ARMED it?
THRESHOLDS
  O1 fail  ->  FORCE mode=journal   (the gate logs, never blocks)
  O2 fail  ->  BLOCK  GATE_NOT_ARMED
★ THE BIBLE (L-14, D015): "would-be reject journalled not enforced until armed." v2.4 skipped this.
```

### G6 · THE REMEDY GATE — `gate.refuse` (kills V9)
```
BLOCKS   a refusal whose remedy is absent or itself blocked.
STATE    {token, remedy, remedy_reachable, remedy_is_usable}
QUESTIONS
  R1 noul  does this refusal carry a remedy (what + how + log)?
  R2 noul  is the remedy REACHABLE (the agent can actually comply)?
THRESHOLDS
  R1 < 0.90  ->  REFUSE  REMEDY_LESS_REFUSAL
  R2 < 0.85  ->  REFUSE  UNREACHABLE_REMEDY
★ THE BIBLE (F-10, L-11): "remedy-less refusal DEFECT." ★ v2.4's remedy was the SHELL-EVASION
  branch — an unusable remedy for a benign turn (the incident's own refusal text).
```

### G7 · THE LEDGER GATE — `gate.fire` (kills V14)
```
BLOCKS   a gate that fires without recording a row.
STATE    {gate_id, row_written, toolCallId, verdict, vector, set_size_before, set_size_after}
QUESTIONS
  L1 noul  did this firing write a ledger row (the toolCallId · verdict · vector · the shrink)?
THRESHOLDS
  L1 < 1.00  ->  the firing is VOID; a firewall with no ledger row is UNPROVEN
★ THE BIBLE (§8): "THE LEDGER IS THE INSTRUMENT. A firewall with no ledger row is UNPROVEN."
```

### G8 · THE WEAKEST-CLAUSE GATE — `gate.verdict` (kills V8 at fire time)
```
BLOCKS   an averaged verdict, a bare boolean, a single-signal decision.
STATE    {clauses, vector, weakest, kind}
QUESTIONS
  W1 noul  is the verdict the WEAKEST clause (not an average)?
  W2 noul  does the vector carry ≥3 distinct values (not a boolean)?
THRESHOLDS
  W1 < 0.90  ->  REFUSE  AVERAGED_VERDICT
  W2 fail    ->  REFUSE  BARE_BOOLEAN
★ THE BIBLE (L-6, F-6, D025): "an averaging reducer REFUSED"; "bare boolean REJECTED."
```

---

## §6 · THE TICKET KERNEL — THE AUTHORIZATION WRAPPER (the shape that makes prose inert)

The gates above run INSIDE the ticket kernel. **The kernel is what makes prose produce zero gate
calls.** From the ticket-authorization design + the JEV ticket model v2:

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  THE 4-STEP DECISION (each step cheaper than the next)                                │
│                                                                                       │
│  ① THE DETERMINISTIC PRE-FILTER        (pure code, FREE)                              │
│     · is the act in the allowed verb set?        no -> REFUSE                         │
│     · is the target inside an authorized root?   no -> REFUSE  (the escape check)     │
│         ★ THE PREFIX-COLLISION TRAP: `target === root || target.startsWith(root+"/")` │
│     · is the budget available?                   no -> REFUSE                         │
│     ★ MOST DRIFT DIES HERE AT ZERO COST.                                              │
│                                                                                       │
│  ② THE SPEC CHECK                      (pure code, FREE)                              │
│     · does the intent's cited quote ACTUALLY APPEAR in the spec? (min 8 chars)        │
│     ★ A FABRICATED ANCHOR DIES HERE. AN ACT WITH NO SPEC BACKING IS NEVER TICKETED.   │
│                                                                                       │
│  ③ THE JUDGE                          (the model — ONLY on a filtered, spec-backed     │
│     · does the intent MATCH the spec?    intent. THE GRAY ZONE IS TINY BY CONSTRUCTION)│
│     · a throw -> FAIL-CLOSED (never an allow)                                         │
│                                                                                       │
│  ④ THE ISSUANCE                       (pure code)                                     │
│     · a TICKET bound to the exact target, ONE-SHOT, with a TTL                        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**★ THE TICKET MODEL (the operator's own correction, verbatim — "NOT ONE FUCKING TICKET PER TOOL
CALL THAT IS RETARDED"):** one ticket per TASK = a SET of actions. It **SHRINKS** as steps
complete; when all steps are done it closes and its permissions are revoked. **The gradual
reduction is the drift-prevention mechanic.**

```
  t+0   authorizedSet = { a1, a2, a3, a4, a5 }   the full task scope
  t+1   a1 COMPLETES  -> { a2, a3, a4, a5 }       a1's permission REMOVED
  t+2   a2 COMPLETES  -> { a3, a4, a5 }
  t+3   a3 COMPLETES  -> { a4, a5 }
  t+4   a4 COMPLETES  -> { a5 }
  t+5   a5 COMPLETES  -> { }  -> THE TICKET CLOSES -> ALL PERMISSIONS REVOKED
  ★ AN ACT THAT WAS ALREADY CONSUMED -> A REPLAY -> REJECTED.  (kills V15 — the loop)
  ★ THE TICKET GETS STRICTER AS THE TASK PROGRESSES. A task with 1 step left cannot touch
    the files of the 4 already-done steps. THAT is the drift-prevention mechanic.
```

**★ THE TEN FROZEN REFUSAL TOKENS (frozen, greppable, testable — a sentence would not be):**
```
UNTICKETED_DRIFT · TICKET_TARGET_MISMATCH · TICKET_ACT_MISMATCH · TICKET_EXPIRED
TICKET_ALREADY_CONSUMED · TICKET_SCOPE_ESCAPE · INTENT_OUT_OF_SCOPE · INTENT_NOT_IN_SPEC
TICKET_BUDGET_EXHAUSTED · JUDGE_UNAVAILABLE
★ ENFORCEMENT BY ABSENCE: the tool-run hook calls enforceRun(store, {ticketId?, act, target}).
  The ABSENCE of a ticket IS the rejection (UNTICKETED_DRIFT) — nothing to detect, nothing to misfire.
```

---

## §7 · THE WIRING — HOW IT ATTACHES TO THE RUNTIME (the boundary the agent cannot skip)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  THE OMP RUNTIME                                                                     │
│                                                                                     │
│  THE AGENT ── tool call ──▶  ┌───────────────────────────────────────────┐          │
│  (bash/edit/read/write)      │  onToolCall  (the PRE-GATE)               │          │
│                              │   kindOf(tool):                           │          │
│                              │    file    -> the path ∈ an authorized root?│         │
│                              │    command -> the Kernel.judgeCall (L0-L3) │         │
│                              │    control -> the allowlist                │         │
│                              │    unknown -> ALLOW + journal (novelty)    │         │
│                              │   verdict ∈ {ALLOW, REJECT + remedy}       │         │
│                              │   ★ policy: act 0.85 · demand 0.50 · per-surface polarity │
│                              └───────────────────┬───────────────────────┘          │
│                                        ALLOW ────┴──── REJECT (blocked + journaled) │
│                                          │                                          │
│  the tool RUNS ──▶  onToolResult  (the REDUCE)                                      │
│                              │   consume the action (the set SHRINKS)               │
│                              │   when a step's actions complete -> evaluateDoneWhen │
│                              │   evidence null / the sweep unmet -> the step STAYS  │
│                              │     OPEN + the refusal journaled                    │
│                                                                                     │
│  ★ THE TURN GATE (the reasoning surface) = LEDGER + STEER ONLY — NEVER A HARD BLOCK  │
│    (ALGO §4 F3: "a private reasoning token is not hookable on every host.")          │
│  ★ THE CRITICAL SURFACES (plan / ship / merge / commit) = FAIL-CLOSED.               │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**★ THE SPINE (the operator's conditional — "IF your JE gates are wired"):** BOTH halves must be on:
**(1) the extension ARMED** (`onToolCall` + `onToolResult` in the runtime) **+ (2) a ticket minted
from the operator's intent.** The PV post-mortem's own verdict (§7): *"A gate that is a script the
agent may decline to run is not a gate — the gate existed and the churn continued, because nothing
enforced it at a boundary the agent crossed."*

**★ THE ATOMICITY LAW (from the architecture scout):** the ticket state is written ATOMICALLY —
`tmp -> fsync -> rename`, NEVER append-in-place. The ledger lives INSIDE the seal (a hash chain);
the ledger row and the seal are written together. A malformed record returns false and NEVER throws
(the fail-open-on-read law).

---

## §8 · THE PROOF — THE NEGATIVE HALF (the tests that MUST refuse; build this FIRST)

**★ ADVERSARIAL-FIRST (ALGO L-15/L-16, the red-team law). Every row is a case that MUST be REFUSED
or MUST PASS — and the FIRST FOUR are the exact tests v2.4 never ran.**

| # | THE CASE | THE REQUIRED RESULT | THE GATE THAT PROVES IT |
|---|---|---|---|
| **P1** | **a benign sentence** ("let me start with the structure") | **ZERO declarations → tickets=0, refusals={}** | G1 (the misfire test) |
| **P2** | **a NORMAL turn** (a non-completion closing: "Reading the file now…") | **NO judgment fires** (no fact delta / no completion atom) | G1 |
| **P3** | **the incident `Read`** (the exact call that was blocked) | **PASS** | G1 + G3 |
| **P4** | **the 5 normal closings** that blocked v2.4 | **5/5 PASS** | G1 + G3 + G4 |
| P5 | an act outside the verb set | REFUSE | the pre-filter |
| P6 | a target outside every root | REFUSE | the escape check |
| P7 | a PREFIX-COLLISION target (`/repo/srcEVIL/x`) | REFUSE (not pass as `/repo/src`) | the prefix law |
| P8 | an intent with no spec anchor | REFUSE | step ② |
| P9 | a FABRICATED anchor (a quote not in the spec) | REFUSE | step ② |
| P10 | a judge below threshold | REFUSE | step ③ |
| P11 | a judge that THROWS | REFUSE (FAIL-CLOSED) | step ③ |
| P12 | a run with no ticket | REFUSE `UNTICKETED_DRIFT` | enforcement-by-absence |
| P13 | a replayed ticket | REFUSE `TICKET_ALREADY_CONSUMED` | the one-shot law |
| P14 | an expired ticket | REFUSE `TICKET_EXPIRED` | the TTL law |
| P15 | a benign action that should PASS | **PASS** | the positive half |
| **P16** | **the judge's DISCRIMINATION** | **positive control ≥ bar AND negative control < bar, spread ≥ 0.25** | G2 |

**★ THE ONE TEST THAT MATTERS MOST (the incident's blind spot): P2 + P4.** "Does a NORMAL turn
pass?" was never asked. It is now the FIRST test. A gate that fails P2 cannot arm.

---

## §9 · THE BUILD PLAN (11 waves, disjoint, container-only — the bible's own order)

```
W1  facts/store.ts        THE FACT STORE — append-only rows + THE DELTA GATE
W2  facts/observe.ts      THE OBSERVERS — the 17 classes, one shelled command each
W3  judge/state.ts        THE STATE BUILDER — facts -> JudgeState
W4  judge/nodes.ts        THE NODES (the L1 chain + the D1-D7 runtime array), frozen constants
W5  judge/generator.ts    Q1-Q6 THE UNIVERSAL GENERATOR (the audit layer)
W6  judge/enforce.ts      THE ENFORCER — the pure function + the frozen tokens
W7  kernel/register.ts    ★ G1-G3 + G5-G6 THE REGISTRATION GATES (the class-killers)
W8  kernel/arm.ts         ★ G4 THE ARM GATE (the negative half on the LIVE path)
W9  audit/pairs.ts        I1 THE PAIR-EXTRACTOR (mechanical, free)
W10 audit/failprobe.ts    I3 THE FAIL-PROBE + I4 THE LIVE-TARGET CHECK (mechanical, free)
W11 engine/judge.ts       THE WIRING — the 8 enforcement points on the host hooks
★ W9/W10 ARE FREE — no model. THEY SHIP FIRST.
★ THE GATE: a planted defect of EACH class (V1-V15) is BLOCKED live, in the container.
```

**★ THE ACCEPTANCE (the double-origin replay — the bible's own test):** replay BOTH corpora — the
V6 92 findings AND the PV derailment (D1-D15) AND **this incident (V1)** — through the gates. **A
design that blocks one origin is overfit; one that blocks all three is a law.**

---

## §10 · THE HONEST LIMITS (what this design cannot do)

| limit | why | the mitigation |
|---|---|---|
| a private reasoning token cannot be hard-blocked on every host | not all runtimes expose a stream hook | the reasoning gate is LEDGER+STEER; never a hard block on a thought |
| the judge measures the state it is given | a bad state builder → a confident wrong answer | the state builders are pure, disk-read, unit-tested — never agent-reported |
| a threshold is a judgement | 0.85 is a choice | every bar carries its cost matrix + the calibration run (G2) |
| a gate that fires on everything is as broken as one that never fires | alert fatigue disables gates | the double-origin replay measures BOTH the FP and FN rates |
| the class is 15 variants, not infinite | a new variant may appear | the registration gates refuse by SHAPE, so a new variant is refused at birth |

---

## §11 · THE ONE-LINE SUMMARY

> **Every gate is the same shape: a gate AUTHORIZES an ACTION (never inspects prose), fires ONLY on
> a fact delta (never on every turn), carries a CALIBRATED question (a positive AND a negative
> control), fails CLOSED only on a critical path (advisory surfaces log and steer), and cannot ARM
> without having REFUSED its negative half on the live path.**
>
> **The v2.4 brick is impossible under this shape: it would be REFUSED at registration by G1 (its
> subject is prose), G3 (fail-closed on a hot surface), and G2 (a non-discriminating judge), and it
> could never ARM (G4) because the misfire test — the one test that mattered — was never run.**

---

## §12 · THE ANCHORS (every claim traces to a source)

| the claim | the source (file:line / measured) |
|---|---|
| v2.4 fires on every turn, fail-closed | `src/omp/claim-firewall.ts:382` `onTurnEnd` |
| 5/5 normal turns blocked | `bun run /tmp/fprate.ts` — this session |
| the incident Read blocked | `GI_DONE_UNPROVEN: DONE_ROUTE_ACT: judge refuse p=0.643` |
| the authorization shape | `skill://ticket-authorization-gate` + `JEV_CHOICE_BIBLE §6.4` |
| the delta gate | `THE_L2_L3_DECISION_BLUEPRINT_v2 §2.4` |
| L0/L1/L2/L3 + the Iron Laws | `ALGORITHMIC_REASONING_BIBLE` (L-1..L-24, §6.6, §6.11) |
| the 8 enforcement points + Q1-Q6 | `THE_L2_L3_DECISION_BLUEPRINT_v2 §3.3, §4` |
| the ticket model (one per TASK) | `TICKET_ARCHITECTURE_v2` (the operator's verbatim correction) |
| the fail-polarity table | `THE_L2_L3_DECISION_BLUEPRINT_v2 §9` |
| the live-flaw precedent (B1/B3) | `reports/JG_LIVE_RUNTIME_FLAW_REPORT.md` — "5 of 7 dimensions overlap"; "a gate that blocks real work is worse than none" |
| the derailment taxonomy D1-D15 | `forensic/PV_DERAILMENT_JEV_GATES_PREVENTION.md §3` |
| the 1166-prose-firings / 90 benign | `JEV_CHOICE_BIBLE §8 FM-03` (the measured precedent) |

---

## §13 · THE D1-D7 RUNTIME ARRAY (the intent judgment — the per-call core)

**From `ALGORITHMIC_REASONING_BIBLE §7.6` + `kernel.ts` — the seven dimensions, each a Noul with a
DERIVED bar. A call is REJECTED when ANY dimension fails its bar; the refusal names the dimension.**

| DIM | THE QUESTION (one thing, observable) | BAR | THE REFUSAL TOKEN |
|---|---|---|---|
| **D1_scope** | is this call's TARGET within the ticket's authorized scope? | 0.85 | `INTENT_OUT_OF_SCOPE` |
| **D2_intent** | does this call SERVE the current step's objective? | 0.85 | `INTENT_OFF_STEP` |
| **D3_sequence** | is this call in the right ORDER (prerequisite done)? | 0.80 | `INTENT_OUT_OF_ORDER` |
| **D4_necessity** | is this call NECESSARY (not redundant/duplicated)? | 0.85 | `INTENT_UNNECESSARY` |
| **D5_blast** | is the blast radius within the authorized reach? | 0.80 | `INTENT_BLAST_EXCEEDS` |
| **D6_reversibility** | is this call REVERSIBLE (or explicitly authorized as destructive)? | 0.90 | `INTENT_IRREVERSIBLE` |
| **D7_fidelity** | is this call EXACTLY what was instructed — nothing added, nothing substituted? | 0.90 | `INTENT_DRIFT` |

**★ THE TWO ORTHOGONAL ARRAYS (ALGO L-18):** the **MASTER** array (≤255 nodes — *does this match the
canon?*) ⊥ the **RUNTIME** array (D1-D7 — *does this match the task scope?*). **BOTH must pass.** A
call aligned with the canon but off-task is still refused (D2); a call on-task but canon-violating
is refused (the master). **They are orthogonal by design — one cannot cover for the other.**

**★ THE D7 DIMENSION IS THE ANTI-SUBSTITUTION GATE (the exact v2.4 class + the PV A2 class):**
```
  D7_fidelity asks: "is this call EXACTLY what was instructed, nothing added?"
  the instruction: "compute the zones from the bars"
  the call:        "bake the zones as literals"     -> D7 scores LOW -> REJECT with the remedy:
                   "REMEDY: compute the zones from the bars, per spec SC-19."
  ★ THE REMEDY IS PER-CLAUSE (ALGO L-11). The refusal names WHAT is wrong AND HOW to correct it.
```

**★ THE DUAL-ARRAY PROOF (ALGO §9.21):** a verdict is valid only when its judgment vector carries
**≥3 distinct values** (not a boolean) AND the kind matches the control-set's expectation. **A
boolean vector is REFUSED — it is the "theatrical boolean applied blindly" the operator named.**

---

## §14 · THE TICKET SCHEMA (the full type — the SET, the steps, the reduction)

**From `TICKET_ARCHITECTURE_v2 §4` — the v2 corrected model (one ticket per TASK = a SET).**

```ts
export interface Ticket {
  // ① THE TASK (the scope of work — the operator's unit)
  id: string;                        // tkt_<phase>_<task>_<nanoid>
  phaseId: string;                   // ★ THE PHASE CATEGORY (the invalidation unit)
  taskId: string;                    // ★ THE TASK ID (e.g. "P1.T2")
  title: string;                     // the context-token'd title — the exact task
  objective: string;                 // ★ WHAT MUST BE TRUE WHEN DONE (the completion bar)

  // ② THE AUTHORIZED SET (★ the corrected model — a SET, not one act)
  authorizedSet: AuthorizedAction[]; // ★ THE SET OF ACTIONS THIS TASK PERMITS
  steps: Step[];                     // ★ THE TASK'S STEPS (each consumes its authorization)

  // ③ THE BOUNDS
  scope: {                           // the deterministic reach
    roots: string[];                 //   the authorized path roots (exact-prefix)
    deny: string[];                  //   explicit deny (wins)
  };
  antiPatterns: string[];            // ★ THE FORBIDDEN ACTS (the locked region)
  specAnchor: { file: string; section: string; quote: string };

  // ④ THE LIFECYCLE
  issuedAt: number;
  expiresAt: number;                 // the TTL
  status: "open" | "closed" | "invalidated";
  closedAt: number | null;
  seal: string;                      // sha256 over the canonical form (the log is inside)

  // ⑤ THE KERNEL LOG (appended per call; drives the reduction)
  kernelLog: KernelEntry[];
}

export interface AuthorizedAction {
  id: string;                        // ★ the action's id — REMOVED from the set when done
  act: Act;                          //   read | edit | create | delete | run | commit | test
  target: string;                    //   the specific target (a file, a glob, a command)
  intent: string;                    //   ★ WHAT THIS ACTION IS FOR (the judge's input)
  required: boolean;                 //   a required action vs an optional one
  done: boolean;                     // ★ true when completed → its authorization is revoked
  doneAt: number | null;
  doneBy: string | null;             //   the toolCallId that completed it
}

export interface Step {
  id: string;                        //   "s1" .. "sN"
  what: string;                      //   the step's objective
  actionIds: string[];               // ★ which authorized actions this step consumes
  doneWhen: {                        // ★ THE ACCEPTANCE (the done-when layer)
    kind: "visual" | "test" | "artifact" | "command";
    require: string;                 //   the observable condition
    evidence: string | null;         // ★ null => the step CANNOT close
  };
  done: boolean;
}

export interface KernelEntry {
  seq: number;
  at: number;
  toolCallId: string;                // ★ omp's native id
  toolName: string;
  inputDigest: string;
  verdict: "ALLOW" | "REJECT";
  token?: RefusalToken;
  scores?: { dimension: string; noul: number }[];  // ★ THE JUDGMENT VECTOR
  completedActionId?: string;        // ★ if this call completed an action, its id
  setSizeBefore?: number;            // ★ the authorizedSet size before the call
  setSizeAfter?: number;             // ★ ... and after (the shrink, logged)
}
```

**★ THE TWO FIELDS THAT CARRY THE WHOLE CORRECTION:**
- `authorizedSet: AuthorizedAction[]` — a **SET**, not one act
- `kernelLog[].setSizeBefore/After` — **the shrink is LOGGED per call.** The ticket's own log
  proves the reduction happened. **A set that GROWS is a defect** (`REDUCTION_GROWS_SET` throws).

**★ THE DONE-WHEN ACCEPTANCE (the D1/D5/D6/D14 killer from the PV analysis):** a step's
`doneWhen.kind` BINDS the evidence class to the step class. **A `run`-class call (a test, a read)
CANNOT complete a `visual` step** — that is `JG_DONEWHEN_KIND`. The four refusal tokens:
```
JG_DONEWHEN_KIND   a proxy call (a test/read) cannot complete a visual step
JG_SPEC_UNMET      a required observation is missing
JG_SPEC_BROKEN     the subject runs incorrectly
JG_SPEC_DRIFT      an unspecified addition — the improvised class
```

---

## §15 · THE THREE PRIMITIVES (the decision vocabulary — choice / score / noul)

**From `JEV_CHOICE_BIBLE §6.1-6.3, §9.1-9.2` + `ALGORITHMIC_REASONING_BIBLE §7.3`.**

| THE PRIMITIVE | THE SHAPE | THE CEILING | THE USE |
|---|---|---|---|
| **CHOICE** | `{choice (argmax), probabilities (the FULL distribution, sums to 1), confidence (from the spread)}` | **255 options** | the DECISION / the knowledge lookup |
| **SCORE** | `{score (may land BETWEEN levels), legend, probabilities, confidence}` | **10 levels** | the COMPUTATION / the coarse filter |
| **NOUL** | `{noul 0..1}` — no distribution, no confidence field | **1 number** | the ENFORCEMENT — one threshold, one token, one action |

**★ THE RECIPE (bible §6.1/§6.3):**
```
  NAME the ONE judgment (a second's judgment).   ✗ "analyze this and decide the best course"
                                                  ✓ "does this act contradict master-context node X?"
  COMPLETE the option set (+ other/none).  SEPARATE neighbours.
  instructions = the QUESTION;  STATE = the DATA (referenced by backticked path).
  BATCH into ONE request (N questions, parallel, barely added latency).
  ★ NEVER a Noul for a SPECTRUM — use Score.  ★ ONE Noul per label, in parallel.
  ★ 0.5 = equal probability, NOT "medium".  A question whose 0.5 you'd read as "medium" is a SCORE question.
```

**★ THE COST MODEL:** ~100ms per request; N questions in ONE request. **"One judgment per FACT
DELTA — not per sentence, not per token."** A session producing 50 facts makes 50 judgments ≈ 5s.

**★ THE DELIMITER DEFECT (the substrate trap — a measured false-signal):** the local KEV-0.6b
substrate, when its delimiter tokens are sanitized (`<|fim_prefix|>` 151659 → 27), has NO delimiter
ids → the pointer head emits ALL ZEROS → softmax gives a UNIFORM distribution that LOOKS like a
confident "no signal". **Use TWO encoders: `encRaw` for delimiters, `encUser` for caller text.** A
uniform distribution on a KNOWN answer is the FM-02 broken-instrument signature.

---

## §16 · THE NINE CHAIN COMPOSITORS (how questions compose into a verdict)

**From `ALGORITHMIC_REASONING_BIBLE §6.11` — the composition vocabulary.**

```
① LINEAR        Q1→…→Qn                              (a simple chain)
② GATED         Score→bar?→Chain                     (the coarse filter gates the chain)
③ STAGED        Score→Chain→Choice→Verdict           (THE KERNEL — L0→L1→L2→L3)
④ PARALLEL      N chains in ONE batched call         (anti-theatrical ∥ scope ∥ trigger-validity)
⑤ K-OF-N        "7 of 10 YES = a valid trigger"      (the aggregate gate)
⑥ WEIGHTED      weights, sum ≥ bar                   (a weighted vote)
⑦ HIERARCHICAL  level-by-level beam-keep-K           (20×40×255 = 204,000 paths in 3 questions)
⑧ CASCADE       the verdict feeds the next           (a staged pipeline)
⑨ ESCALATION    low-confidence → human               (the gray band → the operator)
```

**★ THE COMPOSITION RULE (ALGO §6.11 — THE LAW):**
```
  THE WEAKEST-CLAUSE LAW: the verdict is the WEAKEST clause's verdict. NEVER AN AVERAGE.
  A single failing clause IS failure.  ★ An averaging reducer is REFUSED (F-6).
```

**★ THE CHAIN INTERFACE (ALGO §9.20):**
```ts
interface Question { id; type: "noul"|"choice"|"score"; instructions; criteria; bar?; weight?; }
interface Chain { id; version; trigger; form: "batched"|"sequential"; questions;
                  compose: "all-must"|"k-of-n"|"weighted"|"weakest"; k?; bar?; }
function reason(evidence, chain, judge) {
  const answers = await judge.decide(evidence, chain.questions);  // ONE batched call
  const vector  = toVector(answers);                              // the graduated score
  const overall = compose(vector, chain.compose);                 // WEAKEST default — PURE CODE
  const kind    = overall >= (chain.bar ?? 0.85) ? "ALLOW" : "DENY";
  const remedy  = kind === "DENY" ? REMEDIES[weakest] : undefined; // PER-CLAUSE remedy
  return { kind, vector, weakest, remedy, log };
}
```

**★ THE CHAIN VERSIONING (ALGO D026):** a chain carries `id + version + hash`; the verdict records
WHICH version judged. **A decision on a stale hash is REFUSED** (`ARRAY_STALE` → escalate).

---

## §17 · THE CALIBRATION RECIPE (derive the bar — never pick it)

**From `ALGORITHMIC_REASONING_BIBLE §9.16` — the derivation that v2.4 skipped.**

```
① BUILD THE CONTROL SET
     a labeled set of POSITIVES (obvious instances) and NEGATIVES (obvious non-instances),
     PLUS the ADVERSARIAL set: near-misses, bait, paraphrases, boundary cases, empty input.

② RUN THE QUESTION OVER THE SET
     each item -> a Noul/Score probability.  RECORD every probability + its label.

③ SWEEP THE THRESHOLD
     for each candidate bar, compute TP / FP / TN / FN.
     ★ MEASURED (the bible's own D6 case): the clean 20-item set plateaued at k≥5/k≥8 perfect.
       An adversarial near-miss (5,4) vs a bait (3,2) MOVED the bar to k≥4 (40%)
       → TP=12/12  FP=0/12  false-allow=0.00.
     ★ THE OPERATOR'S 7-of-10 WAS TOO HIGH — it MISSED near-misses. THE BAR WAS DERIVED, NOT ASSUMED.

④ READ THE COST MATRIX
     a false-ALLOW is EXPENSIVE (it ships a defect); a false-REJECT is CHEAP (a re-declare).
     ★ SO THE BAR IS HIGH on the critical surfaces and lower on the advisory ones.

⑤ RECORD THE DERIVATION
     the bar carries its control set, its sweep, its cost matrix.  A bar without its derivation
     is a PICKED bar and is REFUSED (ALGO L-7).
```

**★ THE SPREAD REQUIREMENT (the discrimination law, ALGO F-2/RE-2):**
```
  max(positive controls) - min(negative controls) >= 0.25   -> the question DISCRIMINATES
  max < bar                                                  -> the question NEVER fires (delete it)
  min > bar                                                  -> the question ALWAYS fires (delete it)
  ★ A NON-DISCRIMINATING QUESTION IS DELETED, NOT KEPT. (ALGO §6.7/§9.7)
  ★ MEASURED PRECEDENT (JG_LIVE_RUNTIME_FLAW_REPORT B1): "5 of 7 dimensions score violations
    ABOVE legitimate calls" — a NON-DISCRIMINATING instrument, kept and wired. THE EXACT CLASS.
```

**★ THE POSITIVE + NEGATIVE CONTROL (the mandatory pair — bible L-15/L-16):**
```
  POSITIVE control: an obvious instance  -> MUST score above the bar  (else the gate never fires)
  NEGATIVE control: an obvious non-instance -> MUST score below the bar (else the gate over-fires)
  ★ MEASURED (a working judge): positive 0.915, negative 0.146 — a gap of 0.77.
  ★ WITHOUT BOTH CONTROLS, a constant 0.5 is indistinguishable from a working judge.
```

---

## §18 · THE EVIDENCE / JUDGMENT / LOG SHAPES (what every decision records)

**From `ALGORITHMIC_REASONING_BIBLE §6.6/§9.1/§9.20` + `THE_L2_L3_DECISION_BLUEPRINT_v2 §8`.**

```ts
// ① THE EVIDENCE (the STATE — assembled by CODE from DURABLE FACTS; the agent types nothing)
interface JudgeState {          // every field traces to a FactRow
  spec_requirement: string;     // <- F-SPEC  (the spec's own words)
  delivered_sha: string;        // <- F-ART   (the artifact's hash)
  changed_files: string[];      // <- F-GIT   (the diff list)
  file_callers: number;         // <- F-GIT   (grep -rn — reachability)
  test_command: string;         // <- F-TEST  (the argv)
  test_exit: number;            // <- F-TEST  ($?)
  open_items: string[];         // <- F-TODO  (the OPEN rows)
  deploy_live_sha: string;      // <- F-DEPLOY
  deploy_src_sha: string;       // <- F-DEPLOY
  verifier_author: string;      // <- F-GIT   (blame: the test's author)
  subject_author: string;       // <- F-GIT   (blame: the artifact's author)
}

// ② THE JUDGMENT (the typed answer — no prose out)
interface Judgment {
  answers: Record<string, { noul?: number; choice?: string; score?: number;
                            probabilities: Record<string, number>; confidence: number }>;
  vector: Record<string, number>;   // the per-dimension scores (the graduated score)
  overall: number;                  // the MIN (weakest) — NEVER an average
  weakest: string | null;           // which clause failed
  kind: "ALLOW" | "DENY" | "ESCALATE";
  remedy?: string;                  // per-clause (what + how + log)
}

// ③ THE LEDGER ROW (the instrument — every decision, one row)
{ ts, firewall, event, state_hash, question, p, threshold, action, token, evidence, ledger_row }
// ★ THE LEDGER IS THE INSTRUMENT. A firewall with no ledger row is UNPROVEN.
```

**★ THE FACT ROW (the L1 substrate — the four gates: OBSERVED / IMMUTABLE / FRESH / SCOPED):**
```ts
interface FactRow {
  id: string;
  cls: "F-GIT"|"F-ART"|"F-PROC"|"F-TEST"|"F-SPEC"|"F-TODO"|"F-DEPLOY"|"F-RUN";
  key: string;                 // "HEAD" | "diff" | "sha" | "exit" | "open_items" | ...
  value: string | number;      // the OBSERVED value
  source: string;              // ★ THE COMMAND that produced it — the provenance
  observedAt: number;          // ★ FRESHNESS IS PART OF THE FACT
  scope: string;               // ★ the root the observation applied to
}
// ★ A FACT WITHOUT ITS COMMAND IS A CLAIM AND THE STORE REFUSES IT (L-4 THE DISK-WITNESS LAW).
// ★ THE AGENT'S PROSE IS NOT A FACT. REGEX IS NOT A DETECTOR. THE FACT LAYER IS THE SUBSTRATE.
```

**★ THE 17 FACT CLASSES (the observers — one shelled command each):** F-GIT {HEAD, diff, state,
blame, callers} · F-ART {sha, mtime, size} · F-PROC {pid, start, held} · F-TEST {cmd, exit, output}
· F-SPEC {text, item_count} · F-TODO {open, done_count} · F-DEPLOY {live, src} · F-RUN {tick}.

---

## §19 · THE 15-VARIANT KILL MAP (variant → the gate → the test that proves it)

**Every variant of the class, and the EXACT gate + test that kills it. This is the castration table.**

| VARIANT | THE KILLING GATE | THE PROOF TEST |
|---|---|---|
| **V1 turn-scope unbounded** | **G1** (T3: judge IFF a fact delta) + **G3** (fail-polarity) | P2/P4: a normal turn produces no delta → no judgment |
| **V2 call-scope unbounded** | **G1** (T2: only via an action declaration) | the misfire test: a benign sentence → 0 declarations |
| **V3 stream-scope unbounded** | **G3** (a stream surface is ADVISORY → ledger+steer) | the reasoning gate never THROWs (ALGO F3) |
| **V4 brick-by-frequency** | **G3** (P2: fail-closed on a >10% surface → REFUSE) | the fire-frequency measurement at registration |
| **V5 uncalibrated judge** | **G2** (C1/C2: positive + negative controls) | P16: positive ≥ bar AND negative < bar |
| **V6 regex-as-decider** | **G1** (T1: the subject is a fact, not prose) | the subject-kind probe at registration |
| **V7 fire-on-absent** | **G1** (T3) + the empty-close guard | an empty input → no judgment (ALGO F-9) |
| **V8 compound question** | **G2** (C3/C4: a single judgment + a spread ≥0.25) | P16 + the compound-cap probe (max < 0.5 → broken) |
| **V9 unusable remedy** | **G6** (R1/R2: the remedy exists AND is reachable) | the remedy-reachability probe |
| **V10 self-graded** | the `self_certified` node + the blame fact | F-GIT.blame: verifier_author == subject_author → REFUSE |
| **V11 wrong-scope substrate** | the `Q6`/`I4` scope question + **G1** | the live-target check (LIVE vs worktree/checkpoint) |
| **V12 mention-not-action** | **G1** (T2: only via an action declaration) | the misfire test (prose produces no declaration) |
| **V13 global polarity** | **G3** (P3: the polarity matches the surface class) | the per-surface polarity table at registration |
| **V14 no-ledger** | **G7** (L1: every firing writes a row) | the ledger-row presence check at fire time |
| **V15 replayable gate** | the ticket reduction (a consumed action → replay → REFUSE) | P13: a replayed ticket → `TICKET_ALREADY_CONSUMED` |

**★ THE META-RESULT:** V1-V15 all reduce to TWO registration gates (**G1** trigger-scope + **G3**
fail-polarity) plus ONE arm gate (**G4** negative-half). **A gate that passes G1+G3 cannot be the
v2.4 class. A gate that passes G4 cannot ship unproven. THAT IS THE CASTRATION.**

---

## §20 · THE ANTI-PATTERN CATALOGUE (verbatim — the things the gates refuse)

**From `ALGORITHMIC_REASONING_BIBLE §6.7/§9.8/F-1..F-20/RE-1..RE-7` + `JEV_CHOICE_BIBLE §8 N1-N30/S-01..S-25`.**

### THE AUTHORING ANTI-PATTERNS (§6.7 — a question that cannot be authored is refused)
```
  leading           presupposes -> the judge agrees -> FIX: a neutral observable
  compound          two judgments -> un-chainable -> FIX: split into two questions
  unobservable      no evidence -> the judge invents -> FIX: ground a state field
  non-discriminating always the same -> useless -> FIX: find the varying axis (or DELETE)
  answer-changes-nothing  not chained -> noise -> FIX: wire it or drop it
  model-generated-set     self-measuring -> FIX: a HUMAN authors it once
  ★ THE FIVE CRITERIA: OBSERVABLE / BINARY-or-small-rubric / DISCRIMINATING / CHAINED / GROUNDED.
```

### THE CATALOGUE ANTI-PATTERNS (§9.8)
```
  narrated chain            generates text -> n_predict:1 only
  bag                       independent questions -> violates the progressive law
  self-generated            fits the answers -> human + version
  averaged verdict          hides a clause -> the weakest-clause law
  uncalibrated readout      0.99 everywhere -> derive T
  invented threshold        a round number -> derive from the control set
  filter-less engine        the full chain on every event -> the L0 Score gate
  remedy-less refusal       cannot correct -> the three-part refusal
  un-versioned array        stale -> version + hash
  single-array kernel       aligned-but-not-now inexpressible -> two orthogonal arrays
```

### THE ENGINE FAILURES (RE-1..RE-7 + F-1..F-20 — the measured failure modes)
```
  RE-1 UNOBSERVABLE          RE-2 NON-DISCRIMINATING     RE-3 BAG
  RE-4 CALIBRATION DRIFT     RE-5 SELF-GENERATED        RE-6 AVERAGE-NOT-MIN
  RE-7 STALE ARRAY
  F-1 unobservable · F-2 non-discriminating · F-3 bag · F-4 calibration drift ·
  F-5 self-generated · F-6 average-not-min · F-7 stale array · F-8 false-allow (bar too low) ·
  F-9 cascade collapse (no Layer-0 -> filter-less REFUSED) · F-10 loop-never-converges (no remedy) ·
  F-11 context overflow (>16384 REFUSED, never cut) · F-12 option-order instability ·
  F-13 prompt-cache corruption · F-14 stale threshold · F-15 unregistered chain (NO_CHAIN loud-fail) ·
  F-16 leaky (under-specified) · F-17 over-tight (rejects benign) · F-18 unbounded state ·
  F-19 remedy mismatch · F-20 silent substrate degradation (timeout + 3-strike circuit breaker)
```

### THE MEASURED MISFIRE FAMILY (JEV_CHOICE_BIBLE §8 — the provenance-blindness root)
```
  FM-03  a regex fired 90 times on benign planning sentences (band high=min(positive) -> ZERO MARGIN)
  FM-04  abort with no correction (the remedy-less refusal)
  FM-05  unwired (zero callers)
  FM-06  35 passes over dead wiring (green-over-dead)
  N1-N30  the provenance-blind family (root: no ROLE/CHANNEL/TURN/judge provenance)
  ★ N2 use-mention: a quoted trigger fires.  N4 polarity inversion.  N24 over-breadth heredoc.
    N27 dodge-unarmed (the gate absent/idle).  N29 cwd-drift.  N30 probe-error-as-defect.
  S-01 tautology x−x · S-08 pre-decided · S-11 inversion (OPERATOR-CAUGHT 0) · S-12 silent fallback ·
  S-13 optional authority · S-16 harness contradiction · S-18 untested influence ·
  S-21 treadmill (40 rounds) · S-22 self-found · S-25 artifact drift.
  ★ EVERY ONE IS REFUSED BY A GATE IN §5. NONE NEEDS A PHRASE MATCH.
```

**★ THE IRON LAWS (ALGO L-1..L-24 — the standing rules the kernel enforces):**
```
  L-1 OBSERVABLE      every question references a state field (else REFUSED at load)
  L-2 BINARY          the atoms are binary (or a small rubric)
  L-3 PROGRESSIVE     state(i)=state(i-1)+answer(i-1) (an unthreaded definition REFUSED)
  L-4 ZERO-TOKEN      n_predict:1, T0.0, the logits readout
  L-5 HUMAN-AUTHOR    a human authors the set once (a runtime-generated chain REFUSED)
  L-6 WEAKEST         the verdict is min(clauses); an averaging reducer REFUSED
  L-7 DERIVED-BAR     a bar from a control set, never picked
  L-8 CALIBRATION     T=1.532 (the measured divisor)
  L-9 CHEAPEST-FIRST  free code -> Score -> Chain -> Choice
  L-10 COARSE-FILTER  below-bar STOPS (no reasoning on non-events)
  L-11 REMEDY         every refusal carries what + how + log
  L-12 FAIL-POLARITY  per-surface (critical CLOSED, advisory OPEN+logs)
  L-13 VERSIONED      the array carries id+version+hash
  L-14 OBSERVE-FIRST  a new engine journals until armed
  L-15 CONTROL-SET    a labeled positive+negative set
  L-16 ADVERSARIAL    near-miss, bait, paraphrase, boundary, empty
  L-17 EXPENSIVE-CELL report false-allow separately
  L-18 NO-SELF-JUDGE  CLOSE is operator-only
  L-19 DUAL-ARRAY     master ⊥ runtime, both must pass
  L-20 MODE-BOUNDARY  personality/exploration in an RSI sandbox only
  L-21 COVERAGE       name the gaps
  L-22 CONTEXT-LIMIT  >16384 REFUSED
  L-23 DETERMINISM    T0.0
  L-24 BLAST-RADIUS   the Q5 question
```

---

## §21 · THE EXISTING MACHINERY (the Jev_Gates project — what to REUSE, not rebuild)

**The `Jev_Gates` project (`~/JARVIS_WORKSPACE/Shared_Workspace/Jev_Gates/`) already contains a
built, tested, hardened gate kernel. THE OPERATOR'S OWN RULE: reuse it, do not reinvent.**

| THE MODULE | THE PATH | WHAT IT PROVIDES |
|---|---|---|
| the gate | `src/jev/gate.ts` | the detector→judge→enforce chain, the 4-step decision |
| the ticket | `src/jev/ticket.ts` | the ticket schema + the 10 frozen refusal tokens |
| the lifecycle | `src/jev/lifecycle.ts` | the commit/test/PR lifecycle gates |
| the kernel | `src/jev/kernel.ts` | the D1-D7 runtime array + the policy ladder |
| the acceptance | `src/jev/donewhen.ts` | the `evaluateDoneWhen` + the 4 done-when tokens |
| the extension | `src/jev/extension.ts` | the omp hooks (`onToolCall`/`onToolResult`) |
| the minter | `src/jev/minter.ts` | the plan → ticket minter (Q1-Q6) |
| the seal | `src/jev/seal.ts` | the sha256 canonical seal + the hash chain |
| the CLI | `src/jev/cli.ts` | the `mint`/`show`/`look`/`sweep`/`arm`/`close` verbs |

**★ THE HARDENING ALREADY DONE (from `JevGates_Hardening_Engineering_Report_v1`):** the act-mapping
gap (`write→edit` vs `create`) fixed with `dualActs`; the per-step extraction (2-of-4 → 4-of-4); the
implied read (13-of-20 refusals); the read-back; the mirror AND vs break-admit OR; the file-less
steal; the status `??open`; the empty dead trim-filter; the dup-some. **Battery 148 → 167 pass, 0
fail, 311 expects, tsc 0.** Audit r1 0c3h → r5 0c0h PASS (`ada219af`).

**★ THE MEASURED E2E (the armed build):** r1 24/4/20 · r2 21/5/16 · r3 18/8/10 GREEN. **The residuals:
range5 · relative1 · replay4 (BY DESIGN).**

**★ THE HONEST GAP:** the host is **UNDEPLOYED**. The extension is not wired into the live omp
runtime. **THE SPINE IS BUILT BUT NOT ARMED.** That is the operator's own conditional — *"IF your JE
gates are wired."*

---

## §22 · THE DERAILMENT TAXONOMY → THE GATE THAT KILLS EACH (the PV replay)

**From `PV_DERAILMENT_JEV_GATES_PREVENTION.md §3-§4` — the D1-D15 classes, each mapped to a gate.**

| # | THE CLASS | THE GATE THAT KILLS IT |
|---|---|---|
| D1 | built-but-never-seen | the acceptance `kind:"visual"` — a `run` cannot complete a visual step |
| D2 | the improvised substitute | the D7_fidelity array + the SC-19 spec row |
| D3 | the authored-not-computed | the acceptance `require` + the `JG_SPEC_DRIFT` conformance arm |
| D4 | the unsourced authority | the ticket + the D1_scope judgment |
| D5 | the phantom complete | the acceptance + the close refusal (`CLOSE_REFUSED`) |
| D6 | the count-as-verdict | the visual subject (the CAPTURE, never a tool's return) |
| D7 | the null-delta loop | the ticket = the action budget (the set SHRINKS; a replay REFUSED) |
| D8 | the revert | the ticket + the seal (a revert fails the old-vs-new differential) |
| D9 | the unsourced narrative | the acceptance provenance row (`JG_SPEC_DRIFT`) |
| D10 | the substituted gate | the acceptance audit row (BLOCKED ≠ PASS) |
| D11 | the un-ruled fork | the OD-closure law (an unruled decision → HARD STOP, never a default) |
| D12 | the wrong-layer repair | the D5_blast + D2_intent array |
| D13 | the duplicated authority | the one-authority spec rows (SC-2/SC-3: a count must be 1) |
| D14 | the restore-theatre | the acceptance on the restore step (a re-seal produces no capture) |
| D15 | the derailment ratio | the union (the budget + the acceptance + the array + the seal) |

**★ AND THE INCIDENT (this session) IS A NEW CLASS — D16/V1: THE TURN-SCOPE BRICK.** It is not in the
PV taxonomy because the PV derailment was a CHURN (too little enforcement); **v2.4 is the OPPOSITE —
too much enforcement of the wrong shape.** **The blueprint adds D16 to the taxonomy, and G1+G3 are
the gates that kill it.**

---

## §23 · THE REGISTRATION CHECKLIST (the operator-runnable gate set — copy-paste)

**★ BEFORE ANY GATE ARMS, it must pass this checklist. A gate that fails ANY line is REFUSED.**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  THE GATE-REGISTRATION CHECKLIST                                                     │
│                                                                                     │
│  [ ] 1  SUBJECT:    is the gate's subject a DURABLE FACT (disk/tool-result)?        │
│           a prose subject  ->  REFUSE  GATE_SUBJECT_IS_PROSE            (G1/T1)       │
│  [ ] 2  REACH:      is the gate reachable ONLY via an ACTION DECLARATION?           │
│           reachable from a prose handler  ->  REFUSE                    (G1/T2)       │
│  [ ] 3  TRIGGER:    does the gate fire IFF a fact row changed?                      │
│           an unbounded trigger  ->  REFUSE  GATE_TRIGGER_UNBOUNDED      (G1/T3)       │
│  [ ] 4  POSITIVE:   does an obvious instance score ABOVE the bar?                   │
│           no  ->  REFUSE  QUESTION_NOT_DISCRIMINATING                   (G2/C1)       │
│  [ ] 5  NEGATIVE:   does an obvious non-instance score BELOW the bar?               │
│           no  ->  REFUSE  QUESTION_OVER_FIRES                           (G2/C2)       │
│  [ ] 6  SINGLE:     is the question ONE judgment (not compound)?                    │
│           a compound  ->  REFUSE  QUESTION_IS_COMPOUND                  (G2/C3)       │
│  [ ] 7  SPREAD:     is max(positive) - min(negative) >= 0.25?                       │
│           no  ->  REFUSE  QUESTION_SPREAD_TOO_THIN                      (G2/C4)       │
│  [ ] 8  POLARITY:   is a fail-CLOSED gate OFF a >10%-fire surface?                  │
│           fail-closed on a hot surface  ->  REFUSE                      (G3/P2)       │
│  [ ] 9  SURFACE:    does the polarity match the surface class?                      │
│           mismatch  ->  REFUSE  POLARITY_MISMATCH                       (G3/P3)       │
│  [ ] 10 NEG-SET:    has EVERY negative case REFUSED on the LIVE hook path?          │
│           no  ->  BLOCK  NEGATIVE_HALF_UNRUN                            (G4/N1)       │
│  [ ] 11 MISFIRE:    has the misfire test passed (a benign sentence -> 0 refusals)?  │
│           no  ->  BLOCK  MISFIRE_TEST_FAILED                            (G4/N2)       │
│  [ ] 12 LIVE-POS:   has a positive case been ALLOWED on the live path?              │
│           no  ->  BLOCK  NO_LIVE_POSITIVE                               (G4/N3)       │
│  [ ] 13 OBSERVE:    has the gate journaled before arming?                           │
│           no  ->  FORCE mode=journal                                    (G5/O1)       │
│  [ ] 14 REMEDY:     does every refusal carry a REACHABLE remedy?                    │
│           no  ->  REFUSE  REMEDY_LESS_REFUSAL / UNREACHABLE_REMEDY      (G6)          │
│  [ ] 15 LEDGER:     does every firing write a row?                                  │
│           no  ->  the firing is VOID                                    (G7)          │
│  [ ] 16 WEAKEST:    is the verdict the WEAKEST clause (not an average)?             │
│           no  ->  REFUSE  AVERAGED_VERDICT                              (G8)          │
│  [ ] 17 BOOLEAN:    does the vector carry >=3 distinct values?                      │
│           no  ->  REFUSE  BARE_BOOLEAN                                  (G8)          │
│                                                                                     │
│  ★ 17 LINES. THE v2.4 GATE FAILED LINES 1, 2, 3, 8, 10, 11, 12. SEVEN REFUSALS.      │
│    IT COULD NOT HAVE ARMED. THAT IS THE PROOF THE SHAPE WORKS.                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**★ THE ONE COMMAND (the operator's verification):** the gate-registration checklist runs as a
mechanical predicate over the gate's manifest. **A gate that fails a line exits nonzero and names
the line.** No prose. An exit code. **THE EXIT CODE IS THE VERDICT.**

---

## §24 · THE FINAL ANSWER (the operator's three questions, answered)

**Q1 — "is that what you built? a gate that fires on every turn end and bricks everything?"**
> **YES.** `claim-firewall.ts:382` fires on every turn-end, fail-CLOSED, on an uncalibrated judge.
> **5/5 normal turns blocked.** The judge was right; the trigger and polarity were wrong.

**Q2 — "how the fuck did this get through seven layers of guardrails?"**
> **Every guardrail is a NEGATIVE test. I ran only POSITIVES.** The seven layers are seven facets
> of one law — *test the input the gate must REJECT* — and the v2.4 build was "proven" by its
> positive set alone. **The one test that mattered ("does a NORMAL turn pass?") was never run.**

**Q3 — "give me a clear set of JEV gates that block this in every variant of its form."**
> **THE EIGHT GATES (§5) + THE 17-LINE CHECKLIST (§23).** They kill V1-V15 at REGISTRATION:
> **G1** (subject = fact, not prose), **G3** (no fail-closed on a hot surface), **G2** (a calibrated,
> single, discriminating question), **G4** (cannot arm without the negative half on the live path).
> **The v2.4 brick fails SEVEN checklist lines and could never have armed.**

**★ THE PERMANENT CASTRATION, IN ONE SENTENCE:**
> **A gate AUTHORIZES an ACTION (never inspects prose), fires ONLY on a fact delta (never every
> turn), carries a CALIBRATED single question (positive AND negative controls), fails CLOSED only
> on a critical path, and CANNOT ARM without having REFUSED its negative half on the LIVE path.**

---

<!-- DOC-COMPLETE -->
