# GRAPH INTELLIGENCE OPERATORS MANUAL
## The Complete Engineering Architecture of the GI-OMP Kernel

**Version:** 1.0
**Date:** 2026-09-17
**Authority:** Live-proven kernel (battery 134/0, 12 audit scans, 8310-node graph on this project)
**Scope:** How the graph intelligence system works internally — every substrate, every module, every query verb, every audit template — for the operator who needs to understand and optimize the engineering architecture.

---

## 1. SYSTEM OVERVIEW

GI-OMP is an OMP plugin that provides structural code intelligence. It reads source code, builds a directed graph of nodes (functions, classes, files) and edges (calls, imports, declares), stores it in a SQLite database, and answers structural queries in milliseconds.

**What it IS:** a code knowledge base that answers "who depends on whom" instantly.
**What it IS NOT:** a static analyzer, a linter, or a code generator.

**The three-word summary:** READ → GRAPH → QUERY.

```
+------------------------------------------------------------------+
|  SOURCE CODE (TypeScript files on disk)                           |
|     |                                                             |
|     | EXTRACT (external parse engines; regex = fallback only)       |
|     v                                                             |
|  WARM GRAPH (graph.json — 11.8MB for this project)                |
|     |                                                             |
|     |  POPULATE (map to typed store, tombstone writes)            |
|     v                                                             |
|  SESSION STORE (SQLite — 24.7MB, 8310 nodes, 19797 edges)         |
|     |                                                             |
|     |  QUERY (13 verbs) + AUDIT (14 templates) + HUNT             |
|     v                                                             |
|  RESULTS (callers, blast radius, dead code, cycles, findings)     |
+------------------------------------------------------------------+
```

---

## 2. THE THREE SUBSTRATES (how source code becomes a graph)

There are three independent paths for populating the graph store. Each has different quality, speed, and dependency characteristics.

### 2.1 CORBELL — the PRIMARY and DEFAULT substrate

**What it is:** a thin TypeScript adapter over the REAL external Corbell engine — the `corbell` Python CLI (pip package `corbell`, source github.com/Corbell-AI/Corbell), which builds a parse-grade method graph with tree-sitter. NOT a regex scanner. The regex scanner is the FALLBACK (§2.3).

**How it works (the full chain, blast-audit-verified 2026-09-18):**
1. `resolveCorbell()` (`src/hunter/graph/corbell-adapter.ts`) resolves the binary: `profile.graph.binaryPath` → `CORBELL_BIN` env → `~/corbell-venv/bin/corbell` → `/opt/corbell-venv/bin/corbell` → PATH walk, every candidate `existsSync`-gated, with a `CORBELL_BIN_UNSAFE` metacharacter refusal, else named `CORBELL_NOT_FOUND`
2. `CorbellAdapter.build()` execs `corbell graph build --methods` in the target tree; the binary (tree-sitter method-graph extraction) writes its own SQLite store at `corbell-data/.corbell/workspace.db` (`graph_nodes` / `graph_edges`)
3. `scripts/corbell-build.ts` shells the adapter, reads `workspace.db` (`readCorbellNodeTypes`) and projects the rows through `store-map.ts` (pure mapping, zero regex) into the warm checkout `<root>/.omp/graph-intelligence/corbell-checkout/store.sqlite`
4. At query time, `populateFromCorbellCheckout()` copies the warm checkout rows into the session store (freshness-gated, mtime + TOCTOU baseline)

**Provenance:** real parse-grade output — the fork-v143 checkout carries 2,086 live nodes / 9,386 edges (kinds: service/method/flow/class) projected from the real workspace.db; port proof: fixture nodes=3 edges=1, big-tree build durationMs=19672, 6/6 PASS (`OmpCorbellPort` checkpoint session).

