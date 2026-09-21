// fire-ledger — THE CALIBRATION SUBSTRATE. A row per fire, or no calibration.
//
// THE DEBT THIS PAYS: FireGate's config declares `ledgerPath`
// (fire-gate.ts:222) with the comment "Absent ⇒ no ledger ⇒ no calibration" —
// and NOTHING EVER READ IT. The gate has built rows in memory since it was
// written (fire-gate.ts:367 `rows()`, "the calibration machinery and the tests
// read the ledger") and every one of them died with the process. A threshold
// cannot be derived from rows that do not exist.
//
// THE BLUEPRINT'S LAWS THIS IMPLEMENTS:
//   §8.2    the DDL is the contract — copied VERBATIM below, never paraphrased
//   §8.1    "every fire leaves a row" — the drain is a watermark, so a fire is
//           persisted exactly once even if the caller drains repeatedly
//   §6.4.3  (3) the threshold IN FORCE is recorded on every row, so a later
//           calibration can separate "the model changed" from "the bar moved"
//   §6.4.7  `later_truth` is written 'unresolved' AT FIRING TIME. Only the
//           oracle changes it — and it stamps `truth_at` when it does.
//   D026    the ledger is DATA. Reconciliation reads it; nothing about the
//           running gate depends on it being present.
//
// THE SEAM (no edits to fire-gate.ts — W3 owns that file):
//   `drain(gate, ledger)`      the primitive: persist every new row
//   `withLedger(gate, ledger)` the guarantee: judge() → exactly one row
//   Both work off the PUBLIC `rows()` accessor, so a gate that gains rows by
//   ANY path is still fully persisted — the ledger cannot miss a fire it did
//   not know about.

import { Database } from "bun:sqlite";
import type { DecisionRow, FireGate } from "./fire-gate.ts";
import type { ResolvedCounts } from "./calibration.ts";

// ── §8.2 THE SCHEMA — the contract, in column order ─────────────────────────
/** The 15 columns, in DDL order. A test asserts the live table matches this:
 *  a silent column rename would silently break every reader. */
export const FIRE_DECISIONS_COLUMNS = [
  "id",
  "at",
  "rule_id",
  "cls",
  "question_version",
  "probability",
  "band",
  "action",
  "policy_name",
  "act_threshold",
  "flag_threshold",
  "state_hash",
  "cost_usd",
  "later_truth",
  "truth_at",
] as const;

export type FireDecisionColumn = (typeof FIRE_DECISIONS_COLUMNS)[number];

/** THE DDL — blueprint §8.2 verbatim. */
export const FIRE_DECISIONS_DDL = `
CREATE TABLE IF NOT EXISTS fire_decisions (
  id               INTEGER PRIMARY KEY,
  at               TEXT NOT NULL,
  rule_id          TEXT NOT NULL,
  cls              TEXT NOT NULL,
  question_version TEXT NOT NULL,
  probability      REAL NOT NULL,
  band             TEXT NOT NULL,
  action           TEXT NOT NULL,
  policy_name      TEXT NOT NULL,
  act_threshold    REAL NOT NULL,
  flag_threshold   REAL NOT NULL,
  state_hash       TEXT NOT NULL,
  cost_usd         REAL NOT NULL DEFAULT 0,
  later_truth      TEXT NOT NULL DEFAULT 'unresolved'
                   CHECK (later_truth IN ('confirmed','refuted','unresolved')),
  truth_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_fd_rule_truth ON fire_decisions(rule_id, later_truth);
CREATE INDEX IF NOT EXISTS idx_fd_hash ON fire_decisions(state_hash);
`;

/** A row as it comes back OUT of the table: the DecisionRow plus its identity
 *  and its resolution stamp. */
export interface PersistedFireRow extends DecisionRow {
  id: number;
  truthAt: string | null;
}

// ── THE LOUD-FAILURE LAW ────────────────────────────────────────────────────
/** Every failure names itself. A ledger that cannot fail loudly is a ledger
 *  that silently loses rows, and a lost row is an uncalibratable fire. */
export class LedgerError extends Error {
  constructor(code: string, detail: string, cause?: unknown) {
    super(`GI_LEDGER_${code}: ${detail}${cause instanceof Error ? ` (${cause.message})` : ""}`);
    this.name = "LedgerError";
  }
}

