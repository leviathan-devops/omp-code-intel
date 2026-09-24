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
      const hits = symbols.filter((s) => (s.name ?? "").includes(subject));
      return hits.map((s) => ({
        consumer: "L4_C2KG" as const,
        rung: "context" as const,
        subject,
        value: { kind: s.kind, file: s.file, line: s.line },
        source: `${indexPath}#symbols(${s.file ?? "?"}:${s.line ?? "?"})`,
      }));
    },
  };
}