**Characteristics:**
- Speed: INSTANT at query time (warm checkout read); the binary build itself is minutes-long (15–25 min on 562 files) — which is why the index is built EXPLICITLY via `scripts/corbell-build.ts` and queries only ever READ it
- Quality: HIGH (parse-grade — method signatures, method_call call edges, flow_step traces, git coupling; NOT a regex export/import scan)
- Dependencies: the external `corbell` binary (corbell-venv / `CORBELL_BIN` / PATH); missing binary → named `CORBELL_NOT_FOUND`
- When it fires: ALWAYS first (the DEFAULT substrate); absent/stale/zero-rows → named `CORBELL_NOT_WARM:{absent|stale|zero-rows|…}` and the substrate demotes to §2.3

**VERIFIED 2026-09-18 (blast audit, 4 independent streams):** git forensics (79-commit history — the wiring shelled the real binary from the origin commit `c3db9659`, exec target never changed), exec census (no stubs), row provenance (real workspace.db), and the live binary interface (`corbell graph build --help` matches the adapter call). The BLAST_REPORT refuted the "corbell is a regex stub" allegation on this evidence.

### 2.2 GRAPHIFY — the explicit substrate

**What it is:** the AST-based graph extractor. It reads a `graph.json` produced by the external `graphify` CLI tool (a third-party Python package, `graphifyy v0.9.51`).

**How it works:**
1. `scripts/graphify-build.ts` runs `graphify extract <root> --code-only --no-cluster`
2. The graphify tool parses the target tree's ASTs (multi-language) and produces `graphify-out/graph.json`
3. At query time, `populateFromGraphifyCheckout()` reads graph.json through the GraphifyAdapter and populates the session store

**Source:** `src/omp/populate-graphify.ts:1-10` — "Reads the warm graph.json through GraphifyAdapter"

**Characteristics:**
- Speed: MEDIUM (the extract takes seconds to minutes on large projects)
- Quality: HIGH (AST-based, catches every function, class, import, and call edge)
- Dependencies: graphify binary (external, uv tool)
- When it fires: ONLY when `profile.graph.substrate === 'graphify'` (explicit opt-in)

**THIS IS THE SUBSTRATE THAT BUILT THE 8310-NODE GRAPH ON THIS PROJECT.**

### 2.3 HARD DEPENDENCY — no third substrate (F-48)

**The law:** `populate.ts` is a thin router with exactly TWO substrates —
corbell (parse-grade checkout, PRIMARY, DEFAULT) and graphify (explicit
substrate only). When neither is available the populate FAILS LOUDLY with
`GI_POPULATE_FAILED` (skipped + named reason). There is NO regex-indexer
fallback anywhere in the populate path.

**History:** a mechanical regex indexer (`collectTsFiles` + `parseExports` +
`EXPORT_STAR`/`BARE_CALL` scans, ~250 lines) used to live in `populate.ts`
and fired when corbell failed. It produced a regex-fake graph with no AST
fidelity — a NAMED wrong answer is still a wrong answer. It was removed per
operator ruling F-48 ("NO STUPID REGEX FALLBACKS — BANNED AND FORBIDDEN").
The `parseExports`/`parseExportSites` functions in `gate-middleware.ts` are
UNRELATED — they serve the gate's signature-break detection, not any populate
path.

**What happens when a substrate is broken:**
1. `populateSessionStore` returns `{ skipped: true, nodes: 0, edges: 0, fallbackReason: "GI_POPULATE_FAILED:<corbell-reason>" }`
2. The failure names the warm remedy: `(warm with: bun scripts/corbell-build.ts --target '<root>')`
3. The session store is left EMPTY (never seeded with partial or fake data)
4. The operator (or the next session) rebuilds the warm checkout and retries

**Source:** `src/omp/populate.ts:1-108` — "the THIN ROUTER. HARD DEPENDENCY
ON ALL GRAPH SYSTEMS"

### 2.4 The Substrate Selection Logic

