# GI KERNEL CLEANUP + INFRASTRUCTURE OVERHAUL SPEC
## Phase 1 (21 Structural Fixes) + Phase 2 (Graph Infrastructure Build)

**Version:** 1.0
**Date:** 2026-09-17
**Authority:** Qwen code-audit sessions 820f8f98 + b9e653a3 (0c/21h) + graphify scoping defect + GRAPH_BASED_STAIRSTEPPING_BIBLE infrastructure requirements
**Scope:** The complete plan to eliminate the 21 structural findings, fix the graphify scoping defect, and build the graph-diff/gate/pre-flight/test-target infrastructure that makes graph tools first-class coding infrastructure.

---

## PHASE 1 — STRUCTURAL CLEANUP (fix all 21 findings + scoping)

### P1.1 RESOURCE LIFECYCLE (6 findings)

**The pattern:** connections/fds opened without consistent ownership. Some closed, some leaked, some double-closed.

**P1.1.1** `populate-corbell.ts:174` — `db` dereferenced in `finally` but declared inside `try`
- ROOT CAUSE: `const db = openTypedStore()` inside try block, `db.close()` in finally — if open throws, `db` is undefined
- FIX: Declare `let db` BEFORE try, assign inside try, close in finally with null check
- TEST: `test_db_scope_corbell_open_failure_does_not_crash`
- TARGET FILE: `src/omp/populate-corbell.ts`
- ESTIMATED LINES: 5

**P1.1.2** `typed-write.ts:603` — safeDelete opens 3 connections to same SQLite file
- ROOT CAUSE: safeDelete calls whoCalls(storePath) and impact(storePath), each of which calls openTypedStore(storePath) internally, while safeDelete itself holds an outer connection
- FIX: Add optional `db` parameter to whoCalls/impact. When provided, use it instead of opening. safeDelete passes its connection.
- TEST: `test_safe_delete_single_connection`
- TARGET FILE: `src/omp/typed-write.ts`
- ESTIMATED LINES: 20

**P1.1.3** `populate-graphify.ts:164` — FD leak: openSync without try/finally
- ROOT CAUSE: `computeSourceHash()` opens a file descriptor with `fs.openSync()` but if `readSync` throws, the descriptor leaks
- FIX: Wrap in try/finally, close in finally
- TEST: `test_hash_no_fd_leak_on_read_error`
- TARGET FILE: `src/omp/populate-graphify.ts`
- ESTIMATED LINES: 5

**P1.1.4** `go-key-pool.ts:131` — world-readable tmp pool + WAL/SHM chmod incomplete
- ROOT CAUSE: `new Database(want, {create:true})` creates with default umask (0644), chmod only runs on the main file, not -wal/-shm sidecars
- FIX: Create with mode 0600 via umask trick, chmod all three files after every open
- TEST: `test_pool_files_0600_all_three`
- TARGET FILE: `src/hunter/keys/go-key-pool.ts`
- ESTIMATED LINES: 10

**P1.1.5** `populate-graphify.ts:165` — ESM-unsafe `require("crypto")`
- ROOT CAUSE: The kernel is ESM but uses CommonJS `require()` for crypto
- FIX: `import { createHash } from "node:crypto"` at module top
- TEST: No test needed (compile-time fix)
- TARGET FILE: `src/omp/populate-graphify.ts`
- ESTIMATED LINES: 3

**P1.1.6** `go-key-pool.ts:438` — `routeGoError` can throw via `decideGoFallback` on empty pool
- ROOT CAUSE: `decideGoFallback` throws GO_POOL_EMPTY when no keys, but `routeGoError` calls it without catching
- FIX: Catch GO_POOL_EMPTY in routeGoError, return named error instead of throw
- TEST: `test_route_go_error_empty_pool_no_throw`
- TARGET FILE: `src/hunter/keys/go-key-pool.ts`
- ESTIMATED LINES: 8

### P1.2 PATH CONTAINMENT (5 findings)

**The pattern:** three different path resolution strategies across three files.

