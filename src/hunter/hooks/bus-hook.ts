// PORTED FROM fork-v143 live-tree/graph-intelligence/subagents/trident-bug-hunter/hooks/bus-hook.ts — verbatim bytes; SEAM: shared import rewritten.
// src/subagents/trident-bug-hunter/hooks/bus-hook.ts
// THE EVENT BUS HOOK (W7, spec §5.1:2339-2357 — the Hydra transport, D19.2).
// The passive pub-sub over W1's events table: the REPORT actor INSERTs the
// HUNT_DONE row; this hook polls the events table past its cursor and pushes to
// the subscribers (the main-agent dispatch directive, the auditor's AUDIT_START,
// the LOGIC-LSP clear). The D19.2 fallback contract: if the external Hydra
// system's API proves heavier than the value, THIS events-table push IS the
// sanctioned transport — the semantics identical (push, not poll), the durable
// truth identical (the DB), the only loss the external system's channeling.
//
// THE PLATFORM EVENT SURFACE (spec §5.1:2344): the plugin's 'event' hook fires
// on the platform's lifecycle events (session.created/ended etc.). The bus
// rides it — every event fires the poll, the cursor advances past the rows the
// machine's REPORT actor appended. The HUNT_DONE → the main agent's
// DISPATCH_BUILD directive; the BUILD_DONE → the auditor's AUDIT_START; the
// AUDIT_DONE → the diagnostics server's clear check (D25).

import type { DbClient, EventKind } from '../shared/db.ts';
import type { DiagnosticsServer } from '../surface/lsp-injector.ts';

/** The event row the bus reads (the events table's SELECT shape). */
export interface EventRow {
  id: number;
  kind: string;
  payload: string;
}

/** A bus subscription — the callback the platform wiring registers. */
export type BusSubscriber = (kind: EventKind, payload: Record<string, unknown>) => void;

/** THE BUS — the cursor + the subscribers + the poll. */

/** THE R16 TYPE_CERTAINTY GUARDED READ — a `.all()` result (an unknown array)
 *  is Array.isArray-checked before the typed row assertion. */
function rowsAs<T>(rows: unknown, label: string): T[] {
  if (Array.isArray(rows)) {
    return rows as T[];
  }
  throw new Error(`[hydra-bus] ${label} expected an array of rows, got ${typeof rows}`);
}

/** THE R16 TYPE_CERTAINTY GUARDED READ — the event kind is narrowed by the
 *  isBusKind membership check (the assertion is earned by the validation). */
function eventKind(v: unknown): EventKind {
  if (typeof v === 'string' && isBusKind(v)) {
    return v;
  }
  // ★ F-40 FIX (2026-09-24): no silent HUNT_DONE default — an unrecognized kind
  //   here means a corrupt row or a bypassed guard; fail closed and loud.
  throw new Error(`[hydra-bus] EVENT_INVALID kind=${JSON.stringify(v)} (expected HUNT_DONE|BUILD_DONE|AUDIT_DONE)`);
}
export class HydraBus {
  private cursor = 0;
  // ★ F-41 FIX (2026-09-24): reentrancy guard — concurrent poll() calls read the
  //   same cursor and double-deliver. A reentrant poll is a no-op with a loud log.
  private polling = false;
  private readonly subscribers: BusSubscriber[] = [];
  // ★ F-348 FIX (2026-09-24): poison-row signatures already logged (intake halts at a
  //   non-numeric id; repeats stay silent so the log is not spammed every poll).
  private readonly poisonLogged = new Set<string>();
  // ★ F-349 FIX (2026-09-24): subscriber failures are RECORDED, never just logged — the
  //   row stays consumed (the cursor advances, at-most-once delivery is kept) but the
  //   failure is inspectable and replayable via getFailedEvents/retryFailed.
  private readonly failedEvents: Array<{ row: EventRow; payload: Record<string, unknown>; error: unknown; attempt: number; failedIndex: number }> = [];

  subscribe(fn: BusSubscriber): void {
    this.subscribers.push(fn);
  }

