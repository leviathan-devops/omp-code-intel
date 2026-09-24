// adapters/_shared — the substrate probe + the store reader the 8 edges compose.
//
// THE LAW THIS ENCODES: an absent substrate is a NAMED loud state, never rows:0.
// The register (hard-deps.ts) already declares each consumer's dependency + error
// code; these helpers ask REALITY (a stat, a query) and return the evidence.
//
// ★ A NOTE ON WHAT IS *NOT* HERE: there is no fallback engine, no regex stand-in,
// no "if the store is missing, scan the tree". A consumer whose substrate does not
// answer returns DOWN and the registry reports it. That is the whole point.
import * as fs from "node:fs";
import { execFileSync } from "node:child_process";
import { Database } from "bun:sqlite";
import type { LayerFact, SubstrateProbe } from "../layer-registry.ts";
import { layerFreshness } from "../typed-write.ts";
import type { ConsumerId, Rung } from "../layer-registry.ts";

/** A path-backed substrate: a checkout, a store, a JSON index.
 *  Absent or unreadable ⇒ DOWN, with the errno as its evidence. */
export function probePath(p: string, mustBeFile = false): SubstrateProbe {
  try {
    const st = fs.statSync(p);
    if (mustBeFile && !st.isFile()) return { up: false, evidence: `${p} exists but is not a file` };
    return { up: true, evidence: `${p} (${st.isFile() ? `${st.size}B` : "dir"})` };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "UNKNOWN";
    return { up: false, evidence: `${p} — ${code}` };
  }
}

/** A socket-backed substrate (the au daemon): LIVENESS, not existence, is the
 *  dependency.
 *
 *  ★ DEFECT FIXED BY DRIVING (2026-09-22): the first version of this probe read the
 *  DIRECTORY and counted `*.instance.sock` FILES. Driving it in the container and on
 *  the host exposed the hole the register's own comment had already warned about
 *  ("two socket FILES sat there dated …"): a socket FILE outlives its daemon. Measured
 *  on this host — 2 socket files, `curl --unix-socket` answered NOTHING, and the probe
 *  reported UP. **A stat is not a connection.** The probe now CONNECTS.
 *
 *  `probeSocketConnect` is the AUTHORITATIVE probe — it CONNECTS through a synchronous
 *  child process. `probeSocketDir` remains for callers that only need the file listing. */
export function probeSocketDir(dir: string, match: RegExp = /^[0-9a-f]{16}\.sock$/): SubstrateProbe {
  try {
    const st = fs.statSync(dir);
    if (!st.isDirectory()) return { up: false, evidence: `${dir} is not a directory` };
    const files = fs.readdirSync(dir).filter((n) => match.test(n));
    if (files.length === 0) return { up: false, evidence: `${dir} — no *.instance.sock (the daemon is not running)` };
    // ★ a socket FILE is a HINT, never liveness. The authoritative answer is a CONNECT
    //   (probeSocketConnect).
    return {
      up: false,
      evidence: `${dir} — ${files.length} socket file(s) present (${files.slice(0, 2).join(",")}) but a FILE is not a DAEMON: connect() is the only liveness proof`,
    };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "UNKNOWN";
    return { up: false, evidence: `${dir} — ${code}` };
  }
}

/** ★ THE AUTHORITATIVE PROBE — SYNCHRONOUS, and therefore actually reachable.
 *
 *  ★ DEFECT FIXED BY THE DIST-CONTENT GATE (2026-09-22): the first version of this probe was
 *  `async` and nothing called it — `up()` is synchronous, so bun tree-shook it and the dist
 *  carried ZERO copies. That is the F-95 class reproduced in this very file, caught by the
 *  gate this build added. A probe nothing calls is not a probe.
 *
 *  THE FIX: probe liveness with a real CONNECT through a synchronous child process. `curl
 *  --unix-socket` exits 7 (ECONNREFUSED) when the socket is a stale FILE, and anything else
 *  (0, or an empty-reply code) means the connect SUCCEEDED — the daemon is live. This is the
 *  only liveness proof a synchronous consumer can make, and it never reports a stale file UP.
 */
