// ripwire bridge — FULL verb delegation for the GI tool surface (W4 seam closed
// 2026-09-15; completed to every verb with a ripwire twin the same day, on the
// operator's order: no optional adds, wire it all).
//
// DESIGN LAW:
// - Every consult is READ-ONLY, bounded (RIPWIRE_TIMEOUT_MS), fail-soft: the leg
//   returns {present, ok, summary, data}; the caller ALWAYS appends one
//   `ripwire: <summary>` line — absent/failed legs are NAMED, never silent.
// - Output parsing uses the tool's own two shapes: `--json` (map/for/pack-task/
//   callers/callees/impact/quality-delta/test-gate/metrics/plan-lanes) and the
//   XML report form (everything else; attributes + <c>/<s> rows). The claim
//   language of --verify is CLOSED (calls/uses/unused/contains/defines/reaches).
// - Resolution order mirrors the code-retrieval extension: RIPWIRE_BIN →
//   ~/.local/bin/ripwire → PATH.
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export const RIPWIRE_TIMEOUT_MS = 8000;
export const RIPWIRE_MAX_BUFFER = 32 * 1024 * 1024;

/** The uniform delegation leg every verb appends. */
export interface RipwireLeg {
  present: boolean;          // the binary resolved
  ok: boolean;               // the query ran and answered
  summary: string;           // one-line, self-labelling: "6 callers (…)" | "absent (…)" | "query failed (…)"
  data: Record<string, unknown>;
}

export function resolveRipwire(env: NodeJS.ProcessEnv = process.env): string | null {
  const fromEnv = env.RIPWIRE_BIN;
  if (fromEnv && fromEnv.length > 0 && fs.existsSync(fromEnv)) return fromEnv;
  const home = env.HOME && env.HOME.length > 0 ? env.HOME : os.homedir();
  const homeBin = path.join(home, ".local", "bin", "ripwire");
  if (fs.existsSync(homeBin)) return homeBin;
  for (const dir of (env.PATH ?? "").split(":")) {
    if (!dir) continue;
    const cand = path.join(dir, "ripwire");
    if (fs.existsSync(cand)) return cand;
  }
  return null;
}

interface RawRun {
  bin: string | null;
  status: number | null;
  stdout: string;
  stderr: string;
  execError: string | null;
}

/** ★ F-755 (2026-09-24, run-10): THE ARG CHOKEPOINT. `spawnSync` with an ARRAY argv is already
 *  injection-safe (no shell), but the array is built by callers that interpolate the symbol —
 *  so an argv element that is not a plain string (or that carries a NUL, which Node rejects at
 *  spawn) can still derail the call. Every argv element passes through here: strings only, no
 *  NUL, bounded length. A bad element becomes a NAMED absent leg, never a spawn throw. */
function safeArg(a: unknown): string | null {
  if (typeof a !== "string") return null;
  if (a.includes("\u0000")) return null;
  if (a.length > 4096) return null;
  return a;
}

function runRaw(root: string, args: string[], timeoutMs?: number, env?: NodeJS.ProcessEnv): RawRun {
  const e = env ?? process.env;
  const bin = resolveRipwire(e);
  if (!bin) return { bin: null, status: null, stdout: "", stderr: "", execError: null };
  const bad = [root, ...args].find((a) => safeArg(a) === null);
  if (bad !== undefined) {
    return { bin, status: null, stdout: "", stderr: "", execError: `RIPWIRE_ARG_INVALID: argv element ${JSON.stringify(String(bad).slice(0, 60))} is not a plain non-NUL string` };
  }
  const res = spawnSync(bin, [root, ...args], {
    encoding: "utf8",
    timeout: timeoutMs ?? RIPWIRE_TIMEOUT_MS,
    maxBuffer: RIPWIRE_MAX_BUFFER,
    env: e,
  });
  // ★ F-271 FIX (2026-09-24): maxBuffer truncation arrived as a generic exec error and parsed as "query failed" — a WRONG verdict shape for cut-off output. ENOBUFS is NAMED at the source so every consult surfaces TRUNCATED.
  const rawErr = res.error as (NodeJS.ErrnoException & { code?: string }) | undefined;
  const execError = rawErr === undefined
    ? null
    : rawErr.code === "ENOBUFS"
      ? `TRUNCATED: stdout exceeded maxBuffer ${RIPWIRE_MAX_BUFFER}B — ${rawErr.message}`
      : rawErr.message;
  return {
    bin,
    status: res.status,
    stdout: String(res.stdout ?? ""),
    stderr: String(res.stderr ?? ""),
    execError,
  };
}

/** The `<!-- legend -->` prefix is stripped; XML attribute maps + rows parse off the payload. */
function xmlPayload(stdout: string): string {
  const i = stdout.indexOf("-->");
  return i >= 0 ? stdout.slice(i + 3) : stdout;
}

/** The report verbs emit `<tag attr="…" …>` FIRST; both the tag name and the
 *  attribute map are needed (the tag NAMES the verb, the attrs carry the counts). */
