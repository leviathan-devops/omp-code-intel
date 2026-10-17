#!/usr/bin/env bun
// PORTED FROM scripts/corbell-build.ts:1-99 (explicit-build inspection checkout: adapter build + store-map + counts) — graphify leg: explicit `graphify extract --code-only --no-cluster` (D3: hunts/queries READ, never block on a minutes-long extract), then GraphifyAdapter build + store-map into
//   {target}/.omp/graph-intelligence/graphify-checkout/store.sqlite
// and prints real counts. NOTE: this path is an INSPECTION checkout, not a
// session store — openSessionStore/sessionStorePath MUST refuse it (it lacks
// /sessions/{sid}/), so the CLI writes via writeGraphifyCheckout directly and
// never touches the registry. Session wiring lands in populate-graphify.ts.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { GraphifyAdapter, mapGraphifyToTyped, resolveGraphifyBinary, scopeBuildToProfile } from "../src/hunter/graph/graphify-adapter.ts";
import {
  writeGraphifyCheckout,
  graphHashSidecarPath,
  graphifyOutPath,
  computeSourceHashWithBudget,
} from "../src/omp/populate-graphify.ts";
import { discoverSourceRoots } from "../src/hunter/profile/source-roots.ts";
import { loadProfile } from "../src/hunter/profile/loader.ts";
import type { ProjectProfile } from "../src/hunter/profile/schema.ts";

function usageFail(msg: string): never {
  console.error(`graphify-build: ${msg}\nusage: bun scripts/graphify-build.ts --target <dir> [--extract|--no-extract] [--scope <s> ...] [--source-root <dir> ...]`);
  process.exit(2);
}

const argv = process.argv.slice(2);
let target = "";
let extract = true;
const scopes: string[] = [];
const sourceRoots: string[] = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--target") {
    target = argv[++i] ?? "";
  } else if (argv[i] === "--extract") {
    extract = true;
  } else if (argv[i] === "--no-extract") {
    extract = false;
  } else if (argv[i] === "--scope") {
    const s = argv[++i] ?? "";
    if (s.length > 0) scopes.push(s);
  } else if (argv[i] === "--source-root") {
    const s = argv[++i] ?? "";
    if (s.length > 0) sourceRoots.push(s);
  } else {
    usageFail(`unknown arg ${argv[i]}`);
  }
}
if (!target) usageFail("--target <dir> is required");
const root = path.resolve(target);
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  usageFail(`target is not a directory: ${root}`);
}

// GI KERNEL V2.2 W2 — TARGET-DRIVEN SOURCE ROOTS (spec §3 W2): --source-root
// (repeatable) wins; otherwise discover from the target. A source-less target
// is the NAMED GI_NO_SOURCE_ROOT refusal (exit 1) — never an empty graph.
let discoveredRoots: string[];
{
  if (sourceRoots.length > 0) {
    discoveredRoots = sourceRoots.map((s) => path.resolve(root, s));
    console.log(`[graphify-build] source roots (explicit --source-root): ${discoveredRoots.join(", ")}`);
  } else {
    const found_roots = discoverSourceRoots(root);
    if ("error" in found_roots) {
      console.error(found_roots.error);
      process.exit(1);
    }
    discoveredRoots = found_roots.roots;
    console.log(`[graphify-build] source roots (${discoveredRoots.length}): ${discoveredRoots.join(", ")} (${found_roots.evidence})`);
  }
}

// The profile: prefer an explicit profile file under the target; otherwise
// synthesize the minimal in-memory profile (the adapter only reads
// project.name/root/languages + graph.graphifyOut).
const t0 = Date.now();
let profile: ProjectProfile;
const candidateProfiles = ["profile.yaml", "profile.yml", "profile.json", ".omp/profile.yaml"].map((p) =>
  path.join(root, p),
);
const found = candidateProfiles.find((p) => fs.existsSync(p));
if (found) {
  profile = loadProfile(found);
  profile.project.root = root;
  (profile as unknown as { graph: { substrate?: string } }).graph.substrate = "graphify";
  (profile as unknown as { graph: { sourceRoots?: string[] } }).graph.sourceRoots = discoveredRoots;
  console.log(`[graphify-build] profile: ${found} (root pinned to ${root}, substrate=graphify)`);
} else {
  const slug = path.basename(root).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "target";
  profile = {
    profileVersion: 1,
    project: {
      name: slug,
      root,
      languages: ["typescript"],
      entryPoints: ["src/main.ts"],
      build: "bun run build",
      test: "bun test",
    },
    graph: {
      substrate: "graphify",
      scope: scopes.length > 0 ? scopes : discoveredRoots.map((r) => path.relative(root, r)).filter((s) => s.length > 0),
      excludes: [],
      sourceRoots: discoveredRoots,
    },
    rules: { corpus: [], bindings: {} },
    pipeline: { stages: [{ id: "s1", entry: "main", contract: "inspection-build" }] },
    history: { failureLogs: [] },
    awareness: { docs: [] },
  };
  console.log(`[graphify-build] no profile under ${root} — synthesized in-memory profile (name=${slug})`);
}

