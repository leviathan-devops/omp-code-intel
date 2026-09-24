// PORTED FROM src/omp/populate-corbell.ts:1-121 (checkout-path + freshness probe + supersede-then-insert + named NOT_WARM discipline) + fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/graph/corbell-adapter.ts:340-353 (warm-index skip: the index is built EXPLICITLY, hunts/queries READ).
// src/omp/populate-graphify.ts
// THE GRAPHIFY POPULATE LEG (W1) — the third substrate leg beside corbell and
// the mechanical regex fallback. Reads the warm graph.json (written
// EXPLICITLY by scripts/graphify-build.ts — D3 explicit-CLI decision, the
// corbell warm-index law) through GraphifyAdapter + writes the typed rows
// into the session store with the SAME supersede discipline as corbell.
//
// DEFAULT substrate stays corbell — this leg fires ONLY when explicitly
// invoked (the script path) or when profile.graph.substrate === 'graphify'.
// Zero behavior change for existing sessions.

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import {
  GraphifyAdapter,
  mapGraphifyToTyped,
  resolveGraphifyOut,
} from "../hunter/graph/graphify-adapter.ts";
import {
  migrateLayerColumns,
  type ForkEdge,
  type ForkNode,
  insertForkEdgesBatch,
  insertForkNodesBatch,
  openTypedStore,
  TYPED_STORE_DDL,
} from "./typed-write.ts";
import type { BuildResult } from "../hunter/graph/interface.ts";
import type { ProjectProfile } from "../hunter/profile/schema.ts";

export const GRAPHIFY_CHECKOUT_REL = ".omp/graph-intelligence/graphify-checkout/store.sqlite";
export const GRAPHIFY_FRESHNESS_BUDGET = 500;

export interface GraphifyPopulateResult {
  ok: boolean;
  reason?: string;
  nodes: number;
  edges: number;
  checkoutPath: string;
  graphPath: string;
}

export function graphifyCheckoutPath(root: string): string {
  return path.join(root, GRAPHIFY_CHECKOUT_REL);
}

export function graphifyOutPath(root: string, profile?: ProjectProfile): string {
  if (profile) return resolveGraphifyOut(profile);
  return resolveGraphifyOut({ project: { root: path.resolve(root) } } as ProjectProfile);
}

/** Freshness probe (populate-corbell.ts:32-65 shape, budgeted): stale when any
 *  indexed-class source file is NEWER than the warm graph.json — the query
 *  must then fall back LOUDLY, never silently serve a stale graph. */
// W45/F29 (frozen-scan HIGH): scope entries are CONTAINED to the project root —
// a caller-controlled profile with `scope: ['/etc']` used to walk outside the
// root (the isAbsolute ? rel : join(root) branch). An absolute entry that
// resolves INSIDE the root is kept (legitimate subdirectory scoping); anything
// escaping it, or unresolvable, returns null (caller skips, fail-closed).
export function containedScopeTarget(root: string, rel: string): string | null {
  // W46: the BASE is canonicalized first — the raw root compared against a
  // realpath'd target misjudged every entry when the root sat behind a
  // symlink (`../real/...` read as an escape). Unresolvable base → null.
  let rootCanon: string | null = null;
  try {
    rootCanon = fs.realpathSync(root);
  } catch {
    return null;
  }
  const target = path.isAbsolute(rel) ? rel : path.join(rootCanon, rel);
  try {
    const real = fs.realpathSync(target);
    const r = path.relative(rootCanon, real);
    if (r === "" || (!r.split(path.sep).includes("..") && !path.isAbsolute(r))) return target;
    return null;
  } catch {
    return null;
  }
}

