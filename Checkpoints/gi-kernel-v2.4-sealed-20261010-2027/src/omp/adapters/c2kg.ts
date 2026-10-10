// adapters/c2kg — ★ L4 C2KG → the CONTEXT rung.
//
// The code-to-knowledge-graph LSP index. ★ THE HONEST STATE (measured 2026-09-21):
// the register's own comment records that NOTHING on this host populates
// `<scopeRoot>/.c2kg/index.json` — "nothing named c2kg exists outside /tmp test
// fixtures". The path is CORRECT and the substrate is ABSENT. So this edge reports
// DOWN with the errno when absent, and contributes real facts when present.
// It NEVER fabricates a context fact to look green.
import * as fs from "node:fs";
import * as path from "node:path";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { probePath } from "./_shared.ts";

interface C2kgIndex {
  symbols?: Array<{ name?: string; file?: string; line?: number; kind?: string }>;
  // ★ AUDIT FIX (2026-10-03): declare the edge shape (was read via a runtime cast).
  edges?: Array<Record<string, unknown>>;
}

// ★ F8 FIX (2026-10-07, the red-team audit): the fact cap was a bare `50` in THREE places —
//   a magic number. Named once; the symbol branch, the edge branch, and the final result
//   all draw from it.
const C2KG_FACT_CAP = 50;

export function c2kgProbe(scopeRoot: string): ConsumerProbe {
  const indexPath = path.join(scopeRoot, ".c2kg/index.json");
  return {
    id: "L4_C2KG",
    rung: "context",
    dependency: "the code-to-knowledge-graph LSP index",
    errorCode: "GI_LAYER_C2KG",
    up: () => {
      // ★ F4 FIX (2026-10-07, the red-team audit): a SYMBOL LIST is not a GRAPH. The old
      //   `probePath(indexPath, true)` read UP on a 0-edge index — a file list wearing a
      //   graph's name. A context rung MUST carry RELATIONSHIPS; require edges > 0.
      const base = probePath(indexPath, true);
      if (!base.up) return base;
      try {
        const idx = JSON.parse(fs.readFileSync(indexPath, "utf8")) as C2kgIndex;
        const edges = Array.isArray(idx?.edges) ? idx.edges.length : 0;
        if (edges === 0) return { up: false, evidence: `${indexPath} — 0 edges (a symbol list is not a graph; run scripts/c2kg-produce/run.sh)` };
        return { up: true, evidence: `${indexPath} (${edges} edges)` };
      } catch {
        return { up: false, evidence: `${indexPath} — unparseable` };
      }
    },
    facts: (subject: string): LayerFact[] => {
      // ★ GATE M-5 FIXED: a substrate fault THROWS (GI_LAYER_DOWN), never []. This is the
      //   SAME class as the audit's H-2 — fixed in _shared.ts then, SWEPT to every adapter now.
      if (!fs.existsSync(indexPath)) {
        throw new Error(`GI_LAYER_C2KG: the index is absent at ${indexPath}`);
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(fs.readFileSync(indexPath, "utf8"));
      } catch (e) {
        throw new Error(`GI_LAYER_C2KG: the index is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
      // ★ AUDIT FIX (2026-10-03): a valid-JSON-but-non-object payload (`null` / `42` / `"x"` / `[]`)
      //   parsed to a non-object and then threw a raw TypeError at `idx.symbols` / `idx.edges`,
      //   bypassing the GI_LAYER_C2KG contract. Normalize any non-object shape to an empty index
      //   (zero facts) — the SAME class as F-346, one level up.
      const idx: C2kgIndex = typeof parsed === "object" && parsed !== null ? (parsed as C2kgIndex) : {};
      // ★ F-346 FIX (2026-09-24): idx.symbols is runtime-untrusted JSON — a non-array
      //   shape (string/number/object) threw raw TypeError at .filter, bypassing the
      //   GI_LAYER_C2KG contract. Array.isArray narrows; non-array reads as zero hits.
      const symbols = Array.isArray(idx.symbols) ? idx.symbols : [];
      // ★ F-815 FIX (2026-09-24): each symbol is runtime-untrusted JSON — a null /
      //   primitive row threw raw TypeError at s.name (bypassing the GI_LAYER_C2KG
      //   contract), and non-string kind/file or non-number line leaked into LayerFact.
      //   Guard per-row AND per-field; `??` alone only covers null/undefined.
      const hits = symbols.filter(
        (s) => typeof s === "object" && s !== null && typeof s.name === "string" && s.name.includes(subject),
      );
      // ★ AUDIT FIX (2026-10-03): cap BEFORE `.map` — an untrusted index with a large hit set
      //   materialized every row before the final `.slice(0,50)`. Matches the edge path.
      const symbolFacts: LayerFact[] = hits.slice(0, C2KG_FACT_CAP).map((s) => ({
        consumer: "L4_C2KG" as const,
        rung: "context" as const,
        subject,
        value: {
          kind: typeof s.kind === "string" ? s.kind : undefined,
          file: typeof s.file === "string" ? s.file : undefined,
          line: typeof s.line === "number" ? s.line : undefined,
        },
        source: `${indexPath}#symbols(${typeof s.file === "string" ? s.file : "?"}:${typeof s.line === "number" ? s.line : "?"})`,
      }));
      // ★ W3 FIX (2026-10-02): THE EDGE READ. The index was a symbol list with `edges: []` — a
      //   context rung that cannot say what references what. With edges present, a subject that
      //   participates in an edge yields that RELATIONSHIP as a context fact.
      const idxEdges = Array.isArray(idx.edges) ? idx.edges : [];
      const edgeFacts: LayerFact[] = idxEdges
        .filter((e) => typeof e === "object" && e !== null &&
          (String(e["src"] ?? "").includes(subject) || String(e["dst"] ?? "").includes(subject)))
        
        .slice(0, C2KG_FACT_CAP)
        .map((e) => ({
          consumer: "L4_C2KG" as const,
          rung: "context" as const,
          subject,
          // ★ AUDIT FIX (2026-10-03): narrow the runtime-untrusted edge fields (the symbol path
          //   already does) — raw `unknown` values are not a valid LayerFact payload.
          value: {
            src: typeof e["src"] === "string" ? e["src"] : undefined,
            predicate: typeof e["predicate"] === "string" ? e["predicate"] : undefined,
            dst: typeof e["dst"] === "string" ? e["dst"] : undefined,
            confidence: typeof e["confidence"] === "number" ? e["confidence"] : undefined,
          },
          source: `${indexPath}#edges(${String(e["src"] ?? "?")} ${String(e["predicate"] ?? "?")} ${String(e["dst"] ?? "?")})`,
        }));
      // ★ AUDIT FIX (2026-10-03): EDGES FIRST. `symbolFacts.concat(edgeFacts).slice(0,50)` let 50
      //   symbol matches starve every edge fact (the context rung's actual value). Edges lead.
      return edgeFacts.concat(symbolFacts).slice(0, C2KG_FACT_CAP);
    },
  };
}
