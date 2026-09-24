# GRAPH-INTELLIGENCE ENFORCEMENT PLAN — v2.2

**Author's seat:** the 2026-09-22 session, after the operator's charge.
**The charge:** the coding derailed from a lack of using the 6 graph layers; the kernel must
DETECT AND HANDLE the derailment classes itself.

---

## THE GAP — TARGET vs CURRENT, PER DELIVERABLE

```
TARGET (the pin + the operator's charge)                     CURRENT                         GAP
──────────────────────────────────────────────────────────── ─────────────────────────────── ─────────────────────
T-1 every fire adjudicated by a <5000-token Jev Noul in      fire-gate.ts · the ceiling +     ✅ MET
    BOTH positions                                            the state-level measurement
T-2 thresholds DERIVED from a measured curve + the           the curve measured (48 fires);   ◐ M2 owed (yours)
    operator's cost matrix                                    every policy calibrated=false
T-3 a fire_decisions row per fire; laterTruth resolved        the ledger + the oracle work;    ◐ THE EVIDENCE
    by the oracle                                             EVERY resolution synthetic      SOURCE MISSING
T-4 a live identified instance operated; the bug ledger      P4 hot seat: 24 ops, 2 CRITICAL  ✅ MET
    non-empty                                                 defects found + fixed
T-5 a FULL adversarial corpus pass: ZERO confirmed defects   7 passes, ~90 findings, NO ZERO  ✗ NOT MET
T-6 the seal + the receipt exist                             PACKAGE_AUDIT PASS + receipts    ✅ MET
──────────────────────────────────────────────────────────── ─────────────────────────────── ─────────────────────
★ THE OPERATOR'S ADDITION (the real target):
G-1 THE KERNEL DETECTS THE DERAILMENT CLASSES ITSELF          the kernel uses the graph as a  ✗ 0% — THE CORE GAP
     (7 of 7 are graph-detectable, 7 of 7 MPSE-settleable)    REGISTRATION PRECONDITION, not
                                                              as the INPUT TO EVERY DECISION
```

**THE HONEST SCORE:** 3 met · 2 partial · 1 unmet · 1 never attempted (G-1).

---

## WHY IT IS NOT CODED — THE ROOT CAUSE, THREE LAYERS

```
LAYER 1 — THE PIN'S WAVE TABLE IS ORGANIZED BY FILE, NOT BY INTELLIGENCE SOURCE.
  W1..W9 each name a FILE (fire-ledger.ts, oracle.ts, …). NOT ONE names the GRAPH as an input.
  The pin's own ladder — "engine → MPSE → cache → Jev" — implies the graph feeds MPSE, but no
  wave implements that edge. I built every wave faithfully and the edge was never in the plan.

LAYER 2 — I CLASSIFIED THE GRAPH AS INFRASTRUCTURE, NOT AS INTELLIGENCE.
  The 6 layers appear in MY OWN canon as a REGISTRATION BLOCKER ("the register reads up=5/11;
  registering the gate first refuses every tool call"). From that framing, the graph is a
  PRECONDITION TO SATISFY — a thing to bring UP — and I treated it exactly that way: I brought
  L5 UP and never read from it. ★ THE CATEGORY ERROR, IN ONE LINE: I treated the eyes as a
  light switch.

LAYER 3 — THE ONLY STRUCTURAL DETECTOR IN THE LOOP IS A MODEL PAID PER FILE.
  With the graph unused, the audit became the sole detector of structural defects. It costs a
  Noul per file per pass, it cannot see the whole system at once, and it re-finds the same
  classes (the eviction inconsistency: pass 6 → "fixed" → pass 7 HIGH). SEVEN PASSES, NO ZERO,
  ~90 findings — and SEVEN OF THEM WERE GRAPH LOOKUPS I PERFORMED BY HAND.
```

---

## THE PLAN — FIVE PHASES

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│  P1  THE GRAPH-FACT SETTLEMENT LAYER      ★ BUILT (a9a7a99) — src/omp/graph-facts.ts   │
│  P3  THE CONSULT-PATH FRESHNESS GATE      ★ BUILT (same commit) + the provenance fix    │
│  P2  THE EVIDENCE PRODUCER               ★ DONE (be41822) — WIRED via resolveFromSession │
│  P4  CLOSURE-LEVEL INDEXING               ★ DONE (5771099) — the kernel's OWN extractor │
│  P5  THE SELF-AUDIT                       the kernel checks its own author               │
└───────────────────────────────────────────────────────────────────────────────────────┘

