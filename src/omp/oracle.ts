// oracle — THE RESOLVER. Rows in, a measured curve out. Nothing else.
//
// THE DEBT THIS PAYS: the ledger writes `later_truth='unresolved'` on every row
// (§6.4.7 — "written AT FIRING TIME, never assumed") and NOTHING EVER CHANGED
// IT. `precision = confirmed/(confirmed+refuted)` therefore had no numerator and
// no denominator: `derivePolicy` stayed `calibrated:false` forever and every
// threshold remained a seed guess. This module is what converts a pile of rows
// into the curve the thresholds are derived from.
//
// ★ THE ONE LAW THAT MATTERS: A FIRING IS NOT A RESOLUTION. If a firing could
//   count as a confirmation, the system would report perfect precision on ZERO
//   evidence. EN-050 caught exactly that mistake in a test harness (12 fired
//   rows asserted as 12 confirmations). Every rule below exists to make that
//   error impossible to make by accident.
//
// THE EVIDENCE GATHERERS (the blueprint's §S8 — "the outcome arrives from the
// system's own operation"), four kinds:
//   (a) a LATER EDIT to the same target      → the act was re-done/repaired
//   (b) a TEST run after the firing          → passed or failed
//   (c) a WITHDRAWAL with a bound span       → the claim was retracted with proof
//   (d) a DOWNSTREAM PERMIT                  → another gate allowed the act
//
// THE CLASSIFICATION (stated, not implied — the whole point is that it be
// auditable):
//   CONFIRMED   laterEdit || testFailed || withdrawn
//               harm evidence: the world had to come back to this act.
//   REFUTED     permitted (and no harm signal), OR >= 2 corroborating signals
//               with no failures. ★ THE SECOND-SIGNAL LAW: one passing test is
//               NOT corroboration — the ABSENCE of a complaint is not evidence.
//   UNRESOLVED  everything else. Silence is a first-class outcome, not a
//               failure to decide.
//   ★ HARM BEATS PERMISSION: a permit followed by a repair is CONFIRMED. A
//     permit that was wrong does not refute the fire — it convicts the permit.
//
// ★ THE NAMED SPEC GAP (surfaced, never papered over): blueprint §8.2's DDL has
//   NO `target` and NO `tool` column, yet this wave's contract is to read "a
//   later edit to THE TARGET". The row cannot supply its own subject, so
//   `resolveAll` takes the subject EXPLICITLY. The DDL is NOT silently
//   extended — an undeclared column would be a schema the spec does not have.
//   The gap is recorded here and in the ship docs for the spec's owner.

import type { PersistedFireRow } from "./fire-ledger.ts";
import type { FireLedger } from "./fire-ledger.ts";

export type Truth = "confirmed" | "refuted" | "unresolved";

/** What the fire was ABOUT. The DDL does not carry this — see the named gap. */
export interface Subject {
  target: string;
  tool?: string;
}

/** One downstream event. The oracle reads these; it never invents them. */
export interface OutcomeRecord {
  kind: "edit" | "test" | "withdraw" | "permit";
  /** ISO, and it must be STRICTLY AFTER the firing's `at`. */
  at: string;
  /** Absent = applies to any target (a global test run or permit). Present and
   *  different = NOT this fire's evidence. */
  target?: string;
  /** For a test: did it pass? */
  passed?: boolean;
  /** For a withdrawal: the bound evidence that makes the retraction real. */
  span?: string;
  /** ★ WHICH TOOL produced the record (audit finding O3). `Subject.tool` was
   *  declared and never consulted, so evidence from a DIFFERENT tool on the same
   *  target could confirm or refute this fire. Absent = the record does not say. */
  tool?: string;
  /** Who or what produced the record. */
  by?: string;
}

/** The stable signal vocabulary. */
export type SignalName = "laterEdit" | "testFailed" | "testPassed" | "withdrawn" | "permitted";

