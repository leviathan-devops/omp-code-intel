// src/ast.ts — W1-B: structural tools (ast_grep, ast_edit, resolve) over pi-natives.
//
// Detection layer is ALWAYS @oh-my-pi/pi-natives (tree-sitter AST). This file
// contains zero regex: output formatting uses only split/slice/join and
// path.relative (§8.1 regex-where-AST ban — `grep -L "pi-natives" src/ast.ts`
// must return nothing; ST asserts the "matchCount"-class summary line).
//
// Staging contract: ast_edit NEVER writes (dryRun:true preview only) and
// stages one pending op per sessionID in the module Map (a new call REPLACES).
// resolve re-confirms via dryRun, then applies via dryRun:false; any count
// drift between preview/confirm/apply is a loud `stale preview` named error.
//
// Ctx note (contract deviation, see build report): the dispatch brief cites
// `type Ctx from "./types"`, but no src/types.ts exists in the tree and
// CONTRACTS.md defines the tool ctx shape inline (§Runtime facts). Ctx is
// therefore aliased to the plugin SDK ToolContext locally — identical shape,
// zero new surface.

import * as path from "node:path";
import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { z } from "zod";
import { astGrep, astEdit } from "@oh-my-pi/pi-natives";
import type { ToolContext } from "@mimo-ai/plugin";
import { store } from "./tagstore.js";
import { resolveAbs, toPathList } from "./shim.js";
import { diagSection } from "./diag";

type Ctx = ToolContext;

const DEFAULT_AST_LIMIT = 50;
const AST_EDIT_MAX_FILES = 1000;
const PREVIEW_PAIRS_MAX = 5;
const PARSE_ISSUES_SHOWN = 5;

interface StagedOp {
  rewrites: Record<string, string>;
  paths: string[]; // absolute search roots, resolved at stage time
  totalReplacements: number;
  filesTouched: number;
}

// Single pending op per session; a new ast_edit call for the same session
// REPLACES the previous entry (never queues).
const staged = new Map<string, StagedOp>();

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function reject(message: string): { output: string; metadata: Record<string, unknown> } {
  return { output: message, metadata: { error: message } };
}

function appendParseBlock(out: string[], parseErrors: string[]): void {
  if (parseErrors.length === 0) return;
  out.push(`PARSE_ISSUES_CAPPED (${parseErrors.length}):`);
  for (const entry of parseErrors.slice(0, PARSE_ISSUES_SHOWN)) out.push(entry);
}

// Native match/change paths may be absolute or relative to the search root
// passed in. Normalize to absolute so path.relative(ctx.directory, …) is exact.
// When the root is a single FILE, ast-grep returns paths relative to that
// file's PARENT dir — resolve against the dir base in that case (ENOTDIR fix).
function toAbs(searchRootAbs: string, p: string): string {
  if (path.isAbsolute(p)) return path.normalize(p);
  let base = searchRootAbs;
  try {
    if (!statSync(searchRootAbs).isDirectory()) base = path.dirname(searchRootAbs);
  } catch {
    // stat probe only — the native call downstream surfaces real path errors
  }
  return path.resolve(base, p);
}

interface DryRunSummary {
  totalReplacements: number;
  filesTouched: number;
  filesSearched: number;
  changes: Array<{ rel: string; abs: string; startLine: number; before: string; after: string }>;
  fileCounts: Array<{ rel: string; abs: string; count: number }>;
  parseErrors: string[];
}

