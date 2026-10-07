// PORTED FROM the archived upstream skill tree/diagnostics/findings-store.ts — verbatim bytes; SEAM: db import rewritten to ../shared/db-canon.ts (the ported slice).
// the archived upstream skill tree/diagnostics/findings-store.ts
// THE APPEND-ONLY FINDINGS WRAPPER (W5, spec §3.10:1333 — the K4.3 store).
// The machine's single findings surface: the thin adapter over W1's
// appendFinding (db.ts:170), with the runId + week scoping, the MPSE evidence
// MANDATORY at the write boundary (O9.1 — a finding without a non-empty
// evidence string is rejected with FINDING_NO_TRIPLET), and the query surface
// for W6's violations verb + the LOGIC-LSP. The evidence law is enforced
// EXACTLY ONCE, here — an evidence-less finding is a loud named error naming
// the offending ruleId + the landed/remaining counts, NEVER a silent skip,
// never a half-swallowed batch.
//
// THE SHAPE (NormalizedFinding): the engine's normalized row — the W1
// FindingInput (db.ts:102) with the optional file/line/rangeStart/rangeEnd
// coerced to the deterministic string/number form the engine's dedupe + rank
// consume. The runId + the week NEVER ride the finding — they scope the append
// (appendFinding(finding, runId, week)), so the row set under a run is a pure
// function of the run's inputs (the determinism law K21.2: no timestamp or
// wall-clock value enters the findings the machine compares).
//
// THE ZERO-ADD RULE: this module imports ONLY W1's db.ts + the node/bun
// builtins — no new dependency, no package.json change.

import type { DbClient, FindingInput, FindingVerdict, Severity } from '../shared/db-canon.ts';
import { SEVERITIES } from '../shared/db-canon.ts';
import { findingNoTriplet } from '../shared/db-canon.ts';

// ---------------------------------------------------------------------------
// The normalized finding row — the engine's + the query surface's shape
// ---------------------------------------------------------------------------

/** The engine's normalized finding — the W1 FindingInput with the optional
 *  coordinates coerced to the deterministic form (file/line/rangeStart/
 *  rangeEnd are non-null; the evidence is non-empty by construction — the
 *  write boundary enforces the MPSE law). The runId/week scope the APPEND,
 *  never the row. */
export interface NormalizedFinding {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  rangeStart: number;
  rangeEnd: number;
  evidence: string;
  verdict: FindingVerdict;
}

/** NormalizedFinding → the W1 FindingInput shape (the store's contract). */
export function toFindingInput(f: NormalizedFinding): FindingInput {
  return {
    ruleId: f.ruleId,
    severity: f.severity,
    file: f.file,
    line: f.line,
    rangeStart: f.rangeStart,
    rangeEnd: f.rangeEnd,
    evidence: f.evidence,
    verdict: f.verdict,
  };
}

// ---------------------------------------------------------------------------
// THE WRITE SURFACE — the single evidence boundary
// ---------------------------------------------------------------------------

/**
 * Append ONE finding through W1's appendFinding, runId-scoped. The MPSE law
 * is enforced HERE first (a richer error naming the ruleId), then W1's own
 * appendFinding validates again at the schema (db.ts:416) — the two-layer
 * check keeps the write boundary the machine's single evidence gate.
 */
export function append(db: DbClient, finding: FindingInput, runId: string, week?: string | null): void {
  // ★ F-5 FIX (2026-09-24): an empty runId lands rows under '' — unqueryable and
  // ★ silently scoped to nothing. Fail LOUD at the write boundary instead.
  if (typeof runId !== 'string' || runId.trim() === '') {
    throw findingNoTriplet(`refusing append for finding ${finding.ruleId} with an empty runId — the run scope is mandatory (K21.2 determinism)`);
  }
  if (typeof finding.evidence !== 'string' || finding.evidence.trim() === '') {
    throw findingNoTriplet(
      `finding ${finding.ruleId} at ${finding.file ?? '?'}:${finding.line ?? '?'} carries an empty evidence string`,
    );
  }
  db.appendFinding(finding, runId, week);
}

