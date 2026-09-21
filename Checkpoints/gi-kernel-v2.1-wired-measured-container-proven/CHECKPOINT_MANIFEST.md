# CHECKPOINT_MANIFEST — GI KERNEL v2.1

**Name:** `gi-kernel-v2.1-wired-measured-container-proven` (hyphens only)
**Saved:** 2026-09-21
**HEAD at save:** `af54ea9` (the seal) + this commit
**Repo:** `/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence` @ `jarvis/gi-main`

---

## THE STATE

```
DIST      extensions/graph-intelligence/index.js
          sha256 83eb7bba9c5e76dbc46a85d9cb30119e718a0c02f0aa97d75f7cff92c89b0709
          613,039 bytes — UNCHANGED through this session (the v2.1 work is SOURCE; the
          dist is v1.3's and the v2.x modules are not bundled into it)
BATTERY   292 pass / 0 fail / 1043 expect / 28 files  (host — after the 65 audit fixes)
          292 pass / 0 fail / 1047 expect / 28 files  (clean container, POST-audit ✓ GAP-9 CLOSED)
          ★ the +4 expects delta is UNCHANGED by the audit fixes — it is an ENVIRONMENT
            property (the register probes host-absolute paths for ABIDE + RSI_STORE), not
            a code effect. The 65 fixes are HERMETIC.
TSC       191 errors == the pre-session baseline, 0 NEW
TREE      97 src ts (was 94: +fire-ledger, +oracle, +policy-store) · 34 test ts
DELTA     199/0/701/20 → 244/0/901/25 = +45 tests, +200 expects, +5 files, ZERO regressions
```

## THE SEAL MODE

```
★ NO-LOCK. A package lock that does not cover the repo it describes is a PARTIAL LOCK,
and a partial lock LIES (the operator's standing ruling). The checkpoint is a directory
copy, complete and self-describing, and the repo's git history is the integrity record.
The alternatives were: a full-tree lock over the repo (not the checkpoint) or a
manifest-only lock — and manifest-only was explicitly banned.
```

## WHAT THIS CHECKPOINT CONTAINS

```
src/                97 ts files — the full source tree including the three NEW v2.1 modules
dist/               the built extension (613,039 B, sha 83eb7bba)
context_management/ the 11-doc canon, all at or above the 200-line floor, gate-verified
packages/           the v2.1 build package: 8 docs + PACKAGE_AUDIT + policies/ + tools/
trident/            the board (wave-plan.md), the CREATE_PIN, the container results
artifacts/audit/    the (empty) audit artifact — see the gaps
the 6 ship docs     BUILD_REPORT 528 · DEBUG_LOG 558 · FAILURE_LOG 438 ·
                    SPEC_VIOLATION_LOG 111 · TESTING_LOG 658 · THEATRICALITY_LOG 425
package.json / tsconfig.json
```

## ★ THE AUDIT — WHAT THE INDEPENDENT MODEL FOUND (2026-09-21)

```
THE RAIL: rebuilt (the zen-free adapter died with /tmp) and ocr wired to it.
THREE PASSES over the three new modules with the live muse-spark-1.3-contributor-free:

                pass 1   pass 2   pass 3
  fire-ledger     7        7        7    (pass 3: 1 CRITICAL)
  oracle          6        5        7
  policy-store    6        7        5    (3 HIGH → 0 HIGH)
  TOTAL          19       19       19

65 DEFECTS FOUND ACROSS THE PASSES. ALL FIXED, each with a test that failed before the fix.
The artifacts are in artifacts/audit/ (9 files: sg-ocr-*, reverify/, pass3/).

★ THE COUNT IS FLAT AND IT IS NOT THE SAME DEFECTS — each pass's findings are absent from
  the next, so every fix is VERIFIED by the instrument that found the defect. The cause is
  measured: MY OWN FIXES KEEP OPENING NEW SURFACE. Pass 3's CRITICAL was the ORIGINAL F0
  defect RE-INTRODUCED BY F0'S OWN FIX.

★ WHAT MY OWN RED-TEAM COULD NOT FIND (it tested DATA; the audit tested CONTRACTS):
  · a BOUND THAT FAILS OPEN (an unparseable timestamp admitted EVERY record)
  · a DOCUMENTED RULE WITH NO REACHABLE PATH (a branch that could never execute)
  · A CONFIG HANDED OUT MUTABLY (store.get(id)!.act = 0 moved the enforcement bar)
  · PROTOTYPE POLLUTION FROM A JSON CONFIG (__proto__ / constructor rule ids)
  · A SYMLINK-FOLLOWING ATOMIC WRITE
  · A COMMENT PROMISING MORE THAN THE CODE DOES
```

## ★ THE HONEST GAPS (what this checkpoint does NOT give you)

```
GAP-1  ★ THE KERNEL IS NOT LIVE. `runKernelV2` has ZERO call sites outside its own file.
       The gate is wired INTO the kernel (W4, the anti-pattern CLASS 3 killed: 0 → 3 refs),
       but the KERNEL is not wired into the live tool path. THE LAW THAT BLOCKS IT:
       "ENGINES BEFORE REGISTRATION — the register reads up=5/11; registering the gate
       first refuses every tool call on this host." Registered without the engines, this
       machine's every tool call fails at STAGE 0.
GAP-2  W6 (THE CALIBRATION LOOP) IS NOT DONE — BLOCKED ON M2, the operator's cost matrix.
       Every policy still carries `calibrated: false`. No threshold in this system has been
       calibrated against real outcomes. The CURVE exists (M1, measured live).
GAP-3  ★ THE AUDIT GATE READS **FAIL** — AND THAT IS THE CORRECT STATE. The rail was
       rebuilt and the audit RAN (three passes, 65 defects, all fixed). But the pin's
       criterion is a FULL pass with ZERO confirmed defects, and no pass reached zero: the
       count is flat at 19 because the fixes generate the next pass's findings. So every
       ship-ready claim REMAINS WITHHELD. THE HONEST RECOMMENDATION is in TESTING_LOG.md:
       this loop is a STANDING PROCESS, not a one-shot pre-ship gate.
GAP-4  THE CONTAINER ARTIFACT IS THE BATTERY RUN, not the scenario-driver Phase F with
       byte offsets. The artifact records this itself in `method.honestScope`.
GAP-5  ★ THE SHIPPED SEEDS ARE MEASURABLY TOO HIGH. At the `dumb` seed (act=0.75) only
       2 of 8 REAL violations fire (R=0.250); the measured optimum is t≈0.35-0.40
       (F1=0.889). This is a FINDING, not a regression — the seeds are the documented
       pre-calibration placeholder, and calibration is what GAP-2 blocks.
GAP-6  M5 (the per-fire token cost) IS UNMEASURED — an instrumentation gap: the judge does
       not surface `usage` on its answer path. Closing it needs a JevJudge change, NAMED
       in MEASUREMENT_PLAN.md rather than hidden.
GAP-7  M11 (the false-negative class) IS UNMEASURED — it needs a HUMAN sampling session to
       label IGNORE rows. By law it cannot be closed by the agent that produced the rows.
GAP-8  THE GRAPH GATE IS ENFORCING ON THIS HOST and blocked two writes this session
       (EN-055: for a NEW file, query a symbol the file WILL export — querying the filename
       fails, and the file-read form of the check does not reach the kernel).
```

## THE ONE-LINE RESUME

```
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence && \
  cat .trident/wave-plan.md        # the board: W1-W5, W7-W9 CLOSED · W6 BLOCKED
then read context_management/COMPACTION_SURVIVAL.md and POST-COMPACTION_PROMPT.md
```
