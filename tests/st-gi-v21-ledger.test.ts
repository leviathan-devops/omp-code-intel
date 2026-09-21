// st-gi-v21-ledger — W1: THE FIRE LEDGER (the calibration substrate).
//
// THE DEBT THIS PAYS: the blueprint's §8.2 NAMES a table and nothing wrote it.
// FireGate's config declares `ledgerPath` (fire-gate.ts:222) — "Absent ⇒ no
// ledger ⇒ no calibration" — and NO CODE READS IT. The seam was designed; the
// writer was never built. Every fire since has been unmeterable.
//
// ADVERSARIAL-FIRST (the pin's discipline): the FAILURE paths run before the
// happy path. A ledger that cannot fail loudly is a ledger that silently loses
// rows, and a lost row is an uncalibratable fire.

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  FireGate,
  absorbContext,
  type DecisionRow,
  type Fire,
} from "../src/omp/fire-gate.ts";
// `Judge` is DEFINED in enforcement.ts (line 34) — fire-gate.ts imports it but
// does not re-export it, so importing it from there is a TS2459.
import type { Judge } from "../src/omp/enforcement.ts";
import {
  FIRE_DECISIONS_COLUMNS,
  FireLedger,
  drain,
  withLedger,
} from "../src/omp/fire-ledger.ts";
import { checkCalibrationHealth, derivePolicy, type RuleProfile } from "../src/omp/calibration.ts";

// ── the harness ─────────────────────────────────────────────────────────────
function tmpLedgerPath(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gi-v21-ledger-"));
  return path.join(d, "fire-decisions.sqlite");
}

/** A judge stub that answers with a FIXED probability — the test controls the
 *  band, never the model. */
function stubJudge(p: number, calls?: { n: number }): Judge {
  return {
    async evaluate() {
      if (calls) calls.n += 1;
      return [{ id: "fire_is_real", probability: p }];
    },
  };
}

function aFire(over: Partial<Fire> = {}): Fire {
  return {
    ruleId: "*theatrical",
    cls: "theatrical",
    shape: "claim with zero bound spans",
    tool: "goal.complete",
    target: "migration",
    evidence: "claims=1 unbound=1 spans[0]=0",
    ...over,
  };
}

/** A context whose slots carry the target WITHOUT a negation — so the MPSE
 *  pre-filter does NOT settle it and the judgment reaches the judge. */
function aCtx(fire: Fire) {
  return absorbContext(fire, [
    { kind: "reasoning", text: "because the migration is the act under audit", offsetMs: -200 },
    { kind: "toolcall", text: "bun test ./tests/", offsetMs: -100 },
  ]);
}

