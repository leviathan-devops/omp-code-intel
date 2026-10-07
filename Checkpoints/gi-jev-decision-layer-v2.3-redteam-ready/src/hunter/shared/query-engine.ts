// PORTED FROM fork-v143 live-tree/graph-intelligence/ (extraction chain / query-engine) — verbatim; SEAM: import path rewrites to ported siblings.
import { type SQLQueryBindings, Database } from 'bun:sqlite';
import type { DbClient } from './db.ts';

export interface TypedNodeRow {
  id: number;
  canonical_id: string;
  kind: string;
  label: string;
  file: string | null;
  line: number | null;
  created_run: string;
  superseded_run: string | null;
}

export interface TypedEdgeRow {
  id: number;
  src_canonical: string;
  dst_canonical: string;
  predicate: string;
  // ★ R15 FIX: the mappers emit null for a missing evidence_quote (legacy rows) and
  //   silenced it with `as TypedEdgeRow` — callers trusting `string` hit null at
  //   runtime. The interface now says what the mapper does. confidence/created_run
  //   keep their legacy-row defaults (1 / '') — the DDL says NOT NULL, so a row that
  //   needs either default is a legacy shape, never a fresh write.
  evidence_quote: string | null;
  confidence: number;
  created_run: string;
  superseded_run: string | null;
}

export interface ResolutionRow {
  alias: string;
  canonical_id: string;
  verdict: string;
  reasoning: string;
  created_run: string;
}

export interface GraphFactRow {
  id: number;
  subject: string;
  predicate: string;
  object: string;
  evidence: string;
  confidence: number;
  created_at: number;
  superseded_at: number | null;
}

export interface VectorProvider {
  search(query: string, opts?: { topK?: number }): Promise<Array<{ canonical_id: string; score: number }>>;
}

export interface PathOptions {
  maxDepth?: number;
  predicateFilter?: string[];
  liveOnly?: boolean;
}

export interface CommunityResult {
  componentId: number;
  members: string[];
}

export interface TemporalFilter {
  createdRun?: string;
  supersededRun?: string | null;
  liveOnly?: boolean;
}

const PATH_DEPTH_DEFAULT = 16;
const PATH_DEPTH_MIN = 1;
const PATH_DEPTH_MAX = 64;
const VECTOR_TOPK_DEFAULT = 10;
const VECTOR_TOPK_MIN = 1;
const VECTOR_TOPK_MAX = 100;
function clampDepth(d: number | undefined): number {
  if (d === undefined || d === null) return PATH_DEPTH_DEFAULT;
  if (!Number.isFinite(d)) throw new Error(`PATH_BOUNDED: maxDepth must be finite, got ${String(d)}`);
  const n = Math.floor(d);
  if (n < PATH_DEPTH_MIN) throw new Error(`PATH_BOUNDED: maxDepth must be >=${PATH_DEPTH_MIN}, got ${n}`);
  if (n > PATH_DEPTH_MAX) throw new Error(`PATH_BOUNDED: maxDepth ${n} exceeds max ${PATH_DEPTH_MAX} (MC-B-06)`);
  return n;
}

function dbHandle(db: Database | DbClient): Database {
  if (db instanceof Database) return db;
  const maybe = db as unknown as { handle?: Database };
  if (maybe.handle instanceof Database) return maybe.handle;
  const anyDb = db as unknown as { prepare: (sql: string) => unknown; exec: (sql: string) => unknown };
  if (typeof anyDb.prepare === 'function' && typeof anyDb.exec === 'function') {
    return db as unknown as Database;
  }
  throw new Error('QUERY_ENGINE_BAD_HANDLE: expected Database or DbClient');
}

/**
 * ★ R19-HIGH FIX (2026-09-25): THE EDGE ROW MAPPER — ONE definition, two callers.
 *   The EDGE_ROW_SHAPE validation and the row→TypedEdgeRow mapping were copy-pasted VERBATIM in
 *   buildPathEdges and temporal() (the reviewer flagged both). Duplicated validation is the defect
 *   class itself, not a style issue: two copies of a shape check drift, and the day one gains a
 *   field or tightens a predicate the other silently keeps the old contract — so two read paths
 *   into the SAME table disagree about what a well-formed row is. Extracted here; both callers
 *   reference it, so the contract has exactly one home.
 */
