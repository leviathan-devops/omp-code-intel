# GI KERNEL REBUILD — DPL1 SPECIFICATION (v2, FULL DENSITY)
## The properly-engineered replacement for the accreted kernel — complete interfaces, data model, test matrices, process law, and verification gates

**Status:** AUTHORITATIVE for the rebuild. Supersedes all patch waves. The old kernel is frozen as reference at `Checkpoints/gi-v21-seal-pre-cleanup-3ee605dd` (GI `3ee605dd`, trident `17aa8c45`) and at tag-able commit `11fdcb7`.
**Author of record:** the GI-OMP rebuild session, 2026-09-16.
**Companion documents:** `reports/SLOP-CODING-METHOD.md` (the anti-method this spec is written to make impossible), `reports/V21_DESIGN_REWORK_PLAN.md` (the transitional wave), `GI_OMP_FULL_PORT_DPL1_SPEC.md` (the original port spec — superseded for kernel internals, retained for tool-surface contract).
**The one-sentence objective:** replace ~4,200 lines of accreted, invariant-free kernel machinery with ~1,700 designed lines in 8 modules where every finding class the audit tool flagged across 8 scans is STRUCTURALLY IMPOSSIBLE — and prove it with **GATE: PASS (0 critical / 0 high)** on the frozen new kernel.

---

## §0 · EVIDENCE-GROUNDED FAILURE INVENTORY (what the old kernel did wrong — the spec's reason to exist)

Every entry is a finding class observed in ≥1 of the 8 audit scans, with its structural cause. The rebuild's modules exist to delete these classes.

| # | Class | Observed instances (scan evidence) | Structural cause in old kernel | Killed by |
|---|---|---|---|---|
| FC-1 | Identity conflation (label used as join/frontier key) | `chainCalls` label-set matching (typed-write.ts:454); `safeDelete` uses join (typed-write.ts:589); impact frontier labels (typed-write.ts:486 pre-V21) | dual identity: label AND canonical_id both used as keys across 5 verbs | M2 + L1 |
| FC-2 | Freshness TOCTOU/granularity | inverted comparison (V20, D5); `+1000ms` tolerance flagged scans V-16..VIII; self-comparing re-stat (scan VII); walk-failure false-fresh (scan VII) | correctness computed from mtimes, multiple stat calls, tolerance layers | M3 + L2 |
| FC-3 | Non-atomic / history-destroying writes | `INSERT OR REPLACE` deletes prior rows (scan III H08); supersede-outside-txn (scan I V-16, scan VII H07); singles tombstone+insert as two autocommits (scan VII) | multi-statement sequences outside transactions; REPLACE semantics | M1 + L3 |
| FC-4 | Pool lifecycle/staleness/identity | positional idx vs reload reorder (scan VII); grace-law hot-spin (scan VII); RangeError on 1e20 (scan VII); expired marks reported dead (scan VII) | hand-rolled LRU/shard/WAL logic with per-call health checks | M5 + L4 |
| FC-5 | Sweep injection/failure-semantics | grep flag injection (scan VII); SEARCH_FAILED→dead-code evidence (scan VII); exit-1 conflated with failure (scan VII) | argv built without `--`; failure tokens used as absence evidence | M6 + L5 |
| FC-6 | Invisible/bypassable boundary guards | wipe gate repeated 3× as CRITICAL (scans 2,6,8); audit default-root unconfined (scan VII); `inTransaction === false` bypass (scan VII) | guards in callees, added after findings, fail-open comparisons | M8 + L6 |
| FC-7 | Path escape / containment | nodeFile `../` (scan VII); grep-hit escape (scan IV); dual-root divergence on GRAPHIFY_OUT (scan VII) | relative/absolute mixing without a single realpath+contain rule | M3/M6/M7 + L5 |
| FC-8 | Silent degrade / fabricated data | lineless `?? 0` (scan III); SEARCH_FAILED→clean-empty (scan VII); empty-scope fresh-by-vacuity (scan VII) | error paths producing plausible-looking values instead of named refusals | M4/M6/M7 process law |
| FC-9 | Accretion | freshness probe: 7 patch layers; supersede invariant: 3 hand-maintained copies; lineless policy: 5 sites with 2 different policies | no module ceiling, no invariant statements, no design owner | L7 throughout |

