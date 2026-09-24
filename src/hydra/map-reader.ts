// PORTED FROM v443-en38-graphify-oom-fixed/src/hydra/graph-mapper.ts:12-38 (EN-38 budgets + parseGraphJson) + :40-87 (normalizeGraph) + :183-270 (query/path/explain local fallbacks)
// OMP SEAM ADAPTATION (D1/D3): the CLI extract leg (graph-mapper.ts:97-181, execFile GRAPHIFY_BIN,
// 120s timeout, scope/exclude filter) is NOT ported — extraction stays explicit-operator-side
// (scripts/graphify-build.ts per D3; the machine never blocks a query on a minutes-long extract).
// This reader owns ONLY the guarded graph.json read + the local token-scan/BFS fallbacks that the
// fork runs when MCP is down (query :198-204, path :217-250, explain :263-270) — those fallbacks ARE
// the machine path. EN-38 guards travel WITH it: 128MB stat-size budget + 8MB yield, loud never OOM.
// LAW: every fallback prints token+reason+remedy (console.error) — silent substitute is banned.

import fs from "node:fs";
import path from "node:path";
import type { GraphifyClientReader } from "./client-reader.ts";

export interface GraphifyNode {
  id: string;
  label: string;
  type: string;
  file: string;
  data?: Record<string, unknown>;
}

export interface GraphifyEdge {
  src: string;
  dst: string;
  relation: string;
  confidence: "EXTRACTED" | "INFERRED";
}

export interface Community {
  id: string;
  label: string;
  members: string[];
  size: number;
}

export interface GraphifyGraph {
  nodes: GraphifyNode[];
  edges: GraphifyEdge[];
  communities: Community[];
  godNodes: string[];
}

export interface Subgraph {
  nodes: GraphifyNode[];
  edges: GraphifyEdge[];
  query: string;
}

export interface Path {
  from: string;
  to: string;
  hops: readonly string[];
  length: number;
}

export interface NodeDetail {
  id: string;
  label: string;
  type: string;
  file: string;
  degree: number;
  community?: string;
  connections: string[];
  data?: Record<string, unknown>;
}

// EN-38 (fork graph-mapper.ts:12-25): the RAM-safe graph load budget. Prior code did
// JSON.parse(readFileSync(graph.json)) — synchronous whole-file materialization that OOM'd
// the process on the session-open path. The bound (stat-size guard BEFORE parse + yield
// above the floor) is what stops the OOM — oversize fails loud, never blows the process.
export const GRAPH_LOAD_BUDGET_BYTES = 128 * 1024 * 1024;
export const GRAPH_PARSE_YIELD_BYTES = 8 * 1024 * 1024;

function parseGraphJson(contents: string, size: number): Record<string, unknown> {
  const byteLen = size > 0 ? size : Buffer.byteLength(contents, "utf-8");
  if (byteLen > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${byteLen} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`);
  }
  // ★ F-404 FIX (2026-09-24): heap-expansion guard — a 128MB file with deeply nested
  //   objects can expand to gigabytes during JSON.parse. The byte budget guards file
  //   size on disk but not in-memory expansion. A linear pre-scan of nesting depth
  //   is cheap (single pass over the byte string, no allocation) and catches the
  //   adversarial expansion class before parse begins.
  // ★ F-753 FIX (2026-09-24, run-10): the scan counted braces INSIDE STRING LITERALS —
  //   `{"data": "a } b"}` decremented on a brace that is DATA, so the depth drifted and a
  //   legitimate payload could be refused (or an adversarial one under-counted). A
  //   string-aware single pass: track the in-string state and honour backslash escapes.
  let maxDepth = 0;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < contents.length; i++) {
    const c = contents.charCodeAt(i);
    if (inString) {
      if (escaped) { escaped = false; continue; }
      if (c === 0x5C /* \ */) { escaped = true; continue; }
      if (c === 0x22 /* " */) inString = false;
      continue;
    }
    if (c === 0x22 /* " */) { inString = true; continue; }
    if (c === 0x7B /* { */ || c === 0x5B /* [ */) { depth++; if (depth > maxDepth) maxDepth = depth; }
    else if (c === 0x7D /* } */ || c === 0x5D /* ] */) depth--;
  }
  if (maxDepth > 64) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_DEEP: graph.json nesting depth ${maxDepth} (> 64) — likely adversarial or corrupted payload`);
  }
  return JSON.parse(contents) as Record<string, unknown>;
}

