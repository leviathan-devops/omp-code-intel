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
import * as path from "node:path";
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
  // ★★★ EN-090 — THE COLUMN THE DDL'S OWN PURPOSE REQUIRED. A calibration substrate that
  //     cannot identify its SUBJECT cannot calibrate: §6.4.3 separates "the model changed"
  //     from "the bar moved" per rule, and §8.2's DDL recorded every input EXCEPT the one
  //     that says WHAT was decided about. The live ledger's 15 columns and the 16 here are
  //     reconciled by an explicit ALTER in the constructor.
  "target",
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
  -- ★ EN-090 — nullable BY CONSTRUCTION: rows written before the migration have no target
  --   and never can (it was hashed away). NULL is the honest value for them.
  target           TEXT,
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
  /** ★ R6 — the CODE IS A PROPERTY, not only a prefix inside the message. The
   *  message keeps the prefix so failures stay greppable, but a consumer must never
   *  have to PARSE it back out (the F1 fix did exactly that, with a `split(":")`). */
  constructor(readonly code: string, detail: string, cause?: unknown) {
    super(`GI_LEDGER_${code}: ${detail}${cause instanceof Error ? ` (${cause.message})` : ""}`, { cause });
    this.name = "LedgerError";
  }
}

// ── THE LEDGER ──────────────────────────────────────────────────────────────
export class FireLedger {
  private readonly db: Database;
  private readonly insertStmt: ReturnType<Database["prepare"]>;
  private closed = false;
  private persistFailureCount = 0;
  private lastPersist: { code: string; message: string; at: string } | null = null;

  constructor(readonly path: string) {
    // A bad path must THROW — never degrade to an in-memory ledger that looks
    // like it is working and loses everything at exit (the silent-fallback ban).
    // ★ R5 (re-verify finding) — `:memory:` and the empty string are the SAME
    // silent fallback wearing a valid path: they open successfully and persist
    // NOTHING. The ban has to name them, or it only bans the case it can detect.
    if (path.trim() === "" || path.trim() === ":memory:" || path.trim().startsWith("file::memory:")) {
      throw new LedgerError("NOT_PERSISTENT", `path ${JSON.stringify(path)} names an in-memory database — the ledger must survive the process or it is not a ledger`);
    }
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
    // ★★★ EN-090 — THE MIGRATION, AND IT IS NOT OPTIONAL. `CREATE TABLE IF NOT EXISTS` is a
    //   NO-OP on an existing table, so a live ledger KEEPS ITS OLD SHAPE while the new INSERT
    //   names a column it does not have — EVERY FIRE WOULD FAIL WITH "no such column: target".
    //   The column is therefore added explicitly when absent. ADDITIVE and backwards-
    //   compatible: old rows carry NULL, which is honest — their targets are irrecoverable.
    try {
      const cols = this.db.query("PRAGMA table_info(fire_decisions)").all() as { name: string }[];
      if (!cols.some((c) => c.name === "target")) {
        this.db.exec("ALTER TABLE fire_decisions ADD COLUMN target TEXT");
      }
    } catch (e) {
      throw new LedgerError(
        "MIGRATION_FAILED",
        `cannot add the target column to the ledger at ${path} — the DDL and the insert would disagree`,
        e,
      );
    }
    try {
      this.db.exec("PRAGMA journal_mode = WAL;");
    } catch {
      /* WAL is an optimisation; a filesystem without it is not an error. */
    }
    this.insertStmt = this.db.prepare(`
      INSERT INTO fire_decisions (
        at, rule_id, cls, question_version, probability, band, action,
        policy_name, act_threshold, flag_threshold, state_hash, target, cost_usd,
        later_truth, truth_at
      ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,NULL)
    `);
  }

