# THE GI KERNEL CLEANUP PLAN
## 7 of 8 systems are garbage. What to DELETE, what to KEEP, what to REBUILD.

**Date:** 2026-09-22 · **Baseline:** `jarvis/gi-main` @ `13fe056` · **Measured:** corbell is INSTALLED but unused; 6 of 8 systems are ABSENT from PATH; 12 of 23 kernel modules are unreachable; the store describes the WRONG TREE.
**Companion:** `GI_kernel_v21_SIX_ITEM_AUDIT.md` (the evidence) · `FREE_CHAIN_RESILIENCE.md` (the sibling fix).

---

# §0 · THE VERDICT (one screen)

```
THE PROJECT, GRADED:   the MACHINERY is sound (362 tests, a working write/edit gate).
                       THE INTELLIGENCE — the entire point — IS GARBAGE.
★ OF THE 8 SYSTEMS (6 graph layers + 2 enforcement kernels): 1 PARTIALLY WORKS.
    L6 graphify   PARTIAL  — the store exists (15 MB graph.json), but describes src/hunter
                             (the PRE-V2 tree); 851 of 1266 nodes are the wrong tree.
    L5 corbell    INSTALLED, UNUSED — /home/leviathan/.local/bin/corbell EXISTS. The spec
                             named it the PRIMARY macro layer. It is wired to NOTHING.
    L1 semantica  ABSENT   — not on PATH. (The MCP server exists; the CLI does not.)
    L2 arsumbris  ABSENT   — not on PATH.
    L3 underst-any ABSENT  — not on PATH.
    L4 c2kg       ABSENT   — not on PATH.
    TSG           ABSENT   — interface-only; no LoadUnit impl.
    Abide         ABSENT   — not on PATH; 10.3% Jev call rate.
★ 7 OF 8 = GARBAGE. THE OPERATOR IS RIGHT.
```

# §1 · ★ THE PER-SYSTEM DISPOSITION (delete · keep · rebuild)

| # | System | The measured state | THE DISPOSITION | Why |
|---|---|---|---|---|
| **L6 graphify** | 15 MB graph.json; 851/1266 nodes = src/hunter (wrong tree) | ★ **REBUILD THE STORE, KEEP THE TOOL** | the extractor works; the SCOPE is wrong. Re-populate from the LIVE tree. |
| **L5 corbell** | INSTALLED at `~/.local/bin/corbell`, wired to NOTHING | ★ **WIRE IT (or delete it)** | the spec's PRIMARY macro layer, ignored. Wire it or stop claiming it. |
| **L1 semantica** | MCP server present; CLI absent; 0 callers | ★ **DELETE THE CLAIM, KEEP THE MCP** | it cannot be a "decision layer" with 0 callers. Either wire the MCP or drop the layer. |
| **L2 arsumbris** | absent from PATH | ★ **DELETE** | there is no L2. Remove it from every doc. |
| **L3 understand-any** | absent from PATH | ★ **DELETE** | there is no L3. Remove it. |
| **L4 c2kg** | absent from PATH | ★ **DELETE** | there is no L4. Remove it. |
| **TSG** | interface-only, no impl | ★ **DELETE (park the design)** | a load unit with no implementation is a doc, not a system. |
| **Abide (L1 Jev)** | absent from PATH; 10.3% call rate | ★ **DELETE or REPLACE** | a judge that skips 9 of 10 calls is not enforcing. |
| **the 6-layer CLAIM** | "the 6-layer graph stack" | ★ **CUT TO 2 (corbell + graphify)** | a 6-layer stack with 1 layer is a lie. Claim 2. |

# §2 · ★ THE DELETION LIST (the exact files/dirs)

