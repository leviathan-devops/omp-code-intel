// populate — fork project-scope.ts:125-213 ensureGraphPopulated ported to the
// OMP session store. Mechanical indexer (parseExports + relative import scan),
// never a copy of another session's sqlite. Run-tagged rows; supersede on re-run.
import * as fs from "node:fs";
import * as path from "node:path";
import { parseExportSites, parseExports } from "./gate-middleware.ts";
import { type ForkEdge, type ForkNode, insertForkEdgesBatch, insertForkNodesBatch, openTypedStore, setMeta } from "./typed-write.ts";
import { populateFromCorbellCheckout } from "./populate-corbell.ts";
import { GraphifyAdapter, mapGraphifyToTyped } from "../hunter/graph/graphify-adapter.ts";
import { graphifyOutPath, isGraphifyCheckoutFreshFor } from "./populate-graphify.ts";

export const POPULATE_FILE_BUDGET = 1000;

const EXCLUDED_DIRS = new Set(["node_modules", ".git", ".hg", ".svn", "dist", "build", ".next", "coverage", "__pycache__"]);

export interface PopulateResult {
  filesIndexed: number;
  nodes: number;
  edges: number;
  runTag: string;
  skipped: boolean;
  /** W1 substrate law: 'corbell' = the parse-grade checkout (PRIMARY, DEFAULT); 'graphify' = the graphify graph.json leg (explicit substrate only); 'indexer-fallback' = the mechanical regex indexer (NAMED fallback, never silent). */
  substrate?: "corbell" | "graphify" | "indexer-fallback";
  fallbackReason?: string;
  corbellCheckout?: string;
  graphifyGraph?: string;
}

const IMPORT_RE = /^\s*import\s+[^;]*?from\s*['"]([^'"]+)['"]/gm;
const BINDINGS_RE = /^\s*import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gm;

