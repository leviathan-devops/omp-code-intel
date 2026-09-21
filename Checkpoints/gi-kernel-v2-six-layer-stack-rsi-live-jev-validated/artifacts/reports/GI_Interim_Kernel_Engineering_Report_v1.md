# GI-OMP INTERIM KERNEL — ENGINEERING REPORT v1
**Series:** GI Interim Kernel (the live V21+cleanup state series; the parent/base series is GI_OMP_PORT Engineering_Report v1-v2 and GI_OMP_First_Class v1-v2)
**Project:** GI-OMP graph-intelligence extension for OMP
**Date:** 2026-09-16
**Author:** GI-OMP rebuild session (orchestrator)
**Baseline:** branch `jarvis/gi-main` @ `11fdcb7` (docs) / `c17f137` (last source change)
**Commit:** `11fdcb7` — tree clean
**Container:** `gi-omp-port` · **Image:** `omp-ct:master` (rig recreated post-restart)
**Live dists:** GI `450c1c14d34e1d11…` · trident `472a0ff3c531178c…`

---

## ONE-PARAGRAPH SUMMARY

The deployed plugin is the post-V21 interim kernel: four tools (graph-probe, graph-query with 13 verbs, bug-hunt, aether-code-audit) over a tombstone SQLite store fed by graphify/corbell warm graphs, with a 6-key sqlite key pool and a 14-template audit engine. It is DEPLOYED LIVE — sha-verified on the host (`~/.omp/agent/extensions/graph-intelligence/index.js` = `450c1c14…`, identical to the source build) and on rig `gi-omp-port` (GI `450c1c14…` + trident `472a0ff3…`, exec-verified this turn), with live legs proven this session: who-calls `nodes=4 edges=5 rows=2` with both beta callers, `AUDIT_DONE findings=3` (run-id `1789551825285`), hunt `296 findings v14`, probe round-trip. The battery is `127 pass / 0 fail / 937 expect()` across 20 files (re-run this turn). It is functional for its actual jobs and is the best version that has existed. It is NOT gate-passed: the current-state audit (scan `56d6ab5f`, 300s, 7 files) measured 66 findings — 1 critical (REFUTED by first-hand read of `gi-registry.ts:111` + two battery pins), 26 high, 31 medium, 8 low — a mix of depth-hardening, design disagreements, and a small set of genuine residual defects enumerated in the bug ledger below.

## THE CHECKPOINT / DEPLOY STATE (the direct answer)

| Question | Answer | Evidence |
|---|---|---|
| Newest saved checkpoint | `Checkpoints/gi-v21-seal-pre-cleanup-3ee605dd` (commit `36ea932`) | `ls Checkpoints/` |
| Does it hold the CURRENT live dist? | **NO — it holds GI `3ee605dd`, one cleanup-wave behind** | `sha256sum` of its `dist/index.js` vs live `450c1c14…` |
| Current live dist bytes live where? | Source tree `extensions/graph-intelligence/index.js` (committed `c17f137`) + host-deploy `~/.omp/agent/extensions/graph-intelligence/index.js` — SHAs identical `450c1c14…` | sha256sum ×2 this turn |
| Deployed live already? | **YES** — rig `gi-omp-port` Up 6h, GI `450c1c14…` + trident `472a0ff3…` exec-verified; host agent dir loads the same bytes for your own OMP sessions | docker exec this turn |
| `gi-omp-port2`? | **GONE** (destroyed in the host restart, not recreated) — second-rig isolation legs are STALE | `docker ps -a` |
| Gap to close | The live state (`450c1c14`) has NO checkpoint — one save behind. Say the word and a post-cleanup checkpoint is cut | this report |

## LIFECYCLE MAP

```
┌──────────────┐  confine+guards   ┌──────────────────────────────────┐
│ OMP tool call│ ────────────────► │ extension.ts (L6 guards, 4 tools)│
└──────────────┘                   └───────────────┬──────────────────┘
                                                   │
          ┌────────────────────────────────────────┼──────────────────┐
          ▼                ▼                       ▼                  ▼
   ┌────────────┐  ┌────────────┐       ┌────────────┐       ┌────────────┐
   │ M3 warm    │  │ M4 verbs   │       │ M7 audit   │       │ hunt       │
   │ hash→populate│ │ ids→queries│       │ Tarjan SCC │       │ micro-loop │
   └─────┬──────┘  └─────┬──────┘       └─────┬──────┘       └─────┬──────┘
         ▼               ▼                    ▼                    ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │ M1 store (tombstone sqlite)     M2 identity (only label query)     │
   └────────────────────────────────────────────────────────────────────┘
```

