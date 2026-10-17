import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { assessLayer, formatLayerLine, loadLayerFixture } from "../../src/gi/index";

const FIXTURE = path.resolve("tests/gi/fixtures/empty-layer");
const FORBIDDEN = "OK 0/0 100%";

describe("GI-3 empty layer", () => {
  test("the empty-layer fixture reports EMPTY/RED and never OK 0/0 100%", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-empty-"));
    try {
      fs.cpSync(FIXTURE, dir, { recursive: true });
      const health = assessLayer(loadLayerFixture(dir));
      expect(health.status).toBe("EMPTY");
      expect(health.color).toBe("RED");
      expect(health.total).toBe(0);
      expect(health.inScope).toBe(0);
      expect(health.ratio).toBeNull();
      expect(health.line).toBe("EMPTY/RED L6_graphify 0/0");
      expect(health.line).not.toContain(FORBIDDEN);

      const cli = spawnSync("bun", ["scripts/layer-health", dir], { encoding: "utf8" });
      expect(cli.status).toBe(1);
      expect(cli.stdout).toContain("EMPTY/RED L6_graphify 0/0");
      expect(`${cli.stdout}${cli.stderr}`).not.toContain(FORBIDDEN);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a caller that labels zero rows OK still cannot format OK 0/0 100%", () => {
    const line = formatLayerLine({ name: "L0", status: "OK", total: 0, inScope: 0 });
    expect(line).toBe("EMPTY/RED L0 0/0");
    expect(line).not.toContain(FORBIDDEN);
  });

  test("a non-empty in-scope layer stays OK with its real ratio", () => {
    const health = assessLayer({ name: "structural", total: 4, inScope: 4 });
    expect(health.status).toBe("OK");
    expect(health.color).toBe("GREEN");
    expect(health.ratio).toBe(1);
    expect(health.line).toBe("OK structural 4/4 100%");
    expect(health.line).not.toContain(FORBIDDEN);
  });

  test("a populated layer under the scope bar is RED, not an empty-layer pass", () => {
    const health = assessLayer({ name: "structural", total: 10, inScope: 1 });
    expect(health.status).toBe("SCOPE_SUSPECT");
    expect(health.color).toBe("RED");
    expect(health.line).toBe("RED structural 1/10 10%");
  });
});