export interface Evidence {
  laterEdit: boolean;
  testsAfter: number;
  /** ★ ONLY tests that REPORTED a pass (audit finding O1). The first version
   *  incremented `testsAfter` for every test — including the flag-less branch whose
   *  own note says it "cannot corroborate anything" — and then pushed `testPassed`
   *  from `testsAfter > 0`. A test with no verdict became a corroborating pass. */
  testsPassed: number;
  testsFailed: number;
  withdrawn: boolean;
  permitted: boolean;
  /** The DISTINCT signals present, in a stable order. */
  signals: SignalName[];
  /** The records that counted, with why — the audit trail for this decision. */
  notes: string[];
  /** ★ R5 (re-verify finding) — THE DISMISSED RECORDS, TAGGED STRUCTURALLY. The
   *  first version recovered them by running a REGEX over `notes` for English words
   *  like "dismissed" and "WITHOUT a span" — so the disclosure broke the moment a
   *  note was reworded, and it would silently stop disclosing. A fact about the
   *  evidence must not be coupled to the prose that describes it. */
  dismissed: string[];
}

export interface Classification {
  truth: Truth;
  /** WHY — the evidence's own words, so a reader never has to re-derive it. */
  basis: string;
  /** The signals that drove it. */
  signals: SignalName[];
}

export interface ResolveReport {
  resolved: number;
  confirmed: number;
  refuted: number;
  /** Rows the resolver deliberately left alone — silence is an outcome. */
  leftUnresolved: number;
  /** The rows the resolver touched, for the caller's own audit. */
  decided: { stateHash: string; truth: Truth; basis: string }[];
}

/** The default forward window — a day. Beyond it, an "edit to the same target"
 *  is a different piece of work, not evidence about this firing. */
export const DEFAULT_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Gather the downstream evidence for ONE row. Pure over its inputs: no clock,
 *  no I/O, no model. The window is (row.at, row.at + windowMs]. */
export function gather(
  row: Pick<PersistedFireRow, "at">,
  subject: Subject,
  records: readonly OutcomeRecord[],
  opts: { windowMs?: number; notAfter?: string } = {},
): Evidence {
  const windowMs = opts.windowMs ?? DEFAULT_WINDOW_MS;
  const from = Date.parse(row.at);
  const ev: Evidence = {
    laterEdit: false, testsAfter: 0, testsPassed: 0, testsFailed: 0,
    withdrawn: false, permitted: false, signals: [], notes: [], dismissed: [],
  };

  // ★ O0 (HIGH) — AN UNPARSEABLE STAMP MUST EMPTY THE WINDOW, NOT OPEN IT.
  // With `from` NaN, `at <= from || at > to` is ALWAYS FALSE (every comparison
  // against NaN is), so the filter admitted EVERY record — the exact inverse of its
  // purpose. A bound that fails open is not a bound. Found by the oracle audit.
  if (!Number.isFinite(from)) {
    const note = `row.at ${JSON.stringify(row.at)} is unparseable — no forward window exists, so NO evidence is gathered (an unbounded window would admit every record)`;
    ev.notes.push(note);
    ev.dismissed.push(note);
    return ev;
  }
  // ★ R4c (re-verify finding) — THE WINDOW IS ALSO CAPPED AT THE RESOLUTION TIME.
  // A fixed 24h window can reach PAST `now`, admitting evidence that has not happened
  // yet relative to the resolution — evidence the resolver is not entitled to use.
  const cap = opts.notAfter === undefined ? Number.POSITIVE_INFINITY : Date.parse(opts.notAfter);
  const to = Math.min(from + windowMs, Number.isFinite(cap) ? cap : Number.POSITIVE_INFINITY);

  for (const r of records) {
    const at = Date.parse(r.at);
    if (!Number.isFinite(at)) continue;                 // an unparseable stamp is not evidence
    if (at <= from || at > to) continue;                // ★ FORWARD ONLY — before-the-fire is not evidence
    // absent target = global (applies); present = must match the subject exactly.
    if (r.target !== undefined && r.target !== subject.target) continue;
    // ★ O3: and when BOTH sides name a tool, they must agree. A record that does
    //   not name a tool cannot be excluded on tool grounds — that would silently
    //   drop evidence the caller did not qualify.
    if (subject.tool !== undefined && r.tool !== undefined && r.tool !== subject.tool) continue;

    if (r.kind === "edit") {
      ev.laterEdit = true;
      ev.notes.push(`laterEdit @${r.at} on ${r.target ?? "(global)"} — the act was revisited`);
    } else if (r.kind === "test") {
      ev.testsAfter += 1;
      if (r.passed === true) {
        ev.testsPassed += 1;
        ev.notes.push(`testPassed @${r.at} — the test REPORTED a pass`);
      } else if (r.passed === false) {
        ev.testsFailed += 1;
        ev.notes.push(`testFailed @${r.at} — a test ran after the fire and did NOT pass`);
      } else {
        // ★ O1: NO signal. The record says nothing, so it corroborates nothing.
        const note = `test @${r.at} — no pass/fail flag, so it cannot corroborate anything (no signal emitted)`;
        ev.notes.push(note);
        ev.dismissed.push(note);
      }
    } else if (r.kind === "withdraw") {
      // "withdrawn or restated WITH a span" — a bare retraction is noise.
      if (r.span !== undefined && r.span.trim() !== "") {
        ev.withdrawn = true;
        ev.notes.push(`withdrawn @${r.at} with a bound span — the claim was retracted with proof`);
      } else {
        const note = `withdraw @${r.at} WITHOUT a span — ignored (a bare retraction proves nothing)`;
        ev.notes.push(note);
        ev.dismissed.push(note);
      }
    } else if (r.kind === "permit") {
      ev.permitted = true;
      ev.notes.push(`permitted @${r.at} by ${r.by ?? "an unnamed gate"} — a downstream gate allowed the act`);
    }
  }

  if (ev.laterEdit) ev.signals.push("laterEdit");
  if (ev.testsFailed > 0) ev.signals.push("testFailed");
  if (ev.testsPassed > 0) ev.signals.push("testPassed");   // ★ O1: ONLY real passes
  if (ev.withdrawn) ev.signals.push("withdrawn");
  if (ev.permitted) ev.signals.push("permitted");
  return ev;
}

