# CHECKPOINT MANIFEST — gi-cleanup-w1w2w4-e13d0f5939e3707b

**Token:** `gi-cleanup-w1w2w4-e13d0f5939e3707b` (hyphens only) · **Date:** 2026-09-24 · **Branch:** `jarvis/gi-main` @ `9991a0c`
**The seal mode:** ★ **MODE B — NO LOCK** (a mutable working snapshot; documented, never manifest-only).

## ★ WHY THIS CHECKPOINT EXISTS
THE CLEANUP RUN (PIN_GI_CLEANUP.md) — W1 + W2 + W4 DONE, W3 RUNNING:
| wave | the fraud | the measured token |
|---|---|---|
| W1 | FR-1 the LYING GATE | `4 pass / 0 fail` · the stdout has NO contradicting line |
| W2 | FR-2 the HOLLOW LEDGER | `4 rows, 4 DISTINCT` |
| W3 | FR-3+FR-4 the 2.7% audit | RUNNING (the parallel scan, 20/112 at the seal) |
| W4 | FR-5 the container's 6/8 | `ABIDE flipped DOWN→CONSUMED (987 facts)`; L2+TSG NAMED |

## THE DIST
```
sha256 e13d0f5939e3707b8d0fb1ff16a7faded33a228091ca20dea9157553bf998663
the checkpoint dist == the repo dist == the deployed bundle : YES
```

## THE VERIFICATION
| the check | the command | the result |
|---|---|---|
| tsc | `bunx tsc --noEmit` | exit 0 |
| the suite | `bun run test` | **502 pass / 0 fail (56 files)** · exit 0 |
| the predicate | `bun scripts/goal-verify.ts . evidence` | 5/5 · exit 0 |
| W2's diversity | `bun test -t test_ledger_diversity_four_verdicts` | 4 rows, 4 DISTINCT |
| W4's register | the rig | 6/8 (ABIDE — 987 facts) |

## ★ THE HONEST GAPS
1. **W3 (the whole-tree audit) is RUNNING** — the serial shape was the wrong design (7.5 min/file);
   the parallel shape (12 workers) is at ~20/112.
2. **W4's 2 DOWN** — L2 a daemon; TSG's KEV payload absent in the fresh container. Both NAMED.
3. **F-121 OPEN** — a PREFLIGHT refusal is NEVER recorded (`runKernelV2` returns before stage 6).
