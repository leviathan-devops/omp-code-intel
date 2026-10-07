# THE 6L+2E — THE PLAN AND THE BLUEPRINT
## What gets built, how it is forced correct, why 3 days cannot be wasted again

**Baseline:** `jarvis/gi-main` @ `fdf90b1` · dist `83eb7bba9c5e76db` · 99 .ts / 25,928 L · 31 test files
**Scope: 6 graph layers + 2 Jev kernels. 8/8. NO SHRINK.**
**Companions:** `packages/gi-kernel-6l2e/` · `packages/gi-kernel-v2.1/GI_KERNEL_6L2E_DPL1_SPEC.md` · `.trident/plan-6l2e/wave-plan.md`

---

# 1 · THE PLAN — the whole build on one page

```
                    THE DECISION
        (a fire · an edit · a completion claim)
                          │
                          ▼
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
   └──────────────────────────┬───────────────────────────┘
                              │ a FACT per layer (never a
                              │ registration; never rows=0)
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │ ★ THE SETTLEMENT RUNG — graph-facts.ts M-GRAPH-1..6  │
   │ settles at $0 — BEFORE the model is consulted        │
   └──────────────────────────┬───────────────────────────┘
                              │
                              ▼
   ┌──────────────────────────────────────────────────────┐
   │ TSG (the meaning gate) · ABIDE (the repair path)     │
   │ both Jev-powered · both LOUD on absence              │
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

```
┌──────────────────────────────────────────────────────────────────┐
│ interface GraphLayer                                             │
├──────────────────────────────────────────────────────────────────┤
│ id            : 'L1_SEMANTICA' | 'L6_GRAPHIFY'                   │
│ kind          : decision|knowledge|context|code|macro|micro      │
│ probe()       : LayerHealth  ← EXISTS + FRESH + CONSUMED         │
│ query(q)      : LayerFact|null ← THE INPUT · null = cannot answer│
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
```

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
     ┌──────────────┬──────────────┬──────────────┐
     ▼              ▼              ▼              ▼
  B-1 L5 CORBELL  B-2 L6 GRAPH   B-3 L4 C2KG    B-4 L3 UA
  B-5 L2 ARSUMB   B-6 L1 SEMAN   C-1 TSG        C-2 ABIDE
  D-1 the REGISTER reports CONSUMPTION
                      │
                      ▼
   T2 ─────────────► D-2  the DECISION consults the REGISTRY (serial)
                      │
                      ▼
   T3 ─────────────► E-1 corpus · E-2 container · E-3 seal
```

| wave | the LAYER-EDGE (never a file) | the gate | the test id |
|---|---|---|---|
| A-0 | the STORE → the LIVE TREE | oracle.ts has nodes | `test_store_scope_live` |
| B-1 | L5 CORBELL → the settlement rung | a fact flips a fire | `test_consume_corbell` |
| B-2 | L6 GRAPHIFY → the settlement rung | a fact flips a fire | `test_consume_graphify` |
| B-3 | L4 C2KG → the context rung | a fact OR UNCONSUMED | `test_consume_c2kg` |
| B-4 | L3 UA → the context rung | a fact OR UNCONSUMED | `test_consume_ua` |
| B-5 | L2 ARSUMBRIS → the knowledge rung | a fact OR UNCONSUMED | `test_consume_arsumbris` |
| B-6 | L1 SEMANTICA → the decision rung | a precedent OR UNCONSUMED | `test_consume_semantica` |
| C-1 | TSG → the meaning gate | a meaning verdict | `test_consume_tsg` |
| C-2 | ABIDE → the repair path | a repair, never a block | `test_consume_abide` |
| D-1 | the REGISTER reports CONSUMPTION | 0 consumers → UNCONSUMED | `test_register_reports_consumers` |
| D-2 | the DECISION consults the REGISTRY | the rung reads the registry | `test_decision_consults_registry` |
| E-1 | the 7-class corpus replay | 7/7 specific tokens | `test_derailment_corpus` |
| E-2 | the CONTAINER proof | 14/14 + the negative suite | `test_container_14of14` |
| E-3 | the SEAL | PACKAGE_AUDIT PASS | `test_package_audit` |

