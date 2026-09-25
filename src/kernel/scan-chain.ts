// ═══ SCAN CHAIN — THE PROVIDER FALLBACK WITH EVENT-BASED STALL DETECTION ═══
// PORTED VERBATIM from agent_plugin_boilerplates/free-key-pipeline-boilerplate/
//   provider-chain.ts (the operator's own architecture — CLEAN PORT, not stripped)
//
// SOURCE ARCHITECTURE (provider-chain.ts:1-97):
//   STALL_MS = 60_000 — no event for 60s = the stream is DEAD, not thinking
//   RETRY_ATTEMPTS = 5 per rung
//   RETRYABLE_RE = /429|rate.?limit|too many|quota|5\d\d/i
//   buildFreeChain() → ChainEntry[] — the operator's model order
//
// THE OPERATOR'S MODEL ORDER (verbatim, this session):
//   GO pool: ALL keys pin to union-alpha (6/7 down, 1 works — the pool cycles)
//   OpenRouter: laguna-s-2.1:free → laguna-xs-2.1:free → gemma-4-31b:free
//   NVIDIA: kimi-k3 → deepseek-flash
//   5 retries per rung, 5s between OpenRouter hits, 10s between NVIDIA hits
//
// THE LAW: the chain is N physical rungs but ONE logical mission — serve the
// call. The stall detector is EVENT-BASED (60s no tokens = dead), never a
// static wall-clock timeout.

// ═══ TRANSPORT CONSTANTS (the winner :18-22 — ported verbatim) ═══
export const STALL_MS = 60_000;          // no event for 60s = the stream is DEAD
export const RETRY_ATTEMPTS = 5;         // per rung
export const OR_BACKOFF_MS = 5_000;      // between OpenRouter hits
export const NV_BACKOFF_MS = 10_000;     // between NVIDIA hits
export const RETRYABLE_RE = /429|rate.?limit|too many|quota|5\d\d/i;

// ═══ MODEL PINS (the operator's order, this session) ═══
export const GO_MODEL = 'union-alpha';   // 262k context, free — ALL pool keys pin here
export const OR_CHAIN = [
  'poolside/laguna-s-2.1:free',
  'poolside/laguna-xs-2.1:free',
  'google/gemma-4-31b-it:free',
] as const;
export const NV_CHAIN = [
  'moonshotai/kimi-k3',
  'deepseek-ai/deepseek-r1',
] as const;

// ═══ KEY SOURCES (zero key material — resolved at call time) ═══
function getGoKey(): string {
  // The go-key-pool cycles; any live key works (6/7 down, 1 serves union-alpha)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { resolveGoKeyIndex } = require('./go-key-pool') as { resolveGoKeyIndex: (n: number) => { idx: number; alive: boolean } };
    const r = resolveGoKeyIndex(Date.now());
    return r.alive ? `idx-${r.idx}` : '';
  } catch { return ''; }
}

// ★ F-1243 FIX (2026-09-25): cache the parsed auth.json at module scope — getOpenRouterKey/
//   getNvidiaKey each did a synchronous readFileSync, and runScanChain calls both per rung
//   attempt (up to 12 reads under retry pressure, blocking the event loop each time).
//   One read per process; still resolved at call time (zero key material at import).
let cachedAuth: Record<string, { key?: string }> | null | undefined;
function readAuthFile(): Record<string, { key?: string }> {
  if (cachedAuth !== undefined) return cachedAuth ?? {};
  try {
    const raw = JSON.parse(require('fs').readFileSync(
      require('os').homedir() + '/.local/share/opencode/auth.json', 'utf8'
    )) as Record<string, { key?: string }>;
    cachedAuth = raw;
    return raw;
  } catch {
    cachedAuth = null;
    return {};
  }
}

function getOpenRouterKey(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return readAuthFile().openrouter?.key ?? '';
  } catch { return ''; }
}

function getNvidiaKey(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // ★ F-20 FIX (2026-09-24): READ the file content — the old form passed the PATH STRING
    //   to JSON.parse (always a SyntaxError → the NVIDIA rungs never got their key).
    return readAuthFile().nvidia?.key ?? '';
  } catch { return ''; }
}

// ═══ CHAIN ENTRY (the winner :26-30 — ported verbatim) ═══
export interface ChainEntry {
  provider: 'go-union-alpha' | 'openrouter' | 'nvidia';
  modelId: string;
  url: string;
  getKey: () => string;
  backoffMs: number;
}

