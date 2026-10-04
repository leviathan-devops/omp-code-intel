# GI KERNEL V2.3 — THE DISCOVERY (measured this session)

## THE MEASURED INVENTORY

| the surface | the measurement | the command |
|---|---|---|
| the repo | jarvis/gi-main @ 018aad8 | `git log -1` |
| src | 118 `.ts` / 36,057 lines | `find src -name '*.ts' -exec cat {} + \| wc -l` |
| the dist | `b2ab09acc77684e4` (800,295 B) | `sha256sum extensions/graph-intelligence/index.js` |
| the battery | 453/0 + 551/0, EXIT 0 | `bun run test` |
| tsc | exit 0 | `bunx tsc --noEmit` |
| the register | the GI repo 7/8 · a foreign target 3/8 | `bun scripts/consumption-audit.ts . <sym>` |
| the layers | 7 populated (corbell·graphify·structural·ua·semantica·c2kg + au) | the register |
| the LSP surface | `~/.omp/agent/lsp.json` (absent) | `ls` |
| the OMP LSP runtime | 14 ops · `lsp.diagnosticsOnWrite` ON | `/home/leviathan/omp-src/docs/lsp-config.md` |
| the baseline | the LOGIC-LSP injector (lsp-injector.ts) | the checkpoint (`plutus-corbell-container-tested`) |

## THE LAYER AUDIT (the accuracy check — 3 mechanical probes)

| the layer | nodes | GHA-1 resolve | GHA-2 root | GHA-3 archive | verdict |
|---|---|---|---|---|---|
| L1_SEMANTICA | 1,220 (was 5,450) | ✅ | **92% src** (was 20%) | 0 | ✅ **CLEANED** |
| L2_ARSUMBRIS | 7 instances | ✅ | repo-scoped | 0 | ✅ |
| L3_UA | 5,155 / 5,665 edges | ✅ 5155/5155 | src/ scripts/ | 0 | ✅ |
| L4_C2KG | 215 files | ✅ 215/215 | src/ packages/ | 0 | ✅ (file-level) |
| L5_CORBELL | 1,361 / 5,044 edges | ✅ | 1144/1326 src | 0 | ✅ |
| L6_GRAPHIFY | 1,834 / 3,989 edges | ✅ | `src/…` rel | 0 | ✅ |
| structural | 70,453 / 109,313 edges | ✅ | **Checkpoints 52%** | **54,224** | ❌ **TO FIX** |

## THE FOREIGN TREES CHECKED IN (the pollution source)

| the tree | files | what it is |
|---|---|---|
| `fork-v143/` | 284 | an entire prior fork |
| `live-tree/` | 0 (dirs) | the fork's live tree |
| `Ship_Packages/` | 133 | the ship-package archives |
| `SHIP_PACKAGES/` | 69 | the archives |
| `vendor/` | 9 | vendored deps |
| `Checkpoints/` | 2,090 | the checkpoint archives |

## THE ENFORCEMENT WIRING (measured)

```
extension.ts:858  registerGraphGate(pi)
extension.ts:863  attachClaimFirewall(pi)
gate-hook.ts:92   pi.on("tool_call")     → the GRAPH GATE (+ judgeDiff at :113)
gate-hook.ts:163  pi.on("tool_result")   → the steer delivery
claim-firewall.ts:308 pi.on("tool_result")   → the span collector
claim-firewall.ts:340 pi.on(<turn-end>)      → the CLAIM FIREWALL
```

## THE LSP BASELINE (read from the checkpoint)

`…/plutus-corbell-container-tested/src/subagents/<the-bug-hunter>/surface/lsp-injector.ts`
— `DiagnosticsServer` · `resolveProjectRoot` · `getProjectDiagnosticsServer` ·
`resolveDiagnosticsServerForFile` · `extractTouchedFile` · `inject` · `LOGIC_LSP_BYTE_COST = 500`.
Its measured evidence: *"LOGIC-LSP: injected the file-scoped diagnostics block (206 chars) into the
read result"* + *"ONE SHARED LSP PER PROJECT"*.

## THE DE-BRAND SCOPE (measured)

| the surface | the count |
|---|---|
| `src/` + `scripts/` files with "trident" | **53** |
| the classes | (1) the provenance comments `// PORTED FROM …/<the-bug-hunter>/…`; (2) the `.trident/` STORE PATH (functional) |

## WHAT I DID NOT READ

- the upstream `trident-plugin` source (the baseline is the checkpoint's injector + the OMP docs)
- the OMP Rust LSP internals (the contract is the docs + the config schema)
- `fork-v143/` + the archives (deliberately — they are the pollution)

## THE VARIANT TABLE (the baseline lineage)

| the variant | the content | the verdict |
|---|---|---|
| `…/plutus-corbell-container-tested/…/lsp-injector.ts` | the LOGIC-LSP (the tool.after injector) | **the WINNER** (the only complete one) |
| `GI_GRAPH_GATE_V13_DPL1_SPEC.md` (this repo) | the graph gate's design | the sibling (a different surface) |
| `src/hunter/surface/lsp-injector.ts` (this repo) | the PORTED copy | the descendant (to de-brand) |
