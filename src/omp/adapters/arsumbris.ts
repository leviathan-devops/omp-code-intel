// adapters/arsumbris — ★ L2 ARSUMBRIS → the KNOWLEDGE rung.
//
// The au daemon's typed repo graph, reached through its live socket. ★ LIVENESS,
// not existence: a stale socket FILE is DOWN (the register's own lesson — "two
// socket FILES sat there dated …" while the daemon was not running).
//
// The au runtime lives in HOME, not the scope root: `~/.arsumbris/au-host/run`.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";
import { probeSocketConnect } from "./_shared.ts";

/** ★ THE ENGINE READER — scripts/au-read.ts (the framed wire client). The registry's
 *  facts() is synchronous, so the adapter bridges through a child process.
 *
 *  ★ NO-STUB LAW (WARHEAD 23) — REPLACED 2026-09-23: this adapter first returned
 *  `facts: () => []` unconditionally, with the note "the au-mcp adapter rail is a
 *  SEPARATE deliverable". The machinery is REAL and RUNNING: the au-engine daemon
 *  answers framed reads over `<contentHash(entry)>.sock` and returned 844 INSTANCES
 *  of typed repo knowledge on the first call. The stub is replaced with the real read. */
export function auEngineRead(repoRoot: string, read: string, subject: string): unknown {
  const script = path.join(repoRoot, "scripts/au-read.ts");
  if (!fs.existsSync(script)) throw new Error(`GI_LAYER_ARSUMBRIS: the reader is absent at ${script}`);
  let out: string;
  try {
    out = execFileSync(process.execPath, ["run", script, read, subject], {
      encoding: "utf8",
      timeout: 45_000,
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 240) : String(e);
    throw new Error(`GI_LAYER_ARSUMBRIS: the engine read '${read}' failed — ${msg}`);
  }
  // ★ AUDIT H-4 FIXED: the parse sits INSIDE the try so malformed daemon output becomes
  //   the named GI_LAYER_ARSUMBRIS failure, never a raw SyntaxError.
  try {
    return JSON.parse(out) as unknown;
  } catch (e) {
    throw new Error(`GI_LAYER_ARSUMBRIS: the daemon returned unparseable JSON — ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
  }
}

/** ★ AUDIT-CLASS FIX (found by driving): the first wired version read `scopeRoot` from an
 *  undefined binding — the signature took `home` while buildRegistry called it with NO
 *  args, so auEngineRead(undefined, …) threw and the edge reported 0 facts. The signature
 *  now takes the scope root (for scripts/au-read.ts) and the home (for the socket dir). */
export function arsumbrisProbe(scopeRoot: string, home = process.env.HOME ?? os.homedir()): ConsumerProbe {
  // ★ AUDIT H-6 FIXED: the probe and the reader must ask the SAME substrate. `up()` checked
  //   `au-host/run` (the app's presence socket) while scripts/au-read.ts reads the ENGINE
  //   socket at `au-engine/run` — a split-brain verdict where up() could be DOWN while
  //   facts() would succeed. Both now point at the ENGINE run dir (the knowledge surface).
  const runDir = path.join(home, ".arsumbris/au-engine/run");
  return {
    id: "L2_ARSUMBRIS",
    rung: "knowledge",
    dependency: "the au daemon socket + its typed repo graph",
    errorCode: "GI_LAYER_ARSUMBRIS",
    // ★ THE CONNECT PROBE (synchronous + reachable): a socket FILE is not a DAEMON.
    up: () => probeSocketConnect(runDir),
    // ★ THE KNOWLEDGE SURFACE IS THE DAEMON — THE REAL READ (2026-09-23).
    //   ★ NO-STUB LAW (WARHEAD 23): this adapter first returned `facts: () => []` with the
    //   note "the au-mcp adapter rail is a SEPARATE deliverable". The machinery is REAL and
    //   RUNNING: the au-engine daemon answers framed reads over `<contentHash(entry)>.sock`
    //   and returned 844 INSTANCES of typed repo knowledge on the first call. A fact is a
    //   typed instance the daemon holds; its anchor is the socket + the claim.
    facts: (subject: string): LayerFact[] => {
      const res = auEngineRead(scopeRoot, "instances", subject) as {
        socket?: string;
        reply?: { result?: { count?: number; instances?: Array<Record<string, unknown>> } };
      };
      const instances = res.reply?.result?.instances ?? [];
      const hits = subject.length === 0
        ? instances
        : instances.filter((i) => JSON.stringify(i).includes(subject));
      return hits.slice(0, 50).map((i) => {
        const claim = Array.isArray(i["claim"]) ? (i["claim"] as unknown[]).map(String) : [];
        return {
          consumer: "L2_ARSUMBRIS" as const,
          rung: "knowledge" as const,
          subject,
          value: { claim, closure: i["closure"], shape: i["effective_shape"] },
          source: `${res.socket ?? "~/.arsumbris/au-engine/run"}${"#instance("}${claim.slice(0, 2).join(",") || "?"})`,
        };
      });
    },
  };
}

/** The daemon + read that produced the facts — the anchor for every fact. */
function eventsEvidence(res: { socket?: string }): string {
  return res.socket ?? "~/.arsumbris/au-engine/run/<hash>.sock";
}
