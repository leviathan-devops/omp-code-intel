// st-graph-health-empty — NIGHT-GI: an EMPTY layer must FAIL the health gate
// (nonzero exit + a FAIL line), never report "OK 0/0".
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Database } from "bun:sqlite";
import { computeHealth } from "../scripts/graph-health.ts";

const REPO = path.resolve(import.meta.dir, "..");
const SCHEMA = "CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INT, layer_id TEXT, created_run TEXT, superseded_run TEXT)";

/** A target where every layer has ONE in-scope row, except the ones named in `empty`. */
function fixture(empty: Set<string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-gh-empty-"));
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src/a.ts"), "export const a = 1;\n");
  for (const [name, rel] of [["L5_corbell", "corbell-checkout"], ["L6_graphify", "graphify-checkout"], ["structural", "structural"]]) {
    const d = path.join(dir, ".omp/graph-intelligence", rel!);
    fs.mkdirSync(d, { recursive: true });
    const db = new Database(path.join(d, "store.sqlite"));
    db.run(SCHEMA);
    if (!empty.has(name!)) db.run("INSERT INTO typed_nodes VALUES ('n1','const','a','src/a.ts',1,'x','r',NULL)");
    // a SUPERSEDED row must not count as live
    db.run("INSERT INTO typed_nodes VALUES ('old','const','a','src/a.ts',1,'x','r','r0')");
    db.close();
  }
  for (const [name, rel] of [["L1_semantica", ".omp/graph-intelligence/layers/semantica/kg.json"], ["L3_ua", ".ua/knowledge-graph.json"], ["L4_c2kg", ".c2kg/index.json"]]) {
    fs.mkdirSync(path.dirname(path.join(dir, rel!)), { recursive: true });
    const nodes = empty.has(name!) ? [] : [{ file: "src/a.ts", filePath: "src/a.ts", source: "src/a.ts" }];
    fs.writeFileSync(path.join(dir, rel!), JSON.stringify({ nodes, edges: [] }));
  }
  return dir;
}

function cli(dir: string, l2: string) {
  return spawnSync(process.execPath, [path.join(REPO, "scripts/graph-health.ts"), dir, "--threshold", "0.90"], {
    encoding: "utf8", timeout: 120_000, env: { ...process.env, GI_HEALTH_L2_COUNT: l2 },
  });
}

describe("st-graph-health-empty: an empty layer FAILS (NIGHT-GI)", () => {
  test("all layers populated → exit 0, OK with real counts", () => {
    const dir = fixture(new Set());
    try {
      const r = cli(dir, "7");
      expect(r.status).toBe(0);
      expect(r.stdout).toMatch(/— OK/);
      expect(r.stdout).toMatch(/L2_arsumbris=7/);
      expect(r.stdout).not.toMatch(/^FAIL /m);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  for (const layer of ["L1_semantica", "L3_ua", "L4_c2kg", "L5_corbell", "L6_graphify", "structural"]) {
    test(`empty ${layer} → EMPTY, nonzero exit, FAIL line`, () => {
      const dir = fixture(new Set([layer]));
      try {
        const { reports } = computeHealth(dir, 0.9);
        const rep = reports.find((x) => x.layer === layer);
        expect(rep?.status).toBe("EMPTY");
        expect(rep?.reason ?? "").toMatch(new RegExp(`GI_LAYER_EMPTY:${layer}`));
        const r = cli(dir, "7");
        expect(r.status).not.toBe(0);
        expect(r.stdout).toMatch(new RegExp(`^FAIL ${layer} EMPTY 0/0`, "m"));
        expect(r.stdout).toMatch(/— FAIL$/m);
        expect(r.stdout).not.toMatch(/— OK/);
      } finally { fs.rmSync(dir, { recursive: true, force: true }); }
    });
  }

  test("live L2 daemon with 0 indexed files → EMPTY, FAIL (the old 'OK 0/0')", () => {
    const dir = fixture(new Set());
    try {
      const r = cli(dir, "0");
      expect(r.status).not.toBe(0);
      expect(r.stdout).toMatch(/^FAIL L2_arsumbris EMPTY 0\/0/m);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test("a missing store → ABSENT fails too", () => {
    const dir = fixture(new Set());
    try {
      fs.rmSync(path.join(dir, ".c2kg/index.json"));
      const r = cli(dir, "7");
      expect(r.status).not.toBe(0);
      expect(r.stdout).toMatch(/^FAIL L4_c2kg ABSENT/m);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
