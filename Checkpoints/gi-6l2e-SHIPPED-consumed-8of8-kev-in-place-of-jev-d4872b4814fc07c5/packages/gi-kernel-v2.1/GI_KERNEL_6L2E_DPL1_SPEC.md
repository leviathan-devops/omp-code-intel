# BUILD SPEC ARTIFACT — GI KERNEL 6L + 2E (the wired intelligence stack)
**Target:** `Graph_Intelligence` — the 6-layer graph intelligence stack + the 2 Jev-powered enforcement kernels, ENGINEERED AS INPUTS TO EVERY DECISION (not as a register).
**Generated:** 2026-09-22 · **Trident Version:** DPL1 (Layer 1 Initial Plan) · **Status:** PLANNING · **Artifact Type:** BUILD_SPEC (Layer 1 Prompt)
**Discovery:** ENABLED — 3 forensic passes + a 6-desk code wave + the 4 build-package specs read THIS turn.
**PREFLIGHT:** script-test ✓ deep-container-testing ✓
**Supersedes:** nothing. This EXTENDS `GI_KERNEL_V2.1_DPL1_SPEC.md` (the adjudication kernel) with the WIRING the v2.1 plan never contained. **THE SCOPE IS 6 LAYERS + 2 KERNELS. UNABRIDGED.**

---

# §1 · THE PROBLEM STATEMENT (from the operator's words, verbatim)

## 1.1 · THE OPERATOR'S CHARGE (verbatim, this session)

```
"GI KERNEL v2.0 + v3.0 — BUILD THE SIX-LAYER GRAPH STACK, THE JEV ENFORCEMENT KERNEL,
 AND THE RSI LAYER; SEAL BOTH PACKAGES."

"Re-read the following from the previous session. I now believe these things:
 1) Semantica - Decision Layer
 2) Arsumbris - Knowledge Layer
 3) Understand anything - context layer
 4) code to knowledge - code context layer
 5) corbell - codebase intelligence macro layer
 6) graphify - codebase intelligence micro layer
LAYERS of graph intellgience enforce by/through the kernel gate on tool execution.
agent cannot do anything destructive based on a 6-layered graph intelligence system

Enforcement Kernel Intelligence:
 1) TSG
 2) Abide
both jev powered.

*NO FUCKING STUPID FALLBACKS WNYWHERE IN THIS STACK. HARD DEPENDENCIES ON EVERYTHING.
 LOUD FAIL CRASH IF ANYTHING IS NOT WORKED W/ CLEAR ERROR CODES*"

"THE AGENT MAY NOT DO ANYTHING DESTRUCTIVE." (destructive, dumb, or theatrical)
```

**THE SCOPE IS UNAMBIGUOUS: 6 graph layers + 2 enforcement kernels. The operator has NEVER lowered it. A build that wires fewer is a FAILED build, not a smaller scope.**

## 1.2 · ★ THE ROOT CAUSE, STATED VERBATIM BY THE BUILD ITSELF