export function normalizeGraph(raw: Record<string, unknown>): GraphifyGraph {
  const rawNodes = (raw["nodes"] as unknown[]) ?? [];
  const rawLinks = ((raw["links"] as unknown[]) ?? (raw["edges"] as unknown[]) ?? []) as unknown[];
  // ★ F-403 FIX (2026-09-24): validate array elements before property access — non-object
  //   elements (null, numbers, strings, arrays) silently produce empty-string IDs via
  //   String(undefined), creating phantom nodes/edges that are hard to trace to graph.json.
  for (const [i, n] of rawNodes.entries()) {
    if (n === null || typeof n !== 'object' || Array.isArray(n)) {
      throw new Error(`GRAPHIFY_PARSE_INVALID: nodes[${i}] is not an object — got ${typeof n}`);
    }
  }
  const rawLinksValidated = rawLinks.map((e, i) => {
    if (e === null || typeof e !== 'object' || Array.isArray(e)) {
      throw new Error(`GRAPHIFY_PARSE_INVALID: edges[${i}] is not an object — got ${typeof e}`);
    }
    return e as Record<string, unknown>;
  });
  const nodes: GraphifyNode[] = rawNodes.map((n) => {
    const r = n as Record<string, unknown>;
    return {
      id: String(r["id"] ?? r["label"] ?? ""),
      label: String(r["label"] ?? r["id"] ?? ""),
      type: String(r["file_type"] ?? r["type"] ?? "unknown"),
      file: String(r["source_file"] ?? r["file"] ?? ""),
      data: r as Record<string, unknown>,
    };
  });
  const edges: GraphifyEdge[] = rawLinksValidated.map((e) => {
    const rawConf = String(e["confidence"] ?? "EXTRACTED");
    return {
      src: String(e["source"] ?? e["src"] ?? ""),
      dst: String(e["target"] ?? e["dst"] ?? ""),
      relation: String(e["relation"] ?? "references"),
      confidence: rawConf === "INFERRED" ? "INFERRED" : "EXTRACTED",
    };
  });
  const communityMap = new Map<number, string[]>();
  // rawNodes are already validated as objects above
  for (const n of rawNodes as Record<string, unknown>[]) {
    if (typeof n["community"] === "number") {
      const arr = communityMap.get(n["community"] as number) ?? [];
      arr.push(String(n["id"] ?? ""));
      communityMap.set(n["community"] as number, arr);
    }
  }
  const communities: Community[] = [];
  for (const [cid, members] of communityMap.entries()) {
    communities.push({ id: String(cid), label: `Community ${cid}`, members, size: members.length });
  }
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
    degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
  }
  const godNodes = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  return { nodes, edges, communities, godNodes };
}

/**
 * Guarded graph.json reader (fork extract :139-154, CLI spawn REMOVED per D3).
 * Reads an operator-built graph.json via the EN-38 guarded path. Missing file is
 * GRAPHIFY_NOT_WARM (D3 named remedy: run the explicit build script), never a throw
 * past the tool boundary — the caller maps it to the degraded audit path.
 */