**P1.2.1** `graphify-adapter.ts:273` — normalize fail-open vs projection fail-closed on realpath failure
- ROOT CAUSE: `normalizeGraphifyGraph()` returns the original root when `realpathSync` fails, while `projectGraphifyGraph()` returns `undefined`. Inconsistent behavior.
- FIX: Both fail-closed. If realpath fails, skip the file (set to empty string).
- TEST: `test_containment_fail_closed_both_paths`
- TARGET FILE: `src/hunter/graph/graphify-adapter.ts`
- ESTIMATED LINES: 10

**P1.2.2** `auditor.ts:397` — relative `../` paths returned verbatim into findings
- ROOT CAUSE: `nodeFile()` returns `path.relative(targetRoot, file)` but doesn't check if the result starts with `..`
- FIX: After computing relative path, check for `..` prefix. If escape, return empty string (node gets no file anchor)
- TEST: `test_node_file_no_escape`
- TARGET FILE: `src/hydra/auditor.ts`
- ESTIMATED LINES: 5

**P1.2.3** `extension.ts:43` — H12 confinement: realpathSync for targets but resolve-only for allowlist roots
- ROOT CAUSE: Target paths are canonicalized with `realpathSync` but allowlist roots use `path.resolve` only. A symlinked root fails containment.
- FIX: Canonicalize BOTH target and roots with `realpathSync`. If a root can't be resolved, skip it (log).
- TEST: `test_confinement_symlinked_root`
- TARGET FILE: `src/omp/extension.ts`
- ESTIMATED LINES: 10

**P1.2.4** `graphify-adapter.ts:286` — normalize stores relative posix path, projection stores absolute
- ROOT CAUSE: `normalize()` converts to relative posix paths but `projectGraphifyGraph()` converts to a different format
- FIX: Unified — both use the same relative posix path format
- TEST: `test_normalize_projection_same_path_format`
- TARGET FILE: `src/hunter/graph/graphify-adapter.ts`
- ESTIMATED LINES: 15

**P1.2.5** `graphify-adapter.ts:524` — projection re-resolves against root but normalize doesn't
- ROOT CAUSE: The projection step re-enforces containment but the normalize step doesn't, creating a gap
- FIX: Containment enforced once, in normalize, before any data reaches the store
- TEST: `test_containment_enforced_at_normalize`
- TARGET FILE: `src/hunter/graph/graphify-adapter.ts`
- ESTIMATED LINES: 10

### P1.3 VALIDATION GAPS (4 findings)

**P1.3.1** `populate-corbell.ts:125` — nodes validate id/kind/line but not label
- FIX: Add `typeof r.label === "string" && r.label.length > 0` to the filter
- TEST: `test_corbell_label_validation`
- TARGET FILE: `src/omp/populate-corbell.ts`
- ESTIMATED LINES: 3

**P1.3.2** `populate-corbell.ts:166` — edges capped but never validated
- FIX: Filter edges for non-empty src/dst + valid predicate (calls/imports/traces-to)
- TEST: `test_corbell_edge_validation`
- TARGET FILE: `src/omp/populate-corbell.ts`
- ESTIMATED LINES: 8

**P1.3.3** `auditor.ts:742` — graph shape check only verifies arrays exist, not element shapes
- FIX: After verifying nodes/edges are arrays, spot-check first N elements for required fields (id, label for nodes; src, dst for edges)
- TEST: `test_graph_shape_element_check`
- TARGET FILE: `src/hydra/auditor.ts`
- ESTIMATED LINES: 10

**P1.3.4** `typed-write.ts:141` — DDL UNIQUE failure swallowed by substring match
- ROOT CAUSE: `catch` block checks `msg.includes("UNIQUE")` which matches ANY error containing "UNIQUE", not just index-creation failures
- FIX: Check the error code is SQLITE_CONSTRAINT_UNIQUE specifically
- TEST: `test_ddl_unique_defer_specific`
- TARGET FILE: `src/omp/typed-write.ts`
- ESTIMATED LINES: 5

### P1.4 FRESHNESS/HASH (3 findings)

**P1.4.1** `populate-graphify.ts:164` — hash only first 4KB per file, misses tail edits
- FIX: For files < 64KB, hash the ENTIRE file. For files ≥ 64KB, hash first 4KB + last 4KB + size.
- TEST: `test_hash_detects_tail_edit`
- TARGET FILE: `src/omp/populate-graphify.ts`
- ESTIMATED LINES: 10

