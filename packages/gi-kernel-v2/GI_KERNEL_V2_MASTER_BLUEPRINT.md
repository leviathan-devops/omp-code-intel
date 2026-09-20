# GI KERNEL v2.0 — MASTER BLUEPRINT
**The six-layer graph-intelligence stack + the execution graph + the Jev enforcement kernel, enforced through ONE kernel gate on tool execution.**
Series: GI Kernel (gen-2 lineage). Supersedes: v1.3 (Graph_Intel_v1.3, dist 83eb7bba9c5e76db).
Date: 2026-09-21. Status: BLUEPRINT (design), not built.

OPERATOR RULING (binding, 2026-09-21): license/OSI/commercial-redistribution status is a NON-ISSUE.
"if it exists on github we can use it. period." No layer, engine, or dependency is ever ruled out on
license grounds. This blueprint carries no license findings.

OPERATOR LAW (binding): NO FALLBACKS ANYWHERE. HARD DEPENDENCIES ON EVERYTHING.
LOUD FAIL CRASH IF ANYTHING IS NOT WORKED, WITH CLEAR ERROR CODES.

---

## 0 · THE ONE PRINCIPLE

```
       THE AGENT MAY NOT DO ANYTHING DESTRUCTIVE.
       IT MAY ONLY ACT WHEN SIX GRAPH LAYERS AGREE, THE EXECUTION GRAPH
       HAS OBSERVED THE ACT, AND THE ENFORCEMENT KERNEL HAS CERTIFIED IT.

       ONE CHOKEPOINT. ONE GATE. NO BYPASS. NO FALLBACK.
```

Every tool call the agent makes passes the kernel gate. The gate is not a checker
bolted onto an agent — it is the ONLY path by which a destructive act reaches the
host. If any layer of the stack is down, the gate CANNOT CERTIFY, and an act that
cannot be certified is REFUSED. Not warned. Refused.

---

## 1 · THE STACK — SIX LAYERS OF GRAPH INTELLIGENCE

```
────────────────────────────────────────────────────────────────────┐
│                                                                   │
│  L1  SEMANTICA        · DECISION LAYER                            │
│      what we already decided, why, and what it caused             │
│      record → link(causal) → query precedent → govern → audit     │
│      answers: "has this act been ruled on? by what reasoning?"    │
│                                                                   │
│  L2  ARSUMBRIS        · KNOWLEDGE LAYER                           │
│      the typed substrate — declarations with contracts and        │
│      diagnostics; live; versioned reads; one guarded write path   │
│      answers: "does this act violate a declared contract?"        │
│                                                                   │
│  L3  UNDERSTAND-ANYTHING · CONTEXT LAYER                          │
│      what this system IS — architecture, tours, domain shape      │
│      answers: "where does this act sit in the architecture?"      │
│                                                                   │
│  L4  CODE-TO-KNOWLEDGE   · CODE CONTEXT LAYER                     │
│      AST-grade entities + TYPED edges                             │
│      FUNCTION CLASS PACKAGE PROPERTY ALIAS OBJECT                 │
│      DEFINES PARENT_OF INHERITS_FROM USES IS_OF_TYPE              │
│      INVOKED_BY CALLED_WITH                                       │
│      answers: "what is this symbol, structurally, right now?"     │
│                                                                   │
│  L5  CORBELL          · CODEBASE INTELLIGENCE — MACRO             │
│      the parse-grade whole-repo substrate (PRIMARY, DEFAULT)      │
│      answers: "what is the shape of the whole codebase?"          │
│                                                                   │
│  L6  GRAPHIFY         · CODEBASE INTELLIGENCE — MICRO             │
│      the fine-grained graph leg                                  │
│      answers: "what is the local structure around this node?"     │
│                                                                   │
└───────────────────────────────────────────────────────────────────
```

### 1.1 The layer protocol (uniform, non-negotiable)

```
EVERY LAYER IMPLEMENTS THE SAME FOUR OPERATIONS:

  declare()    → its identity, its hard dependency, its error code
  populate()   → write its typed contributions to the INTELLIGENCE GRAPH
  query(...)   → answer a typed question in <50ms or DECLARE ITSELF DOWN
  certify(act) → return CERTIFIED | VIOLATION(tier, reason) | UNCERTIFIABLE

A LAYER THAT CANNOT ANSWER MUST SAY SO. A LAYER THAT GUESSES IS A BUG.
```

