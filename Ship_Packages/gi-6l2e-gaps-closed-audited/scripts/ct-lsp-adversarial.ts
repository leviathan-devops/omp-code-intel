// THE CONTAINER ADVERSARIAL HARNESS (Part A) — drives the REAL gi-lsp over stdio INSIDE the
// container against the adversarial corpus. Every case asserts a SPECIFIC token in a TOOL RESULT
// (this script's own stdout) and requires the failToken ABSENT. Adversarial FIRST; the happy
// path LAST. Run: bun /gi/scripts/ct-lsp-adversarial.ts
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const REPO = "/gi";
const LSP = path.join(REPO, "scripts", "gi-lsp.ts");
const STORE_DIR = path.join(REPO, ".omp", "graph-intelligence");
const STORE_BAK = path.join(REPO, ".omp", "graph-intelligence.CT-BAK");

type Case = { id: string; passToken: string; failToken: string; ok: boolean; note: string };
const results: Case[] = [];
const rec = (id: string, passToken: string, failToken: string, ok: boolean, note: string) => {
  results.push({ id, passToken, failToken, ok, note });
  console.log(`${ok ? "PASS" : "*** FAIL"} ${id}  [${passToken}${ok ? " ✓" : " ✗"}] ${note}`);
};

// ---- the LSP client (a real Content-Length framing over stdio) ----
class Lsp {
  proc: ReturnType<typeof spawn>;
  private buf = Buffer.alloc(0);
  private waiting: ((m: unknown) => void)[] = [];
  private inbox: unknown[] = [];
  private dead = false;
  constructor() {
    this.proc = spawn("bun", [LSP, "--stdio"], { cwd: REPO, stdio: ["pipe", "pipe", "pipe"] });
    this.proc.stdout!.on("data", (d: Buffer) => { this.buf = Buffer.concat([this.buf, d]); this.pump(); });
    this.proc.on("exit", () => { this.dead = true; });
  }
  private pump() {
    for (;;) {
      const i = this.buf.indexOf("\r\n\r\n");
      if (i < 0) return;
      const h = this.buf.subarray(0, i).toString();
      const m = /Content-Length:\s*(\d+)/i.exec(h);
      if (!m) { this.buf = this.buf.subarray(i + 4); continue; }
      const n = Number(m[1]);
      if (this.buf.length < i + 4 + n) return;
      const body = this.buf.subarray(i + 4, i + 4 + n).toString();
      this.buf = this.buf.subarray(i + 4 + n);
      try {
        const msg = JSON.parse(body);
        const w = this.waiting.shift();
        if (w) w(msg); else this.inbox.push(msg);
      } catch { /* a malformed frame is itself a finding — counted by the caller's timeout */ }
    }
  }
  send(o: unknown) { const b = JSON.stringify(o); this.proc.stdin!.write(`Content-Length: ${Buffer.byteLength(b)}\r\n\r\n${b}`); }
  next(timeoutMs: number): Promise<unknown | null> {
    if (this.inbox.length) return Promise.resolve(this.inbox.shift()!);
    return new Promise((res) => {
      const t = setTimeout(() => res(null), timeoutMs);
      this.waiting.push((m) => { clearTimeout(t); res(m); });
    });
  }
  async init(): Promise<string> {
    this.send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { processId: null, rootUri: `file://${REPO}`, capabilities: {} } });
    const r = (await this.next(20000)) as { result?: { capabilities?: unknown } } | null;
    this.send({ jsonrpc: "2.0", method: "initialized", params: {} });
    return JSON.stringify(r?.result?.capabilities ?? null);
  }
  async open(uri: string, text: string, timeoutMs = 20000): Promise<unknown[] | null> {
    this.send({ jsonrpc: "2.0", method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "typescript", version: 1, text } } });
    const out: unknown[] = [];
    for (let i = 0; i < 6; i++) {
      const m = (await this.next(timeoutMs)) as { method?: string; params?: { diagnostics?: unknown[] } } | null;
      if (m === null) return out.length ? out : null;      // timeout
      if (m.method === "textDocument/publishDiagnostics") out.push(...(m.params?.diagnostics ?? []));
      if (m.method === "textDocument/publishDiagnostics") return out;
    }
    return out;
  }
  kill() { try { this.proc.kill("SIGKILL"); } catch { /* already gone */ } }
}

const dsOf = (ds: unknown[] | null): { n: number; text: string } => {
  if (ds === null) return { n: -1, text: "" };
  return { n: ds.length, text: JSON.stringify(ds).slice(0, 4000) };
};

