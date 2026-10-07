#!/usr/bin/env bun
// gi-populate — ★ THE SELF-POPULATE PATH (GI_KERNEL_V2.2_REBUILD_SPEC §3 W4).
//
// THE ONE ENTRY POINT that makes the kernel SELF-POPULATING: it builds EVERY graph
// layer FROM THE TARGET into THE TARGET'S OWN `.omp/graph-intelligence/`.
//
// ★ THE CRITICAL LAW (spec verbatim): the store is written into THE TARGET's
//   .omp/graph-intelligence/, NEVER the GI repo's. A build for target X that writes
//   into Y's scope is the exact defect F-124 recorded.
//
// ★ EVERY stage is LOUD on failure, never a silent skip. A layer whose builder is
//   unavailable → `GI_LAYER_DOWN:<layer>` (named). A source-less target →
//   `GI_NO_SOURCE_ROOT` (W2), exit 1 — never GRAPH_EMPTY.
//
// usage: bun scripts/gi-populate.ts --target <dir> [--rebuild] [--layers <csv>]
//
// PIPELINE:
//   1. discoverSourceRoots(target)                      ← W2
//   2. for each layer: run its builder against the target; write into {target}/.omp/…
//   3. stamp gi_meta.build_root = realpath(target)      ← W3
//   4. verify >0 LIVE nodes (superseded_run IS NULL); else GI_LAYER_BUILD_EMPTY:<layer>
//   5. print the per-layer table; exit 0 iff EVERY requested layer built
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { discoverSourceRoots } from "../src/hunter/profile/source-roots.ts";
import { createHash } from "node:crypto";

/** ★ THE PROJECT-SCOPE STAMP WRITER. The W3 seams (setBuildRoot/getMeta) route through
 *  openTypedStore, which ENFORCES the `sessions/{sid24}/store.sqlite` shape — correct for
 *  a session store, WRONG for a project-scope graph store (the target's corbell-checkout).
 *  A project-scope store is stamped through raw sqlite3, the same channel the store's
 *  writer uses. This is NOT a bypass of W3: the stamp is written; the READ assertion
 *  (assertStoreScope) reads it back through whatever path opens the store. */
function stampBuildRoot(storePath: string, buildRoot: string, builder: string): void {
  const sha = createHash("sha256").update(buildRoot).digest("hex");
  const rows = [
    ["build_root", buildRoot],
    ["build_root_sha", sha],
    ["built_at", new Date().toISOString()],
    ["builder", builder],
  ];
  const sql = rows
    .map(([k, v]) => `INSERT INTO gi_meta (key, value) VALUES ('${k}', '${String(v).replace(/'/g, "''")}') ON CONFLICT(key) DO UPDATE SET value = excluded.value;`)
    .join(" ");
  spawnSync("sqlite3", [storePath, sql], { encoding: "utf8", timeout: 30_000 });
}

/** Read a gi_meta value from a PROJECT-scope store via sqlite3 (session-shape-free). */
function readMeta(storePath: string, key: string): string {
  const r = spawnSync("sqlite3", [storePath, `SELECT value FROM gi_meta WHERE key='${key}';`], { encoding: "utf8", timeout: 30_000 });
  return (r.stdout ?? "").trim();
}

const REPO = path.resolve(import.meta.dir, "..");

interface LayerResult {
  layer: string;
  ok: boolean;
  nodes: number;
  edges: number;
  store: string;
  buildRoot: string;
  reason?: string;
}

interface LayerDef {
  /** the layer's name (matches the register's consumer id family). */
  name: string;
  /** the builder argv (relative to REPO), given the resolved target. */
  argv: (target: string, rebuild: boolean) => string[];
  /** the store path the builder writes, TARGET-relative. */
  storeRel: string;
  /** the store's node/edge count reader (sqlite or json). */
  kind: "sqlite" | "json";
  /** the builder is only usable when this returns true (a missing binary = a NAMED down). */
  available?: (t: string) => boolean;
  /** a command to run BEFORE the builder (e.g. the typed-schema init for a raw store). */
  preBuild?: (t: string, storePath: string) => void;
}

const exists = (p: string): boolean => fs.existsSync(p);

/** The python interpreter that has the corbell/semantica deps (the venv); the system python otherwise. */
const PY = exists("/home/leviathan/corbell-venv/bin/python")
  ? "/home/leviathan/corbell-venv/bin/python"
  : "python3";

