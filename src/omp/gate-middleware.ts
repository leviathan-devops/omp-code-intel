// OMP write/edit graph-gate. STEER default. FULL cancels on export strip.
// ★ F-415 FIX (2026-09-24): header said fail-open; the body is fail-closed (cancel:true)
// ★ unless GI_ALLOW_NO_STORE=1. The header now matches the body.
// No @mimo-ai/plugin. Fail-closed when no store (GI_NO_STORE); explicit bypass via GI_ALLOW_NO_STORE=1.

import * as fs from "node:fs";

export type GiDial = "OFF" | "STEER" | "FULL";

// Fork GG-BUG-2 v2 EXPORTED-NAME semantics (graph-gate.ts:234-261, EXPORT_PARSE_RE
// graph-gate.ts:146): declaration form yields the name; `export { a as b }`
// yields the ALIAS; `export default` yields 'default'. OMP baseline recall was
// 0.366 on the 238-file live tree (564/1542) with the function-only regex.
// ★ F-1046 FIX (2026-09-25, run-13 HIGH): EXPORT_PARSE_RE's `(?:function|const|class|…)`
// ★ alternation missed `function*` (async or not) — `export async function* foo()` matched
// ★ NEITHER regex (PROBED: PARSE=[], GEN=[foo]). EXPORT_GEN_RE already covers both forms via
// ★ `(?:async\s+)?`; extended the range-star to a named star so PARSE no longer silently
// ★ depends on GEN running too (defense in depth — eachExportName runs both, but each regex
// ★ must be correct on its own).
const EXPORT_PARSE_RE = /export\s+(?:async\s+)?(?:function\*?|const|class|let|var|type|interface|enum)\s+(\w+)/g;
// ★ F-41 FIX (2026-09-24): `export function*` (the `*` between function and name) and `export const {a}/[a]` never matched — stripped exports evaded the gate. Generator + destructured forms covered in both fns below.
const EXPORT_GEN_RE = /export\s+(?:async\s+)?function\s*\*\s*(\w+)/g;
const EXPORT_DESTRUCT_RE = /export\s+(?:const|let|var)\s*(\{[^}]*\}|\[[^\]]*\])/g;
/** The bound names of one `{...}`/`[...]` spec list: `b: c` binds `c`, `...rest` binds `rest`, holes/defaults skipped. Nested patterns are out of scope (the old code missed the whole statement). */
function eachDestructuredName(list: string, cb: (name: string) => void): void {
  for (const spec of list.split(",")) {
    const noDefault = spec.split("=")[0] ?? "";
    const parts = noDefault.split(":");
    const name = (parts[parts.length - 1] ?? "").trim().replace(/^\.\.\./, "");
    if (/^[A-Za-z_$][\w$]*$/.test(name)) cb(name);
  }
}
const EXPORT_BRACES_RE = /export\s*\{([^}]*)\}(?:\s*from\s*['"][^'"]*['"])?/g;
const EXPORT_DEFAULT_RE = /export\s+default\b/g;

// ★ F-351 FIX (2026-09-24): parseExports + parseExportSites shared ONE iterator —
//   the five-regex export semantics (incl. the F-41 generator/destructured forms)
//   lived in two copies, so a fix in one silently diverged the other. Both public
//   fns below delegate to this helper; the semantics live here exactly once.
function eachExportName(src: string, cb: (name: string, index: number) => void): void {
  let m: RegExpExecArray | null;
  EXPORT_PARSE_RE.lastIndex = 0;
  while ((m = EXPORT_PARSE_RE.exec(src))) cb(m[1], m.index);
  EXPORT_GEN_RE.lastIndex = 0;
  while ((m = EXPORT_GEN_RE.exec(src))) cb(m[1], m.index);
  EXPORT_DESTRUCT_RE.lastIndex = 0;
  while ((m = EXPORT_DESTRUCT_RE.exec(src))) {
    const idx = m.index;
    eachDestructuredName(m[1].slice(1, -1), (n) => cb(n, idx));
  }
  EXPORT_BRACES_RE.lastIndex = 0;
  while ((m = EXPORT_BRACES_RE.exec(src))) {
    const idx = m.index;
    for (const spec of m[1].split(",")) {
      const s = spec.trim();
      if (!s) continue;
      const asMatch = /\bas\s+(\w+)\s*$/.exec(s);
      if (asMatch) { cb(asMatch[1], idx); continue; }
      const plain = /^(\w+)$/.exec(s);
      if (plain) cb(plain[1], idx);
    }
  }
  EXPORT_DEFAULT_RE.lastIndex = 0;
  while ((m = EXPORT_DEFAULT_RE.exec(src))) cb("default", m.index);
}
export function parseExports(src: string): string[] {
  const out = new Set<string>();
  eachExportName(src, (n) => out.add(n));
  return [...out];
}

