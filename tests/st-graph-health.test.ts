// st-graph-health — ★ W0 THE CLEAN FLOOR (GI_KERNEL_V2.3 FR-7).
//
// The graph-health gate: every layer ≥90% in-scope OR exit nonzero. The POSITIVE half runs
// on the REAL repo (the clean floor this wave established); the NEGATIVE half builds a
// polluted store and proves the gate FIRES (a generic pass would be a false green).
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Database } from "bun:sqlite";
import { computeHealth } from "../scripts/graph-health.ts";

const REPO = path.resolve(import.meta.dir, "..");

describe("st-graph-health: W0 the clean floor (FR-7)", () => {
  test("test_graph_health_all_layers_in_scope", () => {
    const { inScopeRoots, reports } = computeHealth(REPO, 0.9);
    expect(inScopeRoots.length).toBeGreaterThan(0);
    // the real tree: ZERO layers out of scope
    const suspects = reports.filter((r) => r.status === "SCOPE_SUSPECT").map((r) => r.layer);
    expect(suspects).toEqual([]);
    // structural is the W0 headline — it was 12.4%, it must now be ≥90%
    const structural = reports.find((r) => r.layer === "structural");
    expect(structural?.status).toBe("OK");
    expect(structural?.ratio).toBeGreaterThanOrEqual(0.9);
    // L2 is a service layer — its check is LIVENESS, never a fake ratio
    const l2 = reports.find((r) => r.layer === "L2_arsumbris");
    expect(l2?.status).toBe("OK");
  });

  test("test_graph_health_flags_polluted_layer", () => {
    // ★ THE NEGATIVE — a store whose rows live under a FOREIGN root must be SCOPE_SUSPECT.
    //   Without this half, "all OK" could just mean the gate never checks.
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gi-gh-"));
    try {
      fs.mkdirSync(path.join(dir, "src"), { recursive: true });
      fs.writeFileSync(path.join(dir, "src/a.ts"), "export const a = 1;\n");
      const storeDir = path.join(dir, ".omp/graph-intelligence/structural");
      fs.mkdirSync(storeDir, { recursive: true });
      const db = new Database(path.join(storeDir, "store.sqlite"));
      db.run("CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INT, layer_id TEXT, created_run TEXT, superseded_run TEXT)");
      // 10 rows under Checkpoints/ (foreign) + 1 under src/ (in-scope) → ~9% → must fire
      for (let i = 0; i < 10; i++) {
        db.run("INSERT INTO typed_nodes VALUES (?,?,?,?,?,?,?,NULL)", [`c${i}`, "const", "x", "Checkpoints/junk.ts", i, "structural", "r"]);
      }
      db.run("INSERT INTO typed_nodes VALUES ('c11','const','a','src/a.ts',1,'structural','r',NULL)");
      db.close();

      const { reports } = computeHealth(dir, 0.9);
      const structural = reports.find((r) => r.layer === "structural");
      expect(structural?.status).toBe("SCOPE_SUSPECT");
      expect(structural?.reason ?? "").toMatch(/GI_LAYER_SCOPE_SUSPECT:structural/);
      // and the in-scope count is the ONE src row, not 11
      expect(structural?.inScope).toBe(1);
      expect(structural?.total).toBe(11);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