---

## §1 · THE SEVEN DESIGN LAWS (normative, enforced by CI greps + tests)

**L1 — CANONICAL IDENTITY.** A node's identity is `canonical_id` (format `{relpath}:{line}:{name}`, assigned once at insert). `label` is display text. CI grep: `grep -n "label = ?" src/kernel/ --include="*.ts"` returns EMPTY outside `identity.ts`. Violation: the conflation class re-opens (measured: scans IV/VII).

**L2 — ONE-STAT FRESHNESS.** `warm.ts` computes `sha256` over (sorted relative paths + file sizes + first 4KB of each indexed file) in ONE walk at build; the hash is stored in `meta`. Freshness = recompute + compare. No `mtimeMs` anywhere in freshness code. CI grep: `grep -n "mtimeMs" src/kernel/warm.ts` returns EMPTY. Violation: the TOCTOU/granularity class re-opens (measured: 7/7 scans).

**L3 — TOMBSTONE-NATIVE WRITES.** One statement per write (`INSERT ... ON CONFLICT DO UPDATE SET superseded_run = excluded.superseded_run` style or explicit tombstone-then-insert inside one owned transaction). `REPLACE` is banned. CI grep: `grep -n "INSERT OR REPLACE" src/kernel/` returns EMPTY. Every multi-row write names its transaction owner in the function doc.

**L4 — THIN POOL.** One sqlite file (path: `GO_POOL_DB` > `~/.cache/gi/pool.sqlite`), one connection per process, WAL, busy_timeout 5000, rows keyed by `keyid` = sha256(key)[0..16] (never a raw prefix), marks written through `markDead` only. No LRU, no shards, no per-session paths.

**L5 — ONE SEARCHER.** All content search through `sweep.ts`: `execFile` argv-array, `--` before pattern, exit-code map {0: hits, 1: CLEAN, other: TOOL_FAILED}, hit paths realpath+contained, cap enforced. No other file spawns rg/grep. CI grep: `grep -rn "execFile" src/kernel/ --include="*.ts" | grep -v sweep.ts` returns EMPTY.

**L6 — BOUNDARY GUARDS.** `wipe` gate check inside `graph-probe` execute body; `confineTargetPath` (realpath + isDirectory + allowlist, `|`-or-`:` separators) called by EVERY tool that accepts targetPath INCLUDING the default-cwd path; load budget checked on actual bytes post-read. Each guard has a through-the-tool battery test.

**L7 — MODULE CEILING.** ≤300 lines/module. Invariants stated as types at module top. `wc -l` gate in CI.

---

## §2 · DATA MODEL (complete DDL)

```sql
-- store.ts owns this schema. One migration function, idempotent, loud on UNIQUE-defer.
CREATE TABLE IF NOT EXISTS nodes (
  id            INTEGER PRIMARY KEY,
  canonical_id  TEXT    NOT NULL,              -- {relpath}:{line}:{name}
  kind          TEXT    NOT NULL,              -- function|class|method|file|module|flow|service
  label         TEXT    NOT NULL,              -- display only (L1: never a key)
  file          TEXT,                          -- root-relative, contained (L5 rules)
  line          INTEGER,                       -- NULL is legal; consumers count lineless
  created_run   TEXT    NOT NULL,
  superseded_run TEXT                          -- NULL = live
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_nodes_live
  ON nodes(canonical_id) WHERE superseded_run IS NULL;
CREATE INDEX IF NOT EXISTS ix_nodes_label ON nodes(label);          -- display listing only
CREATE INDEX IF NOT EXISTS ix_nodes_file  ON nodes(file);

CREATE TABLE IF NOT EXISTS edges (
  id            INTEGER PRIMARY KEY,
  src_canonical TEXT    NOT NULL,
  dst_canonical TEXT    NOT NULL,
  predicate     TEXT    NOT NULL,              -- calls|imports|traces-to (closed set, CHECK)
  evidence      TEXT    NOT NULL DEFAULT '',
  confidence    REAL    NOT NULL DEFAULT 1.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  created_run   TEXT    NOT NULL,
  superseded_run TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_edges_live
  ON edges(src_canonical, dst_canonical, predicate) WHERE superseded_run IS NULL;
CREATE INDEX IF NOT EXISTS ix_edges_src ON edges(src_canonical);
CREATE INDEX IF NOT EXISTS ix_edges_dst ON edges(dst_canonical);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,                       -- 'substrate','graph_hash','graph_path','populated_at','graph_files'
  value TEXT NOT NULL
);

CHECK constraints: predicate IN ('calls','imports','traces-to') enforced at DDL level.
```

