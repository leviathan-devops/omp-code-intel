// W44 qwen-scan highs — one named test per finding, red→green, one commit per fix.
// F1 = populate-corbell:111 LIMIT-vs-cap (SQL LIMIT 20001 silently cuts rows the
// 50k in-memory cap claims to allow; over-cap rows never counted in skipped).
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { describe, test, expect } from "bun:test";
import { populateFromCorbellCheckout } from "../src/omp/populate-corbell.ts";

describe("st-gi-w44-highs: qwen scan tail", () => {
  // ---------- F1 (populate-corbell:111 LIMIT vs cap) ----------
  test("test_w44_corbell_sql_limit_matches_cap_over_20k_rows", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "gi-w44-limit-"));
    const warmDir = path.join(root, ".omp", "graph-intelligence", "corbell-checkout");
    fs.mkdirSync(warmDir, { recursive: true });
    const warmPath = path.join(warmDir, "store.sqlite");
    const warm = new Database(warmPath);
    warm.exec(`CREATE TABLE typed_nodes (canonical_id TEXT, kind TEXT, label TEXT, file TEXT, line INTEGER, run TEXT, superseded_run TEXT);
CREATE TABLE typed_edges (src_canonical TEXT, dst_canonical TEXT, predicate TEXT, evidence_quote TEXT, confidence REAL, run TEXT, superseded_run TEXT);`);
    // 20,100 valid nodes — ABOVE the old SQL LIMIT (20001), BELOW the 50k cap.
    warm.exec("BEGIN");
    const ins = warm.prepare(
      "INSERT INTO typed_nodes (canonical_id, kind, label, file, line, run, superseded_run) VALUES (?, 'function', ?, 'src/n.ts', 1, 'warm', NULL)",
    );
    for (let i = 0; i < 20_100; i++) {
      ins.run(`c-n${String(i).padStart(8, "0")}`, `n${i}`);
    }
    warm.exec("COMMIT");
    warm.close();
    // root contains ONLY .omp (skipped by the freshness walk) → fresh gates pass.

    const storePath = path.join(root, "sessions", "sesW44LIMIT0000001", "store.sqlite");
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    const r = populateFromCorbellCheckout(storePath, root, "w44limit");
    expect(r.ok).toBe(true);
    // THE FIX: nothing silently dropped by a SQL LIMIT smaller than the cap.
    expect(r.nodes).toBe(20_100);
    expect(r.skipped ?? 0).toBe(0);
  });
});
