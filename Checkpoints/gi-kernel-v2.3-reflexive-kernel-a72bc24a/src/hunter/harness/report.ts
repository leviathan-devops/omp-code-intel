// PORTED FROM the archived upstream skill tree/harness/report.ts:1-192.
// SEAMS (per the port work order — "report.ts writes the report file directly"):
//   profile -> ../profile/schema.ts (REAL); db appendReportSection/appendEvent/
//   DbClient/ReportSectionInput -> ../shared/db.ts (REAL whole-fork-db port);
//   NormalizedFinding -> ../diagnostics/findings-store.ts (REAL);
//   findingIdOf/TraceRow -> ./trace.ts (this port); ReportWriterInput/
//   ReportWriterResult/ReportSectionRow -> ./types.ts (harness seam types).
// STUBBED OUT (named, pending next wave): surface/lsp-injector
// (loadStateFromFindings/DiagnosticsServer — the LOGIC-LSP refresh) and
// tools/report-writer (generateReport/resolveWriterApiKey — the W8 network
// generation). The report actor writes the LOCKED MASTER_CONTEXT path
// (<projectRoot>/MASTER_CONTEXT/bug_hunter_report_v<N>.md, N-versioned, never
// overwrite) directly via node:fs + records HUNT_DONE through the REAL store.
// The side-effects-precede-claims law is preserved: report file + HUNT_DONE
// commit BEFORE the return.
import fs from 'node:fs';
import { HAS_FINDING_PREDICATE } from '../shared/ontology.ts';
import path from 'node:path';
import type { ProjectProfile } from '../profile/schema.ts';
import type { DbClient, ReportSectionInput } from '../shared/db.ts';
import { appendReportSection, appendEvent } from '../shared/db.ts';
import type { NormalizedFinding } from '../diagnostics/findings-store.ts';
import type {
  DiagnosticsServerLike,
  GraphSummary,
  ReportFinding,
  ReportSectionRow,
  ReportWriterInput,
  ReportWriterResult,
} from './types.ts';
import { MASTER_CONTEXT_VARIANTS } from '../firewall/lexicon-types.ts';
import { findingIdOf, type TraceRow } from './trace.ts';

/** The report-writer seam — the W8 generateReport (the default direct writer
 *  below) or a test transport. The REAL machine calls the default direct
 *  writer; the tests inject a deterministic writer (never a network call). */
export type ReportWriter = (input: ReportWriterInput) => Promise<ReportWriterResult>;

/** The REPORT actor's input — everything the report needs to land. */
export interface ReportActorInput {
  profile: ProjectProfile;
  runId: string;
  findings: NormalizedFinding[];
  traces: TraceRow[];
  fixOrder: string[];
  batteryVersion: string;
  db: DbClient;
  writer: ReportWriter;
  server: DiagnosticsServerLike;
}

/** The REPORT actor's output — the landed report + the event. */
export interface ReportResult {
  reportPath: string;
  writerResult: ReportWriterResult;
  sectionsAppended: number;
}

/** Assemble the per-finding 6-part report_sections row (spec §4.1:1663-1673).
 *  Every column is DERIVED from the data — the finding's evidence + the trace's
 *  root cause + the rule quote + the fix target — never fabricated prose. The
 *  STORE row is the camelCase ReportSectionInput (W1's appendReportSection);
 *  the WRITER row is the snake_case ReportSectionRow (W8's contract). Both are
 *  built here so the writer's prompt carries the same 6-part truth. */
export function sectionFromFinding(
  f: NormalizedFinding,
  trace?: TraceRow,
): ReportSectionInput {
  const anchor = `${f.file}:${f.line}`;
  const mechanism = trace?.rootCause ?? `the ${f.ruleId} violation at ${anchor}`;
  return {
    findingId: findingIdOf(f),
    howBroken: mechanism,
    // ★ F-63 FIX (2026-09-24): howBroken and whyBroken both resolved to trace.rootCause
    //   (identical columns). whyBroken now names the predicate + anchor the cause fired
    //   through, so the two columns carry distinct truths.
    whyBroken: trace?.rootCause ? `the ${f.ruleId} predicate fired because ${trace.rootCause} (at ${anchor})` : `the ${f.ruleId} predicate fired on the evidence at ${anchor}`,
    whatViolates: f.evidence,
    howToFix: `resolve the ${f.ruleId} violation at ${anchor}`,
    whatToDo: `1. fix ${f.file}:${f.line} per the evidence; 2. re-run the battery to confirm the ${f.ruleId} predicate is silent`,
    whyWorks: `removing the violation restores the ${f.ruleId} contract (the predicate re-check passes on the corrected state)`,
  };
}

