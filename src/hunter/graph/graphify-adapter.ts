// PORTED FROM /home/leviathan/aether/src/hydra/graph-mapper.ts:1-318 (normalizeGraph + EN-38 guarded graph.json load) + /home/leviathan/aether/src/hydra/types.ts:102-148 (GraphMapper/GraphifyGraph/Node/Edge shapes) + /home/leviathan/aether/src/hydra/corbell-bridge.ts:14-32 (NODE_TYPE_MAP/EDGE_PREDICATE_MAP) + fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/graph/corbell-adapter.ts:271-900 (GraphAdapter query surface + dangling-edge filter).
// src/hunter/graph/graphify-adapter.ts
// THE GRAPHIFY READ PATH (W1) — the thin shell over the graphifyy CLI output.
// D1 local-scan reader: the machine reads graph.json directly through the
// guarded loader (EN-38 class: 128MB budget + 8MB yield, shared with
// typed-write.ts). The serve lifecycle belongs to the operator's shell — this
// file owns no child process and opens no socket.
//
// KIND MAP (typed level, fork corbell-bridge.ts:14-32 verbatim semantics):
//   file->File, function/method->Function, class->Class, module->Module,
//   import->Module.
// PREDICATE MAP (typed level, fork corbell-bridge.ts:25-32 + fixture
// extensions contains->declares, imports_from->imports):
//   calls->calls, imports->imports, inherits->implements, uses->wraps,
//   references->declares, returns->shouldBe.
// Adapter-level GraphNodeKind/GraphEdgeKind are the lowercase union-safe
// projection (method collapses to function; uses->wires, references->
// traces-to, returns->constrains, contains->wires); the typed projection
// recovers the exact fork predicates (wires->wraps, traces-to->declares,
// constrains->shouldBe), so the two stages round-trip.
//
// LINELESS PASSTHROUGH (HunterSeamLock contract): build() NEVER synthesizes a
// line — a node with no line anywhere keeps line undefined so the hunter
// map-branch LINELESS_NODE can fire downstream. resolveGraphifyLine() is the
// loud helper: node line ?? data.line ?? data.line_start ?? data.line_end ??
// node/edge source_location L-number, else it throws the named LINELESS_NODE.

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { tridentLog } from "../log.ts";
import {
  GRAPH_LOAD_BUDGET_BYTES,
  GRAPH_PARSE_YIELD_BYTES,
  parseGraphJsonGuarded,
} from "../../omp/typed-write.ts";
import type {
  AwaitEdge,
  BuildResult,
  CallSite,
  ChainStep,
  DeadNode,
  GraphAdapter,
  GraphEdge,
  GraphEdgeKind,
  GraphNode,
  GraphNodeKind,
  ImportEdge,
} from "./interface.ts";
import { adapterFailed, adapterParseError, graphEmpty } from "./interface.ts";
import type { ProjectProfile } from "../profile/schema.ts";
import type { ForkEdge, ForkNode } from "../../omp/typed-write.ts";

// ---------------------------------------------------------------------------
// GraphifyGraph (fork types.ts:121-148, trimmed to what scan/trace read)
// ---------------------------------------------------------------------------

export interface GraphifyNode {
  readonly id: string;
  readonly label: string;
  readonly type: string;
  readonly file: string;
  readonly data?: Record<string, unknown>;
}

export interface GraphifyEdge {
  readonly src: string;
  readonly dst: string;
  readonly relation: string;
  readonly confidence: "EXTRACTED" | "INFERRED";
}

export interface GraphifyCommunity {
  readonly id: string;
  readonly label: string;
  readonly members: string[];
  readonly size: number;
}

export interface GraphifyGraph {
  readonly nodes: GraphifyNode[];
  readonly edges: GraphifyEdge[];
  readonly communities: GraphifyCommunity[];
  readonly godNodes: string[];
}

// ---------------------------------------------------------------------------
// Binary + out-path resolution (pure fs probes — never throws)
// ---------------------------------------------------------------------------

