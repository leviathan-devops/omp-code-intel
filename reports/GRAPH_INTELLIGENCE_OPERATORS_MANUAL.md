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
|     |  EXTRACT (AST parse or regex scan)                          |
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

**What it is:** the parse-grade indexer. It reads a pre-built SQLite checkout that was created by `scripts/corbell-build.ts`.

**How it works:**
1. `scripts/corbell-build.ts` runs the corbell indexer (regex-based export/import scanner)
2. The indexer writes a warm checkout to `<root>/.omp/graph-intelligence/corbell-checkout/store.sqlite`
3. At query time, `populateFromCorbellCheckout()` reads the warm checkout and populates the session store

**Source:** `src/omp/populate-corbell.ts:1-8` — "The parse-grade corbell checkout is the PRIMARY populate"

**Characteristics:**
- Speed: FAST (reads a pre-built SQLite file)
- Quality: MEDIUM (regex-based, catches exports and imports but not full call graphs)
- Dependencies: NONE (pure TypeScript, no external binary)
- When it fires: ALWAYS (it is the DEFAULT substrate)

### 2.2 GRAPHIFY — the explicit substrate

**What it is:** the AST-based graph extractor. It reads a `graph.json` produced by the external `graphify` CLI tool (a third-party Python package, `graphifyy v0.9.51`).

**How it works:**
1. `scripts/graphify-build.ts` runs `graphify extract <root> --code-only --no-cluster`
2. The graphify tool parses the TypeScript AST and produces `graphify-out/graph.json`
3. At query time, `populateFromGraphifyCheckout()` reads graph.json through the GraphifyAdapter and populates the session store

**Source:** `src/omp/populate-graphify.ts:1-10` — "Reads the warm graph.json through GraphifyAdapter"

**Characteristics:**
- Speed: MEDIUM (the extract takes seconds to minutes on large projects)
- Quality: HIGH (AST-based, catches every function, class, import, and call edge)
- Dependencies: graphify binary (external, uv tool)
- When it fires: ONLY when `profile.graph.substrate === 'graphify'` (explicit opt-in)

**THIS IS THE SUBSTRATE THAT BUILT THE 8310-NODE GRAPH ON THIS PROJECT.**

### 2.3 INDEXER-FALLBACK — the named fallback

**What it is:** the mechanical regex indexer. It scans source files for export/import patterns using basic string matching.

**How it works:**
1. `populate.ts` scans source files with `parseExports()` and `parseImportStatements()`
2. Results go directly into the session store (no intermediate warm checkout)

**Source:** `src/omp/populate.ts:1-4` — "Mechanical indexer (parseExports + relative import scan)"

**Characteristics:**
- Speed: FAST (simple regex)
- Quality: LOW (catches only explicit exports and imports, not call graphs)
- Dependencies: NONE
- When it fires: ONLY when both corbell and graphify are unavailable. ALWAYS fires with a named token + reason — NEVER silently.

### 2.4 The Substrate Selection Logic

```
populate.ts: ensureGraphPopulated()
  |
  ├─ Try CORBELL (default, primary)
  |    └─ Fresh checkout exists? → populate from corbell → DONE
  |    └─ No checkout or stale? → fall through
  |
  ├─ Try GRAPHIFY (if profile.graph.substrate === 'graphify')
  |    └─ Fresh graph.json exists? → populate from graphify → DONE
  |    └─ No graph or stale? → fall through
  |
  └─ INDEXER-FALLBACK (named, loud)
       └─ Populate from regex scan
       └─ Return with substrate: "indexer-fallback" + fallbackReason
```

---

## 3. THE TOMBSTONE STORE

### 3.1 The Schema

```sql
CREATE TABLE nodes (
  id            INTEGER PRIMARY KEY,
  canonical_id  TEXT NOT NULL,        -- {filepath}:{line}:{name}
  kind          TEXT NOT NULL,        -- Function | Class | File | Module
  label         TEXT NOT NULL,        -- display name (NEVER used as join key)
  file          TEXT,                 -- root-relative path
  line          INTEGER,              -- NULL is legal (lineless nodes counted)
  created_run   TEXT NOT NULL,
  superseded_run TEXT                 -- NULL = live
);

CREATE TABLE edges (
  id            INTEGER PRIMARY KEY,
  src_canonical TEXT NOT NULL,        -- the FROM node
  dst_canonical TEXT NOT NULL,        -- the TO node
  predicate     TEXT NOT NULL,        -- calls | imports | traces-to (closed set)
  evidence      TEXT NOT NULL DEFAULT '',
  confidence    REAL NOT NULL DEFAULT 1.0,
  created_run   TEXT NOT NULL,
  superseded_run TEXT
);

-- Partial UNIQUE indexes (only on live rows):
CREATE UNIQUE INDEX uq_nodes_live ON nodes(canonical_id) WHERE superseded_run IS NULL;
CREATE UNIQUE INDEX uq_edges_live ON edges(src_canonical, dst_canonical, predicate) WHERE superseded_run IS NULL;
```