```
populate.ts: populateSessionStore()
  |
  ├─ substrate === 'graphify' (explicit only)
  |    └─ Fresh graph.json exists? → populate from graphify → DONE
  |    └─ Stale or missing? → LOUD FAIL (skipped + GRAPHIFY_NOT_WARM)
  |
  └─ DEFAULT: corbell (primary)
       └─ Fresh checkout exists? → populate from corbell → DONE
       └─ No checkout or stale? → LOUD FAIL (skipped + GI_POPULATE_FAILED)

NO third branch. The regex indexer that used to sit below corbell was
removed per operator ruling F-48. A broken substrate is a named error,
never a degraded substitute.
```

---

## 3. THE TOMBSTONE STORE

### 3.1 The Schema

```sql
CREATE TABLE typed_nodes (
  id             INTEGER PRIMARY KEY,
  canonical_id   TEXT NOT NULL,        -- the REAL identity (see §4)
  kind           TEXT NOT NULL,        -- function | class | file | module | …
  label          TEXT NOT NULL,        -- display name (NEVER used as join key)
  file           TEXT,                 -- root-relative path (NULL legal for flow rows)
  line           INTEGER,              -- NULL legal (lineless rows are counted, never invented)
  created_run    TEXT NOT NULL,
  superseded_run TEXT                 -- NULL = live
);

CREATE TABLE typed_edges (
  id             INTEGER PRIMARY KEY,
  src_canonical  TEXT NOT NULL,        -- the FROM node (canonical_id)
  dst_canonical  TEXT NOT NULL,        -- the TO node (canonical_id)
  predicate      TEXT NOT NULL,        -- calls | imports | traces-to (closed set)
  evidence_quote TEXT NOT NULL DEFAULT '',
  confidence     REAL NOT NULL DEFAULT 1.0,
  created_run    TEXT NOT NULL,
  superseded_run TEXT
);

-- Partial UNIQUE indexes (only on live rows) — names match typed-write.ts:
CREATE UNIQUE INDEX IF NOT EXISTS uq_tn_live_canonical ON typed_nodes(canonical_id) WHERE superseded_run IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_te_live_triple ON typed_edges(src_canonical, dst_canonical, predicate) WHERE superseded_run IS NULL;

-- The substrate ledger (which engine populated this store):
CREATE TABLE gi_meta (key TEXT PRIMARY KEY, value TEXT);
-- key='substrate' ∈ {corbell, graphify, indexer-fallback} — the masquerade guard.
```

### 3.2 The Tombstone Discipline

**The law: every write preserves history.** When a node is re-populated, the prior live row gets `superseded_run = <new_run_tag>` (tombstoned) and a NEW row is inserted with the new data. The old row is never deleted.

