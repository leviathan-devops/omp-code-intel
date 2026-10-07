import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { FireLedger, FIRE_DECISIONS_COLUMNS, drain } from "../src/omp/fire-ledger.ts";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "en090-"));

describe("EN-090 — THE TARGET COLUMN", () => {
  test("the column list and the live table agree", () => {
    const p = path.join(tmp, "fresh.sqlite");
    const l = new FireLedger(p);
    const cols = (l.rawDb().query("PRAGMA table_info(fire_decisions)").all() as { name: string }[])
      .map((c) => c.name);
    expect(cols).toEqual([...FIRE_DECISIONS_COLUMNS]);
    expect(cols).toContain("target");
    l.close();
  });

  test("★ THE MIGRATION — an EXISTING 15-column ledger GAINS the column", () => {
    const p = path.join(tmp, "legacy.sqlite");
    // ★ build the OLD shape by hand: exactly what a live ledger on disk looks like
    const old = new Database(p, { create: true });
    old.exec(`CREATE TABLE fire_decisions (
      id INTEGER PRIMARY KEY, at TEXT NOT NULL, rule_id TEXT NOT NULL, cls TEXT NOT NULL,
      question_version TEXT NOT NULL, probability REAL NOT NULL, band TEXT NOT NULL,
      action TEXT NOT NULL, policy_name TEXT NOT NULL, act_threshold REAL NOT NULL,
      flag_threshold REAL NOT NULL, state_hash TEXT NOT NULL, cost_usd REAL NOT NULL DEFAULT 0,
      later_truth TEXT NOT NULL DEFAULT 'unresolved', truth_at TEXT)`);
    old.exec(`INSERT INTO fire_decisions (at, rule_id, cls, question_version, probability, band,
      action, policy_name, act_threshold, flag_threshold, state_hash, cost_usd, later_truth)
      VALUES ('2026-09-20T00:00:00Z','R1','destructive','q',0.9,'act','FIRE','p',0.8,0.4,'abc123',0,'unresolved')`);
    old.close();
    // ★ AND THE LEDGER MUST OPEN IT. Without the ALTER, `prepare` names a column that is not
    //   there and EVERY FIRE FAILS APPEND_FAILED — a silent loss of calibration.
    const l = new FireLedger(p);
    const cols = (l.rawDb().query("PRAGMA table_info(fire_decisions)").all() as { name: string }[])
      .map((c) => c.name);
    expect(cols).toContain("target");
    // ★ AND THE LEGACY ROW SURVIVES with target NULL — honest, because its target was hashed
    //   away and is irrecoverable.
    const legacy = l.rawDb().query("SELECT state_hash AS h, target FROM fire_decisions").get() as
      { h: string; target: string | null };
    expect(legacy.h).toBe("abc123");
    expect(legacy.target).toBeNull();
    l.close();
  });

  test("★ A FIRE'S TARGET PERSISTS — and the oracle can now be pointed at the subject", () => {
    const p = path.join(tmp, "roundtrip.sqlite");
    const l = new FireLedger(p);
    const gate = {
      rows: () => [{
        at: "2026-09-21T09:00:00Z", ruleId: "R1", cls: "destructive", questionVersion: "q",
        probability: 0.9, band: "act", action: "FIRE", policyName: "p",
        actThreshold: 0.8, flagThreshold: 0.4, stateHash: "deadbeef",
        target: "src/omp/kernel-v2.ts", costUsd: 0, laterTruth: "unresolved" as const,
      }],
    } as unknown as Parameters<typeof drain>[0];
    expect(drain(gate, l)).toBe(1);
    const row = l.rawDb().query("SELECT target, state_hash AS h FROM fire_decisions").get() as
      { target: string; h: string };
    // ★ BEFORE EN-090 THIS ROW CARRIED ONLY THE HASH — and the subject was unrecoverable.
    expect(row.h).toBe("deadbeef");
    expect(row.target).toBe("src/omp/kernel-v2.ts");
    l.close();
  });
});