**★ A WAVE NAMING ONLY A FILE IS REFUSED BY THE WAVE-PLAN GATE.**

---

# 4 · THE ANTI-PATTERNS — 14 classes, each with a mechanical detector

## 4.1 · ARCHITECTURAL (the banned structures)

```
┌──────────────────────────────────────────────────────────────────┐
│ AA-1 THE REGISTER-WITHOUT-CONSUMERS                              │
│   the 6L declared as paths · 0 wired · up=5/11 feeding nothing   │
│   DETECT: layer-consumption.ts -> 0 consumers -> FAIL            │
├──────────────────────────────────────────────────────────────────┤
│ AA-2 THE FILE-ORGANIZED WAVE                                     │
│   W1-W9 named files · no wave named the graph-input edge         │
│   DETECT: the wave-plan gate -> no LAYER-EDGE -> REFUSED         │
├──────────────────────────────────────────────────────────────────┤
│ AA-3 THE LIGHT-SWITCH LAYER                                      │
│   a layer probed for existence, never queried                    │
│   DETECT: a GI_LAYER_ id ONLY in hard-deps.ts -> FAIL            │
├──────────────────────────────────────────────────────────────────┤
│ AA-4 THE UNCOVERED RULE                                          │
│   M-GRAPH-4 settled IGNORE on a COUNT (a lower bound)            │
│   DETECT: a rule settling where the extractor lacks the kind     │
└──────────────────────────────────────────────────────────────────┘
```

## 4.2 · BEHAVIORAL (the banned runtime behaviors)

```
┌──────────────────────────────────────────────────────────────────┐
│ AB-1 THE SILENT ABSENCE   rows=0 read as "no callers"            │
│   DETECT: out-of-scope -> must be GI_STORE_SCOPE_MISMATCH        │
├──────────────────────────────────────────────────────────────────┤
│ AB-2 THE STALE SERVE      the graph answered about obsolete code │
│   DETECT: populated_at < HEAD -> must be GI_LAYER_STALE          │
├──────────────────────────────────────────────────────────────────┤
│ AB-3 THE MANUFACTURED EVIDENCE  Container -> itsOwnMember        │
│   DETECT: a self-edge for a declared member -> FAIL              │
├──────────────────────────────────────────────────────────────────┤
│ AB-4 THE UNCOMMITTED PROVENANCE  the graph wrote, gi_meta did not│
│   DETECT: populated_at absent -> GI_POPULATE_FAILED              │
├──────────────────────────────────────────────────────────────────┤
│ AB-5 THE SILENT FALLBACK  GI_NO_STORE -> ALLOW+warn              │
│   DETECT: grep "cancel:false" on a missing substrate -> FAIL     │
└──────────────────────────────────────────────────────────────────┘
```

## 4.3 · PROCESS (the banned actions)

```
┌──────────────────────────────────────────────────────────────────┐
│ AP-1 THE UNWIRED KERNEL SHIP   12 of 23 modules called by nothing│
│ AP-2 THE STALE DEPLOY          the bundle 30h behind source      │
│ AP-3 THE PROSE CLAIM           "verified" with no artifact       │
│ AP-4 THE SELF-MEASUREMENT      the agent audits its own output   │
│ AP-5 THE CATEGORY ERROR        the graph treated as a precondition│
│   ★ THE PIN: "the eyes are not a light switch"                   │
└──────────────────────────────────────────────────────────────────┘
```

---

# 5 · THE AUDIT GATES — how 3 days cannot be wasted

## 5.1 · The 6 gates a claim passes through

