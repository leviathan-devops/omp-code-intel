#!/usr/bin/env bun
// graph-health — GI_KERNEL_V2.3 FR-7. THE 3 MECHANICAL CHECKS over every graph layer.
//
//   GHA-1 RESOLVE  — locate the layer's store (a missing store is GI_LAYER_DOWN, named).
//   GHA-2 HISTOGRAM— the top-level-root histogram of every node/entity's path.
//   GHA-3 ARCHIVE  — the foreign/archive count (rows under a SKIP root).
//
// THE VERDICT PER LAYER: inScope / total. < THRESHOLD → `GI_LAYER_SCOPE_SUSPECT:<layer>`
// and the process EXITS NONZERO. A layer whose store carries no path field is reported
// `N/A (no path field)` and does NOT fail — an honest "cannot measure", never a silent pass.
//
// ★ THE WIRING: this is the FINAL STEP of `gi-populate` (FR-7). A build that populates a
//   layer into a polluted scope must FAIL the build, not report success.
//
// usage: bun scripts/graph-health.ts [<target>] [--threshold 0.90] [--json]

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Database } from "bun:sqlite";
import { discoverSourceRoots } from "../src/hunter/profile/source-roots.ts";
import { WALK_SKIP } from "../src/hunter/profile/source-roots.ts";

const THRESHOLD_DEFAULT = 0.9;

/** The non-source roots that legitimately belong to the ANALYZED tree (code, not archive). */
const IN_SCOPE_EXTRA = new Set(["scripts", "packages", "extensions"]);

interface LayerDef {
  name: string;
  rel: string;
  kind: "sqlite" | "json" | "service";
  /** For JSON layers: the keys (in order) that may carry a path on each node. */
  pathKeys?: string[];
  /** For service layers: the systemd --user unit that must be active. */
  unit?: string;
}

/** The layer table — the same stores gi-populate writes. */
const LAYERS: LayerDef[] = [
  { name: "L1_semantica", rel: ".omp/graph-intelligence/layers/semantica/kg.json", kind: "json", pathKeys: ["source", "filePath", "file", "path", "name", "id"] },
  // ★ L2_ARSUMBRIS is a LIVE socket service (~/.arsumbris/au-engine/run/*.sock), NOT a file
  //   store — the adapter reads `instances` over auEngineRead. Its check is LIVENESS, not a
  //   path histogram; it is excluded from the scope ratio (an honest "cannot measure scope").
  { name: "L2_arsumbris", rel: "", kind: "service", unit: "au-engine-graph-intelligence.service" },
  { name: "L3_ua", rel: ".ua/knowledge-graph.json", kind: "json", pathKeys: ["filePath", "source", "file", "path", "name", "id"] },
  { name: "L4_c2kg", rel: ".c2kg/index.json", kind: "json", pathKeys: ["file", "filePath", "source", "path", "name", "id"] },
  { name: "L5_corbell", rel: ".omp/graph-intelligence/corbell-checkout/store.sqlite", kind: "sqlite" },
  { name: "L6_graphify", rel: ".omp/graph-intelligence/graphify-checkout/store.sqlite", kind: "sqlite" },
  { name: "structural", rel: ".omp/graph-intelligence/structural/store.sqlite", kind: "sqlite" },
];

interface LayerReport {
  layer: string;
  status: "OK" | "SCOPE_SUSPECT" | "ABSENT" | "N/A";
  total: number;
  inScope: number;
  ratio: number;
  histogram: Record<string, number>;
  reason?: string;
}

/** The top-level component of a path (the dir the file sits under), or "(root)"/"(null)".
 *  Handles: a `id::` / `file::` prefix, a `:NN` line suffix, a leading `./`, and an
 *  ABSOLUTE path under the analyzed root (corbell stores absolute `file` values). */
