// OMP write/edit graph-gate. STEER default. FULL cancels on export strip.
// No @mimo-ai/plugin. Fail-open when no store (GI_NO_STORE).

import * as fs from "node:fs";

export type GiDial = "OFF" | "STEER" | "FULL";

// Fork GG-BUG-2 v2 EXPORTED-NAME semantics (graph-gate.ts:234-261, EXPORT_PARSE_RE
// graph-gate.ts:146): declaration form yields the name; `export { a as b }`
// yields the ALIAS; `export default` yields 'default'. OMP baseline recall was
// 0.366 on the 238-file live tree (564/1542) with the function-only regex.
const EXPORT_PARSE_RE = /export\s+(?:async\s+)?(?:function|const|class|let|var|type|interface|enum)\s+(\w+)/g;
const EXPORT_BRACES_RE = /export\s*\{([^}]*)\}(?:\s*from\s*['"][^'"]*['"])?/g;
const EXPORT_DEFAULT_RE = /export\s+default\b/g;

export function parseExports(src: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  EXPORT_PARSE_RE.lastIndex = 0;
  while ((m = EXPORT_PARSE_RE.exec(src))) out.add(m[1]);
  EXPORT_BRACES_RE.lastIndex = 0;
  while ((m = EXPORT_BRACES_RE.exec(src))) {
    for (const spec of m[1].split(",")) {
      const s = spec.trim();
      if (!s) continue;
      const asMatch = /\bas\s+(\w+)\s*$/.exec(s);
      if (asMatch) { out.add(asMatch[1]); continue; }
      const plain = /^(\w+)$/.exec(s);
      if (plain) out.add(plain[1]);
    }
  }
  EXPORT_DEFAULT_RE.lastIndex = 0;
  while ((m = EXPORT_DEFAULT_RE.exec(src))) out.add("default");
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
  let m: RegExpExecArray | null;
  EXPORT_PARSE_RE.lastIndex = 0;
  while ((m = EXPORT_PARSE_RE.exec(src))) put(m[1], m.index);
  EXPORT_BRACES_RE.lastIndex = 0;
  while ((m = EXPORT_BRACES_RE.exec(src))) {
    for (const spec of m[1].split(",")) {
      const s = spec.trim();
      if (!s) continue;
      const asMatch = /\bas\s+(\w+)\s*$/.exec(s);
      if (asMatch) { put(asMatch[1], m.index); continue; }
      const plain = /^(\w+)$/.exec(s);
      if (plain) put(plain[1], m.index);
    }
  }
  EXPORT_DEFAULT_RE.lastIndex = 0;
  while ((m = EXPORT_DEFAULT_RE.exec(src))) put("default", m.index);
  return [...out.entries()].map(([name, line]) => ({ name, line }));
}
