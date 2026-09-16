# GI KERNEL REBUILD — DPL1 SPEC (v1)
## The properly-engineered replacement for the accreted kernel

**Status:** AUTHORITATIVE for the rebuild. Supersedes patch-waves; the old kernel is frozen as reference (`Checkpoints/gi-v21-seal-pre-cleanup-3ee605dd`).
**Goal:** a kernel where every finding class the audit tool flagged is STRUCTURALLY IMPOSSIBLE — designed out, not guarded around. Final gate: **GATE: PASS (0 critical / 0 high)** on the frozen new kernel, plus battery green and live rig legs.
**Non-goals:** feature parity with every historical bolt-on. Parity is for the tool SURFACE (4 tools, 13 verbs, hunt, audit), not for the internal patch layers.

---

## §1 · THE SEVEN DESIGN LAWS (each makes a finding class impossible)

| Law | Statement | Finding class it kills |
|---|---|---|
| **L1 CANONICAL IDENTITY** | A node's identity is its `canonical_id`, assigned once. `label` is display text and is NEVER a join key, lookup key, or frontier element. The codebase contains zero `label = ?` matches outside display formatting. | conflation/homonym |
| **L2 ONE-STAT FRESHNESS** | Warm graphs carry a `content_hash` written at build time by the same process that wrote the graph. Freshness = `hash(sources_now) == stored_hash`, computed once per query, single pass, no stat sequences, no mtimes in correctness logic. | all TOCTOU/granularity/tolerance findings |
| **L3 TOMBSTONE-NATIVE WRITES** | Every write is exactly one SQL statement inside a transaction whose BEGIN/COMMIT/ROLLBACK is owned by ONE named function per call-path. REPLACE is banned (lint grep in CI). Row history is never destroyed. | atomicity/history/partial-write |
| **L4 THIN POOL** | The key pool is one sqlite file, one connection per process, WAL, `busy_timeout`, rows keyed by `keyid` (fingerprint, redacted), marks written through one function. No LRU, no sharding, no session pinning. | pool lifecycle/staleness/identity |
| **L5 ONE SEARCHER** | All content search runs through `sweep.ts`: execFile argv-array (no shell), `--` before the pattern, exit-code map (0=hits, 1=clean, else=TOOL_FAILED — a named loud class), results root-contained. | injection/TOCTOU/failure-semantics |
| **L6 BOUNDARY GUARDS** | Wipe gate, path confinement (realpath + directory + allowlist), and load budget live in `extension.ts` at tool entry — each guard visible in one screen, each with a battery test that drives it through the tool surface (never through the callee). | invisible-guard / repeated findings |
| **L7 MODULE CEILING** | No module exceeds 300 lines. A module's invariants are stated as types at its top. Exceeding the ceiling forces a split before further edits. | accretion |

## §2 · MODULES (build order; each: exports, invariants, tests, done-when)

### M1 `store.ts` (~200 lines) — the tombstone store
- **Exports:** `openStore(path)`, `insertNodes(rows, run)`, `insertEdges(rows, run)`, `liveNodes()`, `liveEdges()`, `count()`.
- **Invariants:** L3 — single-statement writes in caller-owned or self-owned txns; UNIQUE partial indexes on `(canonical_id)` and `(src,dst,predicate)` over live rows; legacy-unique-defer is a loud WARN row in `store_meta`, never silent.
- **Tests:** re-insert keeps both generations; mid-txn throw leaves prior live rows; guard fails closed when `inTransaction !== true`.
- **Done-when:** module scan 0 findings + tests green.

### M2 `identity.ts` (~80 lines) — L1 resolution
- **Exports:** `resolveIds(store, label): string[]`, `display(id): string`.
- **Invariant:** label appears in this module exactly once (the SELECT) and nowhere else in the kernel.
- **Tests:** two same-label identities resolve to 2 ids; unknown label → empty array (never a synthesized id).

### M3 `warm.ts` (~250 lines) — L2 freshness + populate
- **Exports:** `sourceHash(root, scope, excludes): {hash, files}`, `isWarm(root): {ok, reason}`, `populate(store, root)`.
- **Invariants:** hash computed in ONE walk; populate is per-table guarded; empty/failed scope → named fail-closed; `.omp`/vendor excludes are data, not code.
- **Tests:** file edit after build → not warm; same-second build → warm; unreadable root → `stale-read-failed`; file-scoped scope entry → stat'd directly.

### M4 `verbs.ts` (~350 lines) — the 13 queries
- **Exports:** `whoCalls`, `impact`, `blastRadius`, `chain`, `safeDelete`, `wouldBreak`, `gate`, `verify`, + delegation stubs.
- **Invariants:** L1 everywhere; frontier/visited carry ids; visited-on-enqueue; lineless rows are skipped + counted (`lineless_skipped` in result) — never thrown per-row, never fabricated to 0; every verb takes the store path and opens ONCE.
- **Tests:** the conflation fixture (same-label identities, phantom-depth assertion); lineless-fixture returns rows + `lineless_skipped=1`.