  /** Poll the events table past the cursor; push the new rows to the
   *  subscribers; advance the cursor. Returns the pushed rows (the test +
   *  the audit surface). */
  poll(db: DbClient): EventRow[] {
    if (this.polling) {
      console.warn('[hydra-bus] poll reentered concurrently — skipped (the in-flight poll owns the cursor)');
      return [];
    }
    this.polling = true;
    // ★ F-1023 FIX (2026-09-25): an escaping throw mid-poll must not strand the
    // ★ cursor past rows never delivered (silent event loss on next poll). The saved
    // ★ cursor is restored on unexpected throw; normal poison skips still advance it.
    const cursorBefore = this.cursor;
    try {
    const rows = rowsAs<EventRow>(db.prepare('SELECT id, kind, payload FROM events WHERE id > ? ORDER BY id ASC').all(this.cursor), 'events');
    // ★ F-65 FIX (2026-09-24): the F-41 shape throw left the cursor behind the poison row —
    //   every later poll re-selected it (a permanent retry loop). Malformed rows are now
    //   skipped LOUDLY with the cursor advanced past them; the bus can never stall here.
    const clean: EventRow[] = [];
    for (const row of rows) {
      // ★ F-348 FIX (2026-09-24): a non-numeric id used to `continue` WITHOUT advancing
      //   the cursor, so `WHERE id > ?` re-selected the poison row on EVERY poll (a
      //   permanent stall — SQLite orders TEXT ids above every INTEGER cursor). A poison
      //   row now HALTS this poll's intake (the cursor already covers every clean row
      //   before it) and is logged ONCE per shape.
      if (typeof row.id !== 'number' || typeof row.kind !== 'string') {
        if (typeof row.id === 'number') {
          console.error(`[hydra-bus] skipping malformed events row: ${JSON.stringify(row).slice(0, 160)}`);
          this.cursor = row.id;
          continue;
        }
        const sig = JSON.stringify(row).slice(0, 160);
        if (!this.poisonLogged.has(sig)) {
          this.poisonLogged.add(sig);
          console.error(`[hydra-bus] POISON events row (non-numeric id, skipped past cursor ${this.cursor}): ${sig}`);
        }
        // F-401 FIX: poison rows SKIP, never HALT — old break stalled intake without covering
        // the poison id, so WHERE id > ? re-selected it every poll (permanent stall).
        // continue delivers all clean numerics; non-numeric id stays un-coverable by cursor
        // (logged ONCE via poisonLogged) but can never block clean intake. Unreachable on real store.
        continue;
      }
      clean.push(row);
    }
    // ★ F-247 NOTE (2026-09-24): NOT-A-BUG — events.id is INTEGER PRIMARY KEY so a
    //   non-numeric id is unreachable from the real store (NULL never satisfies
    //   `WHERE id > ?`); the loud skip above is defense for foreign rows, and every
    //   numeric id advances the cursor.
    for (const row of clean) {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(row.payload) as Record<string, unknown>;
      } catch (e: unknown) {
        console.warn(`[hydra-bus] event payload parse failed — the raw form is kept: ${e instanceof Error ? e.message : String(e)}`);
        payload = { raw: row.payload };
      }
      if (isBusKind(row.kind)) {
        for (let si = 0; si < this.subscribers.length; si++) {
          const fn = this.subscribers[si]!;
          try {
            fn(eventKind(row.kind), payload);
          } catch (e: unknown) {
            // ★ F-349 FIX (2026-09-24): a subscriber failure must not kill the poll loop —
            //   the row is still consumed (the cursor advances below), but the failure is
            //   RECORDED (not just logged) so a transient fault never silently loses a
            //   dispatch directive (e.g. HUNT_DONE → main-agent dispatch).
            // ★ F-816 FIX (2026-09-24): record the subscriber INDEX — retry redelivers
            //   ONLY to the thrower, never rebroadcasts to the subscribers that landed.
            console.error(`[hydra-bus] subscriber #${si} for ${row.kind} threw: ${e instanceof Error ? e.message : String(e)}`);
            this.failedEvents.push({ row, payload, error: e, attempt: 1, failedIndex: si });
          }
        }
      }
      this.cursor = row.id;
    }
      return clean;
    } finally {
      this.polling = false;
    }
  }

  /** The cursor — the audit + the test surface. */
  getCursor(): number {
    return this.cursor;
  }
  /** ★ F-349 FIX (2026-09-24): the dead-letter surface — every recorded subscriber
   *  failure, oldest first. A non-empty list means a directive was consumed but NOT
   *  delivered. */
  getFailedEvents(): ReadonlyArray<{ row: EventRow; payload: Record<string, unknown>; error: unknown; attempt: number }> {
    return this.failedEvents;
  }
  /** ★ F-349 FIX (2026-09-24): replay every recorded failure through the CURRENT
   *  subscribers. A replay that still throws stays queued with attempt + 1; a replay
   *  that lands is dropped. Returns the count still failing. */
  retryFailed(): number {
    // ★ F-816 FIX (2026-09-24): at-most-once per (event,subscriber) — the old shape
    //   REPLAYED the whole subscriber list per failed event, so a subscriber that
    //   SUCCEEDED on poll got the event AGAIN on retry (duplicate processing). Each
    //   recorded failure now carries the INDEX of the subscriber that threw
    //   (poll() records per-subscriber at the throw site); retry redelivers ONLY to
    //   that index. Late subscribers (subscribed after the failure was recorded) are
    //   NOT replayed — they never missed anything; replaying to them would be a NEW
    //   duplicate. A retry that still throws stays queued with attempt+1.
    const pending = this.failedEvents.splice(0, this.failedEvents.length);
    for (const f of pending) {
      // ★ F-502 FIX (2026-09-24): one try/catch around ALL subscribers meant the first throwing
      // * subscriber starved the rest of the retried event (poll() already guards per-subscriber).
      // * Each subscriber is now guarded; a still-throwing replay stays queued with attempt + 1.
      const idx = typeof (f as { failedIndex?: unknown }).failedIndex === "number"
        ? (f as { failedIndex: number }).failedIndex : -1;
      const fn = idx >= 0 ? this.subscribers[idx] : undefined;
      if (fn === undefined) {
        // Subscriber list changed since the failure was recorded (unsubscribed or
        // never existed at that index): nothing to redeliver to — drop LOUD so the
        // dead-letter queue cannot pin a row forever.
        console.error(`[hydra-bus] retry for ${f.row.kind} (attempt ${f.attempt + 1}) dropped: subscriber index ${idx} no longer present (${this.subscribers.length} subscribers)`);
        continue;
      }
      try {
        fn(eventKind(f.row.kind), f.payload);
      } catch (e: unknown) {
        console.error(`[hydra-bus] retry for ${f.row.kind} (attempt ${f.attempt + 1}) subscriber #${idx} threw: ${e instanceof Error ? e.message : String(e)}`);
        this.failedEvents.push({ ...f, error: e, attempt: f.attempt + 1 });
      }
    }
    return this.failedEvents.length;
  }
  /** ★ F-45 FIX (2026-09-24): the cursor reset to 0 on restart and replayed history
   *  (duplicate dispatches). The platform wiring owns persistence — call this with
   *  the last-processed event id at boot so a restart resumes instead of replaying.
   *  No auto-read here: the bus never invents delivered state it did not observe. */
  restoreCursor(lastDeliveredId: number): void {
    if (typeof lastDeliveredId === 'number' && Number.isFinite(lastDeliveredId) && lastDeliveredId >= 0) {
      this.cursor = Math.floor(lastDeliveredId);
    }
  }
}

