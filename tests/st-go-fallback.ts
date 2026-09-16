import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

// V21 W10: the pool is ONE machine-wide DB by contract. Tests opt into
// hermetic state via the documented GO_POOL_DB override (a fresh tmp file per
// run) + an explicit reset — never via session sharding (removed by design).
process.env.GO_POOL_DB = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "go-fb-")), "pool.sqlite");

import {
  GO_KEYS,
  FALLBACK_MODEL_OPENROUTER,
  FALLBACK_PROVIDER_OPENROUTER,
  decideGoFallback,
  routeGoError,
  goFallbackSnapshot,
  goPoolSnapshot,
  goKeyDead,
  markGoKeyDead,
  classifyGoError,
  resolveGoKeyIndex,
} from "../src/hunter/keys/go-key-pool.ts";

const SID = () => 'go-fallback-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);

function routeGoKeyWrapped(idx: number): string {
  // routeGoError wrapped for the geometry-relative assertions
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { routeGoError } = require("../src/hunter/keys/go-key-pool.ts") as { routeGoError: (i: number, e: string) => string };
  return routeGoError(idx, '429 quota exceeded');
}

function resetPool(): void {
  // sync reset via the pool module's own connection (same file the module uses)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Database } = require("bun:sqlite") as { Database: new (p: string, o?: object) => { run: (s: string) => void; close: () => void } };
  const db = new Database(process.env.GO_POOL_DB!);
  try { db.run("DELETE FROM go_key_pool"); } catch { /* fresh */ }
  db.close();
}

// fresh pool state for THIS run (order-independent)
{
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { reloadGoKeys } = await import("../src/hunter/keys/go-key-pool.ts");
  reloadGoKeys();
  try {
    const { Database } = await import("bun:sqlite");
    const db = new Database(process.env.GO_POOL_DB!);
    db.run("DELETE FROM go_key_pool");
    db.close();
  } catch { /* fresh file — no table yet */ }
}

describe("st-go-fallback: 6-key pool + openrouter-only fallback (shared-DB contract)", () => {
  test("pool carries the 6 provisioned file keys (+ env single rung when present)", () => {
    // 2026-09-16 measured: ~/.gi-keys.json has 6; the host env now also sets
    // OPENCODE_GO_API_KEY (a 7th, distinct key) — reloadGoKeys appends it as
    // the documented single-key rung. The INVARIANT is: >= 6 file keys, no
    // duplicates — not a magic total (the environment may add the env rung).
    expect(GO_KEYS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(GO_KEYS).size).toBe(GO_KEYS.length);
  });
  test("fallback rung is openrouter laguna ONLY (no inferx/nvidia)", () => {
    expect(FALLBACK_MODEL_OPENROUTER).toBe('openrouter/poolside/laguna-s-2.1:free');
    expect(FALLBACK_PROVIDER_OPENROUTER).toBe('openrouter');
  });
  test("clean pool resolves go-1; 0-2 dead resolves go-4 (explicit state, no inheritance)", () => {
    resetPool();
    expect(decideGoFallback().goIndex).toBe(0);
    for (let i = 0; i < 3; i++) markGoKeyDead(i, '429 rate limit test', Date.now());
    const d = decideGoFallback();
    expect(d.rung).toBe('go');
    expect(d.goIndex).toBe(3);
    expect(d.goAlive).toBe(true);
  });
  test("all-dead pool falls to openrouter", () => {
    resetPool();
    for (let i = 0; i < GO_KEYS.length; i++) markGoKeyDead(i, '429 rate limit test', Date.now());
    const d = decideGoFallback();
    expect(d.rung).toBe('openrouter');
    expect(d.goAlive).toBe(false);
    expect(goFallbackSnapshot()).toContain('fallback=openrouter');
  });
  test("contract (400 MissingSessionID) never dead-marks", () => {
    resetPool();
    expect(classifyGoError('400 MissingSessionID header required')).toBe('contract');
    expect(routeGoError(3, '400 MissingSessionID header required')).toBe('walk-rungs-no-mark');
    expect(goKeyDead(3, Date.now())).toBe(false);
  });
  test("quota advances same rung while a key lives (geometry-relative)", () => {
    resetPool();
    for (let i = 0; i < GO_KEYS.length - 2; i++) markGoKeyDead(i, '429 quota', Date.now());
    expect(routeGoKeyWrapped(GO_KEYS.length - 1)).toBe('advance-same-rung');
    // the resolver picks the FIRST alive in priority order — the one right
    // after the dead prefix (5), not the highest index.
    expect(resolveGoKeyIndex(Date.now()).idx).toBe(GO_KEYS.length - 2);
  });
  test("quota on last live key falls to openrouter (geometry-relative)", () => {
    resetPool();
    const last = GO_KEYS.length - 1;
    for (let i = 0; i < last; i++) markGoKeyDead(i, '429 quota', Date.now());
    expect(routeGoError(last, '429 quota exceeded')).toBe('fall-to-openrouter');
  });
  test("server 5xx advances with NO dead-mark (V21 W10 ordered classifier)", () => {
    resetPool();
    expect(classifyGoError('503 service unavailable')).toBe('server');
    expect(routeGoError(2, '503 service unavailable')).toBe('advance-no-mark');
    expect(goKeyDead(2, Date.now())).toBe(false);
  });
  test("529 is quota (capacity), not server — no classifier overlap", () => {
    resetPool();
    expect(classifyGoError('529 overloaded')).toBe('quota');
    expect(classifyGoError('500 internal server error')).toBe('server');
  });
  test("window parser dialects + clamp (V21 W10)", async () => {
    const { parseGoWindowMs } = await import("../src/hunter/keys/go-key-pool.ts");
    expect(parseGoWindowMs('Resets in 2 hours')).toBe(2 * 3_600_000);
    expect(parseGoWindowMs('Resets in 1 hr 30min')).toBe(90 * 60_000);
    expect(parseGoWindowMs('Resets in 30 secs')).toBe(60_000); // clamped to min
    expect(parseGoWindowMs('Resets in 400 days')).toBe(30 * 24 * 3_600_000); // clamped to max
  });
  test("redaction covers api_key/token JSON shapes (V21 W10)", async () => {
    const { redactKeyMaterial } = await import("../src/hunter/keys/go-key-pool.ts");
    const out = redactKeyMaterial('bad {"api_key": "abcd1234efgh"} and token=zyxw98765432');
    expect(out).not.toContain('abcd1234efgh');
    expect(out).not.toContain('zyxw98765432');
  });
  test("snapshot carries labels only (AP-4, no key material)", () => {
    resetPool();
    const snap = goFallbackSnapshot();
    expect(snap).toContain('go-');
    expect(snap).toContain('fallback=');
    for (const k of GO_KEYS) expect(snap).not.toContain(k.slice(0, 12));
    expect(goPoolSnapshot()).not.toContain('sk-');
  });
});