// ── THE LEDGER ──────────────────────────────────────────────────────────────
export class FireLedger {
  private readonly db: Database;
  private readonly insertStmt;
  private closed = false;
  private persistFailureCount = 0;
  private lastPersist: { code: string; message: string; at: string } | null = null;

  constructor(readonly path: string) {
    // A bad path must THROW — never degrade to an in-memory ledger that looks
    // like it is working and loses everything at exit (the silent-fallback ban).
    let db: Database;
    try {
      db = new Database(path, { create: true });
      db.exec(FIRE_DECISIONS_DDL);
    } catch (e) {
      throw new LedgerError(
        "OPEN_FAILED",
        `cannot open or migrate the fire ledger at ${path}`,
        e,
      );
    }
    this.db = db;
    try {
      this.db.exec("PRAGMA journal_mode = WAL;");
    } catch {
      /* WAL is an optimisation; a filesystem without it is not an error. */
    }
    this.insertStmt = this.db.prepare(`
      INSERT INTO fire_decisions (
        at, rule_id, cls, question_version, probability, band, action,
        policy_name, act_threshold, flag_threshold, state_hash, cost_usd,
        later_truth, truth_at
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,NULL)
    `);
  }

  /** ★ AUDIT FINDING 2 — the loud-failure law applies to the READ paths too. The
   *  first version set `closed` in close() and never checked it, and left every
   *  read unwrapped: after a close (or on a corrupt file) callers got raw
   *  `bun:sqlite` exceptions instead of a GI_LEDGER_* name, which is exactly the
   *  silent-failure class this module declares it eliminates. */
  private ensureOpen(): void {
    if (this.closed) {
      throw new LedgerError("CLOSED", `the ledger at ${this.path} is closed — reopen it rather than reading a closed handle`);
    }
  }

  /** Run a DB operation, mapping any driver error into a NAMED one. Every read
   *  path goes through here so no raw sqlite error can escape. */
  private guard<T>(op: string, fn: () => T): T {
    this.ensureOpen();
    try {
      return fn();
    } catch (e) {
      if (e instanceof LedgerError) throw e;
      throw new LedgerError("QUERY_FAILED", `${op} failed on ${this.path}`, e);
    }
  }

  /** ★ AUDIT FINDING 1 — a PERSISTENCE failure must not be silent. It is counted
   *  and named here so a caller can detect that the table diverged from the gate's
   *  in-memory rows (rows().length vs count()). */
  persistFailures(): number {
    return this.persistFailureCount;
  }

  /** The last persistence failure, or null. Non-null means the ledger LOST a
   *  write — the fires are still in the gate's memory and a retry will land them. */
  lastPersistError(): { code: string; message: string; at: string } | null {
    return this.lastPersist;
  }

  /** ★ RECORD a persistence failure — called by `withLedger` when a drain fails,
   *  so the decision can still be returned. LOUD by construction: the count and the
   *  message are both queryable, and a divergence between the gate's rows() and
   *  this ledger's count() is the machine-detectable symptom. */
  notePersistFailure(code: string, message: string): void {
    this.persistFailureCount += 1;
    this.lastPersist = { code, message, at: new Date().toISOString() };
  }