```
BEFORE: node {canonical_id: "src:42:myFunc", created_run: "run-1", superseded_run: NULL}
REPOPULATE with run-2:
  UPDATE typed_nodes SET superseded_run = 'run-2' WHERE canonical_id = "src:42:myFunc" AND superseded_run IS NULL
  INSERT INTO typed_nodes VALUES (new_id, "src:42:myFunc", ..., 'run-2', NULL)

AFTER:  row 1: {canonical_id: "src:42:myFunc", created_run: "run-1", superseded_run: "run-2"}  ← tombstoned
        row 2: {canonical_id: "src:42:myFunc", created_run: "run-2", superseded_run: NULL}     ← live

**Why:** you can always answer "what did this node look like before the last change?" by querying tombstoned rows. History is never destroyed.

### 3.3 The supersedeThenInsert Helper

The session-store writer is `supersedeThenInsert()` in `populate-graphify.ts`. This function:
1. Refuses to run inside an existing transaction (fail-closed `GI_TXN_REQUIRED`)
2. Per-table tombstone guard (nodes-only batch doesn't wipe live edges)
3. Inserts new rows inside the same BEGIN IMMEDIATE/COMMIT transaction
4. Caller owns the connection close

**Every writer rides the same one-transaction discipline (blast-audit verified):**
- `supersedeThenInsert()` — populate-graphify.ts (session + checkout writes)
- `writeCorbellCheckout()` — store-map.ts (corbell leg; the BLAST-audit critical fixed its split supersede/insert)
- `applyTypedDdl()` deferral — typed-write.ts: on legacy duplicates it tombstones all but the oldest row per unique-key group and RETRIES the index (the store regains its invariant on first open)
- `writeGraphifyCheckout()` — populate-graphify.ts (the inspection-checkout writer)

---

## 4. THE IDENTITY MODEL

### 4.1 Canonical ID (the REAL identity)

Every node is identified by its `canonical_id` — a unique string derived from the node's location: `{relative_filepath}:{line_number}:{function_name}`.

```
Example: src/omp/typed-write.ts:287:resolveLiveIds
```

This is the ONLY identity used for:
- Edge connections (`src_canonical`, `dst_canonical`)
- Traversal (BFS, DFS, who-calls, impact, blast-radius)
- Store lookups

### 4.2 Label (the DISPLAY identity)

The `label` field is the human-readable name (`resolveLiveIds`). It is used ONLY for:
- Display in query results
- The initial `resolveIds(label)` lookup (converts label → canonical_ids)

**The law: label is NEVER a join key.** Two functions with the same label in different files are DIFFERENT nodes with different canonical_ids. The V21 rework eliminated all label-keyed traversal.

### 4.3 The resolveIds Function

```typescript
function resolveIds(db, label): string[] {
  return db.query(
    "SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL"
  ).all(label).map(r => r.canonical_id);
}
```

This is the ONLY place `label` is used as a query key. It returns ALL live nodes with that label (there may be multiple if two files have functions with the same name). All downstream traversal uses the returned canonical_ids.

---

## 5. THE FRESHNESS SYSTEM

### 5.1 The Three Temperature States

| State | Meaning | How to detect |
|---|---|---|
| **COLD** | No graph exists yet | Store file doesn't exist |
| **WARM** | Graph built, matches source | Content hash check passes |
| **STALE** | Graph built, source changed | Content hash mismatch → GRAPHIFY_NOT_WARM |

### 5.2 The Content-Hash Freshness Check (graphify leg)

At graph-build time (W8 spec — `hashSourceTree()` in `populate-graphify.ts`):
1. The SCOPE is part of the fingerprint (`scope=src\n` anchors the digest)
2. Files ≤64KB hash WHOLE (path + size + full content) — first-4KB-only missed tail edits
3. Files >64KB hash head 4KB + tail 4KB + size
4. Short reads hash what arrived + a `short-read` marker — a truncated read can never collide with the complete digest
5. Unreadable files fold a `skip:` mark into the digest (fail-open digest fixed)
6. Budget exhaustion (500 files) folds a `budget-exhausted` marker — a truncated walk can never equal a complete one
7. The hex digest is written to the `.graph_hash` sidecar (path derived by `graphHashSidecarPath()` — never aliasing the graph file itself)

At query time: recompute → compare with the sidecar → match = fresh, differ = STALE, sidecar absent = NOT fresh (fail-closed, never a silent pass).

**Source:** `src/omp/populate-graphify.ts` — `computeSourceHash()` / `isGraphifyCheckoutFreshFor()`; seams `computeSourceHashForTest` / `computeSourceHashWithBudget` (tests/st-gi-w3-validation.test.ts T5/T6)

### 5.3 mtime Freshness — the CORBELL leg only

The corbell checkout probe (`isCorbellCheckoutFreshFor`, populate-corbell.ts) is the mtime-based system:
- Any indexed-class source file newer than the warm store → stale
- Any unreadable directory → `stale-read-failed` (loud, since V21)
- Budget exhaustion (500 entries) → `stale-budget` (loud — H01)

The graphify leg does NOT fall back to mtime: no sidecar = not fresh, fail-closed.

**These are the systems the structural findings flag** — same-second granularity and TOCTOU windows (stat-then-read) are inherent to mtime probing; the content-hash system (§5.2) replaced it on the graphify leg.

---

## 6. THE QUERY ENGINE (13 verbs in depth)

### 6.1 who-calls

```sql
SELECT DISTINCT src.label, src.file, src.line, e.dst_canonical AS target_canonical
FROM typed_edges e
JOIN typed_nodes src ON e.src_canonical = src.canonical_id
WHERE e.dst_canonical IN (/* resolved ids */)
  AND e.predicate IN ('calls', 'traces-to', 'imports')
  AND e.superseded_run IS NULL AND src.superseded_run IS NULL
