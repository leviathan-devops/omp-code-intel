# THE 6L+2E — THE PLAN AND THE BLUEPRINT
## What will be built, how it is forced correct, why 3 days cannot be wasted

**Baseline:** `jarvis/gi-main` @ `fdf90b1` · dist `83eb7bba9c5e76db` · 99 .ts / 25,928 L · 31 test files
**Scope: 6 graph layers + 2 Jev kernels. 8/8. NO SHRINK.**

---

# 1 · THE PLAN — the whole build on one page

```
                    THE DECISION
        (a fire · an edit · a completion claim)
                          │
                          ▼
```
   ┌──────────────────────────────────────────────────────┐
   │ L1 SEMANTICA — decision  ("what we decided")         │
   ├──────────────────────────────────────────────────────┤
   │ L2 ARSUMBRIS — knowledge (the typed KG)              │
   ├──────────────────────────────────────────────────────┤
   │ L3 UA        — context   (the .ua knowledge graph)   │
   ├──────────────────────────────────────────────────────┤
   │ L4 C2KG      — code ctx  (the LSP index)             │
   ├──────────────────────────────────────────────────────┤
   │ L5 CORBELL   — macro     (PRIMARY · INSTALLED)       │
   ├──────────────────────────────────────────────────────┤
   │ L6 GRAPHIFY  — micro     (the graph.json leg)        │
   └──────────────────────────────────────────────────────┘