export function probeSocketConnect(dir: string, timeoutMs = 1200, match: RegExp = /^[0-9a-f]{16}\.sock$/): SubstrateProbe {
  // ★ AUDIT-CLASS FIX #2 (found by the H-6 fix, 2026-09-23): the engine's sockets are
  //   `<hash>.sock`; the HOST's are `<hash>.instance.sock` / `<hash>.host.sock`. The first
  //   version filtered for `.instance.sock` UNCONDITIONALLY — so once the probe was pointed
  //   at the engine dir (the H-6 fix) it found NOTHING and reported DOWN while the reader
  //   happily connected to a live `<hash>.sock`. The caller now passes the naming convention
  //   of the dir it probes: the ENGINE dir uses `<16hex>.sock`; the host dir uses
  //   `<16hex>.instance.sock`.
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((n) => match.test(n));
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "UNKNOWN";
    return { up: false, evidence: `${dir} — ${code}` };
  }
  // ★ F-261 FIX (2026-09-24): the message named `*.instance.sock` while `match` defaults to `<16hex>.sock` — it described a pattern never checked. Name what was actually sought.
  if (files.length === 0) return { up: false, evidence: `${dir} — no matching socket files (${match}) — the daemon is not running` };
  const attempts: string[] = [];
  for (const f of files) {
    const sock = `${dir}/${f}`;
    try {
      execFileSync("curl", ["-s", "--max-time", String(Math.ceil(timeoutMs / 1000)), "--unix-socket", sock, "http://localhost/"], {
        stdio: "ignore",
        timeout: timeoutMs,
      });
      attempts.push(`${f}=LIVE`);
      return { up: true, evidence: `${dir} — connect() accepted on ${f}` };
    } catch (e) {
      // ★ AUDIT H-1 FIXED (2026-09-23): the first version treated ANY exit != 7 as LIVE —
      //   but curl exits 28 on TIMEOUT and 2 on a usage error, so a hung/broken daemon read
      //   UP. ONLY the codes that prove the CONNECT was ACCEPTED count: 52 (empty reply —
      //   connected, no HTTP response) and 56 (recv failure — connected, then broke).
      //   0 is handled by the success branch above; everything else (7 refused, 28 timeout,
      //   2 usage, 6 no-host) is DOWN.
      const err = e as { status?: number | null; code?: string };
      // ★ F-260 FIX (2026-09-24): curl UN-RUNNABLE (ENOENT = binary missing) has no `status` — it is broken probe infrastructure, never a socket verdict. Laundered as `refused` it sent operators debugging the daemon instead of installing curl.
      // ★ F-707 FIX (2026-09-24): the F-260 guard tested `=== undefined`, but a
      // ★ failed SPAWN sets status to NULL, not undefined — the guard never fired
      // ★ and missing-curl hosts still logged `refused`. `== null` catches both.
      if (err.status == null) {
        return { up: false, evidence: `${dir} — PROBE INFRA BROKEN: curl could not exec (${err.code ?? "unknown"}) — install curl; this is NOT a socket verdict` };
      }
      const code = err.status;
      if (code === 52 || code === 56) {
        attempts.push(`${f}=LIVE(exit ${code} — connected, no HTTP reply)`);
        return { up: true, evidence: `${dir} — connect() accepted on ${f} (curl exit ${code})` };
      }
      attempts.push(`${f}=refused`);
    }
  }
  return { up: false, evidence: `${dir} — every socket refused (stale files, no daemon): ${attempts.join(" ")}` };
}
/** Open a store READ-ONLY. A read-only open is the consumer's discipline: a
 *  consumer that could write is a consumer that could fabricate. */
export function openReadOnly(storePath: string): Database | null {
  try {
    return new Database(storePath, { readonly: true });
  } catch {
    return null;
  }
}

export interface EdgeRow {
  src: string;
  predicate: string;
  dst: string;
  evidence: string;
}

/** ★ THE STORE READ: the LIVE edges (superseded_run IS NULL) whose src OR dst
 *  canonical id names `subject`. This is the consumption surface for the two
 *  store-backed layers (L5 corbell, L6 graphify).
 *
 *  ★ THE LIVE FILTER IS NOT OPTIONAL. The store is APPEND-ONLY (supersede-then-
 *  insert); a query without it counts SUPERSEDED HISTORY. Measured: the naive
 *  Checkpoints count read 6191 against a store whose live rows were clean. */
