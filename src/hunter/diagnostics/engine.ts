// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/diagnostics/engine.ts — verbatim bytes; SEAM: shared/knowledge-graph imports rewritten to the ported siblings (../shared/db.ts, ../profile/*).
// src/subagents/trident-bug-hunter/diagnostics/engine.ts
// THE DIAGNOSTICS ENGINE (W5, spec §3.10 lines 1298-1376). THE BATTERY RUNNER:
// the W4 compiled battery × the W2 graph adapter + the source → the findings
// (the MPSE triplets), deterministic + idempotent, the runId-scoped append-only
// rows. The engine NEVER defines checks — it EXECUTES W4's decision layer (the
// predicate.check) and NORMALIZES the findings into W1's store shape. A
// template defect is a loud named error, never a silent skip.
//
// THE DETERMINISM LAW (K21.2): the engine is PURE over the reads — the same
// battery + the same graph + the same source bytes ALWAYS produce the identical
// findings (the JSON.stringify equality the §6.3 test asserts). The file mtimes
// are the ONLY non-determinism; the runId snapshots the reads' timestamps. The
// engine computes NO timestamps and NO wall-clock values internally — the spec's
// `f.week = currentWeek()` would inject a time-dependent value into a
// determinism-gated surface, so the week rides the STORE APPEND (the caller
// supplies it to runBattery), never the row set the machine compares.
//
// THE SEVERITY CANON (D23): every row's severity is the predicate's bound
// severity (CRIT|HIGH|MED|WARN — validated against W1's SEVERITIES) — the
// engine respects the canon at every row, it never invents a severity.
//
// THE FAIL-CLOSED LAW: a predicate that throws mid-check aborts the run with
// the named FINDING_CHECK_FAILED (atomic per predicate, never a silent skip);
// an EMPTY GRAPH is the loud ENGINE_GRAPH_EMPTY (a scan over zero nodes is an
// error state, NEVER a silent zero); an EMPTY BATTERY is the VALID honest zero
// (a clean project's zero-rule corpus) — the two states are distinguished by
// measurement, never conflated. An evidence-less finding is FINDING_NO_TRIPLET
// (O9.1 — no triplet = no finding); an out-of-canon severity/verdict is
// FINDING_INVALID.
//
// THE RANKING (K21.3): severityScore(severity) × history-frequency(ruleId) —
// the frequency is the ruleId's violation count across the profile's failure
// logs, bounded 1..3 (the cap keeps a 30-violation rule from swamping every
// CRIT while keeping the history weight meaningful). severityScore: CRIT 4,
// HIGH 3, MED 2, WARN 1 (D23).
//
// THE ZERO-ADD RULE: the engine imports ONLY the existing modules (db.ts,
// profile-schema.ts, templates.ts type-only, graph/interface.ts type-only,
// findings-store.ts) + the node builtins — no new dependency.

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type {DbClient, Severity} from '../shared/db.ts';
import { FINDING_VERDICTS, SEVERITIES, findingInvalid, findingNoTriplet, openStore } from '../shared/db.ts';
import type { ProjectProfile } from '../profile/schema.ts';
import { loadProfile } from '../profile/loader.ts';
import type { AwaitEdge, BuildResult, CallSite, ChainStep, DeadNode, GraphAdapter, GraphEdge, GraphNode, GraphNodeKind, ImportEdge } from '../graph/interface.ts';
import type { CheckContext, CompiledPredicate, Finding } from '../lexicon/templates.ts';
import { appendFindings, type NormalizedFinding } from './findings-store.ts';
import { buildSemanticBattery } from './semantic-predicates.ts';

// ---------------------------------------------------------------------------
// The named-error vocabulary (O32.1) — the engine's loud fail-state contract
// ---------------------------------------------------------------------------

/** The base engine error: every failure NAMES its code in the message. */
// calib: 4 — the CRIT severity rank (the diagnostics engine's ladder top)
const SEVERITY_RANK_CRIT = 4;

export class EngineError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = code;
    this.code = code;
  }
}

/** ENGINE_GRAPH_EMPTY — the engine refuses to scan zero nodes. A LOUD fail
 *  (never a silent zero); the empty BATTERY is the valid zero — the two states
 *  are distinguished by measurement, never conflated. */
export function engineGraphEmpty(detail: string): EngineError {
  return new EngineError(
    'ENGINE_GRAPH_EMPTY',
    `ENGINE_GRAPH_EMPTY: detail=${detail} (a scan over an empty graph is a loud fail — the engine refuses to run on zero nodes, never a silent zero)`,
  );
}

/** FINDING_CHECK_FAILED — a predicate threw mid-check. The run is atomic per
 *  predicate: the throwing predicate names itself, the healthy battery's rows
 *  are unaffected (they were already collected). */
export function findingCheckFailed(predicateId: string, detail: string): EngineError {
  return new EngineError(
    'FINDING_CHECK_FAILED',
    `FINDING_CHECK_FAILED: predicateId=${predicateId} detail=${detail} (a predicate that throws mid-check aborts the run — atomic per predicate, never a silent skip)`,
  );
}

/** SOURCE_READ_FAILED — the lockdown source read could not read a path. The
 *  engine's source reads are the ONLY I/O surface — an unreadable source is a
 *  loud named fail, never an empty read. */
export function sourceReadFailed(p: string, detail: string): EngineError {
  return new EngineError(
    'SOURCE_READ_FAILED',
    `SOURCE_READ_FAILED: path=${p} detail=${detail} (the engine's source reads are the lockdown surface — an unreadable source is a loud fail, never an empty read)`,
  );
}

