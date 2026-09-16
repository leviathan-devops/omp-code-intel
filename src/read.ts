import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { tool } from "@mimo-ai/plugin";
import { astGrep } from "@oh-my-pi/pi-natives";
import { store } from "./tagstore";
import { resolveAbs } from "./shim";
import type { Ctx } from "./types";

// src/read.ts — opt-in shadow `read` (V2 W1-A). Closes the anchor loop for ALL
// flows: every file read emits the same `[relPath]#tag` header the edit loop
// consumes, plus a symbol-map section and `file#symbol` selectors.
//
// Output grammar (mirrors src/ast.ts):
//   `[<relPath>]#<tag>`            — tag covers the FULL file text, not the slice
//   `<N>:<line>`                   — 1-based rows for the shown window
//   `Symbols:` + `  <name> (<kind>) @<line>` — top-level defs (served exts only)

const READ_MAX_LINES = 2000;
const READ_MAX_LINE_CHARS = 2000;
const SYMBOL_WINDOW_RADIUS = 40;
const SYMBOLS_CAP = 200;

const readArgs = {
  file_path: z.string(),
  offset: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
};

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function namedReject(message: string): { output: string; metadata: Record<string, unknown> } {
  return { output: message, metadata: { error: message } };
}

function cleanMetaVar(v: unknown): string {
  const s = String(v ?? "");
  return s.replace(/^\[|\]$/g, "");
}

interface SymbolRow {
  name: string;
  kind: string;
  line: number;
}

function patternsFor(ext: string): Array<{ pat: string; kind: string }> {
  switch (ext) {
    case ".ts":
    case ".tsx":
    case ".js":
    case ".jsx":
    case ".mjs":
    case ".cjs":
      return [
        { pat: "function $NAME", kind: "function" },
        { pat: "class $NAME", kind: "class" },
        { pat: "const $NAME = ($$$ARGS) => $BODY", kind: "arrow" },
      ];
    case ".py":
      return [
        { pat: "def $NAME", kind: "function" },
        { pat: "class $NAME", kind: "class" },
      ];
    default:
      return [];
  }
}

async function collectSymbols(abs: string, ext: string): Promise<SymbolRow[]> {
  const pats = patternsFor(ext);
  if (pats.length === 0) return [];
  const seen = new Map<string, SymbolRow>();
  for (const { pat, kind } of pats) {
    let res;
    try {
      res = await astGrep({ patterns: [pat], path: abs, includeMeta: true });
    } catch {
      continue; // unparseable file: symbols best-effort, never a failed read
    }
    for (const m of res.matches ?? []) {
      const raw = (m.metaVariables as Record<string, unknown> | undefined)?.["NAME"];
      const name = cleanMetaVar(raw);
      if (name.length === 0) continue;
      const key = `${m.startLine}:${name}`;
      if (!seen.has(key)) seen.set(key, { name, kind, line: m.startLine });
    }
  }
  const rows = [...seen.values()].sort((a, b) => a.line - b.line);
  return rows.slice(0, SYMBOLS_CAP);
}

function truncLine(line: string): string {
  if (line.length <= READ_MAX_LINE_CHARS) return line;
  return `${line.slice(0, READ_MAX_LINE_CHARS)}... (line truncated)`;
}

export const shadowReadTool = tool({
  description:
    "Hashline-tagged file read: emits a [path]#tag header (the tag covers the full file) plus N:body rows and a Symbols section. Supports file#symbol selectors that center the window on the named definition.",
  args: readArgs,
  async execute(args, ctx: Ctx) {
    // Selector split: '#' only counts after the last '/' (filenames may contain '#').
    // Filenames containing '#' win over selectors: if the FULL literal path
    // resolves to a file, serve it directly with no selector parsing.
    let basePath = args.file_path;
    let symbol: string | undefined;
    try {
      const literalAbs = resolveAbs(ctx, args.file_path);
      if (!statSync(literalAbs).isDirectory() && existsSync(literalAbs)) {
        basePath = args.file_path;
        symbol = undefined;
      } else {
        throw new Error("not-a-literal-file");
      }
    } catch {
      const hashAt = args.file_path.lastIndexOf("#");
      const slashAt = args.file_path.lastIndexOf("/");
      const hasSelector = hashAt > slashAt;
      basePath = hasSelector ? args.file_path.slice(0, hashAt) : args.file_path;
      symbol = hasSelector ? args.file_path.slice(hashAt + 1) : undefined;
    }

    const abs = resolveAbs(ctx, basePath);
    let st;
    try {
      st = statSync(abs);
    } catch {
      return namedReject(`READ_NOT_FOUND: ${basePath}`);
    }
    if (st.isDirectory()) {
      let entries: string[];
      try {
        const { readdirSync } = await import("node:fs");
        entries = readdirSync(abs).sort((a, b) => a.localeCompare(b));
      } catch (err) {
        return namedReject(`READ_NOT_FOUND: ${basePath} (${errMsg(err)})`);
      }
      const rows: string[] = [];
      for (const e of entries) {
        let isDir = false;
        try {
          isDir = statSync(path.join(abs, e)).isDirectory();
        } catch {
          isDir = false;
        }
        rows.push(isDir ? `${e}/` : e);
      }
      return { output: rows.join("\n"), metadata: { type: "directory" } };
    }

    let text: string;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      return namedReject(`READ_NOT_FOUND: ${basePath}`);
    }

    // Binary sniff on the first 4KB: a NUL byte means binary.
    if (text.slice(0, 4096).includes(String.fromCharCode(0))) {
      const preview = text.replace(/[^\x20-\x7E\n\t]/g, "").slice(0, 200);
      return {
        output: `READ_BINARY: ${basePath} (binary file, preview only)\n${preview}`,
        metadata: { error: "READ_BINARY" },
      };
    }

    const rel = path.relative(ctx.directory, abs);
    const tag = store.snapshot(abs, text);
    const ext = path.extname(abs).toLowerCase();
    const symbols = await collectSymbols(abs, ext);

    if (symbol !== undefined && symbol.length > 0) {
      const hit = symbols.find((s) => s.name === symbol);
      if (hit === undefined) {
        return {
          output: `[${rel}]#${tag}\nNO_SYMBOL: ${symbol} not found in ${rel}`,
          metadata: { error: "NO_SYMBOL", tag },
        };
      }
      const lines = text.split("\n");
      if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
      const idx = hit.line - 1;
      const start = Math.max(0, idx - SYMBOL_WINDOW_RADIUS);
      const end = Math.min(lines.length, idx + SYMBOL_WINDOW_RADIUS + 1);
      const out = [`[${rel}]#${tag} @${hit.name}:${hit.line}`];
      for (let i = start; i < end; i++) out.push(`${i + 1}:${truncLine(lines[i])}`);
      return { output: out.join("\n"), metadata: { tag, lines: lines.length, type: "file", symbol: hit.name } };
    }

    const lines = text.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
    const offset = (args.offset ?? 1) - 1;
    const limit = args.limit ?? READ_MAX_LINES;
    const start = Math.min(Math.max(offset, 0), lines.length);
    const end = Math.min(lines.length, start + Math.min(limit, READ_MAX_LINES));
    const out = [`[${rel}]#${tag}`];
    for (let i = start; i < end; i++) out.push(`${i + 1}:${truncLine(lines[i])}`);
    if (symbols.length > 0) {
      out.push("Symbols:");
      for (const s of symbols) out.push(`  ${s.name} (${s.kind}) @${s.line}`);
    }
    return { output: out.join("\n"), metadata: { tag, lines: lines.length, type: "file" } };
  },
});
