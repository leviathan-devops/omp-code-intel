// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/harness/recon.ts:1-150.
// SEAMS: profile-loader -> ../profile/loader.ts (REAL ported sibling);
// db -> ../shared/db.ts openStore/DbClient (REAL ported sibling).
// Everything else verbatim: the fail-closed canon read, the blockquote battery
// estimate, the project-token slug, the named runId derivation.
import fs from 'node:fs';
import path from 'node:path';
import { loadProfile } from '../profile/loader.ts';
import type { ProjectProfile } from '../profile/schema.ts';
import { openStore, type DbClient } from '../shared/db.ts';

/** The intended-behavior summary (spec §2.8:369) — the RECON actor's output.
 *  The runId is the machine's NAMED hunt run id ('<project>-hunt-<yyyyMMdd>-<seq>')
 *  — derived here (the project name is only known post-load) + assigned to the
 *  machine context by the recon onDone action. */
export interface IntendedBehavior {
  stages: number;
  batteryCount: number;
  corpusCount: number;
  profile: ProjectProfile;
  runId: string;
}

/** The named awareness-doc error — a listed-but-missing canon doc (spec §5.7). */
export function awarenessDocMissing(docPath: string): Error {
  return new Error(
    `CORPUS_MISSING: path=${docPath} remedy=the awareness doc must exist (fix the profile's awareness.docs)`,
  );
}

/** The blockquote detector — the corpus's rule-card marker. THE REGEX IS THE
 *  MECHANICAL DETECTOR ONLY (the '>' quote marker, spec §3.8:1158); the count
 *  is the measurement, never a decision. */
const QUOTE_MARKER_RE = /^\s*>/;
/** The canonical project root (symlink-aware) — realpath once, fail LOUD. */
function projectRootReal(root: string): string {
  try {
    return fs.realpathSync(root);
  } catch (e: unknown) {
    throw new Error(`CORPUS_UNREADABLE: project root ${root} cannot resolve (realpath failed: ${e instanceof Error ? e.message : String(e)} — chmod/fix permissions or remove broken symlinks)`);
  }
}

/** Symlink-aware containment — realpath the candidate and require it stay under
 *  the real root. Returns the REAL path for the caller to read, so a symlink
 *  swapped between check and read cannot redirect outside. Throws the named
 *  CORPUS_UNREADABLE on unresolvable paths and on escapes (never a raw throw). */
function assertInsideProject(root: string, absPath: string): string {
  const rootReal = projectRootReal(root);
  let real: string;
  try {
    real = fs.realpathSync(absPath);
  } catch (e: unknown) {
    throw new Error(`CORPUS_UNREADABLE: path=${absPath} cannot resolve for containment check (realpath failed: ${e instanceof Error ? e.message : String(e)} — the corpus path must exist inside the project)`);
  }
  if (real !== rootReal && !real.startsWith(rootReal + path.sep)) {
    throw new Error(`CORPUS_UNREADABLE: path=${absPath} (real: ${real}) escapes project root ${root} (real: ${rootReal}) — resolve corpus paths inside the project`);
  }
  return real;
}


/** Count the blockquote-marked lines across the corpus files (data-driven). */
function countQuotedRules(profile: ProjectProfile): number {
  let count = 0;
  for (const entry of profile.rules.corpus) {
    const abs = path.isAbsolute(entry) ? entry : path.resolve(profile.project.root, entry);
    // ★ W3-RUN17 FIX: symlink-aware containment (the resolve-only check let a
    //   symlink inside the root point at /etc/passwd and still pass) — the
    //   shared assertInsideProject realpaths BOTH sides and returns the REAL
    //   path, which is what gets read (no check/read swap window).
    const real = assertInsideProject(profile.project.root, abs);
    let text: string;
    try {
      text = fs.readFileSync(real, 'utf8');
    } catch (e: unknown) {
      // ★ F-39 FIX (2026-09-24): the old warn+continue undercounted batteryCount
      //   against the "never a silent zero" contract — an unreadable corpus file is
      //   the CORPUS_UNREADABLE named error (the micro-loop routes it INCONCLUSIVE).
      throw new Error(`CORPUS_UNREADABLE: path=${abs} detail=${e instanceof Error ? e.message : String(e)} (a corpus path that cannot be read is a loud named error, never a silent skip)`);
    }
    for (const line of text.split('\n')) {
      if (QUOTE_MARKER_RE.test(line)) count += 1;
    }
  }
  return count;
}

