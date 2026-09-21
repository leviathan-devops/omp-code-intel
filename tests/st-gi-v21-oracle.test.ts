// st-gi-v21-oracle — W2: THE ORACLE (the laterTruth resolution path).
//
// THE DEBT THIS PAYS: the ledger writes `later_truth='unresolved'` on every row
// (§6.4.7 — "written at firing time, NEVER assumed") and NOTHING EVER CHANGES
// IT. Without a resolver, `precision` has no denominator, `derivePolicy` stays
// `calibrated:false` forever, and every threshold remains a seed. The oracle is
// what turns a pile of rows into a measured curve.
//
// ★ THE HONESTY LAW THIS FILE EXISTS TO PROTECT: precision = confirmed /
//   (confirmed + refuted). If a firing could be counted as a confirmation, the
//   system would report perfect precision on ZERO evidence. EN-050 already
//   caught one instance of that mistake in a test. The resolver must be the
//   hardest place in the codebase to accidentally call something "confirmed".
//
// ★ THE NAMED SPEC GAP (surfaced, not papered): blueprint §8.2's DDL has NO
//   `target` and NO `tool` column, but this wave's contract is to read "a later
//   edit to THE TARGET". The row alone cannot supply the subject — so `resolve`
//   takes it explicitly. The DDL is NOT silently extended: the gap is named in
//   the docs and in the oracle's own signature.
//
// ADVERSARIAL-FIRST: the no-evidence and one-signal paths run before the happy
// path. A resolver that defaults to CONFIRMED is worse than no resolver at all.

