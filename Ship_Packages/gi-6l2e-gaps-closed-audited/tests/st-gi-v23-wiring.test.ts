// st-gi-v23-wiring — ★ V2.3 THE WIRING PINS (FR-2 lsp.json, FR-10 de-brand, FR-11 TTL).
import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const REPO = path.resolve(import.meta.dir, "..");
const LSP_JSON = path.join(process.env.HOME ?? "/home/leviathan", ".omp/agent/lsp.json");

describe("st-gi-v23-wiring", () => {
  test("test_gi_lsp_registered_in_omp", () => {
    // FR-2 — OMP launches gi-lsp natively: a valid `servers.gi-lsp` entry.
    expect(fs.existsSync(LSP_JSON)).toBe(true);
    const cfg = JSON.parse(fs.readFileSync(LSP_JSON, "utf8")) as { servers?: Record<string, { command?: string; args?: string[]; fileTypes?: string[]; rootMarkers?: string[] }> };
    const gi = cfg.servers?.["gi-lsp"];
    expect(gi).toBeDefined();
    expect(typeof gi?.command).toBe("string");
    expect(gi?.args ?? []).toContain("--stdio");
    expect((gi?.fileTypes ?? []).length).toBeGreaterThan(0);
    expect((gi?.rootMarkers ?? []).length).toBeGreaterThan(0);
    // the args point at THIS repo's gi-lsp server
    expect((gi?.args ?? []).some((a) => a.endsWith("scripts/gi-lsp.ts"))).toBe(true);
  });

  test("test_no_trident_branding", () => {
    // FR-10 — 0 "trident" in src/ + scripts/ (the de-brand, W7).
    const offenders: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== "node_modules") walk(p); continue; }
        if (!/\.(ts|py|js|mjs|json|sh)$/.test(e.name)) continue;
        if (/trident/i.test(fs.readFileSync(p, "utf8"))) offenders.push(path.relative(REPO, p));
      }
    };
    walk(path.join(REPO, "src"));
    walk(path.join(REPO, "scripts"));
    expect(offenders).toEqual([]);
  });

  test("test_ttl_widened_unknown_24h", () => {
    // FR-11 — the `unknown`-class TTL widened from 1h to 24h (W8).
    const src = fs.readFileSync(path.join(REPO, "src/omp/typed-write.ts"), "utf8");
    // the unknown class carries a 24h value (86_400_000 ms or 24 * 3600_000)
    const has24h = /unknown\s*:\s*(24\s*\*\s*60\s*\*\s*60\s*\*\s*1000|86[_,]?400[_,]?000|24\s*\*\s*3600[_,]?000)/.test(src);
    expect(has24h).toBe(true);
  });
});