/** HISTORY_LOG_UNREADABLE — the ranking's history-frequency read failed. The
 *  frequency is part of the engine's determinism — an unreadable log is a loud
 *  fail, never a silent skip. */
export function historyLogUnreadable(p: string, detail: string): EngineError {
  return new EngineError(
    'HISTORY_LOG_UNREADABLE',
    `HISTORY_LOG_UNREADABLE: path=${p} detail=${detail} (the ranking's history reads are part of the engine's determinism — an unreadable log is a loud fail, never a silent skip)`,
  );
}

// ---------------------------------------------------------------------------
// The run surface
// ---------------------------------------------------------------------------

  // ★ F-34 FIX (2026-09-24): the old body caught the lockdown read's loud
  // ★ SOURCE_READ_FAILED and downgraded it to console.error+continue — a file the
  // ★ graph anchors silently vanished from the map, and every predicate read an
  // ★ incomplete scope as if it were whole. Per this file's own fail-closed law
  // ★ (an unreadable source is a loud named fail, never an empty read), the
  // ★ failures are collected and thrown as one named SOURCE_READ_FAILED.
  export function buildFileContentMap(nodes: GraphNode[], source: { read(file: string, range?: [number, number]): string }): Map<string, string> {
    const map = new Map<string, string>();
    const uniq = new Set<string>();
    for (const n of nodes) if (n.file) uniq.add(n.file);
    const failed: string[] = [];
    for (const file of uniq) {
      try {
        map.set(file, source.read(file));
      } catch (e: unknown) {
        failed.push(`${file}: ${String(e)}`);
      }
    }
    if (failed.length > 0) {
      throw sourceReadFailed(failed.join('; '), 'buildFileContentMap refuses a partial scope — every anchored file must read');
    }
    return map;
  }

/** The engine's run context — the graph adapter + the lockdown source read.
 *  The bindings ride the per-predicate compile (the engine injects each
 *  predicate's validated bindings into the CheckContext it builds). */
export interface EngineRunContext {
  graph: GraphAdapter;
  source: { read(file: string, range?: [number, number]): string };
  contentMap?: Map<string, string>;
}

/** The deterministic core (spec §6.3's `engine.run`): execute the battery over
 *  the supplied context, validate the MPSE evidence + the severity/verdict
 *  canons, and normalize every finding to the store shape. Pure over the reads
 *  — the same battery + the same context ALWAYS yield the identical findings
 *  (the JSON.stringify equality). NO dedupe (the run-level dedupe lives in
 *  runBattery per §3.10), NO ranking (K21.3 also lives in runBattery), NO store
 *  I/O — the caller decides where the rows land. */
export function run(battery: CompiledPredicate[], ctx: EngineRunContext): NormalizedFinding[] {
  if (ctx.graph.nodes().length === 0) {
    throw engineGraphEmpty('the graph adapter reported zero nodes');
  }
  const contentMap = ctx.contentMap ?? buildFileContentMap(ctx.graph.nodes(), ctx.source);
  const normalized: NormalizedFinding[] = [];
  for (const predicate of battery) {
    if (!SEVERITIES.includes(predicate.severity)) {
      throw findingInvalid('severity', predicate.severity);
    }
    const checkCtx: CheckContext = { graph: ctx.graph, source: ctx.source, bindings: predicate.bindings, contentMap };
    let found: Finding[];
    try {
      found = predicate.check(checkCtx);
    } catch (e: unknown) {
      throw findingCheckFailed(predicate.id, String((e as Error)?.message ?? e));
    }
    for (const f of found) {
      // O9.1 — no triplet = no finding, enforced AT THE ENGINE (a template that
      // emits an evidence-less finding is a TEMPLATE DEFECT — loud, never
      // swallowed, never logged-and-continued; the store re-checks at the write).
      if (typeof f.evidence !== 'string' || f.evidence.trim() === '') {
        throw findingNoTriplet(
          `predicate ${predicate.id} emitted a finding at ${f.file}:${f.line} with an empty evidence string`,
        );
      }
      if (!FINDING_VERDICTS.includes(f.verdict)) {
        throw findingInvalid('verdict', f.verdict);
      }
      // the range defaults to [line, line] when the template omitted it (§3.10)
      const range = f.range ?? [f.line, f.line];
      // the spec's normalization (K21): the ruleId + the severity are the
      // PREDICATE's, never the template's — the finding's ruleId/severity are
      // the compiled row's identity (the D23 canon respected at every row).
      normalized.push({
        ruleId: predicate.id,
        severity: predicate.severity,
        file: f.file,
        line: f.line,
        rangeStart: range[0],
        rangeEnd: range[1],
        evidence: f.evidence,
        verdict: f.verdict,
      });
    }
  }
  return normalized;
}

/** The §6.3 surface — the `engine.run(battery, ctx)` form the spec's tests use. */
export const engine = { run };

// ---------------------------------------------------------------------------
// The dedupe + the ranking (spec §3.10 — the run-level determinism helpers)
// ---------------------------------------------------------------------------

/** The K4.3 dedupe — ruleId+file+line within a run; the first occurrence wins,
 *  the later duplicates collapse. A same-line double violation IS one finding
 *  by design (§3.10 failure modes). */
