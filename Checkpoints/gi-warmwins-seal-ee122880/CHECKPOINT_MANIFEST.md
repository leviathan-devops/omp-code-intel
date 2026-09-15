# CHECKPOINT MANIFEST — gi-warmwins-seal-ee122880

Token: gi-warmwins-seal-ee122880 (hyphens only; state SEALED on warm-wins fix).
Date: 2026-09-15. Follows gi-qwen-fix-wave-34ba3ffe (fixes in source, dists stale at seal time).

## Battery + state
- Battery 119/0/1004 across 19 files post-fix (correct file enumeration; bg_3 wrong-file run SUPERSEDED).
- Warm-wins: freshness tail NEWEST-vs-WARM inversion fixed (V-18); .omp freshness excludes both substrates; trident 280fd303 rebuilt via NODE_PATH (V-19/EN-018-II).
- TUI re-proof BOTH rigs on sealed SHAs: G1 nodes=5/edges=5/rows=2 MISS-absent; G4 findings=3 (audit dir R28-sro-graph-1789481197584); G3 findingsCount=296 v12; G5 impact=2 + safe-delete 2/2/0/0; port2 probe + honest-empty.
- Ship docs gate S1–S6 PASSED (BUILD 195 / DEBUG 171 / FAILURE 147 / SPEC 66 / TESTING 249; S5 MATCH; EN-021/F-18/V-18/V-19).

## SHAs (exec-verified all four copies at seal)
- GI extensions/graph-intelligence/index.js: ee122880b48a393f9a54429f33d1043f808817c28d2f39ddbfc62dacebaa12ce (checkpoint copy: ee122880b48a393f9a54429f33d1043f808817c28d2f39ddbfc62dacebaa12ce — MATCH required)
- Trident dist/index.js: 280fd30353dd825d24d43cdfa3b4a254df94741981e3bcec3176be2ed78846bd (checkpoint copy: 280fd30353dd825d24d43cdfa3b4a254df94741981e3bcec3176be2ed78846bd — MATCH required)
- Host-deploy + gi-omp-port + gi-omp-port2: identical prefixes ee122880 / 280fd303 (docker exec verified).

## Contents
- src/ (full tree); dist/index.js (GI sealed) + dist/trident-index.js (trident sealed); context_management/RUNNING_BUILD_LOG.md; 5 ship docs + SHIP_DOCS_MANIFEST; DPL1 spec; MIGRATION_MANIFEST; st-graphify-port.ts + st-go-fallback.ts batteries.
- Full audit results: qwen sessions 1aca90d4 (45: 2 crit/21 high) + 8a24ae08 re-run (43: 0 crit/16 high, EN-019/F-16); V-16/V-17 CLOSED in source by this lineage; re-run-III owed for the PASS verdict flip.

## Honest gaps
- Qwen verdict still FAIL-by-count (16 high) until re-run-III; V-10 LOW + V-11 MEDIUM still OPEN (loader-test, K20.3-text).
- No key material (AP-4). MODE B mutable, no chattr.
- Recovery: README → SHIP_MANIFEST → FULL_BUILD_CONTEXT → BUILD warm-wins entry → DEBUG EN-021 → F-18 → SPEC V-18/V-19 → TESTING seal entry → this manifest.
- Sign-off: battery + TUI tokens this turn; operator owns push.