export function liveEdgesFor(db: Database, subject: string, limit = 200): EdgeRow[] {
  try {
    const rows = db
      .query(
        `SELECT src_canonical AS src, predicate, dst_canonical AS dst, evidence_quote AS evidence
           FROM typed_edges
          WHERE superseded_run IS NULL
            AND (src_canonical LIKE ? ESCAPE '\\' OR dst_canonical LIKE ? ESCAPE '\\')
          ORDER BY id DESC LIMIT ?`,
      )
      // ★ GATE M-12 FIXED: `%` and `_` in the subject were SQL LIKE WILDCARDS (a subject
      //   like `foo_bar` matched `fooXbar`). They are escaped now, with ESCAPE '\'.
      .all(`%${escapeLike(subject)}%`, `%${escapeLike(subject)}%`, limit) as EdgeRow[];
    return rows;
  } catch (e) {
    // ★ AUDIT H-2 FIXED (2026-09-23): the first version returned [] here — the SAME
    //   never-rows:0 violation the F-2 fix closed in storeFacts, left open at this site.
    //   A schema/query fault is a DOWN condition: THROW, and the registry's facts() catch
    //   maps it to GI_LAYER_DOWN with the cause as evidence.
    throw new Error(`GI_STORE_QUERY_FAILED: ${storePathOf(db)} — ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
  }
}

/** The store path a db handle was opened from (for the error evidence). */
function storePathOf(db: Database): string {
  try { return (db.query("PRAGMA database_list").all() as Array<{ file?: string }>)[0]?.file ?? "<unknown>"; }
  catch { return "<unknown>"; }
}

/** The live node count for a subject (the node-side consumption surface). */
export function liveNodesFor(db: Database, subject: string): number {
  try {
    const row = db
      .query(`SELECT COUNT(*) AS c FROM typed_nodes WHERE superseded_run IS NULL AND canonical_id LIKE ? ESCAPE '\\'`)
      .get(`%${escapeLike(subject)}%`) as { c: number } | null;
    return row?.c ?? 0;
  } catch (e) {
    // ★ AUDIT H-2 (the class, swept): a node-count fault is DOWN, never 0.
    throw new Error(`GI_STORE_QUERY_FAILED: ${storePathOf(db)} — ${e instanceof Error ? e.message.slice(0, 160) : String(e)}`);
  }
}

/** Compose the facts a store-backed consumer contributes for one subject.
 *  Every fact carries its anchor — a fact without one is discarded by the registry.
 *
 *  ★ AUDIT F-2 FIXED (2026-09-22): a store that cannot be OPENED must be a THROW, not
 *  an empty array. Returning [] let the registry map `up:true + facts:[]` to
 *  GI_LAYER_UNCONSUMED — a swallowed substrate fault wearing a wiring-gap label, which
 *  violates this file's own never-rows:0 law. The registry's `facts()` catch turns the
 *  throw into GI_LAYER_DOWN with the cause as evidence. */
/** ★ DPL1 §7 A3: THE STORE-AGE GATE. A verdict read from a store OLDER than the code is
 *  REFUSED — `GI_LAYER_STALE`, never an answer from a stale graph. The mechanism already
 *  exists (`typed-write.storeFreshness`, the same one `graph-facts.ts` uses); the adapters
 *  simply did not call it. A store with no `populated_at` marker is STALE by construction. */
export function assertStoreFresh(storePath: string): void {
  // ★ THE REGRESSION THIS AVOIDS (found by running it): `storeFreshness()` wraps
  //   `openTypedStore()`, which ENFORCES the SESSION-store path convention
  //   (`/sessions/{sessionId}/…`) and REFUSES a project-level checkout store with
  //   `GI_SHARED_PROJECT_STORE`. The corbell/graphify CHECKOUT stores are project-level, so
  //   the wrapper is the wrong door. The freshness read needs only a DB HANDLE — the same
  //   read-only handle `storeFacts` already opens.
  const db = openReadOnly(storePath);
  if (db === null) return; // the caller's own probe owns the absent-store verdict
  let f;
  try {
    f = layerFreshness(db);
  } finally {
    try { db.close(); } catch { /* the read already happened */ }
  }
  if (f.stale) {
    throw new Error(
      `${f.code ?? "GI_LAYER_STALE"} — the store at ${storePath} is STALE ` +
      `(populatedAt=${f.populatedAt === null ? "NEVER" : new Date(f.populatedAt).toISOString()} · ` +
      `ageMs=${f.ageMs ?? "?"} · ttlMs=${f.ttlMs}); no fact is served from it`,
    );
  }
}

export function storeFacts(
  consumer: ConsumerId,
  rung: Rung,
  storePath: string,
  subject: string,
  limit = 50,
): LayerFact[] {
  const db = openReadOnly(storePath);
  if (db === null) {
    throw new Error(`GI_STORE_UNREADABLE: ${storePath} could not be opened read-only (the substrate fault must not read as "no facts")`);
  }
  try {
    const edges = liveEdgesFor(db, subject, limit);
    const out: LayerFact[] = edges.map((e) => ({
      consumer,
      rung,
      subject,
      value: { predicate: e.predicate, from: e.src, to: e.dst },
      source: `${storePath}#typed_edges(${e.src} -[${e.predicate}]-> ${e.dst})`,
    }));
    return out;
  } finally {
    // ★ AUDIT F-6-class fix: a close fault must never MASK the read result.
    try { db.close(); } catch { /* the read already succeeded; a close fault is not the answer */ }
  }
}

/** ★ GATE M-12: escape the SQL LIKE metacharacters in a subject so `_` and `%` match
 *  literally. A subject is an IDENTIFIER, never a pattern. */
export function escapeLike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