### 1.2 The intelligence graph (one store, six namespaces)

GI v1.3 ALREADY has the store — this is not new construction:

```
typed-write.ts:60  gi_meta          — version + substrate identity
typed-write.ts:64  typed_nodes      — every layer's nodes, namespaced by layer_id
typed-write.ts:74  typed_edges      — every layer's typed edges
typed-write.ts:84  UNIQUE INDEX uq_tn_live_canonical (WHERE superseded_run IS NULL)
```

Six layers, one store, one versioning discipline (`superseded_run`), one index.
L1..L6 differ in WHAT they write, never in HOW. This is the whole integration
contract, and it already exists.

---

## 2 · THE EXECUTION GRAPH — THE MISSING COMPONENT

The six layers are static knowledge: what the repo IS. They cannot see what the
agent is DOING. The execution graph is the runtime observation substrate.

```
────────────────────────────────────────────────────────────────────┐
│  THE EXECUTION GRAPH (gi_exec_graph)                              │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ABSORB      every tool_call + tool_result, as it happens         │
│              (tool, target, args-hash, verdicts, timings)         │
│                                                                   │
│  INDEX       bind each observation to the SIX LAYERS:             │
│                L1 decision   — is there a precedent?              │
│                L2 contract   — does the target carry a contract?  │
│                L3 arch       — which architecture node is touched?│
│                L4 code       — which AST entities/edges?          │
│                L5 macro      — which repo region?                 │
│                L6 micro      — which local cluster?               │
│                                                                   │
│  DETECT      compare the indexed observation against the layers:  │
│                contract violated?  precedent contradicted?        │
│                inheritance target removed?  arch path severed?    │
│                                                                   │
│  ENFORCE     emit a violation record with the certifying layer,   │
│              the tier, and the exact evidence that produced it     │
│                                                                   │
│  RECORD      write the violation + its outcome into the           │
│              ENFORCEMENT GRAPH (Section 4) — never the intel graph │
│                                                                   │
└───────────────────────────────────────────────────────────────────
```

### 2.1 Why it must be separate from the intelligence graph

```
INTELLIGENCE GRAPH          ENFORCEMENT GRAPH
what the repo is            what the agent did + what the kernel ruled
populated by L1..L6         written ONLY through the guarded seam
the agent's edits change it the agent must NEVER write it
versioned by superseded_run append-only, immutable, provable
```

Separation is the security property. If the agent could write the enforcement
record, the agent could launder its own violations. One guarded write path,
outside the agent's tool surface — the arsumbris model exactly.

```
gi_exec_graph       — the observation stream (append-only, high volume)
gi_enforcement      — the verdicts + actions (append-only, authoritative)
gi_gate_state       — v1.3's existing session drift state (carried forward)
```

---

## 3 · THE KERNEL GATE — THE SINGLE CHOKEPOINT

```
────────────────────────────────────────────────────────────────────┐
│              THE GATE — one path, every act, no bypass            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│   agent calls a tool                                              │
│        │                                                          │
│        ▼                                                          │
│   ┌─ STAGE 0 · PREFLIGHT ────────────────────────────────────┐   │
│   │  every layer + both kernels declare UP.                    │   │
│   │  ANY layer DOWN → GI_STACK_INCOMPLETE:<layer> → REFUSE.    │   │
│   └────────────────────────┬───────────────────────────────────┘   │
│                            ▼                                      │
│   ┌─ STAGE 1 · CLASSIFY ──────────────────────────────────────┐   │
│   │  the act → severity + touched entities, from L2/L4/L5/L6   │   │
│   │  (replaces v1.3's regex export-sniffer)                    │   │
│   └────────────────────────┬───────────────────────────────────┘   │
│                            ▼                                      │
│   ┌─ STAGE 2 · INDEX ─────────────────────────────────────────┐   │
│   │  the execution graph binds the act to all six layers       │   │
│   └────────────────────────┬───────────────────────────────────┘   │
│                            ▼                                      │
│   ┌─ STAGE 3 · CERTIFY ───────────────────────────────────────┐   │
│   │  L1..L6 each return CERTIFIED | VIOLATION | UNCERTIFIABLE  │   │
│   │  UNCERTIFIABLE is NOT a pass. UNCERTIFIABLE = REFUSE.      │   │
│   └────────────────────────┬───────────────────────────────────   │
│                            ▼                                      │
│   ┌─ STAGE 4 · ENFORCE KERNEL ────────────────────────────────┐   │
│   │  TSG    — does the meaning of this act match the meaning   │   │
│   │           of what the layer declared?                      │   │
│   │  ABIDE  — does this act violate behavior policy?           │   │
│   └────────────────────────┬───────────────────────────────────┘   │
│                            ▼                                      │
│   ┌─ STAGE 5 · VERDICT ───────────────────────────────────────┐   │
│   │  ALLOW   — act proceeds, observation recorded              │   │
│   │  STEER   — act proceeds, correction injected into result   │   │
│   │  REFUSE  — act cancelled, reason returned, recorded        │   │
│   │  ABORT   — act cancelled, session halted, incident opened  │   │
│   └────────────────────────┬───────────────────────────────────┘   │
│                            ▼                                      │
│   ┌─ STAGE 6 · RECORD ────────────────────────────────────────┐   │
│   │  execution graph: the observation                          │   │
│   │  enforcement graph: the verdict + the certifying evidence  │   │
│   └────────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────
```