/** The store row (camelCase) → the writer row (snake_case — the W8 contract). */
export function toWriterSection(s: ReportSectionInput): ReportSectionRow {
  return {
    finding_id: s.findingId,
    how_broken: s.howBroken,
    why_broken: s.whyBroken,
    what_violates: s.whatViolates,
    how_to_fix: s.howToFix,
    what_to_do: s.whatToDo,
    why_works: s.whyWorks,
    run_id: '',
  };
}

/** Resolve the project's existing MASTER_CONTEXT variant (the D18 six-form
 *  matcher — the first existing variant wins; null when NONE exists → the
 *  CREATE path). Mirrors the fork report-writer's resolveMasterContextDir
 *  (tools/report-writer.ts:1016) without the writer's network surface. */
export function resolveMasterContextDir(projectRoot: string): string | null {
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(projectRoot);
  } catch {
    return null;
  }
  for (const form of MASTER_CONTEXT_VARIANTS) {
    if (entries.includes(form)) {
      return path.join(projectRoot, form);
    }
  }
  return null;
}

const REPORT_FILE_RE = /^bug_hunter_report_v(\d+)\.md$/;

function nextReportVersion(masterContextDir: string): number {
  let names: string[] = [];
  try {
    names = fs.readdirSync(masterContextDir);
  } catch {
    return 1;
  }
  const versions: number[] = [];
  for (const name of names) {
    const m = name.match(REPORT_FILE_RE);
    if (m) versions.push(Number(m[1]));
  }
  return versions.length === 0 ? 1 : Math.max(...versions) + 1;
}

// ★ F-246 NOTE (2026-09-24): NOT-A-BUG (sync fs) — the readdir/mkdir/writeFileSync
//   calls below run ONCE per hunt (N-version probe + single landed file), not per
//   row; the async boundary is the writer seam (injectable), not the syscall shape.
/** THE DEFAULT DIRECT WRITER (the report-writer stub-out's replacement): render
 *  the deterministic markdown report from the findings + sections (no network,
 *  no model — the writer's generation contract is a future wave) and write it
 *  to the LOCKED MASTER_CONTEXT path with N-versioning (never overwrite). */
