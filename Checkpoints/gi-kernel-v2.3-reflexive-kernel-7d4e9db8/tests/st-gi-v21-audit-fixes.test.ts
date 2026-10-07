// st-gi-v21-audit-fixes — THE AUDIT'S FINDINGS, PINNED.
//
// ★ PROVENANCE: these defects were found by an INDEPENDENT MODEL (ocr scan over
//   muse-spark-1.3-contributor-free, .audit/sg-ocr-fire-ledger.json) — not by my
//   own red-team, which tested bad DATA and missed the PERSISTENCE CONTRACT's
//   failure semantics: what happens when the WRITE fails, when the handle is
//   CLOSED, when the DECISION has already been made and the row cannot be saved.
//
//   I wrote this code, so my mental model WAS the code's model. The independent
//   reader asked the questions I could not see. That is the whole value of the
//   audit gate, and it is the reason these tests exist separately from the
//   red-team corpus.
//
// EVERY TEST BELOW IS WRITTEN ADVERSARIALLY-FIRST: each one fails on the code as
// the audit found it. A test that passes before the fix is not proving the fix.

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import { FireGate, absorbContext, type DecisionRow, type FireDecision, type Fire } from "../src/omp/fire-gate.ts";
import type { Judge } from "../src/omp/enforcement.ts";
import { FireLedger, drain, withLedger, LedgerError } from "../src/omp/fire-ledger.ts";

function tmpPath(name = "l.sqlite"): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gi-af-")), name);
}
function judgeOf(p: number): Judge {
  return { async evaluate() { return [{ id: "fire_is_real", probability: p }]; } };
}
function aFire(over: Partial<Fire> = {}): Fire {
  return { ruleId: "*dumb", cls: "dumb", shape: "blind edit", tool: "edit", target: "src/omp/kernel-v2.ts", evidence: "queriedBefore=false", ...over };
}
const NEUTRAL = [{ kind: "reasoning", text: "because the file is next", offsetMs: -100 }];
function aRow(over: Partial<DecisionRow> = {}): DecisionRow {
  return {
    at: new Date().toISOString(), ruleId: "*dumb", cls: "dumb", questionVersion: "q",
    probability: 0.5, band: "ignore", action: "IGNORE", policyName: "p",
    actThreshold: 0.75, flagThreshold: 0.35, stateHash: "h1", costUsd: 0, laterTruth: "unresolved",
    ...over,
  };
}

