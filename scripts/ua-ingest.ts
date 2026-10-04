// ua-ingest — ★ THE L3 UA INGEST: build the understand-anything knowledge graph.
//
// THE REAL PIPELINE (read from @understand-anything/core's built dist, 2026-09-23):
//   new TreeSitterPlugin()          — the analyzer (defaults to TypeScript/JavaScript)
//   await plugin.init()             — loads the WASM parser + the grammars
//   plugin.analyzeFile(path, src)   — → StructuralAnalysis { functions, classes, imports, exports }
//   new GraphBuilder(name, gitHash) — accumulates nodes + edges
//   builder.addFileWithAnalysis(path, analysis, meta)
//   builder.addImportEdge(from, to)
//   builder.build()                 — → the KnowledgeGraph
//   saveGraph(projectRoot, graph)   — → <projectRoot>/.ua/knowledge-graph.json
//
// ★ WHY THIS EXISTS: L3_UA's substrate is `<scopeRoot>/.ua/knowledge-graph.json` and
// nothing on this host produced one. The producer is THIS: the plugin's own ingest.
// usage: bun scripts/ua-ingest.ts [projectRoot]
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

const CORE = path.join(
  import.meta.dir, "..",
  "research/graph-infra-repos/Understand-Anything/understand-anything-plugin/packages/core/dist/index.js",
);

const root = process.argv[2] ?? process.cwd();

if (!fs.existsSync(CORE)) {
  console.error(`GI_LAYER_UA: the UA core is not built at ${CORE} (run: pnpm install --filter @understand-anything/core)`);
  process.exit(3);
}

const core = (await import(CORE)) as {
  TreeSitterPlugin: new () => {
    init(): Promise<void>;
    analyzeFile(filePath: string, content: string): unknown;
  };
  GraphBuilder: new (name: string, gitHash: string) => {
    addFileWithAnalysis(filePath: string, analysis: unknown, meta: { summary: string; tags: string[]; complexity: "simple" | "moderate" | "complex"; summaries: Record<string, string>; fileSummary: string }): void;
    addImportEdge(fromFile: string, toFile: string): void;
    build(): unknown;
  };
  saveGraph: (projectRoot: string, graph: unknown) => void;
};

// ★ THE SHARED WALK_SKIP (GI_KERNEL_V2.3 FR-6). ONE law, imported from the same module
//   every producer mirrors (src/hunter/profile/source-roots.ts). This script walked the
//   WHOLE repo with a private skip that missed `fork-v143` / `Ship_Packages` / `extensions`
//   — the L3_ua layer measured 45% in-scope. The private list is gone; the scoping now
//   comes from discoverSourceRoots (the SAME src+tests the rest of the kernel uses).
import { discoverSourceRoots, WALK_SKIP } from "../src/hunter/profile/source-roots.ts";
const SKIP: Set<string> = WALK_SKIP;
const EXTS = new Set([".ts", ".tsx", ".js", ".mjs"]);

/** Walk the scope for source files, skipping the archive + the vendored trees. */
function walk(dir: string, out: string[] = [], depth = 0): string[] {
  if (depth > 8) return out;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (SKIP.has(e.name) || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out, depth + 1);
    else if (EXTS.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

const plugin = new core.TreeSitterPlugin();
await plugin.init();

// ★ SCOPE FROM THE SHARED DISCOVERY (GI_KERNEL_V2.3 FR-6) — walk the DISCOVERED source
//   roots (the SAME src+tests structural/graphify use), never the raw repo root. The
//   private whole-repo walk was the L3_ua 45%-in-scope defect.
const discoveredRoots = discoverSourceRoots(root);
const scanRoots = "error" in discoveredRoots ? [root] : discoveredRoots.roots;
const files = scanRoots.flatMap((r) => walk(r));
const builder = new core.GraphBuilder(
  path.basename(root),
  createHash("sha1").update(String(files.length)).digest("hex").slice(0, 12),
);

let analyzed = 0;
const relOf = (p: string): string => path.relative(root, p);
const known = new Set(files.map(relOf));

for (const f of files) {
  let src: string;
  try { src = fs.readFileSync(f, "utf8"); } catch { continue; }
  const analysis = plugin.analyzeFile(f, src) as {
    functions?: unknown[]; classes?: unknown[]; imports?: Array<{ source?: string; specifiers?: string[] }>;
  };
  const rel = relOf(f);
  builder.addFileWithAnalysis(rel, analysis, {
    summary: `${(analysis.functions ?? []).length} fn · ${(analysis.classes ?? []).length} class`,
    tags: [path.extname(f).slice(1)],
    complexity: (analysis.functions ?? []).length > 12 ? "complex" : (analysis.functions ?? []).length > 4 ? "moderate" : "simple",
    summaries: {},
    fileSummary: rel,
  });
  analyzed += 1;
  // ★ resolve each import to an in-scope file → an import edge (the real graph shape)
  for (const imp of analysis.imports ?? []) {
    const s = imp.source ?? "";
    if (!s.startsWith(".")) continue;
    const resolved = path.normalize(path.join(path.dirname(rel), s));
    for (const cand of [resolved, `${resolved}.ts`, `${resolved}.tsx`, path.join(resolved, "index.ts")]) {
      if (known.has(cand)) { builder.addImportEdge(rel, cand); break; }
    }
  }
}

const graph = builder.build() as { nodes?: unknown[]; edges?: unknown[] };
core.saveGraph(root, graph);
const outPath = path.join(root, ".ua/knowledge-graph.json");
const size = fs.existsSync(outPath) ? fs.statSync(outPath).size : 0;
console.log(
  `[ua-ingest] root=${root} files=${files.length} analyzed=${analyzed} ` +
  `nodes=${(graph.nodes ?? []).length} edges=${(graph.edges ?? []).length} → ${outPath} (${size}B)`,
);
