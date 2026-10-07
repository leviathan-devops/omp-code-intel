# GI_KERNEL_V2.3_DPL1_SPEC

**The build contract.** Every FR carries its objective, steps, tokens, pass/fail, evidence, anchors.
**Class:** architectural. **Floor:** 400+ lines. **Authority:** the operator's mission (00-MISSION §verbatim).

---

## §0 HEADER

| the field | the value |
|---|---|
| the mission | make the GI kernel REFLEXIVE — a GI LSP wired into OMP's native runtime + a Card-HUD |
| the scale class | architectural (a new subsystem + a class refactor) |
| the baseline | jarvis/gi-main @ 018aad8 · dist `b2ab09acc77684e4` |
| the battery | 453/0 + 551/0 (EXIT 0) — the floor the build must not regress |
| the spec's own gate | SPEC-AUDIT (the 8 mechanical gates) before dispatch |

## §1 THE DISCOVERED INTELLIGENCE (measured — see 01-DISCOVERY)

- the 7 layers, their node counts, their verdicts (L1 CLEANED · structural ❌ · 5 ✅)
- the enforcement wiring (the 4 hooks, the exact lines)
- the LSP baseline (the checkpoint's injector) + the OMP surface (the config schema, the 14 ops)
- the de-brand scope (53 files, 2 classes)

## §2 THE PROBLEM STATEMENT (verbatim requirements)

> *"a system level copilot that highlights relevant critical data on every tool call so the agent
> cannot make any ignorant or unaware decisions. Card based interactive HUD enforced by the system
> on all tool calls"*

> *"the GIK layers all route into the LSP, the LSP becomes the actual runtime kernel that gets
> plugged into everything. the 2 Jev based enforcement layers are wired into/connected to the LSP"*

> *"custom LSP server build from the GIK layers wired natively in omp's runtime kernels"*

> *"there should be NO TRIDENT BRANDING ANYWHERE IN THIS PROJECT."*

**THE PROBLEM, FIRST PRINCIPLES:** the 6 layers are a **library with no reflex**. Measured: the
only automatic surfaces are the 3 enforcement hooks; the intelligence (`consumptionAudit`) is
reached ONLY through the `gi-consumption` tool (`extension.ts:756`) — i.e. only when the agent
chooses to ask. **An agent that cannot see the graph edits blind.** The fix is not "query more" —
it is to make the graph a **SENSE ORGAN** the runtime reads without being asked.

## §3 THE ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────────────┐
│  V2.3 — the reflexive kernel                                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────── OMP NATIVE RUNTIME (Rust) ───────────────────┐     │
│  │  lsp.diagnosticsOnWrite · lsp.diagnosticsOnEdit                  │     │
│  │  ~/.omp/agent/lsp.json  → { servers: { "gi-lsp": {…} } }         │     │
│  └───────────────────────────┬──────────────────────────────────────┘     │
│                              │ spawns + drives (stdio LSP)                │
│                              ▼                                            │
│  ┌──────────────── gi-lsp (Bun, stdio) ─────────────────────────────┐     │
│  │  L1 the STANDARD surface: hover · definition · references ·        │     │
│  │      diagnostics — served FROM the GI layers                      │     │
│  │  L2 the INTELLIGENCE backend: the Card-HUD's fact cards           │     │
│  │  ┌─────────────────────────────────────────────────────────────┐  │     │
│  │  │ the LAYER READERS  (the 6 layers, read-only)                │  │     │
│  │  │  L5 corbell · L6 graphify · L3 ua · structural · L4 c2kg    │  │     │
│  │  │  TSG (JevK5) → meaning   ABIDE → the hunk judge             │  │     │
│  │  └─────────────────────────────────────────────────────────────┘  │     │
│  └───────────────────────────┬──────────────────────────────────────┘     │
│                              │ publishDiagnostics([...])                  │
│                              ▼                                            │
│  ┌──────────── the agent's context (the reflexive fact cards) ──────┐     │
│  │  CALLERS 12 · UNWIRED 0-callers · CONFLICT L5 vs L6 ·            │     │
│  │  MEANING drift 0.66 · SCOPE build_root ≠ this root               │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌──────────── the Card-HUD hook (the portable fallback) ───────────┐     │
│  │  pi.on("tool_call") → renderCards(rec) → the queue → the result  │     │
│  └──────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  ┌──────────── the ENFORCEMENT (unchanged polarity) ────────────────┐     │
│  │  the GRAPH GATE (drift → STEER/BLOCK) · ABIDE (REPAIR, fail-OPEN) │     │
│  │  the CLAIM FIREWALL (<turn-end>, fail-CLOSED)                     │     │
│  └──────────────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────────────┘
```

## §4 THE FR SET (the functional requirements)

### FR-1 · THE GI LSP SERVER (`scripts/gi-lsp.ts`)
- **objective:** a stdio LSP server backed by the 6 layers.
- **steps:** ① a JSON-RPC stdio loop; ② `initialize`/`initialized` (capabilities: diagnostics,
  hover, definition, references); ③ `textDocument/didOpen|didChange|didClose` (keep a file cache);
  ④ on open/change → `publishDiagnostics` with the fact cards.
- **tokens:** `GI_LSP_TOKENS` = the diagnostic sources (`gi-lsp/callers`, `gi-lsp/unwired`,
  `gi-lsp/conflict`, `gi-lsp/meaning`, `gi-lsp/scope`).
- **pass:** a `didOpen` on a real file returns ≥1 diagnostic whose `source` ∈ `GI_LSP_TOKENS`.
- **fail:** a bare crash; a diagnostic with no `range`; a fabricated card (no store read).
- **evidence:** the LSP transcript (the JSON-RPC frames).
- **anchors:** the new file; the layer readers at `src/omp/adapters/*.ts`.

### FR-2 · THE OMP REGISTRATION (`~/.omp/agent/lsp.json`)
- **objective:** OMP launches `gi-lsp` natively.
- **steps:** write the `servers.gi-lsp` entry (`command` = `bun scripts/gi-lsp.ts`, `args`
  `["--stdio"]`, `fileTypes` `[".ts",".tsx",".js",".jsx",".py"]`, `rootMarkers`
  `[".omp/graph-intelligence","tsconfig.json",".git"]`).
- **pass:** OMP's `lsp` op (`hover` on a symbol) returns a GI-sourced result.
- **fail:** the server not spawning; a config schema rejection.
- **anchors:** the config doc `/home/leviathan/omp-src/docs/lsp-config.md:152-166`.

### FR-3 · THE CARD RENDERER (`src/gi-lsp/cards.ts`)
- **objective:** the 5 card shapes (CALLERS · UNWIRED · CONFLICT · MEANING · SCOPE) as LSP
  diagnostics + HUD blocks.
- **steps:** each card = `{shape, title, rows[], severity}`; render → a `Diagnostic` (a `range`,
  a `message`, a `severity`, a `source`) + a HUD block (the byte budget, the `shown=N total=M`).
- **pass:** a `CALLERS` card carries ≥1 `file:line`; an `UNWIRED` card fires at 0 inbound edges.
- **fail:** a card with no rows; a card asserting a count it did not measure.
- **anchors:** `src/omp/adapters/corbell.ts` (whoCalls), `graphify.ts`, `structural.ts`.

### FR-4 · THE CARD-HUD HOOK (`src/omp/card-hud.ts` + the gate-hook wiring)
- **objective:** the portable fallback — the same cards on `tool_call` where no LSP exists.
- **steps:** `pi.on("tool_call")` → `reconstruct(name, input)` → `renderCards` → `queueFactNote`
  → the `tool_result` delivery (the SAME queue the gate uses).
- **pass:** an `edit` on a symbol queues a CALLERS card; the card lands in the context.
- **fail:** a block (the HUD must INFORM, never refuse); a card on a non-code tool.
- **anchors:** `gate-hook.ts:92` (the pattern), `:163` (the delivery).

### FR-5 · THE JEV ROUTING THROUGH THE LSP
- **objective:** TSG (JevK5) → the `meaning` diagnostic; ABIDE → the hunk `Warning`.
- **steps:** the layer readers call `jevk5Probe` for a symbol → a `meaning` card; the ABIDE judge's
  REPAIR band → a `Warning` with a `gi-lsp/abide` source; fail-OPEN on a down judge.
- **pass:** a `meaning` card carries the JevK5 confidence; a REPAIR hunk yields a Warning.
- **fail:** a throw from a down judge; a card with no confidence.
- **anchors:** `src/omp/adapters/jevk5.ts`, `abide.ts:346`.

### FR-6 · THE SHARED WALK_SKIP (the class fix)
- **objective:** ONE skip law, imported by every producer.
- **steps:** export `WALK_SKIP` from `src/hunter/profile/source-roots.ts`; import it in
  `scripts/semantica-ingest.py` (a mirror), `scripts/structural-extract.py`, `scripts/c2kg-produce/`.
- **pass:** every producer's skip set ⊇ the shared set (a test asserts it).
- **fail:** a producer with its own list.
- **anchors:** `source-roots.ts` (WALK_SKIP), the 4 producers.

### FR-7 · THE GRAPH-HEALTH GATE (`scripts/graph-health.ts`)
- **objective:** the 3 mechanical checks over every store + JSON layer; exit nonzero <90% in-scope.
- **steps:** GHA-1 resolve · GHA-2 root histogram · GHA-3 archive count → the per-layer table →
  `GI_LAYER_SCOPE_SUSPECT:<layer>` (exit 1). Wire as the final step of `gi-populate`.
- **pass:** on the GI repo, all layers ≥90% in-scope, exit 0.
- **fail:** structural's current 48% — the gate MUST fire.
- **anchors:** the new script; `scripts/gi-populate.ts:230`.

### FR-8 · THE STRUCTURAL ARCHIVE FIX
- **objective:** structural stops indexing `Checkpoints/`.
- **steps:** import the shared skip; rebuild → the archive rows → 0.
- **pass:** `structural` archive rows = 0, nodes drop from 70,453 to ~16k.
- **fail:** any `Checkpoints` path remains.
- **anchors:** `scripts/structural-extract.py`.

### FR-9 · THE 6 CLAIM-FIREWALL FIXES (A-1..A-6)
- **objective:** close the audit's findings.
- **steps:** A-1 the word-boundary binder + the failure-signal rejection + all-token; A-2 the
  claim-shaped context; A-3 `sidOf` null + the bounded map; A-4 the surface census → throw;
  A-5 wire the judge + `await`; A-6 the null-guards.
- **pass:** the 6 named tests green; the re-audit 0 critical / 0 high.
- **fail:** a fix that only narrows (must ALSO keep the positive half).
- **anchors:** `src/omp/claim-firewall.ts:78,149-153,182-186,243-247,306-307,328,338-344`.

### FR-10 · THE DE-BRAND
- **objective:** 0 "trident" in `src/` + `scripts/`.
- **steps:** ① the store path `.trident/` → `.gi/` (+ a migration + a read-fallback); ② the
  provenance comments → `// PORTED FROM <the upstream tree> (archived)`;
  ③ the `<the-bug-hunter>` subagent dir + its identifiers.
- **pass:** `grep -ri trident src/ scripts/ | wc -l` → **0**.
- **fail:** any hit; a broken store path.
- **anchors:** the 53 files.

### FR-11 · THE BOOT-PERSISTENCE
- **objective:** the stores never age out; the L2 daemon is already a unit.
- **steps:** ① `au-engine-refresh.timer` (30 min) → `gi-populate` per workspace; ② the TTL
  widen (`unknown` 1 h → 24 h) + record the derivation class on the store.
- **pass:** `systemctl --user list-timers | grep au-engine-refresh`; a store's `derivation`.
- **anchors:** `src/omp/typed-write.ts:499` (LAYER_TTL_MS).


## §4B THE SCOPE (the operator's scope, VERBATIM — no shrink)

> *"a system level copilot that highlights relevant critical data on every tool call"*
> *"the GIK layers all route into the LSP, the LSP becomes the actual runtime kernel"*
> *"the 2 Jev based enforcement layers are wired into/connected to the LSP as well"*
> *"custom LSP server build from the GIK layers wired natively in omp's runtime kernels"*
> *"there should be NO TRIDENT BRANDING ANYWHERE IN THIS PROJECT"*
> *"clean semantica"* · *"create the FULL v2.3 build package"*

**THE SCOPE ITEMS (the whole v2.3 scope, no shrink):** the **gi-lsp** server · the **card-hud** ·
every **layer** routed into the LSP (the L5 corbell · the L6 graphify · the L3 ua · the structural ·
the L4 c2kg · the meaning) · the Jev **firewall** routing (TSG + ABIDE) · the shared **skip** law ·
the graph-**health** gate · the 6 claim-**firewall** fixes · the de-brand · the boot-persistence.

**NO SHRINK.** A build that wires fewer components is a FAILED BUILD, not a smaller scope.

## §5 THE SUCCESS CRITERIA (every one command-checkable)

| # | the criterion | the command | the pass |
|---|---|---|---|
| S1 | the GI LSP answers from the layer readers | `bun scripts/gi-lsp.ts --selftest` | ≥1 diagnostic, source ∈ GI_LSP_TOKENS |
| S2 | OMP uses it natively | `omp lsp hover <file:line>` | a GI-sourced result |
| S3 | the Card-HUD fires | the hook test | an edit queues a card |
| S4 | Jev routes through | the meaning card | a confidence present |
| S5 | one skip law | the import test | 4/4 producers import it |
| S6 | the health gate fires on every layer | `bun scripts/graph-health.ts .` (the layer loop runs) | exit 0 on the clean tree; exit 1 on structural BEFORE the fix |
| S7 | structural clean | the archive query | 0 rows |
| S8 | the firewall fixed | the 6 named tests | 6/6 green |
| S9 | the re-audit | `ocr scan --provider muse-go` | 0 critical / 0 high |
| S10 | the de-brand | `grep -ri trident src/ scripts/ \| wc -l` | 0 |
| S11 | the refresh timer | `systemctl --user list-timers` | the timer active |
| S12 | no regression | `bun run test` | 453/0 + 551/0 |

## §6 THE CONTAINER TEST PLAN (≥5 adversarial angles, tool-result-bound tokens)

| # | the scenario | the pass token | the fail token |
|---|---|---|---|
| C1 | the LSP on a REAL file in the container | `gi-lsp/callers` in a diagnostic | a diagnostic with no source |
| C2 | the LSP with NO store | `GI_NO_STORE` (a named refusal) | a silent empty; a crash |
| C3 | the LSP with a STALE store | `GI_LAYER_STALE` | a stale answer presented as fresh |
| C4 | the LSP with a FOREIGN store (build_root ≠ root) | `GI_STORE_SCOPE_MISMATCH` | a confident answer about another tree |
| C5 | the Card-HUD on a doc-only edit | zero cards (silent) | a spurious card |
| C6 | the health gate on a polluted store | `GI_LAYER_SCOPE_SUSPECT` + exit 1 | exit 0 |
| C7 | a down JevK5 | the `NOTICE` path (fail-OPEN) | a throw |
| C8 | the firewall on a negated span | `FABRICATED` (A-1 fixed) | `SUPPORTED` |

## §7 THE ANTI-PATTERN LEDGER (3 categories, mechanical detections)

| the category | the anti-pattern | the detection |
|---|---|---|
| THE FABRICATION | a card with a count it did not measure | every card carries its store row + the count |
| THE SILENT FALLBACK | the LSP answering from a missing store | `GI_NO_STORE` (loud) |
| THE SCOPE DRIFT | a layer indexing a foreign tree | the graph-health gate (<90% → exit 1) |
| THE BRANDING | "trident" in src | `grep -ri trident src/ scripts/` → 0 |
| THE UNWIRED SEAM | a symbol built but not in the bundle | `grep -c <sym> <the dist>` ≥1 |
| THE POLARITY BREAK | the HUD blocking | the HUD never throws |

## §8 THE PRE-WRITTEN SCRIPT TESTS
`tests/st-gi-lsp.test.ts` · `tests/st-card-hud.test.ts` · `tests/st-graph-health.test.ts` ·
`tests/st-claim-firewall-fixes.test.ts` · `tests/st-debrand.test.ts` — each with the negative half.

## §9 THE PRE-WRITTEN DEEP CONTAINER TESTS
`C1..C8` above, driven through the live runtime (the LSP + the hooks) on a real project.

## §10 THE OPEN DECISIONS
`00-MISSION §the-open-questions` (5 forks, each with a RECOMMENDED default).

## §11 THE SPEC-MANAGER GATE
`spec-audit specPath=packages/gi-kernel-v2.3/GI_KERNEL_V2.3_DPL1_SPEC.md` → SPEC-AUDIT: APPROVED.

## §12 THE MECHANICAL COMPLETION CHECKLIST (every row names the PROCESS it RUNS, live)
- [ ] every FR carries objective/steps/tokens/pass/fail/evidence/anchors
- [ ] every success criterion is a command
- [ ] ≥5 container angles with tool-result-bound tokens
- [ ] the anti-pattern ledger has mechanical detections
- [ ] the residual named (the LSP's full-tree sweep is NOT in scope)
