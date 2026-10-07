#!/usr/bin/env bun
// GI KERNEL V2.3 — FR-1 · THE GI LSP SERVER (stdio, JSON-RPC 2.0, backed by the 6 layers).
//
// ★ THE REFLEX. The 6 layers were a QUERYABLE LIBRARY (reached only by the gi-consumption
//   tool). This server makes them a SENSE ORGAN: OMP's native runtime drives it on every
//   open/change, and the fact cards arrive with NO agent action.
//
// THE TWO-LAYER SURFACE:
//   L1 the STANDARD LSP — hover · definition · references · diagnostics, served FROM the layers.
//   L2 the INTELLIGENCE backend — the SAME fact cards (the Card-HUD's brain).
//
// THE STORE: this reads the TARGET's PROJECT-scope stores (`<root>/.omp/graph-intelligence/
// *-checkout/store.sqlite`), which is what `gi-populate --target <root>` writes. A missing
// store is the NAMED `GI_NO_STORE` refusal (the C2 container angle), never a silent empty.
//
// usage:
//   bun scripts/gi-lsp.ts --stdio                 (an OMP LSP client drives it)
//   bun scripts/gi-lsp.ts --selftest <file>       (S1: print the diagnostics + exit 0 iff ≥1)
import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import { fileCards, GI_LSP_TOKENS, relTo, shownTotal, type FactCard } from "../src/gi-lsp/cards.ts";
import { jevk5Probe } from "../src/omp/adapters/jevk5.ts"; // ★ W4 — the live TSG (JevK5) judge

/** Count the LIVE nodes in a PROJECT store directly (openTypedStore enforces the SESSION-store
 *  path, so it refuses a project store — the raw open is the correct read here). -1 on error. */
function nodeCountRaw(storePath: string): number {
  try {
    const db = new Database(storePath, { readonly: true });
    try {
      const row = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number };
      return row?.n ?? 0;
    } finally {
      db.close();
    }
  } catch {
    return -1;
  }
}

// ── the store resolution (the PROJECT-scope checkouts, in substrate-priority order) ─────────
const STORE_RELS = [
  ".omp/graph-intelligence/corbell-checkout/store.sqlite",
  ".omp/graph-intelligence/graphify-checkout/store.sqlite",
  ".omp/graph-intelligence/structural/store.sqlite",
];

interface ResolvedStore { path: string; ok: boolean; reason?: string }

/** Resolve the project-scope store the LSP reads. A miss is the NAMED GI_NO_STORE (C2). */
export function resolveStore(projectRoot: string): ResolvedStore {
  for (const rel of STORE_RELS) {
    const p = path.join(projectRoot, rel);
    if (fs.existsSync(p)) {
      if (nodeCountRaw(p) > 0) return { path: p, ok: true };
    }
  }
  return { path: "", ok: false, reason: `GI_NO_STORE: no populated store under ${projectRoot}/.omp/graph-intelligence (run: bun scripts/gi-populate.ts --target ${projectRoot})` };
}

/** ★ F2 FIX (2026-10-07): the SECOND populated substrate store (for the CONFLICT card — the
 *  L5/L6 disagreement diff). Returns the next existing store after the primary, or null. */
function resolveAltStore(projectRoot: string, primary: string): string | null {
  for (const rel of STORE_RELS) {
    const p = path.join(projectRoot, rel);
    if (p === primary) continue;
    if (fs.existsSync(p) && nodeCountRaw(p) > 0) return p;
  }
  return null;
}

/** The diagnostics for one file (the didOpen/didChange core). Throws GI_NO_STORE when absent. */
export function diagnosticsFor(projectRoot: string, absFile: string): { cards: FactCard[]; relFile: string } {
  const store = resolveStore(projectRoot);
  if (!store.ok) throw new Error(store.reason);
  const relFile = relTo(projectRoot, absFile);
  let src = "";
  try {
    src = fs.readFileSync(absFile, "utf8");
  } catch {
    return { cards: [], relFile };
  }
  // ★ the PROJECT store is opened DIRECTLY (it does not satisfy openTypedStore's
  //   session-store path contract) — the cards use the `*InDb` cores.
  const db = new Database(store.path, { readonly: true });
  let altDb: Database | null = null;
  try {
    // ★ W4 — the LIVE JevK5 judge (TSG rung). A DOWN endpoint throws inside meaningCard →
    //   fail-open (no MEANING card), never a broken editor.
    const judge = jevk5Probe(projectRoot).facts; // facts IS the (subject)=>LayerFact[] judge
    // ★ F2 FIX (2026-10-07): open the SECOND substrate store so the CONFLICT shape is reachable.
    const alt = resolveAltStore(projectRoot, store.path);
    if (alt) altDb = new Database(alt, { readonly: true });
    const cards = fileCards({ db, projectRoot, relFile, src, judge, altDb: altDb ?? undefined });
    return { cards, relFile };
  } finally {
    altDb?.close();
    db.close();
  }
}

/** A card → an LSP Diagnostic (0-based line; the card's title + rows become the message). */
function toDiagnostic(card: FactCard, src: string): Record<string, unknown> {
  const firstLine = 0; // file-level anchor; a per-decl card carries its own rows in the message
  const lines = src.split("\n");
  const col = lines[firstLine]?.length ?? 0;
  const message = `${card.title}\n${card.rows.map((r) => "  " + r).join("\n")}`;
  return {
    range: { start: { line: firstLine, character: 0 }, end: { line: firstLine, character: col } },
    severity: card.severity,
    source: card.source,
    code: card.shape,
    message,
  };
}