/** The rule table, applied. See the header for why each branch exists.
 *  ★ EVERY BASIS CARRIES ITS SIGNAL TOKENS in brackets, so a reader (or a grep)
 *  can classify a decision without parsing prose.
 *  ★ AND EVERY BASIS DISCLOSES ITS DISMISSED EVIDENCE. A withdrawal with no
 *  span, or a test with no pass/fail flag, is SEEN AND REJECTED — a basis that
 *  reported only "no evidence" would make "nothing happened" indistinguishable
 *  from "something happened and was thrown out". The audit trail rides the
 *  decision it explains. */
export function classify(ev: Evidence): Classification {
  const tags = `[${ev.signals.join(",")}]`;
  // ★ O5 — THE DISCLOSURE RIDES EVERY PATH, not only the zero-signal one. The first
  // version appended it only when NO signal survived, so a 1-signal unresolved (or any
  // confirmed/refuted) silently dropped the span-less withdrawals and flag-less tests
  // that `notes` had recorded — contradicting this function's own header. The notes
  // that did NOT become signals are exactly the ones a reader needs to audit.
  const seen = ev.dismissed.length > 0 ? ` (presented but dismissed: ${ev.dismissed.join("; ")})` : "";
  if (ev.laterEdit || ev.testsFailed > 0 || ev.withdrawn) {
    const why = [
      ev.laterEdit ? "a later edit revisited the target" : "",
      ev.testsFailed > 0 ? `${ev.testsFailed} test(s) failed after the fire` : "",
      ev.withdrawn ? "the claim was withdrawn with a bound span" : "",
    ].filter((s) => s !== "").join("; ");
    return { truth: "confirmed", basis: `confirmed ${tags} — ${why}${seen}`, signals: ev.signals };
  }
  // NO HARM SIGNAL FROM HERE DOWN.
  if (ev.permitted) {
    return {
      truth: "refuted",
      basis: `refuted ${tags} — a downstream gate permitted the act and nothing downstream contradicted it${seen}`,
      signals: ev.signals,
    };
  }
  // ★ R1b (re-verify finding) — A `>= 2 signals` BRANCH USED TO LIVE HERE AND IT
  //   COULD NEVER EXECUTE. `signals` is a set of DISTINCT names; after the harm
  //   early-return (laterEdit | testFailed | withdrawn) and the permit early-return,
  //   the only name `gather` can still emit is `testPassed` — at most one element.
  //   A documented rule with no reachable path is theatrical code, so it is REMOVED
  //   rather than left as a comment claiming a capability the vocabulary cannot
  //   produce. If the vocabulary ever gains a second non-harm signal, the branch
  //   comes back WITH a test that reaches it.
  if (ev.signals.length === 1) {
    return {
      truth: "unresolved",
      basis: `unresolved ${tags} — ONE signal is not corroboration; the second-signal law requires independent agreement${seen}`,
      signals: ev.signals,
    };
  }
  return {
    truth: "unresolved",
    basis: `unresolved ${tags} — no evidence that COUNTS${seen}; silence is not a resolution`,
    signals: ev.signals,
  };
}

