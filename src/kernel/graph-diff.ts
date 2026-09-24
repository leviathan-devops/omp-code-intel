// P2.1 (W5 gi-infra-diff): structural change verification — compare two graph
// states (before/after a code change) and report what changed STRUCTURALLY.
// The agent contract (GRAPH_BASED_STAIRSTEPPING_BIBLE §5): capture before,
// capture after, diff — edge loss = FAIL, new cycles = FAIL, unwired growth =
// WARN, everything else PASS with deltas named.
import * as path from "node:path";
import { openTypedStore } from "../omp/typed-write.ts";
import { CORBELL_PREDICATES } from "../omp/populate-corbell.ts";

export interface GraphSnapshot {
  nodes: number;
  edges: number;
  nodeKinds: Record<string, number>;
  edgePredicates: Record<string, number>;
  unwiredCount: number;
  topDegree: Array<{ label: string; inbound: number }>;
  cycleCount: number;
  /** ★ F-934 FIX (2026-09-24): the FULL inbound map by label. topDegree (top-5) is a
   *  lossy projection — diffing projections skipped nodes that surfaced into after.topDegree
   *  from below the before cutoff (the SILENT miss this fix closes). Optional so snapshots
   *  built by hand/tests without it still typecheck (diff falls back to topDegree). */
  inboundByLabel?: Record<string, number>;
}

export interface GraphDiffResult {
  nodesDelta: number;
  edgesDelta: number;
  unwiredDelta: number;
  newCycles: number;
  blastRadiusChanges: Array<{ label: string; before: number; after: number }>;
  verdict: "PASS" | "WARN" | "FAIL";
  details: string[];
}

// W44: derives from the corbell allowlist — the vocabulary has ONE source.
const PREDICATES: readonly string[] = CORBELL_PREDICATES;

/** Capture the structural fingerprint of a typed store. Reads LIVE rows only
 *  (superseded_run IS NULL). Tarjan-iterative SCC count for cycles. */
export function captureSnapshot(storePath: string): GraphSnapshot {
  const db = openTypedStore(storePath);
  try {
    const nodes = db.query(
      "SELECT canonical_id, label, kind FROM typed_nodes WHERE superseded_run IS NULL",
    ).all() as Array<{ canonical_id: string; label: string; kind: string | null }>;
    // ★ F-280 FIX (2026-09-24): parameterize the IN-list — `?` placeholders +
    //   bound values, never string-interpolated literals (a predicate carrying
    //   a quote could break/escape the SQL).
    const preds = [...PREDICATES];
    const edges = preds.length === 0 ? [] : db.query(
      `SELECT src_canonical, dst_canonical, predicate FROM typed_edges
       WHERE superseded_run IS NULL AND predicate IN (${preds.map(() => "?").join(", ")})`,
    ).all(...preds) as Array<{ src_canonical: string; dst_canonical: string; predicate: string }>;

    const nodeKinds: Record<string, number> = {};
    for (const n of nodes) {
      const k = n.kind ?? "unknown";
      nodeKinds[k] = (nodeKinds[k] ?? 0) + 1;
    }
    const edgePredicates: Record<string, number> = {};
    for (const e of edges) edgePredicates[e.predicate] = (edgePredicates[e.predicate] ?? 0) + 1;

    const inbound = new Map<string, number>();
    for (const e of edges) inbound.set(e.dst_canonical, (inbound.get(e.dst_canonical) ?? 0) + 1);
    // ★ F-934 FIX (2026-09-24): materialize the full label→inbound map beside the top-5
    //   projection (same label resolution as topDegree, so the two can never disagree).
    const inboundByLabel: Record<string, number> = {};
    for (const [cid, n] of inbound) {
      inboundByLabel[nodes.find((nn) => nn.canonical_id === cid)?.label ?? cid] = n;
    }
    const unwiredCount = nodes.filter((n) => (inbound.get(n.canonical_id) ?? 0) === 0).length;
    const topDegree = [...inbound.entries()]
      .map(([cid, inboundN]) => ({ label: nodes.find((n) => n.canonical_id === cid)?.label ?? cid, inbound: inboundN }))
      .sort((a, b) => b.inbound - a.inbound)
      .slice(0, 5);

    // Tarjan SCC (iterative) — an SCC with >1 member or a self-loop is a cycle.
    const adj = new Map<string, string[]>();
    for (const e of edges) adj.set(e.src_canonical, [...(adj.get(e.src_canonical) ?? []), e.dst_canonical]);
    const index = new Map<string, number>();
    const low = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    const sccs: string[][] = [];
    let counter = 0;
    const selfLoop = new Set(edges.filter((e) => e.src_canonical === e.dst_canonical).map((e) => e.src_canonical));
    for (const seed of nodes) {
      if (index.has(seed.canonical_id)) continue;
      const call: Array<{ id: string; it: number }> = [{ id: seed.canonical_id, it: 0 }];
      while (call.length > 0) {
        const top = call[call.length - 1]!;
        if (top.it === 0) {
          index.set(top.id, counter);
          low.set(top.id, counter);
          counter += 1;
          stack.push(top.id);
          onStack.add(top.id);
        }
        const nbs = adj.get(top.id) ?? [];
        if (top.it < nbs.length) {
          const nb = nbs[top.it++]!;
          if (!index.has(nb)) call.push({ id: nb, it: 0 });
          else if (onStack.has(nb)) low.set(top.id, Math.min(low.get(top.id)!, index.get(nb)!));
        } else {
          call.pop();
          if (call.length > 0) {
            const parent = call[call.length - 1]!;
            if (onStack.has(top.id)) low.set(parent.id, Math.min(low.get(parent.id)!, low.get(top.id)!));
          }
          if (low.get(top.id) === index.get(top.id)) {
            const comp: string[] = [];
            for (;;) {
              const w = stack.pop()!;
              onStack.delete(w);
              comp.push(w);
              if (w === top.id) break;
            }
            if (comp.length > 1 || (comp.length === 1 && selfLoop.has(comp[0]!))) sccs.push(comp);
          }
        }
      }
    }

    return {
      nodes: nodes.length,
      edges: edges.length,
      nodeKinds,
      edgePredicates,
      unwiredCount,
      topDegree,
      cycleCount: sccs.length,
      inboundByLabel,
    };
  } finally {
    db.close();
  }
}

