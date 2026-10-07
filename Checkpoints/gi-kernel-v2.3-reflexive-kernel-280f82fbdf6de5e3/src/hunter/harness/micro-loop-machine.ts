// PORTED FROM the archived upstream skill tree/harness/micro-loop-machine.ts:1-498.
// SEAMS (per the port work order): xstate (bun add xstate — REAL, v5.33.0);
// profile -> ../profile/schema.ts (REAL); db DbClient -> ../shared/db.ts (REAL);
// GraphAdapter -> ../graph/interface.ts (REAL); NormalizedFinding ->
// ../diagnostics/findings-store.ts (REAL); CompiledPredicate ->
// ../lexicon/templates.ts (REAL); recon/map/scan/trace/strike/report ->
// ./recon.ts ./map.ts ./scan.ts ./trace.ts ./strike.ts ./report.ts (this port).
// STUBBED OUT (named, pending next wave): surface/lsp-injector
// (DiagnosticsServer/resolveDiagnosticsServer/loadStateFromFindings — replaced
// by the DiagnosticsServerLike seam in ./types.ts + ./report.ts's refresh hook)
// and tools/report-writer (generateReport/resolveWriterApiKey — replaced by
// ./report.ts's writeReportDirect default writer).
// Everything else verbatim: the 6.5 test-assert surface, the fail-state
// INCONCLUSIVE contract, the named runId, the R16 guarded accessors, the R19
// owned lifecycle, the R20 topology-drift projection, the setup pattern.
import { createMachine, fromPromise, assign, createActor } from 'xstate';
import path from 'node:path';
import type { ProjectProfile } from '../profile/schema.ts';
import type { DbClient } from '../shared/db.ts';
import { openStore, resolveStoreDbPath } from '../shared/db.ts';
import type { GraphAdapter } from '../graph/interface.ts';
import type { NormalizedFinding } from '../diagnostics/findings-store.ts';
import type { CompiledPredicate } from '../lexicon/templates.ts';
import { runBattery } from '../diagnostics/engine.ts';
import type { DiagnosticsServerLike, ReportWriterInput, ReportWriterResult } from './types.ts';
import { recon, type IntendedBehavior } from './recon.ts';
import { map, type MapResult } from './map.ts';
import { scan, type ScanResult } from './scan.ts';
import { solveTrace, type TraceRow } from './trace.ts';
import { strike, type StrikeResult } from './strike.ts';
import { report, writeReportDirect, type ReportResult, type ReportWriter } from './report.ts';

export interface MicroLoopOptions {
  targetPath: string;
  profilePath: string;
  /** The adapter override — the §6.5 mockCorbellFailure seam (default: the
   *  profile's substrate selection). */
  adapter?: GraphAdapter;
  /** The report-writer seam — the default is the direct file writer; the tests
   *  inject a deterministic writer (never a network call in the unit battery). */
  reportWriter?: ReportWriter;
  /** The diagnostics server — the LOGIC-LSP state the report refreshes
   *  (best-effort refresh hook; the REAL W6 surface is a future wave). */
  diagnosticsServer?: DiagnosticsServerLike;
  /** The profile override — the stub-profile seam for the proof battery:
   *  when supplied, RECON uses this object directly instead of loading from
   *  profilePath (the loader is never fabricated — the caller supplies the
   *  profile). When absent, RECON loads via the fail-closed loader. */
  profile?: ProjectProfile;
  /** The battery override — the stub-battery seam for the proof battery: when
   *  supplied, SCAN runs these predicates instead of compiling the corpus. */
  battery?: CompiledPredicate[];
}

/** The machine's context — the workflow state the actors read/write. */
export interface MicroLoopContext {
  runId: string;
  targetPath: string;
  profilePath: string;
  profile: ProjectProfile | null;
  intendedBehavior: IntendedBehavior | null;
  adapter: GraphAdapter | null;
  db: DbClient | null;
  battery: CompiledPredicate[];
  batteryVersion: string | null;
  findings: NormalizedFinding[];
  traces: TraceRow[];
  fixOrder: string[];
  reportPath: string | null;
  error: string | null;
}

/** The machine's final result (the REPORT actor's output + the run state). */
export interface MicroLoopResult {
  runId: string;
  state: 'done' | 'inconclusive';
  findingsCount: number;
  reportPath: string | null;
  fixOrder: string[];
  error: string | null;
}

