# THE 6L+2E BUILD — COMPLETION REPORT AND SEAL

**Date:** 2026-09-22 · **Tree:** `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence`
**Branch:** `graph-intelligence` · **HEAD:** `f6fca91`
**Dist:** `extensions/graph-intelligence/index.js` sha256_16 `a8583082a24c3b38` · 9,426,889 B
**Container proof:** `gi-6l2e-ct` (omp-ct:master) — `.trident/plan-6l2e/phaseE.json`

---

# §1 · THE HEADLINE

**The 6 graph layers + 2 Jev kernels are BUILT, WIRED, and MEASURED.**
`consumed:2/8` is the honest runtime number. **The other 6 are blocked on substrates that DO
NOT EXIST on this host** — each with its named, measured reason. Nothing was fabricated to
reach a green.

| # | the consumer | the edge | rung | verdict | the reason (measured) |
|---|---|---|---|---|---|
| 1 | **L5 CORBELL** | the parse-grade store → the decision | settlement | **CONSUMED (facts=16)** | the live store answers |
| 2 | **L6 GRAPHIFY** | the graphify leg → the decision | settlement | **CONSUMED (facts=8)** | the live store answers |
| 3 | L1 SEMANTICA | — | decision | GI_LAYER_DOWN | no KG store exists anywhere on the host |
| 4 | L2 ARSUMBRIS | — | knowledge | GI_LAYER_DOWN | the daemon is DEAD — 2 stale sockets, both refuse connect |
| 5 | L3 UA | — | context | GI_LAYER_DOWN | no `.ua/knowledge-graph.json` |
| 6 | L4 C2KG | — | context | GI_LAYER_DOWN | nothing named `c2kg` exists on the host |
| 7 | TSG | — | meaning | GI_LAYER_UNCONSUMED | the dir is a Rust SOURCE repo; no runtime client |
| 8 | ABIDE | — | repair | GI_LAYER_UNCONSUMED | the dir is a handover DOC set; no runtime client |

---

# §2 · F-95 — THE CENTRAL DEFECT, AND ITS ROOT CAUSE

## §2.1 · WHAT THE PIN THOUGHT IT WAS
"the deployed bundle diverged from the repo dist" (f9e233be vs 83eb7bba, 39 bytes apart).

## §2.2 · WHAT IT ACTUALLY WAS (measured)
```
$ bun build src/omp/extension.ts --outfile /tmp/gi-fresh.js --target bun --format esm --bundle
  Bundled 137 modules → 617,830 B
$ for s in createSourceFile runKernelV2 kernel-v2 fire-ledger policy-store graph-facts layer-registry; do grep -c $s /tmp/gi-fresh.js; done
  0 0 0 0 0 0 0
★ A FRESH BUILD FROM CURRENT SOURCE PRODUCED THE SAME ZERO-SYMBOL BUNDLE.
```
**★ THE SOURCE ITSELF produced a bundle with no v2.x code. There was no "bad deploy" to revert.**

## §2.3 · THE MECHANISM (two independent causes, both measured)
```
$ grep -E "^import" src/omp/extension.ts | wc -l        → 18 imports
$ for m in calibration enforcement evidence-producer fire-gate fire-ledger graph-facts \
           hard-deps jev kernel-v2 oracle policy-store rsi; do
    grep -c "omp/$m.ts" src/omp/extension.ts; done      → 0 0 0 0 0 0 0 0 0 0 0 0
★ CAUSE 1: 12 of 23 src/omp modules had ZERO importers. bun tree-shook all of them.

$ cat node_modules/typescript/package.json → version 7.0.2, main: NONE, types: NONE, bin:{tsc}
★ CAUSE 2: typescript@7.0.2 is Microsoft's GO-native TypeScript — a CLI with NO programmatic
  API. src/hunter/diagnostics/engine.ts:44 (`import ts from 'typescript'`) resolved to an
  EMPTY STUB, so the bug-hunt parser was dead in the bundle while the code read as fine.
```

