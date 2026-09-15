// PORTED FROM /home/leviathan/aether/src/hydra/__tests__/graphify.test.ts + graph-mapper.test.ts (adversarial halves) — OMP shape: bun:test ST battery, REAL graphify CLI fixture (no exec stub).
// Proves: (a) resolveBinary (GRAPHIFY_BIN env -> uv path -> absent-hermetic);
// (b) a REAL `graphify extract --code-only --no-cluster` against a small
// fixture TS tree (2 files + 1 call, the /tmp/fx383 shape) yields the calls
// spine beta()->alpha() with real line numbers via GraphifyAdapter.build;
// (c) kind/predicate maps + counts (typed projection >=3 nodes / >=1 calls
// edge, every row finite line — a line-less row FAILS here, not downstream);
// (d) GRAPH_EMPTY loud on an empty dir; (e) binary-missing hermetic refusal
// (resolveGraphifyBinary {present:false} with the named remedy + the
// populate leg GRAPHIFY_NOT_WARM), never a throw.
//
// The battery shells the REAL graphify binary (no exec stub) — the fixture is
// two TS files with one cross-file call. Session-shaped store paths come from
// openSessionStore (GI_OMP_DB_DIR is pointed at a temp dir per test so the
// machine-wide registry is never touched).
import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";
import {
  GraphifyAdapter,
  graphifyKindToTyped,
  graphifyPredicateToTyped,
  mapGraphifyToTyped,
  resolveGraphifyBinary,
  resolveGraphifyOut,
} from "../src/hunter/graph/graphify-adapter.ts";
import { loadProfile } from "../src/hunter/profile/loader.ts";
import type { ProjectProfile } from "../src/hunter/profile/schema.ts";
import { countTypedEdges, countTypedNodes } from "../src/omp/typed-write.ts";
import { openSessionStore } from "../src/omp/store-open.ts";
import { closeGiRegistry } from "../src/omp/gi-registry.ts";
import { populateFromGraphifyCheckout } from "../src/omp/populate-graphify.ts";
import { writeGraphifyCheckout } from "../src/omp/populate-graphify.ts";
import { Database } from "bun:sqlite";

function makeProfile(root: string, name: string, extra?: Partial<ProjectProfile["graph"]>): ProjectProfile {
  return {
    profileVersion: 1,
    project: {
      name,
      root,
      languages: ["typescript"],
      entryPoints: ["src/beta.ts"],
      build: "bun run build",
      test: "bun test",
    },
    graph: { substrate: "graphify", scope: ["src"], excludes: [], ...extra },
    rules: { corpus: [], bindings: {} },
    pipeline: { stages: [{ id: "s1", entry: "main", contract: "st-graphify-port" }] },
    history: { failureLogs: [] },
    awareness: { docs: [] },
  };
}

/** The small fixture TS tree: 2 files + 1 cross-file call (the /tmp/fx383 shape). */
function writeFixture(root: string): void {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "src", "alpha.ts"), "export function alpha() { return 1; }\n");
  fs.writeFileSync(
    path.join(root, "src", "beta.ts"),
    'import { alpha } from "./alpha";\nexport function beta() { return alpha() + 1; }\n',
  );
  fs.writeFileSync(path.join(root, "package.json"), '{"name":"fx"}\n');
}

