# THE GRAPH LAYER — WHERE THE DATA IS · SHOW-ME (EXPLAIN)
**Subject:** the 6-layer + 2-kernel Graph-Intelligence machine and the real data in each graph
**Date:** 2026-10-04 · **Branch:** jarvis/gi-main · **Rebuilt:** the warm indexes 2026-10-04 23:04

## ONE PARAGRAPH
Six code-graph stores (L1 SEMANTICA, L2 ARSUMBRIS, L3 UA, L4 C2KG, L5 CORBELL, L6 GRAPHIFY)
are built from the SOURCE TREE by explicit parse-grade builders into warm indexes; on a query the
kernel POPULATES a per-session store (`typed_nodes`/`typed_edges`, supersede-then-insert) from those
indexes; a stdio LSP (`scripts/gi-lsp.ts`) and a Card-HUD then render 5 card shapes
(CALLERS/UNWIRED/MEANING/CONFLICT/SCOPE) that reach the agent. Two Jev enforcement layers (TSG the
meaning gate, ABIDE the repair path) decide every tool-call/edit; both now write their full decision
data to ONE space, `~/.omp/run/gik-jev-layer-fire-log/`.

## THE MASTER VIEW
```
┌──────────────────────────────────────────────────────────────────────┐
│ THE GRAPH-INTELLIGENCE MACHINE — source to agent, one page            │
└──────────────────────────────────────────────────────────────────────┘
                                  │
            ┌─────────────────────┴ the BUILDERS (parse-grade) ─────┐
            │  scripts/semantica-ingest.py · ua-ingest.ts            │
            │  c2kg-produce/run.sh (Bevel) · corbell-build.ts        │
            │  graphify-build.ts (graphify extract)                  │
            └─────────────────────┬─────────────────────────────────┘
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ WARM INDEXES (explicit, minutes)                                      │
│   graphify-out/graph.json   38,215 n   162,404 e                      │
│   corbell-data/…/workspace.db 1,353 n     5,196 e                     │
│   .ua/knowledge-graph.json  1,150 n     1,412 e                       │
│   .omp/…/semantica/kg.json  1,282 n     1,560 e                       │
│   .c2kg/index.json            232 n          0 e  <-- NO EDGES        │
│   ~/.arsumbris/au-engine/run/*.sock   (LIVE socket, schema v29)       │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ substrateNeedsPopulate() -> populate
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SESSION STORE  sessions/{sid}/store.sqlite                            │
│   typed_nodes 1,266 · typed_edges 2,714   (kernel-populated)          │
│   UNIQUE INDEX uq_tn_live_canonical WHERE superseded_run IS NULL      │
└──────────────────────────────┬───────────────────────────────────────┘
                               │ src/gi-lsp/cards.ts  (5 card shapes)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ INJECTION   gi-lsp --stdio (diagnostics)  +  Card-HUD (steer note)    │
└──────────────────────────────┬───────────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│ THE AGENT sees: CALLERS · UNWIRED · MEANING · CONFLICT · SCOPE        │
└──────────────────────────────────────────────────────────────────────┘
```
(remainder of the full report is in the chat delivery)