export async function writeReportDirect(input: ReportWriterInput): Promise<ReportWriterResult> {
  const masterContextDir = resolveMasterContextDir(input.projectRoot)
    ?? path.join(input.projectRoot, 'MASTER_CONTEXT');
  fs.mkdirSync(masterContextDir, { recursive: true });
  let version = nextReportVersion(masterContextDir);
  let reportPath = path.join(masterContextDir, `bug_hunter_report_v${version}.md`);

  // ★ R19-HIGH FIX (2026-09-25): the body was built ONCE, with the INITIAL version,
  //   but the retry loop below may land at a DIFFERENT version — the file NAME said
  //   v(N+1) while the document's own header still said v(N). A report whose name and
  //   content disagree about which report it is. The body is now a function of the
  //   version actually written.
  const lines: string[] = [
    `# BUG-HUNT REPORT — v${version}`,
    '',
    `- runId: ${input.runId}`,
    `- findings: ${input.findings.length}`,
    `- sections: ${input.sections.length}`,
    ...(version > 1 ? [`- supersedes: bug_hunter_report_v${version - 1}.md (append-only, never overwrite)`] : []),
    '',
    '---',
    '',
    '## Findings',
    '',
  ];
  const findingRows: ReportFinding[] = input.findings;
  if (findingRows.length === 0) {
    lines.push('_No findings — the honest zero (the battery ran clean)._', '');
  }
  for (const f of findingRows) {
    lines.push(`### ${f.id} [${f.severity}]`, '', `rule: ${f.rule}`, '', 'evidence:', '', '```', f.evidence, '```', '');
  }
  lines.push('## Report sections (the 6-part contract)', '');
  for (const s of input.sections) {
    lines.push(
      `### ${s.finding_id}`, '',
      `how_broken: ${s.how_broken}`, '',
      `why_broken: ${s.why_broken}`, '',
      `what_violates: ${s.what_violates}`, '',
      `how_to_fix: ${s.how_to_fix}`, '',
      `what_to_do: ${s.what_to_do}`, '',
      `why_works: ${s.why_works}`, '',
    );
  }
  const graphRows: GraphSummary[] = input.graphSummaries;
  if (graphRows.length > 0) {
    lines.push('## Graph summaries', '');
    for (const g of graphRows) {
      lines.push(`- ${g.label} — ${g.detail}`);
    }
    lines.push('');
  }
  // ★ R21-CRITICAL FIX (2026-09-25): `document` must be `let` (the loop rebinds it per attempt).
  let document = lines.join('\n');
  // ★ F-37 FIX (2026-09-24): exclusive create — a concurrent report that already
  //   landed this version no longer gets silently overwritten; the collision is a
  //   loud named error (hunts ride the hunt-lock, so this is pathological-only).
  // ★ R15: bounded retry — two concurrent hunts probing the same max version both attempt
  // v(N+1); the loser retries instead of failing with REPORT_VERSION_COLLISION.
  // ★ R21-CRITICAL FIX (2026-09-25): a `document` built inside the loop was referenced AFTER it
  //   (line ~225 `Buffer.byteLength(document)`) — out of scope, and, had the loop EVER fallen
  //   through without the break, the function would have returned a success-shape referencing a
  //   file never written (the phantom-report class). Bind `document` OUTSIDE the loop and add an
  //   EXPLICIT post-loop guard: reaching the end without a success is a LOUD failure, never a
  //   success-shaped return.
  let wrote = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const retryVersion = nextReportVersion(masterContextDir);
    const retryPath = path.join(masterContextDir, `bug_hunter_report_v${retryVersion}.md`);
    try {
      // ★ R19-HIGH FIX (2026-09-25): `document` was built ONCE from the INITIAL
      //   version, but this loop can land at a DIFFERENT one — the file NAME said
      //   v(N+1) while the document's own header still said v(N): a report whose name
      //   and content disagree about which report it is. Only line 0 embeds the version,
      //   so regenerate it from the version THIS attempt writes.
      document = [`# BUG-HUNT REPORT — v${retryVersion}`, ...lines.slice(1)].join('\n');
      fs.writeFileSync(retryPath, document, { encoding: 'utf-8', flag: 'wx' });
      version = retryVersion;
      reportPath = retryPath;
      wrote = true;
      break;
    } catch (e: unknown) {
      const code = (e !== null && typeof e === 'object' && 'code' in e) ? String((e as { code: unknown }).code) : '';
      if (code === 'EEXIST' && attempt < 4) continue;
      throw new Error(`REPORT_WRITE_FAILED: path=${retryPath} detail=${e instanceof Error ? e.message : String(e)}`);
    }
  }
  // ★ R21-CRITICAL FIX (2026-09-25): the phantom-report guard — the loop exiting without a write
  //   is a LOUD failure, never a success-shaped return referencing a file that was never written.
  if (!wrote) {
    throw new Error(`REPORT_WRITE_FAILED: the retry loop exhausted without writing ${masterContextDir} — refusing to return a phantom reportPath`);
  }
  const bytes = Buffer.byteLength(document, 'utf-8');
  return {
    reportPath,
    version,
    bytes,
    findingsCount: findingRows.length,
    chunks: 1,
    truncated: false,
  };
}

/** THE REPORT ACTOR — the report rows + the writer + the HUNT_DONE event.
 *  The side effects commit BEFORE the return (the
 *  side-effects-precede-claims law). The LOGIC-LSP refresh seam (W6
 *  loadStateFromFindings) is stubbed OUT: when the injected server carries a
 *  refresh hook it is invoked best-effort AFTER the durable commits (never
 *  before, never blocking the return). */