```
   the subagent writes code
          │
          ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ GATE 1 PRE-COMMIT  W-1 deploy · W-6 src-string · W-9 docs    │
   │ W-11 guard · W-12 names · W-13 fallbacks · tsc -> exit 1     │
   └──────────────────────────┬───────────────────────────────────┘
                              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ GATE 2 COMMIT-MSG  W-8 claim-evidence + the prefix -> exit 1 │
   └──────────────────────────┬───────────────────────────────────┘
                              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ GATE 3 PRE-PUSH    W-3 scope · W-2 wiring · W-14 -> exit 1   │
   └──────────────────────────┬───────────────────────────────────┘
                              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ GATE 4 PR  ★ REMOTE · NOT bypassable                         │
   │ W-4 test-reality · W-5 mutation · W-10 live-firing ·         │
   │ W-7 AUDIT GATE (the 8-rung chain) -> CANNOT MERGE            │
   └──────────────────────────┬───────────────────────────────────┘
                              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ GATE 5 ALIGNMENT   W-15 spec-wave · W-16 semantica -> FLAG   │
   └──────────────────────────┬───────────────────────────────────┘
                              ▼
   ┌──────────────────────────────────────────────────────────────┐
   │ GATE 6 MEANING     W-17 TSG: does the diff MEAN it? -> exit 1│
   └──────────────────────────────────────────────────────────────┘
```

## 5.2 · The per-wave audit loop (the orchestrator, mechanical)

```
   1 DISPATCH   task action=generate (the E1 template + the CONTRACT)
   2 POLL       trident-wave-read — the ONLY liveness truth
                  stream -> working · idle -> kick · complete -> AUDIT
   3 AUDIT      a THE STREAM GATE   the return intact (no truncation)
                b THE PHANTOM CHECK  sha256 before/after — a change MUST exist
                c THE PER-HUNK       every hunk exists on disk
                d THE MECHANICAL     I run tsc + the battery + casts MYSELF
                e THE FIREWALL       the 40 detectors -> exit 0?
                f THE ADVERSARIAL    the black-hat corpus
   4 VERDICT    CORRECT|FLAWED|FITTED-TO-GOLDEN|FABRICATION|VIOLATION|CREEP
   5 CLOSE      the ledger row + the canon/ship docs
★ A WAVE CLOSES ONLY ON MY VERIFIED VERDICT. A subagent return closes NOTHING.
```

## 5.3 · Why the last 3 days were wasted — and these will not be

```
┌──────────────────────────────────────────────────────────────────┐
│ THE WASTE, MEASURED (the last build)                             │
├──────────────────────────────────────────────────────────────────┤
│ 7 audit passes · ~90 findings · the SAME classes recurring       │
│ 29 docs commits vs 11 feat · 3,316 doc lines for 8,596 code      │
│ 12 of 23 modules unreachable · the gate fired ONCE in 40,631 lines│
│ ★ THE ROOT: the only structural detector was a MODEL PAID PER FILE│
│   — because the graph returned rows=0 and was never wired.       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ THE FIX (what changes the arithmetic)                            │
├──────────────────────────────────────────────────────────────────┤
│ the graph answers in ~60ms what a model answers in minutes/file  │
│ a layer not consumed reads GI_LAYER_UNCONSUMED — a LOUD fail     │
│ the corpus REPLAYS the 7 derailments; each settles with its token│
│ the audit is INDEPENDENT (the ocr chain); the ledger is its input│
│ ★ THE MEASURE: the audit's structural-finding rate DROPS because │
│   the structural defects never land — the pre-act rung kills them│
└──────────────────────────────────────────────────────────────────┘
```

---

# 6 · THE OPEN DECISIONS