export interface AppendFindingsResult {
  runId: string;
  week: string | null;
  appended: number;
}

/**
 * Append the run's findings in ORDER through W1's appendFinding — the runId +
 * the week scoping, the atomic-reportable rejection: an evidence-less finding
 * at index i throws FINDING_NO_TRIPLET naming the ruleId AND the landed/
 * remaining counts (landed=i, remaining=N-i of N) — the caller sees exactly
 * how far the batch got, never a swallowed row.
 */
  // ★ F-26 FIX (2026-09-24): the loop ran N autocommitted appends — a
  // ★ FINDING_NO_TRIPLET at index i left rows 0..i-1 landed with no atomicity.
  // ★ One transaction: all rows land or none do (the landed/remaining counts in
  // ★ the error name the batch position, the DB no longer keeps the prefix).
  export function appendFindings(
    db: DbClient,
    findings: NormalizedFinding[],
    runId: string,
    week?: string | null,
  ): AppendFindingsResult {
    // ★ F-5 FIX (2026-09-24): same empty-runId fail-loud as append() above.
    if (typeof runId !== 'string' || runId.trim() === '') {
      throw findingNoTriplet(`refusing appendFindings of ${findings.length} findings with an empty runId — the run scope is mandatory (K21.2 determinism)`);
    }
    // ★ R15H5 FIX (2026-09-25): preventable validation runs BEFORE BEGIN — an
    //   evidence-less finding is rejectable without a transaction, so it must not
    //   force a ROLLBACK; an empty batch returns without paying BEGIN/COMMIT.
    if (findings.length === 0) return { runId, week: week ?? null, appended: 0 };
    for (let i = 0; i < findings.length; i++) {
      const f = findings[i];
      if (typeof f.evidence !== 'string' || f.evidence.trim() === '') {
        throw findingNoTriplet(
          `finding ${f.ruleId} at ${f.file}:${f.line} carries an empty evidence string (landed=0 remaining=${findings.length} of ${findings.length})`,
        );
      }
    }
    // ★ R15H5 FIX (2026-09-25): BEGIN is non-reentrant — a caller already holding
    //   a transaction (SQLite: cannot start a transaction within a transaction)
    //   gets the NAMED error, never a raw driver throw. DbClient exposes no
    //   inTransaction probe, so nesting is refused loud, never detected.
    try {
      db.exec('BEGIN IMMEDIATE');
    } catch (e: unknown) {
      throw new Error(`FINDING_TX_BEGIN_FAILED: cannot open the appendFindings transaction — ${e instanceof Error ? e.message : String(e)} (appendFindings is non-reentrant; serialize hunts or commit the outer transaction first)`);
    }
    try {
      for (let i = 0; i < findings.length; i++) {
        const f = findings[i];
        if (typeof f.evidence !== 'string' || f.evidence.trim() === '') {
          throw findingNoTriplet(
            `finding ${f.ruleId} at ${f.file}:${f.line} carries an empty evidence string (landed=${i} remaining=${findings.length - i} of ${findings.length})`,
          );
        }
        db.appendFinding(toFindingInput(f), runId, week);
      }
      db.exec('COMMIT');
    } catch (e: unknown) {
      // ★ F-45 FIX (2026-09-24): a failed ROLLBACK is its own loud state — the
      // ★ caller must know the batch error AND that the tx may still be open.
      try { db.exec('ROLLBACK'); } catch (rb: unknown) {
        throw new Error(`FINDING_ROLLBACK_FAILED: batch error=${e instanceof Error ? e.message : String(e)} rollback error=${rb instanceof Error ? rb.message : String(rb)} (the transaction may still be open — do not reuse this handle for writes)`);
      }
      throw e;
    }
    return { runId, week: week ?? null, appended: findings.length };
  }

// ---------------------------------------------------------------------------
// THE READ SURFACE — the ledger queries
// ---------------------------------------------------------------------------