function mapEdgeRow(r: Record<string, unknown>): TypedEdgeRow {
  if (typeof r.id !== 'number' || typeof r.src_canonical !== 'string' || typeof r.dst_canonical !== 'string' || typeof r.predicate !== 'string') {
    throw new Error(`EDGE_ROW_SHAPE: the typed_edges row ${JSON.stringify(r).slice(0, 120)} is missing id/src_canonical/dst_canonical/predicate`);
  }
  return {
    id: r.id,
    src_canonical: r.src_canonical,
    dst_canonical: r.dst_canonical,
    predicate: r.predicate,
    evidence_quote: typeof r.evidence_quote === 'string' ? r.evidence_quote : null,
    confidence: typeof r.confidence === 'number' ? r.confidence : 1,
    created_run: typeof r.created_run === 'string' ? r.created_run : '',
    superseded_run: typeof r.superseded_run === 'string' ? r.superseded_run : null,
  } as TypedEdgeRow;
}

/**
 * ★ R19-HIGH FIX (2026-09-25): THE TEMPORAL FILTER BUILDER — ONE definition for both legs.
 *   The createdRun / liveOnly / supersededRun clause construction was duplicated for typed_nodes
 *   and typed_edges, and THE DRIFT WAS ALREADY THERE: the node leg VALIDATED createdRun (a
 *   non-empty string, else TEMPORAL_INVALID) while the edge leg reached it through
 *   `filter.createdRun!` — a NON-NULL ASSERTION standing where a check belongs. One leg refused
 *   the malformed input and the other trusted it, on the same request. The builder owns the
 *   validation and both legs consume it, so the two read paths cannot disagree about what a
 *   well-formed temporal filter is. The WHERE fragments are column-named identically in both
 *   tables, which is why one builder serves both.
 */
function buildTemporalFilter(filter: { createdRun?: string; liveOnly?: boolean; supersededRun?: string | null }): { clauses: string; params: unknown[] } {
  let clauses = '';
  const params: unknown[] = [];
  if (filter.createdRun !== undefined) {
    if (typeof filter.createdRun !== 'string' || filter.createdRun.trim().length === 0) throw new Error('TEMPORAL_INVALID: createdRun must be non-empty string');
    clauses += ' AND created_run = ?';
    params.push(filter.createdRun.trim());
  }
  if (filter.liveOnly) clauses += ' AND superseded_run IS NULL';
  else if (filter.supersededRun !== undefined) {
    if (filter.supersededRun === null) clauses += ' AND superseded_run IS NULL';
    else {
      if (typeof filter.supersededRun !== 'string') throw new Error('TEMPORAL_INVALID: supersededRun must be string or null');
      clauses += ' AND superseded_run = ?';
      params.push(filter.supersededRun);
    }
  }
  return { clauses, params };
}

export class QueryEngine {
  private readonly db: Database;
  private readonly vectorProvider: VectorProvider | null;

  constructor(db: Database | DbClient, vectorProvider?: VectorProvider | null) {
    this.db = dbHandle(db);
    this.vectorProvider = vectorProvider ?? null;
  }

