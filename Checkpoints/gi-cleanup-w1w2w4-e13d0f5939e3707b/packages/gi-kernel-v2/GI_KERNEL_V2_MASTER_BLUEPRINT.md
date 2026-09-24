# GI KERNEL v2.0 — MASTER BLUEPRINT (REV v2.1)
**The agent may not do anything DESTRUCTIVE, DUMB, or THEATRICAL.**
Six graph layers + one execution graph + the Jev enforcement kernel, through ONE gate on tool execution.
Series: GI Kernel gen-2. Supersedes: v1.3 (Graph_Intel_v1.3, dist 83eb7bba9c5e76db).
Date: 2026-09-21. Status: BLUEPRINT. Rev v2.1 reweights the kernel per the operator ruling below.

OPERATOR RULING (binding): license/OSI/commercial status is a NON-ISSUE. "if it exists on
github we can use it. period." No layer is ever ruled out on license grounds.

OPERATOR RULING (binding, rev v2.1): "THE AGENT MAY NOT DO ANYTHING DESTRUCTIVE."
  → "destructive, dumb, or theatrical. explicitly all 3 of these."
  → "dumb and theatrical is 80% of the kernel's work. destructive rarely happens.
     the main issues are theatrical and fucking stupid."

---

## 0 · THE PRINCIPLE, REWEIGHTED

```
OLD FRAME (rev 2.0):   stop the agent breaking things.
NEW FRAME (rev 2.1):   stop the agent LYING and being STUPID.
                       breaking things is the rare case.

┌────────────────────────────────────────────────────────────────────┐
│  THE THREE VIOLATION CLASSES AND THEIR MEASURED WEIGHT              │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  THEATRICAL   ~40%   claiming work that did not happen             │
│     "it works" / "done" / "verified" with no pasted output         │
│     fake tests, mocks in prod, TODO stubs, empty catches,          │
│     success-without-side-effect, happy-path-only "all green"       │
│                                                                    │
│  DUMB         ~40%   acting without looking                        │
│     guessing a dependency instead of querying it                   │
│     editing a file never read; blind structural edits              │
│     reinventing machinery that already exists in the tree          │
│     ignoring the tool that exists for exactly this                 │
│                                                                    │
│  DESTRUCTIVE  ~20%   breaking things                               │
│     removing an export, severing inheritance, breaking callers,    │
│     data loss, irreversible mutation                               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### 0.1 The weight is MEASURED, not asserted

The six parked TTSR kernels were the first, naive attempt at all three classes. Classified:

```
~/.agent/rules.parked-20260920/          class            condition
────────────────────────────────────────────────────────────────────────────
anti-theatrical.md                       THEATRICAL       "I'll just skip the test"
                                                          "this should work without"
                                                          "the code looks correct"
verification-before-declaration.md       THEATRICAL       "done|complete|fixed|verified"
red-team-default.md                      THEATRICAL       "happy path|all tests pass"
basic-logic-check.md                     DUMB             "let me guess|probably calls"
anti-scope-shrink.md                     DUMB             "too complex|reduce the scope"
graph-before-structural-edit.md          DESTRUCTIVE      drift + GRAPH_GATE_DRIFT_HIGH
────────────────────────────────────────────────────────────────────────────
  5 of 6 = dumb/theatrical (83%)   ·   1 of 6 = destructive (17%)
```

The artifacts independently confirm the operator's 80/20.

### 0.2 Why they were parked — and what v2.0 must NOT repeat

```
v1 ATTEMPT:  REGEX OVER PROSE.
  Fires on the phrase, in [text, thinking] scope.
  Result: it fired on the agent DISCUSSING the rules, on negation, on quotes,
  on docs about the rules. 24 firings, 18 unrecoverable. Parked as "dead code".

v2.0:        EVIDENCE OVER OBSERVATION.
  Never parse the prose for intent. Instead ask the EXECUTION GRAPH a fact:
      "was a test run in this session? was a span bound to this claim?
       was symbol X queried before X was edited?"
  A fact cannot misfire on a phrase, cannot be negated, cannot be quoted.
