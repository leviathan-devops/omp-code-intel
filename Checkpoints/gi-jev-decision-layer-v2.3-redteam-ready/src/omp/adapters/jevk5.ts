// ★ THE JEVK5 PROBE — THE MEANING GATE, SERVED ON GPU (JevK5-4b, live at :8090/:8008).
//
// WHY THIS EXISTS (GI-Kernel-V2.2 W5a, 2026-09-25): the TSG rung's meaning judgment
// should run on the GPU decision model JevK5 (jevk5-4b-v0.2-Q8_0, llama-server :8008 +
// systemone-server.py :8090), NOT on the 0.6B CPU fallback (KEV) and NOT on the
// remote tsg CLI (BLOCKED: org has no TypeSafe credits, HTTP 402).
//
// ★ THE SHAPE: `jevk5Probe(scopeRoot)` returns a `ConsumerProbe` with **id "TSG"** —
//   it IS the meaning gate — so registering it REPLACES the kev/tsg probes and the
//   TSG rung is CONSUMED. Mirrors src/omp/adapters/kev.ts in shape by construction.
//
// THE CONTRACT (probed live, recorded verbatim):
//   POST http://127.0.0.1:8090/v1/systemone
//   body: {"state":"<text>","questions":{"q1":{"type":"noul","instructions":"<q>"}}}
//   response: {"model":"jevk5-4b-v0.2-Q8_0","answers":{"q1":{"type":"noul","confidence":0.57,"noul":0.57}},"usage":{"input_tokens":107},"latency_ms":383.5}
//   health: http://127.0.0.1:8008/health → {"status":"ok"}
//           http://127.0.0.1:8090/health → {"ok":true,"model":"jevk5-4b-v0.2-Q8_0","runtime":"gguf"}
//
// ★ LOUD FAIL: a down server is GI_JEVK5_DOWN — never a silent empty, never [].
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";

/** The default systemone endpoint (the GPU server). */
export const JEVK5_URL_DEFAULT = "http://127.0.0.1:8090/v1/systemone";

/** The :8008 llama-server health endpoint (the model process itself). */
export const JEVK5_HEALTH_8008 = "http://127.0.0.1:8008/health";

/** Read the endpoint from the env (JEVK5_URL), defaulting to the live GPU server. */
export function jevk5Url(env: NodeJS.ProcessEnv = process.env): string {
  const v = env.JEVK5_URL;
  return typeof v === "string" && v.length > 0 ? v : JEVK5_URL_DEFAULT;
}

/** Derive the /health URL for a /v1/systemone URL (same origin). */
function healthUrlFor(systemoneUrl: string): string {
  try {
    const u = new URL(systemoneUrl);
    return `${u.protocol}//${u.host}/health`;
  } catch {
    return "http://127.0.0.1:8090/health";
  }
}

/** Port token for evidence (":8090"), or the full host when unparseable. */
function portToken(url: string): string {
  try {
    const u = new URL(url);
    return u.port.length > 0 ? `:${u.port}` : url;
  } catch {
    return url;
  }
}

interface HealthResult {
  ok: boolean;
  model?: string;
  runtime?: string;
  raw: string;
}

function curlGet(url: string, timeoutS: number): string | null {
  try {
    const out = execFileSync("curl", ["-s", "-m", String(timeoutS), url], {
      encoding: "utf8",
      timeout: (timeoutS + 2) * 1000,
      maxBuffer: 1 * 1024 * 1024,
    } as never);
    return String(out);
  } catch {
    return null;
  }
}

function parseHealth(raw: string): HealthResult {
  let obj: unknown = null;
  try {
    obj = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, raw };
  }
  if (typeof obj !== "object" || obj === null) return { ok: false, raw };
  const rec = obj as Record<string, unknown>;
  const ok = rec["ok"] === true || rec["status"] === "ok";
  const model = typeof rec["model"] === "string" ? (rec["model"] as string) : undefined;
  const runtime = typeof rec["runtime"] === "string" ? (rec["runtime"] as string) : undefined;
  return { ok, model, runtime, raw };
}

interface HealthProbe {
  up: boolean;
  evidence: string;
}

function probeHealth(systemoneUrl: string): HealthProbe {
  const primary = healthUrlFor(systemoneUrl);
  const urls = primary === JEVK5_HEALTH_8008 ? [primary] : [primary, JEVK5_HEALTH_8008];
  const attempts: string[] = [];
  let best: { url: string; h: HealthResult } | null = null;
  for (const url of urls) {
    const raw = curlGet(url, 3);
    if (raw === null) {
      attempts.push(`${url} — UNREACHABLE`);
      continue;
    }
    const h = parseHealth(raw);
    attempts.push(`${url} — ${h.ok ? "ok" : "not-ok"} ${raw.slice(0, 120)}`);
    if (h.ok && best === null) best = { url, h };
  }
  if (best !== null) {
    const port = portToken(best.url);
    const model = best.h.model ?? "jevk5-4b-v0.2-Q8_0";
    const runtime = best.h.runtime !== undefined ? `, runtime ${best.h.runtime}` : "";
    const checked = urls.map((u) => portToken(u)).join(" + ");
    return {
      up: true,
      evidence: `jevk5 ${model} on ${port} (${best.url} ok${runtime}) [checked ${checked}]`,
    };
  }
  const checked = urls.map((u) => portToken(u)).join(" nor ");
  return {
    up: false,
    evidence: `GI_JEVK5_DOWN: no JevK5 health at ${checked} (${attempts.join(" | ").slice(0, 300)})`,
  };
}