**P1.4.2** `populate-graphify.ts:149` — truncated hash on budget exhaustion returns partial digest
- FIX: When budget exhausts, add a marker byte to the hash input so the digest differs from a complete walk
- TEST: `test_hash_budget_exhaustion_changes_digest`
- TARGET FILE: `src/omp/populate-graphify.ts`
- ESTIMATED LINES: 5

**P1.4.3** `populate-graphify.ts:127` — sidecar path aliases graph file when out path lacks .json suffix
- FIX: Always append `.graph_hash` to the full path, not `.replace(".json", ".graph_hash")`
- TEST: `test_hash_sidecar_no_alias`
- TARGET FILE: `src/omp/populate-graphify.ts`
- ESTIMATED LINES: 3

### P1.5 POLICY INCONSISTENCY (3 findings)

**P1.5.1** `graphify-adapter.ts:756` — whoCalls skips lineless rows, chain throws
- FIX: ALL verbs use skip+count. No verb throws on lineless rows. `linelessSkipped` field in every result.
- TEST: `test_lineless_policy_unified`
- TARGET FILE: `src/hunter/graph/graphify-adapter.ts`
- ESTIMATED LINES: 15

**P1.5.2** `typed-write.ts:520` — unwiredNodes throws on first lineless row, returns zero rows
- FIX: Skip lineless rows, count them, include in result
- TEST: `test_unwired_lineless_skip`
- TARGET FILE: `src/omp/typed-write.ts`
- ESTIMATED LINES: 5

**P1.5.3** `typed-write.ts:621` — safe-delete silently drops lineless uses
- FIX: Count skipped lineless uses, surface in result
- TEST: `test_safe_delete_lineless_counted`
- TARGET FILE: `src/omp/typed-write.ts`
- ESTIMATED LINES: 5

### P1.6 GRAPHIFY SCOPING DEFECT (the checkpoint pollution bug)

**THE BUG:** `scripts/graphify-build.ts` passes the ENTIRE project root to `graphify extract`, which scans EVERYTHING including `Checkpoints/`, `Ship_Packages/`, `reports/`, `tests/`, and even `graphify-out/` itself.

**THE FIX:** Two changes:
1. **Exclude non-source directories** in the extraction command by creating a scoped temp directory with symlinks
2. **Add `excludes` to the profile** and thread them through the extraction

```typescript
// graphify-build.ts fix:
const EXCLUDE_DIRS = ["Checkpoints", "Ship_Packages", "reports", "extensions",
                      "graphify-out", "node_modules", "tests", "scripts"];
const scopedDir = createScopedSymlinks(root, scope, EXCLUDE_DIRS);
execSync(`graphify extract ${scopedDir} --code-only --no-cluster`);
// Then clean up scopedDir
```

- TEST: `test_graphify_scoped_no_checkpoints` (verify no nodes from Checkpoints/)
- TARGET FILE: `scripts/graphify-build.ts`
- ESTIMATED LINES: 30

### P1.7 Phase 1 Summary

| Category | Findings | Total estimated lines | New tests |
|---|---|---|---|
| Resource lifecycle | 6 | 51 | 6 |
| Path containment | 5 | 50 | 5 |
| Validation gaps | 4 | 26 | 4 |
| Freshness/hash | 3 | 18 | 3 |
| Policy inconsistency | 3 | 25 | 3 |
| Graphify scoping | 1 | 30 | 1 |
| **TOTAL** | **22** | **200** | **22** |

**Phase 1 done-when:** all 22 fixes landed, battery 156+/0 (134 + 22 new tests), graphify scoped scan produces only src/ nodes, full qwen scan returns 0 critical / 0 high.

---

## PHASE 2 — GRAPH INFRASTRUCTURE BUILD

The 4 new tools that make graph intelligence first-class coding infrastructure.

### P2.1 graph-diff.ts — structural change verification

**Purpose:** Compare two graph states (before/after a code change) and report what changed structurally.