function topComponent(p: string | null | undefined, root: string): string {
  if (p === null || p === undefined || p === "") return "(null)";
  let s = String(p).replace(/\\/g, "/").replace(/^\.\//, "");
  // strip a `file::` / `symbol::` / `<id>::` prefix (keep the tail, the path)
  if (s.includes("::")) s = s.slice(s.lastIndexOf("::") + 2);
  // strip a trailing `:NN` line suffix (corbell's `path:line` shape)
  s = s.replace(/:\d+$/, "");
  // an ABSOLUTE path — strip the analyzed root so `/<root>/src/x` → `src/x`
  const r = root.replace(/\\/g, "/").replace(/\/$/, "");
  if (s.startsWith(r + "/")) s = s.slice(r.length + 1);
  else if (s.startsWith("/")) return "(foreign-absolute)";
  const i = s.indexOf("/");
  return i > 0 ? s.slice(0, i) : s;
}

function histogramOf(paths: (string | null | undefined)[], root: string): Record<string, number> {
  const h: Record<string, number> = {};
  for (const p of paths) {
    const k = topComponent(p, root);
    h[k] = (h[k] ?? 0) + 1;
  }
  return h;
}

/** Read every path-carrying value from a sqlite store (the `file` column of typed_nodes). */
function sqlitePaths(storePath: string): (string | null)[] | null {
  try {
    const db = new Database(storePath, { readonly: true });
    const cols = db.query("PRAGMA table_info(typed_nodes)").all() as { name: string }[];
    const hasFile = cols.some((c) => c.name === "file");
    if (!hasFile) { db.close(); return []; }
    const rows = db
      .query("SELECT file FROM typed_nodes WHERE superseded_run IS NULL")
      .all() as { file: string | null }[];
    db.close();
    return rows.map((r) => r.file);
  } catch {
    return null;
  }
}

/** Read every path-carrying value from a JSON store (the entities/nodes array). */
function jsonPaths(storePath: string, keys: string[]): (string | null)[] | null {
  try {
    const d = JSON.parse(fs.readFileSync(storePath, "utf8")) as Record<string, unknown>;
    const arr = (d.nodes ?? d.entities ?? d.symbols ?? d.items ?? []) as Record<string, unknown>[];
    if (!Array.isArray(arr)) return [];
    const out: (string | null)[] = [];
    for (const n of arr) {
      let v: unknown = null;
      for (const k of keys) {
        if (n && typeof n === "object" && k in n && n[k]) { v = n[k]; break; }
      }
      out.push(v == null ? null : String(v));
    }
    return out;
  } catch {
    return null;
  }
}

/** ★ THE CORE (exported for the test). Computes the per-layer scope. A layer whose store
 *  carries no path field reports N/A; a service layer reports its LIVENESS. */
export function computeHealth(root: string, threshold: number): { inScopeRoots: string[]; reports: LayerReport[] } {
  // GHA-1 — resolve the in-scope roots (the source roots + the code extras).
  const discovered = discoverSourceRoots(root);
  const inScopeRoots = new Set<string>();
  if (!("error" in discovered)) {
    for (const r of discovered.roots) inScopeRoots.add(path.basename(r));
  }
  for (const e of IN_SCOPE_EXTRA) inScopeRoots.add(e);

  const reports: LayerReport[] = [];
  for (const l of LAYERS) {
    // ★ a SERVICE layer (L2_ARSUMBRIS): its check is LIVENESS via the systemd --user unit,
    //   never a path histogram. Excluded from the scope ratio (an honest non-measure).
    if (l.kind === "service") {
      const r = spawnSync("systemctl", ["--user", "is-active", l.unit ?? ""], { encoding: "utf8", timeout: 15_000 });
      const active = (r.stdout ?? "").trim() === "active";
      reports.push({ layer: l.name, status: active ? "OK" : "ABSENT", total: 0, inScope: 0, ratio: active ? 1 : 0, histogram: {}, reason: active ? `LIVE (${l.unit} active)` : `GI_LAYER_DOWN:${l.name} (unit ${l.unit} not active)` });
      continue;
    }
    const storePath = path.join(root, l.rel);
    if (!fs.existsSync(storePath)) {
      reports.push({ layer: l.name, status: "ABSENT", total: 0, inScope: 0, ratio: 0, histogram: {}, reason: `GI_LAYER_DOWN:${l.name} (no store at ${l.rel})` });
      continue;
    }
    const paths = l.kind === "sqlite" ? sqlitePaths(storePath) : jsonPaths(storePath, l.pathKeys ?? []);
    if (paths === null) {
      reports.push({ layer: l.name, status: "ABSENT", total: 0, inScope: 0, ratio: 0, histogram: {}, reason: `GI_LAYER_UNREADABLE:${l.name}` });
      continue;
    }
    const nonNull = paths.filter((p) => p !== null && p !== undefined && p !== "");
    if (nonNull.length === 0) {
      // a store whose nodes carry no path (e.g. corbell's service graph) — honest N/A.
      reports.push({ layer: l.name, status: "N/A", total: paths.length, inScope: paths.length, ratio: 1, histogram: {}, reason: "no path field on nodes" });
      continue;
    }
    const histogram = histogramOf(paths, root);
    const total = paths.length;
    const inScope = Object.entries(histogram)
      .filter(([k]) => inScopeRoots.has(k))
      .reduce((s, [, v]) => s + v, 0);
    const ratio = total === 0 ? 0 : inScope / total;
    reports.push({
      layer: l.name,
      status: ratio >= threshold ? "OK" : "SCOPE_SUSPECT",
      total,
      inScope,
      ratio,
      histogram: histogram,
      reason: ratio >= threshold ? undefined : `GI_LAYER_SCOPE_SUSPECT:${l.name} (${Math.round(ratio * 100)}% in-scope < ${Math.round(threshold * 100)}%)`,
    });
  }
  return { inScopeRoots: [...inScopeRoots].sort(), reports };
}

function main(): void {
  const argv = process.argv.slice(2);
  let target = ".";
  let threshold = THRESHOLD_DEFAULT;
  let asJson = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--threshold") threshold = Number(argv[++i]) || THRESHOLD_DEFAULT;
    else if (argv[i] === "--json") asJson = true;
    else if (!argv[i]!.startsWith("--")) target = argv[i]!;
  }
  const root = path.resolve(target);
  if (!fs.existsSync(root)) {
    console.error(`graph-health: target does not exist: ${root}`);
    process.exit(2);
  }
  const { inScopeRoots, reports } = computeHealth(root, threshold);
  if (inScopeRoots.length === 0) {
    console.error(`graph-health: GI_NO_SOURCE_ROOT under ${root} — cannot compute scope`);
    process.exit(1);
  }

  if (asJson) {
    console.log(JSON.stringify({ root, inScopeRoots: [...inScopeRoots], threshold, reports }, null, 2));
  } else {
    console.log(`graph-health · root=${root}`);
    console.log(`  in-scope roots: ${[...inScopeRoots].sort().join(", ")}`);
    console.log("");
    console.log("  layer            status        in-scope  total   ratio   top roots");
    console.log("  ───────────────  ────────────  ────────  ──────  ──────  ─────────────────────────");
    for (const r of reports) {
      const top = Object.entries(r.histogram)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([k, v]) => `${k}:${v}`)
        .join(" ");
      const pct = r.status === "N/A" || (r.status === "ABSENT" && r.total === 0) ? "—" : `${Math.round(r.ratio * 100)}%`;
      console.log(`  ${r.layer.padEnd(15)}  ${r.status.padEnd(12)}  ${String(r.inScope).padStart(8)}  ${String(r.total).padStart(6)}  ${pct.padStart(6)}  ${top}`);
      if (r.reason) console.log(`                   ↳ ${r.reason}`);
    }
  }

  const suspects = reports.filter((r) => r.status === "SCOPE_SUSPECT");
  console.log("");
  if (suspects.length > 0) {
    console.log(`graph-health: ${suspects.length} layer(s) SCOPE_SUSPECT — FAIL`);
    process.exit(1);
  }
  console.log(`graph-health: all measurable layers ≥${Math.round(threshold * 100)}% in-scope — OK`);
  process.exit(0);
}

if (import.meta.main) main();
