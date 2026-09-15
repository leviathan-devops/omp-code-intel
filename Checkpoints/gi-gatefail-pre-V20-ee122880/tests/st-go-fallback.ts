import { describe, expect, test } from "bun:test";
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

describe("st-go-fallback: 6-key pool + openrouter-only fallback", () => {
  test("pool carries 6 keys (go-6 provisioned)", () => {
    expect(GO_KEYS.length).toBe(6);
  });
  test("fallback rung is openrouter laguna ONLY (no inferx/nvidia)", () => {
    expect(FALLBACK_MODEL_OPENROUTER).toBe('openrouter/poolside/laguna-s-2.1:free');
    expect(FALLBACK_PROVIDER_OPENROUTER).toBe('openrouter');
  });
  test("live pool resolves go-4 (go-1..3 in dead windows)", () => {
    const d = decideGoFallback();
    expect(d.rung).toBe('go');
    expect(d.goIndex).toBe(3);
    expect(d.goAlive).toBe(true);
  });
  test("all-dead sandbox falls to openrouter", () => {
    const sid = SID();
    for (let i = 0; i < GO_KEYS.length; i++) markGoKeyDead(i, '429 rate limit test', Date.now(), sid);
    const d = decideGoFallback(Date.now(), sid);
    expect(d.rung).toBe('openrouter');
    expect(d.goAlive).toBe(false);
    expect(goFallbackSnapshot(Date.now(), sid)).toContain('fallback=openrouter');
  });
  test("contract (400 MissingSessionID) never dead-marks", () => {
    const sid = SID();
    expect(classifyGoError('400 MissingSessionID header required')).toBe('contract');
    expect(routeGoError(3, '400 MissingSessionID header required', Date.now(), sid)).toBe('walk-rungs-no-mark');
    expect(goKeyDead(3, Date.now(), sid)).toBe(false);
  });
  test("quota advances same rung while a key lives", () => {
    const sid = SID();
    for (let i = 0; i < 4; i++) markGoKeyDead(i, '429 quota', Date.now(), sid);
    expect(routeGoError(4, '429 quota exceeded', Date.now(), sid)).toBe('advance-same-rung');
    expect(resolveGoKeyIndex(Date.now(), sid).idx).toBe(5);
  });
  test("quota on last live key falls to openrouter", () => {
    const sid = SID();
    for (let i = 0; i < 5; i++) markGoKeyDead(i, '429 quota', Date.now(), sid);
    expect(routeGoError(5, '429 quota exceeded', Date.now(), sid)).toBe('fall-to-openrouter');
  });
  test("snapshot carries labels only (AP-4, no key material)", () => {
    const sid = SID();
    const snap = goFallbackSnapshot(Date.now(), sid);
    expect(snap).toContain('go-');
    expect(snap).toContain('fallback=');
    for (const k of GO_KEYS) expect(snap).not.toContain(k.slice(0, 12));
    expect(goPoolSnapshot(Date.now(), sid)).not.toContain('sk-');
  });
});
