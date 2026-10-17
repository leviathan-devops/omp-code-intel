import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  GRAPH_LOAD_BUDGET_BYTES,
  GraphifyGraphTooLargeError,
  isGraphifyIgnored,
  listRefreshInputs,
  loadGraphDocument,
  parseGraphifyIgnore,
  refreshGraphify,
} from "../../src/gi/index";

function scratch(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gi-refresh-"));
}

describe("GI-1 graphify refresh", () => {
  test("repo .graphifyignore skips checkpoints, sqlite backups, and graphify-out inputs", () => {
    const rules = parseGraphifyIgnore(fs.readFileSync(path.resolve(".graphifyignore"), "utf8"));
    expect(isGraphifyIgnored("Checkpoints/gi-v1/store.sqlite", rules)).toBe(true);
    expect(isGraphifyIgnored("graphify-out/graph.json", rules)).toBe(true);
    expect(isGraphifyIgnored(".omp/graph-intelligence/graphify-checkout/store.sqlite", rules)).toBe(true);
    expect(isGraphifyIgnored("backups/store.bak", rules)).toBe(true);
    expect(isGraphifyIgnored("src/gi/refresh.ts", rules)).toBe(false);
  });

  test("a later ! exception re-includes one path under an ignored directory", () => {
    const rules = parseGraphifyIgnore("Checkpoints/\n!Checkpoints/keep.ts\n");
    expect(isGraphifyIgnored("Checkpoints/other.ts", rules)).toBe(true);
    expect(isGraphifyIgnored("Checkpoints/keep.ts", rules)).toBe(false);
  });

  test("refresh walks kept sources and does not descend into ignored backups", () => {
    const dir = scratch();
    try {
      fs.mkdirSync(path.join(dir, "src"), { recursive: true });
      fs.mkdirSync(path.join(dir, "backups"), { recursive: true });
      fs.mkdirSync(path.join(dir, "graphify-out"), { recursive: true });
      fs.writeFileSync(path.join(dir, "src/a.ts"), "export const a = 1;\n");
      fs.writeFileSync(path.join(dir, "backups/store.sqlite"), "not-a-real-db");
      fs.writeFileSync(path.join(dir, ".graphifyignore"), "backups/\ngraphify-out/\n*.sqlite\n");
      fs.writeFileSync(
        path.join(dir, "graphify-out/graph.json"),
        JSON.stringify({ nodes: [{ id: "a" }], edges: [] }),
      );
      const inputs = listRefreshInputs(dir);
      expect(inputs.kept).toEqual([".graphifyignore", "src/a.ts"]);
      expect(inputs.ignored).toContain("backups");
      expect(inputs.kept.join("\n")).not.toContain("store.sqlite");
      const refreshed = refreshGraphify(dir);
      expect(refreshed.nodes).toBe(1);
      expect(refreshed.edges).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("over-budget graph.json fails with GRAPHIFY_GRAPH_TOO_LARGE before read or parse", () => {
    const dir = scratch();
    try {
      const graph = path.join(dir, "graph.json");
      fs.writeFileSync(graph, "");
      fs.truncateSync(graph, GRAPH_LOAD_BUDGET_BYTES + 1);
      let reads = 0;
      let parses = 0;
      expect(() =>
        loadGraphDocument(graph, {
          read: () => {
            reads += 1;
            return "{";
          },
          parse: () => {
            parses += 1;
            return {};
          },
        }),
      ).toThrow(GraphifyGraphTooLargeError);
      expect(reads).toBe(0);
      expect(parses).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("refresh of an over-budget graphify-out fails closed and does not parse", () => {
    const dir = scratch();
    try {
      fs.mkdirSync(path.join(dir, "graphify-out"), { recursive: true });
      fs.writeFileSync(path.join(dir, ".graphifyignore"), "graphify-out/\n");
      const graph = path.join(dir, "graphify-out/graph.json");
      fs.writeFileSync(graph, "this is not json and it is over the test budget");
      let parses = 0;
      expect(() => refreshGraphify(dir, { budgetBytes: 8, parse: () => {
        parses += 1;
        return {};
      } })).toThrow(/GRAPHIFY_GRAPH_TOO_LARGE/);
      expect(parses).toBe(0);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("growth past the budget between stat and read is still GRAPHIFY_GRAPH_TOO_LARGE", () => {
    const dir = scratch();
    try {
      const graph = path.join(dir, "graph.json");
      fs.writeFileSync(graph, "{}");
      expect(() =>
        loadGraphDocument(graph, {
          budgetBytes: 4,
          read: () => "x".repeat(32),
        }),
      ).toThrow(/GRAPHIFY_GRAPH_TOO_LARGE/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