### M5 `pool.ts` (~120 lines) — L4
- **Exports:** `markDead(idx, err)`, `resolve(now)`, `snapshot()`, `classify(err)`.
- **Invariants:** ordered classifier (contract → 401/403 → 500-504 → 429/402/529 → other); windows parsed + clamped [1min, 30d]; rows keyed by `keyid`; snapshot clamps to the Date range; failed mark-write returns 0 AND `resolve` treats 0 as alive (no hot-spin: caller counts consecutive no-persist marks and surfaces `POOL_DEGRADED` after 3).
- **Tests:** geometry-relative; corrupt-row snapshot; classifier table complete.

### M6 `sweep.ts` (~150 lines) — L5
- **Exports:** `grep(root, pattern, cap)`, `readFile(root, rel, cap)`.
- **Invariants:** argv-array + `--`; exit-code map; hit paths root-contained (realpath); TOOL_FAILED is a named result class that callers must surface (never clean-empty).
- **Tests:** leading-dash pattern injection-safe; exit-1 = clean; simulated failure = TOOL_FAILED.

### M7 `audit.ts` (~300 lines) — templates over M1-M6
- **Invariants:** graph shape asserted once at load; per-SCC cycle enumeration is Tarjan (onStack lowlink guard, per-SCC visited); INCOMPLETE probes produce `status: "incomplete"` settlements (never `fulfilled` clean-empty); `nodeFile` refuses escapes.
- **Tests:** malformed graph → named rejection; cycle fixture → found; INCOMPLETE → settlement status incomplete.

### M8 `extension.ts` (~250 lines) — L6 tool surface
- **Invariants:** zero business logic — parse args, run boundary guards (L6), delegate, format result. The wipe gate check sits IN the execute body (battery drives it through the tool). One guard module function shared by all tools.
- **Tests:** every guard has a through-the-tool test; tool enumeration test.

## §3 · DATA MODEL (tombstone store)

```sql
CREATE TABLE nodes (
  id INTEGER PRIMARY KEY,
  canonical_id TEXT NOT NULL,
  kind TEXT NOT NULL, label TEXT NOT NULL, file TEXT, line INTEGER,
  created_run TEXT NOT NULL, superseded_run TEXT
);
CREATE UNIQUE INDEX uq_nodes_live ON nodes(canonical_id) WHERE superseded_run IS NULL;
-- edges mirror with UNIQUE(src,dst,predicate) over live rows
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
```

## §4 · THE PROCESS LAW (how this build avoids §SLOP entirely)

1. **TDD absolute:** no implementation line without a watched-red test. Per defect, per module — never batched.
2. **One finding, one fix, one commit.** Commits land individually; battery after each commit.
3. **Post-edit re-read:** every scripted/manual edit is followed by reading the full modified function.
4. **Module scan gate:** after each module, `ocr scan` that module — 0 findings required before M+1 starts. (Module-scoped scans are small enough for the LLM to be thorough — this is the stable-instrument usage.)
5. **Both dists deploy is a script**, not a memory: `scripts/deploy.sh` rebuilds GI + trident (NODE_PATH encoded), copies to host + both rigs, exec-verifies SHAs, refuses on drift.
6. **The battery drives the tool surface:** at least one test per tool executes through the registered tool closure (import extension, call execute), not just the internals.
7. **Final gate:** ONE full 7-file scan on the frozen kernel. Triage output honestly: real defects → fix in bounded pass; design disagreements → named in the debt ledger with rationale. The loop terminates because the classes are gone, not because the scan was skipped.

## §5 · DONE-WHEN (the mechanical definition of ship-ready)

1. `bun test` → 0 fail across the new kernel battery (target ~60 focused tests).
2. `ocr scan` on the new kernel's files → **0 critical, 0 high** (mediums/lowers triaged, real ones fixed pre-verdict).
3. Both dists deployed, SHAs exec-verified on host + both rigs.
4. Live rig legs: G1 who-calls rows≥1 with canonical rows, G4 AUDIT_DONE, probe OK, honest-zero miss — all on the new bytes.
5. Old kernel archived, reference-linked, deleted from the tool surface.
6. `reports/GI_KERNEL_REBUILD_BUILD_REPORT.md` with per-module evidence.

## §6 · RESIDUAL / RISKS

- Behavior deltas vs the old kernel (e.g., lineless rows now surface as counts, not rows) are INTENTIONAL and documented per module.
- The old 6 external-facing tests that encode slop-era expectations get ported only where they assert the CONTRACT (verbs return callers; gates refuse) — never the accidental behavior.
- Schedule: M1-M8 sequential; the module-scan gate trades speed for finality — this is the cost of 0/0, paid once, at build time, instead of forever in patch waves.