describe("st-gi-v21-audit-fixes: the independent audit's findings", () => {
  // ══ FINDING 0 (HIGH) — THE DRAIN WATERMARK ═══════════════════════════════════
  // "Drain watermark advances before persist succeeds — a throw permanently loses
  //  fires." The watermark must advance ONLY after the commit.

  test("F0-drain-watermark: a FAILED persist does not consume the watermark", () => {
    const ledger = new FireLedger(tmpPath());
    // A duck-typed gate: `drain` only ever calls `rows()`. This is the seam that
    // lets the test force a batch containing ONE invalid row.
    const good = aRow({ stateHash: "good-1" });
    const bad = aRow({ stateHash: "   " });            // empty after trim → append throws
    let rows: DecisionRow[] = [good, bad];
    const fakeGate = { rows: () => rows } as unknown as FireGate;

    // ★ THE CONTRACT, AFTER BOTH FIXES (F0 + the re-verify's R7):
    //   A malformed row must not consume the watermark AND must not block its siblings.
    //   The fast path (one transaction) fails; the per-row fallback commits the good
    //   row, reports the bad one, and leaves the bad row UNSEEN so a later drain
    //   re-attempts it (it will keep failing until the caller fixes it — correctly).
    const n1 = drain(fakeGate, ledger);
    expect(n1).toBe(1);                                // ★ the GOOD fire landed
    expect(ledger.count()).toBe(1);
    expect(ledger.all()[0]!.stateHash).toBe("good-1");
    expect(ledger.persistFailures()).toBeGreaterThan(0);   // ★ and the bad one is REPORTED
    expect(ledger.lastPersistError()!.code).toContain("GI_LEDGER");

    // ★ AND THE BAD ROW WAS NOT MARKED SEEN — remove it and the good row is not
    //   re-written (the watermark held), while the bad row is still pending.
    rows = [good];
    expect(drain(fakeGate, ledger)).toBe(0);           // nothing new; the watermark held
    expect(ledger.count()).toBe(1);                    // no duplicate
    ledger.close();
  });

  // ══ PASS-3 CRITICAL — THE WATERMARK MUST ADVANCE PER COMMITTED ROW ════════════
  // "drain() marks failed rows as seen on partial commit — permanent data loss."
  // ★ This was the ORIGINAL F0 defect RE-INTRODUCED BY F0's OWN FIX: once appendMany
  //   could commit SOME rows and fail others, marking every ATTEMPTED row as seen lost
  //   the failures forever.

  test("F0b-critical: a row that FAILED to commit is retried on the next drain", () => {
    const ledger = new FireLedger(tmpPath());
    const good = aRow({ stateHash: "good-a" });
    const bad = aRow({ stateHash: "   " });          // rejected by validation
    let rows: DecisionRow[] = [good, bad];
    const fakeGate = { rows: () => rows } as unknown as FireGate;

    const n1 = drain(fakeGate, ledger);
    expect(n1).toBe(1);                              // the good row landed
    expect(ledger.count()).toBe(1);
    expect(ledger.persistFailures()).toBeGreaterThan(0);

    // ★ THE CRITICAL'S ASSERTION: repair the bad row IN PLACE — the SAME object — and
    //   the next drain must WRITE IT. With the defect it was already marked seen, so
    //   drain returned 0 and the fire was lost permanently.
    (bad as { stateHash: string }).stateHash = "good-b";
    const n2 = drain(fakeGate, ledger);
    expect(n2).toBe(1);                              // ★ the repaired row was RETRIED
    expect(ledger.count()).toBe(2);
    expect(ledger.all().map((r) => r.stateHash).sort()).toEqual(["good-a", "good-b"]);
    // and the good row was NOT written twice
    expect(ledger.all().filter((r) => r.stateHash === "good-a").length).toBe(1);
    ledger.close();
  });

  // ══ FINDING 1 (HIGH) — withLedger DISCARDS A MADE DECISION ═══════════════════

  test("F1-withLedger: a persist failure does NOT destroy the decision", async () => {
    const ledger = new FireLedger(tmpPath());
    const gate = new FireGate({ judge: judgeOf(0.95), now: () => 1000 });
    const gated = withLedger(gate, ledger);
    ledger.close();                                    // the persist WILL fail

    const fire = aFire();
    let decision: FireDecision | null = null;
    let threw: unknown = null;
    try {
      decision = await gated.judge(fire, absorbContext(fire, NEUTRAL));
    } catch (e) { threw = e; }

    // ★ THE DECISION WAS ALREADY MADE (the model was paid for) — losing it to a
    //   PERSISTENCE failure converts a made decision into a rejection.
    expect(threw).toBeNull();
    expect(decision).not.toBeNull();
    expect(decision!.probability).toBeCloseTo(0.95, 6);
    expect(decision!.action).toBe("FIRE");
    // ★ AND THE FAILURE IS STILL LOUD — it must not be swallowed. The ledger
    //   records it and counts it, so a caller can detect the divergence.
    expect(ledger.persistFailures()).toBeGreaterThan(0);
    expect(ledger.lastPersistError()).not.toBeNull();
    expect(ledger.lastPersistError()!.code).toContain("GI_LEDGER");
  });

  // ══ FINDING 2 (MEDIUM) — USE-AFTER-CLOSE + RAW DRIVER ERRORS ═════════════════

  test("F2-use-after-close: reads after close throw a NAMED error, not a raw driver one", () => {
    const ledger = new FireLedger(tmpPath());
    ledger.append(aRow());
    ledger.close();
    for (const [name, fn] of [
      ["count", () => ledger.count()],
      ["all", () => ledger.all()],
      ["byRule", () => ledger.byRule("*dumb")],
      ["truthOf", () => ledger.truthOf("h1")],
      ["countsByRule", () => ledger.countsByRule()],
      ["columns", () => ledger.columns()],
      ["indices", () => ledger.indices()],
      ["append", () => ledger.append(aRow({ stateHash: "h2" }))],
    ] as const) {
      let msg = "";
      try { fn(); } catch (e) { msg = e instanceof Error ? e.message : String(e); }
      // ★ the loud-failure law: EVERY failure names itself as GI_LEDGER_*
      expect(msg, `${name} must name its failure`).toContain("GI_LEDGER");
    }
  });

  // ══ FINDING 3 (MEDIUM) — append() VALIDATION ═════════════════════════════════

  test("F3-append: a malformed row throws a NAMED error, never a bare TypeError", () => {
    const ledger = new FireLedger(tmpPath());
    for (const [name, bad] of [
      ["null", null],
      ["undefined", undefined],
      ["non-string stateHash", aRow({ stateHash: 42 as unknown as string })],
      ["non-string ruleId", aRow({ ruleId: 7 as unknown as string })],
      ["non-string cls", aRow({ cls: null as unknown as string })],
      ["non-finite actThreshold", aRow({ actThreshold: Number.NaN })],
      ["bad laterTruth", aRow({ laterTruth: "maybe" as unknown as DecisionRow["laterTruth"] })],
    ] as const) {
      let msg = "";
      try { ledger.append(bad as DecisionRow); } catch (e) { msg = e instanceof Error ? e.message : String(e); }
      expect(msg, `${name} must name its failure`).toContain("GI_LEDGER");
    }
    expect(ledger.count()).toBe(0);                    // nothing malformed got in
    ledger.close();
  });

  test("F3b-append: a row claiming a RESOLVED truth at firing time is REJECTED (§6.4.7)", () => {
    const ledger = new FireLedger(tmpPath());
    let msg = "";
    try { ledger.append(aRow({ laterTruth: "confirmed" })); } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    // §6.4.7: written 'unresolved' AT FIRING TIME, never assumed. Only the oracle
    // changes it, via recordTruth.
    expect(msg).toContain("GI_LEDGER");
    expect(ledger.count()).toBe(0);
    ledger.close();
  });

  // ══ FINDING 4 (MEDIUM) — truthOf vs countsByRule INCONSISTENCY ═══════════════

  test("F4-truth-consistency: corruption is PREVENTED at the source, and refused if it arrives", () => {
    const p = tmpPath();
    const ledger = new FireLedger(p);
    ledger.append(aRow({ stateHash: "corrupt-me" }));
    ledger.close();

    // ── LAYER 1 — PREVENTION. The DDL now carries a CHECK, so the injection that
    //    the audit demonstrated is REJECTED at the database.
    const raw = new Database(p);
    let injectMsg = "";
    try {
      raw.prepare(`UPDATE fire_decisions SET later_truth = 'garbage' WHERE state_hash = 'corrupt-me'`).run();
    } catch (e) { injectMsg = e instanceof Error ? e.message : String(e); }
    expect(injectMsg, "the DDL CHECK must reject a corrupt later_truth").not.toBe("");
    raw.close();

    const reopened = new FireLedger(p);
    expect(reopened.truthOf("corrupt-me")).toBe("unresolved");   // untouched
    reopened.close();

    // ── LAYER 2 — DEFENCE IN DEPTH. A row written BEFORE the CHECK existed (an
    //    older build's table, which `CREATE TABLE IF NOT EXISTS` leaves alone) must
    //    still be refused CONSISTENTLY by every reader — the audit's actual finding.
    const p2 = tmpPath("old.sqlite");
    const old = new Database(p2);
    old.exec(`CREATE TABLE IF NOT EXISTS fire_decisions (
      id INTEGER PRIMARY KEY, at TEXT NOT NULL, rule_id TEXT NOT NULL, cls TEXT NOT NULL,
      question_version TEXT NOT NULL, probability REAL NOT NULL, band TEXT NOT NULL,
      action TEXT NOT NULL, policy_name TEXT NOT NULL, act_threshold REAL NOT NULL,
      flag_threshold REAL NOT NULL, state_hash TEXT NOT NULL, cost_usd REAL NOT NULL DEFAULT 0,
      later_truth TEXT NOT NULL DEFAULT 'unresolved', truth_at TEXT
    );`);   // ★ NO CHECK — exactly an older table
    old.exec(`INSERT INTO fire_decisions (at, rule_id, cls, question_version, probability, band, action, policy_name, act_threshold, flag_threshold, state_hash, cost_usd, later_truth) VALUES ('2026-09-20T00:00:00Z','*dumb','dumb','q',0.5,'ignore','IGNORE','p',0.75,0.35,'legacy-corrupt',0,'garbage')`);
    old.close();

    const legacy = new FireLedger(p2);       // IF NOT EXISTS leaves the old schema
    let truthOfMsg = "";
    let truthOfValue: unknown = "unset";
    try { truthOfValue = legacy.truthOf("legacy-corrupt"); } catch (e) { truthOfMsg = e instanceof Error ? e.message : String(e); }
    let countsMsg = "";
    try { legacy.countsByRule(); } catch (e) { countsMsg = e instanceof Error ? e.message : String(e); }

    expect(truthOfMsg).toContain("GI_LEDGER_UNKNOWN_TRUTH");   // ★ no longer a blind cast
    expect(countsMsg).toContain("GI_LEDGER_UNKNOWN_TRUTH");    // ★ the SAME fault, named the same
    expect(truthOfValue).toBe("unset");                        // it did NOT return 'garbage'
    legacy.close();
  });

  // ══ FINDING 5 (MEDIUM) — STATEMENT LIFECYCLE ═════════════════════════════════

  test("F5-close: closing with a live prepared statement does not throw", async () => {
    const ledger = new FireLedger(tmpPath());
    ledger.append(aRow());
    // the insert statement was prepared in the constructor and used here — close()
    // must finalize it rather than leave it dangling.
    let msg = "";
    try { ledger.close(); } catch (e) { msg = e instanceof Error ? e.message : String(e); }
    expect(msg).toBe("");
    // and a double close is idempotent, not an error
    expect(() => ledger.close()).not.toThrow();
  });

  // ══ FINDING 6 (LOW) — THE PROXY'S IDENTITY ═══════════════════════════════════

  test("F6-proxy-identity: the wrapped judge is STABLE across reads", () => {
    const ledger = new FireLedger(tmpPath());
    const gated = withLedger(new FireGate({ judge: judgeOf(0.9), now: () => 1000 }), ledger);
    // the audit: each `get(judge)` allocated a new function, breaking `===`.
    // A caller comparing method identity (memoisation, effect deps, spies) would
    // see a different function every read.
    expect(gated.judge).toBe(gated.judge);
    ledger.close();
  });

  // ══ THE FIXES MUST NOT BREAK THE CONTRACT ════════════════════════════════════

  test("F-regression: the happy path is unchanged — one row per fire, drain idempotent", async () => {
    const ledger = new FireLedger(tmpPath());
    const gate = new FireGate({ judge: judgeOf(0.9), now: () => 1000 });
    const fire = aFire();
    await gate.judge(fire, absorbContext(fire, NEUTRAL));
    expect(drain(gate, ledger)).toBe(1);
    expect(drain(gate, ledger)).toBe(0);               // the watermark still holds
    expect(ledger.count()).toBe(1);
    expect(ledger.persistFailures()).toBe(0);
    expect(ledger.lastPersistError()).toBeNull();
    ledger.close();
  });
});
