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
  // ★ F-29 FIX (2026-09-24): scopeRoot reaches the fs — canonical absolute form only (`..` segments would let `/allowed/../../etc` escape the intended tree; path.join normalizes them away silently).
  if (!path.isAbsolute(scopeRoot) || scopeRoot.split(path.sep).includes("..")) throw new Error(`GI_LAYER_UA: scopeRoot must be a canonical absolute path, got ${JSON.stringify(scopeRoot)}`);
  const graphPath = path.join(path.resolve(scopeRoot), ".ua/knowledge-graph.json");
  return {
    id: "L3_UA",
    rung: "context",
    dependency: "the understand-anything graph (.ua/knowledge-graph.json)",
    errorCode: "GI_LAYER_UA",
    up: () => probePath(graphPath, true),
    facts: (subject: string): LayerFact[] => {
      // ★ F-30 FIX (2026-09-24): existsSync-then-read is a TOCTOU pair — read directly, name the failure once.
      let raw: string;
      try {
        raw = fs.readFileSync(graphPath, "utf8");
      } catch (e) {
        throw new Error(`GI_LAYER_UA: the knowledge graph is absent/unreadable at ${graphPath} — ${(e as NodeJS.ErrnoException).code ?? (e instanceof Error ? e.message.slice(0, 80) : String(e))}`);
      }
      let g: UaGraph;
      try {
        g = JSON.parse(raw) as UaGraph;
      } catch (e) {
        throw new Error(`GI_LAYER_UA: the knowledge graph is unparseable — ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
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
