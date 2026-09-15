# GI OMP FORK — SOURCE PIN

**Forked:** 2026-09-14
**Destination:** `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence`
**Cleanest recoverable checkpoint:** `graph-intelligence-v143-live-sealed`
**Source:** `/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/MIMOCODE/Graph_Intelligence/Checkpoints/graph-intelligence-v143-live-sealed`
**Seal sha16:** `63247bff8e2baf8f` (v1.4.3, 249 files, 238 .ts in live-tree)
**Why this checkpoint:** VERSION_MAP.md records v1.1.x–v1.4.2 as UNRECOVERABLE-AS-TREE (manifest ids only). v1.4.3 is the only RECOVERABLE live tree. ST 43/43 attested. EN-38 graph-mapper sha16 `3383c961609d24c0` byte-identical to v443-en38.

**Layout:**
- `fork-v143/` — full checkpoint copy (sqlite/node_modules/key json excluded)
- `live-tree` → `fork-v143/live-tree` (the 249 seal-listed files at live bytes)
- `vendor/workspace-scoped-state-boilerplate/` — KNOWLEDGE_LIBRARY copy (6 ts + README + tests)
- `docs/GI_OMP_FIRST_CLASS_DPL1_SPEC.md` — the OMP wiring spec (this fork's build contract)

**Not copied:** runtime `*.sqlite*`, `node_modules`, key json, `.trident/` session state.

**Do not edit the MIMOCODE source tree from this fork.** The MIMOCODE project remains the historical parent. This JARVIS OMP tree is the continuation base for first-class OMP wiring.