const LAYERS: LayerDef[] = [
  {
    name: "corbell",
    argv: (t, rebuild) => ["bun", "scripts/corbell-build.ts", "--target", t, ...(rebuild ? ["--rebuild"] : [])],
    storeRel: ".omp/graph-intelligence/corbell-checkout/store.sqlite",
    kind: "sqlite",
  },
  {
    name: "graphify",
    argv: (t) => ["bun", "scripts/graphify-build.ts", "--target", t],
    storeRel: ".omp/graph-intelligence/graphify-checkout/store.sqlite",
    kind: "sqlite",
  },
  {
    name: "structural",
    argv: (t) => [PY, "scripts/structural-extract.py", "--target", t, "--store", path.join(t, ".omp/graph-intelligence/structural/store.sqlite")],
    storeRel: ".omp/graph-intelligence/structural/store.sqlite",
    kind: "sqlite",
    available: () => exists(path.join(REPO, "scripts/structural-extract.py")),
    // ★ the extractor writes TYPED rows — the schema must pre-exist in the raw store,
    //   and a fresh build needs a CLEAN store (its rows carry a UNIQUE edge index).
    preBuild: (_t, storePath) => {
      fs.rmSync(storePath, { force: true });
      fs.rmSync(`${storePath}-wal`, { force: true });
      fs.rmSync(`${storePath}-shm`, { force: true });
      spawnSync("bun", ["scripts/typed-schema-init.ts", storePath], { cwd: REPO, encoding: "utf8", timeout: 120_000 });
    },
  },
  {
    name: "ua",
    argv: (t) => ["bun", "scripts/ua-ingest.ts", t],
    storeRel: ".ua/knowledge-graph.json",
    kind: "json",
    available: () => exists(path.join(REPO, "scripts/ua-ingest.ts")),
  },
  {
    name: "semantica",
    argv: (t) => [PY, "scripts/semantica-ingest.py", t],
    storeRel: ".omp/graph-intelligence/layers/semantica/kg.json",
    kind: "json",
    // ★ the semantica module is only importable when the venv carries it — a missing
    //   module is the NAMED GI_LAYER_DOWN, never a silent empty.
    available: () => {
      if (!exists(path.join(REPO, "scripts/semantica-ingest.py"))) return false;
      const probe = spawnSync(PY, ["-c", "import semantica"], { encoding: "utf8", timeout: 20_000 });
      return probe.status === 0;
    },
  },
  {
    name: "c2kg",
    argv: (t) => ["sh", "scripts/c2kg-produce/run.sh", t],
    storeRel: ".c2kg/index.json",
    kind: "json",
    // ★ the Java producer resolves its toolkit at `$ROOT/research/graph-infra-repos/…`
    //   (relative to the ANALYZED root) and needs a JDK + a Gradle build. Only the GI
    //   repo itself carries that toolkit → a foreign target is GI_LAYER_DOWN (named).
    available: (t) => {
      const jdk = spawnSync("javac", ["-version"], { encoding: "utf8", timeout: 15_000 });
      const toolkit = exists(path.join(t, "research/graph-infra-repos/code-to-knowledge-graph"));
      return jdk.status === 0 && toolkit;
    },
  },
];

