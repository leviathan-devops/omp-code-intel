# NEXT_STEPS — the W1-W9 wave plan + the risk register

**The dist SHA: 038c84c31569aebbf15ba936f4ecc06ad691baa3c2bcffd2f56f4489a2f15dcd**
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

## THE WAVE-BY-WAVE EXECUTION DETAIL (the exact shape of each)

```
W1 THE LEDGER — why first: nothing else can be calibrated, audited or counted without a row.
   THE DDL (blueprint S8.2): fire_decisions(id, at, rule_id, cls, question_version,
   probability, band, action, policy_name, act_threshold, flag_threshold, state_hash,
   cost_usd, later_truth, truth_at) + two indices: (rule_id, later_truth) and (state_hash).
   THE WRITER hooks FireGate's existing ledger array (fire-gate.ts:344 rows()) — the table
   is a PERSISTENCE of what the gate already builds in memory.
   TEST: test_ledger_row_written — fire once, query the table, assert one row with
   laterTruth='unresolved'.

W2 THE ORACLE — why second: the rows must exist before they can be resolved.
   THE EVIDENCE GATHERERS (four, each a query over the session record):
     (a) a later edit touched the same target within T
     (b) a test/verify tool ran after the firing
     (c) the claim was withdrawn or restated WITH a span
     (d) a downstream gate permitted the act
   THE CLASSIFICATION: any (a)-(d) → confirmed | refuted; none → unresolved.
   ★ REFUTED REQUIRES A SECOND SIGNAL — never merely the absence of complaint.
   TEST: test_oracle_resolves — one real firing resolved with its evidence recorded.

W3 POSITION A (the pre-act advisory) — why BEFORE W4: fail-OPEN cannot break anything, so
   the live path is exercised while the filter is still being built.
   THE SHAPE: a Fire built from the INTENT (tool + target + the classifier's read), judged
   BEFORE the act runs. A FIRE verdict on an advisory = the act is refused pre-emptively.
   TEST: test_advisory_open — an intended blind edit gets an advisory; a legitimate intent
   passes with zero friction.

W4 POSITION B (the post-detector filter) — THE WIRING.
   THE CALL SITE: inside runKernelV2, between the detector's VIOLATION (kernel-v2.ts:299)
   and the verdict mapping (:328). For each detector outcome with verdict != PASS:
   build a Fire, call FireGate.judge, and let the ACTION modulate the verdict.
   ★ THE FROZEN SURFACES: gate-hook.ts:117 (the single call site) stays 1;
   graph-gate.ts:208 (the tier ladder) survives; the 3 PROPOSED hooks :247/:250/:254 remain.
   THE ANTI-PATTERN DETECTION: grep -c "FireGate" src/omp/kernel-v2.ts > 0.
   TEST: test_gate_fire (a real violation adjudicated FIRE) + test_gate_ignore (a paired
   false positive IGNORED).

W5 THE POLICY STORE (D026: data, not code) — a versioned JSON recipe per rule; a human edits
   it without a rebuild; the edit changes the cache key (L12).
   TEST: test_policy_reload — edit the JSON, assert the band changes on a STORED
   probability (the reroute path, no re-inference).

W6 THE CALIBRATION — ★ BLOCKED ON M2. Once the cost matrix arrives: set DEFAULT_PROFILES'
   costs, run 50+ real firings, let the oracle resolve, and derivePolicy flips
   calibrated=true on its own.
   TEST: test_calib_flips + checkCalibrationHealth ok=true with zero findings.

W7 THE MEASUREMENT — M1-M12 (MEASUREMENT_PLAN.md). M11 needs a HUMAN session: sample the
   IGNORE rows and label them. That is the only view of the gate's silent false negatives.

W8 THE CONTAINER — the whole loop in omp-ct:master AND the Phase F ARTIFACT
   (.trident/container-test-results.json) — the artifact is the deliverable, not the
   terminal output. Stage with `docker cp src/. <dest>/` (the trailing slash).

W9 THE SEAL — the package + PACKAGE_AUDIT + a checkpoint refresh AFTER the deliverable.
```

## THE RISK REGISTER — THE FULL FORM (each: the trigger, the blast, the mitigation)

```
R1  THE WIRING ORDER     trigger: registering the gate while up=5/11
    blast: STAGE 0 refuses EVERY tool call on this host — the agent stops working
    mitigation: W3 lands first (fail-open); the register stays measured; the polarity is
    per-surface; and the wiring is a SEPARATE wave from the ledger work.
R2  THE STARVATION TRAP  trigger: keeping the seeds
    blast: the act band never fires; the ledger looks calm while every violation passes
    mitigation: M2 + W6; until then every policy carries calibrated=false + the basis.
R3  THE FROZEN SURFACES  trigger: the W4 edit
    blast: the v1.3 behaviour changes silently (the single call site, the tier ladder)
    mitigation: the v1.3 gate suite (12/12) after every wiring change; grep the call-site
    count after every edit.
R4  THE CONTAINER FAKE   trigger: running the rows by hand again
    blast: terminal evidence is not the artifact; the next session cannot verify
    mitigation: W8 produces .trident/container-test-results.json via the rig.
R5  THE COST             trigger: a Jev call per fire + per resolution
    blast: ~2x the token burn (still ~4 cents/day at the envelope)
    mitigation: the cache (D013) + the MPSE settlement + batching the oracle at session end.
R6  THE CANON DRIFT      trigger: docs updated at session end
    blast: the next agent reads a stale SHA and builds on fiction
    mitigation: the cross-consistency gate (5b) before any prep; the 2 logs at the moment.
```

## THE DONE-WHEN, CONSOLIDATED (the terminal gate)

```
ALL of: the battery 199+/0 on the host AND the container (with the Phase F artifact) ·
tsc 191 == baseline · every wave's named test green verified BY RE-RUNNING IT YOURSELF ·
checkCalibrationHealth ok=true · MEASUREMENT_PLAN.md with ZERO TBD · PACKAGE_AUDIT PASS ·
a checkpoint refreshed AFTER the seal exists.
```