```
DELETE (the accretion — 62% of the commits were repairing this):
  · the 12 UNREACHABLE kernel modules (measured: dead roots) — 4,000+ lines:
      src/omp/enforcement.ts · kernel-v2.ts · fire-gate.ts · fire-ledger.ts · oracle.ts ·
      policy-store.ts · calibration.ts · rsi.ts · graph-facts.ts · evidence-producer.ts ·
      hard-deps.ts · jev.ts
    ★ OR: wire them. THERE IS NO THIRD OPTION. A module nothing imports is DELETED or WIRED.
  · the 29 DOCS COMMITS' output that describes the unbuilt (the operators manual's banned
    pattern documented AS a feature; the "12-verb false ceiling")
  · the Checkpoints/ tree from the GRAPH (71.6% of the graph is dead copies) — exclude
    Checkpoints/ from every populate
  · the phantom file names (st-gi-v2.1-firegate.test.ts — never existed; the spec carried it)

KEEP:
  · src/omp/extension.ts · gate-hook.ts · gate-middleware.ts · graph-gate.ts · typed-write.ts ·
    store-open.ts · gi-registry.ts · populate*.ts · ripwire-bridge.ts   (the 11 REACHABLE)
  · tests/ (the 362 — but re-subject them: T1 LIVE-SUBJECT LAW)
  · packages/gi-kernel-v2.1/ (the spec — but TRIM it to what is buildable)
  · the 3 autopsies + the 5 new docs (the honest record)
```

# §3 · ★ THE REBUILD (the ONE thing that matters)

```
THE THESIS: the graph must SERVE THE LIVE CODE. Everything else is secondary.

THE 5-WAVE REBUILD (dependency-ordered):

  W0 · ★ REBUILD THE STORE FROM THE LIVE TREE
       delete graphify-out; populate from <repo>/src (NOT the worktree's src/hunter);
       exclude Checkpoints/; verify: oracle.ts/fire-gate.ts/fire-ledger.ts have nodes.
       GATE: `SELECT COUNT(*) WHERE file LIKE '%oracle.ts%'` > 0
       ★ WITHOUT THIS, EVERY OTHER GATE ANSWERS ABOUT THE WRONG CODE.

  W1 · ★ WIRE CORBELL (the installed-but-unused macro layer)
       corbell is at ~/.local/bin/corbell. Wire it as the L1 substrate (or delete the claim).
       GATE: `graph-query` answers a macro-layer question from corbell.

  W2 · ★ THE SCOPE GATE (GT-2) — the empty-vs-wrong-scope fix
       graph-query returns GI_STORE_SCOPE_MISMATCH, never rows=0, for an out-of-tree target.
       GATE: a query for a symbol outside the store → GI_STORE_SCOPE_MISMATCH
       ★ THIS ONE CHANGE PREVENTS F-66..F-69 (7 derailments).

  W3 · ★ THE FRESHNESS GATE (GT-3) — a stale store is DOWN
       storeFreshness runs on every query; populated_at < newest source mtime → GI_STORE_STALE.
       GATE: a store older than a source edit → GI_STORE_STALE

  W4 · ★ THE AUDIT GATE (GT-1) — the completion sink closes
       pi.on("tool_call") on goal(op=complete) → read the ledger → block unless PASS.
       GATE: a goal(complete) with a FAIL ledger → block:true
       ★ + WIRE THE CHAIN (§FREE_CHAIN_RESILIENCE) so the audit always runs.

  W5 · CUT THE CLAIM TO 2 LAYERS + DELETE THE 6 ABSENT
       the docs say "corbell + graphify" (2 layers). The other 4 + TSG + Abide move to
       PROPOSED (a roadmap), never "shipped".

★ W0 IS FIRST — every other gate reads the store. A gate over the wrong tree proves nothing.
```

# §4 · ★ THE STOP-THE-BLEEDING (do this FIRST — 30 minutes)

