// jev — THE LIVE JEV CLIENT. Replaces the stub Judge in the enforcement kernel.
//
// THE ENDPOINT (read from the live docs this session, docs.typesafe.ai/api):
//   POST https://api.typesafe.ai/v1/systemone
//   Authorization: Bearer <API_KEY>   Content-Type: application/json
//   body { state, model, questions: {id: {type, instructions, criteria?}} }
//   answer { model, answers: {id: {type:"noul", noul: 0.95}}, usage }
//
// THE KEY IS NEVER LOGGED, NEVER ON ARGV, NEVER IN A ROW. It is read from the
// environment first, then from a 0600 file. A missing key THROWS (the hard-dep
// law) — there is no fallback judge.
import * as fs from "node:fs";
import * as os from "node:os";
import type { Judge, JudgeAnswer, JudgeQuestion } from "./enforcement.ts";

export const TYPESAFE_URL = "https://api.typesafe.ai/v1/systemone";
export const TYPESAFE_MODEL = "jev-latest";
// ★ F-343 FIX (2026-09-24): the key path fell back to a HARDCODED /home/leviathan when HOME
// ★ was unset — wrong on every other machine (a silent missing-key). os.homedir() resolves
// ★ the platform-correct home (passwd entry on POSIX, USERPROFILE on Windows), never a guess.
export const KEY_FILE = `${os.homedir()}/.config/typesafe/key`;

export class JevError extends Error {
  constructor(readonly code: string, message: string, readonly status?: number) {
    super(`${code}: ${message}`);
    this.name = "JevError";
  }
}

/** Environment first (the run shim), then the 0600 file. Absent ⇒ THROW. A group/world-
 *  readable key file ⇒ GI_JEV_KEY_PERMS (the documented 0600 contract is enforced, not prose). */