## HOW IT WORKS (per subsystem, anchored)

| Subsystem | File:line | Mechanism | Failure mode |
|---|---|---|---|
| Tool surface | `src/omp/extension.ts:228-236` targetPath confinement (realpath+isDirectory+allowlist `GI_TARGET_ROOTS`/cwd+/tmp, `\|` separator); `:343` audit default-root also confined; `:80` sanitizeLayerId LOUD `HUNTER_TEMPLATE_INVALID` | guards at boundary | GI_PATH_DENIED / HUNTER_TEMPLATE_INVALID named refusals |
| Wipe gate | `src/omp/gi-registry.ts:111` `GI_OMP_ALLOW_CLEAR !== "1"` → throw; battery pins `st-gi-omp-tools.ts:33-39`, `st-gi-omp-wipe.ts:17-22` | env-gated callee | GI_CLEAR_REFUSED (the 3×-reported critical is this design — see bug ledger) |
| Identity | `src/omp/identity law` via `typed-write.ts` `resolveLiveIds` — all traversal by canonical_id; `whoCalls` rows carry `target_canonical` | L1 conflation kill | unknown label → explicit empty (caller names not-found) |
| Writes | `typed-write.ts` tombstone-then-insert in owned txns; `GI_TXN_REQUIRED` fail-closed guards (`insertForkNodesBatch/EdgesBatch`) | L3 | mid-txn throw → ROLLBACK → prior live intact |
| Freshness | `populate-graphify.ts` WARM-WINS second-granularity + excludes + file-scope stat + vacuity fail-closed; corbell before-read TOCTOU baseline + `stale-read-failed` | L2 (mtime-based — the known residual class) | named `GRAPHIFY_NOT_WARM:{reason}` with rebuild remedy |
| Pool | `go-key-pool.ts` keyid-keyed marks (sha256[0..16]), ordered classifier (contract→401/403→500-504→429/402/529→overloaded→other), clamped windows [1min,30d], redaction, 0600 | L4 | POOL_DEGRADED after 3 unpersisted marks |
| Audit | `hydra/auditor.ts` Tarjan SCC (onStack lowlink guard), per-table probe-failure → INCOMPLETE settlements, `nodeFile` containment, graph shape assert | sweep over graphify graph | named rejected/incomplete, never false clean-empty |
| Hunt | `hunter/tools/bug-hunt.ts:146` action=hunt micro-loop under hunt-lock, fail-closed INCONCLUSIVE | 296-finding runs, stable | schema-refused without action |

## THE BUG LEDGER (current state, scan `56d6ab5f` on THIS exact tree)

**1 CRITICAL — REFUTED (third-plus occurrence, first-hand re-read this turn):** `extension.ts:212` "wipe missing env-gate." The gate IS in the callee: `gi-registry.ts:111` throws `GI_CLEAR_REFUSED` unless `GI_OMP_ALLOW_CLEAR=1`; battery-pinned twice. Honest note per your law: the guard's invisibility at the tool surface is itself a design finding — the rebuild's L6 moves it inline.

**26 HIGH — the three classes (all named, none unknown):**

| Class | Count | Real defects vs design vs hardening | Examples (verbatim anchors) |
|---|---|---|---|
| Genuine residual defects (fixable, non-breaking in normal use) | ~8 | corbell `openTypedStore` outside try (open failure escapes as throw, not named result); graphify helper lacks the same open-guard; `nodeFile`-adjacent absolute-path containment bypass in adapter:513; chainCalls label-set target matching; safeDelete/gateAdvisory nested opens; DDL UNIQUE silent-defer; `godNodes` deref before shape guard in one path | `populate-corbell.ts:153`, `graphify-adapter.ts:513,618`, `typed-write.ts:600,649,142`, `auditor.ts:742` |
| Design positions the engine disagrees with (ruled or ruleable) | ~10 | warm-wins second-granularity tolerance (same-second edits); pool session wording; env-key append rung; lineless skip-vs-throw asymmetry; `dead_until<=now` expiry semantics; mark-write-failure hot-spin | `populate-graphify.ts:122`, `go-key-pool.ts:171,265,289,406` |
| Depth-hardening (TOCTOU/canonicalization corners) | ~8 | roots resolved-not-realpathed; mtime-only mid-read check; audit ledgerDir collision under concurrent runs; repeated-populate cost; Windows-drive split | `extension.ts:38,303,390`, `auditor.ts:111`, `corbell.ts:123` |

**31 medium / 8 low:** same three classes at lower stakes; full rows in TESTING_LOG + `/tmp/qwen-ship.json`.

