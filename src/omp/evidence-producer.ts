// evidence-producer — THE ORACLE'S MISSING INPUT. The gate that makes resolution organic.
//
// ★ WHY THIS EXISTS (measured twice this session, and named by the operator):
//     the oracle's four gatherers read ONE input type — `OutcomeRecord{kind: edit|test|
//     withdraw|permit}` — AND NOTHING ON THIS HOST PRODUCED THEM.
//   Every resolution this session achieved was SYNTHETIC: the W6 campaign fed the corpus
//   LABELS, the hot seat fed hand-built edits. A precision computed from labels is a
//   measurement of the LABELS. The producer is the gate; the engine (E1) is the refinement.
//
// ★ THE GRAPH IS A SOURCE, NOT A DECORATION. One of the four emissions — "a later edit to
//   the fired target" — is DERIVABLE FROM THE TYPED STORE: the structural layer records each
//   file's `created_run`, so a file re-indexed AFTER the fire HAS changed. That is a real
//   graph fact, and it costs one query. It is used as a FALLBACK when the session's own
//   event stream does not carry the edit — never as a substitute for the stream, because the
//   stream is richer (it names the TOOL and the OUTCOME).
//
// ★ THE THREE LAWS THIS MODULE OBEYS:
//   1 REPRODUCIBLE — every emission is persisted as NDJSON beside the ledger, so a
//     resolution can be RE-DERIVED from the record instead of from the moment.
//   2 NEVER INVENTED — a record is emitted only from an observed event or a graph fact. A
//     kind that cannot be sourced is ABSENT, and `resolveAll` counts it as UNRESOLVED.
//   3 NAMED — a producer that cannot read its source says so (the hard-dependency law).

import * as fs from "node:fs";
import * as path from "node:path";
import { Database } from "bun:sqlite";
import type { OutcomeRecord, Subject } from "./oracle.ts";
import { resolveAll } from "./oracle.ts";
import type { FireLedger, PersistedFireRow } from "./fire-ledger.ts";

/** One thing the agent DID. The producer's only input: the session's own operation. */
export interface ToolEvent {
  tool: string;
  /** The file/symbol the tool acted on. */
  target?: string;
  /** The command, for a shell tool. */
  command?: string;
  /** ISO — when it happened. */
  at: string;
  /** Did the tool succeed? */
  ok?: boolean;
  /** For a verify/test command: did it PASS? Absent = the run carried no verdict. */
  passed?: boolean;
  /** ★ EN-089 — IS THIS EDIT REPAIR-SHAPED? The CALLER sets it because only the caller holds
   *  the diff. Measured: the clock signal saturated at 100%; the file-scoped diff predicate
   *  discriminates at 0.55%. A bare touch is not harm. */
  repair?: boolean;
  /** Who or what produced the event. */
  by?: string;
}

/** An explicit retraction. The producer cannot INFER a withdrawal — the span is what makes
 *  it real, and only the claimant has it. This is the one record that must be SUPPLIED. */
export interface Withdrawal {
  at: string;
  target?: string;
  /** ★ THE BOUND SPAN — without it the oracle ignores the withdrawal (a bare retraction
   *  proves nothing; that rule lives in oracle.ts and this field is why). */
  span: string;
  by?: string;
}

/** A downstream gate's permission. Also supplied — a permit is another system's verdict. */
export interface Permit {
  at: string;
  target?: string;
  by?: string;
}

/** A test/verify command is recognised by its SHAPE, and the shape is declared — never a
 *  guess. Anything not matching is not a test record. */
const VERIFY_COMMAND = /\b(bun|npm|pnpm|yarn)\s+(test|run\s+test)\b|\btsc\b|\bpytest\b|\bcargo\s+test\b|\bgo\s+test\b/;

