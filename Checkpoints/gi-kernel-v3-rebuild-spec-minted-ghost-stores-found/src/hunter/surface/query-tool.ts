// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/surface/query-tool.ts (DEV-4 depth-8 / DEV-5 CTE) — verbatim bytes; SEAM: shared import rewritten.
/**
 * query-tool.ts — THE 7-VERB QUERY SURFACE (W6, spec §3.12 ~1400-1500)
 *
 * The awareness interface that replaces the 500K corpus re-read (D11):
 * the 7 verbs answer the architecture questions from the stored graph + findings —
 * who calls X / what does the chain look like / what is unwired / what must be
 * implemented / what rule applies / what is violated / is the spec consistent
 * with the code. The reads go through W1's DbClient.prepare pass-through +
 * the GraphAdapter — never raw SQL strings outside this file.
 *
 * THE --format llm (D22): the token-minimal records — the awareness surface for
 * the agents' context windows (the Ix concept).
 */

import type { DbClient } from '../shared/db.ts';
import type { GraphAdapter } from '../graph/interface.ts';

export const MAX_BLAST_DEPTH = 64;
// GI-PORT DEV-5: the blast CTE rebased onto the gate's PROVEN shape
// (graph-gate.ts:541-574) — the verb's original natural-join shape let the
// planner drive from typed_edges (48K edges × blast rows = the GG-BUG-5
// 120s+ class; found LIVE on the real hub this port). The seek chain:
// SCAN blast → SEARCH dst idx_tn_file → SEARCH e idx_te_dst → SEARCH src.
// GI-PORT DEV-4: the hub-safe default (GG-BUG-5: a depth-64 closure on a
// real hub enumerates the graph — the gate's MAX_DEPTH-4 lesson applied to
// the verb; QueryInput.depth? is the escape hatch).
export const DEFAULT_BLAST_DEPTH = 8;
export const MAX_QUERY_ROWS = 200;
export const MAX_QUERY_ROWS_FULL = 2000;

/** The query result row — the union of the verb outputs. */
export type QueryRow = Record<string, unknown>;

/** A semantic-search hit — the top-k code chunk + its similarity score. */
export interface SemanticHit {
  rank: number;
  serviceId: string;
  filePath: string;
  symbol: string | null;
  chunkType: string;
  startLine: number;
  endLine: number;
  content: string;
  language: string;
  score: number;
}

/** THE SEMANTIC SURFACE — the corbell embeddings adapter implements this; the
 *  semantic-search verb delegates here (the wire, never the reimplementation). */
export interface SemanticSurface {
  query(query: string, topK: number): SemanticHit[];
}

/** A learned design-pattern row (the corbell docs scan/learn extraction). */
export interface DocsPatternRow {
  id: string;
  sourceFile: string;
  detectedType: string;
  sectionHeadings: string[];
  terminology: Record<string, unknown>;
  decisions: Array<{ id: string; summary: string; rationale: string | null }>;
}

/** THE DOCS-PATTERNS SURFACE — the corbell docs store reader implements this;
 *  the docs-patterns verb delegates here. */
export interface DocsPatternSurface {
  list(): DocsPatternRow[];
}

/** THE VERBS — the 7 structural + the 3 corbell-native (D11 + the semantic
 *  layer: the GPU's purpose made visible). */
export type QueryVerb =
  | 'who-calls' | 'chain' | 'must-implement' | 'unwired'
  | 'rule' | 'violations' | 'consistency'
  | 'semantic-search' | 'code-search' | 'docs-patterns'
  | 'blast-radius' | 'would-break';

/** The query input — the verb + the optional filters + the output format. */
export interface QueryInput {
  verb: QueryVerb;
  symbol?: string;       // who-calls / chain
  from?: string;         // chain
  to?: string;           // chain
  ruleId?: string;       // rule
  week?: string;         // violations
  runId?: string;        // violations / rule
  query?: string;        // semantic-search / code-search (the free-text query)
  topK?: number;         // semantic-search / code-search (the top-k, default 10)
  format?: 'table' | 'llm' | 'full'; // D22
  limit?: number;
  offset?: number;
  proposed?: string;
  depth?: number;       // GI-PORT DEV-4: the blast-radius depth override
}

