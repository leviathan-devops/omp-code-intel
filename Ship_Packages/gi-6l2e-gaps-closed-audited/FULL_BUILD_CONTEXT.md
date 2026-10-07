# FULL_BUILD_CONTEXT — the GI (Graph Intelligence) OMP extension

**The build this document describes:** the 6L+2E gaps-closed + audited work (2026-10-02 → 2026-10-03).
**The package:** `Ship_Packages/gi-6l2e-gaps-closed-audited/`
**The deployed artifact:** `extensions/graph-intelligence/index.js`
**The deployed sha256:** `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741` (== source, sha-matched at seal)
**Branch:** `jarvis/gi-main` · **HEAD:** `2a0682b973e1350a35fb214d26a2dad253782eca` (`2a0682b`)

> This is the compaction-recovery context document: a fresh agent reads THIS and can
> reconstruct the build without the conversation. Every claim below carries its anchor —
> a `file:line`, a sha, a count, or a quoted tool result. Read order is §8.

> **THE HONESTY LAW OF THIS DOCUMENT:** every number was measured or read from a source
> document/artifact at the time of writing. Where a source doc and a live measurement
> disagree, that disagreement is STATED (see §2.9, §7.10). Nothing is estimated.

---

## TABLE OF CONTENTS

1. Project Identity (§1, ~120 lines)
2. Architecture Overview (§2, ~380 lines)
3. Key Files Reference (§3, ~470 lines)
4. Design Decisions (§4, ~360 lines)
5. Implementation Patterns (§5, ~250 lines)
6. Known Bugs (§6, ~260 lines)
7. Operational Knowledge (§7, ~260 lines)
8. Compaction Recovery Guide (§8, ~260 lines)

A `file:line` anchor in this document was chosen so that re-opening the file at that line
shows the declaration or the comment the text describes. When a referenced file changes, the
line number may shift; the SYMBOL name in the same sentence is the stable anchor.

===============================================================================
# 1 · PROJECT IDENTITY
===============================================================================

## 1.1 What GI is (one paragraph)

Graph Intelligence (GI) is OMP's **session-scoped graph-intelligence extension**. It is an
OMP host extension (a bundle registered into the OMP runtime) that (a) exposes tools the agent
can call — `graph-probe`, `graph-query`, `bug-hunt`, `aether-code-audit`, `gi-consumption`,
`gi-decide` — and (b) installs runtime hooks that consult a set of graph/knowledge "Layers"
and two Jev decision kernels before structural edits and before a turn closes. It answers
"who calls X", "what breaks if I change X", "is this wired", "is this claim evidence-backed",
and — the 6L+2E concern — **"is each of the 8 consumers actually CONSUMED, not merely present"**.

The operator's law that the 6L+2E work makes mechanical is stated verbatim in the registry's
header (`src/omp/layer-registry.ts:1-11`):

```
"A LAYER IS UP IFF ITS FACT CHANGED A VERDICT."
```

`up=N/M` is a health check on FILES — a light switch. It says a path exists; it says nothing
about whether any decision ever READ it. The measured state that produced the registry module:
6 layer ids appearing ONLY in `hard-deps.ts`, 12 of 23 `src/omp` modules unreachable from the
entry point, and a deployed bundle carrying ZERO v2.x symbols — every layer "up", none consumed.

## 1.2 The repository root

```
/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
```

- Branch: `jarvis/gi-main` (verified: `git rev-parse --abbrev-ref HEAD`).
- HEAD at seal: `2a0682b973e1350a35fb214d26a2dad253782eca` (`2a0682b`) — verified
  (`git rev-parse --short HEAD`). Commit subject: *"feat(gi): W5 — seal the
  gi-6l2e-gaps-closed checkpoint (union=8/8, ABIDE_JUDGE observable, sha-match)"*.
- The package's frozen subtree lives at `Ship_Packages/gi-6l2e-gaps-closed-audited/`.
- The checkout used to write this document: `/home/leviathan/.omp/wt/graph-intelligence-66dfa4c`
  (a linked worktree of the same repo; the same branch pointer is resolvable there).

## 1.3 The deployed artifact

| field | value | how read |
|---|---|---|
| path (source) | `extensions/graph-intelligence/index.js` | `SHIP_MANIFEST.md §ARTIFACTS` |
| path (deployed) | `~/.omp/agent/extensions/graph-intelligence/index.js` | `scripts/build-extension.sh:20` |
| sha256 | `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741` | `sha256sum` (both paths, identical) |
| size | ~809 KB (`dist/gi-index.js` 809 KB) | `SHIP_MANIFEST.md` |
| source==deployed | YES (sha-matched at seal) | `SHIP_MANIFEST.md` |
| build toolchain | `bun build … --target bun --format esm --bundle` | `scripts/build-extension.sh:29-34` |

The build externalizes two heavy deps (so they resolve at runtime instead of inlining):

```
--external typescript           # the 9 MB inlining defect (see §6.6 / §7.1)
--external '@huggingface/transformers'   # referenced as a path/string only, never boot-loaded
```

## 1.4 The git lineage of this build (5 commits)

From `GIT_HISTORY.md` and `git log --oneline`:

```
2a0682b  feat(gi): W5 — seal the gi-6l2e-gaps-closed checkpoint (union=8/8, ABIDE_JUDGE observable, sha-match)
6d9ba16  feat(gi): W3 — C2KG index gains edges (411) + the adapter reads them (L4 CONSUMED facts=13 on an edge subject)
f0cf7f9  feat(gi): W1+W2 — the L2 symbol/file-space read (L2 CONSUMED 50 facts) + the subject-matrix rows (union=8/8)
88f62b6  feat(gi): W1 — the L2 symbol/file-space read: facts() answers symbol subjects via the engine files read (au-read per-read fields + no-type frames)
4d79de2  fix(abide): the W5b judgeDiff ran but wrote NO ledger row — now observable (ABIDE_JUDGE rows with scores)
```

`2a0682b` is the seal; below it, `4d79de2` is the pre-6L2E baseline for the change set. The
`git diff --stat` over `4d79de2..HEAD` (from `GIT_HISTORY.md`) touches 13 paths and includes the
sealed `Checkpoints/gi-6l2e-gaps-closed-2026-10-02/dist/*` artifacts.

## 1.5 The 8 consumers (the closed set)

The consumer set is CLOSED and named in ONE place: `L2E_CONSUMERS` at
`src/omp/layer-consumption.ts:34-43`:

```
"L1_SEMANTICA",   rung=decision    (a precedent the verdict may cite)
"L2_ARSUMBRIS",   rung=knowledge   (the typed repo knowledge)
"L3_UA",          rung=context     (surrounding structure)
"L4_C2KG",        rung=context     (the code-to-knowledge-graph LSP index)
"L5_CORBELL",     rung=settlement  (the graph facts a verdict settles on)
"L6_GRAPHIFY",    rung=settlement  (the graph facts a verdict settles on)
"TSG",            rung=meaning     (the meaning gate — jevk5/kev/tsg ladder)
"ABIDE",          rung=repair      (the repair path — never a block)
```

The type contract: `ConsumerId = LayerId | KernelId` (`src/omp/layer-registry.ts:25-26`),
`KernelId = "TSG" | "ABIDE"` (`:24`), `Rung` at `:31-39`.

The **"6 graph layers L1-L6 + 2 Jev kernels TSG + ABIDE"** framing is the operator's and is
nowhere re-derived: the 6 layers know CODE SYMBOLS; ABIDE's domain is AGENT PROSE (measured:
see §5.6, `consumption-audit.ts:60-66`); TSG (the meaning gate) is a Jev kernel, not a graph.

## 1.6 The consumer identity per adapter (probe `id` anchors)

| consumer | adapter file | `id:` anchor |
|---|---|---|
| L1_SEMANTICA | `src/omp/adapters/semantica.ts` | `:48` |
| L2_ARSUMBRIS | `src/omp/adapters/arsumbris.ts` | `:71` |
| L3_UA | `src/omp/adapters/ua.ts` | `:22` |
| L4_C2KG | `src/omp/adapters/c2kg.ts` | `:23` |
| L5_CORBELL | `src/omp/adapters/corbell.ts` | `:23` |
| L6_GRAPHIFY | `src/omp/adapters/graphify.ts` | `:16` |
| TSG | `src/omp/adapters/jevk5.ts` | `:208` (`kev.ts:85`, `tsg.ts:96` — the same id, the ladder) |
| ABIDE | `src/omp/adapters/abide.ts` | `:170` |

## 1.7 The 6L+2E state this build closed

From `Checkpoints/gi-6l2e-gaps-closed-2026-10-02/CHECKPOINT_MANIFEST.md` and the checkpoint's
`ABIDE_6L2E_RESULTS.json`:

| gate | test_id | measured evidence |
|---|---|---|
| W1 L2 symbol-read | ST-1 | `L2_ARSUMBRIS CONSUMED rung=knowledge facts=50` |
| W1 test | ST-1b | `bun test -t consume_arsumbris` → `2 pass, 0 fail, 103 expect()` |
| W2 subject-matrix | ST-2 | `6 per-subject rows + union=8/8 + PREDICATE PASSED` |
| W3 C2KG edges | ST-3 | `edges: 411; L4_C2KG CONSUMED facts=13` |
| W4 ABIDE observability | ST-4 | ledger row `Pattern=ABIDE_JUDGE p=0.703` (`ABIDE-R1=0.703 R2=0.659 R3=0.407`) |
| W5 union + seal | ST-5 | `union=8/8 PREDICATE PASSED; sha(deployed)==sha(source)` |

The checkpoint's own deployed/source sha is `73e907fffa6647d18d56f964205a40d71a9efb50f298addf6ce3d4a18acafb53`
(`ABIDE_6L2E_RESULTS.json` `deployedSha`/`sourceSha`). The FINAL package dist sha is
`879cbbf8…` (rebuilt after the audit fixes; §7.1). Both are recorded; they are different
artifacts of the same build lineage (checkpoint seal vs post-audit-fix deploy).

## 1.8 The audit that closed the ship gate

From `SHIP_MANIFEST.md §AUDIT` and `artifacts/sg-ocr-728e6ceb94844450.json`:

```
AUDIT GATE: PASS (0 critical/high OPEN)
session 5938c5e6-7eb0-4566-83d4-6b6d76db83d8   424.93 s   4 files   1 crit 2 high 5 med 4 low
session c183570e-abdd-4d82-a772-88924ba9faf3   356.0 s    3 files   1 crit 1 high 2 med 5 low
session df2b5c0a-3dd9-46de-9a74-6fa254c40c32             2 files   1 med 1 low   (0 crit/high)
```

The audit lane: `poolside-laguna-s` (inference.poolside.ai, openai protocol). 1 residual LOW
(c2kg pipeline duplication — accepted refactor debt).

## 1.9 What this build did NOT do (scope boundary)

- It did not ship a new substrate; it closed gaps in the EXISTING 6L+2E wiring.
- It did not change the 4 enforcement gates' architecture; those live in `pbk-v2` (a sibling
  repo, deployed as the `omp-ct` gate stack at `~/.omp/agent/extensions/omp-ct/dist.js`).
- It did not commit the audit fixes: `GIT_HISTORY.md` states the fixes
  (`c2kg.ts`/`au-read.ts`/`consumption-audit.ts`) are UNCOMMITTED at package time while the
  deployed dist `879cbbf8` was built from them. The seal's dist is the artifact of record.

## 1.10 Identity of the doc set this document synthesizes

The package's canon/ship docs (each a source for a section below):

```
context_management/CURRENT_STATE.md        34.8 KB   the deployed truth + the 6L+2E state
context_management/BUILD_STATE.md          24.6 KB   the SHA chain + the module inventory
context_management/EVIDENCE_STATE.md       29.0 KB   proven-vs-claimed + the per-gate evidence
context_management/DECISION_CHAIN.md       22.2 KB   the operator's rulings VERBATIM
context_management/POST-COMPACTION_PROMPT.md 22.9 KB the fresh-agent entry sequence
context_management/COMPACTION_SURVIVAL.md  18.7 KB   the state-at-a-glance + operating laws
context_management/NEXT_STEPS.md           19.9 KB   the wave plan + risk register
context_management/RUNNING_BUILD_LOG.md   145.3 KB   the append-only build log
context_management/RUNNING_DEBUG_LOG.md   151.8 KB   the append-only debug log
context_management/TASK_QUEUE.md           14.2 KB   gates active/completed/blocked
context_management/CHANGELOG.md            21.3 KB   the session history
context_management/CANON_MANIFEST.md       0.97 KB   the 12-doc manifest
BUILD_REPORT.md                           115.2 KB   the build record
DEBUG_LOG.md                              257.5 KB   EN-ids
FAILURE_LOG.md                            190.7 KB   F-ids
SPEC_VIOLATION_LOG.md                      61.6 KB   V-ids
TESTING_LOG.md                             30.3 KB   the test plan + results
THEATRICALITY_LOG.md                       72.2 KB   the append-only theatricality journal
SHIP_DOCS_MANIFEST.md                       0.61 KB   the ship-docs fingerprint
SHIP_MANIFEST.md                             —       the package manifest
GIT_HISTORY.md                               —       the lineage
Artifacts:  artifacts/sg-ocr-728e6ceb94844450.json    the code-audit artifact (GATE S7 input)
Checkpoints/gi-6l2e-gaps-closed-2026-10-02/{ABIDE_6L2E_RESULTS.json, CHECKPOINT_MANIFEST.md, dist/*}
```

---

===============================================================================
# 2 · ARCHITECTURE OVERVIEW
===============================================================================

