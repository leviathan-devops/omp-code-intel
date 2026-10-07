# GIT HISTORY — the build lineage (reconstructed at package time)

Branch: `jarvis/gi-main`
HEAD:   `2a0682b973e1350a35fb214d26a2dad253782eca`

## git log --oneline -20
```
2a0682b feat(gi): W5 — seal the gi-6l2e-gaps-closed checkpoint (union=8/8, ABIDE_JUDGE observable, sha-match)
6d9ba16 feat(gi): W3 — C2KG index gains edges (411) + the adapter reads them (L4 CONSUMED facts=13 on an edge subject)
f0cf7f9 feat(gi): W1+W2 — the L2 symbol/file-space read (L2 CONSUMED 50 facts) + the subject-matrix rows (union=8/8)
88f62b6 feat(gi): W1 — the L2 symbol/file-space read: facts() answers symbol subjects via the engine files read (au-read per-read fields + no-type frames)
4d79de2 fix(abide): the W5b judgeDiff ran but wrote NO ledger row — now observable (ABIDE_JUDGE rows with scores)
8633bc2 docs(ship): round 16 — the live crash test: the .sh write bypass (CRITICAL, fixed), the deploy-not-live finding (HIGH), the php -r gap (HT-BUG-46)
cda9aca docs(ship): round 15 + the treadmill call — the runtime green, the checkpoint resealed at the final sha
93acc97 docs(ship): seal the production checkpoint — the shell lexer + cross-session scoping landed
b2de81b docs(ship): seal the rounds-8-13 checkpoint — the runtime green, the treadmill adjudicated
c036d27 docs(ship): rounds 8-11 — the fresh-audit waves, the runtime green, the treadmill adjudicated (HT-BUG-35)
9047073 docs(ship): round 7 — the fresh audit + the fix wave, the battery green (HT-BUG-31)
3e14869 docs(ship): seal round-6 checkpoint — the fresh audit fixed, the battery green
08371b9 docs(ship): round 6 — the fresh audit + the fix wave, the battery green (HT-BUG-29)
a094bc3 docs(ship): round 5 — the lane-2 waves fixed+proven, the battery green (HT-BUG-27)
d692023 docs(ship): the Lane-2 audit verdict — the high + 5 lows fixed, the lane unblocked (F-184)
54e8dbe docs(ship): the audit lane is BLOCKED by the OpenCode Go subscription 403 (F-183) — the code state is green
cb90ad3 docs(ship): the audit-gate round — HT-BUG-22..25, the BLOCKED verdict, the sealed checkpoint (F-182)
fe21485 docs(ship): round-2 gate-chain sweep — the same defect classes across 3 gates (EN-31, F-177)
b0296bb docs(ship): the shipped-GI-kernel enforcement red-team — the FP hunt + the detector fix (EN-30, F-170)
018aad8 spec(v3): the rebuild spec passes the external audit — SPEC-AUDIT: APPROVED (0/8)
```

## git diff --stat (the 6L+2E change set: 4d79de2..HEAD)
```
 .../ABIDE_6L2E_RESULTS.json                        |    68 +
 .../CHECKPOINT_MANIFEST.md                         |    32 +
 .../dist/arsumbris.ts                              |   172 +
 .../gi-6l2e-gaps-closed-2026-10-02/dist/au-read.ts |   121 +
 .../dist/c2kg-index.json                           |  4499 ++++
 .../gi-6l2e-gaps-closed-2026-10-02/dist/c2kg.ts    |    78 +
 .../dist/consumption-audit.ts                      |   108 +
 .../dist/gi-index.js                               | 22657 +++++++++++++++++++
 scripts/au-read.ts                                 |    20 +-
 scripts/consumption-audit.ts                       |    12 +-
 src/omp/adapters/arsumbris.ts                      |    34 +-
 src/omp/adapters/c2kg.ts                           |    18 +-
 tests/st-gi-6l2e.test.ts                           |    24 +
 13 files changed, 27837 insertions(+), 6 deletions(-)
```

## git status --short (worktree honesty — the uncommitted audit fixes)
```
 M scripts/au-read.ts
 M scripts/c2kg-produce/C2kgProduce.java
 M scripts/c2kg-produce/run.sh
 M scripts/consumption-audit.ts
 M scripts/corbell-build.ts
 M scripts/e1-sizing.ts
 M scripts/goal-verify.ts
 M scripts/graphify-build.ts
 M scripts/host-suite.ts
 M scripts/semantica-ingest.py
 M scripts/structural-extract.py
 M scripts/ua-ingest.ts
 M scripts/whole-tree-audit.sh
 M src/hunter/diagnostics/calibration.ts
 M src/hunter/diagnostics/engine.ts
 M src/hunter/diagnostics/findings-store.ts
 M src/hunter/diagnostics/fixture-calibration.ts
 M src/hunter/diagnostics/semantic-predicates.ts
 M src/hunter/firewall/artifact-scope.ts
 M src/hunter/firewall/lexicon-types.ts
```

NOTE: the audit fixes (c2kg/au-read/consumption-audit) are UNCOMMITTED at package time;
the deployed dist `879cbbf80b9d9682` was built from them. Remote URL omitted (may embed credentials).