function parseArgs(argv: string[]): { target: string; rebuild: boolean; layers: Set<string> | null } {
  let target = "";
  let rebuild = false;
  let layers: Set<string> | null = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--target") target = argv[++i] ?? "";
    else if (argv[i] === "--rebuild") rebuild = true;
    else if (argv[i] === "--layers") layers = new Set((argv[++i] ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  }
  return { target, rebuild, layers };
}

/** Count LIVE rows from a sqlite store via the bun:sqlite read path — a node/edge pair. */
function sqliteCounts(storePath: string): { nodes: number; edges: number } | null {
  try {
    const r = spawnSync("sqlite3", [
      storePath,
      "SELECT (SELECT COUNT(*) FROM typed_nodes WHERE superseded_run IS NULL), (SELECT COUNT(*) FROM typed_edges WHERE superseded_run IS NULL);",
    ], { encoding: "utf8", timeout: 30_000 });
    if (r.status !== 0) return null;
    const [n, e] = (r.stdout ?? "").trim().split("|").map((x) => Number(x) || 0);
    return { nodes: n ?? 0, edges: e ?? 0 };
  } catch {
    return null;
  }
}

/** Count a JSON store's nodes/edges (the .ua / .c2kg / semantica shapes). */
function jsonCounts(storePath: string): { nodes: number; edges: number } | null {
  try {
    const raw = fs.readFileSync(storePath, "utf8");
    const d = JSON.parse(raw) as Record<string, unknown>;
    const nodes = (d.nodes ?? d.entities ?? d.symbols ?? []) as unknown[];
    const edges = (d.edges ?? d.relationships ?? []) as unknown[];
    return { nodes: nodes.length, edges: edges.length };
  } catch {
    return null;
  }
}

function main(): void {
  const { target: rawTarget, rebuild, layers } = parseArgs(process.argv.slice(2));
  if (!rawTarget) {
    console.error("gi-populate: no --target given.\nusage: bun scripts/gi-populate.ts --target <dir> [--rebuild] [--layers <csv>]");
    process.exit(2);
  }
  const target = path.resolve(rawTarget);
  if (!exists(target) || !fs.statSync(target).isDirectory()) {
    console.error(`gi-populate: target is not a directory: ${target}`);
    process.exit(2);
  }

  // ★ STEP 1 — the source-root discovery (W2). A no-hit is the NAMED refusal.
  const discovered = discoverSourceRoots(target);
  if ("error" in discovered) {
    console.error(`gi-populate: ${discovered.error}`);
    process.exit(1);
  }
  const buildRoot = fs.realpathSync(target);
  console.log(`[gi-populate] target=${target}`);
  console.log(`[gi-populate] source roots (${discovered.roots.length}): ${discovered.roots.join(", ")} (${discovered.evidence})`);
  console.log(`[gi-populate] build_root=${buildRoot}`);

  const wanted = layers ? LAYERS.filter((l) => layers.has(l.name)) : LAYERS;
  const results: LayerResult[] = [];

  for (const l of wanted) {
    const storePath = path.join(target, l.storeRel);
    const storeRel = l.storeRel;
    if (l.available && !l.available(target)) {
      results.push({ layer: l.name, ok: false, nodes: 0, edges: 0, store: storeRel, buildRoot, reason: `GI_LAYER_DOWN:${l.name}` });
      console.log(`[gi-populate] ${l.name.padEnd(10)} GI_LAYER_DOWN (no builder)`);
      continue;
    }
    // ★ STEP 2 — run the builder against the TARGET.
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    if (l.preBuild) l.preBuild(target, storePath);
    // ★ a FRESH store must SCAN (the synthesized profile defaults rebuild=false, which
    //   skips the scan and yields GRAPH_EMPTY on a store that has never been built).
    const effRebuild = rebuild || !exists(storePath);
    const argv = l.argv(target, effRebuild);
    const r = spawnSync(argv[0], argv.slice(1), { cwd: REPO, encoding: "utf8", timeout: 600_000 });
    const tail = ((r.stdout ?? "") + (r.stderr ?? "")).trim().split("\n").slice(-2).join(" · ").slice(0, 160);
    if (r.status !== 0) {
      results.push({ layer: l.name, ok: false, nodes: 0, edges: 0, store: storeRel, buildRoot, reason: `GI_LAYER_BUILD_FAILED:${l.name} — ${tail}` });
      console.log(`[gi-populate] ${l.name.padEnd(10)} FAILED (exit ${r.status}) ${tail}`);
      continue;
    }
    // ★ STEP 3 — stamp the build root (W3), PROJECT-scope (the store is the target's).
    if (l.kind === "sqlite" && exists(storePath)) {
      stampBuildRoot(storePath, buildRoot, l.name);
    }
    // ★ STEP 4 — verify >0 LIVE rows.
    const counts = l.kind === "sqlite" ? sqliteCounts(storePath) : jsonCounts(storePath);
    if (!counts || counts.nodes <= 0) {
      results.push({ layer: l.name, ok: false, nodes: counts?.nodes ?? 0, edges: counts?.edges ?? 0, store: storeRel, buildRoot, reason: `GI_LAYER_BUILD_EMPTY:${l.name}` });
      console.log(`[gi-populate] ${l.name.padEnd(10)} GI_LAYER_BUILD_EMPTY (0 live rows)`);
      continue;
    }
    results.push({ layer: l.name, ok: true, nodes: counts.nodes, edges: counts.edges, store: storeRel, buildRoot });
    console.log(`[gi-populate] ${l.name.padEnd(10)} OK nodes=${counts.nodes} edges=${counts.edges} → ${storeRel}`);
  }

  // ★ STEP 5 — the per-layer table + the exit contract.
  console.log("");
  console.log("  layer       ok   nodes   edges   store");
  console.log("  ──────────  ───  ──────  ──────  ─────────────────────────────────────────");
  for (const x of results) {
    console.log(`  ${x.layer.padEnd(10)}  ${x.ok ? "✓" : "✗"}   ${String(x.nodes).padStart(6)}  ${String(x.edges).padStart(6)}  ${x.store}`);
    if (!x.ok && x.reason) console.log(`                 ↳ ${x.reason}`);
  }
  const built = results.filter((x) => x.ok).length;
  const failed = results.length - built;
  console.log("");
  console.log(`[gi-populate] built ${built}/${results.length} layers` + (failed ? ` — ${failed} named failure(s)` : " — ALL BUILT"));
  // the W3 stamp verification for the corbell store (the load-bearing one).
  const corbell = path.join(target, ".omp/graph-intelligence/corbell-checkout/store.sqlite");
  if (exists(corbell)) {
    console.log(`[gi-populate] corbell build_root stamp: ${readMeta(corbell, "build_root") || "(none)"}`);
  }
  // ★ FR-7 — THE GRAPH-HEALTH GATE (the FINAL step). Every layer must be ≥90% in-scope; a
  //   polluted layer FAILS the build (never a silent green). `--skip-health` escapes only in
  //   tests. This is the check the V2.2 kernel lacked — the reason structural hit 12.4%.
  if (!process.argv.includes("--skip-health") && failed === 0) {
    console.log("");
    const gh = spawnSync("bun", ["scripts/graph-health.ts", target, "--threshold", "0.90"], { cwd: REPO, encoding: "utf8", timeout: 300_000 });
    process.stdout.write(gh.stdout ?? "");
    if (gh.status !== 0) {
      process.stderr.write(gh.stderr ?? "");
      console.error("[gi-populate] GRAPH_HEALTH_FAILED — a layer is out of scope (see above)");
      process.exit(1);
    }
  }
  process.exit(failed === 0 ? 0 : 1);
}

main();