export function isGraphifyCheckoutFreshFor(
  root: string,
  graphPath: string,
  scope: string[] = ["src"],
  excludes: string[] = [],
): { fresh: boolean; reason: string } {
  // V21 cleanup P2: empty scope = nothing declared to index → the probe CANNOT
  // prove freshness → fail-closed stale-unscooped (never fresh-by-vacuity).
  if (scope.length === 0) return { fresh: false, reason: "stale-unscooped" };
  if (!fs.existsSync(graphPath)) return { fresh: false, reason: "absent" };
  let st: fs.Stats;
  try {
    st = fs.statSync(graphPath);
  } catch {
    return { fresh: false, reason: "absent" };
  }
  const warmMtime = st.mtimeMs;
  // W45/F28 (frozen-scan HIGH): the sidecar content hash is the STRONGER,
  // deterministic check — read it FIRST and short-circuit. The old order ran
  // the full mtime walk first and then DISCARDED `newest` on the sidecar path
  // (double walk), and a budget-exhausted walk forced stale-budget even when
  // the content hash proved freshness. The marked-hash discipline keeps every
  // sidecar verdict fail-closed (a truncated walk can never match a complete
  // stored hash).
  const hashPath0 = graphHashSidecarPath(graphPath);
  let sidecarHash: string | null = null;
  try {
    sidecarHash = fs.readFileSync(hashPath0, "utf8").trim() || null;
  } catch {
    sidecarHash = null; // no sidecar → legacy mtime fallback below
  }
  if (sidecarHash) {
    // W46 (frozen-scan HIGH): a recompute throw (EMFILE/EACCES class escaping
    // the guarded walk) must fail CLOSED as a named verdict — never escape the
    // probe and crash the caller's populate/query path.
    let currentHash: string;
    try {
      currentHash = computeSourceHash(root, scope, excludes);
    } catch (hashErr) {
      return { fresh: false, reason: `stale-hash-error: ${hashErr instanceof Error ? hashErr.message.slice(0, 80) : String(hashErr).slice(0, 80)}` };
    }
    if (currentHash !== sidecarHash) return { fresh: false, reason: "stale-content" };
    return { fresh: true, reason: "fresh" };
  }
  let newest = 0;
  let filesSeen = 0;
  let exhausted = false;
  const budget = { n: GRAPHIFY_FRESHNESS_BUDGET };
  const walk = (dir: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (budget.n <= 0) { exhausted = true; return; }
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"].includes(entry.name)) continue;
        if (excludes.includes(entry.name)) continue;
        // dirs walk free: do not count directories toward budget
        walk(path.join(dir, entry.name));
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        // ★ F-509 FIX (2026-09-24): the file branch ignored excludes (dirs were filtered at
        // * line 144), so excluded files fed newest and the mtime fallback reported stale-mtime
        // * where the hash path reported fresh. Parity: excluded names skip before the budget.
        if (excludes.includes(entry.name)) continue;
        budget.n--;
        try {
          const m = fs.statSync(path.join(dir, entry.name)).mtimeMs;
          if (m > newest) newest = m;
          filesSeen += 1;
        } catch { /* unreadable file - skip */ }
      }
    }
  };
    for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null) continue;
    // V21 cleanup fix-now: a scope entry may be a FILE — stat it directly
    // (walk() on a file throws ENOTDIR and silently counted nothing).
    let stTarget: fs.Stats | null = null;
    try { stTarget = fs.statSync(target); } catch { stTarget = null; }
    if (stTarget?.isFile()) {
      // H-fix: file-scoped scope entries also respect excludes
      const base = path.basename(target);
      if (excludes.includes(base)) continue;
      if (stTarget.mtimeMs > newest) newest = stTarget.mtimeMs;
      filesSeen += 1;
      continue;
    }
    if (stTarget?.isDirectory()) walk(target);
  }
  // V21 cleanup fix-now: zero indexable files seen = the probe proved nothing
  // — fail-closed (fresh-by-vacuity is the silent-staleness class).
  if (filesSeen === 0) return { fresh: false, reason: "stale-unscooped" };
  if (exhausted) return { fresh: false, reason: "stale-budget" };
  // WARM-WINS (L2 content-hash): compare a hash sidecar against the current
  // source fingerprint. The sidecar (.graph_hash) is written by populate()
  // after a successful build. If it's missing → not fresh (first run or wipe).
  // If it differs from the recomputed hash → sources changed → stale.
  // No mtime involved — this is deterministic and granularity-independent.
  // No stored hash → fall through to mtime fallback (legacy compat)
  // W44 (qwen scan HIGH): the /1000 floor compared at SECOND granularity — an
  // edit up to 999ms after the warm build read "fresh" and silently served a
  // stale graph. mtimeMs already carries ms precision: compare it directly.
  if (newest <= warmMtime) return { fresh: true, reason: "fresh" };
  return { fresh: false, reason: "stale" };
}
/** P1.4.3 (W3 gi-validation): the sidecar path NEVER aliases the graph file —
 *  a non-.json output used to derive hashPath === graphPath and the write
 *  clobbered the warm graph with the hash. Exported for the read+write sites
 *  and pinned by tests/st-gi-w3-validation.test.ts (T7). */