  /** §8.2. Appends ONE row, returning its id. Throws loudly on any failure.
   *  ★ THE WHOLE ROW IS VALIDATED, NOT JUST TWO FIELDS (audit finding 3): the first
   *  version read `row.stateHash.trim()` before checking `row` was an object at all
   *  — a null row produced a bare TypeError instead of a GI_LEDGER_* name — and left
   *  ruleId/cls/band/action/policyName/thresholds/costUsd unchecked, so a
   *  non-string could reach SQLite and a row could claim a RESOLVED truth at firing
   *  time in violation of §6.4.7. */
  append(row: DecisionRow): number {
    this.ensureOpen();
    if (row === null || typeof row !== "object") {
      throw new LedgerError("MALFORMED_ROW", `append requires a row object, got ${String(row)}`);
    }
    // ★ THE GENERALISED CHECKS ADD COVERAGE — THEY DO NOT RENAME EXISTING CONTRACTS.
    //   Two codes were already load-bearing (W1's tests and the red-team corpus assert
    //   them), so the two most specific cases keep their own names and everything the
    //   first version missed gains one.
    for (const key of ["at", "ruleId", "cls", "questionVersion", "band", "action", "policyName", "stateHash"] as const) {
      if (typeof row[key] !== "string" || row[key].trim() === "") {
        if (key === "stateHash") {
          throw new LedgerError("EMPTY_STATE_HASH", "a row without a state_hash cannot be resolved later");
        }
        throw new LedgerError("MALFORMED_ROW", `${key} must be a non-empty string, got ${JSON.stringify(row[key])}`);
      }
    }
    for (const key of ["probability", "actThreshold", "flagThreshold", "costUsd"] as const) {
      if (typeof row[key] !== "number" || !Number.isFinite(row[key])) {
        if (key === "probability") {
          throw new LedgerError("BAD_PROBABILITY", `probability must be finite, got ${String(row[key])}`);
        }
        throw new LedgerError("BAD_NUMBER", `${key} must be finite, got ${String(row[key])}`);
      }
    }
    if (row.laterTruth !== "unresolved") {
      // §6.4.7 — written 'unresolved' AT FIRING TIME, never assumed. Only the
      // oracle changes it, through recordTruth.
      throw new LedgerError("TRUTH_AT_FIRING", `a row must be inserted 'unresolved', got '${String(row.laterTruth)}' — the oracle resolves it later`);
    }
    try {
      const r = this.insertStmt.run(
        row.at, row.ruleId, row.cls, row.questionVersion, row.probability, row.band,
        row.action, row.policyName, row.actThreshold, row.flagThreshold, row.stateHash,
        row.costUsd, row.laterTruth,
      );
      return Number(r.lastInsertRowid);
    } catch (e) {
      throw new LedgerError("APPEND_FAILED", `row for ${row.ruleId} (${row.stateHash}) was not written`, e);
    }
  }

  /** Bulk append inside ONE transaction — either all rows land or none do. */
  appendMany(rows: readonly DecisionRow[]): number {
    this.ensureOpen();
    if (rows.length === 0) return 0;
    const tx = this.db.transaction((rs: readonly DecisionRow[]) => {
      let n = 0;
      for (const r of rs) { this.append(r); n += 1; }
      return n;
    });
    try {
      return tx(rows);
    } catch (e) {
      if (e instanceof LedgerError) throw e;
      throw new LedgerError("APPEND_MANY_FAILED", `${rows.length} rows did not commit`, e);
    }
  }

  /** The full table, oldest-first. */
  all(): PersistedFireRow[] {
    return this.guard("all", () => {
      const raw = this.db.query(`SELECT * FROM fire_decisions ORDER BY id ASC`).all() as Record<string, unknown>[];
      return raw.map(toPersisted);
    });
  }

  /** One rule's rows — the unit calibration works in (never one global number). */
  byRule(ruleId: string): PersistedFireRow[] {
    return this.guard("byRule", () => {
      const raw = this.db
        .query(`SELECT * FROM fire_decisions WHERE rule_id = ?1 ORDER BY id ASC`)
        .all(ruleId) as Record<string, unknown>[];
      return raw.map(toPersisted);
    });
  }

  count(): number {
    return this.guard("count", () => {
      const r = this.db.query(`SELECT COUNT(*) AS n FROM fire_decisions`).get() as { n: number };
      return r.n;
    });
  }

  /** §6.4.7 — the ORACLE's write. Returns how many rows it touched (by
   *  state_hash, because one state judged twice is two rows of the SAME state
   *  and both must resolve). */
  recordTruth(stateHash: string, truth: DecisionRow["laterTruth"], at = new Date().toISOString()): number {
    if (truth === "unresolved") {
      throw new LedgerError("BAD_TRUTH", "the oracle resolves to confirmed|refuted — 'unresolved' is the ABSENCE of a resolution, not one");
    }
    return this.guard("recordTruth", () => {
      try {
        const r = this.db
          .prepare(`UPDATE fire_decisions SET later_truth = ?1, truth_at = ?2 WHERE state_hash = ?3`)
          .run(truth, at, stateHash);
        return Number(r.changes);
      } catch (e) {
        throw new LedgerError("TRUTH_FAILED", `could not resolve state ${stateHash}`, e);
      }
    });
  }