```
   └──────────────────────────┬───────────────────────────┘
                              │ a FACT per layer (never a
                              │ registration; never rows=0)
                              ▼
```
   ┌──────────────────────────────────────────────────────┐
   │ ★ THE SETTLEMENT RUNG (graph-facts.ts · M-GRAPH-1..6 │
   │ settles at $0 — BEFORE the model is consulted        │
   └──────────────────────────────────────────────────────┘
```
   └──────────────────────────┬───────────────────────────┘
                              │
                              ▼
```
   ┌──────────────────────────────────────────────────────┐
   │ TSG (the meaning gate) · ABIDE (the repair path)     │
   │ both Jev-powered · both LOUD on absence              │
   └──────────────────────────────────────────────────────┘
```
   └──────────────────────────┬───────────────────────────┘
                              │
                              ▼
                 THE VERDICT (FIRE / ESCALATE / IGNORE)

```
**★ THE ONE LINE THAT MAKES IT WORK: A LAYER IS "UP" IFF ITS FACT CHANGED A VERDICT.**

```
the OLD register:  probe(path exists?) → up ? "ready" : "down"     ← A LIGHT SWITCH
the NEW register:  decision → query(layer) → a FACT → the verdict   ← AN EYE
★ up=11/11 becomes worthless.  consumed:8 is the ONLY green.

```
---

# 2 · THE BLUEPRINT — what the code becomes

## 2.1 · The module map (new + edited)

```
src/omp/
├── layer-registry.ts       NEW  ~400 L  the 8 GraphLayer impls
├── layer-consumption.ts    NEW  ~150 L  the consumer probe
├── adapters/
│   ├── corbell.ts          NEW  ~120 L  L5 → LayerFact
│   ├── graphify.ts         NEW  ~120 L  L6 → LayerFact
│   ├── c2kg.ts             NEW  ~120 L  L4 → LayerFact
│   ├── ua.ts               NEW  ~120 L  L3 → LayerFact
│   ├── arsumbris.ts        NEW  ~120 L  L2 → LayerFact
│   ├── semantica.ts        NEW  ~120 L  L1 → LayerFact
│   ├── tsg.ts              NEW  ~150 L  TSG → the meaning verdict
│   └── abide.ts            NEW  ~150 L  ABIDE → the repair
├── graph-facts.ts          EDIT  consume the registry, not SQL
├── hard-deps.ts            EDIT  report CONSUMPTION
├── fire-gate.ts            EDIT  the rung consults the registry
└── extension.ts            EDIT  init: the registry + the preflight
scripts/layer-consumption.ts NEW ~80 L  the CLI probe
tests/st-gi-6l2e.ts          NEW        the corpus + the consumption

```
## 2.2 · The interfaces (the contracts consumers build against)

┌──────────────────────────────────────────────────────────────────┐
│ interface GraphLayer                                             │
├──────────────────────────────────────────────────────────────────┤
│ id            : 'L1_SEMANTICA' | 'L6_GRAPHIFY'                   │
│ kind          : decision|knowledge|context|code|macro|micro      │
│ probe()       : LayerHealth  ← EXISTS + FRESH + CONSUMED         │
│ query(q)      : LayerFact|null ← THE INPUT · null = cannot answe │
│ coveredKinds  : NodeKind[]   ← what it CAN answer (no silence)   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ interface LayerFact                                              │
├──────────────────────────────────────────────────────────────────┤
│ layer · fact (node-exists|node-absent|edge-count|stale)          │
│ subject · value · provenance{populated_at, source}               │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ★ interface LayerConsumption — THE ANTI-REGISTER LAW             │
├──────────────────────────────────────────────────────────────────┤
│ layer                : LayerId                                   │
│ consumers            : string[]  ← EVERY call site · NON-EMPTY   │
│ decisionsInfluenced  : number    ← the verdicts it CHANGED       │
└──────────────────────────────────────────────────────────────────┘
   a layer is VALID iff consumers.length >= 1 AND decisionsInfluenced >= 1
   else → GI_LAYER_UNCONSUMED (a LOUD down, never "up")

## 2.3 · The layer query (pseudocode)

```
QUERY A LAYER → A FACT (never a registration, never a silent zero)
  inputs:  layerId, subject
  outputs: LayerFact | GI_LAYER_UNCONSUMED | GI_LAYER_STALE | GI_STORE_SCOPE_MISMATCH
  ──────────────────────────────────────────────────────────────
  layer = registry.get(layerId)
  if layer is null:              return GI_LAYER_UNCONSUMED:layerId
  if layer.consumers is empty:   return GI_LAYER_UNCONSUMED:layerId
  if layer.populatedAt < HEAD:   return GI_LAYER_STALE:age
  if subject not in layer.roots: return GI_STORE_SCOPE_MISMATCH:subject
  fact = layer.query(subject)
  if fact is null:               return null   ← cannot answer (never rows=0)
  layer.decisionsInfluenced += 1               ← ONLY when a verdict changed
  return fact

```
---

# 3 · THE WAVE SEQUENCE — what fires when

```
   T0 ─────────────► A-0  the STORE → THE LIVE TREE  (gates everything)
                      │  + the REGISTRY INTERFACE frozen
                      ▼
   T1 ─────────────► ★ 9 WAVES IN PARALLEL
                      │
     ┌──────────────┼──────────────┬──────────────┐
     ▼              ▼              ▼              ▼
  B-1 L5 CORBELL  B-2 L6 GRAPHIFY  B-3 L4 C2KG  B-4 L3 UA
  B-5 L2 ARSUMB   B-6 L1 SEMANTICA  C-1 TSG      C-2 ABIDE
  D-1 the REGISTER reports CONSUMPTION
                      │
                      ▼
   T2 ────────────► D-2 the DECISION consults the REGISTRY  (serial)
                      │
                      ▼
   T3 ────────────► E-1 corpus · E-2 container · E-3 seal

```
┌──────────────────────────────────────────────────────────────┐
│ wave  the LAYER-EDGE (never a file)          the gate        │
├──────────────────────────────────────────────────────────────┤
│ A-0   the STORE → the LIVE TREE               oracle.ts has  │
│ B-1   L5 CORBELL → the settlement rung        a fact flips a │
│ B-2   L6 GRAPHIFY → the settlement rung       a fact flips a │
│ B-3   L4 C2KG → the context rung              a fact OR UNCO │
│ B-4   L3 UA → the context rung                a fact OR UNCO │
│ B-5   L2 ARSUMBRIS → the knowledge rung       a fact OR UNCO │
│ B-6   L1 SEMANTICA → the decision rung        a precedent OR │
│ C-1   TSG → the meaning gate                  a meaning verd │
│ C-2   ABIDE → the repair path                 a repair, neve │
│ D-1   the REGISTER reports CONSUMPTION        0 consumers →  │
│ D-2   the DECISION consults REGISTRY          the rung reads │
│ E-1   the 7-class corpus replay               7/7 specific t │
│ E-2   the CONTAINER proof                     14/14 + negati │
│ E-3   the SEAL                                PACKAGE_AUDIT  │
└──────────────────────────────────────────────────────────────┘
★ A WAVE NAMING ONLY A FILE IS REFUSED BY THE WAVE-PLAN GATE.

---

# 4 · THE ANTI-PATTERNS — 14 classes + 40 detectors

## 4.1 · The three categories

┌──────────────────────────────────────────────────────────────────────┐
│ ARCHITECTURAL — the banned structures                                │
├──────────────────────────────────────────────────────────────────────┤
│ AA-1 THE REGISTER-WITHOUT-CONSUMERS                                  │
│   the 6L declared as paths · 0 wired · up=5/11 feeding nothing       │
│   DETECT: layer-consumption.ts -> 0 consumers -> FAIL                │
│ AA-2 THE FILE-ORGANIZED WAVE                                         │
│   W1-W9 named files · no wave named the graph-input edge             │
│   DETECT: the wave-plan gate -> no LAYER-EDGE -> REFUSED             │
│ AA-3 THE LIGHT-SWITCH LAYER                                          │
│   a layer probed for existence, never queried                        │
│   DETECT: a GI_LAYER_ id ONLY in hard-deps.ts -> FAIL                │
│ AA-4 THE UNCOVERED RULE                                              │
│   M-GRAPH-4 settled IGNORE on a COUNT (a lower bound)                │
│   DETECT: a rule settling where the extractor lacks the kind         │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ BEHAVIORAL — the banned runtime behaviors                            │
├──────────────────────────────────────────────────────────────────────┤
│ AB-1 THE SILENT ABSENCE   rows=0 read as "no callers"                │
│   DETECT: out-of-scope -> must be GI_STORE_SCOPE_MISMATCH            │
│ AB-2 THE STALE SERVE      the graph answered about obsolete code     │
│   DETECT: populated_at < HEAD -> must be GI_LAYER_STALE              │
│ AB-3 THE MANUFACTURED EVIDENCE  Container -> itsOwnMember            │
│   DETECT: a self-edge for a declared member -> FAIL                  │
│ AB-4 THE UNCOMMITTED PROVENANCE  the graph wrote, gi_meta did not    │
│   DETECT: populated_at absent -> GI_POPULATE_FAILED                  │
│ AB-5 THE SILENT FALLBACK  GI_NO_STORE -> ALLOW+warn                  │
│   DETECT: grep "cancel:false" on a missing substrate -> FAIL         │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ PROCESS — the banned actions                                         │
├──────────────────────────────────────────────────────────────────────┤
│ AP-1 THE UNWIRED KERNEL SHIP   12 of 23 modules called by nothing    │
│ AP-2 THE STALE DEPLOY          the bundle 30h behind source          │
│ AP-3 THE PROSE CLAIM           "verified" with no artifact           │
│ AP-4 THE SELF-MEASUREMENT      the agent audits its own output       │
│ AP-5 THE CATEGORY ERROR        the graph treated as a precondition   │
│   ★ THE PIN: "the eyes are not a light switch"                       │
└──────────────────────────────────────────────────────────────────────┘

## 4.2 · The 40 auto-reject detectors

```
CLASS                     THE DETECTOR                            REJECT
──────────────────────────────────────────────────────────────────────
PHANTOM (AR-01..05)       git diff --name-only -> empty          KICK BACK
THEATRICAL TEST (06..13)  the fixture markers · the mutation     FAIL
CIRCULAR TOKEN (14..17)   the token must follow a tool boundary  FAIL
UNWIRED (18..23)          layer-consumption · the import graph   UNCONSUMED
STALE/SUBSTRATE (24..30)  the file distribution · mtime          SCOPE_MISMATCH
FALLBACK (31..35)         grep cancel:false · the empty catches  FAIL
CLAIM/DOC (36..40)        the artifact check · wc -l · the SHA   FAIL
★ ONE COMMAND: bash scripts/anti-theatrical-firewall.sh -> exit nonzero = FAIL.

```
## 4.3 · The escalation ladder

```
   VIOLATION 1 ──► the wave FAILS · the desk kicked, detector NAMED
   VIOLATION 2 ──► the wave FAILS · the desk REASSIGNED to a fresh subagent
   VIOLATION 3 ──► ★ THE DESK IS RETIRED · the orchestrator builds it ITSELF
   NEVER: a retry-as-erasure · "the fix landed" without the re-run

```
---

# 5 · THE AUDIT GATES — how 3 days cannot be wasted

## 5.1 · The 6 gates a claim passes through

```
   the subagent writes code
          │
          ▼
```
   ┌──────────────────────────────────────────────────────────────────┐
   │ GATE 1 PRE-COMMIT  W-1 deploy · W-6 src-string · W-9 docs · W-11 │
   │ W-12 names · W-13 fallbacks · the battery · tsc -> exit 1        │
   └──────────────────────────────────────────────────────────────────┘
```
          ▼
```
   ┌──────────────────────────────────────────────────────────────────┐
   │ GATE 2 COMMIT-MSG  W-8 claim-evidence + the semantic prefix -> e │
   └──────────────────────────────────────────────────────────────────┘
```
          ▼
```
   ┌──────────────────────────────────────────────────────────────────┐
   │ GATE 3 PRE-PUSH    W-3 scope · W-2 wiring · W-14 call-site -> ex │
   └──────────────────────────────────────────────────────────────────┘
```
          ▼
```
   ┌──────────────────────────────────────────────────────────────────┐
   │ GATE 4 PR  ★ REMOTE · NOT bypassable                             │
   │ W-4 test-reality · W-5 mutation · W-10 live-firing ·             │
   │ W-7 AUDIT GATE (the 8-rung chain) -> CANNOT MERGE                │
   └──────────────────────────────────────────────────────────────────┘
```
          ▼
```
   ┌──────────────────────────────────────────────────────────────────┐
   │ GATE 5 ALIGNMENT   W-15 spec-wave drift · W-16 semantica -> FLAG │
   └──────────────────────────────────────────────────────────────────┘
```
          ▼
```
   ┌──────────────────────────────────────────────────────────────────┐
   │ GATE 6 MEANING     W-17 TSG: does the diff MEAN the wave? -> exi │
   └──────────────────────────────────────────────────────────────────┘

## 5.2 · The per-wave audit loop (the orchestrator, mechanical)

```
   1 DISPATCH   task action=generate (the E1 template + the CONTRACT)
   2 POLL       trident-wave-read — the ONLY liveness truth
                  stream -> working · idle -> kick · complete -> AUDIT
   3 AUDIT      a THE STREAM GATE   the return intact (no truncation)
                b THE PHANTOM CHECK  sha256 before/after — a change MUST exist
                c THE PER-HUNK       every hunk exists on disk
                d THE MECHANICAL     I run tsc + the battery + the casts MYSELF
                e THE FIREWALL       the 40 detectors -> exit 0?
                f THE ADVERSARIAL    the black-hat corpus
   4 VERDICT    CORRECT|FLAWED|FITTED-TO-GOLDEN|FABRICATION|VIOLATION|CREEP
   5 CLOSE      the ledger row + the canon/ship docs
★ A WAVE CLOSES ONLY ON MY VERIFIED VERDICT. A subagent return closes NOTHING.

```
## 5.3 · Why the last 3 days were wasted — and these will not be

┌──────────────────────────────────────────────────────────────────────┐
│ THE WASTE, MEASURED (the last build)                                 │
├──────────────────────────────────────────────────────────────────────┤
│ 7 audit passes · ~90 findings · the SAME classes recurring           │
│ 29 docs commits vs 11 feat · 3,316 doc lines for 8,596 code          │
│ 12 of 23 modules unreachable · the gate fired ONCE in 40,631 lines   │
│ ★ THE ROOT: the only structural detector was a MODEL PAID PER FILE   │
│   — because the graph returned rows=0 and was never wired.           │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ THE FIX (what changes the arithmetic)                                │
├──────────────────────────────────────────────────────────────────────┤
│ the graph answers in ~60ms what a model answers in minutes per file  │
│ a layer not consumed reads GI_LAYER_UNCONSUMED — a LOUD fail         │
│ the corpus REPLAYS the 7 derailments; each settles with its token    │
│ the audit is INDEPENDENT (the ocr chain); the ledger is its input    │
│ ★ THE MEASURE: the audit structural-finding rate DROPS because the   │
│   structural defects never land — the pre-act rung catches them at $ │
└──────────────────────────────────────────────────────────────────────┘

---

# 6 · THE OPEN DECISIONS

┌────────────────────────────────────────────────────────────────────┐
│ #  the fork                        the evidence          the defau │
├────────────────────────────────────────────────────────────────────┤
│ Q1 L1/L2/L3/L4 absent from PATH   which -> absent       build to t │
│                                   semantica MCP exists  INTERFACE  │
│ Q2 L5 corbell installed, unused   ~/.local/bin/corbell WIRE L5 FIR │
│ Q3 TSG has no LoadUnit impl       the interface only    wire vs if │
│ Q4 the store = 851/1266 hunter    the scope mismatch    RE-POPULAT │
│ Q5 30s hook budget vs the audit   runner.ts:1090-1144   the LEDGER │
└────────────────────────────────────────────────────────────────────┘

# 7 · THE SELF-CHECK

```
mode applied        PLAN + BLUEPRINT (never printed as a label)
ingredients loaded  show-me · ascii-diagrams (+ graph/visualize/simulator)
visuals             ruler-passed · every box <= 76 · borders aligned
claims anchored     hard-deps.ts:335-367 · 06-WAVES.md · fire-gate.ts · counts
open items          Q1-Q5 (each with a default) · the 12 unwired modules
★ THE HANDOFF      L2/L3 = trident-deep-planning.
```