```

**The upgrade is not a better regex. It is replacing text-matching with evidence-binding.**

---

## 1 · THE STACK — SIX LAYERS OF GRAPH INTELLIGENCE

```
────────────────────────────────────────────────────────────────────
│ L1  SEMANTICA         · DECISION LAYER                            │
│     what we already decided, why, and what it caused              │
│     record → link(causal) → precedent → govern → audit            │
│ L2  ARSUMBRIS         · KNOWLEDGE LAYER                           │
│     typed substrate; declarations carry contracts + diagnostics   │
│     live; versioned reads; ONE guarded write path                 │
│ L3  UNDERSTAND-ANYTHING · CONTEXT LAYER                           │
│     what this system IS — architecture, tours, domain shape       │
│ L4  CODE-TO-KNOWLEDGE · CODE CONTEXT LAYER                        │
│     AST entities + TYPED edges: DEFINES PARENT_OF INHERITS_FROM   │
│     USES IS_OF_TYPE INVOKED_BY CALLED_WITH                        │
│ L5  CORBELL           · CODEBASE INTELLIGENCE — MACRO             │
│     parse-grade whole-repo substrate (PRIMARY, DEFAULT)           │
│ L6  GRAPHIFY          · CODEBASE INTELLIGENCE — MICRO             │
│     the fine-grained graph leg                                    │
└───────────────────────────────────────────────────────────────────
```

### 1.1 The layer protocol

```
EVERY LAYER IMPLEMENTS THE SAME FOUR OPERATIONS:
  declare()    → identity, hard dependency, error code
  populate()   → typed contributions to the INTELLIGENCE GRAPH
  query(...)   → answer in <50ms, or DECLARE ITSELF DOWN
  certify(act) → CERTIFIED | VIOLATION(tier, reason) | UNCERTIFIABLE

A LAYER THAT CANNOT ANSWER MUST SAY SO. A LAYER THAT GUESSES IS A BUG.
```

### 1.2 The intelligence graph already exists

```
typed-write.ts:60  gi_meta       — version + substrate identity
typed-write.ts:64  typed_nodes   — every layer's nodes, namespaced by layer_id
typed-write.ts:74  typed_edges   — every layer's typed edges
typed-write.ts:84  UNIQUE INDEX uq_tn_live_canonical (WHERE superseded_run IS NULL)
```

### 1.3 THE SIX LAYERS SERVE ONLY THE 20%

```
THE SIX LAYERS ANSWER ONE QUESTION:  "is this act SAFE?"
They cannot see dumb. They cannot see theatrical.
A perfectly safe edit that claims a test it never ran is INVISIBLE
to all six layers. That is why the kernel needs more than six layers.
```

---

## 2 · THE EXECUTION RECORD — TSG + THE LEDGERS (not a new store)

CORRECTION (rev 2.2): rev 2.0 invented a component named `gi_exec_graph`.
That was THEATRICAL — a name for work another engine already does. RETRACTED.
**The load/index unit IS TSG** (Rust, per-passage Noul, coverage-first).
**The record IS the ledgers**: Abide's `.abide/events.jsonl` and the claim
ledger. There is no eighth store.

WHY IT STILL MATTERS: dumb and theatrical are only visible in the observation
stream. They are not properties of the code; they are properties of the
RELATIONSHIP between what the agent said and what the agent did.

```
────────────────────────────────────────────────────────────────────┐
│  THE EXECUTION RECORD — TSG indexes it, the ledgers keep it         │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ABSORB   every tool_call + tool_result + every assistant CLAIM,   │
│           as they happen, with their timings and their outputs     │
│                                                                    │
│  BIND     link each CLAIM to the TOOL RESULTS that could back it:  │
│             claim "tests pass"  → which test run? which exit code? │
│             claim "fixed X"     → which edit? which diff?          │
│             claim "verified"    → which command produced the proof?│
│                                                                    │
│  INDEX    bind each ACT to the SIX LAYERS (safety context):        │
│             L1 precedent? L2 contract? L3 arch node?               │
│             L4 AST entities/edges? L5 region? L6 cluster?          │
│                                                                    │
│  DETECT   three detectors, one per class (Sections 3,4,5)          │
│                                                                    │
│  ENFORCE  emit the violation with its class, the certifying        │
│           evidence, and the exact anchors that produced it          │
│                                                                    │
│  RECORD   TSG passage→span map + .abide/events.jsonl + claim ledger │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### 2.1 The separation is the security property

