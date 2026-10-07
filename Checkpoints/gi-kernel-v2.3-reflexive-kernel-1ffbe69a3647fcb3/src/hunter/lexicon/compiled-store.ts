// PORTED FROM the archived upstream skill tree/lexicon/compiled-store.ts — verbatim bytes; SEAM: db->../shared/db-canon.ts, profile->../profile/schema.ts.
// the archived upstream skill tree/lexicon/compiled-store.ts
// THE COMPILED STORE (W4, spec §3.9's compiled-store — lines 1243-1257). The
// battery rows → W1's compiled_predicates table (the C18.4 schema, db.ts lines
// 257-268) via the DbClient PASS-THROUGH surface (prepare/exec — the documented
// query surface the spec's own tests use; there is NO dedicated battery writer
// on W1's DbClient, so the pass-through is the honest integration, never a
// schema extension and never a modification of W1's file).
//
// THE CHECK_CODE LAW: the check_code is the SERIALIZED reinstatement shape —
// { template, bindings } (the template id + the JSON-serialized bound params).
// NEVER a function string, NEVER a runtime-only closure: a fresh reader
// reinstantiates the check deterministically from the template library + the
// stored params (loadBattery). The D13 quote is mandatory on every row (the
// machine asserts only what it can quote). The write is IDEMPOTENT: INSERT OR
// REPLACE by the content-addressed id — a recompile replaces the rows in place,
// never accumulates duplicates.

import type { DbClient, Severity } from '../shared/db-canon.ts';
import { SEVERITIES } from '../shared/db-canon.ts';
import type { RuleCard } from './rule-card.ts';
import {
  TEMPLATE_LIBRARY, LexiconError, templateMissing,
  type CompiledPredicate, type PredicateFamily, type CheckContext,
} from './templates.ts';

/** The compiled_predicates columns (db.ts:257-268) — the write is INSERT OR
 *  REPLACE by the content-addressed predicate id (idempotent by construction). */
const COMPILED_PREDICATES_COLUMNS = [
  'id', 'family', 'template', 'bindings', 'verbatim_quote', 'anchor',
  'severity', 'check_code', 'battery_version', 'calibrated',
].join(',');

/**
 * The battery → W1's compiled_predicates table. The calibrated column is passed
 * explicitly as 'PENDING' — the column's DEFAULT (db.ts:267) — because the
 * calibration is W5's gate, never this wave's. The check_code carries the
 * reinstatement shape { template, bindings } — never a function string.
 */
/**
 * ★ F-897 (2026-09-25, run-13 CRITICAL): THE ATOMIC CACHE WRITE.
 *
 * THE DEFECT: the compile path called `writeRuleCards` then `writeBattery` as TWO independent
 * transactions. F-147's compensation only covered a writeBattery THROW — a CRASH or connection
 * drop BETWEEN them left orphaned rule_cards with no cleanup path at all (the cache would then
 * serve cards whose battery does not exist).
 *
 * THE FIX: one IMMEDIATE transaction over both writes. The per-writer BEGIN/COMMIT is bypassed by
 * writing the rows directly here — nesting a transaction is a SQLite error, so the combined path
 * owns the transaction and the individual writers stay for their standalone callers.
 */