**Store meta keys (contract):** `substrate` (graphify|corbell|indexer-fallback), `graph_hash` (L2), `graph_files` (count), `graph_path`, `populated_at` ISO-8601, `unique_deferred` (0|1 — set when legacy duplicates deferred a UNIQUE index; surfaced by `status`).

---

## §3 · MODULE SPECIFICATIONS

### M1 — `kernel/store.ts` (~200 lines)

**Exports (exact signatures):**
```ts
export function openStore(path: string): Database;                    // creates dirs, DDL once, WAL
export function insertNodes(db: Database, rows: NodeRow[], run: string): void;   // L3: caller-visible txn req
export function insertEdges(db: Database, rows: EdgeRow[], run: string): void;
export function liveNodeCount(db: Database): number;
export function liveEdgeCount(db: Database): number;
export function tombstoneAll(db: Database, run: string, tables: Array<"nodes"|"edges">): void;
```
**Invariants:** `insertNodes`/`insertEdges` REQUIRE `db.inTransaction === true` (fail-closed `GI_TXN_REQUIRED`). `tombstoneAll` supersedes ONLY the listed tables (per-table law). `REPLACE` banned. `line` may be NULL (lineless is data, counted by consumers).
**Transaction owners:** `warm.populate` (populate path), `store.insertWithTxn` helper for single-row call sites. One owner per call-path, named in the function doc.
**Test matrix (named):**
- `store_reinsert_tombstones_prior_generation` — insert x.ts:1:fn@r1, re-insert @r2 → 2 rows, r1 superseded_by r2, r2 live.
- `store_midtxn_throw_rolls_back` — force edge insert failure after node insert → 0 new rows, prior live intact.
- `store_guard_fails_closed_on_undefined_intransaction` — wrapper object without the flag → GI_TXN_REQUIRED.
- `store_per_table_tombstone_edges_only` — tombstoneAll(edges) leaves live nodes.
- `store_unique_defer_is_loud` — legacy dup store → WARN in meta, store opens, inserts still safe.
- `store_predicate_check_rejects_unknown` — INSERT with predicate 'references' → SQLITE constraint error surfaced.

### M2 — `kernel/identity.ts` (~80 lines)

**Exports:**
```ts
export function resolveIds(db: Database, label: string): string[];   // live canonical_ids for a display label
export function display(db: Database, id: string): string;           // label for one id ('' if absent)
```
**Invariants:** the ONLY `label = ?` in the kernel. Unknown label → `[]` (never a synthesized id — kills the typo→silent-empty class by making the empty case explicit to callers, which must name it).
**Test matrix:** same-label two-identity resolution; unknown label → []; display miss → ''.

### M3 — `kernel/warm.ts` (~250 lines)

