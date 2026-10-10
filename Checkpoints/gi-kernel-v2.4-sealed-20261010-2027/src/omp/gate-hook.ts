import { resolveSessionIdFromEvent } from "../scoping/gi-session-path.ts";
// GI graph-gate on OMP write/edit. Separate tool_call listener; the handler
// throw cancels FULL.

import * as fs from "node:fs";
import { Database } from "bun:sqlite";
import { resolveDial, runGraphGate, type GiDial } from "./gate-middleware.ts";
import { classifyEdit, computeDrift, createEmptyState, gateDecision, recordEdit, recordGraphQuery, type GraphGateSessionState } from "./graph-gate.ts";
// ★ V2.2 W5b WIRING (2026-09-26): the ABIDE live judge on the CURRENT hunk diff. The adapter's
//   judgeDiff asks JevK5 one question per model rule against the diff; a REPAIR band becomes a
//   steer note. FAIL-OPEN (the blueprint: "Abide fail-open on missing key") — a down judge never
//   blocks the edit.
import { judgeDiff } from "./adapters/abide.ts";
// ★ W3 — THE JEV DECISION LAYER: the export-removal regex matched a SHAPE; the judge decides.
import { askToolGate, enforceGate, graphBreakCandidate, recordGateDecision, retrievalCandidate } from "./jev.ts";
import { logFire } from "./fire-log.ts";

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