```

Returns: every live node that has an edge pointing TO the target. Depth 1 only.

### 6.2 impact (BFS blast radius)

Algorithm:
1. Resolve target label → canonical_ids
2. Seed: seen = {target_ids}, frontier = {target_ids}
3. For depth = 1 to max_depth (default 8):
   a. Query: find all callers of frontier nodes
   b. For each caller not in seen: add to ledger with current depth, add to next frontier
   c. frontier = next_frontier
4. Return ledger (every affected node with its distance)

Chunked IN-clauses (64 ids per batch) prevent SQLite variable limits.

### 6.3 blast-radius (file-level impact)

Same BFS as impact, but the result is grouped by FILE instead of by function. Returns `{file, depth}` pairs with MIN(depth) per file.

### 6.4 chain (A→B path finder)

BFS from A, looking for any node whose label matches the destination set. Returns the exact call chain (A → X → Y → B) as steps.

### 6.5 safe-delete (removal risk assessment)

Combines:
- who-calls (how many callers would break)
- impact (total blast radius)
- uses (what the target itself calls — outbound edges)
- testReach (which callers match test-file patterns)

Returns a go/no-go verdict based on caller count and test coverage.

### 6.6 unwired (dead code detection)

```sql
SELECT n.label, n.file, n.line, n.kind
FROM typed_nodes n
WHERE n.superseded_run IS NULL
  AND n.kind IN ('function', 'class', 'method')
  AND NOT EXISTS (
    SELECT 1 FROM typed_edges e
    WHERE e.dst_canonical = n.canonical_id AND e.superseded_run IS NULL
  )
```

Returns every function/class with ZERO inbound edges. These are candidates for removal.

---

## 7. THE AUDIT ENGINE (14 templates)

### 7.1 How Templates Work

Each template defines:
- `layerId`: unique identifier (e.g., "R28-sro-graph")
- `anchor`: what structural pattern to search for
- `graphQueries`: SQL queries against the node/edge store
- `filterTags`: additional grep-based filters
- `outputSchema`: the finding format

### 7.2 The SRO Templates (structural review)

| Template | What it finds | How |
|---|---|---|
| dead-code | Functions with zero callers | In/out-degree scan + grep verify (no false positives) |
| cycles | Circular dependencies | Tarjan SCC (complete detection, no approximation) |
| god-nodes | Functions with degree > threshold | Inbound degree count |
| isolates | Nodes with zero connections | In-degree AND out-degree both zero |

### 7.3 The Tarjan SCC Algorithm

The cycle detection uses Tarjan's Strongly Connected Components algorithm — the gold standard for finding ALL cycles in a directed graph. It is complete: if there is a cycle, Tarjan finds it.

The iterative implementation in `auditor.ts` uses:
- An explicit stack (not recursion)
- `index` and `low` maps for SCC identification
- An `onStack` set to track the current DFS path
- After all SCCs are found, each SCC with >1 node (or a self-loop) contains at least one cycle

---

## 8. THE PROVIDER POOL

### 8.1 The Architecture

```
6 API KEYS (~/.gi-keys.json)
     |
     v
+---------------------+
| KEY POOL (SQLite)   |  Each key has a deadUntil timestamp.
| keyid → deadUntil   |  When a key hits rate limit, markDead() sets
| sorted by priority  |  its deadUntil to the parsed window reset time.
+---------------------+  When the window passes, the key is alive again.
     |
     v