## ★★★ P1+P3 — SHIPPED, AND THE RUN MEASURED ITS OWN COVERAGE AT 0 OF 4

```
WHAT SHIPPED:  the graph rung as the FIRST stage of FireGate.judge (the ladder is now
               graph → MPSE → cache → Jev) · the freshness gate on the CONSULT path ·
               12 corpus-fixture tests replaying the session's own derailments, each
               asserting its SPECIFIC rule token with firesUsed() UNCHANGED.

WHAT RUNNING IT PRODUCED (three findings, none readable):

  ★★★ 1  M-GRAPH-4 ANSWERED CONFIDENTLY WRONG (CRITICAL). Against the real graph it settled
         IGNORE "single call site" for `abandonInFlight` — which has TWO mutation sites; the
         second is an inline closure the indexer cannot see. THE SILENT-DEGRADE CLASS.
         ★ THE PRINCIPLE, NOW ENFORCED AND GENERALIZED: a rule may settle on a POSITIVE fact
           (the node EXISTS — finding it proves the indexer covers that kind). A rule must
           NEVER settle IGNORE on a COUNT: a count is a LOWER BOUND, and absence of evidence
           is only evidence of absence when the extractor covers the space.

  ★★ 2  THE CORBELL CHECKOUT HAD gi_meta WITH ZERO ROWS — the build wrote the graph and NOT
        its provenance, so layerFreshness refused EVERY fact as STALE BY CONSTRUCTION. The
        graph was unusable to the new rung the moment it was built, and nothing said so.
        FIXED: writeCorbellCheckout writes populated_at + substrate + run tag INSIDE THE SAME
        TRANSACTION — a graph whose provenance did not commit with it is a graph that lies
        about its own age.

  ★★★ 3  THE HONEST COVERAGE, MEASURED: **0 OF 4.**
          D-2 OutcomeRecord    → NO NODE — the indexer emits methods/classes/flows, NOT TYPES
          D-6 ledgerPath       → NO NODE — CONFIG FIELDS are not indexed
          D-7 serializedBytes  → NO NODE — LOCAL CONSTS are not indexed
          D-5 abandonInFlight  → was a FALSE IGNORE (inline CLOSURES invisible)
        DECLARED IN CODE as GRAPH_FACTS_COVERAGE: only M-GRAPH-3 (freshness) settles today;
        M-GRAPH-1/2/4/5 are implemented and BLOCKED ON THE EXTRACTOR.
```

## ★ THE PLAN'S CENTRE OF GRAVITY MOVED

```
BEFORE the build:  P1 looked like the hard part — six rules, real queries, a settled fire.
AFTER  the build:  P1 is DONE and TESTED (12/12) and IT CANNOT SETTLE ANYTHING, because the
                   EXTRACTOR does not emit the node kinds the rules read.
                   ★ P4 IS NO LONGER "the indexer's own blindness" — IT IS THE WHOLE GATE.
                     Not one rule beyond freshness earns its keep until the extractor
                     emits types, fields, consts and closures.
```


### P1 · THE GRAPH-FACT SETTLEMENT LAYER — `src/omp/graph-facts.ts` (NEW, ~250 L)

**WHAT:** six deterministic rules that read the TYPED STORE and settle a fire at $0 — no model.
They plug into `mpsePreFilter` as its FIRST stage (MPSE already is the $0 rung; this gives it eyes).

```
RULE            THE GRAPH FACT                          THE SETTLEMENT
M-GRAPH-1       in-degree 0 on a consumed type          REFUSE — "no producer exists"
M-GRAPH-2       in-degree 0 on a consumed config field  REFUSE — "declared, never consumed"
M-GRAPH-3       store.populated_at < HEAD               REFUSE — GI_LAYER_STALE
M-GRAPH-4       N>1 call sites of one mutation          ESCALATE — "the guards may differ"
M-GRAPH-5       a cycle: field ∈ its own computation    REFUSE — "the measurement includes itself"
M-GRAPH-6       a query with no citing change           RECORD — the ceremony counter
```

**WHERE:** a new stage in `mpsePreFilter` (fire-gate.ts) that runs BEFORE the two text rules.
A settle means NO JEV CALL — the cheapest rung answered.
**THE QUERIES:** against `.omp/graph-intelligence/corbell-checkout/store.sqlite` (L5) and the
GI typed store (the `typed_nodes`/`typed_edges` tables with `layer_id`).
**TESTS:** one per rule, each with a POSITIVE (the fact holds → settles) and a NEGATIVE
(the fact does not hold → passes to the next rung) half.
**GATE:** `test_graph_fact_producerless` · `test_graph_fact_dead_config` ·
`test_graph_fact_stale_store` — each must SELLTE at $0 with `firesUsed()` unchanged.