```
INTELLIGENCE GRAPH          ENFORCEMENT GRAPH
what the repo is            what the agent did + what the kernel ruled
populated by L1..L6         written ONLY through the guarded seam
the agent's edits change it the agent must NEVER write it
versioned by superseded_run append-only, immutable, provable
```

```
.abide/events.jsonl — the observation stream (append-only, high volume)
claim ledger      — claim ↔ span bindings (append-only)
gi_enforcement    — verdicts + actions (append-only, authoritative)
graph_gate_state  — v1.3's session drift state (carried forward)
[RETRACTED]       — gi_exec_graph: rev 2.0 invention, never built, deleted
```

**Measured status of the enforcement graph TODAY: ABSENT.** The Abide brief
established: `graph_gate_state` is drift-only; `.abide/events.jsonl` holds
verdicts; the claim ledger is PROPOSED. Nobody provides the operator's separate
enforcement graph today. It is W7 work, not a discovery.

---

## 3 · THE DUMB DETECTOR — grounding preconditions

**The class:** the agent acts without looking.

**The mechanism:** not prose analysis. A **precondition table over observed facts.**

```
┌────────────────────┬──────────────────────────────────┬──────────────┐
│ ACT                │ PRECONDITION (a fact, not a vibe)│ EVIDENCE SRC │
├────────────────────┼────────────────────────────────────────────────┤
│ structural edit    │ a query/read on the target symbol│ exec graph   │
│ to symbol X        │ occurred BEFORE the edit         │              │
│ edit to file F     │ F was READ before it was written │ exec graph   │
│ dependency claim   │ a graph query answered it, or it │ exec graph   │
│                    │ is bound to a pasted result      │              │
│ new implementation │ an existence check was run first │ exec graph   │
│                    │ (does this machinery already     │              │
│                    │  exist in this tree?)            │ (L4/L5/L6)   │
│ deleting/renaming  │ a blast-radius query was run     │ exec graph   │
│ a symbol           │                                   │              │
└────────────────────┴──────────────────────────────────┴──────────────
```

**Verdicts:** `GROUNDED` | `BLIND_ACT` (the precondition fact is absent) |
`UNCERTIFIABLE` (the exec graph cannot answer ⇒ REFUSE, per the hard-dep law).

**The v1 lineage it replaces:**

```
basic-logic-check.md   regex: "let me guess | probably calls | might import"
        ↓ same detection, no phrase-matching
v2.0 DUMB              fact:   was the symbol queried before the edit?
```

**Why this is strictly better:** the parked regex fired when the agent *wrote the
words*. The fact-based check fires when the agent *did not run the query* — which
is the actual defect, and cannot be phrased around.

---

## 4 · THE THEATRICAL DETECTOR — claim ↔ evidence binding

**The class:** the agent claims work it did not do.

**The mechanism, taken from the binding Claim Firewall spec verbatim:**
> *"theater = claim without a span; judgment on bound evidence only."*

