// ST — THE LIVE HUNT PATH (no stub profile / no stub adapter / no stub battery).
// st-hunter-port proves the machine through the PORT SEAMS (profile override +
// stub battery); this battery proves the LIVE chain a TUI hunt actually runs:
//   loadProfile(profilePath) → CorbellAdapter.build (warm store, rebuild=false)
//   → live compileBattery (corpus cards + declared predicates) → runBattery
//   → trace → strike → report (writer + HUNT_DONE event + mirror).
// WHY THIS EXISTS (2026-09-15): the live path hit `path is not defined` in the
// container — scan.ts's resolveCorpusPaths called path.isAbsolute/path.resolve
// with no node:path import, and the stub-battery seam skips that code. This
// battery is the class-catcher for live-only defects (missing imports, untested
// branches on the real route). Runs against a tmp fixture root; the host's real
// corbell binary satisfies the adapter's `corbell --help` guard (the machine
// never builds — graph.rebuild=false reads the warm store).
// W4 EXTENSION (graphify-populated store → the same full live chain): the
// fixture gains a graphify leg — the REAL `graphify extract --code-only
// --no-cluster` CLI runs on the SAME src tree, then spawnBugHunterLoop runs
// with an adapterOverride-free profile (substrate graphify, routed via
// selectAdapter -> GraphifyAdapter.read -> writeGraph -> mirror, the map.ts
// graphify case) and must reach the SAME terminal contract (HUNT_DONE +
// report bytes + event row). Plus the LINELESS_NODE adversarial: a map() call
// over a build whose CODE node lost its line everywhere refuses NAMED in the
// scan-phase guard (map() itself — never a silent drop, never a throw past
// the tool boundary).
import { Database } from "bun:sqlite";
import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import { spawnBugHunterLoop } from "../src/hunter/tools/bug-hunt.ts";
import { resolveLine, tryResolveLine } from "../src/hunter/shared/line-resolve.ts";
import { assertMappableLines, map } from "../src/hunter/harness/map.ts";
import { resolveGraphifyBinary } from "../src/hunter/graph/graphify-adapter.ts";
import type { BuildResult, GraphAdapter, GraphNode } from "../src/hunter/graph/interface.ts";
import type { ProjectProfile } from "../src/hunter/profile/schema.ts";

const dirs: string[] = [];

function fixtureRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-hunter-live-"));
  dirs.push(root);
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "corbell-data", ".corbell"), { recursive: true });

  // The corpus — prose only (no card shapes; the declared predicates carry
  // the battery). The loader validates this file EXISTS.
  fs.writeFileSync(
    path.join(root, "docs", "PORT_CORPUS.md"),
    "# Live corpus\n\nThe canon read for the hunt.\nDead machinery shows up as modules with zero inbound callers.\n",
  );

  // The source files (the adapter's enrichment reads them if referenced).
  fs.writeFileSync(
    path.join(root, "src", "a.ts"),
    "export function deadFn() {\n  return 1.5;\n}\nexport function liveFn() {\n  return deadFn();\n}\n",
  );

  // The warm corbell store (the vendor schema subset the adapter reads).
  const ws = new Database(path.join(root, "corbell-data", ".corbell", "workspace.db"), { create: true });
  ws.exec("CREATE TABLE graph_nodes (id TEXT PRIMARY KEY, node_type TEXT, data TEXT);");
  ws.exec("CREATE TABLE graph_edges (source_id TEXT, target_id TEXT, kind TEXT, metadata TEXT);");
  const abs = path.join(root, "src", "a.ts");
  ws.run("INSERT INTO graph_nodes VALUES (?, ?, ?)", ["f::a.ts::deadFn", "method", JSON.stringify({ file_path: abs, method_name: "deadFn", line_start: 1 })]);
  ws.run("INSERT INTO graph_nodes VALUES (?, ?, ?)", ["f::a.ts::liveFn", "method", JSON.stringify({ file_path: abs, method_name: "liveFn", line_start: 4 })]);
  // liveFn calls deadFn — deadFn's only inbound arrives THROUGH the call, so
  // unwired() (the 0-inbound class) flags deadFn still only if calls don't
  // count as wiring; keep one truly-dead node to guarantee a finding:
  ws.run("INSERT INTO graph_nodes VALUES (?, ?, ?)", ["f::a.ts::orphan", "method", JSON.stringify({ file_path: abs, method_name: "orphan", line_start: 3 })]);
  ws.run("INSERT INTO graph_edges VALUES (?, ?, ?, ?)", ["f::a.ts::liveFn", "f::a.ts::deadFn", "method_call", "{}"]);
  ws.close();

  // The profile — the LIVE constitution (loader-validated, colon-free YAML).
  fs.writeFileSync(
    path.join(root, "profile.yaml"),
    [
      "profileVersion: 1",
      "project:",
      "  name: gi-hunter-live",
      `  root: ${root}`,
      "  languages: [typescript]",
      "  entryPoints: [src/a.ts]",
      "  build: bun run build",
      "  test: bun test",
      "graph:",
      "  substrate: corbell",
      "  scope: [src]",
      "  excludes: [node_modules, dist]",
      "  rebuild: false",
      "rules:",
      "  corpus: [docs/PORT_CORPUS.md]",
      "  bindings:",
      "    declaredPredicates:",
      "      P1:",
      "        template: wiring.no-dead-module",
      "        verbatimQuote: The graph lists dead machinery - a module with zero inbound callers is unwired surface",
      "        anchor: PORT_CORPUS_line_3",
      "        severity: HIGH",
      "pipeline:",
      "  stages:",
      "    - id: s1",
      "      entry: main",
      "      contract: the corbell substrate reads the warm parse-grade index",
      "history:",
      "  failureLogs: []",
      "awareness:",
      "  docs: []",
      "",
    ].join("\n"),
  );
  return root;
}

afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("st-hunter-live: the LIVE hunt chain (no stubs)", () => {
  test("spawnBugHunterLoop reaches state=done with a report + HUNT_DONE event", async () => {
    const root = fixtureRoot();
    const result = await spawnBugHunterLoop({
      targetPath: root,
      profilePath: path.join(root, "profile.yaml"),
    });
    // THE TERMINAL CONTRACT — a live hunt either completes or fails CLOSED
    // with a named error; it never returns silently.
    if (result.state === "inconclusive") {
      // Fail-closed is the correct behavior for environment gaps — but THIS
      // fixture is complete by construction, so an INCONCLUSIVE here is the
      // regression being hunted. Print the named error for the fix.
      throw new Error(`LIVE HUNT INCONCLUSIVE (named): ${result.error}`);
    }
    expect(result.state).toBe("done");
    expect(result.runId).toMatch(/^gi-hunter-live-hunt-\d{8}-\d+$/);
    expect(result.findingsCount).toBeGreaterThanOrEqual(1);
    expect(result.reportPath).toBeTruthy();
    expect(fs.existsSync(result.reportPath as string)).toBe(true);
    const report = fs.readFileSync(result.reportPath as string, "utf-8");
    expect(report).toContain(result.runId);

    // The HUNT_DONE event row (the machine's own terminal record).
    const db = new Database(path.join(root, ".trident", "knowledge-graph", "shared.db"), { readonly: true });
    try {
      const rows = db.query("SELECT payload FROM events WHERE kind = 'HUNT_DONE'").all() as { payload: string }[];
      expect(rows.length).toBeGreaterThanOrEqual(1);
      const payload = JSON.parse(rows[rows.length - 1].payload) as { runId?: string };
      expect(payload.runId).toBe(result.runId);
    } finally {
      db.close();
    }
  }, 120000);
});

// ---------------------------------------------------------------------------
// W4 — the graphify-populated store → the SAME full live chain (HUNT_DONE +
// report bytes + event row), via the REAL graphify CLI on the SAME src tree.
// ---------------------------------------------------------------------------

/** The graphify fixture: the SAME src/a.ts + corpus as fixtureRoot, plus the
 *  REAL `graphify extract --code-only --no-cluster` output at
 *  <root>/graphify-out/graph.json and a substrate-graphify profile. Skips
 *  (returns null) when the graphify binary is absent — the hermetic leg of
 *  st-graphify-port owns the binary-missing refusal; this leg proves the
 *  LIVE chain, not the guard. */