export function dedupe(findings: NormalizedFinding[]): NormalizedFinding[] {
  const seen = new Set<string>();
  const out: NormalizedFinding[] = [];
  for (const f of findings) {
    // ★ F-281 FIX (2026-09-24): the '|' join collides — ruleId/file containing '|'
    // ★ merges distinct rows (false dedupe drops a real finding). JSON-tuple key
    // ★ is injective over (ruleId, file, line); findings-store.ts:185 fixed identically.
    const key = JSON.stringify([f.ruleId, f.file, f.line]);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

/** severityScore — CRIT 4, HIGH 3, MED 2, WARN 1 (the D23 canon). */
export function severityScore(s: Severity): number {
  // ★ F-701 FIX (2026-09-24): the default arm silently ranked an out-of-canon severity
  // ★ as WARN (1) — a validate-but-not-verify hole: this fn is exported, so a future
  // ★ caller passing garbage gets a plausible rank instead of a loud fail, contradicting
  // ★ this file's fail-closed law (out-of-canon severity = FINDING_INVALID). Throw loud.
  switch (s) {
    case 'CRIT': return SEVERITY_RANK_CRIT;
    case 'HIGH': return 3;
    case 'MED': return 2;
    case 'WARN': return 1;
    default: throw findingInvalid('severity', s);
  }
}

/** The K21.3 history-frequency: the ruleId's violation count across the
 *  profile's failure logs, bounded 1..3. An unreadable log is the loud
 *  HISTORY_LOG_UNREADABLE — the frequency is part of the engine's determinism. */
function violationFrequencies(profile: ProjectProfile, ruleIds: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of ruleIds) counts.set(id, 0);
  const rootReal = fs.realpathSync(profile.project.root);
  // ★ F-244 FIX (2026-09-24): rootReal + path.sep is '//' when rootReal is '/',
  // ★ so parentReal.startsWith('//') never matches and every nested file under a
  // ★ filesystem-root project is rejected (fail-closed but wrong). The '/' root
  // ★ contains every absolute path — normalize the prefix for it.
  const rootPrefix = rootReal === path.sep ? path.sep : rootReal + path.sep;
  const containedIn = (parentReal: string): boolean => parentReal === rootReal || parentReal.startsWith(rootPrefix);
   for (const logPath of profile.history.failureLogs) {
     // ★ F-3 FIX (2026-09-24): `path.resolve(root, logPath)` lets `../` escape the
     // ★ project root (arbitrary-file read via profile history). Resolve, realpath the
     // ★ parent (file may not exist — realpath the dir), and require containment.
     const abs = path.resolve(profile.project.root, logPath);
     // ★ F-302 FIX (2026-09-24): the same symlink-following hole as F-301 — the parent
     //   resolves contained but the FILE may be a link out of the tree. Resolve both.
     const parentReal = fs.realpathSync(path.dirname(abs));
     if (!containedIn(parentReal)) throw historyLogUnreadable(abs, `path escapes project root (root=${rootReal} parent=${parentReal})`);
     let logReal = abs;
     try { logReal = fs.realpathSync(abs); } catch { /* the read below reports a missing log loud */ }
     if (!containedIn(logReal)) throw historyLogUnreadable(abs, `symlink escapes project root (root=${rootReal} file=${logReal})`);
    let text: string;
    try {
      // ★ F-550 FIX (2026-09-24): READ THE RESOLVED PATH. The containment above validated
      //   logReal (symlink-following) but the read used abs — the same TOCTOU F-441 closed
      //   in lockdownReadSource: the check passes on one inode, the read opens another.
      text = fs.readFileSync(logReal, 'utf8');
    } catch (e: unknown) {
      throw historyLogUnreadable(abs, String(e));
    }
    for (const id of ruleIds) {
      const occurrences = text.split(id).length - 1;
      counts.set(id, (counts.get(id) ?? 0) + occurrences);
    }
  }
  return counts;
}

/** The K21.3 ranking: severityScore × history-frequency, the higher first. The
 *  frequency is bounded 1..3 (the cap keeps the history weight meaningful but
 *  not dominant — an unbounded frequency would let a 30-violation rule swamp
 *  every CRIT). Deterministic: the same findings + the same profile → the same
 *  order. */
export function rankFindings(findings: NormalizedFinding[], profile: ProjectProfile): NormalizedFinding[] {
  const ruleIds = [...new Set(findings.map((f) => f.ruleId))];
  const freq = violationFrequencies(profile, ruleIds);
  const bounded = (id: string): number => {
    const raw = freq.get(id) ?? 0;
    return raw > 0 ? Math.min(3, raw) : 1;
  };
  return [...findings].sort((a, b) => {
    const sa = severityScore(a.severity) * bounded(a.ruleId);
    const sb = severityScore(b.severity) * bounded(b.ruleId);
    if (sa === sb) return 0;
    return sa > sb ? -1 : 1;
  });
}

// ---------------------------------------------------------------------------
// THE RUN SUMMARY — the §3.10 full pipeline
// ---------------------------------------------------------------------------

/** The lockdown source read — bound to the profile's project root, a line
 *  range read when a range is supplied ([start, end], 1-indexed inclusive).
 *  Deterministic over the file BYTES (the mtime never enters the read — the
 *  K21.2 pure-over-the-reads law); an unreadable source is the loud
 *  SOURCE_READ_FAILED. */
export function lockdownReadSource(profile: ProjectProfile): { read(file: string, range?: [number, number]): string } {
  const rootReal = fs.realpathSync(profile.project.root);
  return {
    read(file: string, range?: [number, number]): string {
      // ★ F-3 FIX (2026-09-24): same containment gate on the source read — a
      // ★ predicate-supplied `file` with `../` must not read outside the root.
      const abs = path.resolve(profile.project.root, file);
      // ★ F-301 FIX (2026-09-24): the SYMLINK-FOLLOWING hole. F-3 resolved only the
      //   PARENT dir — a symlink planted at `<root>/link.ts` -> /etc/passwd passed it
      //   (dirname is the root) while readFileSync followed the link out of the tree.
      //   Resolve the FILE too when it exists and require containment on BOTH: the
      //   file's real path (symlink-following) and the parent's (creation-path).
      const rootPrefix = rootReal === path.sep ? path.sep : rootReal + path.sep;
      const inside = (q: string): boolean => q === rootReal || q.startsWith(rootPrefix);
      const parentReal = fs.realpathSync(path.dirname(abs));
      if (!inside(parentReal)) throw sourceReadFailed(abs, `path escapes project root (root=${rootReal} parent=${parentReal})`);
      let fileReal = abs;
      try { fileReal = fs.realpathSync(abs); } catch { /* the file may not exist yet — the read below reports it loud */ }
      if (!inside(fileReal)) throw sourceReadFailed(abs, `symlink escapes project root (root=${rootReal} file=${fileReal})`);
      let text: string;
      try {
        // ★ F-441 FIX (2026-09-24): READ THE RESOLVED PATH. The containment above resolved
        //   `fileReal` (symlink-following) but the read then used `abs` — the ORIGINAL
        //   spelling. Between the realpath and the read, `abs` can be swapped for a
        //   symlink out of the tree (a classic TOCTOU): the check passes on one inode and
        //   the read opens another. `fileReal` is the path the check actually validated.
        text = fs.readFileSync(fileReal, 'utf8');
      } catch (e: unknown) {
        throw sourceReadFailed(abs, String(e));
      }
      if (!range) return text;
      const lines = text.split('\n');
      const start = Math.max(1, range[0]);
      const end = Math.min(lines.length, range[1]);
      if (start > end) return '';
      return lines.slice(start - 1, end).join('\n');
    },
  };
}

/** The run summary — the exported surface of the §3.10 pipeline: the runId,
 *  the findings (deduped + ranked), the pre-dedupe count, the deduped count,
 *  the predicates executed. */
export interface RunSummary {
  runId: string;
  findings: NormalizedFinding[];
  findingsCount: number;      // pre-dedupe (the raw collection)
  dedupedCount: number;       // post-dedupe (the rows that land)
  predicatesExecuted: number;
}

/**
 * THE BATTERY RUNNER (spec §3.10). runBattery(battery, graph, profile, runId):
 * the compiled battery over the graph adapter + the profile's lockdown source
 * → the runId-scoped findings. Deterministic + idempotent: the same battery +
 * the same graph + the same source bytes → the identical findings; a second
 * run with a NEW runId lands its OWN rows (through W1's appendFinding via the
 * findings-store) without touching the first run's rows. The db is optional —
 * when absent, the pure run (the determinism surface); when present, every
 * deduped+ranked row appends under the runId with the optional week.
 */
export function runBattery(
  battery: CompiledPredicate[],
  graph: GraphAdapter,
  profile: ProjectProfile,
  runId: string,
  db?: DbClient,
  week?: string | null,
): RunSummary {
  const semantic = buildSemanticBattery();
  const fullBattery = [...battery, ...semantic];
  const source = lockdownReadSource(profile);
  const contentMap = buildFileContentMap(graph.nodes(), source);
  const ctx: EngineRunContext = { graph, source, contentMap };
  const raw = run(fullBattery, ctx);
  const deduped = dedupe(raw);
  const ranked = rankFindings(deduped, profile);
  if (db) {
    appendFindings(db, ranked, runId, week);
  }
  const summary: RunSummary = {
    runId,
    findings: ranked,
    findingsCount: raw.length,
    dedupedCount: ranked.length,
    predicatesExecuted: fullBattery.length,
  };
  // ★ F-42 FIX (2026-09-24): changed/rerun were the SAME ruleId set — the equality
  // ★ arm passed by construction. runBattery always runs the FULL battery over the
  // ★ FULL node set (no incremental path exists), so both legs are honestly the
  // ★ node-id universe: the check now asserts full coverage, not set self-equality.
  const nodeIds = new Set(graph.nodes().map((n) => n.id));
  assertNoBlindness({
    graphNodesBefore: nodeIds.size,
    graphNodesAfter: graph.nodes().length,
    changedNodeIds: new Set(nodeIds),
    rerunNodeIds: new Set(nodeIds),
    runResult: ranked,
  });
  return summary;
}

// ---------------------------------------------------------------------------
// THE GRAPH-LOGIC DIAGNOSTICS ENTRY (ST-12, spec §9.2/§13). runGraphLogicDiagnostics
// ({targetPath, profilePath}) → the semantic battery × the STORED graph → findings.
// THE REUSE LAW (the vanishing control's mechanism): when the target's shared.db
// already holds a graph (graph_nodes non-empty), the run reads the STORED rows
// (never rebuilds) — DELETE FROM graph_edges is therefore OBSERVED (the next run's
// anchors resolve over zero edges → zero semantic findings). When the store is
// absent/empty, the run builds via the local AST walk below and persists the rows.
// THE PROFILE REQUIREMENT: the profile.yaml must load via loadProfile (a full
// valid profile declaring substrate corbell or ix). A profile that fails to
// load FAILS LOUDLY — no synthesized substitute is ever constructed (the
// operator ruling 2026-09-07: NO FALLBACKS — LOUD FAIL OR CLEAR PASS).
// ---------------------------------------------------------------------------

/** A GraphAdapter over explicit node/edge rows (the stored graph or the local
 *  build — the same read surface either way, so the predicates cannot tell a
 *  reused store from a fresh build; only the ROWS differ, which is the control). */
export class StoreGraphAdapter implements GraphAdapter {
  private readonly nodeById = new Map<string, GraphNode>();
  constructor(
    private readonly rows: GraphNode[],
    private readonly links: GraphEdge[],
  ) {
    for (const n of rows) if (!this.nodeById.has(n.id)) this.nodeById.set(n.id, n);
  }
  async build(_profile: ProjectProfile): Promise<BuildResult> {
    const nodes = [...this.nodeById.values()];
    return {
      nodes,
      edges: [...this.links],
      durationMs: 0,
      adapter: 'corbell',
      lineage: {
        spec: nodes.filter((n) => n.lineage === 'SPEC_DERIVED').length,
        code: nodes.filter((n) => n.lineage === 'CODE_DERIVED').length,
        hybrid: nodes.filter((n) => n.lineage === 'HYBRID').length,
      },
      command: 'store-reuse (the ST-12 read path — rows from shared.db or the local AST build)',
    };
  }
  private resolveTarget(symbol: string): string {
    // THE ID-SCHEME RESOLUTION (the adapter parity — the store-reuse path's
    // own id vocabulary: method:<name> preferred, fn:<name> the fallback)
    if (this.nodeById.has(`method:${symbol}`)) return `method:${symbol}`;
    return `fn:${symbol}`;
  }
  whoCalls(symbol: string): CallSite[] {
    const target = this.resolveTarget(symbol);
    return this.links
      // THE STORE-REUSE CHAIN FILTER (the corbell-parity mirror): calls+awaits
      // inbound to the resolved target — the read path's own edge vocabulary
      .filter((e) => (e.kind === 'calls' || e.kind === 'awaits') && e.targetId === target)
      .map((e) => {
        const caller = this.nodeById.get(e.sourceId);
        return { file: caller?.file ?? e.file ?? '', line: e.line ?? caller?.line ?? 0, caller: caller?.name ?? e.sourceId };
      });
  }
  chain(id: string): ChainStep[] {
    const start = id.startsWith('fn:') || id.startsWith('file:') || id.startsWith('class:') || id.startsWith('method:') ? id : `fn:${id}`;
    const steps: ChainStep[] = [];
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const from = queue.shift() as string;
      for (const e of this.links.filter((x) => (x.kind === 'calls' || x.kind === 'awaits') && x.sourceId === from)) {
        // the node-fallback resolution (the corbell nodeById mirror): the edge's
      // file/line ride the source node when the edge carries none
      steps.push({ from, to: e.targetId, kind: e.kind, file: e.file ?? this.nodeById.get(e.sourceId)?.file ?? '', line: e.line ?? 0 });
        if (!seen.has(e.targetId)) {
          seen.add(e.targetId);
          queue.push(e.targetId);
        }
      }
    }
    return steps;
  }
  imports(module: string): ImportEdge[] {
    const start = module.startsWith('file:') || module.startsWith('fn:') || module.startsWith('class:') || module.startsWith('method:') ? module : `file:${module}`;
    return this.links
      .filter((e) => e.kind === 'imports' && e.sourceId === start)
      // the node-fallback resolution (the corbell nodeById mirror, the awaits twin)
      .map((e) => ({ from: e.sourceId, to: e.targetId, file: e.file ?? this.nodeById.get(e.sourceId)?.file ?? '', line: e.line ?? 0 }));
  }
  awaits(symbol: string): AwaitEdge[] {
    // THE STORE-REUSE PATH (the corbell-parity mirror): the resolve-then-filter
    // form against the store's id scheme — this adapter reads shared.db rows
    // (the ST-12 read path), it does not exec a binary.
    const start = this.resolveTarget(symbol);
    return this.links
      .filter((e) => e.kind === 'awaits' && e.sourceId === start)
      .map((e) => ({ from: e.sourceId, to: e.targetId, file: e.file ?? '', line: e.line ?? 0 }));
  }
  unwired(): DeadNode[] {
    const targets = new Set(this.links.filter((e) => e.kind === 'calls').map((e) => e.targetId));
    return [...this.nodeById.values()]
      .filter((n) => (n.kind === 'function' || n.kind === 'method' || n.kind === 'class') && !targets.has(n.id))
      .map((n) => ({ id: n.id, name: n.name, file: n.file ?? '', line: n.line ?? 0 }));
  }
  nodes(kind?: GraphNodeKind): GraphNode[] {
    const all = [...this.nodeById.values()];
    return kind === undefined ? all : all.filter((n) => n.kind === kind);
  }
}