/** THE RECON ACTOR — the machine's first state. Throws the NAMED errors
 *  (PROFILE_INVALID / CORPUS_MISSING / HISTORY_MISSING) — the micro-loop's
 *  onError routes the fail-state INCONCLUSIVE (O3.5, never a silent pass). */
export function recon(profilePath: string): IntendedBehavior {
  // THE PROFILE LOAD (W1's fail-closed loader — the frozen zod contract)
  const profile = loadProfile(profilePath);

  // THE CANON READ (spec §5.7:2469) — every listed awareness doc must exist.
  for (const doc of profile.awareness.docs) {
    const abs = path.isAbsolute(doc) ? doc : path.resolve(profile.project.root, doc);
    if (!fs.existsSync(abs)) {
      throw awarenessDocMissing(doc);
    }
    // ★ W3-RUN17 FIX: containment (was existsSync-only — a symlink here
    //   bypassed every guard). Same helper as countQuotedRules; the
    //   listed-but-missing contract above is unchanged (CORPUS_MISSING).
    assertInsideProject(profile.project.root, abs);
  }

  // THE MATERIALIZATION + THE NAMED RUN ID (the rehydration build — the
  // compaction-inert promise made physical): the recon actor is the machine's
  // UNCONDITIONAL first state — opening the store HERE (create-if-absent)
  // materializes <project>/.trident/knowledge-graph/shared.db + the C18.4
  // tables + the WAL sidecars on the FIRST hunt, before any lazy first-write.
  // The map actor re-opens the SAME store (the WAL + busy_timeout 5000 absorb
  // the two-agent contention). The same open counts the prior HUNT_DONE runs
  // for the runId's per-day sequence (the operator's naming ruling — the
  // project token, never an anonymous 'hunt-<ts>').
  // ★ W3-RUN17 FIX: resolve + contain (identical shape to map.ts — a `..`
  //   spelling in root must not redirect the store write). Never fires past the
  //   loader's root check; defense-in-depth against a hand-edited root.
  const projectRootResolved = path.resolve(profile.project.root);
  const dbPath = path.resolve(projectRootResolved, '.trident', 'knowledge-graph', 'shared.db');
  if (dbPath !== projectRootResolved && !dbPath.startsWith(projectRootResolved + path.sep)) {
    throw new Error(`recon actor: resolved dbPath escapes project root (${dbPath})`);
  }
  const runId = openAndNextRunId(projectToken(profile.project.name), dbPath);

  return {
    stages: profile.pipeline.stages.length,
    batteryCount: countQuotedRules(profile),
    corpusCount: profile.rules.corpus.length,
    profile,
    runId,
  };
}

/** The project token — the profile's project.name, slugified (the operator's
 *  "project token" ruling). 'Plutus_Agent' → 'plutus-agent'; 'fixture-profile'
 *  → 'fixture-profile'. Mirrors compiler.ts's projectTokenSlug (the two must
 *  stay identical — the battery version + the runId share the token). */
function projectToken(projectName: string): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug === '' ? 'project' : slug;
}

/** Open (create) the store + derive the named hunt run id —
 *  '<project>-hunt-<yyyyMMdd>-<seq>' with the per-day sequence counter (the
 *  prior HUNT_DONE runs for the day counted, +1). The store EXISTS after this
 *  call. ★ F-44 NOTE (2026-09-24): the read-compute cycle is intentionally NOT
 *  atomic — atomicity rides the hunt-lock (spawnBugHunterLoop acquires it before
 *  the micro-loop reaches recon; two lock-holding hunts can never interleave).
 *  Identical runIds require bypassing acquireHuntLock — a caller bug, guarded by
 *  contract, not by code (a lock here would deadlock the single-threaded loop). */