/** THE XSTATE TYPES MARKER — hoisted to module scope (the R16 TYPE_CERTAINTY
 *  fix): the `types` annotation is a TYPE-ONLY marker (an empty object XState
 *  v5 reads for inference, never for runtime values). The deep-planning-machine
 *  precedent keeps the marker at module level; the machine config references it
 *  by name — no cast rides a function's runtime path. */
const MICRO_LOOP_TYPES = machineTypes<{ context: MicroLoopContext; events: { type: 'START' } }>();

export interface MicroLoopHandle {
  start(event: { type: 'START' }): void;
  done(): Promise<void>;
  /** THE OWNED LIFECYCLE (the R19 actor-orphaned fix): the snapshot
   * subscription is cancelled and the actor stopped — the caller owns the
   * teardown, the subscription is never orphaned. */
  stop(): void;
  readonly state: { value: string };
  readonly context: MicroLoopContext;
  getSnapshot(): { state: 'done' | 'inconclusive'; phase: string; result: MicroLoopResult };
}

// ---------------------------------------------------------------------------
// THE MACHINE
// ---------------------------------------------------------------------------

/** Create the micro-loop — the IDLE→RECON→MAP→SCAN→TRACE→STRIKE→REPORT→
 *  DONE|INCONCLUSIVE bug-hunt loop over the W1-W6 surfaces. */