/** Does this event touch the fire's subject? */
// ★ F-33 FIX (2026-09-24): LIKE metacharacters (%, _) in a target widened the match — escape them, with an explicit ESCAPE clause at the query.
function escapeLike(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}
function touches(event: ToolEvent, subject: Subject): boolean {
  if (event.target === undefined) return subject.tool === event.tool;
  if (event.target === subject.target) return true;
  // ★ F-264 FIX (2026-09-24): bare includes() matched "app"↔"application.js"/"append.txt" — false evidence. Containment must land on a PATH/symbol boundary, never mid-token. Either direction still holds (a fire names a file, an edit the symbol inside it).
  return containsAtBoundary(event.target, subject.target) || containsAtBoundary(subject.target, event.target);
}
/** A needle inside a haystack only at a separator boundary (/, :, ., -, _, space, quotes…). */
function isBoundaryChar(ch: string): boolean {
  return ch === "" || "/:.\\-_ \t@#()[]{}'\"".includes(ch);
}
function containsAtBoundary(hay: string, needle: string): boolean {
  if (needle.length === 0 || hay.length <= needle.length) return false;
  let i = hay.indexOf(needle);
  while (i !== -1) {
    const before = i === 0 ? "" : hay[i - 1]!;
    const after = i + needle.length >= hay.length ? "" : hay[i + needle.length]!;
    if (isBoundaryChar(before) && isBoundaryChar(after)) return true;
    i = hay.indexOf(needle, i + 1);
  }
  return false;
}

/**
 * ★ THE PRODUCER. Turns the session's own operation into the four record kinds.
 *
 * @param events   the agent's tool calls, oldest first
 * @param fireAt   the firing time — records must be STRICTLY AFTER it (oracle.ts enforces
 *                 the same boundary; emitting before-the-fire records would be fabricating
 *                 evidence the resolver would then reject)
 */