**Exports:**
```ts
export interface SourceFingerprint { hash: string; files: number; }
export function sourceHash(root: string, scope: string[], excludes: string[]): SourceFingerprint | { error: string };
export function isWarm(store: Database, root: string, scope: string[], excludes: string[]): { ok: true } | { ok: false; reason: string };
export function populate(db: Database, root: string, run: string, substrate: "graphify"): { ok: true; nodes: number; edges: number } | { ok: false; reason: string };
```
**Invariants:** L2 — `sourceHash` walks once (scope entries may be files: stat'd directly), sorts paths, hashes `path\0size\0first4k`; empty/failed scope → `{ok:false, reason:"stale-unscooped"}`; unreadable root → `stale-read-failed`; budget exhaustion → `stale-budget`. `populate` computes hash AFTER build, stores in meta, per-table tombstone+insert inside one owned txn. `isWarm` = recompute + string-compare with stored hash. No mtime anywhere.
**Test matrix:** same-second rebuild → warm; edit-after-build → stale; unreadable root → stale-read-failed; file-scope entry → counted; empty scope → stale-unscooped; excludes honored; budget exhaust → stale-budget; hash stability across two walks with no changes; hash changes on content edit (same size).

### M4 — `kernel/verbs.ts` (~350 lines)

**Exports (13 verbs; result shapes exact):**
```ts
export function whoCalls(db, ids: string[]): { rows: number; callers: CallerRow[]; linelessSkipped: number };
export function impact(db, ids: string[], depth?: number): { reaches: number; ledger: LedgerRow[]; linelessSkipped: number };
export function blastRadius(db, ids: string[], depth?: number): { root: string; nodes: BlastNode[] };
export function chain(db, fromIds: string[], toLabel: string, maxDepth?: number): ChainStep[];
export function safeDelete(db, ids: string[]): SafeDeleteResult;     // callers/reaches/uses/testReach, id-keyed
export function wouldBreak(db, ids: string[], proposed?: string): WouldBreakResult;
export function gate(db, symbols: string[], dial: Dial, ripwire?: RipwireNote): GateAdvisoryResult;
export function verify(db, claim: VerifyClaim): VerifyResult;
export function unwired(db): UnwiredRow[];                            // lineless skipped+counted
export function countNodes(db): number; export function countEdges(db): number;
export function names(db): string[];
// delegation verbs (must-implement|rule|violations|consistency) route to hunter query-registration — unchanged contract.
```
**Invariants:** L1 — ALL traversal on ids (callers pass `identity.resolveIds` output). Visited marked on ENQUEUE. blastRadius = id-keyed recursive CTE. lineless rows skipped + `linelessSkipped` counted (never thrown per-row, never fabricated to 0). Every verb opens the store ONCE (callers pass the Database; no nested opens — the re-entrant-open finding class is banned by taking `db` not `storePath`).
**Test matrix (named):**
- `impact_no_phantom_depth_on_same_label_identities` (the V21 conflation fixture, kept)
- `impact_cycle_seed_never_ledgers_itself`
- `impact_lineless_rows_counted_not_fatal`
- `whoCalls_rows_carry_target_canonical`
- `blast_radius_id_recursion_no_cross_file_fanout`
- `chain_marks_visited_on_enqueue_dense_graph_terminates`
- `safe_delete_uses_are_canonical_id_keyed`
- `safe_delete_lineless_uses_skipped_counted`
- `gate_advisory_single_connection`
- `verify_unknown_claim_named_refusal`
- `unwired_lineless_skipped_counted`

### M5 — `kernel/pool.ts` (~120 lines)

**Exports:**
```ts
export type GoErrorClass = "contract" | "rejected" | "server" | "quota" | "other";
export function loadKeys(): void;                                       // env JSON > file > single env rung; dedup by sha
export function classify(err: string): GoErrorClass;                    // ORDERED: contract → 401/403 → 500-504 → 429/402/529 → overloaded→server → other
export function parseWindowMs(err: string): number;                     // hr/min/sec/weeks/months dialects; clamp [60_000, 30d]
export function markDead(idx: number, err: string, now?: number): number; // returns persisted until, 0 on failed write
export function resolve(now?: number): { idx: number; alive: boolean; expiryKnown: boolean };
export function snapshot(now?: number): string;                         // labels only; Date-range clamped
export function routeGoError(idx: number, err: string, now?: number): "advance-same-rung" | "fall-to-openrouter" | "walk-rungs-no-mark" | "advance-no-mark";
```
**Invariants:** one DB file (`GO_POOL_DB` > `~/.cache/gi/pool.sqlite`); rows keyed `keyid = sha256(key)[0..16]` with idx column for ordering; `chmod 0600` on db + `-wal` + `-shm` after each open; classifier ordered (server BEFORE quota; 529 quota; bare overloaded→server); failed markDead write returns 0 AND increments an in-memory `degradedWrites` counter — `resolve` surfaces `POOL_DEGRADED` after 3; snapshot clamps to `8_640_000_000_000`.
**Test matrix:** classifier table (12 rows: 400/401/403/429/402/500/502/503/504/529/overloaded-bare/other); window dialects (hr/h/hrs/hours, min, secs, weeks, months) + clamps both ends; keyid stability across reorder; 0600 on db+wal+shm; degradedWrites→POOL_DEGRADED; geometry-relative advance/fall.

### M6 — `kernel/sweep.ts` (~150 lines)

**Exports:**
```ts
export type SweepResult = { kind: "hits"; lines: string[] } | { kind: "clean" } | { kind: "tool-failed"; detail: string };
export function grep(root: string, pattern: string, cap: number): Promise<SweepResult>;
export function readFileCapped(root: string, rel: string, cap: number): { kind: "ok"; text: string } | { kind: "refused"; reason: string };
```
**Invariants:** L5 — execFile argv (`[rg, -n, --max-count, cap, --, pattern, root]`, grep fallback with `--`); exit 0→hits, 1→clean, else TOOL_FAILED (with stderr slice); hit paths realpath+contained (escape → dropped with `escaped:N` count); read: single open (O_NOFOLLOW-style via realpath first), size from the open handle, no stat-then-read window.
**Test matrix:** leading-dash pattern (`--` proof); exit-1 = clean; simulated ENOENT binary = TOOL_FAILED; escaping symlink = dropped+counted; cap clamp named.

### M7 — `kernel/audit.ts` (~300 lines)

**Exports:**
```ts
export interface Settlement { layerId: string; status: "fulfilled" | "rejected" | "incomplete"; findings: Finding[]; reportPath?: string; error?: string; durationMs: number; }
export function runTemplateAudit(args: { template: string; ledgerDir: string; targetRoot: string; graphPath: string; store: Database }): Promise<Settlement>;
export const TEMPLATES: readonly string[];                              // 14 layerIds
```
**Invariants:** graph shape asserted once (`assertGraphShape`: object, nodes[], edges[], godNodes? optional-with-guard); Tarjan SCC with onStack lowlink guard (F1) + per-SCC enumeration with disclosed cap; INCOMPLETE settlements are their own status (never fulfilled clean-empty — the AUD-C2 class); `nodeFile` refuses escapes; probes route through M6 (TOOL_FAILED → incomplete); findings paths contained (AUD-C1).
**Test matrix:** malformed graph (no edges[]) → rejected named; 3-cycle fixture → found; cross-seed cycle fixture → found (F1 regression); probe-failure fixture → incomplete; 14 templates × fixture → all settle (no template invalid); findings path escape → contained/"".

### M8 — `tool-surface/extension.ts` (~250 lines)

**Exports:** `registerGiTools(pi, cwdOf)` registering exactly: `graph-probe`, `graph-query`, `bug-hunt`, `aether-code-audit` (+`graph-code-audit` alias IN the return list — the enumeration gap, fixed).
**Boundary guards (L6) — all inside execute bodies:**
- `wipe`: `if (process.env.GI_OMP_ALLOW_CLEAR !== "1") return GI_CLEAR_REFUSED` INLINE (the 3× critical dies by visibility), then delegate.
- `confineTargetPath` called by graph-query AND aether-code-audit AND bug-hunt for EVERY targetPath including the default-cwd path.
- load budget: sweep/M3 own it; extension surfaces named refusals only.
- `sanitizeLayerId`: explicit invalid → `HUNTER_TEMPLATE_INVALID` refusal (no silent coercion); empty → default.
- `sessionId` request param: REMOVED from schemas (caller identity is ctx.sessionID — the declared-but-unused class dies).
- Repopulate single-flight: `populateInFlight` module flag; second concurrent populate → named `POPULATE_BUSY` (the no-lock race finding dies by serialization at the surface).
- Result `ok:true` is NEVER spread over a failed inner result (the `{...sd, ripwire, ok:true}` finding dies): ok is computed from the operation result, not asserted.
**Test matrix (through-the-tool — every test drives `registerGiTools` + execute, never internals):**
- wipe without env → GI_CLEAR_REFUSED through the tool; with env → GI_CLEARED; row count unchanged on refusal.
- relative targetPath → GI_PATH_DENIED; /etc targetPath → GI_PATH_DENIED; deleted-cwd default → GI_PATH_DENIED.
- invalid template → HUNTER_TEMPLATE_INVALID through the tool.
- concurrent populate → second gets POPULATE_BUSY.
- wouldBreak/safeDelete failures propagate ok:false (never masked ok:true).
- alias `graph-code-audit` appears in tool-enumeration test.

---

## §4 · ERROR TAXONOMY (every named code, the complete set)

| Code | Emitted by | Meaning | HTTP-analog |
|---|---|---|---|
| GI_PATH_DENIED | M8 guards | target outside allowlist / not a dir / missing | 403 |
| GI_TXN_REQUIRED | M1 | write attempted outside owned txn | 409 |
| GI_SCOPE_REFUSED | M8/store | cross-session store open | 403 |
| GI_CLEAR_REFUSED | M8 boundary | wipe without env | 403 |
| GI_STORE_CORRUPT | M1 | magic mismatch | 500 |
| GI_MIGRATION_DEFERRED | M1 (WARN row) | legacy UNIQUE deferred | 200-note |
| GRAPHIFY_NOT_WARM:{absent,stale,changed-mid-read,stale-unscooped,stale-budget,stale-read-failed} | M3 | warm-miss WITH rebuild remedy | 404+remedy |
| GRAPH_EMPTY | M3 | zero nodes produced | 422 |
| GRAPHIFY_GRAPH_TOO_LARGE | M3/M6 | over 128MiB actual bytes | 413 |
| GRAPHIFY_EXTRACT_FAILED | M3 | parse failure | 422 |
| GRAPHIFY_CORRUPT:{projection|build} | M3 | non-warm-miss build/projection failure | 500 |
| GRAPHIFY_WRITE_FAILED | M3/M1 | txn/write failure (loud, rolled back) | 500 |
| LINELESS_NODE (counted) | M4 | lineless rows skipped: N | 200-note |
| QUERY_INVALID | M8 | verb/arg malformed | 400 |
| QUERY_DELEGATION_INVALID | M4/M8 | delegation returned non-array | 502 |
| HUNTER_TEMPLATE_INVALID | M8/M7 | layerId malformed | 400 |
| HUNTER_STALE_REPORT / HUNTER_NO_REPORT / HUNTER_EMPTY_REPORT | M7 | read-back validation | 422 |
| HUNT_INCONCLUSIVE | M7 | hunt fail-closed | 200-as-failure |
| POPULATE_BUSY | M8 | single-flight second caller | 429 |
| POOL_DEGRADED | M5 | ≥3 unpersisted marks | 200-note |
| GO_POOL_EMPTY | M5 | zero keys configured | 400 |
| SWEEP_TOOL_FAILED | M6 | searcher infrastructure failure | 502 |
| AUDIT_INCOMPLETE | M7 | probe failures prevented verdict | 200-as-incomplete |

---

## §5 · TOOL SURFACE CONTRACT (unchanged externally, exact)

| Tool | Params (schema) | Boundary guards | Backend |
|---|---|---|---|
| graph-probe | echo?, action? | wipe env-gate INLINE | identity only |
| graph-query | verb (13), target?, targetPath?, substrate? | confineTargetPath; verb whitelist; symbol-required per verb | M2→M4 over M3-populated store |
| bug-hunt | action: hunt\|status, i?, targetPath?, profilePath? | confineTargetPath; schema-strict action | M7 hunt path (unchanged contract) |
| aether-code-audit (+alias graph-code-audit) | template?, targetPath? | confineTargetPath; sanitizeLayerId; graph shape guard | M7 |

Result envelope: every tool returns `textResult(body, { ok, error?, ...payload })` where `ok` is COMPUTED from the operation result. Failures are loud, named, and carry the remedy string.

---

## §6 · DATA FLOW (the whole kernel, one diagram)

```
┌──────────────┐   confine+guards    ┌──────────────────────────────────┐
│ OMP tool call │ ──────────────────► │ M8 extension (L6 guards, no logic)│
└──────────────┘                     └───────────────┬──────────────────┘
                                                     │
              ┌──────────────────────────────────────┼──────────────────────────┐
              ▼                    ▼                 ▼                          ▼
      ┌──────────────┐    ┌──────────────┐   ┌──────────────┐         ┌──────────────┐
      │ M3 warm      │    │ M4 verbs     │   │ M7 audit     │         │ hunt (M7)    │
      │ hash→populate│    │ ids→queries  │   │ shape→sweep  │         │ micro-loop   │
      └──────┬───────┘    └──────┬───────┘   └──────┬───────┘         └──────┬───────┘
             │                   │                  │                        │
             ▼                   ▼                  ▼                        ▼
      ┌──────────────────────────────────────────────────────────────────────┐
      │ M1 store (tombstone sqlite)        M2 identity (the only label query)│
      └──────────────────────────────────────────────────────────────────────┘
                     │                                │
                     ▼                                ▼
      ┌──────────────────────────┐      ┌──────────────────────────────┐
      │ M5 pool (thinf, keyid)   │      │ M6 sweep (argv, --, exit map)│
      └──────────────────────────┘      └──────────────────────────────┘
```

---

## §7 · PROCESS LAW (enforced, not aspirational)

1. **TDD absolute.** No implementation line without a watched-red named test. Evidence: the RED/GREEN paste lands in the wave record.
2. **One finding, one fix, one commit.** No batching. Battery after every commit.
3. **Post-edit re-read.** Every scripted or manual edit is followed by reading the complete modified function before the next action.
4. **Module scan gate.** `ocr scan --path src/kernel/<module>.ts` after each module: **0 critical/high required** before M+1 begins. Module-sized scans are the stable-instrument usage.
5. **Both-dists deploy script.** `scripts/deploy.sh`: builds GI + trident (NODE_PATH encoded inside), docker-cp to both rigs, exec sha256 verify ×4 copies, refuses on any drift. No manual deploy.
6. **Tool-surface battery.** Every M8 test drives the registered closure. The battery MUST include the surface (EN-017 class).
7. **Fixture builders are scripts.** `scripts/build-fixture.sh` regenerates `/tmp/fx383g` (2 files, extract, verify node/edge counts). No tmp dependency without a builder.
8. **Environment keys are geometry-relative.** No magic counts (the 6→7 key class).
9. **Freeze before final gate.** ONE full 7-file scan on the frozen kernel; triage honestly; bounded fix-now ONLY on own new code; the rescan after that is THE verdict; then stop.
10. **Docs trail fixes.** A doc entry exists only for landed, verified changes.

---

## §8 · BUILD ORDER & WAVE PLAN (each wave: tests red → implement → green → scan-gate → commit)

| Wave | Module | Depends on | Scan gate | Est. tests |
|---|---|---|---|---|
| W1 | M1 store | — | 0c/0h | 6 |
| W2 | M2 identity | M1 | 0c/0h | 3 |
| W3 | M3 warm | M1 | 0c/0h | 9 |
| W4 | M4 verbs | M1+M2 | 0c/0h | 11 |
| W5 | M5 pool | — (parallel with W3/W4) | 0c/0h | 12 |
| W6 | M6 sweep | — | 0c/0h | 6 |
| W7 | M7 audit | M1+M4+M6 | 0c/0h | 6 |
| W8 | M8 extension | all | 0c/0h | 10 |
| W9 | deploy.sh + fixtures | M8 | — | script-verified |
| W10 | Freeze → full 7-file gate scan → triage → ship verdict | all | THE verdict | — |

Compatibility: the old extension is removed from `config.yml` `extensions:` list when M8 lands; the old kernel moves to the checkpoint reference. The tool surface contract (§5) is byte-compatible with existing callers (graph-probe echo, graph-query verbs, bug-hunt actions, audit template/layerId).

---

## §9 · RISKS & MITIGATIONS

| Risk | Mitigation |
|---|---|
| Parity gaps (old behavior users relied on) | §5 tool contract is fixed; deltas documented per module (lineless counts, incomplete settlements) |
| The scan still reports NEW findings on new code | L1-L7 remove the CLASSES; module gates catch defects at 300-line scope where the LLM reads reliably; the W10 triage is bounded by construction |
| Hunt micro-loop complexity (2,193 lines in old harness) | hunt keeps its harness (out of the 7-file scan scope historically), contract-pinned by 3 tests; deeper rework is a follow-up spec, not silent scope |
| Schedule | W1-W8 are sequential-but-bounded; the module gates PREVENT the wave-9-collapse pattern that cost 2 days |
| Regression vs fixture ground truth | fixtures rebuilt by script with MEASURED counts asserted (no magic 5/5) |

---

## §10 · RESIDUAL

- The hunt harness internal design (micro-loop-machine 536L) is inherited, not redesigned — its finding surface was historically lower (1 template-level finding) but is not zero; a follow-up spec owns it if flagged.
- Windows hosts are out of scope (documented in the confinement separator note).
- `inferx`/`nvidia` rungs remain banned by operator law (V-14); the classifier's `server` class exists purely for correct non-exile routing.