/** Compare two snapshots. FAIL: edges lost or new cycles. WARN: unwired
 *  growth or a blast-radius jump (a node's inbound more than doubling).
 *  PASS otherwise — every delta is named in details regardless of verdict. */
export function diffGraphs(before: GraphSnapshot, after: GraphSnapshot): GraphDiffResult {
  const nodesDelta = after.nodes - before.nodes;
  const edgesDelta = after.edges - before.edges;
  const unwiredDelta = after.unwiredCount - before.unwiredCount;
  const newCycles = Math.max(0, after.cycleCount - before.cycleCount);

  // ★ F-934 FIX (2026-09-24): SILENT miss — beforeDeg covered only before.topDegree, so a
  //   node absent from the before top-5 (beforeDeg.get → undefined → skip) that surfaced into
  //   after.topDegree with a very high inbound — the most dramatic jump — went undetected.
  //   The full inboundByLabel map (when the snapshot carries it) makes the comparison
  //   complete; legacy snapshots without it fall back to topDegree with before=0 for a new
  //   entrant (an approximation, honestly recorded — the gate's jump budget still adjudicates
  //   whether it matters).
  const beforeFull: Record<string, number> = before.inboundByLabel
    ?? Object.fromEntries(before.topDegree.map((x) => [x.label, x.inbound]));
  const afterFull: Record<string, number> = after.inboundByLabel
    ?? Object.fromEntries(after.topDegree.map((x) => [x.label, x.inbound]));
  const blastRadiusChanges: GraphDiffResult["blastRadiusChanges"] = [];
  for (const [label, a] of Object.entries(afterFull)) {
    const b = beforeFull[label] ?? 0;
    if (a > b) blastRadiusChanges.push({ label, before: b, after: a });
  }

  const details: string[] = [];
  let verdict: GraphDiffResult["verdict"] = "PASS";
  if (edgesDelta < 0) {
    verdict = "FAIL";
    details.push(`BROKEN DEPENDENCY: ${-edgesDelta} edge(s) LOST (${before.edges} → ${after.edges})`);
  }
  if (newCycles > 0) {
    verdict = "FAIL";
    details.push(`CIRCULAR DEPENDENCY: ${newCycles} new cycle(s) (${before.cycleCount} → ${after.cycleCount})`);
  }
  if (unwiredDelta > 0 && verdict !== "FAIL") verdict = "WARN";
  // ★ F-405 FIX (2026-09-24): the JSDoc promises WARN on a blast-radius jump (inbound more
  // ★ than doubling) but jumps never touched the verdict — a tripled inbound stayed PASS.
  const blastJump = blastRadiusChanges.filter((b) => b.before >= 1 && b.after > 2 * b.before);
  if (blastJump.length > 0 && verdict !== "FAIL") verdict = "WARN";
  if (unwiredDelta !== 0) details.push(`unwired nodes: ${before.unwiredCount} → ${after.unwiredCount} (${unwiredDelta >= 0 ? "+" : ""}${unwiredDelta})`);
  for (const b of blastRadiusChanges) details.push(`blast radius: ${b.label} inbound ${b.before} → ${b.after}`);
  for (const b of blastJump) details.push(`BLAST RADIUS JUMP: ${b.label} inbound more than doubled (${b.before} → ${b.after})`);
  if (nodesDelta !== 0) details.push(`nodes: ${before.nodes} → ${after.nodes} (${nodesDelta >= 0 ? "+" : ""}${nodesDelta})`);
  if (details.length === 0) details.push("no structural change");
  return { nodesDelta, edgesDelta, unwiredDelta, newCycles, blastRadiusChanges, verdict, details };
}

/** Convenience: path join kept for future per-dir snapshots. */
export const snapshotStoreName = (storePath: string): string => path.basename(storePath);
