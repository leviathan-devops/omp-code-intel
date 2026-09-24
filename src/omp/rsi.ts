// rsi — THE REFLEX LAYER (T-7). Kernel 3.0's adaptation substrate, built on the
// v1.3 store's OWN versioning discipline (created_run / superseded_run + the
// partial unique index), so nothing new is invented in the storage layer.
//
// THE THREE LAWS THIS FILE ENFORCES, each proven by a test that goes RED when
// the law is removed (SC-4):
//
//   1  SIGNED ROWS        a row written outside the kernel path does not verify,
//                         and an unverified row is treated as ABSENT (G2/G4).
//   2  VERIFIED RETIREMENT a supersede is honored ONLY if the SUPERSEDING row
//                         verifies (G5). Without this, an agent could not INJECT
//                         a rule but COULD DISABLE one by touching the victim's
//                         row — the hole a live attack found on 2026-09-21.
//   3  RECOMPUTED PRECISION precision = confirmed / (confirmed + refuted),
//                         recomputed over the append-only ledger, NEVER
//                         incremented on the row (SC-4's self-reference kill).
//
// NOTHING here is GI-specific: the store path, the key path, the table name and
// the id scheme are all configuration.
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";

export type RsiTier = "HOLD" | "REFLEX" | "GUARD" | "RETIRED";
export type Outcome = "confirmed" | "refuted" | "unresolved";

export interface RsiConfig {
  /** The sqlite file. Lives OUT of the project tree so the agent's edits to the
   *  analysed code cannot reach the enforcement record by accident. */
  storePath: string;
  /** The kernel-only signing key. Mode 0600, never in the repo, never in env
   *  the agent reads. */
  keyPath: string;
  /** The table name — configurable so the primitive is not tied to one schema. */
  table?: string;
  /** The evidence table. */
  evidenceTable?: string;
}

export interface ReflexRow {
  id: number;
  canonicalId: string;
  kind: RsiTier;
  label: string;
  evidenceQuote: string;
  confidence: number;
  confirmed: number;
  refuted: number;
  unresolved: number;
  createdRun: string;
  supersededRun: string | null;
  prevHash: string;
  sig: string;
}

export interface ReflexInput {
  canonicalId: string;
  kind: RsiTier;
  label: string;
  evidenceQuote: string;
  confidence: number;
}

/** The promotion / demotion derivation. The TIER IS DERIVED, never stored as
 *  truth: the row's `kind` is a CACHE of this function, and the battery diffs
 *  the two so a drifted row is a detectable corruption rather than a silent
 *  inconsistency. */
export interface TierThresholds {
  guardPrecision: number;
  guardMinFires: number;
  guardMaxUnresolvedRatio: number;
  reflexPrecision: number;
  /** EVERY promoting tier needs an evidence floor, not just GUARD: precision
   *  computed on ONE firing is noise. Without this, a single lucky firing
   *  promoted a rule — the failure the first W3 run caught. */
  reflexMinFires: number;
  /** Above this share of unknown outcomes there is no basis to act on at all,
   *  however clean the resolved ones look. */
  reflexMaxUnresolvedRatio: number;
  retireAfterFires: number;
}

export const DEFAULT_THRESHOLDS: TierThresholds = {
  guardPrecision: 0.9,
  guardMinFires: 10,
  guardMaxUnresolvedRatio: 0.2,
  reflexPrecision: 0.7,
  reflexMinFires: 3,
  reflexMaxUnresolvedRatio: 0.5,
  retireAfterFires: 20,
};

export interface TierDerivation {
  tier: RsiTier;
  precision: number;
  fires: number;
  unresolvedRatio: number;
}

/** precision = confirmed / (confirmed + refuted). Unresolved is EXCLUDED from the
 *  ratio (it is counted, never assumed) and gates promotion separately. */
export function deriveTier(
  confirmed: number,
  refuted: number,
  unresolved: number,
  th: TierThresholds = DEFAULT_THRESHOLDS,
): TierDerivation {
  const resolved = confirmed + refuted;
  const fires = resolved + unresolved;
  const precision = resolved === 0 ? 0 : confirmed / resolved;
  const unresolvedRatio = fires === 0 ? 0 : unresolved / fires;
  let tier: RsiTier;
  if (
    precision >= th.guardPrecision &&
    fires >= th.guardMinFires &&
    unresolvedRatio <= th.guardMaxUnresolvedRatio
  ) {
    tier = "GUARD";
  } else if (
    precision >= th.reflexPrecision &&
    fires >= th.reflexMinFires &&
    unresolvedRatio <= th.reflexMaxUnresolvedRatio
  ) {
    tier = "REFLEX";
  } else if (fires >= th.retireAfterFires && unresolvedRatio <= th.reflexMaxUnresolvedRatio) {
    tier = "RETIRED";
  } else {
    // HOLD can NEVER promote: a reflex with thin or ambiguous evidence is
    // parked, not trusted. Without HOLD a single lucky firing promotes a rule —
    // exactly how the parked TTSR kernels were born (24 firings, 18
    // unrecoverable, no precision recorded at all).
    tier = "HOLD";
  }
  return { tier, precision, fires, unresolvedRatio };
}