const LOCAL_BUILD_SKIPS = new Set(['node_modules', '.trident', 'dist', 'Checkpoints', '.git']);

/** Collect the .ts sources under root (the skip set is the walker-exclude canon). */
function collectLocalTsFiles(root: string): string[] {
  const out: string[] = [];
  // ★ F-802 FIX (2026-09-24, run-11): SYMLINK-CYCLE protection. `e.isDirectory()` is TRUE for a
  //   symlink-to-directory, so a link pointing at an ancestor (or at the root itself) recursed
  //   forever until the stack blew. The walk tracks the REALPATH of every directory it enters
  //   and refuses to re-enter one — a cycle terminates LOUD (named), never as a stack overflow.
  const visitedDirs = new Set<string>();
  const walk = (dir: string): void => {
    let realDir: string;
    try { realDir = fs.realpathSync(dir); } catch { realDir = dir; }
    if (visitedDirs.has(realDir)) {
      throw sourceReadFailed(dir, `symlink cycle: ${dir} resolves to ${realDir}, already visited — refusing to recurse forever`);
    }
    visitedDirs.add(realDir);
    let entries: import('node:fs').Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e: unknown) {
      // ★ F-243 FIX (2026-09-24): the old body did console.error+return here —
      // ★ an unreadable subdir silently vanished from the scope while this file's
      // ★ own fail-closed law (line 14: unreadable source is a LOUD named fail,
      // ★ never an empty read) demands SOURCE_READ_FAILED. Fail-closed like the
      // ★ F-43 read leg below.
      throw sourceReadFailed(dir, `local build readdir failed: ${String(e)}`);
    }
    for (const e of entries) {
      if (e.name === '.' || e.name === '..') continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (LOCAL_BUILD_SKIPS.has(e.name)) continue;
        walk(abs);
      } else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
        out.push(abs);
      }
    }
  };
  walk(root);
  return out;
}

