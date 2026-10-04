# GI AUTO-INTELLIGENCE + THE GI LSP — THE DESIGN RECORD
**Captured:** 2026-09-27 · **Source:** the chat-delivered design (preserved per the operator order)
**Status:** DESIGN — the input to the V2.3 build package.

---

## §1 THE GRAPH POPULATION — is it automatic? (the measured answer)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  WHAT FIRES ITSELF TODAY                                                   │
├────────────────────────────────────────────────────────────────────────────┤
│  ✅ THE POPULATION  ..... NO. `gi-populate --target X` is a CLI you run.    │
│  ✅ THE REFRESH ......... NO. Nothing re-populates on a timer or on open.   │
│  ✅ THE TTL ............. 1 h (`unknown`), so a store silently ages out.    │
│  ✅ THE ENFORCEMENT ..... YES — the 3 hooks (below).                        │
│  ✅ THE QUERY ........... NO — `graph-query`/`gi-consumption` are tools.    │
└────────────────────────────────────────────────────────────────────────────┘
```

## §2 HOW THE AUTO ENFORCEMENT IS WIRED (the exact code)

```
extension.ts:864  export default function giOmpExtension(pi) {
extension.ts:865    if (typeof pi.on === "function") {
extension.ts:858      registerGraphGate(pi)
extension.ts:863      attachClaimFirewall(pi)

gate-hook.ts:92   pi.on("tool_call")   → on write/edit: runGraphGate(...)
                                        → drift → [GATE STEER] or `throw` (BLOCK)
                                        → gate-hook.ts:113 judgeDiff(...)  THE ABIDE JUDGE
gate-hook.ts:163  pi.on("tool_result") → delivers the queued steer
claim-firewall.ts:308 pi.on("tool_result") → turnSpans[sid].push(text)
claim-firewall.ts:340 pi.on(<turn-end>)    → adjudicateClaim(...)
                                          → FABRICATED → throw GI_FABRICATED_CLAIM
```

**THE PATTERN:** all three ride the runtime's own hook events. Zero agent action.

---

## §3 TIER 1 — THE CARD-BASED INTERACTIVE HUD (a system-level copilot)

**The operator's framing, verbatim:** *"it should literally be a system level copilot that
highlights relevant critical data on every tool call so the agent cannot make any ignorant or
unaware decisions. Card based interactive HUD enforced by the system on all tool calls for data
awareness and codebase intelligence."*

```
┌──────────────────────────────────────────────────────────────────────────┐
│  THE MECHANISM (mirrors gate-hook.ts:92 exactly)                         │
├──────────────────────────────────────────────────────────────────────────┤
│  pi.on("tool_call")                                                      │
│      │                                                                   │
│      ▼                                                                   │
│  name ∈ {write, edit, patch, read}? ──no──► return (silent)              │
│      │yes                                                                │
│      ▼                                                                   │
│  rec = reconstruct(name, input)   ← the SAME helper the gate uses        │
│      ▼                                                                   │
│  cards = renderCards(rec)          ← THE HUD                             │
│      ▼                                                                   │
│  queueFactNote(sid, cards)         ← the SAME pending queue as the steer  │
│      ▼                                                                   │
│  gate-hook.ts:163's tool_result handler DELIVERS it into the context      │
│                                                                          │
│  ★ THE LAW: a CARD, never a block. The gate STEERS behaviour; the HUD     │
│    INFORMS it. Same hook, opposite polarity (the ABIDE-vs-FIREWALL law    │
│    applied to facts).                                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

**THE CARD SHAPES (one per fact class):**

```
┌─ CALLERS ────────────────────────────────────────┐
│  the symbol you are editing has 12 callers       │
│  · src/omp/extension.ts:292 (wired)              │
│  · src/omp/gate-hook.ts:113 (wired)              │
│  · … 10 more                                     │
└──────────────────────────────────────────────────┘
┌─ UNWIRED ────────────────────────────────────────┐
│  ★ this symbol has 0 inbound edges — DEAD?       │
│  (no caller in L5 · L6 agrees · structural agrees)│
└──────────────────────────────────────────────────┘
┌─ CONFLICT ───────────────────────────────────────┐
│  ★ L5_CORBELL says `calls` · L6_GRAPHIFY says not │
│  the corroboration delta is negative — VERIFY    │
└──────────────────────────────────────────────────┘
┌─ MEANING (JevK5) ────────────────────────────────┐
│  the Jev judge reads this symbol as `drift`      │
│  (0.66) — the name and the behaviour disagree    │
└──────────────────────────────────────────────────┘
┌─ SCOPE ──────────────────────────────────────────┐
│  ★ the store's build_root ≠ this file's root     │
│  the graph would answer about ANOTHER TREE       │
└──────────────────────────────────────────────────┘
```

---

## §4 TIER 2 — THE GI LSP (the right way; the Card-HUD's intelligence backend)

**The operator's framing, verbatim:** *"this can be the exact mechanism that serves as the core
intelligence backend of the Card-HUD. So this is a double layered LSP. 1 is the standard LSP
functions and the 2nd is the intelligence backend of the Graph-Card-HUD from tier 1. so the GIK
layers all route into the LSP, the LSP becomes the actual runtime kernel that gets plugged into
everything. the 2 Jev based enforcement layers are wired into/connected to the LSP as well. LSP
is a solid baseline kernel platform to route and enforce everything through."*

### THE BASELINE (read from the checkpoint, this session)

```
/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/
  v4.4.3/Checkpoints/plutus-corbell-container-tested/
  src/subagents/<the-bug-hunter>/surface/lsp-injector.ts
```

```ts
export class DiagnosticsServer { … }                      // per-project, file-scoped state
export function resolveProjectRoot(file)                  // walk UP for the project marker
export function getProjectDiagnosticsServer(root)          // ONE shared LSP per project
export function resolveDiagnosticsServerForFile(file)      // the injector's entry
function extractTouchedFile(tool, args)                    // the touched path, per tool
export function inject(result, server): InjectedResult     // the tool.after publishDiagnostics
export const LOGIC_LSP_BYTE_COST = 500;                    // the block byte-cost band
```

**Its measured evidence:**
```
"[INFO] [hooks] LOGIC-LSP: injected the file-scoped diagnostics block (206 chars) into the
 read result"
"[LOGIC_LSP_AFTER: tool=read … touched=…/profile.yaml fileStateSize=0 serverDb=true]"
"THE LSP DESIGN: ONE SHARED LSP PER PROJECT — the server's truth is the project's shared DB…"
```

### THE OMP SURFACE (read this session)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  OMP'S NATIVE LSP — the contract                                            │
├────────────────────────────────────────────────────────────────────────────┤
│  the `lsp` tool ......... 14 ops (hover · definition · references ·         │
│                           completion · rename · format · diagnostics …)     │
│  it is WIRED INTO EVERY WRITE                                               │
│  the runtime keys ....... lsp.enabled · lsp.diagnosticsOnWrite ·            │
│                           lsp.diagnosticsOnEdit · lsp.diagnosticsDeduplicate│
│  the config ............. ~/.omp/agent/lsp.json (user)                      │
│                           <project>/.omp/lsp.json (project)                 │
│  the ServerConfig ....... command* · fileTypes* · rootMarkers* ·            │
│                           args · languageId · initOptions · settings ·      │
│                           disabled · warmupTimeoutMs · isLinter ·           │
│                           capabilities                                     │
│  the doc ................ /home/leviathan/omp-src/docs/lsp-config.md (270 L)│
└────────────────────────────────────────────────────────────────────────────┘
```

**THE DECISIVE FACT:** OMP ALREADY runs diagnostics on every write and edit. A GI LSP registered
as a server is therefore queried AUTOMATICALLY — no hook, no tool call, no agent decision.

### THE BLUEPRINT — `gi-lsp`: a stdio LSP server backed by the 6 layers

```
┌──────────────────────────────────────────────────────────────────────────┐
│  THE ARCHITECTURE                                                        │
├──────────────────────────────────────────────────────────────────────────┤
│  OMP runtime (Rust) ──spawns──► gi-lsp --stdio  (a Bun/Node process)     │
│      │                              │                                    │
│      │  textDocument/didOpen        │  resolve the project root          │
│      │  textDocument/didChange      │  OPEN the 6 stores (read-only)     │
│      │  textDocument/diagnostics ──►│                                    │
│      │                              ▼                                    │
│      │                     ┌─────────────────────────────┐               │
│      │                     │ THE GI LAYER READERS        │               │
│      │                     │  L5 corbell   who-calls     │               │
│      │                     │  L6 graphify  blast-radius  │               │
│      │                     │  L3 UA        contains      │               │
│      │                     │  structural   references    │               │
│      │                     │  L4 c2kg      file resolve  │               │
│      │                     │  TSG/JevK5    meaning       │               │
│      │                     └──────────────┬──────────────┘               │
│      │                                    │                              │
│      ◄──── publishDiagnostics([...]) ─────┘  (the file's diagnostics)    │
│                                                                          │
│  ★ THE REFLEX: no agent action. The LSP push IS the intelligence.        │
└──────────────────────────────────────────────────────────────────────────┘
```

**THE DIAGNOSTIC MAP (what the GI LSP publishes per file):**

| the GI fact | the LSP diagnostic | severity |
|---|---|---|
| the file has N callers (`who-calls`) | a HINT on the file's first line | Information |
| a changed exported symbol has callers outside this file | an inline Warning on the symbol | Warning |
| the symbol is UNWIRED (0 inbound edges) | a Hint — "dead: no callers" | Hint |
| a cross-layer conflict (L5 vs L6) | Warning — the corroboration conflict | Warning |
| the JevK5 meaning verdict says drift | Information — the meaning verdict | Information |
| the store is STALE / a ghost tree | a file-level Warning — the graph is lying | Warning |

**THE REGISTRATION (`~/.omp/agent/lsp.json`):**
```json
{
  "servers": {
    "gi-lsp": {
      "command": "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/scripts/gi-lsp.ts",
      "args": ["--stdio"],
      "fileTypes": [".ts", ".tsx", ".js", ".jsx", ".py"],
      "rootMarkers": [".omp/graph-intelligence", "tsconfig.json", ".git"],
      "warmupTimeoutMs": 5000,
      "isLinter": false
    }
  }
}
```

### THE DOUBLE LAYER (the operator's framing)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  LAYER 1 · THE STANDARD LSP SURFACE (what the editor expects)            │
│    hover · definition · references · completion · rename · format ·      │
│    diagnostics — served FROM the GI layers (references = the real         │
│    who-calls; definition = the canonical node; hover = the fact card)     │
├──────────────────────────────────────────────────────────────────────────┤
│  LAYER 2 · THE INTELLIGENCE BACKEND (the Card-HUD's brain)               │
│    the same server ALSO emits the Card-HUD's fact cards as diagnostics    │
│    (callers · unwired · conflicts · meaning · scope) — so the HUD's       │
│    cards and the LSP's diagnostics come from ONE source, the same 6       │
│    layers                                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│  ★ THE TWO JEV KERNELS WIRE IN TOO:                                       │
│    TSG (JevK5 on GPU) → the `meaning` diagnostic (a symbol's name-vs-     │
│      behaviour drift) + the hover card's judgement                        │
│    ABIDE (the live judge) → a `Warning` diagnostic on an edited hunk      │
│      (the REPAIR band) — fail-OPEN                                     │
│    (the CLAIM FIREWALL stays at turn-end — fail-CLOSED)                   │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## §5 → THE MACRO ENFORCEMENT LOOP

```
┌────────────────────────────────────────────────────────────────────────────┐
│  THE MACRO LOOP — today (enforcement only)   →   with the GI LSP           │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   ① the agent EDITS                                                        │
│        │                                                                   │
│        ├──► [AUTO] the GRAPH GATE ......... drift? → STEER / BLOCK         │
│        ├──► [AUTO] the ABIDE JUDGE ........ a REPAIR band → a note         │
│        ├──► [NEW]  the GI LSP ............. the file's CARDS → diagnostics │
│        │                                                                   │
│        ▼                                                                   │
│   ② the agent's context now carries: the callers + the blast radius +      │
│      the unwired list + the cross-layer conflicts + the meaning verdict    │
│        │                                                                   │
│        ▼                                                                   │
│   ③ the agent acts WITH the structure (no guess)                           │
│        │                                                                   │
│        ▼                                                                   │
│   ④ the turn CLOSES                                                        │
│        │                                                                   │
│        └──► [AUTO] the CLAIM FIREWALL ..... FABRICATED → REJECT            │
│                                                                            │
│  ★ THE LOOP CLOSES: the graph INFORMS the edit (LSP), the gate POLICES it   │
│    (drift), the judge REPAIRS it (ABIDE), and the firewall CERTIFIES the   │
│    claim (turn-end). Four automatic surfaces, one loop.                    │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## §6 THE SEMANTICA 80% — WHY, AND THE FIX (APPLIED)

**THE MEASURED WHY (before):**
```
L1 first-segment histogram:  live-tree=1767 · fork-v143=1767 · src=1045
                             Ship_Packages=778 · tests=52 · vendor=30
→ CURRENT tree = 1,106 ;  OTHER = 4,342  →  80% WRONG
```

**THE MECHANISM:** `scripts/semantica-ingest.py`'s SKIP lacked the foreign trees; the repo carries
`fork-v143/` (284 files) + `live-tree/` + `Ship_Packages/` (133) + `SHIP_PACKAGES/` (69) +
`vendor/` (9) as CHECKED-IN directories, so the ingest indexed them as source.

**THE FIX (APPLIED this session):**
```python
SKIP = {"node_modules", ".git", "Checkpoints", "graphify-out", "dist", "out",
        ".trident", "research", "SHIP_PACKAGES", "packages", ".ua", "reports",
        "__pycache__", ".venv", "corbell-data",
        # ★ THE OTHER-TREE LAW (2026-09-27): checked-in FOREIGN trees MUST be skipped
        "fork-v143", "live-tree", "vendor", "Ship_Packages"}
```

**THE CLEANED L1 (after):**
```
entities=1220  relationships=1484   (was 5450 / 6081 — the junk is gone)
root histogram:  src 1128 (92%) · tests 69 (6%) · scripts 21 (2%) · extensions 2 (0%)
by type:         symbol 1016 · file 204
★ 100% IN-SCOPE.  The 5.8x size drop (7.06 MB → 1.21 MB) IS the junk leaving.
```

**THE 3 ANTI-PATTERNS + THE 3 FIREWALLS (to backwards-engineer):**

| the anti-pattern | the firewall |
|---|---|
| AP-1 THE PER-CONSUMER SKIP LIST (each producer re-invents .gitignore) | ONE shared `WALK_SKIP`, imported by every producer + a test asserting the import |
| AP-2 THE MEGA-UNTITLED-TREE (fork + archive checked in) | a graph-health gate that fails when >5% of a store's rows sit under a non-source root |
| AP-3 THE UNSCORED INGEST (no path histogram at build time) | every populate prints its ROOT HISTOGRAM; <90% src = GI_LAYER_SCOPE_SUSPECT, exit 1 |

---

## §7 HOW WE KNOW THE OTHER LAYERS ARE CLEAN — the graph-health audit

```
┌────────────────────────────────────────────────────────────────────────────┐
│  GHA-1 · THE RESOLUTION CHECK                                              │
│    for every node's file → does the path EXIST from the repo root?          │
│  GHA-2 · THE ROOT HISTOGRAM  ← the check that FOUND the defect              │
│    group by first segment; report each root's share                        │
│  GHA-3 · THE ARCHIVE ROW COUNT                                             │
│    rows matching Checkpoints|Ship_Packages|graphify-out|fork-v143          │
└────────────────────────────────────────────────────────────────────────────┘
```

| the layer | GHA-1 | GHA-2 | GHA-3 | VERDICT |
|---|---|---|---|---|
| L1_SEMANTICA | 5450/5450 | 80% other | — | ❌ SCOPE → **FIXED (92% src now)** |
| L2_ARSUMBRIS | 7 instances | repo-scoped | 0 | ✅ |
| L3_UA | 5155/5155 | src/ scripts/ | 0 | ✅ |
| L4_C2KG | 215/215 | src/ packages/ | 0 | ✅ |
| L5_CORBELL | resolve | 1144/1326 src | 0 | ✅ |
| L6_GRAPHIFY | resolve | src/ rel | 0 | ✅ |
| structural | resolve | Checkpoints 52% | 54,224 | ❌ SCOPE — **TO FIX** |

**→ STANDARDISE AS `scripts/graph-health.ts`**: all 3 checks over every store + the JSON layers,
the per-layer table, exit nonzero when any layer is <90% in-scope. **Wired into `gi-populate` as
a final gate.**

---

## §8 THE 6 CLAIM-FIREWALL FINDINGS — THE FIX PLAN

| # | sev | the fix | the file | the test |
|---|---|---|---|---|
| A-1 | CRITICAL | word-boundary regex (`\bN\b`) + reject a failure-signal span + require ALL tokens | claim-firewall.ts:149-153 | test_claim_firewall_rejects_negated_span |
| A-5 | HIGH | `attachClaimFirewall(pi, {judge})` + forward it + `await` the judge | :328 + :306 | test_claim_firewall_judge_wired |
| A-3 | HIGH | `sidOf` returns null on no id; bound `turnSpans` (LRU + TTL) | :243-247 + :307 | test_claim_firewall_no_cross_session_support |
| A-4 | HIGH | count wired surfaces; 0 → `throw GI_FABRICATED_CLAIM` | :338-344 | test_claim_firewall_no_surface_throws |
| A-2 | HIGH | claim-shaped context (a test/build token nearby) | :78 | test_claim_firewall_ignores_plain_prose |
| A-6 | MED | null-guards + try/catch → fail CLOSED | :182-186 | (folded into A-4) |

**→ then re-run the muse-go audit → target 0 critical / 0 high → then re-grade D7.**

---

## §9 THE BOOT-PERSISTENCE (all four)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  ① au-engine daemon ...... ✅ DONE — systemd --user, ENABLED, active        │
│  ② THE LAYER REFRESH ..... au-engine-refresh.timer (30 min) → `gi-populate` │
│  ③ THE TTL ............... widen `unknown` 1 h → 24 h + record the          │
│                            derivation class on the store                    │
│  ④ THE AUTO-INTELLIGENCE . THE GI LSP (the reflexive sense organ) + the     │
│                            Card-HUD hook (the portable fallback)            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## §10 THE DE-BRANDING LAW (the operator's order)

**"there should be NO TRIDENT BRANDING ANYWHERE IN THIS PROJECT."**

**MEASURED SCOPE:** 53 files in `src/` + `scripts/` (and 503 repo-wide incl. the archive).

**THE TWO CLASSES:**
1. **THE PROVENANCE COMMENTS** — `// PORTED FROM fork-v143 live-tree/…/<the-bug-hunter>/…`
   (a text change; ~50 files)
2. **THE `/.trident/` STORE PATH** — `join(root, '.trident', 'knowledge-graph', 'shared.db')`
   (**a FUNCTIONAL dependency** — the store's location; a rename needs a migration)

**THE PLAN:** (a) rename the store dir `.trident/` → `.gi/` with a read-fallback + a one-time
migration; (b) rewrite the provenance comments to `// PORTED FROM <the upstream tree> (archived)`;
(c) rename the `<the-bug-hunter>` subagent dir + its identifiers; (d) a detector:
`grep -ri trident src/ scripts/ | wc -l → 0`.
