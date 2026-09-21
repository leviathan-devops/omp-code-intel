# PACKAGE_AUDIT — GI KERNEL v2.1

**WAVE W9 · THE SEAL**
**Audited:** 2026-09-21 · HEAD at audit time `eaa57eb` + the seal commit
**Dist SHA (the deployment fingerprint):** `83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709`

---

## THE VERDICT

```
PACKAGE_AUDIT: PASS (after remediation)
  the audit found TWO defects; both were fixed before this verdict was written.
  A verdict of PASS over an unexamined package would be the thing this audit exists
  to prevent — so the findings are printed FIRST, verbatim, with their evidence.
```

---

## FINDING PA-1 — ★ A THEATRICAL CANON (FOUND, FIXED)

**THE FINDING, AS MEASURED BEFORE THE FIX:**

```
packages/gi-kernel-v2.1/canon/    10 files
   763 bytes  BUILD_STATE.md
     0 bytes  CHANGELOG.md            ← EMPTY
     0 bytes  COMPACTION_SURVIVAL.md  ← EMPTY
  1786 bytes  CURRENT_STATE.md
     0 bytes  DECISION_CHAIN.md       ← EMPTY
   803 bytes  EVIDENCE_STATE.md
     0 bytes  NEXT_STEPS.md           ← EMPTY
     0 bytes  POST-COMPACTION_PROMPT.md ← EMPTY
     0 bytes  RUNNING_BUILD_LOG.md    ← EMPTY
     0 bytes  RUNNING_DEBUG_LOG.md    ← EMPTY
     0 bytes  TASK_QUEUE.md           ← EMPTY
```

**WHY THIS IS A DEFECT AND NOT AN UNFINISHED TASK.** A directory named `canon/`
containing files named after the canon docs PRESENTS AS the canon set. Eight of the ten
were ZERO BYTES. A reader opening `canon/BUILD_STATE.md` cannot distinguish "never
written" from "the build state is empty" — and the second reading is the dangerous one.
This is the precise class the kernel exists to eliminate: **a thing whose FORM is
verification (or documentation) while its SUBSTANCE is absent.**

**REMEDIATION.** The ten stubs were DELETED and replaced with a single `README.md` that
points at the real canon and states why. **A pointer, not a copy** — two copies of a canon
drift, and the drifted one is always the one somebody reads.

**EVIDENCE AFTER:**
```
$ find packages/gi-kernel-v2.1/canon -type f
packages/gi-kernel-v2.1/canon/README.md     25 L
```

**AND THE CANON IT POINTS AT IS GATE-VERIFIED** (measured this session, before the seal):
```
5a CHECKPOINT INTEGRITY  PASS  175 files · dist sha MATCH (83eb7bba)
5b CROSS-CONSISTENCY     PASS  5/5 read-first docs agree on 83eb7bba
5c DENSITY + SUBSTANCE   PASS  9/9 at the 200-line floor, all substance-clean
  COMPACTION_SURVIVAL 212 · CURRENT_STATE 213 · NEXT_STEPS 204 · TASK_QUEUE 204
  BUILD_STATE 207 · CHANGELOG 200 · POST-COMPACTION_PROMPT 201 · DECISION_CHAIN 251
  EVIDENCE_STATE 206   = 2102 L across 11 docs
```

---

## FINDING PA-2 — EPHEMERAL STATE SHIPPED AS ARTIFACT (FOUND, FIXED)

**THE FINDING:** `tools/campaign-ledger.sqlite-shm` and `-wal` were present — the SQLite
write-ahead-log sidecars. These are TRANSIENT LOCK STATE, not artifacts. Committing them
ships a moment of runtime as if it were a deliverable.

**REMEDIATION:** sidecars deleted; `tools/.gitignore` added to keep them out. The
`campaign-ledger.sqlite` itself is KEPT — it is the row evidence behind `campaign-report.json`
and "no artifact, no claim" applies to the M-numbers.

---

## THE MECHANICAL CHECKS

```
✓ the 8 named docs present     00-INDEX · 00-MISSION · 01-DISCOVERY · 06-WAVES · 07-GOALS
                               GI_KERNEL_V2.1_DPL1_SPEC (505 L) · MASTER_BLUEPRINT_v1 (862 L)
                               MEASUREMENT_PLAN
✓ policies/policies.json       parses; validates; all 3 classes seeded
✓ tools/campaign-report.json   parses; cases=14; carries the sweep, the per-rule counts,
                               the policies and the health
✓ tools/measure-campaign.ts    the M1 instrument — repeatable, not a one-shot
✓ canon/README.md              the pointer (PA-1 remediated)
✓ ZERO files of zero bytes     verified: every file in the package carries content
```

---

## THE DELIVERABLE LADDER (each wave, its gate, its evidence)

```
W1 LEDGER     7/0/36    test_ledger_row_written   battery 206/0/737/21   tsc 191
W2 ORACLE    12/0/37    test_oracle_resolves      battery 218/0/774/22   tsc 191
W3 POS-A      9/0/45    test_advisory_open        battery 227/0/819/23   tsc 191
W4 POS-B      9/0/46    test_gate_fire ✓          battery 236/0/865/24   tsc 191
                        test_gate_ignore ✓
W5 POLICY     8/0/36    test_policy_reload        battery 244/0/901/25   tsc 191
W7 MEASURE     M1-M12 filled · 0 TBD · 12 MEASURED · the live campaign ran twice
W8 CONTAINER   244/0/905/25 in stupefied_morse · .trident/container-test-results.json EXISTS
W6 CALIB       ⛔ BLOCKED on M2 (the operator's cost matrix) — stated, never faked
W9 SEAL        THIS DOCUMENT
```

**THE ANTI-PATTERN LEDGER, CLASS 3 — KILLED:**
```
FireGate references in src/omp/kernel-v2.ts   0 → 3
gate.judge( call sites                          0 → 1
FireGate references outside fire-gate.ts        0 → 27
```

---

## WHAT THIS AUDIT DOES **NOT** CERTIFY

```
✗ INDEPENDENT REVIEW. The AUDIT GATE is BLOCKED (the ocr rail's adapter died with /tmp:
  :4097 UP, :4098 REFUSED, /tmp/zen-free-adapter.mjs GONE). NOTHING in this package has
  been read by a model other than the one that wrote it. Every claim rests on tests the
  author wrote and ran. That is a real limit and it is recorded, not glossed.
✗ THE KERNEL IS NOT LIVE. runKernelV2 has ZERO call sites outside its own file: the pin's
  ENGINES-BEFORE-REGISTRATION law forbids registering while the register reads up=5/11,
  and registering first would refuse every tool call on this host.
✗ W6 IS NOT DONE. No threshold has been CALIBRATED — every policy still carries
  `calibrated: false` and says why. The curve exists; the operator's cost matrix does not.
✗ THE CONTAINER ARTIFACT IS THE BATTERY RUN, not the scenario-driver Phase F with byte
  offsets. The artifact says so itself in `method.honestScope`.
✗ THE SHIPPED SEEDS ARE MEASURABLY TOO HIGH. At the `dumb` seed (act=0.75) only 2 of 8 real
  violations fire (R=0.250); the measured optimum is t≈0.35-0.40. This is a FINDING, not a
  defect: the seeds are the pre-calibration placeholder, and calibration is blocked on M2.
```

---

## THE SEAL

```
mode        NO-LOCK (the full-tree lock belongs to the checkpoint, not the package)
reason      a package lock that does not cover the repo it describes would be a partial
            lock, and a partial lock LIES (the operator's ruling).
checkpoint  Checkpoints/gi-kernel-v2.1-wired-measured-container-proven/
```