export const GRAPHIFY_BIN_ENV = "GRAPHIFY_BIN";
export const GRAPHIFY_OUT_ENV = "GRAPHIFY_OUT";
export const GRAPHIFY_OUT_DEFAULT = "graphify-out/graph.json";
export const GRAPHIFY_UV_CANDIDATE = ".local/share/uv/tools/graphifyy/bin/graphify";


export interface GraphifyBinary {
  present: boolean;
  bin: string;
  source: "env" | "uv" | "path" | "absent";
}

/** Resolve the graphify CLI: GRAPHIFY_BIN env -> uv tool path -> PATH walk -> absent-hermetic {present:false}. NEVER throws. */
export function resolveGraphifyBinary(
  env: NodeJS.ProcessEnv = process.env,
  uvCandidates: string[] = [path.join(os.homedir(), GRAPHIFY_UV_CANDIDATE)],
): GraphifyBinary {
  const fromEnv = env[GRAPHIFY_BIN_ENV];
  if (typeof fromEnv === "string" && fromEnv.length > 0 && fs.existsSync(fromEnv)) {
    return { present: true, bin: fromEnv, source: "env" };
  }
  for (const candidate of uvCandidates) {
    if (candidate.length > 0 && fs.existsSync(candidate)) return { present: true, bin: candidate, source: "uv" };
  }
  const pathEnv = env.PATH ?? process.env.PATH ?? "";
  for (const dir of pathEnv.split(":")) {
    if (!dir) continue;
    const cand = path.join(dir, "graphify");
    if (fs.existsSync(cand)) return { present: true, bin: cand, source: "path" };
  }
  return { present: false, bin: "", source: "absent" };
}

/** Resolve the graph.json path: explicit override > profile.graph.graphifyOut
 *  (absolute or root-relative) > GRAPHIFY_OUT env > <root>/graphify-out/graph.json. */
export function resolveGraphifyOut(
  profile?: Pick<ProjectProfile, "project"> & { graph?: { graphifyOut?: string } },
  override?: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const root = profile?.project.root ? path.resolve(profile.project.root) : process.cwd();
  const pick = (typeof override === "string" && override.length > 0)
    ? override
    : (typeof profile?.graph?.graphifyOut === "string" && (profile.graph.graphifyOut as string).length > 0)
      ? (profile.graph.graphifyOut as string)
      : (typeof env[GRAPHIFY_OUT_ENV] === "string" && (env[GRAPHIFY_OUT_ENV] as string).length > 0)
        ? (env[GRAPHIFY_OUT_ENV] as string)
        : GRAPHIFY_OUT_DEFAULT;
  return path.isAbsolute(pick) ? pick : path.resolve(root, pick);
}

// ---------------------------------------------------------------------------
// Guarded graph.json load (EN-38 class, shared budgets with typed-write.ts)
// ---------------------------------------------------------------------------

/** Sync guarded read + normalize (for files <= the yield floor call directly;
 *  larger files: yield first — see GraphifyAdapter.build). */
export function loadGraphifyFileSync(graphPath: string): GraphifyGraph {
  let size = 0;
  try {
    size = fs.statSync(graphPath).size;
  } catch {
    throw new Error(
      `GRAPHIFY_NOT_WARM:no-graph at ${graphPath} (rebuild with: bun scripts/graphify-build.ts --target '${path.dirname(path.dirname(graphPath))}')`,
    );
  }
  if (size === 0) throw graphEmpty(`graphify graph.json is empty (0 bytes at ${graphPath})`);
  if (size > GRAPH_LOAD_BUDGET_BYTES) {
    throw new Error(
      `GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${size} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`,
    );
  }
  let raw: Record<string, unknown>;
  try {
    raw = parseGraphJsonGuarded(fs.readFileSync(graphPath, "utf8"), size);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("GRAPHIFY_GRAPH_TOO_LARGE")) throw e;
    throw new Error(`GRAPHIFY_EXTRACT_FAILED: graph.json parse failed — ${e instanceof Error ? e.message : String(e)}`);
  }
  return normalizeGraphifyGraph(raw);
}