describe("st-gi-v21-ledger: W1 — the fire ledger", () => {
  // ══ ADVERSARIAL FIRST: the failure paths ══════════════════════════════════

  test("test_ledger_fails_loud — an unwritable path THROWS, never a silent no-op", () => {
    // a directory that does not exist: a silent ledger would swallow this, and
    // every fire after it would be unmeterable with NO signal.
    let threw = false;
    let msg = "";
    try {
      const l = new FireLedger("/nonexistent-dir-xyz/nope/deep/fire.sqlite");
      l.append({
        at: new Date(0).toISOString(), ruleId: "r", cls: "dumb", questionVersion: "q",
        probability: 0.5, band: "ignore", action: "IGNORE", policyName: "p",
        actThreshold: 0.8, flagThreshold: 0.4, stateHash: "h", costUsd: 0, laterTruth: "unresolved",
      });
    } catch (e) {
      threw = true;
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(threw).toBe(true);
    // LOUD means NAMED — the kernel's law for every failure code.
    expect(msg).toContain("GI_LEDGER");
  });

  test("test_ledger_no_double_write — draining twice does NOT duplicate a row", async () => {
    const p = tmpLedgerPath();
    const ledger = new FireLedger(p);
    const gate = new FireGate({ judge: stubJudge(0.91), now: () => 1000 });
    const fire = aFire();
    await gate.judge(fire, aCtx(fire));

    const n1 = drain(gate, ledger);
    const n2 = drain(gate, ledger);          // the second drain: NOTHING new
    expect(n1).toBe(1);
    expect(n2).toBe(0);                       // ★ the watermark holds
    expect(ledger.count()).toBe(1);           // ★ still exactly one row
    ledger.close();
  });

  // ══ ★★★ EN-090 — THE TARGET SURVIVES THE WHOLE CHAIN ═══════════════════════════════════
  //    The gate HAS the target (`buildState` line 244: `target: fire.target`), HASHES it
  //    (`sha256(...).slice(0,16)`) and used to DROP the plaintext — so no reader could point
  //    a gatherer at the subject. THE MEASURED CONSEQUENCE: E1's sizing paired subjects by
  //    rule, and all 3 "resolved" fires turned out to be artifacts the sizing script had
  //    itself rewritten. THIS TEST DRIVES THE REAL GATE, not a stand-in.

  test("★ EN-090 test_ledger_row_carries_the_target — a REAL fire's subject reaches the row", async () => {
    const p = tmpLedgerPath();
    const ledger = new FireLedger(p);
    const gate = new FireGate({ judge: stubJudge(0.91), now: () => 1000 });
    const fire = aFire();

    await gate.judge(fire, aCtx(fire));
    expect(drain(gate, ledger)).toBe(1);

    const rows = ledger.all(1);
    const row = rows[0]!;
    // ★ THE HASH IS STILL WRITTEN — the state contract is unchanged.
    expect(typeof row.stateHash).toBe("string");
    // ★ AND THE PLAINTEXT SUBJECT IS NOW WRITTEN BESIDE IT. Without this the oracle's
    //   caller must GUESS the subject, and every calibration number it produces is a
    //   number about the guess. ★ AND IT IS TYPED: PersistedFireRow extends DecisionRow,
    //   so the reader sees it without a cast.
    expect(row.target).toBe(fire.target);
    ledger.close();
  });

  // ══ THE DDL IS THE CONTRACT (§8.2 verbatim) ══════════════════════════════

  test("test_ledger_ddl_exact — the table's columns match blueprint §8.2", () => {
    const p = tmpLedgerPath();
    const ledger = new FireLedger(p);
    const cols = ledger.columns();
    expect(cols).toEqual([...FIRE_DECISIONS_COLUMNS]);
    // the two indices — the reader depends on them for the counts query
    const idx = ledger.indices();
    expect(idx).toContain("idx_fd_rule_truth");
    expect(idx).toContain("idx_fd_hash");
    ledger.close();
  });

  // ══ THE HAPPY PATH — LAST ════════════════════════════════════════════════

  test("test_ledger_row_written — a fire writes exactly ONE row, laterTruth unresolved", async () => {
    const p = tmpLedgerPath();
    const ledger = new FireLedger(p);
    const calls = { n: 0 };
    const gate = new FireGate({ judge: stubJudge(0.91, calls), now: () => 1000 });
    const fire = aFire();

    const d = await gate.judge(fire, aCtx(fire));
    expect(calls.n).toBe(1);                          // the model WAS consulted
    expect(d.probability).toBeCloseTo(0.91, 6);

    const n = drain(gate, ledger);
    expect(n).toBe(1);                                // ★ a row per fire

    const rows = ledger.all();
    expect(rows.length).toBe(1);
    const r = rows[0]!;
    // ★ THE ROW CARRIES THE GATE'S OWN NUMBERS — no recomputation, no drift.
    expect(r.ruleId).toBe(d.row.ruleId);
    expect(r.cls).toBe(d.row.cls);
    expect(r.probability).toBeCloseTo(d.row.probability, 6);
    expect(r.band).toBe(d.row.band);
    expect(r.action).toBe(d.row.action);
    expect(r.stateHash).toBe(d.row.stateHash);
    // §6.4.3 rule (3): the threshold IN FORCE is recorded on the row.
    expect(r.actThreshold).toBeCloseTo(d.row.actThreshold, 6);
    expect(r.flagThreshold).toBeCloseTo(d.row.flagThreshold, 6);
    // §6.4.7: written 'unresolved' at firing time, NEVER assumed.
    expect(r.laterTruth).toBe("unresolved");
    expect(r.truthAt).toBeNull();
    expect(r.id).toBeGreaterThan(0);
    ledger.close();
  });

  test("test_ledger_truth_update — the oracle's write lands, and feeds the counts", async () => {
    const p = tmpLedgerPath();
    const ledger = new FireLedger(p);
    const gate = new FireGate({ judge: stubJudge(0.91), now: () => 1000 });
    const fire = aFire();
    await gate.judge(fire, aCtx(fire));
    drain(gate, ledger);

    const hash = ledger.all()[0]!.stateHash;
    const n = ledger.recordTruth(hash, "confirmed", "2026-09-21T00:00:00.000Z");
    expect(n).toBe(1);
    const r = ledger.all()[0]!;
    expect(r.laterTruth).toBe("confirmed");
    expect(r.truthAt).toBe("2026-09-21T00:00:00.000Z");

    // ★ the counts map is what calibration.ts consumes — same keys, same shape.
    const counts = ledger.countsByRule();
    expect(counts["*theatrical"]).toEqual({ confirmed: 1, refuted: 0, unresolved: 0 });
    ledger.close();
  });

  test("test_ledger_feeds_calibration — countsByRule drives derivePolicy + health", async () => {
    const p = tmpLedgerPath();
    const ledger = new FireLedger(p);
    // 12 confirmed + 0 refuted for one rule — above minFiresForAct so the
    // derivation actually ENGAGES rather than falling back to the seed.
    for (let i = 0; i < 12; i++) {
      const gate = new FireGate({ judge: stubJudge(0.91), now: () => 1000 + i });
      const fire = aFire({ evidence: `claims=1 unbound=1 spans[0]=${i}` }); // distinct states (no cache hit)
      await gate.judge(fire, aCtx(fire));
      drain(gate, ledger);
    }
    // A FIRING IS NOT A RESOLUTION. Until the oracle (W2) resolves them, every
    // row is unresolved and precision has NO denominator — the first version of
    // this test asserted confirmed=12 straight after firing, and the ledger
    // correctly reported 0. That is the honesty law working: an unresolved row
    // is never counted as good evidence.
    const unresolvedBefore = ledger.countsByRule()["*theatrical"]!;
    expect(unresolvedBefore).toEqual({ confirmed: 0, refuted: 0, unresolved: 12 });

    // THE ORACLE'S STEP, done explicitly here (W2 owns the real gatherers).
    for (const r of ledger.all()) ledger.recordTruth(r.stateHash, "confirmed");

    const counts = ledger.countsByRule();
    expect(counts["*theatrical"]!.confirmed).toBe(12);
    expect(counts["*theatrical"]!.unresolved).toBe(0);

    const profile: RuleProfile = {
      ruleId: "*theatrical", cls: "theatrical",
      cost: { falseBlock: 4, missed: 1 }, minFiresForAct: 10,
    };
    const pol = derivePolicy(profile, counts[profile.ruleId] ?? null);
    expect(pol.calibrated).toBe(true);              // ★ the loop ENGAGED

    const health = checkCalibrationHealth([pol], counts);
    // ZERO findings: a ledger exists, it is not starved, and the bar is sane.
    expect(health.ok).toBe(true);
    expect(health.findings).toEqual([]);
    ledger.close();
  });

  // ══ THE COUNT-IS-TRUE CHECK ══════════════════════════════════════════════

  test("test_ledger_persistence_across_open — the rows SURVIVE the process", async () => {
    const p = tmpLedgerPath();
    const first = new FireLedger(p);
    const gate = new FireGate({ judge: stubJudge(0.91), now: () => 1000 });
    const fire = aFire();
    await gate.judge(fire, aCtx(fire));
    drain(gate, first);
    first.close();

    // a FRESH opener sees the row — this is the whole point of persistence.
    const second = new FireLedger(p);
    expect(second.count()).toBe(1);
    const r = second.all()[0]!;
    expect(r.ruleId).toBe("*theatrical");
    // and the schema survived too (a re-open must not need to re-migrate)
    expect(second.columns()).toEqual([...FIRE_DECISIONS_COLUMNS]);
    second.close();
  });
});