**Interface:**
```typescript
interface GraphSnapshot {
  nodes: number;
  edges: number;
  nodeKinds: Record<string, number>;
  edgePredicates: Record<string, number>;
  unwiredCount: number;
  topDegree: Array<{ label: string; inbound: number }>;
  cycleCount: number; // from Tarjan SCC
}

interface GraphDiffResult {
  nodesDelta: number;
  edgesDelta: number;
  unwiredDelta: number;
  newCycles: number;
  blastRadiusChanges: Array<{ fn: string; before: number; after: number }>;
  verdict: "PASS" | "WARN" | "FAIL";
  details: string[];
}

function captureSnapshot(storePath: string): GraphSnapshot;
function diffGraphs(before: GraphSnapshot, after: GraphSnapshot): GraphDiffResult;
```

**How it works:**
1. Before coding: `captureSnapshot()` runs a set of aggregate queries on the store
2. After coding: `captureSnapshot()` again
3. `diffGraphs()` compares and flags:
   - nodesDelta > expected → new functions added (verify intentional)
   - edgesDelta < 0 → dependencies broken (FAIL)
   - unwiredDelta > 0 → dead code created (WARN)
   - newCycles > 0 → circular dependency introduced (FAIL)
   - blastRadius increase > threshold → maintenance bomb (WARN)

**File:** `src/kernel/graph-diff.ts` (~120 lines)
**Tests:** 5 (snapshot capture, diff pass, diff fail on edge loss, diff warn on unwired, cycle detection)

### P2.2 graph-gate.ts — stairstepper gate criteria

**Purpose:** Wire graph metrics into the stairstepper's 3-gate review system.

**Interface:**
```typescript
interface GateCriteria {
  maxBlastRadius: number;      // per-commit budget
  maxNewUnwired: number;       // 0 = no dead code introduced
  maxNewCycles: number;        // 0 = no circular deps
  maxEdgesLost: number;        // 0 = no broken dependencies
}

type GateVerdict = "PASS" | "FAIL" | "WARN";

function gateCheck(diff: GraphDiffResult, criteria: GateCriteria): {
  verdict: GateVerdict;
  failures: string[];
  warnings: string[];
};
```

**Gate integration:**
- Gate 1 (micro→category): `maxBlastRadius=10, maxNewUnwired=0, maxNewCycles=0`
- Gate 2 (category→domain): `maxBlastRadius=50, maxNewUnwired=0, maxNewCycles=0`
- Gate 3 (domain→main): `maxBlastRadius=200, maxNewUnwired=0, maxNewCycles=0`

**File:** `src/kernel/graph-gate.ts` (~80 lines)
**Tests:** 4 (pass, fail on each criterion, gate level thresholds)

### P2.3 graph-pre-flight.ts — automated pre-coding sequence

**Purpose:** Automatically run the mandatory pre-flight queries and return a scoped plan.

**Interface:**
```typescript
interface PreFlightResult {
  target: string;
  directCallers: Array<{ label: string; file: string; line: number }>;
  blastRadius: {
    reaches: number;
    byDepth: Record<number, number>;
    affectedFiles: string[];
  };
  riskProfile: {
    callers: number;
    uses: number;
    testCoverage: number;
  };
  commitStrategy: "single" | "split" | "domain-level";
  testTargets: Array<{ label: string; priority: number; reason: string }>;
  warnings: string[];
}

async function preFlight(storePath: string, targetLabel: string): Promise<PreFlightResult>;
```

**How it works:**
1. Runs who-calls (depth 1)
2. Runs impact (depth 8)
3. Runs blast-radius (file level)
4. Runs safe-delete (risk profile)
5. Computes commitStrategy based on blast radius
6. Identifies top test targets (depth-1 callers sorted by inbound degree)
7. Returns everything in one call

**File:** `src/kernel/graph-pre-flight.ts` (~100 lines)
**Tests:** 4 (low-risk target, high-risk target, dead code target, unknown target)

### P2.4 graph-test-target.ts — TDD test targeting from graph

**Purpose:** Given a modified function, return the prioritized test targets.

**Interface:**
```typescript
interface TestTarget {
  label: string;           // function to test
  file: string;
  line: number;
  inboundDegree: number;    // how many things call THIS function
  depth: number;            // distance from modified function
  priority: number;         // 1 = highest
  reason: string;           // why this is a test target
}

function getTestTargets(
  storePath: string,
  modifiedFunction: string,
  maxTargets: number = 5
): TestTarget[];
```

