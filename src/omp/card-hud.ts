// GI KERNEL V2.3 — FR-4 · THE CARD-HUD (the PORTABLE fallback for the GI LSP).
//
// ★ WHERE NO LSP EXISTS, the graph still informs: on every write/edit, the SAME fact cards
//   the LSP emits are queued as a steer note and delivered on the tool_result. ONE card
//   renderer (src/gi-lsp/cards.ts), TWO consumers (the LSP + this HUD).
//
// ★ THE POLARITY LAW: the HUD INFORMS, it never blocks — fail-OPEN. A missing store is
//   SILENT (the LSP's GI_NO_STORE loud refusal belongs to the LSP path, not the HUD). A
//   doc-only edit yields ZERO cards (the C5 negative).
//
// The queue + delivery mirror src/omp/gate-hook.ts (the proven pattern): tool_call enqueues
// by (tool, file); tool_result drains the same-file entry first.
import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import { fileCards, GI_LSP_TOKENS, relTo, shownTotal, type FactCard } from "../gi-lsp/cards.ts";
import { jevk5Probe } from "./adapters/jevk5.ts"; // ★ W4 — the live TSG (JevK5) judge (fail-open)

/** The project-scope stores the HUD reads (mirrors scripts/gi-lsp.ts). */
const STORE_RELS = [
  ".omp/graph-intelligence/corbell-checkout/store.sqlite",
  ".omp/graph-intelligence/graphify-checkout/store.sqlite",
  ".omp/graph-intelligence/structural/store.sqlite",
];

function resolveStorePath(projectRoot: string): string | null {
  for (const rel of STORE_RELS) {
    const p = path.join(projectRoot, rel);
    if (!fs.existsSync(p)) continue;
    try {
      const db = new Database(p, { readonly: true });
      const n = (db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number })?.n ?? 0;
      db.close();
      if (n > 0) return p;
    } catch {
      // try the next substrate
    }
  }
  return null;
}

/** Format the cards as the HUD block the steer note carries (the `shown=N total=M` suffix). */
export function formatHud(cards: FactCard[]): string {
  const head = `[GI CARD-HUD] ${cards.length} card(s) for this file's symbols (${shownTotal(cards)})`;
  const body = cards
    .map((c) => `  · ${c.title}\n${c.rows.slice(0, 4).map((r) => `      ${r}`).join("\n")}`)
    .join("\n");
  return `${head}\n${body}`;
}

interface PendingCard { tool: string; note: string; file: string; enqueuedAt: number }

const PENDING_MAX_PER_SID = 8;
const PENDING_TTL_MS = 5 * 60 * 1000;

const CODE_TOOLS = new Set(["write", "write_file", "edit", "patch"]);

function fileOf(input: Record<string, unknown>): string {
  for (const k of ["file_path", "filePath", "path", "file"]) {
    const v = input[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

function cwdOf(event: Record<string, unknown>): string {
  for (const k of ["cwd", "workspaceRoot", "root"]) {
    const v = event[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return process.cwd();
}

/** Attach the Card-HUD to an OMP extension's `pi` surface (the `on` registrar). */
export function attachCardHud(pi: { on: (event: string, cb: (e: Record<string, unknown>) => unknown) => void }): void {
  const pending = new Map<string, PendingCard[]>();

  pi.on("tool_call", (event) => {
    const name = String(event.toolName ?? "").toLowerCase();
    if (!CODE_TOOLS.has(name)) return undefined;
    if (event.isAgentOrigin === false) return undefined;
    const input = (event.input && typeof event.input === "object" ? event.input : {}) as Record<string, unknown>;
    const file = fileOf(input);
    if (file.length === 0) return undefined;

    // ★ FAIL-OPEN: every failure path is SILENT — the HUD never blocks an edit.
    try {
      const projectRoot = cwdOf(event);
      const storePath = resolveStorePath(projectRoot);
      if (storePath === null) return undefined;
      const relFile = relTo(projectRoot, path.isAbsolute(file) ? file : path.join(projectRoot, file));
      const src = fs.readFileSync(path.isAbsolute(file) ? file : path.join(projectRoot, file), "utf8");
      const db = new Database(storePath, { readonly: true });
      let altDb: Database | null = null;
      let cards: FactCard[] = [];
      try {
        // ★ W4 — the live JevK5 judge (fail-open: a down endpoint → no MEANING card).
        const judge = jevk5Probe(projectRoot).facts; // facts IS the (subject)=>LayerFact[] judge
        // ★ F2 FIX (2026-10-07): open the SECOND substrate store so the CONFLICT shape is reachable.
        for (const rel of STORE_RELS) {
          const ap = path.join(projectRoot, rel);
          if (ap === storePath || !fs.existsSync(ap)) continue;
          try {
            const adb = new Database(ap, { readonly: true });
            const n = (adb.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number })?.n ?? 0;
            if (n > 0) { altDb = adb; break; }
            adb.close();
          } catch { /* try the next substrate */ }
        }
        cards = fileCards({ db, projectRoot, relFile, src, judge, altDb: altDb ?? undefined });
      } finally {
        altDb?.close();
        db.close();
      }
      if (cards.length === 0) return undefined; // a doc-only edit → SILENT (the C5 negative)
      const sid = String(event.sessionID ?? event.sessionId ?? "default");
      const now = Date.now();
      const q = (pending.get(sid) ?? []).filter((e) => now - e.enqueuedAt <= PENDING_TTL_MS);
      q.push({ tool: name, note: formatHud(cards), file: relFile, enqueuedAt: now });
      while (q.length > PENDING_MAX_PER_SID) q.shift();
      pending.set(sid, q);
    } catch {
      // fail-open: the HUD never blocks
    }
    return undefined;
  });

  pi.on("tool_result", (event) => {
    const name = String(event.toolName ?? "").toLowerCase();
    if (!CODE_TOOLS.has(name)) return undefined;
    const sid = String(event.sessionID ?? event.sessionId ?? "default");
    const q = pending.get(sid);
    if (!q || q.length === 0) return undefined;
    const input = (event.input && typeof event.input === "object" ? event.input : {}) as Record<string, unknown>;
    const resFile = fileOf(input);
    let qi = resFile ? q.findIndex((e) => e.tool === name && e.file.endsWith(resFile)) : -1;
    if (qi === -1) qi = q.findIndex((e) => e.tool === name);
    if (qi === -1) return undefined;
    const card = q.splice(qi, 1)[0]!;
    if (q.length === 0) pending.delete(sid);
    return { content: [{ type: "text", text: card.note }], prepend: true } as unknown;
  });
}

/** Re-exported for the test (the token set the HUD's cards carry). */
export const HUD_TOKENS = GI_LSP_TOKENS;
