import fs from "node:fs";

/** EN-38 load budget: 128 MiB. Refresh refuses before parse rather than crashing. */
export const GRAPH_LOAD_BUDGET_BYTES = 128 * 1024 * 1024;

export class GraphifyGraphTooLargeError extends Error {
  readonly code = "GRAPHIFY_GRAPH_TOO_LARGE" as const;

  constructor(size: number, budget: number, detail: string) {
    super(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${size} bytes (> ${budget} budget). ${detail}`);
    this.name = "GraphifyGraphTooLargeError";
  }
}

export interface LoadGraphOptions {
  budgetBytes?: number;
  read?: (graphPath: string) => string;
  parse?: (text: string) => unknown;
}

function defaultRead(graphPath: string): string {
  return fs.readFileSync(graphPath, "utf8");
}

function defaultParse(text: string): unknown {
  return JSON.parse(text) as unknown;
}

/**
 * Stat the graph, refuse over-budget files before they are read, then parse.
 * A file that grows past the budget between stat and read is refused the same way.
 */
export function loadGraphDocument(graphPath: string, options?: LoadGraphOptions): unknown {
  const budget = options?.budgetBytes ?? GRAPH_LOAD_BUDGET_BYTES;
  const read = options?.read ?? defaultRead;
  const parse = options?.parse ?? defaultParse;
  const size = fs.statSync(graphPath).size;
  if (size > budget) {
    throw new GraphifyGraphTooLargeError(
      size,
      budget,
      "Refresh refused before read. Fix: scope/extract a subtree or lower the graph cardinality.",
    );
  }
  const text = read(graphPath);
  const actual = Buffer.byteLength(text, "utf8");
  if (actual > budget) {
    throw new GraphifyGraphTooLargeError(
      actual,
      budget,
      "Refresh refused before parse. graph.json grew past the budget between stat and read.",
    );
  }
  try {
    return parse(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`GRAPHIFY_EXTRACT_FAILED: graph.json is not valid JSON (${msg})`);
  }
}