// ★ V2.4 W2 — THE RETRIEVAL DETECTOR (mechanical; marks a candidate, NEVER a verdict).
//   A raw read (grep/sed/awk/cat/head/tail) whose target is an indexable corpus
//   (a session transcript, a *.jsonl, a logs dir) is the SHAPE. The judge decides whether it
//   is a line-scan of an indexable corpus (refuse) or a legitimate non-indexable read (serve).
const RE_CORPUS_READ = /(^|[\s;|&(])(grep|rg|sed|awk|cat|head|tail|less|more)\b/;
const RE_CORPUS_TARGET = /(sessions\/|transcripts?\/|\.jsonl\b|logs?\/|\.log\b|\bcorpus\b)/i;
const RE_GRAPH_ROUTED = /(^|[\s;|&(])(jev|ripwire|graph-query|gi-consumption|gi-decide|jm)\b/;
/** Returns the matched corpus target (the signal) or null when the command is not a corpus read. */
export function detectCorpusRead(command: string): string | null {
  if (typeof command !== "string" || command.trim() === "") return null;
  // ALREADY ROUTED THROUGH THE GRAPH → the RIGHT method → never a candidate.
  if (RE_GRAPH_ROUTED.test(command)) return null;
  if (!RE_CORPUS_READ.test(command)) return null;
  const m = command.match(RE_CORPUS_TARGET);
  return m ? m[0] : null;
}

// ★ V2.4 W6 — THE SUBSTRATE CHECK. True iff the workspace has a populated store
//   (a typed_nodes table with ≥1 live row). A miss means the kernel has no data here.
// ★ V2.4 A4 FIX (the auditor's bypass): the check read ONLY the 3 legacy checkout paths and
//   NEVER the session-scoped sessions/{sid}/store.sqlite that the scoping law mandates —
//   a populated workspace read EMPTY. Check BOTH layouts.
// ★ V2.4 B6 FIX (the boundary audit): the cwd is UNTRUSTED input (a crafted cwd could point
//   at a planted store or an arbitrary sqlite path). Resolve it (realpath) and confine it
//   (must stay under itself) before joining.
function hasPopulatedStore(cwd: string): boolean {
  let root: string;
  try {
    root = fs.realpathSync(cwd);
  } catch {
    return false;
  }
  const cands = [
    `${root}/.omp/graph-intelligence/graphify-checkout/store.sqlite`,
    `${root}/.omp/graph-intelligence/corbell-checkout/store.sqlite`,
    `${root}/.omp/graph-intelligence/structural/store.sqlite`,
  ];
  for (const p of cands) {
    try {
      const db = new Database(p, { readonly: true });
      const row = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number };
      db.close();
      if (row && row.n > 0) return true;
    } catch { /* try the next substrate */ }
  }
  // the session-scoped layout: sessions/{sid}/store.sqlite (the scoping law's shape)
  try {
    const dir = `${cwd}/.omp/graph-intelligence/sessions`;
    for (const sid of fs.readdirSync(dir)) {
      const p = `${dir}/${sid}/store.sqlite`;
      try {
        const db = new Database(p, { readonly: true });
        const row = db.query("SELECT COUNT(*) AS n FROM typed_nodes WHERE superseded_run IS NULL").get() as { n: number };
        db.close();
        if (row && row.n > 0) return true;
      } catch { /* try the next session */ }
    }
  } catch { /* no sessions dir */ }
  return false;
}

export function attachGiGraphGate(pi: { on: (ev: string, h: (event: Record<string, unknown>, ctx: unknown) => unknown) => void }): void {
  // ★ F-PS1 FIX (2026-09-24): keyed per tool name — a single slot let two interleaved
  //   write/edit calls overwrite each other's steer note, delivering the wrong advisory.
  // ★ F-39 FIX (2026-09-24): keyed per tool name — two interleaved write/edit calls overwrote each other's steer note (call-B's tool_call clobbered call-A's). FIFO per (session, tool), mirroring the F-GQ1 query queue below.
  // ★ F-915 FIX (2026-09-24): UNBOUNDED pendingSteer — entries whose tool_result never arrived (abort/timeout/cancel-throw) lived forever, unlike pendingQueries (F-837 TTL+sweep+cap). Same bound here: TTL sweep on the tool_call clock + per-sid cap.
  const PENDING_STEER_TTL_MS = 120_000;
  const PENDING_STEER_MAX_PER_SID = 10;
  // ★ F-1207 FIX (2026-09-25): FIFO matched by tool NAME only — two concurrent `edit`
  //   calls misattributed notes. Entries now carry the target FILE; the result matches
  //   the same-file entry first and falls back to FIFO only when the result carries
  //   no file hint (platform tool_result has no correlation id — file is the best key).
  interface PendingSteer { tool: string; note: string; enqueuedAt: number; file: string; }
  const pendingSteer = new Map<string, Array<PendingSteer>>();
  // ★ V2.4 W4 — THE LOOP COUNTER. A per-session rolling window of normalized bash commands.
  //   The same command ≥ LOOP_TRIP_N times with no state change is the loop-repeat derail
  //   (measured: the same `cd` ×3,274 in the Vision transcript). Bounded (TTL + cap).
  const LOOP_WINDOW_MS = 600_000;
  const LOOP_TRIP_N = 3;
  const LOOP_MAX_PER_SID = 50;
  const loopHistory = new Map<string, Array<{ cmd: string; at: number }>>();
  function normalizeLoopCmd(cmd: string): string {
    return cmd.trim().replace(/\s+/g, " ").slice(0, 200);
  }
  function loopCount(sid: string, cmd: string, now: number): number {
    const h = (loopHistory.get(sid) ?? []).filter((e) => now - e.at <= LOOP_WINDOW_MS);
    loopHistory.set(sid, h);
    return h.filter((e) => e.cmd === cmd).length;
  }
  const sweepStaleSteer = (now: number): void => {
    for (const [sid, q] of pendingSteer) {
      const live = q.filter((e) => now - (e.enqueuedAt ?? 0) <= PENDING_STEER_TTL_MS);
      if (live.length === 0) pendingSteer.delete(sid);
      else if (live.length !== q.length) pendingSteer.set(sid, live);
    }
  };
  pi.on("tool_call", async (event: Record<string, unknown>) => {
    const name = String(event.toolName ?? "").toLowerCase();
    const input = (event.input && typeof event.input === "object" ? event.input : {}) as Record<string, unknown>;
    // ★ V2.4 W6 — THE SUBSTRATE HARD-BLOCK. A code-edit session in a workspace with NO
    //   populated store is REFUSED (GI_NO_SUBSTRATE) — the LSP's GI_NO_STORE diagnostic is
    //   ADVISORY; this is the BLOCK. The remedy names the populate (which auto-heals on first
    //   run per the DPL1). Doc-only edits never trigger (they need no substrate).
    if (name === "write" || name === "write_file" || name === "edit" || name === "patch") {
      const cwd = String((event as Record<string, unknown>).cwd ?? process.cwd());
      if (!hasPopulatedStore(cwd)) {
        throw new Error(`GI_NO_SUBSTRATE: no populated store under ${cwd}/.omp/graph-intelligence. Remedy: run gi-populate --target ${cwd} (auto-runs on first use; the kernel cannot reason about a workspace it has not indexed).`);
      }
    }
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
    // ★ V2.4 W2 — THE RETRIEVAL GATE. A raw read of an indexable corpus is REFUSED with the
    //   named remedy (index it, then query it). The judge decides; INFO surface = fail-OPEN.
    if (name === "bash" || name === "shell" || name === "exec") {
      const cmd = String(input.command ?? input.cmd ?? input.script ?? "");
      const sid = resolveSessionIdFromEvent(event).id;
      // ★ V2.4 W4 — THE LOOP GATE. The same normalized command ≥3 times in the window is
      //   the loop-repeat derail. Refused with the named remedy (show the diff since attempt K).
      const norm = normalizeLoopCmd(cmd);
      if (norm.length > 0 && loopCount(sid, norm, Date.now()) >= LOOP_TRIP_N) {
        recordGateDecision(
          { kind: "NONE", signals: [norm.slice(0, 80)], severity: "info", instructions: "the loop-repeat derail", criteria: { serve: "", refuse: "" } },
          { choice: "refuse", confidence: 1, probabilities: { refuse: 1 }, judge: "loop-counter", ms: 0, degraded: false },
          { tool: name, command: cmd, sessionId: sid, enforced: "refused", remedy: "show the diff since the first attempt — what changed between attempts?" },
        );
        throw new Error(`GI_LOOP_REPEAT: the same command ran ${LOOP_TRIP_N}+ times with no state change. Remedy: show the diff since the first attempt — what changed between attempts?`);
      }
      const h = loopHistory.get(sid) ?? [];
      h.push({ cmd: norm, at: Date.now() });
      while (h.length > LOOP_MAX_PER_SID) h.shift();
      loopHistory.set(sid, h);
      const corpus = detectCorpusRead(cmd);
      if (corpus) {
        let ef: { action: string; reason: string; remedy: string | null } | null = null;
        try {
          const cand = retrievalCandidate(cmd, corpus);
          const jv = await askToolGate(cand, `command: ${cmd.slice(0, 500)}\nthe corpus: ${corpus}`);
          ef = enforceGate(cand, jv);
          recordGateDecision(cand, jv, {
            tool: name,
            command: cmd,
            sessionId: resolveSessionIdFromEvent(event).id,
            enforced: ef.action === "refuse" ? "refused" : "served",
            remedy: ef.remedy,
          });
        } catch {
          ef = null; // fail-open: a judge failure NEVER blocks a read
        }
        if (ef && ef.action === "refuse") {
          throw new Error(`GI_RETRIEVAL_GATE: ${ef.reason}. Remedy: ${ef.remedy}`);
        }
      }
      return undefined;
    }
    if (name !== "write" && name !== "write_file" && name !== "edit" && name !== "patch") {
      return undefined;
    }
    if (event.isAgentOrigin === false) return undefined;
    const dial: GiDial = resolveDial(process.env);
    const rec = reconstruct(name, input);
    // ★ V2.2 W5b (2026-09-26): the ABIDE live judge on the CURRENT hunk. Fail-OPEN — a REPAIR
    //   band queues a steer note (a REPAIR OPPORTUNITY, never a block); a down judge is silent.
    try {
      const judged = judgeDiff(rec.newText ?? "");
      // ★ OBSERVABILITY (2026-10-02): the live judge ran but left NO record — the bundle's ABIDE
      //   leg was unobservable (only the OTHER consumer, kernel-judge, wrote rows, and it skips on
      //   a missing rubric). Record EVERY judgeDiff verdict to the gate ledger, scores included,
      //   so "ABIDE ran vs skipped" is answerable from data.
      try {
        const maxP = Object.values(judged.scores).reduce((a, b) => Math.max(a, b), 0);
        const cand = {
          kind: "ABIDE_JUDGE" as const,
          signals: [rec.file ?? "?", `verdict=${judged.verdict}`,
                    Object.entries(judged.scores).map(([k, v]) => `${k}=${v.toFixed(3)}`).join(" ")].filter(Boolean),
          severity: "info" as const,
          instructions: "the ABIDE live judge over the edit diff",
          criteria: { serve: "no rule violated", refuse: "a rule at the act band (>=0.8)" },
        };
        recordGateDecision(cand, {
          judge: judged.judge,
          choice: judged.verdict === "REPAIR" ? "refuse" : "serve",
          confidence: maxP,
          probabilities: judged.scores,
          ms: 0,
          degraded: !judged.ok,
        }, {
          tool: name, command: rec.file ?? "", sessionId: resolveSessionIdFromEvent(event).id,
          enforced: judged.verdict === "REPAIR" ? "refused" : "served", remedy: judged.repair ?? null,
        });
        // ★ THE FIRE-LOG (operator ruling 2026-10-04): the FULL ABIDE fire — file, verdict, the
        //   per-rule scores (the decision basis), the repair, and the diff size.
        logFire("abide", {
          surface: "judge-diff",
          file: rec.file ?? null,
          tool: name,
          verdict: judged.verdict,
          judge: judged.judge,
          ok: judged.ok,
          scores: judged.scores,
          maxScore: maxP,
          repair: judged.repair ?? null,
          oldTextLen: (rec.oldText ?? "").length,
          newTextLen: (rec.newText ?? "").length,
          sessionId: resolveSessionIdFromEvent(event).id,
        });
      } catch { /* ledger best-effort: a write failure never blocks the edit */ }
      if (judged.ok && judged.verdict === "REPAIR" && judged.repair) {
        const jSid = resolveSessionIdFromEvent(event).id;
        sweepStaleSteer(Date.now());
        const q = pendingSteer.get(jSid) ?? [];
        q.push({ tool: name, note: `[ABIDE] ${judged.repair}`, enqueuedAt: Date.now(), file: rec.file });
        while (q.length > PENDING_STEER_MAX_PER_SID) q.shift();
        pendingSteer.set(jSid, q);
      }
    } catch { /* fail-open: the judge never blocks an edit */ }
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
      // ★ W3 — THE JEV DECISION LAYER (the mandate). The export-removal regex matched a
      //   SHAPE (a name is gone from the new text); the JUDGE decides whether it is a REAL
      //   signature break or a legitimate refactor. INFO surface: fail-OPEN — a down judge
      //   NEVER blocks an edit (the same polarity as the ABIDE judge above).
      try {
        const cand = graphBreakCandidate(rec.file, verdict.advisory ?? "");
        const jv = await askToolGate(cand, `file=${rec.file}
the gate flagged: ${verdict.token}
${verdict.advisory ?? ""}
-- the OLD text --\n${(rec.oldText ?? "").slice(0, 900)}
-- the NEW text --\n${(rec.newText ?? "").slice(0, 900)}`);
        const ef = enforceGate(cand, jv);
        recordGateDecision(cand, jv, {
          tool: name, command: rec.file, sessionId: steerSid,
          enforced: ef.action === "refuse" ? "refused" : "served", remedy: ef.remedy,
        });
        if (ef.action === "serve") {
          // the judge cleared it — NO cancel, the edit proceeds (and no steer is dropped)
          return undefined;
        }
      } catch { /* fail-open: the judge never blocks an edit */ }
      // ★ R19-HIGH FIX (2026-09-25): this filtered by TOOL NAME, so cancelling ONE `edit`
      //   call discarded EVERY pending steer for `edit` in that session — including ones
      //   queued for entirely different files. The only per-call discriminator the entry
      //   carries is `file`, which is what the cancelled call names; scope the removal to it.
      //   (RESIDUAL: two steers for the SAME tool+file in flight still collapse together —
      //   closing that needs a call id on the entry, which the event does not expose here.)
      const stale = pendingSteer.get(steerSid);
      if (stale) {
        const rest = stale.filter((e) => !(e.tool === name && e.file === rec.file));
        if (rest.length > 0) pendingSteer.set(steerSid, rest);
        else pendingSteer.delete(steerSid);
      }
      throw new Error(`${verdict.token}: ${verdict.advisory ?? rec.file}`);
    }
    if (verdict.token === "[GATE STEER]") {
      sweepStaleSteer(Date.now());
      const queue = pendingSteer.get(steerSid) ?? [];
      queue.push({ tool: name, note: `[GATE STEER] ${verdict.advisory ?? ""}`.trim(), enqueuedAt: Date.now(), file: rec.file });
      while (queue.length > PENDING_STEER_MAX_PER_SID) queue.shift();
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
    const inRec = (event.input && typeof event.input === "object" ? event.input : {}) as Record<string, unknown>;
    const resFile = str(inRec.file_path) || str(inRec.filePath) || str(inRec.path) || str(inRec.file);
    let qi = resFile ? queue.findIndex((e) => e.tool === name && e.file === resFile) : -1;
    if (qi === -1) qi = queue.findIndex((e) => e.tool === name);
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
  // ★ F-916 FIX (2026-09-24): UNBOUNDED states — edit-only sessions never touched the query-path eviction, so entries lived forever. Idle-TTL sweep on the tool_call clock + T3 eviction (aborting sessions keep no drift state) + a hard cap. NOTE: the sweep/delete runs ONLY at the tool_call/tool_result sites below — the declaration itself stays a plain Map so classifyEdit-shaped probes read it honestly.
  const STATE_IDLE_TTL_MS = 600_000;
  const STATE_MAX_ENTRIES = 1000;
  const stateSeen = new Map<string, number>();
  const sweepIdleStates = (now: number): void => {
    for (const [sid] of states) {
      const seen = stateSeen.get(sid) ?? now;
      if (now - seen > STATE_IDLE_TTL_MS) { states.delete(sid); stateSeen.delete(sid); }
    }
    while (states.size > STATE_MAX_ENTRIES) {
      let oldest: string | null = null;
      let oldestSeen = Infinity;
      for (const [sid] of states) {
        const s = stateSeen.get(sid) ?? Infinity;
        if (s < oldestSeen) { oldestSeen = s; oldest = sid; }
      }
      if (oldest === null) break;
      states.delete(oldest); stateSeen.delete(oldest);
    }
  };
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
  pi.on("tool_call", async (event: Record<string, unknown>) => {
    const name = String(event.toolName ?? "").toLowerCase();
    const isEdit = name === "write" || name === "write_file" || name === "edit" || name === "patch";
    const isQuery = name === "graph-query" || name === "ripwire" || String(event.toolName ?? "") === "graph-query";
    // SESSION-IDENTITY FIX: was `|| "default"` — the phantom that merged every
    // session into one drift bucket. The resolver returns a real identity and
    // NEVER a phantom; a caller that cannot resolve one gets the project scope
    // (which is this gate's actual ownership boundary: drift is per-project).
    const sid = resolveSessionIdFromEvent(event).id;
    sweepIdleStates(Date.now());
    let st = states.get(sid);
    if (!st) {
      st = createEmptyState();
      states.set(sid, st);
    }
    stateSeen.set(sid, Date.now());
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
      states.delete(sid); stateSeen.delete(sid); // ★ F-916 (cont.): an aborting session processes no further edits — release its drift state before throwing.
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
    // ★ F-890 FIX (2026-09-24, reported by R12High3 and reproduced): THE DETECTOR COULD NEVER
    //   PASS FOR RIPWIRE. Its three arms matched a `rows:`/`count:` JSON shape and a
    //   `src/…:N` line — but ripwire's answer is XML-ish (`<callers>` rows) or a JSON with
    //   `"callers":[…]`/`"defs":[…]`. So a query that RETURNED CALLERS still recorded
    //   `resolved=false`, the drift could only GROW, and the gate hard-stopped agents doing
    //   legitimate work (the F-620 class: a gate whose success condition is unreachable).
    //   The detector now covers the ACTUAL output shapes of BOTH tools.
    const hasRows = structuredRows !== null
      ? structuredRows > 0
      : /rows?\s*[:=]\s*[1-9]/.test(text)
        || /"count":\s*[1-9]/.test(text)
        || /(?:^|\n)\s*(?:src|lib|tests|packages)\/[^\s]+:\d+/.test(text)
        // ★ the ripwire shapes (the missing arms)
        || /<callers>|<defs>|<impact>|<rows>/i.test(text)
        || /"(?:callers|defs|impact|results|matches)":\s*\[\s*\{/.test(text)
        || /^\s*(?:src|lib|tests|packages)\/[^\s]+\s*:\s*\d+/m.test(text);
    const noRows = structuredRows !== null
      ? structuredRows === 0
      : /rows?\s*[:=]\s*0\b/.test(text)
        || /"count":\s*0\b/.test(text)
        || /"(?:callers|defs|impact|results|matches)":\s*\[\s*\]/.test(text)
        || /NO NODE|not found|0 (?:rows|matches|results)/i.test(text);
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
    if (!pendingQueries.has(sid)) { states.delete(sid); stateSeen.delete(sid); }
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