```
BEFORE the rebuild, STOP THE THING THAT KEEPS HAPPENING:

  1 MARK THE BROKEN STATE HONESTLY — the docs currently claim a 6-layer stack. Rewrite the
    banner: "1 of 6 layers populated; the graph describes a pre-V2 tree; the gate has never
    armed." (An honest broken banner beats a dishonest working one.)
  2 EXCLUDE Checkpoints/ FROM THE GRAPH — stops the 71.6% archive pollution at the source.
  3 STOP THE GRAPH-GATE DRIFT MESSAGES — the gate fired ONCE and misreports its count ("1
    structural edits" vs the n>=3 that fired). Either fix the message or disable the drift
    layer until W2/W3 land. A gate that fires 1x in 40k lines policing the agent is noise.
  4 REBUILD + REDEPLOY THE BUNDLE (21-35h stale — every fix is unloaded).
  5 ★ WIRE THE CHAIN (the sibling doc) so the audit gate NEVER blocks on a dead rung.
```

# §5 · ★ THE HONEST CEILING

```
WHAT SURVIVES THE CLEANUP:  a WORKING 2-layer graph intelligence (corbell macro + graphify
                            micro), serving the LIVE tree, with the scope + freshness + audit
                            gates armed — roughly 150 lines of NEW code and 4,000 lines of
                            DELETED accretion.
WHAT DOES NOT:              the 6-layer stack is a 2-layer stack. The 8 systems are 2 systems
                            + a roadmap. THE HONEST CLAIM IS SMALLER AND REAL.
★ THE CHOICE: BUILD A 2-LAYER GRAPH THAT WORKS, OR KEEP DESCRIBING 8 THAT DO NOT.
  Every measured fact says the second is what has been happening for 7 days.
```

# §6 · THE WAVE SEQUENCE (the board)

| Wave | Deliverable | The files | The gate |
|---|---|---|---|
| W-STOP | the honest banner + Checkpoints excluded + the bundle rebuilt | the docs + populate + the dist | the bundle sha == the source build |
| W0 | the store rebuilt from the LIVE tree | populate-graphify.ts + the store | oracle.ts has nodes |
| W1 | corbell wired (or the claim deleted) | gi-registry.ts + populate-corbell.ts | a macro query answers |
| W2 | the scope gate | typed-write.ts | GI_STORE_SCOPE_MISMATCH |
| W3 | the freshness gate | typed-write.ts | GI_STORE_STALE |
| W4 | the audit gate + the chain | extension.ts + ocr-chain.sh | a goal(complete) blocks on FAIL |
| W5 | the claim cut to 2 layers | the docs | the banner says 2 |

# §7 · THE HONEST RESIDUAL

```
WHAT THIS PLAN IS:   the decision — what to delete, keep, rebuild — grounded in the 6-desk audit.
WHAT IS NOT DONE:    nothing is executed. NO CODE (the standing order).
THE FIRST ACTION:    W-STOP (30 min): the honest banner + the Checkpoints exclusion + the rebuild.
★ AND THE SIBLING:   the chain (FREE_CHAIN_RESILIENCE.md) must land with W4 — the audit gate
                     is worthless if its rail is dead, which is EXACTLY what happened today.
```

---

# §8 · THE CHAT-DELIVERED BUILD PLAN (2026-09-22, preserved verbatim per the operator order)

Using show-me skill. **THE PLAN — what gets built, exactly, in order.**

---

# THE 6L+2E BUILD PLAN
## 8 components. 14 waves. Every wave carries its layer-edge or it is refused.

**Baseline:** `jarvis/gi-main` @ `d986259` · dist `83eb7bba` (30h STALE) · 99 .ts / 25,928 L · 31 test files
**Scope: L1 SEMANTICA · L2 ARSUMBRIS · L3 UA · L4 C2KG · L5 CORBELL · L6 GRAPHIFY · TSG · ABIDE — 8/8. NO SHRINK.**

---

# 1 · WHAT IS WRONG RIGHT NOW (the measured start state)