resolve(now) → try key[0], if dead try key[1], ... if all dead → OPENROUTER
```

### 8.2 The Classifier (ordered, load-bearing)

```
1. MissingSessionID → contract (never dead-mark)
2. 500-504 → server (advance to next key, NO dead-mark — transient)
3. 429/402/529 → quota (dead-mark with parsed window)
4. usage limit keywords → quota
5. overloaded (bare) → server (transient)
6. 401/403 → rejected (dead-mark, likely bad key)
7. anything else → other (log and advance)
```

**The ORDER matters.** Checking server (500-504) BEFORE quota prevents a 503 with "overloaded" in the body from being misclassified as a quota exile.

### 8.3 The Fallback Chain

When ALL 6 keys are dead: fall to OpenRouter (free tier). The fallback model is `poolside/laguna-s-2.1:free` → `poolside/laguna-xs-2.1:free` → `google/gemma-4-31b-it:free`.

---

## 9. THE GRAPHIFY SCOPING (FIXED in W4)

**The former bug:** `graphify extract` has no exclude mechanism and scans the ENTIRE target root — Checkpoints/, Ship_Packages/, reports/, tests/ rows used to flow into the typed store (duplicate-label pollution from checkpoint copies).

**The fix (W4):** `scopeBuildToProfile()` (`src/hunter/graph/graphify-adapter.ts`) filters at the store boundary — it is wired into `GraphifyAdapter.build()`, `buildSync()`, AND `scripts/graphify-build.ts`, so EVERY consumer inherits it:
- nodes whose file anchor is outside every profile scope dir are dropped (counted, WARN-logged)
- edges survive only when BOTH endpoints survive
- verification: `tests/st-gi-w4-scoping.test.ts` (test_w4_scoped_no_checkpoints_in_store, test_w4_edges_kept_only_when_both_endpoints_scoped)

Proof contract: `SELECT COUNT(*) FROM typed_nodes WHERE file LIKE '%Checkpoints%'` → 0.

Note: the raw `graphify extract` still scans the whole root (the external CLI has no exclude flag — operator-confirmed); the filter is the store-boundary fix, not an extract-time fix.

---

## 10. THE STRUCTURAL FINDINGS — FIX STATUS (W1–W8, 2026-09-18)

The original 21 highs (2 criticals later) were fixed across waves W1–W3 + the blast-audit loop. All 22 spec fixes LANDED with named red→green tests; the scan loop then converged the residual pile:

| Category | Original count | Fix status |
|---|---|---|
| RESOURCE LIFECYCLE | 6 | FIXED (W1): corbell db scope, safeDelete single-conn (whoCallsInDb/impactInDb), fd try/finally, pool 0600, ESM import, routeGoError empty-pool |
| PATH CONTAINMENT | 5 | FIXED (W2/W8): projection fail-closed + relative-posix anchors, nodeFile escape drop + normalize-first, extension roots canonicalized, chain containment backstop |
| VALIDATION GAPS | 4 | FIXED (W3): corbell edge validation, shape-gate element spot-checks (prod path), applyTypedDdl dedup+retry (invariant recovered), label/edge checks |
| FRESHNESS/HASH | 3 | FIXED (W3): whole-file/tail hash + budget marker + sidecar helper (2 scan CRITICALs killed) |
| POLICY INCONSISTENCY | 3 | FIXED (W3): lineless skip+count unified across chain/imports/awaits/unwired/whoCalls (null OR undefined) |
| SCOPING | 1 | FIXED (W4): scopeBuildToProfile at the store boundary, wired in script + adapter |

**The residual band (16–20 oscillating highs per scan)** is the ARCHITECTURAL remainder — TOCTOU classes, first-run mtime semantics, cycle-enumeration precision, default-allowlist breadth — each named with root cause in reports/WAVE_REPORT_W1-W7.md and BLAST_REPORT_2026-09-18.md. Per the convergence law these require the kernel rebuild (§12) or operator rulings; patch waves demonstrably cannot reach 0h (three passes of evidence).

**Full details:** `reports/V1.1_STRUCTURAL_FINDINGS.md` (163 lines, every finding with file:line and severity) + `reports/WAVE_REPORT_W1-W7.md` + `reports/BLAST_REPORT_2026-09-18.md`

---

## 11. OPERATIONAL PROCEDURES

### 11.1 Deploy

```bash
cd /home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence
bun build src/omp/extension.ts --outdir extensions/graph-intelligence --target bun --format esm --bundle
cp extensions/graph-intelligence/extension.js extensions/graph-intelligence/index.js
cp extensions/graph-intelligence/index.js ~/.omp/agent/extensions/graph-intelligence/index.js
# Both dists must be rebuilt and deployed together (the tool-name race)
```

### 11.2 Build a Graph

```bash
cd <target-project>
bun /path/to/Graph_Intelligence/scripts/graphify-build.ts --target . --extract
# This runs graphify extract and produces graphify-out/graph.json
```

### 11.3 Query the Graph

```bash
# Via CLI (scripts/gi-cli.ts):
bun scripts/gi-cli.ts who-calls <function-name> .
bun scripts/gi-cli.ts impact <function-name> .
bun scripts/gi-cli.ts unwired x .
bun scripts/gi-cli.ts safe-delete <function-name> .