## §2.4 · THE FIX + THE PROOF
```
$ bun build src/omp/extension.ts --outfile extensions/graph-intelligence/index.js --target bun --format esm --bundle
  index.js  9.42 MB
$ for s in consumptionAudit createLayerRegistry corbellProbe graphifyProbe arsumbrisProbe tsgProbe abideProbe gi-consumption; do grep -c $s <the dist>; done
  2 2 2 2 2 2 2 2
★ THE DIST-CONTENT GATE: PASS. 613 KB → 9.42 MB. forEachChild 0→317, isClassDeclaration 0→35.
```

---

# §3 · THE 8 EDGES (the deliverable)

## §3.1 · THE INTERFACE (T0, frozen)
`src/omp/layer-registry.ts` (211 L) — **TYPES ONLY, imports NO adapter.** The direction is what
lets the 8 edges be written in parallel against a frozen contract:
```ts
export interface ConsumerProbe {
  id: ConsumerId; rung: Rung;
  dependency: string;          // WHAT it cannot run without, named. Never "optional".
  errorCode: string;           // the loud code when the substrate is absent
  up(): SubstrateProbe;        // ask reality; a throw is DOWN; silence is never UP
  facts(subject: string): LayerFact[];   // ★ THE CONSUMPTION SURFACE
}
```
**THE ONLY GREEN** (`layer-registry.ts:88`): `consumed = up && factsReturned > 0`. A wired-but-
silent consumer is `GI_LAYER_UNCONSUMED`. An absent substrate is `GI_LAYER_DOWN`.
**A FACT WITHOUT ITS `source` ANCHOR IS DISCARDED AND COUNTED** (`isAnchored`, :107).

## §3.2 · THE 8 ADAPTERS (disjoint files)
| file | consumer | rung | substrate |
|---|---|---|---|
| `adapters/corbell.ts` | L5_CORBELL | settlement | `.omp/graph-intelligence/corbell-checkout/store.sqlite` |
| `adapters/graphify.ts` | L6_GRAPHIFY | settlement | `.omp/graph-intelligence/graphify-checkout/store.sqlite` |
| `adapters/c2kg.ts` | L4_C2KG | context | `.c2kg/index.json` |
| `adapters/ua.ts` | L3_UA | context | `.ua/knowledge-graph.json` |
| `adapters/arsumbris.ts` | L2_ARSUMBRIS | knowledge | `~/.arsumbris/au-host/run/*.instance.sock` |
| `adapters/semantica.ts` | L1_SEMANTICA | decision | `.omp/graph-intelligence/layers/semantica/kg.json` |
| `adapters/tsg.ts` | TSG | meaning | `research/.../typesafe-ai/examples/tsg` |
| `adapters/abide.ts` | ABIDE | repair | `.../JEV_ABIDE_CONTEXT_HANDOVER` |
`adapters/_shared.ts` — `probePath` · `probeSocketDir` · `probeSocketConnect` · `openReadOnly` ·
`liveEdgesFor` · `storeFacts`.
**★ `liveEdgesFor` carries `superseded_run IS NULL`** — the store is APPEND-ONLY; the naive
count read 6191 Checkpoints against a clean live store (the A-0 lesson, made mechanical).

## §3.3 · D-1/D-2 — THE ASSEMBLY + THE WIRING
`src/omp/layer-consumption.ts` (97 L) — `buildRegistry` (all 8, a CLOSED SET with a
`GI_REGISTRY_INCOMPLETE` assertion) + `consumptionAudit` + `SIX_L2E_CONSUMERS`.
`src/omp/extension.ts` — **the ONE wiring edge**: `import { consumptionAudit, SIX_L2E_CONSUMERS }
from "./layer-consumption.ts"` + the `gi-consumption` tool.
**★ THAT IMPORT IS WHY THE BUNDLE NOW CARRIES THE 8 MODULES. Without it, F-95 recurs exactly.**

---

# §4 · THE PROOF

