
## [2026-09-20T12:00:00] — container angles caught 2 defects unit tests missed
- SYMPTOM: angle4 (2 blind edits) threw T2; angle5 (10 comment edits) reached T2
- ROOT CAUSE: (1) single-edit drift=1.0 ≥ 0.6 cut — sample-size artifact; (2) symbol-less edits weighted MEDIUM in full
- FIX: T2 requires ≥3 consecutive (gate-gate.ts:223); symbol-less comment edits carry ZERO drift (gate-gate.ts:164)
- LESSON: container angles on the wired path catch what unit tests on the math miss
- EVIDENCE: ALL-6-PASS post-fix; 230/0 ×3 stable; commit 60fe3e4

## [2026-09-21T12:00:00] — EN-048: node_modules absent → a false baseline divergence
- SYMPTOM: the battery read 166 pass / 1 fail / 1 ERROR and tsc read TS2688, against a pin frozen at 199/0/701 + 191. Two probes "diverged" on a repo where nothing had changed.
- ROOT CAUSE: node_modules/ was ABSENT — the entire dep tree. `Cannot find package 'xstate'` killed the hydra micro-loop-machine; `Cannot find type definition file for 'bun-types'` killed tsc. It is gitignored, so nothing in git records its loss.
- FIX: `bun install` → 8 packages in 25ms. Re-measured: 199/0/701 EXACT ✓ and tsc 191 EXACT ✓.
- LESSON: an ENVIRONMENT loss reads exactly like a CODE regression when the probe is run cold. The distinguishing move is to measure the ENVIRONMENT before concluding the code moved — and to report the divergence as root-caused rather than accepting either number. Root/pin says "inherited numbers are STALE"; `du`/`ls` on node_modules is part of re-measuring.
- EVIDENCE: battery 166/1/1err → 199/0/701; tsc TS2688 → 191; dist sha 83eb7bba UNCHANGED throughout

## [2026-09-21T12:02:00] — EN-049: `Judge` is declared but NOT re-exported (TS2459)
- SYMPTOM: tsc 192 (baseline 191, +1 NEW): `tests/st-gi-v21-ledger.test.ts(21,8): error TS2459: Module '"../src/omp/fire-gate.ts"' declares 'Judge' locally, but it is not exported.`
- ROOT CAUSE: `Judge` is DEFINED in enforcement.ts:34. fire-gate.ts IMPORTS it for its own `FireGateConfig.judge` field but does not re-export it — so a consumer importing it from fire-gate.ts is reaching through a module that merely uses it.
- FIX: import the type from its defining module (`../src/omp/enforcement.ts`). tsc → 191, EXACTLY the baseline.
- LESSON: a type a module DEPENDS on is not a type the module OFFERS. The 0-new-tsc law is what caught it — a study that only ran the new test would have shipped a tree that no longer type-checks.
- EVIDENCE: tsc 192 → 191; `grep -c 'fire-ledger|v21-ledger'` in the tsc output → 0

## [2026-09-21T12:03:00] — EN-050: "a firing is not a resolution" — MY TEST asserted an inflated count
- SYMPTOM: `test_ledger_feeds_calibration` failed: expected confirmed=12, received 0. The IMPLEMENTATION was right; the TEST was wrong.
- ROOT CAUSE: the test fired 12 times and immediately asserted `confirmed: 12` — never calling `recordTruth`. Every row was still `unresolved`, exactly as §6.4.7 requires ("written 'unresolved' AT FIRING TIME"). The ledger refused to count unresolved rows as evidence and reported the truth.
- FIX: assert the unresolved state FIRST, then stand in for the oracle explicitly, then assert the counts.
- LESSON: this failure is the HONESTY LAW WORKING — an unresolved row was never silently promoted to evidence. The lesson for the oracle (W2) and every future reader: CONFIRMED is a claim about the world made LATER; the ledger must never be able to infer it from the fact that a fire happened. A calibration that counted firings as confirmations would report perfect precision on zero evidence.
- EVIDENCE: the assertion now reads `{confirmed: 0, refuted: 0, unresolved: 12}` before the oracle step and `{confirmed: 12, unresolved: 0}` after; derivePolicy calibrated=false → true

## [2026-09-21T12:04:00] — EN-051: `bun test -t <selector>` unscoped scans the whole repo
- SYMPTOM: `bun test -t test_ledger_row_written` reported 1 pass / 8 skip / 68 FAIL / 68 errors across 77 tests in 197 files — the named test itself passed, but the run was unreadable.
- ROOT CAUSE: the `-t` filter does not scope the FILE SET; it scanned 197 files (including indexed copies under Checkpoints/) and the unrelated files errored on load.
- FIX: file-scope the selector — `bun test -t <name> ./tests/<file>.test.ts` → 1 pass / 6 filtered out / 0 fail.
- LESSON: the pin's G3 form (`bun test -t <selector>`) must be FILE-SCOPED or its output is noise that can hide a real failure among unrelated load errors. Recorded for every wave's named-test evidence.
- EVIDENCE: unscoped 1 pass/68 fail → scoped 1 pass/0 fail/6 filtered out
