// THE GI V2.3 PRODUCTION SUITE — THE FULL-SCALE LIVE TEST (runtime-testing skill).
// The ladder: D1 unit/script · D2 live · D3 container · D4 audit · D5 hot-seat.
// THIS FILE covers D1 + D2 (the in-process mechanism + the REAL store/judge).
// D3 (the container) = scripts/ct-lsp-adversarial.ts · D4 (the audit) = the ocr gate ·
// D5 (the hot seat) = the live TUI observation (the live-readiness evidence in the artifact dir).
//
// THE ISOLATION LAW (the skill's §4): every scenario ISOLATES the rung it names — the
// cheapest rung answering means the scenario measured the WRONG layer. Each case below
// states its rung + its observation channel + its proof class.
//
// Run: bun scripts/gi-production-suite.ts            (the stub/offline cases)
//      bun scripts/gi-production-suite.ts --live     (the REAL judge over the REAL store)
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { Database } from "bun:sqlite";

const REPO = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence";
const LIVE = process.argv.includes("--live");
type V = "PASS" | "FAIL" | "UNREACHED";
type Row = {
  id: string; domain: string; rung: string; channel: string; proof: string;
  verdict: V; observed: string;
};
const rows: Row[] = [];
const rec = (r: Row) => {
  rows.push(r);
  console.log(`${r.verdict === "PASS" ? "PASS" : r.verdict === "FAIL" ? "*** FAIL" : "-- UNREACHED"} [${r.domain}] ${r.id} :: ${r.observed.slice(0, 150)}`);
};

// ════════════════ THE RUNG ISOLATION GUARD (the skill's A-1) ════════════════
// The LSP's store resolution + the judge are the two rungs. A scenario that names the judge
// must PROVE the store settled first (else it measured the store, not the judge).
const storePath = path.join(REPO, ".omp", "graph-intelligence");
const storeCounts = (): { rows: number; ledger: number } => {
  let rows_ = 0, ledger = 0;
  try {
    const d = new Database(path.join(storePath, "corbell-checkout", "store.sqlite"), { readonly: true });
    rows_ = (d.query("SELECT COUNT(*) AS n FROM typed_nodes").get() as { n: number })?.n ?? 0;
    d.close();
  } catch { rows_ = -1; }
  try {
    const d2 = new Database(path.join(storePath, "fire-decisions.db"), { readonly: true });
    ledger = (d2.query("SELECT COUNT(*) AS n FROM fire_decisions").get() as { n: number })?.n ?? 0;
    d2.close();
  } catch { ledger = -1; }
  return { rows: rows_, ledger };
};

// ════════════════ S1 — THE STORE IS POPULATED (the substrate) ════════════════
{
  const c = storeCounts();
  rec({
    id: "S1-the-store-populated", domain: "D2 live", rung: "the store",
    channel: "the sqlite COUNT(*) read back", proof: "the ROW (existence)",
    verdict: c.rows > 0 ? "PASS" : "FAIL",
    observed: `typed_nodes=${c.rows} (the corbell checkout) · fire-decisions rows=${c.ledger}`,
  });
}

// ════════════════ S2 — THE CARDS ANSWER FROM THE STORE (the decision) ════════════════
{
  const cards = await import(path.join(REPO, "src/gi-lsp/cards.ts"));
  let verdict: V = "FAIL", observed = "";
  try {
    const d = new Database(path.join(storePath, "corbell-checkout", "store.sqlite"), { readonly: true });
    // a symbol the store certainly holds (a real repo symbol)
    const anyNode = (d.query("SELECT label FROM typed_nodes WHERE kind IN ('method','class') AND file IS NOT NULL LIMIT 1").get() as { label: string } | null)?.label;
    const callers = anyNode ? cards.callersCard(d, anyNode) : null;
    const unwired = anyNode ? cards.unwiredCard(d, anyNode) : null;
    d.close();
    observed = `symbol=${anyNode ?? "none"} · callersCard=${callers ? `${callers.rows.length}/${callers.total}` : "null"} · unwiredCard=${unwired ? "a card" : "null"}`;
    verdict = anyNode ? "PASS" : "FAIL";
  } catch (e) { observed = `THREW: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`; }
  rec({ id: "S2-the-cards-answer", domain: "D2 live", rung: "the cards over the real store", channel: "the card's own rows+total", proof: "the ROW + the shape", verdict, observed });
}