/** The extension surfaces the corbell-native verbs delegate to (injected by
 *  the registration layer; a verb without its surface fails loudly). */
export interface QueryExtensions {
  semantic?: SemanticSurface;
  docs?: DocsPatternSurface;
}

/** THE VERB RUNNER — the surface the agents + the tools consume. The optional
 *  extensions carry the corbell-native surfaces (semantic/docs); a verb that
 *  names one WITHOUT the surface fails loudly with the named error. */
export function runQuery(input: QueryInput, db: DbClient, adapter?: GraphAdapter, ext?: QueryExtensions): QueryRow[] {
  switch (input.verb) {
    case 'who-calls':  return whoCalls(input, db);
    case 'chain':      return chain(input, db);
    case 'must-implement': return mustImplement(db, input.format);
    case 'unwired':    return unwired(db, adapter, input.format);
    // ★ F-952 NOTE (2026-09-24): rule / blast-radius / would-break bypass formatRows BY DESIGN —
    //   aggregate rows with nested arrays (violations[], nodes[], breaking[]); the llm record would
    //   collapse them to "field=[object Object]" (data loss). They are already minimal.
    case 'rule':       return rule(input, db);
    case 'violations': return violations(input, db);
    case 'consistency': return consistency(db, input.format);
    case 'semantic-search': return semanticVerb(input, ext?.semantic);
    case 'code-search':     return semanticVerb(input, ext?.semantic);
    case 'docs-patterns':   return docsPatternsVerb(input, ext?.docs);
    case 'blast-radius': return blastRadius(input, db);
    case 'would-break': return wouldBreak(input, db);
    default: {
      // THE R16 TYPE_CERTAINTY GUARD — the verb is read as unknown through a
      // guarded accessor (the typeof/null check earns the typed read); an
      // unknown verb is the named error.
      const v = verbOf(input);
      if (typeof v !== 'undefined') {
        throw new Error(`QUERY_INVALID: verb=${String(v)} (the verbs are who-calls|chain|must-implement|unwired|rule|violations|consistency|semantic-search|code-search|docs-patterns|blast-radius|would-break)`);
      }
      throw new Error('QUERY_INVALID: verb is missing (the verbs are who-calls|chain|must-implement|unwired|rule|violations|consistency|semantic-search|code-search|docs-patterns|blast-radius|would-break)');
    }
  }
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — a `.all()` result (an unknown array)
 *  is Array.isArray-checked before the typed assertion: the type certainty is
 *  earned by the runtime check, never a bare cast on an unvalidated row set. A
 *  non-array result is the named loud error (the db contract broke). */
function rowsAs<T>(rows: unknown, label: string): T[] {
  if (Array.isArray(rows)) {
    return rows as T[];
  }
  throw new Error(`[query-tool] ${label} expected an array of rows, got ${typeof rows}`);
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the query input's verb is read as an
 *  unknown field behind the typeof/null guard (the assertion is earned by the
 *  check, never a bare cast on the unvalidated input object). */
function verbOf(input: unknown): unknown {
  if (typeof input === 'object' && input !== null) {
    const verb = (input as { verb?: unknown }).verb;
    if (verb !== undefined) return verb;
  }
  return undefined;
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — a `.get()` result (a single unknown
 *  row) is null/undefined-guarded before the typed assertion; the legitimately
 *  absent row (undefined) flows through typed as the nullable row. */
function rowAs<T>(row: unknown, label: string): T | null | undefined {
  if (row !== undefined && row !== null) {
    return row as T;
  }
  return row as T | null | undefined;
}

// ---------------------------------------------------------------------------
// THE VERB IMPLEMENTATIONS (the reads through the DbClient.prepare surface)
// ---------------------------------------------------------------------------

/** who-calls — the 'calls'/'imports' TYPED edges targeting the symbol → the
 *  CallSite rows {caller, file, line}. THE SUBSTRATE FIX (2026-09-08, the
 *  operator's zero-trust audit): the verbs read the HUNT substrate
 *  (typed_edges/typed_nodes — the same tables the graph gate's proven JOINs
 *  read), NOT the legacy graph_edges/graph_nodes lineage schema which the
 *  hunt population never fills (the split-brain: the gate blocked citing
 *  caller.ts:2 while who-calls returned [] against the SAME store).
 *  The label resolution matches the gate's (dst.label = :symbol). */
function whoCalls(input: QueryInput, db: DbClient): QueryRow[] {
  const symbol = input.symbol ?? '';
  const edges = rowsAs<{ src_label: string; src_file: string; src_line: number }>(
    db.prepare(`
      SELECT DISTINCT src.label AS src_label, src.file AS src_file, src.line AS src_line
      FROM typed_edges e
      JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id AND dst.label = ?
      JOIN typed_nodes src ON e.src_canonical = src.canonical_id
      WHERE e.predicate IN ('calls', 'imports') AND e.superseded_run IS NULL
        AND src.file IS NOT NULL
        -- ★ R18-HIGH FIX (2026-09-25): whoCalls had NO LIMIT while the violations verb caps at
        --   MAX_QUERY_ROWS_FULL. A ubiquitous symbol (a util called everywhere) returned EVERY
        --   caller — an unbounded read that materializes the whole edge set in JS. Same cap as
        --   the other full-format verbs; the answer stays bounded.
        --   (NOTE: no backticks in this comment — one would terminate the JS template literal.)
        LIMIT ${MAX_QUERY_ROWS_FULL}
    `).all(symbol),
    'who-calls edges',
  );
  const rows: QueryRow[] = edges.map((e) => ({
    caller: e.src_label, file: e.src_file, line: e.src_line ?? 0,
  }));
  return formatRows(rows, input.format);
}

/** chain — the BFS over the TYPED 'calls' edges from → to → the ChainStep rows
 *  {from, to, kind, file, line}. The from/to are LABELS resolved through
 *  typed_nodes (the multi-node labels: every matching canonical enters the
 *  frontier). The depth cap bounds the pathological graphs. */
function chain(input: QueryInput, db: DbClient): QueryRow[] {
  const from = input.from ?? input.symbol ?? '';
  const to = input.to ?? '';
  const MAX_DEPTH = 64; // the trace bound — a pathological graph cannot hang the query
  const startIds = rowsAs<{ canonical_id: string }>(
    db.prepare('SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL').all(from),
    'chain start nodes',
  );
  const toLabels = rowsAs<{ label: string }>(
    db.prepare('SELECT DISTINCT label FROM typed_nodes WHERE label = ? AND superseded_run IS NULL').all(to),
    'chain target labels',
  );
  const toSet = new Set(toLabels.map((r) => r.label));
  // ★ F-307 FIX (2026-09-24): the queue carried a full path copy per entry (steps: [...cur.steps, step])
  // ★ — O(depth) array alloc + copy per edge. Parent pointers store one {parent, step} per node and
  // ★ materialize the path ONCE at the target. F-29's enqueue-marking is kept verbatim (one queue
  // ★ entry per node), so the queue bound is unchanged; BFS still finds the shortest path first.
  const visited = new Set<string>();
  const parent = new Map<string, { parent: string | null; step: QueryRow | null }>();
  const depthOf = new Map<string, number>();
  const queue: string[] = [];
  for (const st of startIds) {
    if (visited.has(st.canonical_id)) continue;
    visited.add(st.canonical_id);
    parent.set(st.canonical_id, { parent: null, step: null });
    depthOf.set(st.canonical_id, 0);
    queue.push(st.canonical_id);
  }
  let head = 0;
  const buildPath = (curId: string, finalStep: QueryRow): QueryRow[] => {
    const rev: QueryRow[] = [];
    let c: string | null = curId;
    while (c !== null) {
      const ent = parent.get(c);
      if (!ent || !ent.step) break;
      rev.push(ent.step);
      c = ent.parent;
    }
    rev.reverse();
    rev.push(finalStep);
    // ★ F-951 FIX (2026-09-24): the materialized steps never carried a `step` number, so
    //   formatRows(llm) fell back to `r.step ?? 1` and printed step=1 for EVERY hop (positional
    //   info lost). Number the path 1..N here; rows are CLONED — parent-map entries are shared
    //   across BFS branches and must not be mutated.
    return rev.map((r, i) => ({ ...r, step: i + 1 }));
  };
  // ★ R15H5 FIX (2026-09-25): the edge statement was prepared INSIDE the dequeue
  //   loop — every visited node (up to depth 64 with hub fan-out) paid a
  //   prepare+execute. Hoisted once outside the loop; the per-node bind stays.
  const chainEdgesStmt = db.prepare(`
        SELECT dst.canonical_id AS dst_id, dst.label AS dst_label,
               dst.file AS dst_file, dst.line AS dst_line, e.predicate AS predicate
        FROM typed_edges e
        JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id
        WHERE e.src_canonical = ? AND e.predicate = 'calls' AND e.superseded_run IS NULL
      `);
  while (head < queue.length) {
    const curId = queue[head]!;
    const curDepth = depthOf.get(curId) ?? 0;
    head += 1;
    if (curDepth >= MAX_DEPTH) continue;
    const out = rowsAs<{ dst_id: string; dst_label: string; dst_file: string; dst_line: number; predicate: string }>(
      chainEdgesStmt.all(curId),
      'chain edges',
    );
    for (const e of out) {
      const step: QueryRow = {
        from: curId, to: e.dst_label, kind: e.predicate,
        file: e.dst_file ?? '', line: e.dst_line ?? 0,
      };
      // the target reached: return the path INCLUDING this step — unless the
      // degenerate from===to start (the trivial self-match at depth 0).
      if (toSet.has(e.dst_label) && !(from === to && curDepth === 0)) {
        return formatRows(buildPath(curId, step), input.format);
      }
      // ★ F-29 enqueue-marking, unchanged: one queue entry per node.
      if (visited.has(e.dst_id)) continue;
      visited.add(e.dst_id);
      parent.set(e.dst_id, { parent: curId, step });
      depthOf.set(e.dst_id, curDepth + 1);
      queue.push(e.dst_id);
    }
  }
  return formatRows([], input.format); // no path — the honest empty
};

/** The stage's declared entry symbol — the data.entry JSON field, else the node name. */
function stageEntry(node: { name: string; data?: string | null }): string {
  if (node.data) {
    try {
      // THE R16 TYPE_CERTAINTY FIX — JSON.parse returns `any`; the shape is
      // typed directly (no cast expression), and the `entry` read is
      // typeof-guarded before use.
      const parsed: { entry?: unknown } = JSON.parse(node.data);
      if (typeof parsed.entry === 'string' && parsed.entry.length > 0) return parsed.entry;
    } catch (e: unknown) {
      // the malformed data blob — the name fallback (the detector's honest degrade)
      console.warn(`[query-tool] stage data parse failed — the name fallback: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return node.name;
}

// ★ F-40 FIX (2026-09-24): the split-brain — who-calls/chain/blast read the
// ★ hunt-populated typed_nodes/typed_edges while must-implement read ONLY legacy
// ★ graph_nodes, so a symbol present in typed (populated) but absent in graph_nodes
// ★ (unpopulated leg) falsely reported MUST_IMPLEMENT. The lineage duality lives
// ★ ONLY in graph_nodes (typed_nodes DDL has no lineage column), so the SPEC leg
// ★ stays on graph_nodes while the CODE leg unions BOTH substrates.
function codeNameSet(db: DbClient): Set<string> {
  const names = new Set<string>();
  try {
    for (const r of rowsAs<{ label: string }>(
      db.prepare('SELECT label FROM typed_nodes WHERE superseded_run IS NULL').all(), 'code-names typed')) {
      if (r.label) names.add(r.label);
    }
  } catch (e: unknown) {
    // ★ F-1203 FIX (2026-09-25): the bare `catch {}` swallowed EVERYTHING — a locked DB /
    // ★ dropped connection silently yielded only the graph_nodes leg, and mustImplement /
    // ★ consistency then reported MUST_IMPLEMENT / DRIFT for symbols present in typed_nodes
    // ★ (false positives). `no such table` stays tolerated (legacy stores legitimately lack
    // ★ the typed leg); anything else is LOUD — the caller sees the failure, never fake data.
    const msg = e instanceof Error ? e.message : String(e);
    if (!/no such table/i.test(msg)) throw e;
  }
  for (const r of rowsAs<{ name: string }>(
    db.prepare("SELECT name FROM graph_nodes WHERE lineage = 'CODE_DERIVED'").all(), 'code-names graph')) {
    names.add(r.name);
  }
  return names;
}
/** must-implement — the SPEC_DERIVED stages whose declared ENTRY has NO CODE_DERIVED node. */
function mustImplement(db: DbClient, format?: QueryInput['format']): QueryRow[] {
  const spec = rowsAs<{ id: string; name: string; source: string; data?: string | null }>(
    db.prepare("SELECT id, name, source, data FROM graph_nodes WHERE lineage = 'SPEC_DERIVED' AND kind = 'stage'").all(),
    'must-implement spec',
  );
  const codeNames = codeNameSet(db);
  // ★ F-952 FIX (2026-09-24): the format param was silently ignored for this verb (no formatRows
  //   call) — flat rows now honor format like who-calls.
  return formatRows(spec
    .filter((s) => !codeNames.has(stageEntry(s)))
    .map((s) => ({ stage: s.name, entry: stageEntry(s), id: s.id, declaredSource: s.source, status: 'MUST_IMPLEMENT' })), format);
}

/** unwired — the TYPED Function/Class nodes with 0 incoming 'calls'/'imports'
 *  edges (the dead machinery) — the store-level twin of the graph gate's
 *  CHECK 4. THE SUBSTRATE FIX: the hunt-populated typed tables, not the
 *  legacy graph_nodes lineage schema. The adapter path (the corbell cache)
 *  is preserved first when provided. */
function unwired(db: DbClient, adapter?: GraphAdapter, format?: QueryInput['format']): QueryRow[] {
  if (adapter) {
    // ★ F-952 FIX (2026-09-24): flat rows honor format (see mustImplement).
    return formatRows(adapter.unwired().map((d) => ({ name: d.name, file: d.file, line: d.line, status: 'UNWIRED' })), format);
  }
  const code = rowsAs<{ id: string; label: string; file: string; line: number }>(
    db.prepare(`
      SELECT n.canonical_id AS id, n.label, n.file, n.line
      FROM typed_nodes n
      WHERE n.kind IN ('Function', 'Class') AND n.superseded_run IS NULL
        AND n.file IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM typed_edges e
          WHERE e.dst_canonical = n.canonical_id
            AND e.predicate IN ('calls', 'imports') AND e.superseded_run IS NULL
        )
    `).all(),
    'unwired code',
  );
  return formatRows(code.map((n) => ({ name: n.label, file: n.file ?? '', line: n.line ?? 0, status: 'UNWIRED' })), format);
}

/** rule — the compiled predicate row + the violation rows (the verbatim quote + the anchors). */
function rule(input: QueryInput, db: DbClient): QueryRow[] {
  const ruleId = input.ruleId ?? '';
  const p = rowAs<{ family: string; template: string; bindings: string; verbatim_quote: string; anchor: string; severity: string }>(
    db.prepare('SELECT family, template, bindings, verbatim_quote, anchor, severity FROM compiled_predicates WHERE id = ?').get(ruleId),
    'rule predicate',
  );
  if (!p) return [];
  const findings = rowsAs<{ severity: string; file?: string | null; line?: number | null; evidence: string; verdict: string; run_id: string }>(
    db.prepare('SELECT severity, file, line, evidence, verdict, run_id FROM findings WHERE rule_id = ? ORDER BY severity DESC').all(ruleId),
    'rule findings',
  );
  return [{
    ruleId, family: p.family, template: p.template,
    verbatimQuote: p.verbatim_quote, anchor: p.anchor, severity: p.severity,
    violations: findings.map((f) => ({ file: f.file ?? '', line: f.line ?? 0, severity: f.severity, verdict: f.verdict, runId: f.run_id })),
  }];
}

/** violations — the findings rows filtered by week/runId, the CRIT-first ranking (D13). */
function violations(input: QueryInput, db: DbClient): QueryRow[] {
  const byRun = input.runId ? ' AND run_id = ?' : '';
  const byWeek = input.week ? ' AND week = ?' : '';
  const params: string[] = [];
  if (input.runId) params.push(input.runId);
  if (input.week) params.push(input.week);
  // ★ F-1054 FIX (2026-09-25): pagination is NATIVE (LIMIT/OFFSET bound after the filter params) — the old shape materialized up to MAX_QUERY_ROWS_FULL (2000) rows into JS then sliced (UNBOUNDED read on a large findings table). `, id` keeps page order stable across severity ties.
  const effectiveCap = input.format === 'llm' ? MAX_QUERY_ROWS : MAX_QUERY_ROWS_FULL;
  const off = Math.max(0, Math.floor(input.offset ?? 0));
  // ★ F-10 FIX (2026-09-24): offset/limit page the FULL findings set and the cap
  // bounds the PAGE, never the base — the old order capped first, so any offset
  // past the cap returned [] while total still claimed rows. limit is clamped to
  // the cap so one page can never exceed the truncation budget.
  // ★ F-11 FIX (2026-09-24): data rows ONLY — the old { pagination } trailer rode
  // the same QueryRow[] behind an `as unknown as` cast, so formatRows(llm)
  // stringified it into a garbage `pagination=[object Object]` record and every
  // consumer had to filter the last element. A full page at off+lim signals more.
  const lim = input.limit !== undefined ? Math.min(Math.max(0, Math.floor(input.limit)), effectiveCap) : effectiveCap;
  const rows = rowsAs<Record<string, unknown>>(
    db.prepare(`SELECT rule_id, severity, file, line, evidence, verdict, week, run_id FROM findings WHERE verdict = 'VIOLATION'${byRun}${byWeek} ORDER BY CASE severity WHEN 'CRIT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MED' THEN 2 ELSE 3 END, id LIMIT ? OFFSET ?`).all(...params, lim, off),
    'violations',
  );
  // ★ F-952 FIX (2026-09-24): the format param was silently ignored here — an llm caller got
  //   full-size rows. Route the page through formatRows.
  return formatRows(rows, input.format);
}

/** consistency — the SPEC_DERIVED vs CODE_DERIVED drift alarm (the matrix vision). */
function consistency(db: DbClient, format?: QueryInput['format']): QueryRow[] {
  const spec = rowsAs<{ id: string; name: string; source: string; data?: string | null }>(
    db.prepare("SELECT id, name, source, data FROM graph_nodes WHERE lineage = 'SPEC_DERIVED'").all(),
    'consistency spec',
  );
  const codeNames = codeNameSet(db); // ★ F-40 FIX (2026-09-24): same unioned CODE leg as must-implement.
  // ★ F-952 FIX (2026-09-24): the format param was silently ignored for this verb (no formatRows
  //   call) — flat rows now honor format like who-calls.
  return formatRows(spec
    .filter((s) => !codeNames.has(stageEntry(s)))
    .map((s) => ({ status: 'DRIFT', specNode: s.name, entry: stageEntry(s), specId: s.id, declaredSource: s.source })), format);
}

// ---------------------------------------------------------------------------
// THE CORBELL-NATIVE VERBS (the semantic layer + the docs patterns — W2b)
// ---------------------------------------------------------------------------

/** semantic-search / code-search — the top-k code chunks + the similarity
 *  scores, delegated to the corbell embeddings surface (the wire). THE EMPTY
 *  CASES: an empty query or an empty index → the TYPED EMPTY, never an
 *  exception (the surface returns [] and the verb formats it). A verb without
 *  the semantic surface → SEMANTIC_UNAVAILABLE (the loud named error). */
function semanticVerb(input: QueryInput, surface?: SemanticSurface): QueryRow[] {
  if (!surface) {
    throw new Error('SEMANTIC_UNAVAILABLE: the semantic-search verb requires the corbell embeddings surface (wire it through the query registration — the corbell store must be built)');
  }
  const query = (input.query ?? '').trim();
  if (query.length === 0) return []; // the typed empty for the empty query
  const topK = Math.max(1, Math.floor(input.topK ?? 10));
  const hits = surface.query(query, topK);
  const rows: QueryRow[] = hits.map((h) => ({
    rank: h.rank,
    file: h.filePath,
    line: h.startLine,
    endLine: h.endLine,
    symbol: h.symbol ?? h.chunkType,
    chunkType: h.chunkType,
    score: h.score,
    service: h.serviceId,
    language: h.language,
    preview: h.content.replace(/\s+/g, ' ').slice(0, 80),
  }));
  return formatRows(rows, input.format);
}

/** docs-patterns — the learned design patterns from the corbell docs scan/
 *  learn, read through the docs surface (the wire). The empty store → the
 *  typed empty. A verb without the docs surface → DOCS_UNAVAILABLE. */
function docsPatternsVerb(input: QueryInput, surface?: DocsPatternSurface): QueryRow[] {
  if (!surface) {
    throw new Error('DOCS_UNAVAILABLE: the docs-patterns verb requires the corbell docs surface (wire it through the query registration — run the corbell docs scan/learn first)');
  }
  const rows: QueryRow[] = surface.list().map((p) => ({
    pattern: p.id,
    sourceFile: p.sourceFile,
    type: p.detectedType,
    sections: p.sectionHeadings.join(','),
    decisions: p.decisions.map((d) => d.summary).join(' | '),
  }));
  return formatRows(rows, input.format);
}


// ---------------------------------------------------------------------------
// THE AWARENESS VERBS — blast-radius + would-break (W2, spec §3.4 / §12.3)
// ---------------------------------------------------------------------------

function blastRadius(input: QueryInput, db: DbClient): QueryRow[] {
  const root = (input.symbol ?? input.from ?? '').trim();
  if (!root) return [{ root: '', depth: 0, nodes: [] }];
  // THE SUBSTRATE FIX (the operator's zero-trust audit): the symbol resolves
  // through typed_nodes → its file(s) → the SAME depth-capped recursive CTE
  // the graph gate's CHECK 3 uses (the one-truth law: the gate and the query
  // verbs answer from the same substrate with the same walk).
  // ★ F-308 FIX (2026-09-24): the old walk joined per FILE (CROSS JOIN nodes-by-file x all
  // ★ edges = O(V*E) fan-out, conflating same-label nodes sharing a file). Ported to the proven
  // ★ id-walk JOIN shape from src/omp/typed-write.ts:868-887 — the recursion walks CANONICAL IDS
  // ★ (JOIN typed_edges ON dst_canonical = blast.cid, JOIN src ON canonical_id), collapsing to
  // ★ per-file rows only in the outer SELECT. Predicate set stays ('calls','imports'): this store's
  // ★ CHECK-closed vocabulary (ontology.ts) has no 'traces-to' — importing the OMP predicate list
  // ★ verbatim would match nothing. Single BFS from all root ids gives MIN depth from ANY root id
  // ★ (the old per-file loop kept the FIRST file's depth on shared files; identical on single-file
  // ★ symbols, the common case — verified against st-verbs-parse + st-gi-omp-populate blast tests).
  let ids = rowsAs<{ canonical_id: string }>(
    db.prepare('SELECT canonical_id FROM typed_nodes WHERE label = ? AND superseded_run IS NULL').all(root),
    'blast-radius ids',
  ).map((r) => r.canonical_id);
  if (ids.length === 0) return [{ root, depth: 0, nodes: [] }];
  if (ids.length > 500) ids = ids.slice(0, 500); // SQLite variable cap; same deterministic truncation as typed-write.ts
  const ph = ids.map(() => '?').join(', ');
  const cap = Math.min(input.depth ?? DEFAULT_BLAST_DEPTH, MAX_BLAST_DEPTH); // GI-PORT DEV-4 + F-126 cap
  const rows = rowsAs<{ file: string; depth: number }>(
    db.prepare(`
      WITH RECURSIVE blast(cid, depth) AS (
        SELECT canonical_id, 0 FROM typed_nodes WHERE canonical_id IN (${ph}) AND superseded_run IS NULL
        UNION
        SELECT src.canonical_id, blast.depth + 1
        FROM blast
        JOIN typed_edges e ON e.dst_canonical = blast.cid
        JOIN typed_nodes src ON src.canonical_id = e.src_canonical
        WHERE e.predicate IN ('calls', 'imports')
          AND e.superseded_run IS NULL
          AND src.superseded_run IS NULL
          AND src.file IS NOT NULL
          AND blast.depth < ?
      )
      SELECT n.file AS file, MIN(blast.depth) AS depth
      FROM blast
      JOIN typed_nodes n ON n.canonical_id = blast.cid
      WHERE blast.depth > 0 AND n.file IS NOT NULL
      GROUP BY n.file
    `).all(...ids, cap),
    'blast-radius walk',
  );
  const nodes = rows.map((r) => ({ file: r.file, depth: Number(r.depth) }));
  const maxDepth = nodes.reduce((m, n) => (n.depth > m ? n.depth : m), 0);
  return [{ root, depth: maxDepth, nodes }];
};

function wouldBreak(input: QueryInput, db: DbClient): QueryRow[] {
  const symbol = (input.symbol ?? '').trim();
  const proposed = (input.proposed ?? '').trim();
  let proposedCount = 0;
  if (proposed.length > 0) {
    const m = /\(([^)]*)\)/.exec(proposed);
    const inside = m ? m[1].trim() : '';
    if (inside !== '') {
      proposedCount = inside.split(',').map((s) => s.trim()).filter((s) => s.length > 0).length;
    }
  }
  // ★ R20-HIGH FIX (2026-09-25): the callers query had NO LIMIT — a ubiquitous symbol
  //   materialized its whole caller set into JS. Bounded at 5000 like whoCalls (R18-HIGH).
  // THE SUBSTRATE FIX: the typed 'calls' edges into the symbol — the callers
  // the graph gate's CHECK 1 would cite. The typed substrate carries NO
  // per-call signature metadata (the argCount/argTypes live in the corbell
  // layer when wired) → argsUnknown is HONESTLY true and the breaking list
  // stays empty: the verb answers WHO would break, never invents the
  // arg-level analysis it cannot see.
  const callers = rowsAs<{ src_label: string; src_file: string; src_line: number }>(
    db.prepare(`
      SELECT DISTINCT src.label AS src_label, src.file AS src_file, src.line AS src_line
      FROM typed_edges e
      JOIN typed_nodes dst ON e.dst_canonical = dst.canonical_id AND dst.label = ?
      JOIN typed_nodes src ON e.src_canonical = src.canonical_id
      WHERE e.predicate = 'calls' AND e.superseded_run IS NULL AND src.file IS NOT NULL
      LIMIT 5000
    `).all(symbol),
    'would-break callers',
  );
  const breaking: Array<{ importer: string; reason: string }> = callers.map((c) => ({
    importer: `${c.src_label} (${c.src_file}:${c.src_line})`,
    reason: `signature change unverified — ${proposedCount > 0 ? `proposed arity ${proposedCount}` : 'no proposed signature'}; the caller's call shape requires manual verification (the typed substrate carries no per-call signature metadata)`,
  }));
  return [{ symbol, proposed, breaking, argsUnknown: true, callers: callers.length }];
}

// ---------------------------------------------------------------------------
// THE OUTPUT FORMATS (D22 — the llm format emits the token-minimal records)
// ---------------------------------------------------------------------------

/** The table format: the rows as-is. The llm format: the token-minimal records.
 *  Exported for the corbell-native tools (the MCP code_search handler) to
 *  reuse the D22 pattern — the awareness surface for the context windows. */
export function formatRows(rows: QueryRow[], format?: 'table' | 'llm' | 'full'): QueryRow[] {
  if (format !== 'llm') return rows;
  return rows.map((r) => {
    if (r.from !== undefined && r.to !== undefined && r.kind !== undefined) {
      // the chain step: 'chain step=N from=X to=Y kind=K' — the test floor pattern
      return { record: `chain step=${r.step ?? 1} from=${String(r.from)} to=${String(r.to)} kind=${String(r.kind)}` };
    }
    if (r.ruleId !== undefined && r.file !== undefined) {
      return { record: `${String(r.ruleId)} ${String(r.file)}:${String(r.line ?? 0)}` };
    }
    return { record: Object.entries(r).map(([k, v]) => `${k}=${String(v)}`).join(' ') };
  });
}