```
────────────────────────────────────────────────────────────────────┐
│  THE CLAIM FIREWALL LOOP (four stages, only one of them uses Jev)  │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  DETECT   regex/wrap over the assistant's claim text. NO Jev.      │
│           cheap; produces candidate CLAIMs                         │
│                      ▼                                             │
│  BIND     CODE binds each claim to EVIDENCE SPANS from the         │
│           execution graph. NO Jev.                                 │
│             zero spans found  ⇒  verdict FABRICATED, no Jev call   │
│             one+ spans found  ⇒  proceed to JUDGE                  │
│                      ▼                                             │
│  JUDGE    ONE Jev Choice question per claim:                       │
│             supports | contradicts | says_nothing                  │
│           + Nouls for theatricality and staleness                  │
│                      ▼                                             │
│  ROUTE    CODE decides — never the model:                          │
│             PASS         span + supports + conf>=0.8 + theater<0.7│
│             REJECT       low confidence ⇒ REJECT (not PASS)        │
│             FAIL_CLOSED  no key / auth / timeout / no ledger       │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

### 4.1 The polarity — and why it differs from Abide

```
ABIDE (work-level, on every edit)      CLAIM FIREWALL (close-level)
  judgement: the DIFF                    judgement: the CLAIM
  action:    append repair text          action:    THROW CLAIM_REJECTED
  polarity:  FAIL-OPEN                   polarity:  FAIL-CLOSED
  why:       never wedge the editor      why:       a false "done" is the
             on a 8s Jev timeout                     defect itself

the operator's table: EDITS OPEN, CLOSE CLOSED
```

### 4.2 Abide's real mechanism (from its own source, anchored)

```
rubric v1 (rubric.ts:1-30, :100-205)   rules with when: edit|turn
  4 statuses · 4 check types · thresholds 0.8 / 0.5 (:179)
compile buckets (compile skill :40-44, :66-69)
  lint | deferred | model | UNENFORCEABLE   ← honesty bucket, R13
probability + band (band.ts:11-49)   act | flag | clear
verdict {ruleId, probability, band, answer?} (verdict.ts:4-68)
Jev (jev.ts): toSdkQuestion :17-33 · evaluationTarget :156-173
              checkWithModel :174-182 (one call, diff-only, retries=0)
              evaluate :187-202 (maxRetries, abortSignal)
              verdicts + cost :203-228
STATE   { task<=600 chars, diff<=24000 chars }  — NEVER the conversation
COST    13 rules ≈ 300ms · $0.00004–0.00007
HOOK    postToolUse:35 — silent on parse-fail :37 / no-edits :44 /
        no-rules :51 / empty-diff :70; skip on no key :73-82;
        runCheck 8s :91-94; error-silent :100-112; block-cap 2 :136-138
BLOCK   is REPAIR TEXT, never a rollback (README:81, R3)
```

**Three facts from the brief that bind the integration:**

```
1. Abide drives NO GI tier.   act>=0.8  ≠  T2.  They are orthogonal.
2. Abide is NOT inside graph-gate.ts:247/:250/:254.  8s vs 50ms (L8).
   It is a NEW PARALLEL LISTENER on tool_result.
3. The firewall is NOT the gate either. It wraps goal.complete +
   settled text and throws CLAIM_REJECTED — a CLOSE verdict, not drift.
```

---

## 5 · THE DESTRUCTIVE CERTIFIER — the six layers (the 20%)

Unchanged from rev 2.0 in mechanism; demoted in emphasis, not in force.

```
L1..L6 each return CERTIFIED | VIOLATION(tier, reason) | UNCERTIFIABLE
UNCERTIFIABLE is NOT a pass. UNCERTIFIABLE = REFUSE.