export class RsiStore {
  private readonly db: Database;
  private readonly key: Buffer;
  private readonly table: string;
  private readonly evidenceTable: string;

  constructor(cfg: RsiConfig) {
    // ★ F-RS1 FIX (2026-09-24): table names are interpolated into SQL — refuse anything
    //   that is not a bare identifier (defense-in-depth; today only literals reach here).
    for (const [label, name] of [["table", cfg.table ?? "gi_reflex"], ["evidenceTable", cfg.evidenceTable ?? "gi_reflex_evidence"]] as const) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
        throw new Error(`GI_RSI_BAD_TABLE: ${label} ${JSON.stringify(name)} is not a bare SQL identifier — refusing to interpolate it`);
      }
    }
    this.table = cfg.table ?? "gi_reflex";
    this.evidenceTable = cfg.evidenceTable ?? "gi_reflex_evidence";
    const dir = path.dirname(cfg.storePath);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    // ★ F-RS2 FIX (2026-09-24): exists-check-then-write let a second concurrent creator
    //   OVERWRITE the first's key (rows signed under it became unverifiable). O_EXCL makes
    //   creation atomic: EEXIST means a sibling won — read THEIR key, never overwrite it.
    try {
      fs.writeFileSync(cfg.keyPath, crypto.randomBytes(32), { mode: 0o600, flag: "wx" });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST" || !fs.existsSync(cfg.keyPath)) throw e;
    }
    this.key = fs.readFileSync(cfg.keyPath);
    this.db = new Database(cfg.storePath);
    this.db.exec("PRAGMA journal_mode=WAL;");
    this.db.exec(this.schema());
  }

  private schema(): string {
    return `
      CREATE TABLE IF NOT EXISTS ${this.table} (
        id INTEGER PRIMARY KEY,
        canonical_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        label TEXT NOT NULL,
        evidence_quote TEXT NOT NULL,
        confidence REAL NOT NULL,
        confirmed INTEGER NOT NULL DEFAULT 0,
        refuted INTEGER NOT NULL DEFAULT 0,
        unresolved INTEGER NOT NULL DEFAULT 0,
        created_run TEXT NOT NULL,
        superseded_run TEXT,
        prev_hash TEXT NOT NULL,
        sig TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS ${this.table}_live
        ON ${this.table}(canonical_id) WHERE superseded_run IS NULL;
      CREATE TABLE IF NOT EXISTS ${this.evidenceTable} (
        id INTEGER PRIMARY KEY,
        canonical_id TEXT NOT NULL,
        fired_at TEXT NOT NULL,
        outcome TEXT NOT NULL,
        outcome_evidence TEXT,
        prev_hash TEXT NOT NULL,
        sig TEXT NOT NULL
      );
    `;
  }

  close(): void {
    this.db.close();
  }

  /** The canonical byte form that the signature covers — deterministic key
   *  order, explicit field list. A field added to the row but not to this list
   *  would be UNSIGNED, so the list IS the signing contract; it lives here
   *  rather than in a one-line helper so the contract reads in one place. */
  private sign(r: Omit<ReflexRow, "sig" | "id">): string {
    const body = JSON.stringify({
      canonical_id: r.canonicalId,
      kind: r.kind,
      label: r.label,
      evidence_quote: r.evidenceQuote,
      confidence: Math.round(r.confidence * 10000) / 10000,
      confirmed: r.confirmed,
      refuted: r.refuted,
      unresolved: r.unresolved,
      created_run: r.createdRun,
      prev_hash: r.prevHash,
    });
    return crypto.createHmac("sha256", this.key).update(body).digest("hex");
  }

  private head(): string {
    const row = this.db
      .query(`SELECT sig FROM ${this.table} WHERE superseded_run IS NULL ORDER BY id DESC LIMIT 1`)
      .get() as { sig: string } | null;
    return row?.sig ?? "GENESIS";
  }

  /** sqlite hands back snake_case; the domain type is camelCase. A row read
   *  without this mapping has EVERY field undefined and silently verifies
   *  nothing — the bug the first W3 run caught. */
  private mapRow(r: Record<string, unknown>): ReflexRow {
    return {
      id: Number(r["id"] ?? 0),
      canonicalId: String(r["canonical_id"] ?? ""),
      kind: String(r["kind"] ?? "") as RsiTier,
      label: String(r["label"] ?? ""),
      evidenceQuote: String(r["evidence_quote"] ?? ""),
      confidence: Number(r["confidence"] ?? 0),
      confirmed: Number(r["confirmed"] ?? 0),
      refuted: Number(r["refuted"] ?? 0),
      unresolved: Number(r["unresolved"] ?? 0),
      createdRun: String(r["created_run"] ?? ""),
      supersededRun: r["superseded_run"] === null ? null : String(r["superseded_run"] ?? ""),
      prevHash: String(r["prev_hash"] ?? ""),
      sig: String(r["sig"] ?? ""),
    };
  }

  /** Every read that returns rows goes through the mapper. */
  private rows(sql: string, ...params: string[]): ReflexRow[] {
    return (this.db.query(sql).all(...params) as Array<Record<string, unknown>>).map((r) => this.mapRow(r));
  }

  /** Does this row carry a valid kernel signature? A row that fails is treated
   *  as ABSENT by every reader (G4) — verification makes a forgery INERT. */
  verify(r: ReflexRow): boolean {
    const expect = this.sign({
      canonicalId: r.canonicalId, kind: r.kind, label: r.label,
      evidenceQuote: r.evidenceQuote, confidence: r.confidence,
      confirmed: r.confirmed, refuted: r.refuted, unresolved: r.unresolved,
      createdRun: r.createdRun, supersededRun: r.supersededRun, prevHash: r.prevHash,
    });
    // A MALFORMED signature must be REJECTED, not crash the verifier. The first
    // live-store run hit `RangeError: Input buffers must have the same byte
    // length` — crypto.timingSafeEqual THROWS on a length mismatch, so a
    // hostile row carrying a short/garbage sig took the reader down instead of
    // being treated as ABSENT. Length is checked BEFORE the comparison.
    const a = Buffer.from(expect, "hex");
    const b = Buffer.from(r.sig, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /** THE KERNEL WRITE PATH. Signs and chains. */
  write(input: ReflexInput, run: string): ReflexRow {
    // ★ F-272 FIX (2026-09-24): head()+INSERT ran as two autocommit statements — a concurrent process commit between them forked the chain on a stale prevHash. One IMMEDIATE txn, the retire() pattern below.
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const prevHash = this.head();
      const partial = {
        canonicalId: input.canonicalId, kind: input.kind, label: input.label,
        evidenceQuote: input.evidenceQuote, confidence: input.confidence,
        confirmed: 0, refuted: 0, unresolved: 0,
        createdRun: run, supersededRun: null, prevHash,
      };
      const sig = this.sign(partial);
      this.db.run(
        `INSERT INTO ${this.table}
          (canonical_id, kind, label, evidence_quote, confidence, confirmed, refuted,
           unresolved, created_run, superseded_run, prev_hash, sig)
         VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, NULL, ?, ?)`,
        [input.canonicalId, input.kind, input.label, input.evidenceQuote,
         input.confidence, run, prevHash, sig],
      );
      this.db.exec("COMMIT;");
      return { id: 0, ...partial, sig } as ReflexRow;
    } catch (e) {
      try { this.db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    }
  }

  /** THE VERIFIED RETIREMENT (SC-5, G5). A supersede is honored ONLY if the
   *  SUPERSEDING row exists, is live, and VERIFIES. A forged retire is IGNORED
   *  and the victim row STAYS LIVE. */
  retire(canonicalId: string, supersedingRun: string): { honored: boolean; reason: string } {
    // ★ F-42 FIX (2026-09-24): SELECT-then-UPDATE ran as two autocommit statements — a concurrent supersede could retire the victim between them while this call still reported honored:true. One IMMEDIATE txn serializes concurrents; the changes count decides the verdict: zero rows touched means nothing was honored.
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const raw = this.db
        .query(`SELECT * FROM ${this.table} WHERE canonical_id = ? AND created_run = ? AND superseded_run IS NULL`)
        .get(canonicalId, supersedingRun) as Record<string, unknown> | null;
      const successor = raw === null ? null : this.mapRow(raw);
      if (successor === null) {
        try { this.db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        return { honored: false, reason: "no live superseding row — the retire is IGNORED and the row stays live" };
      }
      if (!this.verify(successor)) {
        try { this.db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        return { honored: false, reason: "the superseding row does NOT verify — the retire is IGNORED and the row stays live" };
      }
      const r = this.db.run(
        `UPDATE ${this.table} SET superseded_run = ? WHERE canonical_id = ? AND superseded_run IS NULL AND created_run <> ?`,
        [supersedingRun, canonicalId, supersedingRun],
      ) as unknown as { changes?: number | bigint };
      const changed = Number(r.changes ?? 0);
      this.db.exec("COMMIT;");
      if (changed === 0) {
        return { honored: false, reason: "the victim row was already retired by a concurrent supersede — nothing was honored" };
      }
      return { honored: true, reason: `superseded by verified run ${supersedingRun}` };
    } catch (e) {
      try { this.db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    }
  }

  /** Live rows, with unverified rows treated as ABSENT (G4). */
  live(): ReflexRow[] {
    return this.rows(`SELECT * FROM ${this.table} WHERE superseded_run IS NULL ORDER BY id`).filter((r) => this.verify(r));
  }

  /** A row retired by an UNSIGNED supersede is NOT retired — the reader honors
   *  the row's own validity over the claim on it. */
  liveIncludingForgedRetirement(canonicalId: string): ReflexRow | null {
    for (const r of this.rows(`SELECT * FROM ${this.table} WHERE canonical_id = ? ORDER BY id DESC`, canonicalId)) {
      if (!this.verify(r)) continue;
      if (r.supersededRun === null) return r;
      const raw = this.db
        .query(`SELECT * FROM ${this.table} WHERE canonical_id = ? AND created_run = ?`)
        .get(canonicalId, r.supersededRun) as Record<string, unknown> | null;
      const successor = raw === null ? null : this.mapRow(raw);
      if (successor !== null && this.verify(successor)) continue; // a real retirement
      return r; // retired by an unverified successor ⇒ STAYS LIVE
    }
    return null;
  }

  /** THE LEDGER. Outcomes append; firings append. NOTHING is updated, so the
   *  original verdict is preserved beside what the kernel later concluded. */
  appendFiring(canonicalId: string, firedAt: string): void {
    // ★ F-272 FIX (2026-09-24): tip-read+INSERT autocommit pair, same fork class as write() — one IMMEDIATE txn.
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const prev = this.db
        .query(`SELECT sig FROM ${this.evidenceTable} ORDER BY id DESC LIMIT 1`)
        .get() as { sig: string } | null;
      const prevHash = prev?.sig ?? "GENESIS";
      const sig = crypto
        .createHmac("sha256", this.key)
        .update(`${prevHash}|${JSON.stringify({ c: canonicalId, at: firedAt, o: "unresolved" })}`) // ★ F-21 FIX: sign the persisted outcome, not "pending"
        .digest("hex");
      this.db.run(
        `INSERT INTO ${this.evidenceTable} (canonical_id, fired_at, outcome, outcome_evidence, prev_hash, sig)
         VALUES (?, ?, 'unresolved', NULL, ?, ?)`,
        [canonicalId, firedAt, prevHash, sig],
      );
      this.db.exec("COMMIT;");
    } catch (e) {
      try { this.db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    }
  }

  appendOutcome(canonicalId: string, outcome: Outcome, evidence: string): void {
    // ★ F-272 FIX (2026-09-24): tip-read+INSERT autocommit pair, same fork class as write() — one IMMEDIATE txn.
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const prev = this.db
        .query(`SELECT sig FROM ${this.evidenceTable} ORDER BY id DESC LIMIT 1`)
        .get() as { sig: string } | null;
      const prevHash = prev?.sig ?? "GENESIS";
      const sig = crypto
        .createHmac("sha256", this.key)
        .update(`${prevHash}|${JSON.stringify({ c: canonicalId, o: outcome })}`)
        .digest("hex");
      this.db.run(
        `INSERT INTO ${this.evidenceTable} (canonical_id, fired_at, outcome, outcome_evidence, prev_hash, sig)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [canonicalId, new Date().toISOString(), outcome, evidence, prevHash, sig],
      );
      this.db.exec("COMMIT;");
    } catch (e) {
      try { this.db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    }
  }

  /** RECOMPUTE from the ledger — the SC-4 self-reference kill. Counts the
   *  outcome rows; NEVER reads or increments a counter on the row. */
  recount(canonicalId: string): { confirmed: number; refuted: number; unresolved: number } {
    const rows = this.db
      .query(`SELECT outcome FROM ${this.evidenceTable} WHERE canonical_id = ?`)
      .all(canonicalId) as Array<{ outcome: Outcome }>;
    let confirmed = 0, refuted = 0, unresolved = 0;
    for (const r of rows) {
      if (r.outcome === "confirmed") confirmed++;
      else if (r.outcome === "refuted") refuted++;
      else unresolved++;
    }
    return { confirmed, refuted, unresolved };
  }

  /** SUPERSEDE: insert the new belief, then retire the old one. TWO writes, one
   *  logical change, both signed; the prior row survives queryable forever.
   *  ★ F-344 FIX (2026-09-24): recount() + liveIncludingForgedRetirement() ran BEFORE
   *  BEGIN IMMEDIATE — a concurrent appendFiring/appendOutcome between the derivation and
   *  the lock inserted a row with STALE counts and a possibly wrong tier (TOCTOU). The
   *  derivation now runs INSIDE the IMMEDIATE txn (after the write lock is held), so the
   *  ledger snapshot the tier derives from is the snapshot the row is chained onto.
   *  The no-change early return rolls back the (empty) txn before returning null. */
  supersede(canonicalId: string, run: string): ReflexRow | null {
    // ATOMIC retire-then-insert. The partial unique index allows ONE live row
    // per canonical_id, so the insert cannot precede the retire; and G5 ("a
    // retirement counts only if the successor verifies") is preserved by
    // ATOMICITY rather than by ordering — no reader can observe the pair
    // half-applied, and any failure rolls the retire back. An attacker cannot
    // reach this pair without producing a VERIFYING successor row, which
    // requires the kernel key.
    this.db.exec("BEGIN IMMEDIATE;");
    try {
      const counts = this.recount(canonicalId);
      const d = deriveTier(counts.confirmed, counts.refuted, counts.unresolved);
      const current = this.liveIncludingForgedRetirement(canonicalId);
      if (current !== null && current.kind === d.tier) {
        try { this.db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
        return null; // no change
      }
      // ★ F-273 FIX (2026-09-24): head() ran BEFORE the lock — a concurrent commit between the read and BEGIN chained a stale prevHash. The tip is read INSIDE the txn, after BEGIN IMMEDIATE.
      const prevHash = this.head();
      const partial = {
        canonicalId, kind: d.tier, label: current?.label ?? canonicalId,
        evidenceQuote: current?.evidenceQuote ?? "",
        confidence: d.precision, confirmed: counts.confirmed, refuted: counts.refuted,
        unresolved: counts.unresolved, createdRun: run, supersededRun: null, prevHash,
      };
      const sig = this.sign(partial);
      this.db.run(
        `UPDATE ${this.table} SET superseded_run = ? WHERE canonical_id = ? AND superseded_run IS NULL`,
        [run, canonicalId],
      );
      this.db.run(
        `INSERT INTO ${this.table}
          (canonical_id, kind, label, evidence_quote, confidence, confirmed, refuted,
           unresolved, created_run, superseded_run, prev_hash, sig)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [canonicalId, d.tier, partial.label, partial.evidenceQuote, d.precision,
         counts.confirmed, counts.refuted, counts.unresolved, run, prevHash, sig],
      );
      this.db.exec("COMMIT;");
      return { id: 0, ...partial, sig } as ReflexRow;
    } catch (e) {
      try { this.db.exec("ROLLBACK;"); } catch { /* already rolled back */ }
      throw e;
    }
  }

  /** A FORGED WRITE — the attack shape, used by the tests to prove the reader
   *  rejects it. Never called by the kernel path. */
  forgeForTest(row: Partial<ReflexRow> & { canonicalId: string; createdRun: string }, sig: string): void {
    this.db.run(
      `INSERT INTO ${this.table}
        (canonical_id, kind, label, evidence_quote, confidence, confirmed, refuted,
         unresolved, created_run, superseded_run, prev_hash, sig)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [row.canonicalId, row.kind ?? "RETIRED", row.label ?? "forged",
       row.evidenceQuote ?? "forged", row.confidence ?? 1, row.confirmed ?? 0,
       row.refuted ?? 0, row.unresolved ?? 0, row.createdRun, row.prevHash ?? "GENESIS", sig],
    );
  }

  /** Force a retirement without a successor — the disablement attack's first
   *  half. The reader's verified-retirement rule is what defeats it. */
  forceSupersedeForTest(canonicalId: string, run: string): void {
    this.db.run(
      `UPDATE ${this.table} SET superseded_run = ? WHERE canonical_id = ? AND superseded_run IS NULL`,
      [run, canonicalId],
    );
  }

  allRows(): ReflexRow[] {
    return this.rows(`SELECT * FROM ${this.table} ORDER BY id`);
  }
}