// ═══ THE CHAIN — THE OPERATOR'S ORDER (this session) ═══
//   Rung 0: GO pool → union-alpha (262k context, the pinned primary)
//   Rungs 1-3: OpenRouter → laguna-s → laguna-xs → gemma-4-31b
//   Rungs 4-5: NVIDIA → kimi-k3 → deepseek-flash
export function buildScanChain(): ChainEntry[] {
  return [
    { provider: 'go-union-alpha', modelId: GO_MODEL,
      url: 'http://127.0.0.1:4097/zen/go/v1/chat/completions',
      getKey: getGoKey, backoffMs: 5_000 },
    ...OR_CHAIN.map(modelId => ({
      provider: 'openrouter' as const, modelId,
      url: 'https://openrouter.ai/api/v1/chat/completions',
      getKey: getOpenRouterKey, backoffMs: OR_BACKOFF_MS,
    })),
    ...NV_CHAIN.map(modelId => ({
      provider: 'nvidia' as const, modelId,
      url: 'https://integrate.api.nvidia.com/v1/chat/completions',
      getKey: getNvidiaKey, backoffMs: NV_BACKOFF_MS,
    })),
  ];
}

// ═══ THE LLM CALL WITH STALL DETECTION (ported from the boilerplate's
//     event-based pattern: the timeout resets on every chunk received.
//     This is NOT a wall-clock timer — it fires only on genuine silence.) ═══
export async function callWithStallDetection(
  url: string,
  apiKey: string,
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  stallMs: number = STALL_MS,
  extraHeaders: Record<string, string> = {},
): Promise<{ ok: true; content: string } | { ok: false; reason: string }> {
  const controller = new AbortController();
  let lastActivity = Date.now();
  let dead = false;

  const stallTimer = setInterval(() => {
    if (Date.now() - lastActivity > stallMs) {
      dead = true;
      controller.abort();
    }
  }, 5_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({ model: modelId, messages, max_tokens: 16384 }),
    });
    // ★ F-282 FIX (2026-09-24): check the HTTP status BEFORE touching the body —
    //   a 4xx/5xx error page parsed as a completion surfaced as silent EMPTY/PARSE.
    //   Non-ok is a named LOUD error carrying its status (fail-fast downstream).
    if (!response.ok) {
      clearInterval(stallTimer);
      let detail = "";
      // ★ F-943 FIX (2026-09-24): a throwing text() left the body undrained and the
      //   socket never returned to the pool. Cancel best-effort; status stays the signal.
      try { detail = (await response.text()).slice(0, 200); } catch {
        try { await response.body?.cancel(); } catch { /* best-effort drain */ }
      }
      return { ok: false, reason: `SCAN_HTTP_${response.status}: ${response.statusText ?? ""}${detail ? ` — ${detail}` : ""}` };
    }

    // stream-read: every chunk resets the stall timer
    const reader = response.body?.getReader();
    if (!reader) {
      // ★ F-148 FIX (2026-09-24): clear the stall interval — the early return
      //   leaked it (fired every 5s forever and held the process open).
      clearInterval(stallTimer);
      return { ok: false, reason: 'NO-STREAM: response body is not readable' };
    }
    const decoder = new TextDecoder();
    let full = '';
    // ★ F-705 FIX (2026-09-24): the interval callback and clearInterval are not
    //   atomic — a callback queued BEFORE the loop's `done` break could fire in
    //   the gap before clearInterval, set `dead`, and turn a COMPLETE stream
    //   into a false STALL. `streamComplete` gates the verdict: dead + complete
    //   is a late timer, never a stall.
    let streamComplete = false;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        // ★ R19-HIGH FIX (2026-09-25): `streamComplete = !dead` was evaluated AFTER the loop, so
        //   a timer callback queued in the microtask gap between observing `done` and reaching
        //   that assignment set `dead` and flipped `streamComplete` to FALSE — turning a
        //   COMPLETE stream into `STALL` and DISCARDING the fully buffered `full`, exactly what
        //   the F-705 comment above says must never happen. The comment described the opposite of
        //   the code. Completion is now recorded AT THE MOMENT IT IS OBSERVED, so no late timer
        //   can un-complete it.
        if (done) { streamComplete = true; break; }
        lastActivity = Date.now(); // ← THE EVENT: tokens are flowing, reset the timer
        full += decoder.decode(value, { stream: true });
        if (dead) break;
      }
    } catch {
      // ★ F-405 FIX (2026-09-24): reader.read() may throw after abort — fall through
      //   to finally for deterministic cleanup (the old code leaked the underlying
      //   TCP/socket connection held by the Response body on abort or exception).
    } finally {
      reader.cancel().catch(() => {}); // release the underlying connection
    }
    clearInterval(stallTimer);

    if (dead && !streamComplete) return { ok: false, reason: `STALL: no tokens for ${stallMs / 1000}s` };

    // parse the completion from the accumulated stream
    try {
      const parsed = JSON.parse(full);
      const content = parsed.choices?.[0]?.message?.content
        ?? parsed.output?.[0]?.content?.[0]?.text ?? '';
      if (content) return { ok: true, content };
      return { ok: false, reason: 'EMPTY: response parsed but no content' };
    } catch {
      // non-JSON response (streamed SSE chunks) — extract text
      const lines = full.split('\n').filter(l => l.startsWith('data: '));
      // ★ F-206 FIX (2026-09-24): CONCATENATE every delta in stream order — the
      //   old reverse()+first-match returned only the LAST chunk, truncating
      //   every multi-event streaming response to its tail.
      const parts: string[] = [];
      for (const line of lines) {
        try {
          const chunk = JSON.parse(line.slice(6));
          const delta = chunk.choices?.[0]?.delta?.content
            ?? chunk.choices?.[0]?.message?.content;
          // ★ F-163 FIX (2026-09-24): keep the EXTRACTED delta — never the raw
          //   accumulated stream (data: prefixes + newlines).
          if (delta) parts.push(String(delta));
        } catch { /* skip malformed SSE lines */ }
      }
      if (parts.length > 0) return { ok: true, content: parts.join("") };
      return { ok: false, reason: 'PARSE: could not extract content from stream' };
    }
  } catch (e: unknown) {
    clearInterval(stallTimer);
    if (dead) return { ok: false, reason: `STALL: aborted after ${stallMs / 1000}s silence` };
    return { ok: false, reason: `ERROR: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ═══ THE CHAIN RUNNER (the boilerplate's failover, ported verbatim) ═══
// Walks the chain: each rung gets RETRY_ATTEMPTS with backoff.
// 60s stall detection on EVERY attempt. Dead rung → next rung.
// Returns the first successful content, or the full mortality ledger.
export interface ChainResult {
  ok: boolean;
  content?: string;
  provider?: string;
  modelId?: string;
  ledger: Array<{ provider: string; modelId: string; attempt: number; reason: string }>;
}

export async function runScanChain(
  messages: Array<{ role: string; content: string }>,
): Promise<ChainResult> {
  const chain = buildScanChain();
  const ledger: ChainResult['ledger'] = [];

  for (const rung of chain) {
    const key = rung.getKey();
    if (!key) {
      ledger.push({ provider: rung.provider, modelId: rung.modelId, attempt: 0, reason: 'NO-KEY' });
      continue;
    }

    const extraHeaders: Record<string, string> = rung.provider === 'go-union-alpha'
      ? { 'x-opencode-session': `scan-chain-${Date.now()}` }
      : {};

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
      const result = await callWithStallDetection(
        rung.url, key, rung.modelId, messages, STALL_MS, extraHeaders,
      );
      if (result.ok) {
        return { ok: true, content: result.content, provider: rung.provider, modelId: rung.modelId, ledger };
      }
      ledger.push({ provider: rung.provider, modelId: rung.modelId, attempt, reason: result.reason });
      // ★ F-281 FIX (2026-09-24): gate the retry on RETRYABLE_RE — a fatal
      //   (auth, not-found, parse, empty) retried 5x burns 5 backoffs and the
      //   stall window for nothing. Retryable → backoff + retry; 401/404 →
      //   fail-fast to the next rung (never retryable); other non-matching →
      //   break to the next rung (failover, not spin).
      const rmsg = result.reason ?? "";
      if (/SCAN_HTTP_(401|404)\b/.test(rmsg)) break; // fail-fast: auth/not-found never heals on retry
      // ★ F-801 FIX (2026-09-24, run-11): a STALL (the stall-detector's transient timeout) did
      //   not match RETRYABLE_RE and was not 401/404 — so it fell to the `break`, treating the
      //   most TRANSIENT failure class as fatal. A stall is the definition of retryable.
      if (/^STALL:/.test(rmsg)) { /* transient — fall through to the retry below */ }
      else if (!RETRYABLE_RE.test(rmsg)) break; // fatal/non-transient → next rung, no backoff burn
      // retryable? backoff and retry.
      if (attempt < RETRY_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, rung.backoffMs));
      }
    }
    // rung exhausted → next rung in the chain
  }

  return { ok: false, ledger };
}

// ═══ CHAIN PROVIDERS LIST (the winner :97 — ported verbatim) ═══
export const CHAIN_PROVIDERS = ['go-union-alpha', 'openrouter', 'nvidia'] as const;
