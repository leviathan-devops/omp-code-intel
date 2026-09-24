import { resolveSessionIdFromEvent } from "../scoping/gi-session-path.ts";
// GI graph-gate on OMP write/edit. Separate tool_call listener; the handler
// throw cancels FULL.

import * as fs from "node:fs";
import { resolveDial, runGraphGate, type GiDial } from "./gate-middleware.ts";
import { classifyEdit, computeDrift, createEmptyState, gateDecision, recordEdit, recordGraphQuery, type GraphGateSessionState } from "./graph-gate.ts";

export interface GiToolCallEvent {
  toolName: string;
  input: Record<string, unknown>;
  isAgentOrigin?: boolean;
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** ★ F-309 FIX (2026-09-24): rule/id text carrying regex metacharacters (., *, +, ?, [, ], (, ),
 *  {, }, ^, $, |, \\) built into `new RegExp(...)` would mis-match or throw. Escape before
 *  interpolating so a literal name matches literally. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function filePathOf(input: Record<string, unknown>): string {
  return str(input.file_path) || str(input.filePath) || str(input.path);
}

function reconstruct(toolName: string, input: Record<string, unknown>): { oldText: string; newText: string; file: string } {
  const file = filePathOf(input) || str(input.path);
  const patch = str(input.input) || str(input.old_string) || str(input.oldString);
  if (toolName === "write" || toolName === "write_file") {
    const newText = str(input.content) || str(input.input);
    let oldText = "";
    if (file && fs.existsSync(file)) {
      try { oldText = fs.readFileSync(file, "utf8"); } catch { oldText = ""; }
    }
    return { oldText, newText, file };
  }
  const oldString = str(input.old_string) || str(input.oldString);
  const newString = str(input.new_string) || str(input.newString);
  let oldText = oldString;
  if (file && fs.existsSync(file)) {
    try { oldText = fs.readFileSync(file, "utf8"); } catch { oldText = oldString; }
  }
  if (oldString && newString) {
    // ★ F-535 FIX (2026-09-24): split().join() replaced EVERY occurrence file-wide, so drift/severity were evaluated against a reconstruction the agent never intended. replace() targets the single first occurrence — the edit's actual location.
    return { oldText, newText: oldText.replace(oldString, newString), file };
  }
  const dsl = str(input.input);
  let newText = oldText;
  if (dsl && oldText) {
    const names = oldText.match(/export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/g) ?? [];
    newText = oldText;
    for (const full of names) {
      const n = full.replace(/export\s+(?:async\s+)?function\s+/, "");
      const stripped = new RegExp(String.raw`function\s+` + escapeRegExp(n));
      if (stripped.test(dsl) && !new RegExp(String.raw`export\s+(?:async\s+)?function\s+` + escapeRegExp(n)).test(dsl)) {
        newText = newText.replace(new RegExp(String.raw`export\s+(async\s+)?function\s+` + escapeRegExp(n)), "function " + n);
      }
    }
  }
  return { oldText, newText, file };
}

export function attachGiGraphGate(pi: { on: (ev: string, h: (event: Record<string, unknown>, ctx: unknown) => unknown) => void }): void {
  // ★ F-PS1 FIX (2026-09-24): keyed per tool name — a single slot let two interleaved
  //   write/edit calls overwrite each other's steer note, delivering the wrong advisory.
  // ★ F-39 FIX (2026-09-24): keyed per tool name — two interleaved write/edit calls overwrote each other's steer note (call-B's tool_call clobbered call-A's). FIFO per (session, tool), mirroring the F-GQ1 query queue below.
  const pendingSteer = new Map<string, Array<{ tool: string; note: string }>>();
  pi.on("tool_call", (event: Record<string, unknown>) => {
    const name = String(event.toolName ?? "").toLowerCase();
    const input = (event.input && typeof event.input === "object" ? event.input : {}) as Record<string, unknown>;
    // ★ F-GH1 FIX (2026-09-24): the per-call debug append ran on EVERY tool_call (sync I/O
    //   on the hot path, unbounded file). Opt-in via GI_GATE_DEBUG=1; zero readers exist.
    if (process.env.GI_GATE_DEBUG === "1") {
      try {
        fs.appendFileSync("/tmp/gi-gate.log", JSON.stringify({
          name,
          keys: Object.keys(input),
          dial: process.env.GI_DIAL ?? "",
          origin: event.isAgentOrigin,
        }) + "\n");
      } catch { /* ignore log failures */ }
    }
    if (name !== "write" && name !== "write_file" && name !== "edit" && name !== "patch") {
      return undefined;
    }
    if (event.isAgentOrigin === false) return undefined;
    const dial: GiDial = resolveDial(process.env);
    const rec = reconstruct(name, input);
    const verdict = runGraphGate({
      dial,
      oldText: rec.oldText,
      newText: rec.newText,
      file: rec.file,
      hasStore: true,
    });
    if (process.env.GI_GATE_DEBUG === "1") {
      try {
        fs.appendFileSync("/tmp/gi-gate.log", JSON.stringify({ recFile: rec.file, dial, verdict }) + "\n");
      } catch { /* ignore */ }
    }
    const steerSid = resolveSessionIdFromEvent(event).id;
    if (verdict.cancel && verdict.token) {
      const stale = pendingSteer.get(steerSid);
      if (stale) {
        const rest = stale.filter((e) => e.tool !== name);
        if (rest.length > 0) pendingSteer.set(steerSid, rest);
        else pendingSteer.delete(steerSid);
      }
      throw new Error(`${verdict.token}: ${verdict.advisory ?? rec.file}`);
    }
    if (verdict.token === "[GATE STEER]") {
      const queue = pendingSteer.get(steerSid) ?? [];
      queue.push({ tool: name, note: `[GATE STEER] ${verdict.advisory ?? ""}`.trim() });
      pendingSteer.set(steerSid, queue);
    }
    return undefined;
  });
  pi.on("tool_result", (event: Record<string, unknown>) => {
    const name = String(event.toolName ?? "").toLowerCase();
    if (name !== "write" && name !== "write_file" && name !== "edit" && name !== "patch") {
      return undefined;
    }
    const sid = resolveSessionIdFromEvent(event).id;
    const queue = pendingSteer.get(sid);
    if (!queue || queue.length === 0) return undefined;
    const qi = queue.findIndex((e) => e.tool === name);
    if (qi === -1) return undefined;
    const note = queue.splice(qi, 1)[0]!.note;
    if (queue.length === 0) pendingSteer.delete(sid);
    const extra = { type: "text", text: note };
    const prev = Array.isArray(event.content) ? event.content : [];
    return { content: [extra, ...prev], details: { ...(typeof event.details === "object" && event.details ? event.details : {}), giSteer: note } };
  });
}

// W1 (v1.3 gate): drift-aware wrapper. attachGiGraphGate (above) is the
// per-edit middleware (severity via runGraphGate); registerGraphGate adds the
// session drift layer (graph-gate.ts) around it: T1 advisories append to the
// tool result, T2 blocks the call, T3 names the TTSR abort. Graph queries
// reset drift per symbol (reward, never punishment). Session state is
// in-memory per handler registration (the tool_call/tool_result ctx carries
// no session id); graph_gate_state persistence via save/loadGateState is the
// production surface bound in the integration tests.
export function registerGraphGate(pi: { on: (ev: string, h: (event: Record<string, unknown>, ctx: unknown) => unknown) => void }): void {
  attachGiGraphGate(pi);
  // Drift layer (graph-gate.ts): process-local session state, keyed by an
  // explicit session id when the ctx carries one, else the shared default.
  const states = new Map<string, GraphGateSessionState>();
  // ★ GATE-DEFECT FIX (2026-09-22): the query's RESOLUTION must be reported or the
  //   reset condition is unreachable. Measured: five graph queries (13/0/12/25/24 rows
  //   returned) did not move the drift counter (3->4->5->6), because this handler called
  //   recordGraphQuery({tool,target}) while graph-gate.ts computes
  //   `resolved = q.resolved===true || rows>0` — both undefined => ALWAYS false =>
  //   isCovered() is never true => drift is unconditionally 1.0 and the gate aborts at T3
  //   on a timer. THE FIX: remember the query on tool_call, report its resolution on the
  //   matching tool_result, where the answer is actually known. A query whose result
  //   carries an error does NOT cover an edit — T-16's intent is preserved.
  // ★ AUDIT F-4 FIXED (2026-09-22): a SINGLE global slot loses/misattributes resolutions
  //   (two interleaved tool_calls overwrite each other; a query with no target leaves a
  //   stale slot). Keyed by sid, and the tool_result must MATCH the tool name.
  // ★ F-GQ1 FIX (2026-09-24): a FIFO per sid — a single slot lost/misattributed
  //   resolutions when two graph-queries interleaved (the second tool_call overwrote the
  //   first's entry). tool_result shifts the OLDEST entry for its tool.
  // ★ F-837 FIX (2026-09-24): pendingQueries leaked — a graph-query/ripwire tool_call whose
  //   tool_result never arrives (agent abort, timeout, crash, or the attachGiGraphGate throw
  //   cancelling the frame before the query executes) left its entry + the session state forever.
  //   Every entry now carries its enqueue time; each tool_call sweeps entries older than the TTL
  //   and each sid queue is capped (oldest-evicted first), so the Map is bounded over any session.
  const PENDING_QUERY_TTL_MS = 120_000;
  const PENDING_QUERY_MAX_PER_SID = 10;
  interface PendingQuery { target: string; tool: string; enqueuedAt: number; }
  const pendingQueries = new Map<string, Array<PendingQuery>>();
  const sweepStaleQueries = (now: number): void => {
    for (const [sid, q] of pendingQueries) {
      const live = q.filter((e) => now - e.enqueuedAt <= PENDING_QUERY_TTL_MS);
      if (live.length === 0) pendingQueries.delete(sid);
      else if (live.length !== q.length) pendingQueries.set(sid, live);
    }
  };
  pi.on("tool_call", (event: Record<string, unknown>) => {
    const name = String(event.toolName ?? "").toLowerCase();
    const isEdit = name === "write" || name === "write_file" || name === "edit" || name === "patch";
    const isQuery = name === "graph-query" || name === "ripwire" || String(event.toolName ?? "") === "graph-query";
    // SESSION-IDENTITY FIX: was `|| "default"` — the phantom that merged every
    // session into one drift bucket. The resolver returns a real identity and
    // NEVER a phantom; a caller that cannot resolve one gets the project scope
    // (which is this gate's actual ownership boundary: drift is per-project).
    const sid = resolveSessionIdFromEvent(event).id;
    let st = states.get(sid);
    if (!st) {
      st = createEmptyState();
      states.set(sid, st);
    }
    if (isQuery) {
      // ★ F-837 (cont.): sweep BEFORE enqueue — the tool_call stream is the only clock this
      //   handler owns, so every query arrival prunes orphans first (no timer needed).
      sweepStaleQueries(Date.now());
      const target = fieldStr(eventInput(event), "target") || fieldStr(eventInput(event), "symbol");
      if (target) {
        // the call is made; the ANSWER is unknown until the matching tool_result.
        const queue = pendingQueries.get(sid) ?? [];
        queue.push({ target, tool: name, enqueuedAt: Date.now() });
        // cap: oldest-evicted first — an evicted query never resolves, so it must not
        // purchase drift coverage later (it is simply gone).
        while (queue.length > PENDING_QUERY_MAX_PER_SID) queue.shift();
        pendingQueries.set(sid, queue);
      }
      return undefined;
    }
    if (!isEdit) return undefined;
    const rec = reconstruct(name, eventInput(event));
    const c = classifyEdit(name, { file: rec.file, oldString: rec.oldText, newString: rec.newText });
    recordEdit(c, st);
    const d = computeDrift(st);
    const g = gateDecision(d, st);
    if (g.tier === "T3") {
      throw new Error(`${g.blockReason ?? "GRAPH_GATE_ABORT"} (rule: graph-before-structural-edit)`);
    }
    if (g.tier === "T2") {
      throw new Error(g.blockReason ?? "GRAPH_GATE_DRIFT_HIGH");
    }
    return undefined;
  });
  // ★ the resolution report: a query that RETURNED covers an edit; one that errored
  //   does not. Without this, no query can ever satisfy isCovered().
  pi.on("tool_result", (event: Record<string, unknown>) => {
    const name = String(event.toolName ?? "").toLowerCase();
    if (name !== "graph-query" && name !== "ripwire") return undefined;
    const sid = resolveSessionIdFromEvent(event).id;
    const queue = pendingQueries.get(sid);
    if (!queue || queue.length === 0) return undefined;
    const qi = queue.findIndex((e) => e.tool === name);
    if (qi === -1) return undefined;      // ★ the result must match a pending tool
    const q = queue.splice(qi, 1)[0]!;
    if (queue.length === 0) pendingQueries.delete(sid);
    // ★ F-754 FIX (2026-09-24, run-10 CRITICAL-adjacent): the F-GH-MEM eviction ran BEFORE this
    //   handler read `states.get(sid)` — so when the LAST pending query for a session resolved,
    //   `states.delete(sid)` ran first and `st` was undefined, and `recordGraphQuery` NEVER
    //   FIRED. The resolution was silently LOST for exactly the query that would have cleared
    //   the session's drift (the common case: one query, one edit). The state is read FIRST and
    //   the eviction happens AFTER the record, only when both queues are drained.
    const st = states.get(sid);
    if (!st) return undefined;
    // ★ AUDIT H-7 FIXED: every tool in extension.ts reports failure via `details:{ok:false}`,
    //   NOT a top-level isError. Checking only the top level let a FAILED query purchase
    //   drift coverage.
    const details = (typeof event.details === "object" && event.details !== null ? event.details : {}) as { ok?: unknown; error?: unknown };
    const errored =
      event.isError === true ||
      (typeof event.error === "string" && event.error.length > 0) ||
      details.ok === false ||
      (typeof details.error === "string" && details.error.length > 0);
    // ★ AUDIT F-7 FIXED: rows=0 is a legitimate ANSWER but NOT coverage. graph-gate.ts's
    //   own T-16 fix requires a RESOLVED query; an empty answer must not purchase coverage.
    //   The result payload is inspected for evidence of rows before coverage is granted.
    const content = Array.isArray(event.content) ? event.content : [];
    const text = content.map((c) => (typeof c === "object" && c !== null && "text" in c ? String((c as { text: unknown }).text) : "")).join("\n");
    // ★ F-838 FIX (2026-09-24): STRUCTURED fields first, regex only as fallback — the old
    //   hasRows/noRows read ONLY opaque text, so a tool-output format change (a new verb, a new
    //   schema) false-negatived a legitimately resolved query into a T3 abort. A numeric row count
    //   carried on details or on a content block now decides directly; the regexes survive ONLY as
    //   the fallback when no count is present, so behavior on today's payloads is byte-identical.
    const structuredRows = (() => {
      const d = (typeof event.details === "object" && event.details !== null ? event.details : {}) as {
        rowCount?: unknown; rows?: unknown; count?: unknown; row_count?: unknown;
      };
      for (const v of [d.rowCount, d.rows, d.count, d.row_count]) {
        if (typeof v === "number" && Number.isFinite(v)) return v;
      }
      for (const c of content) {
        if (typeof c === "object" && c !== null && !("text" in c)) {
          const r = c as { rowCount?: unknown; rows?: unknown; count?: unknown };
          for (const v of [r.rowCount, r.rows, r.count]) {
            if (typeof v === "number" && Number.isFinite(v)) return v;
          }
        }
      }
      return null;
    })();
    const hasRows = structuredRows !== null
      ? structuredRows > 0
      : /rows?\s*[:=]\s*[1-9]/.test(text) || /"count":\s*[1-9]/.test(text) || /(?:^|\n)\s*(?:src|lib|tests|packages)\/[^\s]+:\d+/.test(text);
    const noRows = structuredRows !== null
      ? structuredRows === 0
      : /rows?\s*[:=]\s*0\b/.test(text) || /"count":\s*0\b/.test(text) || /NO NODE|not found|0 (?:rows|matches|results)/i.test(text);
    // ★ AUDIT H-5 FIXED: `|| !noRows` made an EMPTY/ambiguous result count as resolved
    //   (neither marker present -> hasRows=false, noRows=false -> true). The T-16 intent is
    //   explicit: rows=0 is a legitimate ANSWER but NOT coverage. Coverage now REQUIRES
    //   positive row evidence.
    const resolved = !errored && hasRows;
    recordGraphQuery({ tool: q.tool, target: q.target, resolved, rows: hasRows ? 1 : 0 }, st);
    // ★ F-754: the eviction now runs AFTER the record — release the session bookkeeping only
    //   once the query queue has drained (F-GH-MEM's intent, ordered correctly). The steer
    //   queue lives in the tool_call handler's scope and never accumulates across turns, so
    //   the query queue is the only drain condition that matters here.
    if (!pendingQueries.has(sid)) states.delete(sid);
    return undefined;
  });
}

function eventInput(event: Record<string, unknown>): Record<string, unknown> {
  const input = event.input;
  return typeof input === "object" && input !== null ? input as Record<string, unknown> : {};
}

function fieldStr(record: Record<string, unknown>, key: string): string {
  if (!(key in record)) return "";
  const value = record[key];
  return typeof value === "string" ? value : "";
}
