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

/** Count the blockquote-marked lines across the corpus files (data-driven). */
function countQuotedRules(profile: ProjectProfile): number {
  let count = 0;
  for (const entry of profile.rules.corpus) {
    const abs = path.isAbsolute(entry) ? entry : path.resolve(profile.project.root, entry);
    let text: string;
    try {
      text = fs.readFileSync(abs, 'utf8');
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
  const dbPath = path.join(profile.project.root, '.trident', 'knowledge-graph', 'shared.db');
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
    for (const row of db.prepare("SELECT payload FROM events WHERE kind = 'HUNT_DONE'").all()) {
      let payload: { runId?: unknown };
      try {
        // ★ F-1053 FIX (2026-09-25): a driver returning an already-parsed object made String() yield '[object Object]' → parse throw → silent skip → duplicate runId (SILENT). Objects assign directly; only strings/buffers go through JSON.parse.
        // THE R16 TYPE_CERTAINTY FIX — JSON.parse returns `any`; the assignment
        // to the typed variable needs no cast at all (no AsExpression to flag),
        // and the runId read below is typeof-guarded before use.
        const raw: unknown = row['payload'];
        payload = raw !== null && typeof raw === 'object' ? (raw as { runId?: unknown }) : JSON.parse(String(raw ?? '{}'));
      } catch (e: unknown) {
        console.warn(`[recon] HUNT_DONE payload parse failed — skipped: ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
      if (typeof payload.runId === 'string' && payload.runId.startsWith(prefix)) {
        const rest = payload.runId.slice(prefix.length);
        if (/^\d+$/.test(rest)) seq = Math.max(seq, Number(rest));
      }
    }
    return `${prefix}${seq + 1}`;
  } finally {
    db.close();
  }
}