```
┌────────────────────────────────────────────────────────────────────────┐
│ COMPONENT      THE PATH/DECLARATION          IS IT AN INPUT TO A DECISION│
├────────────────────────────────────────────────────────────────────────┤
│ L1 SEMANTICA   path-declared in hard-deps    ★ NO — 0 consumers         │
│ L2 ARSUMBRIS   socket-declared               ★ NO — 0 consumers         │
│ L3 UA          path-declared                 ★ NO — 0 consumers         │
│ L4 C2KG        path-declared                 ★ NO — 0 consumers         │
│ L5 CORBELL     ★ INSTALLED ~/.local/bin      ★ NO — 0 consumers         │
│ L6 GRAPHIFY    ★ the store EXISTS (15 MB)    ★ NO — 0 consumers         │
│ TSG            interface-declared            ★ NO — no LoadUnit impl    │
│ ABIDE          interface-declared            ★ NO — 0 consumers         │
└────────────────────────────────────────────────────────────────────────┘
   THE REGISTER READS: up=5/11   ← A HEALTH CHECK ON FILES
   THE STORE CONTAINS: 851 of 1266 nodes = src/hunter (the PRE-V2 tree)
   ★ THE EYES EXIST. NOTHING LOOKS THROUGH THEM.
```

**THE CATEGORY ERROR, in the build's own words:**
> *"I treated the 6 graph layers as a REGISTRATION PRECONDITION — a substrate to bring UP — instead of as THE INPUT TO EVERY DECISION. ★ I TREATED THE EYES AS A LIGHT SWITCH."*

---

# 2 · WHAT I WILL DO — the wave-by-wave plan

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

| wave | I WILL BUILD | the files | DONE WHEN (the mechanical gate) | the test |
|---|---|---|---|---|
| **A-0** | the store, from the LIVE tree | `populate-graphify.ts`, `populate-corbell.ts` | `oracle.ts` has nodes; `Checkpoints/` = 0 | `test_store_scope_live` |
| **B-1** | L5 CORBELL as a decision input | `adapters/corbell.ts`, `layer-registry.ts` | a corbell caller fact **flips a fire** | `test_consume_corbell` |
| **B-2** | L6 GRAPHIFY as a decision input | `adapters/graphify.ts` | a graphify edge **flips a fire** | `test_consume_graphify` |
| **B-3** | L4 C2KG as a context input | `adapters/c2kg.ts` | a c2kg fact OR `GI_LAYER_UNCONSUMED` | `test_consume_c2kg` |
| **B-4** | L3 UA as a context input | `adapters/ua.ts` | a UA fact OR `GI_LAYER_UNCONSUMED` | `test_consume_ua` |
| **B-5** | L2 ARSUMBRIS as a knowledge input | `adapters/arsumbris.ts` | a KG fact OR `GI_LAYER_UNCONSUMED` | `test_consume_arsumbris` |
| **B-6** | L1 SEMANTICA as a decision input | `adapters/semantica.ts` | a precedent OR `GI_LAYER_UNCONSUMED` | `test_consume_semantica` |
| **C-1** | TSG the meaning gate | `adapters/tsg.ts`, `enforcement.ts` | `"meaning":"match"` or `"drift"` | `test_consume_tsg` |
| **C-2** | ABIDE the repair path | `adapters/abide.ts` | `"repaired":true` (never `blocked`) | `test_consume_abide` |
| **D-1** | the register reports CONSUMPTION | `hard-deps.ts`, `layer-consumption.ts` | 0 consumers → `GI_LAYER_UNCONSUMED` | `test_register_reports_consumers` |
| **D-2** | the decision consults the registry | `fire-gate.ts`, `extension.ts` | the rung reads the registry | `test_decision_consults_registry` |
| **E-1** | the 7-class corpus replay | `tests/st-gi-6l2e.ts` | 7/7 settle with their SPECIFIC token | `test_derailment_corpus` |
| **E-2** | the container proof | `.trident/plan-6l2e/phaseE.json` | 14/14 + the negative suite | `test_container_14of14` |
| **E-3** | the seal | `packages/gi-kernel-6l2e/` | PACKAGE_AUDIT PASS | `test_package_audit` |

