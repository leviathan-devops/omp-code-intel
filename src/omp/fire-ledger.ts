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
  later_truth      TEXT NOT NULL DEFAULT 'unresolved',
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

  /** §8.2. Appends ONE row, returning its id. Throws loudly on any failure. */
  append(row: DecisionRow): number {
    if (row.stateHash.trim() === "") {
      throw new LedgerError("EMPTY_STATE_HASH", "a row without a state_hash cannot be resolved later");
    }
    if (!Number.isFinite(row.probability)) {
      throw new LedgerError("BAD_PROBABILITY", `probability must be finite, got ${String(row.probability)}`);
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
    const raw = this.db.query(`SELECT * FROM fire_decisions ORDER BY id ASC`).all() as Record<string, unknown>[];
    return raw.map(toPersisted);
  }

  /** One rule's rows — the unit calibration works in (never one global number). */
  byRule(ruleId: string): PersistedFireRow[] {
    const raw = this.db
      .query(`SELECT * FROM fire_decisions WHERE rule_id = ?1 ORDER BY id ASC`)
      .all(ruleId) as Record<string, unknown>[];
    return raw.map(toPersisted);
  }

  count(): number {
    const r = this.db.query(`SELECT COUNT(*) AS n FROM fire_decisions`).get() as { n: number };
    return r.n;
  }

  /** §6.4.7 — the ORACLE's write. Returns how many rows it touched (by
   *  state_hash, because one state judged twice is two rows of the SAME state
   *  and both must resolve). */
  recordTruth(stateHash: string, truth: DecisionRow["laterTruth"], at = new Date().toISOString()): number {
    if (truth === "unresolved") {
      throw new LedgerError("BAD_TRUTH", "the oracle resolves to confirmed|refuted — 'unresolved' is the ABSENCE of a resolution, not one");
    }
    try {
      const r = this.db
        .prepare(`UPDATE fire_decisions SET later_truth = ?1, truth_at = ?2 WHERE state_hash = ?3`)
        .run(truth, at, stateHash);
      return Number(r.changes);
    } catch (e) {
      throw new LedgerError("TRUTH_FAILED", `could not resolve state ${stateHash}`, e);
    }
  }

  /** ★ THE CONSUMER SEAM. Exactly the shape calibration.ts reads:
   *  `checkCalibrationHealth(policies, ledgersByRule)` and
   *  `derivePolicy(profile, counts)`. Grouped per rule — the precision of one
   *  rule says nothing about another. */
  countsByRule(): Record<string, ResolvedCounts> {
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
  }

  /** The live columns, read from the DB itself (not from the constant) — the
   *  DDL-consistency test compares the two. */
  columns(): string[] {
    const r = this.db.query(`PRAGMA table_info(fire_decisions)`).all() as { name: string }[];
    return r.map((x) => x.name);
  }

  indices(): string[] {
    const r = this.db.query(`PRAGMA index_list(fire_decisions)`).all() as { name: string }[];
    return r.map((x) => x.name);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
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
    if (!seen.has(row)) { seen.add(row); fresh.push(row); }
  }
  if (fresh.length === 0) return 0;
  return ledger.appendMany(fresh);
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
  return new Proxy(original, {
    get(target, prop, _recv) {
      if (prop === "judge") {
        return async (fire: Parameters<FireGate["judge"]>[0], ctx: Parameters<FireGate["judge"]>[1]) => {
          const decision = await target.judge(fire, ctx);
          // The decision is already made; persisting must not change it. A
          // ledger failure THROWS (loud) rather than returning a decision whose
          // row silently never existed.
          drain(target, ledger);
          return decision;
        };
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === "function" ? v.bind(target) : v;
    },
  }) as FireGate;
}
