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
### W2 — THE ORACLE  src/omp/oracle.ts  [depends: W1]  ✅ CLOSED
  Deliverable: laterTruth resolution (4 gatherers → confirmed|refuted|unresolved) + FireLedger.truthOf (W2-driven amendment)
  Gate: one fire resolved · test_oracle_resolves ✓
  EVIDENCE: 12/0/37 · battery 218/0/774/22 (W1 was 206/0/737/21 → +12 tests, no regressions) · tsc 191 (0 new)
            ★ FOUND A REAL DEFECT: resolveAll trusted the caller's stale row (EN-052) — now reads LIVE truth
            ★ THE SPEC GAP NAMED: §8.2 has no target/tool column, so resolveAll takes the subject explicitly
### W3 — POSITION A  src/omp/fire-gate.ts (intent path)  [depends: W1]  ✅ CLOSED
  Deliverable: Intent + Advisory + intentFire() + advisory() — the pre-act advisory (fail-OPEN)
  Gate: an advisory fires · test_advisory_open ✓
  ★ THE LAW IS IN THE TYPE: Advisory.block is the literal `false`
  ★ COMPOSES with the existing gateAdvisory (typed-write.ts:1213) — informs vs adjudicates
  EVIDENCE: 9/0/45 · battery 227/0/819/23 (W2 was 218/0/774/22 → +9 tests, no regressions) · tsc 191