export interface QueryFindingsOptions {
  runId?: string;
  week?: string | null;
  ruleId?: string;
}

/**
 * The read surface for W6's violations verb + the LOGIC-LSP. Filters by
 * runId / week / ruleId; returns the rows DEDUPED (ruleId+file+line, the first
 * ledger row wins) in the append order (the INSERT id ASC — the ledger order).
 * An empty filter set returns the whole ledger — the caller scopes explicitly.
 */
export function queryFindings(
  db: DbClient,
  opts: QueryFindingsOptions = {},
): NormalizedFinding[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (opts.runId) {
    clauses.push('run_id = ?');
    params.push(opts.runId);
  }
  // ★ F-410 FIX (2026-09-24): nullish check — '' is a valid stored week value; the truthy
  //   test silently omitted it, returning a superset. Use != null to match append's week ?? null.
  if (opts.week != null) {
    clauses.push('week = ?');
    params.push(opts.week);
  }
  if (opts.ruleId) {
    clauses.push('rule_id = ?');
    params.push(opts.ruleId);
  }
  const where = clauses.length > 0 ? ` WHERE ${clauses.join(' AND ')}` : '';
  const rows = db.prepare(
    `SELECT run_id,rule_id,severity,file,line,range_start,range_end,evidence,verdict FROM findings${where} ORDER BY id ASC`,
  ).all(...params);

  const seen = new Set<string>();
  const out: NormalizedFinding[] = [];
  for (const row of rows) {
    const ruleId = String(row['rule_id']);
    const file = row['file'] == null ? '' : String(row['file']);
    const line = row['line'] == null ? 0 : Number(row['line']);
    // the K4.3 dedupe is RUN-SCOPED: (runId+ruleId+file+line) — the engine
    // dedupes within a run at the write; two runs reporting the same violation
    // at the same place are DIFFERENT ledger events (distinct runIds +
    // evidence) and are never collapsed here.
    // ★ F-305 FIX (2026-09-24): the '|' join collides — a ruleId/file containing '|'
    // ★ merges distinct rows (false dedupe drops a real finding). JSON-tuple encoding is
    // ★ injective over (runId, ruleId, file, line); engine.ts dedupe fixed identically (F-281).
    const key = JSON.stringify([String(row['run_id']), ruleId, file, line]);
    if (seen.has(key)) continue; // the within-run duplicate (ruleId+file+line) — the first ledger row wins
    seen.add(key);
    out.push({
      ruleId,
      severity: severityFromRow(row['severity']),
      file,
      line,
      rangeStart: row['range_start'] == null ? line : Number(row['range_start']),
      rangeEnd: row['range_end'] == null ? line : Number(row['range_end']),
      evidence: String(row['evidence']),
      verdict: verdictFromRow(row['verdict']),
    });
  }
  return out;
}


/** THE R16 TYPE_CERTAINTY GUARDED READ — the stored severity is narrowed by the
 *  SEVERITIES membership check. */
function severityFromRow(v: unknown): Severity {
  if (typeof v === 'string' && (SEVERITIES as readonly string[]).includes(v)) {
    return v as Severity;
  }
  // ★ F-46 FIX (2026-09-24): coercing corrupt rows to 'MED' masked storage bugs
  // ★ for every downstream consumer. Unknown severity is a loud fail.
  throw new Error(`FINDING_INVALID: severity=${String(v)} (expected one of ${SEVERITIES.join('|')} — the stored row is corrupt, refusing to coerce)`);
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the stored verdict is narrowed by the
 *  literal-union check. */
function verdictFromRow(v: unknown): FindingVerdict {
  if (v === 'VIOLATION' || v === 'PASS') {
    return v;
  }
  // ★ F-46 FIX (2026-09-24): same law for verdict — no silent 'PASS' laundering.
  throw new Error(`FINDING_INVALID: verdict=${String(v)} (expected VIOLATION|PASS — the stored row is corrupt, refusing to coerce)`);
}