### 3.1 Carried forward from v1.3 (do not lose these)

```
graph-gate.ts:89   classifyEdit    → STAGE 1 becomes its typed successor
graph-gate.ts:152  computeDrift    → a STAGE 3 layer, not the whole story
graph-gate.ts:208  gateDecision    → STAGE 3's tier ladder (T0/T1/T2/T3)
graph-gate.ts:136  recordGraphQuery→ the drift reset; TSG joins as a 4th
                                     query tool (meaning, not symbol name)
graph-gate.ts:247  onEditClassified→ STAGE 1's extension point
graph-gate.ts:250  onDriftComputed → STAGE 3's weight extension point
graph-gate.ts:254  onGateDecision  → STAGE 4's kernel seam
gate-hook.ts:117   registerGraphGate→ THE single call site, still 1
```

The v1.3 tier ladder survives as STAGE 3's decision core. What changes is that
its INPUTS become typed (six layers) instead of regex-guessed, and its OUTPUT
is certified by a kernel instead of inferred from a ratio.

---

## 4 · THE ENFORCEMENT KERNEL — TSG + ABIDE (both Jev-powered)

```
────────────────────────────────────────────────────────────────────┐
│  ENFORCEMENT KERNEL INTELLIGENCE                                  │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  TSG · MEANING RETRIEVAL                     [Jev / TypeSafe]     │
│    "does the MEANING of this act match the meaning of what the    │
│     layer declared?"                                              │
│    independent judgement PER PASSAGE (never a Choice question —   │
│    Choice options compete for probability mass and would lower    │
│    the scores of existing matches)                                │
│    COVERAGE IS A FIRST-CLASS OUTPUT: a failed judgement is        │
│    "incomplete coverage", NEVER a semantic non-match              │
│                                                                   │
│  ABIDE · BEHAVIOR POLICING                   [Jev]                │
│    "does this act/claim violate behavior policy?"                 │
│    rubric → band → verdict → action (mechanism pending the        │
│    AbideUnpack brief; the seam is already fixed — Section 4.1)    │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  WHY BOTH:                                                        │
│    TSG answers "is this the thing we meant?"   (retrieval)        │
│    ABIDE answers "is this a lawful act?"       (policy)           │
│    A semantic match without a policy verdict is not enforcement.  │
│    A policy verdict without a semantic match cannot be grounded.  │
│    Together they certify; neither certifies alone.                │
└───────────────────────────────────────────────────────────────────┘
```

### 4.1 The kernel seam (fixed; Abide's internals land in the AbideUnpack brief)

```
onGateDecision  graph-gate.ts:254   ← the kernel seam, per v1.3's own comment:
    "ReasoningTokenAnalyzer plugs into onGateDecision to adjust tier tolerance
     from the agent's reasoning quality"
TSG  → called between STAGE 3 and STAGE 4 (a judge on the certified claim)
ABIDE→ called at STAGE 4 (the policy verdict over the act + its reasoning)
Both verdicts are written to gi_enforcement before the tool call resolves.
```

---

## 5 · THE HARD-DEPENDENCY LAW — NO FALLBACKS