function localLineOf(sf: ts.SourceFile, node: ts.Node): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

/** THE LOCAL AST BUILD (the tsconfig-free substrate for the ST-12 path): the
 *  per-file ts.createSourceFile walk in the file:/fn:/class:/method: id scheme
 *  with the caller-attributed calls/awaits edges + the imports
 *  edges. Callee/callee-module nodes are SYNTHESIZED (bare-name fn: ids for
 *  called-but-undefined symbols, file: ids for import targets) so every edge
 *  endpoint resolves to a node (the writeGraph FK contract) AND whoCalls(join)
 *  answers on fixtures whose callees are never defined in-tree. First-wins
 *  dedupe on the node ids (the bare-name collision rule). */
export function buildLocalGraph(root: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seenNode = new Set<string>();
  const pushNode = (n: GraphNode): void => {
    if (seenNode.has(n.id)) return;
    seenNode.add(n.id);
    nodes.push(n);
  };
  for (const abs of collectLocalTsFiles(root)) {
    const rel = path.relative(root, abs);
    let text: string;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch (e: unknown) {
      // ★ F-43 FIX (2026-09-24): fail-closed per this file's law — an unreadable
      // ★ source is SOURCE_READ_FAILED, never a skipped file behind console.error.
      throw sourceReadFailed(abs, `local build read failed: ${String(e)}`);
    }
    let sf: ts.SourceFile;
    try {
      sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true);
    } catch (e: unknown) {
      // ★ F-43 FIX (2026-09-24): same law for the parse leg.
      throw sourceReadFailed(abs, `local build parse failed: ${String(e)}`);
    }
    pushNode({ id: `file:${rel}`, kind: 'file', name: rel, file: rel, line: 1, lineage: 'CODE_DERIVED', source: `${rel}:1` });
    for (const stmt of sf.statements) {
      if (ts.isClassDeclaration(stmt) && stmt.name) {
        const cls = stmt.name.text;
        const clsLine = localLineOf(sf, stmt);
        pushNode({ id: `class:${cls}`, kind: 'class', name: cls, file: rel, line: clsLine, lineage: 'CODE_DERIVED', source: `${rel}:${clsLine}` });
        for (const member of stmt.members) {
          if ((ts.isMethodDeclaration(member) || ts.isPropertyDeclaration(member) || ts.isConstructorDeclaration(member)) && member.name && ts.isIdentifier(member.name)) {
            const mName = `${cls}.${member.name.text}`;
            const mLine = localLineOf(sf, member);
            pushNode({ id: `method:${mName}`, kind: 'method', name: mName, file: rel, line: mLine, lineage: 'CODE_DERIVED', source: `${rel}:${mLine}` });
          }
        }
      }
      if (ts.isFunctionDeclaration(stmt) && stmt.name) {
        const fnLine = localLineOf(sf, stmt);
        pushNode({ id: `fn:${stmt.name.text}`, kind: 'function', name: stmt.name.text, file: rel, line: fnLine, lineage: 'CODE_DERIVED', source: `${rel}:${fnLine}` });
      }
      if (ts.isVariableStatement(stmt)) {
        for (const decl of stmt.declarationList.declarations) {
          if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
          if (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer)) {
            const fnLine = localLineOf(sf, decl);
            pushNode({ id: `fn:${decl.name.text}`, kind: 'function', name: decl.name.text, file: rel, line: fnLine, lineage: 'CODE_DERIVED', source: `${rel}:${fnLine}` });
          }
        }
      }
      if (ts.isImportDeclaration(stmt) && ts.isStringLiteral(stmt.moduleSpecifier)) {
        const target = stmt.moduleSpecifier.text;
        const targetId = target.startsWith('.')
          ? `file:${path.posix.normalize(path.posix.join(path.posix.dirname(rel.split(path.sep).join('/')), target))}`
          : `file:${target}`;
        pushNode({ id: targetId, kind: 'file', name: target, file: null, line: null, lineage: 'CODE_DERIVED', source: `${rel}:${localLineOf(sf, stmt)}` });
        edges.push({ sourceId: `file:${rel}`, targetId, kind: 'imports', lineage: 'CODE_DERIVED', file: rel, line: localLineOf(sf, stmt) });
      }
    }
    let currentClass: string | null = null;
    let currentFnId: string | null = null;
    const visit = (node: ts.Node, parent: ts.Node | undefined): void => {
      const prevClass = currentClass;
      const prevFn = currentFnId;
      if (ts.isClassDeclaration(node) && node.name) currentClass = node.name.text;
      if (ts.isFunctionDeclaration(node) && node.name) currentFnId = `fn:${node.name.text}`;
      if ((ts.isMethodDeclaration(node) || ts.isPropertyDeclaration(node) || ts.isConstructorDeclaration(node)) && node.name && ts.isIdentifier(node.name)) {
        currentFnId = currentClass ? `method:${currentClass}.${node.name.text}` : `fn:${node.name.text}`;
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
        currentFnId = `fn:${node.name.text}`;
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const callee = node.expression.text;
        const inAwait = parent !== undefined && ts.isAwaitExpression(parent);
        const callerId = currentFnId ?? `file:${rel}`;
        const callLine = localLineOf(sf, node);
        pushNode({ id: `fn:${callee}`, kind: 'function', name: callee, file: rel, line: callLine, lineage: 'CODE_DERIVED', source: `${rel}:${callLine}` });
        edges.push({ sourceId: callerId, targetId: `fn:${callee}`, kind: inAwait ? 'awaits' : 'calls', lineage: 'CODE_DERIVED', file: rel, line: callLine });
      }
      ts.forEachChild(node, (child) => visit(child, node));
      currentClass = prevClass;
      currentFnId = prevFn;
    };
    visit(sf, undefined);
  }
  const keptIds = new Set(nodes.map((n) => n.id));
  const internal = edges.filter((e) => keptIds.has(e.sourceId) && keptIds.has(e.targetId));
  if (internal.length !== edges.length) {
    console.error(`[engine:local-build] dropped ${edges.length - internal.length} dangling edges (endpoints outside the emitted node set)`);
  }
  return { nodes, edges: internal };
}

