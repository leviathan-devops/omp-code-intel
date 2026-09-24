// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/harness/map.ts:216-254 (LEGACY path only).
// SEAMS: profile-schema -> ../profile/schema.ts (REAL); db
// (openStore/writeGraph/mirrorToMasterContext/DbClient) -> ../shared/db.ts
// (REAL whole-fork-db port); graph selectAdapter/GraphAdapter/BuildResult ->
// ../graph/interface.ts (REAL ported sibling); line resolveLine ->
// ../shared/line-resolve.ts (REAL shared sibling, W3 EN-002 fix).
// DEVIATION (named): the fork's corbell build path + additive SRO typed-graph
// population (populateTypedGraph: typescript program + mechanical/merge/resolver
// extraction + tridentLog/utils.js) is NOT ported — that corbell build path is
// another agent's port (OmpCorbellPort). This map.ts carries the LEGACY path:
// selectAdapter -> adapter.build -> LINELESS guard -> writeGraph ->
// mirrorToMasterContext. The graphify case rides the SAME shape (the routed
// adapter from selectAdapter — corbell or graphify — builds; the guard +
// persist + mirror are substrate-blind). The sroError field is preserved on
// MapResult (absent = clean) for forward compat.
import path from 'node:path';
import type { ProjectProfile } from '../profile/schema.ts';
import type { DbClient } from '../shared/db.ts';
import { openStore, writeGraph, mirrorToMasterContext } from '../shared/db.ts';
import { selectAdapter, type GraphAdapter, type BuildResult } from '../graph/interface.ts';
import { resolveLine } from '../shared/line-resolve.ts';

/** The MAP actor's output — the built graph surface the scan state consumes. */
export interface MapResult {
  adapter: GraphAdapter;
  buildResult: BuildResult;
  db: DbClient;
  dbPath: string;
  mirrorPath: string;
  /** PRESENT when the additive typed-graph population failed — the failure
   *  rides the result (SC-16), never console-only. Absent = population clean.
   *  PENDING (corbell-path wave): the SRO population is not run in this port,
   *  so this field is absent unless a future wave sets it. */
  sroError?: string;
}

/** THE MAP ACTOR — build + LINELESS guard + persist + mirror. Throws
 *  ADAPTER_FAILED / GRAPH_EMPTY / LINELESS_NODE / MIRROR_WRITE_FAILED — the
 *  micro-loop's onError routes the fail-state INCONCLUSIVE (O3.5).
 *
 *  THE GRAPHIFY CASE (W4, same shape as the corbell path): the adapter arrives
 *  ROUTED (selectAdapter's graphify branch -> GraphifyAdapter.read, or the
 *  test's adapterOverride) — this actor never branches on substrate. build ->
 *  the LINELESS guard (below) -> writeGraph -> mirrorToMasterContext. */
export async function map(profile: ProjectProfile, adapterOverride?: GraphAdapter): Promise<MapResult> {
  const adapter = adapterOverride ?? selectAdapter(profile);
  const buildResult = await adapter.build(profile);
  // THE LINELESS GUARD (W3, EN-002 fix — the scan-phase named refusal): every
  // CODE node (method/function/class — the predicate targets) MUST carry a
  // finite line after the shared resolveLine() walk (node line ??
  // data.line/line_start/line_end ?? node/edge source_location ?? edge
  // metadata.line). A code node with NO line anywhere is the named
  // LINELESS_NODE refusal — never a silent drop (the old line-0 class), never
  // a throw past the tool boundary (the micro-loop routes INCONCLUSIVE).
  // file/module nodes carry a file anchor with no single line — exempt by
  // kind. SPEC_DERIVED stage/rule nodes carry a corpus anchor — exempt by
  // lineage (the interface.ts contract).
  assertMappableLines(buildResult);
  const dbPath = path.join(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
  const db: DbClient = openStore(dbPath);

  try {
    writeGraph(db, buildResult.nodes, buildResult.edges);
    const mirrorPath = mirrorToMasterContext(db, profile);
    return { adapter, buildResult, db, dbPath, mirrorPath };
  } catch (e: unknown) {
    // DISPOSITION: PROPAGATED — writeGraph/mirror failure closes the db and
    // rethrows; the micro-loop routes the fail-state INCONCLUSIVE (O3.5).
    try { db.close(); } catch { /* the idempotent close */ }
    throw e;
  }
}

/** Lineless-exempt kinds (static lookup): file/module anchors + SPEC_DERIVED
 *  stage/rule corpus anchors (the interface.ts contract). */
const LINELESS_EXEMPT_KIND: Record<string, true> = {
  file: true,
  module: true,
  stage: true,
  rule: true,
};

/** THE SCAN-PHASE NAMED REFUSAL — every non-exempt node without a resolvable
 *  line refuses NAMED (LINELESS_NODE + the node id), never silently dropped.
 *  EXEMPT: SPEC_DERIVED lineage (corpus anchors), file/module/stage/rule
 *  kinds (file anchors with no single line), and file-less nodes (the
 *  §6.5 stub-adapter seam: file null/empty carries no anchor to resolve — the
 *  findings surface carries the file:line via unwired()/DeadNode, and the
 *  LINELESS_NODE battery covers the refusal on a NAMED file anchor). */
export function assertMappableLines(buildResult: BuildResult): void {
  const edgeLocByTarget: Record<string, { source_location?: unknown; metadata?: unknown }> = {};
  for (const e of buildResult.edges) {
    if (edgeLocByTarget[e.targetId] === undefined) {
      const rec = e as unknown as Record<string, unknown>;
      edgeLocByTarget[e.targetId] = { source_location: rec['source_location'], metadata: rec['metadata'] };
    }
  }
  for (const n of buildResult.nodes) {
    if (n.lineage === 'SPEC_DERIVED') continue;
    if (LINELESS_EXEMPT_KIND[n.kind] === true) continue;
    if (typeof n.file !== 'string' || n.file.length === 0) continue;
    const data = (n.data ?? {}) as Record<string, unknown>;
    resolveLine(
      { line: n.line ?? undefined, data, source_location: data['source_location'] },
      edgeLocByTarget[n.id] ?? null,
      n.id,
    );
  }
}