# Via OMP agent (the tools are registered as first-class):
graph-query --verb who-calls --target <function> --target-path <dir>
```

### 11.4 Run an Audit

```bash
# Via OMP agent:
aether-code-audit --layerId R28-sro-graph --targetPath <dir>

# Templates: R18-R28 (SRO), R19-R22 (LASME), R24-R27 (MPSE)
```

### 11.5 Verify Freshness

```bash
# The system automatically checks freshness before every query
# If stale: GRAPHIFY_NOT_WARM:{reason} with the rebuild command
# Manual check:
ls graphify-out/graph.json graphify-out/.graph_hash
```

---

## 12. THE REBUILD SPEC (what changes and why)

The full rebuild spec is at `reports/GI_KERNEL_REBUILD_DPL1_SPEC.md` (611 lines). The summary:

- **7 design laws** that make each finding category structurally impossible
- **8 modules** (~1,700 designed lines replacing 4,200 accreted ones)
- **70 named tests** — every test mapped to a finding class or contract row
- **Module scan gates** — each module must scan clean before the next starts
- **Final gate** — one frozen scan → 0 critical / 0 high

The rebuild replaces the accreted kernel with designed code. The 21 structural highs are ARCHITECTURAL — they cannot be patched away. The rebuild eliminates the patterns that generate them.

---

## 13. THE SCAN-CHAIN (provider fallback architecture)

**Source:** `src/kernel/scan-chain.ts` (188 lines) — ported verbatim from `agent_plugin_boilerplates/free-key-pipeline-boilerplate/provider-chain.ts`

### 13.1 The STALL_MS Pattern

```
export const STALL_MS = 60_000;  // no event for 60s = the stream is DEAD, not thinking
```

The stall detector watches the LLM's output stream. Every token/chunk that arrives RESETS the timer. The timer fires ONLY when no output has arrived for 60 consecutive seconds. A model that's actively generating for 20 minutes stays alive.

**This replaces static wall-clock timeouts** (`--timeout N`) which kill active model runs at arbitrary deadlines.

### 13.2 The 6-Rung Chain

| Rung | Provider | Model | Notes |
|---|---|---|---|
| 0 | GO gateway | union-alpha | 262k context, the pinned primary |
| 1 | GO gateway | muse-spark-1.3 | Previous primary, independent backend |
| 2 | OpenRouter | laguna-s-2.1:free | Rate-limited at 1000 req/day (free tier) |
| 3 | OpenRouter | laguna-xs-2.1:free | Same rate limit pool |
| 4 | OpenRouter | gemma-4-31b-it:free | 262k context |
| 5 | NVIDIA | kimi-k3 | Separate provider, independent rate limits |

Each rung gets 5 retries with backoff (5s OpenRouter, 10s NVIDIA).

### 13.3 The CLI Entry Point

**Source:** `scripts/gi-cli.ts` (105 lines)

```bash
# Direct kernel access without going through the OMP agent:
bun scripts/gi-cli.ts who-calls <function-name> <root-dir>
bun scripts/gi-cli.ts impact <function-name> <root-dir>
bun scripts/gi-cli.ts unwired x <root-dir>
bun scripts/gi-cli.ts safe-delete <function-name> <root-dir>
```

The CLI uses the same `openTypedStore` + SQL as the OMP tools — identical results, direct access.

### 13.4 The Zen-Model-Chain Skill

**Location:** `~/.omp/agent/managed-skills/zen-model-chain/SKILL.md` (254 lines)

Documents the two-provider-route architecture (GO gateway vs OpenRouter), the model chain, STALL_MS, the ocr wiring, the health probe, and the 8 traps (including the static-timeout anti-pattern and the relative-path requirement).

---

## 14. THE 12-SCAN CONVERGENCE DATA

The audit trail across 12 qwen-code-audit sessions on this kernel:

| # | Session | Criticals | Highs | Trigger |
|---|---|---|---|---|
| 1 | 1aca90d4 | 2 | 21 | First gate run |
| 2 | 8a24ae08 | 0 | 16 | Post V16/17 fixes |
| 3 | 33d64eca | 0 | 23 | First 7-file scan |
| 4 | 6768692f | 1 | 22 | Post V20 fixes |
| 5 | 108fd2de | 0 | 20 | Post fix-now |
| 6 | 4cc25858 | 1 | 25 | Post fix-now-2 |
| 7 | 6a860fa5 | 0 | 22 | Post cleanup wave |
| 8 | 56d6ab5f | 1 | 26 | Ship-gate on HEAD |
| 9 | 820f8f98 | 0 | 24 | Post ScanAndFix C1-C7 |
| 10 | b9e653a3 | 0 | 21 | Post label validation |

**Criticals: 2 → 0 (stable). Highs: 21 → 21 (convergence law).**

The convergence law (EN-023): findings don't monotonically decrease because each fix wave is new code that the engine reads deeper. The count stabilizes because the ARCHITECTURAL patterns (the 5 categories in §10) regenerate findings regardless of individual patches. The only path to 0/0 is the kernel rebuild.

---

## 15. THE SLOP ANTI-PATTERN LEDGER

From `reports/SLOP-CODING-METHOD.md` (989 lines) — the 15 patterns that produced defective code across 8 waves:

| # | Pattern | Counter |
|---|---|---|
| P1 | Finding-driven development | Spec-driven: the build package defines done |
| P2 | Bulk scripted editing | One edit → one re-read of the full closure |
| P3 | Test-after theater | TDD: failing test FIRST, watch red, then green |
| P4 | Metric inversion | Gate = product working, not audit score |
| P5 | Monkey-patch layering | 3+ conditionals = redesign, not another patch |
| P6 | Symptom patching | Fix the class, not the line |
| P7 | Selective verification | Adversarial fixtures (3-dup, edges-only, cross-SCC) |
| P8 | Refute-the-report | 2nd occurrence = design order, not a triage row |
| P9 | Deploy-one-side | Both dists rebuilt + deployed + verified |
| P10 | Rush-the-env | Environment issues are blockers, not detours |
| P11 | Landing-zone blindness | Post-edit re-read mandatory |
| P12 | Coverage-as-correctness | Tool-surface tests in the battery |
| P13 | Instrument blame | The audit tool is never the root cause |
| P14 | Checkpoint theater | Checkpoints verify BEHAVIOR, not just SHA |
| P15 | Docs-as-current | Docs trail fixes, never precede them |