async function dryRunAll(
  rewrites: Record<string, string>,
  absPaths: string[],
  ctx: Ctx,
): Promise<DryRunSummary> {
  let totalReplacements = 0;
  let filesTouched = 0;
  let filesSearched = 0;
  const changes: DryRunSummary["changes"] = [];
  const fileCounts: DryRunSummary["fileCounts"] = [];
  const parseErrors: string[] = [];
  for (const absP of absPaths) {
    const res = await astEdit({
      rewrites,
      path: absP,
      dryRun: true,
      maxFiles: AST_EDIT_MAX_FILES,
      failOnParseError: false,
      signal: ctx.abort,
    });
    totalReplacements += res.totalReplacements;
    filesTouched += res.filesTouched;
    filesSearched += res.filesSearched;
    if (res.parseErrors) parseErrors.push(...res.parseErrors);
    for (const c of res.changes) {
      const abs = toAbs(absP, c.path);
      changes.push({
        rel: path.relative(ctx.directory, abs),
        abs,
        startLine: c.startLine,
        before: c.before,
        after: c.after,
      });
    }
    for (const fc of res.fileChanges) {
      const abs = toAbs(absP, fc.path);
      fileCounts.push({ rel: path.relative(ctx.directory, abs), abs, count: fc.count });
    }
  }
  return { totalReplacements, filesTouched, filesSearched, changes, fileCounts, parseErrors };
}

const astGrepArgs = {
  pat: z.string(),
  path: z.string().optional(),
  lang: z.string().optional(),
  skip: z.number().int().nonnegative().optional(),
};

export const astGrepTool = {
  description:
    "Structural code search via tree-sitter (pi-natives astGrep). Emits a summary line, [relPath]#tag headers, and N:body anchor lines.",
  args: astGrepArgs,
  async execute(
    args: z.infer<z.ZodObject<typeof astGrepArgs>>,
    ctx: Ctx,
  ): Promise<{ output: string; metadata?: Record<string, unknown> }> {
    if (args.pat.trim().length === 0) return reject("pat must be a non-empty pattern");
    const targets = toPathList(args.path);
    let totalMatches = 0;
    let filesWithMatches = 0;
    let filesSearched = 0;
    let limitReached = false;
    const parseErrors: string[] = [];
    const hits: Array<{ rel: string; abs: string; startLine: number }> = [];
    for (const target of targets) {
      // absTarget keeps the native search rooted at the session directory even
      // when the caller passes a relative target (e.g. the default ".").
      const absTarget = resolveAbs(ctx, target);
      // FILE-SCOPE QUIRK (measured 2026-09-13): the native drops
      // statement-level structural patterns (e.g. `const $N = $V`) when the
      // search root is a FILE (0 matches), while the parent DIR matches — and
      // its `glob` only accepts extension-class globs (`*.ts`), never
      // filename globs. So file targets route through parent-dir + `*<ext>`
      // with client-side filtering to the target file. Totals are recomputed
      // from the filtered set (honest numbers, not the native's sibling-
      // inclusive counts). Pagination (skip/limit) applies pre-filter: exact
      // for dir targets, approximate for file targets.
      // IDENTICAL-CONTENT DEDUP (measured 2026-09-13): the native collapses
      // byte-identical matches across files to a single hit. If the target
      // file's match is a dup dropped by the filter below, a file-scoped
      // search reports 0 though the pattern is present — rare (requires
      // byte-identical boilerplate in 2+ files), fail-closed (0, never wrong
      // matches), documented, accepted.
      let nativePath = absTarget;
      let nativeGlob: string | undefined;
      let fileFilter: string | null = null;
      try {
        if (!statSync(absTarget).isDirectory()) {
          fileFilter = absTarget;
          nativePath = path.dirname(absTarget);
          nativeGlob = `*${path.extname(absTarget)}`;
        }
      } catch {
        // stat probe only — the native call surfaces real path errors
      }
      let res;
      try {
        res = await astGrep({
          patterns: [args.pat],
          lang: args.lang,
          path: nativePath,
          glob: nativeGlob,
          includeMeta: true,
          limit: DEFAULT_AST_LIMIT,
          offset: args.skip,
          signal: ctx.abort,
        });
      } catch (err) {
        return reject(`ast_grep failed: ${errMsg(err)}`);
      }
      let matches = res.matches;
      let fileCount = res.filesWithMatches;
      let matchCount = res.totalMatches;
      if (fileFilter !== null) {
        matches = matches.filter((m) => path.resolve(nativePath, m.path) === fileFilter);
        fileCount = matches.length > 0 ? 1 : 0;
        matchCount = matches.length;
      }
      totalMatches += matchCount;
      filesWithMatches += fileCount;
      filesSearched += fileFilter !== null ? 1 : res.filesSearched;
      limitReached = limitReached || res.limitReached;
      if (res.parseErrors) parseErrors.push(...res.parseErrors);
      for (const m of matches) {
        const abs = toAbs(nativePath, m.path);
        hits.push({ rel: path.relative(ctx.directory, abs), abs, startLine: m.startLine });
      }
    }
    const order: string[] = [];
    const byFile = new Map<string, { rel: string; startLines: number[] }>();
    for (const h of hits) {
      let group = byFile.get(h.abs);
      if (group === undefined) {
        group = { rel: h.rel, startLines: [] };
        byFile.set(h.abs, group);
        order.push(h.abs);
      }
      group.startLines.push(h.startLine);
    }
    const out: string[] = [];
    out.push(
      `matches=${totalMatches} files=${filesWithMatches} searched=${filesSearched} limitReached=${limitReached}`,
    );
    for (const abs of order) {
      const group = byFile.get(abs);
      if (group === undefined) continue;
      let text: string;
      try {
        text = await readFile(abs, "utf8");
      } catch (err) {
        return reject(`ast_grep failed: cannot read ${group.rel}: ${errMsg(err)}`);
      }
      const tag = store.snapshot(abs, text);
      out.push(`[${group.rel}]#${tag}`);
      const srcLines = text.split("\n");
      for (const n of group.startLines) {
        const body = n >= 1 && n <= srcLines.length ? srcLines[n - 1] : "";
        out.push(`${n}:${body}`);
      }
    }
    appendParseBlock(out, parseErrors);
    return {
      output: out.join("\n"),
      metadata: {
        matchCount: totalMatches,
        fileCount: filesWithMatches,
        filesSearched,
        limitReached,
      },
    };
  },
};