### 3.2 The Tombstone Discipline

**The law: every write preserves history.** When a node is re-populated, the prior live row gets `superseded_run = <new_run_tag>` (tombstoned) and a NEW row is inserted with the new data. The old row is never deleted.

```
BEFORE: node {canonical_id: "src:42:myFunc", created_run: "run-1", superseded_run: NULL}
REPOPULATE with run-2:
  UPDATE nodes SET superseded_run = 'run-2' WHERE canonical_id = "src:42:myFunc" AND superseded_run IS NULL
  INSERT INTO nodes VALUES (new_id, "src:42:myFunc", ..., 'run-2', NULL)

AFTER:  row 1: {canonical_id: "src:42:myFunc", created_run: "run-1", superseded_run: "run-2"}  ← tombstoned
        row 2: {canonical_id: "src:42:myFunc", created_run: "run-2", superseded_run: NULL}     ← live
```

**Why:** you can always answer "what did this node look like before the last change?" by querying tombstoned rows. History is never destroyed.

### 3.3 The supersedeThenInsert Helper

All writes go through `supersedeThenInsert()` in `populate-graphify.ts`. This function:
1. Refuses to run outside a transaction (fail-closed `GI_TXN_REQUIRED`)
2. Per-table tombstone guard (nodes-only batch doesn't wipe live edges)
3. Inserts new rows inside the same transaction
4. Caller owns the connection close

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

### 5.2 The Content-Hash Freshness Check

At graph-build time:
1. Walk all source files in the scope
2. For each file: hash the path + size + first 4KB of content
3. Combine all hashes into a single SHA-256
4. Write to a `.graph_hash` sidecar file next to graph.json

At query time:
1. Recompute the hash by walking the same files
2. Compare with the stored hash
3. Match → WARM (serve queries)
4. Mismatch → STALE (refuse with named error + rebuild command)

**Source:** `src/omp/populate-graphify.ts` — `computeSourceHash()` and `isGraphifyCheckoutFreshFor()`

### 5.3 The mtime Fallback

When no `.graph_hash` sidecar exists (legacy stores), the system falls back to comparing file modification times:
- Newest source file mtime ≤ graph mtime → fresh
- Any source file newer than graph → stale

**This is the system the 21 structural findings flag** — it has granularity issues (same-second edits) and TOCTOU windows (stat-then-read races). The rebuild replaces it with pure content-hash.

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

## 9. THE GRAPHIFY SCOPING ISSUE (known defect)

**The bug:** `scripts/graphify-build.ts` passes the ENTIRE project root to `graphify extract`, which scans EVERYTHING — including `Checkpoints/`, `Ship_Packages/`, `reports/`, `tests/`, and even `graphify-out/` itself. This pollutes the graph with duplicate nodes from checkpoint copies.

**Why it happens:** The external graphify tool (v0.9.51) has no directory exclude mechanism. It scans whatever path you give it.

**The fix:** Scope the extraction to only the source directories (src/, or whatever the profile specifies). This requires either:
- Extracting each scoped directory separately, or
- Creating a temp directory with symlinks to only the scoped dirs

**Status:** NOT FIXED. This is a Phase 1 cleanup item.

---

## 10. THE 21 STRUCTURAL FINDINGS (what the audit keeps flagging)

These are architectural design patterns in the 4,911-line kernel that generate audit findings every time the code is read. They are not individual bugs — they are CATEGORIES.

### Category 1: RESOURCE LIFECYCLE (6 findings)
The kernel opens SQLite connections, file handles, and subprocesses without a single ownership model.

### Category 2: PATH CONTAINMENT (5 findings)
Three different path resolution strategies across three files. Symlinks, `../`, and absolute paths handled inconsistently.

### Category 3: VALIDATION GAPS (4 findings)
Nodes validated but edges not. Some fields checked, others not. DDL UNIQUE deferral too broad.

### Category 4: FRESHNESS/HASH (3 findings)
The content-hash system has its own edge cases (4KB truncation, 500-file budget, sidecar aliasing).

### Category 5: POLICY INCONSISTENCY (3 findings)
LINELESS rows handled differently across verbs: skip in whoCalls, throw in unwired, silently drop in safeDelete.

**Full details:** `reports/V1.1_STRUCTURAL_FINDINGS.md` (163 lines, every finding with file:line and severity)

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
