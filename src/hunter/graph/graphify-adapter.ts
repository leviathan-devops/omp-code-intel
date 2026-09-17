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
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    try {
      if (fs.statSync(fromEnv).isFile()) return { present: true, bin: fromEnv, source: "env" };
    } catch { /* missing — fall through to candidates */ }
  }
  for (const candidate of uvCandidates) {
    if (candidate.length > 0 && fs.existsSync(candidate)) return { present: true, bin: candidate, source: "uv" };
  }
  const pathEnv = env.PATH ?? process.env.PATH ?? "";
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const cand = path.join(dir, "graphify");
    try {
      if (fs.statSync(cand).isFile()) return { present: true, bin: cand, source: "path" };
    } catch { /* not a file — keep walking */ }
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
    // H13 (qwen 33d64eca): read ONCE, then guard on the ACTUAL byte count —
    // the pre-read stat size is only a fast-fail hint; growth between stat
    // and read can no longer bypass the budget (the guard re-checks).
    const text = fs.readFileSync(graphPath, "utf8");
    if (Buffer.byteLength(text, "utf8") > GRAPH_LOAD_BUDGET_BYTES) {
      throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json grew past the budget between stat and read (${Buffer.byteLength(text, "utf8")} bytes).`);
    }
    raw = parseGraphJsonGuarded(text);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("GRAPHIFY_GRAPH_TOO_LARGE")) throw e;
    throw new Error(`GRAPHIFY_EXTRACT_FAILED: graph.json parse failed — ${e instanceof Error ? e.message : String(e)}`);
  }
  return normalizeGraphifyGraph(raw, { root: path.dirname(path.dirname(graphPath)) });
}

/** Fork graph-mapper.ts:40-87 normalizeGraph (links|edges tolerant). */
export function normalizeGraphifyGraph(raw: Record<string, unknown>, opts?: { root?: string }): GraphifyGraph {
  // V1.1-c3: unified root — normalize uses realpathSync like projection
  const safeRoot = opts?.root ? (() => { try { return fs.realpathSync(opts.root); } catch { return undefined; } })() : undefined;
  const rawNodes = (Array.isArray(raw["nodes"]) ? raw["nodes"] as unknown[] : []);
  const rawLinkSrc = Array.isArray(raw["links"]) ? raw["links"] as unknown[] : (Array.isArray(raw["edges"]) ? raw["edges"] as unknown[] : []);
  const rawLinks = rawLinkSrc as Record<string, unknown>[];
  const seenIds = new Set<string>();
  const nodeIdByRaw = new Map<Record<string, unknown>, string>();
  // C1 (qwen d5d5c883 [1]): NO rename ledger — the bare original still
  // identifies the FIRST kept node, so edges referencing it are already
  // correct. The prior ledger remapped bare→second-duplicate (off-by-one for
  // [x,x] and [x,x,x] alike). Duplicates get fresh suffixed ids; nothing remaps.
  let dropped = 0;
  const nodes: GraphifyNode[] = [];
  for (const n of rawNodes) {
    const r = n as Record<string, unknown>;
    let id = String(r["id"] ?? r["label"] ?? "");
    const label = String(r["label"] ?? r["id"] ?? "");
    if (id.length === 0) { dropped++; continue; }
    const original = id;
    // C1: collision-PROOF dedup — loop until free (the one-shot `#size`
    // suffix could itself collide: [x, x#2, x] produced two x#2). The bare
    // original is NEVER remapped (it still names the first-kept node).
    if (seenIds.has(id)) {
      let k = 2;
      while (seenIds.has(`${original}#${k}`)) k++;
      id = `${original}#${k}`;
    }
    seenIds.add(id);
    nodeIdByRaw.set(r, id);
    nodes.push({
      id,
      label,
      type: String(r["file_type"] ?? r["type"] ?? "unknown"),
      file: String(r["source_file"] ?? r["file"] ?? ""),
      data: r,
    });
  }
  if (dropped > 0) tridentLog("WARN", "graphify-adapter", `normalize: dropped ${dropped} id-less rows (no shared "" collision)`);
  const edges: GraphEdge[] = rawLinks.map((e) => {
    const src = String(e["source"] ?? e["src"] ?? "");
    const dst = String(e["target"] ?? e["dst"] ?? "");
    const relation = String(e["relation"] ?? "references");
    const rawConf = String(e["confidence"] ?? "EXTRACTED");
    return { src, dst, relation, confidence: rawConf === "INFERRED" ? "INFERRED" : "EXTRACTED" };
  });
  // H14 (qwen 33d64eca): community members must resolve through the SAME
  // dedup map the nodes got (raw ids + "" for dropped rows could never join
  // the deduped node ids). We collect member NODE OBJECTS per community, then
  // project each through the same normalize pass result (the nodes[] ids).
  const communityMap = new Map<number, unknown[]>();
  for (const n of rawNodes) {
    const r = n as Record<string, unknown>;
    const cid = r["community"];
    if (typeof cid === "number") {
      const arr = communityMap.get(cid) ?? [];
      arr.push(r);
      communityMap.set(cid, arr);
    }
  }
  // Community members resolve to their FINAL deduped node ids via nodeIdByRaw
  // (built during the normalize loop — alignment-proof against dropped rows).
  const communities: GraphifyCommunity[] = [];
  for (const [cid, memberObjs] of communityMap.entries()) {
    const members = memberObjs
      .map((r) => nodeIdByRaw.get(r as Record<string, unknown>))
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    if (members.length === 0) continue;
    communities.push({ id: String(cid), label: `Community ${cid}`, members, size: members.length });
  }
  // Degree/godNodes derive from edge endpoints only (containment below only
  // rewrites node file anchors), so they are computed BEFORE the early return.
  const degree = new Map<string, number>();
  for (const e of edges) {
    degree.set(e.src, (degree.get(e.src) ?? 0) + 1);
    degree.set(e.dst, (degree.get(e.dst) ?? 0) + 1);
  }
  const godNodes = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
  // V21 W12: projected node files are root-contained (root = the graph root
  // the loader passes, default cwd) — an absolute path or a `../` escape from
  // the graph JSON can never anchor a finding outside the target tree (the row
  // keeps its identity; only the anchor is dropped to "").
  if (opts?.root) {
    // C2 (qwen d5d5c883 [2]): the base MUST canonicalize — when realpath
    // fails the base is non-real while targets resolve real, so relative()
    // would compare different canonicalizations (symlink bypass). Fail
    // closed: skip the pass (anchors stay as the loader wrote them). The
    // `..` check is an exact segment match (`..` or `../`), never a prefix.
    const rootReal: string | null = (() => { try { return fs.realpathSync(opts.root); } catch { return null; } })();
    if (rootReal === null) {
      return { nodes, edges, communities, godNodes };
    }
    // V21 cleanup A2: nodes are `readonly` — containment builds normalized
    // COPIES (never mutates the declared-immutable rows in place).
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]!;
      const f = n.file;
      if (f.length === 0) continue;
      const abs = path.isAbsolute(f) ? f : path.resolve(rootReal, f);
      let real = abs;
      try { real = fs.realpathSync(abs); } catch { /* keep abs */ }
      const rel = path.relative(rootReal, real);
      const contained = rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
      const safeFile = contained ? rel.split(path.sep).join("/") : "";
      if (safeFile !== n.file) {
        nodes[i] = { ...n, file: safeFile };
        const at = nodeIdByRaw.get(rawNodes[i] as Record<string, unknown>);
        if (at === n.id) nodeIdByRaw.set(rawNodes[i] as Record<string, unknown>, nodes[i]!.id);
      }
    }
  }
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
    case "extends": return "extends";
    default:
      tridentLog("WARN", "graphify-adapter", `unknown typed predicate '${relation}' -> 'declares' (typo becomes declares — fix the source)`);
      return "declares";
  }
}