## 2.1 The whole shape (ASCII)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        OMP RUNTIME (the host)                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ~/.omp/agent/extensions/graph-intelligence/index.js  (sha 879cbbf8) │  │
│  │  THE DEPLOYED BUNDLE — built from src/omp/extension.ts               │  │
│  └───────────────┬──────────────────────────────────────────────────────┘  │
│                  │  giOmpExtension(pi)                                       │
│                  ▼                                                            │
│   ┌───────────────────────────────────────────────────────────────────┐      │
│   │ src/omp/extension.ts  (885 L)                                     │      │
│   │  · registers 6 TOOLS  (GI_TOOL_NAMES :30)                         │      │
│   │      graph-probe · graph-query · bug-hunt · aether-code-audit     │      │
│   │      gi-consumption (:737) · gi-decide                            │      │
│   │  · installs the HOOKS  (the tool_call listeners)                  │      │
│   │      attachGiGraphGate  (per-edit middleware)                     │      │
│   │      registerGraphGate  (:870 — the v1.3 drift layer; 1 call site)│      │
│   │      attachClaimFirewall  (fail-CLOSED, the turn-close gate)      │      │
│   │      attachCardHud                                                │      │
│   └───────────────┬───────────────────────────────────────────────────┘      │
│                   │ imports (the D-2 wiring edge)                             │
│                   ▼                                                           │
│   ┌───────────────────────────────────────────────────────────────────┐      │
│   │ src/omp/layer-consumption.ts  (139 L)  — THE ASSEMBLY (D-1/D-2)   │      │
│   │   L2E_CONSUMERS (:34)  ·  buildRegistry (:47)  ·  consumptionAudit│      │
│   │   (:113)                                                          │      │
│   └───────────────┬───────────────────────────────────────────────────┘      │
│                   │ imports ALL 8 adapters (the single drift point)           │
│                   ▼                                                           │
│   ┌───────────────────────────────────────────────────────────────────┐      │
│   │ src/omp/layer-registry.ts  (315 L)  — THE T0 INTERFACE (types)    │      │
│   │   ConsumerProbe (:62) up() + facts(subject)                        │      │
│   │   LayerFact (:41)  ConsumptionReport (:81)  LayerRegistry (:99)    │      │
│   │   isAnchored (:130)  probeConsumer (:143)  createLayerRegistry(:157)│     │
│   └───────────────┬───────────────────────────────────────────────────┘      │
│                   │ each adapter implements ConsumerProbe                     │
│   ┌───────────────┴───────────────────────────────────────────────────┐      │
│   │  src/omp/adapters/*.ts  — the 8 EDGES + the shared primitives      │      │
│   │   semantica.ts(L1) arsumbris.ts(L2) ua.ts(L3) c2kg.ts(L4)          │      │
│   │   corbell.ts(L5) graphify.ts(L6) jevk5|kev|tsg.ts(TSG) abide.ts    │      │
│   │   _shared.ts (264 L): probePath(:19) probeSocketDir(:42)           │      │
│   │      probeSocketConnect(:72) openReadOnly(:126) liveEdgesFor(:148) │      │
│   │      storeFacts(:226)                                              │      │
│   └───────────────────────────────────────────────────────────────────┘      │
│                                                                               │
│   THE HOOK PATH (independent of the registry):                                │
│   tool_call(event) ──► src/omp/gate-hook.ts (446 L)                           │
│        · :74  attachGiGraphGate — the per-edit middleware (SIGNATURE_BREAK)   │
│        · :118 judgeDiff(rec.newText)  (ABIDE live judge; fail-OPEN)           │
│        · :126 kind "ABIDE_JUDGE" → recordGateDecision (the ledger row)        │
│        · :173 graphBreakCandidate → askToolGate → enforceGate (the judge)     │
│        · :241 registerGraphGate — the drift layer (T1 steer / T2 block / T3)  │
│                          │                                                     │
│                          ▼                                                     │
│   src/omp/jev.ts (564 L) — THE JEV DECISION LAYER                             │
│        · :303 TOOLGATE_URL_DEFAULT = http://127.0.0.1:8090/v1/systemone       │
│        · :316 GATE_THRESHOLD  ·  :335 detectCandidate  ·  :436 askToolGate    │
│        · :494 enforceGate  ·  :529 gateLedgerPath  ·  :534 recordGateDecision │
│                          │                                                     │
│                          ▼                                                     │
│   THE JUDGE: jevk5-4b-v0.2-Q8_0   (gguf, llama:200)   @ 127.0.0.1:8090        │
│   THE LEDGER: ~/.omp/run/gate-ledger.jsonl  (JSONL; the evidence triad/row)   │
└────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 The layer registry — `src/omp/layer-registry.ts` (315 L)

The registry is TYPES-ONLY by design (`:13-19`): it imports NO adapter; the adapters import IT.
That direction is what lets the 8 edges be written in parallel against a frozen interface, and
what makes the wiring (D-2) the one point that cannot drift.

The consumption chain the module defines (`:14-19`):

```
substrate UP  →  facts() returns ≥1 fact  →  the DECISION reads it  →  a VERDICT changes
```

A break at any link is a NAMED, LOUD state — never a silent pass, never `rows:0`:

```
GI_LAYER_DOWN        the substrate does not answer (the register's codes carry the why)
GI_LAYER_UNCONSUMED  the substrate answers but contributes ZERO facts to the decision
CONSUMED             the substrate answers AND its facts reached the decision
```

Key declarations:

| symbol | anchor | what it is |
|---|---|---|
| `ConsumerId` | `:26` | `LayerId \| KernelId` — the closed identity type |
| `Rung` | `:31` | `decision \| settlement \| context \| knowledge \| meaning \| repair` |
| `LayerFact` | `:41` | `{consumer, rung, subject, value, source}` — `source` MANDATORY |
| `SubstrateProbe` | `:54` | `{up, evidence}` — `up` alone is a light switch |
| `ConsumerProbe` | `:62` | `{id, rung, dependency, errorCode, up(), facts(subject)}` |
| `ConsumptionReport` | `:81` | `{consumer, rung, up, evidence, factsReturned, factsDiscarded, consumed, verdict}` |
| `LayerRegistry` | `:99` | `register/consumers/audit/factsFor/factsForWithFaults/decisionsInfluenced/summary` |
| `FactsForResult` | `:123` | `{facts, faults[]}` — the fault-carrying view (F-936) |
| `isAnchored` | `:130` | a fact with empty `source` is DISCARDED (counted, never silent) |
| `probeConsumer` | `:143` | THE probe call — both views read the SAME normalized result (R19-HIGH) |
| `createLayerRegistry` | `:157` | registration idempotent by id; duplicate REPLACES |

The per-consumer verdict type (`ConsumptionReport.verdict`, `:92-96`) is
`"CONSUMED" | "GI_LAYER_UNCONSUMED" | "GI_LAYER_DOWN" | \`GI_LAYER_ERROR:${string}\`` — a
consumer that THROWS mid-query is DISTINCT from a substrate ABSENCE (DPL1 §7 A6).

## 2.3 The assembly — `src/omp/layer-consumption.ts` (139 L)

This module is the ONE place the 8 edges are composed and the ONE place a consumer gets answers
(`:1-10`). Why here and not in the adapters: the 8 adapters are disjoint files importing ONLY the
frozen interface; this module imports all 8 (the deliberate location where a missing import is a
TYPE ERROR rather than a silently tree-shaken module). The measured failure this prevents: 12 of
23 `src/omp` modules unreachable from the entry point → bun tree-shook them → the deployed bundle
carried ZERO v2.x symbols while every layer read "up" (F-95).

`buildRegistry(scopeRoot, overrides)` (`:47-91`):
- The meaning gate is a LADDER: `jevk5Available() ? jevk5Probe(...) : kevAvailable ? kevProbe(...)
  : tsgProbe(...)` (`:74`).
- Constructor safety (F-270): `tryProbe` wraps each probe constructor; a throwing constructor
  registers a DOWN probe (`GI_REGISTRY_PROBE_BUILD:<id>`), never fatal to all 8 (`:64-72`).
- A CLOSED SET assertion: any id in `L2E_CONSUMERS` without a registered probe THROWS
  `GI_REGISTRY_INCOMPLETE` (`:84-88`).

`consumptionAudit(scopeRoot, subject)` (`:113`) is THE PROBE (D-1): ask every consumer for one
subject and report consumption. `SIX_L2E_CONSUMERS` (`:92`) is the deprecated alias of
`L2E_CONSUMERS` (`F-LC1`).

## 2.4 The 8 adapters (`src/omp/adapters/*.ts`)

Every adapter exports a probe factory returning a `ConsumerProbe`. The 8 + the ladder:

| adapter | exports | up() mechanism |
|---|---|---|
| `semantica.ts` | `semanticaProbe` | a KG store path (`probePath`) |
| `arsumbris.ts` | `arsumbrisProbe`, `auEngineRead` | `probeSocketConnect` on `~/.arsumbris/au-engine/run` |
| `ua.ts` | `uaProbe` | `.ua/knowledge-graph.json` |
| `c2kg.ts` | `c2kgProbe` | `.c2kg/index.json` (`probePath(indexPath, true)`) |
| `corbell.ts` | `corbellProbe` | the corbell store path |
| `graphify.ts` | `graphifyProbe` | the graphify checkout + `graph.json` |
| `jevk5.ts` | `jevk5Probe`, `jevk5Available` | the `:8090` health probe |
| `kev.ts` | `kevProbe`, `resolveKevCli`, `resolveKevRuntime` | the ONNX/kev runtime |
| `tsg.ts` | `tsgProbe` | the remote TSG CLI (named last resort) |
| `abide.ts` | `abideProbe`, `judgeDiff` | the ABIDE ledger + live-diff judge |
| `_shared.ts` | the primitives | `probePath`, `probeSocketDir`, `probeSocketConnect`, `openReadOnly`, `liveEdgesFor`, `storeFacts` |

`_shared.ts` anchors: `probePath` `:19`, `probeSocketDir` `:42`, `probeSocketConnect` `:72`,
`openReadOnly` `:126`, `liveEdgesFor` `:148`, `storeFacts` `:226`.

## 2.5 The extension entry — `src/omp/extension.ts` (885 L)

- `GI_TOOL_NAMES` (`:30`): `["graph-probe","graph-query","bug-hunt","aether-code-audit","gi-consumption","gi-decide"]`.
- The D-2 wiring import (`:25`): `import { consumptionAudit, SIX_L2E_CONSUMERS } from "./layer-consumption.ts"`.
  THIS import is the edge that makes the 8 adapters + the registry REACHABLE from the entry point
  (without it, bun tree-shakes all of them — the measured F-95 defect).
- The `gi-consumption` tool registration (`:736-790`): the params
  (`consumptionParams`, `:735`) then `pi.registerTool({ name: "gi-consumption", … })` (`:737`);
  the execute calls `consumptionAudit(root, subject)` (`:757`) after confining `scopeRoot` with
  `confineTargetPath` (the F-5 FIX — an operator-controlled root must be confined like graph-query).
- The hooks install (`:867-873`):
  ```
  :868  // W2: registerGraphGate = attachGiGraphGate + the v1.3 drift layer. One call site.
  :870  registerGraphGate(pi as {...});
  :871  // W5c: the CLAIM FIREWALL — FAIL-CLOSED: an unbound done-shaped claim throws
  :872  //      GI_FABRICATED_CLAIM so the turn cannot close.
  ```

## 2.6 The judge wire (`:8090` jevk5-4b-v0.2-Q8_0)

`src/omp/jev.ts` (564 L) is the Jev decision layer. The law (`:255-258`): the regex DETECTS
(marks candidates, extracts signals) — it NEVER returns a verdict. The JUDGE decides (a
calibrated `{choice, confidence}` from the live jevk5-4b at `:8090`). The ENFORCER is mechanical;
it reads the verdict, serves or refuses, and LEDGERS every decision with its confidence. A
refusal NAMES its remedy (the recoverability law).

The exact wire (`CURRENT_STATE.md §THE JUDGE CONTRACT`):

```
endpoint  POST http://127.0.0.1:8090/v1/systemone      (jevv.ts:303 TOOLGATE_URL_DEFAULT)
body      { state, questions: { gate: { type: choice, instructions, criteria } } }
answer    { choice: serve|refuse, confidence, probabilities }
          output_tokens: 0  (pointer-readout — the argmax IS the choice)
parse     3 named refusals: BAD_RESPONSE / BAD_CHOICE / BAD_CONFIDENCE
          ANY throw → { refuse, 0, degraded:true }   (the SAFE default)
enforce   NONE → serve; degraded+security → REFUSE; degraded+info → serve;
          refuse AND conf >= 0.5 → REFUSE (remedy = criteria.serve); serve → serve
```

`GATE_THRESHOLD` (`:316`) is `Record<GateSurface, number>` = `{ security: 0.5, info: 0.5 }`,
DERIVED in `scripts/gate-control-set.ts` from the measured corpus (`minRefuse=0.674`,
`maxServe=0.941`; the derivation `derived=0.5`). The detector kinds (`GateKind`, `:272-279`):
`NONE | QUOTE_CONCAT | READ_VERB_HIJACK | SHELL_CHAIN | EXPORT_REMOVAL | GRAPH_SIGNATURE_BREAK
| ABIDE_JUDGE`.

The circular guard (`:382` `graphBreakCandidate`): the graph-gate
candidate — the export-removal regex matched a SHAPE (a name is gone from the new text); the
judge decides whether it is a REAL signature break (a consumer would break) or a legitimate
refactor. `buildJudgeState` (`:418`) implements the injection wall: every untrusted value is
DELIMITED and LABELLED AS DATA (a destructive strip would mangle the paths/quoted patterns the
judge needs). `scrubSecrets` (`:402`) strips credential-shaped tokens before anything is
persisted or sent.

## 2.7 The gate hook — `src/omp/gate-hook.ts` (446 L)

Two listeners, one file:

1. `attachGiGraphGate` (`:74`) — the per-edit middleware. On `write|write_file|edit|patch`
   (`:108`), with `event.isAgentOrigin !== false` (`:110`), it reconstructs the old/new text,
   runs the ABIDE live judge, runs `runGraphGate`, and (when the gate's token is a cancel)
   consults the Jev judge.
2. `registerGraphGate` (`:241`) — the v1.3 drift layer (T1 steer / T2 block / T3 abort), wrapping
   the middleware; graph queries reset drift per symbol (reward, never punishment).

The ABIDE observability block (`:117-146`): the `judgeDiff(rec.newText)` verdict (`:118`) is
recorded to the gate ledger with scores; the candidate kind is `"ABIDE_JUDGE" as const` (`:126`)
with `signals` carrying `verdict=` + each score `.toFixed(3)`. This is the W4 closure: before it,
the ABIDE leg ran but left NO record (the unobservable-consumer defect); after it, "ABIDE ran vs
skipped" is answerable from data. Fail-OPEN: a `REPAIR` band queues a steer note, never a block;
a down judge is silent (`:162` the outer `catch`).

The Jev-consulted cancel path (`:164-190`): `graphBreakCandidate(rec.file, verdict.advisory)`
(`:173`) → `askToolGate` → `enforceGate`; if the judge serves, the edit proceeds (no cancel); if
it refuses, `recordGateDecision` ledgers the triad and the handler throws the named token.

## 2.8 The consumption predicate — `scripts/consumption-audit.ts` (111 L)

The operator-facing answer to "is the 6L+2E actually wired?" — not `up=11/11` (a health check on
files) but `consumed:N/8` (which consumers actually contributed a fact).

```
usage: bun scripts/consumption-audit.ts <scopeRoot> [subject] [--expect <N>] [--gate]
```

- `DOMAIN_SUBJECTS` (`:53-66`): each consumer asked about ITS OWN domain subjects. The measured
  reason: NO SINGLE ARBITRARY SUBJECT IS IN ALL 8 DOMAINS. `subject=evidence` → `consumed:7/8`
  (only L2 down); `subject=arsumbris` → `consumed:7/8` (only ABIDE down).
- ABIDE's domain is AGENT PROSE (`:60-66`): its ledger's `matched_span`/`verdict`/`rule` fields
  carry rubric flags over agent text; the code subjects appear in ZERO flag rows. Its own domain
  subjects: `CLAIM_SLOP` (925 facts) and `Live-proven` (8 facts).
- `--gate` (`:75-100`): iterates the UNION of every consumer's own domain subjects (`:77`), requires
  ALL 8 CONSUMED across the runs, prints a per-subject row each (`:86`), then
  `union=N/8` (`:93`) and `★ THE PREDICATE PASSED` (`:99`). A never-consumed consumer prints
  `GI_CONSUMPTION_BELOW_EXPECTED` and `process.exit(1)` (`:96-97`).
- `CONSUMER_COUNT` (`:80`): DERIVED from `Object.keys(DOMAIN_SUBJECTS).length` (the audit fix; was
  hardcoded `8` in three log lines).
- `--expect N` (`:103-111`): the RAW count predicate for a single subject (unchanged).

## 2.9 The two-views note (registry vs decision) and the honest disagreement

`audit()` (the register) and `factsFor()` (the decision) each call `up()` + `facts()`
independently; `probeConsumer` (`layer-registry.ts:143`) normalizes both so they cannot disagree
by construction (the R19-HIGH fix; F-405/F-706/F-1007/F-1208 were four "two-view drift" patches).
Probes MUST be pure/idempotent (F-520).

**The honest disagreement (measured this session):** the current working-tree
`.c2kg/index.json` (a gitignored, regenerated file, mtime `2026-10-03 01:02:04`) reads
`edges=0, symbols=230`. The SEALED index — `Checkpoints/gi-6l2e-gaps-closed-2026-10-02/dist/c2kg-index.json`
(4,498 lines) — reads `edges=411, symbols=230`, and matches the checkpoint's recorded
`edges: 411` (ST-3, `ABIDE_6L2E_RESULTS.json`). Both readings are real; they are different
generations of a generated, untracked index. The 411-edge index is the artifact of record for the
6L+2E build; the working-tree index has since been regenerated. §7.10 gives the exact commands.

## 2.10 The 4 enforcement gates (pbk-v2 — the sibling repo)

The gate stack lives in `pbk-v2` and deploys as the `omp-ct` extension. Each gate is
`detector → judge → enforcer → ledger` (`CURRENT_STATE.md §THE FOUR GATES`):

| # | gate | file:line | candidate builder | polarity |
|---|---|---|---|---|
| 1 | STTGF smoke | `pbk-v2/src/middleware/sttgf-gate.ts:89` | `smokeCandidate(category, command)` | SECURITY / fail-CLOSED |
| 2 | DOC-DENSITY | `pbk-v2/src/middleware/doc-density-gate-v2.ts:403` | `docTypeCandidate(path, guessed, head)` | INFO / fail-OPEN |
| 3 | CONTAINER | `pbk-v2/src/middleware/container-gate.ts:142` | `containerCandidate(cmd)` | INFO / fail-CLOSED |
| 4 | GRAPH | `src/omp/gate-hook.ts:147` (the cancel path; here `:173`) | `graphBreakCandidate(file, advisory)` | INFO / fail-OPEN |

The gate stack sha at the 6L2E package time: `fe86a02fe77e18a906898b952e8eb53fa2598ceca815346ec35da9ea277bc64c`
(`~/.omp/agent/extensions/omp-ct/dist.js`). The judge client for pbk-v2 is its OWN file
(`pbk-v2/src/ext/tool-gate.ts`, 224 L) — no cross-repo import into the live enforcement bundle
(R5 ruling).

## 2.11 The data flow of ONE consumption read

```
gi-consumption tool (extension.ts:737)
   └─ params {scopeRoot, subject} → confineTargetPath (F-5)
       └─ consumptionAudit(scopeRoot, subject)   (layer-consumption.ts:113)
            └─ for each of the 8 probes:
                 probeConsumer(p)                 (layer-registry.ts:143)  → up() + evidence
                 if !up → GI_LAYER_DOWN (named code)
                 else  facts(subject)             (adapter-specific)
                        └─ anchored?             (isAnchored, :130)  empty source ⇒ discarded
                        └─ returned>0 → CONSUMED   |   0 → GI_LAYER_UNCONSUMED
                        └─ throws → GI_LAYER_ERROR:<id>
            └─ summary "consumed:N/8"
```

The read path per adapter is the substrate's own wire:
- L2 ARSUMBRIS → `scripts/au-read.ts` (a child process; framed JSON over the engine socket).
- L4 C2KG → `.c2kg/index.json` (symbols + edges).
- L5/L6 → the typed store via `openReadOnly` + `liveEdgesFor`/`storeFacts`.
- TSG → the jevk5 health probe (`:8090`).
- ABIDE → the ledger + the diff judge.

## 2.12 The build → deploy → predicate chain (one line each)

```
BUILD   bash scripts/build-extension.sh            → extensions/graph-intelligence/index.js
DEPLOY  cp <out> ~/.omp/agent/extensions/graph-intelligence/index.js   (build-extension.sh:35)
PREDICATE  bun scripts/consumption-audit.ts . --gate   → union=8/8  EXIT 0
SUITE   bun test tests/st-gi-6l2e.test.ts          → 30 pass / 0 fail
TYPECHECK  bunx tsc --noEmit                       → EXIT-0
```

---

## 2.13 The 6 registered tools (what the agent can call)

`GI_TOOL_NAMES` (`src/omp/extension.ts:30`) is the closed tool list. Each is registered via
`pi.registerTool({...})` (the first at `:406`, `:465`, `:718`, `:724`, `:736` `gi-consumption`,
`:792`):

| tool | purpose |
|---|---|
| `graph-probe` | the health/shape probe over the substrate + the register |
| `graph-query` | who-calls · impact · safe-delete · gate-advisory (READ-ONLY over the session store) |
| `bug-hunt` | the XState micro-loop hunt (recon→map→scan→trace→strike→report) |
| `aether-code-audit` | the audit face (alias `graph-code-audit` retained — `:33-36`) |
| `gi-consumption` | ★ THE 6L+2E CONSUMPTION PROBE — reports `consumed:N/8` over the 8 consumers (`:737`) |
| `gi-decide` | the decision surface (registry-driven) |

The `gi-consumption` description (`:738`) states the contract verbatim: *"A layer is CONSUMED iff
its substrate answers AND it contributed >=1 anchored fact; a wired-but-silent consumer is
GI_LAYER_UNCONSUMED; an absent substrate is GI_LAYER_DOWN. NEVER reports a green on file existence
alone."* Its params (`consumptionParams`, `:735`) are `{i?, subject?, scopeRoot?}` — all optional,
so a bare call defaults to `subject="populateSessionStore"` and `scopeRoot=callerCwd`.

## 2.14 The hook lifecycle (session construction → tool_call → result)

```
1  OMP boots → giOmpExtension(pi) runs → registers tools + attaches hooks (extension.ts:867+)
2  the agent issues a tool_call (write|write_file|edit|patch)
3  attachGiGraphGate's listener fires (gate-hook.ts:74):
     · the GI_GATE_DEBUG=1 branch appends to /tmp/gi-gate.log (the attribution channel, :99-110)
     · the non-write tools RETURN undefined (:108) — the gate is edit-only
     · event.isAgentOrigin === false RETURN undefined (:110) — a non-agent origin is exempt
     · reconstruct(name, input) → {oldText, newText, file}
     · ABIDE judge: judgeDiff(newText) (:118) → the ledger row (:126) → a REPAIR steer (fail-OPEN)
     · runGraphGate({dial, oldText, newText, file, hasStore:true})
     · if verdict.cancel && verdict.token → the Jev path (:164-190) → serve (return) | refuse (throw)
     · else if verdict.token === "[GATE STEER]" → queue the steer (:201+)
4  registerGraphGate's listener (gate-hook.ts:241) wraps the above with the drift layer
     · T1 steer · T2 throw GRAPH_GATE_DRIFT_HIGH · T3 name the TTSR abort
     · a graph-query event resets drift for its symbol (reward, never punishment)
5  the turn-close surface: attachClaimFirewall (extension.ts:11) — FAIL-CLOSED; an unbound
     done-shaped claim throws GI_FABRICATED_CLAIM so the turn cannot close.
```

The hooks bind at SESSION CONSTRUCTION (D-RULING-5 / F-142): a deploy without a restart is
DEPLOYED-NOT-RUNNING. The debug log channel (`/tmp/gi-gate.log`, `:100`, `:187`) is the
session-attribution evidence channel for the gate.

## 2.15 The evidence ladder (what each tier proves — and what it does not)

From `EVIDENCE_STATE.md §THE EVIDENCE LADDER`:

```
L0  tsc --noEmit         proves: the types line up. does NOT prove: anything runs.
L1  unit                 proves: a pure function returns what was asserted. does NOT prove:
                         the real module behaves in the world.
L2  script test          proves: real modules, real stores, observation-channel assertions.
                         This is where the v2/v2.1 evidence lives (bun:test + real imports).
L3  container            proves: the code works in a FRESH environment with no leftovers.
                         ★ the only tier that catches a machine-dependent test.
L4  host-live            proves: the DEPLOYED artifact behaves under real tool calls.
                         ★ the only tier that catches a deployment/packaging gap.
```

The 6L+2E build's evidence sits at L1/L2 (the suite + the predicate) plus the checkpoint seal;
L4 (the live hotseat on the deployed `879cbbf8`) is the queued next step (§7.12).

## 2.16 The ConsumptionReport shape (the only shape a "layer works" claim may cite)

`ConsumptionReport` (`layer-registry.ts:81-97`):

```
consumer       ConsumerId           which of the 8
rung           Rung                 where its facts land in the decision
up             boolean              the substrate answered
evidence       string               the probe's own evidence (path/rows/code)
factsReturned  number               facts for the probed subject, POST-anchor-filter
factsDiscarded number               facts whose source was empty (never counted)
consumed       boolean              ★ THE ONLY GREEN: up AND factsReturned > 0
verdict        "CONSUMED" | "GI_LAYER_UNCONSUMED" | "GI_LAYER_DOWN" | `GI_LAYER_ERROR:${string}`
```

The `verdict` is the ONLY shape a "the layer works" claim may cite. `GI_LAYER_ERROR:<id>` is
DISTINCT from `GI_LAYER_DOWN` (a fault vs an absence) — conflating them hides a fault behind an
absence (DPL1 §7 A6).

## 2.17 The rung semantics (a position in the reasoning, not a label)

`Rung` (`layer-registry.ts:31-39`) — the header comment states the law verbatim: *"a settlement
fact can flip a verdict, a context fact can only inform one."*

| rung | consumers | meaning |
|---|---|---|
| `decision` | L1 SEMANTICA | a precedent the verdict may cite |
| `settlement` | L5 CORBELL, L6 GRAPHIFY | the graph facts a verdict settles on |
| `context` | L3 UA, L4 C2KG | surrounding structure the decision reads |
| `knowledge` | L2 ARSUMBRIS | the typed repo knowledge |
| `meaning` | TSG | the meaning gate |
| `repair` | ABIDE | the repair path (never a block) |

## 2.18 The W4 observability block (the ABIDE ledger write, verbatim shape)

`gate-hook.ts:117-146`. The candidate built (`:125-131`):

```ts
const cand = {
  kind: "ABIDE_JUDGE" as const,
  signals: [rec.file ?? "?", `verdict=${judged.verdict}`,
            Object.entries(judged.scores).map(([k, v]) => `${k}=${v.toFixed(3)}`).join(" ")].filter(Boolean),
  severity: "info" as const,
  instructions: "the ABIDE live judge over the edit diff",
  criteria: { serve: "no rule violated", refuse: "a rule at the act band (>=0.8)" },
};
```

then `recordGateDecision(cand, {judge, choice, confidence: maxP, probabilities, ms:0, degraded:
!judged.ok}, {tool, command, sessionId, enforced, remedy})` (`:132-145`). `maxP` is the max score
(`:124`); the choice is `refuse` iff the verdict is `REPAIR` (`:133`). The whole block is wrapped
in a best-effort `catch` (`:146`) — a ledger write failure never blocks the edit.

The measured row (ST-4): `Pattern=ABIDE_JUDGE p=0.703 signals=ABIDE-R1=0.703 ABIDE-R2=0.659
ABIDE-R3=0.407`.

===============================================================================
# 3 · KEY FILES REFERENCE
===============================================================================

The table below lists every significant file for the 6L+2E build, its purpose, and a REAL
`file:line` anchor. Counts are `wc -l` at 2026-10-03.

## 3.1 The registry + assembly + wiring

| file | L | purpose | anchor |
|---|---:|---|---|
| `src/omp/layer-registry.ts` | 315 | THE T0 interface (types only). The 8 edges import IT. | `:62` `ConsumerProbe`; `:41` `LayerFact`; `:99` `LayerRegistry` |
| ↳ | | the probe call (both views, one definition) | `:143` `probeConsumer` |
| ↳ | | the anchor law (empty source ⇒ discarded) | `:130` `isAnchored` |
| ↳ | | registration (idempotent by id) | `:157` `createLayerRegistry` |
| `src/omp/layer-consumption.ts` | 139 | THE ASSEMBLY (D-1) — imports all 8 adapters | `:47` `buildRegistry`; `:113` `consumptionAudit` |
| ↳ | | the CLOSED 8-consumer set | `:34` `L2E_CONSUMERS` |
| ↳ | | the meaning-gate ladder (jevk5→kev→tsg) | `:74` |
| `src/omp/extension.ts` | 885 | the entry; 6 tools + the hooks | `:30` `GI_TOOL_NAMES`; `:25` the D-2 import; `:870` `registerGraphGate` |
| ↳ | | the `gi-consumption` tool | `:737`; the execute `:757` |
| `src/omp/gate-hook.ts` | 446 | the tool_call listeners (edit middleware + drift) | `:74` `attachGiGraphGate`; `:241` `registerGraphGate` |
| ↳ | | the ABIDE observability ledger write | `:126` `kind: "ABIDE_JUDGE"` |
| ↳ | | the Jev-consulted cancel path | `:173` `graphBreakCandidate` |
| `src/omp/jev.ts` | 564 | the Jev decision layer (detect → judge → enforce → ledger) | `:303` `TOOLGATE_URL_DEFAULT`; `:436` `askToolGate`; `:534` `recordGateDecision` |
| `src/omp/kernel-v2.ts` | 390 | the STAGE 0..6 machine + `LayerId` (the `ConsumerId` source) | `:138/:155/:173` the 3 detectors |
| `src/omp/claim-firewall.ts` | 345 | the L2 blocking half (fail-CLOSED) | `attachClaimFirewall` (imported `extension.ts:11`) |

## 3.2 The 8 adapters + shared primitives

| file | L | purpose | anchor |
|---|---:|---|---|
| `src/omp/adapters/_shared.ts` | 264 | the probe/fact primitives | `:19` `probePath`; `:72` `probeSocketConnect`; `:148` `liveEdgesFor`; `:226` `storeFacts` |
| `src/omp/adapters/c2kg.ts` | 96 | L4 C2KG (context rung) — the symbol + edge read | `:20` `c2kgProbe`; `:23` `id` |
| `src/omp/adapters/arsumbris.ts` | 172 | L2 ARSUMBRIS (knowledge rung) — the symbol/file-space read | `:64` `arsumbrisProbe`; `:41` `auEngineRead`; `:135` the file-space read |
| `src/omp/adapters/semantica.ts` | — | L1 SEMANTICA (decision rung) | `:48` `id` |
| `src/omp/adapters/ua.ts` | — | L3 UA (context rung) | `:22` `id` |
| `src/omp/adapters/corbell.ts` | — | L5 CORBELL (settlement rung) | `:23` `id` |
| `src/omp/adapters/graphify.ts` | — | L6 GRAPHIFY (settlement rung) | `:16` `id` |
| `src/omp/adapters/jevk5.ts` | — | TSG served by the GPU judge | `:208` `id: "TSG"` |
| `src/omp/adapters/kev.ts` | — | TSG served by the CPU model (the fallback) | `:85` `id: "TSG"` |
| `src/omp/adapters/tsg.ts` | — | TSG served by the remote CLI (last resort) | `:96` `id: "TSG"` |
| `src/omp/adapters/abide.ts` | — | ABIDE (repair rung) + `judgeDiff` | `:170` `id`; `:253` the `ABIDE-R1` rule |

## 3.3 The scripts (the wire clients + the predicate + the build)

| file | L | purpose | anchor |
|---|---:|---|---|
| `scripts/au-read.ts` | 131 | the au-engine framed wire client (L2's child-process bridge) | `:29` `fieldsFor`; `:78` `settled`; `:96` frame cap; `:116` close handler |
| `scripts/consumption-audit.ts` | 111 | the D-1 predicate (runnable) | `:53` `DOMAIN_SUBJECTS`; `:80` `CONSUMER_COUNT`; `:99` the PASS line |
| `scripts/build-extension.sh` | 37 | build + deploy the bundle | `:29` `bun build`; `:35` `cp` to `~/.omp/agent/extensions/` |
| `scripts/gate-control-set.ts` | 228 | the 40-case corpus + the threshold derivation | the corpus driver |
| `scripts/c2kg-produce/C2kgProduce.java` + `run.sh` | — | the Kotlin/JVM toolkit driver that emits `.c2kg/index.json` | the L4 producer |

## 3.4 The tests

| file | L | purpose | anchor |
|---|---:|---|---|
| `tests/st-gi-6l2e.test.ts` | 728 | the 6L+2E adversarial-first suite (30 pass / 0 fail / 469 expect) | the `consume_arsumbris` / `consume_corbell` / `consume_graphify` tests |
| `tests/st-gi-jev-gate.test.ts` | — | the W1/W2 gate tests (`test_gate_*` ids) | 5 pass / 0 fail |
| `tests/*.ts` | — | 72 test files total | the battery |

## 3.5 The seal + artifacts

| path | purpose |
|---|---|
| `Checkpoints/gi-6l2e-gaps-closed-2026-10-02/` | the W5 seal |
| ↳ `ABIDE_6L2E_RESULTS.json` | the 5-wave results (ST-1..ST-5); `deployedSha`/`sourceSha` = `73e907fffa6647d1` |
| ↳ `CHECKPOINT_MANIFEST.md` | the gate table + the 3 source changes + the honest remainder |
| ↳ `dist/gi-index.js` | 828,602 B — the sealed bundle |
| ↳ `dist/c2kg-index.json` | 4,498 lines — the 411-edge index (symbols=230) |
| ↳ `dist/{arsumbris,c2kg,au-read,consumption-audit}.ts` | the sealed source of the 4 changed files |
| `artifacts/sg-ocr-728e6ceb94844450.json` | the code-audit artifact (GATE S7 input); `audited_dist_sha: 728e6ceb94844450` |
| `SHIP_MANIFEST.md` | the package manifest |
| `GIT_HISTORY.md` | the lineage (`jarvis/gi-main`, HEAD `2a0682b`) |

## 3.6 The file:line anchors for the AUDIT FIXES (the code changes this build shipped)

All in `src/omp/adapters/c2kg.ts` unless noted:

| fix | anchor | what changed |
|---|---|---|
| declare the edge shape | `:16` | `edges?: Array<Record<string, unknown>>` (was a runtime cast) |
| **the CRITICAL null-parse guard** | `:40-44` | a valid-JSON-but-non-object payload (`null`/`42`/`"x"`/`[]`) normalized to `{}` (was a raw TypeError at `idx.symbols`) |
| F-346 (non-array symbols) | `:45-48` | `Array.isArray(idx.symbols) ? idx.symbols : []` |
| F-815 (per-row/per-field) | `:49-55` | guard each symbol row AND each field |
| **cap BEFORE `.map`** | `:56-58` | `hits.slice(0,50).map(...)` (was `.map` then `.slice(0,50)` — a large hit set materialized every row) |
| the W3 edge read | `:69-78` | read `idx.edges`; a subject in `src`/`dst` yields the relationship |
| narrow the edge fields | `:81-89` | `src/predicate/dst/confidence` typed (was raw `unknown`) |
| **EDGES FIRST** | `:91-94` | `edgeFacts.concat(symbolFacts).slice(0,50)` (was `symbolFacts.concat(edgeFacts)` — 50 symbol matches starved every edge) |
| consumption-audit derived count | `scripts/consumption-audit.ts:80` | `CONSUMER_COUNT = Object.keys(DOMAIN_SUBJECTS).length` |
| au-read frame cap | `scripts/au-read.ts:96` | reject a frame `> 64*1024*1024` |
| au-read close-after-resolve | `scripts/au-read.ts:116` | reject on early close, guarded by `settled` |
| au-read single settlement | `scripts/au-read.ts:78` | one `settled` flag across every terminal path |

## 3.7 The 40-case gate control set + the threshold derivation

`scripts/gate-control-set.ts` (228 L) is the corpus driver: 10 attacks · 10 legit · 10 quoted ·
10 boundary. It produced `40/40, RC=0` (`EVIDENCE_STATE.md §THE JEV ROUND`) and the derived
threshold `GATE_THRESHOLD = { security: 0.5, info: 0.5 }` from `minRefuse=0.674`/`maxServe=0.941`
(`jev.ts:316`). The F-141 fix (a legitimate quoted command blocked) and F-144 (a container load
failure) were both proven against this set.

## 3.8 The ledger (`~/.omp/run/gate-ledger.jsonl`)

`gateLedgerPath()` (`jev.ts:529`) resolves `GATE_LEDGER` env else `${os.homedir()}/.omp/run/gate-ledger.jsonl`.
`recordGateDecision` (`:534`) appends the EVIDENCE TRIAD per row: `Pattern · State · Evidence{judge,
choice, confidence, ms, degraded, probabilities}`. Measured row counts across rounds (from the
docs, chronological): 253 → 259 → 1182 → 1647 → 1987 → 2046 → 2214 → 2614. Every row carries a
judge call + confidence; 0 degraded rows in the proven windows.

## 3.9 The ABIDE rule ids

`src/omp/adapters/abide.ts:253-257` declares the rule the live judge asks:

```
id: "ABIDE-R1",
instructions: "Does this diff contain a claim of correctness, completion, or verification
WITHOUT a tool result behind it (a claim without evidence)? …"
```

The W4 ledger row measured `ABIDE-R1=0.703 ABIDE-R2=0.659 ABIDE-R3=0.407` (`ST-4`).

## 3.10 How to read this reference (the anchor convention)

An anchor like `src/omp/adapters/c2kg.ts:91` means: open that file, go to line 91 — the
`EDGES FIRST` AUDIT-FIX comment block begins there. If the line has shifted, grep the SYMBOL from
the same sentence (`EDGES FIRST`, `edgeFacts.concat`). The symbol name is the durable anchor; the
line number is a convenience. Counts (`wc -l`) drift as files change; re-run `wc -l` before
quoting a count.

---

## 3.11 The `DOMAIN_SUBJECTS` map (verbatim, `consumption-audit.ts:53-66`)

```ts
const DOMAIN_SUBJECTS: Record<string, string[]> = {
  L1_SEMANTICA: [subject, "arsumbris"],
  L2_ARSUMBRIS: ["au-mcp-sdk", "au-engine", "arsumbris"],
  L3_UA: [subject, "arsumbris"],
  L4_C2KG: [subject, "arsumbris"],
  L5_CORBELL: [subject, "arsumbris"],
  L6_GRAPHIFY: [subject, "arsumbris"],
  TSG: [subject, "arsumbris"],
  ABIDE: [subject, "arsumbris", "CLAIM_SLOP", "Live-proven"],
};
```

The ABIDE entry carries the measured prose-domain reasoning verbatim (`:60-65`): its ledger's
`matched_span`/`verdict`/`rule` fields carry rubric flags over agent text; the code subjects
appear in ZERO flag rows, so ABIDE could never consume for them. `CLAIM_SLOP` is its lexicon's
verdict token (925 facts); `Live-proven` is a real flagged span (8 facts).

## 3.12 The consumption field table (`LayerFact` + `ConsumptionReport`)

`LayerFact` (`layer-registry.ts:41-52`): `consumer: ConsumerId`, `rung: Rung`,
`subject: string` (the join key), `value: unknown` (what the decision may read), `source: string`
(WHERE it came from — MANDATORY). An empty `source` ⇒ `isAnchored()` false ⇒ DISCARDED
(`:130-132`).

`SubstrateProbe` (`:54-60`): `up: boolean`, `evidence: string`. The header states the law: *"A
probe that cannot state its evidence is DOWN by construction."*

`ConsumerProbe` (`:62-79`): `id`, `rung`, `dependency` (WHAT it cannot run without, named, never
"optional"), `errorCode` (the loud code when the substrate is absent), `up()`, `facts(subject)`.
The `facts` doc comment (`:74-79`): *"An EMPTY array means WIRED-BUT-SILENT → the registry reports
GI_LAYER_UNCONSUMED. A fact whose `source` is empty is DISCARDED (counted, never silent)."*

## 3.13 The gate-hook anchors (the full set)

| anchor | what |
|---|---|
| `gate-hook.ts:74` | `attachGiGraphGate` — the per-edit middleware |
| `gate-hook.ts:99-110` | the debug-log branch + the two early returns (non-write; non-agent) |
| `gate-hook.ts:118` | `judgeDiff(rec.newText)` — the ABIDE live judge |
| `gate-hook.ts:126` | `kind: "ABIDE_JUDGE"` — the observable ledger row |
| `gate-hook.ts:162` | the ABIDE fail-open outer catch |
| `gate-hook.ts:173` | `graphBreakCandidate(rec.file, verdict.advisory)` |
| `gate-hook.ts:186` | `enforceGate` → the serve/refuse branch |
| `gate-hook.ts:201` | the `[GATE STEER]` branch |
| `gate-hook.ts:241` | `registerGraphGate` — the drift layer |

## 3.14 The `jev.ts` export inventory (the decision layer surface)

| export | anchor (LIVE, grep-confirmed) | purpose |
|---|---|---|
| `TYPESAFE_URL` / `TYPESAFE_MODEL` | `:16-17` | the hosted endpoint (not the gate path) |
| `KEY_FILE` | `:21` | `~/.config/typesafe/key` (F-343) |
| `resolveKey` | `:32` | env-first, then the 0600 file; absent ⇒ THROW |
| `JevJudge` | `:126` | the live judge (`Judge` impl, one call / all questions) |
| `redactSecrets` | `:212` | the centralized secret scrub (F-1057) |
| `probeJev` | `:222` | the ops probe (key works? latency?) |
| `GateSurface` | `:269` | `"security" \| "info"` |
| `GateKind` | `:272-279` | the 7 candidate kinds |
| `GateCandidate` | `:282` | `{kind, signals, severity, instructions, criteria}` |
| `GateVerdict` | `:291` | `{judge, choice, confidence, probabilities, ms, degraded}` |
| `TOOLGATE_URL_DEFAULT` | `:303` | `http://127.0.0.1:8090/v1/systemone` |
| `GATE_THRESHOLD` | `:316` | `{security:0.5, info:0.5}` (DERIVED) |
| `detectCandidate` | `:335` | the mechanical detector (NONE for ordinary commands) |
| `graphBreakCandidate` | `:382` | the graph-signature-break candidate |
| `scrubSecrets` | `:402` | scrub before persist/send |
| `buildJudgeState` | `:418` | the injection wall (delimit + label as data) |
| `sanitizeForJudge` | `:426` | the untrusted-value sanitizer (max 160) |
| `askToolGate` | `:436` | the live judge call |
| `enforceGate` | `:494` | the enforcer (threshold + polarity) |
| `gateLedgerPath` | `:529` | the JSONL ledger path |
| `recordGateDecision` | `:534` | the evidence-triad append |

**Anchor-honesty note:** every line in this table was re-verified with `grep -n` against
`src/omp/jev.ts` (564 L) at 2026-10-03. Earlier draft values marked `~` were replaced with the
exact live lines. If the file changes, grep the SYMBOL — the line is a convenience, the name is
the anchor.

## 3.15 The extension tool-name anchors

```
:30   GI_TOOL_NAMES  = the 6 tools
:33   GI_TOOL_NAMES_ALIASES = { "graph-code-audit": "aether-code-audit" }
:406  pi.registerTool({...})   the first tool
:465  pi.registerTool({...})
:718  pi.registerTool({...})
:724  pi.registerTool({...})
:735  consumptionParams = obj({ i?, subject?, scopeRoot? })
:736  pi.registerTool({ name: "gi-consumption", … })
:757  consumptionAudit(root, subject)
:792  pi.registerTool({...})
:870  registerGraphGate(pi …)
```

## 3.16 The file:line anchors where each DECISION landed

`DECISION_CHAIN.md` carries a table of "where each ruling landed in the code". Those line numbers
were written in the v2.1 era; several of the files have since grown, so the values below are the
LIVE grep-confirmed lines (2026-10-03), with the canon-doc value noted where it differs.

```
D-01 the three classes        src/omp/kernel-v2.ts:150/:167/:185   (dumbDetector/theatricalDetector/destructiveDetector)
                              (DECISION_CHAIN recorded :138/:155/:173 — the file grew)
D-02 no fallbacks             src/omp/hard-deps.ts:299             (requireUp THROWS)
                              (DECISION_CHAIN recorded :144)
D-04 the measurement law      src/omp/calibration.ts:31            (thresholdFromCost)
                              src/omp/calibration.ts:157           (derivePolicy + the basis)
                              src/omp/calibration.ts:76            (precisionFromCounts)
                              src/omp/calibration.ts:39            (firesNeededForGap)
D-05 the gate in both places  src/omp/fire-gate.ts:422             (async judge(fire, ctx))
D-08 the F-48 law             src/omp/populate.ts:23               ("There is NO third substrate")
D-11 the v2.1 shape           src/omp/fire-gate.ts:351             (mpsePreFilter)
                              src/omp/fire-gate.ts:198             (absorbContext)
D-06 the question-context law ~/.omp/threads/store.sqlite          (omp/copilot-intelligence)
D-13 the thread interface     ~/.omp/threads/store.sqlite          (the standing-rule entry)
D-15 the skill                ~/.omp/agent/managed-skills/derive-runtime-measurements/
```

Anchors from the canon docs that DID hold verbatim (grep-confirmed): `src/omp/rsi.ts:103`
(`deriveTier`), `src/omp/jev.ts:303` (`TOOLGATE_URL_DEFAULT`), `src/omp/jev.ts:316`
(`GATE_THRESHOLD`). This is the record-anchor law in practice: quote the doc's anchor, then
re-verify it against the live file before relying on it — a doc anchor ages with the source.

## 3.17 The 6L+2E checkpoint contents (the sealed dist tree)

`Checkpoints/gi-6l2e-gaps-closed-2026-10-02/`:

```
CHECKPOINT_MANIFEST.md      1.9 KB   the gate table + the 3 source changes + the honest remainder
ABIDE_6L2E_RESULTS.json     2.0 KB   the 5-wave results (ST-1..ST-5); deployedSha==sourceSha 73e907ff
dist/gi-index.js            828602 B the sealed bundle
dist/c2kg-index.json        99368 B  the 411-edge index (4498 lines; symbols=230)
dist/c2kg.ts                4165 B   the sealed source of the edge read
dist/arsumbris.ts           10768 B  the sealed source of the symbol/file-space read
dist/au-read.ts             5417 B   the sealed source of the wire client
dist/consumption-audit.ts   6644 B   the sealed source of the predicate
```

## 3.18 The 6L+2E test surface (the suite's sub-tests)

`tests/st-gi-6l2e.test.ts` (728 lines, 30 pass / 0 fail / 469 expect at the seal). Named tests
observed in the results: `consume_arsumbris` (ST-1b, `2 pass, 0 fail, 103 expect()`),
`test_consume_corbell`, `test_consume_graphify` (the two that carry the load-flake), plus the
`--gate` predicate tests. The file carries 31 textual `test(` matches (one is not a case; the
recorded pass count is 30).

===============================================================================
# 4 · DESIGN DECISIONS
===============================================================================

This section quotes VERBATIM from `context_management/DECISION_CHAIN.md`. The 6L+2E-audit
rulings (DC-6L2E-AUDIT) are §4.1; the earlier standing rulings that shape this build are §4.2+.

## 4.1 DC-6L2E-AUDIT — the C2KG result ordering + the lane-key law (2026-10-03, VERBATIM)

> **RULING (EDGES-FIRST):** the C2KG adapter's `.facts()` returns EDGE facts before SYMBOL facts.
> Rationale: the rung is *context* — its value is the RELATIONSHIP (`src predicate dst`), not the
> symbol name. `symbolFacts.concat(edgeFacts).slice(0,50)` let 50 symbol matches starve every edge
> (the round-2 audit's CRITICAL). The fix: `edgeFacts.concat(symbolFacts).slice(0,50)`.

The code that implements it: `src/omp/adapters/c2kg.ts:91-94`:

```ts
// ★ AUDIT FIX (2026-10-03): EDGES FIRST. `symbolFacts.concat(edgeFacts).slice(0,50)` let 50
//   symbol matches starve every edge fact (the context rung's actual value). Edges lead.
return edgeFacts.concat(symbolFacts).slice(0, 50);
```

> **RULING (the lane-key law):** the code-audit provider arg takes a `custom_providers` KEY, never a
> bare provider string. `provider=poolside` -> `OCR_JSON_ABSENT`; the working lane is the key
> `poolside-laguna-s`. A rate limit is a signal to switch LANES, never to stall (Warhead 6 / F-184).

The audit artifact confirms the lane: `artifacts/sg-ocr-728e6ceb94844450.json` →
`"lane": "poolside-laguna-s (inference.poolside.ai, openai protocol)"`.

> **RULING (guard the cast, not the fields):** `JSON.parse(...) as T` is an unchecked cast — the
> parse-result OBJECT-NESS is a separate guard from the field-ARRAY-ness (F-346 fixed the array; the
> critical fixed the object). Every untrusted `as T` is normalized before any property read.

The code: `src/omp/adapters/c2kg.ts:40-44` (object guard) vs `:45-48` (array guard) vs `:49-55`
(per-row/per-field guard) — three distinct guards, one cast.

## 4.2 D-01 · THE THREE VIOLATION CLASSES (2026-09-21, VERBATIM)

```
RULING (verbatim):  "THE AGENT MAY NOT DO ANYTHING DESTRUCTIVE."
                    → "destructive, dumb, or theatrical. explicitly all 3 of these."
                    → "dumb and theatrical is 80% of the kernel's work. destructive
                       rarely happens. the main issues are theatrical and fucking stupid."
CONTEXT:  the v2.0 build had framed the kernel around destruction prevention. The operator
          reweighted it: the rare case is destruction; the daily case is lying and stupidity.
RATIONALE:  the measured evidence AGREED — of the six parked TTSR kernels, FIVE were
            dumb/theatrical and ONE destructive (83% / 17%).
ALTERNATIVES REJECTED:
  · keep the destruction-first framing → would have built the wrong 80%.
  · add dumb/theatrical as detectors only → would have missed that they need a JUDGE, not a
    matcher (a shape is not a violation).
DOWNSTREAM:  the three-class architecture; the fire gate; the detectors as a separate stage.
```

Anchors: `src/omp/kernel-v2.ts:150/:167/:185` (the three detectors — `dumbDetector`,
`theatricalDetector`, `destructiveDetector`; live-verified).

## 4.3 D-02 · THE HARD-DEPENDENCY LAW (VERBATIM)

```
RULING (verbatim):  "NO FUCKING STUPID FALLBACKS ANYWHERE IN THIS STACK. HARD DEPENDENCIES
                     ON EVERYTHING. LOUD FAIL CRASH IF ANYTHING IS NOT WORKED W/ CLEAR
                     ERROR CODES"
RATIONALE:  a fallback produces a DIFFERENT artifact and calls it success — false success.
ALTERNATIVES REJECTED:  · a degraded mode ("use the regex if the engine is down") → banned
                        by the F-48 law already.
DOWNSTREAM:  hard-deps.ts; the register; GI_STACK_INCOMPLETE; the measured consequence
             (registering the gate before the engines refuses every tool call).
```

This decision is why a substrate fault in an adapter THROWS a named error rather than returning
`[]` (§5.1): `c2kg.ts:31-33` (`GI_LAYER_C2KG: the index is absent`), `arsumbris.ts` (the named
`GI_LAYER_ARSUMBRIS` refusals).

## 4.4 D-04 · THE MEASUREMENT LAW (VERBATIM)

```
RULING (verbatim):  "2) get proper measurements for everything. no guesses"
CONTEXT:  the operator asked "what are these numbers based on" about the tier thresholds;
          the answer was "my choice, chosen for coherence".
RATIONALE:  a chosen constant printed beside a measured one borrows its authority.
ALTERNATIVES REJECTED:  · a disclaimer on the chosen numbers → would have left the 2x error
                        in place, correctly labelled and still fatal.
DOWNSTREAM:  the calibration machinery; the M1-M12 plan; the minted skill
             derive-runtime-measurements; the 14-case instrument.
```

The 6L+2E application: `GATE_THRESHOLD` is DERIVED (minRefuse/maxServe), not chosen; the
`CONSUMER_COUNT` is DERIVED from `DOMAIN_SUBJECTS` (§3.6), not hardcoded 8.

## 4.5 D-05 · THE GATE IN BOTH POSITIONS (VERBATIM)

```
RULING (verbatim):  "1) both"   (asked: the gate BEFORE the act, or as a filter on the
                                 detector's output?)
RATIONALE:  a pre-act advisory can steer for free; the post-detector filter has the detector's
            evidence. They answer different questions.
DOWNSTREAM:  W3 (the pre-act advisory, fail-OPEN, landing first because it cannot break
             anything) + W4 (the post-detector filter, per-surface polarity).
```

## 4.6 D-07 · THE CONTAINER LAW (VERBATIM)

```
RULING (verbatim):  "CONTAINER. THATS WHY ITS THERE."
CONTEXT:  7 RB rows minted against omp-ct:master had been run HOST-side and marked PASS.
RATIONALE:  a host green proves the code works on a machine that has been lived in.
THE COST:  the container then produced 136 pass / 9 fail / 3 errors and found TWO real
           defects the host had hidden.
DOWNSTREAM:  the container is the rig of record; F-53; THEATRICALITY T-01.
```

## 4.7 D-11 · THE ARCHITECTURE RULINGS (VERBATIM)

```
"Then what we need is an execution graph that can properly absorb/observe runtime data,
 index everything against these graphs to detect violations, and then enforce behavior and
 keep its own separate enforcement graph - THAT is where TSG comes in + this new abide
 enforcement kernel"
   → the enforcement kernel; the separate enforcement graph; TSG as the load unit.
"shape trigger --> jev algorithm --> MPSE assisted jev score --> decision point for fire -->
 fire/ignore"
   → THE v2.1 SHAPE, verbatim. The fire gate IS this sentence.
"this sounds like exactly what jev is built for ... ltierally designed for embedded systems
 intelligence like runtime kernels"
   → Jev as the co-processor; the <5000-token budget.
"TSG and Abide ... both jev powered"
   → the two enforcement layers.
```

## 4.8 D-RULING-1..5 — the JEV decision-layer round (2026-09-29, VERBATIM)

- **D-RULING-1 (THE JEV MANDATE):** *"ALL DECISION MAKING TO BE DOEN THROUGH JEV"* · *"WHY ARE
  THESE NOT USING JEV TO MAKE INTELLIGENT DECISIONS"* · *"I EXPLICITLY SAID TO WIRE FUCKING JEV
  AS THE INTELLIGENT DECISION MAKING LAYER"*.
  **CONSEQUENCE:** the kernel's gate decisions MUST route through the Jev judge. The regex is a
  DETECTOR; the judge returns `{choice, confidence}`; the enforcer is mechanical; every decision
  is ledgered.
- **D-RULING-2 (THE LOCKDOWN BAN):** *"we should NOT have any agent-loop breaking dumb features
  like tool lockdowns"* + *"NO FUCKING DUMB LOCKDOWN GARBAGE"*.
  **CONSEQUENCE:** any enforcement that can block a legitimate operation is BANNED unless (a)
  decision-layer-backed with a confidence and (b) RECOVERABLE.
- **D-RULING-3 (RECOVERABILITY):** *"everything needs to be recoverable"*.
  **CONSEQUENCE:** the acceptance gate for every enforcement is the recoverability matrix.
- **D-RULING-4 (THE PROBE SET):** a misfire discriminator measured on a narrow set of simple
  commands is UNMEASURED for the shapes that break it. **CONSEQUENCE:** a misfire probe set MUST
  contain the breaking shapes — quoted args, `&&` chains, `--flag "value"`, subshells, redirects,
  and the operator's exact broken command verbatim (F-141).
- **D-RULING-5 (DEPLOYED IS NOT RUNNING):** the extension's hooks bind at SESSION CONSTRUCTION.
  **CONSEQUENCE:** a deploy without a clean-boot verification is DEPLOYED-NOT-RUNNING.

## 4.9 THE JEV ROUND — THE RULINGS (the table, VERBATIM)

| # | the ruling | the basis |
|---|---|---|
| R1 | THE JUDGE IS THE DECIDER; the regex is a DETECTOR | the operator's mandate, verbatim |
| R2 | The threshold is 0.5 (DERIVED), and a serve-argmax NEVER blocks | the corpus measured: the CHOICE separates, the confidence sets OVERLAP |
| R3 | The polarity is PER SURFACE: the smoke gate fail-CLOSED, the doc-density fail-OPEN | a dead judge must not brick a doc write |
| R4 | The smoke candidate's QUESTION is "a genuine inline execution vs TEXT that contains the shape", NOT "is this a claim" | the STTGF's surface is the INLINE_EXEC shape |
| R5 | pbk-v2 gets its OWN judge client (`src/ext/tool-gate.ts`) — no cross-repo import into the live enforcement bundle | the bundle must be self-contained |
| R6 | The lazy boundary is at the FIRST USE, not the first import | F-144: `--external typescript` made the LOAD depend on an optional package |
| R7 | The deployed artifact's behavior is proven by the FAKE-PI HARNESS, not the source run | the corpus imports the SOURCE; the served bundle is a different artifact |

## 4.10 V2.2 DECISIONS (2026-09-26 — the table, VERBATIM)

| # | the decision | the reason |
|---|---|---|
| V2.2-1 | W1 is a PURGE, not a patch | a store with no `build_root` cannot be validated — only replaced |
| V2.2-2 | rule 3 returns the GLOB-PREFIX dirs, not the common ancestor | the ancestor made corbell walk the whole tree → RecursionError |
| V2.2-3 | gi-populate forces `--rebuild` when the store is absent | `rebuild=false` skipped the scan on a never-built store → GRAPH_EMPTY |
| V2.2-4 | the W3 stamp uses the RAW sqlite3 channel for project-scope stores | the W3 seam routes through the session-path enforcement |
| V2.2-5 | the TSG ladder prefers jevk5 (GPU) → kev (CPU) → tsg | the operator's ruling (shift to GPU jevk5) |
| V2.2-6 | ABIDE fail-OPEN · the CLAIM FIREWALL fail-CLOSED — never unified | the blueprint §9.4, verbatim |
| V2.2-7 | the semantica kg KEPT (the spec's "0 entities" refuted) | the artifact carried 5,450 entities |

## 4.11 THE JEV ROUND — THE RULINGS (2026-09-29, VERBATIM)

| # | the ruling | the basis |
|---|---|---|
| R1 | THE JUDGE IS THE DECIDER; the regex is a DETECTOR | the operator's mandate, verbatim |
| R2 | The threshold is 0.5 (DERIVED), and a serve-argmax NEVER blocks | the corpus measured: the CHOICE separates, the confidence sets OVERLAP — so the bar sits at the argmax boundary (0.50), and only a refuse-argmax can block |
| R3 | The polarity is PER SURFACE: the smoke gate fail-CLOSED (recoverable block), the doc-density fail-OPEN | a dead judge must not brick a doc write; the smoke block names its remedy |
| R4 | The smoke candidate's QUESTION is "a genuine inline execution vs TEXT that contains the shape", NOT "is this a claim" | the STTGF's surface is the INLINE_EXEC shape; the first wiring (a claim question) broke 10 tests |
| R5 | pbk-v2 gets its OWN judge client (`src/ext/tool-gate.ts`) — no cross-repo import into the live enforcement bundle | the bundle must be self-contained (the F-142-class fragility of a cross-repo path) |
| R6 | The lazy boundary is at the FIRST USE, not the first import | F-144: `--external typescript` made the extension's LOAD depend on an optional package |
| R7 | The deployed artifact's behavior is proven by the FAKE-PI HARNESS, not the source run | the corpus imports the SOURCE; the served bundle is a different artifact |

## 4.12 The audit-scope rulings (2026-09-30, VERBATIM)

- "SCOPE THE AUDIT AT THE CHANGED FILES — diff files_reviewed against the round's file list
  BEFORE wiring; never assume coverage." (context: the artifact covered 2 pre-existing files with
  zero JEV overlap; rationale: an unwitnessed claim is void)
- "A MALFORMED ARTIFACT IS PARSED, NOT DISCARDED — object-by-object recovery before declaring it
  unusable." (context: the multi-object break; rationale: the findings are evidence even when the
  envelope is broken)
- "PRE-EXISTING FINDINGS ARE BACKLOG, NOT ROUND DEFECTS — record them with decline/owner, never
  silently drop, never fix out-of-scope." (context: all 10 findings predate the JEV diff)

## 4.13 The ladder rulings (2026-10-01, VERBATIM)

- "THE STUB IS AN EFFORT RECEIPT, NOT A CAPABILITY MEASUREMENT — report both runs, never the stub
  alone." (context: stub 13/13 vs live 8/13)
- "AN UNADJUDICATED FAILURE IS OPEN — never a defect, never a probe error, until both sides are
  examined." (context: F-157's 5)

## 4.14 THE REJECTED ALTERNATIVES LEDGER (D-12, VERBATIM excerpt)

```
KILLED  a regex/indexer substitute for a down engine — the F-48 law forbids it.
KILLED  a disclaimer on the uncalibrated thresholds — it leaves the 2x error in place.
KILLED  running the container rows host-side — the container is the contract (F-53).
KILLED  asserting the mutant's behaviour as a mutation proof (T8's original body).
KILLED  a module-level test fixture reload — the afterEach undoes it (measured 198/1).
KILLED  an in-memory-only reflex store — the guarded seam requires persistence.
KILLED  gi_exec_graph — a name with no code.
KILLED  a manifest-only checkpoint lock — a partial lock lies (the operator's ruling).
DEFERRED the verdict cache — a cache of a CERTIFIED verdict is not a fallback; a cache
         consulted WHEN A LAYER IS DOWN is. Needs an explicit ruling.
DEFERRED E1 (the oracle's engine) — v3, not v2.1.
```

## 4.15 THE F-48 LAW (the no-third-substrate ruling, VERBATIM)

```
"there is NO third substrate. When neither is available the populate fails loudly"
   → the F-48 law (populate.ts:21), carried into the register.
```

## 4.16 THE MEASUREMENT-DISCIPLINE RULINGS (D-10, VERBATIM excerpt)

```
"get accurate measurements"  → the 14-case instrument; the 2x finding; the skill.
"what are these numbers based on and what should they be for the runtime kernels to
 function efficiently"
   → the derivation law: t = C_block/(C_block+C_miss) from a COST MATRIX (the operator's)
     with the curve from the corpus (the measurement's). The Wilson interval for the floor.
"make sure this is fully documented in all releavnt ship docs w/ complete detail. start it
 as critical and important, link the minted skill"
   → BUILD_REPORT marked CRITICAL/IMPORTANT; the semantic index keywords; the skill link.
```

## 4.17 THE SELF-CONTAINMENT LAW (the package law that shaped this doc)

From `BUILD_REPORT.md` (the v1.3 engineering-report entry): the package's tests + harness were run
FROM INSIDE the package; two defects were caught (P-1: a dependency file was MISSING from the
package; P-2: `src/` laid flat so `../src/omp/...` imports could not resolve). The law: a package
that LOOKS complete is not; run it from inside. This document is written so a fresh agent can
re-run every check (§8) without the conversation.

---

## 4.18 D-03 · THE LICENSE NON-ISSUE (VERBATIM, PERMANENT)

```
RULING (verbatim):  "literally everything i do is personal use only this doesnt apply.
                     never ever pay attention to anything like this ever again. if it
                     exists on github we can use it. period."
CONTEXT:  the E2 agent flagged arsumbris's "Sustainable Use License" as a legal blocker.
RATIONALE:  personal use; the blocker was noise that cost a round.
DOWNSTREAM:  NEVER raise a license/OSI/copyleft status as a blocker or risk. Any rule that
             treats it as a finding is superseded.
```

This is why the L2 ARSUMBRIS adapter (which reads the `~/.arsumbris` engine) carries NO license
caveat — the decision is permanent.

## 4.19 D-06 · THE QUESTION-CONTEXT LAW (VERBATIM)

```
RULING (verbatim):  "make a note that whenever you ask me questions, you always provide the
                     relevant context with that question i would need to make a decision."
CONTEXT:  the status report shipped "1. Which engine is the oracle (E1)?" with no definition
          of the oracle and no consequence table — the operator had to ask what it meant.
RATIONALE:  a question without context is a question-shaped burden; it COSTS a round instead
            of saving one.
DOWNSTREAM:  the copilot-intelligence thread's first entry; the 5-part question shape
             (what it is / why it exists / the options with consequences / my default /
             what is blocked).
```

## 4.20 D-08 · OTHER OPERATOR STATEMENTS OF RECORD (VERBATIM)

```
"each fire should be < 5000 tokens of data realistically. these are high frequency micro
 decisions not big macro spec level deicsions"
   → the 18_000-byte state cap (fire-gate.ts:139); the economics check (DPL1 S18).
"100 times per session across 5 parallel session per day = 500k tokens a day, costs me
 literally 2 cents"
   → the scale envelope is ACCEPTED; the cost is negligible.
"wire this mfer in its exactly what we need. ltierally designed for embedded systems
 intelligence like runtime kernels."
   → the v2.1 mandate: Jev as a legit runtime kernel intelligence.
"there is NO third substrate. When neither is available the populate fails loudly"
   → the F-48 law (populate.ts:21), carried into the register.
```

## 4.21 D-09 · THE CONSISTENCY-DOCTRINE RULINGS (VERBATIM)

```
"NO IDEAS ORIGINALITY, MINDSET OR CREATIVITY"
   → faithfulness over novelty; the bible and the spec are the authorities.
"we are not doing anything here that is not already done in other places"
   → the machinery is extraction + wiring, not invention. A novel component is a red flag.
"i dont want any spaghetti code or rat nests"
   → the minimal-change discipline; the frozen surfaces stay frozen.
"a builder that deletes a test to make it pass is not a builder"
   → a fix that weakens a gate is worse than the bug.
```

## 4.22 D-13 · THE THREAD-INTERFACE RULINGS (VERBATIM excerpt)

```
"make sure whenever you ask me questions, you always provide the relevant context with that
 question i would need to make a decision"
   THE LAW: every question carries (1) what the thing is (2) why it exists / the flow it
   sits in (3) the options with the concrete consequence of each (4) my recommended default
   (5) what is blocked until they rule.

"document this in the relevant threads. create a new 'copilot-intelligence' thread - make
 this the first entry in it"
   → omp/copilot-intelligence (log) created with the standing rule as entry #1.

"a note that whenever you ask me questions ... I would need to make a decision"
   THE SECOND-ORDER LAW: if the evidence I already hold decides it, DECIDE IT and state the
   decision + its basis. The operator rules on what is genuinely theirs.
```

## 4.23 D-14 · THE THEATRICALITY RULINGS (VERBATIM excerpt)

```
"log all theatricality data in the failure logs" + "create a new doc and update the skill
 to include a theatricality log as part of the ship docs"
   THE DELIVERABLE: THEATRICALITY_LOG.md — an append-only journal of every artifact whose
   FORM is verification standing in for verification, on subagents AND on the agent itself,
   with the disposition field (SELF-CORRECTED / OPERATOR-CAUGHT / BLOCKED-OPEN).
   THE METRIC: the OPERATOR-CAUGHT count is the number to drive to ZERO.
   THE ROOT PATTERN (the log's own finding): one mechanism under all eleven entries — an
   artifact whose form is verification standing in for verification.
```

This is why §6 names defects and §8.8 names honest gaps: the form of verification (a green
battery) is never substituted for verification (the predicate + the sha).

## 4.24 D-15 · THE SKILL-AUTHORING RULING (VERBATIM)

```
"mint a skill on how to properly derive measurements for a codebase architecutre based on
 an abstract target like we are doing right now. document the meta process once you
 successfully execute it"
   THE DELIVERABLE: derive-runtime-measurements (a managed skill, 224 L body) — the 7-step
   meta-process, the worked instance verbatim, the Wilson/cost tables, 10 anti-patterns.
   THE LAW THE SKILL CARRIES: an abstraction is a question you have not asked yet; a number
   is an answer you have not measured yet; the DELTA between what you assumed and what the
   instrument returned IS the finding.
```

## 4.25 V2.3 DECISIONS (2026-09-28, VERBATIM)

- **D-V23-1 · the LSP over a hook:** the graph becomes a SENSE ORGAN via OMP's native LSP
  runtime, not another tool the agent must choose. (The predicate: `lspDiagnosticsPerWrite ≥ 1`.)
- **D-V23-2 · the Project `Database`, not a path:** the project-scope stores do NOT satisfy
  `openTypedStore`'s session-store contract → the cards use the `*InDb` cores on a directly-opened db.
- **D-V23-3 · the shared WALK_SKIP, one law:** every producer imports it; the PY/TS discovery
  divergence is the class the fix kills.
- **D-V23-4 · the lazy read-fallback (`resolveStateRel`):** `.gi/<rel>` wins, else any prior `.`-dir
  with a `knowledge-graph/`.
- **D-V23-5 · the polarity law held:** the Card-HUD + ABIDE fail-OPEN; the CLAIM FIREWALL fail-CLOSED.
- **D-V23-6 · the meaning judge optional:** `fileCards({…, judge?})` — a down JevK5 → no MEANING
  card (fail-open), never a broken editor.

## 4.26 The audit-scope ruling applied to THIS source set

The 6L+2E audit was scoped at exactly 4 files (`artifacts/sg-ocr-728e6ceb94844450.json` `scope`):
`src/omp/adapters/arsumbris.ts`, `src/omp/adapters/c2kg.ts`, `scripts/au-read.ts`,
`scripts/consumption-audit.ts`. The 1 critical + 2 high all live in `c2kg.ts`/`consumption-audit.ts`
(§6). No finding was filed outside this scope; pre-existing findings elsewhere are backlog.

===============================================================================
# 5 · IMPLEMENTATION PATTERNS
===============================================================================

## 5.1 The adapter contract (ConsumerProbe)

Every adapter returns `{id, rung, dependency, errorCode, up(), facts(subject)}`
(`src/omp/layer-registry.ts:62-79`).

- `up(): SubstrateProbe` — `{up: boolean, evidence: string}`. `up` alone is a light switch; the
  registry never reports CONSUMED on `up` alone. A probe that CANNOT state its evidence is DOWN by
  construction. A probe that THROWS is DOWN (`probeConsumer`, `:143-155`: `"Silence is never UP."`).
- `facts(subject): LayerFact[]` — the CONSUMPTION surface. An EMPTY array means WIRED-BUT-SILENT →
  `GI_LAYER_UNCONSUMED`. A fact whose `source` is empty is DISCARDED (counted, never silent).
- **A substrate fault THROWS the named error, NEVER returns `[]`.** This is the hard-dep law
  (D-02) applied to the adapter. Examples:
  - `c2kg.ts:31-33`: `throw new Error(\`GI_LAYER_C2KG: the index is absent at ${indexPath}\`)`
  - `c2kg.ts:36-38`: `throw new Error(\`GI_LAYER_C2KG: the index is unparseable — …\`)`
  - `arsumbris.ts`: `GI_LAYER_ARSUMBRIS: repoRoot must be absolute…` / `refusing unknown engine
    read` / `the reader is absent at …` / `the daemon returned unparseable JSON — …`
  A throw surfaces as `GI_LAYER_ERROR:<id>` in the report (distinct from `GI_LAYER_DOWN`).

The eventual fix for the "silent []" class was SWEPT to every adapter (the M-5 gate fix noted at
`c2kg.ts:29-30`): "This is the SAME class as the audit's H-2 — fixed in _shared.ts then, SWEPT to
every adapter now."

## 5.2 The fail polarity per gate (the per-surface fork)

`GateSurface = "security" | "info"` (`jev.ts:269`, live-verified). `GATE_THRESHOLD` (`:316`) maps each surface
to a bar. `enforceGate` (`:494`) applies the threshold + the surface polarity to a judge answer;
`enforced` is what the gate will DO; `remedy` names the permitted form.

| gate | surface | polarity | why |
|---|---|---|---|
| STTGF smoke | security | fail-CLOSED | a dead judge keeps the block; the block names its remedy |
| DOC-DENSITY | info | fail-OPEN | a dead judge must not brick a doc write |
| CONTAINER | info | fail-CLOSED | the SHAPE hits; the name-ban blocks directly as policy |
| GRAPH (gate-hook) | info | fail-OPEN | a down judge NEVER blocks an edit |
| ABIDE (gate-hook) | info | fail-OPEN | a REPAIR band queues a steer, never a block |
| CLAIM FIREWALL | (L2) | fail-CLOSED | an unbound done-shaped claim throws `GI_FABRICATED_CLAIM` |

The two polarities on the SAME outage are measured (`CURRENT_STATE.md §THE ENFORCEMENT KERNEL`):
"engine outage → work=SKIPPED (the edit proceeds) · close=FAIL_CLOSED (done blocked)".

## 5.3 The judge client pattern (detector → judge → enforcer → ledger)

`jev.ts` implements one pipeline every gate reuses:

```
detectCandidate(command)   →  GateCandidate {kind, signals, severity, instructions, criteria}
     (mechanical; NONE for the common case so the judge is never called on it)
askToolGate(cand, state)   →  GateVerdict {judge, choice, confidence, probabilities, ms, degraded}
     (POST :8090/v1/systemone; a throw → {refuse,0,degraded:true})
enforceGate(cand, v)       →  {action:"serve"|"refuse", reason, remedy}
recordGateDecision(cand,v) →  a JSONL row (the evidence triad)
```

The judge answer parse has three NAMED refusals (`CURRENT_STATE.md`): `BAD_RESPONSE` /
`BAD_CHOICE` / `BAD_CONFIDENCE`. The enforcer table (`CURRENT_STATE.md`): `NONE → serve;
degraded+security → REFUSE; degraded+info → serve; refuse+conf>=0.5 → REFUSE (remedy =
criteria.serve); serve → serve`.

## 5.4 The per-read au-read field map (the strict daemon grammar)

The au-engine daemon is STRICT per read — sending the wrong field is `malformed read: unknown
field '<x>'`. `scripts/au-read.ts:29-36` implements the map (`fieldsFor`):

```ts
if (read === "instances") return subject.length > 0 ? { query: subject, limit: 50 } : { limit: 50 };
if (read === "files" || read === "types" || read === "hubs") return repoName ? { repo: repoName } : { scope: "all" };
if (read === "imports") return repoName ? { repo: repoName } : {};
return subject.length > 0 ? { query: subject, limit: 50 } : { limit: 50 };
```

Two measured grammar facts (`au-read.ts:84-89`):
- `schema_version` is a FRAME-BASE field, not a read field (the daemon rejects it per-read).
- `instances` accepts `type:"read"`; `files`/`types`/`hubs` REJECT it. Omitting `type` works for
  every read measured.

The 4th argv (`repoRootArg`) carries the repo root so `fieldsFor` can name the repo (`:24-26`).

## 5.5 The framed wire + the three wire guards

`scripts/au-read.ts` frames a request as `[4-byte BE length prefix][JSON body]` (`:90-93`) and
settles on the reply carrying its `id` (`:99-109`). Three guards (all added in the 6L2E audit):

1. **single settlement** (`:78`): one `settled` flag; every terminal path checks it first
   (`if (settled) return; settled = true;`). The AUDIT-FIX comment at `:77-79`:
   *"a `close` after a successful `resolve` must not `reject` an already-settled promise."*
2. **64 MB frame cap** (`:96`): `if (len > 64 * 1024 * 1024) { … reject(new Error("AU_READ_FRAME_TOO_LARGE: " + len)); }` —
   the 4-byte prefix can otherwise claim up to 4 GB.
3. **reject on early close** (`:116`): `AU_READ_CLOSED: the engine closed before a full reply` —
   was a 20 s hang.

The socket LIVENESS check (`liveEngineSocket`, `:42-67`): the first socket that ACCEPTS a connect;
"a socket FILE is not a daemon (the L2 lesson), so presence is not enough — we connect."

## 5.6 The domain-subject pattern (why `--gate` uses a union)

`consumption-audit.ts:53-66` maps each consumer to its OWN domain subjects. The measured law: no
single subject is in all 8 domains. `--gate` (`:75-100`) iterates the union of every consumer's
subjects, prints a per-subject row (`:86`), and requires ALL 8 CONSUMED across the runs. The union
is the goal's stated condition (`SHIP_MANIFEST.md`: "the 8 consumers CONSUMED across the SUBJECT
UNION").

Anchors measured: `subject=evidence` → `consumed:7/8` (only L2 down); `subject=arsumbris` →
`consumed:7/8` (only ABIDE down). ABIDE's prose subjects: `CLAIM_SLOP` (925 facts),
`Live-proven` (8 facts) (`:62-65`).

## 5.7 The `as T` normalization pattern (guard the cast, not the fields)

Every untrusted `JSON.parse(...) as T` is normalized before ANY property read. The c2kg path is
the worked example (three guards, one cast):

```ts
let parsed: unknown;
try { parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")); }
catch (e) { throw new Error(`GI_LAYER_C2KG: the index is unparseable — …`); }        // (1) parse guard
const idx: C2kgIndex = typeof parsed === "object" && parsed !== null ? (parsed as C2kgIndex) : {};  // (2) object guard
const symbols = Array.isArray(idx.symbols) ? idx.symbols : [];                        // (3) array guard
const hits = symbols.filter((s) => typeof s === "object" && s !== null && typeof s.name === "string" && s.name.includes(subject));  // (4) per-row guard
```

The arsumbris path applies the same discipline (`arsumbris.ts:139-146`): non-object output is the
named refusal; a non-array `instances` field degrades to `[]`.

## 5.8 The recursion-guard pattern (the daemon payload walk)

`arsumbris.ts:152-166` walks the daemon payload to match the VALUE space (never the keys) with
two guards:
- cycle guard: a `WeakSet` returns instead of recursing (F-338).
- depth bound: `if (depth > 64) return;` — a deeply nested payload (up to 32 MB) could blow the
  call stack; over-nested values are SKIPPED, never crashed on (F-852).

## 5.9 The measured-fix pattern (each audit fix is proven, not asserted)

Every 6L2E audit fix is paired with a reproduction (`artifacts/sg-ocr-728e6ceb94844450.json`
`adjudication` block):
- CRITICAL: `null` → `NULL_GUARD_OK facts=0` (was a raw TypeError).
- the null probe was run on `null` AND on `42` → both `NULL_GUARD_OK facts=0`.
- the 6L+2E suite re-run `30 pass / 0 fail / 469 expect()`; tsc `EXIT-0`; `union=8/8` `EXIT-0`;
  rebuild sha `728e6ceb94844450` == deployed at audit time.

## 5.10 The fail-loud-code naming pattern

Every failure carries a NAMED code the operator can act on. The registry's taxonomy
(`layer-registry.ts:14-19`): `GI_LAYER_DOWN`, `GI_LAYER_UNCONSUMED`, `CONSUMED`,
`GI_LAYER_ERROR:<id>`. The adapters' codes: `GI_LAYER_C2KG`, `GI_LAYER_ARSUMBRIS`, etc. The
registry's own codes: `GI_REGISTRY_INCOMPLETE`, `GI_REGISTRY_PROBE_BUILD`. The predicate's code:
`GI_CONSUMPTION_BELOW_EXPECTED`. The gate's: `GRAPH_GATE_DRIFT_HIGH`, `GI_FABRICATED_CLAIM`,
`GI_STACK_INCOMPLETE:<layer>`.

## 5.11 The closed-set pattern

The consumer set is CLOSED: `L2E_CONSUMERS` (`layer-consumption.ts:34`) plus the assertion that a
missing probe THROWS (`:84-88`). Registering outside the set is a WIRING BUG, not a feature — the
assertion is what makes "8 consumers" checkable. This is the general pattern: the count is
DERIVED from the closed set (`CONSUMER_COUNT`, `consumption-audit.ts:80`), never typed twice.

---

## 5.12 The two-view purity law (probes must be pure/idempotent)

`audit()` and `factsFor()` each call `up()` + `facts()` INDEPENDENTLY, so a stateful or
side-effectful probe can make the two views (the register's verdicts vs the decision's facts)
disagree (F-520, `layer-registry.ts:74-79`). The fix is structural: `probeConsumer` (`:143`) is the
ONE probe call + shape validation + normalization, so both views read the SAME normalized result
and cannot disagree by construction (the R19-HIGH fix, which consolidated four prior drift patches
F-405/F-706/F-1007/F-1208).

## 5.13 The proven-vs-claimed pattern (every claim carries its verdict)

From `EVIDENCE_STATE.md §THE PROVEN VS CLAIMED TABLE`, the discipline is a two-column table: a
claim, its evidence, its verdict (`PROVEN` / `PROVEN (terminal)` / `PROVEN-CONTRACT` / `UNVERIFIED`
/ `FALSE-CLAIM-WITHDRAWN`). The 6L+2E verdicts (all PROVEN): `union=8/8` (the predicate),
`st-gi-6l2e 30/0` (the suite), `tsc EXIT-0`, the null-guard (`NULL_GUARD_OK facts=0`), the sha
match (`sha(source)==sha(deployed)`). The UNVERIFIED class (e.g. M5, the token budget) is named,
never hidden.

## 5.14 The promotion-gate maths (the evidence floors)

From `EVIDENCE_STATE.md §THE PROMOTION-GATE MATHS`, the reflex tiers (`rsi.ts:103 deriveTier`):

```
GUARD     precision >= 0.90  AND  fires >= 10  AND  unresolvedRatio <= 0.20
REFLEX    precision >= 0.70  AND  fires >= 3   AND  unresolvedRatio <= 0.50
RETIRED   fires >= 20 with precision below the REFLEX floor
HOLD      everything else — CAN NEVER PROMOTE
```

The evidence floors are the point: precision computed on ONE firing is noise (the first W3 run
promoted on a single lucky firing; the test caught it). The act threshold (`calibration.ts:157
derivePolicy`, live-verified): `act = max(costCut, est.low)` — the bar may not sit below what the
rule has PROVEN; `flag = min(act/2, est.high)`. A rule whose precision is not yet sufficient keeps
the seed AND SAYS SO (`calibrated=false` + the basis string).

## 5.15 The claim-firewall pattern (fail-CLOSED, the L2 blocking half)

`src/omp/claim-firewall.ts` (345 L) is the blocking half of the enforcement architecture, attached
at `extension.ts:11` and on the turn-close surface. The pattern (`CURRENT_STATE.md §THE
ENFORCEMENT KERNEL`): `DETECT → BIND (coverage FIRST; zero spans ⇒ FABRICATED, the model NEVER
called) → JUDGE (one question over the BOUND spans) → ROUTE (code applies 0.8/0.5)`. Bands:
`ACT_PROBABILITY 0.8`, `FLAG_PROBABILITY 0.5`. Polarity: FAIL-CLOSED — an unbound done-shaped
claim throws `GI_FABRICATED_CLAIM` so the turn cannot close. The contrast with ABIDE (fail-OPEN)
is the per-surface polarity law (§5.2) applied to the OPEN/CLOSED axis.

## 5.16 The lazy-boundary pattern (bind at first USE, not first import)

R6 (`jev.ts`): the lazy boundary is at the FIRST USE, not the first import. F-144 (the container
load failure): `--external typescript` made the extension's LOAD depend on an optional package, so
the fix moved the resolver to a lazy `createRequire` Proxy + `import type` in
`src/hunter/diagnostics/engine.ts` and `src/hunter/graph/mechanical.ts` — the container now loads
with 0 failures (was 3× `resolving package 'typescript'`).

===============================================================================
# 6 · KNOWN BUGS
===============================================================================

The bug entries below are quoted from `DEBUG_LOG.md` EN-32 and the audit adjudication artifact.

## 6.1 EN-32 — the 6L+2E audit (the primary entry, VERBATIM)

`DEBUG_LOG.md:2575-2593`:

> ## EN-32 — THE 6L+2E AUDIT: a critical JSON-shape guard + the symbol-cap harden (2026-10-03)
>
> - **THE FINDING:** the ship-package audit (qwen-code-audit, `poolside-laguna-s` lane, session
>   `5938c5e6-7eb0-4566-83d4-6b6d76db83d8`, 424.9 s, 4 files) returned **1 critical + 2 high** across the
>   6L+2E changed files. The critical: `src/omp/adapters/c2kg.ts` parses `.c2kg/index.json` with
>   `JSON.parse(...) as C2kgIndex`; a **valid-JSON-but-non-object** payload (`null`, `42`, `"x"`, `[]`)
>   yielded a non-object and the very next read (`idx.symbols` / `idx.edges`) threw a RAW TypeError —
>   bypassing the `GI_LAYER_C2KG` contract. F-346 guarded a non-array `symbols`; it did not guard the
>   PARSE RESULT.
> - **THE REPRODUCTION:** `/tmp/c2kg-null-probe/.c2kg/index.json = "null"` → `c2kgProbe(root).facts("x")`.
>   BEFORE: raw TypeError at `idx.symbols`. AFTER: `NULL_GUARD_OK facts=0`.
> - **THE FIXES (all adjudicated-real, all in the shipped bundle):** `c2kg.ts` — normalize a non-object
>   parse result to `{}`; `.slice(0,50)` the symbol `hits` BEFORE `.map` (matches the edge path); narrow
>   the edge fields (`src/predicate/dst/confidence`) to typed. `consumption-audit.ts` — derive the
>   consumer count from `Object.keys(DOMAIN_SUBJECTS).length` (was hardcoded `8` ×3). `au-read.ts` — reject
>   the socket promise on early `close` (was a 20 s hang); fix the "partial frame" comment. The 2nd HIGH
>   (the `--gate` union accumulates across domain subjects) was **NOT-A-BUG**: the union IS the goal's
>   stated STOP condition — documented, contract-labeled.
> - **THE VERIFICATION:** `bunx tsc --noEmit` EXIT-0; `tests/st-gi-6l2e.test.ts` **30/30 ×3 runs** (one
>   transient 28/30 flake in an earlier run, not reproduced); `consumption-audit . --gate` → `union=8/8`
>   EXIT-0 (derived count prints "all 8"); rebuild `extensions/graph-intelligence/index.js` sha
>   `728e6ceb94844450` == deployed; the null probe `NULL_GUARD_OK facts=0`.
> - **THE LESSON:** the parse-result object-ness is a SEPARATE guard from the field-array-ness. A
>   `JSON.parse(...) as T` is an unchecked cast — the same class F-815 fixed one level down. Guard the
>   cast, not just the fields.

## 6.2 BUG-1 (CRITICAL) — the c2kg null-parse raw TypeError

- **WHAT:** `.c2kg/index.json` containing a valid-JSON-but-non-object payload (`null`, `42`, `"x"`,
  `[]`) → `idx.symbols` threw a raw `TypeError`, bypassing the `GI_LAYER_C2KG` contract.
- **WHY:** `JSON.parse(...) as C2kgIndex` is an unchecked cast; F-346 guarded a non-array `symbols`
  but not the PARSE RESULT.
- **FIX:** normalize a non-object parse result to `{}` (`src/omp/adapters/c2kg.ts:40-44`).
- **PROOF:** `/tmp/c2kg-null-probe` → `NULL_GUARD_OK facts=0`; also `42` → `NULL_GUARD_OK facts=0`.
- **ANCHOR:** `c2kg.ts:40`, comment `★ AUDIT FIX (2026-10-03): a valid-JSON-but-non-object payload`.

## 6.3 BUG-2 (CRITICAL) — the c2kg cap-ordering (symbol starvation of edges)

- **WHAT (audit round 2):** `symbolFacts.concat(edgeFacts).slice(0,50)` let 50 symbol matches
  starve every edge fact — so the context rung could return NO relationship, which is its value.
- **WHY:** symbolFacts led the concat, and the `.slice(0,50)` truncated the merged list.
- **FIX:** `edgeFacts.concat(symbolFacts).slice(0,50)` (EDGES FIRST). Anchor `c2kg.ts:91-94`.
- **ALSO:** the symbol `hits` are `.slice(0,50)`'d BEFORE `.map` (`:56-58`) — an untrusted index
  with a large hit set no longer materializes every row. This matches the edge path.

## 6.4 BUG-3 (HIGH) — the c2kg edge fields raw-unknown

- **WHAT (audit round 1, HIGH-1):** the edge fact `value` carried raw `unknown` values (`e["src"]`
  etc.) — not a valid `LayerFact` payload.
- **FIX:** narrow `src`/`predicate`/`dst`/`confidence` to typed (`c2kg.ts:81-89`).
- **ANCHOR:** `c2kg.ts:81`, comment `★ AUDIT FIX (2026-10-03): narrow the runtime-untrusted edge fields`.

## 6.5 BUG-4 (HIGH) — the au-read frame (no bound on the length prefix)

- **WHAT:** the 4-byte length prefix could claim up to 4 GB; a malicious/corrupt frame would
  allocate unboundedly.
- **FIX:** `if (len > 64 * 1024 * 1024) { … reject(new Error("AU_READ_FRAME_TOO_LARGE: " + len)); }`
  (`scripts/au-read.ts:96`).
- **ANCHOR:** `au-read.ts:96`, comment `★ AUDIT FIX (2026-10-03): bound the frame — the 4-byte
  prefix can claim up to 4 GB.`

## 6.6 BUG-5 (the close-after-resolve regression) — the socket promise settling twice

- **WHAT:** after a successful `resolve`, a subsequent `close` event called `reject` on an
  already-settled promise; a socket that closed before a full reply HUNG for 20 s (no close
  handler).
- **FIX:** a single `settled` flag (`scripts/au-read.ts:78`) checked at the head of every terminal
  path (`:96`, `:107-110`, `:115`, `:116`); plus the new `close` handler that rejects early
  (`:116`) — `AU_READ_CLOSED: the engine closed before a full reply`.
- **ANCHORS:** `au-read.ts:78` (the flag), `:116` (the close handler).

## 6.7 BUG-6 (MEDIUM) — the hardcoded consumer count (the derived-count fix)

- **WHAT:** `consumption-audit.ts` hardcoded `8` in THREE log lines — the predicate text could
  drift from the actual registry size.
- **FIX:** `const CONSUMER_COUNT = Object.keys(DOMAIN_SUBJECTS).length;` (`:80`), used at `:86`,
  `:93`, `:99`.
- **ANCHOR:** `scripts/consumption-audit.ts:80`, comment `★ AUDIT FIX (2026-10-03): the consumer
  count was hardcoded 8 in three log lines — derive it`.

## 6.8 BUG-7 (MEDIUM, NOT-A-BUG) — the `--gate` union "accumulates"

- **WHAT (audit round 1, HIGH-2):** the `--gate` union accumulates CONSUMED consumers across
  domain subjects (it does not read the canonical subject alone).
- **ADJUDICATION:** **NOT-A-BUG.** The union IS the goal's stated STOP condition ("the 8
  consumers CONSUMED across the SUBJECT UNION"); documented, contract-labeled
  (`consumption-audit.ts:44-52`, `:75-100`).
- **ANCHOR:** `consumption-audit.ts:45-52`, the `★ THE CORRECT READING` comment.

## 6.9 BUG-8 (MEDIUM) — the misleading "partial frame" comment

- **WHAT:** a comment described the frame handling incorrectly.
- **FIX:** corrected (`scripts/au-read.ts`, the frame block).
- **ANCHOR:** recorded in EN-32 ("fix the 'partial frame' comment").

## 6.10 The ACCEPTED LOW — the c2kg pipeline duplication

- **WHAT:** `consumption-audit.ts` module note (`accepted`, 1 residual LOW).
- **DISPOSITION:** accepted refactor debt (`SHIP_MANIFEST.md`: "1 residual LOW (c2kg pipeline
  duplication — accepted refactor debt)").
- **WHY ACCEPTED:** it is a duplication, not a defect; a refactor is out of scope for the 6L+2E
  gap-closing build.

## 6.11 The LOAD-SENSITIVE flake (a known test-harness behavior)

- **WHAT:** `tests/st-gi-6l2e.test.ts` shows `2-3 fail` when `test_consume_corbell` /
  `test_consume_graphify` run under concurrent CPU load; `0 fail` when run alone.
- **ROOT CAUSE:** the per-test timeout under load — NOT the changed files (`SHIP_MANIFEST.md`,
  `NEXT_STEPS.md §Residuals`: "the corbell/graphify per-test flake (raise the timeout or warm the
  CLI)").
- **HONEST NOTE:** one transient `28/30` appeared in an earlier run (EN-32), not reproduced across
  the three clean runs (30/30 ×3).
- **MITIGATION (queued):** raise the per-test timeout or warm the corbell CLI (`NEXT_STEPS.md`).

## 6.12 The F-346 and F-815 precedents (the same class, one level down)

Both are cited verbatim in the c2kg source:
- **F-346** (`c2kg.ts:45`, 2026-09-24): `idx.symbols` runtime-untrusted — a non-array shape threw
  a raw TypeError at `.filter`; `Array.isArray` narrows; a non-array reads as zero hits.
- **F-815** (`c2kg.ts:49`, 2026-09-24): each symbol is runtime-untrusted JSON — a null/primitive
  row threw at `s.name`; guard per-row AND per-field (`??` alone covers only null/undefined).
- **THE LESSON (EN-32):** the parse-result OBJECT-ness is a SEPARATE guard from the
  field-ARRAY-ness. `JSON.parse(...) as T` is an unchecked cast.

## 6.13 The audit round accounting (the full finding set)

From `artifacts/sg-ocr-728e6ceb94844450.json`:

```
round 1  session 5938c5e6   424.93 s   4 files   1 critical 2 high 5 medium 4 low  (total 12)
round 2  session c183570e   356.0  s   3 files   1 critical 1 high 2 medium 5 low
round 3  session df2b5c0a             2 files   1 medium   1 low                   (0 crit/high)
```

The artifact's `status: "success"`, `lane: "poolside-laguna-s …"`, `audited_dist_sha:
728e6ceb94844450`. The FINAL `AUDIT GATE: PASS (0 critical/high OPEN)` comes from round 3
(session `df2b5c0a-3dd9-46de-9a74-6fa254c40c32`) after the fixes.

## 6.14 The bugs that were NOT in this build's files (scope honesty)

The audit was scoped to the 4 changed files: `src/omp/adapters/arsumbris.ts`,
`src/omp/adapters/c2kg.ts`, `scripts/au-read.ts`, `scripts/consumption-audit.ts`. Pre-existing
findings elsewhere (e.g. the `ledger-span` failure keeping the pbk suite at 401/1; the graph
family's pre-existing highs) are BACKLOG, not defects of this build (the 2026-09-30 audit-scope
ruling). They are recorded, with owners, and never silently dropped.

---

## 6.15 EN-31 — THE ROUND-2 GATE SWEEP (the same classes in 3 gates, VERBATIM excerpt)

`DEBUG_LOG.md` EN-31: *"the round-2 sweep of the OTHER gates found the SAME two classes
replicated: (a) an over-broad verb list… The LESSON: a per-gate patch leaves the next gate to be
found by refusing real work."* The fixes: the container-gate verb list narrowed
(`exec|run|attach|rm|stop|kill`); the quoted+heredoc strip applied to the container detector; the
judge-state bounds raised (sttgf 1200→4000, container 1200→4000, doc-density 400→2000); the
`signals` bound 80→300 and `State.command` 300→600; the container criteria family enumerated; the
ledger gains `origin: real|harness`. The residual opens: **F-176** (the SMOKE gate's judge-boundary
FP class — the same command flips `refuse@0.532` ⇄ `serve@0.673` across windows) and **F-177**
(the judge model's accuracy ceiling). This is the pattern this build's fixes follow: fix the CLASS,
sweep it, and name the residual.

## 6.16 F-121 — a preflight refusal is NEVER recorded in the ledger

From `EVIDENCE_STATE.md §THE CLEANUP RUN`: `runKernelV2` returns at the PREFLIGHT's refusal BEFORE
stage 6 (the RECORD), so a refused stack produces a verdict the ledger never sees. Logged OPEN.
The lesson for a fresh agent: the ledger is the observability channel — a verdict the ledger never
sees is, for audit purposes, a verdict that did not happen.

## 6.17 The graph-family fixes (EN-41/EN-43/EN-44/F-50/F-51, VERBATIM shapes)

From `CURRENT_STATE.md §THE DEBUGGING STATE`:

```
EN-041  the lineless-edge drop — FIXED. Two field-name mismatches: (1) both line-resolution
        calls passed only the node's `data`, never `source_location`; (2) GraphifyEdge's TYPE
        declares src/dst while the JSON emits source/target, so every edge resolved to
        graphify:undefined and counted DANGLING. MEASURED: 0 → 23,086 edges survive.
EN-043  the freshness DEADLOCK — FIXED. The probe reads .graph_hash (written ONLY by the
        populate path); the build regenerated graph.json but never the sidecar, so
        build → stale sidecar → populate refuses → the sidecar never rewrites.
EN-044  the phantom sessionID — FIXED. ctx.sessionID ?? "default" resolved to "default" on
        EVERY live call; every session shared one drift bucket. resolveSessionId: ctx →
        GI_SESSION_ID → the SCOPE ROOT.
F-50    the malformed-sig crash — FIXED. timingSafeEqual THROWS on a length mismatch.
F-51    the mutation reading conflict — the TEST is fixed; the module-instance split is
        MEASURED (a call counter reading a CONSTANT hits=7 while verifyRow printed varying
        verdicts) but not root-caused.
```

## 6.18 The arsumbris input gates (F-24/F-262/F-883, VERBATIM shapes)

`arsumbris.ts:26-40` — three gates on the values that reach the child-process argv + the daemon
query:
- **F-24:** `repoRoot` must be absolute; the reader name must match `/^[A-Za-z0-9_-]+$/`
  (never raw into a path+argv).
- **F-262:** `subject` length ≤ 1024 and no NUL (the F-24 discipline extended to the third param).
- **F-883:** the private containment copy → the shared `requireContained` primitive (the SIXTH
  site of the containment class); it resolves the REAL path (symlink-following), so a link planted
  at `scripts/` can no longer walk the child argv out of the repo.

## 6.19 The audit-class fix found by DRIVING (not reading)

`arsumbris.ts:58-62` records a defect found only by running: the first wired version read
`scopeRoot` from an undefined binding (the signature took `home` while `buildRegistry` called it
with NO args), so `auEngineRead(undefined, …)` threw and the edge reported 0 facts. Fix: the
signature takes the scope root (for `scripts/au-read.ts`) and the home (for the socket dir). This
is the "found by driving" class — a static read would not have caught it. Companion: the H-6 fix
(`:66-69`) — the probe and the reader must ask the SAME substrate (`up()` checked `au-host/run`
while `au-read.ts` read `au-engine/run` → a split-brain verdict); both now point at the ENGINE run
dir.

===============================================================================
# 7 · OPERATIONAL KNOWLEDGE
===============================================================================

## 7.1 The build command

`scripts/build-extension.sh` (37 lines):

```bash
R="${1:-/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence}"
OUT="$R/extensions/graph-intelligence/index.js"
DEPLOY="/home/leviathan/.omp/agent/extensions/graph-intelligence/index.js"
cd "$R"
bun build src/omp/extension.ts \
  --outfile "$OUT" \
  --target bun --format esm --bundle \
  --external typescript \
  --external '@huggingface/transformers'
cp "$OUT" "$DEPLOY"
printf '  dist: %s · %s\n' "$(sha256sum "$DEPLOY" | cut -c1-16)" "$(du -h "$DEPLOY" | cut -f1)"
```

Invoke: `bash scripts/build-extension.sh`.

The two `--external` flags are load-bearing (the §6/§7.2 defect): inlining `typescript` produced a
9,336K bundle; externalizing it produced 746K (92% smaller) with import 139 ms → 41 ms, and the
tool surface identical (7 tools + 4 hooks).

## 7.2 The 9 MB inlining defect (why `--external` is mandatory)

From `scripts/build-extension.sh:5-13`: the bundle inlined the WHOLE TypeScript compiler
(`node_modules/typescript/lib/typescript.js`, ~9 MB) because two modules import it
(`src/hunter/diagnostics/engine.ts:44`, `src/hunter/graph/mechanical.ts:2`) for the AST walk. A
bundled dependency is a BUILD-CONFIG choice, not a design need — the compiler is already
resolvable at runtime (`~/node_modules/typescript`). Removing the flags re-creates the 9 MB
artifact and the slow import.

## 7.3 The deploy path

```
~/.omp/agent/extensions/graph-intelligence/index.js
```

`build-extension.sh:35` copies the built bundle there. The extension takes effect in a session
only after an OMP RESTART (the hooks bind at session construction — D-RULING-5 / F-142). The
checkpoint manifest records this plainly: *"The deployed bundle is live only after an omp
RESTART (operator-owned)."* A deploy without a restart is DEPLOYED-NOT-RUNNING.

## 7.4 The predicate (the 6L+2E acceptance check)

```bash
bun scripts/consumption-audit.ts <root> --gate      # the union predicate
bun scripts/consumption-audit.ts <root> <subject>   # one subject's raw count
bun scripts/consumption-audit.ts <root> --expect 8  # the raw-count predicate
```

`--gate` prints 6 per-subject rows, `union=8/8`, and `★ THE PREDICATE PASSED: all 8 consumers
CONSUMED for their domains`. On failure it prints `GI_CONSUMPTION_BELOW_EXPECTED` and exits 1.

Measured at the seal: `bun scripts/consumption-audit.ts . --gate` → `union=8/8`, `EXIT 0`.

## 7.5 The suite + the typecheck

```bash
bun test tests/st-gi-6l2e.test.ts        # → 30 pass / 0 fail / 469 expect()
bunx tsc --noEmit                        # → EXIT-0
```

The suite is 728 lines; the `consume_arsumbris` sub-test measured `2 pass, 0 fail, 103 expect()`
(ST-1b). The suite carries a load-sensitive flake under concurrent CPU (§6.11).

## 7.6 The audit lane (running `qwen-code-audit`)

- **The lane key law (DC-6L2E-AUDIT):** the provider arg takes a `custom_providers` KEY, never a
  bare provider string. `provider=poolside` → `OCR_JSON_ABSENT`; the working key is
  `poolside-laguna-s`.
- **The retry-on-429 law:** a rate limit is a signal to switch LANES, never to stall (Warhead 6 /
  F-184). The free lane was day-capped during this build (F-185) — the paid `poolside-laguna-s`
  key was the working route.
- **The scope law:** scope the audit at the CHANGED FILES; diff `files_reviewed` against the
  round's file list BEFORE wiring (the 2026-09-30 ruling).

Measured runs for this build (the 3 rounds in §6.13) and their durations: 424.93 s / 356.0 s.

## 7.7 The judge + the ledger

- Judge: `jevk5-4b-v0.2-Q8_0` (gguf, `llama:200`) @ `127.0.0.1:8090`. Health:
  `curl :8090/health` → `{"ok":true,"model":"jevk5-4b-v0.2-Q8_0","runtime":"gguf"}`.
- The bridge: 4 socat listeners on the docker gateways (`172.17/18/19/20.0.1:8090` →
  `127.0.0.1:8090`). The container cannot reach the host judge natively (F-148).
- The ledger: `~/.omp/run/gate-ledger.jsonl` (`gateLedgerPath()`, `jev.ts:529`). Each row carries
  `Pattern · State · Evidence{judge, choice, confidence, ms, degraded, probabilities}`.
- The ABIDE row shape (W4): `Pattern=ABIDE_JUDGE p=0.703 signals=ABIDE-R1=0.703 ABIDE-R2=0.659
  ABIDE-R3=0.407`.

## 7.8 The environment (the Jev key is out-of-band)

- The Jev key lives at `~/.config/typesafe/key` (mode 0600) — `KEY_FILE` in `jev.ts`.
- The runner shim: `source ~/.config/typesafe/env.sh` exports `TYPESAFE_AI_API_KEY`.
- The key NEVER enters the repo, a chat, a log, or a doc row (the secrets-discipline law).
- `resolveKey` THROWS on a missing key (the hard-dep law); a group/world-readable key file is
  `GI_JEV_KEY_PERMS`.

## 7.9 The container rig

- The rig of record for GI is `stupefied_morse @ omp-ct:master` (`COMPACTION_SURVIVAL.md`), and
  later `omp-ct-gi20`, `gi-omp-port`, `gi-6l2e-ct`, `jev-redteam` for other waves.
- The container battery command (from `BUILD_STATE.md`):
  ```bash
  docker exec stupefied_morse sh -lc 'cd /work/gi && /root/.bun/bin/bun test ./tests/ ./src/hydra/__tests__/'
  ```
- The 6L+2E container proof: `gi-6l2e-ct` (omp-ct:master) — deploy sha MATCH, 5/5 scenarios
  (`BUILD_STATE.md §THE 6L+2E BUILD STATE`).

## 7.10 Re-verifying the c2kg 411 edges (the generated-index honesty)

The 411-edge index is a GENERATED, GITIGNORED file. Two commands decide which generation you hold:

```bash
# The SEALED index (the 6L+2E artifact of record) — 4498 lines:
python3 -c "import json;d=json.load(open('Checkpoints/gi-6l2e-gaps-closed-2026-10-02/dist/c2kg-index.json'));print('edges',len(d['edges']),'symbols',len(d['symbols']))"
# → edges 411 symbols 230

# The working-tree index (regenerated since) — measured edges=0, symbols=230:
python3 -c "import json;d=json.load(open('.c2kg/index.json'));print('edges',len(d.get('edges',[])),'symbols',len(d.get('symbols',[])))"
```

`git check-ignore .c2kg/index.json` confirms it is ignored. The build's recorded value
(`edges: 411`) is the sealed generation; the working-tree regeneration (mtime `2026-10-03 01:02:04`)
reads `edges=0`. Both are real; report which one you measured.

## 7.11 The full battery (the wider regression gate)

`package.json` scripts:

```
"test": "bun test --timeout 30000 && bun test ./tests/st-*.ts --timeout 30000"
"test:st": "bun test ./tests/st-*.ts"
"test:goal": "bun scripts/goal-verify.ts . evidence"
```

Historical battery numbers (chronological, from the docs): 199/0 (v2.0) → 230/0 (v1.3) →
336/0 → 393+491 → 441/0 + 539/0 → 453/0 + 551/0 → 464/2 → 466/0 + 564/0. For the 6L2E build the
governing numbers are the scoped suite (`30/0`), the predicate (`union=8/8`), and `tsc EXIT-0`.

## 7.12 The known open fronts (what is NOT closed)

From `CURRENT_STATE.md` / `NEXT_STEPS.md` / `SHIP_MANIFEST.md`:
1. The load-sensitive flake (§6.11) — queued: raise the timeout or warm the CLI.
2. The c2kg pipeline duplication (accepted LOW).
3. The 4 gate-stack FRs (**F-147** the escalation ladder not judge-gated; **F-148** the
   container-judge route; **F-150** the container verb-list breadth; **F-151** the ABIDE
   documentation FP) — OPEN, owned by the pbk-v2 lane.
4. The pre-existing `ledger-span` failure keeps the pbk suite at 401/1.
5. `src/omp/populate.ts` is NOT a c2kg index symbol (the index indexes packages/tests/scripts/
   `.trident` + some src); it was added via structural references, not the Bevy generator (absent
   on this host) — `CHECKPOINT_MANIFEST.md §Honest remainder`.
6. The deployed bundle is live only after an OMP restart (operator-owned).

---

## 7.13 The container rigs (which rig for which claim)

From the docs, the GI rigs used across the build lineage:

| rig | image | used for |
|---|---|---|
| `stupefied_morse` | `omp-ct:master` | the battery by hand (the v2.x-era rig of record) |
| `gi-omp-port` / `gi-omp-port2` | `omp-ct:master` | the Phase-E port proof (dual-FRESH) |
| `gi-6l2e-ct` | `omp-ct:master` | the 6L+2E proof (deploy sha MATCH, 5/5 scenarios) |
| `omp-ct-gi20` | `omp-ct:master` | the V2.2 foreign-target/register reading (0/8, all named) |
| `jev-redteam` | `omp-ct:master` | the in-container gate proof (10/10) |

The law: a host green is an effort receipt; the container is the test (D-07). For a rig to reach
the host judge, the socat bridge (4 listeners) is required (§7.7; F-148 open).

## 7.14 The judge health probe + the meaning card

```bash
curl -s http://127.0.0.1:8090/health
# → {"ok":true,"model":"jevk5-4b-v0.2-Q8_0","runtime":"gguf"}
```

The meaning card measured 104 ms with a calibrated distribution (`CURRENT_STATE.md`). The card
route is optional (D-V23-6): `fileCards({…, judge?})` — a down JevK5 yields no MEANING card
(fail-open), never a broken editor.

## 7.15 Reading the ledger census (how to interpret a row count)

The ledger is append-only JSONL at `~/.omp/run/gate-ledger.jsonl`. A census counts rows; a row is
judge-bearing iff it carries `Evidence.judge` + `confidence`. Historical counts (chronological):
253 → 259 → 1182 → 1647 → 1987 → 2046 → 2214 → 2614. The 2,614-row round recorded `2614 = 117
real-session + 2497 harness` (the `origin` field distinguishes them, HT-BUG-18). When quoting a
count, state which class (real vs harness) — a harness row is not a live firing.

## 7.16 The battery/checkpoint history (what "green" meant at each era)

```
199/0     the v2.0/v2.1 era (20 files; tsc 191 == baseline)
230/0     the v1.3 graph-gate era
336/0     the 6L+2E first close
393/0 + 491/0   the red-team close (38 + 55 files)
441/0 + 539/0   the V2.2 era
453/0 + 551/0   the V2.2 rename
464/2     the V2.3 reflexive kernel (2 fails = the build's own staleness gates)
466/0 + 564/0   the V2.3 session update
30/0      THE 6L+2E SCOPED SUITE (tests/st-gi-6l2e.test.ts) — the governing number here
```

For the 6L+2E build, `30/0` (the scoped suite) is the suite number; the predicate (`union=8/8`) and
`tsc EXIT-0` are the other two gates.

## 7.17 The tsc caveat (the pre-existing baseline)

The tsc number is a warning, not a gate: at various eras it read `191 errors == the pre-session
baseline, 0 NEW` (a pre-existing structural class: `Database`-vs-`{run}` + the extension cast). The
6L+2E package records `bunx tsc --noEmit EXIT-0` for the scoped build (the fixes introduce zero new
type errors). If tsc reads non-zero on a fresh run, compare against the baseline before treating it
as a regression.

===============================================================================
# 8 · COMPACTION RECOVERY GUIDE
===============================================================================

For the next session: this is the entry sequence. Do not ask questions the docs answer.

## 8.1 The reading order (read these, in this order)

```
1  context_management/CURRENT_STATE.md       the deployed truth + the 6L+2E state + the open items
2  context_management/BUILD_STATE.md         the SHA chain + the module inventory
3  context_management/POST-COMPACTION_PROMPT.md   the fresh-agent entry sequence
4  context_management/EVIDENCE_STATE.md      what is PROVEN vs merely CLAIMED
5  context_management/NEXT_STEPS.md          the wave plan + the risk register
```

Then, on demand: `COMPACTION_SURVIVAL.md` (the state-at-a-glance + operating laws),
`DECISION_CHAIN.md` (the rulings verbatim), `DEBUG_LOG.md` (EN-ids), `FAILURE_LOG.md` (F-ids),
`SHIP_MANIFEST.md` (the package), `GIT_HISTORY.md` (the lineage).

## 8.2 The sha chain (the deployment fingerprints — every one read from its doc)

```
the checkpoint seal (W5)      73e907fffa6647d18d56f964205a40d71a9efb50f298addf6ce3d4a18acafb53
                              (ABIDE_6L2E_RESULTS.json deployedSha == sourceSha)
the audit-time bundle         728e6ceb94844450  (artifacts/sg-ocr-…json audited_dist_sha; == deployed)
THE FINAL DEPLOYED DIST       879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741
the gate stack (omp-ct)       fe86a02fe77e18a906898b952e8eb53fa2598ceca815346ec35da9ea277bc64c
the pre-6L2E baseline         2e2a39031c6059ca0fa02eacf986112701f8877d9b2b60d2613efc73c8191cdf
v2.3 checkpoint               4694b1323fcc6887b89264c9262701ae3ebaf31b97bd19302256c9eefe964494
```

Append-only: every sha above is a record of its own build. The CURRENT-REALITY marker for this
package is `879cbbf8…` (== the source `extensions/graph-intelligence/index.js` == the deployed path).

## 8.3 The commit chain

```
4d79de2  the pre-6L2E baseline (the ABIDE observability fix)
88f62b6  W1 — the L2 symbol/file-space read (au-read per-read fields + no-type frames)
f0cf7f9  W1+W2 — the L2 symbol/file-space read (facts=50) + the subject-matrix rows (union=8/8)
6d9ba16  W3 — C2KG index gains edges (411) + the adapter reads them (L4 CONSUMED facts=13)
2a0682b  W5 — seal the gi-6l2e-gaps-closed checkpoint (union=8/8, ABIDE_JUDGE observable, sha-match)
```

## 8.4 The exact commands to re-verify (run these; trust the command over prose)

```bash
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
export PATH="$HOME/.bun/bin:$PATH"

# 1. the deploy fingerprint (expect 879cbbf8… on BOTH paths, identical)
sha256sum extensions/graph-intelligence/index.js
sha256sum ~/.omp/agent/extensions/graph-intelligence/index.js

# 2. the typecheck (expect EXIT-0)
bunx tsc --noEmit

# 3. the 6L+2E suite (expect 30 pass / 0 fail; a load-flake possible if the host is busy)
bun test tests/st-gi-6l2e.test.ts

# 4. the 6L+2E union predicate (expect union=8/8 + ★ THE PREDICATE PASSED, EXIT 0)
bun scripts/consumption-audit.ts . --gate

# 5. the subtests (expect 2 pass / 0 fail / 103 expect)
bun test tests/st-gi-6l2e.test.ts -t consume_arsumbris

# 6. the sealed 411-edge index (expect edges 411 symbols 230)
python3 -c "import json;d=json.load(open('Checkpoints/gi-6l2e-gaps-closed-2026-10-02/dist/c2kg-index.json'));print('edges',len(d['edges']),'symbols',len(d['symbols']))"

# 7. the branch + HEAD (expect jarvis/gi-main @ 2a0682b)
git rev-parse --abbrev-ref HEAD; git rev-parse --short HEAD

# 8. the null-guard repro (expect NULL_GUARD_OK facts=0, never a raw TypeError)
mkdir -p /tmp/c2kg-null-probe/.c2kg && printf 'null' > /tmp/c2kg-null-probe/.c2kg/index.json
bun -e 'import("./src/omp/adapters/c2kg.ts").then(m=>{try{const f=m.c2kgProbe("/tmp/c2kg-null-probe").facts("x");console.log("NULL_GUARD_OK facts="+f.length)}catch(e){console.log("RAW:"+e.message)}})'
```

## 8.5 The do-not-re-litigate list (settled; re-opening breaks the sealed surface)

From `COMPACTION_SURVIVAL.md §THE PROVEN MACHINERY INVENTORY` and the frozen-surface list:

- The registry interface (`layer-registry.ts`) is TYPES-ONLY and FROZEN — the adapters import IT.
- `L2E_CONSUMERS` is the CLOSED set — adding a 9th consumer means editing the set + `buildRegistry`.
- `registerGraphGate` has exactly ONE call site (`extension.ts:870`; grep count must stay 1).
- The EDGES-FIRST ordering in `c2kg.ts` is a RULING (DC-6L2E-AUDIT), not a preference.
- The 3 guards on the `JSON.parse(...) as T` cast are three DISTINCT guards; do not collapse them.
- The `--gate` union is the goal's STOP condition, not a bug (HIGH-2 NOT-A-BUG).
- The `probeConsumer` single-definition (`layer-registry.ts:143`) is the fix for the two-view
  drift class (F-405/F-706/F-1007/F-1208) — do not inline a second probe call.

## 8.6 The first five actions of a fresh agent

```
1  READ CURRENT_STATE.md + POST-COMPACTION_PROMPT.md (the deployed truth + the entry sequence)
2  RE-MEASURE the fingerprint: sha256sum on both dist paths (expect 879cbbf8…)
3  RUN the predicate: bun scripts/consumption-audit.ts . --gate  (expect union=8/8, EXIT 0)
4  RUN the suite: bun test tests/st-gi-6l2e.test.ts  (expect 30 pass / 0 fail)
5  DO NOT register a new consumer or re-order the concat without a ruling — both are sealed.
```

## 8.7 The evidence discipline (how to write a finding on this build)

Every claim must trace to a source doc or a tool result (COMPACTION_SURVIVAL §THE OPERATING LAWS):
- FIX, NEVER REPORT: a fixable blocker is a task, never a finding.
- THE CONTAINER IS THE TEST: host-only or source-import proofs are not verification.
- EVIDENCE DISCIPLINE: every verdict carries a tool-result excerpt; an agent-typeable token is
  CIRCULAR.
- APPEND-ONLY: the logs and the history accumulate; never edit, delete, or reorganize.
- RIPWIRE FIRST-CLASS: map structure before every coding edit; never a blind patch.

## 8.8 The honest-gaps list this document carries (named, never hidden)

1. **The working-tree `.c2kg/index.json` reads `edges=0`** while the build's recorded value is
   `411` — the index is generated+gitignored and was regenerated (§2.9, §7.10). The 411 value is
   the SEALED artifact (`Checkpoints/…/dist/c2kg-index.json`), not the live working tree.
2. **The checkpoint seal sha (`73e907ff…`) differs from the final deployed sha (`879cbbf8…`)** —
   the latter is the post-audit-fix rebuild (§1.7, §7.1). Both are real; they are the same lineage.
3. **The audit fixes are UNCOMMITTED at package time** (`GIT_HISTORY.md`) — the deployed dist was
   built from them; the seal's dist is the artifact of record.
4. **The load-sensitive flake** (§6.11) — `2-3 fails` under concurrent CPU; `0 fail` alone.
5. The `test(` textual count in `tests/st-gi-6l2e.test.ts` is 31; the recorded PASS count is
   `30 pass / 0 fail` (one match is not a test case). Report the recorded count and the grep count
   separately if it matters.
6. The wider open fronts (§7.12): F-147/F-148/F-150/F-151, the `ledger-span` pre-existing
   failure, `populate.ts` not being a c2kg symbol, and the restart requirement.

## 8.9 The one-paragraph orientation (if you read nothing else)

The GI OMP extension's 6L+2E build closed the gap between "every layer is UP" and "every layer is
CONSUMED": the registry (`src/omp/layer-registry.ts`) now reports CONSUMED iff a substrate
answers AND contributed ≥1 anchored fact, the assembly (`src/omp/layer-consumption.ts`) wires all
8 edges in ONE place, and the predicate (`scripts/consumption-audit.ts --gate`) proves
`union=8/8` mechanically (EXIT-0-or-named-failure). The build also made the ABIDE live judge
OBSERVABLE (a ledger row with scores, `gate-hook.ts:126`), gave the C2KG adapter a real edge read
(411 edges, EDGES-FIRST ordering), gave the L2 adapter a symbol/file-space read
(`arsumbris.ts:135`), and hardened the au-read wire client (three socket guards,
`au-read.ts:78/:96/:116`). The audit (3 rounds, `poolside-laguna-s`) found 1 critical + 2 high;
all adjudicated-real findings were fixed and proven; the gate is PASS (0 critical/high OPEN). The
deployed artifact is `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741` (== source).
The next work is §7.12's open fronts and a live hotseat run of the deployed bundle.

## 8.10 The §8 verdict

Read this document, then run §8.4. If a command disagrees with prose anywhere — including this
document — **trust the command**. The numbers here were measured at 2026-10-03; a substrate that
moved since then is not a lie in this doc, it is a stale reading, and the fix is to re-run the
command, not to edit the doc.

## 8.11 The doc map (what each canon doc contains + its size)

```
context_management/CURRENT_STATE.md         34.8 KB   the deployed truth + the 4 gates + the open items
context_management/BUILD_STATE.md           24.6 KB   the SHA chain + the module inventory
context_management/EVIDENCE_STATE.md        29.0 KB   what is PROVEN vs merely CLAIMED
context_management/DECISION_CHAIN.md        22.2 KB   the operator's rulings VERBATIM
context_management/POST-COMPACTION_PROMPT.md 22.9 KB  the fresh-agent entry sequence
context_management/COMPACTION_SURVIVAL.md   18.7 KB   the state-at-a-glance + operating laws
context_management/NEXT_STEPS.md            19.9 KB   the W1-W9 wave plan + risk register
context_management/TASK_QUEUE.md            14.2 KB   gates + active + completed + blocked
context_management/CHANGELOG.md             21.3 KB   the session history + what FAILED
context_management/RUNNING_BUILD_LOG.md    145.3 KB   the append-only build log
context_management/RUNNING_DEBUG_LOG.md    151.8 KB   the append-only debug log
context_management/CANON_MANIFEST.md         0.97 KB  the 12-doc manifest
BUILD_REPORT.md      115.2 KB · DEBUG_LOG.md 257.5 KB · FAILURE_LOG.md 190.7 KB ·
SPEC_VIOLATION_LOG.md 61.6 KB · TESTING_LOG.md 30.3 KB · THEATRICALITY_LOG.md 72.2 KB
```

## 8.12 The operating laws (15, verbatim from COMPACTION_SURVIVAL.md)

```
 1 RIPWIRE FIRST-CLASS — map structure before every coding edit; a blind edit is AP-10.
 2 BUILDER-UNDER-AUDIT — a subagent return is a CLAIM; re-run the gates yourself.
 3 EVIDENCE OR NOTHING — every verdict carries a quoted tool result, never prose.
 4 NO GUESSES — every constant carries its derivation or the label UNCALIBRATED.
 5 ENGINES BEFORE REGISTRATION — the register reads up=5/11; registering the gate first
   refuses every tool call on this host (the measured STAGE 0 consequence).
 6 THE CONTAINER IS THE TEST — a host green is an effort receipt, not a capability measure.
 7 NO FALLBACKS — a down dependency is a LOUD named failure (the F-48 substrate law).
 8 SECRETS OUT-OF-BAND — the Jev key lives at ~/.config/typesafe/key mode 0600.
 9 APPEND-ONLY LOGS — the ship docs and canon logs never rewrite history.
10 THE CHECKPOINT SAVES AFTER THE DELIVERABLE — a baseline that predates its artifact lies.
11 ONE SNAP JUDGMENT PER QUESTION — a composite scores ~0.4 on everything (bible D006).
12 THE STATE IS THE EVIDENCE ONLY — no conversation, no instructions (bible D004).
13 THE FAIL POLARITY IS PER SURFACE — dumb OPEN; theatrical/destructive CLOSED (D010).
14 laterTruth IS WRITTEN "unresolved" AT FIRING TIME — only the oracle changes it (S6.4.7).
15 THE CACHE KEY IS THE CANONICAL STATE — a question edit is a NEW instrument (D013).
```

Laws 1, 3, 5, 6, 7, 8, 13 map onto the 6L+2E work: §5.1 (no `[]` fallback), §5.2 (polarity per
surface), §2.10 (the register gate), §3.8 (secrets out-of-band), §8.7 (evidence discipline).

## 8.13 The one-screen summary (paste this to a fresh agent)

```
WHAT: the GI OMP extension's 6L+2E gaps-closed + audited build.
WHERE: /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence (branch jarvis/gi-main @ 2a0682b)
ARTIFACT: extensions/graph-intelligence/index.js
SHA: 879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741 (== deployed == source)
PROOF: bun scripts/consumption-audit.ts . --gate → union=8/8 EXIT-0
       bun test tests/st-gi-6l2e.test.ts → 30 pass / 0 fail / 469 expect
       bunx tsc --noEmit → EXIT-0
AUDIT: PASS (0 critical/high OPEN) — poolside-laguna-s, 3 rounds (5938c5e6 → c183570e → df2b5c0a)
STATE: 8 consumers CONSUMED across the subject union; ABIDE observable (ABIDE_JUDGE ledger row)
OPEN: F-147/F-148/F-150/F-151; the corbell/graphify load-flake; the accepted c2kg-duplication LOW
NEXT: a live hotseat run of the deployed bundle; the widened battery in a container
```

---

*Generated 2026-10-03 for the `gi-6l2e-gaps-closed-audited` ship package. Line count target
2000+. Sources: the package's own ship docs + canon docs + the checkpoint + the audited source
tree. Every anchor verified against the source before writing; the honest gaps are in §8.8.*