/** Fork graph-mapper.ts:40-87 normalizeGraph (links|edges tolerant). */
export function normalizeGraphifyGraph(raw: Record<string, unknown>): GraphifyGraph {
  const rawNodes = (raw["nodes"] as unknown[]) ?? [];
  const rawLinks = ((raw["links"] as unknown[]) ?? (raw["edges"] as unknown[]) ?? []) as Record<string, unknown>[];
  const nodes: GraphifyNode[] = rawNodes.map((n) => {
    const r = n as Record<string, unknown>;
    return {
      id: String(r["id"] ?? r["label"] ?? ""),
      label: String(r["label"] ?? r["id"] ?? ""),
      type: String(r["file_type"] ?? r["type"] ?? "unknown"),
      file: String(r["source_file"] ?? r["file"] ?? ""),
      data: r,
    };
  });
  const edges: GraphifyEdge[] = rawLinks.map((e) => {
    const src = String(e["source"] ?? e["src"] ?? "");
    const dst = String(e["target"] ?? e["dst"] ?? "");
    const relation = String(e["relation"] ?? "references");
    const rawConf = String(e["confidence"] ?? "EXTRACTED");
    return { src, dst, relation, confidence: rawConf === "INFERRED" ? "INFERRED" : "EXTRACTED" };
  });
  const communityMap = new Map<number, string[]>();
  for (const n of rawNodes as Record<string, unknown>[]) {
    const cid = n["community"];
    if (typeof cid === "number") {
      const arr = communityMap.get(cid) ?? [];
      arr.push(String(n["id"] ?? ""));
      communityMap.set(cid, arr);
    }
  }
  const communities: GraphifyCommunity[] = [];
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

// ---------------------------------------------------------------------------
// Kind / predicate maps
// ---------------------------------------------------------------------------

const KNOWN_NODE_KINDS: readonly GraphNodeKind[] = ["class", "function", "method", "module", "stage", "rule", "file"];

/** Raw graphify type -> union-safe GraphNodeKind. method collapses to function
 *  (the typed level spells it Function); file-ish fallback is file (the
 *  corbell normalizeRowKind posture). The generic "code" file_type the CLI
 *  emits is inferred from _callable/label shape. */
export function graphifyKindToNodeKind(rawType: string, node?: Pick<GraphifyNode, "label" | "file" | "data">): GraphNodeKind {
  const key = String(rawType ?? "").toLowerCase().trim();
  switch (key) {
    case "file": return "file";
    case "function": return "function";
    case "method": return "function";
    case "class": return "class";
    case "module": return "module";
    case "import": return "module";
    case "interface":
    case "property": return "class";
    case "service":
    case "datastore":
    case "queue": return "module";
    case "flow": return "function";
    default: break;
  }
  if (key !== "code" && key !== "" && key !== "unknown") {
    if ((KNOWN_NODE_KINDS as readonly string[]).includes(key)) return key as GraphNodeKind;
  }
  // "code" inference: callables are functions, file-named labels are files.
  const data = (node?.data ?? {}) as Record<string, unknown>;
  if (data["_callable"] === true) return "function";
  const label = String(node?.label ?? "");
  if (/\(\)$/.test(label) || /^(function|method|def)\s+/i.test(label)) return "function";
  if (/\.(ts|js|mjs|cjs|tsx|jsx|py|json|yaml|yml|md|toml)$/i.test(label)) return "file";
  const file = String(node?.file ?? "");
  if (label.length > 0 && file.length > 0 && file.endsWith(label)) return "file";
  return "file";
}

/** Raw relation -> union-safe GraphEdgeKind (typed predicates recovered later). */
export function graphifyRelationToEdgeKind(relation: string): GraphEdgeKind {
  const key = String(relation ?? "").toLowerCase().trim();
  switch (key) {
    case "calls":
    case "call": return "calls";
    case "imports":
    case "imports_from":
    case "import": return "imports";
    case "inherits":
    case "implements": return "implements";
    case "extends": return "extends";
    case "uses":
    case "wires": return "wires";
    case "contains":
    case "references":
    case "traces-to":
    case "traces_to": return "traces-to";
    case "constrains": return "constrains";
    case "awaits":
    case "await": return "awaits";
    default:
      tridentLog("DEBUG", "graphify-adapter", `unknown edge relation '${relation}' -> 'traces-to' (the fallback)`);
      return "traces-to";
  }
}

/** GraphNodeKind -> typed-store kind (fork corbell-bridge.ts:14-23 verbatim + W1 extensions). */
export function graphifyKindToTyped(kind: GraphNodeKind): string {
  switch (kind) {
    case "file":
      return "File";
    case "function":
    case "method":
      return "Function";
    case "class":
    case "rule":
      return "Class";
    case "module":
    case "stage":
      return "Module";
    default:
      return "EvidenceFile";
  }
}

/** Relation-or-normalized-kind -> typed predicate (fork bridge + fixture
 *  extensions; idempotent over both vocabularies like corbellEdgeToPredicate). */
export function graphifyPredicateToTyped(relation: string): string {
  const key = String(relation ?? "").toLowerCase().trim();
  switch (key) {
    case "calls":
    case "call": return "calls";
    case "imports":
    case "imports_from":
    case "import": return "imports";
    case "inherits":
    case "implements": return "implements";
    case "uses":
    case "wires": return "wraps";
    case "references":
    case "traces-to":
    case "traces_to":
    case "contains": return "declares";
    case "returns":
    case "constrains":
    case "shouldbe":
    case "should-be": return "shouldBe";
    case "awaits":
    case "await": return "awaits";
    case "extends": return "implements";
    default: return "declares";
  }
}

// ---------------------------------------------------------------------------
// resolveLine (the loud helper — build() itself stays passthrough)
// ---------------------------------------------------------------------------

function parseLineValue(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v >= 1) return Math.floor(v);
  if (typeof v === "string") {
    const m = /L?\s*(\d+)/.exec(v);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 1) return Math.floor(n);
    }
  }
  return undefined;
}