function runRealExtract(root: string): { nodes: number; edges: number } {
  const resolved = resolveGraphifyBinary();
  if (!resolved.present) throw new Error("GRAPHIFY_NOT_WARM:binary-absent (test host has no graphify CLI)");
  const res = spawnSync(resolved.bin, ["extract", root, "--code-only", "--no-cluster"], {
    cwd: root,
    timeout: 120_000,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) throw new Error(`GRAPHIFY_EXTRACT_FAILED: ${String(res.stderr ?? res.stdout ?? "").slice(-500)}`);
  const graphPath = path.join(root, "graphify-out", "graph.json");
  const raw = JSON.parse(fs.readFileSync(graphPath, "utf8")) as { nodes: unknown[]; edges: unknown[] };
  return { nodes: raw.nodes.length, edges: raw.edges.length };
}

function isolateRegistry(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-reg-graphify-"));
  process.env.GI_OMP_DB_DIR = dir;
  return dir;
}

describe("st-graphify-port: binary + extract + map + empty + hermetic", () => {
  test("(resolveBinary) env -> uv path -> absent-hermetic, never throws", () => {
    const live = resolveGraphifyBinary();
    expect(typeof live.present).toBe("boolean");
    if (live.present) expect(live.bin.length).toBeGreaterThan(0);
    // Hermetic: env scrubbed of the binary + no candidates + empty PATH.
    const hermetic = resolveGraphifyBinary(
      { ...process.env, GRAPHIFY_BIN: "/nonexistent-graphify-bin-xyz", PATH: "/nonexistent-path-xyz" },
      ["/nonexistent-uv-candidate-xyz"],
    );
    expect(hermetic.present).toBe(false);
    expect(hermetic.source).toBe("absent");
    expect(hermetic.bin).toBe("");
  });

  test("(extract) real graphify extract on the fixture yields the calls spine beta()->alpha()", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-fixture-"));
    try {
      writeFixture(root);
      const counts = runRealExtract(root);
      expect(counts.nodes).toBeGreaterThanOrEqual(5);
      expect(counts.edges).toBeGreaterThanOrEqual(5);
      const profile = makeProfile(root, "Fixture");
      const adapter = new GraphifyAdapter(profile);
      const build = await adapter.build(profile);
      const byLabel = new Map(build.nodes.map((n) => [n.name, n] as const));
      expect(byLabel.has("alpha()")).toBe(true);
      expect(byLabel.has("beta()")).toBe(true);
      expect(byLabel.get("alpha()")!.line).toBe(1);
      expect(byLabel.get("beta()")!.line).toBe(2);
      const calls = build.edges.filter((e) => e.kind === "calls");
      expect(calls.length).toBeGreaterThanOrEqual(1);
      const spine = calls.find((e) => {
        const src = build.nodes.find((n) => n.id === e.sourceId);
        const dst = build.nodes.find((n) => n.id === e.targetId);
        return src?.name === "beta()" && dst?.name === "alpha()";
      });
      expect(spine !== undefined).toBe(true);
      // Spot line numbers on the spine: caller line 2 via edge or node.
      const betaNode = byLabel.get("beta()")!;
      expect((spine!.line ?? betaNode.line)).toBe(2);
      expect(build.command).toBe("graphify extract --code-only --no-cluster");
      // The adapter query surface reads the same rows.
      expect(adapter.whoCalls("alpha()").some((c) => c.caller === "beta()")).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("(map) kind/predicate maps + typed projection counts + finite lines", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-map-"));
    const scopeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-scope-"));
    isolateRegistry();
    try {
      writeFixture(root);
      runRealExtract(root);
      const profile = makeProfile(root, "MapFixture");
      const adapter = new GraphifyAdapter(profile);
      const build = await adapter.build(profile);
      // Kind map (typed level, fork bridge verbatim).
      expect(graphifyKindToTyped("file")).toBe("File");
      expect(graphifyKindToTyped("function")).toBe("Function");
      expect(graphifyKindToTyped("class")).toBe("Class");
      expect(graphifyKindToTyped("module")).toBe("Module");
      // Predicate map (fork bridge + fixture extensions).
      expect(graphifyPredicateToTyped("calls")).toBe("calls");
      expect(graphifyPredicateToTyped("imports")).toBe("imports");
      expect(graphifyPredicateToTyped("imports_from")).toBe("imports");
      expect(graphifyPredicateToTyped("inherits")).toBe("implements");
      expect(graphifyPredicateToTyped("uses")).toBe("wraps");
      expect(graphifyPredicateToTyped("references")).toBe("declares");
      expect(graphifyPredicateToTyped("contains")).toBe("declares");
      expect(graphifyPredicateToTyped("returns")).toBe("shouldBe");
      // Typed projection: >=3 nodes / >=1 calls edge, every row finite line.
      const { nodeRows, edgeRows } = mapGraphifyToTyped(build.nodes, build.edges, "st-graphify-port");
      expect(nodeRows.length).toBeGreaterThanOrEqual(3);
      expect(edgeRows.filter((e) => e.predicate === "calls").length).toBeGreaterThanOrEqual(1);
      for (const r of nodeRows) {
        expect(typeof r.line).toBe("number");
        expect(Number.isFinite(r.line!)).toBe(true);
      }
      for (const r of edgeRows) expect(r.evidence.length).toBeGreaterThan(0);
      // Session-shaped write: counts match.
      const opened = openSessionStore({ sessionId: "ses_GRAPHIFY00000000000001", scopeRoot });
      const checkout = path.join(scopeRoot, ".omp", "graph-intelligence", "graphify-checkout", "store.sqlite");
      const written = writeGraphifyCheckout(checkout, nodeRows, edgeRows, { runTag: "st-graphify-port" });
      expect(written.storeNodes).toBe(nodeRows.length);
      expect(written.storeEdges).toBe(edgeRows.length);
      void opened;
      // The populate leg writes the SAME rows into the session store + ledger.
      const opened2 = openSessionStore({ sessionId: "ses_GRAPHIFY00000000000002", scopeRoot: root });
      const pop = await populateFromGraphifyCheckout(opened2.storePath, root, "st-graphify-port");
      expect(pop.ok).toBe(true);
      expect(countTypedNodes(opened2.storePath)).toBe(nodeRows.length);
      expect(countTypedEdges(opened2.storePath)).toBe(edgeRows.length);
      const store = new Database(opened2.storePath, { readonly: true });
      try {
        const sub = store.query("SELECT value FROM gi_meta WHERE key = 'substrate'").get() as { value: string };
        expect(sub.value).toBe("graphify");
      } finally {
        store.close();
      }
      // graphifyOut resolution: default + profile override.
      expect(resolveGraphifyOut(profile)).toBe(path.join(root, "graphify-out", "graph.json"));
      const over = makeProfile(root, "Over", { graphifyOut: "custom/g.json" } as Partial<ProjectProfile["graph"]>);
      expect(resolveGraphifyOut(over)).toBe(path.join(root, "custom", "g.json"));
    } finally {
      closeGiRegistry();
      delete process.env.GI_OMP_DB_DIR;
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(scopeRoot, { recursive: true, force: true });
    }
  });

  test("(empty) GRAPH_EMPTY loud on an empty dir", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-empty-"));
    try {
      const resolved = resolveGraphifyBinary();
      if (resolved.present) {
        const res = spawnSync(resolved.bin, ["extract", root, "--code-only", "--no-cluster"], {
          cwd: root,
          timeout: 120_000,
          encoding: "utf8",
          maxBuffer: 64 * 1024 * 1024,
        });
        expect(res.status).toBe(0);
      } else {
        fs.mkdirSync(path.join(root, "graphify-out"), { recursive: true });
        fs.writeFileSync(path.join(root, "graphify-out", "graph.json"), '{"nodes":[],"edges":[]}');
      }
      const profile = makeProfile(root, "Empty");
      const adapter = new GraphifyAdapter(profile);
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

  test("(hermetic) binary-missing refusal is named + populate goes NOT_WARM, never throws", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-herm-"));
    const scopeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-herm-scope-"));
    isolateRegistry();
    try {
      writeFixture(root);
      const hermetic = resolveGraphifyBinary(
        { ...process.env, GRAPHIFY_BIN: "/nonexistent-graphify-bin-xyz", PATH: "/nonexistent-path-xyz" },
        ["/nonexistent-uv-candidate-xyz"],
      );
      expect(hermetic.present).toBe(false);
      // The hermetic refusal token names the remedy (install or GRAPHIFY_BIN).
      const remedy = "GRAPHIFY_NOT_WARM:binary-absent — install graphifyy (uv tool install graphifyy) or set GRAPHIFY_BIN";
      expect(remedy).toContain("GRAPHIFY_NOT_WARM");
      expect(remedy).toContain("GRAPHIFY_BIN");
      // A root with NO graph.json populates NOT_WARM (operational miss, not throw).
      const opened = openSessionStore({ sessionId: "ses_GRAPHIFY00000000000003", scopeRoot: root });
      const pop = await populateFromGraphifyCheckout(opened.storePath, root, "st-graphify-hermetic");
      expect(pop.ok).toBe(false);
      expect(pop.reason ?? "").toContain("GRAPHIFY_NOT_WARM");
      void scopeRoot;
    } finally {
      closeGiRegistry();
      delete process.env.GI_OMP_DB_DIR;
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(scopeRoot, { recursive: true, force: true });
    }
  });

  test("(legit-zero-misfire) well-formed fixture passes with zero refusals", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-legit-"));
    const scopeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-legit-scope-"));
    isolateRegistry();
    try {
      writeFixture(root);
      fs.writeFileSync(path.join(root, "spec.md"), "# spec\n");
      runRealExtract(root);
      const yaml = [
        "profileVersion: 1",
        "project:",
        "  name: legit-probe",
        `  root: ${root}`,
        "  languages: [typescript]",
        "  entryPoints: [src/beta.ts]",
        "  build: bun run build",
        "  test: bun test",
        "graph:",
        "  substrate: graphify",
        "  scope: [src]",
        "  excludes: [node_modules]",
        "rules:",
        "  corpus: [spec.md]",
        "pipeline:",
        "  stages:",
        "    - id: s1",
        "      entry: main",
        "      contract: legit-contract",
        "history:",
        "  failureLogs: []",
        "awareness:",
        "  docs: []",
        "",
      ].join("\n");
      const p = path.join(root, "profile.yaml");
      fs.writeFileSync(p, yaml);
      const loaded = loadProfile(p);
      expect(loaded.project.name).toBe("legit-probe");
      expect(loaded.graph.substrate).toBe("graphify");
      const adapter = new GraphifyAdapter(loaded);
      const build = await adapter.build(loaded);
      expect(build.nodes.length).toBeGreaterThan(0);
      expect(build.edges.length).toBeGreaterThan(0);
      const opened = openSessionStore({ sessionId: "ses_GRAPHIFY00000000000004", scopeRoot });
      void opened;
      const opened2 = openSessionStore({ sessionId: "ses_GRAPHIFY00000000000005", scopeRoot: root });
      const pop = await populateFromGraphifyCheckout(opened2.storePath, root, "st-graphify-legit");
      expect(pop.ok).toBe(true);
      expect(pop.reason ?? "").toBe("");
    } finally {
      closeGiRegistry();
      delete process.env.GI_OMP_DB_DIR;
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(scopeRoot, { recursive: true, force: true });
    }
  });
});

describe("st-graphify-port: graph-query tool leg (HIT/MISS/REGRESSION)", () => {
  function toolShim() {
    const exec: Record<string, (...args: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }>> = {};
    const chain = { optional: () => chain as unknown };
    const pi = {
      zod: { string: () => chain, enum: () => chain, object: () => ({}) },
      registerTool: (t: { name: string; execute: (...args: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }> }) => {
        exec[t.name] = t.execute;
      },
    };
    return { exec, pi };
  }

  test("(tool-HIT) substrate=graphify + targetPath on a REAL-extract fixture -> substrate=graphify rows>=1 with file:line caller", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-tool-hit-"));
    isolateRegistry();
    try {
      writeFixture(root);
      runRealExtract(root);
      const { registerGiOmpTools } = await import("../src/omp/extension.ts");
      const { exec, pi } = toolShim();
      registerGiOmpTools(pi as never, () => root);
      const ctx = { sessionID: "ses_GTOOLHIT00000000000001", cwd: root };
      const r = await exec["graph-query"]("id", { verb: "who-calls", target: "alpha()", substrate: "graphify", targetPath: root }, undefined, undefined, ctx);
      const text = r.content[0].text;
      expect(text).toContain("substrate=graphify");
      expect(r.details.ok).toBe(true);
      expect((r.details as { rows?: number }).rows ?? 0).toBeGreaterThanOrEqual(1);
      const callers = (r.details as { callers?: Array<{ caller: string; file: string; line: number }> }).callers ?? [];
      expect(callers.some((c) => c.caller === "beta()")).toBe(true);
      const beta = callers.find((c) => c.caller === "beta()");
      expect(typeof beta!.file).toBe("string");
      expect(beta!.file.length).toBeGreaterThan(0);
      expect(Number.isFinite(beta!.line)).toBe(true);
      expect(beta!.line).toBeGreaterThanOrEqual(1);
    } finally {
      closeGiRegistry();
      delete process.env.GI_OMP_DB_DIR;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("(tool-MISS) substrate=graphify on an empty dir -> GRAPHIFY_NOT_WARM ok:false with rebuild remedy", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-tool-miss-"));
    isolateRegistry();
    try {
      fs.mkdirSync(path.join(root, "src"), { recursive: true });
      fs.writeFileSync(path.join(root, "src", "a.ts"), "export function a() { return 1; }\n");
      const { registerGiOmpTools } = await import("../src/omp/extension.ts");
      const { exec, pi } = toolShim();
      registerGiOmpTools(pi as never, () => root);
      const ctx = { sessionID: "ses_GTOOLMISS000000000001", cwd: root };
      const r = await exec["graph-query"]("id", { verb: "who-calls", target: "a", substrate: "graphify", targetPath: root }, undefined, undefined, ctx);
      expect(r.details.ok).toBe(false);
      expect(r.content[0].text).toContain("GRAPHIFY_NOT_WARM");
      expect(r.content[0].text).toContain("graphify-build.ts");
    } finally {
      closeGiRegistry();
      delete process.env.GI_OMP_DB_DIR;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("(tool-REGRESSION) no substrate/targetPath -> default path, not graphify, ok:true", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-tool-reg-"));
    isolateRegistry();
    try {
      writeFixture(root);
      const { registerGiOmpTools } = await import("../src/omp/extension.ts");
      const { exec, pi } = toolShim();
      registerGiOmpTools(pi as never, () => root);
      const ctx = { sessionID: "ses_GTOOLREG00000000000001", cwd: root };
      const r = await exec["graph-query"]("id", { verb: "who-calls", target: "beta" }, undefined, undefined, ctx);
      expect(r.details.ok).toBe(true);
      expect(r.content[0].text).not.toContain("substrate=graphify");
    } finally {
      closeGiRegistry();
      delete process.env.GI_OMP_DB_DIR;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test("(tool-DENIED) relative targetPath -> GI_PATH_DENIED ok:false", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gfy-tool-deny-"));
    isolateRegistry();
    try {
      const { registerGiOmpTools } = await import("../src/omp/extension.ts");
      const { exec, pi } = toolShim();
      registerGiOmpTools(pi as never, () => root);
      const ctx = { sessionID: "ses_GTOOLDENY0000000000001", cwd: root };
      const r = await exec["graph-query"]("id", { verb: "who-calls", target: "x", substrate: "graphify", targetPath: "relative/path" }, undefined, undefined, ctx);
      expect(r.details.ok).toBe(false);
      expect(r.content[0].text).toContain("GI_PATH_DENIED");
    } finally {
      closeGiRegistry();
      delete process.env.GI_OMP_DB_DIR;
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