**Functional impact statement (measured, not softening):** none of the 26 highs breaks the primary paths proven live this turn — queries answer with canonical rows, audits settle with artifacts, hunts complete, isolation refuses honestly. The classes that WOULD break you (conflation, history loss, non-atomic writes, injection) were fixed in V21 and are regression-pinned by named tests.

## TESTING LEDGER (this turn + this session)

| Test | Scope | How | Result |
|---|---|---|---|
| Full battery | 20 files, 127 tests, 937 expect | `bun test` 20-file enumeration, vendor symlink, this turn | **127/0** |
| G1 who-calls live | gi-omp-port, V21 dists | TUI write to `xd://graph-query` | `nodes=4 edges=5 rows=2` + both beta callers |
| G4 audit live | same | TUI write to `xd://aether-code-audit` | `AUDIT_DONE findings=3` run-id `1789551825285` |
| G5 safe-delete/impact live | same | TUI graph-query verbs | `impact_reaches=2`, `safe_delete 2/2/0/0` |
| G3 hunt live | same | TUI bug-hunt action=hunt | `HUNT_DONE findingsCount=296 v14` (pre-restart bytes; STALE post-swap) |
| Honest-zero isolation | gi-omp-port2 | empty-tree who-calls | `GRAPHIFY_NOT_WARM:absent` + remedy — **STALE (rig gone)** |
| Ship-gate scan | 7 files | `ocr scan` session `56d6ab5f` | 66: 1c(refuted)/26h/31m/8l → **GATE FAIL** |

## SPEC MANDATE → STATE MAP

| You ordered | State | Evidence |
|---|---|---|
| "fix everything / clean up ALL pending findings" | Done for the 57-findings scan; the follow-up scan generated a new 59/66 set (convergence law, EN-023) | cleanup commit `df3f582`, fix-now-2 `c17f137`, TESTING_LOG cleanup entry |
| "stop writing shitty code / TDD" | V21+ ran RED-first per defect; post-V21 designed structures produced 0 self-defects; the cleanup wave relapsed partially (6 defects, all caught+fixed in 1 cycle) | SLOP-CODING-METHOD Part VII |
| "is it ship ready?" | **NO by gate law** (26 high). Yes by behavior (127/0 + live legs). Production-grade = your debt ruling or the rebuild | this report |

## THE NUMBERS

```
┌────────────────────────────┬────────────────────────────────┐
│ battery                    │ 127/0, 937 expect, 20 files    │
│ source .ts (kernel scan)   │ 7 files, ~4,200 lines          │
│ GI dist SHA                │ 450c1c14d34e1d11 (574KB class) │
│ trident dist SHA           │ 472a0ff3c531178c (23.87MB)     │
│ rigs                       │ 1 up (port), port2 GONE        │
│ audit (current tree)       │ 66: 1c(refuted)/26h/31m/8l     │
│ self-defects shipped/fixed │ 15 across 8 waves (SLOP III.2) │
│ checkpoint lag             │ 1 wave (pre-cleanup vs live)   │
└────────────────────────────┴────────────────────────────────┘
```

## FILE MANIFEST (the deploy-critical set)

```
Graph_Intelligence/
├── extensions/graph-intelligence/index.js   MODIFIED (live GI dist 450c1c14)
├── src/omp/extension.ts                     MODIFIED (guards, 4 tools)
├── src/omp/typed-write.ts                   MODIFIED (store + verbs)
├── src/omp/populate-graphify.ts             MODIFIED (warm path)
├── src/omp/populate-corbell.ts              MODIFIED (fallback)
├── src/hydra/auditor.ts                     MODIFIED (audit engine)
├── src/hunter/keys/go-key-pool.ts           MODIFIED (pool)
├── tests/ (17) + src/hydra/__tests__/ (3)   FULL BATTERY
├── Checkpoints/gi-v21-seal-pre-cleanup-3ee605dd/  CHECKPOINT (dist 3ee605dd — 1 wave behind live)
└── reports/GI_KERNEL_REBUILD_DPL1_SPEC.md   THE REBUILD SPEC (M1-M8, 7 laws)
```

## WHAT'S NEEDED FROM THE OPERATOR

1. **Ruling on the 26 highs** (accept-as-documented-debt → production-grade with named caveats; or name rows → bounded test-first fixes).
2. **Say "cut the checkpoint"** → I snapshot the CURRENT live state (`450c1c14`) which is currently unsaved.
3. **Rebuild GO** → the hydra pin is ready (`MASTER_PROMPT.md` + `LAUNCH_GOAL.txt` at repo root; 5 locks, 7 waves); W6 swaps the live kernel.
4. Optional: recreate `gi-omp-port2` to un-STALE the isolation legs.
