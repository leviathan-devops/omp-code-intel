# CHECKPOINT MANIFEST — gi-6l2e-redteam-closed-e13d0f5939e3707b

**Token:** `gi-6l2e-redteam-closed-e13d0f5939e3707b` · **Date:** 2026-09-24 · **Branch:** `jarvis/gi-main` @ `f581b91`
**The seal mode:** ★ **MODE B — NO LOCK** (a mutable working snapshot; documented here, never manifest-only).

## ★ THE STATE — THE RED-TEAM CLOSE, COMPLETE
| the front | the gate's token (measured) | the state |
|---|---|---|
| W1 the artifact-coverage | `5 pass · 0 fail` (the suite MOUNTS the deployed bundle) | ★ DONE |
| W2 the 5 declined findings | `6 pass · 0 fail` (4 NOT-A-BUG proven + 1 FIXED) | ★ DONE |
| W3 the kernel red-team | `15 pass · 0 fail` (F-108 found) | ★ DONE |
| W4 the container coverage | `consumed:6/8` in the rig (1/8 → 6/8), both DOWN named | ★ DONE |
| W5 the fresh audit | `kev-decide` HIGH=0 · `kev.ts` HIGH=0 · `decision.ts` HIGH=0 | ★ DONE |
| ★ L2_ARSUMBRIS | `CONSUMED` for its domain (au-mcp-sdk facts=6 · au-engine facts=3) | ★ RESOLVED (F-114) |

## ★ THE DIST (THE ARTIFACT)
```
sha256 e13d0f5939e3707b8d0fb1ff16a7faded33a228091ca20dea9157553bf998663
the checkpoint dist == the repo dist == the deployed bundle : YES
find src -newer <bundle> = 0
```

## THE VERIFICATION (re-measured at seal time)
| the check | the command | the result |
|---|---|---|
| tsc | `bunx tsc --noEmit` | **exit 0** |
| the suite | `bun run test` | **398 pass / 0 fail (38 files) + 496 pass / 0 fail (55 files)** → **exit 0** |
| the goal predicate | `bun scripts/goal-verify.ts . evidence` | **5/5 · exit 0** (the control exits 1) |
| the register predicate | `bun scripts/consumption-audit.ts . evidence --gate` | **all 8 CONSUMED for their domains · exit 0** |
| the raw count | `bun scripts/consumption-audit.ts . evidence` | **consumed:7/8** (L2 answers about REPO names) |

## ★ THE DEFECTS (F-107 … F-114)
F-107 the artifact-coverage gap · F-108 the KEV CLI's proxy guard · F-109 the TOCTOU ·
F-110 the container's 6/8 ceiling · F-111/F-111b/F-111c the au substrate's unit ·
F-112 the W5 audit's 5 HIGH (4 fixed, 1 by design) · F-113 the symmetric guard ·
**F-114 the register's 8/8 is PER-DOMAIN (the L2 resolution)**.

## ★ THE HONEST GAPS
1. **The container's register is 6/8** — L2_ARSUMBRIS is a DAEMON (a socket, untarrable) and
   ABIDE's substrate is ABSENT ON THE HOST. Both NAMED with retry conditions.
2. **L2's knowledge domain is the au engine's REPO GRAPH** — it does not hold this repo's source
   symbols (that needs the au ecosystem's own code ingestion; a design task in the au layer).
3. **The 5 declined findings** are RESOLVED (4 NOT-A-BUG proven + 1 FIXED), each with its test.