**★ THE WAVE-PLAN GATE: a wave naming only a FILE and no LAYER-EDGE is REFUSED.**

---

# 3 · THE INTERFACES I WILL WRITE (the contracts, frozen at T0)

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
│ ★ interface LayerConsumption — THE ANTI-REGISTER LAW             │
├──────────────────────────────────────────────────────────────────┤
│ layer                : LayerId                                   │
│ consumers            : string[]  ← EVERY call site · NON-EMPTY   │
│ decisionsInfluenced  : number    ← the verdicts it CHANGED       │
└──────────────────────────────────────────────────────────────────┘
   A LAYER IS VALID IFF consumers.length >= 1 AND decisionsInfluenced >= 1
   else → GI_LAYER_UNCONSUMED (a LOUD down, never "up")
```

**THE QUERY PATH (pseudocode — the code I will write):**
```
QUERY A LAYER → A FACT
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

# 4 · HOW IT IS FORCED CORRECT (the anti-theatrical mechanism)

```
┌────────────────────────────────────────────────────────────────────────┐
│ THE 14 ANTI-PATTERNS — each with a detector that FAILS THE WAVE        │
├────────────────────────────────────────────────────────────────────────┤
│ AA-1 THE REGISTER-WITHOUT-CONSUMERS  → layer-consumption.ts → FAIL     │
│ AA-2 THE FILE-ORGANIZED WAVE         → the wave-plan gate → REFUSED    │
│ AA-3 THE LIGHT-SWITCH LAYER          → GI_LAYER_ id only in the reg    │
│ AA-4 THE UNCOVERED RULE              → a count-settled rule → FAIL     │
│ AB-1 THE SILENT ABSENCE              → out-of-scope → SCOPE_MISMATCH   │
│ AB-2 THE STALE SERVE                 → populated_at < HEAD → STALE     │
│ AB-3 THE MANUFACTURED EVIDENCE       → a self-edge → FAIL              │
│ AB-4 THE UNCOMMITTED PROVENANCE      → no gi_meta → POPULATE_FAILED    │
│ AB-5 THE SILENT FALLBACK             → cancel:false → FAIL             │
│ AP-1 THE UNWIRED KERNEL SHIP         → the import graph → FAIL         │
│ AP-2 THE STALE DEPLOY                → src newer than dist → FAIL      │
│ AP-3 THE PROSE CLAIM                 → no artifact → FAIL              │
│ AP-4 THE SELF-MEASUREMENT            → the independent audit           │
│ AP-5 THE CATEGORY ERROR              → ★ the pin: "the eyes are not    │
│                                        a light switch"                 │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ THE 40 AUTO-REJECT DETECTORS — one command, exit nonzero = FAIL        │
├────────────────────────────────────────────────────────────────────────┤
│ PHANTOM (AR-01..05)       git diff --name-only → empty   → KICK BACK   │
│ THEATRICAL TEST (06..13)  the fixture markers, the mutation → FAIL     │
│ CIRCULAR TOKEN (14..17)   a token in prose, not a tool result → FAIL   │
│ UNWIRED (18..23)          layer-consumption, the import graph → FAIL   │
│ STALE/SUBSTRATE (24..30)  the file distribution, mtime → FAIL          │
│ FALLBACK (31..35)         grep cancel:false, empty catches → FAIL      │
│ CLAIM/DOC (36..40)        the artifact check, wc -l, SHA → FAIL        │
└────────────────────────────────────────────────────────────────────────┘
```

---

# 5 · THE EXACT TESTS THAT PROVE IT (script · container · black-hat)