export function writeCompiledCache(
  db: DbClient,
  battery: CompiledPredicate[],
  cards: RuleCard[],
  corpusHash: string,
): void {
  db.exec('BEGIN IMMEDIATE');
  let committed = false;
  const stmts: Array<ReturnType<DbClient['prepare']>> = [];
  try {
    const delCards = db.prepare('DELETE FROM rule_cards WHERE corpus_hash = ?');
    stmts.push(delCards);
    delCards.run(corpusHash);
    const insCard = db.prepare(
      'INSERT INTO rule_cards (quote,anchor,classification,severity,proposed,corpus_hash) VALUES (?,?,?,?,?,?)',
    );
    stmts.push(insCard);
    for (const c of cards) {
      insCard.run(c.verbatimQuote, c.anchor, c.classification, c.severity, c.proposed, corpusHash);
    }
    // ★ F-1204 FIX (2026-09-25): the cards above delete-then-insert per corpus_hash, but the
    // ★ battery only INSERT OR REPLACE-d by id — a recompile under the SAME battery_version
    // ★ with fewer/different ids orphaned the dropped rows (loadBattery reads by version, so
    // ★ orphans of the live version would ride the battery). Delete the incoming version first.
    // ★ Cross-version rows are unreachable by construction (version = sha(corpus+bindings);
    // ★ same version ⇒ same deterministic id set), so no wider eviction is attempted here.
    // ★ R15: evict by the authoritative corpusHash param, not battery[0] — a recompile to
    // empty skipped eviction (leaving stale rows); mixed-version batteries only evicted the
    // first version. Cross-check: every row must share corpusHash or the write is a bug.
    {
      const delBat = db.prepare('DELETE FROM compiled_predicates WHERE battery_version = ?');
      stmts.push(delBat);
      delBat.run(corpusHash);
      for (const p of battery) {
        if (p.batteryVersion !== corpusHash) {
          throw new LexiconError('VERSION_MISMATCH', `VERSION_MISMATCH: battery predicate ${p.id} has batteryVersion ${p.batteryVersion} != corpusHash ${corpusHash}`);
        }
      }
    }
    if (battery.length > 0) {
      const insBat = db.prepare(
        `INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      );
      stmts.push(insBat);
      for (const p of battery) {
        const checkCode = JSON.stringify({ template: p.template, bindings: p.bindings });
        insBat.run(p.id, p.family, p.template, JSON.stringify(p.bindings), p.verbatimQuote, p.anchor, p.severity, checkCode, p.batteryVersion, 'PENDING');
      }
    }
    db.exec('COMMIT');
    committed = true;
  } catch (e: unknown) {
    if (!committed) { try { db.exec('ROLLBACK'); } catch { /* already rolled back */ } }
    throw e;
  } finally {
    for (const st of stmts) { try { st.finalize(); } catch { /* best-effort — the txn outcome is what matters */ } }
  }
}

export function writeBattery(db: DbClient, battery: CompiledPredicate[]): void {
  // ★ W3-R17 FIX (2026-09-25, run-17 HIGH): STANDALONE EVICTION.
  //   Standalone writeBattery only INSERT OR REPLACE-d by id — a recompile whose id set
  //   changed (some ids added, some removed) left the dropped ids as orphans, and loadBattery
  //   reads by battery_version so the orphans rode the live battery. writeCompiledCache already
  //   owns the fix (delete-then-insert per version); this ports the SAME discipline here.
  //   Discipline notes (reuse of the writeCompiledCache contract, not a new pattern):
  //   (a) SCOPE IS THE VERSION ROWS THEMSELVES — the DELETE runs INSIDE this function's own
  //   BEGIN/COMMIT (same transaction as the inserts), exactly like writeCompiledCache's lines
  //   82-100, so no concurrent reader can observe an emptied-but-not-yet-reinserted version
  //   (a pre-BEGIN standalone DELETE would widen that window). There is no concurrent writer
  //   to protect within this surface: writeCompiledCache nests nothing and compileBattery is
  //   the sole live caller (grep-verified 2026-09-25: writeBattery( appears only here + the old
  //   two-call order in Checkpoints/ + audit JSON). Concurrent writes serialize on SQLite's
  //   write lock; the eviction deletes only the incoming version, never a foreign one.
  //   (b) VERSION SOURCE IS THE ROWS — no batteryVersion param was added (the suggested
  //   signature change would break compileBattery's sole call site + any external caller).
  //   Mixed-version input cannot name one authoritative version, so it is a loud
  //   LexiconError VERSION_MISMATCH — the same code writeCompiledCache throws — never a
  //   silent first-row pick.
  //   (c) EMPTY MEANS NOTHING TO EVICT — with no rows no version can be derived, so the
  //   function returns before BEGIN (unchanged). Callers needing to clear a version with
  //   zero rows must use writeCompiledCache with the explicit corpusHash, whose DELETE runs
  //   even for empty batteries.
  if (battery.length === 0) return;
  const version = battery[0]!.batteryVersion;
  for (const p of battery) {
    if (p.batteryVersion !== version) {
      throw new LexiconError('VERSION_MISMATCH', `VERSION_MISMATCH: writeBattery battery mixes versions ${version} vs ${p.batteryVersion} for predicate ${p.id} — refusing to evict-or-write (pass a single-version battery, or use writeCompiledCache with the explicit corpusHash)`);
    }
  }
  // ★ F-6 FIX (2026-09-24): atomic battery commit — BEGIN/COMMIT/ROLLBACK like
  // writeRuleCards below; a mid-loop failure rolls back instead of half-writing.
  db.exec('BEGIN');
  // ★ F-552 FIX (2026-09-24): the committed latch — COMMIT rides inside the inner try whose
  //   finally finalizes the statement; a finalize-time throw after a successful COMMIT used to
  //   reach the outer catch's unconditional ROLLBACK (a spurious ROLLBACK on a committed
  //   transaction). The catch rolls back ONLY while COMMIT has not succeeded. (writeRuleCards
  //   needs no latch: its COMMIT sits in the same try the catch guards and its finally's
  //   finalizes are THEMSELVES try/caught best-effort, so no finalize throw can reach a
  //   ROLLBACK — verified by reading lines 94-109, not assumed.)
  let committed = false;
  let stmt: ReturnType<DbClient['prepare']> | undefined;
  let del: ReturnType<DbClient['prepare']> | undefined;
  try {
  // ★ F-358 FIX (2026-09-24): finalize the prepared statements — bun:sqlite holds
  //   a native handle per prepare; a mid-loop/COMMIT throw leaked it. finally runs
  //   before the outer catch's ROLLBACK; finalize itself is best-effort.
  //   (F-823 shape: both handles are `| undefined` — prepare itself may throw before the
  //   second is allocated — so the finally guards before finalizing.)
  try {
  // F-1204 (standalone port): evict the incoming version's stale rows first — a recompile
  // under the SAME version with fewer/different ids deletes the dropped ids instead of
  // orphaning them (loadBattery reads by version). Same-transaction, same-version-only.
  del = db.prepare('DELETE FROM compiled_predicates WHERE battery_version = ?');
  del.run(version);
  stmt = db.prepare(
    `INSERT OR REPLACE INTO compiled_predicates (${COMPILED_PREDICATES_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  for (const p of battery) {
    const checkCode = JSON.stringify({ template: p.template, bindings: p.bindings });
    stmt.run(
      p.id,
      p.family,
      p.template,
      JSON.stringify(p.bindings),
      p.verbatimQuote,
      p.anchor,
      p.severity,
      checkCode,
      p.batteryVersion,
      'PENDING',
    );
  }
    db.exec('COMMIT');
    committed = true;
  } finally {
    try { stmt?.finalize(); } catch { /* already finalized or driver-closed — the ROLLBACK below is what matters */ }
    try { del?.finalize(); } catch { /* already finalized or driver-closed — the ROLLBACK below is what matters */ }
  }
  } catch (e: unknown) {
    if (!committed) db.exec('ROLLBACK');
    throw e;
  }
}

/**
 * The rule cards → W1's rule_cards table (db.ts:279-287), keyed by the corpus
 * hash (the cache surface the schema supports). IDEMPOTENT per corpus: the old
 * rows for the hash are deleted first, then the fresh rows insert — a recompile
 * replaces, never accumulates. The corpus_hash IS the battery_version (the
 * content hash of the corpus + the bindings).
 */
export function writeRuleCards(db: DbClient, cards: RuleCard[], corpusHash: string): void {
  db.exec('BEGIN');
  // ★ F-823 FIX (2026-09-24): both prepared statements MUST be created inside the try —
  //   if `del` succeeds but `ins` fails, `del` leaks a native handle (same class as F-358).
  //   Move both inside try; finally always cleans up whatever was allocated.
  let del: ReturnType<DbClient["prepare"]> | undefined;
  let ins: ReturnType<DbClient["prepare"]> | undefined;
  try {
    del = db.prepare('DELETE FROM rule_cards WHERE corpus_hash = ?');
    ins = db.prepare(
      'INSERT INTO rule_cards (quote,anchor,classification,severity,proposed,corpus_hash) VALUES (?,?,?,?,?,?)',
    );
    del.run(corpusHash);
    for (const c of cards) {
      ins.run(c.verbatimQuote, c.anchor, c.classification, c.severity, c.proposed, corpusHash);
    }
    db.exec('COMMIT');
  } catch (e: unknown) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    // ★ F-358 FIX (2026-09-24): finalize BOTH statements — same native-handle leak
    //   as writeBattery (the DELETE was an anonymous one-shot, never finalizable).
    // ★ F-823b FIX (2026-09-24): F-823 declared both as `| undefined` (they may not have been
    //   allocated when prepare itself throws) — so the finally must GUARD before finalizing.
    try { ins?.finalize(); } catch { /* best-effort — the ROLLBACK above is what matters */ }
    try { del?.finalize(); } catch { /* best-effort — the ROLLBACK above is what matters */ }
  }
}

/**
 * A fresh reader: the stored rows → the reinstated battery. The check is
 * reinstantiated from the template library + the stored params — the machine's
 * compiled battery persists compaction-inert (a fresh agent reads the rows,
 * never the reinjected corpus). A missing template or an unparseable row is the
 * loud named error, never a silently broken check.
 */
export function loadBattery(db: DbClient, batteryVersion: string): CompiledPredicate[] {
  // ★ F-703 FIX (2026-09-24): finalize the prepared statement — the old one-shot
  //   `.prepare(...).all(...)` discarded the Statement without finalize(), leaking
  //   one native handle per call (the F-358 class in writeBattery/writeRuleCards).
  const stmt = db.prepare(
    'SELECT id,family,template,bindings,verbatim_quote,anchor,severity,check_code,battery_version FROM compiled_predicates WHERE battery_version = ?',
  );
  try {
    const rows = stmt.all(batteryVersion);
    return rows.map((row) => rehydrate(row));
  } finally {
    try { stmt.finalize(); } catch { /* driver-closed — results already materialized */ }
  }
}

function rehydrate(row: Record<string, unknown>): CompiledPredicate {
  let bindings: Record<string, unknown>;
  let templateId: string;
  let bound: Record<string, unknown>;
  try {
    bindings = JSON.parse(String(row['bindings'] ?? '{}')) as Record<string, unknown>;
    // THE R16 TYPE_CERTAINTY GUARD — the parsed check_code is typeof-guarded
    // before the typed read of its template/bindings fields.
    const parsed = JSON.parse(String(row['check_code'] ?? '{}')) as unknown;
    const code: {
      template?: string; bindings?: Record<string, unknown>;
    } = parsed !== undefined && parsed !== null && typeof parsed === 'object'
      ? parsed as { template?: string; bindings?: Record<string, unknown> }
      : {};
    templateId = String(code['template'] ?? row['template'] ?? '');
    bound = code['bindings'] ?? bindings;
  } catch (e: unknown) {
    // v4.4.3 R10 FIX: log the original error before rethrowing — the raw
    // parse failure's context must survive the LexiconError wrap.
    console.error(`[compiled-store] BINDINGS_UNPARSEABLE id=${String(row['id'])}: ${e instanceof Error ? e.message : String(e)}`);
    throw new LexiconError(
      'BINDINGS_UNPARSEABLE',
      `BINDINGS_UNPARSEABLE: id=${String(row['id'])} detail=${String(e)}`,
    );
  }
  const template = TEMPLATE_LIBRARY[templateId];
  if (!template) throw templateMissing(templateId);
  return {
    id: String(row['id']),
    family: predicateFamilyFrom(row['family']),
    template: templateId,
    bindings: bound,
    verbatimQuote: String(row['verbatim_quote']),
    anchor: String(row['anchor']),
    severity: severityFrom(row['severity']),
    batteryVersion: String(row['battery_version']),
    check: (ctx: CheckContext) => template.check({ ...ctx, bindings: bound }),
  };
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the stored family string is narrowed
 *  by the literal-union check (no cast at all). */
function predicateFamilyFrom(v: unknown): PredicateFamily {
  if (v === 'WIRING' || v === 'CONTRACT' || v === 'PROVENANCE' || v === 'DOMAIN' || v === 'PROCESS') {
    return v;
  }
  return 'WIRING';
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the stored severity string is narrowed
 *  by the SEVERITIES membership check (the assertion is earned by the check). */
function severityFrom(v: unknown): Severity {
  if (typeof v === 'string' && (SEVERITIES as readonly string[]).includes(v)) {
    return v as Severity;
  }
  return 'MED';
}