function graphifyFixtureRoot(): string | null {
  const bin = resolveGraphifyBinary();
  if (!bin.present) return null;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-hunter-live-gfy-"));
  dirs.push(root);
  fs.mkdirSync(path.join(root, "docs"), { recursive: true });
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "docs", "PORT_CORPUS.md"),
    "# Live corpus\n\nThe canon read for the hunt.\nDead machinery shows up as modules with zero inbound callers.\n",
  );
  // SAME source shape as the corbell leg: deadFn (L1) + liveFn (L4, calls
  // deadFn at L5) — the graphify extract yields L-anchored nodes/edges.
  fs.writeFileSync(
    path.join(root, "src", "a.ts"),
    "export function deadFn() {\n  return 1.5;\n}\nexport function liveFn() {\n  return deadFn();\n}\n",
  );
  const res = spawnSync(bin.bin, ["extract", root, "--code-only", "--no-cluster"], {
    cwd: root,
    timeout: 120_000,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) {
    throw new Error(`GRAPHIFY_EXTRACT_FAILED: ${String(res.stderr ?? res.stdout ?? "").slice(-500)}`);
  }
  const graphPath = path.join(root, "graphify-out", "graph.json");
  if (!fs.existsSync(graphPath)) throw new Error(`GRAPHIFY_EXTRACT_FAILED: no graph.json at ${graphPath}`);
  // SAME constitution shape, substrate graphify (routed via selectAdapter ->
  // GraphifyAdapter.read -> writeGraph -> mirror — the map.ts graphify case).
  fs.writeFileSync(
    path.join(root, "profile.yaml"),
    [
      "profileVersion: 1",
      "project:",
      "  name: gi-hunter-live",
      `  root: ${root}`,
      "  languages: [typescript]",
      "  entryPoints: [src/a.ts]",
      "  build: bun run build",
      "  test: bun test",
      "graph:",
      "  substrate: graphify",
      "  scope: [src]",
      "  excludes: [node_modules, dist]",
      "rules:",
      "  corpus: [docs/PORT_CORPUS.md]",
      "  bindings:",
      "    declaredPredicates:",
      "      P1:",
      "        template: wiring.no-dead-module",
      "        verbatimQuote: The graph lists dead machinery - a module with zero inbound callers is unwired surface",
      "        anchor: PORT_CORPUS_line_3",
      "        severity: HIGH",
      "pipeline:",
      "  stages:",
      "    - id: s1",
      "      entry: main",
      "      contract: the graphify substrate reads the CLI-extracted graph",
      "history:",
      "  failureLogs: []",
      "awareness:",
      "  docs: []",
      "",
    ].join("\n"),
  );
  // Guarantee one truly-unwired CODE node (the extract's own calls spine may
  // wire deadFn via liveFn — the orphan below pins the finding floor >= 1).
  // NOTE: appended AFTER the extract, so the adapter's build reads the
  // graph.json rows only — the orphan is injected via an adapterOverride-free
  // seam below (a second graph.json node row), keeping the CLI output honest.
  const raw = JSON.parse(fs.readFileSync(graphPath, "utf8")) as { nodes: Array<Record<string, unknown>>; edges: unknown[] };
  raw.nodes.push({
    id: "src_a_orphan",
    label: "orphan()",
    file_type: "code",
    source_file: "src/a.ts",
    source_location: "L3",
    _callable: true,
    _origin: "ast",
  });
  fs.writeFileSync(graphPath, JSON.stringify(raw), "utf8");
  return root;
}

describe("st-hunter-live: the graphify-populated LIVE hunt chain (no stubs)", () => {
  test("graphify-populated store reaches state=done with a report + HUNT_DONE event", async () => {
    const root = graphifyFixtureRoot();
    if (root === null) {
      console.warn("[st-hunter-live] graphify binary absent — skipping the graphify live leg (the hermetic refusal lives in st-graphify-port)");
      return;
    }
    const result = await spawnBugHunterLoop({
      targetPath: root,
      profilePath: path.join(root, "profile.yaml"),
    });
    if (result.state === "inconclusive") {
      throw new Error(`GRAPHIFY LIVE HUNT INCONCLUSIVE (named): ${result.error}`);
    }
    expect(result.state).toBe("done");
    expect(result.runId).toMatch(/^gi-hunter-live-hunt-\d{8}-\d+$/);
    expect(result.findingsCount).toBeGreaterThanOrEqual(1);
    expect(result.reportPath).toBeTruthy();
    expect(fs.existsSync(result.reportPath as string)).toBe(true);
    const bytes = fs.statSync(result.reportPath as string).size;
    expect(bytes).toBeGreaterThan(0);
    const report = fs.readFileSync(result.reportPath as string, "utf-8");
    expect(report).toContain(result.runId);
    // The HUNT_DONE event row (the machine's own terminal record).
    const db = new Database(path.join(root, ".trident", "knowledge-graph", "shared.db"), { readonly: true });
    try {
      const rows = db.query("SELECT payload FROM events WHERE kind = 'HUNT_DONE'").all() as { payload: string }[];
      expect(rows.length).toBeGreaterThanOrEqual(1);
      const payload = JSON.parse(rows[rows.length - 1].payload) as { runId?: string };
      expect(payload.runId).toBe(result.runId);
    } finally {
      db.close();
    }
  }, 120000);
});

