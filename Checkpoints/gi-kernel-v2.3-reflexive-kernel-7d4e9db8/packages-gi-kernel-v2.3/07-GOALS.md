# GI KERNEL V2.3 — THE GOAL PROMPTS + THE ORG

## THE HYDRA ORG

```
┌────────────────────────────────────────────────────────────────────────────┐
│  THE ORCHESTRATOR (the primary session)                                    │
│    ├─ owns: the wave sequence, the gates, the audit, the ship              │
│    ├─ never: writes the work (it dispatches + audits)                      │
│    └─ escalation: VIOLATION 1 → kick · 2 → reassign · 3 → retire the desk  │
├────────────────────────────────────────────────────────────────────────────┤
│  DESK-A · THE LSP (W1 · W3 · W4)        the server + the cards + the Jev   │
│  DESK-B · THE WIRING (W2 · W5)          OMP native + the HUD fallback      │
│  DESK-C · THE CLEAN FLOOR (W0 · W8)     the skip law + the health + the boot│
│  DESK-D · THE CORRECTNESS (W6 · W7)     the firewall + the de-brand        │
│  DESK-E · THE SHIP (W9)                 the dist + the checkpoint + the audit│
└────────────────────────────────────────────────────────────────────────────┘
```

## THE PER-DESK GOAL PROMPTS

### DESK-A — THE LSP
```
GOAL: make `gi-lsp` answer. A stdio LSP server backed by the 6 layers.
ANCHORS: the checkpoint's lsp-injector.ts (the baseline) · src/omp/adapters/{corbell,graphify,
         structural,ua,c2kg,jevk5,abide}.ts (the readers) · /home/leviathan/omp-src/docs/lsp-config.md
LAWS:   a card NEVER blocks · a missing store → GI_NO_STORE (loud) · a stale store → GI_LAYER_STALE
        · every card carries its store row + the measured count
BATTERY: bun run test → 453/0 + 551/0 (no regression)
STOP:   `bun scripts/gi-lsp.ts --selftest` → ≥1 diagnostic, source ∈ GI_LSP_TOKENS
FORBIDDEN: a stub · a fabricated card · a silent empty
```

### DESK-B — THE WIRING
```
GOAL: OMP queries `gi-lsp` NATIVELY on every write; the Card-HUD hook is the fallback.
ANCHORS: ~/.omp/agent/lsp.json (to create) · gate-hook.ts:92 (the pattern) · :163 (the delivery)
LAWS:   the LSP registration matches the schema (command/fileTypes/rootMarkers) · the HUD INFORMS
BATTERY: the hook tests + the battery
STOP:   `omp lsp hover <file:line>` → a GI-sourced result
FORBIDDEN: a bespoke sidecar · a HUD that throws
```

### DESK-C — THE CLEAN FLOOR
```
GOAL: one skip law; the health gate; the boot-persistence.
ANCHORS: source-roots.ts (WALK_SKIP) · semantica-ingest.py:34 · structural-extract.py · gi-populate.ts:230
LAWS:   every producer imports the shared skip · <90% in-scope → GI_LAYER_SCOPE_SUSPECT (exit 1)
BATTERY: the health script + the battery
STOP:   `bun scripts/graph-health.ts .` → exit 0; every layer ≥90% src
FORBIDDEN: a per-producer skip list
```

### DESK-D — THE CORRECTNESS
```
GOAL: the 6 firewall findings closed; 0 trident in src+scripts.
ANCHORS: claim-firewall.ts:78,149-153,182-186,243-247,306-307,328,338-344 · the 53 de-brand files
LAWS:   keep BOTH halves (the positive still SUPPORTS) · the polarity never unifies · the store
        path rename carries a migration + a fallback
BATTERY: the 6 named tests + the battery
STOP:   the 6 tests green + `grep -ri trident src/ scripts/ | wc -l` → 0
FORBIDDEN: narrowing the binder without the positive control
```

### DESK-E — THE SHIP
```
GOAL: the dist + the checkpoint + the audit + the receipt.
ANCHORS: the package · extensions/graph-intelligence/ · Checkpoints/
LAWS:   the artifact hash check (repo == deployed == checkpoint) · the audit gate honest
STOP:   the battery green · the audit 0 critical / 0 high · the checkpoint sealed
FORBIDDEN: a ship-ready claim on a BLOCKED audit
```
