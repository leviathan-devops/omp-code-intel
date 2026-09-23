# CHECKPOINT MANIFEST — gi-6l2e-redteam-closed-038c84c31569aebb

**Token:** `gi-6l2e-redteam-closed-038c84c31569aebb` (hyphens only)
**Date:** 2026-09-23 · **Branch:** `jarvis/gi-main` @ `ecfba96`
**The seal mode:** ★ **MODE B — NO LOCK** (a mutable working snapshot; documented here, never
manifest-only).

## ★ THE STATE — THE RED-TEAM CLOSE
| the front | the gate's token | the state |
|---|---|---|
| W1 the artifact-coverage | `5 pass · 0 fail` | ★ DONE |
| W2 the audit findings | `6 pass · 0 fail` (4 NOT-A-BUG + 1 FIXED) | ★ DONE |
| W3 the kernel red-team | `10 pass · 0 fail` (F-108 found) | ★ DONE |
| W4 the container coverage | `consumed:6/8` (1/8 → 6/8) | ★ DONE (honest) |
| W5 the fresh audit | `AUDIT GATE:` on the FINAL dist | ⏳ the last gate |

## ★ THE DIST (THE ARTIFACT)
```
sha256 038c84c31569aebbf15ba936f4ecc06ad691baa3c2bcffd2f56f4489a2f15dcd
the checkpoint dist == the repo dist == the deployed bundle : YES
runKernelV2 · decideFromRegistry · layerCertifications · kevProbe · isUniform · gi-decide — all > 0
find src -newer <bundle> = 0
```

## THE VERIFICATION (re-measured at seal time)
| the check | the command | the result |
|---|---|---|
| tsc | `bunx tsc --noEmit` | **exit 0** |
| the suite | `bun run test` | **491 pass / 0 fail (55 files)** → exit 0 |
| the predicate | `bun scripts/goal-verify.ts . evidence` | **5/5 · exit 0** |
| the register (host) | `bun scripts/consumption-audit.ts . evidence --gate` | **consumed:8/8 · exit 0** |
| the register (container) | the rig's `gi-consumption` | **consumed:6/8** (1/8 → 6/8) |

## THE CONTENTS
```
src/ (112 .ts) · dist/index.js · extensions/ (the dist) · context_management/ (11)
BUILD_REPORT.md DEBUG_LOG.md FAILURE_LOG.md SPEC_VIOLATION_LOG.md TESTING_LOG.md
THEATRICALITY_LOG.md SHIP_DOCS_MANIFEST.md PIN_FIX_ALL_REMAINING_BUGS.md package.json
packages/ (the DPL1 + the suite + the receipt §1-§14) · reports/ · artifacts/ · scripts/
.trident/ (phaseE 14/14 · phaseE-kev + wave_W4 · the tracker)
```

## ★ THE HONEST GAPS
1. **The container's register is 6/8** — L2_ARSUMBRIS is a DAEMON (a socket; cannot be tarred —
   retry: start au-engine in the rig) and ABIDE's substrate is ABSENT ON THE HOST (retry: produce
   it host-side). The pin's W4 gate named 8/8; the MEASURED ceiling is 6/8.
2. **W5's fresh audit** — the multi-file scan aborts at 0 files (measured); the single-file scan is
   the working shape. The artifact + the `AUDIT GATE:` line land in `TESTING_LOG.md`.
3. **The 5 declined findings** are RESOLVED (4 NOT-A-BUG proven + 1 FIXED), each with its test.
4. **The red-team's 4 defects** (F-107..F-110) are recorded in `FAILURE_LOG.md`.
