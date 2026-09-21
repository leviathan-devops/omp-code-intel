# GI KERNEL v2.1 — THE JEV-IN-THE-LOOP RUNTIME KERNEL — WAVE BOARD
WAVES: 9
BOARD INITIALIZED: 2026-09-21 (before the first dispatch — the pin's law)
Baseline: HEAD 0fa9a50 [jarvis/gi-main] · dist 83eb7bba · 199/0/701 · tsc 191

## TARGET (verbatim success criteria)
T-1 every detector fire adjudicated by a <5000-token Jev Noul in BOTH positions
T-2 thresholds DERIVED from a measured curve + the operator's cost matrix, never chosen
T-3 a fire_decisions row per fire; laterTruth resolved by the oracle
T-4 one live identified instance operated first-person; the bug ledger non-empty
T-5 a FULL adversarial corpus pass with ZERO confirmed defects
T-6 the seal + the receipt exist

## BASELINE (re-measured THIS session — see the receipt)
B-1 dist extensions/graph-intelligence/index.js sha256 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709 (613,039 B)
B-2 battery 199 pass / 0 fail / 701 expect / 20 files
B-3 tsc 191 errors (the baseline; 0 new)
B-4 tree 94 src ts (+34 test ts) = 29,028 lines
B-5 FireGate src/omp/fire-gate.ts 370 L · calibration.ts 185 L
B-6 ⚠ node_modules WAS ABSENT → battery 166/1/1err, tsc TS2688. REPAIRED (bun install).
    Divergence root-caused as an ENVIRONMENT loss, not a code regression.
B-7 fire-ledger.ts ABSENT · oracle.ts ABSENT · policy-store.ts ABSENT
B-8 FireGate call sites = 0 (the UNWIRED KERNEL, measured)

## TARGET CLASSIFICATION
wiring + persistence + calibration. D-modes: D1 silent fallback, D3 theatrical complete,
D7 double-write. T-classes: T1 unwired module, T2 empty runtime ledger, T5 fabricated PASS.

## THE ORACLE TABLE
| OR-1 | a fire writes exactly ONE row, laterTruth='unresolved' | bun test -t test_ledger_row_written |
| OR-2 | the table's columns match blueprint §8.2 verbatim | bun test -t test_ledger_ddl_exact |
| OR-3 | a double drain does NOT duplicate a row | bun test -t test_ledger_no_double_write |
| OR-4 | recordTruth sets later_truth + truth_at | bun test -t test_ledger_truth_update |
| OR-5 | a failing persist THROWS (never silent) | bun test -t test_ledger_fails_loud |
| OR-6 | countsByRule feeds checkCalibrationHealth | bun test -t test_ledger_feeds_calibration |

## BACKWARD MAP
T-1 ← kernel-v2 SIERRA→W4 (the post-detector filter) + fire-ledger (the intent leg)
T-2 ← calibration.ts (built) ← fire-ledger.countsByRule (W1) ← oracle resolution (W2)
T-3 ← fire-ledger.ts (W1) ← FireGate.rows() (the public seam, fire-gate.ts:367)
T-4 ← kernel-v2.ts (W4) ← the live host
T-5 ← the red-team corpus (P5) ← every exported decision function
T-6 ← W9 ← all of the above

## FORWARD WAVES
### W1 — THE LEDGER  src/omp/fire-ledger.ts  [depends: none]  ✅ CLOSED
  Deliverable: the fire_decisions table (§8.2 verbatim) + the writer + the reader + the 2 seams
  Gate: a row per fire · test_ledger_row_written ✓
  Seam: FireGate.ledgerPath (declared fire-gate.ts:222, NEVER consumed) + rows() (:367)
  DONE-SEAM: drain() (identity watermark) + withLedger() (Proxy) — ZERO edits to fire-gate.ts
  EVIDENCE: 7/0/36 · battery 206/0/737/21 (199/0/701/20 +7 tests no regressions) · tsc 191 (0 new)
            · all 5 named selectors pass scoped · derivePolicy calibrated=true AND health.ok=true
### W2 — THE ORACLE  src/omp/oracle.ts  [depends: W1]  ☐
  Deliverable: laterTruth resolution (4 evidence gatherers → confirmed|refuted|unresolved)
  Gate: one fire resolved · test_oracle_resolves
### W3 — POSITION A  src/omp/fire-gate.ts (intent path)  [depends: W1]  ☐
  Deliverable: the pre-act advisory (fail-OPEN)
  Gate: an advisory fires · test_advisory_open
### W4 — POSITION B  src/omp/kernel-v2.ts  [depends: W1,W3]  ☐
  Deliverable: the post-detector filter — THE WIRING
  Gate: a real FIRE + a real IGNORE · test_gate_fire · test_gate_ignore
  ★ Frozen: gate-hook.ts:117 (single call site = 1) · graph-gate.ts (the tier ladder)
### W5 — POLICY  src/omp/policy-store.ts  [depends: W1]  ☐
  Deliverable: versioned JSON policies (data, not code — D026)
  Gate: a reload without a rebuild · test_policy_reload
### W6 — CALIBRATION  src/omp/calibration.ts (the loop)  [depends: W1,W2,W5]  ★ BLOCKED ON M2
  Deliverable: derivePolicy flips calibrated=true
  Gate: health.ok=true · test_calib_flips
  ⛔ BLOCKED: M2 (the operator's cost matrix). W1/W2/W3/W5 proceed independently.
### W7 — MEASUREMENT  MEASUREMENT_PLAN.md  [depends: W1..W6]  ☐ — M1..M12, zero TBD
### W8 — CONTAINER  .trident/ct-v2.1/  [depends: all]  ☐ — 199+/0 in-container +
  ★ THE PHASE F ARTIFACT (.trident/container-test-results.json) — the deliverable
### W9 — SEAL  packages/gi-kernel-v2.1/**  [depends: all]  ☐ — PACKAGE_AUDIT PASS

## COVERAGE MAP
T-1 → W3 W4 · T-2 → W5 W6 · T-3 → W1 W2 · T-4 → W4 · T-5 → P5 · T-6 → W9

## THE CLAIM REGISTRY (a wave closes ONLY on a re-run by the orchestrator)
| wave | claimed | re-run by orchestrator | verdict |
|---|---|---|---|
| W1 | 7/0/36 · 206/0/737/21 · tsc 191 | battery 206/0/737/21 ✓ · tsc 191 ✓ · 5 named selectors ✓ · derivePolicy+health ✓ | **CLOSED** |
| W2 | — | — | OPEN |

## HARD STOPS ACTIVE
- M2 (the cost matrix) — OPERATOR-OWNED. Blocks W6 only. W1/W2/W3/W5 build regardless.
- E1 (the oracle's engine) — OPERATOR-OWNED. v3, not on the v2.1 critical path.
- The rig stupefied_morse @ omp-ct:master — required for W8.
