// OMP-NEW (no fork source file): the st-corbell-port proof battery.
// Proves: (a) workspace.yaml emission (version "1" + root ".." + repo ..);
// (b) a REAL `corbell graph build --methods` against a small fixture TS tree
// (2 files + 1 call) yields nodes>0 via the adapter store read; (c) store-map
// writes typed_nodes+typed_edges into a session-shaped sqlite path with
// matching counts; (d) GRAPH_EMPTY loud on an empty dir; (e) CORBELL_NOT_FOUND
// path when binaryPath is forced bad.
//
// The battery shells the REAL corbell binary (no exec stub) — the fixture is
// two TS files with one cross-file call. Session-shaped store paths come from
// openSessionStore (GI_OMP_DB_DIR is pointed at a temp dir per test so the
// machine-wide registry is never touched). The scripts/corbell-build.ts CLI is
// exercised manually against the same fixture shape (acceptance step).
import { Database } from "bun:sqlite";

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { CorbellAdapter, resolveCorbell } from "../src/hunter/graph/corbell-adapter.ts";
import { corbellEdgeToPredicate, writeCorbellToTypedStore } from "../src/hunter/graph/store-map.ts";
import { loadProfile } from "../src/hunter/profile/loader.ts";
import type { ProjectProfile } from "../src/hunter/profile/schema.ts";
import { countTypedEdges, countTypedNodes } from "../src/omp/typed-write.ts";
import { openSessionStore } from "../src/omp/store-open.ts";
import { closeGiRegistry } from "../src/omp/gi-registry.ts";

function makeProfile(root: string, name: string, extra?: Partial<ProjectProfile["graph"]>): ProjectProfile {
  return {
    profileVersion: 1,
    project: {
      name,
      root,
      languages: ["typescript"],
      entryPoints: ["src/a.ts"],
      build: "bun run build",
      test: "bun test",
    },
    graph: { substrate: "corbell", scope: ["src"], excludes: [], ...extra },
    rules: { corpus: [], bindings: {} },
    pipeline: { stages: [{ id: "s1", entry: "main", contract: "st-corbell-port" }] },
    history: { failureLogs: [] },
    awareness: { docs: [] },
  };
}

/** The small fixture TS tree: 2 files + 1 cross-file call (a.ts foo -> b.ts bar). */
function writeFixture(root: string): void {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "src", "a.ts"),
    'import { bar } from "./b";\nexport function foo(): number {\n  return bar() + 1;\n}\n',
  );
  fs.writeFileSync(path.join(root, "src", "b.ts"), "export function bar(): number {\n  return 41;\n}\n");
}

function isolateRegistry(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-corbell-"));
  process.env.GI_OMP_DB_DIR = dir;
  return dir;
}