  entity(canonicalId: string): TypedNodeRow | null {
    if (typeof canonicalId !== 'string' || canonicalId.trim().length === 0) {
      throw new Error('ENTITY_INVALID: canonicalId must be non-empty string');
    }
    try {
      const row = this.db.prepare('SELECT id, canonical_id, kind, label, file, line, created_run, superseded_run FROM typed_nodes WHERE canonical_id = ? LIMIT 1').get(canonicalId.trim()) as TypedNodeRow | null | undefined;
      return row ?? null;
    } catch (e: unknown) {
      throw new Error(`ENTITY_QUERY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  entityLive(canonicalId: string): TypedNodeRow | null {
    if (typeof canonicalId !== 'string' || canonicalId.trim().length === 0) {
      throw new Error('ENTITY_INVALID: canonicalId must be non-empty string');
    }
    try {
      const row = this.db.prepare('SELECT id, canonical_id, kind, label, file, line, created_run, superseded_run FROM typed_nodes WHERE canonical_id = ? AND superseded_run IS NULL LIMIT 1').get(canonicalId.trim()) as TypedNodeRow | null | undefined;
      return row ?? null;
    } catch (e: unknown) {
      throw new Error(`ENTITY_QUERY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  path(from: string, to: string, opts?: PathOptions): TypedEdgeRow[] {
    if (typeof from !== 'string' || from.trim().length === 0) throw new Error('PATH_INVALID: from must be non-empty string');
    if (typeof to !== 'string' || to.trim().length === 0) throw new Error('PATH_INVALID: to must be non-empty string');
    const maxDepth = clampDepth(opts?.maxDepth);
    const liveOnly = opts?.liveOnly !== false;
    const predicateFilter = opts?.predicateFilter;
    if (predicateFilter !== undefined && !Array.isArray(predicateFilter)) throw new Error('PATH_INVALID: predicateFilter must be array');
    try {
      // ★ F-71 FIX (2026-09-24): the recursive CTE ran a FULL shortest-path search whose only
      //   consumer was the null check below — then buildPathEdges re-ran the same search (2x
      //   traversal per path() call). The CTE is removed; the BFS below is the single search
      //   and its [] is the authoritative no-path answer (the old return was ALWAYS the BFS
      //   result anyway — the probe only gated the early []).
      return this.buildPathEdges(from.trim(), to.trim(), maxDepth, liveOnly, predicateFilter);
    } catch (e: unknown) {
      if (e instanceof Error && e.message.startsWith('PATH_')) throw e;
      throw new Error(`PATH_QUERY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private buildPathEdges(from: string, to: string, maxDepth: number, liveOnly: boolean, predicateFilter?: string[]): TypedEdgeRow[] {
    // ★ F-431 FIX (2026-09-24, run-8 CRITICAL): the from === to DEGENERATE CASE.
    //   The BFS seeds `queue = [from]` but `cameFrom` is only written for SUCCESSORS, so the
    //   guard `node === to && cameFrom.has(to)` is always FALSE on the first iteration — the
    //   start node is never recognised as the target. The walk then explores neighbours and
    //   returns a CYCLE (A→B→A) where the semantically correct answer is the EMPTY path (a
    //   node reaches itself in zero edges, and findPath(A,A) must not manufacture a loop).
    if (from === to) return [];
    const liveClause = liveOnly ? 'AND superseded_run IS NULL' : '';
    const predList = predicateFilter && predicateFilter.length > 0 ? predicateFilter : null;
    // ★ F-72 FIX (2026-09-24): every queue entry carried a full path copy ([...cur.path, e]) —
    //   O(depth) memory per frontier node on dense graphs. Parent pointers (edge + depth per
    //   node) make the frontier O(1) per node; the path is reconstructed once at the target.
    const visited = new Set<string>([from]);
    const depthOf = new Map<string, number>([[from, 0]]);
    const cameFrom = new Map<string, { prev: string; edge: TypedEdgeRow }>();
    const queue: string[] = [from];
    let head = 0;
    const buildPath = (target: string): TypedEdgeRow[] => {
      const rev: TypedEdgeRow[] = [];
      let n = target;
      while (n !== from) {
        const c = cameFrom.get(n);
        if (!c) return [];
        rev.push(c.edge);
        n = c.prev;
      }
      return rev.reverse();
    };
    while (head < queue.length) {
      const node = queue[head++];
      const depth = depthOf.get(node) ?? 0;
      if (depth > maxDepth) continue;
      if (node === to && cameFrom.has(to)) return buildPath(to);
      const sql = `SELECT id, src_canonical, dst_canonical, predicate, evidence_quote, confidence, created_run, superseded_run FROM typed_edges WHERE src_canonical = ? ${liveClause} ${predList ? `AND predicate IN (${predList.map(() => '?').join(',')})` : ''}`;
      const params: unknown[] = [node, ...(predList ?? [])];
      let edges: TypedEdgeRow[] = [];
      try {
        const rows = this.db.prepare(sql).all(...(params as SQLQueryBindings[])) as Record<string, unknown>[];
        // THE ROW MAPPER (the ISE discipline — a runtime shape check, not a
        // blind cast): each SQL row is validated for the typed-edge required
        // fields before the typed shape is built. A malformed row yields a
        // LOUD ROW_SHAPE error, never a silent undefined-field propagation.
        edges = rows.map(mapEdgeRow);
      } catch (e: unknown) {
        throw new Error(`PATH_QUERY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
      }
      for (const e of edges) {
        if (visited.has(e.dst_canonical) && e.dst_canonical !== to) continue;
        if (depth + 1 > maxDepth) continue;
        if (e.dst_canonical === to) {
          if (!cameFrom.has(to)) cameFrom.set(to, { prev: node, edge: e });
          return buildPath(to);
        }
        if (!visited.has(e.dst_canonical)) {
          visited.add(e.dst_canonical);
          depthOf.set(e.dst_canonical, depth + 1);
          cameFrom.set(e.dst_canonical, { prev: node, edge: e });
          queue.push(e.dst_canonical);
        }
      }
    }
    return [];
  }

  community(): CommunityResult[] {
    try {
      // ★ F-42 FIX (2026-09-24): fail-loud cap — the full-graph BFS is O(V+E) in
      //   memory. Production stores are ~50K edges (fine); past 500K the old code
      //   OOM-crashed silently. Now a loud named error names the scale instead.
      const edgeCountRow = this.db.prepare('SELECT COUNT(*) AS c FROM typed_edges WHERE superseded_run IS NULL').get() as Record<string, unknown> | null | undefined;
      const edgeCount = edgeCountRow?.['c'];
      // ★ F-446 FIX (2026-09-24): a NULL or non-number COUNT SILENTLY SKIPPED the cap —
      //   `typeof null === 'object'`, so an empty/unmigrated table (COUNT returns 0 as a
      //   number, but a schema mismatch can return null) bypassed the guard entirely and
      //   the O(V+E) BFS ran unbounded. Only a REAL number may pass; anything else is the
      //   fail-loud path (the cap is a memory guard — an unreadable count is not a licence
      //   to skip it).
      if (typeof edgeCount !== 'number' || !Number.isFinite(edgeCount)) {
        throw new Error(`COMMUNITY_UNMEASURABLE: the typed_edges count read back as ${JSON.stringify(edgeCount)} (not a finite number) — refusing to run an unbounded in-memory BFS`);
      }
      if (edgeCount > 500000) throw new Error(`COMMUNITY_TOO_LARGE: edges=${edgeCount} exceeds the 500000 in-memory BFS cap (page by predicate or raise the cap deliberately)`);
      // ★ R20-HIGH FIX (2026-09-25): the cap checked EDGES only — a store with few edges but
      //   millions of NODES still built an O(V) adjacency map + a full visited set, so the memory
      //   guard was one-sided. Cap nodes too, with the same fail-loud discipline.
      const nodeCountRow = this.db.prepare('SELECT COUNT(*) AS c FROM typed_nodes WHERE superseded_run IS NULL').get() as Record<string, unknown> | null | undefined;
      const nodeCount = nodeCountRow?.['c'];
      if (typeof nodeCount !== 'number' || !Number.isFinite(nodeCount)) {
        throw new Error(`COMMUNITY_UNMEASURABLE: the typed_nodes count read back as ${JSON.stringify(nodeCount)} (not a finite number) — refusing to run an unbounded in-memory BFS`);
      }
      if (nodeCount > 500000) throw new Error(`COMMUNITY_TOO_LARGE: nodes=${nodeCount} exceeds the 500000 in-memory BFS cap (page by predicate or raise the cap deliberately)`);
      const edges = this.db.prepare('SELECT src_canonical, dst_canonical FROM typed_edges WHERE superseded_run IS NULL').all() as Array<{ src_canonical: string; dst_canonical: string }>;
      const nodes = this.db.prepare('SELECT canonical_id FROM typed_nodes WHERE superseded_run IS NULL').all() as Array<{ canonical_id: string }>;
      const adj = new Map<string, Set<string>>();
      for (const n of nodes) adj.set(n.canonical_id, new Set());
      for (const e of edges) {
        if (!adj.has(e.src_canonical)) adj.set(e.src_canonical, new Set());
        if (!adj.has(e.dst_canonical)) adj.set(e.dst_canonical, new Set());
        adj.get(e.src_canonical)!.add(e.dst_canonical);
        adj.get(e.dst_canonical)!.add(e.src_canonical);
      }
      const visited = new Set<string>();
      const components: CommunityResult[] = [];
      let cid = 0;
      for (const node of adj.keys()) {
        if (visited.has(node)) continue;
        const members: string[] = [];
        const q: string[] = [node];
        visited.add(node);
        let qi = 0;
        while (qi < q.length) {
          const cur = q[qi++];
          members.push(cur);
          const neigh = adj.get(cur);
          if (!neigh) continue;
          for (const nb of neigh) {
            if (!visited.has(nb)) {
              visited.add(nb);
              q.push(nb);
            }
          }
        }
        components.push({ componentId: cid++, members: members.sort() });
      }
      return components.sort((a, b) => a.componentId - b.componentId);
    } catch (e: unknown) {
      // ★ R15 FIX: preserve the fail-loud guards the way path()/temporal() do — the
      //   unconditional wrap turned COMMUNITY_TOO_LARGE/_UNMEASURABLE into
      //   COMMUNITY_QUERY_FAILED: COMMUNITY_TOO_LARGE: ... (obscured guard, broken prefix matchers).
      if (e instanceof Error && e.message.startsWith('COMMUNITY_')) throw e;
      throw new Error(`COMMUNITY_QUERY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  temporal(filter: TemporalFilter): { nodes: TypedNodeRow[]; edges: TypedEdgeRow[] } {
    if (!filter || typeof filter !== 'object') throw new Error('TEMPORAL_INVALID: filter must be object');
    try {
      let nodeSql = 'SELECT id, canonical_id, kind, label, file, line, created_run, superseded_run FROM typed_nodes WHERE 1=1';
      const nodeParams: unknown[] = [];
      const nodeFilter = buildTemporalFilter(filter);
      nodeSql += nodeFilter.clauses;
      nodeParams.push(...nodeFilter.params);
      const nodeRows = this.db.prepare(nodeSql).all(...(nodeParams as SQLQueryBindings[])) as Record<string, unknown>[];
      // THE NODE ROW MAPPER (the ISE discipline — a runtime shape check, not a
      // blind cast): each typed_nodes row is validated for the required fields.
      const nodes = nodeRows.map((r) => {
        if (typeof r.id !== 'number' || typeof r.canonical_id !== 'string' || typeof r.kind !== 'string' || typeof r.label !== 'string') {
          throw new Error(`NODE_ROW_SHAPE: the typed_nodes row ${JSON.stringify(r).slice(0, 120)} is missing id/canonical_id/kind/label`);
        }
        return {
          id: r.id,
          canonical_id: r.canonical_id,
          kind: r.kind,
          label: r.label,
          file: typeof r.file === 'string' ? r.file : null,
          line: typeof r.line === 'number' ? r.line : null,
          created_run: typeof r.created_run === 'string' ? r.created_run : '',
          superseded_run: typeof r.superseded_run === 'string' ? r.superseded_run : null,
        } as TypedNodeRow;
      });
      let edgeSql = 'SELECT id, src_canonical, dst_canonical, predicate, evidence_quote, confidence, created_run, superseded_run FROM typed_edges WHERE 1=1';
      const edgeParams: unknown[] = [];
      // ★ R19-HIGH: the EDGE leg now consumes the SAME builder — the drift it carried (a `!`
      //   assertion where the node leg had a check, and NO string validation on supersededRun)
      //   is not possible through one definition. A malformed filter refuses on BOTH legs.
      const edgeFilter = buildTemporalFilter(filter);
      edgeSql += edgeFilter.clauses;
      edgeParams.push(...edgeFilter.params);
      const edgeRows = this.db.prepare(edgeSql).all(...(edgeParams as SQLQueryBindings[])) as Record<string, unknown>[];
      // THE EDGE ROW MAPPER (the ISE discipline — a runtime shape check, not a
      // blind cast): each typed_edges row is validated for the required fields.
      const edges = edgeRows.map(mapEdgeRow);
      return { nodes, edges };
    } catch (e: unknown) {
      if (e instanceof Error && e.message.startsWith('TEMPORAL_')) throw e;
      throw new Error(`TEMPORAL_QUERY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async vector(query: string, opts?: { topK?: number }): Promise<Array<{ canonical_id: string; score: number }>> {
    if (typeof query !== 'string' || query.trim().length === 0) throw new Error('VECTOR_INVALID: query must be non-empty string');
    const topK = opts?.topK ?? VECTOR_TOPK_DEFAULT;
    if (!Number.isInteger(topK) || topK < VECTOR_TOPK_MIN || topK > VECTOR_TOPK_MAX) throw new Error(`VECTOR_INVALID: topK must be integer ${VECTOR_TOPK_MIN}..${VECTOR_TOPK_MAX}`);
    if (this.vectorProvider) {
      try {
        return await this.vectorProvider.search(query.trim(), { topK });
      } catch (e: unknown) {
        throw new Error(`VECTOR_PROVIDER_FAILED: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    try {
      // ★ F-942 FIX (2026-09-24): escape LIKE wildcards — unescaped `%`/`_`
      //   widened matches silently (`a_b` matched `axb`). Backslash first (it
      //   is the ESCAPE char); the value still rides a bound parameter.
      const escaped = query.trim().replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
      const like = `%${escaped}%`;
      const rows = this.db.prepare("SELECT canonical_id, label FROM typed_nodes WHERE superseded_run IS NULL AND (label LIKE ? ESCAPE '\\' OR canonical_id LIKE ? ESCAPE '\\' OR kind LIKE ? ESCAPE '\\') LIMIT ?").all(like, like, like, topK) as Array<{ canonical_id: string; label: string }>;
      // ★ F-445 FIX (2026-09-24): the rank-decay score went NEGATIVE past index 20
      //   (`1 - i*0.05`) while VECTOR_TOPK_MAX is 100 — consumers expecting [0,1] got
      //   values near -3.95. Clamp to the documented [0,1] band.
      return rows.map((r, i) => ({ canonical_id: r.canonical_id, score: Math.max(0, Math.min(1, 1 - i * 0.05)) }));
    } catch (e: unknown) {
      throw new Error(`VECTOR_QUERY_FAILED: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