export async function readGraphJson(graphPath: string): Promise<GraphifyGraph> {
  if (typeof graphPath !== "string" || graphPath.trim() === "") {
    throw new Error("GRAPHIFY_CONNECT_INVALID: graphPath must be non-empty string");
  }
  const resolved = path.resolve(graphPath);
  let stat: fs.Stats;
  try {
    // ★ F-335 FIX (2026-09-24): async contract honored — statSync blocked the event
    // ★ loop inside an async fn; promises.stat yields like the read below.
    stat = await fs.promises.stat(resolved);
  } catch {
    throw new Error(`GRAPHIFY_NOT_WARM: graph.json not found at ${resolved} — remedy: run the explicit graphify build for this target, then re-run the audit`);
  }
  const gSize = Number.isFinite(stat.size) && stat.size > 0 ? stat.size : Number.MAX_SAFE_INTEGER;
  if (gSize > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${gSize} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower graph cardinality.`);
  }
  if (gSize > GRAPH_PARSE_YIELD_BYTES) {
    await new Promise<void>((res) => setImmediate(() => res()));
  }
  let raw: Record<string, unknown>;
  try {
    raw = parseGraphJson(await fs.promises.readFile(resolved, "utf-8"), gSize);
  } catch (err) {
    const msg = String((err as Error).message ?? err);
    if (msg.includes("GRAPHIFY_GRAPH_TOO_LARGE")) throw err;
    throw new Error(`GRAPHIFY_EXTRACT_FAILED: graph.json parse failed — ${msg}`);
  }
  return normalizeGraph(raw);
}

function tokenScan(graph: GraphifyGraph, question: string): Subgraph {
  const toks = question.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const matched = graph.nodes.filter((n) =>
    toks.some((tok) => n.label.toLowerCase().includes(tok) || n.id.toLowerCase().includes(tok) || n.file.toLowerCase().includes(tok)),
  );
  const relatedEdges = graph.edges.filter((e) => matched.some((m) => m.id === e.src || m.id === e.dst));
  return matched.length > 0
    ? { nodes: matched, edges: relatedEdges, query: question }
    : { nodes: graph.nodes.slice(0, 5), edges: [], query: question };
}

/**
 * Mapper: MCP-first, local-fallback (fork query/path/explain :183-270). Every MCP
 * failure prints token+reason+remedy then falls back — the fork's console.error
 * law, kept verbatim in spirit. Local legs are pure functions of the graph.
 */
export class GraphifyMapReader {
  private mcp: GraphifyClientReader | null;
  private lastGraphPath: string | null = null;

  constructor(mcp?: GraphifyClientReader | null) {
    this.mcp = mcp ?? null;
  }

  async load(graphPath: string): Promise<GraphifyGraph> {
    const g = await readGraphJson(graphPath);
    this.lastGraphPath = path.resolve(graphPath);
    return g;
  }

  async query(graph: GraphifyGraph, question: string): Promise<Subgraph> {
    if (!graph || !Array.isArray(graph.nodes)) throw new Error("GRAPHIFY_QUERY_INVALID: graph required");
    if (typeof question !== "string" || question.trim() === "") throw new Error("GRAPHIFY_QUERY_INVALID: question must be non-empty");
    if (this.mcp?.isConnected()) {
      try {
        // ★ F-140 FIX (2026-09-24): the MCP leg is a connectivity probe — the
        //   ranked result IS the local token scan (single implementation; the old
        //   inline duplicate had drifted and dropped the n.file match leg).
        void String(await this.mcp.callTool("query_graph", { question }));
        return tokenScan(graph, question);
      } catch (e) {
        console.error("[map-reader] MCP query_graph failed (falling back to local scan) token=GRAPHIFY_MCP_FALLBACK reason=" + (e instanceof Error ? e.message : String(e)) + " remedy=local token-scan over loaded graph");
      }
    }
    return tokenScan(graph, question);
  }

  async path(graph: GraphifyGraph, from: string, to: string): Promise<Path> {
    if (!graph || !Array.isArray(graph.nodes)) throw new Error("GRAPHIFY_PATH_INVALID: graph required");
    if (typeof from !== "string" || from.trim() === "" || typeof to !== "string" || to.trim() === "") {
      throw new Error("GRAPHIFY_PATH_INVALID: from and to must be non-empty");
    }
    if (this.mcp?.isConnected()) {
      try {
        void String(await this.mcp.callTool("shortest_path", { source: from, target: to }));
      } catch (e) {
        console.error("[map-reader] MCP shortest_path failed (falling back to local BFS) token=GRAPHIFY_MCP_FALLBACK reason=" + (e instanceof Error ? e.message : String(e)) + " remedy=local BFS over loaded graph");
      }
    }
    const low = (q: string) => q.toLowerCase();
    const fromId = graph.nodes.find((n) => n.label.toLowerCase().includes(low(from)) || n.id.toLowerCase() === low(from))?.id ?? null;
    const toId = graph.nodes.find((n) => n.label.toLowerCase().includes(low(to)) || n.id.toLowerCase() === low(to))?.id ?? null;
    if (!fromId || !toId) return { from, to, hops: [], length: 0 };
    const adj = new Map<string, string[]>();
    for (const e of graph.edges) {
      adj.set(e.src, [...(adj.get(e.src) ?? []), e.dst]);
      adj.set(e.dst, [...(adj.get(e.dst) ?? []), e.src]);
    }
    // ★ F-334 FIX (2026-09-24): index-pointer queue + parent-pointer reconstruction.
    // ★ queue.shift() is O(n) per dequeue and [...cur, nb] copied the whole path per
    // ★ expansion (O(V×E×L)). Head-index dequeue is O(1); each node stores one parent
    // ★ link, so the path rebuilds once at hit instead of on every expansion.
    const visited = new Set<string>([fromId]);
    const parent = new Map<string, string | null>([[fromId, null]]);
    const queue: string[] = [fromId];
    let head = 0;
    while (head < queue.length) {
      const last = queue[head++]!;
      if (last === toId) {
        const rev: string[] = [];
        let cur: string | null = toId;
        while (cur !== null) { rev.push(cur); cur = parent.get(cur) ?? null; }
        rev.reverse();
        return { from, to, hops: rev, length: rev.length - 1 };
      }
      for (const nb of adj.get(last) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb);
          parent.set(nb, last);
          queue.push(nb);
        }
      }
    }
    return { from, to, hops: [], length: 0 };
  }

  async explain(graph: GraphifyGraph, concept: string): Promise<NodeDetail> {
    if (!graph || !Array.isArray(graph.nodes)) throw new Error("GRAPHIFY_EXPLAIN_INVALID: graph required");
    if (typeof concept !== "string" || concept.trim() === "") throw new Error("GRAPHIFY_EXPLAIN_INVALID: concept must be non-empty");
    if (this.mcp?.isConnected()) {
      try {
        void String(await this.mcp.callTool("get_node", { label: concept }));
      } catch (e) {
        console.error("[map-reader] MCP get_node failed (falling back to local scan) token=GRAPHIFY_MCP_FALLBACK reason=" + (e instanceof Error ? e.message : String(e)) + " remedy=local scan over loaded graph");
      }
    }
    const low = concept.toLowerCase();
    const node = graph.nodes.find((n) => n.label.toLowerCase().includes(low) || n.id.toLowerCase() === low);
    if (!node) throw new Error(`GRAPHIFY_EXPLAIN_NOT_FOUND: no node matching "${concept}"`);
    const connections = graph.edges.filter((e) => e.src === node.id || e.dst === node.id).map((e) => (e.src === node.id ? e.dst : e.src));
    return {
      id: node.id, label: node.label, type: node.type, file: node.file,
      degree: connections.length,
      community: graph.communities.find((c) => c.members.includes(node.id))?.id,
      connections, data: node.data,
    };
  }

  async merge(slices: object[]): Promise<GraphifyGraph> {
    if (!Array.isArray(slices)) throw new Error("GRAPHIFY_MERGE_INVALID: slices must be array");
    const nodeMap = new Map<string, GraphifyNode>();
    const edgeSet = new Set<string>();
    const edges: GraphifyEdge[] = [];
    const communityMap = new Map<string, Community>();
    for (const s of slices) {
      if (!s || typeof s !== "object") continue;
      const g = s as Partial<GraphifyGraph>;
      for (const n of g.nodes ?? []) {
        if (n && typeof n.id === "string" && !nodeMap.has(n.id)) nodeMap.set(n.id, n);
      }
      for (const e of g.edges ?? []) {
        if (!e || typeof e.src !== "string") continue;
        const key = `${e.src}→${e.dst}:${e.relation}`;
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push(e);
        }
      }
      for (const c of g.communities ?? []) {
        if (c && typeof c.id === "string" && !communityMap.has(c.id)) communityMap.set(c.id, c);
      }
    }
    const nodes = [...nodeMap.values()];
    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
      degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
    }
    return {
      nodes, edges,
      communities: [...communityMap.values()],
      godNodes: [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id),
    };
  }

  getLastGraphPath(): string | null {
    return this.lastGraphPath;
  }
}
