// au-read — ★ THE L2 KNOWLEDGE READER (the arsumbris engine wire client).
//
// THE PROTOCOL (read from @arsumbris/au-engine-sdk, measured 2026-09-23):
//   socket   ~/.arsumbris/au-engine/run/<contentHash(entry)>.sock   (FNV-1a-64, 16 hex)
//   frame    4-byte big-endian length prefix + that many bytes of JSON
//   request  { type, id, schema_version, read: <name>, ...args }
//   reads    types · instances · imports · diagnostics · files · hubs · frontmatter …
//
// ★ WHY A CHILD PROCESS: the registry's ConsumerProbe.facts() is SYNCHRONOUS, and a
// Unix-socket round trip is not. This script is the sync/async bridge — the adapter
// execFileSync's it (the same pattern the tsg + socket-probe edges use).
//
// usage: bun scripts/au-read.ts <readName> [subject]
import * as net from "node:net";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const readName = process.argv[2] ?? "instances";
const subject = process.argv[3] ?? "";
// ★ W1 FIX (2026-10-02): the daemon's reads take DIFFERENT fields — `instances` takes `query`,
//   but `files`/`types`/`hubs`/`imports` take `repo` (+ `scope`); sending `{query}` to those is
//   `malformed read: unknown field 'query'`. The 4th arg carries the repo root so this maps each
//   read to its OWN required fields.
const repoRootArg = process.argv[4] ?? "";
const repoName = repoRootArg ? path.basename(path.resolve(repoRootArg)) : undefined;

/** Map a read name to the fields THAT read accepts (the daemon is strict per-read). */
function fieldsFor(read: string): Record<string, unknown> {
  if (read === "instances") return subject.length > 0 ? { query: subject, limit: 50 } : { limit: 50 };
  if (read === "files" || read === "types" || read === "hubs") return repoName ? { repo: repoName } : { scope: "all" };
  if (read === "imports") return repoName ? { repo: repoName } : {};
  return subject.length > 0 ? { query: subject, limit: 50 } : { limit: 50 };
}

function engineRunDir(): string {
  return path.join(os.homedir(), ".arsumbris", "au-engine", "run");
}

/** ★ FIND THE LIVE ENGINE SOCKET: the first one that ACCEPTS a connect. A socket FILE
 *  is not a daemon (the L2 lesson), so presence is not enough — we connect. */
function liveEngineSocket(timeoutMs = 1500): Promise<string | null> {
  const dir = engineRunDir();
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((n) => n.endsWith(".sock"));
  } catch {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let i = 0;
    const tryNext = (): void => {
      if (i >= files.length) return resolve(null);
      const p = path.join(dir, files[i++]!);
      const c = net.connect(p);
      const done = (ok: boolean): void => {
        c.destroy();
        if (ok) resolve(p);
        else tryNext();
      };
      c.setTimeout(timeoutMs);
      c.once("connect", () => done(true));
      c.once("error", () => done(false));
      c.once("timeout", () => done(false));
    };
    tryNext();
  });
}

/** ONE framed round trip: send the request, settle on the reply carrying our id. */
function request(sockPath: string, read: string, extra: Record<string, unknown>): Promise<unknown> {
  const id = `gi-l2-${Date.now().toString(36)}`;
  return new Promise((resolve, reject) => {
    const c = net.connect(sockPath);
    let buf = Buffer.alloc(0);
    const timer = setTimeout(() => { c.destroy(); reject(new Error("AU_READ_TIMEOUT")); }, 20000);
    c.once("connect", () => {
      // ★ MEASURED: a read body is STRICT — schema_version is a FRAME-BASE field, not a
      //   read field (the daemon: "unknown field `schema_version`, expected one of `repo`,
      //   `summary`, `scope`, `limit`, `offset`"). It is omitted here.
      // ★ W1 FIX (2026-10-02): `instances` accepts `type:"read"` but `files`/`types`/`hubs` REJECT
      //   it (`malformed read: unknown field 'type'`). Omitting it works for every read measured.
      const body = Buffer.from(JSON.stringify({ id, read, ...extra }), "utf8");
      const prefix = Buffer.alloc(4);
      prefix.writeUInt32BE(body.length, 0);
      c.write(Buffer.concat([prefix, body]));
    });
    c.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      while (buf.length >= 4) {
        const len = buf.readUInt32BE(0);
        if (buf.length < 4 + len) return;
        const payload = buf.subarray(4, 4 + len);
        buf = buf.subarray(4 + len);
        try {
          const msg = JSON.parse(payload.toString("utf8")) as { id?: string; type?: string };
          if (msg.id === id && msg.type !== "ack") {
            clearTimeout(timer);
            c.destroy();
            resolve(msg);
            return;
          }
        } catch { /* a partial frame — keep reading */ }
      }
    });
    c.once("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

const sock = await liveEngineSocket();
if (sock === null) {
  console.error("GI_LAYER_ARSUMBRIS: no LIVE engine socket under " + engineRunDir() + " (a socket FILE is not a daemon)");
  process.exit(3);
}
try {
  const reply = await request(sock, readName, fieldsFor(readName));
  process.stdout.write(JSON.stringify({ ok: true, socket: sock, read: readName, reply }));
} catch (e) {
  console.error(`GI_LAYER_ARSUMBRIS: the engine read failed — ${e instanceof Error ? e.message : String(e)}`);
  process.exit(4);
}
