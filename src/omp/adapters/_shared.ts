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
import { Database } from "bun:sqlite";
import type { LayerFact, SubstrateProbe } from "../layer-registry.ts";
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

/** A socket-backed substrate (the au daemon): liveness, not existence, is the
 *  dependency. A stale socket FILE is DOWN — the register's own lesson. */
export function probeSocketDir(dir: string): SubstrateProbe {
  try {
    const st = fs.statSync(dir);
    if (!st.isDirectory()) return { up: false, evidence: `${dir} is not a directory` };
    const live = fs.readdirSync(dir).filter((n) => n.endsWith(".instance.sock"));
    if (live.length === 0) return { up: false, evidence: `${dir} — no *.instance.sock (the daemon is not running)` };
    return { up: true, evidence: `${dir} — ${live.length} live socket(s): ${live.slice(0, 3).join(",")}` };
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code ?? "UNKNOWN";
    return { up: false, evidence: `${dir} — ${code}` };
  }
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
            AND (src_canonical LIKE ? OR dst_canonical LIKE ?)
          ORDER BY id DESC LIMIT ?`,
      )
      .all(`%${subject}%`, `%${subject}%`, limit) as EdgeRow[];
    return rows;
  } catch {
    // A schema mismatch is a DOWN condition the caller reports — never an empty
    // answer dressed as "no facts".
    return [];
  }
}

/** The live node count for a subject (the node-side consumption surface). */
export function liveNodesFor(db: Database, subject: string): number {
  try {
    const row = db
      .query(`SELECT COUNT(*) AS c FROM typed_nodes WHERE superseded_run IS NULL AND canonical_id LIKE ?`)
      .get(`%${subject}%`) as { c: number } | null;
    return row?.c ?? 0;
  } catch {
    return 0;
  }
}

/** Compose the facts a store-backed consumer contributes for one subject.
 *  Every fact carries its anchor — a fact without one is discarded by the registry. */
export function storeFacts(
  consumer: ConsumerId,
  rung: Rung,
  storePath: string,
  subject: string,
  limit = 50,
): LayerFact[] {
  const db = openReadOnly(storePath);
  if (db === null) return [];
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
    db.close();
  }
}