  /** ★ THE CONSUMER SEAM. Exactly the shape calibration.ts reads:
   *  `checkCalibrationHealth(policies, ledgersByRule)` and
   *  `derivePolicy(profile, counts)`. Grouped per rule — the precision of one
   *  rule says nothing about another. */
  countsByRule(): Record<string, ResolvedCounts> {
    return this.guard("countsByRule", () => {
    const raw = this.db
      .query(
        `SELECT rule_id, later_truth, COUNT(*) AS n
           FROM fire_decisions
          GROUP BY rule_id, later_truth`,
      )
      .all() as { rule_id: string; later_truth: string; n: number }[];
    const out: Record<string, ResolvedCounts> = {};
    for (const r of raw) {
      const slot = (out[r.rule_id] ??= { confirmed: 0, refuted: 0, unresolved: 0 });
      if (r.later_truth === "confirmed") slot.confirmed += r.n;
      else if (r.later_truth === "refuted") slot.refuted += r.n;
      else if (r.later_truth === "unresolved") slot.unresolved += r.n;
      else {
        // An unknown truth value is NOT silently folded into unresolved — that
        // would inflate the unresolved count and hide a corrupt write.
        throw new LedgerError("UNKNOWN_TRUTH", `row has later_truth='${r.later_truth}' for ${r.rule_id} — refusing to misclassify it`);
      }
    }
    return out;
    });
  }

  /** ★ THE LIVE TRUTH, read from the TABLE. The resolver MUST consult this and
   *  not the caller's row object: a caller holding rows from an earlier
   *  `all()` is holding a SNAPSHOT, and resolving against a snapshot re-stamps
   *  decisions (found by W2's skip test — a second pass re-resolved an
   *  already-confirmed row). The ledger is the only authority on truth. */
  truthOf(stateHash: string): DecisionRow["laterTruth"] | null {
    return this.guard("truthOf", () => {
      const r = this.db
        .query(`SELECT later_truth FROM fire_decisions WHERE state_hash = ?1 ORDER BY id DESC LIMIT 1`)
        .get(stateHash) as { later_truth: string } | null;
      if (r === null) return null;
      // ★ AUDIT FINDING 4 — CONSISTENT STRICTNESS. This used to BLIND-CAST, so a
      // corrupt value came back as if it were a Truth, while countsByRule THREW on
      // the same value. A reader could get 'garbage' from one and an exception from
      // the other. The DDL now carries a CHECK, and this refuses too — so a row
      // written before the CHECK existed (or by a bypass) cannot be laundered.
      if (r.later_truth !== "confirmed" && r.later_truth !== "refuted" && r.later_truth !== "unresolved") {
        throw new LedgerError("UNKNOWN_TRUTH", `row has later_truth='${r.later_truth}' for ${stateHash} — refusing to launder it into a Truth`);
      }
      return r.later_truth;
    });
  }

  /** The live columns, read from the DB itself (not from the constant) — the
   *  DDL-consistency test compares the two. */
  columns(): string[] {
    return this.guard("columns", () => {
      const r = this.db.query(`PRAGMA table_info(fire_decisions)`).all() as { name: string }[];
      return r.map((x) => x.name);
    });
  }