**From `GRAPH_INTELLIGENCE_ENFORCEMENT_PLAN.md` (the build's own words):**
```
"LAYER 1 — THE PIN'S WAVE TABLE IS ORGANIZED BY FILE, NOT BY INTELLIGENCE SOURCE.
  W1..W9 each name a FILE (fire-ledger.ts, oracle.ts, …). NOT ONE names the GRAPH as an
  input. ... I built every wave faithfully and the edge was never in the plan.

LAYER 2 — I CLASSIFIED THE GRAPH AS INFRASTRUCTURE, NOT AS INTELLIGENCE.
  The 6 layers appear in MY OWN canon as a REGISTRATION BLOCKER ('the register reads up=5/11;
  registering the gate first refuses every tool call'). From that framing, the graph is a
  PRECONDITION TO SATISFY — a thing to bring UP — and I treated it exactly that way: I
  brought L5 UP and never read from it.
  ★ THE CATEGORY ERROR, IN ONE LINE: I TREATED THE EYES AS A LIGHT SWITCH.

LAYER 3 — THE ONLY STRUCTURAL DETECTOR IN THE LOOP IS A MODEL PAID PER FILE."
```

## 1.3 · ★★ THE THREE MECHANICAL PROOFS OF THE DERAILMENT (measured this turn)

```
PROOF 1 — THE REGISTER IS A PATH-EXISTENCE CHECK, NOT A WIRING CHECK.
  src/omp/hard-deps.ts:335-367 declares 11 components via `pathComponent(...)` /
  `liveSocketComponent(...)` / `keyFileComponent(...)`.
  a `pathComponent` tests: DOES THE PATH EXIST? (a file check)
  it NEVER tests: DOES A DECISION READ THIS LAYER'S DATA?
  ★ `up=5/11` IS A HEALTH CHECK ON FILES. IT CAN READ 11/11 AND STILL FEED ZERO DECISIONS.

PROOF 2 — THE LAYERS ARE DECLARED, NEVER CONSUMED.
  grep the 6 layer ids against the decision path:
    GI_LAYER_SEMANTICA · GI_LAYER_ARSUMBRIS · GI_LAYER_UA · GI_LAYER_C2KG ·
    GI_LAYER_CORBELL · GI_LAYER_GRAPHIFY
  ★ THEY APPEAR IN hard-deps.ts (the register) AND NOWHERE IN THE DECISION PATH.
  A layer id that appears only in the register is a LIGHT SWITCH, not an eye.

PROOF 3 — THE WAVE TABLE NAMES FILES, NOT INTELLIGENCE EDGES.
  06-WAVES.md W1-W9: fire-ledger.ts · oracle.ts · fire-gate.ts · kernel-v2.ts ·
  policy-store.ts · calibration.ts · MEASUREMENT_PLAN.md · the container · the seal.
  ★ NOT ONE WAVE IS "L3 UA → MPSE". The graph-as-input edge was NEVER A WAVE.
```

## 1.4 · THE MEASURED STATE (what exists)

```
6 LAYERS (declared, 1 partially populated):
  L1 SEMANTICA  (decision)   path-declared · 0 consumers · not on PATH
  L2 ARSUMBRIS  (knowledge)  socket-declared · 0 consumers · not on PATH
  L3 UA         (context)    path-declared · 0 consumers · not on PATH
  L4 C2KG       (code ctx)   path-declared · 0 consumers · not on PATH
  L5 CORBELL    (macro)      ★ INSTALLED (~/.local/bin/corbell) · the store EXISTS · 0 consumers
  L6 GRAPHIFY   (micro)      ★ the store EXISTS (15 MB, 1266 nodes) · describes src/hunter
2 KERNELS:
  TSG   (the load unit)      path-declared · no LoadUnit impl · 0 consumers
  ABIDE (the ALU/repair)      path-declared · no consumer
★ THE REGISTER: up=5/11 · first=GI_LAYER_SEMANTICA.
★ THE DECISION PATH (fire-gate.ts): reads MPSE + the cache + Jev. IT READS NO LAYER.
```

---

# §2 · ARCHITECTURE (the target — every layer an INPUT, not a register entry)

## 2.1 · ★ THE ONE-LINE INVERSION (the fix)

```
BEFORE:  layer → probe(path exists?) → up ? "ready" : "down"   ← A REGISTER
AFTER:   decision → query(layer) → a FACT → the verdict         ← AN INPUT

★ THE LAW OF THIS SPEC: A LAYER IS "UP" IF AND ONLY IF A DECISION READ IT AND ITS FACT
  CHANGED THE OUTCOME. A layer that exists but feeds nothing is DOWN — NO MATTER ITS PATH.
```

## 2.2 · THE TARGET DATA FLOW (the 8 components, each with its consumer)

```
                    THE DECISION (a fire / an edit / a completion claim)
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        │                             │                             │
   ┌────▼─────┐              ┌────────▼────────┐           ┌────────▼───────
   │ L1       │              │ L2              │           │ L3             
   │ SEMANTICA│              │ ARSUMBRIS       │           │ UA             
   │ DECISION │              │ KNOWLEDGE       │           │ CONTEXT        
   │ "what we │              │ "what is typed  │           │ "what does the 
   │  decided"│              │  & linked"      │           │  system mean"  
   └────┬─────┘              └────────┬────────┘           └────────┬───────
        │  find_precedents            │  query_graph               │  the .u
        │  record_decision            │  (typed entities)          │  (under
        └─────────────┬───────────────┴────────────────────────────┘
                      ▼
        ┌─────────────────────────────┐
        │ L4 C2KG — CODE CONTEXT      │   the LSP index: symbols, refs, type
        └──────────────┬──────────────┘
                       ▼
        ┌─────────────────────────────┐
        │ L5 CORBELL — MACRO          │   the parse-grade checkout: methods,
        │ (PRIMARY)                   │   flows, services + the structural l
        └──────────────┬──────────────┘
                       ▼
        ┌─────────────────────────────┐
        │ L6 GRAPHIFY — MICRO         │   the graph.json: the fine-grained e
        └──────────────┬──────────────┘
                       ▼
        ┌──────────────────────────────────────────────┐
        │ ★ THE SETTLEMENT RUNG (graph-facts.ts)       │
        │   M-GRAPH-1..6 read the layers → settle $0   │
        └──────────────┬───────────────────────────────┘
                       ▼
        ┌──────────────────────────────────────────────┐
        │ ★ THE ENFORCEMENT KERNELS                    │
        │   TSG   — the load unit: does the change     │
        │           MEAN what it claims?               │
        │   ABIDE — the ALU: repair, never block       │
        │   (both JEV-powered)                         │
        └──────────────┬───────────────────────────────┘
                       ▼
                     THE VERDICT (FIRE / ESCALATE / IGNORE)
```

## 2.3 · ★ THE INTERFACES (the contracts consumers build against)

```ts
// ── THE LAYER CONTRACT (every layer implements THIS — it is the interface)
interface GraphLayer {
  readonly id: LayerId;                       // 'L1_SEMANTICA' | … | 'L6_GRAPHIFY'
  readonly kind: 'decision'|'knowledge'|'context'|'code'|'macro'|'micro';
  probe(): LayerHealth;                       // ★ EXISTS + FRESH + CONSUMED
  query(q: LayerQuery): LayerFact | null;     // ★ THE INPUT — null = cannot answer (NEVER a guess)
  readonly coveredKinds: NodeKind[];          // ★ declares what it CAN answer (no silent absence)
}

// ── THE FACT CONTRACT (what a layer returns to a decision) ──
interface LayerFact {
  layer: LayerId;
  fact: 'node-exists'|'node-absent'|'edge-count'|'edge-absent'|'stale'|'cycle';
  subject: string;                            // the exact symbol/path the fact is about
  value: unknown;
  provenance: { populated_at: string; source: 'corbell'|'structural'|'graphify'|… };
}

// ── ★ THE CONSUMPTION CONTRACT (the anti-register law, mechanically) ──
interface LayerConsumption {
  layer: LayerId;
  consumers: string[];                        // ★ EVERY call site that reads it — MUST BE NON-EMPTY
  decisionsInfluenced: number;                // ★ the count of verdicts it changed
}
```

**★ THE ANTI-REGISTER RULE (the core of this spec):**
```
A LAYER'S REGISTRATION IS VALID IFF `consumers.length >= 1` AND `decisionsInfluenced >= 1`.
★ A LAYER WITH consumers.length === 0 IS `GI_LAYER_UNCONSUMED` — a LOUD DOWN, NOT "up".
★ THIS IS THE MECHANISM THAT MAKES "TREATING THE EYES AS A LIGHT SWITCH" IMPOSSIBLE.
```

---

# §3 · DISCOVERY INTELLIGENCE (measured, not estimated)

```
SOURCE TREE        /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
KERNEL             23 .ts in src/omp/ · 12 UNREACHABLE from extension.ts
REGISTER           src/omp/hard-deps.ts (17 KB) — 11 components, all path/socket/key probes
DECISION PATH      src/omp/fire-gate.ts (44 KB) — reads MPSE + cache + Jev, ZERO layers
SETTLEMENT         src/omp/graph-facts.ts (14 KB) — M-GRAPH-1..6, BUILT+TESTS, 0 call sites
EXTRACTOR          scripts/structural-extract.py — the kernel's OWN (4,477 nodes / 7,639 edges)
STORE L5           .omp/graph-intelligence/corbell-checkout/store.sqlite
STORE L6           graphify-out/graph.json (15,028,924 B · 1,266 typed nodes · 851 = src/hunter)
BATTERY            362 tests / 31 files · tsc 191
THE PACKAGE        6 specs · 1,493 lines of the audit (this session) · P4 CLOSED at 3/4 covered

★ THE MEASURED COVERAGE (the enforcement plan's own number): 3 of 4 derailments graph-handled,
  2 of which SETTLE FIRE at $0. THE PATH IS PROVEN. 0 of 6 LAYERS ARE WIRED.
```

---

# §4 · CORE INSIGHT (the first-principles thesis)

## 4.1 · THE THESIS

**The 6L+2E must be engineered as THE INPUT TO EVERY DECISION — a stack of FACTS the decision CONSULTS — not as a register of paths the boot CHECKS. The implementation must produce a system where a layer's existence is PROVEN BY ITS CONSUMPTION: a layer no decision reads is DOWN, loudly, by name.**

## 4.2 · THE GOVERNING NON-NEGOTIABLES

```
N1  A LAYER IS UP IFF ITS FACT CHANGED A VERDICT. (existence ≠ intelligence)
N2  THE EDGE IS THE DELIVERABLE. Every layer ships WITH its consumer, in ONE wave.
N3  NO FALLBACKS. A layer that cannot answer returns null → GI_LAYER_UNCONSUMED /
    GI_LAYER_STALE / GI_STORE_SCOPE_MISMATCH. NEVER a silent pass.
N4  THE EXTRACTOR MUST COVER WHAT THE RULES READ. (the P4 lesson: a rule may settle on a
    POSITIVE fact — a node EXISTS — never on a COUNT; absence of evidence is only evidence
    of absence when the extractor covers the space.)
N5  A LOWER BOUND IS NOT A COUNT. (M-GRAPH-4's lesson.)
N6  THE CONSUMER COUNT IS RECORDED PER RULE. A rule that never fires is a light switch.
N7  THE STORE'S PROVENANCE COMMITS WITH IT. (a graph whose gi_meta did not commit with it
    lies about its own age — the corbell 0-rows defect.)
```

---

# §5 · SCOPE (the 8 components, UNABRIDGED)

```
1  L1 SEMANTICA  — the decision layer      WIRE: the decision consults precedent + records
2  L2 ARSUMBRIS  — the knowledge layer     WIRE: the decision queries the typed KG
3  L3 UA         — the context layer       WIRE: the decision reads the .ua knowledge graph
4  L4 C2KG       — the code-context layer  WIRE: the decision reads the LSP index
5  L5 CORBELL    — the macro layer (PRIMARY) WIRE: the decision reads the parse-grade graph
6  L6 GRAPHIFY   — the micro layer         WIRE: the decision reads the fine-grained graph
7  TSG           — the load unit (Jev)     WIRE: the meaning gate on every change
8  ABIDE         — the ALU (Jev)           WIRE: the repair path (never block)
★ EACH SHIPS WITH ITS CONSUMER. THE SCOPE IS 8/8. A build that wires 5 is INCOMPLETE.
```

---

# §6 · SUCCESS CRITERIA (mechanical, command-verifiable)

| # | Criterion | The command | PASS |
|---|---|---|---|
| SC-1 | Every layer has ≥1 consumer | `bun run scripts/layer-consumption.ts` | 8/8 layers report `consumers.length >= 1` |
| SC-2 | Every layer's fact reached a verdict | `bun run scripts/layer-consumption.ts --decisions` | 8/8 report `decisionsInfluenced >= 1` |
| SC-3 | No layer id appears ONLY in the register | `grep -rn "GI_LAYER_" src/omp/ \| grep -v hard-deps` | every id appears in a decision file |
| SC-4 | The register reports CONSUMPTION, not just paths | `bun test -t test_register_reports_consumers` | a 0-consumer layer reads `GI_LAYER_UNCONSUMED` |
| SC-5 | The 7 derailment classes settle at $0 | `bun test -t test_derailment_corpus` | 7/7 with their SPECIFIC token, `firesUsed()` unchanged |
| SC-6 | A stale store REFUSES | `bun test -t test_stale_store_refuses` | `GI_LAYER_STALE`, never an answer |
| SC-7 | An out-of-scope query REFUSES | `bun test -t test_scope_mismatch` | `GI_STORE_SCOPE_MISMATCH` |
| SC-8 | The bundle is CURRENT | `stat -c %Y extensions/.../index.js` vs `src/omp/*.ts` | dist newer than source |
| SC-9 | The containers prove it live | the Phase E artifact | 10/10 checks + the negative suite green |
| SC-10 | The register reads `up=11/11` AND `consumed=8/8` | `graph-probe action=register` | both, in one call |

---

# §7 · CONTAINER TEST PLAN (plan-first — the adversarial angles that define DONE)

**Angles selected (context-keyword-matched):** CONFIG (the register), STATE (the stale store), INTEGRATION (the layer→decision edge), BOUNDARY (an empty/absent layer), ERRORS (a layer throws mid-query), AUDIT (the settlement), LIFECYCLE (pre-act vs post-filter).

| # | Angle | The scenario | passToken (tool-result-bound) | failToken | Evidence |
|---|---|---|---|---|---|
| A1 | CONFIG | boot with 11/11 paths, 0 consumers | `"consumed":0` | `"consumed":8` | the register JSON |
| A2 | CONFIG | wire a consumer → re-probe | `"consumed":1` | `"consumed":0` | the register JSON |
| A3 | STATE | query a store older than HEAD | `GI_LAYER_STALE` | `"rows":0` | the tool result |
| A4 | BOUNDARY | query a target absent from the store | `GI_STORE_SCOPE_MISMATCH` | `"rows":0` | the tool result |
| A5 | INTEGRATION | a fire the graph settles $0 | `"settledBy":"graph"` | `"firesUsed":1` | the ledger row |
| A6 | ERRORS | a layer throws mid-query | `GI_LAYER_ERROR:<id>` | `undefined` | the tool result |
| A7 | AUDIT | replay D-2/D-6/D-7/D-5 | `M-GRAPH-1`/`2`/`5`/`4` | a generic refusal | per-fixture token |
| A8 | LIFECYCLE | the pre-act advisory fires | `"advisory":"fired"` | `"advisory":"silent"` | the advisory row |
| A9 | INTEGRATION | TSG judges a change's MEANING | `"meaning":"match"` | `"meaning":"drift"` | the TSG result |
| A10 | INTEGRATION | Abide repairs, never blocks | `"repaired":true` | `"blocked":true` | the Abide result |

**EVIDENCE REQUIREMENT:** every scenario's verdict cites the tool result byte-offset + the artifact path. **PASS THRESHOLD:** all 10 PASS + the negative suite (a wired layer answers with ZERO misfire) green + Phase E 10/10. **★ THE SPECIFIC-ENFORCEMENT RULE:** a generic gate preempting a layer's OWN token = UNOBSERVED, never PASS.

---

# §8 · THE ANTI-PATTERN LEDGER (3 categories, mechanical detections)

## 8.1 · ARCHITECTURAL

| # | The banned structure | The incident | The MECHANICAL detection |
|---|---|---|---|
| AA-1 | **THE REGISTER-WITHOUT-CONSUMERS** | the 6L declared as paths; 0 wired; `up=5/11` while feeding nothing | `bun run scripts/layer-consumption.ts` — any layer with `consumers.length===0` → FAIL |
| AA-2 | **THE FILE-ORGANIZED WAVE** | W1-W9 named files; no wave named the graph-input edge | a wave that names only a FILE and no LAYER-EDGE → the wave-plan gate refuses |
| AA-3 | **THE LIGHT-SWITCH LAYER** | a layer probed for existence, never queried | `grep -rn "GI_LAYER_<id>" src/omp/` — a hit ONLY in hard-deps.ts → FAIL |
| AA-4 | **THE UNCOVERED RULE** | M-GRAPH-4 settled IGNORE on a COUNT (a lower bound) | a rule that settles on `edge-absent`/`edge-count` where the extractor lacks the kind → FAIL |

## 8.2 · BEHAVIORAL

| # | The banned behavior | The incident | The MECHANICAL detection |
|---|---|---|---|
| AB-1 | **THE SILENT ABSENCE** | rows=0 read as "no callers" | a query answering `rows:0` for an out-of-scope target → must be `GI_STORE_SCOPE_MISMATCH` |
| AB-2 | **THE STALE SERVE** | the graph answered about obsolete code | a verdict with `populated_at < HEAD` → must be `GI_LAYER_STALE` |
| AB-3 | **THE MANUFACTURED EVIDENCE** | the extractor emitted `Container → itsOwnMember` (1,320 fake edges) | a self-referencing edge for a declared member → FAIL |
| AB-4 | **THE UNCOMMITTED PROVENANCE** | the corbell checkout wrote the graph, not `gi_meta` → every fact STALE | a store whose `populated_at` is absent → `GI_POPULATE_FAILED` |
| AB-5 | **THE SILENT FALLBACK** | `GI_NO_STORE → ALLOW+warn` | `grep -n "cancel:false" src/omp/` for any missing-substrate path → FAIL |

## 8.3 · PROCESS

| # | The banned process | The incident | The MECHANICAL detection |
|---|---|---|---|
| AP-1 | **THE UNWIRED KERNEL SHIP** | a module tested, called by nothing (12 of 23) | the wiring check: every `src/omp/*.ts` reachable from extension.ts OR allowlisted with a consumer |
| AP-2 | **THE STALE DEPLOY** | the bundle 21-35h behind source | the pre-commit freshness check |
| AP-3 | **THE PROSE CLAIM** | "verified" with no artifact | every claim binds to a sha/test/file:line |
| AP-4 | **THE SELF-MEASUREMENT** | the agent measures its own output as independent | the audit is by an INDEPENDENT model (the ocr chain) |
| AP-5 | **THE CATEGORY ERROR** | the graph treated as a precondition | ★ THE PIN'S OWN TEXT: "the eyes are not a light switch" — a wave with no LAYER-EDGE is refused |

---

# §9 · THE OPEN DECISIONS (each with the evidence + the recommended default)

| # | The fork | The evidence | The recommended default |
|---|---|---|---|
| Q1 | L1/L2/L3/L4 are ABSENT from PATH | `which semantica au-host c2kg` → absent; the MCP server for semantica exists | BUILD the consumers against the INTERFACE; the layer answers `GI_LAYER_UNCONSUMED` until its substrate exists — NEVER a silent pass |
| Q2 | L5 corbell is installed but unused | `~/.local/bin/corbell` exists; `populate-corbell.ts` exists | WIRE L5 FIRST — it is the PRIMARY layer and the only one whose substrate is present |
| Q3 | TSG has no LoadUnit impl | `grep LoadUnit src/omp/enforcement.ts` → the interface only | WIRE the meaning gate against the LoadUnit interface; TSG answers `GI_ENFORCE_TSG` until implemented |
| Q4 | The store is 851/1266 nodes of src/hunter | the scope mismatch | RE-POPULATE from the LIVE tree (W0); exclude Checkpoints/ |
| Q5 | The 30s hook budget vs a full audit | the runner's 1090-1144 | the LEDGER pattern (pre-compute, the gate reads the ledger) |

---

# §10 · THE WAVE PLAN (EVERY WAVE CARRIES ITS LAYER-EDGE — the anti-AA-2 law)

| Wave | The layer-edge (NOT a file) | Files | The gate |
|---|---|---|---|
| **W0** | ★ THE STORE → THE LIVE TREE | populate-graphify.ts · populate-corbell.ts | `oracle.ts` has nodes; Checkpoints/ excluded |
| **W1** | ★ L5 CORBELL → the settlement rung | graph-facts.ts · fire-gate.ts · populate-corbell.ts | `test_consume_corbell` — a corbell fact changes a verdict |
| **W2** | ★ L6 GRAPHIFY → the settlement rung | graph-facts.ts · fire-gate.ts | `test_consume_graphify` |
| **W3** | ★ L4 C2KG → the context rung | a new `c2kg-adapter.ts` · fire-gate.ts | `test_consume_c2kg` (or `GI_LAYER_UNCONSUMED` if absent) |
| **W4** | ★ L3 UA → the context rung | `ua-adapter.ts` · fire-gate.ts | `test_consume_ua` |
| **W5** | ★ L2 ARSUMBRIS → the knowledge rung | `arsumbris-adapter.ts` · fire-gate.ts | `test_consume_arsumbris` |
| **W6** | ★ L1 SEMANTICA → the decision rung | `semantica-adapter.ts` · fire-gate.ts | `test_consume_semantica` (precedent + record) |
| **W7** | ★ TSG → the meaning gate | enforcement.ts · kernel-v2.ts | `test_consume_tsg` |
| **W8** | ★ ABIDE → the repair path | enforcement.ts | `test_consume_abide` |
| **W9** | ★ THE REGISTER REPORTS CONSUMPTION | hard-deps.ts | `test_register_reports_consumers` — 0-consumer → `GI_LAYER_UNCONSUMED` |
| **W10** | THE 7-CLASS CORPUS REPLAY | tests/ | 7/7 settle with their specific token |
| **W11** | THE CONTAINER PROOF | .trident/phaseE.json | 10/10 + the negative suite |
| **W12** | THE SEAL | the package | PACKAGE_AUDIT PASS |

**★ THE WAVE-PLAN GATE (mechanical):** a wave whose "deliverable" names only a FILE and no LAYER-EDGE is REFUSED. **THE EDGE IS THE DELIVERABLE.**

---

# §A · CONTEXT (the evidence base, self-contained)

```
THE BUILD PACKAGE   packages/gi-kernel-v2.1/ (6 specs, 26-44 KB each)
THE ENFORCEMENT PLAN  GRAPH_INTELLIGENCE_ENFORCEMENT_PLAN.md (21 KB) — the build's OWN root-cause
                      statement + P1..P5
THE PRIOR AUDIT      reports/GI_kernel_v21_SIX_ITEM_AUDIT.md (597 L) + the ANTI_PATTERN_CATALOG
                      (399 L) + the 3 autopsies
THE SOURCE           src/omp/ (23 .ts) · src/omp/hard-deps.ts (the register) ·
                     src/omp/fire-gate.ts (the decision) · src/omp/graph-facts.ts (the rung)
THE STORES           corbell checkout · graphify-out/graph.json · the structural layer
THE PROVEN PATH      P4: 0/4 → 3/4 graph-handled, 2 settle FIRE at $0
★ A FRESH AGENT reading only §A knows: the 6L+2E was declared, never wired; the fix is the EDGE.
```

# §B · THE DENSE BUILD PLAN

**The module map:** `layer-registry.ts` (the 8 typed layers, each implementing `GraphLayer`) · `layer-consumption.ts` (the consumer-count probe) · 6 adapters (`corbell/graphify/c2kg/ua/arsumbris/semantica`) · `tsg-adapter.ts` + `abide-adapter.ts` · `graph-facts.ts` (the rung, extended) · `hard-deps.ts` (the register, amended to report consumption).

**The file manifest:**
```
NEW      src/omp/layer-registry.ts (the 8 GraphLayer impls, ~400 L)
NEW      src/omp/layer-consumption.ts (the consumer probe + the decisionsInfluenced counter, ~150 L)
NEW      src/omp/adapters/{corbell,graphify,c2kg,ua,arsumbris,semantica}.ts (6 × ~120 L)
NEW      src/omp/adapters/{tsg,abide}.ts (2 × ~150 L)
EDIT     src/omp/graph-facts.ts (consume the registry, not raw SQL)
EDIT     src/omp/hard-deps.ts (report consumption: GI_LAYER_UNCONSUMED)
EDIT     src/omp/fire-gate.ts (the rung consults layer-registry)
EDIT     src/omp/extension.ts (init: build the registry + the preflight)
NEW      scripts/layer-consumption.ts (the CLI probe)
NEW      tests/st-gi-6l2e.test.ts (the corpus + the consumption)
```

**The wave sketch:** W0 the store → W1-W6 the six layers (parallel, disjoint adapters) → W7-W8 the kernels → W9 the register → W10 the corpus → W11 the container → W12 the seal. **W1-W6 are PARALLEL (disjoint files); W0 gates all of them.**

# §C · THE ANTI-PATTERN LEDGER — see §8 (3 categories, 14 entries, each with a detection).

# §D · THE PRE-WRITTEN SCRIPT TESTS (per the script-test skill)

```
THE HARNESS    tests/harness-6l2e.ts — mkdtempSync the store, build the registry, expectThrow
PER-LAYER ST CONTRACTS (each asserts a SPEC-NAMED token or an OBSERVABLE artifact):
  ST-L1  test_consume_corbell        the corbell fact changed a verdict
  ST-L2  test_consume_graphify       the graphify fact changed a verdict
  ST-L3  test_consume_c2kg           a c2kg fact OR GI_LAYER_UNCONSUMED
  ST-L4  test_consume_ua             a ua fact OR GI_LAYER_UNCONSUMED
  ST-L5  test_consume_arsumbris      an arsumbris fact OR GI_LAYER_UNCONSUMED
  ST-L6  test_consume_semantica      a precedent OR GI_LAYER_UNCONSUMED
  ST-E1  test_consume_tsg            a meaning verdict
  ST-E2  test_consume_abide          a repair, never a block
  ST-R1  test_register_reports_consumers  0 consumers → GI_LAYER_UNCONSUMED
  ST-R2  test_scope_mismatch         an out-of-tree query → GI_STORE_SCOPE_MISMATCH
  ST-R3  test_stale_store_refuses    populated_at < HEAD → GI_LAYER_STALE
  ST-C1  test_derailment_corpus      7/7 settle with their SPECIFIC token
BOTH HALVES (each ST has a positive + a negative); THE RUNNER prints the table + exits nonzero on any FAIL.
★ ANTI-CHEAT: written BEFORE the code; every assertion a spec token or an artifact; mock-detection
  via the integration script.
```

# §E · THE PRE-WRITTEN DEEP CONTAINER TESTS (per the deep-container-testing skill)

**The 12 steps instantiated:** (1) plan-first ✓ this section · (2) preflight ct → READY · (3) setup the omp-ct:master rig + SHA-verify the dist · (4) the AUTH probe FIRST (a model-backed call) · (5) the adversarial discipline (the 10 angles of §7) · (6) the screenshot channel + the exec disk truth · (7) the positive suite (each layer fires its OWN token) · (8) the negative suite (a wired layer answers, zero misfire) · (9) Phase E (the 10 checks) · (10) the artifact `.trident/phaseE.json` · (11) zero-broken-windows (re-run on the combined tree) · (12) the declaration (4 elements).

**The families:** the AUTH family (first) · the LAYER families (L1-L6, each POSITIVE+NEGATIVE) · the KERNEL families (TSG, ABIDE) · the NEGATIVE/happy family (all 8 answer with zero misfire) · the ADVERSARIAL family (injection, bypass, corruption).

**The artifact schema + pass criteria:** (see §7) · Phase E 10/10 · the negative half green · the declaration in the 4-element form.

---

# THE SPEC ILLUSTRATED (the master graph)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ THE 6L+2E, WIRED — every layer an INPUT (not a register entry)           │
└──────────────────────────────────────────────────────────────────────────┘

   THE DECISION (a fire · an edit · a completion claim)
        │
        ▼
   ┌─────────────────────┐     ┌──────────────────────┐     ┌───────────────
   │ L1 SEMANTICA §2.2   │     │ L2 ARSUMBRIS §2.2    │     │ L3 UA (§2.2)  
   │ Decision · precedent│     │ Knowledge · typed KG │     │ Context (.ua) 
   └──────────┬──────────┘     └──────────┬───────────┘     └───────┬───────
              └───────────────┬───────────┴─────────────────────────┘
                              ▼
                  ┌───────────────────────┐
                  │ L4 C2KG §2.2 — LSP    │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │ L5 CORBELL §2.2 (PRIMARY) │
                  └───────────┬───────────┘
                              ▼
                  ┌───────────────────────┐
                  │ L6 GRAPHIFY §2.2      │
                  └───────────┬───────────┘
                              ▼
        ┌───────────────────────────────────────┐
        │ ★ THE SETTLEMENT RUNG (§4) — M-GRAPH-1..6 │
        │   reads the layers → settles $0         │
        └───────────────────┬───────────────────┘
                            ▼
        ┌───────────────────────────────────────┐
        │ ★ THE KERNELS (§2.2)                  │
        │   TSG (the meaning gate) · ABIDE (repair)│
        └───────────────────┬───────────────────┘
                            ▼
                    THE VERDICT (§6 SC-1..10)
```

# THE SCRIPT TESTING SUITE — see §D. # THE DEEP CONTAINER TESTING SUITE — see §E.