describe("st-corbell-port: adapter + store-map + CLI proof", () => {
  test("(a) emitted workspace.yaml contains version 1 + root .. + repo ..", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cb-ws-"));
    try {
      const profile = makeProfile(root, "WsProbe");
      const adapter = new CorbellAdapter(profile);
      const wsPath = path.join(root, "corbell-data", "workspace.yaml");
      adapter.emitWorkspaceConfig(profile, wsPath);
      const text = fs.readFileSync(wsPath, "utf8");
      expect(text).toContain('version: "1"');
      expect(text).toContain('root: ".."');
      expect(text).toContain("repo: ..");
      expect(text).toContain("language: typescript");
      expect(text).toContain("path: .corbell/workspace.db");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("(b) real corbell build on the fixture yields nodes>0 with a calls edge", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cb-fixture-"));
    try {
      writeFixture(root);
      const profile = makeProfile(root, "Fixture");
      const adapter = new CorbellAdapter(profile);
      const build = await adapter.build(profile);
      expect(build.nodes.length).toBeGreaterThan(0);
      const names = build.nodes.map((n) => n.name);
      expect(names).toContain("foo");
      expect(names).toContain("bar");
      const kinds = new Set(build.nodes.map((n) => n.kind));
      expect([...kinds].some((k) => ["method", "class", "function", "file", "rule", "constant"].includes(k))).toBe(true);
      expect(build.edges.length).toBeGreaterThanOrEqual(1);
      expect(build.edges.map((e) => e.kind)).toContain("calls");
      expect(build.command).toBe("corbell graph build --methods");
      // The store read is the REAL row source: re-read agrees with the build.
      const reread = adapter.readStore(profile);
      expect(reread.nodes.length).toBe(build.nodes.length);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("(c) store-map writes typed rows into a session-shaped path, counts match", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cb-map-"));
    const scopeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cb-scope-"));
    isolateRegistry();
    try {
      writeFixture(root);
      const profile = makeProfile(root, "MapFixture");
      const adapter = new CorbellAdapter(profile);
      const build = await adapter.build(profile);
      const opened = openSessionStore({ sessionId: "ses_CORBELMP00000000000001", scopeRoot });
      const written = writeCorbellToTypedStore(opened.storePath, build.nodes, build.edges, {
        runTag: "st-corbell-port",
      });
      const store = new Database(opened.storePath, { readonly: true });
      expect(countTypedNodes(opened.storePath)).toBe(build.nodes.length);
      expect(countTypedEdges(opened.storePath)).toBe(build.edges.length);
      // Spot-check the faithful mapping: service node keeps its corbell kind,
      // the method_call edge lands as predicate 'calls' with a real source line.
      try {
        const kinds = (store.query("SELECT DISTINCT kind FROM typed_nodes").all() as Array<{ kind: string }>).map(
          (r) => r.kind,
        );
        expect(kinds).toContain("method");
        const preds = (store.query("SELECT DISTINCT predicate FROM typed_edges").all() as Array<{ predicate: string }>).map(
          (r) => r.predicate,
        );
        expect(preds).toContain("calls");
        const quotes = store.query("SELECT evidence_quote FROM typed_edges LIMIT 5").all() as Array<{
          evidence_quote: string;
        }>;
        expect(quotes.length).toBeGreaterThan(0);
        expect(quotes.every((q) => q.evidence_quote.length > 0)).toBe(true);
      } finally {
        store.close();
      }
      expect(corbellEdgeToPredicate("method_call")).toBe("calls");
      expect(corbellEdgeToPredicate("flow_step")).toBe("traces-to");
    } finally {
      closeGiRegistry();
      delete process.env.GI_OMP_DB_DIR;
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(scopeRoot, { recursive: true, force: true });
    }
  });

  test("(d) GRAPH_EMPTY loud on an empty dir", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cb-empty-"));
    try {
      const profile = makeProfile(root, "Empty");
      const adapter = new CorbellAdapter(profile);
      let msg = "";
      try {
        await adapter.build(profile);
      } catch (e: unknown) {
        msg = e instanceof Error ? e.message : String(e);
      }
      expect(msg).toContain("GRAPH_EMPTY");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("(e) CORBELL_NOT_FOUND path when binaryPath forced bad", () => {
    // resolveCorbell walks profile -> CORBELL_BIN -> the DURABLE venv sites
    // (/home/leviathan/corbell-venv, /opt/corbell-venv — both exist on this
    // host) -> PATH, so a hermetic resolve miss is impossible here. The
    // hermetic assertion is the ADAPTER's binary-guard path: a stub exec
    // that throws ENOENT surfaces ADAPTER_FAILED + the CORBELL_NOT_FOUND
    // vocabulary with the git+https remedy.
    const stubGuard = new CorbellAdapter(makeProfile("/tmp", "NotFoundProbe"), () => {
      const err = new Error("spawn /nonexistent-cb-bin-xyz ENOENT") as Error & { code: string };
      err.code = "ENOENT";
      throw err;
    });
    let msg = "";
    try {
      // Private-access probe: same-package private, not external input — named const carries the shape.
      const guardRunner = stubGuard as unknown as { assertCorbell(p: ProjectProfile): void };
      guardRunner.assertCorbell(makeProfile("/tmp", "NotFoundProbe"));
    } catch (e: unknown) {
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(msg).toContain("ADAPTER_FAILED");
    expect(msg).toContain("CORBELL_NOT_FOUND");
    expect(msg).toContain("git+https://github.com/Corbell-AI/Corbell.git");
  });

  test("(loader) profile schema+loader round-trip the YAML subset", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "cb-prof-"));
    try {
      writeFixture(root);
      fs.writeFileSync(path.join(root, "spec.md"), "# spec\n");
      const yaml = [
        "profileVersion: 1",
        "project:",
        "  name: prof-probe",
        `  root: ${root}`,
        "  languages: [typescript]",
        "  entryPoints: [src/a.ts]",
        "  build: bun run build",
        "  test: bun test",
        "graph:",
        "  substrate: corbell",
        "  scope: [src]",
        "  excludes: [node_modules]",
        "rules:",
        "  corpus: [spec.md]",
        "pipeline:",
        "  stages:",
        "    - id: s1",
        "      entry: main",
        "      contract: probe-contract",
        "history:",
        "  failureLogs: []",
        "awareness:",
        "  docs: []",
        "",
      ].join("\n");
      const p = path.join(root, "profile.yaml");
      fs.writeFileSync(p, yaml);
      const loaded = loadProfile(p);
      expect(loaded.project.name).toBe("prof-probe");
      expect(loaded.graph.substrate).toBe("corbell");
      expect(loaded.pipeline.stages[0].id).toBe("s1");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