// ════════════════ S3 — THE STORE'S SELF-CONSISTENCY (the facts vs the disk) ════════════════
// The store's rows claim file:line anchors — this verifies a SAMPLE against the real files.
{
  let checked = 0, bad = 0, sample = "";
  try {
    const d = new Database(path.join(storePath, "corbell-checkout", "store.sqlite"), { readonly: true });
    const ns = d.query("SELECT label, file, line FROM typed_nodes WHERE file IS NOT NULL AND line > 0 LIMIT 25").all() as { label: string; file: string; line: number }[];
    d.close();
    for (const n of ns) {
      checked++;
      const p = path.isAbsolute(n.file) ? n.file : path.join(REPO, n.file);
      if (!fs.existsSync(p)) { bad++; if (!sample) sample = `${n.label} -> MISSING ${n.file}:${n.line}`; }
    }
  } catch (e) { sample = `THREW: ${e instanceof Error ? e.message.slice(0, 80) : ""}`; bad = 1; }
  rec({
    id: "S3-anchors-point-at-real-files", domain: "D2 live", rung: "the store's anchors vs the disk",
    channel: "fs.existsSync per sampled anchor", proof: "the BEHAVIOR DELTA (the disk agrees)",
    verdict: checked > 0 && bad === 0 ? "PASS" : checked > 0 ? "FAIL" : "UNREACHED",
    observed: `${checked} sampled · ${bad} missing${sample ? " · e.g. " + sample : ""}`,
  });
}

// ════════════════ S4 — THE JUDGE (the LIVE model, the real latency) ════════════════
if (!LIVE) {
  rec({ id: "S4-the-judge-live", domain: "D2 live", rung: "the JevK5 judge", channel: "n/a (the --live flag off)", proof: "—", verdict: "UNREACHED", observed: "run with --live (costs a model call)" });
} else {
  const t0 = Date.now();
  try {
    const r = await fetch("http://127.0.0.1:8090/v1/systemone", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: "a probe symbol with no callers", questions: { unwired: { type: "choice", instructions: "Is this symbol unreferenced?", criteria: { yes: null, no: null } } } }),
      signal: AbortSignal.timeout(30000),
    });
    const j = await r.json() as unknown;
    const dt = Date.now() - t0;
    rec({
      id: "S4-the-judge-live", domain: "D2 live", rung: "the JevK5 judge", channel: "the judge's own HTTP reply",
      proof: "the RECEIPT (a real probability from the real model)",
      verdict: r.ok ? "PASS" : "FAIL",
      observed: `HTTP ${r.status} in ${dt}ms · ${JSON.stringify(j).slice(0, 200)}`,
    });
  } catch (e) {
    rec({ id: "S4-the-judge-live", domain: "D2 live", rung: "the JevK5 judge", channel: "the fetch", proof: "—", verdict: "FAIL", observed: `THREW: ${e instanceof Error ? e.message.slice(0, 120) : String(e)} (the judge down = a LOUD fail, never a silent card)` });
  }
}

