import { renameSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { tool } from "@mimo-ai/plugin";
import { LspClient, applyEditsToFile } from "./lsp/client";
import { store } from "./tagstore";
import { resolveAbs } from "./shim";
import { readFileSync } from "node:fs";
import type { Ctx } from "./types";

// src/mv.ts — mimo_mv (V2 W1-D): file moves with import rewriting.
//
// Order of operations: (1) validate the source; (2) compute server-side
// import edits via workspace/willRenameFiles (when served); (3) apply those
// edits; (4) fs rename; (5) tag bookkeeping (invalidate old, snapshot new).
// A broken import post-move is a FAIL of this tool's contract, so server
// errors on the willRename path reject BEFORE any disk mutation.

const mvArgs = {
  from: z.string(),
  to: z.string(),
};

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function namedReject(message: string): { output: string; metadata: Record<string, unknown> } {
  return { output: message, metadata: { error: message } };
}

const RENAME_TIMEOUT_NOTE = "WILLRENAME_UNSUPPORTED: plain move, imports not rewritten";

export const mimoMvTool = tool({
  description:
    "Move a file with import rewriting: asks the language server for workspace/willRenameFiles edits, applies them, then moves. Falls back to a plain move with a named note when unserved.",
  args: mvArgs,
  async execute(args, ctx: Ctx) {
    const from = resolveAbs(ctx, args.from);
    const to = resolveAbs(ctx, args.to);
    let st;
    try {
      st = statSync(from);
    } catch {
      return namedReject(`MV_NOT_FOUND: ${args.from}`);
    }
    if (st.isDirectory()) return namedReject("MV_DIR_UNSUPPORTED: directories are not moved by mimo_mv");
    if (from === to) return namedReject("MV_IDENTICAL: source and destination are the same file");

    const client = LspClient.forFile(from);
    const relFrom = path.relative(ctx.directory, from);
    const relTo = path.relative(ctx.directory, to);

    // willRename round-trip first (no disk mutation yet). Null/error/empty
    // all mean the same thing: plain move with the named note.
    let importEdits: Map<string, { range: unknown; newText: string }[]> | null = null;
    let willRenameOk = false;
    if (client !== null) {
      try {
        await client.initialize(ctx.worktree ?? ctx.directory);
        try {
          // didOpen the moved file first: tsserver computes willRename edits
          // from its open-file project graph; an unopened file yields zero.
          let openedText: string | null = null;
          try {
            openedText = readFileSync(from, "utf8");
          } catch {
            openedText = null;
          }
          if (openedText !== null) {
            const ext = path.extname(from).toLowerCase();
            await client.didOpen(from, openedText, ext === ".py" ? "python" : "typescript");
          }
          const perFile = await client.willRename([{ from, to }]);
          importEdits = perFile as Map<string, { range: unknown; newText: string }[]>;
          willRenameOk = perFile.size > 0;
        } finally {
          try {
            await client.shutdown();
          } catch {
            // reaping only
          }
        }
      } catch {
        importEdits = null;
        willRenameOk = false;
      }
    }

    if (willRenameOk && importEdits !== null && importEdits.size > 0) {
      try {
        for (const [file, edits] of importEdits) {
          applyEditsToFile(file, edits as Parameters<typeof applyEditsToFile>[1]);
          try {
            store.retag(file, readFileSync(file, "utf8"));
          } catch {
            store.invalidate(file);
          }
        }
      } catch (err) {
        return namedReject(`MV_EDIT_FAILED: ${errMsg(err)} — no move performed`);
      }
    }

    try {
      renameSync(from, to);
    } catch (err) {
      return namedReject(`MV_FAILED: ${errMsg(err)}`);
    }
    store.invalidate(from);
    try {
      store.snapshot(to, readFileSync(to, "utf8"));
    } catch {
      store.invalidate(to);
    }

    const rows: string[] = [`moved ${relFrom} -> ${relTo}`];
    let rewritten = 0;
    if (willRenameOk && importEdits !== null) {
      rewritten = importEdits.size;
      rows.push(`imports updated in ${rewritten} file(s)`);
      for (const f of importEdits.keys()) rows.push(`  ${path.relative(ctx.directory, f)}`);
    } else {
      rows.push(RENAME_TIMEOUT_NOTE);
    }
    return { output: rows.join("\n"), metadata: { moved: true, importsRewritten: rewritten } };
  },
});
