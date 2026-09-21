# NEXT_STEPS — the W1-W9 wave plan + the risk register

**The dist SHA: 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709**
**Authority: packages/gi-kernel-v2.1/06-WAVES.md (WAVES: 9) + the DPL1 spec S4.**

## THE WAVES (parallel where files are disjoint; interfaces land first)

```
W1 THE LEDGER      src/omp/fire-ledger.ts (NEW) · fire-gate.ts (the writer)
                   DELIVERS the fire_decisions table + the append; laterTruth defaults
                   "unresolved"; indices on (rule_id, later_truth) and (state_hash)
                   GATE: test_ledger_row_written · a live row query
                   BLOCKER: none

W2 THE ORACLE      src/omp/oracle.ts (NEW)
                   DELIVERS resolve(row) → reads the downstream evidence (a later edit to
                   the target, a test run, a withdrawal, a downstream permit) → writes
                   confirmed|refuted|unresolved. Starts with the MPSE-decidable outcomes.
                   GATE: test_oracle_resolves · one real firing resolved end-to-end
                   BLOCKER: W1

W3 POSITION A      src/omp/fire-gate.ts (the intent path) · kernel-v2.ts (MODIFIED)
  (pre-act)        DELIVERS a Fire built from INTENT, judged BEFORE the act, fail-OPEN
                   GATE: test_advisory_open · an advisory fires on an intended blind edit
                   BLOCKER: W2 · ★ lands FIRST because fail-open cannot break anything

W4 POSITION B      src/omp/kernel-v2.ts (MODIFIED — the gate on each VIOLATION)
  (post-detector)  DELIVERS the gate between the detector's VIOLATION and the v2.0 verdict
                   GATE: test_gate_fire · test_gate_ignore · grep -c FireGate > 0
                   BLOCKER: W3

W5 THE POLICY      src/omp/policy-store.ts (NEW) · policies/*.json
                   DELIVERS versioned JSON recipes (D026: data, not code); a policy edit
                   reloads without a rebuild AND changes the cache key
                   GATE: test_policy_reload
                   BLOCKER: W4

W6 THE CALIBRATION src/omp/calibration.ts (the loop)
                   DELIVERS 50+ real firings → the oracle resolves → derivePolicy flips
                   GATE: test_calib_flips · checkCalibrationHealth ok=true
                   BLOCKER: ★ M2 (the operator's cost matrix) + W5

W7 THE MEASUREMENT MEASUREMENT_PLAN.md (filled)
                   DELIVERS M1-M12, every row a number; M11 needs a human sampling session
                   GATE: zero TBD rows
                   BLOCKER: W6

W8 THE CONTAINER   .trident/ct-v2.1/cycle-1/ (the ARTIFACT, not terminal output)
                   DELIVERS the whole loop in omp-ct:master + the Phase F artifact
                   GATE: test_clean_container · 199+/0 in-container + the artifact JSON
                   BLOCKER: W7

W9 THE SEAL        packages/gi-kernel-v2.1/** + SHIP_PACKAGES/
                   DELIVERS the v2.1 package + PACKAGE_AUDIT PASS + the checkpoint refresh
                   GATE: the audit verdict
                   BLOCKER: W8
```

## THE FILES TO TOUCH (each with the change + the blast radius)

```
src/omp/fire-ledger.ts      NEW — the DDL + the append.  blast: none (new)
src/omp/oracle.ts           NEW — the resolution path.   blast: the ledger only
src/omp/fire-gate.ts        the intent path (W3).        blast: fire-gate consumers
src/omp/kernel-v2.ts        THE WIRING (W3+W4).          blast: ★ EVERY tool call when
                            registered. The frozen surfaces must survive:
                            gate-hook.ts:117 the single call site; graph-gate.ts:208 the
                            tier ladder; the 3 PROPOSED hooks.
src/omp/policy-store.ts     NEW — the data recipes.      blast: the gate's thresholds only
```

## THE TEST PLAN THAT DEFINES DONE

```
L0  tsc --noEmit                      191 == baseline (0 new)
L1  unit — the PURE maths             bun test -t test_calib_flips
L2  script — real modules + a real sandbox
      bun test -t test_gate_fire · test_gate_ignore · test_ledger_row_written ·
                  test_advisory_open · test_oracle_resolves · test_policy_reload
L3  container (omp-ct:master)         test_clean_container → 199+/0 + THE PHASE F ARTIFACT
L4  host-live                          the 7 RB angles with tool-result tokens
ADVERSARIAL FIRST (the red-team law): the attack shapes before the happy path.
POSITIVE + NEGATIVE halves: a real violation FIRES; a paired false positive IGNOREs.
```

## THE RISK REGISTER (what could go wrong + the mitigation)

```
R1 ★ THE WIRING ORDER — register the gate before the engines and STAGE 0 refuses every
   tool call on this host (measured: the register reads up=5/11).
   MITIGATION: W3 (fail-open) lands first; the register stays up=5/11 until the engines are
   installed; the gate's fail polarity is per-surface.
R2 THE THRESHOLDS — the seeds fire the act band ZERO times (the 2x error, EN-047).
   MITIGATION: W6 + M2; until then every policy carries calibrated=false with the basis.
R3 THE FROZEN SURFACES — the wiring could break gate-hook.ts:117 or graph-gate.ts:208.
   MITIGATION: the v1.3 gate suite (12/12) runs after every wiring change.
R4 THE CONTAINER ARTIFACT — the Phase F artifact was never written.
   MITIGATION: W8 produces it; until then the evidence is marked as terminal output.
R5 THE COST — a Jev call per fire at ~500 fires/day ≈ 2 cents (accepted).
   MITIGATION: the cache (D013) + the MPSE settlement + the 18KB cap.
R6 THE ORACLE'S COST — 1 fire per resolution doubles the burn.
   MITIGATION: resolve in batches at session end, not per firing.
```

## THE GATE TO CLEAR

```
★ M2 — THE COST MATRIX. The operator's answer to: "when this rule is wrong, which error
  costs more, and by how much?" per class (destructive / dumb / theatrical).
  Until it arrives: W1-W5 are unblocked and buildable; W6 waits.
```