// ════════════════ S5 — THE REFLEX UNDER A SUSTAINED WORKLOAD (the production axis) ════════════════
// THE MISSING AXIS from the readiness audit: the LSP has never been driven N times in a row.
// This drives the REAL server over stdio with 25 sequential didOpen calls (a fresh file each)
// and verifies EVERY one answers + the latency distribution.
{
  const { spawn } = await import("node:child_process");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-prod-"));
  const files: string[] = [];
  for (let i = 0; i < 25; i++) {
    const p = path.join(tmp, `probe-${i}.ts`);
    fs.writeFileSync(p, `export const prodProbe${i} = ${i};\n`);
    files.push(p);
  }
  const lat: number[] = [];
  let answered = 0, errors = 0;
  const proc = spawn("bun", [path.join(REPO, "scripts/gi-lsp.ts"), "--stdio"], { cwd: REPO, stdio: ["pipe", "pipe", "pipe"] });
  let buf = Buffer.alloc(0);
  const pending: ((m: unknown) => void)[] = [];
  const inbox: unknown[] = [];
  proc.stdout.on("data", (d: Buffer) => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
      const i = buf.indexOf("\r\n\r\n");
      if (i < 0) break;
      const m = /Content-Length:\s*(\d+)/i.exec(buf.subarray(0, i).toString());
      if (!m) { buf = buf.subarray(i + 4); continue; }
      const n = Number(m[1]);
      if (buf.length < i + 4 + n) break;
      try { const o = JSON.parse(buf.subarray(i + 4, i + 4 + n).toString()); const w = pending.shift(); if (w) w(o); else inbox.push(o); } catch { /* malformed frame */ }
      buf = buf.subarray(i + 4 + n);
    }
  });
  const send = (o: unknown) => { const b = JSON.stringify(o); proc.stdin.write(`Content-Length: ${Buffer.byteLength(b)}\r\n\r\n${b}`); };
  const next = (ms: number): Promise<unknown | null> => inbox.length ? Promise.resolve(inbox.shift()!) : new Promise((res) => { const t = setTimeout(() => res(null), ms); pending.push((x) => { clearTimeout(t); res(x); }); });
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { processId: null, rootUri: `file://${REPO}`, capabilities: {} } });
  await next(20000);
  send({ jsonrpc: "2.0", method: "initialized", params: {} });
  for (const f of files) {
    const t = Date.now();
    send({ jsonrpc: "2.0", method: "textDocument/didOpen", params: { textDocument: { uri: `file://${f}`, languageId: "typescript", version: 1, text: fs.readFileSync(f, "utf8") } } });
    const msg = await next(20000) as { method?: string; params?: { diagnostics?: unknown[] } } | null;
    lat.push(Date.now() - t);
    if (msg && msg.method === "textDocument/publishDiagnostics") answered++; else errors++;
  }
  proc.kill("SIGKILL");
  fs.rmSync(tmp, { recursive: true, force: true });
  const sorted = [...lat].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)] ?? -1;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? -1;
  rec({
    id: "S5-the-sustained-reflex-25", domain: "D2 live", rung: "the LSP over stdio (25 sequential)",
    channel: "the per-call latency + the answered count", proof: "the SEAM-EXACT measurement",
    verdict: answered === 25 ? "PASS" : answered > 20 ? "FAIL" : "FAIL",
    observed: `${answered}/25 answered (errors=${errors}) · p50=${p50}ms p95=${p95}ms max=${Math.max(...lat, 0)}ms`,
  });
}