export function produce(
  events: readonly ToolEvent[],
  fireAt: string,
  subject: Subject,
  opts: { withdrawals?: readonly Withdrawal[]; permits?: readonly Permit[] } = {},
): OutcomeRecord[] {
  const from = Date.parse(fireAt);
  // ★ F-EV1 FIX (2026-09-24): an unparseable fireAt made `from` NaN, and every
  //   `at <= from` comparison is false against NaN — so ALL events passed the
  //   forward-only filter and pre-fire history fabricated post-fire evidence.
  //   A bound that cannot be established is not a bound: LOUD refusal, never an
  //   open window (mirrors oracle.ts O0 + gather's GI_ORACLE_BAD_WINDOW).
  if (!Number.isFinite(from)) {
    throw new Error(`GI_EVIDENCE_BAD_FIRE_AT: fireAt ${JSON.stringify(fireAt)} is unparseable — refusing to emit post-fire evidence with no forward window`);
  }
  const out: OutcomeRecord[] = [];

  for (const e of events) {
    const at = Date.parse(e.at);
    if (!Number.isFinite(at) || at <= from) continue;      // FORWARD ONLY
    if (!touches(e, subject)) continue;

    if (e.tool === "edit" || e.tool === "write") {
      // ★ the repair shape is CARRIED, never inferred — an edit the caller did not measure is
      //   a TOUCH, and a touch is not harm (EN-089).
      out.push({
        kind: "edit", at: e.at, target: e.target ?? subject.target, tool: e.tool,
        // ★ F-853 FIX (2026-09-24): != null drops BOTH null and undefined — a repair: null
        //   caller no longer emits a present-but-null field (absent = NO SIGNAL per O1/EN-089).
        ...(e.repair != null ? { repair: e.repair } : {}),
      });
      continue;
    }
    if (VERIFY_COMMAND.test(e.command ?? "")) {
      // ★ `passed` IS CARRIED ONLY WHEN THE EVENT CARRIES IT. A run with no verdict emits a
      //   test record with `passed` ABSENT — and oracle.ts treats that as NO SIGNAL rather
      //   than as a pass (the O1 fix). Emitting `passed: true` for an unknown outcome would
      //   manufacture corroboration.
      out.push({
        kind: "test", at: e.at, target: e.target,
        // ★ F-853 FIX (2026-09-24): same null-tightening for passed — passed: null no longer
        //   lands as a present field distinct from absent (no-signal).
        ...(e.passed != null ? { passed: e.passed } : {}),
        by: e.by,
      });
    }
  }

  // ★ THE SUPPLIED kinds. Absent input ⇒ absent records ⇒ the resolver returns UNRESOLVED.
  for (const w of opts.withdrawals ?? []) {
    const at = Date.parse(w.at);
    if (!Number.isFinite(at) || at <= from) continue;
    if (w.target !== undefined && !touches({ tool: "withdraw", target: w.target, at: w.at }, subject)) continue;
    out.push({ kind: "withdraw", at: w.at, target: w.target, span: w.span, by: w.by });
  }
  for (const p of opts.permits ?? []) {
    const at = Date.parse(p.at);
    if (!Number.isFinite(at) || at <= from) continue;
    if (p.target !== undefined && !touches({ tool: "permit", target: p.target, at: p.at }, subject)) continue;
    out.push({ kind: "permit", at: p.at, target: p.target, by: p.by });
  }

  return out.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/**
 * ★ THE GRAPH SOURCE — "a later edit" WITHOUT AN EVENT STREAM.
 *
 * The structural layer records the `created_run` of every declaration. A file RE-INDEXED
 * after the fire has therefore CHANGED — the graph is the witness, and it costs one query.
 *
 * ★ AND IT IS HONEST ABOUT ITS LIMIT: it proves the FILE changed, not that the edit was a
 * REPAIR. So the emitted record carries `by: "graph:structural"` — a reader can weigh a
 * graph-derived edit differently from an observed one. A weaker fact must not look like a
 * stronger one.
 */
export function laterEditFromGraph(
  storePath: string,
  subject: Subject,
  fireAt: string,
): OutcomeRecord | null {
  let db: Database;
  try {
    db = new Database(storePath, { readonly: true });
  } catch (e) {
    // the hard-dependency law: an unreadable source is NAMED by the caller's log, not guessed
    throw new Error(`GI_EVIDENCE_UNAVAILABLE: cannot read ${storePath} (${e instanceof Error ? e.message.slice(0, 80) : String(e)})`);
  }
  try {
    const from = Date.parse(fireAt);
    // ★ THE RUN TAG CARRIES A MILLISECOND EPOCH (`structural-<hex>`) — so the LATEST run
    //   for the subject's file is comparable to the fire's time. A tag that cannot be
    //   parsed yields NO record rather than a guessed one.
    const rows = db
      .query(`SELECT file, created_run, superseded_run FROM typed_nodes
              WHERE layer_id = 'structural' AND (file LIKE ?1 ESCAPE '\\' OR label LIKE ?2 ESCAPE '\\')
              ORDER BY id DESC LIMIT 50`)
      .all(`%${escapeLike(subject.target)}%`, `%${escapeLike(subject.target)}%`) as { file: string; created_run: string; superseded_run: string | null }[];
    for (const r of rows) {
      if (r.superseded_run !== null) continue;                 // only LIVE declarations
      const m = /^structural-([0-9a-f]+)$/.exec(r.created_run);
      if (m === null) continue;
      const indexedAt = parseInt(m[1]!, 16);
      if (!Number.isFinite(indexedAt) || indexedAt <= from) continue;
      return {
        kind: "edit",
        at: new Date(indexedAt).toISOString(),
        target: r.file,
        by: "graph:structural",       // ★ the LOWER-confidence source, LABELLED
      };
    }
    return null;
  } finally {
    db.close();
  }
}

/** ★ THE REPRODUCIBILITY LEDGER. Every produced record is appended as NDJSON beside the fire
 *  ledger, so a resolution can be RE-DERIVED from the record — never re-guessed from the
 *  session that produced it. */
export function persistRecords(recordsPath: string, fireStateHash: string, records: readonly OutcomeRecord[]): number {
  // ★ THE PARAMETER MUST NOT BE NAMED `path` — IT SHADOWS THE `node:path` IMPORT.
  //   Measured: `path.dirname is not a function`, because inside this function `path` was the
  //   caller's STRING. ★ THE SECOND INSTANCE OF THIS CLASS THIS SESSION: hard-deps.ts had
  //   `join` shadowed by a function-local helper (EN-068). A name that collides with an
  //   import is a bug the type system does not catch — the shadowing identifier is
  //   `string`, and `string.dirname` is a type error ONLY at the call site, which the
  //   compiler happens to catch here and did NOT in the `join` case.
  fs.mkdirSync(path.dirname(recordsPath), { recursive: true });
  const lines = records.map((r) => JSON.stringify({ fireStateHash, ...r })).join("\n");
  if (lines === "") return 0;
  fs.appendFileSync(recordsPath, `${lines}\n`, "utf8");
  return records.length;
}

/** Read back every record persisted for one fire — the reproducibility half. */
export function readRecords(recordsPath: string, fireStateHash: string): OutcomeRecord[] {
  return readRecordsAll(recordsPath).filter((r) => (r as OutcomeRecord & { fireStateHash: string }).fireStateHash === fireStateHash);
}

/** Read back EVERY record in the file, partitioned by fire — the O(S) half of the
 *  resolveFromSession fix below. The corrupt-line counting is owned HERE (single site):
 *  one torn line is skipped + counted + LOUD, never a silent shrink or a bricked file.
 *  ★ F-342 FIX (2026-09-24): resolveFromSession called readRecords (full-file read + parse)
 *  once PER unresolved fire — O(N × S). This helper reads + parses ONCE; the caller
 *  partitions by fireStateHash in memory. readRecords above delegates, so both paths
 *  share the corrupt-line semantics (no double count: the partition read is the only read). */
export function readRecordsAll(recordsPath: string): OutcomeRecord[] {
  if (!fs.existsSync(recordsPath)) return [];
  // ★ F-265 FIX (2026-09-24): corrupt lines were dropped SILENTLY — re-derivation shrank with no signal (Law 1). Still skipped (one torn line must not brick a whole resolution) but COUNTED + LOUD.
  let corrupt = 0;
  const out = fs
    .readFileSync(recordsPath, "utf8")
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => { try { return JSON.parse(l) as OutcomeRecord & { fireStateHash: string }; } catch { corrupt += 1; return null; } })
    .filter((r): r is OutcomeRecord & { fireStateHash: string } => r !== null && typeof (r as { fireStateHash?: unknown }).fireStateHash === "string")
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  if (corrupt > 0) console.error(`[gi-omp] GI_EVIDENCE_CORRUPT_LINES: ${corrupt} unparseable line(s) skipped in ${recordsPath} — re-derivation is degraded, not silent`);
  return out;
}