### P2 · THE EVIDENCE PRODUCER — `src/omp/evidence-producer.ts` (NEW, ~200 L)

**WHAT:** the missing constructor for `OutcomeRecord`. A watcher that turns the session's OWN
operation into the four record kinds the oracle's gatherers read.

```
THE FOUR EMISSIONS                                              THE SOURCE OF TRUTH
kind:"edit"      a later edit to a fired target                 the write/edit tool calls
kind:"test"      a test/verify run after the fire (+ passed)    the bash tool calls
kind:"withdraw"  a claim retracted WITH a bound span            a claim record + its span
kind:"permit"    a downstream gate allowed the act              gate-hook / the advisory
```

**WHY IT IS THE GATE AND NOT A NICETY:** without it, EVERY oracle resolution is synthetic —
proven twice this session (the W6 labels; the hot seat's hand-built edits). A precision
computed from labels is a measurement of the LABELS.
**THE CONTRACT:** `producer.observe(toolCall) → OutcomeRecord[]`, persisted as NDJSON beside
the ledger so a resolution is REPRODUCIBLE from the record, not from the moment.
**TESTS:** each of the four kinds emitted from a REAL tool-call fixture; the round trip
`observe → resolve → row.laterTruth` asserted end-to-end.
**GATE:** `test_producer_emits_four_kinds` + `test_organic_resolution` — the oracle resolving
a fire from PRODUCED evidence, not labels.

### P3 · THE CONSULT-PATH FRESHNESS GATE — `fire-gate.ts` + `typed-write.ts` (AMEND)

**WHAT:** `storeFreshness` exists (typed-write.ts:424) and guards the POPULATE path. It must
also guard the CONSULT path: any graph-derived verdict carries the store's `populated_at`, and
a store older than the last commit yields `GI_LAYER_STALE` — never a silent serve.
**WHY:** D-3. A stale store is worse than none: it answers confidently about a codebase that
no longer exists. I proved it by finding `abandonInFlight` ABSENT while believing I had a graph.
**GATE:** `test_stale_store_refuses_verdict` — a store whose `populated_at` precedes HEAD
produces a REFUSAL, not an answer.

### P4 · CLOSURE-LEVEL INDEXING — the graph layer's own improvement

**WHAT:** the corbell indexer extracts METHODS + CLASSES. The D-5 guard inconsistency lived in
an INLINE ARROW FUNCTION (`const evict = () => …`) — invisible to the graph.
**THE FIX:** extract closures as nodes (or at minimum, extract EVERY call to a shared mutation
and compare the guards at those sites).
**WHY IT IS THE HARDEST PHASE:** it touches the indexer, not the kernel. Until it lands,
M-GRAPH-4 covers only METHOD-level call sites.
**HONEST BOUND:** without P4, the kernel covers 5 of 7 derailment classes today.

### P5 · THE SELF-AUDIT — the kernel checks its own author

**WHAT:** a pre-act check on the AGENT'S OWN behavior, not the code's: MP-8 (the silent tool),
MP-9 (the report/work divergence), MP-10 (the fix-composition defect).
**THE RULES:**
```
MP-8   every scripted edit ASSERTS its post-state (the `sub()` helper that raises) — LANDED
MP-9   every completion claim BINDS to an artifact path or a command output — the audit's rule
MP-10  every fix that introduces SHARING or CACHING must re-derive the eviction/validation
       of the shared artifact, and the RE-VERIFY pass is mandatory before the wave closes
```
**GATE:** these are PROCESS rules, enforced by the pin's own text — the kernel can only make
them VISIBLE (a violation counter in the ledger), never enforce them on the agent.

---

## THE ORDER, THE FILES, THE GATES

```
PHASE  FILES                                          GATE (each with a POSITIVE + NEGATIVE half)
P1     src/omp/graph-facts.ts (NEW)                   5 rules settle at $0; firesUsed unchanged
       fire-gate.ts (mpsePreFilter gains the stage)
P3     fire-gate.ts · typed-write.ts (AMEND)          a stale store REFUSES
       ★ P1+P3 SHIP TOGETHER: a fact-rule reading a stale store is worse than no rule.
P2     src/omp/evidence-producer.ts (NEW)             4 kinds emitted; an ORGANIC resolution
P4     the corbell indexer (closure extraction)       a closure-level call site is visible
P5     the process rules + a violation counter        a silent-edit counter reads 0

★ SEQUENCE RATIONALE: P1+P3 first (they are the $0 intelligence and they need no new
  substrate), then P2 (the producer — the oracle's missing input), then P4 (the indexer's
  own blindness), then P5 (the process).
```

---

## THE SUCCESS CRITERION — MEASURABLE, NOT NARRATIVE

```
BEFORE (2026-09-22): the 7 derailment classes were found by 7 audit passes + ~90 hand findings
                     + 2 CRITICAL runtime defects + 70+ model calls.
AFTER (the target):  the SAME 7 classes are REFUSED at the PRE-ACT seat, at $0, BEFORE the
                     edit exists — and the audit's structural-finding rate DROPS because the
                     structural defects never land.

THE MEASUREMENT: replay the 7 derailments as CORPUS FIXTURES. Each must produce its SPECIFIC
settlement token with firesUsed() UNCHANGED:
    D-2 → M-GRAPH-1 (no producer)          D-5 → M-GRAPH-4 (guard parity)
    D-6 → M-GRAPH-2 (dead declaration)      D-7 → M-GRAPH-5 (self-measurement)
    D-3 → M-GRAPH-3 (stale store)           D-1/D-4 → M-GRAPH-6 (the ceremony counter)
A GENERIC refusal preempting a SPECIFIC one = UNOBSERVED, never PASS.
```

---

## THE RESIDUAL, NAMED

```
R-1  P4 touches the INDEXER, not the kernel — a different repo, a different owner. Until it
     lands, M-GRAPH-4 covers METHOD-level call sites only (5 of 7 classes covered today).
R-2  M2 (the cost matrix) is still owed and still gates W6's final thresholds.
R-3  The audit is a STANDING PROCESS by measurement, not a gate that reaches zero — unchanged
     by this plan; the plan REDUCES what the audit must find, it does not replace it.
R-4  P5's rules are PROCESS rules: the kernel can count a violation, never prevent one.
```


---

# ★★★ P4 — CLOSED (5771099): THE KERNEL EXTRACTS ITS OWN KINDS

```
THE BOTTLENECK: the rules were correct + tested (12/12) and could settle 0 of 4, because
corbell emits method|class|flow|service and the rules read type|field|const|closure.

THE FIX: scripts/structural-extract.py — THE SAME PARSER corbell uses (tree-sitter +
tree_sitter_typescript, taken from the corbell venv), emitting the four missing kinds plus
AST-exact `references` edges, into layer_id='structural' in the SAME typed store.
MEASURED: 4,477 nodes / 98 files · 7,639 reference edges.

THE RESULT, RE-MEASURED ON THE SESSION'S OWN DERAILMENTS:
    D-2 OutcomeRecord   → M-GRAPH-1 · FIRE      "the consumed symbol has ZERO incoming edges"
    D-6 ledgerPath      → M-GRAPH-2 · FIRE      "the declared symbol has ZERO edges in or out"
    D-5 abandonInFlight → M-GRAPH-4 · ESCALATE  "has 2 call sites — their guards must agree"
    D-7 serializedBytes → UNOBSERVED            (an object KEY, not a declaration — honest)
  ★ 3 OF 4 GRAPH-HANDLED · 2 OF WHICH SETTLE **FIRE** AT $0 — the graph catches the defect
    BEFORE the model is consulted. 0/4 → 3/4.

★★ AND THE THREE DEFECTS THAT RUNNING IT PRODUCED, none readable:
  1 THE EXTRACTOR MANUFACTURED THE EVIDENCE ITS CONSUMER NEEDED. Declaring a member emitted
    `Container --references--> itsOwnMember`, so EVERY member had in-degree ≥ 1 and
    M-GRAPH-2 gave a FALSE IGNORE on a dead field. 1,320 manufactured edges removed.
    ★ A PRODUCER THAT INVENTS THE EVIDENCE ITS CONSUMER NEEDS IS THE WORST KIND OF INSTRUMENT.
  2 canonical_id is UNIQUE and THE SAME NAME CAN BE DECLARED TWICE IN ONE FILE — the id now
    carries the declaration's line, because two declarations of one name in different scopes
    ARE different nodes.
  3 ★ FOUND BY THE CONTAINER: the suite hard-coded the HOST venv path, so all three tests
    FAILED in a clean container — THE SAME CLASS as the register's host-pinned ABIDE/RSI
    paths. FIXED so the dependency is NAMED everywhere and the tests SKIP with the reason
    (BLOCKED, never silently passed).

THE COVERAGE, DECLARED IN CODE (`GRAPH_FACTS_COVERAGE`):
    corbellKinds       method | class | flow | service
    structuralKinds    type | field | const | closure      ← the kernel's own
    verdict            3 of 4 derailments graph-handled; 2 settle FIRE at $0
```

## THE PLAN'S REMAINING WEIGHT

```
P2  THE EVIDENCE PRODUCER    src/omp/evidence-producer.ts — the oracle's missing input.
                             UNCHANGED BY P4. This is the next build.
P5  THE SELF-AUDIT           the process rules + a violation counter.
★ AND CORBELL ITSELF         the kernel no longer BLOCKS on it for the four kinds; it still
                             depends on it for `calls` (M-GRAPH-4's predicate) and for the
                             method graph. Two layers, one store, distinct layer_ids.
```


---

# ★★★ P2 — CLOSED (be41822): THE ORACLE'S INPUT EXISTS, AND THE FIRST ORGANIC RESOLUTION RAN

```
WHAT SHIPPED:  src/omp/evidence-producer.ts (11 tests) + resolveFromSession (the orchestrator)

THE FOUR EMISSIONS, each from its own source:
  kind:"edit"      a later edit to the fired target    ← the session's tool events, OR THE GRAPH
  kind:"test"      a verify run after the fire (+passed) ← shell events, matched by a DECLARED
                                                          command shape (never a guess)
  kind:"withdraw"  a retraction WITH a bound span       ← SUPPLIED (only the claimant has it)
  kind:"permit"    a downstream gate's permission       ← SUPPLIED (another system's verdict)

★★ THE ORGANIC RESOLUTION GATE — MET:
   a fire → the session edits the SAME target → a test FAILS → the producer emits →
   the records are PERSISTED → resolveAll reads them BACK FROM DISK → the row flips to
   confirmed. NO LABEL ANYWHERE IN THE PATH.
   ★ THE FIRST ORGANIC RESOLUTION IN THIS PROJECT'S HISTORY. Every prior one was synthetic
     (the W6 corpus labels; the hot seat's hand-built edits) — and a precision computed from
     labels is a measurement of the labels.

THE THREE LAWS IT OBEYS:
  REPRODUCIBLE    NDJSON beside the ledger — a resolution is re-derived from the RECORD,
                  not re-guessed from the session that produced it
  NEVER INVENTED  a verify run with NO verdict emits `passed` ABSENT — emitting `true` would
                  MANUFACTURE corroboration (the O1 fix extended to the producer)
  NAMED           an unreadable graph source emits `graph:UNAVAILABLE` and does NOT void the
                  event-derived records

★★ THE GRAPH AS A LABELLED SOURCE: laterEditFromGraph derives "a later edit" from the
   structural layer's `created_run` — a file re-indexed after the fire HAS changed. It carries
   `by: "graph:structural"` because it proves the FILE changed, not that the edit was a
   REPAIR. **A WEAKER FACT MUST NOT LOOK LIKE A STRONGER ONE.**

★ AND THE WIRING — THE PIN'S OWN UNWIRED-KERNEL ANTI-PATTERN: `resolveFromSession(ledger,
  events, opts)` resolves EVERY unresolved row in ONE call and REPORTS what it could not do
  (`noSubject` NAMED · `noEvidence` COUNTED). Without it the producer would be a library with
  no caller.
```

## THE PLAN'S REMAINING WEIGHT

```
P5  THE SELF-AUDIT      the process rules + a violation counter.
★ E1 (the oracle's ENGINE)  now correctly scoped: the PRODUCER is the gate (built), the
  ENGINE is the refinement. An engine would adjudicate AMBIGUOUS evidence; the evidence now
  EXISTS to adjudicate.
★ CORBELL                still depended on for `calls` and the method graph — two layers,
  one store, distinct layer_ids.
```

## ★ AND TWO FLAKES, RECORDED NOT EXPLAINED

```
EN-085  an UNIDENTIFIED, UNREPRODUCED failure: 350/1 once, then FIVE consecutive 350/0.
        The failing test was NEVER NAMED — so if it is real it is a cross-suite interaction
        that cannot be chased without a name. RATE ~1 in 7 combined runs. RESIDUAL, not a pass.
★ AND THIS IS THE SECOND FLAKE THIS SESSION (the first: a container 299/1 that did not
  reproduce). TWO unreproduced failures, both in COMBINED runs, neither attributed.
  A pattern worth watching is NOT YET a pattern worth claiming.
```