**L2 SCRIPT (12 contracts, POSITIVE + NEGATIVE each):**
```
test_consume_corbell        a corbell caller fact flips a fire → settledBy:"graph"
test_consume_graphify       a graphify edge flips a fire
test_consume_c2kg/ua/arsumbris/semantica   a fact OR GI_LAYER_UNCONSUMED
test_consume_tsg            "meaning":"match" / "drift"
test_consume_abide          "repaired":true (never "blocked":true)
test_register_reports_consumers   0 consumers → GI_LAYER_UNCONSUMED
test_scope_mismatch         out-of-tree → GI_STORE_SCOPE_MISMATCH
test_stale_store_refuses    populated_at < HEAD → GI_LAYER_STALE
test_derailment_corpus      7/7 settle with their SPECIFIC token
★ RUN: bun run tests/st-gi-6l2e.ts — the EXIT CODE is the verdict.
```

**L3 CONTAINER (14 scenarios, every passToken TOOL-RESULT-bound):**
```
C1  AUTH (FIRST)      → PROBE_TOOL_OK
C2  L5 CORBELL        → "layer":"L5_CORBELL"          fail: "rows":0
C3  L6 GRAPHIFY       → "layer":"L6_GRAPHIFY"         fail: "NO NODE"
C4-C7  L4/L3/L2/L1    → "layer":"..." OR GI_LAYER_UNCONSUMED
C8  TSG               → "meaning":"match"
C9  ABIDE             → "repaired":true
C10 ★ CONSUMPTION     → "consumed":8                  fail: "consumed":0
C11 STATE             → GI_LAYER_STALE
C12 BOUNDARY          → GI_STORE_SCOPE_MISMATCH
C13 ★ INTEGRATION     → "settledBy":"graph"
C14 ★ NEGATIVE        → "consumed":8 + 8 real answers
★ A GENERIC gate preempting a layer's OWN token = UNOBSERVED, never PASS.
```

**BLACK-HAT (12 attacks + 8 legit cases):**
```
POSITIVE (must fire):  wrong-tree store · stale store · 0-consumer layer ·
  count-settled rule · self-edge · no gi_meta · callee-fix-no-callsite ·
  unwired module · goal-complete-no-audit · GI_NO_STORE · source-string · prose-token
NEGATIVE (must NOT fire): in-tree query · fresh store · 8 consumed ·
  legit edit · positive-fact rule · real completion WITH PASS · live-imported module · committed provenance
★ A SUITE THAT FIRES EVERY ATTACK BUT NEVER PROVES THE LEGIT PATH IS HALF A SUITE.
```

---

# 6 · HOW I POLICE IT (the forced-compliance loop, per wave)

```
   1 DISPATCH   task action=generate (the E1 template + the CONTRACT block)
   2 POLL       trident-wave-read — the ONLY liveness truth
                  stream → working · idle → kick · complete → AUDIT
   3 AUDIT      a THE STREAM GATE   the return intact (no truncation)
                b THE PHANTOM CHECK  sha256 before/after — a change MUST exist
                c THE PER-HUNK       every hunk exists on disk
                d THE MECHANICAL     I run tsc + the battery + the casts MYSELF
                e THE FIREWALL       the 40 detectors → exit 0?
                f THE ADVERSARIAL    the black-hat corpus
   4 VERDICT    CORRECT|FLAWED|FITTED-TO-GOLDEN|FABRICATION|VIOLATION|CREEP
   5 CLOSE      the ledger row + the canon/ship docs
★ A WAVE CLOSES ONLY ON MY VERIFIED VERDICT. A subagent return closes NOTHING.
```

**THE ESCALATION LADDER:**
```
   VIOLATION 1 ──► the wave FAILS · the desk kicked, the detector NAMED
   VIOLATION 2 ──► the wave FAILS · the desk REASSIGNED to a fresh subagent
   VIOLATION 3 ──► ★ THE DESK IS RETIRED · I build it MYSELF
   NEVER: a retry-as-erasure · "the fix landed" without the re-run · a soft pass
```

---

# 7 · WHY THE LAST 3 DAYS WERE WASTED — AND WHY THESE WILL NOT BE

