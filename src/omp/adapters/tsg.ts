// adapters/tsg — ★ TSG → the MEANING rung.
//
// The TypeSafe tsg load unit. ★ THE RUNG IS MEANING, NOT ENFORCEMENT: TSG answers
// what a symbol MEANS; it does not block. The substrate is the tsg repo/binary
// (the register's path), and the facts are its meaning verdicts.
import * as fs from "node:fs";
import * as path from "node:path";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { probePath } from "./_shared.ts";

export function tsgProbe(scopeRoot: string, tsgRoot?: string): ConsumerProbe {
  const root = tsgRoot ?? path.join(scopeRoot, "research/graph-infra-repos/typesafe-ai/examples/tsg");
  return {
    id: "TSG",
    rung: "meaning",
    dependency: "the tsg binary/repo — the load unit",
    errorCode: "GI_ENFORCE_TSG",
    up: () => probePath(root),
    // ★ THE MEANING SURFACE is the tsg runtime, reached by a separate client. Until
    // that client is wired this adapter reports zero facts — the honest state, never
    // a fabricated verdict.
    facts: (): LayerFact[] => [],
  };
}