export function graphHashSidecarPath(graphPath: string): string {
  return /\.json$/.test(graphPath) ? graphPath.replace(/\.json$/, ".graph_hash") : `${graphPath}.graph_hash`;
}

/** L2 content-hash: deterministic hash of all indexed source files.
 *  Sorted by relative path. P1.4.1 (W3): files ≤64KB hash WHOLE (first-4KB-only
 *  missed tail edits); larger files hash head 4KB + tail 4KB + size.
 *  P1.4.2 (W3): budget exhaustion MARKS the digest — a truncated walk can
 *  never collide with a complete one. */
const GRAPH_HASH_WHOLE_FILE_MAX = 65_536;
function hashSourceTree(root: string, scope: string[], excludes: string[], budgetN: number): string {
  // P1.1.5 (W1 gi-resource): createHash is a top-level ESM import.
  const hash = createHash("sha256");
  const budget = { n: budgetN };
  let exhausted = false;
  const hashFile = (abs: string, anchor: string, statSize: number): void => {
    let size = statSize;
    let fd: number | null = null;
    try {
      fd = fs.openSync(abs, "r");
      // W46 (frozen-scan HIGH): the size is taken from FSTAT on the OPEN fd —
      // the walk's pre-open stat raced replacements (small→1GB grew the alloc,
      // large→small truncated the view). fstat is authoritative for the file
      // this handle actually reads.
      size = fs.fstatSync(fd).size;
      // W8 (frozen-scan HIGH): readSync's return is CHECKED — a short read
      // (truncation race, EOF, signal) hashes what ARRIVED plus a marker, so
      // a truncated read can never collide with the complete file's digest.
      let read = 0;
      if (size <= GRAPH_HASH_WHOLE_FILE_MAX) {
        const buf = Buffer.alloc(size);
        read = fs.readSync(fd, buf, 0, size, 0);
        hash.update(`${anchor}\0${read}\0`);
        hash.update(buf.subarray(0, read));
      } else {
        // W44 (qwen scan HIGH): head+tail 4KB sampling COLLIDED on mid-file
        // edits — two files with identical head/tail/size hashed the same,
        // so a real edit read "fresh" and silently served a stale graph.
        // Stream the WHOLE file in 64KB chunks; past the 8MB cap the cap
        // marker keeps truncated hashing deterministic (never colliding
        // with a complete digest — the W8 discipline).
        const CHUNK = 65_536;
        const MAX_HASH_BYTES = 8 * 1024 * 1024;
        hash.update(`${anchor}\0${size}\0`);
        let offset = 0;
        const chunk = Buffer.alloc(CHUNK);
        while (offset < size && offset < MAX_HASH_BYTES) {
          const want = Math.min(CHUNK, size - offset, MAX_HASH_BYTES - offset);
          const n = fs.readSync(fd, chunk, 0, want, offset);
          if (n <= 0) break;
          hash.update(chunk.subarray(0, n));
          offset += n;
        }
        read = offset;
        if (offset < size) hash.update(`capped@${offset}\n`);
      }
      if (read < Math.min(size, GRAPH_HASH_WHOLE_FILE_MAX) && size <= GRAPH_HASH_WHOLE_FILE_MAX) hash.update("short-read\n");
    } finally {
      if (fd !== null) fs.closeSync(fd); // P1.1.3 (W1): the fd closes on every path
    }
  };
  const walk = (dir: string, prefix: string): void => {
    if (budget.n <= 0) { exhausted = true; return; }
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (budget.n <= 0) { exhausted = true; return; }
      if (entry.isDirectory()) {
        if (["node_modules", ".git", "dist", "build", "coverage", "__pycache__", "graphify-out", ".omp"].includes(entry.name)) continue;
        if (excludes.includes(entry.name)) continue;
        walk(path.join(dir, entry.name), prefix + entry.name + "/");
      } else if (/\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|py|json|yaml|yml|toml|md)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        budget.n--;
        try {
          const stat = fs.statSync(path.join(dir, entry.name));
          hashFile(path.join(dir, entry.name), `${prefix}${entry.name}`, stat.size);
        } catch {
          // frozen-scan HIGH: an unreadable file is NOT silently omitted — the
          // skip is folded into the digest so two trees differing only in
          // unreadable files can never hash equal (fail-open digest fixed).
          hash.update(`skip:${prefix}${entry.name}\n`);
        }
      }
    }
  };
  // W8 (frozen-scan HIGH): the SCOPE is part of the fingerprint — without it,
  // two different scopes over the same tree collide on one digest.
  hash.update(`scope=${scope.join(",")}\n`);
  for (const rel of scope) {
    const target = containedScopeTarget(root, rel);
    if (target === null) continue;
    // W8: file-scoped entries respect excludes (parity with the dir walk).
    const base = path.basename(target);
    if (excludes.includes(base)) continue;
    try {
      const st = fs.statSync(target);
      if (st.isFile()) hashFile(target, rel, st.size);
      else if (st.isDirectory()) walk(target, "");
    } catch { /* skip missing scope entries */ }
  }
  if (exhausted) hash.update("gi-graph-hash:budget-exhausted\n");
  return hash.digest("hex");
}
function computeSourceHash(root: string, scope: string[], excludes: string[]): string {
  return hashSourceTree(root, scope, excludes, 500);
}
/** Test seam (module-loading exception documented in the W3 battery). */
export const computeSourceHashForTest = computeSourceHash;
export function computeSourceHashWithBudget(root: string, scope: string[], excludes: string[], budgetN: number): string {
  return hashSourceTree(root, scope, excludes, budgetN);
}
// ★ F-359 FIX (2026-09-24): EXPORTED — populate.ts's graphify path constructed a bare
//   `{ project: { root } }` which is missing name/languages/entryPoints/build/test
//   (TS2739). One profile builder, two callers, so the shape can never drift.
export function minimalGraphifyProfile(root: string): ProjectProfile {
  const resolved = path.resolve(root);
  const slug = path.basename(resolved).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "target";
  return {
    profileVersion: 1,
    project: {
      name: slug,
      root: resolved,
      languages: ["typescript"],
      entryPoints: ["src/main.ts"],
      build: "bun run build",
      test: "bun test",
    },
    graph: { substrate: "graphify", scope: ["src"], excludes: [] },
    rules: { corpus: [], bindings: {} },
    pipeline: { stages: [{ id: "s1", entry: "main", contract: "graphify-populate" }] },
    history: { failureLogs: [] },
    awareness: { docs: [] },
  };
}

