// store.ts — KernelStore: the guarded seam + the auditable version chain.
// G1 separate store · G2 signed rows · G3 hash chain · G4 verified reads ·
// G5 VERIFIED RETIREMENT (a supersede counts only if the superseding row
// verifies; otherwise the retire is IGNORED and the row stays live).
// Ledger (appendFiring/appendOutcome, never update) + anchor() seam (D2) +
// verify-on-WRITE-ACCEPT guard (D4) + firing-linkage guard (D5).
import { Database } from "bun:sqlite";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";
import {
  GENESIS,
  canonicalPayload,
  signPayload,
  verifyHooks,
  type SignableFields,
} from "./signing";
import { resolveConfig, type ResolvedConfig, type StoreConfig } from "./config";

export const KEY_BYTES = 32; // anchored: reference key is 32 random bytes

export interface RecordInput {
  entityId: string;
  kind: string;
  label: string;
  evidenceQuote: string;
  confidence: number;
  confirmed?: number;
  refuted?: number;
  unresolved?: number;
  createdRun: string;
}

export interface StoredRecord extends SignableFields {
  id: number;
  sig: string;
}

export interface LedgerFiring {
  entityId: string;
  firedAt: string;
  verdict: string;
  actFingerprint?: string;
}

export interface LedgerOutcome {
  entityId: string;
  firingId: number;
  outcome: "confirmed" | "refuted" | "unresolved";
  outcomeAt: string;
  outcomeEvidence?: string;
}

export interface ChainBreak {
  rowId: number;
  reason: "BAD_SIG" | "BAD_LINK";
}

/** Load the kernel key. Secrets law: only the label travels in errors. */
export function loadKey(keyPath: string): Buffer {
  let st: fs.Stats;
  try {
    st = fs.statSync(keyPath);
  } catch {
    throw new Error("KEY_ABSENT key file missing");
  }
  if (st.size !== KEY_BYTES) throw new Error(`KEY_LEN want=${KEY_BYTES}`);
  const mode = st.mode & 0o777;
  if ((mode & 0o077) !== 0) throw new Error("KEY_MODE want=0600 (group/other bits set)");
  return fs.readFileSync(keyPath);
}

