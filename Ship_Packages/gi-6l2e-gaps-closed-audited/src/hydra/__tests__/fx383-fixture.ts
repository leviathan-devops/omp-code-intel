// THE HERMETIC FIXTURE — makes the hydra batteries self-contained.
//
// THE DEFECT THE CONTAINER FOUND (2026-09-21): reader-battery / settle-battery /
// pipeline-battery all READ `/tmp/fx383/graphify-out/graph.json` and NEVER
// created it. On the host they passed only because a leftover fixture from an
// earlier `graphify extract` happened to exist in /tmp. In a fresh container
// (or any clean host) the same suites fail with
//   GRAPHIFY_NOT_WARM: graph.json not found at /tmp/fx383/graphify-out/graph.json
// — 9 fails + 3 errors, while the host reported 199/0.
//
// A test that depends on a pre-existing artifact outside the repo is not a test;
// it is a coincidence with a green readout. This module PROVISIONS the fixture
// (idempotently) so the suites verify the CODE, not the machine's leftovers.
//
// The content is the authoritative corpus the assertions name:
//   "regen 2026-09-16: 4 nodes/5 edges, spine intact"
//   nodes: alpha · alpha_alpha · beta · beta_beta
//   spine: beta --imports_from--> alpha · beta_beta --calls--> alpha_alpha
import fs from "node:fs";
import path from "node:path";

export const FX383_ROOT = process.env["GI_FX383_ROOT"] ?? "/tmp/fx383";
export const FX383_GRAPH = path.join(FX383_ROOT, "graphify-out", "graph.json");

const FIXTURE = {
  nodes: [
    { id: "alpha", label: "alpha()", kind: "function", source_file: "alpha.ts", source_location: "L1" },
    { id: "alpha_alpha", label: "alpha_alpha()", kind: "function", source_file: "alpha.ts", source_location: "L9" },
    { id: "beta", label: "beta()", kind: "function", source_file: "beta.ts", source_location: "L1" },
    { id: "beta_beta", label: "beta_beta()", kind: "function", source_file: "beta.ts", source_location: "L9" },
  ],
  edges: [
    { source: "alpha", target: "alpha_alpha", relation: "contains" },
    { source: "beta", target: "alpha", relation: "imports_from" },
    { source: "beta", target: "alpha_alpha", relation: "imports" },
    { source: "beta", target: "beta_beta", relation: "contains" },
    { source: "beta_beta", target: "alpha_alpha", relation: "calls" },
  ],
  hyperedges: [],
  input_tokens: 0,
  output_tokens: 0,
};

/** Idempotent: writes the fixture only when it is absent or unreadable. */
export function ensureFx383(): string {
  const dir = path.dirname(FX383_GRAPH);
  let ok = false;
  try {
    const raw = fs.readFileSync(FX383_GRAPH, "utf8");
    const parsed = JSON.parse(raw) as { nodes?: unknown[]; edges?: unknown[] };
    ok = (parsed.nodes?.length ?? 0) === 4 && (parsed.edges?.length ?? 0) === 5;
  } catch {
    ok = false;
  }
  if (ok) return FX383_GRAPH;
  fs.mkdirSync(path.join(dir, "cache"), { recursive: true });
  fs.writeFileSync(FX383_GRAPH, JSON.stringify(FIXTURE, null, 2), "utf8");
  fs.writeFileSync(path.join(dir, "..", ".graphify_root"), `${FX383_ROOT}\n`, "utf8");
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    JSON.stringify({ version: 1, nodes: 4, edges: 5, regenerated: new Date().toISOString(), hermetic: true }, null, 2),
    "utf8",
  );
  return FX383_GRAPH;
}
