// PORTED FROM v443-en38 fork hydra/pipeline.ts:27-29 (empty-subagents gate) + :110-116 (post-gate fail) + :145-161 (dispatchSubagent AETHER_MIGRATION stub) + :163-168 (failLoud) — gate + synthesizer battery

import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { HydraPipeline, specForTemplate } from "../pipeline.ts";
import { templateByLayerId } from "../templates/index.ts";
import type { HunterSettlement } from "../auditor.ts";
import type { GraphifyGraph } from "../map-reader.ts";

type Input = { targetRoot: string; graphPath: string };
type Synthesis = { count: number };

function testConfig(overrides?: Partial<Parameters<typeof makeConfig>[0]>): ReturnType<typeof makeConfig> {
  return makeConfig(overrides);
}

function makeConfig(overrides?: {
  subagents?: ReturnType<typeof specForTemplate>[];
  pre?: { name: string; check: (v: Input) => Promise<{ passed: boolean; reason?: string }> }[];
  post?: { name: string; check: (v: Synthesis) => Promise<{ passed: boolean; reason?: string }> }[];
  ledgerRoot?: string;
}) {
  const ledgerRoot = overrides?.ledgerRoot ?? fs.mkdtempSync(path.join(os.tmpdir(), "hydra-pipe-"));
  const template = templateByLayerId("R31-sro-cycles")!;
  return {
    ledgerRoot,
    config: {
      name: "test-pipeline",
      targetRootFor: (i: Input) => i.targetRoot,
      graphPathFor: (i: Input) => i.graphPath,
      subagents: overrides?.subagents ?? [specForTemplate(template, ledgerRoot)],
      gates: { pre: overrides?.pre ?? [], post: overrides?.post ?? [] },
      synthesizer: async (results: { status: string }[], _graph: GraphifyGraph): Promise<Synthesis> => ({
        count: results.filter((r) => r.status === "fulfilled").length,
      }),
      buildOutput: (synthesis: Synthesis) => synthesis,
    },
  };
}

describe("hydra pipeline gates + synthesizer", () => {
  test("empty subagents throws GATE FAILED", async () => {
    const { config } = testConfig({ subagents: [] });
    const pipe = new HydraPipeline(config);
    await expect(pipe.execute({ targetRoot: "/tmp/fx383", graphPath: "/tmp/fx383/graphify-out/graph.json" }))
      .rejects.toThrow("GATE FAILED: subagents");
  });

  test("failing pre-gate throws GATE FAILED with gate name", async () => {
    const { config } = testConfig({ pre: [{ name: "must-exist", check: async () => ({ passed: false, reason: "nope" }) }] });
    const pipe = new HydraPipeline(config);
    await expect(pipe.execute({ targetRoot: "/tmp/fx383", graphPath: "/tmp/fx383/graphify-out/graph.json" }))
      .rejects.toThrow("GATE FAILED: must-exist");
  });

  test("failing post-gate throws GATE FAILED with gate name", async () => {
    const { config } = testConfig({ post: [{ name: "count-positive", check: async () => ({ passed: false, reason: "zero" }) }] });
    const pipe = new HydraPipeline(config);
    await expect(pipe.execute({ targetRoot: "/tmp/fx383", graphPath: "/tmp/fx383/graphify-out/graph.json" }))
      .rejects.toThrow("GATE FAILED: count-positive");
  });

  test("dispatchSubagent stays a loud AETHER_MIGRATION stub", async () => {
    const { config } = testConfig();
    const pipe = new HydraPipeline(config);
    const graph = { nodes: [], edges: [], communities: [], godNodes: [] };
    await expect(pipe.dispatchSubagent(config.subagents[0]!, { targetRoot: "", graphPath: "" }, graph, []))
      .rejects.toThrow("AETHER_MIGRATION");
  });

  test("execute fans out one template → fulfilled synthesis count 1", async () => {
    const { config, ledgerRoot } = testConfig();
    try {
      const pipe = new HydraPipeline(config);
      const out = await pipe.execute({ targetRoot: "/tmp/fx383", graphPath: "/tmp/fx383/graphify-out/graph.json" });
      expect(out.count).toBe(1);
      expect(pipe.evidence.map((e) => e.kind)).toContain("PIPELINE_DONE");
      const report = path.join(ledgerRoot, "R31-sro-cycles", "findings", "report.md");
      expect(fs.existsSync(report)).toBe(true);
      expect(fs.statSync(report).size).toBeGreaterThan(0);
    } finally {
      fs.rmSync(ledgerRoot, { recursive: true, force: true });
    }
  }, 60000);

  test("missing graphPath surfaces GRAPH_LOAD_FAILED with the real token", async () => {
    const { config, ledgerRoot } = testConfig();
    try {
      const pipe = new HydraPipeline(config);
      await expect(pipe.execute({ targetRoot: "/tmp/fx383", graphPath: path.join(ledgerRoot, "absent.json") }))
        .rejects.toThrow("GRAPHIFY_NOT_WARM");
    } finally {
      fs.rmSync(ledgerRoot, { recursive: true, force: true });
    }
  });

  test("settlement shape: fulfilled carries findings/fileBytes/raw/telemetry", async () => {
    const s = await specForTemplate(templateByLayerId("R30-sro-dead-code")!, fs.mkdtempSync(path.join(os.tmpdir(), "hydra-shape-")))
      .run({ targetRoot: "/tmp/fx383", graphPath: "/tmp/fx383/graphify-out/graph.json" }, { nodes: [], edges: [], communities: [], godNodes: [] }) as HunterSettlement;
    expect(s.status).toBe("fulfilled");
    if (s.status === "fulfilled") {
      expect(s.fileBytes).toBeGreaterThan(0);
      expect(s.raw).toContain("## FINDING:");
      expect(s.raw).toContain("## SUMMARY");
    }
  }, 60000);
});