import { describe, test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { FireGate, absorbContext, type Fire } from "../src/omp/fire-gate.ts";
import type { Judge } from "../src/omp/enforcement.ts";
import { FireLedger, drain, type PersistedFireRow } from "../src/omp/fire-ledger.ts";
import {
  classify,
  gather,
  resolveAll,
  type OutcomeRecord,
} from "../src/omp/oracle.ts";

// ── the harness ─────────────────────────────────────────────────────────────
function stubJudge(p: number): Judge {
  return { async evaluate() { return [{ id: "fire_is_real", probability: p }]; } };
}
// ★ THE FIXED CLOCK MUST BE IN THE PAST of the machine's wall clock: the
// resolver's default `now()` is the real clock, and F1 caught the original
// T0=2026-09-21T10:00Z sitting ~2h in the FUTURE — so `truth_at > at` inverted.
// A fixture time that runs ahead of the host is a trap, not a convenience.
const T0 = "2026-09-20T08:00:00.000Z";

function aFire(over: Partial<Fire> = {}): Fire {
  return {
    ruleId: "*dumb",
    cls: "dumb",
    shape: "edit without a graph query",
    tool: "edit",
    target: "src/omp/kernel-v2.ts",
    evidence: "queriedBefore=false",
    ...over,
  };
}

/** Fire once into a fresh ledger and hand back the persisted row. */
async function aPersistedRow(over: Partial<Fire> = {}): Promise<{ row: PersistedFireRow; ledger: FireLedger }> {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gi-v21-oracle-"));
  const ledger = new FireLedger(path.join(d, "fire.sqlite"));
  const gate = new FireGate({ judge: stubJudge(0.91), now: () => Date.parse(T0) });
  const fire = aFire(over);
  await gate.judge(fire, absorbContext(fire, [
    { kind: "reasoning", text: "because the kernel file needs the edit", offsetMs: -100 },
  ]));
  drain(gate, ledger);
  return { row: ledger.all()[0]!, ledger };
}

const SUBJECT = { target: "src/omp/kernel-v2.ts", tool: "edit" };

function rec(over: Partial<OutcomeRecord>): OutcomeRecord {
  return { kind: "edit", at: "2026-09-20T11:00:00.000Z", target: SUBJECT.target, ...over };
}

describe("st-gi-v21-oracle: W2 — the laterTruth resolution", () => {
  // ══ ADVERSARIAL FIRST ════════════════════════════════════════════════════

  test("test_oracle_no_evidence_stays_unresolved — silence is NEVER a resolution", async () => {
    const { row, ledger } = await aPersistedRow();
    const ev = gather(row, SUBJECT, []);                      // the world said nothing
    const c = classify(ev);
    expect(c.truth).toBe("unresolved");
    expect(ev.signals).toEqual([]);
    // ★ and the row is untouched — no default, no inference
    expect(ledger.all()[0]!.laterTruth).toBe("unresolved");
    ledger.close();
  });

  test("test_oracle_one_signal_does_not_refute — the SECOND-SIGNAL law", async () => {
    const { row, ledger } = await aPersistedRow();
    // ONE passing test. The absence of a complaint is NOT corroboration.
    const ev = gather(row, SUBJECT, [rec({ kind: "test", passed: true })]);
    const c = classify(ev);
    expect(c.truth).toBe("unresolved");       // NOT refuted
    expect(c.basis).toContain("unresolved");
    ledger.close();
  });

  test("test_oracle_evidence_before_the_fire_is_NOT_evidence — the window is forward", async () => {
    const { row, ledger } = await aPersistedRow();
    // the same signals, but they PREDATE the firing (at the row's `at` or earlier)
    const before = Date.parse(T0) - 60_000;
    const ev = gather(row, SUBJECT, [
      rec({ kind: "permit", at: new Date(before).toISOString() }),
      rec({ kind: "test", passed: true, at: new Date(before).toISOString() }),
    ]);
    expect(ev.signals).toEqual([]);            // nothing downstream — nothing gathered
    expect(classify(ev).truth).toBe("unresolved");
    ledger.close();
  });

  // ══ THE HAPPY PATH — LAST ════════════════════════════════════════════════

  test("test_oracle_resolves — a real firing resolved END-TO-END onto the row", async () => {
    const { row, ledger } = await aPersistedRow();
    // the world answers: the agent came BACK to the same target and repaired it,
    // and the test that followed FAILED.
    const records: OutcomeRecord[] = [
      rec({ kind: "edit", at: "2026-09-20T11:00:00.000Z" }),
      rec({ kind: "test", passed: false, at: "2026-09-20T11:05:00.000Z" }),
    ];
    const ev = gather(row, SUBJECT, records);
    expect(ev.signals).toEqual(["laterEdit", "testFailed"]);
    const c = classify(ev);
    expect(c.truth).toBe("confirmed");

    const r = resolveAll(ledger, [{ row, subject: SUBJECT }], records);
    expect(r.resolved).toBe(1);
    expect(r.confirmed).toBe(1);

    // ★ THE ROW ITSELF CHANGED — read it back out of the table, not from memory.
    const after = ledger.all()[0]!;
    expect(after.laterTruth).toBe("confirmed");
    expect(after.truthAt).not.toBeNull();
    expect(new Date(after.truthAt!).getTime()).toBeGreaterThan(Date.parse(T0));

    // and the counts now carry a real denominator
    expect(ledger.countsByRule()["*dumb"]).toEqual({ confirmed: 1, refuted: 0, unresolved: 0 });
    ledger.close();
  });

  test("test_oracle_permit_refutes — an explicit downstream permit is corroboration", async () => {
    const { row, ledger } = await aPersistedRow();
    const records: OutcomeRecord[] = [rec({ kind: "permit", at: "2026-09-20T11:00:00.000Z" })];
    const c = classify(gather(row, SUBJECT, records));
    expect(c.truth).toBe("refuted");           // NOT unresolved — §S8's downstream permit
    const r = resolveAll(ledger, [{ row, subject: SUBJECT }], records);
    expect(r.refuted).toBe(1);
    expect(ledger.all()[0]!.laterTruth).toBe("refuted");
    ledger.close();
  });

  test("test_oracle_harm_beats_permission — a permit followed by a repair is CONFIRMED", async () => {
    const { row, ledger } = await aPersistedRow();
    // the permit happened at 11:00, then the agent had to come back at 11:10.
    // Permission that was WRONG does not refute the fire — it convicts the permit.
    const records: OutcomeRecord[] = [
      rec({ kind: "permit", at: "2026-09-20T11:00:00.000Z" }),
      rec({ kind: "edit", at: "2026-09-20T11:10:00.000Z" }),
    ];
    const c = classify(gather(row, SUBJECT, records));
    expect(c.truth).toBe("confirmed");
    expect(c.basis).toContain("laterEdit");
    ledger.close();
  });

  test("test_oracle_second_signal_refutes — a passing test PLUS a permit refutes", async () => {
    const { row, ledger } = await aPersistedRow();
    const records: OutcomeRecord[] = [
      rec({ kind: "permit", at: "2026-09-20T11:00:00.000Z" }),
      rec({ kind: "test", passed: true, at: "2026-09-20T11:05:00.000Z" }),
    ];
    const ev = gather(row, SUBJECT, records);
    expect(ev.signals.length).toBe(2);
    expect(classify(ev).truth).toBe("refuted");
    ledger.close();
  });

  test("test_oracle_other_targets_ignored — a later edit to a DIFFERENT target is not this fire's evidence", async () => {
    const { row, ledger } = await aPersistedRow();
    const records: OutcomeRecord[] = [
      rec({ kind: "edit", target: "src/omp/SOMEONE_ELSE.ts" }),
      rec({ kind: "test", passed: false, target: "src/omp/SOMEONE_ELSE.ts" }),
    ];
    const ev = gather(row, SUBJECT, records);
    expect(ev.signals).toEqual([]);             // the test mattered, but not to THIS fire
    expect(classify(ev).truth).toBe("unresolved");
    ledger.close();
  });

  test("test_oracle_unresolved_rows_are_skipped — a resolved row is never re-judged", async () => {
    const { row, ledger } = await aPersistedRow();
    const records: OutcomeRecord[] = [rec({ kind: "edit", at: "2026-09-20T11:00:00.000Z" })];
    resolveAll(ledger, [{ row, subject: SUBJECT }], records);
    expect(ledger.all()[0]!.laterTruth).toBe("confirmed");
    const at1 = ledger.all()[0]!.truthAt;

    // a SECOND pass with the SAME evidence must not re-stamp the resolution
    const r2 = resolveAll(ledger, [{ row, subject: SUBJECT }], records);
    expect(r2.resolved).toBe(0);                // already resolved
    expect(ledger.all()[0]!.truthAt).toBe(at1); // ★ the stamp is unchanged
    ledger.close();
  });

  // ══ THE REMAINING CONTRACT CASES ═════════════════════════════════════════

  test("test_oracle_withdrawn_needs_a_span — a bare retraction proves nothing", async () => {
    const { row, ledger } = await aPersistedRow();
    // (c) of the contract: "withdrawn OR RESTATED WITH A SPAN". A withdrawal
    // with no bound evidence is an opinion, not a resolution.
    const bare = classify(gather(row, SUBJECT, [rec({ kind: "withdraw" })]));
    expect(bare.truth).toBe("unresolved");
    expect(bare.basis).toContain("WITHOUT a span");

    const bound = classify(gather(row, SUBJECT, [rec({ kind: "withdraw", span: "src/omp/kernel-v2.ts:299" })]));
    expect(bound.truth).toBe("confirmed");
    expect(bound.basis).toContain("withdrawn");
    ledger.close();
  });

  test("test_oracle_no_time_travel — a resolution cannot PREDATE its firing", async () => {
    const { row, ledger } = await aPersistedRow();
    const records: OutcomeRecord[] = [rec({ kind: "edit", at: "2026-09-20T11:00:00.000Z" })];
    // a clock that reports a time BEFORE the row's own `at` — the row was fired
    // at T0, so a stamp earlier than T0 is impossible. It must THROW, not write
    // a truth_at that would make every "time to resolution" number nonsense.
    let threw = false;
    let msg = "";
    try {
      resolveAll(ledger, [{ row, subject: SUBJECT }], records, {
        now: () => new Date(Date.parse(T0) - 3_600_000).toISOString(),
      });
    } catch (e) {
      threw = true;
      msg = e instanceof Error ? e.message : String(e);
    }
    expect(threw).toBe(true);
    expect(msg).toContain("GI_ORACLE_TIME_TRAVEL");
    // ★ and NOTHING was written — the row is still exactly as the ledger left it
    expect(ledger.all()[0]!.laterTruth).toBe("unresolved");
    expect(ledger.all()[0]!.truthAt).toBeNull();
    ledger.close();
  });

  test("test_oracle_phantom_row_is_skipped — a row absent from the ledger is never resolved", async () => {
    const { row, ledger } = await aPersistedRow();
    // a row object from a DIFFERENT ledger — resolving it would write a truth
    // for a fire this table never recorded.
    const alien = { ...row, stateHash: "0000000000000000" };
    const r = resolveAll(ledger, [{ row: alien, subject: SUBJECT }], [rec({ kind: "edit" })]);
    expect(r.resolved).toBe(0);
    expect(ledger.count()).toBe(1);
    ledger.close();
  });
});
