# GI 6L+2E CLEANUP — STATUS REPORT v1
**Series:** gi-cleanup · **Date:** 2026-09-25 · **Baseline:** jarvis/gi-main · **HEAD:** ea373a7
**dist sha256:** `15606e31e32693e23b16fd7a589319bd…` · **size:** 748 KB (was 9.2 MB)
**src:** 113 `.ts` / 34,271 lines · **rig:** `omp-ct:master`

## POSITION
The GI 6L+2E kernel is a graph-intelligence enforcement layer wiring 6 graph layers + 2 decision
kernels as consumed inputs to every decision, deployed as an OMP extension (7 tools + 4 hooks).
It is **complete except for one measurement**: the whole-tree LLM audit reaching 0 critical / 0 high.
**The 9.2 MB bundle defect is FIXED (748 KB).** Five of six stop-conditions are green, measured.

## PROGRESSION — the six stop-conditions (denominator: the SPEC §6 exit battery)
| # | condition | state | evidence |
|---|---|---|---|
| 1 | tsc exit 0 | ✓ | `bunx tsc --noEmit` → 0 errors |
| 2 | `bun run test` 0 fail | ✓ | 441/0 + 539/0, exit 0 |
| 3 | goal-verify 5/5, no contradiction | ✓ | `★ THE PREDICATE PASSED: 5/5 conditions met` |
| 4 | the register honest at face value | ✓ | `consumed:7/8 … GI_LAYER_UNCONSUMED=L2_ARSUMBRIS` |
| 5 | `COUNT(DISTINCT rule_id‖band‖action) >= 4` | ✓ | `rows=254 distinct=4` |
| 6 | the whole-tree audit 0 crit/0 high | ⟳ BLOCKED | run 20 in progress; lane-throughput bound |
| 7 | the seal + receipt exist | ✓ | `Checkpoints/gi-6l2e-bundlefix-15606e31e32693e2` |

**5.5/6 complete.** The blocked item is #6.

## THE 9 MB DEFECT — THE OPERATOR'S COMPLAINT, FIXED
| metric | before | after |
|---|---|---|
| bundle size | 9,560,681 B | 765,952 B |
| bloat vs pre-mount | 15.6× | 1.0× |
| import time | 139 ms | 41 ms |
| tool surface | 7 tools + 4 hooks | IDENTICAL |
| tsc | 0 | 0 |
| battery | green | 441/0 + 539/0 |

**Cause:** `bun build --bundle` inlined `node_modules/typescript/lib/typescript.js` (~9 MB) because
`src/hunter/diagnostics/engine.ts:44` and `src/hunter/graph/mechanical.ts:2` import it for the AST walk.
**Fix:** `scripts/build-extension.sh` (committed) with `--external typescript --external '@huggingface/transformers'`.

## THE BOOT HONESTY (measured, not claimed)
| surface | measured |
|---|---|
| GI bundle import (9.2 MB) | 139 ms |
| all 14 extensions import | 162 ms |
| omp --version | 134–152 ms |
| MCP obscura handshake | 9–24 ms |
| MCP serena handshake | 861–1251 ms |
| skills catalog | 648 injected (218 KB) |

**The 9.2 MB import is 139 ms, NOT 20 s** — V8/Bun parses lazily. The 20 s is a STACK; the largest
measured single component is the MCP server spawns (serena 1.2 s; six servers, two loading heavyweight
runtimes). The 9 MB is a real defect worth fixing; it is NOT the whole 20 s. **This is stated plainly
because the measurement does not support a stronger claim.**

## ERROR LEDGER (open)
| symptom | mechanism | state |
|---|---|---|
| the audit cannot complete | lane per-KEY rate limit; the go pool is 5-of-8 usable | run 20 at ~0.2–1.1 files/min; resume needs uncapped keys |
| the 20 s not fully attributed | skills scan (648 dirs) unmeasured | open |

## SUCCESS-CLAIM AUDIT
| claim | evidence | verdict |
|---|---|---|
| the 9 MB bundle is fixed | `du -h` on the deployed file = 748K | PROVEN |
| the battery is green | `bun run test` 441/0 + 539/0 this turn | PROVEN |
| goal-verify passes 5/5 | run this turn | PROVEN |
| the register is honest 7/8 | `consumption-audit.ts` this turn | PROVEN |
| the tree is clean of run-19 highs | 42 markers in 30 files, tsc 0 | PROVEN (source) |
| the audit is 0/0 | run 20 incomplete | UNVERIFIED |

## RISKS + OPEN
1. The audit (#6) is blocked on lane throughput — the resume condition is uncapped keys.
2. The go pool is 5-usable-of-8 (go-2/4/5 dead a month).
3. The `omp-ct:master` image bakes a default on the lapsed Go lane.
4. The 20 s boot is not fully attributed (the skills scan unmeasured).

**Position in one line:** the 9 MB defect is fixed (748 KB, verified) and 5 of 6 stop-conditions are
green; the single open item is the whole-tree audit's re-measurement, blocked on lane throughput.
**UNVERIFIED count: 1** (the audit's 0/0).
