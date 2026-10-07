# GI KERNEL V2.3 — NEXT-STEPS BLUEPRINT v1

## §0 THE VERDICT (one screen)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  THE STATE: the 6 layers are POPULATED and 5/7 ACCURATE (L1 cleaned      │
│             this session; structural still 52% archive). The             │
│             ENFORCEMENT is automatic (3 hooks). THE INTELLIGENCE         │
│             IS NOT — reached only through the `gi-consumption` tool.     │
│  THE CAUSE: the layers were built as a QUERYABLE LIBRARY, not a REFLEX.  │
│             An agent that cannot see the graph edits blind.              │
│  THE FIX: a GI LSP wired into OMP's NATIVE runtime (queried on every     │
│           write) + a Card-HUD hook (the portable fallback), both fed     │
│           by the 6 layers, with the 2 Jev kernels routed through.        │
│  THE PROOF: `omp lsp hover <file:line>` returns a GI-sourced result      │
│             with NO agent action — the reflex, measured.                 │
└──────────────────────────────────────────────────────────────────────────┘
```

## §1 THE MEASURED START STATE

| the component | the declaration | IS IT WIRED? |
|---|---|---|
| L1_SEMANTICA | 1,220 entities (cleaned this session) | UP · 92% src ✅ |
| L2_ARSUMBRIS | 7 typed instances | UP (systemd daemon) ✅ |
| L3_UA | 5,155 nodes / 5,665 edges | UP ✅ |
| L4_C2KG | 215 files (file-level) | UP ✅ |
| L5_CORBELL | 1,361 nodes / 5,044 edges | UP ✅ |
| L6_GRAPHIFY | 1,834 nodes / 3,989 edges | UP ✅ |
| structural | 70,453 nodes (**52% archive**) | UP but POLLUTED ❌ |
| TSG (JevK5) | the GPU meaning gate | UP · via `gi-consumption` (MANUAL) ⚠️ |
| ABIDE | the live judge | UP · via the gate hook (AUTO) ✅ |
| the CLAIM FIREWALL | the turn-end gate | UP · **6 audit findings** ⚠️ |
| **the GI LSP** | — | **DOES NOT EXIST** ❌ |
| **the Card-HUD** | — | **DOES NOT EXIST** ❌ |

## §2 ★ THE ROOT CAUSE, VERBATIM

**The build's own words** (`GI_KERNEL_V2.3_DPL1_SPEC.md` §2, quoting the operator on the V2.2 era):

> *"the layers are a library with no auto-fire on the agent's own questions. I have to choose to
> query. That is a real gap — the enforcement is wired; the intelligence is not."*

**THE THREE SUB-LAYERS OF THE CAUSE:**
1. **THE REACHABILITY LAYER** — `consumptionAudit` is called ONLY from `extension.ts:756` (the
   `gi-consumption` tool). No hook, no timer, no runtime event reaches it.
2. **THE BUILD LAYER** — the 6 layers were built as *stores to populate*, each with its OWN skip
   list, so 2 of 7 drifted in scope (L1 80%, structural 52%) — nothing checked their scope.
3. **THE TRUST LAYER** — the claim firewall's binder accepts a SUBSTRING as proof
   (`span.includes(n)`) and its Jev judge is never wired — so the one surface that certifies
   claims has a hole in its own binder.

## §3 ★ THE THREE PROOFS (each with its command)

```
PROOF 1 · THE CODE THAT COMMITS THE ERROR — the intelligence is tool-only
  $ grep -rn 'consumptionAudit(' src/omp/*.ts
    src/omp/extension.ts:756:  result = await consumptionAudit(root, subject);
  ★ EXACTLY ONE CALL SITE, inside the tool. No hook reaches it.

PROOF 2 · THE IDENTIFIER IN THE WRONG PLACE — the layers have no runtime consumer
  $ grep -rln 'buildRegistry\|whoCalls(' src/omp/*.ts | grep -v 'layer-consumption\|extension'
  (no output)
  ★ NO hook, NO gate, NO card path builds the registry. The layers are ORPHANED from the runtime.

PROOF 3 · THE PLAN THAT OMITS THE FIX — the wave table (V2.2) names FILES, not EDGES
  $ grep -c 'the edge' packages/gi-kernel-v2.3/06-WAVES.md
    10
  ★ The V2.2 plan shipped 8 waves with no LSP wave — the reflex was never a wave.
```

## §4 ★ THE PREDICATE (the load-bearing section)

```
interface GiReflex {
  lspDiagnosticsPerWrite: number;    ← the diagnostics OMP pulls on a write
  cardsInjectedPerEdit: number;      ← the HUD cards queued per edit
  layersRoutedThroughLsp: number;    ← the layers the LSP reads
  decisionsInfluenced: number;       ← the edits that consulted a card
}

A GI RUNTIME IS REFLEXIVE IFF
  lspDiagnosticsPerWrite >= 1 AND
  layersRoutedThroughLsp >= 6 AND
  decisionsInfluenced >= 1,
ELSE GI_NOT_REFLEXIVE (a LOUD failure, never a silent pass).

★ THE METRIC INVERTS: the old number counted STORES POPULATED (7/7 up); the new one counts
  FACTS CONSUMED WITHOUT ASKING. A populated layer nobody queries scores ZERO.
```

**THE COUNTERFACTUAL TEST:** if the fix were reversed (the LSP gets no diagnostics), **the original
bug returns exactly** — the agent edits blind. ✅ **The predicate is correctly aimed.**

## §5 ★ THE WAVE PLAN (every row an EDGE)

| the wave | THE EDGE | the GATE | the evidence |
|---|---|---|---|
| W0 | the CLEAN FLOOR (**every layer ≥90% in-scope**) | `bun scripts/graph-health.ts .` → exit 0 | the root histogram |
| W1 | the LSP **ANSWERS** (a fact-card diagnostic) | the selftest → ≥1 diagnostic | the JSON-RPC transcript |
| W2 | **OMP CONSUMES IT** (queried on a write) | `omp lsp hover <file:line>` → a GI result | the lsp result |
| W3 | the **CARDS** are real (5 shapes from measured rows) | the card tests | the diagnostic objects |
| W4 | the **JEV ROUTE** (TSG→meaning · ABIDE→Warning) | a confidence present | the Jev call |
| W5 | the **HUD FALLBACK** (cards on `tool_call`) | an edit queues a card | the queue + the delivery |
| W6 | the **FIREWALL FIXED** (the 6 findings) | the 6 named tests green | the re-audit |
| W7 | the **DE-BRAND** (0 trident in src+scripts) | `grep -ri trident src/ scripts/ \| wc -l` → 0 | the grep |
| W8 | the **BOOT-PERSISTENCE** (the refresh timer) | `systemctl --user list-timers` | the timer |
| W9 | the **SHIP** (the dist + the checkpoint + the audit) | the battery + the audit 0/0 | the receipt |

**★ THE REFUSAL RULE: a wave whose deliverable is a FILE and not an EDGE is REFUSED.**

## §6 THE DETECTORS (one command, exit nonzero = FAIL)

| the class | the detector | the auto-reject |
|---|---|---|
| THE UNWIRED LAYER | `grep -L buildRegistry <every consumer>` | fail when a layer has 0 runtime consumers |
| THE SCOPE DRIFT | `bun scripts/graph-health.ts .` | exit 1 when a layer is <90% in-scope |
| THE SAFE-CLOSED BREAK | `grep -c 'throw GI_FABRICATED_CLAIM' src/omp/claim-firewall.ts` | fail if 0 |
| THE BRANDING | `grep -ri trident src/ scripts/ \| wc -l` | fail if ≠ 0 |
| THE F-95 ORPHAN | `grep -c <sym> <the deployed dist>` | fail if 0 for a V2.3 seam |
| THE STALE STORE | the register's `GI_LAYER_STALE` | fail if a stale answer reads fresh |
| THE CIRCULAR TOKEN | a token in prose, not a tool result | fail |

**THE ONE COMMAND:** `bash scripts/gi-firewall.sh` → exit nonzero = FAIL.

## §7 THE EXECUTION CONTRACT

```
1 DISPATCH  task action=generate (the wave-manager; never a hand-written manifest)
2 POLL      the session stream (the ONLY liveness truth)
3 AUDIT     a THE STREAM GATE (the return is intact)
            b THE PHANTOM CHECK (sha256 before/after)
            c THE PER-HUNK (every hunk exists on disk)
            d THE MECHANICAL (run tsc + the battery YOURSELF)
            e THE FIREWALL (the detectors → exit 0?)
            f THE ADVERSARIAL (the negative half)
4 VERDICT   CORRECT | FLAWED | FITTED-TO-GOLDEN | FABRICATION | VIOLATION | CREEP
5 CLOSE     the ledger row + the docs
★ A WAVE CLOSES ONLY ON THE ORCHESTRATOR'S VERIFIED VERDICT.
★ ESCALATION: VIOLATION 1 → kick · 2 → reassign · 3 → RETIRE THE DESK, build it yourself.
```

## §8 THE EXACT TESTS (positive + negative per component)

| the component | the POSITIVE | the NEGATIVE |
|---|---|---|
| the GI LSP | a diagnostic on a real file (source = gi-lsp/callers) | a doc-only file → 0 diagnostics |
| the LSP + no store | `GI_NO_STORE` (loud) | a silent empty |
| the LSP + a foreign store | `GI_STORE_SCOPE_MISMATCH` | a confident answer about another tree |
| the Card-HUD | an edit queues a CALLERS card | a non-code tool → no card |
| the Jev route | a meaning card with a confidence | a down judge → `NOTICE` (no throw) |
| the firewall (A-1) | "453 tests pass" WITH the span → SUPPORTED | "523 tests failed" → FABRICATED |
| the health gate | the clean tree → exit 0 | structural → `GI_LAYER_SCOPE_SUSPECT` + exit 1 |
| the de-brand | — | `grep -ri trident` → 0 |

## §9 THE SCOPE (the operator's words, VERBATIM — NO SHRINK)

> *"a system level copilot that highlights relevant critical data on every tool call"* ·
> *"Card based interactive HUD enforced by the system on all tool calls"* ·
> *"the GIK layers all route into the LSP, the LSP becomes the actual runtime kernel"* ·
> *"the 2 Jev based enforcement layers are wired into/connected to the LSP"* ·
> *"custom LSP server build from the GIK layers wired natively in omp's runtime kernels"* ·
> *"there should be NO TRIDENT BRANDING ANYWHERE IN THIS PROJECT"* ·
> *"clean semantica"* · *"the FULL v2.3 build package"*

**NO SHRINK. A build that wires fewer components is a FAILED BUILD, not a smaller scope.**

## §10 THE OPEN DECISIONS (each with its default)

| # | the fork | the default |
|---|---|---|
| 1 | the `.trident/` store path: rename + migrate, or keep + de-string? | **rename to `.gi/` + a migration + a read-fallback** |
| 2 | the LSP diagnostic scope: every file, or edited + open? | **edited + open** (a full sweep is a separate op) |
| 3 | the Card-HUD byte budget | **500–1500/call**, with a `shown=N total=M` |
| 4 | the refresh cadence | **a 30-min timer + a session-start stale probe** |
| 5 | structural's skip: shared or per-layer? | **the shared law, no overrides** |

## §11 WHAT IS ALREADY ON DISK

```
packages/gi-kernel-v2.3/          00-MISSION · 01-DISCOVERY · the DPL1 SPEC (APPROVED) ·
                                  06-WAVES · 07-GOALS · 00-INDEX
GI_AUTO_INTELLIGENCE_AND_LSP_BLUEPRINT.md   the design record
scripts/semantica-ingest.py       ✅ the shared skip FIXED
.omp/graph-intelligence/layers/semantica/kg.json   ✅ CLEANED (1,220 entities, 92% src)
~/.config/systemd/user/au-engine-graph-intelligence.service   ✅ ENABLED
reports/GI_Kernel_V2_Engineering_Report_v2.md   the V2.2 report
```

## §12 THE SELF-CHECK + THE RESIDUAL

```
[✅] §1 the measured start state (the layer table)
[✅] §2 the root cause quoted VERBATIM + the 3 sub-layers
[✅] §3 three proofs, each with its command
[✅] §4 the PREDICATE + the named error GI_NOT_REFLEXIVE + the counterfactual
[✅] §5 every wave carries an EDGE + the refusal rule
[✅] §6 the detectors + the one-command firewall
[✅] §7 the execution contract + the escalation ladder
[✅] §8 positive + negative per component
[✅] §9 the operator's scope VERBATIM, NO SHRINK
[✅] §10 five decisions with defaults
[✅] §11 the pinned disk state
[✅] §12 this
```

**THE RESIDUAL (what is NOT determined here):**
- the LSP's full-tree sweep behaviour at scale (only the edited-file path is specified)
- the `.trident/` → `.gi/` migration's effect on the 2 existing checkpoints (a migration script
  is required; the checkpoints are read-only archives)
- the structural rebuild's exact node count after the skip fix (measured only after W0)
- the audit round-trip time on the paid muse-go lane (measured: 3m13s for 1 file / 6 findings)

**THE HANDOFF:** this blueprint is the input to the `create` pin (the V2.3 build), which dispatches
the 5 desks (07-GOALS.md) through the wave-manager.

---

## §13 THE LAYER-BY-LAYER ROUTING INTO THE LSP (the full map)

```
┌──────────────────────┬──────────────────┬────────────────────────────────┐
│  THE LAYER           │  THE LSP OP       │  THE CAR │
├──────────────────────┼──────────────────┼────────────────────────────────┤
│  L5_CORBELL          │  references       │  CALLERS (the file:line list │
│  L6_GRAPHIFY         │  references       │  CALLERS (the corroborator │
│  L3_UA               │  hover            │  the file's role + contain │
│  structural          │  definition       │  the symbol's declaration sit │
│  L4_C2KG             │  definition       │  the file resolve (name→path │
│  L1_SEMANTICA        │  hover            │  the concept neighbour │
│  L2_ARSUMBRIS        │  hover            │  the typed-repo knowledg │
│  TSG (JevK5)         │  hover + diag     │  MEANING (the drift verdict │
│  ABIDE               │  diag on change   │  the REPAIR band Warnin │
│  the CLAIM FIREWALL  │  (turn-end only)  │  — (fail-CLOSED, not an LSP op 
└──────────────────────┴──────────────────┴────────────────────────────────┘
```

## §14 THE TWO-LAYER LSP (the operator's framing, implemented)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 1 · THE STANDARD LSP SURFACE                                      │
│    hover · definition · references · completion · rename · format ·      │
│    diagnostics — served FROM the 6 layers (references = the real         │
│    who-calls; definition = the canonical node; hover = the fact card)    │
├──────────────────────────────────────────────────────────────────────────┤
│  LAYER 2 · THE INTELLIGENCE BACKEND (the Card-HUD's brain)               │
│    the SAME server ALSO emits the HUD's fact cards as diagnostics — so   │
│    the HUD's cards and the LSP's diagnostics come from ONE source        │
├──────────────────────────────────────────────────────────────────────────┤
│  ★ ONE SERVER, TWO CONSUMERS: the editor's LSP client AND the Card-HUD.  │
└──────────────────────────────────────────────────────────────────────────┘
```

## §15 THE MACRO LOOP (the four automatic surfaces)

```
┌──────────────────────────────────────────────────────────────────────────┐
│   ① the agent EDITS                                                      │
│        │                                                                 │
│        ├──► [AUTO] THE GRAPH GATE ....... drift? → STEER / BLOCK         │
│        ├──► [AUTO] THE ABIDE JUDGE ...... a REPAIR band → a note         │
│        ├──► [NEW]  THE GI LSP ........... the file's CARDS → diagnostics │
│        ▼                                                                 │
│   ② the context carries: callers · blast radius · unwired · conflicts ·  │
│      the meaning verdict                                                 │
│        ▼                                                                 │
│   ③ the agent acts WITH the structure                                    │
│        ▼                                                                 │
│   ④ the turn CLOSES                                                      │
│        └──► [AUTO] THE CLAIM FIREWALL ... FABRICATED → REJECT            │
│                                                                          │
│  ★ the graph INFORMS · the gate POLICES · the judge REPAIRS · the        │
│    firewall CERTIFIES — four automatic surfaces, one loop.               │
└──────────────────────────────────────────────────────────────────────────┘
```

## §16 THE ANTI-CHEAT CLAUSES (the 8 holes, closed)

| # | the hole | the closure |
|---|---|---|
| 1 | THE SCOPE SHRINK | §9 carries the operator's words VERBATIM + "NO SHRINK" |
| 2 | THE INSTRUCTION-FORM FIX | §4 IS a predicate with `GI_NOT_REFLEXIVE` + the counterfactual |
| 3 | THE SYMPTOM DIAGNOSIS | §2 quotes the build's own words + the 3 sub-layers |
| 4 | THE FILE-ORGANIZED WAVE | §5 refuses a wave with no edge |
| 5 | THE UNRUN DETECTOR | §6 requires the one-command firewall |
| 6 | THE GREEN-BATTERY-AS-CAPABILITY | §8 requires BOTH halves per component |
| 7 | THE UNANCHORED CLAIM | every number carries its command |
| 8 | THE MISSING RESIDUAL | §12 names what could not be determined |

## §17 THE 5 DESKS (the dispatch topology)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  THE ORCHESTRATOR — owns the sequence, the gates, the audit, the ship    │
│  ├─ DESK-A · THE LSP ............ W1 · W3 · W4                           │
│  ├─ DESK-B · THE WIRING ......... W2 · W5                                │
│  ├─ DESK-C · THE CLEAN FLOOR .... W0 · W8                                │
│  ├─ DESK-D · THE CORRECTNESS .... W6 · W7                                │
│  └─ DESK-E · THE SHIP ........... W9                                     │
│                                                                          │
│  the escalation: VIOLATION 1 → kick · 2 → reassign · 3 → retire the desk │
└──────────────────────────────────────────────────────────────────────────┘
```

## §18 THE MEASURED COSTS (the audit + the LSP, from this session)

| the operation | the cost | the evidence |
|---|---|---|
| the muse-go audit (1 file) | 3m13s · 48,652 tokens · 6 findings | session `558dd813` |
| the semantica rebuild (the clean) | 1.4s · 1,220 entities | the ingest output |
| the JevK5 noul call | ~115ms | the live probe |
| the register (8 probes) | ~2s | the tool result |
| the au daemon start | ~12s | the systemd unit |
| the LSP cold start (planned) | ≤5000ms (`warmupTimeoutMs`) | the config |