function firstTag(payload: string): { tag: string; attrs: Record<string, string> } {
  const m = /<([a-z][a-z0-9-]*)\s([^>]*?)\/?>/.exec(payload);
  const attrs: Record<string, string> = {};
  if (m) for (const mm of m[2].matchAll(/([a-z][a-z0-9_-]*)="([^"]*)"/gi)) attrs[mm[1]] = mm[2];
  return { tag: m ? m[1] : "", attrs };
}

function childRows(payload: string, tags: string): { name: string; file: string; line: number }[] {
  const out: { name: string; file: string; line: number }[] = [];
  for (const t of tags.split(",")) {
    for (const mm of payload.matchAll(new RegExp(`<${t}\\s([^>]*?)/>`, "g"))) {
      const a: Record<string, string> = {};
      for (const kv of mm[1].matchAll(/([a-z][a-z0-9_-]*)="([^"]*)"/gi)) a[kv[1]] = kv[2];
      const p = String(a.p ?? "");
      const idx = p.lastIndexOf(":");
      out.push({
        name: String(a.n ?? "?"),
        file: idx >= 0 ? p.slice(0, idx) : p,
        line: idx >= 0 ? safeNum(p.slice(idx + 1), 0) : 0,
      });
    }
  }
  return out;
}

function absentLeg(reason: string): RipwireLeg {
  return { present: false, ok: false, summary: `absent (${reason})`, data: {} };
}

function failLeg(run: RawRun, detail: string): RipwireLeg {
  return { present: run.bin !== null, ok: false, summary: `query failed (${detail.slice(0, 140)})`, data: { stderr: run.stderr.slice(0, 400) } };
}

function jsonOf(stdout: string): Record<string, unknown> | null {
  const i = stdout.indexOf("{");
  if (i === -1) return null;
  try { return JSON.parse(stdout.slice(i)) as Record<string, unknown>; } catch { return null; }
}

// ★ F-407 FIX (2026-09-24): NaN-safe numeric parse — the external binary's JSON output
//   may drift (non-numeric string, missing field). Bare Number() returns NaN which silently
//   propagates into data records and summary strings (e.g. "impact_reaches=NaN").
function safeNum(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// ── the consults (one per GI verb that has a ripwire twin) ─────────────────

/** who-calls ↔ --callers=SYM (JSON: {of,defs,count,callers:[{t,n,p}]}) */
export function ripwireCallers(root: string, symbol: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): RipwireLeg {
  const run = runRaw(root, [`--callers=${symbol}`, "--json"], opts?.timeoutMs, opts?.env);
  if (!run.bin) return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError) return failLeg(run, `exec error: ${run.execError}`);
  const j = jsonOf(run.stdout);
  if (!j) return failLeg(run, run.stderr.trim() || `no JSON (exit ${String(run.status)})`);
  const callers = (Array.isArray(j.callers) ? j.callers : []).map((c) => {
    const r = c as { n?: string; p?: string };
    const p = String(r.p ?? "");
    const idx = p.lastIndexOf(":");
    return { name: String(r.n ?? "?"), file: idx >= 0 ? p.slice(0, idx) : p, line: idx >= 0 ? Number(p.slice(idx + 1)) || 0 : 0 };
  });
  const count = safeNum(j.count, callers.length);
  return {
    present: true, ok: true,
    summary: `${count} callers${callers.length > 0 ? ` (e.g. ${callers.slice(0, 3).map((c) => `${c.name} ${c.file}:${c.line}`).join(", ")})` : ""}`,
    data: { count, callers },
  };
}

/** impact / blast-radius ↔ --impact=SYM (JSON: {of,defs,reaches,impact:[{t,n,p}]}) */
export function ripwireImpact(root: string, symbol: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): RipwireLeg {
  const run = runRaw(root, [`--impact=${symbol}`, "--json"], opts?.timeoutMs, opts?.env);
  if (!run.bin) return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError) return failLeg(run, `exec error: ${run.execError}`);
  const j = jsonOf(run.stdout);
  if (!j) return failLeg(run, run.stderr.trim() || `no JSON (exit ${String(run.status)})`);
  const reaches = safeNum(j.reaches, 0);
  return {
    present: true, ok: true,
    summary: `impact_reaches=${reaches} radius_untested=${String(j.radius_untested ?? "?")}`,
    data: { reaches, radius_tested: j.radius_tested, radius_untested: j.radius_untested },
  };
}

/** gate / would-break ↔ --edit-check=SYM (XML: status, callers, incompatible, <c> rows) */
export function ripwireEditCheck(root: string, symbol: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): RipwireLeg {
  const run = runRaw(root, [`--edit-check=${symbol}`], opts?.timeoutMs, opts?.env);
  if (!run.bin) return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError) return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "edit-check") return failLeg(run, run.stderr.trim() || `no edit-check row (exit ${String(run.status)})`);
  const callers = childRows(payload, "c");
  return {
    present: true, ok: true,
    summary: `edit-check status=${a.status ?? "?"} callers=${a.callers ?? "?"} incompatible=${a.incompatible ?? "?"}${callers.length > 0 ? ` (e.g. ${callers.slice(0, 3).map((c) => `${c.name} ${c.file}:${c.line}`).join(", ")})` : ""}`,
    data: { status: a.status, callers: safeNum(a.callers, 0), incompatible: safeNum(a.incompatible, 0), rows: callers },
  };
}