describe("st-hunter-live: the shared resolveLine + the LINELESS_NODE refusal", () => {
  test("resolveLine walks node line -> data.line_start -> source_location", () => {
    expect(resolveLine({ line: 7, data: {} }, null, "t1")).toBe(7);
    expect(resolveLine({ data: { line_start: 12 } }, null, "t2")).toBe(12);
    expect(resolveLine({ data: { source_location: "L9" } }, null, "t3")).toBe(9);
    expect(
      resolveLine({ data: {} }, { source_location: "L4" }, "t4"),
    ).toBe(4);
    expect(tryResolveLine({ data: {} }, null)).toBeUndefined();
  });

  test("assertMappableLines refuses NAMED on a line-less CODE node with a file anchor", () => {
    const profile = loadProfileForLineless();
    void profile;
    const lineless: GraphNode = {
      id: "graphify:src_a_ghost",
      kind: "function",
      name: "ghost()",
      file: "/tmp/ghost-fixture/src/a.ts",
      line: undefined,
      lineage: "CODE_DERIVED",
      source: "graphify:src_a_ghost",
      data: {},
    };
    const build: BuildResult = {
      nodes: [lineless],
      edges: [],
      durationMs: 1,
      adapter: "corbell",
      lineage: { spec: 0, code: 1, hybrid: 0 },
      command: "lineless-probe",
    };
    let msg = "";
    try {
      assertMappableLines(build);
    } catch (e: unknown) {
      msg = e instanceof Error ? e.message : String(e);
    }
    // THE NAMED REFUSAL — the scan phase refuses NAMED (never a silent drop,
    // never a throw past the tool boundary: map()'s caller routes INCONCLUSIVE).
    expect(msg).toContain("LINELESS_NODE");
    expect(msg).toContain("graphify:src_a_ghost");
  });

  test("map() over a line-less CODE build refuses LINELESS_NODE (fail-closed, db untouched)", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-hunter-lineless-"));
    dirs.push(root);
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "docs", "PORT_CORPUS.md"), "# corpus\n");
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export function ghost() {\n  return 0;\n}\n");
    const profile: ProjectProfile = {
      profileVersion: 1,
      project: {
        name: "lineless-probe",
        root,
        languages: ["typescript"],
        entryPoints: ["src/a.ts"],
        build: "bun run build",
        test: "bun test",
      },
      graph: { substrate: "corbell", scope: ["src"], excludes: [] },
      rules: { corpus: ["docs/PORT_CORPUS.md"], bindings: {} },
      pipeline: { stages: [{ id: "s1", entry: "main", contract: "lineless" }] },
      history: { failureLogs: [] },
      awareness: { docs: [] },
    };
    const lineless: GraphNode = {
      id: "corbell:f::a.ts::ghost",
      kind: "function",
      name: "ghost",
      file: path.join(root, "src", "a.ts"),
      line: undefined,
      lineage: "CODE_DERIVED",
      source: "corbell:f::a.ts::ghost",
      data: {},
    };
    const stub: GraphAdapter = {
      build: async () => ({
        nodes: [lineless],
        edges: [],
        durationMs: 1,
        adapter: "corbell",
        lineage: { spec: 0, code: 1, hybrid: 0 },
        command: "lineless-probe",
      }),
      whoCalls: () => [],
      chain: () => [],
      imports: () => [],
      awaits: () => [],
      unwired: () => [],
      nodes: () => [lineless],
    };
    let msg = "";
    try {
      const r = await map(profile, stub);
      try { r.db.close(); } catch { /* idempotent */ }
    } catch (e: unknown) {
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(msg).toContain("LINELESS_NODE");
    expect(msg).toContain("corbell:f::a.ts::ghost");
    // Fail-closed BEFORE persistence: no shared.db was materialized.
    expect(fs.existsSync(path.join(root, ".trident", "knowledge-graph", "shared.db"))).toBe(false);
  });
});

/** Minimal loader-free profile anchor for the lineless unit (the loader needs
 *  a real file; this probe only needs the shape for context). */
function loadProfileForLineless(): ProjectProfile {
  return {
    profileVersion: 1,
    project: {
      name: "lineless-probe",
      root: "/tmp",
      languages: ["typescript"],
      entryPoints: ["src/a.ts"],
      build: "bun run build",
      test: "bun test",
    },
    graph: { substrate: "corbell", scope: ["src"], excludes: [] },
    rules: { corpus: [], bindings: {} },
    pipeline: { stages: [{ id: "s1", entry: "main", contract: "lineless" }] },
    history: { failureLogs: [] },
    awareness: { docs: [] },
  };
}
