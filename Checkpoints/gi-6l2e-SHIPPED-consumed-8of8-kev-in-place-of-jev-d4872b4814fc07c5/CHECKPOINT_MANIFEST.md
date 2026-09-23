# CHECKPOINT MANIFEST — gi-6l2e-SHIPPED-consumed-8of8-kev-in-place-of-jev-d4872b4814fc07c5

**Token:** `gi-6l2e-SHIPPED-consumed-8of8-kev-in-place-of-jev-d4872b4814fc07c5` (hyphens only, no spaces)
**Date:** 2026-09-23 · **Branch:** `graph-intelligence` @ `50848b5`
**The seal mode:** ★ **MODE B — NO LOCK (a mutable working snapshot).** The manifest documents it.
NEVER manifest-only (the partial-lock lie). The operator re-locks if Mode A is wanted.

## ★ THE STATE — THE GOAL IS MET
| the goal's condition | the evidence |
|---|---|
| the register reads `consumed:8` | **8/8** · rungs=context,decision,knowledge,meaning,repair,settlement · influenced = all 8 |
| the 7-class corpus at $0 | 7 fixtures + the count assertion · `judgeCalls=0` · `firesUsed()=0` · `costUsd=0` |
| the container Phase-E | **14/14** (host rig) · **7/7 executed, 0 BLOCKED** (KEV rig) · the negative suite 27/0 |
| the host-live seat + the bug ledger | the runtime ledger 1 row (`kernel-v2:dumb:STEER`) · 42 bug entries (F-95…F-103) |
| the seal + receipt | PACKAGE_AUDIT **PASS** (5/0) · THE_RECEIPT §1–§13 (427 L) |

## ★ THE COMPLETION PREDICATE (the exit test)
```
$ bun scripts/goal-verify.ts <root> evidence
  C1 PASS · C2 PASS · C3 PASS · C4 PASS · C5 PASS
[goal-verify] ★ THE PREDICATE PASSED: 5/5 conditions met     ← EXIT 0
```
**THE NEGATIVE CONTROL:** a no-fact subject → `C1 FAIL` + `GI_GOAL_NOT_MET` + **exit 1**; an empty
scope → **exit 1**. ★ BOTH DIRECTIONS PROVEN.

## ★ THE DIST (THE ARTIFACT)
```
sha256 d4872b4814fc07c5baf0735c947c9fdacf2b970bb03560375aeb466a2b210ea5
the checkpoint dist == the repo dist == the deployed bundle : YES
runKernelV2=2 · decideFromRegistry=2 · layerCertifications=2 · kevProbe=2 · isUniform=2 · gi-decide=3
find src -newer <bundle> = 0
```

## THE VERIFICATION (re-measured at seal time)
| the check | the command | the result |
|---|---|---|
| tsc | `bunx tsc --noEmit` | **exit 0** |
| the battery | `bun test` (52 files) | **370 pass · 0 fail** |
| the 6L2E suite | `bun test ./tests/st-gi-6l2e.test.ts` | **28 pass · 0 fail** |
| the negative suite | `bun test ./tests/st-gi-v21-redteam.test.ts` | **27 pass · 0 fail** |
| the audit pins | `bun test ./tests/st-gi-audit-fixes.test.ts` | **13 pass · 0 fail** |
| the E-3 seal | `bun test ./tests/st-package-audit.test.ts` | **5 pass · 0 fail** |
| the corbell port | `bun test ./tests/st-corbell-port.ts` | **7 pass · 0 fail** |
| the AUDIT GATE | `ocr` (the GO mimo lane) | **PASS (0 critical/high)** — `2bced5f8` → `e0c136e3` |
| the goal predicate | `bun scripts/goal-verify.ts` | **5/5 · exit 0** |

## THE CONTENTS (the file counts)
```
src/                  112 .ts (the FULL tree — == the repo's count)
dist/index.js         the deployed dist, SHA-verified == the repo
context_management/   11 canon docs (all at the dist SHA)
BUILD_REPORT.md       772 L   DEBUG_LOG.md        1062 L   FAILURE_LOG.md      1263 L
SPEC_VIOLATION_LOG.md 621 L   TESTING_LOG.md      2113 L   THEATRICALITY_LOG.md 1070 L
SHIP_DOCS_MANIFEST.md · packages/ (5 — the spec + the suite + the receipt) · reports/
artifacts/ (8 — the AUDIT GATE, the KEV evidence, the runtime probes)
scripts/ (16 — incl. goal-verify.ts + consumption-audit.ts + kev-probe.ts + kev-decide.ts)
.trident/ (phaseE 14/14 · phaseE-kev 7/7)
```

## ★ THE HONEST GAPS
1. **5 audit findings stand as DECLINED-WITH-REASONS** (of 10 adjudicated; 5 FIXED) — each with its
   reason in `artifacts/AUDIT_GATE_F98.md`: `buildRegistry` uncached (the probes must read LIVE
   state) · the sync SQLite open (the row must land WITH the run) · the returned ledger handle (the
   RECORD sink seam) · `GI_TOOL_NAMES_ALIASES` (the registered alias surface) · the
   `confineTargetPath` TOCTOU (a single-user host; a scope guard, not a security boundary).
2. **★ THE TEST SUBJECT:** the battery tests the **SOURCE**. Of 52 test files, **1 imports the
   DEPLOYED bundle** (`st-gi-audit-fixes`, 3 of its tests). The DEPLOYMENT is proven by the
   dist-content gate, not by the battery.
3. **The container's KEV rig consumes TSG only** (`consumed:1/8` there) — its other 7 substrates
   are host-side. The register reports the container's REAL state.
4. **KEV's out-of-domain accuracy is the 0.6B model's (~0.60 per its card)** — the latency/memory
   member of the family.
5. **The container's omp model pin was 404** — fixed by pointing `config.yml` at the measured-live
   `openrouter/nvidia/nemotron-3.5-lightning:free`.

## THE NEXT WORK (the queued)
- Ship the other 7 substrates into the container rig (the same payload pattern that carried KEV).
- Re-run the audit on the GO lane for a fresh post-fix artifact covering the FINAL dist.
- The 5 declined findings: revisit if the threat model changes (a multi-user host).
