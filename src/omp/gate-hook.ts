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
    return { oldText, newText: oldText.split(oldString).join(newString), file };
  }
  const dsl = str(input.input);
  let newText = oldText;
  if (dsl && oldText) {
    const names = oldText.match(/export\s+(?:async\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)/g) ?? [];
    newText = oldText;
    for (const full of names) {
      const n = full.replace(/export\s+(?:async\s+)?function\s+/, "");
      const stripped = new RegExp(String.raw`function\s+` + n);
      if (stripped.test(dsl) && !new RegExp(String.raw`export\s+(?:async\s+)?function\s+` + n).test(dsl)) {
        newText = newText.replace(new RegExp(String.raw`export\s+(async\s+)?function\s+` + n), "function " + n);
      }
    }
  }
  return { oldText, newText, file };
}

export function attachGiGraphGate(pi: { on: (ev: string, h: (event: Record<string, unknown>, ctx: unknown) => unknown) => void }): void {
  let pendingSteer: string | null = null;
  pi.on("tool_call", (event: Record<string, unknown>) => {
    const name = String(event.toolName ?? "").toLowerCase();
    const input = (event.input && typeof event.input === "object" ? event.input : {}) as Record<string, unknown>;
    try {
      fs.appendFileSync("/tmp/gi-gate.log", JSON.stringify({
        name,
        keys: Object.keys(input),
        dial: process.env.GI_DIAL ?? "",
        origin: event.isAgentOrigin,
      }) + "\n");
    } catch { /* ignore log failures */ }
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
    try {
      fs.appendFileSync("/tmp/gi-gate.log", JSON.stringify({ recFile: rec.file, dial, verdict }) + "\n");
    } catch { /* ignore */ }
    if (verdict.cancel && verdict.token) {
      pendingSteer = null;
      throw new Error(`${verdict.token}: ${verdict.advisory ?? rec.file}`);
    }
    pendingSteer = verdict.token === "[GATE STEER]" ? `[GATE STEER] ${verdict.advisory ?? ""}`.trim() : null;
    return undefined;
  });
  pi.on("tool_result", (event: Record<string, unknown>) => {
    if (!pendingSteer) return undefined;
    const name = String(event.toolName ?? "").toLowerCase();
    if (name !== "write" && name !== "write_file" && name !== "edit" && name !== "patch") {
      pendingSteer = null;
      return undefined;
    }
    const note = pendingSteer;
    pendingSteer = null;
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
  let pendingQuery: { target: string; tool: string; sid: string } | null = null;
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
      const target = fieldStr(eventInput(event), "target") || fieldStr(eventInput(event), "symbol");
      if (target) {
        // the call is made; the ANSWER is unknown until the matching tool_result.
        pendingQuery = { target, tool: name, sid };
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
    if (!pendingQuery) return undefined;
    const name = String(event.toolName ?? "").toLowerCase();
    if (name !== "graph-query" && name !== "ripwire") return undefined;
    const q = pendingQuery;
    pendingQuery = null;
    const st = states.get(q.sid);
    if (!st) return undefined;
    const errored = event.isError === true || (typeof event.error === "string" && event.error.length > 0);
    recordGraphQuery({ tool: q.tool, target: q.target, resolved: !errored }, st);
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