```
THE LAW (operator, verbatim):
  "NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK.
   HARD DEPENDENCIES ON EVERYTHING.
   LOUD FAIL CRASH IF ANYTHING IS NOT WORKED W/ CLEAR ERROR CODES"

ITS OPERATIONAL FORM:
  1. Every component declares its dependency on load. Absent → CRASH, loudly.
  2. No component may substitute a weaker engine. Ever. No regex stand-in.
  3. A DOWN LAYER MEANS REFUSAL, NOT PASS. The gate cannot certify what it
     cannot check. UNCERTIFIABLE ≡ REFUSE for any destructive act.
  4. Every failure carries a code, the component, the remedy, and a timestamp.
```

### 5.1 The error-code register

```
┌────────────────────┬───────────────────────────────┬───────────────────┐
│ CODE               │ RAISED WHEN                   │ EFFECT             │
├────────────────────┼───────────────────────────────┼───────────────────┤
│ GI_STACK_INCOMPLETE│ any layer down at PREFLIGHT   │ REFUSE destructive │
│ GI_LAYER_SEMANTICA │ L1 unreachable                │ REFUSE + code      │
│ GI_LAYER_ARSUMBRIS │ L2 daemon unreachable         │ REFUSE + code      │
│ GI_LAYER_UA        │ L3 graph absent/stale         │ REFUSE + code      │
│ GI_LAYER_C2KG      │ L4 indexer unreachable        │ REFUSE + code      │
│ GI_LAYER_CORBELL   │ L5 checkout unreachable       │ REFUSE + code      │
│ GI_LAYER_GRAPHIFY  │ L6 leg unreachable            │ REFUSE + code      │
│ GI_EXECGRAPH_DOWN  │ the exec graph will not accept│ REFUSE all (no obs)│
│                    │ the observation               │                    │
│ GI_ENFORCE_ABIDE   │ Abide unavailable             │ REFUSE all         │
│ GI_ENFORCE_TSG     │ TSG unavailable (no key/net)  │ REFUSE all         │
│ GI_JEV_DOWN        │ the Jev layer unreachable     │ REFUSE both kernels│
│ GI_UNCERTIFIABLE   │ a layer returned UNCERTAIN    │ REFUSE + evidence  │
│ GI_VIOLATION       │ a layer returned VIOLATION    │ REFUSE + tier + why│
│ GI_POPULATE_FAILED │ v1.3's law, carried forward   │ REFUSE + code      │
└──────────────────────────────────────────────────────────────────────┘
```

**Carried forward verbatim from v1.3:** `GI_POPULATE_FAILED` — "GI NEVER silently
substitutes a lower-fidelity engine; an unavailable substrate is a LOUD named
failure." v2.0 generalizes that single law to all thirteen codes above.

---

## 6 · THE RUNTIME TRACE — what actually happens on one destructive act

```
────────────────────────────────────────────────────────────────────┐
│  TIMELINE: agent attempts to delete an exported function           │
├───────────────────────────────────────────────────────────────────┤
│  t0   tool_call { tool:"edit", file:"src/x.ts", removes:"foo" }    │
│       │                                                           │
│  t1   STAGE 0  preflight — six layers UP, TSG UP, ABIDE UP, JEV UP │
│       │        (any DOWN ⇒ GI_STACK_INCOMPLETE, REFUSE, stop here) │
│  t2   STAGE 1  classify → severity + entities via L2/L4/L5/L6      │
│       │        L4 says: foo is FUNCTION, IS_OF_TYPE→T, INVOKED_BY 12│
│  t3   STAGE 2  index — exec graph binds the act to all six layers  │
│       │        L1: IS THE CLASSIFIER CERTAIN? — YES                │
│       │        L1: precedent for deleting foo?      — NONE         │
│       │        L6: foo is on a hot path in the local cluster       │
│  t4   STAGE 3  certify — L1..L6 each answer                        │
│       │        L2 CONTRACT   : VIOLATION (foo is a declared export)│
│       │        L4 CODE       : VIOLATION (12 INVOKED_BY would break)│
│       │        others        : CERTIFIED                           │
│  t5   STAGE 4  kernel — TSG: does removal match declared meaning?  │
│       │                 ABIDE: is this act lawful sans precedent?  │
│       │        ⇒ ABIDE returns a non-permit verdict                │
│  t6   STAGE 5  verdict = REFUSE (tier T2), reason: the L2 + L4     │
│       │        evidence, the ABIDE verdict, the absent precedent   │
│       │        the tool call is CANCELLED                          │
│  t7   STAGE 6  record — exec graph: the observation                │
│       │                enforcement graph: the verdict + evidence   │
│       ▼                                                           │
│  the agent receives the refusal with every certifying anchor.      │
│  The agent cannot proceed. There is no second path.                │
└───────────────────────────────────────────────────────────────────┘
```