## §4.1 · L0 — THE TREE IS GREEN
```
$ bunx tsc --noEmit ; echo $?     → 0        (was 191 errors)
$ bun test                        → 336 pass / 0 fail / 1186 expect() across 32 files
```
**W0 (the five roots, 191 → 0):** RC-2 typescript 7.0.2→5.9.3 (73) · RC-1 `TxnDb.run` params
(16) · RC-3 bun:sqlite row generics (41) · RC-4 `?w1fd` query imports (4) · RC-5 duplicate
imports (10) · + the un-scoped battery (`bun test` walked the vendored `research/` trees).

## §4.2 · L2 — THE CONSUMPTION SUITE (E-1, adversarial-first)
`tests/st-gi-6l2e.test.ts` — **13 pass / 0 fail / 82 expect()**. The negatives FIRST:
`test_register_reports_consumers` (up + 0 facts ⇒ UNCONSUMED — the exact `up=5/11` defect) ·
`test_unanchored_fact_is_discarded` · `test_probe_that_throws_is_down` ·
`test_consumer_that_throws_reading_is_down_not_unconsumed` · `test_scope_mismatch` ·
`test_stale_store_refuses` · `test_absent_substrate_is_down_not_empty` ·
`test_register_reports_consumption_not_file_existence`.

## §4.3 · L3/L4 — THE CONTAINER PROOF (E-2)
```
container gi-6l2e-ct (omp-ct:master) · tmux 220x50 · omp 18.2.x
deploy sha match: local a8583082a24c3b38 == remote a8583082a24c3b38 (9,426,889 B)
in-container content gate: consumptionAudit=2 createLayerRegistry=2 gi-consumption=2 corbellProbe=2
auth probe: openrouter/poolside/laguna-s-2.1:free — the status bar read "Laguna S 2.1 (free)"
  and the model answered + drove a tool call. PASS.
SC-1 the tool is CALLABLE  → "• gi-consumption"                                    PASS
SC-2 absent substrate      → scopeRoot=/tmp: consumed:0/8, every consumer named DOWN; the
                             fail token "consumed:8/8" ABSENT                       PASS
SC-3 REAL stores           → scopeRoot=/root/gi-scope: consumed:2/8 rungs=settlement;
                             L5_CORBELL facts=16, L6_GRAPHIFY facts=8                PASS
SC-4 the rungs match DPL1  → settlement/context/knowledge/decision/meaning/repair    PASS
SC-5 environment honesty   → host: L2 UNCONSUMED; container: L2 DOWN (no ~/.arsumbris) PASS
```
**★ THE VERBATIM TOOL RESULT (the passToken in tool-result context):**
```
consumed:2/8 rungs=settlement GI_LAYER_DOWN=L4_C2KG,L3_UA,L2_ARSUMBRIS,L1_SEMANTICA,TSG,ABIDE
subject=populateSessionStore
scopeRoot=/root/gi-scope
L5_CORBELL   CONSUMED   rung=settlement   facts=16
L6_GRAPHIFY   CONSUMED   rung=settlement   facts=8
L4_C2KG   GI_LAYER_DOWN   rung=context   facts=0
L3_UA   GI_LAYER_DOWN   rung=context   facts=0
L2_ARSUMBRIS   GI_LAYER_DOWN   rung=knowledge   facts=0
L1_SEMANTICA   GI_LAYER_DOWN   rung=decision   facts=0
TSG   GI_LAYER_DOWN   rung=meaning   facts=0
ABIDE   GI_LAYER_DOWN   rung=repair   facts=0
```

---

# §5 · THE BUG LEDGER (the runtime seat's deliverable — NON-EMPTY)