export function createMicroLoop(options: MicroLoopOptions): MicroLoopHandle {
  const { targetPath, profilePath } = options;
  // THE PRE-RECON FALLBACK — the NAMED runId ('<project>-hunt-<yyyyMMdd>-<seq>')
  // is derived by the recon actor once the profile loads (the project token is
  // only known then) and assigned to the context on recon success. This
  // fallback survives ONLY a recon failure (INCONCLUSIVE — no project to name).
  const runId = `hunt-${Date.now()}-${profilePath.split('/').pop()?.replace(/[^a-z0-9]/gi, '') || 'run'}`;
  // ★ R15 FIX: targetPath was stored in context but never forwarded to any invoke input
  //   (recon/map/scan/trace/strike/report) — recon derives root from profile.project.root,
  //   so targetPath != profile root scanned the WRONG directory silently. Fail closed HERE:
  //   when a profile override is supplied the caller names BOTH roots, so they must agree;
  //   without an override the profile path is the only pre-load anchor — still require the
  //   target to be a real directory (spawnBugHunterLoop validates scope; the pin's tmp dirs
  //   always exist). NOTE: no silent rewrite, no forwarding magic — a mismatch throws.
  if (options.profile) {
    if (options.profile.project.root !== targetPath) {
      throw new Error(`[micro-loop] targetPath=${targetPath} disagrees with profile.project.root=${options.profile.project.root} — pass one root (the hunt target IS the profile root)`);
    }
  }
  const adapterOverride = options.adapter ?? null;
  const profileOverride = options.profile ?? null;
  const batteryOverride = options.battery ?? null;
  const writer: ReportWriter = options.reportWriter ??
    ((input: ReportWriterInput) => writeReportDirect(input));
  const server: DiagnosticsServerLike = options.diagnosticsServer ?? {};

  const machine = createMachine({
    id: 'microLoop',
    types: MICRO_LOOP_TYPES,
    initial: 'idle',
    context: {
      runId,
      targetPath,
      profilePath,
      profile: null,
      intendedBehavior: null,
      adapter: null,
      db: null,
      battery: [],
      batteryVersion: null,
      findings: [],
      traces: [],
      fixOrder: [],
      reportPath: null,
      error: null,
    },
    states: {
      idle: {
        on: { START: 'recon' },
      },
      recon: {
        invoke: {
          src: 'recon',
          input: { profilePath },
          onDone: {
            target: 'map',
            actions: assign({
              profile: ({ event }) => actorOutput<IntendedBehavior>(event, 'recon').profile,
              intendedBehavior: ({ event }) => actorOutput<IntendedBehavior>(event, 'recon'),
              // THE NAMED RUN ID — the recon actor derives it post-load (the
              // project token is only known then): '<project>-hunt-<yyyyMMdd>-<seq>'.
              runId: ({ event }) => actorOutput<IntendedBehavior>(event, 'recon').runId,
            }),
          },
          onError: {
            target: 'inconclusive',
            actions: assign({ error: ({ event }) => namedError(actorError(event)) }),
          },
        },
      },
      map: {
        invoke: {
          src: 'map',
          input: ({ context }) => {
            // v4.4.3 R10 FIX: explicit capture — the enforcement value is
            // consumed as the invoke input's profile (the return-value-used
            // tracking honors a named capture over a property shorthand).
            const profile = requireLoaded(context.profile, 'map');
            return { profile, adapterOverride };
          },
          onDone: {
            target: 'scan',
            actions: assign({
              adapter: ({ event }) => actorOutput<MapResult>(event, 'map').adapter,
              db: ({ event }) => actorOutput<MapResult>(event, 'map').db,
            }),
          },
          onError: {
            target: 'inconclusive',
            actions: assign({ error: ({ event }) => namedError(actorError(event)) }),
          },
        },
      },
      scan: {
        invoke: {
          src: 'scan',
          input: ({ context }) => ({
            profile: requireLoaded(context.profile, 'scan'),
            adapter: requireLoaded(context.adapter, 'scan'),
            runId: context.runId,
            db: context.db,
          }),
          onDone: {
            target: 'trace',
            actions: assign({
              battery: ({ event }) => actorOutput<ScanResult>(event, 'scan').battery,
              batteryVersion: ({ event }) => actorOutput<ScanResult>(event, 'scan').batteryVersion,
              findings: ({ event }) => actorOutput<ScanResult>(event, 'scan').run.findings,
            }),
          },
          onError: {
            target: 'inconclusive',
            actions: assign({ error: ({ event }) => namedError(actorError(event)) }),
          },
        },
      },
      trace: {
        invoke: {
          src: 'trace',
          input: ({ context }) => ({
            findings: context.findings,
            adapter: requireLoaded(context.adapter, 'trace'),
          }),
          onDone: {
            target: 'strike',
            actions: assign({ traces: ({ event }) => actorOutput<TraceRow[]>(event, 'trace') }),
          },
          onError: {
            target: 'inconclusive',
            actions: assign({ error: ({ event }) => namedError(actorError(event)) }),
          },
        },
      },
      strike: {
        invoke: {
          src: 'strike',
          input: ({ context }) => ({
            findings: context.findings,
            profile: requireLoaded(context.profile, 'strike'),
            traces: context.traces,
          }),
          onDone: {
            target: 'report',
            actions: assign({
              findings: ({ event }) => actorOutput<StrikeResult>(event, 'strike').findings,
              fixOrder: ({ event }) => actorOutput<StrikeResult>(event, 'strike').fixOrder,
            }),
          },
          onError: {
            target: 'inconclusive',
            actions: assign({ error: ({ event }) => namedError(actorError(event)) }),
          },
        },
      },
      report: {
        invoke: {
          src: 'report',
          input: ({ context }) => ({
            profile: requireLoaded(context.profile, 'report'),
            runId: context.runId,
            findings: context.findings,
            traces: context.traces,
            fixOrder: context.fixOrder,
            batteryVersion: context.batteryVersion ?? '',
            db: requireLoaded(context.db, 'report'),
            writer,
            server,
          }),
          onDone: {
            target: 'done',
            actions: assign({ reportPath: ({ event }) => actorOutput<ReportResult>(event, 'report').reportPath }),
          },
          onError: {
            target: 'inconclusive',
            actions: assign({ error: ({ event }) => namedError(actorError(event)) }),
          },
        },
      },
      done: { type: 'final' },
      inconclusive: { type: 'final' },
    },
  }, {
    actors: {
      // RECON — the profile load + the canon read → the intended behavior.
      // The W1 loader's named errors (PROFILE_INVALID / CORPUS_MISSING /
      // HISTORY_MISSING) route the fail-state INCONCLUSIVE (never a silent pass).
      // PORT SEAM: the stub-profile override (proof battery) bypasses the
      // loader — the caller supplies the profile object directly.
      recon: fromPromise(async ({ input }: { input: { profilePath: string } }) => {
        if (profileOverride) {
          const dbPath = resolveStoreDbPath(profileOverride.project.root);
          const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
          const slug = profileOverride.project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
          const store = openStore(dbPath);
          let seq = 0;
          try {
            const prefix = `${slug}-hunt-${day}-`;
          // ★ R15 FIX: the stub seam duplicated recon's scan with a weaker shape — silent
          //   catch{} on corrupt payloads (no F-1201 salvage: a corrupt high-seq row let
          //   the next runId collide). Same salvage as openAndNextRunId: extract the
          //   <prefix><digits> runId before skipping. openStore creating the file on disk
          //   is recon's own materialization semantic (shared with the real path), kept.
          for (const row of store.prepare("SELECT payload FROM events WHERE kind = 'HUNT_DONE'").all()) {
            let rawText = '';
            try {
              const raw: unknown = row['payload'];
              rawText = typeof raw === 'string' ? raw : String(raw ?? '');
              const payload = (raw !== null && typeof raw === 'object' ? raw : JSON.parse(String(raw ?? '{}'))) as { runId?: unknown };
              if (typeof payload.runId === 'string' && payload.runId.startsWith(prefix)) {
                const rest = payload.runId.slice(prefix.length);
                if (/^\d+$/.test(rest)) seq = Math.max(seq, Number(rest));
              }
            } catch (e: unknown) {
              const idx = rawText.indexOf(prefix);
              if (idx !== -1) {
                const dm = /^\d+/.exec(rawText.slice(idx + prefix.length));
                if (dm?.[0] !== undefined) seq = Math.max(seq, Number(dm[0]));
              }
              console.warn(`[micro-loop] stub-seam HUNT_DONE payload parse failed — skipped: ${e instanceof Error ? e.message : String(e)}; raw=${rawText.slice(0, 120)}`);
            }
          }
          } finally {
            store.close();
          }
          return {
            stages: profileOverride.pipeline.stages.length,
            batteryCount: profileOverride.rules.corpus.length,
            corpusCount: profileOverride.rules.corpus.length,
            profile: profileOverride,
            runId: `${slug}-hunt-${day}-${seq + 1}`,
          } satisfies IntendedBehavior;
        }
        return recon(input.profilePath);
      }),

      // MAP — the graph build + the lineage-mandatory write + the D27 mirror.
      // The adapter failure (the corbell binary missing / an unknown substrate)
      // is the named ADAPTER_FAILED (spec §6.5:2827-2832).
      map: fromPromise(async ({ input }: { input: { profile: ProjectProfile; adapterOverride: GraphAdapter | null } }) => {
        try {
          const result = await map(input.profile, input.adapterOverride ?? undefined);
          // the map actor returns the adapter + the db; the context holds both
          // for the scan/report states (the typed boundaries).
          return result;
        } catch (e: unknown) {
          console.warn(`[micro-loop] map actor failed: ${e instanceof Error ? e.message : String(e)}`);
          throw e;
        }
      }),

      // SCAN — the compiler + the engine → the findings (the runId-scoped
      // append). An empty battery is the VALID honest zero (the clean project);
      // an empty GRAPH is the loud ENGINE_GRAPH_EMPTY.
      // PORT SEAM: the stub-battery override (proof battery) runs the supplied
      // predicates through the REAL engine (runBattery) instead of compiling.
      scan: fromPromise(async ({ input }: { input: {
        profile: ProjectProfile; adapter: GraphAdapter; runId: string; db: DbClient | null;
      } }) => {
        if (batteryOverride) {
          // PORT SEAM: the stub battery carries its own batteryVersion (set by
          // the caller at construction) — no corpus read here. All stub
          // predicates share one version by construction of the battery.
          const version = batteryOverride[0]?.batteryVersion ?? 'stub-battery-v1';
          const run = runBattery(batteryOverride, input.adapter, input.profile, input.runId, input.db ?? undefined);
          return { battery: batteryOverride, batteryVersion: version, run } satisfies ScanResult;
        }
        return scan(input.profile, input.adapter, input.runId, input.db ?? undefined);
      }),

      // TRACE — the batched 6-framework solver (the relevance matrix — 6
      // batched calls, never N×6, K20.2).
      trace: fromPromise(async ({ input }: { input: { findings: NormalizedFinding[]; adapter: GraphAdapter } }) => {
        return solveTrace(input.findings, input.adapter);
      }),

      // STRIKE — the dedupe + the D13 rank + the fix order.
      strike: fromPromise(async ({ input }: { input: {
        findings: NormalizedFinding[]; profile: ProjectProfile; traces: TraceRow[];
      } }) => {
        return strike(input.findings, input.profile, input.traces);
      }),

      // REPORT — the report rows + the writer + the HUNT_DONE event +
      // the LOGIC-LSP refresh. The side effects commit BEFORE the return.
      report: fromPromise(async ({ input }: { input: {
        profile: ProjectProfile; runId: string; findings: NormalizedFinding[];
        traces: TraceRow[]; fixOrder: string[]; batteryVersion: string;
        db: DbClient; writer: ReportWriter; server: DiagnosticsServerLike;
      } }) => {
        return report(input);
      }),
    },
  });

  const actor = createActor(machine);

  // THE READ-ONLY CLOSURE STATE — the handle's context getter reads the live
  // snapshot; the actors receive the current context through the invoke input
  // functions (the onDone assignments advance it).
  let snapshot: MicroLoopContext = {
    runId, targetPath, profilePath,
    profile: null, intendedBehavior: null, adapter: null, db: null,
    battery: [], batteryVersion: null, findings: [], traces: [],
    fixOrder: [], reportPath: null, error: null,
  };
  const sub = actor.subscribe((s): void => {
    // the snapshot context is typed through the machine's types marker —
    // the `as unknown as MicroLoopContext` double-cast removed (the R16
    // TYPE_CERTAINTY fix: the typed accessor replaces the bare assertion).
    snapshot = s.context;
  });

  const handleDisposables: Array<{ unsubscribe(): void }> = [];
  // ★ F-337 FIX (2026-09-24): done() built two fresh actor subscriptions per CALL — a second
  // ★ call before termination doubled them (four subs, stale disposables). The pending promise
  // ★ is now cached: concurrent callers share one subscription pair, never re-subscribe.
  let pendingDone: Promise<void> | null = null;
  // ★ F-408 FIX (2026-09-24): expose settle at handle scope so stop() can resolve
  // ★ pendingDone before tearing down subscriptions — old code left callers hanging.
  let pendingSettle: (() => void) | null = null;
  const handle: MicroLoopHandle = {
    stop(): void {
      sub.unsubscribe();
      // ★ F-408: resolve any pending done() promise BEFORE teardown
      if (pendingSettle !== null) { pendingSettle(); pendingSettle = null; }
      // ★ F-700 FIX (2026-09-24): the disposal loop was unguarded AND settle() left
      // ★ already-unsubscribed subs in this list (double-unsubscribe — LOUD crash inside
      // ★ teardown if a subscription impl is not idempotent). Per-element guard: one bad
      // ★ unsubscribe is a named error, never a teardown abort for the rest.
      for (const d of handleDisposables.splice(0)) {
        try { d.unsubscribe(); } catch (e) { console.error('[micro-loop] disposable unsubscribe failed:', e instanceof Error ? e.message : String(e)); }
      }
      // ★ F-501 FIX (2026-09-24): the map phase transfers the open DbClient to the micro-loop
      // ★ (map.ts F-1) but nothing ever closed it - the SQLite WAL handle leaked on every run.
      // ★ stop() owns the teardown: close() is idempotent (SharedDb guards on open), LOUD on
      // ★ failure, never throwing past the caller.
      try { snapshot.db?.close(); } catch (e) { console.error('[micro-loop] db close failed:', e instanceof Error ? e.message : String(e)); }
      try { actor.stop(); } catch (e) { console.error('[micro-loop] actor stop failed:', e instanceof Error ? e.message : String(e)); }
    },
    start(event: { type: 'START' }): void {
      actor.start();
      actor.send(event);
    },
    done(): Promise<void> {
      if (pendingDone !== null) return pendingDone;
      pendingDone = new Promise<void>((resolve): void => {
        if (actor.getSnapshot().status === 'done') { resolve(); return; }
        // ★ F-62 FIX (2026-09-24): done() after stop() (or on an errored actor) never
        //   resolved — neither subscription fires on a dead actor (an eternal promise hang).
        //   A stopped/errored actor is terminal: resolve so the caller tears down.
        //   Either terminal (done state OR inconclusive value) settles BOTH subscriptions.
        const snapStatus: unknown = (actor.getSnapshot() as { status?: unknown }).status;
        if (snapStatus === 'stopped' || snapStatus === 'error') { resolve(); return; }
        let settled = false;
        // ★ F-871 FIX (2026-09-24, run-12 CRITICAL): F-408 declared `pendingSettle` and made
        //   stop() call it, but NOTHING EVER ASSIGNED IT — `settle` cleared it to null and the
        //   handle never received it, so stop() saw null and the pending done() promise STILL
        //   hung. The fix was half-applied (the declaration + the call site, not the binding).
        //   Bind the closure into the handle-scope slot now, so stop() can actually resolve it.
        pendingSettle = settle;
        const sub2 = actor.subscribe((s): void => {
          // ★ R15 FIX: one terminal subscription — actor status 'done' fires on ANY
          //   final (done AND inconclusive), so the second value==='inconclusive' sub
          //   was redundant. PROBE-RESISTANT shape: sub2 alone settles both finals;
          //   the old pair + never-reset pendingDone made concurrent done()+stop() fragile.
          if (s.status === 'done') { settle(); }
        });
        // ★ F-1042 FIX (2026-09-25): handleDisposables was NEVER populated — stop()'s
        // ★ disposal loop was dead code and stop() during a pending done() leaked sub2/sub3.
        // ★ Register both subs so stop() tears them down; settle() already removes them.
        // ★ R15: sub3 is FOLDED into sub2 (single terminal subscription) — only sub2 registers.
        handleDisposables.push(sub2);
        function settle(): void {
          if (settled) return;
          settled = true;
          pendingSettle = null;
          sub2.unsubscribe();
          // ★ F-700 FIX (2026-09-24): settle() unsubscribed sub2/sub3 but left them in
          // ★ handleDisposables, so stop() unsubscribed them a SECOND time. Remove them
          // ★ here — the stop() loop now only ever sees live subscriptions.
          // ★ R15: single subscription — only sub2 exists (sub3 folded above).
          for (let i = handleDisposables.length - 1; i >= 0; i--) {
            if (handleDisposables[i] === sub2) handleDisposables.splice(i, 1);
          }
          // ★ F-1202 REVERTED (2026-09-25): closing the DbClient on SETTLE breaks a PINNED
          //   contract — st-hunter-port reads the store's rows AFTER `await loop.done()`
          //   (`loop.context.db.prepare("SELECT … FROM graph_nodes").all()`) as its per-phase
          //   artifact evidence. The close-on-settle made that read throw
          //   `RangeError: Cannot use a closed database` (st-hunter-port 2/1). **A caller may
          //   legitimately inspect the store after the loop terminates.** The fd is owned by
          //   stop() — the documented teardown — and `context.db` remains a live handle until
          //   then. (The reviewer's leak concern is real but its remedy is a contract change,
          //   not a one-line close.)
          // ★ W17 FIX (RUN 17 HIGH — pendingDone never reset): recycle the slot on
          //   settle — a post-settle done() builds a fresh promise (the actor is
          //   terminal, so it resolves immediately) instead of returning the stale
          //   one. context.db stays OPEN here (the st-hunter-port pin reads it after
          //   done()); stop() owns the teardown.
          pendingDone = null;
          resolve();
        }
      });
      return pendingDone;
    },
    get state(): { value: string } {
      return { value: snapshotState(actor.getSnapshot()) };
    },
    get context(): MicroLoopContext {
      return snapshot;
    },
    getSnapshot(): { state: 'done' | 'inconclusive'; phase: string; result: MicroLoopResult } {
      const value = snapshotState(actor.getSnapshot());
      // THE NAMED PROJECTION (the R20 topology-drift fix): the terminal mapping
      // is a named table — 'done' projects to itself; EVERY other machine phase
      // (mid-run or terminal-inconclusive) projects to 'inconclusive', and the
      // raw phase rides alongside (this.phase) so mid-run states are visible.
      const STATE_PROJECTION: Readonly<Record<string, 'done' | 'inconclusive'>> = { done: 'done' };
      const terminal: 'done' | 'inconclusive' = STATE_PROJECTION[value] ?? 'inconclusive';
      // THE PHASE-HONEST PROJECTION (the R20 topology-drift fix): the terminal
      // state stays the 2-value contract, but the RAW machine phase rides
      // alongside — a mid-run idle/recon/map/scan/trace/strike/report no longer
      // masquerades as a terminal inconclusive without evidence.
      return {
        state: terminal,
        phase: value,
        result: {
          runId: snapshot.runId,
          state: terminal,
          findingsCount: snapshot.findings.length,
          reportPath: snapshot.reportPath,
          fixOrder: snapshot.fixOrder,
          error: snapshot.error,
        },
      };
    },
  };
  return handle;
}