function openAndNextRunId(token: string, dbPath: string): string {
  const db: DbClient = openStore(dbPath);
  try {
    const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `${token}-hunt-${day}-`;
    let seq = 0;
    // ★ R15: prefix prefilter pushes filtering into SQL — instead of fetching+JSON-parsing
    // every HUNT_DONE payload on each recon (O(N) unbounded), LIKE narrows to the row(s)
    // that could actually advance the sequence counter. Buffer/BLOB payloads from bun:sqlite
    // are decoded via toString('utf8') before JSON.parse, preventing silent cast corruption.
    // ★ W3-RUN17 FIX (adjacent REAL, probe-proven): the anchor was `${prefix}%` — but
    //   payloads are JSON envelopes (`{"runId":"<prefix>N",...`), so the anchor matched ZERO
    //   rows and seq never advanced (every hunt re-minted seq 1 = runId collision on hunt 2+).
    //   The `%prefix%` containment shape matches the value mid-string (probe: 0 vs 1 rows).
    for (const row of db.prepare("SELECT payload FROM events WHERE kind = 'HUNT_DONE' AND payload LIKE ?").all(`%${prefix}%`)) {
      let payload: { runId?: unknown } = {};
      let rawText = '';
      try {
        // ★ R15: Buffer/Uint8Array from bun:sqlite BLOB columns must be decoded before parse.
        const raw: unknown = row['payload'];
        if (raw instanceof Uint8Array) rawText = new TextDecoder().decode(raw);
        else if (typeof raw === 'string') rawText = raw;
        else if (raw !== null && typeof raw === 'object') { payload = raw as { runId?: unknown }; }
        else rawText = String(raw ?? '');
        if (!rawText && typeof payload !== 'object') rawText = String(raw ?? '{}');
        if (rawText) payload = JSON.parse(rawText);
        if (payload !== null && typeof payload === 'object' && !Array.isArray(payload)) { /* valid */ }
        else { console.warn('[recon] HUNT_DONE payload is not an object — skipped'); continue; }
      } catch (e: unknown) {
        // ★ F-1201 FIX (2026-09-25): the parse-failure `continue` silently dropped the
        // ★ row's sequence number — a corrupt row carrying a HIGH seq let the next runId
        // ★ collide with it. Salvage: the raw text often still carries `<prefix><digits>`
        // ★ even when the JSON envelope is corrupt — extract it before skipping.
        const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const salvage = new RegExp(`"runId"\\s*:\\s*"${esc}(\\d+)"`).exec(rawText);
        if (salvage?.[1] !== undefined) seq = Math.max(seq, Number(salvage[1]));
        console.warn(`[recon] HUNT_DONE payload parse failed — skipped: ${e instanceof Error ? e.message : String(e)}; raw=${rawText.slice(0, 120)}`);
        continue;
      }
      if (typeof payload.runId === 'string' && payload.runId.startsWith(prefix)) {
        const rest = payload.runId.slice(prefix.length);
        if (/^\d+$/.test(rest)) seq = Math.max(seq, Number(rest));
      }
    }
    return `${prefix}${seq + 1}`;
  } finally {
    // ★ R19-HIGH FIX (2026-09-25): a raw close() in `finally` REPLACES any in-flight exception —
    //   if the try block is unwinding from a real failure (a corrupt row, a locked DB) and
    //   close() ALSO throws (WAL checkpoint failure, EIO), the close error becomes the thrown
    //   one and the ORIGINAL cause is lost. The caller then chases the wrong fault. The close is
    //   best-effort; the try block's error is the truth.
    try { db.close(); } catch { /* the in-flight error is the truth; a failed close must not mask it */ }
  }
}
