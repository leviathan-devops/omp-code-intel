# ★ THE CLEANUP BOARD — the 4 waves (PIN_GI_CLEANUP.md)

**The spec:** packages/gi-cleanup/CLEANUP_SPEC.md (the binding authority, §2 the frauds, §6 the exit battery)
**The baseline (re-measured 2026-09-24):** jarvis/gi-main @ d0fe3e8 · the dist e13d0f5939e3707b · 112 .ts · tsc exit 0
**The ledger:** 34 rows · 1 distinct (rule|band|action)

| wave | the files (DISJOINT) | the fraud | the gate | the state |
|---|---|---|---|---|
| W1 | scripts/goal-verify.ts · scripts/consumption-audit.ts | FR-1 the LYING GATE | NO stdout line contradicts another + `bun test -t test_goal_predicate` green | **FIRING** |
| W2 | tests/st-runtime-diversity.test.ts (NEW) | FR-2 the HOLLOW LEDGER | `COUNT(DISTINCT rule_id\|\|band\|\|action) >= 4` + `bun test -t test_ledger_diversity_four_verdicts` | pending |
| W3 | artifacts/ (the audit JSONs) | FR-3+FR-4 the 2.7% audit + the 10 findings | `AUDIT GATE: PASS` on the whole tree | pending |
| W4 | scripts/container-substrate-payload.sh · .trident/plan-6l2e/phaseE-kev.json | FR-5 the container's 6/8 | the rig's register >= 7/8 OR the named BLOCKED | pending |

## THE DISJOINTNESS (the PREFLIGHT check)
- W1 owns: scripts/goal-verify.ts · scripts/consumption-audit.ts
- W2 owns: tests/st-runtime-diversity.test.ts (NEW ONLY — no other file)
- W3 owns: artifacts/ (only NEW audit JSONs; no src)
- W4 owns: scripts/container-substrate-payload.sh · .trident/plan-6l2e/phaseE-kev.json
- ★ NO OVERLAP. W2 touches NO src file (the ledger's diversity is a RUNTIME act, not a code change).


---

## ★ THE RUN'S RESULT (2026-09-24)

| wave | the fraud | the gate | the state |
|---|---|---|---|
| W1 | FR-1 the LYING GATE | `bun test -t test_goal_predicate` exit 0 · 4 pass | ★ **DONE** |
| W2 | FR-2 the HOLLOW LEDGER | `bun test -t test_ledger_diversity_four_verdicts` exit 0 · the live ledger 4 distinct | ★ **DONE** (+ F-122 FIXED) |
| W3 | FR-3+FR-4 the 2.7% audit | the whole tree: **FAIL (6 critical, 82 high)** across 105 files | ★ **ANSWERED** — the fix is W3's follow-on |
| W4 | FR-5 the container's 6/8 | 6/8 · ABIDE flipped DOWN→CONSUMED (987 facts) · L2+TSG NAMED | ★ **DONE (honest)** |

## ★ THE STOP IS NOT MET
The STOP requires `AUDIT GATE: PASS on the whole tree`. It reads **FAIL (6 critical, 82 high)**.
★ THE NEXT WAVE: `packages/gi-cleanup/W3-FOLLOWON-PLAN.md` — **65 files / 100 blocking findings**
to fix-or-prove. The ship-ready claim is WITHHELD until then.

## THE DEFECTS THIS RUN FOUND (beyond the 6 frauds)
- **F-121** a PREFLIGHT refusal is NEVER recorded (OPEN)
- **F-122** ★ `gi-decide` hardcoded `queriedBefore: false` — the tool could only record dumb (FIXED + PROVEN)
- **F-123** ★ the 2.7% scope hid 88 blocking findings (OPEN — the follow-on wave)