/** A stored graph_nodes row (the shared.db schema — db.ts:219-228). */
interface StoredNodeRow { id: string; kind: string; name: string; file: string | null; line: number | null; lineage: string; source: string; data: string | null; }

/** A stored graph_edges row (the shared.db schema — db.ts:229-236). */
interface StoredEdgeRow { source_id: string; target_id: string; kind: string; lineage: string; }

/** Read the persisted graph rows into adapter rows (the REUSE path). */
function readStoredGraph(dbPath: string): { nodes: GraphNode[]; edges: GraphEdge[] } | null {
  let db: DbClient;
  try {
    db = openStore(dbPath);
  } catch (e: unknown) {
    // ★ F-560 FIX (2026-09-24): openStore failure must propagate — returning null
    //   makes the caller treat a corrupt/locked/permission-denied DB as 'empty'
    //   and overwrite it with a fresh build (data loss on transient errors).
    throw sourceReadFailed(dbPath, `stored-graph open failed: ${String(e)}`);
  }
  try {
    const nrows = db.prepare('SELECT id,kind,name,file,line,lineage,source,data FROM graph_nodes').all() as unknown as StoredNodeRow[];
    if (nrows.length === 0) return null;
    const erows = db.prepare('SELECT source_id,target_id,kind,lineage FROM graph_edges').all() as unknown as StoredEdgeRow[];
    // ★ F-4 FIX (2026-09-24): a single malformed `r.data` JSON must not poison the
    // ★ whole read — JSON.parse inside the row map throws into the outer catch,
    // ★ which returns null and triggers a full DB overwrite (data loss). Guard
    // ★ per-row: unparseable data becomes {} with a named warn, rows survive.
    return {
      nodes: nrows.map((r) => {
        let data: Record<string, unknown> = {};
        if (r.data) {
          try {
            data = JSON.parse(r.data) as Record<string, unknown>;
          } catch (e: unknown) {
            console.error(`[engine:graph-logic] graph_nodes row ${r.id} carries malformed data JSON — defaulting to {}: ${String(e)}`);
          }
        }
        return {
          id: r.id,
          kind: r.kind as GraphNode['kind'],
          name: r.name,
          file: r.file,
          line: r.line,
          lineage: r.lineage as GraphNode['lineage'],
          source: r.source,
          data,
        };
      }),
      edges: erows.map((r) => ({ sourceId: r.source_id, targetId: r.target_id, kind: r.kind as GraphEdge['kind'], lineage: r.lineage as GraphEdge['lineage'] })),
    };
  } catch (e: unknown) {
    // ★ F-560b FIX (2026-09-24): same data-loss class — a query failure (locked
    //   file, schema mismatch, disk I/O) must not silently return null. The caller
    //   then overwrites the existing graph with a fresh build. Loud-fail instead.
    throw sourceReadFailed(dbPath, `stored-graph read failed: ${String(e)}`);
  } finally {
    try { db.close(); } catch { /* the close is best-effort after a read failure */ }
  }
}