**How it works:**
1. Get depth-1 callers of the modified function
2. For each caller, compute inbound degree (how many things call THEM)
3. Sort by inbound degree descending (highest connected = highest risk)
4. Return top N with priority ranking and reasoning

**File:** `src/kernel/graph-test-target.ts` (~60 lines)
**Tests:** 3 (target selection, priority ordering, max targets)

### P2.5 CLI Integration

All 4 new tools get CLI entry points in `scripts/gi-cli.ts`:

```bash
bun scripts/gi-cli.ts diff <before-json> <after-json>     # compare graph states
bun scripts/gi-cli.ts gate <diff-json> <level>            # check gate criteria
bun scripts/gi-cli.ts preflight <function> [root]         # full pre-flight analysis
bun scripts/gi-cli.ts test-targets <function> [root]      # prioritized test targets
```

### P2.6 AGENTS.MD Integration

The GRAPH_BASED_STAIRSTEPPING_BIBLE §11 defines what goes into every coding agent's AGENTS.MD. The new tools are integrated as:

```markdown
### MANDATORY PRE-FLIGHT (run BEFORE coding):
`graph-query preflight <target-function>` → full risk analysis + commit strategy

### MANDATORY POST-FLIGHT (run BEFORE commit):
`graph-query diff <before> <after>` → structural change verification

### MANDATORY GATE CHECK (at each stairstepper level):
`graph-query gate <diff> <level>` → pass/fail with named criteria
```

### P2.7 Phase 2 Summary

| Component | Lines | Tests | Purpose |
|---|---|---|---|
| graph-diff.ts | 120 | 5 | Compare before/after graph states |
| graph-gate.ts | 80 | 4 | Stairstepper gate criteria |
| graph-pre-flight.ts | 100 | 4 | Automated pre-coding analysis |
| graph-test-target.ts | 60 | 3 | TDD test targeting from graph |
| CLI integration | 40 | — | CLI entry points |
| AGENTS.MD template | 30 | — | Mental architecture for agents |
| **TOTAL** | **430** | **16** | |

**Phase 2 done-when:** all 4 tools built and tested, CLI integration working, AGENTS.MD template ready, preflight on resolveLiveIds returns the 153-node blast radius in under 1 second.

---

## EXECUTION ORDER

```
PHASE 1 (cleanup):
  P1.1 Resource lifecycle (6 fixes) ──────────┐
  P1.2 Path containment (5 fixes) ────────────┤
  P1.3 Validation gaps (4 fixes) ─────────────┼── ALL PARALLEL (disjoint files)
  P1.4 Freshness/hash (3 fixes) ──────────────┤
  P1.5 Policy inconsistency (3 fixes) ────────┘
  P1.6 Graphify scoping (1 fix) ── AFTER P1.1-P1.5 (touches graphify-build.ts)
  
  BATTERY: 156+/0 (134 existing + 22 new tests)
  SCAN: 0c/0h (the target)

PHASE 2 (infrastructure):
  P2.1 graph-diff.ts ────────┐
  P2.2 graph-gate.ts ────────┼── SEQUENTIAL (gate depends on diff, preflight uses both)
  P2.3 graph-pre-flight.ts ──┤
  P2.4 graph-test-target.ts ─┘
  P2.5 CLI integration ── LAST
  P2.6 AGENTS.MD template ── LAST

TOTAL ESTIMATE: 630 lines of new code, 38 new tests, 2 phases
```

---

## SUCCESS CRITERIA

| Metric | Phase 1 target | Phase 2 target |
|---|---|---|
| Battery | 156+ pass / 0 fail | 172+ pass / 0 fail |
| Qwen scan | **0 critical / 0 high** | 0 critical / 0 high |
| Graphify scoping | Only src/ nodes in graph | Only src/ nodes in graph |
| graph-diff | — | Working, 5 tests green |
| graph-gate | — | Working, 4 tests green |
| graph-pre-flight | — | resolveLiveIds → 153 nodes in <1s |
| graph-test-target | — | Top-5 callers by degree in <1s |
| AGENTS.MD | — | Template ready for deployment |