export function resolveDial(env: NodeJS.ProcessEnv = process.env, dialFile?: string): GiDial {
  const fromEnv = (env.GI_DIAL ?? "").toUpperCase();
  if (fromEnv === "OFF" || fromEnv === "STEER" || fromEnv === "FULL") return fromEnv;
  if (dialFile && fs.existsSync(dialFile)) {
    try {
      const j = JSON.parse(fs.readFileSync(dialFile, "utf8")) as { level?: string };
      const lv = String(j.level ?? "").toUpperCase();
      if (lv === "OFF" || lv === "STEER" || lv === "FULL") return lv;
    } catch {
      /* malformed dial → STEER */
    }
  }
  return "STEER";
}

export interface GateInput {
  dial: GiDial;
  oldText: string;
  newText: string;
  file: string;
  hasStore: boolean;
}

export interface GateResult {
  cancel: boolean;
  token: string | null;
  advisory: string | null;
}

export function runGraphGate(input: GateInput): GateResult {
  // ★★★ THE OPERATOR'S LAW, APPLIED (2026-09-22): NO FALLBACKS. A missing graph is a
  //   LOUD, NAMED REFUSAL — never ALLOW+warn. THE DEFECT THIS CLOSES: the previous line
  //   returned `cancel:false, advisory:"ALLOW+warn"`, so EVERY structural edit passed with
  //   a warning nobody read. That is a SILENT FALLBACK wearing a token, and it is the exact
  //   mechanism by which this build shipped 356 green tests over a graph that could not see
  //   the code (reports/GI_kernel_v21_forensic_autopsy_context.md §4.2, D-9).
  //   THE ESCAPE IS EXPLICIT AND NAMED: `GI_ALLOW_NO_STORE=1` for a deliberate bootstrap
  //   (the first populate of a fresh scope). It is never the default, and it is never
  //   silent — the advisory records that the gate was bypassed ON PURPOSE.
  if (!input.hasStore) {
    if ((process.env.GI_ALLOW_NO_STORE ?? "") === "1") {
      return {
        cancel: false,
        token: "GI_NO_STORE",
        advisory:
          "GI_NO_STORE: BYPASSED BY EXPLICIT ENV (GI_ALLOW_NO_STORE=1) — the graph gate did NOT verify this edit.",
      };
    }
    return {
      cancel: true,
      token: "GI_NO_STORE",
      advisory:
        "GI_NO_STORE: no graph store for this scope — the gate CANNOT verify this edit, so it REFUSES. Populate the store (a graph-query populates on demand) or set GI_DIAL=OFF to disable the gate deliberately. A missing substrate is never a pass.",
    };
  }
  const before = parseExports(input.oldText);
  const after = new Set(parseExports(input.newText));
  const removed = before.filter((n) => !after.has(n));
  if (removed.length === 0) {
    return { cancel: false, token: null, advisory: null };
  }
  if (input.dial === "FULL") {
    return {
      cancel: true,
      token: "GRAPH_GATE_SIGNATURE_BREAK",
      advisory: `removed=${removed.join(",")}`,
    };
  }
  if (input.dial === "STEER") {
    return {
      cancel: false,
      token: "[GATE STEER]",
      advisory: `SIGNATURE_BREAK removed=${removed.join(",")}`,
    };
  }
  return { cancel: false, token: null, advisory: null };
}

export interface ExportSite {
  name: string;
  line: number;
}

// R4: same GG-BUG-2 semantics as parseExports, plus the 1-based declaration
// line per site (fork schema parity: typed_nodes.line). Braces/default lines
// point at the export statement.
export function parseExportSites(src: string): ExportSite[] {
  const out = new Map<string, number>();
  const lineOf = (off: number): number => {
    let line = 1;
    for (let i = 0; i < off; i++) if (src.charCodeAt(i) === 10) line++;
    return line;
  };
  const put = (name: string, off: number): void => {
    if (!out.has(name)) out.set(name, lineOf(off));
  };
  eachExportName(src, (n, off) => put(n, off));
  return [...out.entries()].map(([name, line]) => ({ name, line }));
}