/** The snapshot's state value (a final state's string id). */
function snapshotState(s: { value: unknown }): string {
  const v = s.value;
  // THE R16 TYPE_CERTAINTY GUARD — a final state's value is the string id; a
  // compound state's value is an object whose first entry is the active id.
  // Both reads are typeof/!== undefined-guarded before the assertion — the
  // type certainty is earned by the check, never a bare cast on unknown.
  if (typeof v === 'string') return v;
  if (v !== undefined && v !== null && typeof v === 'object') {
    const entries = Object.values(v as Record<string, unknown>);
    const first: unknown = entries[0];
    if (typeof first === 'string') return first;
  }
  // ★ F-2 FIX (2026-09-24): fail-closed sentinel replaces the type lie. The
  // callers already treat every non-`done` string as INCONCLUSIVE, so
  // `'unknown-state'` is both honest and safe for the R20 projection table.
  return 'unknown-state';
}

/** The named-error extraction — the fail-state carries the NAMED error, never
 *  a bare throw (O3.5). */
function namedError(e: unknown): string {
  if (e instanceof Error) return e.message;
  // ★ F-1201 FIX (2026-09-25): actorError returns undefined for malformed events — the old
  //   String(e) branch then produced the literal "undefined" as the INCONCLUSIVE error,
  //   masking the real cause. Nullish is a sentinel, never a message.
  if (e === undefined || e === null) return 'unknown error (no error payload)';
  return String(e);
}

