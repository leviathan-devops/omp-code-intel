# CHECKPOINT MANIFEST — gi-v21-seal-pre-cleanup-3ee605dd

Token: gi-v21-seal-pre-cleanup-3ee605dd (hyphens only; state = V21 SEAL BEFORE THE FULL FINDINGS-CLEANUP WAVE).
Date: 2026-09-16. Branch jarvis/gi-main @ f3442be. Follows gi-gatefail-pre-V20-ee122880.

## Why this checkpoint exists
- The operator ordered the FULL cleanup of all pending audit findings. This is the byte-exact before-state: V21 design rework (W1-W12 + fix-now F1-F3) sealed and proven, with the frozen-scan residue (57 findings: 0 crit / 27 high / 24 med / 6 low, session 3759fac5) still open. Every cleanup fix diffs against this tree.

## Dist SHAs (zero drift, exec-verified 4 copies at save)
- GI extensions/graph-intelligence/index.js: 3ee605ddd463331b... (checkpoint copy MATCH)
- Trident dist/index.js: 17aa8c45a84fe081... (checkpoint copy MATCH)
- Host-deploy + restored rig gi-omp-port: identical prefixes (docker exec verified this turn).

## Battery + state
- Battery: 127 pass / 0 fail / 937 expect across 20 files (this turn, after host-restart recovery: fixture regenerated 4n/5e, pool tests geometry-relative + hermetic GO_POOL_DB).
- Live: rig restored from omp-ct:master, dists deployed + sha-verified, G1 who-calls rows=2 + G4 AUDIT_DONE findings=3 (run-id 1789549939964) on these exact bytes.
- V21 rework sealed: identity model (canonical-id traversal), tombstone writes, txn-guarded batches, enqueue-marked BFS, id-keyed blast CTE, grep -- terminator, Tarjan SCC, loud search-failure, lineless named refusals, shared pool DB + ordered classifier + clamped windows + full redaction, corbell revalidation, root-contained projection.

## Contents
- src/: 80 .ts (hunter/hydra/omp/scoping) == project count.
- tests/: 20 files (17 ST + 3 hydra batteries) — the full battery incl. st-v21-identity.
- dist/: index.js (GI 3ee605dd) + trident-index.js (17aa8c45) — MATCH.
- context_management/: RUNNING_BUILD_LOG.md (the project's single-doc canon — structural absence of the >=11 floor recorded).
- Ship docs: all 5 + SHIP_DOCS_MANIFEST (Baseline eab074e3 pre-dates this seal — manifest re-baseline lands with the cleanup close-out commit; noted as honest gap).
- Authority: GI_OMP_FULL_PORT_DPL1_SPEC.md (302L) + MIGRATION_MANIFEST.md (761L) + reports/V21_DESIGN_REWORK_PLAN.md.
- Artifacts: ct-results-graphify.json.

## Honest gaps
- 57 audit findings OPEN in this snapshot by design (the cleanup wave's targets). F1-F3 from the same scan are ALREADY FIXED in this tree (89bea7a) — the frozen scan predates them.
- SHIP_DOCS_MANIFEST Baseline SHA is eab074e3 (pre-V21) — one commit behind the dist; re-baselined in the cleanup close-out.
- Canon >=11-doc floor: project maintains 1 (RUNNING_BUILD_LOG) — structural, recorded.
- G3 hunt + port2 isolation legs: last proven pre-restart (STALE per status report) — re-proof lands in the cleanup close-out.
- MODE B mutable working snapshot — no chattr (the cleanup wave lands on this lineage).
- Secret scan at save: clean.

## Next work (the ordered cleanup wave, operator order "clean up ALL pending findings")
- Per-file: typed-write (safeDelete identity, txn-guard hardening) → populate-graphify (warm-wins exact-granularity, excludes threading, open-in-try, checkout per-table guard) → populate-corbell (real TOCTOU re-stat, single-stat law) → extension (layerId loud, confinement empty-target + ':' split, delegation ruleId, repopulate guard) → go-key-pool (snapshot single-read, dead-mark honesty, earliest-dead expiry, weeks/months dialects, overloaded class, stable key identity) → graphify-adapter (lineless skip+count, single containment root, collision-proof dedup + edge remap, readonly fix) → auditor (nodeFile traversal, two-leg failure loud, graph shape guard).
- Then: full battery → rebuild both dists → deploy both rigs → TUI legs → ONE final frozen scan → the verdict, triaged honestly.
