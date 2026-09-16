import { existsSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { tool } from "@mimo-ai/plugin";
import { store } from "./tagstore";
import { resolveAbs } from "./shim";
import { diagSection } from "./diag";
import type { Ctx } from "./types";

// RB-06 concurrency property (no locks by design): the tag check in Step 2 IS
// the serialization. Two parallel omp_edit calls with the same file+tag race;
// the winner's Step-6 retag changes currentTag, so the loser's Step-2 comparison
// (or a re-read after the winner's atomic rename) fails with STALE_ANCHOR.
// Sequential execution in one process is the degenerate case of the same rule:
// the second call always observes the first call's retag.
export const ompEditTool = tool({
  description:
    "Hashline-anchored edit: apply exact-line hunks to a file previously snapshotted via ast_grep/ast_edit. Verifies the 4-char content tag before writing; rejects stale tags (STALE_ANCHOR) and drifted lines (ANCHOR_MISMATCH) with no disk write.",
  args: {
    file_path: z.string(),
    tag: z.string().length(4),
    hunks: z
      .array(
        z.object({
          line: z.number().int().min(1),
          old: z.string(),
          new: z.string(),
        }),
      )
      .min(1),
  },
  async execute(args, ctx: Ctx) {
    // Defensive shape guard: the tool wrapper does not enforce the zod
    // schema before execute, so malformed caller values arrive raw. Reject
    // by name instead of throwing a Node TypeError past the tool boundary.
    if (typeof args.file_path !== "string" || !Array.isArray(args.hunks) || typeof args.tag !== "string") {
      return {
        output: "INVALID_ARGS: file_path (string), tag (string) and hunks (array) are required",
        metadata: { error: "INVALID_ARGS" },
      };
    }
    // Step 1: resolve + snapshot gate. No snapshot → READ_FIRST, NO write.
    const abs = resolveAbs(ctx, args.file_path);
    const snap = store.get(abs);
    if (snap === undefined) {
      return {
        output: `READ_FIRST: no snapshot for ${abs}; run ast_grep or ast_edit first`,
        metadata: { error: "READ_FIRST" },
      };
    }

    // Step 2: tag freshness gate. Any mismatch → STALE_ANCHOR, NO write.
    const current = store.currentTag(abs);
    if (current === null) {
      return {
        output: `STALE_ANCHOR: ${abs} unreadable`,
        metadata: { error: "STALE_ANCHOR" },
      };
    }
    if (current !== args.tag) {
      return {
        output: `STALE_ANCHOR: ${abs} changed since snapshot (had ${args.tag}, now ${current})`,
        metadata: { error: "STALE_ANCHOR" },
      };
    }

    // Step 3: split with trailing-newline preservation.
    const text = readFileSync(abs, "utf8");
    const lines = text.split("\n");
    const trailingEmpty = lines.length > 0 && lines[lines.length - 1] === "";
    if (trailingEmpty) {
      lines.pop();
    }

    // Step 4: validate ALL hunks before ANY mutation. One miss → ANCHOR_MISMATCH, NO write.
    for (const hunk of args.hunks) {
      const actual = hunk.line > lines.length ? "<EOF>" : (lines[hunk.line - 1] as string);
      if (hunk.line > lines.length || actual !== hunk.old) {
        return {
          output: `ANCHOR_MISMATCH at line ${hunk.line}: expected ${hunk.old.slice(0, 40)}, found ${actual.slice(0, 40)}`,
          metadata: { error: "ANCHOR_MISMATCH" },
        };
      }
    }

    // Read-only guard: the atomic tmp+rename below only needs directory
    // write permission, so it would silently defeat a read-only file bit.
    // Check the file's own write bits first and reject by name.
    try {
      const st = statSync(abs);
      if ((st.mode & 0o222) === 0) {
        return {
          output: `READ_ONLY_FILE: ${abs} has no write permission bits`,
          metadata: { error: "READ_ONLY_FILE" },
        };
      }
    } catch {
      return {
        output: `STALE_ANCHOR: ${abs} unreadable`,
        metadata: { error: "STALE_ANCHOR" },
      };
    }

    // Step 5: apply DESC by line (earlier-line indexes stay valid), atomic tmp+rename.
    const sorted = [...args.hunks].sort((a, b) => b.line - a.line);
    for (const hunk of sorted) {
      lines[hunk.line - 1] = hunk.new;
    }
    const newText = lines.join("\n") + (trailingEmpty ? "\n" : "");
    const tmp = `${abs}.omp-tmp`;
    try {
      writeFileSync(tmp, newText, "utf8");
      renameSync(tmp, abs);
    } catch (err) {
      if (existsSync(tmp)) {
        unlinkSync(tmp);
      }
      throw err;
    }

    // Step 6: retag + report with fresh tag, then diagnostics-on-write
    // (V2): best-effort LSP diagnostics appended in the SAME card. A good
    // write never fails on diagnostics — unavailability only sets the key.
    const newTag = store.retag(abs, newText);
    const rel = path.relative(ctx.directory, abs);
    const diag = await diagSection(abs, ctx.worktree ?? ctx.directory, ctx.directory);
    const meta: Record<string, unknown> = { tag: newTag, hunks: args.hunks.length, file: abs };
    let output = `applied ${args.hunks.length} hunk(s) → [${rel}]#${newTag}`;
    if (diag.text !== null) output += `\n${diag.text}`;
    else if (diag.unavailable) meta.diag = "DIAG_UNAVAILABLE";
    return { output, metadata: meta };
  },
});
