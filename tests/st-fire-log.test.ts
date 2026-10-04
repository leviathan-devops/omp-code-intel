// st-fire-log — pins the two Jev enforcement layers' FULL-DATA fire logging.
//
// Operator ruling 2026-10-04: every TSG + ABIDE fire writes full decision data to ONE space
// (~/.omp/run/fire-log/), sharded by stream, append-only.
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { logFire, fireLogDir } from "../src/omp/fire-log.ts";

const DIR = path.join(os.tmpdir(), "firelog-test-" + process.pid);

describe("st-fire-log: the one-space fire log", () => {
  beforeEach(() => { process.env.GI_FIRELOG_DIR = DIR; fs.rmSync(DIR, { recursive: true, force: true }); });
  afterEach(() => { fs.rmSync(DIR, { recursive: true, force: true }); delete process.env.GI_FIRELOG_DIR; });

  test("fireLogDir honors GI_FIRELOG_DIR", () => { expect(fireLogDir()).toBe(DIR); });

  test("logFire writes ONE self-contained JSON row per fire to the stream shard", () => {
    logFire("tsg", { surface: "judge", kind: "STTGF_SMOKE", choice: "refuse", confidence: 0.57 });
    logFire("abide", { surface: "judge-diff", file: "src/x.ts", verdict: "REPAIR", scores: { r1: 0.9 } });
    const tsg = fs.readFileSync(path.join(DIR, "tsg.jsonl"), "utf8").trim().split("\n");
    const ab = fs.readFileSync(path.join(DIR, "abide.jsonl"), "utf8").trim().split("\n");
    expect(tsg.length).toBe(1);
    expect(ab.length).toBe(1);
    const row = JSON.parse(tsg[0]);
    expect(row.stream).toBe("tsg");
    expect(row.surface).toBe("judge");
    expect(row.kind).toBe("STTGF_SMOKE");
    expect(typeof row.ts).toBe("string");
    const a = JSON.parse(ab[0]);
    expect(a.surface).toBe("judge-diff");
    expect(a.scores.r1).toBe(0.9);
  });

  test("append-only: N fires → N rows (no overwrite, no interleave)", () => {
    for (let i = 0; i < 50; i++) logFire("tsg", { surface: "enforce", i, enforced: i % 2 ? "refused" : "served" });
    const rows = fs.readFileSync(path.join(DIR, "tsg.jsonl"), "utf8").trim().split("\n");
    expect(rows.length).toBe(50);
    expect(JSON.parse(rows[49]).i).toBe(49);
    for (const r of rows) expect(() => JSON.parse(r)).not.toThrow();
  });

  test("a fire-log fault is NAMED and NEVER throws (the verdict stands)", () => {
    // point at a path that cannot be a directory (a file), forcing mkdir to fail
    const bad = path.join(DIR, "afile");
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(bad, "x");
    process.env.GI_FIRELOG_DIR = path.join(bad, "nested");
    expect(() => logFire("tsg", { surface: "judge" })).not.toThrow();
  });
});