| # | the fork | the evidence | the default |
|---|---|---|---|
| Q1 | L1/L2/L3/L4 absent from PATH | `which` → absent; the semantica MCP exists | build to the INTERFACE; UNCONSUMED |
| Q2 | L5 corbell installed, unused | `~/.local/bin/corbell` | WIRE L5 FIRST |
| Q3 | TSG has no LoadUnit impl | the interface only | wire against the interface |
| Q4 | the store = 851/1266 nodes of `src/hunter` | the scope mismatch | RE-POPULATE from the live tree |
| Q5 | 30s hook budget vs a full audit | `runner.ts:1090-1144` | the LEDGER pattern |

---

# 7 · THE TESTING SUITE (what proves it — the exact tests)

## 7.1 · The per-layer ST contracts (POSITIVE + NEGATIVE per layer)

| ST id | POSITIVE (fires its token) | NEGATIVE (zero misfire) |
|---|---|---|
| `test_consume_corbell` | a corbell caller fact flips a fire → `settledBy:"graph"` | a covered query answers |
| `test_consume_graphify` | a graphify edge flips a fire | a covered query answers |
| `test_consume_c2kg` | a c2kg fact OR `GI_LAYER_UNCONSUMED` | — |
| `test_consume_ua` | a UA fact OR `GI_LAYER_UNCONSUMED` | — |
| `test_consume_arsumbris` | a KG fact OR `GI_LAYER_UNCONSUMED` | — |
| `test_consume_semantica` | a precedent OR `GI_LAYER_UNCONSUMED` | — |
| `test_consume_tsg` | `"meaning":"match"` or `"drift"` | a matching change → match |
| `test_consume_abide` | `"repaired":true` (never `blocked`) | a healthy change → no repair |
| `test_register_reports_consumers` | 0 consumers → `GI_LAYER_UNCONSUMED` | 8 consumers → `"consumed":8` |
| `test_scope_mismatch` | out-of-tree → `GI_STORE_SCOPE_MISMATCH` | in-tree → real rows |
| `test_stale_store_refuses` | `populated_at < HEAD` → `GI_LAYER_STALE` | fresh → an answer |
| `test_derailment_corpus` | 7/7 settle with their SPECIFIC token | `firesUsed()` unchanged |

**The harness (verbatim):** `tests/harness-6l2e.ts` — `withSandbox` (mkdtempSync + a scope-owned finalizer), `loadRegistry` (imports the DEPLOYED artifact), `runConsumptionProbe`, `report` (the PASS/FAIL table + the exit-code verdict).

**The runner:** `bun run tests/st-gi-6l2e.ts` — ONE `runPromise` at the bottom edge; the EXIT CODE is the verdict. Selectors: `bun test -t test_consume_corbell`.

## 7.2 · The container scenarios (14, tool-result-bound tokens)

| # | angle | passToken (in a TOOL RESULT) | failToken |
|---|---|---|---|
| C1 | AUTH (FIRST) | `PROBE_TOOL_OK` | a 401 |
| C2 | L5 CORBELL | `"layer":"L5_CORBELL"` | `"rows":0` |
| C3 | L6 GRAPHIFY | `"layer":"L6_GRAPHIFY"` | `NO NODE` |
| C4 | L4 C2KG | `"layer":"L4_C2KG"` OR `GI_LAYER_UNCONSUMED` | `"rows":0` |
| C5 | L3 UA | `"layer":"L3_UA"` OR `GI_LAYER_UNCONSUMED` | `"rows":0` |
| C6 | L2 ARSUMBRIS | `"layer":"L2_ARSUMBRIS"` OR `GI_LAYER_UNCONSUMED` | `"rows":0` |
| C7 | L1 SEMANTICA | `"layer":"L1_SEMANTICA"` OR `GI_LAYER_UNCONSUMED` | `"rows":0` |
| C8 | TSG | `"meaning":"match"` / `"drift"` | silent absence |
| C9 | ABIDE | `"repaired":true` | `"blocked":true` |
| C10 | ★ CONSUMPTION | `"consumed":8` | `"consumed":0` |
| C11 | STATE | `GI_LAYER_STALE` | `"rows":0` |
| C12 | BOUNDARY | `GI_STORE_SCOPE_MISMATCH` | `"rows":0` |
| C13 | ★ INTEGRATION | `"settledBy":"graph"` | `"firesUsed":1` |
| C14 | ★ NEGATIVE | `"consumed":8` + 8 real answers | any false UNCONSUMED |