```
┌────────────────────────────────────────────────────────────────────────┐
│ THE WASTE, MEASURED                                                    │
├────────────────────────────────────────────────────────────────────────┤
│ 7 audit passes · ~90 findings · the SAME structural classes recurring  │
│ 29 docs commits vs 11 feat · 3,316 doc lines for 8,596 code            │
│ 12 of 23 modules unreachable · the gate fired ONCE in 40,631 lines     │
│ ★ THE ROOT: the only structural detector in the loop was a MODEL PAID  │
│   PER FILE — because the graph returned rows=0 and was never wired.    │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ THE FIX — WHAT CHANGES THE ARITHMETIC                                  │
├────────────────────────────────────────────────────────────────────────┤
│ the graph answers in ~60ms what a model answers in minutes per file    │
│ a layer not consumed reads GI_LAYER_UNCONSUMED — a LOUD fail           │
│ the corpus REPLAYS the 7 derailments; each settles with its token      │
│ the audit is INDEPENDENT (the ocr chain) and the ledger is its input   │
│ ★ THE MEASURE: the audit's structural-finding rate DROPS because the   │
│   structural defects never land — the pre-act rung kills them at $0.   │
│ ★ THE PROOF IT WORKS ALREADY: P4 CLOSED at 3/4 derailments handled,    │
│   2 settling FIRE at $0 — the mechanism works; it was never wired.     │
└────────────────────────────────────────────────────────────────────────┘
```

---

# 8 · THE OPEN DECISIONS (each with a default — no stalls)

| # | the fork | the evidence | THE DEFAULT I WILL TAKE |
|---|---|---|---|
| Q1 | L1/L2/L3/L4 absent from PATH | `which` → absent | build to the INTERFACE; they read `GI_LAYER_UNCONSUMED` until their substrate lands |
| Q2 | L5 corbell installed, unused | `~/.local/bin/corbell` exists | **WIRE L5 FIRST** — the only layer whose substrate is present |
| Q3 | TSG has no LoadUnit impl | the interface only | wire against the interface |
| Q4 | the store = 851/1266 nodes of `src/hunter` | the scope mismatch | **A-0 re-populates from the live tree** |
| Q5 | 30s hook budget vs a full audit | `runner.ts:1090-1144` | the LEDGER pattern (pre-compute, the gate reads) |

---

# 9 · WHAT IS ALREADY ON DISK (so the build starts from a pinned package)

```
packages/gi-kernel-6l2e/
├── MASTER_PROMPT.md              184 L  the depth: the one law, the 3 proofs, the workflow
├── THE_6L2E_TESTING_SUITE.md     259 L  the script + container + black-hat suite
├── ANTI_THEATRICAL_FIREWALL.md   185 L  the 40 detectors + the one-command gate
├── SUBAGENT_ENFORCEMENT.md       189 L  the 7-layer police loop + the contract
└── THE_PIN.txt                   152 L  ★ validator PASS (7/7 slots)
packages/gi-kernel-v2.1/GI_KERNEL_6L2E_DPL1_SPEC.md   473 L  the binding authority (8/8)
.trident/plan-6l2e/wave-plan.md                        90 L  WAVES: 12
reports/PLAN_6L2E_ShowMe.md                           517 L  this plan + the blueprint
```

---

# 10 · THE SELF-CHECK

```
mode applied        PLAN + BLUEPRINT
ingredients loaded  show-me · ascii-diagrams
visuals             ruler-passed · every box ≤ 76 · borders column-aligned
claims anchored     hard-deps.ts:335-367 · 06-WAVES.md · fire-gate.ts · the counts
open items          Q1-Q5 (each with a default) · the 12 unwired modules
★ THE HANDOFF      paste packages/gi-kernel-6l2e/THE_PIN.txt into a fresh session
                    → it re-measures the baseline and fires A-0 the same turn.
```