// Explicit extract (D3): `graphify extract <root> --code-only --no-cluster`.
if (extract) {
  const resolved = resolveGraphifyBinary();
  if (!resolved.present) {
    console.error(
      `GRAPHIFY_NOT_WARM:binary-absent — the graphify CLI is missing (GRAPHIFY_BIN unset, no uv tool path, not on PATH). Remedy: install graphifyy (uv tool install graphifyy) or set GRAPHIFY_BIN. Session fallback: the indexer-fallback leg with its named token.`,
    );
    process.exit(3);
  }
  console.log(`[graphify-build] extract: ${resolved.bin} extract ${root} --code-only --no-cluster (source=${resolved.source})`);
  const res = spawnSync(resolved.bin, ["extract", root, "--code-only", "--no-cluster"], {
    cwd: root,
    // NIGHT-GI: 120s was too tight under load (03:35 run died exit 4); env-tunable, default 10 min.
    timeout: Number(process.env.GRAPHIFY_EXTRACT_TIMEOUT_MS) || 600_000,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, HOME: process.env.HOME ?? os.homedir() },
  });
  const tail = String(res.stderr ?? res.stdout ?? "").slice(-2000);
  if (res.status !== 0) {
    const why = res.error ? `${(res.error as Error).message}` : res.signal ? `signal=${res.signal}` : `status=${res.status}`;
    console.error(`GRAPHIFY_EXTRACT_FAILED (${why}): ${tail}`);
    process.exit(4);
  }
  console.log(`[graphify-build] extract done (status=${res.status}): ${tail.split("\n").filter(Boolean).slice(-3).join(" | ")}`);
}

const adapter = new GraphifyAdapter(profile);
const rawBuild = await adapter.build(profile);
// P1.6 (W4 gi-scoping): store ONLY scoped rows — the raw extract scans the
// whole root; Checkpoints/Ship_Packages/reports/tests never reach the store.
const scopeDirs = profile.graph?.scope ?? ["src"];
const { nodes: scopedNodes, edges: scopedEdges, dropped } = scopeBuildToProfile(rawBuild.nodes, rawBuild.edges, root, scopeDirs);
console.log(`[graphify-build] scope filter: kept ${scopedNodes.length}/${rawBuild.nodes.length} nodes, dropped ${dropped} out-of-scope rows (scope=${scopeDirs.join(",")})`);
const build = { ...rawBuild, nodes: scopedNodes, edges: scopedEdges };
const { nodeRows, edgeRows } = mapGraphifyToTyped(build.nodes, build.edges, `graphify-build-${Date.now().toString(36)}`);

const checkoutDir = path.join(root, ".omp", "graph-intelligence", "graphify-checkout");
fs.mkdirSync(checkoutDir, { recursive: true });
const storePath = path.join(checkoutDir, "store.sqlite");
const written = writeGraphifyCheckout(storePath, nodeRows, edgeRows, {
  runTag: `graphify-build-${Date.now().toString(36)}`,
});

const wallMs = Date.now() - t0;
const kinds = new Map<string, number>();
for (const n of build.nodes) kinds.set(n.kind, (kinds.get(n.kind) ?? 0) + 1);
const preds = new Map<string, number>();
for (const e of build.edges) preds.set(e.kind, (preds.get(e.kind) ?? 0) + 1);
console.log(`[graphify-build] target=${root}`);
console.log(`[graphify-build] adapter: nodes=${build.nodes.length} edges=${build.edges.length} durationMs=${build.durationMs} command=${build.command ?? "n/a"}`);
console.log(`[graphify-build] node kinds: ${[...kinds].map(([k, v]) => `${k}=${v}`).join(" ") || "(none)"}`);
console.log(`[graphify-build] edge kinds: ${[...preds].map(([k, v]) => `${k}=${v}`).join(" ") || "(none)"}`);
console.log(`[graphify-build] typed store: ${storePath} nodes=${written.storeNodes} edges=${written.storeEdges} run=${written.runTag}`);

// EN-041 CHICKEN-AND-EGG FIX: the build produced the graph, but the freshness
// probe compares a .graph_hash SIDECAR (written only by the populate path)
// against the current source fingerprint. Without a build-side mark the
// sequence is a deadlock: build -> sidecar stale -> populate refuses
// (GRAPHIFY_NOT_WARM:stale-content) -> the sidecar is never rewritten.
// The build therefore MARKS ITS OWN OUTPUT fresh, using the same hash function
// and the same sidecar path the probe reads. One reader, one writer, one truth.
try {
  const graphPath = graphifyOutPath(root, profile);
  const excludes = profile.graph?.exclude ?? [];
  const freshHash = computeSourceHashWithBudget(root, scopeDirs, excludes, 200_000);
  const sidecar = graphHashSidecarPath(graphPath);
  fs.writeFileSync(sidecar, freshHash, "utf8");
  console.log(`[graphify-build] marked fresh: ${sidecar} = ${freshHash.slice(0, 16)}… (scope=${scopeDirs.join(",")})`);
} catch (markErr) {
  console.log(`[graphify-build] WARN: could not mark the graph fresh — ${markErr instanceof Error ? markErr.message.slice(0, 100) : "?"}`);
}
console.log(`[graphify-build] wall=${((wallMs - build.durationMs) / 1000).toFixed(1)}s overhead + ${(build.durationMs / 1000).toFixed(1)}s build = ${(wallMs / 1000).toFixed(1)}s total`);