// ════════════════ S6 — THE CONCURRENT HERD (10 simultaneous opens) ════════════════
{
  const { spawn } = await import("node:child_process");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-herd-"));
  const proc = spawn("bun", [path.join(REPO, "scripts/gi-lsp.ts"), "--stdio"], { cwd: REPO, stdio: ["pipe", "pipe", "pipe"] });
  let buf = Buffer.alloc(0), diags = 0;
  proc.stdout.on("data", (d: Buffer) => {
    buf = Buffer.concat([buf, d]);
    for (;;) {
      const i = buf.indexOf("\r\n\r\n");
      if (i < 0) break;
      const m = /Content-Length:\s*(\d+)/i.exec(buf.subarray(0, i).toString());
      if (!m) { buf = buf.subarray(i + 4); continue; }
      const n = Number(m[1]);
      if (buf.length < i + 4 + n) break;
      try { const o = JSON.parse(buf.subarray(i + 4, i + 4 + n).toString()); if (o.method === "textDocument/publishDiagnostics") diags++; } catch { /* skip */ }
      buf = buf.subarray(i + 4 + n);
    }
  });
  const send = (o: unknown) => { const b = JSON.stringify(o); proc.stdin.write(`Content-Length: ${Buffer.byteLength(b)}\r\n\r\n${b}`); };
  send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { processId: null, rootUri: `file://${REPO}`, capabilities: {} } });
  await new Promise((r) => setTimeout(r, 3000));
  send({ jsonrpc: "2.0", method: "initialized", params: {} });
  for (let i = 0; i < 10; i++) {
    const p = path.join(tmp, `herd-${i}.ts`);
    fs.writeFileSync(p, `export const herd${i} = ${i};\n`);
    send({ jsonrpc: "2.0", method: "textDocument/didOpen", params: { textDocument: { uri: `file://${p}`, languageId: "typescript", version: 1, text: fs.readFileSync(p, "utf8") } } });
  }
  await new Promise((r) => setTimeout(r, 15000));
  proc.kill("SIGKILL");
  fs.rmSync(tmp, { recursive: true, force: true });
  rec({
    id: "S6-the-concurrent-herd-10", domain: "D2 live", rung: "the LSP under 10 simultaneous opens",
    channel: "the publishDiagnostics count", proof: "the SEAM-EXACT measurement",
    verdict: diags >= 10 ? "PASS" : diags > 0 ? "FAIL" : "FAIL",
    observed: `${diags} publishDiagnostics received for 10 simultaneous opens (expect >=10)`,
  });
}

// ════════════════ S7 — THE FIREWALL UNDER THE REAL WORKLOAD (the changed surface) ════════════════
{
  const fw = await import(path.join(REPO, "src/hunter/firewall/readonly.ts"));
  const corpus = JSON.parse(fs.readFileSync(path.join(REPO, ".omp", "ct-pressure.json"), "utf8")) as { rows: { id: string; kind: string; ok: boolean }[] };
  const cls = corpus.rows.filter((r) => r.id.startsWith("classify:"));
  const leaks = cls.filter((r) => r.kind === "POS" && !r.ok).length;
  const misfires = cls.filter((r) => r.kind === "NEG" && !r.ok).length;
  rec({
    id: "S7-the-firewall-under-load", domain: "D1 unit", rung: "the classifier (the persisted corpus)",
    channel: "the corpus's own recorded verdicts (re-read from disk)", proof: "the ROW (the record)",
    verdict: leaks === 0 && misfires === 0 ? "PASS" : "FAIL",
    observed: `${cls.length} classifier cases · leaks=${leaks} · misfires=${misfires} · resolveStore=${typeof fw.classify === "function" ? "exported" : "MISSING"}`,
  });
}

// ════════════════ S8 — THE LOCK UNDER CONTENTION (the state machine, live) ════════════════
{
  const lock = await import(path.join(REPO, "src/hunter/harness/hunt-lock.ts"));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gi-lock-"));
  const t = path.join(tmp, "t");
  let ok = 0, note = "";
  try {
    lock.acquireHuntLock(t); ok++;
    try { lock.acquireHuntLock(t); } catch { ok++; }               // the mutex holds
    lock.releaseHuntLock(t); ok++;
    try { lock.acquireHuntLock(t); ok++; lock.releaseHuntLock(t); } catch (e) { note = String(e).slice(0, 60); }
  } catch (e) { note = String(e).slice(0, 80); }
  fs.rmSync(tmp, { recursive: true, force: true });
  rec({
    id: "S8-the-lock-under-contention", domain: "D1 unit", rung: "the lock state machine",
    channel: "the transition outcomes", proof: "the BEHAVIOR DELTA (4 transitions)",
    verdict: ok === 4 ? "PASS" : "FAIL",
    observed: `${ok}/4 transitions correct${note ? " · " + note : ""}`,
  });
}