/** ★ THE CONVENIENCE: produce from EVERY source and persist the result. This is what a caller
 *  runs at session end — one call per unresolved fire, and the ledger becomes calibratable. */
export function produceAndPersist(
  opts: {
    events: readonly ToolEvent[];
    fireAt: string;
    fireStateHash: string;
    subject: Subject;
    recordsPath: string;
    graphStorePath?: string;
    withdrawals?: readonly Withdrawal[];
    permits?: readonly Permit[];
  },
): { records: OutcomeRecord[]; persisted: number; sources: string[] } {
  const sources: string[] = ["events"];
  const records = produce(opts.events, opts.fireAt, opts.subject, {
    withdrawals: opts.withdrawals,
    permits: opts.permits,
  });
  if (opts.graphStorePath !== undefined) {
    try {
      const fromGraph = laterEditFromGraph(opts.graphStorePath, opts.subject, opts.fireAt);
      if (fromGraph !== null && !records.some((r) => r.kind === "edit")) {
        records.push(fromGraph);
        sources.push("graph:structural");
      }
    } catch (e: unknown) {
      // ★ F-508 FIX (2026-09-24): the bare catch swallowed genuine graph faults (missing table,
      // * broken LIKE) identically to an absent store - invisible degradation against this
      // * module LOUD-refusal law. An unreadable store (GI_EVIDENCE_UNAVAILABLE) is still
      // * graph:UNAVAILABLE; any other fault is LOUD (console.error) and NAMED graph:ERROR
      // * so callers tell failure apart from absence. The event-derived records still survive.
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('GI_EVIDENCE_UNAVAILABLE')) {
        sources.push("graph:UNAVAILABLE");
      } else {
        console.error(`[gi-omp] laterEditFromGraph FAILED (graph source error, not absence): ${msg.slice(0, 160)}`);
        sources.push("graph:ERROR");
      }
    }
  }
  const persisted = persistRecords(opts.recordsPath, opts.fireStateHash, records);
  return { records, persisted, sources };
}

