// src/evidence.ts — the evidence ToolDefinition (W2-A).
//
// Reports the merkle evidence chain state. Reads the chain from disk FRESH
// inside execute (construct + explicit loadChain, then
// chainLength/lastHash/verify) — never trusts module-level memory, so a
// long-lived plugin process always reports the on-disk truth.
// Integrity false is a NORMAL result (the FALSE is the signal — loud, not
// thrown), per CONTRACTS-W2.

import path from "node:path";
import { z } from "zod";
import { tool } from "@mimo-ai/plugin";
import { EvidencePipeline } from "./merkle";
import type { Ctx } from "./types";

// zod is the args-DSL for every ToolDefinition in this repo (see
// src/edit.ts, src/ast.ts). This tool takes no arguments, so the raw shape
// stays exactly `args: {}` per CONTRACTS-W2; the import above keeps the
// file on the same convention (and types _args below if it ever grows).
void z;

export const evidenceTool = tool({
  description:
    "Report the merkle evidence chain state: entry count, last hash, and link integrity. Always reads the chain fresh from disk; integrity=false is a normal result, not an error.",
  args: {},
  async execute(_args, ctx: Ctx) {
    const dir =
      typeof ctx?.directory === "string" && ctx.directory.length > 0
        ? ctx.directory
        : process.cwd();
    const pipeline = new EvidencePipeline(path.join(dir, ".mimocode/omp-intel"));
    pipeline.loadChain();
    const chainLength = pipeline.chainLength();
    const lastHash = pipeline.lastHash();
    const integrity = pipeline.verify();
    return {
      output: `chain=${chainLength} last=${lastHash ?? "none"} integrity=${integrity}`,
      metadata: { chainLength, lastHash, integrity },
    };
  },
});