const astEditArgs = {
  ops: z.array(z.object({ pat: z.string(), out: z.string() })).min(1),
  paths: z.array(z.string()).min(1),
};

export const astEditTool = {
  description:
    "Structural rewrite preview via pi-natives astEdit (dryRun only). Stages one pending op per session; nothing is written until resolve is called with a reason.",
  args: astEditArgs,
  async execute(
    args: z.infer<z.ZodObject<typeof astEditArgs>>,
    ctx: Ctx,
  ): Promise<{ output: string; metadata?: Record<string, unknown> }> {
    const rewrites: Record<string, string> = {};
    for (const op of args.ops) {
      if (Object.hasOwn(rewrites, op.pat)) return reject(`Duplicate rewrite pattern: ${op.pat}`);
      rewrites[op.pat] = op.out;
    }
    const absPaths = args.paths.map((p) => resolveAbs(ctx, p));
    let preview: DryRunSummary;
    try {
      preview = await dryRunAll(rewrites, absPaths, ctx);
    } catch (err) {
      return reject(`ast_edit failed: ${errMsg(err)}`);
    }
    if (preview.totalReplacements === 0) {
      const out = ["No replacements made"];
      appendParseBlock(out, preview.parseErrors);
      return { output: out.join("\n"), metadata: { applied: false } };
    }
    staged.set(ctx.sessionID, {
      rewrites,
      paths: absPaths,
      totalReplacements: preview.totalReplacements,
      filesTouched: preview.filesTouched,
    });
    const out = [
      `proposed ${preview.totalReplacements} replacement(s) in ${preview.filesTouched} file(s) — nothing written yet; call resolve with a reason to apply`,
    ];
    for (const fc of preview.fileCounts) out.push(`[${fc.rel}]: ${fc.count} replacement(s)`);
    for (const c of preview.changes.slice(0, PREVIEW_PAIRS_MAX)) {
      out.push(`- ${c.before.slice(0, 120)}`);
      out.push(`+ ${c.after.slice(0, 120)}`);
    }
    appendParseBlock(out, preview.parseErrors);
    return {
      output: out.join("\n"),
      metadata: { proposed: preview.totalReplacements, filesTouched: preview.filesTouched, applied: false },
    };
  },
};

