# TESTING_LOG — omp-code-intel (plan + results)

## TEST PLAN ENTRY — 2026-09-16 — rename verification

### SCRIPT
- **What:** prove rename changed brand only + gates green in the renamed repo.
- **How:** `bun x tsc --noEmit` + `bun run tests/st/run.ts` + brand grep + per-file diff.
- **PASS criteria:** tsc 0, 79/79, zero residual brand, non-brand diff lines 0.
- **FAIL criteria:** any red gate or residual brand or behavior diff.
- **Status:** PASSED

## TEST PLAN ENTRY — 2026-09-16 — container behavior (master image + laguna)

### CONTAINER
- **What:** runtime behaviors via adversarial prompts on master substrate with laguna free.
- **How:** master-image rig (digest bdc3d77), plugin deployed, TUI sends + pane + exec sha.
- **PASS criteria:** passToken in tool-result context per row; derailment modes absent.
- **FAIL criteria:** silent apply; traceback; hang; prose-as-proof.
- **Status:** PARTIAL (queued — rig launch is the next phase this turn)

## TEST RESULT — 2026-09-16 — rename gates

### SCRIPT
- **The run:** `bun x tsc --noEmit` + `bun run tests/st/run.ts` in omp-code-intel-plugin.
- **The raw output:** tsc exit 0 no output; `--- 79/79 passed ---` exit 0.
- **The verdict:** PASS — tsc 0, 79/79.
- **The artifacts:** tests/st/ 12 files; runner tests/st/run.ts; brand grep empty.

## TEST RESULT — carried (prior waves, by reference — full rows in .trident/container-test-results.json)

### CONTAINER
- **The run:** v3c S1-S12+A1-A4 (rig t3b) + v4 T-1..T-11 (rig t4) + v6 S1/S3/S2-queued (master rig, bar laguna free) + direct 19 ops (mimo-ct rig).
- **The raw output:** v3c 15/2 pass E11/11; v4 10/1 pass-with-one-honest-skip E11/11; v6 partial 2/1/1 (S1 matches=3 card; S3 4x ffff + paraphrase/detour/restore; S2 OPEN attempt #10-11, shas pinned).
- **The verdict:** PASS (v3c/v4) + PARTIAL (v6) — as committed in results JSON.
- **The artifacts:** .trident/container-test-results.json (8 suites); pane captures; exec shas; campaign judge JSONs.
