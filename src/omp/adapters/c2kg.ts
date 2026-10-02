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
}

export function c2kgProbe(scopeRoot: string): ConsumerProbe {
  const indexPath = path.join(scopeRoot, ".c2kg/index.json");
  return {
    id: "L4_C2KG",
    rung: "context",
    dependency: "the code-to-knowledge-graph LSP index",
    errorCode: "GI_LAYER_C2KG",
    up: () => probePath(indexPath, true),
    facts: (subject: string): LayerFact[] => {
      // ★ GATE M-5 FIXED: a substrate fault THROWS (GI_LAYER_DOWN), never []. This is the
      //   SAME class as the audit's H-2 — fixed in _shared.ts then, SWEPT to every adapter now.
      if (!fs.existsSync(indexPath)) {
        throw new Error(`GI_LAYER_C2KG: the index is absent at ${indexPath}`);
      }
      let idx: C2kgIndex;
      try {
        idx = JSON.parse(fs.readFileSync(indexPath, "utf8")) as C2kgIndex;
      } catch (e) {
        throw new Error(`GI_LAYER_C2KG: the index is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
      }
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
      const symbolFacts: LayerFact[] = hits.map((s) => ({
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
      const idxEdges = Array.isArray((idx as { edges?: unknown }).edges) ? (idx as { edges: Array<Record<string, unknown>> }).edges : [];
      const edgeFacts: LayerFact[] = idxEdges
        .filter((e) => typeof e === "object" && e !== null &&
          (String(e["src"] ?? "").includes(subject) || String(e["dst"] ?? "").includes(subject)))
        .slice(0, 50)
        .map((e) => ({
          consumer: "L4_C2KG" as const,
          rung: "context" as const,
          subject,
          value: { src: e["src"], predicate: e["predicate"], dst: e["dst"], confidence: e["confidence"] },
          source: `${indexPath}#edges(${String(e["src"] ?? "?")} ${String(e["predicate"] ?? "?")} ${String(e["dst"] ?? "?")})`,
        }));
      return symbolFacts.concat(edgeFacts).slice(0, 50);
    },
  };
}