/** THE LOUD FAIL (the native-ast rip-out, the operator ruling 2026-09-07): the
 *  disk profile failed loadProfile — the run REFUSES to synthesize a
 *  substitute profile. The old fallback constructed a minimal native-ast
 *  profile here, letting the hunt "succeed" without a real, operator-declared
 *  substrate. That path is REMOVED: an unresolvable profile is INCONCLUSIVE
 *  with the named PROFILE_INVALID error (the loader's reason is carried, never
 *  masked), never a synthesized stand-in. */
export function fallbackProfile(root: string, reason: string): ProjectProfile {
  throw new Error(`PROFILE_INVALID: the disk profile failed to load for ${root} (reason: ${reason}) remedy=declare a full valid profile with graph.substrate corbell (the hard dependency) — no fallback profile is synthesized`);
}

export interface GraphLogicDiagnosticsArgs {
  targetPath: string;
  profilePath: string;
  runId?: string;
}

export interface GraphLogicDiagnosticsSummary {
  runId: string;
  findings: import('./findings-store.ts').NormalizedFinding[];
  findingsCount: number;
  dedupedCount: number;
  predicatesExecuted: number;
  profileFromDisk: boolean;
}

/** THE GRAPH-LOGIC DIAGNOSTICS RUN (the ST-12 entry): the semantic battery over
 *  the target's graph (reused from shared.db when present, locally built +
 *  persisted otherwise) + the lockdown source → the ranked findings. */
