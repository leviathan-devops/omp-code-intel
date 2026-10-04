# GI KERNEL V2.2 — THE WAVE PLAN
WAVES: 6

**The spec:** `GI_KERNEL_V2.2_REBUILD_SPEC.md` (711 lines, SPEC-AUDIT: APPROVED 0/8) — the BINDING AUTHORITY.
**The blueprint:** `GI_KERNEL_V2.2_MASTER_BLUEPRINT.md` (327 lines, 7 derailments catalogued).

**THREE PARALLEL FRONTS (disjoint files).** Front A (the capability) and Front B (the judge) run
CONCURRENTLY; only W4 (the proof) waits on A's W2/W3. Front C (testing) is continuous.

| front | the waves | the files (DISJOINT) |
|---|---|---|
| A · THE CAPABILITY | W1 → W2 → W3 → W4 | `src/hunter/profile/source-roots.ts` (NEW) · `src/hunter/graph/corbell-adapter.ts` · `scripts/corbell-build.ts` · `scripts/graphify-build.ts` · `scripts/structural-extract.py` · `scripts/gi-populate.ts` (NEW) · `src/omp/typed-write.ts` · `src/omp/store-open.ts` · `src/scoping/*.ts` |
| B · THE JUDGE | W5a → W5b → W5c | `src/omp/adapters/jevk5.ts` (NEW) · `src/omp/claim-firewall.ts` (NEW) · `src/omp/adapters/abide.ts` · `src/omp/layer-consumption.ts` · `src/omp/extension.ts` |
| C · THE TESTING | W6 (continuous) | `tests/` · `scripts/` · the rig `omp-ct-gi20` |

---

## W1 — PURGE THE GHOST STORES
**owner:** Front A · **disjoint files:** the store DATA (no code) · **depends on:** nothing
**deliverable:** the two ghost stores deleted; the semantica empty kg deleted
**gate (mechanical):** `ls .omp/graph-intelligence/{corbell,graphify}-checkout/store.sqlite` → ABSENT
**test ids:** `test_purge_ghost_stores_absent` (a file-absence assert in the W1 script-test)
**evidence:** the before/after `ls` output + the `SELECT COUNT(*) WHERE file LIKE 'src/%'` → 0 recorded

## W2 — TARGET-DRIVEN SOURCE-ROOT DISCOVERY
**owner:** Front A · **disjoint files:** `src/hunter/profile/source-roots.ts` (NEW) + its test ·
`src/hunter/graph/corbell-adapter.ts:611` · `scripts/corbell-build.ts` · `scripts/graphify-build.ts`
· `scripts/structural-extract.py` · **depends on:** W1
**deliverable:** `discoverSourceRoots(target)` — the 5 rules; a no-hit is `GI_NO_SOURCE_ROOT`
**gate (mechanical):** `bun test -t test_source_roots_pnpm` + `-t test_source_roots_tsconfig` +
`-t test_source_roots_plain` + `-t test_source_roots_none_refuses` — 4 green
**test ids:** `test_source_roots_pnpm` · `test_source_roots_tsconfig` · `test_source_roots_plain` ·
`test_source_roots_none_refuses`
**evidence:** the real target builds >0 nodes: `bun scripts/corbell-build.ts --target
research/graph-infra-repos/Understand-Anything` → exit 0 + nodes > 0 (today: GRAPH_EMPTY)

## W3 — CONTENT SCOPING (the store asserts its build root)
**owner:** Front A · **disjoint files:** `src/omp/typed-write.ts` · `src/omp/store-open.ts` ·
`src/scoping/{scope-binding,scope-resolver,db-path,scoped-store,session-state}.ts` · **depends on:** W2
**deliverable:** `gi_meta.build_root` written on every store write; every read asserts it
**gate (mechanical):** `bun test -t test_store_scope_mismatch_refuses` green (a cross-scope read
throws `GI_STORE_SCOPE_MISMATCH`)
**test ids:** `test_store_scope_mismatch_refuses` · `test_store_build_root_written` ·
`test_scope_tiers_no_drift`
**evidence:** the refusal string in a tool result + the `gi_meta` row read back