export async function report(input: ReportActorInput): Promise<ReportResult> {
  try {
    // 1. THE REPORT_SECTIONS ROWS (built in-memory here; the DB commit rides step
    //    3, AFTER the writer file landed — ★ F-36 FIX 2026-09-24: committing here
    //    left sections without an event when the writer/appendEvent threw).
    //    The empty set for the honest-zero run (a clean project still reports).
    const sections: ReportSectionInput[] = [];
    for (const f of input.findings) {
      const trace = input.traces.find((t) => t.findingId === findingIdOf(f));
      sections.push(sectionFromFinding(f, trace));
    }

    // 2. THE WRITER CALL (direct file writer — the W8 network generation is a
    //    future wave; the LOCKED path + N-versioning contract is preserved).
    const writerResult = await input.writer({
      projectRoot: input.profile.project.root,
      runId: input.runId,
      findings: input.findings.map((f) => ({
        id: findingIdOf(f),
        severity: f.severity,
        rule: f.ruleId,
        evidence: f.evidence,
      })),
      sections: sections.map(toWriterSection).map((s) => ({ ...s, run_id: input.runId })),
      graphSummaries: input.findings.map((f) => ({
        label: `${f.ruleId} --violates→ ${f.file}:${f.line}`,
        detail: f.evidence,
      })),
    });

    // 2.5 THE THINKING STRIP (HT-BUG-19 — report v1 shipped ~600 lines of model
    //     deliberation prose inside the sealed artifact). After the writer writes
    //     the file, read it back and strip ALL meta-commentary: <think> blocks,
    //     everything before the first '# '-prefixed heading line. Then write back.
    try {
      // ★ W9-AUDIT CRITICAL FIX (2026-09-28): `writerResult.reportPath` is UNTRUSTED — the
      //   writer is an INJECTED transport (a test double today, a W8 network writer later). The
      //   read+rewrite below MUST stay inside the project's MASTER_CONTEXT dir. An out-of-tree
      //   path (`/etc/passwd`, `~/.ssh/*`) is refused LOUDLY — never read, never rewritten.
      const rpRoot = resolveMasterContextDir(input.profile.project.root);
      if (rpRoot !== null) {
        const rootAbs = path.resolve(rpRoot);
        const rpAbs = path.resolve(writerResult.reportPath);
        if (rpAbs !== rootAbs && !rpAbs.startsWith(rootAbs + path.sep)) {
          throw new Error(`REPORT_PATH_UNSAFE: writerResult.reportPath "${writerResult.reportPath}" escapes ${rpRoot} — refusing to read/rewrite an out-of-tree path`);
        }
      }
      const raw = fs.readFileSync(writerResult.reportPath, 'utf-8');
      let stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, '');
      const titleMatch = stripped.match(/^# .*$/m);
      if (titleMatch && titleMatch.index !== undefined && titleMatch.index > 0) {
        stripped = stripped.substring(titleMatch.index);
      }
      if (stripped !== raw) {
        // ★ F-551 FIX (2026-09-24): post-strip integrity gate — the strip runs BEFORE the
        //   HUNT_DONE commit below, and a strip that empties the artifact or a write that
        //   fails to round-trip throws REPORT_STRIP_FAILED instead of landing a corpse the
        //   DB then records as truth. The original file is left intact on the empty path.
        if (stripped.trim().length === 0) {
          throw new Error(`REPORT_STRIP_FAILED: the thinking-strip emptied ${writerResult.reportPath} (raw ${raw.length} chars) — leaving the original file intact; refusing to record HUNT_DONE on an empty artifact`);
        }
        fs.writeFileSync(writerResult.reportPath, stripped, 'utf-8');
        const sealed = fs.readFileSync(writerResult.reportPath, 'utf-8');
        if (sealed !== stripped) {
          throw new Error(`REPORT_STRIP_FAILED: read-back mismatch on ${writerResult.reportPath} (wrote ${stripped.length} chars, read ${sealed.length}) — refusing to record HUNT_DONE on an unverified artifact`);
        }
        console.log('[report] thinking-strip applied — removed', raw.length - stripped.length, 'chars of meta-commentary');
      }
    } catch (stripErr: unknown) {
      // ★ F-551 FIX: integrity failures are LOUD (they abort before HUNT_DONE); incidental
      //   I/O failures keep the existing non-fatal contract.
      if (stripErr instanceof Error && stripErr.message.startsWith('REPORT_STRIP_FAILED')) throw stripErr;
      console.warn('[report] thinking-strip failed (non-fatal):', stripErr instanceof Error ? stripErr.message : String(stripErr));
    }

    // ★ F-245 FIX (2026-09-24): the section rows + the HUNT_DONE event commit
    //   atomically — a mid-loop throw no longer leaves sections without an event.
    //   (The graph_facts memory wire below stays best-effort OUTSIDE the tx: it is
    //   cross-run memory, not the hunt's own truth. Rollback failure is its own loud
    //   state — the caller must know the batch error AND the tx may still be open.)
    // ★ R15: BEGIN inside the guarded region — a caller holding a transaction or a locked
    // DB throws REPORT_TX_BEGIN_FAILED instead of escaping with an indeterminate handle.
    try {
      input.db.exec('BEGIN IMMEDIATE');
    } catch (e: unknown) {
      throw new Error(`REPORT_TX_BEGIN_FAILED: ${e instanceof Error ? e.message : String(e)} (caller may already hold a transaction — use a savepoint or serialize hunts)`);
    }
    try {
      for (const s of sections) {
        appendReportSection(input.db, s, input.runId);
      }
      appendEvent(input.db, 'HUNT_DONE', {
        runId: input.runId,
        reportPath: writerResult.reportPath,
        findingsCount: writerResult.findingsCount,
        batteryVersion: input.batteryVersion,
        fixOrder: input.fixOrder,
      });
      // ★ F-337 FIX (2026-09-24): COMMIT rides INSIDE the try — a commit-time throw (disk-full, locked) now reaches the ROLLBACK below instead of escaping with the report file written and the tx indeterminate.
      input.db.exec('COMMIT');
    } catch (dbErr: unknown) {
      try { input.db.exec('ROLLBACK'); } catch (rbErr: unknown) {
        throw new Error(`REPORT_ROLLBACK_FAILED: batch error=${dbErr instanceof Error ? dbErr.message : String(dbErr)} rollback error=${rbErr instanceof Error ? rbErr.message : String(rbErr)} (the transaction may still be open — do not reuse this handle for writes)`);
      }
      throw dbErr;
    }

    // 3.5 THE CROSS-RUN MEMORY WIRE (GRAPH_GATE_DPL1_SPEC.md §22.5): the hunt's
    //     VIOLATION findings become graph_facts — the next hunt's substrate
    //     context and the LSP's institutional memory. The REAL graph_facts schema
    //     (migrations.ts:38): (id INTEGER PK, subject, predicate, object,
    //     evidence, confidence, created_at INTEGER, superseded_at) — the spec's
    //     draft INSERT predates the schema and is corrected here.
    try {
      const insertFact = input.db.prepare(
        'INSERT INTO graph_facts (subject, predicate, object, evidence, confidence, created_at) VALUES (?,?,?,?,?,?)',
      );
      for (const f of input.findings) {
        if (f.verdict === 'VIOLATION') {
          insertFact.run(f.file, HAS_FINDING_PREDICATE, f.ruleId, String(f.evidence).slice(0, 500), 0.8, Date.now());
        }
      }
    } catch (memErr: unknown) {
      // best-effort: the memory wire never breaks the report (the loud log, the
      // report itself already committed its rows and the HUNT_DONE event).
      console.warn('[report] the graph_facts memory wire failed (non-fatal):', memErr instanceof Error ? memErr.message : String(memErr));
    }

    // 4. THE LOGIC-LSP REFRESH (W6 — STUBBED OUT in this port): the injected
    //    server's refresh hook runs best-effort AFTER the durable commits.
    try {
      input.server.refresh?.(input.runId, input.findings.length);
    } catch (lspErr: unknown) {
      console.warn('[report] the diagnostics-server refresh failed (non-fatal):', lspErr instanceof Error ? lspErr.message : String(lspErr));
    }

    return {
      reportPath: writerResult.reportPath,
      writerResult,
      sectionsAppended: sections.length,
    };
  } catch (e: unknown) {
    console.warn(`[report] failed: ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}
