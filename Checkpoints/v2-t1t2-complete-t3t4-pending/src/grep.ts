// src/grep.ts — W4-B: native grep shadow tool (opt-in id replacement).
//
// Detection layer is ALWAYS @oh-my-pi/pi-natives (`grep`). This file
// contains zero regex: output formatting uses only split/slice/join and
// path.relative. The `pattern` string is passed through to the native
// call untouched — never compiled or tested locally.
//
// Output grammar mirrors src/ast.ts (ast_grep) exactly:
//   first line: `matches=<n> files=<m>`
//   per file with matches: `[<relPath>]#<tag>` (TagStore.snapshot — the
//     same store singleton the edit loop consumes, so shadow grep mints
//     the same anchors) then `<N>:<line>` rows.
//   total display-row cap 200 with a final `… rows capped at 200` line
//   when hit (caps disclosed — the box law for tool text).
//
// d.ts ground truth (node_modules/@oh-my-pi/pi-natives/native/index.d.ts):
//   `export declare function grep(options: GrepOptions,
//     onMatch?: ...): Promise<GrepResult>`
//   GrepOptions carries `ignoreCase?: boolean` (NOT `caseSensitive`) and
//   `maxCount?: number` (NOT `limit`), and has NO `includeMeta` field.
//   The call below follows the d.ts exactly; the mission brief's
//   `caseSensitive` / `includeMeta` / `limit` spellings are documented
//   deviations resolved in favor of the d.ts (THE D.TS WINS).
//
// Loud-fail law: the ONLY swallow in this file is the named
// GREP_NATIVE_UNAVAILABLE branch (natives import/call failure at call
// time). There is NO silent JS-scan fallback — a silent fallback
// producing different results would be the banned false-success class.

import * as path from "node:path";
import { readFile } from "node:fs/promises";
import { statSync } from "node:fs";
import { z } from "zod";
import type { ToolContext } from "@mimo-ai/plugin";
import { store } from "./tagstore.js";
import { resolveAbs } from "./shim.js";

type Ctx = ToolContext;

// Display-row cap (N:line rows only — headers and the summary line are
// outside the budget). Matches the mission's disclosed-cap line.
const GREP_ROW_CAP = 200;
const GREP_ROW_CAP_NOTE = "… rows capped at 200";

// maxCount bounds the native result set; kept equal to the display cap
// so the summary line and the rows can never disagree by truncation.
const GREP_MAX_COUNT = 200;

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function reject(message: string): { output: string; metadata: Record<string, unknown> } {
  return { output: message, metadata: { error: message } };
}

function unavailable(detail: string): { output: string; metadata: Record<string, unknown> } {
  return {
    output: `GREP_NATIVE_UNAVAILABLE: ${detail.slice(0, 120)}`,
    metadata: { error: "GREP_NATIVE_UNAVAILABLE" },
  };
}

// Native match paths may be absolute or relative to the search root
// passed in. Normalize to absolute so path.relative(ctx.directory, …)
// is exact. When the root is a single FILE, grep returns paths relative
// to that file's PARENT dir — resolve against the dir base in that case.
// (Same helper as src/ast.ts toAbs — duplicated, not imported, so this
// shadow file has no coupling to the ast module it mirrors.)
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

const grepArgs = {
  pattern: z.string().min(1),
  path: z.string().optional(),
  glob: z.string().optional(),
  ignore_case: z.boolean().optional(),
};