// ── the JSON-RPC stdio loop (Content-Length framed) ────────────────────────────────────────
interface Rpc { jsonrpc?: string; id?: number | string; method?: string; params?: Record<string, unknown> }

function send(obj: unknown): void {
  const body = JSON.stringify(obj);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n${body}`);
}

export function runServer(): void {
  let buffer = Buffer.alloc(0);
  let projectRoot = process.cwd();
  const openDocs = new Map<string, string>();

  const handle = (msg: Rpc): void => {
    const { method, id } = msg;
    const params = msg.params ?? {};
    if (process.env.GI_LSP_DEBUG) process.stderr.write(`[gi-lsp] recv method=${method} id=${id}\n`);
    if (method === "initialize") {
      const rootUri = String((params.rootUri as string) ?? (params.rootPath as string) ?? "");
      const folders = (params.workspaceFolders as Array<{ uri: string }> | undefined) ?? [];
      const uri = rootUri || folders[0]?.uri || "";
      if (uri.startsWith("file://")) projectRoot = decodeURIComponent(uri.slice("file://".length));
      send({
        jsonrpc: "2.0",
        id,
        result: {
          capabilities: {
            textDocumentSync: 1, // full
            hoverProvider: true,
            definitionProvider: true,
            referencesProvider: true,
          },
          serverInfo: { name: "gi-lsp", version: "2.3.0" },
        },
      });
      return;
    }
    if (method === "initialized" || method === "textDocument/didSave") return;
    if (method === "shutdown") { send({ jsonrpc: "2.0", id, result: null }); return; }
    if (method === "exit") { process.exit(0); }
    if (method === "textDocument/didOpen" || method === "textDocument/didChange") {
      const td = (params.textDocument as { uri: string; text?: string }) ?? { uri: "" };
      const absFile = td.uri.startsWith("file://") ? decodeURIComponent(td.uri.slice(7)) : td.uri;
      let src = td.text ?? "";
      if (method === "textDocument/didOpen" && !src) { try { src = fs.readFileSync(absFile, "utf8"); } catch { /* empty */ } }
      openDocs.set(absFile, src);
      try {
        const { cards } = diagnosticsFor(projectRoot, absFile);
        const diagnostics = cards.map((c) => toDiagnostic(c, src));
        send({ jsonrpc: "2.0", method: "textDocument/publishDiagnostics", params: { uri: td.uri, diagnostics } });
        if (process.env.GI_LSP_DEBUG) process.stderr.write(`[gi-lsp] sent ${diagnostics.length} diagnostics for ${absFile}\n`);
      } catch (e) {
        if (process.env.GI_LSP_DEBUG) process.stderr.write(`[gi-lsp] didOpen ERROR: ${String(e)}\n`);
        send({ jsonrpc: "2.0", method: "textDocument/publishDiagnostics", params: { uri: td.uri, diagnostics: [{ range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, severity: 1, source: "gi-lsp/store", message: String(e instanceof Error ? e.message : e) }] } });
      }
      return;
    }
    if (method === "textDocument/hover" || method === "textDocument/definition" || method === "textDocument/references") {
      if (id === undefined) return;
      send({ jsonrpc: "2.0", id, result: null }); // v1: diagnostics carry the cards; rich hover lands with W4
      return;
    }
    if (id !== undefined) send({ jsonrpc: "2.0", id, result: null });
  };

  process.stdin.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const sep = buffer.indexOf("\r\n\r\n");
      if (sep < 0) break;
      const header = buffer.slice(0, sep).toString("utf8");
      const m = /Content-Length:\s*(\d+)/i.exec(header);
      if (!m) { buffer = buffer.slice(sep + 4); continue; }
      const len = Number(m[1]);
      const start = sep + 4;
      if (buffer.length < start + len) break;
      const body = buffer.slice(start, start + len).toString("utf8");
      buffer = buffer.slice(start + len);
      try { handle(JSON.parse(body) as Rpc); } catch { /* a malformed frame is skipped, never fatal */ }
    }
  });
  process.stdin.resume();
}

// ── the selftest (S1: ≥1 diagnostic whose source ∈ GI_LSP_TOKENS) ───────────────────────────
export function selftest(file: string): number {
  const root = process.cwd();
  const absFile = path.resolve(file);
  console.log(`gi-lsp selftest · root=${root} · file=${relTo(root, absFile)}`);
  let cards: FactCard[];
  try {
    const r = diagnosticsFor(root, absFile);
    cards = r.cards;
  } catch (e) {
    console.log(`  ${String(e instanceof Error ? e.message : e)}`);
    return 1;
  }
  if (cards.length === 0) {
    console.log("  GI_LSP_NO_DIAGNOSTICS: 0 cards (an unwired or empty file — honest, but S1 needs ≥1)");
    return 1;
  }
  for (const c of cards) {
    console.log(`  [${c.source}] ${c.title}`);
    for (const r of c.rows.slice(0, 4)) console.log(`      ${r}`);
  }
  console.log(`  ${shownTotal(cards)}`);
  const ok = cards.every((c) => (GI_LSP_TOKENS as readonly string[]).includes(c.source));
  console.log(`  selftest: ${ok ? "OK" : "FAIL"} — ${cards.length} diagnostic(s), all sources in GI_LSP_TOKENS`);
  return ok ? 0 : 1;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.includes("--selftest")) {
    const file = args[args.indexOf("--selftest") + 1] ?? "";
    if (!file) { console.error("gi-lsp: --selftest needs a file"); process.exit(2); }
    process.exit(selftest(file));
  }
  runServer();
}