export function resolveKey(env: Record<string, string | undefined> = process.env): string {
  const fromEnv = env["TYPESAFE_AI_API_KEY"];
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv;
  // ★ F-839 FIX (2026-09-24): close the stat→read TOCTOU — the old statSync(KEY_FILE) then
  //   readFileSync(KEY_FILE) let a symlink swap land between the 0600 check and the read, so the
  //   permission verdict described a DIFFERENT file than the key came from. Open ONCE (O_NOFOLLOW:
  //   a planted symlink refuses LOUD instead of being followed), fstat the FD, read the SAME fd.
  //   The F-410 0600 contract + the GI_JEV_KEY_PERMS/GI_JEV_NO_KEY codes are unchanged; a missing
  //   file still falls through to the NO_KEY throw below (ENOENT), never a raw errno.
  let fd: number | null = null;
  try {
    try {
      fd = fs.openSync(KEY_FILE, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    } catch (e) {
      fd = null;
      const c = e as NodeJS.ErrnoException;
      if (c?.code === 'ELOOP' || c?.code === 'EACCES' || c?.code === 'EPERM') {
        throw new JevError(
          "GI_JEV_KEY_PERMS",
          `key file ${KEY_FILE} refused at open (${c.code} — a symlink plant or unreadable file; expected a 0600 regular file — chmod 600 ${KEY_FILE})`,
        );
      }
      // ENOENT and friends: fall through to the NO_KEY throw below (the old readFile path did the same).
    }
    if (fd !== null) {
      let mode = 0;
      try {
        mode = fs.fstatSync(fd).mode;
      } catch (e) {
        throw new JevError(
          "GI_JEV_KEY_PERMS",
          `key file ${KEY_FILE} fstat failed (${e instanceof Error ? e.message : String(e)}) — cannot verify the 0600 contract`,
        );
      }
      if ((mode & 0o077) !== 0) {
        throw new JevError(
          "GI_JEV_KEY_PERMS",
          `key file ${KEY_FILE} has insecure permissions ${(mode & 0o777).toString(8)} (expected 0600 — chmod 600 ${KEY_FILE})`,
        );
      }
      const v = fs.readFileSync(fd, "utf8").trim();
      if (v.length > 0) return v;
    }
  } catch (e) {
    if (e instanceof JevError) throw e;
    /* fall through to the throw */
  } finally {
    if (fd !== null) { try { fs.closeSync(fd); } catch { /* best-effort: the key (or the error) stands */ } }
  }
  throw new JevError("GI_JEV_NO_KEY", `no key in TYPESAFE_AI_API_KEY and none readable at ${KEY_FILE}`);
}

/** The fd the test seam observes (null outside tests). */
// (no export surface change: resolveKey keeps its (env?) signature; st-gi-v2-deps t6 and the
// st-gi-6l2e key probes exercise the env-first path, which is untouched.)

/** The API question shape. A Noul carries instructions + the true/false meaning. */
interface ApiQuestion {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
}

interface ApiAnswer {
  type: string;
  noul?: number;
  choice?: string;
  probabilities?: Record<string, number>;
  confidence?: number;
}

interface ApiResponse {
  model: string;
  answers: Record<string, ApiAnswer>;
  usage?: { input_tokens: number; output_tokens: number };
}

export interface JevCall {
  state: unknown;
  questions: readonly JudgeQuestion[];
  /** ms; the close layer's budget is the caller's business (8s default). */
  timeoutMs?: number;
}

/** The live judge. ONE call carrying every question — the Abide law. */
export class JevJudge implements Judge {
  constructor(private readonly opts: { timeoutMs?: number; key?: string; url?: string } = {}) {}

  async evaluate(
    state: Record<string, unknown>,
    questions: readonly JudgeQuestion[],
  ): Promise<readonly JudgeAnswer[]> {
    if (questions.length === 0) return [];
    const key = this.opts.key ?? resolveKey();
    const apiQuestions: Record<string, ApiQuestion> = {};
    for (const q of questions) {
      apiQuestions[q.id] = {
        type: "noul",
        instructions: q.instructions,
        criteria: { true: q.whenTrue, false: q.whenFalse },
      };
    }
    // ★ F-JV1 FIX (2026-09-24): a network-level failure (DNS, refused, TLS, gate timeout)
    //   threw a RAW TypeError/DOMException past callers that contract on JevError —
    //   notably the E2 fail-CLOSED path, which keys its refusal on the error code.
    //   Named, never raw.
    let res: Response;
    try {
      res = await fetch(this.opts.url ?? TYPESAFE_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: TYPESAFE_MODEL, state, questions: apiQuestions }),
        signal: AbortSignal.timeout(this.opts.timeoutMs ?? 8000),
      });
    } catch (e) {
      throw new JevError("GI_JEV_NETWORK", `network failure reaching ${this.opts.url ?? TYPESAFE_URL}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (res.status === 401) throw new JevError("GI_JEV_AUTH", "401 unauthorized", 401);
    if (res.status === 429) throw new JevError("GI_JEV_RATE_LIMIT", "429 rate limited", 429);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new JevError("GI_JEV_HTTP", `${res.status} ${body.slice(0, 160)}`, res.status);
    }
    // ★ F-36 FIX (2026-09-24): a non-JSON error page (CDN/proxy HTML) threw a raw SyntaxError past callers that contract on JevError. Named, never raw.
    let json: ApiResponse;
    try {
      json = (await res.json()) as ApiResponse;
    } catch (e) {
      throw new JevError("GI_JEV_BAD_JSON", `non-JSON response from ${this.opts.url ?? TYPESAFE_URL}: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`, res.status);
    }
    const out: JudgeAnswer[] = [];
    // ★ F-JEVAL FIX (2026-09-24): the upstream payload is validated only as ApiResponse; malformed shapes with missing/null answers were dereferenced directly and produced raw TypeError crashes instead of a named judge failure.
    const answers = json.answers;
    if (!answers || typeof answers !== "object") {
      throw new JevError("GI_JEV_BAD_RESPONSE", "the upstream returned no answers map", res.status);
    }
    for (const q of questions) {
      const a = answers[q.id];
      if (a === undefined) continue;
      // A Noul answer carries the probability in `noul`; anything else is a shape
      // we did not ask for and is DROPPED (the caller sees fewer answers and must
      // treat a missing answer as UNCERTIFIABLE, never as a pass).
      if (typeof a.noul === "number") out.push({ id: q.id, probability: a.noul });
      else if (typeof a.confidence === "number") out.push({ id: q.id, probability: a.confidence });
    }
    return out;
  }
}

/** A one-shot probe for the ops path: does the key work, and at what latency? */
export async function probeJev(timeoutMs = 15000): Promise<{
  ok: boolean;
  model: string | null;
  probability: number | null;
  latencyMs: number;
  error: string | null;
}> {
  const t0 = performance.now();
  try {
    const judge = new JevJudge({ timeoutMs });
    const answers = await judge.evaluate(
      { claim: "the build is complete", evidence: "60 tests pass, exit 0" },
      [{
        id: "supported",
        instructions: "Does the evidence support the claim?",
        whenTrue: "the evidence directly supports it",
        whenFalse: "it contradicts the claim or says nothing",
      }],
    );
    const a = answers[0];
    return {
      ok: a !== undefined,
      model: TYPESAFE_MODEL,
      probability: a?.probability ?? null,
      latencyMs: Math.round(performance.now() - t0),
      error: a === undefined ? "no answer returned" : null,
    };
  } catch (e) {
    return {
      ok: false,
      model: null,
      probability: null,
      latencyMs: Math.round(performance.now() - t0),
      error: e instanceof Error ? e.message.replace(/Bearer [A-Za-z0-9_-]+/g, "Bearer <redacted>") : String(e),
    };
  }
}