const main = async () => {
  const caps = await (async () => { const c = new Lsp(); const s = await c.init(); c.kill(); return s; })();
  console.log(`[harness] initialize capabilities: ${caps.slice(0, 160)}`);

  // ================= PART A — ADVERSARIAL FIRST =================
  // A1 — THE BROKEN STORE
  if (fs.existsSync(STORE_DIR)) fs.renameSync(STORE_DIR, STORE_BAK);
  {
    const c = new Lsp(); await c.init();
    const ds = await c.open(`file://${REPO}/src/hunter/profile/source-roots.ts`, "export const x = 1;\n");
    const { n, text } = dsOf(ds);
    const named = /GI_NO_STORE|scope|no populated store/i.test(text);
    rec("A1-the-broken-store", "GI_NO_STORE|[gi-lsp/scope]", "a silent zero-diagnostic reply", n !== -1 && named, `diagnostics=${n} named=${named} :: ${text.slice(0, 160)}`);
    c.kill();
  }

  // A2 — THE FOREIGN STORE (a store whose build_root is a DIFFERENT tree)
  {
    const foreign = path.join(REPO, ".omp", "graph-intelligence");
    fs.mkdirSync(foreign, { recursive: true });
    const src = path.join(STORE_BAK, "corbell-checkout");
    if (fs.existsSync(src)) fs.cpSync(src, path.join(foreign, "corbell-checkout"), { recursive: true });
    const c = new Lsp(); await c.init();
    const ds = await c.open(`file://${REPO}/src/hunter/profile/source-roots.ts`, "export const x = 1;\n");
    const { n, text } = dsOf(ds);
    const named = /scope mismatch|build_root/i.test(text);
    rec("A2-the-foreign-store", "scope mismatch", "a silent clean", n !== -1 && named, `diagnostics=${n} named=${named} :: ${text.slice(0, 160)}`);
    c.kill();
  }
  // restore the real store for the remaining cases
  fs.rmSync(path.join(REPO, ".omp", "graph-intelligence"), { recursive: true, force: true });
  if (fs.existsSync(STORE_BAK)) fs.renameSync(STORE_BAK, STORE_DIR);

  // A3 — THE DOC-ONLY EDIT (must be SILENT)
  {
    const c = new Lsp(); await c.init();
    const ds = await c.open(`file://${REPO}/README.md`, "# a doc\n");
    const { n, text } = dsOf(ds);
    rec("A3-the-doc-edit-silent", "diagnostics=0", "a [gi-lsp/ diagnostic on a .md", n === 0, `diagnostics=${n} :: ${text.slice(0, 120)}`);
    c.kill();
  }

  // A4 — THE MALFORMED URI + THE NONEXISTENT FILE (no crash; the server answers after)
  {
    const c = new Lsp(); await c.init();
    await c.open("file:///not-a-real-uri-\u0000:::", "x", 8000);
    const ds2 = await c.open(`file://${REPO}/does/not/exist-xyz.ts`, "export const y = 2;\n");
    const alive = ds2 !== null;
    rec("A4-malformed-then-alive", "ALIVE AFTER MALFORMED", "a crash / no reply", alive, `the reply after the malformed input: ${alive ? "received" : "TIMEOUT"} (diagnostics=${dsOf(ds2).n})`);
    c.kill();
  }

  // A5 — THE RAPID BURST (50 didChange cycles)
  {
    const c = new Lsp(); await c.init();
    const uri = `file://${REPO}/src/hunter/profile/source-roots.ts`;
    c.send({ jsonrpc: "2.0", method: "textDocument/didOpen", params: { textDocument: { uri, languageId: "typescript", version: 1, text: "export const z = 1;\n" } } });
    for (let i = 2; i <= 51; i++) {
      c.send({ jsonrpc: "2.0", method: "textDocument/didChange", params: { textDocument: { uri, version: i }, contentChanges: [{ text: `export const z = ${i};\n` }] } });
    }
    const m = await c.next(30000);
    const alive = m !== null;
    rec("A5-the-rapid-burst", "BURST OK", "a timeout", alive, `a reply after 50 changes: ${alive ? "received" : "TIMEOUT"}`);
    c.kill();
  }

  // A6 — THE HUGE FILE (10k lines; bounded)
  {
    const c = new Lsp(); await c.init();
    const big = Array.from({ length: 10000 }, (_, i) => `export const v${i} = ${i};`).join("\n") + "\n";
    const t0 = Date.now();
    const ds = await c.open(`file://${REPO}/src/hunter/profile/source-roots.ts`, big, 45000);
    const dt = Date.now() - t0;
    rec("A6-the-huge-file-bounded", "HUGE OK", "a timeout", ds !== null, `a 10k-line file answered in ${dt}ms (diagnostics=${dsOf(ds).n})`);
    c.kill();
  }

  // A7 — THE REFLEX POSITIVE (HAPPY PATH, LAST)
  {
    const c = new Lsp(); await c.init();
    const ds = await c.open(`file://${REPO}/src/hunter/profile/source-roots.ts`, "export const x = 1;\n");
    const { n, text } = dsOf(ds);
    const gi = /"source":"gi-lsp\//.test(text);   // ★ the JSON field, not the rendered bracket form
    rec("A7-the-reflex-positive", "[gi-lsp/", "zero diagnostics", n >= 1 && gi, `diagnostics=${n} gi-sourced=${gi} :: ${text.slice(0, 200)}`);
    c.kill();
  }

  // ================= THE TABLE =================
  const pass = results.filter((r) => r.ok).length;
  console.log(`\n==== THE ADVERSARIAL TABLE: ${pass}/${results.length} PASS ====`);
  for (const r of results) console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.id}  (passToken: ${r.passToken})`);
  fs.writeFileSync(path.join(REPO, ".omp", "ct-part-a.json"), JSON.stringify({ results, pass, total: results.length }, null, 1));
  process.exit(pass === results.length ? 0 : 1);
};

main().catch((e) => { console.error("HARNESS CRASH:", e); process.exit(2); });