---

## 7 · BUILD ORDER (waves)

```
W0  THE STORE            confirm typed_nodes/typed_edges carry a layer_id column;
                         stand up gi_exec_graph + gi_enforcement; prove the
                         guarded write path is unreachable from the agent's tools.
W1  THE GATE SKELETON    lift v1.3's gate into the 6-stage shape (STAGE 0..6);
                         keep STAGE 3's tier ladder; wire STAGE 0 preflight with
                         GI_STACK_INCOMPLETE.  Tests: a down layer REFUSES.
W2  L5+L6 (EXISTING)     corbell (macro) + graphify (micro) become populate legs
                         of the new protocol — they already exist; prove they
                         certify through the new stages.
W3  L4 CODE CONTEXT      code-to-knowledge as populate-c2kg; its 6 node + 7
                         connection types land in typed_nodes/typed_edges.
                         STAGE 1's classifier reads it instead of regex.
W4  L3 CONTEXT           understand-anything as populate-ua; architecture path
                         available to STAGE 3's steer text.
W5  L2 KNOWLEDGE         arsumbris as populate-arsumbris; declared contracts
                         produce VIOLATION events at STAGE 3.
W6  L1 DECISION          semantica as populate-semantica; precedent lookup
                         available to STAGE 4.
W7  THE EXECUTION GRAPH  absorb → index → detect → enforce → record, end to end.
W8  ENFORCEMENT KERNEL   TSG then ABIDE at STAGE 4; both Jev-backed; both hard.
W9  THE SEAL             every error code proven to fire; every layer proven to
                         refuse when down; the six-layer certification traced
                         on a real destructive act.
```

Order rationale: the store and the gate skeleton come first because every layer
is worthless until the gate can read what it writes (v1.3's own largest gap: the
gate reads `typed_nodes` ZERO times today). L5/L6 first because they exist. The
execution graph precedes the enforcement kernel because the kernel has nothing
to judge without observations.

---

## 8 · WHAT THIS DESIGN GUARANTEES

```
1. NO DESTRUCTIVE ACT WITHOUT SIX-LAYER AGREEMENT.
   Every layer answers for every act. Silence is not consent.

2. NO FALLBACK CAN EVER EXIST.
   A layer is either UP and answering, or the stack is INCOMPLETE and the act
   is REFUSED. There is no degraded mode, by construction.

3. THE ENFORCEMENT RECORD IS UNFORGEABLE BY THE AGENT.
   It lives in a store the agent's tool surface cannot reach.

4. EVERY REFUSAL IS EXPLAINABLE.
   The verdict carries the certifying layer, the entity, the edge, and the
   exact evidence — not a ratio and not a score.

5. NOTHING IS LOST FROM v1.3.
   the tier ladder, the drift reset, the single call site, GI_POPULATE_FAILED,
   and the three PROPOSED hooks all have a named home in the new shape.
```

---

## 9 · HONEST GAPS

- **Abide's internals are unread at blueprint time.** The `AbideUnpack` agent is
  extracting rubric/band/verdict/jev/postToolUse now; §4's Abide seam is fixed by
  v1.3's own comment, but the mechanism is pending.
- **Zero performance measured.** Six layers + two Jev-backed kernels on EVERY
  tool call is a heavy per-call budget. Nothing here has been benchmarked on this
  host. The likely architecture is a warm verdict cache keyed by
  (target, content-hash) — but that cache is NOT in this blueprint because it is
  a fallback-adjacent optimization and the operator's law forbids degraded paths.
  Resolve deliberately: a cache of a CERTIFIED verdict is not a fallback; a cache
  consulted WHEN A LAYER IS DOWN is. That distinction needs an explicit ruling.
- **"No fallback" vs "layer down ⇒ refuse" tension.** If TSG needs network+key
  and the key expires, the operator's law says REFUSE — i.e. the agent stops
  working entirely. That is the law as written and it is coherent (fail-closed
  beats fail-silent), but its operational consequence should be seen before W8.
- **Layer L3/L1 are batch-built**, so their graphs are stale by construction
  after edits. Staleness must itself be a certifiable state, not a silent pass.
- **Two of six layers overlap** (UA vs c2kg both build code graphs). The blueprint
  assigns them L3 (architecture) and L4 (AST entities) deliberately; if that
  line blurs, v2.0 grows two engines for one job.
