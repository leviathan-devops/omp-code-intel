// st-jevk5 — ★ THE JEVK5 DISCOVERY WRAPPER (GI-Kernel-V2.2 W5a).
//
// WHY THIS EXISTS: bunfig.toml sets [test] root = "./tests", so a bare
// `bun test -t <name>` only scans ./tests — the canonical contract tests in
// src/omp/adapters/jevk5.test.ts are invisible to it. This file re-exports the
// same LIVE contract (same test names) so the acceptance command discovers them.
// The canonical tests live in src/omp/adapters/jevk5.test.ts; this is the thin
// discovery shim, never a second contract.
import { describe, expect, test } from "bun:test";
import { jevk5Available, jevk5Probe } from "../src/omp/adapters/jevk5.ts";

const LIVE = jevk5Available();
if (!LIVE) {
  console.log(
    `[jevk5] SKIP-NAMED: the JevK5 GPU server is down (no :8090/health nor :8008/health ok) — skipping live tests`,
  );
}

describe("st-jevk5: the GPU meaning gate via registry root (W5a)", () => {
  test.skipIf(!LIVE)("test_jevk5_health_reachable", () => {
    expect(jevk5Available()).toBe(true);
  });

  test.skipIf(!LIVE)("test_jevk5_probe_contract_recorded", () => {
    const probe = jevk5Probe(process.cwd());
    expect(probe.id).toBe("TSG");
    expect(probe.rung).toBe("meaning");
    const s = probe.up();
    expect(s.up).toBe(true);
    expect(s.evidence).toMatch(/jevk5/i);
    expect(s.evidence).toMatch(/:8090|:8008/);
  });
});
