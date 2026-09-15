import { describe, expect, test } from "bun:test";
import { GI_TOOL_NAMES, registerGiOmpTools, type GiExtensionAPI } from "../src/omp/extension.ts";

function stubPi(): { pi: GiExtensionAPI; names: string[]; exec: Record<string, (...a: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }>> } {
  const names: string[] = [];
  const exec: Record<string, (...a: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }>> = {};
  const optionalStr = { optional: () => optionalStr };
  const pi: GiExtensionAPI = {
    zod: {
      string: () => optionalStr,
      enum: () => optionalStr,
      object: () => ({}),
    },
    registerTool: (tool) => {
      names.push(tool.name);
      exec[tool.name] = tool.execute as typeof exec[string];
    },
  };
  return { pi, names, exec };
}

describe("W2 GI tools", () => {
  test("factory registers the four canonical names + the graph-code-audit alias", () => {
    const { pi, names } = stubPi();
    const ret = registerGiOmpTools(pi, () => "/tmp");
    expect(ret).toEqual([...GI_TOOL_NAMES]);
    expect(ret).toContain("aether-code-audit");
    expect(ret).not.toContain("graph-code-audit");
    expect(names).toContain("aether-code-audit");
    expect(names).toContain("graph-code-audit");
  });

  test("graph-probe action=wipe is GI_CLEAR_REFUSED without env", async () => {
    delete process.env.GI_OMP_ALLOW_CLEAR;
    const { pi, exec } = stubPi();
    registerGiOmpTools(pi, () => "/tmp");
    const out = await exec["graph-probe"]("id", { action: "wipe" }, undefined, undefined, {});
    expect(out.content[0].text).toContain("GI_CLEAR_REFUSED");
    expect(out.details.error).toBe("GI_CLEAR_REFUSED");
  });

  test("chain runQueryTool->runQuery returns the 1-step path", async () => {
    process.env.GI_OMP_DB_DIR = "/tmp/gi-tools-chain-reg";
    const { pi, exec } = stubPi();
    const cwd = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/fork-v143/live-tree";
    registerGiOmpTools(pi, () => cwd);
    const out = await exec["graph-query"]("id", { verb: "chain", from: "runQueryTool", to: "runQuery" }, undefined, undefined, { sessionID: "ses_CHAIN00000000000000001", cwd });
    expect(out.content[0].text).toContain("rows=1");
    expect(out.content[0].text).toContain("runQueryTool");
    delete process.env.GI_OMP_DB_DIR;
  }, 120000);

  test("bug-hunt status returns done + fix order", async () => {
    process.env.GI_OMP_DB_DIR = "/tmp/gi-tools-hunt-reg";
    const { pi, exec } = stubPi();
    const cwd = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/fork-v143/live-tree";
    registerGiOmpTools(pi, () => cwd);
    const out = await exec["bug-hunt"]("id", { action: "status" }, undefined, undefined, { sessionID: "ses_HUNT0000000000000000001", cwd });
    expect(out.content[0].text).toContain("state=done");
    expect(out.content[0].text).toMatch(/findingsCount=\d+/);
    delete process.env.GI_OMP_DB_DIR;
  }, 120000);
});