export interface GraphifyLineLike {
  line?: unknown;
  data?: Record<string, unknown>;
  source_location?: unknown;
}

/** Loud line resolution: node line ?? data.line ?? data.line_start ??
 *  data.line_end ?? node/data source_location L-number ?? edge
 *  source_location L-number. NONE -> named LINELESS_NODE (never a silent 0). */
export function resolveGraphifyLine(
  node: GraphifyLineLike,
  edge?: { source_location?: unknown; metadata?: unknown } | null,
  context = "",
): number {
  const data = node.data ?? {};
  const candidates: unknown[] = [
    node.line,
    data["line"],
    data["line_start"],
    data["line_end"],
    node.source_location,
    data["source_location"],
    edge?.source_location,
    (edge?.metadata as Record<string, unknown> | undefined)?.["line"],
  ];
  for (const c of candidates) {
    const n = parseLineValue(c);
    if (n !== undefined) return n;
  }
  throw new Error(`LINELESS_NODE: no line for ${context || "graphify node"} (checked line/line_start/line_end/source_location)`);
}

/** Silent probe for build() passthrough: number or undefined, never throws. */
export function tryResolveGraphifyLine(
  node: GraphifyLineLike,
  edge?: { source_location?: unknown; metadata?: unknown } | null,
): number | undefined {
  try {
    return resolveGraphifyLine(node, edge ?? null, "");
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Typed projection (pure — no I/O; throws LINELESS_NODE on a line-less row)
// ---------------------------------------------------------------------------

function graphifyEvidence(predicate: string, src: string, dst: string, file: string | null, line: number): string {
  const anchor = file && file.length > 0 ? `${file}:${line}` : src;
  return `explicit: ${predicate} in source ${src}->${dst} @ ${anchor}`;
}

/** Project adapter rows onto the typed-store row shapes (pure). Every node
 *  row carries a finite line — a line-less row FAILS here (LINELESS_NODE),
 *  never downstream-defaulted. Evidence quotes always start with explicit:
 *  (code-only extraction is always EXTRACTED; --mode deep INFERRED is out of
 *  W1 scope and documented, not silently relabeled). */
export function mapGraphifyToTyped(
  nodes: GraphNode[],
  edges: GraphEdge[],
  runTag: string,
): { nodeRows: ForkNode[]; edgeRows: ForkEdge[] } {
  const nodeRows: ForkNode[] = nodes.map((n) => ({
    canonicalId: n.id,
    kind: graphifyKindToTyped(n.kind),
    label: n.name,
    file: typeof n.file === "string" ? n.file : null,
    line: resolveGraphifyLine({ line: n.line ?? undefined, data: n.data ?? {} }, null, n.id),
    run: runTag,
  }));
  const nodesById = new Map(nodes.map((n) => [n.id, n] as const));
  const edgeRows: ForkEdge[] = edges.map((e) => {
    const src = nodesById.get(e.sourceId);
    const line = e.line ?? src?.line ?? tryResolveGraphifyLine({ data: src?.data ?? {} }) ?? 1;
    return {
      srcCanonical: e.sourceId,
      dstCanonical: e.targetId,
      predicate: graphifyPredicateToTyped(e.kind),
      evidence: graphifyEvidence(graphifyPredicateToTyped(e.kind), e.sourceId, e.targetId, src?.file ?? null, line),
      run: runTag,
    };
  });
  return { nodeRows, edgeRows };
}

/** Shared GraphifyGraph -> GraphNode/GraphEdge projection (build() and the populate sync bridge). */
export function projectGraphifyGraph(graph: GraphifyGraph, root: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = graph.nodes.map((n) => {
    const kind = graphifyKindToNodeKind(n.type, n);
    const file = n.file && n.file.length > 0 ? (path.isAbsolute(n.file) ? n.file : path.resolve(root, n.file)) : undefined;
    const data = (n.data ?? {}) as Record<string, unknown>;
    const line = tryResolveGraphifyLine({ data });
    const name = n.label && n.label.length > 0 ? n.label : n.id;
    return {
      id: `graphify:${n.id}`,
      kind,
      name,
      file,
      line,
      lineage: "CODE_DERIVED" as const,
      source: file && line !== undefined ? `${file}:${line}` : (file ?? `graphify:${n.id}`),
      data,
    };
  });
  const nodeByRawId = new Map(graph.nodes.map((n) => [n.id, n] as const));
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const edges: GraphEdge[] = [];
  for (const e of graph.edges) {
    const src = `graphify:${e.src}`;
    const dst = `graphify:${e.dst}`;
    if (!byId.has(src) || !byId.has(dst)) continue; // the dangling edge dropped (corbell posture)
    const rawEdge = e as unknown as Record<string, unknown>;
    const edgeLoc = rawEdge["source_location"];
    const srcNode = byId.get(src);
    const srcFile = srcNode?.file;
    const line = parseLineValue(edgeLoc) ?? srcNode?.line ?? tryResolveGraphifyLine({ data: (nodeByRawId.get(e.src)?.data ?? {}) as Record<string, unknown> });
    edges.push({
      sourceId: src,
      targetId: dst,
      kind: graphifyRelationToEdgeKind(e.relation),
      lineage: "CODE_DERIVED",
      file: srcFile,
      line,
    });
  }
  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// The adapter (GraphAdapter contract — same shape as CorbellAdapter)
// ---------------------------------------------------------------------------

function countLineage(nodes: GraphNode[], edges: GraphEdge[]): { spec: number; code: number; hybrid: number } {
  const count = (l: string, list: { lineage: string }[]): number => list.filter((n) => n.lineage === l).length;
  return {
    spec: count("SPEC_DERIVED", nodes) + count("SPEC_DERIVED", edges),
    code: count("CODE_DERIVED", nodes) + count("CODE_DERIVED", edges),
    hybrid: count("HYBRID", nodes) + count("HYBRID", edges),
  };
}

function truncate(s: string, n = 200): string {
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > n ? `${one.slice(0, n)}…` : one;
}

export class GraphifyAdapter implements GraphAdapter {
  private cachedNodes: GraphNode[] = [];
  private cachedEdges: GraphEdge[] = [];
  private cachedRaw: GraphifyGraph | null = null;
  private lastGraphPath: string | null = null;
  private built = false;

  constructor(private profile: ProjectProfile) {}

  async build(profile: ProjectProfile): Promise<BuildResult> {
    const root = path.resolve(profile.project.root);
    const graphPath = resolveGraphifyOut(profile);
    this.lastGraphPath = graphPath;
    const t0 = Date.now();
    if (!fs.existsSync(graphPath)) {
      throw new Error(
        `GRAPHIFY_NOT_WARM:no-graph at ${graphPath} (rebuild with: bun scripts/graphify-build.ts --target '${root}')`,
      );
    }
    let size = 0;
    try {
      size = fs.statSync(graphPath).size;
    } catch (e: unknown) {
      throw new Error(`GRAPHIFY_NOT_WARM:unreadable ${graphPath}: ${e instanceof Error ? e.message.slice(0, 80) : String(e)}`);
    }
    if (size === 0) throw graphEmpty(`graphify graph.json is empty (0 bytes at ${graphPath})`);
    if (size > GRAPH_LOAD_BUDGET_BYTES) {
      throw new Error(
        `GRAPHIFY_GRAPH_TOO_LARGE: graph.json is ${size} bytes (> ${GRAPH_LOAD_BUDGET_BYTES} budget). Fix: scope/extract a subtree or lower the graph cardinality.`,
      );
    }
    if (size > GRAPH_PARSE_YIELD_BYTES) {
      await new Promise<void>((resolve) => setImmediate(() => resolve()));
    }
    let raw: Record<string, unknown>;
    try {
      raw = parseGraphJsonGuarded(fs.readFileSync(graphPath, "utf8"), size);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("GRAPHIFY_GRAPH_TOO_LARGE")) throw e;
      throw adapterParseError("graphify graph.json", `graph.json parse failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    const graph = normalizeGraphifyGraph(raw);
    if (graph.nodes.length === 0) {
      throw graphEmpty(`graphify graph produced zero nodes (graph.json at ${graphPath} carries no nodes)`);
    }
    // Project onto GraphNode/GraphEdge via the shared helper. LINES STAY
    // PASSTHROUGH: a node with no line anywhere keeps line undefined (the
    // hunter map-branch owns LINELESS_NODE).
    const { nodes, edges } = projectGraphifyGraph(graph, root);
    if (nodes.length === 0) {
      throw graphEmpty(`graphify graph build produced zero nodes (graph.json at ${graphPath} reported: "${truncate(JSON.stringify(raw).slice(0, 200))}")`);
    }
    this.cachedNodes = nodes;
    this.cachedEdges = edges;
    this.cachedRaw = graph;
    this.built = true;
    return {
      nodes,
      edges,
      durationMs: Date.now() - t0,
      adapter: "graphify",
      lineage: countLineage(nodes, edges),
      command: "graphify extract --code-only --no-cluster",
    };
  }

  /** PORT DELEGATE (OMP seam): the last normalized graph (null before build). */
  raw(): GraphifyGraph | null {
    return this.cachedRaw;
  }

  /** PORT DELEGATE (OMP seam): the graph.json path of the last build. */
  graphPath(): string | null {
    return this.lastGraphPath;
  }

  private resolveNodeId(symbol: string): string {
    if (symbol.startsWith("graphify:")) return symbol;
    const byName = this.cachedNodes.find((n) => n.name === symbol);
    if (byName) return byName.id;
    const bySuffix = this.cachedNodes.find((n) => n.id.endsWith(`::${symbol}`) || n.id.endsWith(`:${symbol}`));
    return bySuffix?.id ?? `graphify:${symbol}`;
  }

  private nodeById(id: string): GraphNode | undefined {
    return this.cachedNodes.find((n) => n.id === id);
  }

  private ensureBuilt(): void {
    if (!this.built) {
      throw adapterFailed("graphify query", "no graph built — call build() first (the query verbs read the built graph)");
    }
  }

  whoCalls(symbol: string): CallSite[] {
    this.ensureBuilt();
    const target = this.resolveNodeId(symbol);
    return this.cachedEdges
      .filter((e) => e.kind === "calls" && e.targetId === target)
      .map((e) => {
        const caller = this.nodeById(e.sourceId);
        return {
          file: caller?.file ?? this.profile.project.root,
          line: e.line ?? caller?.line ?? 0,
          caller: caller?.name ?? e.sourceId,
        };
      });
  }

  /** Sync build from an explicit graph.json path (the populate sync-bridge path). */
  buildSync(graphPath: string): { nodes: GraphNode[]; edges: GraphEdge[]; graph: GraphifyGraph } {
    const root = path.resolve(this.profile.project.root);
    const graph = loadGraphifyFileSync(graphPath);
    if (graph.nodes.length === 0) {
      throw graphEmpty(`graphify graph produced zero nodes (graph.json at ${graphPath} carries no nodes)`);
    }
    const { nodes, edges } = projectGraphifyGraph(graph, root);
    this.lastGraphPath = graphPath;
    this.cachedNodes = nodes;
    this.cachedEdges = edges;
    this.cachedRaw = graph;
    this.built = true;
    return { nodes, edges, graph };
  }

  chain(id: string): ChainStep[] {
    this.ensureBuilt();
    const start = this.resolveNodeId(id);
    const steps: ChainStep[] = [];
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const from = queue.shift()!;
      for (const e of this.cachedEdges.filter((x) => x.kind === "calls" && x.sourceId === from)) {
        const caller = this.nodeById(e.sourceId);
        const callee = this.nodeById(e.targetId);
        steps.push({
          from: caller?.name ?? e.sourceId,
          to: callee?.name ?? e.targetId,
          kind: e.kind,
          file: callee?.file ?? this.profile.project.root,
          line: e.line ?? callee?.line ?? 0,
        });
        if (!seen.has(e.targetId)) {
          seen.add(e.targetId);
          queue.push(e.targetId);
        }
      }
    }
    return steps;
  }

  imports(module: string): ImportEdge[] {
    this.ensureBuilt();
    const start = this.resolveNodeId(module);
    return this.cachedEdges
      .filter((e) => e.kind === "imports" && e.sourceId === start)
      .map((e) => {
        const src = this.nodeById(e.sourceId);
        const dst = this.nodeById(e.targetId);
        return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line: e.line ?? src?.line ?? 0 };
      });
  }

  awaits(symbol: string): AwaitEdge[] {
    this.ensureBuilt();
    const start = this.resolveNodeId(symbol);
    return this.cachedEdges
      .filter((e) => e.kind === "awaits" && e.sourceId === start)
      .map((e) => {
        const src = this.nodeById(e.sourceId);
        const dst = this.nodeById(e.targetId);
        return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line: e.line ?? src?.line ?? 0 };
      });
  }

  unwired(): DeadNode[] {
    this.ensureBuilt();
    const callTargets = new Set(this.cachedEdges.filter((e) => e.kind === "calls").map((e) => e.targetId));
    return this.cachedNodes
      .filter((n) => (n.kind === "function" || n.kind === "method" || n.kind === "class") && !callTargets.has(n.id))
      .map((n) => ({ id: n.id, name: n.name, file: n.file ?? this.profile.project.root, line: n.line ?? 0 }));
  }

  nodes(kind?: GraphNodeKind): GraphNode[] {
    if (!this.built) return [];
    return kind === undefined ? [...this.cachedNodes] : this.cachedNodes.filter((n) => n.kind === kind);
  }
}