const resolveArgs = {
  reason: z.string().min(1),
};

export const resolveTool = {
  description:
    "Apply the session's staged ast_edit op after a stale-safe dryRun re-confirmation. Retags every touched file on success.",
  args: resolveArgs,
  async execute(
    args: z.infer<z.ZodObject<typeof resolveArgs>>,
    ctx: Ctx,
  ): Promise<{ output: string; metadata?: Record<string, unknown> }> {
    void args.reason;
    const op = staged.get(ctx.sessionID);
    if (op === undefined) return reject("nothing staged: run ast_edit first");
    let confirm: DryRunSummary;
    try {
      confirm = await dryRunAll(op.rewrites, op.paths, ctx);
    } catch (err) {
      return reject(`resolve failed: ${errMsg(err)}`);
    }
    if (
      confirm.totalReplacements !== op.totalReplacements ||
      confirm.filesTouched !== op.filesTouched
    ) {
      return reject(
        `stale preview: expected ${op.totalReplacements} in ${op.filesTouched}, found ${confirm.totalReplacements} in ${confirm.filesTouched}`,
      );
    }
    let appliedTotal = 0;
    let appliedFiles = 0;
    const appliedCounts: Array<{ rel: string; abs: string; count: number }> = [];
    try {
      for (const absP of op.paths) {
        const res = await astEdit({
          rewrites: op.rewrites,
          path: absP,
          dryRun: false,
          maxFiles: AST_EDIT_MAX_FILES,
          failOnParseError: false,
          signal: ctx.abort,
        });
        appliedTotal += res.totalReplacements;
        appliedFiles += res.filesTouched;
        for (const fc of res.fileChanges) {
          const abs = toAbs(absP, fc.path);
          appliedCounts.push({ rel: path.relative(ctx.directory, abs), abs, count: fc.count });
        }
      }
    } catch (err) {
      return reject(`resolve failed: ${errMsg(err)}`);
    }
    if (appliedTotal !== confirm.totalReplacements || appliedFiles !== confirm.filesTouched) {
      const driftNote: string[] = [];
      for (const fc of appliedCounts) {
        try {
          const text = await readFile(fc.abs, "utf8");
          store.retag(fc.abs, text);
        } catch (err) {
          driftNote.push(`retag skipped for ${fc.rel}: ${errMsg(err)}`);
        }
      }
      staged.delete(ctx.sessionID);
      const stale = reject(
        `stale preview: expected ${confirm.totalReplacements} in ${confirm.filesTouched}, found ${appliedTotal} in ${appliedFiles}`,
      );
      if (driftNote.length > 0) stale.output += `\n${driftNote.join("\n")}`;
      return stale;
    }
    const out = [`applied ${appliedTotal} replacement(s) in ${appliedFiles} file(s)`];
    const diagMeta: Record<string, unknown> = { applied: true, replacements: appliedTotal, files: appliedFiles };
    for (const fc of appliedCounts) {
      let text: string;
      try {
        text = await readFile(fc.abs, "utf8");
      } catch (err) {
        staged.delete(ctx.sessionID);
        return reject(`resolve failed: applied but cannot retag ${fc.rel}: ${errMsg(err)}`);
      }
      const newTag = store.retag(fc.abs, text);
      out.push(`[${fc.rel}]#${newTag}`);
    }
    // Diagnostics-on-write (V2): per touched file, best-effort, appended in
    // the SAME card. Never fails the apply; unavailability only sets the key.
    for (const fc of appliedCounts) {
      const diag = await diagSection(fc.abs, ctx.worktree ?? ctx.directory, ctx.directory);
      if (diag.text !== null) out.push(diag.text);
      else if (diag.unavailable) diagMeta.diag = "DIAG_UNAVAILABLE";
    }
    staged.delete(ctx.sessionID);
    return {
      output: out.join("\n"),
      metadata: diagMeta,
    };
  },
};
