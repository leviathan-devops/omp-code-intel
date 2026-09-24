// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/harness/report.ts:1-192.
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

/** THE DEFAULT DIRECT WRITER (the report-writer stub-out's replacement): render
 *  the deterministic markdown report from the findings + sections (no network,
 *  no model — the writer's generation contract is a future wave) and write it
 *  to the LOCKED MASTER_CONTEXT path with N-versioning (never overwrite). */
export async function writeReportDirect(input: ReportWriterInput): Promise<ReportWriterResult> {
  const masterContextDir = resolveMasterContextDir(input.projectRoot)
    ?? path.join(input.projectRoot, 'MASTER_CONTEXT');
  fs.mkdirSync(masterContextDir, { recursive: true });
  const version = nextReportVersion(masterContextDir);
  const reportPath = path.join(masterContextDir, `bug_hunter_report_v${version}.md`);

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
  const document = lines.join('\n');
  // ★ F-37 FIX (2026-09-24): exclusive create — a concurrent report that already
  //   landed this version no longer gets silently overwritten; the collision is a
  //   loud named error (hunts ride the hunt-lock, so this is pathological-only).
  try {
    fs.writeFileSync(reportPath, document, { encoding: 'utf-8', flag: 'wx' });
  } catch (e: unknown) {
    const code = (e !== null && typeof e === 'object' && 'code' in e) ? String((e as { code: unknown }).code) : '';
    if (code === 'EEXIST') throw new Error(`REPORT_VERSION_COLLISION: path=${reportPath} (another report landed v${version} concurrently — re-run the report actor)`);
    throw new Error(`REPORT_WRITE_FAILED: path=${reportPath} detail=${e instanceof Error ? e.message : String(e)}`);
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
      const raw = fs.readFileSync(writerResult.reportPath, 'utf-8');
      let stripped = raw.replace(/<think>[\s\S]*?<\/think>/g, '');
      const titleMatch = stripped.match(/^# .*$/m);
      if (titleMatch && titleMatch.index !== undefined && titleMatch.index > 0) {
        stripped = stripped.substring(titleMatch.index);
      }
      if (stripped !== raw) {
        fs.writeFileSync(writerResult.reportPath, stripped, 'utf-8');
        console.log('[report] thinking-strip applied — removed', raw.length - stripped.length, 'chars of meta-commentary');
      }
    } catch (stripErr: unknown) {
      console.warn('[report] thinking-strip failed (non-fatal):', stripErr instanceof Error ? stripErr.message : String(stripErr));
    }

    // ★ F-36 FIX (2026-09-24): the section rows commit only after the writer file
    //   landed — a writer failure now leaves zero DB writes (clean), and a later DB
    //   failure leaves at most an unpointed N-versioned file (benign, never overwrite).
    for (const s of sections) {
      appendReportSection(input.db, s, input.runId);
    }

    // 3. THE HUNT_DONE EVENT (the Hydra bus, spec §4.11:1692-1697 + §2.8:381 —
    //    the payload {runId, reportPath, findingsCount, batteryVersion}).
    appendEvent(input.db, 'HUNT_DONE', {
      runId: input.runId,
      reportPath: writerResult.reportPath,
      findingsCount: writerResult.findingsCount,
      batteryVersion: input.batteryVersion,
      fixOrder: input.fixOrder,
    });

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
          insertFact.run(f.file, 'has_finding', f.ruleId, String(f.evidence).slice(0, 500), 0.8, Date.now());
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