/** safe-delete ↔ --safe-delete=SYM (XML: callers/impact_reaches/uses/tested_self/risk, <c> rows) */
export function ripwireSafeDelete(root: string, symbol: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): RipwireLeg {
  const run = runRaw(root, [`--safe-delete=${symbol}`], opts?.timeoutMs, opts?.env);
  if (!run.bin) return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError) return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "safe-delete") return failLeg(run, run.stderr.trim() || `no safe-delete row (exit ${String(run.status)})`);
  return {
    present: true, ok: true,
    summary: `safe-delete callers=${a.callers ?? "?"} impact_reaches=${a.impact_reaches ?? "?"} uses=${a.uses ?? "?"} tested_self=${a.tested_self ?? "?"} risk=${a.risk ?? "?"}`,
    data: {
      // ★ F-559 FIX (2026-09-24): safeNum on every external-binary numeric — bare Number()
      //   let non-numeric XML attrs propagate as NaN into data records.
      callers: safeNum(a.callers, 0),
      impact_reaches: safeNum(a.impact_reaches, 0),
      uses: safeNum(a.uses, 0),
      tested_self: safeNum(a.tested_self, 0),
      risk: a.risk ?? "",
    },
  };
}

/** chain ↔ --path=FROM,TO (XML: reachable, hops, <s> steps) */
export function ripwirePath(root: string, from: string, to: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): RipwireLeg {
  const run = runRaw(root, [`--path=${from},${to}`], opts?.timeoutMs, opts?.env);
  if (!run.bin) return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError) return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "path") return failLeg(run, run.stderr.trim() || `no path row (exit ${String(run.status)})`);
  const steps = childRows(payload, "s");
  return {
    present: true, ok: true,
    summary: `path reachable=${a.reachable ?? "?"} hops=${a.hops ?? "?"}${steps.length > 0 ? ` (${steps.slice(0, 4).map((s) => s.name).join(" → ")})` : ""}`,
    data: { reachable: a.reachable === "1", hops: safeNum(a.hops, 0), steps }, // ★ F-559 FIX (2026-09-24)
  };
}

/** unwired ↔ --dead-code (XML: count, confidence) */
export function ripwireDeadCode(root: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): RipwireLeg {
  const run = runRaw(root, ["--dead-code"], opts?.timeoutMs, opts?.env);
  if (!run.bin) return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError) return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "dead-code") return failLeg(run, run.stderr.trim() || `no dead-code row (exit ${String(run.status)})`);
  return {
    present: true, ok: true,
    summary: `dead-code count=${a.count ?? "?"} confidence=${a.confidence ?? "?"}`,
    data: { count: safeNum(a.count, 0), confidence: a.confidence ?? "" }, // ★ F-559 FIX (2026-09-24)
  };
}

/** verify ↔ --verify=CLAIM (XML: verdict, <s> rows; the claim language is CLOSED:
 *  calls(A,B) · uses(SYM) · unused(SYM) · contains(FILE,"LIT") · defines(FILE,SYM) ·
 *  reaches(SYM,"FILE"|LAYER)). A refused claim is a NAMED failure, never silent. */
export function ripwireVerify(root: string, claim: string, opts?: { timeoutMs?: number; env?: NodeJS.ProcessEnv }): RipwireLeg {
  const run = runRaw(root, [`--verify=${claim}`], opts?.timeoutMs, opts?.env);
  if (!run.bin) return absentLeg("ripwire binary not found (set RIPWIRE_BIN)");
  if (run.execError) return failLeg(run, `exec error: ${run.execError}`);
  const payload = xmlPayload(run.stdout);
  const { tag, attrs: a } = firstTag(payload);
  if (tag !== "verify") {
    // the claim language refused the claim (stderr carries the shape catalogue)
    return { present: true, ok: false, summary: `claim refused (${(run.stderr.trim() || `exit ${String(run.status)}`).slice(0, 200)})`, data: {} };
  }
  const steps = childRows(payload, "s");
  return {
    present: true, ok: true,
    summary: `${a.verdict ?? "?"} shape=${a.shape ?? "?"}${a.hops !== undefined ? ` hops=${a.hops}` : ""}${a.count !== undefined ? ` count=${a.count}` : ""}${steps.length > 0 ? ` (${steps.slice(0, 3).map((s) => s.name).join(" → ")})` : ""}`,
    data: { verdict: a.verdict ?? "", shape: a.shape ?? "", hops: safeNum(a.hops, 0), count: safeNum(a.count, 0), steps }, // ★ F-559 FIX (2026-09-24)
  };
}
