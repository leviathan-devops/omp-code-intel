# GI KERNEL V2.3 — THE WAVE PLAN
WAVES: 10

**The spec:** packages/gi-kernel-v2.3/GI_KERNEL_V2.3_DPL1_SPEC.md (SPEC-AUDIT: APPROVED 0/8) — the BINDING AUTHORITY.
**The blueprint:** GI_AUTO_INTELLIGENCE_AND_LSP_BLUEPRINT.md · **The next-steps:** reports/GI_KERNEL_V2.3_NEXT_STEPS_BLUEPRINT_v1.md.

**EVERY WAVE'S DELIVERABLE IS AN EDGE, NEVER A FILE.** A wave naming only a file is REFUSED.

| the wave | THE EDGE | the DISJOINT files | the GATE (mechanical) | the test ids |
|---|---|---|---|---|
| W0 | the CLEAN FLOOR: every layer ≥90% in-scope | scripts/structural-extract.py · src/hunter/profile/source-roots.ts | `bun scripts/graph-health.ts .` → exit 0 | test_graph_health_all_layers_in_scope |
| W1 | the LSP ANSWERS (a fact-card diagnostic) | scripts/gi-lsp.ts · src/gi-lsp/** | the selftest → ≥1 diagnostic, source ∈ GI_LSP_TOKENS | test_gi_lsp_emits_callers_card |
| W2 | OMP CONSUMES IT (queried on a write) | ~/.omp/agent/lsp.json | `omp lsp hover <file:line>` → a GI-sourced result | test_gi_lsp_registered_in_omp |
| W3 | the CARDS are real (5 shapes from rows) | src/gi-lsp/cards.ts | the card tests green | test_card_unwired_fires_at_zero |
| W4 | the JEV ROUTE (TSG→meaning · ABIDE→Warning) | src/gi-lsp/layer-readers.ts | a meaning card carries a confidence | test_card_meaning_carries_confidence |
| W5 | the HUD FALLBACK (cards on tool_call) | src/omp/card-hud.ts · src/omp/gate-hook.ts | an edit queues a card; a doc-edit → silent | test_card_hud_queued_on_edit |
| W6 | the FIREWALL FIXED (the 6 findings) | src/omp/claim-firewall.ts | the 6 named tests green | test_claim_firewall_rejects_negated_span |
| W7 | the DE-BRAND (0 trident) | the 53 files · the store path | `grep -ri trident src/ scripts/ | wc -l` → 0 | test_no_trident_branding |
| W8 | the BOOT-PERSISTENCE | the timer · src/omp/typed-write.ts:499 | `systemctl --user list-timers` shows it | test_ttl_widened_unknown_24h |
| W9 | the SHIP (the dist + the checkpoint + the audit) | the package · the dist | the battery 453/0+551/0 · the audit 0/0 | test_battery_no_regression |

## THE DEPENDENCY GATES
```
T0  W0 first (the clean floor)
T1  W0 green                          → fire W1
T2  W1 green (the selftest)           → fire W2 + W3 + W4 (parallel, disjoint)
T3  W2 green                          → fire W5
T4  W6 + W7 + W8 independent — run parallel with W1..W5 from T0
T5  W9 LAST (after every edge is proven)
```
