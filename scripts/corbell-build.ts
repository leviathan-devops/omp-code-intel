#!/usr/bin/env bun
// OMP-NEW (no fork source file): corbell build CLI for inspection.
// Usage: bun scripts/corbell-build.ts --target <dir> [--rebuild]
// Runs the adapter build + store-map into
//   {target}/.omp/graph-intelligence/corbell-checkout/store.sqlite
// and prints real counts. NOTE: this path is an INSPECTION checkout, not a
// session store — openSessionStore/sessionStorePath MUST refuse it (it lacks
// /sessions/{sid}/), so the CLI writes via openTypedStore directly and never
// touches the registry. Session wiring lands in the next wave (populate).

import * as fs from "node:fs";
import * as path from "node:path";
import { CorbellAdapter } from "../src/hunter/graph/corbell-adapter.ts";
import { readCorbellNodeTypes, writeCorbellCheckout } from "../src/hunter/graph/store-map.ts";
import { loadProfile } from "../src/hunter/profile/loader.ts";
import type { ProjectProfile } from "../src/hunter/profile/schema.ts";

function usageFail(msg: string): never {
  console.error(`corbell-build: ${msg}\nusage: bun scripts/corbell-build.ts --target <dir> [--rebuild]`);
  process.exit(2);
}

const argv = process.argv.slice(2);
let target = "";
let rebuild = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--target") {
    target = argv[++i] ?? "";
  } else if (argv[i] === "--rebuild") {
    rebuild = true;
  } else {
    usageFail(`unknown arg ${argv[i]}`);
  }
}
if (!target) usageFail("--target <dir> is required");
const root = path.resolve(target);
if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
  usageFail(`target is not a directory: ${root}`);
}

// The profile: prefer an explicit profile file under the target; otherwise
// synthesize the minimal in-memory profile (the adapter only reads
// project.name/root/languages + graph.rebuild/excludes).
const t0 = Date.now();
let profile: ProjectProfile;
const candidateProfiles = ["profile.yaml", "profile.yml", "profile.json", ".omp/profile.yaml"].map((p) =>
  path.join(root, p),
);
const found = candidateProfiles.find((p) => fs.existsSync(p));
if (found) {
  profile = loadProfile(found);
  profile.project.root = root;
  (profile as unknown as { graph: { rebuild?: boolean } }).graph.rebuild = rebuild ? undefined : false;
  console.log(`[corbell-build] profile: ${found} (root pinned to ${root}, rebuild=${String(rebuild)})`);
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
    graph: { substrate: "corbell", scope: ["src"], excludes: [], ...(rebuild ? {} : { rebuild: false }) },
    rules: { corpus: [], bindings: {} },
    pipeline: { stages: [{ id: "s1", entry: "main", contract: "inspection-build" }] },
    history: { failureLogs: [] },
    awareness: { docs: [] },
  };
  console.log(`[corbell-build] no profile under ${root} — synthesized in-memory profile (name=${slug}, rebuild=${String(rebuild)})`);
}

const adapter = new CorbellAdapter(profile);
const build = await adapter.build(profile);
const corbellDb = path.join(root, "corbell-data", ".corbell", "workspace.db");
const nodeTypeById = fs.existsSync(corbellDb) ? readCorbellNodeTypes(corbellDb) : undefined;

const checkoutDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
fs.mkdirSync(checkoutDir, { recursive: true });
const storePath = path.join(checkoutDir, "store.sqlite");
const written = writeCorbellCheckout(storePath, build.nodes, build.edges, {
  runTag: `corbell-build-${Date.now().toString(36)}`,
  nodeTypeById,
});

const wallMs = Date.now() - t0;
const kinds = new Map<string, number>();
for (const n of build.nodes) kinds.set(n.kind, (kinds.get(n.kind) ?? 0) + 1);
const preds = new Map<string, number>();
for (const e of build.edges) preds.set(e.kind, (preds.get(e.kind) ?? 0) + 1);
console.log(`[corbell-build] target=${root}`);
console.log(`[corbell-build] adapter: nodes=${build.nodes.length} edges=${build.edges.length} durationMs=${build.durationMs} command=${build.command ?? "n/a"}`);
console.log(`[corbell-build] node kinds: ${[...kinds].map(([k, v]) => `${k}=${v}`).join(" ") || "(none)"}`);
console.log(`[corbell-build] edge kinds: ${[...preds].map(([k, v]) => `${k}=${v}`).join(" ") || "(none)"}`);
console.log(`[corbell-build] typed store: ${storePath} nodes=${written.storeNodes} edges=${written.storeEdges} run=${written.runTag}`);
console.log(`[corbell-build] wall=${((wallMs - build.durationMs) / 1000).toFixed(1)}s overhead + ${(build.durationMs / 1000).toFixed(1)}s build = ${(wallMs / 1000).toFixed(1)}s total`);