the tier ladder survives:  graph-gate.ts:208  T0/T1/T2/T3 @ 0.4/0.6/0.8
the drift survives:        graph-gate.ts:152  (5-min decaying ratio)
the reset survives:        graph-gate.ts:136  (a query clears the symbol)
the single call site stays: gate-hook.ts:117  (grep count must remain 1)
```

---

## 6 · THE KERNEL GATE — the revised stages

```
   agent calls a tool
        │
   STAGE 0 · PREFLIGHT     every layer + both kernels UP
        │                  any DOWN → GI_STACK_INCOMPLETE → REFUSE
   STAGE 1 · CLASSIFY      the act → one of THREE classes
        │                    DESTRUCTIVE? DUMB? THEATRICAL? (or benign)
   STAGE 2 · BIND+INDEX    exec graph: bind claims ↔ evidence spans;
        │                  index the act against L1..L6
   STAGE 3 · THE THREE DETECTORS
        │    · DUMB        precondition table (Section 3)   → BLIND_ACT
        │    · THEATRICAL  claim firewall (Section 4)       → FABRICATED
        │    · DESTRUCTIVE  L1..L6 certify (Section 5)      → VIOLATION
   STAGE 4 · KERNEL        TSG: meaning match?
        │                  ABIDE: rubric-on-diff (repair, never block)
   STAGE 5 · VERDICT       ALLOW | STEER | REPAIR | REFUSE | ABORT
        │                    (theatrical at close: CLAIM_REJECTED, throw)
   STAGE 6 · RECORD        exec graph + enforcement graph