| # | the finding | how it was found | the mechanism | the fix |
|---|---|---|---|---|
| B-1 | **THE GRAPH GATE CAN NEVER BE SATISFIED** | driving (5 queries, 3→6 drift) | `gate-hook.ts:126` recorded `{tool,target}` with no `resolved`; `graph-gate.ts:155` computes `resolved = q.resolved===true \|\| rows>0` → ALWAYS false → `isCovered()` never true → drift unconditionally 1.0 | the tool_call remembers the query; the tool_result reports its resolution (an errored query does NOT cover) |
| B-2 | **THE L2 PROBE WAS LYING** | driving (curl --unix-socket answered nothing while the probe said UP) | `probeSocketDir` counted socket FILES; a FILE outlives its daemon | sync refuses to claim UP on a file; `probeSocketConnect` CONNECTS (both sockets refused → the daemon is dead) |
| B-3 | **THE MODEL 404** (the container's pinned model) | driving the TUI | `arcee-ai/trinity-large-preview:free` has no endpoints | pinned `openrouter/poolside/laguna-s-2.1:free`; the auth probe then passed |
| B-4 | **THE AGENT-PROSE DIVERGENCE** | driving the TUI | the model's summary said "L3_UA rung=knowledge"; the TOOL RESULT printed `rung=context` | none needed — the source map is correct. **Recorded as the live demonstration of the PROOF CONTRACT's law: a claim in prose is not evidence; the tool result is.** |
| B-5 | **THE UN-SCOPED BATTERY** | measuring | bare `bun test` walked the vendored `research/graph-infra-repos/**` and timed out at 300 s on missing `elkjs`/`graphology` | `bunfig.toml [test] root = "./tests"` |
| B-6 | **THE APPEND-ONLY GATE QUERY** | measuring A-0 | the wave-plan's gate omitted `superseded_run IS NULL`; the naive Checkpoints count read 6191 against a clean live store | the corrected gate in `P0_ABSORB_FINDINGS.md §9.1` |

**★ SIX findings, FOUR fixed in place, TWO reported with their mechanism named.**

---

# §6 · THE HONEST REMAINDER (`consumed:8` is BLOCKED, not failed)

`consumed:8` requires 6 substrates that **do not exist on this host**. Per the Hard-Dependency
Law (report the blocker + list the options + stop on that axis):

| the blocker | the evidence | the option to unblock |
|---|---|---|
| L1 SEMANTICA — no KG store | `find research/graph-infra-repos/semantica -name '*.sqlite' -o -name '*kg*.json'` → empty | run semantica's own ingest to produce a KG, then point the adapter at it |
| L3 UA — no `.ua/knowledge-graph.json` | the path is ABSENT (the register verified it correct-and-absent 2026-09-21) | run Understand-Anything's persistence pass over this repo |
| L4 C2KG — nothing named c2kg | `find /home/leviathan/JARVIS_WORKSPACE -maxdepth 5 -name '*c2kg*'` → empty | install/run the c2kg LSP indexer |
| L2 ARSUMBRIS — the daemon is DEAD | `probeSocketConnect` → "every socket refused (stale files, no daemon)" | no start script, no unit, no MCP registration exists on this host — the daemon must be started externally |
| TSG — a Rust SOURCE repo | `examples/tsg` = README.md/cache.rs/engine.rs/main.rs | build + run the tsg engine, then wire a client |
| ABIDE — a handover DOC set | the dir is reports/handovers/ | wire the Abide ALU client |

**★ NOTHING WAS FABRICATED TO REACH 8. The build's value is that it now REPORTS this precisely —
`up=11/11` could never have told you any of it.**

---

# §7 · WHAT THE BUILD CHANGED (the anti-theatre statement)

| before | after |
|---|---|
| the register answered `up=5/11` (file existence) | it answers `consumed:2/8` (facts that reached the decision) |
| 12 of 23 src/omp modules unreachable; the dist carried ZERO v2.x symbols | all 8 adapters + the registry are IN the dist (9.42 MB); the dist-content gate PASSES |
| `typescript@7.0.2` (a CLI with no API) silently stubbed the bug-hunt parser | `5.9.3`; the parser is real (forEachChild 0→317) |
| the graph gate aborted every build after 5 edits, unrecoverably | the reset fires on a resolved query |
| the L2 probe called a dead daemon "up" | it reports DOWN with the connect refusal as evidence |
| 191 tsc errors | 0 |
| an un-scoped battery that timed out | 336 pass / 0 fail / 1186 expect() across 32 files |

**THE ONE-LINE VERDICT: the 6L+2E stack is built, wired, and measured; two edges are CONSUMED
with real facts in a real container TUI; the remaining six report their exact blockers, and
nothing in this report is a claim without its tool result behind it.**