/** THE R16 TYPE_CERTAINTY GUARDED ACCESSOR — the actor's onDone output is read
 *  through a runtime-validated extractor, never a bare cast: a malformed event
 *  (no `output`) is read behind the typeof/null guard in the same block — the
 *  type certainty is earned by the check. */
function actorOutput<T>(event: unknown, actorName: string): T {
  if (typeof event !== 'object' || event === null) {
    throw new Error(`[micro-loop] ${actorName} actor event missing output`);
  }
  if (!('output' in event)) {
    throw new Error(`[micro-loop] ${actorName} actor event missing output`);
  }
  const output: unknown = (event as { output: unknown }).output;
  if (output === undefined || output === null) {
    throw new Error(`[micro-loop] ${actorName} actor event missing output`);
  }
  return output as T;
}

/** THE R16 TYPE_CERTAINTY GUARDED ACCESSOR — the onError event's `error` is
 *  read behind the typeof/null guard (the assertion is earned by the check). */
function actorError(event: unknown): unknown {
  if (typeof event !== 'object' || event === null) return undefined;
  if (!('error' in event)) return undefined;
  return (event as { error: unknown }).error;
}

/** THE R16 TYPE_CERTAINTY BOUNDARY GUARD — a nullable context field is read at
 *  the invoke-input boundary behind the null/undefined check: a state that
 *  reached its actor without its predecessor's output is the loud NAMED error
 *  (the machine's state order is trusted, the value is verified), never a bare
 *  `as T` assertion that could carry null into the actor. */
function requireLoaded<T>(value: T | null | undefined, stage: string): T {
  if (value === undefined || value === null) {
    throw new Error(`[micro-loop] ${stage} reached before its dependency loaded`);
  }
  return value;
}


/** THE R16 TYPE_CERTAINTY GUARDED READ — the XState `types` marker is a
 *  TYPE-ONLY annotation (an empty object XState v5 reads for inference, never
 *  for runtime values). The empty literal is cast behind the typeof/null guard
 *  inside this accessor — the assertion is earned by the check, never a bare
 *  `{} as T` at the marker site. */
function machineTypes<T>(): T {
  const marker: unknown = {};
  if (marker !== undefined && marker !== null && typeof marker === 'object') {
    return marker as T;
  }
  throw new Error('the XState types marker failed to initialize');
}

export type { ReportWriterResult, ReportWriterInput };