  /** ★ EN-090 — THE SHAPE-READ PATH. `PRAGMA table_info` is not a query the typed readers
   *  cover, and the migration test must assert THE LIVE TABLE against the declared columns —
   *  the contract §8.2 names ("a test asserts the live table matches this: a silent column
   *  rename would silently break every reader"). Guarded like every other read: a closed
   *  handle is a NAMED error, never a raw driver exception. */
  rawDb(): Database {
    this.ensureOpen();
    return this.db;
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
    // ★ R1 (re-verify finding) — FINITE IS NOT ENOUGH FOR A PROBABILITY. `1.5` and
    // `-0.2` are finite and would band as act/ignore respectively, writing a row that
    // no calibration can interpret. The gate's own answers are a probability, so the
    // range is part of the type's meaning.
    for (const key of ["probability", "actThreshold", "flagThreshold"] as const) {
      if (row[key] < 0 || row[key] > 1) {
        throw new LedgerError("BAD_PROBABILITY", `${key}=${row[key]} is outside 0..1 — a probability that cannot band`);
      }
    }
    // ★ pass-3: the DOMAIN of each column, not merely non-emptiness. A row whose band
    //   says "banana" or whose cls is unknown is not calibration input — it is a row
    //   no reader can interpret, and it would be counted anyway.
    if (!["act", "escalate", "ignore"].includes(row.band)) {
      throw new LedgerError("BAD_DOMAIN", `band='${row.band}' is not act|escalate|ignore`);
    }
    if (!["FIRE", "ESCALATE", "IGNORE"].includes(row.action)) {
      throw new LedgerError("BAD_DOMAIN", `action='${row.action}' is not FIRE|ESCALATE|IGNORE`);
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
        row.target ?? null, row.costUsd, row.laterTruth,
      );
      return Number(r.lastInsertRowid);
    } catch (e) {
      throw new LedgerError("APPEND_FAILED", `row for ${row.ruleId} (${row.stateHash}) was not written`, e);
    }
  }

  /** Bulk append. FAST PATH: one transaction, all-or-nothing.
   *  ★ R7 (re-verify finding) — AND A PER-ROW FALLBACK, because all-or-nothing has a
   *  cost the first version did not weigh: ONE malformed row aborted the WHOLE batch,
   *  so a single bad fire would block every good one behind it. In a ledger whose
   *  purpose is "a row per fire", losing the good rows to protect against the bad one
   *  is the wrong trade. The fallback writes each row individually, KEEPS the good
   *  ones, and REPORTS the failures by name.
   *
   *  Returns the number of rows that committed. The caller's watermark logic must
   *  still only advance for rows this method confirms (see `drain`). */
  appendMany(rows: readonly DecisionRow[]): number {
    return this.appendManyDetailed(rows).committed.length;
  }

  /** ★ PASS-3 CRITICAL — THE COMMITTED ROWS, NOT JUST THEIR COUNT. The first version
   *  returned a NUMBER, and `drain` marked every row it had ATTEMPTED as seen. Once
   *  the R7 fallback existed, a batch could commit some rows and fail others — and the
   *  failed ones were marked seen anyway, so they were NEVER RETRIED. That is the
   *  original F0 defect (a permanently lost fire), re-introduced by F0's own fix.
   *
   *  A count cannot distinguish "all committed" from "some committed"; only the ROWS
   *  can. The watermark now advances per committed row. */
  appendManyDetailed(rows: readonly DecisionRow[]): { committed: DecisionRow[]; failed: { row: DecisionRow; error: LedgerError }[] } {
    this.ensureOpen();
    if (rows.length === 0) return { committed: [], failed: [] };
    const tx = this.db.transaction((rs: readonly DecisionRow[]) => {
      for (const r of rs) this.append(r);
      return rs.length;
    });
    try {
      tx(rows);
      return { committed: [...rows], failed: [] };          // the fast path: all landed
    } catch (e) {
      if (!(e instanceof LedgerError)) {
        throw new LedgerError("APPEND_MANY_FAILED", `${rows.length} rows did not commit`, e);
      }
      // THE FALLBACK: commit what CAN commit, and REPORT exactly which rows did not.
      const committed: DecisionRow[] = [];
      const failed: { row: DecisionRow; error: LedgerError }[] = [];
      for (const r of rows) {
        try {
          this.append(r);
          committed.push(r);
        } catch (inner) {
          const err = inner instanceof LedgerError ? inner : new LedgerError("APPEND_FAILED", "row did not commit", inner);
          failed.push({ row: r, error: err });
          // the recorded code carries the greppable prefix, consistently with the
          // withLedger path — a reader greps GI_LEDGER_*, not a bare suffix.
          // ★ F-45 FIX (2026-09-24): normalize — a code that already carries the prefix must not gain it twice.
          const bare45 = err.code.startsWith("GI_LEDGER_") ? err.code.slice("GI_LEDGER_".length) : err.code;
          this.notePersistFailure(`GI_LEDGER_${bare45}`, err.message);
        }
      }
      return { committed, failed };
    }
  }

  /** The full table, oldest-first. ★ pass-3: `limit` exists because the ledger GROWS
   *  without bound — an unpaginated read of a year's fires is an OOM waiting for a
   *  caller that only wanted the recent rows. */
  all(limit?: number): PersistedFireRow[] {
    // ★ pass-4: a limit reaching SQL unvalidated gives surprising results (NaN, floats,
    //   negatives). It is a row count, so it must be a positive integer or absent.
    if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
      throw new LedgerError("BAD_LIMIT", `all(limit) needs a positive integer, got ${String(limit)}`);
    }
    return this.guard("all", () => {
      const raw = (limit === undefined
        ? this.db.query(`SELECT * FROM fire_decisions ORDER BY id ASC`).all()
        : this.db.query(`SELECT * FROM fire_decisions ORDER BY id DESC LIMIT ?1`).all(limit)) as Record<string, unknown>[];
      const rows = raw.map(toPersisted);
      return limit === undefined ? rows : rows.reverse();   // keep oldest-first
    });
  }

  /** One rule's rows — the unit calibration works in (never one global number). */
  byRule(ruleId: string, limit?: number): PersistedFireRow[] {
    // ★ pass-4: `byRule` had no limit and no ruleId validation, unlike `all`. A hot rule
    //   with a year of fires is the same unbounded read the `all` fix addressed.
    if (typeof ruleId !== "string" || ruleId.trim() === "") {
      throw new LedgerError("BAD_RULE_ID", `byRule needs a non-empty ruleId, got ${JSON.stringify(ruleId)}`);
    }
    if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
      throw new LedgerError("BAD_LIMIT", `byRule(limit) needs a positive integer, got ${String(limit)}`);
    }
    return this.guard("byRule", () => {
      const raw = (limit === undefined
        ? this.db.query(`SELECT * FROM fire_decisions WHERE rule_id = ?1 ORDER BY id ASC`).all(ruleId)
        : this.db.query(`SELECT * FROM fire_decisions WHERE rule_id = ?1 ORDER BY id DESC LIMIT ?2`).all(ruleId, limit)) as Record<string, unknown>[];
      const rows = raw.map(toPersisted);
      return limit === undefined ? rows : rows.reverse();
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
    // ★ pass-3: a WHITELIST, not a single-value exclusion. `truth !== 'unresolved'`
    //   let ANY other string reach SQLite, where only the DDL CHECK stopped it — and a
    //   table created before that CHECK existed would accept it.
    if (truth !== "confirmed" && truth !== "refuted") {
      throw new LedgerError("BAD_TRUTH", `the oracle resolves to confirmed|refuted; got ${JSON.stringify(truth)}`);
    }
    // ★ R2 (re-verify finding) — an empty stateHash matched ZERO rows and returned
    //   `0` as if the resolution had been applied. A silent no-op is the exact class
    //   this ledger exists to eliminate, so it is a named failure instead.
    if (typeof stateHash !== "string" || stateHash.trim() === "") {
      throw new LedgerError("BAD_STATE_HASH", `recordTruth needs a non-empty stateHash, got ${JSON.stringify(stateHash)}`);
    }
    if (typeof at !== "string" || !Number.isFinite(Date.parse(at))) {
      throw new LedgerError("BAD_TRUTH_AT", `truth_at must be a parseable timestamp, got ${JSON.stringify(at)}`);
    }
    return this.guard("recordTruth", () => {
      try {
        // ★ R3b (re-verify finding) — THE UPDATE IS CONDITIONAL, SO CHECK-AND-WRITE IS
        // ATOMIC. `resolveAll` used to read `truthOf()` and then write unconditionally:
        // between the two, another writer could resolve the same row and this one would
        // OVERWRITE it — the history-rewrite EN-052 fixed in the caller, re-opened here
        // in the callee. `WHERE later_truth = 'unresolved'` makes the DATABASE the
        // arbiter: a row already resolved yields 0 changes and is left untouched.
        const r = this.db
          .prepare(`UPDATE fire_decisions SET later_truth = ?1, truth_at = ?2 WHERE state_hash = ?3 AND later_truth = 'unresolved'`)
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

/** The ONLY place a stored later_truth becomes a Truth. Refuses to launder. */
function persistedTruth(v: unknown, stateHash: unknown): DecisionRow["laterTruth"] {
  if (v === "confirmed" || v === "refuted" || v === "unresolved") return v;
  throw new LedgerError("UNKNOWN_TRUTH", `row ${String(stateHash)} has later_truth=${JSON.stringify(v)} — refusing to launder it into a Truth`);
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
    // ★ EN-090 — OPTIONAL, AND NOT LAUNDERED. R3's law applies EXACTLY here: the obvious
    //   `String(raw["target"])` would render a PRE-MIGRATION ROW's NULL as the literal
    //   string "undefined" — a missing subject wearing the type of a valid one, which is
    //   the very laundering R3 removed from `laterTruth`. ABSENT STAYS ABSENT, so the
    //   oracle can tell "this fire named a subject you cannot recover" from "this fire
    //   named this subject".
    ...(raw["target"] === null || raw["target"] === undefined
      ? {}
      : { target: String(raw["target"]) }),
    costUsd: Number(raw["cost_usd"]),
    // ★ R3 (re-verify finding) — `String(x) as Truth` laundered anything. A corrupt
    //   value must not be handed out wearing the type of a valid one.
    laterTruth: persistedTruth(raw["later_truth"], raw["state_hash"]),
    truthAt: raw["truth_at"] === null || raw["truth_at"] === undefined ? null : String(raw["truth_at"]),
  };
}

// ── THE DRAIN (the primitive) ───────────────────────────────────────────────
/** Rows already persisted, by OBJECT IDENTITY. FireGate creates a NEW row
 *  object per judgment (fire-gate.ts:282/297/322/341/355), so identity is an
 *  exact watermark: a drain can be called any number of times and a fire is
 *  persisted exactly once. It also means a row the gate gains by ANY path is
 *  caught — the ledger reads the public `rows()` accessor, nothing private. */
// ★ R4 (re-verify finding) — THE WATERMARK IS KEYED BY THE FILE, NOT THE HANDLE.
// Two `FireLedger` objects opened on the same path each had their OWN WeakSet, so
// both would consider the same fire unseen and write it TWICE. Exactly-once must be
// a property of the LEDGER (the file), not of whichever handle happens to call.
const drained = new Map<string, WeakSet<object>>();
// ★ F-341 FIX (2026-09-24): poison rows — a PERSISTENTLY malformed row failed in the per-row fallback, never joined the seen set, and was retried on every later drain (persistFailureCount flood, lastPersistError churn). Deterministic rejections (bad shape, bad domain, truth-at-firing) are quarantined after the first report; transient write faults keep the retry path below.
const poisoned = new Map<string, WeakSet<object>>();
const POISON_CODES = new Set(["MALFORMED_ROW", "EMPTY_STATE_HASH", "BAD_PROBABILITY", "BAD_NUMBER", "BAD_DOMAIN", "TRUTH_AT_FIRING", "BAD_LIMIT", "BAD_RULE_ID", "BAD_STATE_HASH", "BAD_TRUTH", "BAD_TRUTH_AT", "NOT_PERSISTENT"]);
function poisonCodeOf(code: string): string {
  return code.startsWith("GI_LEDGER_") ? code.slice("GI_LEDGER_".length) : code;
}

/** Persist every row the gate has produced that this ledger has not seen.
 *  Returns the number of NEW rows written (0 on a repeat drain). */
export function drain(gate: FireGate, ledger: FireLedger): number {
  const key = path.resolve(ledger.path);
  let seen = drained.get(key);
  if (seen === undefined) {
    // ★ PASS-4 HIGH — THE EVICTION IS GONE, AND IT SHOULD NEVER HAVE BEEN ADDED.
    //   Pass 3 flagged "this map is never evicted" as a MEDIUM resource concern and I
    //   bounded it — which DROPPED THE WEAKSET ON EVICTION, so a re-drain of an evicted
    //   ledger DOUBLE-WRITES. I traded a HIGH guarantee (exactly-once) for a MEDIUM
    //   resource concern. THE GUARANTEE WINS: one WeakSet per distinct ledger path is
    //   negligible memory, and a process opens one or two ledgers, not thousands.
    //   An entry is never removed, so exactly-once holds for the life of the process.
    seen = new WeakSet<object>();
    drained.set(key, seen);
  }
  const fresh: DecisionRow[] = [];
  let poison = poisoned.get(key);
  if (poison === undefined) { poison = new WeakSet<object>(); poisoned.set(key, poison); }
  for (const row of gate.rows()) {
    if (!seen.has(row) && !poison.has(row)) fresh.push(row);
  }
  if (fresh.length === 0) return 0;
  // ★ AUDIT FINDING 0 (HIGH) — THE WATERMARK ADVANCES ONLY AFTER THE COMMIT.
  // The first version added each row to `seen` BEFORE calling appendMany, so any
  // throw in the write (a malformed row, SQLITE_FULL, I/O) left the rows marked as
  // already-persisted: the next drain returned 0 and THOSE FIRES WERE PERMANENTLY
  // LOST. In a module whose entire purpose is "a row per fire, or no calibration",
  // a lost row is an uncalibratable fire — the defect W1 exists to prevent.
  // ★ PASS-3 CRITICAL — THE WATERMARK ADVANCES ONLY FOR ROWS THE LEDGER CONFIRMS.
  // Marking every ATTEMPTED row seen was the original F0 defect wearing the R7
  // fallback as a disguise: a partially-committed batch lost its failures forever.
  const { committed, failed } = ledger.appendManyDetailed(fresh);
  for (const row of committed) seen.add(row);
  for (const f of failed) { if (POISON_CODES.has(poisonCodeOf(f.error.code))) poison.add(f.row); }
  return committed.length;
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
      // ★ R6's consumer fix — the CODE is read off the error, never parsed out of its
      // message. The F1 fix did `e.message.split(":")[0]`, which is exactly the kind
      // of fragile coupling the re-verify scan flagged.
      // ★ F-45 FIX (2026-09-24): normalize — a code that already carries the prefix must not gain it twice.
      const bare45 = e instanceof LedgerError ? (e.code.startsWith("GI_LEDGER_") ? e.code.slice("GI_LEDGER_".length) : e.code) : "PERSIST_FAILED";
      const code = `GI_LEDGER_${bare45}`;
      const message = e instanceof Error ? e.message : String(e);
      ledger.notePersistFailure(code, message);
      // The row is STILL in the gate's memory, so a later drain will land it —
      // provided the watermark did not advance, which is why fix 0 matters here.
    }
    return decision;
  };
  // ★ F-406 FIX (2026-09-24): ALL bound methods must be cached, not just judge —
  //   a new .bind() on every get() breaks method identity (gated.close === gated.close)
  //   which breaks memoisation keys, effect deps, spy assertions, and reference checks.
  const methodCache = new Map<string | symbol, Function>();
  return new Proxy(original, {
    get(target, prop) {
      if (prop === "judge") return judgeWithPersist;
      const cached = methodCache.get(prop);
      if (cached) return cached;
      const v = Reflect.get(target, prop, target);
      if (typeof v !== "function") return v;
      const bound = v.bind(target);
      methodCache.set(prop, bound);
      return bound;
    },
  }) as FireGate;
}