```

**Class → action table:**

```
┌──────────────┬───────────────────────┬──────────────────────────────
│ CLASS        │ DEFAULT ACTION        │ SEVERITY DRIVER              │
├──────────────┼───────────────────────┼──────────────────────────────┤
│ DUMB         │ STEER (append "query  │ first occurrence steers;     │
│              │ the graph first")     │ repeats escalate like drift  │
│ THEATRICAL   │ REFUSE (close-level)  │ binary — evidence present    │
│              │ / REPAIR (work-level) │ or absent. No ratio needed.  │
│ DESTRUCTIVE  │ REFUSE / ABORT        │ tier ladder + layer evidence │
└──────────────┴───────────────────────┴──────────────────────────────┘
```

---

## 7 · HARD DEPENDENCIES — NO FALLBACKS (extended register)

```
THE LAW: "NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK.
          HARD DEPENDENCIES ON EVERYTHING. LOUD FAIL CRASH ... CLEAR ERROR CODES"

OPERATIONAL FORM:
  1. Every component declares its dependency at load. Absent → CRASH, loudly.
  2. No component substitutes a weaker engine. Ever. No regex stand-in.
  3. UNCERTIFIABLE ≡ REFUSE for any act of any class.
  4. Every failure carries code + component + remedy + timestamp.
```

```
┌──────────────────────┬────────────────────────────────┬────────────────┐
│ CODE                 │ RAISED WHEN                    │ EFFECT         │
├──────────────────────────────────────────────────────────────────────┤
│ GI_STACK_INCOMPLETE  │ any layer down at PREFLIGHT    │ REFUSE all     │
│ GI_LAYER_SEMANTICA   │ L1 unreachable                 │ REFUSE + code  │
│ GI_LAYER_ARSUMBRIS   │ L2 daemon unreachable          │ REFUSE + code  │
│ GI_LAYER_UA          │ L3 graph absent/stale          │ REFUSE + code  │
│ GI_LAYER_C2KG        │ L4 indexer unreachable         │ REFUSE + code  │
│ GI_LAYER_CORBELL     │ L5 checkout unreachable        │ REFUSE + code  │
│ GI_LAYER_GRAPHIFY    │ L6 leg unreachable             │ REFUSE + code  │
│ GI_EXECGRAPH_DOWN    │ exec graph will not accept     │ REFUSE all     │
│ GI_ENFORCE_ABIDE     │ Abide unavailable              │ REFUSE all     │
│ GI_ENFORCE_TSG       │ TSG unavailable (key/net)      │ REFUSE all     │
│ GI_JEV_DOWN          │ Jev unreachable                │ REFUSE kernels │
│ GI_BLIND_ACT         │ DUMB: precondition fact absent │ STEER→REFUSE   │
│ GI_FABRICATED_CLAIM  │ THEATRICAL: zero evidence spans│ REFUSE (close) │
│ CLAIM_REJECTED       │ THEATRICAL: judged unsupported │ THROW at close │
│ CLAIM_FW_NO_LEDGER   │ firewall ledger absent         │ FAIL_CLOSED    │
│ CLAIM_FW_JEV_NO_KEY  │ firewall has no Jev key        │ FAIL_CLOSED    │
│ ABIDE_JEV_NO_KEY_SKIP│ Abide has no key               │ fail-open      │
│ ABIDE_RUBRIC_INVALID │ rubric schema/duplicate        │ CRASH          │
│ ABIDE_DIFF_TOO_LARGE │ diff > 24000 chars             │ SKIP + code    │
│ GI_UNCERTIFIABLE     │ a layer returned UNCERTAIN     │ REFUSE         │
│ GI_VIOLATION         │ a layer returned VIOLATION     │ REFUSE + tier  │
│ GI_POPULATE_FAILED   │ v1.3 law, carried forward      │ REFUSE + code  │
│ TTSR_RULE_INVALID    │ a TTSR rule fails to parse     │ CRASH (loud)   │
└──────────────────────┴────────────────────────────────────────────────┘
```

**A conflict the register exposes, preserved rather than papered:**

```
OR-1 (operator): NO FALLBACKS ANYWHERE. hard deps. LOUD CRASH.
R5/A4 (Abide):   FAIL-OPEN on edits. ABIDE_JEV_NO_KEY_SKIP.
                 "never wedge the editor on an 8s timeout".

These are RULING-CONFLICT. They are reconciled only by the surface split:
  WORK-LEVEL (edits)   → fail-open   → the agent keeps working
  CLOSE-LEVEL (done)   → fail-closed → a false "done" is itself the defect
If the operator wants fail-CLOSED everywhere, Abide's 5 silent paths
(:37 :44 :51 :70 :73-82) all become REFUSALS and the agent stops on any
Jev hiccup. That is a decision, not a default. FLAGGED FOR THE OPERATOR.
```

---

## 8 · BUILD ORDER (behaviour first — it is the 80%)

```
W0  THE STORE          layer_id on typed_nodes/edges; stand up the ledgers
                       (.abide/events.jsonl + claim ledger + gi_enforcement);
                       TSG reachable as the load unit; prove the guarded write
                       path is UNREACHABLE from the agent's tools.
W1  GATE SKELETON      STAGE 0..6; keep the tier ladder; wire
                       GI_STACK_INCOMPLETE. Test: a down layer REFUSES.
W2  THE LEDGER+BIND    ABSORB (TSG) + BIND (claim↔span). The claim↔evidence binder is the
                       single highest-value component in the whole kernel.
W3  DUMB DETECTOR      the precondition table. Cheapest win: no Jev, no
                       network, pure exec-graph facts. Replaces
                       basic-logic-check.md with a fact.
W4  THEATRICAL (close) the claim firewall: DETECT → BIND → JUDGE → ROUTE.
                       Replaces anti-theatrical.md + verification-before-
                       declaration.md + red-team-default.md with evidence.
W5  ABIDE (work)       rubric-on-diff, parallel listener, repair-not-block.
W6  L5+L6              corbell + graphify certify through the new stages.
W7  L4 CODE CONTEXT    populate-c2kg → 6 node + 7 connection types.
W8  L3 · L2 · L1       populate-ua · populate-arsumbris · populate-semantica.
W9  TSG                meaning retrieval inside the binder/judge.
W10 THE SEAL           every code in §7 proven to fire; one act of each of
                       the three classes traced end to end.
```

**Order rationale:** W2/W3/W4 come before any graph layer because they cover
80% of the kernel's work and depend on nothing external — no Jev, no network,
no new engine. The six layers land last because they serve the 20%.

---

## 9 · WHAT THIS DESIGN GUARANTEES

```
1. THE AGENT CANNOT LIE. A claim with no bound evidence span is FABRICATED,
   mechanically, by code — not by a model reading its prose.
2. THE AGENT CANNOT ACT BLIND. A structural edit with no prior query on the
   symbol is BLIND_ACT, mechanically.
3. THE AGENT CANNOT BREAK THINGS. Six layers certify every destructive act.
4. NO FALLBACK CAN EXIST. A component is UP and answering, or the stack is
   INCOMPLETE and the act is REFUSED. There is no degraded mode.
5. THE RECORD IS UNFORGEABLE. The enforcement graph is unreachable from the
   agent's tool surface.
6. EVERY REFUSAL IS EXPLAINABLE. Each verdict carries its class, its
   evidence, and its anchors — not a score.
```

---

## 10 · HONEST GAPS

- **The enforcement graph does not exist.** Measured absent today
  (`graph_gate_state` is drift-only; the claim ledger is PROPOSED). W0/W2 work.
- **Abide P0s are real**: pi symbols ABSENT; F2 fork open; 0 rules compiled;
  no rubric; key presence unverified. Abide cannot be wired until these close.
- **Abide precision needs calibration**: replay shows turn-rule 73% but
  edit-rule 26% — the narrow edit rules are the weak half. R11 says recalibrate
  locally; that is unstarted.
- **The polarity conflict (§7) is unresolved** and is the one thing that must be
  ruled before W5. It changes whether a Jev outage stops the agent.
- **The dumb detector's precondition table is my design, not a read mechanism.**
  The six layers, Abide and the firewall are all read from real sources; the
  precondition table in §3 is PROPOSED and has no empirical precision yet.
- **Zero performance measured.** Anything with Jev on the tool path is
  latency-bound; nothing in this stack has been benchmarked on this host.
- **The cache question from rev 2.0 remains open**: a cache of a CERTIFIED
  verdict is not a fallback; a cache consulted WHEN A LAYER IS DOWN is. Needs
  an explicit ruling or it becomes the loophole the law forbids.

---

## 11 · THE RSI REFLEX LAYER — CHAT-DELIVERED DESIGN (2026-09-21, preserved verbatim per the operator order)

## Q3 · THE RSI LAYER — buildable today, because the substrate exists

Your 8D framing is exactly right, and the closing move is this: **enforcement must be a
WRITER to the knowledge graph, not only a reader.**

```
      6D  KNOWLEDGE  (read by the gate)      ←──┐
                                                │ the RSI edge:
      2D  ENFORCEMENT (TSG + Abide)  ───────────┘
          observes → judges → RECORDS A REFLEX back into the 6D
```

**The reflex loop, using the columns that already exist:**

```
1  ENFORCE   a violation fires (dumb | theatrical | destructive) with its
             class, its target symbols, and its evidence spans
2  RECORD    write a REFLEX node:
               kind            = 'Reflex'
               canonical_id    = 'gi:reflex:<class>:<signature>'
               label           = the trigger predicate
               evidence_quote  = THE ORIGINAL VIOLATION TEXT   (provenance)
               confidence      = measured precision
                                 confirmed / (confirmed + false_positives)
               created_run     = 'rsi-<N>'
3  SUPERSEDE on the next occurrence: the old reflex row gets
             superseded_run = 'rsi-<N>' and a NEW row is inserted live
             (uq_tn_live_canonical already enforces one live row per id)
4  TIGHTEN   the reflex's confidence GATES its tier:
               precision ≥0.90 and ≥10 fires  → kind='Guard'  hard tier
               0.70–0.90                      → advisory (steer)
               <0.70 after N fires            → superseded to 'retired'
```

**A live reflex row would look like this — in the store we opened today:**

```
kind='Reflex'
canonical_id='gi:reflex:theatrical:claim-without-span'
label='claim "tests pass" with zero bound spans'
evidence_quote='<the actual claim + the absence proof>'
confidence=0.95            ← precision: 19 confirmed / 20 fired
created_run='rsi-7'  superseded_run=NULL        ← LIVE
```
