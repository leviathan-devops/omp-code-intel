# Architecture reference — substrates, flows, files (GI_OMP_FULL_PORT_DPL1_SPEC §B.1)

- Upstream builders: corbell CLI (method graph → workspace.db) · graphifyy CLI (concept graph → graph.json, `--no-cluster` explicit) · ripwire 0.6.0 (on-demand index, baked in-image).
- Populate (one switch, three readers): `src/omp/populate.ts:51-58` switch {corbell|graphify|regex-named-fallback}, DEFAULT corbell. corbell leg: `populate-corbell.ts` (warm checkout + freshness + supersede). graphify leg: `populate-graphify.ts` (graph.json freshness vs mtime + `GraphifyAdapter.buildSync` + gi_meta `substrate=graphify` + node/edge counts). Fallback: mechanical regex indexer, NAMED (`CORBELL_NOT_WARM:*` / `GRAPHIFY_NOT_WARM:*` + rebuild remedy).
- Adapters: `src/hunter/graph/corbell-adapter.ts` (fix-bundle) + `graphify-adapter.ts` (kind/predicate maps, resolveGraphifyOut, lineless passthrough) behind `interface.ts:242 case graphify` + `selectAdapter`.
- Hunter: RECON (recon.ts runId `<project>-hunt-<yyyyMMdd>-<seq>`) → MAP (map.ts:45-58 + line-resolve.ts + LINELESS_NODE guard) → SCAN/TRACE/STRIKE/REPORT → HUNT_DONE + artifact + event row.
- Audit: `src/hydra/` (client-reader/map-reader/auditor/pipeline + templates 14 R18–R31 + 3 batteries); `runTemplateAudit` → HunterSettlement fulfilled/rejected → AUDIT_DONE / GI_AUDIT_NOT_WIRED.
- Store: `{scopeRoot}/.omp/graph-intelligence/sessions/{sid}/store.sqlite` (gi-registry WAL, store-open GI_SCOPE_REFUSED, gi_meta substrate ledger).
- Gate: FULL cancels GRAPH_GATE_SIGNATURE_BREAK; STEER advises; OFF lands tokenless; gate log per write/edit.
- Files: extension factory `src/omp/extension.ts` (GI_TOOL_NAMES + alias map); bridge `src/omp/ripwire-bridge.ts` (8 consults, 8s bound, fail-soft); pool `src/hunter/keys/go-key-pool.ts` (§FALLBACK).