## W4 — THE SELF-POPULATE PATH (the capability, proven)
**owner:** Front A · **disjoint files:** `scripts/gi-populate.ts` (NEW) · `src/omp/populate.ts` ·
`src/omp/populate-graphify.ts` · **depends on:** W3
**deliverable:** `gi-populate --target <dir>` builds every layer into the TARGET's own scope
**gate (mechanical):** `rm -rf .omp/graph-intelligence && bun scripts/gi-populate.ts --target .` →
exit 0 + the per-layer table all >0; then a FRESH project populates and the register reads 8/8 or
each DOWN layer names its reason
**test ids:** `test_populate_fresh_project_eight_of_eight` · `test_populate_reproducible_after_rm` ·
`test_populate_writes_target_scope`
**evidence:** the register `consumed:N/8` on the fresh project + the store's `build_root` == the target

## W5a — WIRE JEVK5 (the GPU shift — the operator's ruling R1/R2)
**owner:** Front B · **disjoint files:** `src/omp/adapters/jevk5.ts` (NEW) · `src/omp/layer-consumption.ts`
· **depends on:** nothing (parallel from the start)
**deliverable:** the probe's contract recorded; `jevk5Probe` calls `:8090/v1/systemone`; the TSG
probe prefers JevK5 (GPU) → KEV (CPU) → tsg CLI
**gate (mechanical):** `bun scripts/consumption-audit.ts . <sym> | grep TSG` → the evidence names
`jevk5` + the port
**test ids:** `test_jevk5_probe_contract_recorded` · `test_jevk5_health_reachable` ·
`test_tsg_prefers_jevk5`
**evidence:** the `curl :8090` request/response pair + the TSG evidence line

## W5b — ABIDE JUDGES LIVE (not the ledger)
**owner:** Front B · **disjoint files:** `src/omp/adapters/abide.ts` · **depends on:** W5a
**deliverable:** the adapter gains a `judge(diff)` path calling JevK5 on the CURRENT hunk
**gate (mechanical):** `bun test -t test_abide_live_judge_on_diff` green (a rule-violating diff →
a verdict from a live call)
**test ids:** `test_abide_live_judge_on_diff` · `test_abide_fail_open_no_key` ·
`test_abide_ledger_is_fallback_only`
**evidence:** the judge call in the trace (not a `tailEvents` read)

## W5c — BUILD L2, THE CLAIM FIREWALL (the missing blocking half)
**owner:** Front B · **disjoint files:** `src/omp/claim-firewall.ts` (NEW) · `src/omp/extension.ts`
· **depends on:** W5a
**deliverable:** the fail-CLOSED completion gate: a claim atom with no THIS-TURN tool-result span
→ `FABRICATED` → the turn REJECTED
**gate (mechanical):** `bun test -t test_claim_firewall_fabricated_rejected` green
**test ids:** `test_claim_firewall_fabricated_rejected` · `test_claim_firewall_bound_span_supported`
· `test_claim_firewall_polarity_not_unified`
**evidence:** a fabricated claim's tool-result status = REJECTED

## W6 — THE HONEST TESTING REGIME (the 3 tiers — continuous)
**owner:** Front C · **disjoint files:** `tests/` · the rig · **depends on:** nothing (runs across all)
**deliverable:** every capability claim carries SCRIPT + CONTAINER + HOST evidence
**gate (mechanical):** the container rig on a REAL project reads `consumed:8/8` or each DOWN layer's
named reason — captured in `.trident/ct-results.json`
**test ids:** `test_container_register_on_real_project` · `test_host_deployed_reading` ·
`test_three_tier_evidence_present`
**evidence:** the results artifact + the screenshots

---

## THE DEPENDENCY GATES (boundary checks — never dispatch a dependent on a claimed-complete predecessor)
```
  T0  W1 + W5a fire together (a delete + a probe; neither blocks the other)
  T1  W1 green (the ghost stores absent) → fire W2
  T2  W2 green (the real target builds >0 nodes) → fire W3
  T3  W3 green (the scope-mismatch refusal fires) → fire W4
  T4  W5a green (the contract recorded) → fire W5b + W5c
  T5  W4 + W5b + W5c green → the full register on a fresh project (D2)
  T6  W6 continuous — its gate is the container reading on a real project
```