/** Resolve a batch, writing through the ledger. A row that is ALREADY resolved
 *  is skipped, so a re-run with the same evidence never re-stamps a decision
 *  (and never double-counts precision). Returns what it actually changed.
 *
 *  ★ IT READS THE LIVE TRUTH FROM THE LEDGER, NEVER FROM THE PASSED ROW. The
 *  argument is a SNAPSHOT: a caller holding rows from an earlier `all()` would
 *  otherwise re-resolve a row that the table already resolved — found by W2's
 *  own skip test, which caught a second pass re-stamping a confirmed row. */
export function resolveAll(
  ledger: FireLedger,
  pairs: readonly { row: PersistedFireRow; subject: Subject }[],
  records: readonly OutcomeRecord[],
  opts: { windowMs?: number; now?: () => string } = {},
): ResolveReport {
  const now = opts.now ?? (() => new Date().toISOString());
  const report: ResolveReport = {
    resolved: 0, confirmed: 0, refuted: 0, leftUnresolved: 0, decided: [],
  };
  // ★ O4 (HIGH) — PRE-VALIDATE THE WHOLE BATCH BEFORE THE FIRST WRITE. The clock
  // check used to run INSIDE the loop, so a single skewed stamp (or one bad row.at)
  // aborted the batch after earlier rows were already resolved — a partial write with
  // no rollback, and the caller received neither a report nor a clean state.
  const stamp = now();
  const stampMs = Date.parse(stamp);
  // ★ R4b (re-verify finding) — VALIDATE ONLY THE ROWS THIS CALL COULD WRITE.
  // The first version validated EVERY pair, so a row that would have been SKIPPED
  // (already resolved) could abort the whole batch. A pre-validation must not be
  // broader than the write it guards.
  //
  // ★ AND THE STAMP CHECK IS INDEPENDENT OF THE EVIDENCE WINDOW. Capping the window at
  // the stamp (R4c) means a stamp BEFORE the fire yields no evidence — which would
  // make the row SKIPPED and hide the caller's clock bug behind a silent no-op. The
  // kernel's law is LOUD: a resolution that does not follow its fire is a caller
  // error and it is named here, before any window logic can absorb it.
  const unresolved = pairs.filter((p) => ledger.truthOf(p.row.stateHash) === "unresolved");
  for (const { row } of unresolved) {
    if (!Number.isFinite(stampMs) || !Number.isFinite(Date.parse(row.at)) || !(stampMs > Date.parse(row.at))) {
      throw new Error(
        `GI_ORACLE_TIME_TRAVEL: resolution stamp ${stamp} is not after the fire's at ${row.at} (state ${row.stateHash}) — refusing the WHOLE batch so no partial write can occur`,
      );
    }
  }

  for (const { row, subject } of pairs) {
    // ★ THE LEDGER SPEAKS, NOT THE CALLER. `null` = the row is not in this
    //   ledger at all — resolving a phantom would write a truth for a fire that
    //   was never recorded.
    const live = ledger.truthOf(row.stateHash);
    if (live === null) continue;
    if (live !== "unresolved") continue;         // already decided — never re-stamped

    const c = classify(gather(row, subject, records, opts));
    if (c.truth === "unresolved") { report.leftUnresolved += 1; continue; }

    // the stamp was validated for the WHOLE batch above (O4) — one `now()` for the
    // batch also means every row in it carries the SAME resolution time.
    ledger.recordTruth(row.stateHash, c.truth, stamp);
    report.resolved += 1;
    if (c.truth === "confirmed") report.confirmed += 1;
    else report.refuted += 1;
    report.decided.push({ stateHash: row.stateHash, truth: c.truth, basis: c.basis });
  }
  return report;
}