/** Mint a fresh kernel key. 0600, 32 random bytes, never in the project tree. */
export function mintKey(keyPath: string): void {
  fs.mkdirSync(path.dirname(keyPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(keyPath, randomBytes(KEY_BYTES), { mode: 0o600 });
  fs.chmodSync(keyPath, 0o600);
}

/** G1: the store dir is created 0700 — out-of-tree of the project. */
export function ensureStoreDir(storePath: string): void {
  fs.mkdirSync(path.dirname(storePath), { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(path.dirname(storePath), 0o700);
  } catch {
    /* best effort on odd mounts */
  }
}

export class KernelStore {
  readonly cfg: ResolvedConfig;
  readonly db: Database;
  readonly key: Buffer;

  private constructor(cfg: ResolvedConfig, db: Database, key: Buffer) {
    this.cfg = cfg;
    this.db = db;
    this.key = key;
  }

  static open(c: StoreConfig): KernelStore {
    const cfg = resolveConfig(c);
    ensureStoreDir(cfg.storePath);
    const db = new Database(cfg.storePath, { create: true });
    db.run("PRAGMA journal_mode=WAL;");
    const key = loadKey(cfg.keyPath);
    const s = new KernelStore(cfg, db, key);
    s.ensureSchema();
    return s;
  }

  close(): void {
    this.db.close();
  }

  /** DDL mirroring the reference exactly (records + ledger + one-live index). */
  ensureSchema(): void {
    const { recordTable: R, ledgerTable: L, idColumn: C } = this.cfg;
    this.db.run(`CREATE TABLE IF NOT EXISTS ${R} (
      id INTEGER PRIMARY KEY,
      ${C} TEXT NOT NULL,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      evidence_quote TEXT NOT NULL,
      confidence REAL NOT NULL,
      confirmed INTEGER NOT NULL DEFAULT 0,
      refuted INTEGER NOT NULL DEFAULT 0,
      unresolved INTEGER NOT NULL DEFAULT 0,
      created_run TEXT NOT NULL,
      superseded_run TEXT,
      prev_hash TEXT,
      sig TEXT NOT NULL
    )`);
    this.db.run(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_live_${R} ON ${R}(${C}) WHERE superseded_run IS NULL`,
    );
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_${R}_entity ON ${R}(${C})`);
    this.db.run(`CREATE TABLE IF NOT EXISTS ${L} (
      id INTEGER PRIMARY KEY,
      ${C} TEXT NOT NULL,
      fired_at TEXT NOT NULL,
      outcome TEXT NOT NULL,
      outcome_at TEXT,
      outcome_evidence TEXT,
      prev_hash TEXT,
      sig TEXT NOT NULL
    )`);
  }

  private toFields(r: Record<string, unknown>): SignableFields {
    return {
      entityId: String(r[this.cfg.idColumn]),
      kind: String(r["kind"]),
      label: String(r["label"]),
      evidenceQuote: String(r["evidence_quote"]),
      confidence: Number(r["confidence"]),
      confirmed: Number(r["confirmed"]),
      refuted: Number(r["refuted"]),
      unresolved: Number(r["unresolved"]),
      createdRun: String(r["created_run"]),
      supersededRun: r["superseded_run"] == null ? null : String(r["superseded_run"]),
      prevHash: r["prev_hash"] == null ? null : String(r["prev_hash"]),
    };
  }

  private stored(r: Record<string, unknown>): StoredRecord {
    return { ...this.toFields(r), id: Number(r["id"]), sig: String(r["sig"]) };
  }

  private allFor(entityId: string): StoredRecord[] {
    const { recordTable: R, idColumn: C } = this.cfg;
    const rows = this.db.query(`SELECT * FROM ${R} WHERE ${C} = ? ORDER BY id ASC`).all(entityId) as Record<string, unknown>[];
    return rows.map((r) => this.stored(r));
  }

  verifyRow(r: StoredRecord): boolean {
    const { id: _id, sig: _sig, ...f } = r;
    void _id;
    void _sig;
    return verifyHooks.compare(signPayload(canonicalPayload(f), this.key), r.sig);
  }

  verify(r: StoredRecord): boolean {
    return this.verifyRow(r);
  }

  /** G5 core: a row is disabled iff it carries superseded_run=S AND some row
   *  with created_run=S for the same entity VERIFIES. An unverified claimant
   *  means the retirement is IGNORED — the row stays live. A stamp with no
   *  claimant means the kernel retired it and the superseder aged away.
   *  Graffiti case (reference ATTACK 2): the attacker stamped the victim via
   *  raw UPDATE without re-signing, so the stamped row itself no longer
   *  verifies. `verifyAsUnstamped` re-checks the sig against the pre-stamp
   *  (NULL-stamp) content — the bytes the kernel actually signed. */
  private isDisabled(rec: StoredRecord, recs: StoredRecord[]): boolean {
    const stamp = rec.supersededRun;
    if (stamp === null) return false;
    const claimants = recs.filter((o) => o.id !== rec.id && o.createdRun === stamp);
    if (claimants.length === 0) return true;
    return claimants.some((o) => this.verifyRow(o));
  }

  /** True iff the row verifies with its stamp STRIPPED (NULL) — i.e. the
   *  kernel-signed content is intact and only an unsigned stamp was added. */
  private verifyAsUnstamped(rec: StoredRecord): boolean {
    if (rec.supersededRun === null) return this.verifyRow(rec);
    const stripped: StoredRecord = { ...rec, supersededRun: null };
    return this.verifyRow(stripped);
  }

  /** Raw row by id (no verification) — for forensics only, never the reader. */
  rawById(id: number): StoredRecord | null {
    const { recordTable: R } = this.cfg;
    const r = this.db.query(`SELECT * FROM ${R} WHERE id = ?`).get(id) as Record<string, unknown> | null;
    return r ? this.stored(r) : null;
  }

  /** Current kernel belief: newest verified, non-disabled row (G4 + G5).
   *  Graffiti rescue: a stamped row that fails verify ONLY because of an
   *  unsigned stamp (verifyAsUnstamped true, no verified claimant) is
   *  returned with its kernel-signed content — the retirement is IGNORED. */
  readLive(entityId: string): StoredRecord | null {
    const recs = this.allFor(entityId);
    let graffiti: StoredRecord | null = null;
    for (let i = recs.length - 1; i >= 0; i--) {
      const cand = recs[i];
      if (this.verifyRow(cand)) {
        if (this.isDisabled(cand, recs)) continue; // G5
        return cand;
      }
      // G4 says unverified = absent — UNLESS the only defect is an unsigned
      // stamp over kernel-signed content with no verified claimant (G5
      // ignores the retirement, so the row stays live).
      if (graffiti === null && cand.supersededRun !== null && this.verifyAsUnstamped(cand) && !this.isDisabled(cand, recs)) {
        graffiti = { ...cand, supersededRun: null };
      }
    }
    return graffiti;
  }

  /** Full history for an identity, oldest first. */
  history(entityId: string): StoredRecord[] {
    return this.allFor(entityId);
  }

  /** Time-travel: as_of(M) = created_run <= M AND (superseded_run IS NULL OR
   *  superseded_run > M), with G4 (unverified rows absent) and G5 (a supersede
   *  counts only via a verifying claimant). Newest qualifying row wins. */
  readAsOf(entityId: string, run: string): StoredRecord | null {
    const recs = this.allFor(entityId);
    const cands = recs.filter((r) => runLe(r.createdRun, run));
    cands.sort((a, b) => cmpRun(a.createdRun, b.createdRun) || a.id - b.id);
    for (let i = cands.length - 1; i >= 0; i--) {
      const cand = cands[i];
      if (!this.verifyRow(cand)) continue; // G4
      const stamp = cand.supersededRun;
      if (stamp === null) {
        // Head-at-M only if no NEWER verified row exists at-or-before M;
        // otherwise this stamped-null row is history, not the belief at M.
        // (Newest-first scan: the first verified row with no post-M
        // retirement IS the belief — but a verified successor created <= M
        // means this row was already succeeded.)
        const succeeded = cands
          .slice(i + 1)
          .some((o) => o.id !== cand.id && this.verifyRow(o));
        if (succeeded) continue;
        return cand;
      }
      if (runGt(stamp, run)) return cand; // retired after M: still live at M
      const claimants = recs.filter((o) => o.id !== cand.id && o.createdRun === stamp);
      if (claimants.some((o) => this.verifyRow(o))) continue; // retired at-or-before M
      return cand; // retirement ignored (G5) — row was live at M
    }
    return null;
  }

  /** D4: the chain tail must verify before the kernel extends the chain. */
  private checkedTailPrev(): string {
    const { recordTable: R } = this.cfg;
    const tail = this.db.query(`SELECT * FROM ${R} ORDER BY id DESC LIMIT 1`).get() as Record<string, unknown> | null;
    if (!tail) return GENESIS;
    const t = this.stored(tail);
    if (!this.verifyRow(t)) {
      throw new Error("CHAIN_TAIL_UNVERIFIED refusing to extend a corrupt chain");
    }
    return t.sig;
  }

  private insertSigned(fields: SignableFields): StoredRecord {
    const { recordTable: R, idColumn: C } = this.cfg;
    const sig = signPayload(canonicalPayload(fields), this.key);
    const res = this.db.run(
      `INSERT INTO ${R} (${C}, kind, label, evidence_quote, confidence, confirmed, refuted, unresolved, created_run, superseded_run, prev_hash, sig)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fields.entityId,
        fields.kind,
        fields.label,
        fields.evidenceQuote,
        fields.confidence,
        fields.confirmed,
        fields.refuted,
        fields.unresolved,
        fields.createdRun,
        fields.supersededRun,
        fields.prevHash,
        sig,
      ],
    );
    const id = Number((res as unknown as { lastInsertRowid: number | bigint }).lastInsertRowid);
    return { ...fields, id, sig };
  }

  write(input: RecordInput): StoredRecord {
    const prevHash = this.checkedTailPrev(); // D4 + G3 in one step
    return this.insertSigned({
      entityId: input.entityId,
      kind: input.kind,
      label: input.label,
      evidenceQuote: input.evidenceQuote,
      confidence: input.confidence,
      confirmed: input.confirmed ?? 0,
      refuted: input.refuted ?? 0,
      unresolved: input.unresolved ?? 0,
      createdRun: input.createdRun,
      supersededRun: null,
      prevHash,
    });
  }

  /** Retire the verified live row at `run`, successor through the signed path.
   *  The successor MUST verify (just signed) so the retirement is
   *  self-evidently honored. Throws when no verified live row exists. */
  retire(
    entityId: string,
    run: string,
    next: Omit<RecordInput, "entityId" | "createdRun"> & { createdRun?: string },
  ): StoredRecord {
    const { recordTable: R } = this.cfg;
    const live = this.readLive(entityId);
    if (!live) throw new Error("RETIRE_NO_LIVE nothing verified-live to retire");
    const createdRun = next.createdRun ?? run;
    this.checkedTailPrev(); // D4 guard: tail must verify before we extend
    // Stamp-then-insert INSIDE a transaction: the one-live partial index
    // forbids two NULL-stamped rows, so insert-before-stamp would violate
    // it (battery F5). The reference never faced this: it never executed a
    // same-identity kernel succession live (only the attacker UPDATE-then-
    // INSERT). Single-writer assumption (D3) makes the transient zero-live
    // window safe; the transaction makes it atomic.
    this.db.run("BEGIN IMMEDIATE");
    try {
      // The stamp is SIGNED CONTENT: re-sign the victim row over its stamped
      // fields so it keeps verifying (its sig was computed with NULL stamp).
      // Without this the kernel's own retire would corrupt the chain (found
      // by the battery: verify(victim) went false after a kernel retire).
      const stamped: SignableFields = { ...live, supersededRun: createdRun };
      const { id: _drop, sig: _dropSig, ..._rest } = live;
      void _drop;
      void _dropSig;
      void _rest;
      const stampedSig = signPayload(canonicalPayload(stamped), this.key);
      this.db.run(`UPDATE ${R} SET superseded_run = ?, sig = ? WHERE id = ?`, [createdRun, stampedSig, live.id]);
      const sup = this.insertSigned({
        entityId,
        kind: next.kind,
        label: next.label,
        evidenceQuote: next.evidenceQuote,
        confidence: next.confidence,
        confirmed: next.confirmed ?? live.confirmed,
        refuted: next.refuted ?? live.refuted,
        unresolved: next.unresolved ?? live.unresolved,
        createdRun,
        supersededRun: null,
        prevHash: stampedSig,
      });
      if (!this.verifyRow(sup)) throw new Error("RETIRE_SELF_UNVERIFIED kernel bug");
      this.db.run("COMMIT");
      return sup;
    } catch (e) {
      try {
        this.db.run("ROLLBACK");
      } catch {}
      throw e;
    }
  }

  private ledgerPrev(): string {
    const { ledgerTable: L } = this.cfg;
    const row = this.db.query(`SELECT sig FROM ${L} ORDER BY id DESC LIMIT 1`).get() as {
      sig: string;
    } | null;
    return row ? row.sig.slice(0, 16) : GENESIS;
  }

  private ledgerSign(canonical: string): string {
    return signPayload(canonical, this.key);
  }

  appendFiring(f: LedgerFiring): number {
    const { ledgerTable: L, idColumn: C } = this.cfg;
    const prev = this.ledgerPrev();
    const canonical = [f.entityId, f.firedAt, f.verdict, "", f.actFingerprint ?? "", prev].join("|");
    const sig = this.ledgerSign(canonical);
    const res = this.db.run(
      `INSERT INTO ${L} (${C}, fired_at, outcome, outcome_at, outcome_evidence, prev_hash, sig) VALUES (?, ?, ?, NULL, ?, ?, ?)`,
      [f.entityId, f.firedAt, f.verdict, f.actFingerprint ?? null, prev, sig],
    );
    return Number((res as unknown as { lastInsertRowid: number | bigint }).lastInsertRowid);
  }

  /** The outcome is a NEW record, never an edit of the firing. D5: the firing
   *  row must exist, else throw. */
  appendOutcome(o: LedgerOutcome): number {
    const { ledgerTable: L, idColumn: C } = this.cfg;
    const firing = this.db.query(`SELECT id FROM ${L} WHERE id = ?`).get(o.firingId) as {
      id: number;
    } | null;
    if (!firing) throw new Error(`LEDGER_NO_FIRING firing=${o.firingId} absent`);
    const prev = this.ledgerPrev();
    const canonical = [o.entityId, String(o.firingId), o.outcome, o.outcomeAt, o.outcomeEvidence ?? "", prev].join("|");
    const sig = this.ledgerSign(canonical);
    const res = this.db.run(
      `INSERT INTO ${L} (${C}, fired_at, outcome, outcome_at, outcome_evidence, prev_hash, sig) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [o.entityId, String(o.firingId), o.outcome, o.outcomeAt, o.outcomeEvidence ?? null, prev, sig],
    );
    return Number((res as unknown as { lastInsertRowid: number | bigint }).lastInsertRowid);
  }

  precision(entityId: string): {
    confirmed: number;
    refuted: number;
    unresolved: number;
    precision: number | null;
  } {
    const { ledgerTable: L, idColumn: C } = this.cfg;
    const rows = this.db.query(`SELECT outcome FROM ${L} WHERE ${C} = ? AND outcome_at IS NOT NULL`).all(entityId) as Array<{
      outcome: string;
    }>;
    let c = 0,
      r = 0,
      u = 0;
    for (const row of rows) {
      if (row.outcome === "confirmed") c++;
      else if (row.outcome === "refuted") r++;
      else u++;
    }
    return { confirmed: c, refuted: r, unresolved: u, precision: c + r === 0 ? null : c / (c + r) };
  }

  /** Walk the record chain in id order; report the FIRST failing row. A
   *  deleted row surfaces here: its successor's prev_hash dangles (BAD_LINK).
   *  A tampered row surfaces as BAD_SIG at its own id. */
  verifyChain(): { ok: boolean; breakAt: ChainBreak | null; checked: number } {
    const { recordTable: R } = this.cfg;
    const rows = this.db.query(`SELECT * FROM ${R} ORDER BY id ASC`).all() as Record<string, unknown>[];
    let prev: string | null = null;
    let checked = 0;
    for (const r of rows) {
      const rec = this.stored(r);
      checked++;
      if (!this.verifyRow(rec)) return { ok: false, breakAt: { rowId: rec.id, reason: "BAD_SIG" }, checked };
      const want = prev === null ? GENESIS : prev;
      if ((rec.prevHash ?? GENESIS) !== want) {
        return { ok: false, breakAt: { rowId: rec.id, reason: "BAD_LINK" }, checked };
      }
      prev = rec.sig;
    }
    return { ok: true, breakAt: null, checked };
  }

  /** D2 anchor seam: write the chain head sha somewhere durable (a file). */
  anchor(anchorPath: string): string {
    const { recordTable: R } = this.cfg;
    const row = this.db.query(`SELECT sig FROM ${R} ORDER BY id DESC LIMIT 1`).get() as {
      sig: string;
    } | null;
    const head = row ? row.sig : GENESIS;
    fs.mkdirSync(path.dirname(anchorPath), { recursive: true });
    fs.writeFileSync(anchorPath, `${head}\n`);
    return head;
  }
}

/** Run ordering: numeric-suffix aware (run-7 < run-9 < run-99). */
export function cmpRun(a: string, b: string): number {
  if (a === b) return 0;
  const pa = a.split("-");
  const pb = b.split("-");
  const na = Number(pa[pa.length - 1]);
  const nb = Number(pb[pb.length - 1]);
  if (pa.slice(0, -1).join("-") === pb.slice(0, -1).join("-") && Number.isFinite(na) && Number.isFinite(nb)) {
    return na - nb;
  }
  return a < b ? -1 : 1;
}
export function runLe(a: string, b: string): boolean {
  return cmpRun(a, b) <= 0;
}
export function runGt(a: string, b: string): boolean {
  return cmpRun(a, b) > 0;
}
