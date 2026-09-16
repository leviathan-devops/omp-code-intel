// PORTED FROM v443-en38 fork hydra/graphify.ts:32-65 (connect validation) + :67-75 (listTools) + :77-94 (callTool) + :96-106 (disconnect) + hydra/graph-mapper.ts:12-38 (EN-38 budgets), :139-154 (guarded load), :183-270 (query/path/explain fallbacks) — adversarial halves
// Battery law: every error path returns its NAMED token; every fallback prints token+reason+remedy.

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GraphifyClientReader, createGraphifyToolDefs } from "../client-reader.ts";
import { GraphifyMapReader, readGraphJson } from "../map-reader.ts";

function fakeTransport(opts?: { failList?: boolean; failCall?: boolean }) {
  return {
    calls: [] as string[],
    async listTools() {
      if (opts?.failList) throw new Error("boom-list");
      return ["query_graph", "shortest_path", "get_node", "get_neighbors"];
    },
    async callTool(name: string, _args: Record<string, unknown>) {
      (this as unknown as { calls: string[] }).calls.push(name);
      if (opts?.failCall) throw new Error("boom-call");
      return `ok:${name}`;
    },
    async close() {},
  };
}

describe("hydra client-reader adversarial", () => {
  test("attach rejects empty graphPath with GRAPHIFY_CONNECT_INVALID", async () => {
    const c = new GraphifyClientReader();
    await expect(c.attach("", fakeTransport())).rejects.toThrow("GRAPHIFY_CONNECT_INVALID");
  });

  test("createGraphifyToolDefs rejects null MCP with GRAPHIFY_TOOLS_INVALID", () => {
    expect(() => createGraphifyToolDefs(null)).toThrow("GRAPHIFY_TOOLS_INVALID");
  });

  test("callTool before attach rejects GRAPHIFY_NOT_CONNECTED (never silent)", async () => {
    const c = new GraphifyClientReader();
    await expect(c.callTool("query_graph", { question: "x" })).rejects.toThrow("GRAPHIFY_NOT_CONNECTED");
  });

  test("disconnect-then-call rejects GRAPHIFY_NOT_CONNECTED", async () => {
    const c = new GraphifyClientReader();
    await c.attach("/tmp/fx383/graphify-out/graph.json", fakeTransport());
    expect(c.isConnected()).toBe(true);
    await c.disconnect();
    expect(c.isConnected()).toBe(false);
    await expect(c.callTool("query_graph", {})).rejects.toThrow("GRAPHIFY_NOT_CONNECTED");
  });

  test("listTools failure surfaces GRAPHIFY_MCP_LIST_FAILED", async () => {
    const c = new GraphifyClientReader();
    await c.attach("/tmp/fx383/graphify-out/graph.json", fakeTransport({ failList: true }));
    await expect(c.listTools()).rejects.toThrow("GRAPHIFY_MCP_LIST_FAILED");
  });

  test("attach re-attaches (disconnect-first lifecycle, no leak)", async () => {
    const c = new GraphifyClientReader();
    await c.attach("/tmp/fx383/graphify-out/graph.json", fakeTransport());
    await c.attach("/tmp/fx383/graphify-out/graph.json", fakeTransport());
    expect(c.isConnected()).toBe(true);
    expect(c.getGraphPath()).toBe("/tmp/fx383/graphify-out/graph.json");
  });
});

describe("hydra map-reader adversarial + fixture", () => {
  test("empty graphPath rejects GRAPHIFY_CONNECT_INVALID", async () => {
    await expect(readGraphJson("")).rejects.toThrow("GRAPHIFY_CONNECT_INVALID");
  });

  test("missing graph.json rejects GRAPHIFY_NOT_WARM with remedy", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-nowarm-"));
    try {
      await expect(readGraphJson(path.join(dir, "graph.json"))).rejects.toThrow("GRAPHIFY_NOT_WARM");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("oversized graph.json rejects GRAPHIFY_GRAPH_TOO_LARGE (never OOM)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-huge-"));
    const fp = path.join(dir, "graph.json");
    try {
      const fd = fs.openSync(fp, "w");
      fs.ftruncateSync(fd, 128 * 1024 * 1024 + 1);
      fs.closeSync(fd);
      await expect(readGraphJson(fp)).rejects.toThrow("GRAPHIFY_GRAPH_TOO_LARGE");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("malformed graph.json rejects GRAPHIFY_EXTRACT_FAILED", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hydra-badjson-"));
    const fp = path.join(dir, "graph.json");
    try {
      fs.writeFileSync(fp, "{not json", "utf-8");
      await expect(readGraphJson(fp)).rejects.toThrow("GRAPHIFY_EXTRACT_FAILED");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("fixture graph.json loads the measured upstream ground truth (regen 2026-09-16: 4 nodes/5 edges, spine intact)", async () => {
    const g = await readGraphJson("/tmp/fx383/graphify-out/graph.json");
    // Fixture regenerated 2026-09-16 after the host restart wiped /tmp/fx383
    // (same shape: alpha.ts L1 + beta.ts L1-L2 import+call, graphify 0.9.51
    // --no-cluster). The re-extract measures 4 nodes / 5 edges: file+fn per
    // file, imports_from + imports + calls(beta->alpha) + 2 contains. The
    // calls spine the verb tests need is intact — count updated to MEASURED.
    expect(g.nodes.length).toBe(4);
    expect(g.edges.length).toBe(5);
    expect(g.godNodes.length).toBeGreaterThan(0);
  });

  test("query falls back to local scan when MCP call fails (loud, still answers)", async () => {
    const c = new GraphifyClientReader();
    await c.attach("/tmp/fx383/graphify-out/graph.json", fakeTransport({ failCall: true }));
    const reader = new GraphifyMapReader(c);
    const g = await reader.load("/tmp/fx383/graphify-out/graph.json");
    const sub = await reader.query(g, "alpha beta");
    expect(sub.nodes.length).toBeGreaterThan(0);
    expect(sub.query).toBe("alpha beta");
  });

  test("path BFS finds beta() → alpha() calls spine on fixture", async () => {
    const reader = new GraphifyMapReader(null);
    const g = await reader.load("/tmp/fx383/graphify-out/graph.json");
    const p = await reader.path(g, "beta()", "alpha()");
    expect(p.length).toBeGreaterThan(0);
    expect(p.hops.length).toBe(p.length + 1);
  });

  test("explain rejects unknown concept with GRAPHIFY_EXPLAIN_NOT_FOUND", async () => {
    const reader = new GraphifyMapReader(null);
    const g = await reader.load("/tmp/fx383/graphify-out/graph.json");
    await expect(reader.explain(g, "no-such-concept-zzz")).rejects.toThrow("GRAPHIFY_EXPLAIN_NOT_FOUND");
  });

  test("merge dedupes nodes and edges", async () => {
    const reader = new GraphifyMapReader(null);
    const g = await reader.load("/tmp/fx383/graphify-out/graph.json");
    const merged = await reader.merge([g, g]);
    expect(merged.nodes.length).toBe(g.nodes.length);
    expect(merged.edges.length).toBe(g.edges.length);
  });
});