/**
 * ★★ THE ORCHESTRATOR — WHAT A SESSION RUNS AT ITS END. THE PRODUCER WIRED.
 *
 * Without this, the producer is a library with no caller (the pin's own UNWIRED-KERNEL
 * anti-pattern) — and the oracle stays synthetic by construction, which is the defect the
 * operator named. One call resolves EVERY unresolved fire in a ledger from the session's
 * own operation:
 *
 *   1 read the UNRESOLVED rows (resolved rows are the oracle's business, never re-judged)
 *   2 derive the subject from each row's rule + the caller's target map
 *   3 produce + persist the records for that fire
 *   4 resolve through `resolveAll` — the SAME path the tests use
 *
 * ★ IT REPORTS WHAT IT COULD NOT DO. A fire whose subject is unknown, or whose records are
 * empty, is counted — never silently skipped (oracle.ts's own partition law).
 */
export interface ResolveFromSessionResult {
  considered: number;
  produced: number;
  resolved: number;
  confirmed: number;
  refuted: number;
  /** Fires with no subject mapping — they cannot be resolved and are NAMED. */
  noSubject: number;
  /** Fires whose downstream evidence was EMPTY — silence, counted (not a failure). */
  noEvidence: number;
}

export function resolveFromSession(
  ledger: FireLedger,
  events: readonly ToolEvent[],
  opts: {
    recordsPath: string;
    /** state_hash → the subject the fire was about. The caller holds it; the DDL does not
     *  carry a target column (§8.2 — the named gap). */
    subjects: ReadonlyMap<string, Subject>;
    graphStorePath?: string;
    withdrawals?: readonly Withdrawal[];
    permits?: readonly Permit[];
    now?: () => string;
  },
): ResolveFromSessionResult {
  const out: ResolveFromSessionResult = {
    considered: 0, produced: 0, resolved: 0, confirmed: 0, refuted: 0, noSubject: 0, noEvidence: 0,
  };
  const pairs: { row: PersistedFireRow; subject: Subject }[] = [];
  for (const row of ledger.all()) {
    if (row.laterTruth !== "unresolved") continue;         // never re-judge a decision
    out.considered += 1;
    const subject = opts.subjects.get(row.stateHash);
    if (subject === undefined) { out.noSubject += 1; continue; }
    const { records, persisted } = produceAndPersist({
      events, fireAt: row.at, fireStateHash: row.stateHash, subject,
      recordsPath: opts.recordsPath, graphStorePath: opts.graphStorePath,
      withdrawals: opts.withdrawals, permits: opts.permits,
    });
    out.produced += persisted;
    if (records.length === 0) { out.noEvidence += 1; continue; }
    pairs.push({ row, subject });
  }
  // ★ resolved with ALL records — resolveAll re-derives per row, and the records are scoped
  //   by state_hash, so a fire only ever sees its own evidence.
  //   ★ F-342 FIX (2026-09-24), second half: the old loop called readRecords (a full-file
  //   read + parse) once PER fire — O(N × S). One read, partitioned in memory: O(S).
  const allRecords = readRecordsAll(opts.recordsPath);
  const perFire = new Map<string, OutcomeRecord[]>();
  for (const r of allRecords) {
    const key = (r as OutcomeRecord & { fireStateHash: string }).fireStateHash;
    let bucket = perFire.get(key);
    if (bucket === undefined) { bucket = []; perFire.set(key, bucket); }
    bucket.push(r);
  }
  for (const p of pairs) {
    const r = resolveAll(ledger, [p], perFire.get(p.row.stateHash) ?? [], { now: opts.now });
    out.resolved += r.resolved;
    out.confirmed += r.confirmed;
    out.refuted += r.refuted;
  }
  return out;
}