/** Populate a SESSION store from the warm graph.json (the explicit-build
 *  contract: graph.json must exist and be fresh — extraction NEVER happens
 *  here; run scripts/graphify-build.ts first). storePath MUST be
 *  session-shaped (openTypedStore refuses anything else).
 *
 *  Operational misses (absent/empty/stale graph, empty build) return
 *  {ok:false, reason} with the named token — never a throw, never silent.
 *  A LINELESS_NODE from the typed projection propagates LOUD (a data defect,
 *  owned by the hunter map branch — not an operational state). */
export async function populateFromGraphifyCheckout(
  storePath: string,
  root: string,
  runTag: string,
  profile?: ProjectProfile,
  // W46 (frozen-scan HIGH) test/DI seam: the vetted source hash is computed
  // ONCE at gate-pass time — an edit landing during the build+write is NOT
  // laundered into the sidecar (the post-commit rehash did exactly that).
  sourceHashProvider?: () => string,
): Promise<GraphifyPopulateResult> {
  const resolvedRoot = path.resolve(root);
  const base = profile ?? minimalGraphifyProfile(resolvedRoot);
  const pinned: ProjectProfile = {
    ...base,
    project: { ...base.project, root: resolvedRoot },
  };
  const graphPath = resolveGraphifyOut(pinned);
  // checkoutPath is the INSPECTION pointer only (scripts/graphify-build.ts
  // writes it); the session rows go to storePath above — callers must not
  // confuse the two (qwen 8a24ae08).
  const checkoutPath = graphifyCheckoutPath(resolvedRoot);
  // H05 (qwen 33d64eca): the probe walks the PROFILE's scope — a custom-scope
  // profile must be checked against ITS file set, never the ["src"] default.
  // W45/F41 (frozen-scan HIGH): the gate runs on FIRST RUN too — the old
  // storeExists bypass seeded a brand-new session store from a STALE warm
  // graph ("no store yet" ≠ nothing to be stale: the graph-vs-sources relation
  // is independent of the store).
  const freshness = isGraphifyCheckoutFreshFor(resolvedRoot, graphPath, pinned.graph?.scope ?? ["src"], pinned.graph?.excludes ?? []);
  if (!freshness.fresh) {
    return { ok: false, reason: `GRAPHIFY_NOT_WARM:${freshness.reason}`, nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  // W46 (frozen-scan HIGH): capture the VETTED source hash at gate-pass time.
  const vettedHash = sourceHashProvider ? sourceHashProvider() : computeSourceHash(resolvedRoot, pinned.graph?.scope ?? ["src"], pinned.graph?.excludes ?? []);
  // ★ F-38 FIX (2026-09-24): the freshness gate stats graph.json, then build() re-reads it — a swap in between builds rows the gate never vetted. Stat-compare the file across the build; any change refuses.
  const graphBefore = (() => { try { const s = fs.statSync(graphPath); return `${s.mtimeMs}:${s.size}`; } catch { return null; } })();
  let build: BuildResult;
  try {
    build = await new GraphifyAdapter(pinned).build(pinned);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const named = /GRAPHIFY_NOT_WARM:|GRAPH_EMPTY:|LINELESS_NODE|GRAPHIFY_GRAPH_TOO_LARGE|GRAPHIFY_EXTRACT_FAILED/.test(msg)
      ? msg.slice(0, 200)
      : `GRAPHIFY_BUILD_FAILED: ${msg.slice(0, 140)}`;
    return { ok: false, reason: named, nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  const graphAfter = (() => { try { const s = fs.statSync(graphPath); return `${s.mtimeMs}:${s.size}`; } catch { return null; } })();
  if (graphBefore === null || graphAfter === null || graphBefore !== graphAfter) {
    return { ok: false, reason: "GRAPHIFY_NOT_WARM:changed-mid-build", nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  let nodeRows: ForkNode[];
  let edgeRows: ForkEdge[];
  try {
    ({ nodeRows, edgeRows } = mapGraphifyToTyped(build.nodes, build.edges, runTag));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    const named = /LINELESS_NODE|GRAPHIFY_/.test(msg) ? msg.slice(0, 200) : `GRAPHIFY_CORRUPT:projection-failed ${msg.slice(0, 140)}`;
    return { ok: false, reason: named, nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  let db: ReturnType<typeof openTypedStore>;
  try {
    db = openTypedStore(storePath);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `GRAPHIFY_WRITE_FAILED:open ${msg.slice(0, 140)}`, nodes: 0, edges: 0, checkoutPath, graphPath };
  }
  try {
    // Caller owns close (the helper never closes a caller-owned connection).
    supersedeThenInsert(db, runTag, nodeRows, edgeRows, [
      ["substrate", "graphify"],
      ["graphify_graph", graphPath],
      ["graphify_nodes", String(nodeRows.length)],
      ["graphify_edges", String(edgeRows.length)],
      ["populated_at", new Date().toISOString()],
    ]);
    // L2: write the content-hash sidecar so the freshness probe can compare
    const hashPath = graphHashSidecarPath(graphPath); // P1.4.3: never clobbers the graph
    try {
      // W46: write the VETTED hash captured at gate-pass — the post-commit
      // rehash used to absorb mid-populate edits (stale-wins laundering).
      fs.writeFileSync(hashPath, vettedHash, "utf8");
    } catch (hashErr) {
      // ★ F-400 FIX (2026-09-24, the run-7 CRITICAL): the sidecar write failure was
      //   logged at `console.log` — INVISIBLE to an operator watching errors, and it
      //   seeds a REBUILD LOOP: with no sidecar the next freshness probe falls back to
      //   the mtime walk, may still prove fresh, rebuilds, and fails the sidecar write
      //   again, forever. The store update DID succeed (genuinely non-fatal, so this must
      //   not throw) — but it must be LOUD and it must NAME the consequence.
      const why = hashErr instanceof Error ? hashErr.message.slice(0, 120) : "?";
      console.error(
        `[gi-omp] SIDECAR_WRITE_FAILED path=${hashPath}: ${why}`
        + ` — the freshness probe now has no sidecar to compare, so this target may REBUILD on every populate (rebuild loop)`,
      );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, reason: `GRAPHIFY_WRITE_FAILED:${msg.slice(0, 160)}`, nodes: 0, edges: 0, checkoutPath, graphPath };
  } finally {
    try { db.close(); } catch (closeErr) { console.error(`[gi-omp] store close warning: ${closeErr instanceof Error ? closeErr.message : String(closeErr)}`); }
  }
  console.error(
    `[gi-omp] populate substrate=graphify graph=${graphPath} nodes=${nodeRows.length} edges=${edgeRows.length}`,
  );
  return { ok: true, nodes: nodeRows.length, edges: edgeRows.length, checkoutPath, graphPath };
}

/** V-16 FIX (qwen session 1aca90d4): the single-txn helper — supersede +
 *  insert + meta in ONE transaction with ROLLBACK. Before: supersede UPDATEs
 *  ran in autocommit BEFORE BEGIN, so an insert throw lost live rows with no
 *  replacement and no rollback; 5x setMeta reopened the DB after close. Now:
 *  everything rides one connection, one BEGIN IMMEDIATE, one COMMIT; any
 *  throw → ROLLBACK → close → named GRAPHIFY_WRITE_FAILED (loud, never
 *  silent, never half-written). The checkout path below uses the same helper
 *  (DDL single-sourced from typed-write.ts, no drift). */
export function supersedeThenInsert(
  // Caller-owned connection: the caller opens (openTypedStore / new Database)
  // and MUST NOT be inside a transaction (bare BEGIN fails otherwise — the
  // helper owns BEGIN/COMMIT/ROLLBACK/close for exactly one unit of work).
  db: Database & { inTransaction?: boolean },
  runTag: string,
  nodeRows: ForkNode[],
  edgeRows: ForkEdge[],
  meta: Array<[string, string]>,
): void {
  // W45/F27 (frozen-scan HIGH): the duplicate guard is GONE — two checks on
  // the same condition threw CONFLICTING codes (GI_TXN_REQUIRED vs
  // GI_TXN_NESTED). The accurate single verdict (GI_TXN_NESTED) lives at the
  // guard below, before BEGIN.
  // H07 + re-run-V: PER-TABLE empty guard — a nodes-only batch must not
  // supersede live edges into void (and vice versa). Zero rows in BOTH is
  // the only full refusal.
  if (nodeRows.length === 0 && edgeRows.length === 0) {
    throw new Error("GRAPHIFY_WRITE_FAILED: refusing supersede-then-insert with zero rows (would wipe live data)");
  }
  if (db.inTransaction) throw new Error("GI_TXN_NESTED: supersedeThenInsert entered with an open transaction (caller owns it) — refusing to double-commit");
  db.exec("BEGIN IMMEDIATE;");
  try {
    // Per-table guard: only supersede a table we are about to re-populate.
    if (nodeRows.length > 0) {
      db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      insertForkNodesBatch(db, nodeRows);
    }
    if (edgeRows.length > 0) {
      db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
      insertForkEdgesBatch(db, edgeRows);
    }
    for (const [k, v] of meta) {
      db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [k, v]);
    }
    try {
      db.exec("COMMIT;");
    } catch (commitErr) {
      try { db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw commitErr;
    }
  } catch (e) {
    try { db.exec("ROLLBACK;"); } catch { /* already-rolled-back */ }
    throw e;
  }
  // Caller owns close (typed-write batch-writer contract) — the helper never
  // closes a connection it did not open (re-run-V high: close+leak pair).
}
/** Inspection-checkout writer (the scripts/graphify-build.ts path): the SAME
 *  typed DDL + the SAME batch writers + the SAME supersede discipline as
 *  writeCorbellCheckout in store-map.ts, against a bare sqlite file that is
 *  NOT a session store. NEVER use for session data. */
export function writeGraphifyCheckout(
  checkoutPath: string,
  nodeRows: ForkNode[],
  edgeRows: ForkEdge[],
  opts?: { runTag?: string },
): { nodes: number; edges: number; runTag: string; storeNodes: number; storeEdges: number } {
  const runTag = opts?.runTag ?? `graphify-checkout-${Date.now().toString(36)}`;
  // ★ F-711 FIX (2026-09-24): the old nodes-only guard refused a VALID edges-only
  // ★ checkout batch (the session helper supersedeThenInsert accepts it) while the
  // ★ finding's wipe shape is closed by the per-table conditionals below — the
  // ★ same bidirectional law as the session path: refuse only when BOTH are empty,
  // ★ and never touch a table its batch does not repopulate.
  if (nodeRows.length === 0 && edgeRows.length === 0) throw new Error("GRAPH_EMPTY:graphify checkout refusing empty input (would wipe live inspection rows)");
  const taggedNodes = nodeRows.map((r) => ({ ...r, run: runTag }));
  const taggedEdges = edgeRows.map((r) => ({ ...r, run: runTag }));
  fs.mkdirSync(path.dirname(checkoutPath), { recursive: true });
  const db = new Database(checkoutPath, { create: true });
  try {
    db.exec("PRAGMA journal_mode = WAL;");
    for (const stmt of TYPED_STORE_DDL) db.run(stmt);
    // EN-041-adjacent (found by the graphify-build re-run): TYPED_STORE_DDL is
    // CREATE TABLE IF NOT EXISTS — against a PRE-EXISTING checkout it is a
    // no-op, so a store laid down before the v2 columns never gains layer_id /
    // derivation and the batch INSERT fails with
    //   SQLiteError: table typed_nodes has no column named layer_id.
    // The session path migrates on open; this path must too.
    migrateLayerColumns(db);
    db.exec("BEGIN IMMEDIATE;");
    try {
      // V21 cleanup P4: per-table parity with the session helper — an
      // edges-only or nodes-only checkout batch never voids the other side.
      // ★ F-711 FIX (2026-09-24): the batch INSERTs ride inside the same
      // ★ per-table guards (an empty batch inserts nothing, but the guard states
      // ★ the invariant instead of relying on it).
      if (taggedNodes.length > 0) {
        db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
        insertForkNodesBatch(db, taggedNodes);
      }
      if (taggedEdges.length > 0) {
        db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
        insertForkEdgesBatch(db, taggedEdges);
      }
      // ★ F-127 FIX (2026-09-24): the populated_at marker rides INSIDE the transaction
      //   (before COMMIT). After COMMIT it was a separate auto-commit statement; its
      //   failure hit the catch's ROLLBACK on an ALREADY-COMMITTED tx — a swallowed error
      //   that left the store unmarked (the exact A3 gap this line was added to close).
      db.run("INSERT INTO gi_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", ["populated_at", new Date().toISOString()]);
      // ★ F-339 FIX (2026-09-24): single COMMIT-in-try. The nested inner try around
      // ★ COMMIT double-rolled-back (inner catch ROLLBACK + rethrow into the outer catch
      // ★ ROLLBACK) and masked commit failures from the outer path. One transaction, one
      // ★ COMMIT, one ROLLBACK — the supersedeThenInsert shape above.
      db.exec("COMMIT;");
    } catch (e) {
      try { db.exec("ROLLBACK;"); } catch { /* already-rolled-back — close still runs */ }
      throw e;
    }
    const nRow = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number };
    const eRow = db.query("SELECT COUNT(*) AS n FROM typed_edges WHERE superseded_run IS NULL").get() as { n: number };
    return { nodes: taggedNodes.length, edges: taggedEdges.length, runTag, storeNodes: Number(nRow.n), storeEdges: Number(eRow.n) };
  } finally {
    db.close();
  }
}
