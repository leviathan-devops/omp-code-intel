// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/graph/corbell-adapter.ts:604-615 (the corbell schema walk: data['line'] -> data['line_start'] -> data['line_end']) + /home/leviathan/aether/src/hydra/graph-mapper.ts node source_location L-number locus (fixture graph.json: nodes carry source_location "L1"/"L2"; edges carry source_location + metadata.line).
// src/hunter/shared/line-resolve.ts
// THE SHARED LINE RESOLVER (W3, EN-002 fix) — the ONE function BOTH map paths
// (corbell + graphify) use to resolve a 1-indexed file line. The port crossed
// two independently-authored contracts (the corbell METHOD store rows with
// line_start/line_end and NEVER line; the graphify graph.json rows with the
// source_location L-number locus) and nobody reconciled them at the boundary —
// the engine's findings REQUIRE file:line triplets (FINDING_NO_TRIPLET when the
// evidence is absent; the calibration FIRE test matches findings within ±2 of
// the recorded violation line), so a node that arrives line-less dies silently
// downstream. This module is the reconciliation: a single walk, a single
// named refusal, consumed by both adapters' map paths (the map.ts graphify
// branch calls the loud form; the corbell store read keeps its own inline
// walk for byte-stability and is covered by the same unit battery).
//
// THE WALK (ordered, first finite >= 1 wins):
//   node line -> data.line -> data.line_start -> data.line_end ->
//   node/data source_location L-number -> edge source_location L-number ->
//   edge metadata.line.
// STILL NONE -> the named LINELESS_NODE refusal (a scan-phase Error whose
// message leads with the token + names the node id; the micro-loop's onError
// routes the fail-state INCONCLUSIVE — never a silent drop, never a throw
// past the tool boundary, never a synthesized 0).

/** The silent walk: the first finite >= 1 line in the precedence chain, or undefined. Never throws. */
export function tryResolveLine(
  node: { line?: unknown; data?: Record<string, unknown>; source_location?: unknown } | null | undefined,
  edge?: { source_location?: unknown; metadata?: unknown } | null,
): number | undefined {
  // ★ W16-HIGH FIX: null guard — a null/undefined node threw TypeError off the
  //   `node.data` read, escaping as an unrouted exception instead of the named
  //   LINELESS_NODE refusal. Null node: no node candidates, edge-only walk still runs.
  const obj = node !== null && typeof node === 'object' ? node : undefined;
  const data = obj?.data ?? {};
  const candidates: unknown[] = [
    obj?.line,
    data["line"],
    data["line_start"],
    data["line_end"],
    obj?.source_location,
    data["source_location"],
    edge?.source_location,
    (edge?.metadata as Record<string, unknown> | undefined)?.["line"],
  ];
  for (const c of candidates) {
    const n = parseLineValue(c);
    if (n !== undefined) return n;
  }
  return undefined;
}

/** The loud resolution: the walked line, or the named LINELESS_NODE refusal. */
export function resolveLine(
  node: { line?: unknown; data?: Record<string, unknown>; source_location?: unknown },
  edge?: { source_location?: unknown; metadata?: unknown } | null,
  context = "",
): number {
  const n = tryResolveLine(node, edge);
  if (n !== undefined) return n;
  const who = context && context.length > 0 ? context : "graph node";
  throw new Error(
    `LINELESS_NODE: no line for ${who} (checked line/line_start/line_end/source_location)`,
  );
}

/** The named-error factory — the same refusal as an Error value (for guards that build before throwing). */
export function linelessNode(context: string): Error {
  const who = context && context.length > 0 ? context : "graph node";
  return new Error(
    `LINELESS_NODE: no line for ${who} (checked line/line_start/line_end/source_location)`,
  );
}

function parseLineValue(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v) && v >= 1) return Math.floor(v);
  if (typeof v === "string") {
    // ★ F-32 FIX (2026-09-24): the unanchored /L?\s*(\d+)/ matched embedded digits
    //   ("node42component" → 42, "file-v3-path" → 3). The locus is a bare L-number
    //   ("L12", "12") — anchor whole-string so non-loci fall through to the loud
    //   LINELESS_NODE refusal instead of a fabricated line.
    const m = /^\s*L?\s*(\d+)\s*$/.exec(v);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 1) return Math.floor(n);
    }
  }
  return undefined;
}
