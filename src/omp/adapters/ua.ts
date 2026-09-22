// adapters/ua — ★ L3 UA → the CONTEXT rung.
//
// The understand-anything graph. ★ VERIFIED PATH (2026-09-21): UA's own persistence
// module writes `<projectRoot>/.ua/knowledge-graph.json` (resolveUaDir =
// join(projectRoot, ".ua")) — CORRECT PATH, ABSENT SUBSTRATE on this host.
import * as fs from "node:fs";
import * as path from "node:path";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { probePath } from "./_shared.ts";

interface UaGraph {
  nodes?: Array<{ id?: string; name?: string; file?: string; line?: number }>;
  edges?: Array<{ source?: string; target?: string; kind?: string }>;
}

export function uaProbe(scopeRoot: string): ConsumerProbe {
  const graphPath = path.join(scopeRoot, ".ua/knowledge-graph.json");
  return {
    id: "L3_UA",
    rung: "context",
    dependency: "the understand-anything graph (.ua/knowledge-graph.json)",
    errorCode: "GI_LAYER_UA",
    up: () => probePath(graphPath, true),
    facts: (subject: string): LayerFact[] => {
      if (!fs.existsSync(graphPath)) return [];
      let g: UaGraph;
      try {
        g = JSON.parse(fs.readFileSync(graphPath, "utf8")) as UaGraph;
      } catch {
        return [];
      }
      const hits = (g.nodes ?? []).filter((n) => (n.name ?? "").includes(subject) || (n.id ?? "").includes(subject));
      return hits.map((n) => ({
        consumer: "L3_UA" as const,
        rung: "context" as const,
        subject,
        value: { name: n.name, file: n.file, line: n.line },
        source: `${graphPath}#nodes(${n.file ?? "?"}:${n.line ?? "?"})`,
      }));
    },
  };
}