export const grepTool = {
  description:
    "Text search via pi-natives grep (shadow replacement for builtin grep). Emits a summary line, [relPath]#tag headers, and N:body anchor lines.",
  args: grepArgs,
  async execute(
    args: z.infer<z.ZodObject<typeof grepArgs>>,
    ctx: Ctx,
  ): Promise<{ output: string; metadata?: Record<string, unknown> }> {
    // Runtime guard mirrors ast_grep's rejection (schema min(1) makes the
    // empty string impossible, but a whitespace-only pattern would sail
    // through the schema and waste a native call — reject for defense).
    if (args.pattern.trim().length === 0) return reject("pattern must be a non-empty pattern");
    // v1: single search root only. Default "." keeps the native search
    // rooted at the session directory.
    const target = args.path ?? ".";
    const absTarget = resolveAbs(ctx, target);
    // Natives are resolved LAZILY at call time (dynamic import, not a
    // static module import) so a missing/broken native surfaces HERE as
    // the named GREP_NATIVE_UNAVAILABLE branch — never as a module-load
    // crash, and never as a silent fallback.
    let grepFn: unknown;
    try {
      const natives = await import("@oh-my-pi/pi-natives");
      grepFn = (natives as Record<string, unknown>)["grep"];
    } catch (err) {
      return unavailable(`import failed: ${errMsg(err)}`);
    }
    if (typeof grepFn !== "function") {
      return unavailable(`natives export 'grep' missing (typeof ${typeof grepFn})`);
    }
    // Call shape per d.ts GrepOptions: { pattern, path, glob?,
    // ignoreCase?, maxCount?, signal? }. No includeMeta field exists —
    // content rows are the default Content mode. glob is passed only
    // when defined (an explicit undefined key must not override the
    // native default).
    let res: {
      matches: Array<{ path: string; lineNumber: number; line: string }>;
      totalMatches: number;
      filesWithMatches: number;
      limitReached?: boolean;
    };
    try {
      res = await (
        grepFn as (options: Record<string, unknown>) => Promise<{
          matches: Array<{ path: string; lineNumber: number; line: string }>;
          totalMatches: number;
          filesWithMatches: number;
          limitReached?: boolean;
        }>
      )({
        pattern: args.pattern,
        path: absTarget,
        ...(args.glob !== undefined ? { glob: args.glob } : {}),
        ignoreCase: args.ignore_case ?? false,
        maxCount: GREP_MAX_COUNT,
        signal: ctx.abort,
      });
    } catch (err) {
      return unavailable(`grep call failed: ${errMsg(err)}`);
    }
    const matches = Array.isArray(res.matches) ? res.matches : [];
    // Group rows by file, preserving first-seen order (same grouping
    // discipline as astGrepTool in src/ast.ts).
    const order: string[] = [];
    const byFile = new Map<string, { rel: string; rows: Array<{ n: number; body: string }> }>();
    for (const m of matches) {
      const abs = toAbs(absTarget, m.path);
      let group = byFile.get(abs);
      if (group === undefined) {
        group = { rel: path.relative(ctx.directory, abs), rows: [] };
        byFile.set(abs, group);
        order.push(abs);
      }
      group.rows.push({ n: m.lineNumber, body: m.line });
    }
    const matchCount = typeof res.totalMatches === "number" ? res.totalMatches : matches.length;
    const fileCount = order.length;
    const out: string[] = [];
    out.push(`matches=${matchCount} files=${fileCount}`);
    let rowsEmitted = 0;
    let capped = false;
    for (const abs of order) {
      if (capped) break;
      const group = byFile.get(abs);
      if (group === undefined) continue;
      let text: string;
      try {
        text = await readFile(abs, "utf8");
      } catch (err) {
        return reject(`grep failed: cannot read ${group.rel}: ${errMsg(err)}`);
      }
      const tag = store.snapshot(abs, text);
      out.push(`[${group.rel}]#${tag}`);
      for (const row of group.rows) {
        if (rowsEmitted >= GREP_ROW_CAP) {
          capped = true;
          break;
        }
        out.push(`${row.n}:${row.body}`);
        rowsEmitted += 1;
      }
    }
    // Native-side truncation (maxCount hit upstream of the display cap)
    // is still disclosed: rows shown < native total, or the native
    // limitReached flag, means the cap bit. The note fires ONLY when
    // rows were actually dropped — exactly-200-rows-shown with nothing
    // left over emits no note.
    if (capped || res.limitReached === true || matches.length < matchCount) {
      out.push(GREP_ROW_CAP_NOTE);
    }
    return {
      output: out.join("\n"),
      metadata: {
        matchCount,
        fileCount,
      },
    };
  },
};