// ---------------------------------------------------------------------------
// resolveLine (the loud helper — build() itself stays passthrough)
// ---------------------------------------------------------------------------

function parseLineValue(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v >= 1) return Math.floor(v);
  if (typeof v === "string") {
    const m = /^L?\s*(\d+)\s*$/.exec(v.trim());
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
    const line = e.line ?? src?.line ?? tryResolveGraphifyLine({ data: src?.data ?? {} });
    if (line === undefined) throw new Error(`LINELESS_NODE: no line for edge ${e.sourceId}->${e.targetId} (edge + source both lineless)`);
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

/** Shared GraphifyGraph -> GraphNode/GraphEdge projection (build() and the populate sync bridge).
 * C3 (qwen d5d5c883 [3]): the projection re-enforces root containment
 * itself — an absolute or `../` escape can never flow into a finding anchor
 * or `source`, even when called without (or with a mismatched) normalize
 * containment. Escapes resolve to undefined (identity kept, anchor dropped). */
export function projectGraphifyGraph(graph: GraphifyGraph, root: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const rootReal: string = (() => { try { return fs.realpathSync(root); } catch { return path.resolve(root); } })();
  const nodes: GraphNode[] = graph.nodes.map((n) => {
    const kind = graphifyKindToNodeKind(n.type, n);
    let file: string | undefined;
    if (n.file && n.file.length > 0) {
      const abs = path.isAbsolute(n.file) ? n.file : path.resolve(rootReal, n.file);
      let real = abs;
      try { real = fs.realpathSync(abs); } catch { /* keep abs */ }
      const rel = path.relative(rootReal, real);
      if (rel !== ".." && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)) file = abs;
    }
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
  let dangling = 0;
  let danglingNoLine = 0;
  for (const e of graph.edges) {
    const src = `graphify:${e.src}`;
    const dst = `graphify:${e.dst}`;
    if (!byId.has(src) || !byId.has(dst)) { dangling++; continue; }
    const rawEdge = e as unknown as Record<string, unknown>;
    const edgeLoc = rawEdge["source_location"];
    const srcNode = byId.get(src);
    const srcFile = srcNode?.file;
    const line = parseLineValue(edgeLoc) ?? srcNode?.line ?? tryResolveGraphifyLine({ data: (nodeByRawId.get(e.src)?.data ?? {}) as Record<string, unknown> });
    if (line === undefined) danglingNoLine++;
    edges.push({
      sourceId: src,
      targetId: dst,
      kind: graphifyRelationToEdgeKind(e.relation),
      lineage: "CODE_DERIVED",
      file: srcFile,
      line,
    });
  }
  if (dangling + danglingNoLine > 0) tridentLog("WARN", "graphify-adapter", `project: dropped ${dangling} dangling edges; kept ${danglingNoLine} lineless-edge rows with line undefined (counted, never silent, never invented)`);
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
      // H13: read-once + actual-bytes guard (same law as the sync path).
      const text = fs.readFileSync(graphPath, "utf8");
      if (Buffer.byteLength(text, "utf8") > GRAPH_LOAD_BUDGET_BYTES) {
        throw new Error(`GRAPHIFY_GRAPH_TOO_LARGE: graph.json grew past the budget between stat and read (${Buffer.byteLength(text, "utf8")} bytes).`);
      }
      raw = parseGraphJsonGuarded(text);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("GRAPHIFY_GRAPH_TOO_LARGE")) throw e;
      throw adapterParseError("graphify graph.json", `graph.json parse failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    const graph = normalizeGraphifyGraph(raw, { root: path.dirname(path.dirname(graphPath)) });
    if (graph.nodes.length === 0) {
      throw graphEmpty(`graphify graph produced zero nodes (graph.json at ${graphPath} carries no nodes)`);
    }
    // Project onto GraphNode/GraphEdge via the shared helper. LINES STAY
    // PASSTHROUGH: a node with no line anywhere keeps line undefined (the
    // hunter map-branch owns LINELESS_NODE).
    const { nodes, edges } = projectGraphifyGraph(graph, root);
    if (nodes.length === 0) {
      throw graphEmpty(`graphify graph build produced zero nodes (graph.json at ${graphPath} carries no nodes; keys=${Object.keys(raw).slice(0, 8).join(",")})`);
    }
    this.cachedNodes = nodes;
    this.cachedEdges = edges;
    this.cachedRaw = graph;
    this.built = true;
    this.reindex();
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

  private byIdIdx = new Map<string, GraphNode>();
  private byNameIdx = new Map<string, GraphNode>();

  private reindex(): void {
    this.byIdIdx = new Map(this.cachedNodes.map((n) => [n.id, n] as const));
    this.byNameIdx = new Map<string, GraphNode>();
    for (const n of this.cachedNodes) if (!this.byNameIdx.has(n.name)) this.byNameIdx.set(n.name, n);
  }

  private resolveNodeId(symbol: string): string {
    if (symbol.startsWith("graphify:")) return symbol;
    const byName = this.byNameIdx.get(symbol);
    if (byName) return byName.id;
    for (const n of this.cachedNodes) {
      if (n.id.endsWith(`::${symbol}`) || n.id.endsWith(`:${symbol}`)) return n.id;
    }
    return `graphify:${symbol}`;
  }

  private nodeById(id: string): GraphNode | undefined {
    return this.byIdIdx.get(id);
  }

  private ensureBuilt(): void {
    if (!this.built) {
      throw adapterFailed("graphify query", "no graph built — call build() first (the query verbs read the built graph)");
    }
  }

  whoCalls(symbol: string, onLineless?: (info: string) => void): CallSite[] {
    this.ensureBuilt();
    const target = this.resolveNodeId(symbol);
    const out: CallSite[] = [];
    for (const e of this.cachedEdges.filter((e2) => e2.kind === "calls" && e2.targetId === target)) {
      const caller = this.nodeById(e.sourceId);
      const line = e.line ?? caller?.line;
      // V21 cleanup A3: a lineless ROW is skipped + named (telemetry callback)
      // — one data defect no longer aborts a query with N-1 good rows.
      if (line === undefined) {
        onLineless?.(`LINELESS_NODE skipped: whoCalls edge ${e.sourceId}->${e.targetId} (edge + caller both lineless)`);
        continue;
      }
      out.push({ file: caller?.file ?? this.profile.project.root, line, caller: caller?.name ?? e.sourceId });
    }
    return out;
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
    this.reindex();
    return { nodes, edges, graph };
  }

  chain(id: string): ChainStep[] {
    this.ensureBuilt();
    const start = this.resolveNodeId(id);
    const bySource = new Map<string, typeof this.cachedEdges>();
    for (const e of this.cachedEdges) {
      if (e.kind !== "calls") continue;
      const arr = bySource.get(e.sourceId) ?? [];
      arr.push(e);
      bySource.set(e.sourceId, arr);
    }
    const steps: ChainStep[] = [];
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const from = queue.shift()!;
      for (const e of bySource.get(from) ?? []) {
        const caller = this.nodeById(e.sourceId);
        const callee = this.nodeById(e.targetId);
        const line = e.line ?? callee?.line;
        if (line === undefined) throw new Error(`LINELESS_NODE: no line for chain edge ${e.sourceId}->${e.targetId} (edge + callee both lineless)`);
        steps.push({
          from: caller?.name ?? e.sourceId,
          to: callee?.name ?? e.targetId,
          kind: e.kind,
          file: callee?.file ?? this.profile.project.root,
          line,
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
        const line = e.line ?? src?.line;
        if (line === undefined) throw new Error(`LINELESS_NODE: no line for imports edge ${e.sourceId} (edge + source both lineless)`);
        return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line };
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
        const aline = e.line ?? src?.line;
        if (aline === undefined) throw new Error(`LINELESS_NODE: no line for awaits edge ${e.sourceId} (edge + source both lineless)`);
        return { from: src?.name ?? e.sourceId, to: dst?.name ?? e.targetId, file: src?.file ?? this.profile.project.root, line: aline };
      });
  }

  unwired(): DeadNode[] {
    this.ensureBuilt();
    const callTargets = new Set(this.cachedEdges.filter((e) => e.kind === "calls").map((e) => e.targetId));
    return this.cachedNodes
      .filter((n) => (n.kind === "function" || n.kind === "class") && !callTargets.has(n.id))
      .map((n) => {
        // V21 W9: DeadNode.line is `number` — a lineless row is a NAMED defect
        // (LINELESS parity with awaits), never a null leak into the contract.
        if (n.line === undefined || n.line === null) {
          throw new Error(`LINELESS_NODE: unwired row ${n.id} has no line (run graphify extract with source mapping, or drop the row)`);
        }
        return { id: n.id, name: n.name, file: n.file ?? this.profile.project.root, line: n.line };
      });
  }

  nodes(kind?: GraphNodeKind): GraphNode[] {
    this.ensureBuilt();
    return kind === undefined ? [...this.cachedNodes] : this.cachedNodes.filter((n) => n.kind === kind);
  }
}