### W4 — POSITION B  src/omp/kernel-v2.ts  [depends: W1,W3]  ✅ CLOSED — ★ THE WIRING
  Deliverable: worstOutcome (shared) + streamFromInput + GateAdjudication + runKernelV2Gated
  Gate: a real FIRE + a real IGNORE · test_gate_fire ✓ · test_gate_ignore ✓
  ★ CLASS 3 KILLED: FireGate refs in kernel-v2.ts 0 → 3 · gate.judge( 0 → 1 · refs outside its file 0 → 27
  ★ Frozen VERIFIED: registerGraphGate UNTOUCHED · graph-gate.ts tier ladder 4 refs intact
  EVIDENCE: 9/0/46 · battery 236/0/865/24 (W3 was 227/0/819/23 → +9 tests, no regressions) · tsc 191 (0 new)
  ★ THE BOUNDARY: level 1 (gate→kernel) DONE. Level 2 (kernel→live tool path) NOT done —
    runKernelV2 call sites outside its file = 0, and the ENGINES-BEFORE-REGISTRATION law
    forbids registering while the register reads up=5/11.
### W5 — POLICY  src/omp/policy-store.ts  [depends: W1]  ✅ CLOSED
  Deliverable: PolicyStore + atomic read/write + validate; packages/gi-kernel-v2.1/policies/policies.json SHIPPED
  Gate: a reload without a rebuild · test_policy_reload ✓
  ★ EXIT GATE MEASURED: edit act 0.75→0.90 ⇒ the SAME p=0.80 goes act/FIRE → escalate/ESCALATE, costUsd=0, and the model was called exactly ONCE
  ★ LOUD LOAD FAILURES: MISSING · MALFORMED · RANGE · INVERTED (act<flag empties the escalate band)
  EVIDENCE: 8/0/36 · battery 244/0/901/25 (W4 was 236/0/865/24 → +8 tests, no regressions) · tsc 191 (0 new)
### W6 — CALIBRATION  src/omp/calibration.ts (the loop)  [depends: W1,W2,W5]  ★ BLOCKED ON M2
  Deliverable: derivePolicy flips calibrated=true
  Gate: health.ok=true · test_calib_flips
  ⛔ BLOCKED: M2 (the operator's cost matrix). W1/W2/W3/W5 proceed independently.
### W7 — MEASUREMENT  MEASUREMENT_PLAN.md  [depends: W1..W6]  ☐ — M1..M12, zero TBD
### W8 — CONTAINER  .trident/ct-v2.1/  [depends: all]  ✅ CLOSED
  244/0/905/25 in the CLEAN container (host 244/0/901/25)
  ★ THE PHASE F ARTIFACT NOW EXISTS: .trident/container-test-results.json (4121 B, valid JSON)
    — this was residual #2 in the compaction prep; every prior "container tested" claim rested
    on terminal output alone.
  ★ THE +4 DELTA ROOT-CAUSED (measured): host 9 down vs container 11 down x 2 expects per entry.
    ABIDE + RSI_STORE probe ABSOLUTE HOST PATHS. 901 is NOT a constant. W1-W5 = 200 expects in
    BOTH environments → HERMETIC.
  ★ HONEST SCOPE (in the artifact): the BATTERY run, not the scenario-driver Phase F.
### W9 — SEAL  packages/gi-kernel-v2.1/**  [depends: all]  ☐ — PACKAGE_AUDIT PASS

## COVERAGE MAP
T-1 → W3 W4 · T-2 → W5 W6 · T-3 → W1 W2 · T-4 → W4 · T-5 → P5 · T-6 → W9

## THE CLAIM REGISTRY (a wave closes ONLY on a re-run by the orchestrator)
| wave | claimed | re-run by orchestrator | verdict |
|---|---|---|---|
| W1 | 7/0/36 · 206/0/737/21 · tsc 191 | battery 206/0/737/21 ✓ · tsc 191 ✓ · 5 named selectors ✓ · derivePolicy+health ✓ | **CLOSED** |
| W2 | 12/0/37 · 218/0/774/22 · tsc 191 | battery 218/0/774/22 ✓ · tsc 191 ✓ · test_oracle_resolves ✓ | **CLOSED** |
| W3 | 9/0/45 · 227/0/819/23 · tsc 191 | battery 227/0/819/23 ✓ · tsc 191 ✓ · test_advisory_open ✓ | **CLOSED** |
| W4 | 9/0/46 · 236/0/865/24 · tsc 191 | battery 236/0/865/24 ✓ · tsc 191 ✓ · test_gate_fire ✓ · test_gate_ignore ✓ | **CLOSED** |
| W5 | 8/0/36 · 244/0/901/25 · tsc 191 | battery 244/0/901/25 ✓ · tsc 191 ✓ · test_policy_reload ✓ | **CLOSED** |
| W6 | — | BLOCKED on M2 (the operator's cost matrix) | BLOCKED |
| W8 | 244/0/905/25 in-container | re-ran in stupefied_morse ✓ · the artifact validates as JSON ✓ · the delta root-caused by measurement ✓ | **CLOSED** |
| W7 | — | — | OPEN |

## HARD STOPS ACTIVE
- M2 (the cost matrix) — OPERATOR-OWNED. Blocks W6 only. W1/W2/W3/W5 build regardless.
- E1 (the oracle's engine) — OPERATOR-OWNED. v3, not on the v2.1 critical path.
- The rig stupefied_morse @ omp-ct:master — required for W8.

## P5 — THE RED-TEAM CORPUS PASS  ✅ CLOSED
  tests/st-gi-v21-redteam.test.ts — 24 tests / 57 expects · the A..M evasion family over
  the surface map of all 15 exported decision functions.
  ★ 2 CONFIRMED DEFECTS FOUND AND FIXED, ZERO REMAIN:
    R-1 (CRITICAL) a NaN bypassed the fail polarity — every comparison false, so the
        corrupt value fell off the end of the ternary into IGNORE. On a fail-CLOSED class
        that is a DISMISSAL its contract forbids. FIXED + the vocabulary moved into
        degradationOf() so the new suffix cannot create a consumer hole.
    R-2 (LOW) the validator rejected act < flag while ACCEPTING act == flag — both empty
        the ESCALATE band. FIXED, distinctly named.
  ★ THE SCOPE LIMIT, NAMED: probes import the MODULE surface — v2.1 is not in the dist
    (sha 83eb7bba unchanged), so a probe against the dist would test v1.3.
  EVIDENCE: battery 268/0/958/26 (244/0/901/25 → +24 tests, ZERO regressions) · tsc 191
