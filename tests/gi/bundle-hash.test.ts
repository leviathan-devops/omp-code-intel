import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BUNDLE = path.resolve("extensions/graph-intelligence/index.js");
const SCRIPT = path.resolve("scripts/check-gi-bundle-hash.sh");

function sha256(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

describe("GI-4 bundle hash", () => {
  test("a mismatched deployed hash fails", () => {
    const deployed = "0".repeat(64);
    const result = spawnSync("bash", [SCRIPT, deployed], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("GI_BUNDLE_HASH_MISMATCH");
    expect(result.stderr).toContain(`deployed=${deployed}`);
    expect(result.stdout).toContain("graph-intelligence index.js sha256=");
  });

  test("the matching deployed hash passes and the script prints the repo hash", () => {
    const actual = sha256(BUNDLE);
    const result = spawnSync("bash", [SCRIPT, actual.toUpperCase()], { encoding: "utf8" });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`graph-intelligence index.js sha256=${actual}`);
    expect(result.stdout).toContain("GI_BUNDLE_HASH_OK");
  });

  test("the committed bundle is the build of src/gi and carries the lane tokens", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-bundle-"));
    try {
      const out = path.join(dir, "index.js");
      const built = spawnSync(
        "bun",
        ["build", "src/gi/index.ts", "--outfile", out, "--format=esm", "--target=node"],
        { encoding: "utf8" },
      );
      expect(built.status).toBe(0);
      expect(fs.readFileSync(out)).toEqual(fs.readFileSync(BUNDLE));
      const text = fs.readFileSync(BUNDLE, "utf8");
      expect(text).toContain("GRAPHIFY_GRAPH_TOO_LARGE");
      expect(text).toContain("CORBELL_SQLITE_BUSY");
      expect(text).toContain("EMPTY/RED");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("gates workflow runs the hash script", () => {
    const yml = fs.readFileSync(path.resolve(".github/workflows/gates.yml"), "utf8");
    expect(yml).toContain("scripts/check-gi-bundle-hash.sh");
  });
});