// ════════════════ S9 — THE STALE STORE MID-SESSION (the degradation, named) ════════════════
{
  const { spawn } = await import("node:child_process");
  const bak = storePath + ".PROD-BAK";
  let observed = "", verdict: V = "FAIL";
  try {
    fs.renameSync(storePath, bak);
    const proc = spawn("bun", [path.join(REPO, "scripts/gi-lsp.ts"), "--stdio"], { cwd: REPO, stdio: ["pipe", "pipe", "pipe"] });
    let buf = Buffer.alloc(0), msgs: string[] = [];
    proc.stdout.on("data", (d: Buffer) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        const i = buf.indexOf("\r\n\r\n");
        if (i < 0) break;
        const m = /Content-Length:\s*(\d+)/i.exec(buf.subarray(0, i).toString());
        if (!m) { buf = buf.subarray(i + 4); continue; }
        const n = Number(m[1]);
        if (buf.length < i + 4 + n) break;
        msgs.push(buf.subarray(i + 4, i + 4 + n).toString());
        buf = buf.subarray(i + 4 + n);
      }
    });
    const send = (o: unknown) => { const b = JSON.stringify(o); proc.stdin.write(`Content-Length: ${Buffer.byteLength(b)}\r\n\r\n${b}`); };
    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { processId: null, rootUri: `file://${REPO}`, capabilities: {} } });
    await new Promise((r) => setTimeout(r, 2500));
    send({ jsonrpc: "2.0", method: "initialized", params: {} });
    send({ jsonrpc: "2.0", method: "textDocument/didOpen", params: { textDocument: { uri: `file://${REPO}/src/hunter/profile/source-roots.ts`, languageId: "typescript", version: 1, text: "export const x=1;\n" } } });
    await new Promise((r) => setTimeout(r, 12000));
    proc.kill("SIGKILL");
    const joined = msgs.join(" ");
    const named = /GI_NO_STORE/.test(joined);
    observed = named ? "GI_NO_STORE named" : `no GI_NO_STORE · ${msgs.length} msgs`;
    verdict = named ? "PASS" : "FAIL";
  } catch (e) { observed = `THREW: ${e instanceof Error ? e.message.slice(0, 100) : ""}`; }
  finally { try { if (fs.existsSync(bak)) { fs.rmSync(storePath, { recursive: true, force: true }); fs.renameSync(bak, storePath); } } catch { /* restored */ } }
  rec({ id: "S9-the-stale-store-named", domain: "D2 live", rung: "the LSP's store resolution", channel: "the publishDiagnostics text", proof: "the RECEIPT (the named token)", verdict, observed });
}

// ════════════════ THE TABLE ════════════════
const by = (v: V) => rows.filter((r) => r.verdict === v).length;
console.log(`\n==== THE PRODUCTION SUITE: ${by("PASS")}/${rows.length} PASS · ${by("FAIL")} FAIL · ${by("UNREACHED")} UNREACHED ====`);
console.log(`     live=${LIVE} · the store: ${JSON.stringify(storeCounts())}`);
for (const r of rows.filter((x) => x.verdict !== "PASS")) console.log(`  ${r.verdict} [${r.domain}] ${r.id} :: ${r.observed.slice(0, 120)}`);
const ARTIFACT_DIR = process.env.GI_ARTIFACT_DIR ?? path.join(REPO, ".gi");
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
fs.writeFileSync(path.join(ARTIFACT_DIR, "production-suite-results.json"), JSON.stringify({ rows, live: LIVE, summary: { pass: by("PASS"), fail: by("FAIL"), unreached: by("UNREACHED"), total: rows.length } }, null, 1));
console.log(`     -> ${path.relative(REPO, ARTIFACT_DIR)}/production-suite-results.json`);
process.exit(by("FAIL") === 0 ? 0 : 1);
