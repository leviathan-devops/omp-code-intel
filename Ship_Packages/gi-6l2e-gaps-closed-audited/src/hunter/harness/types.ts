// PORTED FROM the archived upstream skill tree/harness/* — the harness-local seam contracts.
// types.ts carries ONLY genuinely structural seams: shapes the harness itself
// defines (actor I/O, loop options/result, report-writer seam types) plus
// re-exports of the canonical ported symbols for one-import convenience.
// Everywhere a REAL ported symbol exists, the harness imports the real one:
//   profile types  -> ../profile/schema.ts (ProjectProfile)
//   loader         -> ../profile/loader.ts (loadProfile + named errors)
//   store          -> ../shared/db.ts (openStore/DbClient/appendEvent/...)
//   graph          -> ../graph/interface.ts (GraphAdapter/BuildResult/...)
//   lexicon        -> ../lexicon/templates.ts (CompiledPredicate/...)
//   findings       -> ../diagnostics/findings-store.ts (NormalizedFinding)
//   engine         -> ../diagnostics/engine.ts (dedupe/rankFindings/...)
//   log            -> ../log.ts (giLog)
// PENDING-INTEGRATION (next wave): the REAL store integration (DbClient already
// REAL — no shim); the surface/lsp-injector + tools/report-writer seams stay
// stubbed OUT of the port (report.ts writes the report file directly).

export type { ProjectProfile } from '../profile/schema.ts';
// ★ F-516 FIX (2026-09-24): GraphNode/GraphEdge are NOT re-exported from ../shared/db.ts here —
//   db.ts uses kind: string (loose) while ../graph/interface.ts uses the exact GraphNodeKind /
//   GraphEdgeKind unions (+ id/file/line on the edge). The barrel's canonical graph shapes come
//   from the interface block below; sourcing both silently defeated the graph layer's typing.
export type {
  DbClient,
  EventKind,
  EventPayload,
  FindingInput,
  FindingVerdict,
  ReportSectionInput,
  Severity,
  StatementLike,
} from '../shared/db.ts';
export type {
  AwaitEdge,
  BuildResult,
  CallSite,
  ChainStep,
  DeadNode,
  GraphAdapter,
  GraphEdgeKind,
  GraphNodeKind,
  ImportEdge,
  Lineage,
} from '../graph/interface.ts';
export type {
  CheckContext,
  CompiledPredicate,
  Finding as PredicateFinding,
} from '../lexicon/templates.ts';
export type { NormalizedFinding } from '../diagnostics/findings-store.ts';
export type { RunSummary } from '../diagnostics/engine.ts';

// ---------------------------------------------------------------------------
// Report-writer seam types (fork tools/report-writer.ts:183-289 — structural)
// The REAL W8 writer (network generation) is NOT ported; report.ts writes the
// report file directly. These shapes are the harness's own seam contract so
// tests can inject a deterministic writer without the network.
// ---------------------------------------------------------------------------

export interface ReportSectionRow {
  finding_id: string;
  how_broken: string;
  why_broken: string;
  what_violates: string;
  how_to_fix: string;
  what_to_do: string;
  why_works: string;
  run_id: string;
}

export interface ReportFinding {
  id: string;
  severity: 'CRIT' | 'HIGH' | 'MED' | 'WARN';
  rule: string;
  evidence: string;
}

export interface GraphSummary {
  label: string;
  detail: string;
}

export interface ReportWriterInput {
  projectRoot: string;
  runId: string;
  findings: ReportFinding[];
  sections: ReportSectionRow[];
  graphSummaries: GraphSummary[];
}

export interface ReportWriterResult {
  reportPath: string;
  version: number;
  bytes: number;
  findingsCount: number;
  chunks: number;
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Diagnostics-server seam (fork surface/lsp-injector.ts DiagnosticsServer —
// structural minimal: the harness only needs a refresh/loadState entry).
// The REAL W6 surface is another wave's port; the harness accepts any object
// with an optional refresh hook and never fabricates an LSP.
// ---------------------------------------------------------------------------

export interface DiagnosticsServerLike {
  refresh?(runId: string, findingsCount: number): void;
}

// ---------------------------------------------------------------------------
// RunState — the machine's workflow-state projection (the test-assert surface)
// ---------------------------------------------------------------------------

export interface RunState {
  runId: string;
  targetPath: string;
  profilePath: string;
  findingsCount: number;
  reportPath: string | null;
  error: string | null;
}
