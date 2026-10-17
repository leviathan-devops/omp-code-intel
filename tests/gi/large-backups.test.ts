import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { LARGE_FILE_MAX_BYTES, isTrackedBackup } from "../../src/gi/index";

describe("tracked backup guard", () => {
  test("a large sqlite backup is flagged and ordinary source is not", () => {
    expect(isTrackedBackup("extensions/graph-intelligence/store.sqlite", 128).backup).toBe(true);
    expect(isTrackedBackup("graphify-out/graph.json", 100).backup).toBe(true);
    expect(isTrackedBackup("backups/notes.md", 20).backup).toBe(true);
    expect(isTrackedBackup("src/gi/backup-guard", 4000).backup).toBe(false);
    expect(isTrackedBackup("reports/OMP_Code_Intel_Engineering_Report_v8.md", 74908).backup).toBe(false);
    const huge = isTrackedBackup("dist/trident-index.js", LARGE_FILE_MAX_BYTES);
    expect(huge.backup).toBe(true);
    expect(huge.reason).toContain(String(LARGE_FILE_MAX_BYTES));
  });

  test("HEAD tracks no large backups", () => {
    const result = spawnSync("bun", ["scripts/no-large-backups"], {
      encoding: "utf8",
      cwd: path.resolve("."),
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("no-large-backups: HEAD tracks no backup blobs");
  });
});
