import fs from "node:fs";
import path from "node:path";
import { loadGraphDocument, type LoadGraphOptions } from "./budget";
import { isGraphifyIgnored, loadIgnoreFile } from "./graphify-ignore";

export interface RefreshInputs {
  kept: string[];
  ignored: string[];
}

export interface RefreshResult extends RefreshInputs {
  nodes: number;
  edges: number;
  graphPath: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/** Walk `root`, recording files that .graphifyignore keeps out of the refresh. */
export function listRefreshInputs(root: string): RefreshInputs {
  const rules = loadIgnoreFile(root);
  const kept: string[] = [];
  const ignored: string[] = [];

  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isSymbolicLink()) {
        ignored.push(path.relative(root, path.join(dir, ent.name)).split(path.sep).join("/"));
        continue;
      }
      const abs = path.join(dir, ent.name);
      const rel = path.relative(root, abs).split(path.sep).join("/");
      if (isGraphifyIgnored(rel, rules)) {
        ignored.push(rel);
        continue;
      }
      if (ent.isDirectory()) {
        walk(abs);
        continue;
      }
      if (ent.isFile()) kept.push(rel);
    }
  };

  walk(root);
  kept.sort();
  ignored.sort();
  return { kept, ignored };
}

/**
 * Refresh reads graphify-out/graph.json after applying .graphifyignore to inputs.
 * Over-budget graphs throw GraphifyGraphTooLargeError and are not parsed.
 */
export function refreshGraphify(root: string, options?: LoadGraphOptions): RefreshResult {
  const inputs = listRefreshInputs(root);
  const graphPath = path.join(root, "graphify-out", "graph.json");
  if (!fs.existsSync(graphPath)) {
    throw new Error(`GRAPHIFY_NOT_WARM: graph.json missing at ${graphPath}`);
  }
  const doc = asRecord(loadGraphDocument(graphPath, options));
  const nodes = doc && Array.isArray(doc.nodes) ? doc.nodes.length : 0;
  const edges = doc && Array.isArray(doc.edges) ? doc.edges.length : 0;
  return { ...inputs, nodes, edges, graphPath };
}
