// src/lsp/tool.ts — W4-A: the shadow `lsp` tool over the vendored client.
//
// Per-call lifecycle, no persistent server in v1 (cold start is acceptable
// and documented): spec match -> read file -> initialize -> didOpen -> one op
// -> shutdown (always, via finally). Routing order inside execute:
//   1. required-arg gates (`<op> requires <arg>` named rejections),
//   2. spec match (SC-16: EXACT `No LSP server available for <ext> files` +
//      metadata.error NO_LSP_SERVER — NO spawn attempted),
//   3. file read, then spawn (ENOENT -> same NO_LSP_SERVER output with
//      ` (<command> not installed)` appended).
// Op/position paths in output are relative to ctx.directory; rename writes
// are the client's atomic per-file writes.

import * as path from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { tool } from "@mimo-ai/plugin";
import { LspClient } from "./client";
import { resolveAbs } from "../shim";
import type { Ctx } from "../types";

const lspArgs = {
  operation: z.enum(["hover", "definition", "references", "rename", "diagnostics"]),
  file_path: z.string(),
  line: z.number().int().min(1).optional(),
  character: z.number().int().min(1).optional(),
  new_name: z.string().optional(),
};

type LspOp = z.infer<z.ZodObject<typeof lspArgs>>["operation"];

function errMsg(err: unknown): string { return err instanceof Error ? err.message : String(err); }

function namedReject(message: string): { output: string; metadata: Record<string, unknown> } {
  return { output: message, metadata: { error: message } };
}

function opFailed(op: LspOp, err: unknown): { output: string; metadata: Record<string, unknown> } {
  const message = `lsp ${op} failed: ${errMsg(err)}`;
  return { output: message, metadata: { error: "LSP_OP_FAILED" } };
}

function isEnoent(err: unknown): boolean {
  if (err !== null && typeof err === "object" && (err as { code?: unknown }).code === "ENOENT") return true;
  return err instanceof Error && err.message.includes("ENOENT");
}

function languageIdFor(ext: string): string {
  switch (ext) {
    case ".ts":
    case ".tsx": return "typescript";
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs": return "javascript";
    case ".py": return "python";
    default: return "plaintext";
  }
}

export const lspTool = tool({
  description:
    "Minimal LSP shadow (hover/definition/references/rename/diagnostics) over a vendored stdio client. Per-call server lifecycle; unserved extensions reject with NO_LSP_SERVER.",
  args: lspArgs,
  async execute(args, ctx: Ctx) {
    const op = args.operation;
    // Step 1: required-arg gates. diagnostics takes no position; rename also needs new_name.
    if (op !== "diagnostics") {
      if (args.line === undefined) return namedReject(`${op} requires line`);
      if (args.character === undefined) return namedReject(`${op} requires character`);
    }
    if (op === "rename" && args.new_name === undefined) return namedReject("rename requires new_name");
    // Step 2: spec match — SC-16. No spawn is attempted on this path.
    const abs = resolveAbs(ctx, args.file_path);
    const ext = path.extname(abs).toLowerCase();
    const client = LspClient.forFile(abs);
    if (client === null) {
      return { output: `No LSP server available for ${ext} files`, metadata: { error: "NO_LSP_SERVER" } };
    }
    const rel = path.relative(ctx.directory, abs);
    // Step 3: file read (the server opens what is on disk).
    let text: string;
    try { text = await readFile(abs, "utf8"); }
    catch (err) { return opFailed(op, `cannot read file ${rel}: ${errMsg(err)}`); }
    // Step 4: spawn + handshake. A failed handshake still owns a live
    // process: shut it down best-effort first, otherwise the server outlives
    // the call (leaked subprocess). ENOENT -> NO_LSP_SERVER with detail.
    try { await client.initialize(ctx.worktree ?? ctx.directory); }
    catch (err) {
      try { await client.shutdown(); } catch { /* reaping only; the mapping below stands */ }
      if (isEnoent(err)) {
        return {
          output: `No LSP server available for ${ext} files (${client.spec.command} not installed)`,
          metadata: { error: "NO_LSP_SERVER" },
        };
      }
      return opFailed(op, err);
    }
    // Step 5: didOpen + the single op; shutdown always runs via finally.
    try {
      await client.didOpen(abs, text, languageIdFor(ext));
      switch (op) {
        case "hover": {
          const h = await client.hover(abs, args.line as number, args.character as number);
          return { output: h === null ? `no hover at ${rel}:${args.line}:${args.character}` : `${rel}:${args.line}:${args.character}: ${h}` };
        }
        case "definition": {
          const locs = await client.definition(abs, args.line as number, args.character as number);
          if (locs.length === 0) return { output: `no definition at ${rel}:${args.line}:${args.character}` };
          return { output: locs.map((l) => `${path.relative(ctx.directory, l.path)}:${l.line}`).join("\n") };
        }
        case "references": {
          const locs = await client.references(abs, args.line as number, args.character as number);
          if (locs.length === 0) return { output: `no references at ${rel}:${args.line}:${args.character}` };
          return { output: locs.map((l) => `${path.relative(ctx.directory, l.path)}:${l.line}`).join("\n") };
        }
        case "rename": {
          const r = await client.rename(abs, args.line as number, args.character as number, args.new_name as string);
          if (r.error) return opFailed(op, r.error);
          return {
            output: [`renamed ${args.new_name} in ${r.edited.length} file(s)`, ...r.edited.map((f) => path.relative(ctx.directory, f))].join("\n"),
            metadata: { renamed: true, files: r.edited.length },
          };
        }
        case "diagnostics": {
          const rows = await client.diagnostics(abs);
          if (rows.length === 0) return { output: `no diagnostics in ${rel}` };
          return { output: rows.map((d) => `${rel}:${d.line} [${d.severity}] ${d.message}`).join("\n") };
        }
      }
    } catch (err) {
      return opFailed(op, err);
    } finally {
      try { await client.shutdown(); } catch { /* cleanup best-effort: the op result above stands */ }
    }
  },
});