/**
 * ★ THE CHEAP HEALTH PROBE. Synchronous (curl, 3s cap per endpoint) so the
 * registry's synchronous wiring (`jevk5Available() ? jevk5Probe() : ...`) can call it.
 * True iff :8090/health (or :8008/health) answers ok.
 */
export function jevk5Available(url?: string): boolean {
  try {
    const sysUrl = url ?? jevk5Url();
    return probeHealth(sysUrl).up;
  } catch {
    return false;
  }
}

/** ★ THE MEANING QUESTION (same token as kev.ts: match / drift, judged by noul). */
const JEVK5_MEANING_INSTRUCTIONS =
  "Does the named symbol behave as its name and role say it does? Answer with a noul judgment.";

/** ★ THE CONTEXT ASSEMBLER: the STATE JevK5 judges. Bounded — subject + repo identity. */
function buildState(scopeRoot: string, subject: string): string {
  const base = path.basename(scopeRoot);
  return [
    `Repository: ${base}`,
    `Subject under review: ${subject}`,
    `The subject is a symbol in this repository's decision path. Judge whether the symbol's`,
    `implementation matches its declared name and role.`,
  ].join("\n");
}

interface Jevk5Answer {
  type?: string;
  confidence?: number;
  noul?: number;
}

interface Jevk5Response {
  model?: string;
  answers?: Record<string, Jevk5Answer>;
  latency_ms?: number;
}

function postSystemone(systemoneUrl: string, state: string): Jevk5Response {
  const body = JSON.stringify({
    state,
    questions: { q1: { type: "noul", instructions: JEVK5_MEANING_INSTRUCTIONS } },
  });
  let out: string;
  try {
    const raw = execFileSync(
      "curl",
      ["-s", "-m", "30", "-X", "POST", systemoneUrl, "-H", "Content-Type: application/json", "-d", body],
      {
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 4 * 1024 * 1024,
      } as never,
    );
    out = String(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200);
    throw new Error(`GI_JEVK5_DOWN: the JevK5 POST to ${systemoneUrl} failed — ${msg}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(out) as unknown;
  } catch (e) {
    throw new Error(
      `GI_JEVK5_DOWN: the JevK5 server at ${systemoneUrl} printed invalid JSON — ${(e instanceof Error ? e.message : String(e)).slice(0, 120)} · output: ${out.slice(0, 160)}`,
    );
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`GI_JEVK5_DOWN: the JevK5 server at ${systemoneUrl} answered a non-object — ${out.slice(0, 160)}`);
  }
  return parsed as Jevk5Response;
}

export function jevk5Probe(scopeRoot: string): ConsumerProbe {
  const systemoneUrl = jevk5Url();
  const port = portToken(healthUrlFor(systemoneUrl));
  return {
    id: "TSG", // ★ the meaning gate's id — JEVK5 SERVES IT (GPU first)
    rung: "meaning",
    dependency: `the live JevK5 GPU model (jevk5-4b-v0.2-Q8_0) via ${systemoneUrl} — the meaning gate's GPU judge`,
    errorCode: "GI_JEVK5_DOWN",
    up: () => {
      const h = probeHealth(systemoneUrl);
      return h.up ? { up: true, evidence: h.evidence } : { up: false, evidence: h.evidence };
    },
    // ★ F-1206 NOTE (mirrors kev.ts): facts() is a SYNCHRONOUS ConsumerProbe method,
    //   so this stays execFileSync (curl, bounded 60s) — an async migration needs the
    //   probe contract + both callers (auditOne, factsForWithFaults) to go async.
    facts: (subject: string): LayerFact[] => {
      const res = postSystemone(systemoneUrl, buildState(scopeRoot, subject));
      const ans = res.answers?.["q1"];
      if (ans === undefined) {
        throw new Error(`GI_JEVK5_DOWN: the JevK5 answer carried no q1 — response: ${JSON.stringify(res).slice(0, 200)}`);
      }
      const noul = typeof ans.noul === "number" ? ans.noul : typeof ans.confidence === "number" ? ans.confidence : NaN;
      const confidence = typeof ans.confidence === "number" ? ans.confidence : noul;
      if (!Number.isFinite(noul) || !Number.isFinite(confidence)) {
        throw new Error(`GI_JEVK5_DOWN: the JevK5 answer carried a non-finite noul/confidence ${JSON.stringify(ans).slice(0, 160)} — refusing to report a verdict`);
      }
      const model = typeof res.model === "string" && res.model.length > 0 ? res.model : "jevk5-4b-v0.2-Q8_0";
      const ms = typeof res.latency_ms === "number" ? res.latency_ms : 0;
      const verdict = noul >= 0.5 ? "match" : "drift";
      return [
        {
          consumer: "TSG" as const,
          rung: "meaning" as const,
          subject,
          value: { meaning: verdict, confidence, noul, model, ms },
          source: `${scopeRoot}#jevk5(${verdict} p=${noul.toFixed(3)} · ${model} · ${port} · ${ms}ms)`,
        },
      ];
    },
  };
}