function collectTsFiles(root: string, budget: number): string[] {
  const files: string[] = [];
  const walk = (dir: string, left: { n: number }): void => {
    if (left.n <= 0) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (left.n <= 0) return;
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        left.n--;
        walk(path.join(dir, entry.name), left);
      } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        left.n--;
        files.push(path.join(dir, entry.name));
      }
    }
  };
  walk(root, { n: budget });
  return files;
}
export function populateSessionStore(storePath: string, root: string, runTag = "populate-" + Date.now().toString(36), opts?: { substrate?: "corbell" | "graphify" }): PopulateResult {
  // THE SUBSTRATE SWITCH (GI-OMP full-port W1): explicit substrate only —
  // DEFAULT stays corbell (zero behavior change for existing sessions).
  // opts.substrate === 'graphify' runs the graphify graph.json leg; anything
  // else (or absent) runs the corbell-first path below, untouched.
  if (opts?.substrate === "graphify") {
    return populateGraphifySessionStore(storePath, root, runTag);
  }
  const corbell = populateFromCorbellCheckout(storePath, root, runTag);
  if (corbell.ok) {
    setMeta(storePath, "substrate", "corbell");
    setMeta(storePath, "corbell_checkout", corbell.checkoutPath);
    setMeta(storePath, "populated_at", new Date().toISOString());
    console.error(`[gi-omp] populate substrate=corbell checkout=${corbell.checkoutPath} nodes=${corbell.nodes} edges=${corbell.edges}`);
    return {
      filesIndexed: 0,
      nodes: corbell.nodes,
      edges: corbell.edges,
      runTag,
      skipped: false,
      substrate: "corbell",
      corbellCheckout: corbell.checkoutPath,
    };
  }
  console.error(`[gi-omp] populate falling back to the mechanical indexer: ${corbell.reason} (warm with: bun scripts/corbell-build.ts --target '${root}')`);
  const files = collectTsFiles(root, POPULATE_FILE_BUDGET);
  // supersede prior run rows before rewriting (fork superseded_run discipline)
  const db = openTypedStore(storePath);
  try {
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
  } finally {
    db.close();
  }
  // PASS 1: export-name index (label -> canonicals) so bare `name(` call
  // sites resolve to real nodes. Baseline gap class: bindings-only missed
  // same-file defs (whoCalls rows=0 on def-only symbols).
  // EXPORT-STAR: `export * from './x'` re-exports every name defined in x.
  // The star target's export names are merged into the star file's own
  // canonicals (Function:name:starfile), so importers of the star resolve.
  const contents = new Map<string, string>();
  const labelIndex = new Map<string, string[]>();
  const EXPORT_STAR_RE = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
  const EXPORT_TYPE_RE = /export\s+type\s*\{([^}]*)\}(?:\s*from\s*['"][^'"]*['"])?/g;
  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    let content = "";
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    contents.set(rel, content);
    const indexName = (name: string): void => {
      const canon = `Function:${name}:${rel}`;
      const list = labelIndex.get(name) ?? [];
      if (!list.includes(canon)) list.push(canon);
      labelIndex.set(name, list);
    };
    for (const name of parseExports(content)) indexName(name);
    // `export type { X }` re-exports (bare or from-clause): index X too.
    let tm: RegExpExecArray | null;
    EXPORT_TYPE_RE.lastIndex = 0;
    while ((tm = EXPORT_TYPE_RE.exec(content)) !== null) {
      for (const spec of tm[1].split(",")) {
        const s = spec.trim();
        if (!s) continue;
        const asMatch = /\bas\s+(\w+)\s*$/.exec(s);
        const nm = asMatch ? asMatch[1] : (/^(\w+)$/.exec(s)?.[1] ?? null);
        if (nm) indexName(nm);
      }
    }
  }
  // PASS 1b: export-star merge. For `export * from './x'`, every name the
  // target file exports is ALSO addressable as Function:name:starfile.
  // (Fixes dangling dst like Function:evalExpr:.../math/index.ts.)
  // Star-merged names are recorded per-file for node insertion in pass 2.
  const starMerged = new Map<string, string[]>();
  for (const [rel, content] of contents) {
    let sm: RegExpExecArray | null;
    EXPORT_STAR_RE.lastIndex = 0;
    while ((sm = EXPORT_STAR_RE.exec(content)) !== null) {
      const spec = sm[1];
      if (!spec.startsWith(".")) continue;
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec)).replace(/\.(ts|js)x?$/, "");
      const cands = [`${base}.ts`, base, `${base}.js`, `${base}/index.ts`];
      let target: string | null = null;
      for (const c of cands) {
        if (contents.has(c)) { target = c; break; }
      }
      if (!target) continue;
      const tcontent = contents.get(target)!;
      for (const name of parseExports(tcontent)) {
        const canon = `Function:${name}:${rel}`;
        const list = labelIndex.get(name) ?? [];
        if (!list.includes(canon)) list.push(canon);
        labelIndex.set(name, list);
        const per = starMerged.get(rel) ?? [];
        if (!per.includes(name)) per.push(name);
        starMerged.set(rel, per);
      }
    }
  }
  const BARE_CALL_RE = /(?<![.\w])([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
  const nodeRows: ForkNode[] = [];
  const edgeRows: ForkEdge[] = [];
  const seenN = new Set<string>();
  const seenE = new Set<string>();
  for (const abs of files) {
    const rel = path.relative(root, abs).split(path.sep).join("/");
    const content = contents.get(rel);
    if (content === undefined) continue;
    const fileCanon = "File:" + rel;
    if (!seenN.has(fileCanon)) {
      seenN.add(fileCanon);
      nodeRows.push({ canonicalId: fileCanon, kind: "File", label: rel, file: rel, line: null, run: runTag });
    }
    const fnSpans: Array<{ name: string; start: number; end: number }> = [];
    const FN_RE = /export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g;
    let fm: RegExpExecArray | null;
    FN_RE.lastIndex = 0;
    while ((fm = FN_RE.exec(content)) !== null) {
      const fname = fm[1];
      let depth = 0;
      let end = content.length;
      let opened = false;
      for (let i = fm.index + fm[0].length - 1; i < content.length; i++) {
        const ch = content[i];
        if (ch === "{") { depth++; opened = true; }
        else if (ch === "}") {
          depth--;
          if (opened && depth === 0) { end = i; break; }
        }
      }
      fnSpans.push({ name: fname, start: fm.index, end });
    }
    const enclosingFn = (off: number): string | null => {
      let best: string | null = null;
      let bestStart = -1;
      for (const s of fnSpans) {
        if (off >= s.start && off <= s.end && s.start > bestStart) {
          best = s.name;
          bestStart = s.start;
        }
      }
      return best;
    };
    const siteLine = new Map(parseExportSites(content).map((s) => [s.name, s.line]));
    for (const name of [...parseExports(content), ...(starMerged.get(rel) ?? [])]) {
      const canon = `Function:${name}:${rel}`;
      if (seenN.has(canon)) continue;
      seenN.add(canon);
      nodeRows.push({ canonicalId: canon, kind: "Function", label: name, file: rel, line: siteLine.get(name) ?? null, run: runTag });
    }
    let m: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(content)) !== null) {
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
      const dstCanon = "File:" + resolved;
      if (!seenN.has(dstCanon)) {
        seenN.add(dstCanon);
        nodeRows.push({ canonicalId: dstCanon, kind: "File", label: resolved, file: resolved, line: null, run: runTag });
        }
      const key = `${fileCanon}->${dstCanon}:imports`;
      if (seenE.has(key)) continue;
      seenE.add(key);
      edgeRows.push({ srcCanonical: fileCanon, dstCanonical: dstCanon, predicate: "imports", evidence: `${rel} imports ${spec}`, run: runTag });
    }
    BINDINGS_RE.lastIndex = 0;
    while ((m = BINDINGS_RE.exec(content)) !== null) {
      const importOff = m.index;
      const callerFn = enclosingFn(importOff);
      const srcCanon = callerFn ? `Function:${callerFn}:${rel}` : fileCanon;
      // Resolve the spec to a REAL file canonical. Non-relative (package)
      // specs have no in-tree node — skip (they caused dangling dst edges
      // like Function:execFile:...node:child_process).
      const rawSpec = m[2];
      if (!rawSpec.startsWith(".")) continue;
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(rel), rawSpec)).replace(/\.(ts|js)x?$/, "");
      const cands = [`${base}.ts`, base, `${base}.js`, `${base}/index.ts`];
      let resolvedFile: string | null = null;
      for (const c of cands) {
        if (contents.has(c)) { resolvedFile = c; break; }
      }
      if (!resolvedFile) continue;
      const targetContent = contents.get(resolvedFile);
      for (const raw of m[1].split(",")) {
        const binding = raw.split(" as ")[0].trim();
        // BARE-IMPORT SKIP: `import "mod"` has empty braces — no binding.
        if (!binding || !/^\w+$/.test(binding)) continue;
        // SCOPE CHECK: binding must be DECLARED in the target (exported or
        // top-level const/function/class/interface/type/enum). A bare
        // mention (use-but-never-declared, e.g. V5_CONFIDENCE_FLOOR) is a
        // phantom — skip.
        if (targetContent && !new RegExp(`(?:export\\s+(?:async\\s+)?(?:function|const|class|let|var|type|interface|enum)\\s+${binding}\\b|(?:^|\\n)\\s*(?:const|let|var|function|class|interface|type|enum)\\s+${binding}\\b|export\\s*\\{[^}]*\\b${binding}\\b)`).test(targetContent)) continue;
        const dst = `Function:${binding}:${resolvedFile}`;
        const key = `${srcCanon}->${dst}:calls`;
        if (seenE.has(key)) continue;
        seenE.add(key);
        edgeRows.push({ srcCanonical: srcCanon, dstCanonical: dst, predicate: "calls", evidence: `${rel} imports {${binding}} from ${rawSpec}`, run: runTag });
        }
    }
    // BARE-CALL SCAN: `name(` occurrences resolve through the label index.
    // Src = enclosing exported function (caller label), else the file node.
    const seenCall = new Set<string>();
    BARE_CALL_RE.lastIndex = 0;
    while ((m = BARE_CALL_RE.exec(content)) !== null) {
      const name = m[1];
      const before = content.slice(Math.max(0, m.index - 80), m.index);
      if (/function\s*$/.test(before)) continue;
      const dsts = labelIndex.get(name);
      if (!dsts) continue;
      const callerFn = enclosingFn(m.index);
      const srcCanon = callerFn ? `Function:${callerFn}:${rel}` : fileCanon;
      for (const dst of dsts) {
        if (dst.endsWith(":" + rel)) continue;
        const key = `${srcCanon}->${dst}:calls`;
        if (seenE.has(key) || seenCall.has(key)) continue;
        seenCall.add(key);
        seenE.add(key);
        edgeRows.push({ srcCanonical: srcCanon, dstCanonical: dst, predicate: "calls", evidence: `${rel} calls ${name} (bare-call scan)`, run: runTag });
        }
    }
  }
  const wdb = openTypedStore(storePath);
  try {
    wdb.exec("BEGIN IMMEDIATE;");
    insertForkNodesBatch(wdb, nodeRows);
    insertForkEdgesBatch(wdb, edgeRows);
    wdb.exec("COMMIT;");
  } finally {
    wdb.close();
  }
  setMeta(storePath, "substrate", "indexer-fallback");
  setMeta(storePath, "fallback_reason", corbell.reason ?? "");
  setMeta(storePath, "populated_at", new Date().toISOString());
  return {
    filesIndexed: files.length,
    nodes: nodeRows.length,
    edges: edgeRows.length,
    runTag,
    skipped: false,
    substrate: "indexer-fallback",
    fallbackReason: corbell.reason,
    corbellCheckout: corbell.checkoutPath,
  };
}
function populateGraphifySessionStore(storePath: string, root: string, runTag: string): PopulateResult {
  const resolvedRoot = path.resolve(root);
  const graphPath = graphifyOutPath(resolvedRoot);
  const freshness = isGraphifyCheckoutFreshFor(resolvedRoot, graphPath);
  if (!freshness.fresh) {
    const reason = `GRAPHIFY_NOT_WARM:${freshness.reason}`;
    console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (build with: bun scripts/graphify-build.ts --target '${root}')`);
    return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason, graphifyGraph: graphPath };
  }
  const built = new GraphifyAdapter({ project: { root: resolvedRoot } } as never).buildSync(graphPath);
  const { nodeRows, edgeRows } = mapGraphifyToTyped(built.nodes, built.edges, runTag);
  if (nodeRows.length === 0) {
    const reason = "GRAPH_EMPTY:graphify graph produced zero nodes";
    console.error(`[gi-omp] populate substrate=graphify miss: ${reason} (graph=${graphPath})`);
    return { filesIndexed: 0, nodes: 0, edges: 0, runTag, skipped: true, substrate: "graphify", fallbackReason: reason, graphifyGraph: graphPath };
  }
  const db = openTypedStore(storePath);
  try {
    db.run("UPDATE typed_nodes SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.run("UPDATE typed_edges SET superseded_run = ? WHERE superseded_run IS NULL", [runTag]);
    db.exec("BEGIN IMMEDIATE;");
    insertForkNodesBatch(db, nodeRows);
    insertForkEdgesBatch(db, edgeRows);
    db.exec("COMMIT;");
  } finally {
    db.close();
  }
  setMeta(storePath, "substrate", "graphify");
  setMeta(storePath, "graphify_graph", graphPath);
  setMeta(storePath, "graphify_nodes", String(nodeRows.length));
  setMeta(storePath, "graphify_edges", String(edgeRows.length));
  setMeta(storePath, "populated_at", new Date().toISOString());
  console.error(`[gi-omp] populate substrate=graphify graph=${graphPath} nodes=${nodeRows.length} edges=${edgeRows.length}`);
  return { filesIndexed: 0, nodes: nodeRows.length, edges: edgeRows.length, runTag, skipped: false, substrate: "graphify", graphifyGraph: graphPath };
}