**★ THE SPECIFIC-ENFORCEMENT RULE:** a generic gate preempting a layer's OWN token = UNOBSERVED, never PASS.

## 7.3 · The black-hat corpus (12 attacks + 8 legit cases)

```
POSITIVE (must fire its SPECIFIC token):
  P1 a wrong-tree store → GI_STORE_SCOPE_MISMATCH
  P2 a store older than HEAD → GI_LAYER_STALE
  P3 a 0-consumer layer → GI_LAYER_UNCONSUMED
  P4 a count-settled rule → M-GRAPH-4 ESCALATE, never IGNORE
  P5 the extractor's self-edge → REFUSED
  P6 a store with no gi_meta → GI_POPULATE_FAILED
  P7 a callee fixed, the caller unchanged → the call-site REJECT
  P8 a module imported by nothing → GI_UNWIRED_MODULE
  P9 a goal(complete) with no AUDIT GATE: PASS → block:true
  P10 GI_NO_STORE → cancel:true, never ALLOW
  P11 a source-string assertion → the REJECT
  P12 a passToken in prose → CIRCULAR = FAIL

NEGATIVE (must NOT fire — the zero-misfire mandate):
  N1 an in-tree query answers · N2 a fresh store answers
  N3 all 8 consumed → "consumed":8 · N4 a legit edit → no drift block
  N5 a positive-fact rule settles at $0 · N6 a real completion WITH PASS → completes
  N7 a live-imported module → no GI_UNWIRED_MODULE · N8 committed provenance → OK
★ A SUITE THAT FIRES EVERY ATTACK BUT NEVER PROVES THE LEGIT PATH IS HALF A SUITE.
```

## 7.4 · The host-live loop (the meta-observation)

```
H1 START      the real extension loaded; name the bundle + its mtime
H2 OPERATE    first person, numbered: OP-n | I DID | I EXPECTED | IT DID
H3 THE BUGS   every break is the deliverable (op#, expected, actual VERBATIM, fix)
H4 PUSH       8 layers at once · kill mid-query · starve it · hostile input · wrong-tree
H5 FIX IN PLACE  the retest = the NEXT numbered op on the SAME battered instance
H6 THE LEDGER what RUNNING taught that READING could not
H7 CLOSE      only when nothing unexperienced remains AND the residual is NAMED
★ ZERO BUGS IS A RED FLAG. THE SECOND OPERATOR: a zero-context subagent, docs only.
```

---

# 8 · THE 40 AUTO-REJECT DETECTORS (the firewall, expanded)

## 8.1 · PHANTOM (the work that does not exist)

```
AR-01  a claimed change, the file unchanged      git diff --name-only -> empty
AR-02  a claimed test run, no output             ls .trident/*.json -> absent
AR-03  a claimed container PASS, no artifact     test -f .trident/ct-6l2e-results.json
AR-04  a claimed sha, unverifiable               sha256sum != the claim
AR-05  a claimed line count, not wc -l           wc -l != the claim
```

## 8.2 · THEATRICAL TEST

```
AR-06  a fixture-substitute suite                grep -l "mkdtemp|stubJudge|aFire()" tests/
AR-07  a test that never imports the artifact    grep -L "layer-registry" tests/
AR-08  a source-string assertion as wiring       grep -nE '\.includes\("Sym"\)' tests/
AR-09  a test that cannot fail                   the mutation must go RED
AR-10  a test that ENCODES the defect            a fix FAILS the test -> the TEST is suspect
AR-11  a test named for a proof it does not do   the body vs the name
AR-12  an inflated count (N from N firings)      the assertion vs the resolutions
AR-13  a stub tested under an alias              grep -n "alias" src/omp/extension.ts
```