export function runGraphLogicDiagnostics(args: GraphLogicDiagnosticsArgs): GraphLogicDiagnosticsSummary {
  const root = path.resolve(args.targetPath);
  if (!fs.existsSync(root)) {
    throw sourceReadFailed(args.targetPath, 'the targetPath must exist');
  }
  let profile: ProjectProfile;
  let profileFromDisk = false;
  try {
    profile = loadProfile(args.profilePath);
    profileFromDisk = true;
  } catch (e: unknown) {
    profile = fallbackProfile(root, e instanceof Error ? e.message.slice(0, 300) : String(e));
  }
  const projectRoot = path.resolve(profile.project.root);
  const dbPath = path.join(projectRoot, '.trident', 'knowledge-graph', 'shared.db');
  let rows: { nodes: GraphNode[]; edges: GraphEdge[] } | null = null;
  if (fs.existsSync(dbPath)) {
    rows = readStoredGraph(dbPath);
  }
  if (rows === null) {
    // ★ F-44 FIX (2026-09-24): the exists→build→write sequence raced — two
    // ★ concurrent runs both built and both overwrote. The wx lock serializes the
    // ★ builder; the loser re-reads the winner's rows instead of overwriting them.
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    const lockPath = `${dbPath}.build.lock`;
    let haveLock = false;
    try {
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      haveLock = true;
    } catch { /* EEXIST — another run is building; fall through to the re-read */ }
    if (!haveLock) {
      const raced = readStoredGraph(dbPath);
      if (raced !== null && raced.nodes.length > 0) {
        rows = raced;
      }
    }
    if (rows === null && !haveLock) {
      // Lock holder vanished without persisting (crash between lock and write):
      // take over rather than deadlock on its stale lock.
      try { fs.unlinkSync(lockPath); } catch { /* already gone */ }
      fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
      haveLock = true;
    }
    if (rows === null) {
      try {
        const built = buildLocalGraph(projectRoot);
        if (built.nodes.length === 0) {
          throw engineGraphEmpty(`the local AST build found no declarations under ${projectRoot}`);
        }
        try {
          const db = openStore(dbPath);
          try {
            db.writeGraph(built.nodes, built.edges);
          } finally {
            try { db.close(); } catch { /* best-effort close after the persist */ }
          }
        } catch (e: unknown) {
          throw sourceReadFailed(dbPath, `the graph persist failed: ${String(e)}`);
        }
        rows = built;
      } finally {
        if (haveLock) try { fs.unlinkSync(lockPath); } catch { /* best-effort */ }
      }
    }
  }
  const adapter = new StoreGraphAdapter(rows.nodes, rows.edges);
  const source = lockdownReadSource(profile);
  const battery = buildSemanticBattery();
  const contentMap = buildFileContentMap(adapter.nodes(), source);
  const raw = run(battery, { graph: adapter, source, contentMap });
  const deduped = dedupe(raw);
  const ranked = rankFindings(deduped, profile);
  return {
    runId: args.runId ?? `graph-logic-${Date.now()}`,
    findings: ranked,
    findingsCount: raw.length,
    dedupedCount: ranked.length,
    predicatesExecuted: battery.length,
    profileFromDisk,
  };
}

export function assertNoBlindness(checkpoint: {
  graphNodesBefore: number;
  graphNodesAfter: number;
  changedNodeIds: Set<string>;
  rerunNodeIds: Set<string>;
  runResult: NormalizedFinding[];
}): void {
  // ★ F-33 FIX (2026-09-24): the first branch (`size > 0 && after === before`
  // ★ INSIDE `after !== before`) was unsatisfiable dead code with an empty body —
  // ★ the GRAPH_INCOMPLETE arm below it could never fire through that branch.
  // ★ Collapsed to the single live condition: graph changed with zero changed ids.
  if (checkpoint.graphNodesAfter !== checkpoint.graphNodesBefore) {
    const before = checkpoint.graphNodesBefore;
    const after = checkpoint.graphNodesAfter;
    if (checkpoint.changedNodeIds.size === 0) {
      throw new EngineError('GRAPH_INCOMPLETE', `GRAPH_INCOMPLETE: graphNodesAfter=${after} graphNodesBefore=${before} — the graph changed without a re-parse`);
    }
  }
  const changed = checkpoint.changedNodeIds;
  const rerun = checkpoint.rerunNodeIds;
  if (changed.size !== rerun.size || [...changed].some((id) => !rerun.has(id))) {
    if (changed.size > 0) {
      throw new EngineError('BATTERY_INCOMPLETE', `BATTERY_INCOMPLETE: changedNodeIds=${[...changed].join(',')} rerunNodeIds=${[...rerun].join(',')} — the battery predicates were not fully rerun on changed nodeIds`);
    }
  }
  if (checkpoint.runResult.length === 0 && changed.size > 0) {
    throw new EngineError('ENGINE_SKIP', `ENGINE_SKIP: runResult is empty but changedNodeIds is non-empty (${[...changed].join(',')}) — the engine returned early without covering changed nodeIds`);
  }
}