function isBusKind(k: string): k is EventKind {
  return k === 'HUNT_DONE' || k === 'BUILD_DONE' || k === 'AUDIT_DONE';
}

/** THE DEFAULT SUBSCRIPTIONS (spec §5.1:2349-2352) — the machine's own wiring:
 *  the HUNT_DONE → the main-agent dispatch directive; the BUILD_DONE → the
 *  auditor's AUDIT_START; the AUDIT_DONE → the LOGIC-LSP clear check. The
 *  emit targets are the platform wiring's callbacks (injectable for the tests). */
export interface BusDefaultWiring {
  onHuntDone?: (payload: Record<string, unknown>) => void;
  onBuildDone?: (payload: Record<string, unknown>) => void;
  onAuditDone?: (payload: Record<string, unknown>) => void;
  server?: DiagnosticsServer;
}

/** Create the bus with the DEFAULT subscriptions wired (the D19.2 fallback's
 *  own event loop — the plugin's event hook pushes the events-table rows). */
export function createHydraBus(wiring: BusDefaultWiring = {}): HydraBus {
  const bus = new HydraBus();
  bus.subscribe((kind, payload): void => {
    switch (kind) {
      case 'HUNT_DONE':
        wiring.onHuntDone?.(payload);
        break;
      case 'BUILD_DONE':
        wiring.onBuildDone?.(payload);
        break;
      case 'AUDIT_DONE':
        wiring.onAuditDone?.(payload);
        wiring.server?.onAuditDone({ conformanceZero: payload['conformanceZero'] === true });
        break;
    }
  });
  return bus;
}
