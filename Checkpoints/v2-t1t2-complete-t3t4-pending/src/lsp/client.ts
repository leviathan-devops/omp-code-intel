// src/lsp/client.ts — W4-A: vendored minimal LSP client (JSONRPC 2.0 over stdio).
//
// Protocol shape mirrors MiMo's own client (reference/.../opencode/src/lsp/client.ts):
// Content-Length framing, `initialize` handshake + `initialized` notification,
// textDocument/didOpen before any position op, per-call lifecycle (spawn ->
// handshake -> ops -> shutdown; a stuck server gets 5s then SIGKILL — the
// documented kill guard, the only force-kill in the file). Transport is
// Bun.spawn only (no node:child_process); server stderr is piped and drained
// into the void so a chatty server can never block on a full pipe. Request
// ids are numeric, matched by an id map; server->client requests that must be
// answered (workDoneProgress/create, workspace/configuration,
// registerCapability, workspaceFolders) are answered inline so the server
// never stalls. 1-based -> 0-based conversion happens exactly once, at the
// public method boundary.

import { readFileSync, renameSync, writeFileSync } from "node:fs";
import * as path from "node:path";

export interface LspServerSpec { command: string; args?: string[]; fileTypes: string[] }

export const BUILTIN_SERVERS: LspServerSpec[] = [
  { command: "typescript-language-server", args: ["--stdio"], fileTypes: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"] },
  { command: "pyright-langserver", args: ["--stdio"], fileTypes: [".py"] },
];

const INIT_TIMEOUT_MS = 15000;
const OP_TIMEOUT_MS = 10000;
const SHUTDOWN_TIMEOUT_MS = 3000;
const DIAG_WAIT_MS = 4000;
const DIAG_LINGER_MS = 400;
const KILL_GRACE_MS = 5000;
const HOVER_MAX_CHARS = 300;

// Minimal structural view of the Bun subprocess: one documented cast at the
// spawn site keeps this file free of Bun generic friction.
interface Spawned {
  readonly pid?: number;
  readonly stdin: { write(chunk: Uint8Array): number; flush(): void } | null;
  readonly stdout: { getReader(): ReadableStreamDefaultReader<Uint8Array> } | null;
  readonly stderr: { getReader(): ReadableStreamDefaultReader<Uint8Array> } | null;
  readonly exited: Promise<number>;
  readonly exitCode: number | null;
  kill(code?: number): void;
}
interface LspPosition { line: number; character: number }
interface LspRange { start: LspPosition; end: LspPosition }
interface TextEdit { range: LspRange; newText: string }
interface PendingSlot { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
interface StoredDiag { range: LspRange; severity?: number; message: string }

function sleep(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }
function encodeFrame(body: string): Uint8Array {
  const payload = new TextEncoder().encode(body);
  const header = new TextEncoder().encode(`Content-Length: ${payload.byteLength}\r\n\r\n`);
  const out = new Uint8Array(header.byteLength + payload.byteLength);
  out.set(header, 0); out.set(payload, header.byteLength);
  return out;
}
function pathToUri(abs: string): string { return `file://${encodeURI(abs.startsWith("/") ? abs : `/${abs}`)}`; }
function uriToPath(uri: string): string | null {
  if (!uri.startsWith("file://")) return null;
  const tail = uri.slice("file://".length);
  try { return decodeURIComponent(tail); } catch { return tail; } // malformed %-escape: raw tail, never a failed op
}
function indexOfHeaderSep(buf: Uint8Array): number {
  for (let i = 0; i + 3 < buf.byteLength; i++) {
    if (buf[i] === 13 && buf[i + 1] === 10 && buf[i + 2] === 13 && buf[i + 3] === 10) return i;
  }
  return -1;
}
function severityName(sev: number | undefined): string {
  switch (sev) { case 1: return "error"; case 2: return "warning"; case 3: return "information"; case 4: return "hint"; default: return "unknown"; }
}
function firstLine(s: string): string { const i = s.search(/\r?\n/); return (i < 0 ? s : s.slice(0, i)).trim(); }

// Hover.contents union (MarkupContent | string | MarkedString | MarkedString[]) -> single line.
function formatHover(res: unknown): string | null {
  if (res === null || typeof res !== "object") return null;
  const contents = (res as { contents?: unknown }).contents;
  if (contents === undefined || contents === null) return null;
  const parts: string[] = [];
  const pushText = (v: unknown): void => {
    if (typeof v === "string") { if (v.length > 0) parts.push(v); }
    else if (v !== null && typeof v === "object") {
      const val = (v as { value?: unknown }).value;
      if (typeof val === "string" && val.length > 0) parts.push(val);
    }
  };
  if (Array.isArray(contents)) { for (const c of contents) pushText(c); } else pushText(contents);
  if (parts.length === 0) return null;
  const single = parts.join("\n").split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0).join(" ").replace(/\s+/g, " ");
  if (single.length === 0) return null;
  return single.length > HOVER_MAX_CHARS ? `${single.slice(0, HOVER_MAX_CHARS)}…` : single;
}

// Definition: Location | Location[] | LocationLink[] (null when unknown); references: Location[] | null.
// Normalized to {path, line} with 1-based lines; non-file:// URIs are skipped.
function toLocations(res: unknown): Array<{ path: string; line: number }> {
  const out: Array<{ path: string; line: number }> = [];
  const push = (item: unknown): void => {
    if (item === null || typeof item !== "object") return;
    const rec = item as { uri?: unknown; range?: unknown; targetUri?: unknown; targetRange?: unknown };
    const rawUri = typeof rec.uri === "string" ? rec.uri : typeof rec.targetUri === "string" ? rec.targetUri : null;
    const rawRange = (rec.uri !== undefined ? rec.range : rec.targetRange) as { start?: { line?: unknown } } | undefined;
    if (rawUri === null || rawRange?.start === undefined) return;
    const file = uriToPath(rawUri);
    const line = rawRange.start && typeof rawRange.start.line === "number" ? rawRange.start.line : null;
    if (file === null || line === null) return;
    out.push({ path: file, line: line + 1 });
  };
  if (Array.isArray(res)) { for (const item of res) push(item); } else push(res);
  return out;
}

// Apply a file's edits to on-disk text, DESC by start position (earlier
// offsets stay valid), atomic write via tmp + rename (mirrors edit.ts §5).
export function applyEditsToFile(abs: string, edits: TextEdit[]): void {
  const text = readFileSync(abs, "utf8");
  const lines = text.split("\n");
  const starts: number[] = [];
  let acc = 0;
  for (const l of lines) { starts.push(acc); acc += l.length + 1; }
  const off = (p: LspPosition): number => {
    const ln = Math.min(Math.max(p.line, 0), lines.length - 1);
    return starts[ln] + Math.min(Math.max(p.character, 0), lines[ln].length);
  };
  const sorted = [...edits].sort((a, b) => off(b.range.start) - off(a.range.start) || off(b.range.end) - off(a.range.end));
  let out = text;
  for (const e of sorted) out = out.slice(0, off(e.range.start)) + e.newText + out.slice(off(e.range.end));
  const tmp = `${abs}.lsp-tmp-${process.pid}`;
  writeFileSync(tmp, out, "utf8");
  renameSync(tmp, abs);
}

export class LspClient {
  readonly spec: LspServerSpec;
  private proc: Spawned | null = null;
  private rootUri = "";
  private nextId = 1;
  private inbox = new Uint8Array(0);
  private pending = new Map<number, PendingSlot>();
  private diags = new Map<string, StoredDiag[]>();
  private diagWaiters: Array<{ uri: string; resolve: () => void }> = [];

  constructor(spec: LspServerSpec) { this.spec = spec; }

  // Match by lowercase extension; null = unserved (the SC-16 path — the caller must NOT spawn on null).
  static forFile(absPath: string, specs: LspServerSpec[] = BUILTIN_SERVERS): LspClient | null {
    const hit = specs.find((s) => s.fileTypes.includes(path.extname(absPath).toLowerCase()));
    return hit ? new LspClient(hit) : null;
  }

  // Spawn + initialize handshake + `initialized`. A missing binary makes
  // Bun.spawn throw ENOENT — propagated untouched for the tool-layer mapping.
  async initialize(worktreeRoot: string): Promise<void> {
    const spawned = Bun.spawn([this.spec.command, ...(this.spec.args ?? [])], { stdin: "pipe", stdout: "pipe", stderr: "pipe" });
    this.proc = spawned as unknown as Spawned;
    this.pumpStdout();
    this.drainStderr();
    this.rootUri = pathToUri(worktreeRoot);
    await this.request("initialize", {
      processId: this.proc.pid, rootUri: this.rootUri,
      workspaceFolders: [{ name: "workspace", uri: this.rootUri }], initializationOptions: {},
      capabilities: {
        window: { workDoneProgress: true },
        workspace: { configuration: true, didChangeWatchedFiles: { dynamicRegistration: true } },
        textDocument: { synchronization: { didOpen: true, didChange: true }, publishDiagnostics: { versionSupport: true } },
      },
    }, INIT_TIMEOUT_MS);
    this.notify("initialized", {});
  }

  async didOpen(absPath: string, text: string, languageId: string): Promise<void> {
    this.diags.delete(pathToUri(absPath));
    this.notify("textDocument/didOpen", { textDocument: { uri: pathToUri(absPath), languageId, version: 0, text } });
  }

  async hover(absPath: string, line1: number, char1: number): Promise<string | null> {
    const res = await this.request("textDocument/hover",
      { textDocument: { uri: pathToUri(absPath) }, position: { line: line1 - 1, character: char1 - 1 } }, OP_TIMEOUT_MS);
    return formatHover(res);
  }

  async definition(absPath: string, line1: number, char1: number): Promise<Array<{ path: string; line: number }>> {
    const res = await this.request("textDocument/definition",
      { textDocument: { uri: pathToUri(absPath) }, position: { line: line1 - 1, character: char1 - 1 } }, OP_TIMEOUT_MS);
    return toLocations(res);
  }

  async references(absPath: string, line1: number, char1: number): Promise<Array<{ path: string; line: number }>> {
    const res = await this.request("textDocument/references", {
      textDocument: { uri: pathToUri(absPath) }, position: { line: line1 - 1, character: char1 - 1 },
      context: { includeDeclaration: true },
    }, OP_TIMEOUT_MS);
    return toLocations(res);
  }

  // textDocument/rename; honors both `changes` and `documentChanges`
  // (TextDocumentEdit arms); file:// URIs only, everything else skipped.
  async rename(absPath: string, line1: number, char1: number, newName: string): Promise<{ edited: string[]; error?: string }> {
    const res = (await this.request("textDocument/rename", {
      textDocument: { uri: pathToUri(absPath) }, position: { line: line1 - 1, character: char1 - 1 }, newName,
    }, OP_TIMEOUT_MS)) as { changes?: Record<string, TextEdit[]>; documentChanges?: unknown[] } | null;
    if (res === null || typeof res !== "object") return { edited: [], error: "server returned no edit" };
    const perFile = new Map<string, TextEdit[]>();
    const collect = (uri: string, edits: unknown): void => {
      if (!Array.isArray(edits) || edits.length === 0) return;
      const file = uriToPath(uri);
      if (file === null) return;
      perFile.set(file, (perFile.get(file) ?? []).concat(edits as TextEdit[]));
    };
    if (res.changes !== undefined && res.changes !== null && typeof res.changes === "object") {
      for (const [uri, edits] of Object.entries(res.changes)) collect(uri, edits);
    }
    if (Array.isArray(res.documentChanges)) {
      for (const dc of res.documentChanges) {
        if (dc === null || typeof dc !== "object") continue;
        const rec = dc as { textDocument?: { uri?: unknown }; edits?: unknown };
        if (typeof rec.textDocument?.uri === "string") collect(rec.textDocument.uri, rec.edits);
      }
    }
    if (perFile.size === 0) return { edited: [], error: "server returned no applicable file edits" };
    const edited: string[] = [];
    for (const [file, edits] of perFile) { applyEditsToFile(file, edits); edited.push(file); }
    return { edited };
  }

  // workspace/willRenameFiles: ask the server for import-rewriting edits for
  // a batch of moves. Returns per-file edit lists (NOT applied — the caller
  // applies around its own rename). Null/empty/unsupported → empty map
  // (the caller falls back to a plain move with the named note).
  async willRename(pairs: Array<{ from: string; to: string }>): Promise<Map<string, TextEdit[]>> {
    const perFile = new Map<string, TextEdit[]>();
    let res: { changes?: Record<string, TextEdit[]>; documentChanges?: unknown[] } | null;
    try {
      res = (await this.request(
        "workspace/willRenameFiles",
        { files: pairs.map((p) => ({ oldUri: pathToUri(p.from), newUri: pathToUri(p.to) })) },
        OP_TIMEOUT_MS,
      )) as { changes?: Record<string, TextEdit[]>; documentChanges?: unknown[] } | null;
    } catch {
      return perFile; // unsupported or timed out — plain-move fallback
    }
    if (res === null || typeof res !== "object") return perFile;
    const collect = (uri: string, edits: unknown): void => {
      if (!Array.isArray(edits) || edits.length === 0) return;
      const file = uriToPath(uri);
      if (file === null) return;
      perFile.set(file, (perFile.get(file) ?? []).concat(edits as TextEdit[]));
    };
    if (res.changes !== undefined && res.changes !== null && typeof res.changes === "object") {
      for (const [uri, edits] of Object.entries(res.changes)) collect(uri, edits);
    }
    if (Array.isArray(res.documentChanges)) {
      for (const dc of res.documentChanges) {
        if (dc === null || typeof dc !== "object") continue;
        const rec = dc as { textDocument?: { uri?: unknown }; edits?: unknown };
        if (typeof rec.textDocument?.uri === "string") collect(rec.textDocument.uri, rec.edits);
      }
    }
    return perFile;
  }

  // Push-model diagnostics: the caller's didOpen triggers publishDiagnostics
  // pushes; wait boundedly for the first push for this URI, linger for
  // stragglers, map to 1-based rows.
  async diagnostics(absPath: string): Promise<Array<{ line: number; severity: string; message: string }>> {
    const uri = pathToUri(absPath);
    await this.waitForDiag(uri);
    await sleep(DIAG_LINGER_MS);
    return (this.diags.get(uri) ?? []).map((d) => ({
      line: d.range.start.line + 1, severity: severityName(d.severity), message: firstLine(d.message),
    }));
  }

  // shutdown request (bounded) -> exit notification -> reap; still alive after
  // KILL_GRACE_MS -> SIGKILL. This 5s-then-SIGKILL guard is the only force-kill here.
  async shutdown(): Promise<void> {
    const proc = this.proc;
    this.proc = null;
    this.failAllPending(new Error("lsp client shut down"));
    if (!proc) return;
    try { await this.requestRaw(proc, "shutdown", null, SHUTDOWN_TIMEOUT_MS); }
    catch { /* documented: server may exit before acking — fall through to exit + kill guard */ }
    try {
      const stdin = proc.stdin;
      if (stdin) { stdin.write(encodeFrame(JSON.stringify({ jsonrpc: "2.0", method: "exit" }))); stdin.flush(); }
    } catch { /* documented: pipe may already be gone — kill guard reaps below */ }
    const exitedFast = await Promise.race([proc.exited.then(() => true), sleep(KILL_GRACE_MS).then(() => false)]);
    if (!exitedFast && proc.exitCode === null) proc.kill(9);
    await proc.exited;
  }

  private request(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    const proc = this.proc;
    if (!proc) throw new Error(`lsp server not running (${method})`);
    return this.requestRaw(proc, method, params, timeoutMs);
  }

  private requestRaw(proc: Spawned, method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    const stdin = proc.stdin;
    if (!stdin) throw new Error(`lsp server stdin unavailable (${method})`);
    const id = this.nextId++;
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`lsp request ${method} timed out after ${timeoutMs}ms`)); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try { stdin.write(encodeFrame(body)); stdin.flush(); }
      catch (err) {
        // Broken pipe between map-insert and write: drop the slot and fail
        // loudly (the timer alone would also reap it, but late and vague).
        this.pending.delete(id);
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  private notify(method: string, params: unknown): void {
    const stdin = this.proc?.stdin;
    if (!this.proc) throw new Error(`lsp server not running (${method})`);
    if (!stdin) throw new Error(`lsp server stdin unavailable (${method})`);
    stdin.write(encodeFrame(JSON.stringify({ jsonrpc: "2.0", method, params })));
    stdin.flush();
  }

  private reply(id: number | undefined, result: unknown): void {
    const stdin = this.proc?.stdin;
    if (id === undefined || !stdin) return;
    stdin.write(encodeFrame(JSON.stringify({ jsonrpc: "2.0", id, result })));
    stdin.flush();
  }

  private pumpStdout(): void {
    const stream = this.proc?.stdout;
    if (!stream) return;
    const reader = stream.getReader();
    const loop = async (): Promise<void> => {
      for (;;) { const { done, value } = await reader.read(); if (done) break; if (value && value.byteLength > 0) this.onBytes(value); }
    };
    void loop().then(() => this.onReaderEnd(), () => this.onReaderEnd());
  }

  private onReaderEnd(): void { this.failAllPending(new Error("lsp server closed stdout")); this.wakeDiagWaiters(); }

  // Server stderr: drain only, never logged. The trailing no-op handler covers
  // a stream error on a dying server — stderr content is never evidence.
  private drainStderr(): void {
    const stream = this.proc?.stderr;
    if (!stream) return;
    const reader = stream.getReader();
    const loop = async (): Promise<void> => {
      for (;;) { const { done } = await reader.read(); if (done) break; }
    };
    void loop().then(() => undefined, () => undefined);
  }

  private onBytes(chunk: Uint8Array): void {
    const merged = new Uint8Array(this.inbox.byteLength + chunk.byteLength);
    merged.set(this.inbox, 0); merged.set(chunk, this.inbox.byteLength);
    this.inbox = merged;
    const decoder = new TextDecoder();
    for (;;) {
      const sep = indexOfHeaderSep(this.inbox);
      if (sep < 0) return;
      const m = /content-length:\s*(\d+)/i.exec(decoder.decode(this.inbox.subarray(0, sep)));
      if (!m) { this.inbox = this.inbox.subarray(sep + 4); continue; } // no length line: resync on next header
      const len = Number(m[1]);
      if (this.inbox.byteLength < sep + 4 + len) return;
      const body = decoder.decode(this.inbox.subarray(sep + 4, sep + 4 + len));
      this.inbox = this.inbox.subarray(sep + 4 + len);
      this.onMessage(body);
    }
  }

  private onMessage(body: string): void {
    let msg: { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { message?: unknown } };
    try { msg = JSON.parse(body); }
    catch { return; } // undecodable frame: drop it; the stranded caller fails loudly via its timeout
    if (msg === null || typeof msg !== "object") return;
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const slot = this.pending.get(msg.id);
      if (!slot) return;
      this.pending.delete(msg.id);
      clearTimeout(slot.timer);
      if (msg.error !== undefined && msg.error !== null) slot.reject(new Error(String(msg.error.message ?? "lsp error")));
      else slot.resolve(msg.result);
      return;
    }
    if (typeof msg.method === "string") this.onServerMessage(msg.id, msg.method, msg.params);
  }

  private onServerMessage(id: number | undefined, method: string, params: Record<string, unknown> | undefined): void {
    switch (method) {
      case "textDocument/publishDiagnostics": this.onDiagnostics(params); break;
      case "workspace/configuration": this.reply(id, [{}]); break;
      case "window/workDoneProgress/create":
      case "client/registerCapability":
      case "client/unregisterCapability": this.reply(id, null); break;
      case "workspace/workspaceFolders": this.reply(id, [{ name: "workspace", uri: this.rootUri }]); break;
      default: this.reply(id, null); break; // unknown request: null so the server never stalls; unknown notification: ignored
    }
  }

  private onDiagnostics(params: Record<string, unknown> | undefined): void {
    const uri = params !== undefined && typeof params.uri === "string" ? params.uri : null;
    if (uri === null) return;
    this.diags.set(uri, Array.isArray(params?.diagnostics) ? (params?.diagnostics as StoredDiag[]) : []);
    for (let i = this.diagWaiters.length - 1; i >= 0; i--) {
      if (this.diagWaiters[i].uri === uri) { const [w] = this.diagWaiters.splice(i, 1); w.resolve(); }
    }
  }

  private waitForDiag(uri: string): Promise<void> {
    if ((this.diags.get(uri) ?? []).length > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const waiter = { uri, resolve };
      this.diagWaiters.push(waiter);
      setTimeout(() => {
        const i = this.diagWaiters.indexOf(waiter);
        if (i >= 0) this.diagWaiters.splice(i, 1);
        resolve();
      }, DIAG_WAIT_MS);
    });
  }

  private wakeDiagWaiters(): void { for (const w of this.diagWaiters.splice(0)) w.resolve(); }

  private failAllPending(err: Error): void {
    for (const [id, slot] of this.pending) { this.pending.delete(id); clearTimeout(slot.timer); slot.reject(err); }
  }
}