  indices(): string[] {
    return this.guard("indices", () => {
      const r = this.db.query(`PRAGMA index_list(fire_decisions)`).all() as { name: string }[];
      return r.map((x) => x.name);
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    // ★ AUDIT FINDING 5 — finalize the prepared statement BEFORE closing the
    // handle. Closing with a live statement can throw or leak in bun:sqlite.
    try { this.insertStmt.finalize(); } catch { /* already finalized or unsupported — the close below is what matters */ }
    try { this.db.close(); } catch { /* closing an already-closed handle is not an error */ }
  }
}

function toPersisted(raw: Record<string, unknown>): PersistedFireRow {
  return {
    id: Number(raw["id"]),
    at: String(raw["at"]),
    ruleId: String(raw["rule_id"]),
    cls: String(raw["cls"]),
    questionVersion: String(raw["question_version"]),
    probability: Number(raw["probability"]),
    band: String(raw["band"]),
    action: String(raw["action"]),
    policyName: String(raw["policy_name"]),
    actThreshold: Number(raw["act_threshold"]),
    flagThreshold: Number(raw["flag_threshold"]),
    stateHash: String(raw["state_hash"]),
    costUsd: Number(raw["cost_usd"]),
    laterTruth: String(raw["later_truth"]) as DecisionRow["laterTruth"],
    truthAt: raw["truth_at"] === null || raw["truth_at"] === undefined ? null : String(raw["truth_at"]),
  };
}

// ── THE DRAIN (the primitive) ───────────────────────────────────────────────
/** Rows already persisted, by OBJECT IDENTITY. FireGate creates a NEW row
 *  object per judgment (fire-gate.ts:282/297/322/341/355), so identity is an
 *  exact watermark: a drain can be called any number of times and a fire is
 *  persisted exactly once. It also means a row the gate gains by ANY path is
 *  caught — the ledger reads the public `rows()` accessor, nothing private. */
const drained = new WeakMap<FireLedger, WeakSet<object>>();

/** Persist every row the gate has produced that this ledger has not seen.
 *  Returns the number of NEW rows written (0 on a repeat drain). */
export function drain(gate: FireGate, ledger: FireLedger): number {
  let seen = drained.get(ledger);
  if (seen === undefined) {
    seen = new WeakSet<object>();
    drained.set(ledger, seen);
  }
  const fresh: DecisionRow[] = [];
  for (const row of gate.rows()) {
    if (!seen.has(row)) fresh.push(row);
  }
  if (fresh.length === 0) return 0;
  // ★ AUDIT FINDING 0 (HIGH) — THE WATERMARK ADVANCES ONLY AFTER THE COMMIT.
  // The first version added each row to `seen` BEFORE calling appendMany, so any
  // throw in the write (a malformed row, SQLITE_FULL, I/O) left the rows marked as
  // already-persisted: the next drain returned 0 and THOSE FIRES WERE PERMANENTLY
  // LOST. In a module whose entire purpose is "a row per fire, or no calibration",
  // a lost row is an uncalibratable fire — the defect W1 exists to prevent.
  const n = ledger.appendMany(fresh);
  for (const row of fresh) seen.add(row);
  return n;
}

// ── THE GUARANTEE (the wrapper) ─────────────────────────────────────────────
/** A gate whose every judgment lands in the ledger. Returned as a Proxy so
 *  fire-gate.ts needs NO edit (W3 owns it) while `judge()` still cannot return
 *  without its row being written — an empty ledger is then impossible by
 *  construction, not by discipline.
 *
 *  Every other member is bound to the ORIGINAL gate, so `rows()`, `firesUsed()`
 *  and `cacheSize()` read the real state. */
export function withLedger(gate: FireGate, ledger: FireLedger): FireGate {
  const original = gate;
  // ★ AUDIT FINDING 6 — ONE wrapper, built once. The first version allocated a NEW
  // function on every `get(judge)`, so `gated.judge === gated.judge` was false and a
  // caller relying on method identity (memoisation, effect deps, a spy) saw a
  // different function on every read.
  const judgeWithPersist = async (
    fire: Parameters<FireGate["judge"]>[0],
    ctx: Parameters<FireGate["judge"]>[1],
  ) => {
    const decision = await original.judge(fire, ctx);
    // ★ AUDIT FINDING 1 (HIGH) — A PERSISTENCE FAILURE MUST NOT DESTROY A MADE
    // DECISION. The decision has already been produced (the model was paid for and
    // the verdict exists). Letting `drain()` throw here converts a made decision
    // into a rejection, so the caller loses it with no retry contract.
    //   THE LAW THIS MUST HONOUR IS TWO-SIDED: the decision is RETURNED, and the
    //   failure is LOUD — recorded on the ledger and counted, never swallowed.
    try {
      drain(original, ledger);
    } catch (e) {
      const code = e instanceof LedgerError ? e.message.split(":")[0]! : "GI_LEDGER_PERSIST_FAILED";
      const message = e instanceof Error ? e.message : String(e);
      ledger.notePersistFailure(code, message);
      // The row is STILL in the gate's memory, so a later drain will land it —
      // provided the watermark did not advance, which is why fix 0 matters here.
    }
    return decision;
  };
  return new Proxy(original, {
    get(target, prop) {
      if (prop === "judge") return judgeWithPersist;
      const v = Reflect.get(target, prop, target);
      return typeof v === "function" ? v.bind(target) : v;
    },
  }) as FireGate;
}
