# GI KERNEL V2.3 — THE WAVE PLAN

**THE LAW:** every wave's deliverable is THE EDGE, never a file. A wave naming only a file is REFUSED.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  BANNED (the file-organized wave)                                          │
│    W1  gi-lsp.ts      W2  cards.ts      W3  card-hud.ts                     │
│                                                                            │
│  REQUIRED (the edge-organized wave)                                        │
│    W1  the LSP ANSWERS      gate: a diagnostic on a real file              │
│    W2  OMP CONSUMES IT      gate: `omp lsp hover` → a GI result            │
│    ...                                                                     │
└────────────────────────────────────────────────────────────────────────────┘
```

## THE WAVES

| the wave | THE EDGE (the deliverable) | the files | the GATE (the command) | the evidence |
|---|---|---|---|---|
| **W0** | the CLEAN FLOOR: semantica clean + the shared skip + the structural fix | `semantica-ingest.py` · `structural-extract.py` · `source-roots.ts` | `bun scripts/graph-health.ts .` → exit 0; every layer ≥90% in-scope | the per-layer root histogram |
| **W1** | the LSP **ANSWERS**: `gi-lsp` returns a fact-card diagnostic | `scripts/gi-lsp.ts` · `src/gi-lsp/{server,diagnostics,layer-readers}.ts` | `bun scripts/gi-lsp.ts --selftest` → ≥1 diagnostic, source ∈ GI_LSP_TOKENS | the JSON-RPC transcript |
| **W2** | **OMP CONSUMES IT**: the native runtime queries the server on a write | `~/.omp/agent/lsp.json` | `omp lsp hover <file:line>` → a GI-sourced result | the OMP lsp result |
| **W3** | the **CARDS** are real: the 5 shapes render from measured rows | `src/gi-lsp/cards.ts` | the card tests: CALLERS carries `file:line`; UNWIRED fires at 0 | the diagnostic objects |
| **W4** | the **JEV ROUTE**: TSG → the meaning card; ABIDE → the hunk Warning | `src/gi-lsp/layer-readers.ts` | a meaning card carries the JevK5 confidence | the Jev call + the card |
| **W5** | the **HUD FALLBACK**: the same cards on `tool_call` | `src/omp/card-hud.ts` · `gate-hook.ts` | an edit queues a card; a doc-only edit → silent | the queued card + the delivery |
| **W6** | the **FIREWALL FIXED**: the 6 audit findings closed | `src/omp/claim-firewall.ts` | the 6 named tests green | the test outputs + the re-audit |
| **W7** | the **DE-BRAND**: 0 trident in src+scripts | the 53 files · the store path | `grep -ri trident src/ scripts/ \| wc -l` → **0** | the grep output |
| **W8** | the **BOOT-PERSISTENCE**: the refresh timer + the TTL widen | the timer unit · `typed-write.ts:499` | `systemctl --user list-timers \| grep au-engine-refresh` | the timer + a store's derivation |
| **W9** | the **SHIP**: the dist rebuilt + the checkpoint + the audit | the package · the dist | `bun run test` 453/0+551/0 · the audit 0/0 | the full receipt |

## THE DEPENDENCY GATES

```
T0  W0 fires first (the clean floor — every later gate reads the stores)
T1  W0 green (the health gate exits 0)     → fire W1
T2  W1 green (the selftest emits a card)   → fire W2 + W3 + W4 (parallel — disjoint files)
T3  W2 green (OMP consumes it)             → fire W5 (the fallback; the same card renderer)
T4  W6 + W7 + W8 (independent — parallel with W1..W5)
T5  W9 last (the ship — after every edge is proven)
```

## THE FILE OWNERSHIP (disjoint)

| the wave | the owned files |
|---|---|
| W0 | `scripts/semantica-ingest.py` · `scripts/structural-extract.py` · `src/hunter/profile/source-roots.ts` |
| W1 | `scripts/gi-lsp.ts` · `src/gi-lsp/**` |
| W2 | `~/.omp/agent/lsp.json` (outside the repo) |
| W3/W4 | `src/gi-lsp/cards.ts` · `src/gi-lsp/layer-readers.ts` |
| W5 | `src/omp/card-hud.ts` · `src/omp/gate-hook.ts` |
| W6 | `src/omp/claim-firewall.ts` |
| W7 | the 53 files + the store path |
| W8 | the timer unit · `src/omp/typed-write.ts` |