## 8.3 · CIRCULAR TOKEN

```
AR-14  a passToken in the agent's prose          the token must follow a tool boundary
AR-15  a passToken the agent could type          it must be a structured artifact field
AR-16  a generic gate preempting the specific    the SPECIFIC token must fire
AR-17  structural-green-as-evidence              demand the behavioral verdict
```

## 8.4 · UNWIRED (the core of this build)

```
AR-18  ★ a layer with 0 consumers                bun run scripts/layer-consumption.ts
AR-19  ★ a layer id ONLY in the register         grep -rn "GI_LAYER_" src/omp/ | grep -v hard-deps
AR-20  ★ a wave naming a FILE, no LAYER-EDGE     the wave-plan gate
AR-21  a module tested, imported by nothing      the import-graph walk
AR-22  a callee fixed, the caller unchanged      grep -n "<fn>(" <caller>
AR-23  up=11/11 while consumed<8                 the consumption probe
```

## 8.5 · STALE / SUBSTRATE

```
AR-24  ★ a store describing the wrong tree       SELECT file,COUNT(*) GROUP BY file
AR-25  rows:0 for an out-of-scope target         must be GI_STORE_SCOPE_MISMATCH
AR-26  a verdict on a store older than HEAD      populated_at vs the source mtime
AR-27  a store with no provenance rows           SELECT COUNT(*) FROM gi_meta = 0
AR-28  the deployed bundle older than source     find src -newer <dist> | wc -l
AR-29  a rule settling on an uncovered count     the rule's settle vs coveredKinds
AR-30  the extractor manufacturing evidence      a self-edge for a declared member
```

## 8.6 · FALLBACK

```
AR-31  GI_NO_STORE -> ALLOW+warn                 grep -n "cancel:false" src/omp/
AR-32  a missing substrate -> a PASS shape       a named refusal required
AR-33  an empty catch that swallows              grep -n "catch\s*{" src/omp/
AR-34  a header contradicting its body           the polarity check
AR-35  a duplicate export name                   export function <name> twice
```

## 8.7 · CLAIM / DOC

```
AR-36  a claim without an artifact               grep -iE "verified|passed" + no sha
AR-37  a napkin doc (< 100 lines)                wc -l
AR-38  a padded doc (200+, < 3 anchors)          grep -cE '\.ts:[0-9]'
AR-39  SHA drift across the docs                 the cross-consistency check
AR-40  "zero bugs found" as success              ★ A RED FLAG — the session did not push
```

**★ ONE COMMAND: `bash scripts/anti-theatrical-firewall.sh` → exit nonzero = THE WAVE FAILS.**

---

# 9 · THE ESCALATION LADDER

```
   VIOLATION 1 ──► the wave FAILS · the desk kicked, the detector NAMED
   VIOLATION 2 ──► the wave FAILS · the desk REASSIGNED to a fresh subagent
   VIOLATION 3 ──► ★ THE DESK IS RETIRED · the orchestrator builds it ITSELF
   NEVER: a retry-as-erasure · "the fix landed" without the re-run · a soft pass
```

---

# 10 · THE SELF-CHECK

```
mode applied        PLAN + BLUEPRINT
ingredients loaded  show-me · ascii-diagrams (+ graph/visualize/simulator rules)
visuals             ruler-passed · every box ≤ 76 · borders column-aligned
claims anchored     hard-deps.ts:335-367 · 06-WAVES.md · fire-gate.ts · the counts
open items          Q1-Q5 (each with a default) · the 12 unwired modules
★ THE HANDOFF      L2/L3 go to trident-deep-planning (authored this session)
★ THE PACKAGE      packages/gi-kernel-6l2e/ (5 files) + the DPL1 + the wave-plan
```

<!-- DOC-COMPLETE -->
