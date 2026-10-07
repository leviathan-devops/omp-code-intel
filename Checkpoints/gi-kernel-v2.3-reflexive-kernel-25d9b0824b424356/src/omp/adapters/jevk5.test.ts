// jevk5.test — ★ THE JEVK5 MEANING-GATE CONTRACT (GI-Kernel-V2.2 W5a).
//
// Two named tests against the LIVE GPU server (jevk5-4b-v0.2-Q8_0, :8090/:8008):
//   test_jevk5_health_reachable       — jevk5Available() is true (NAMED skip when down)
//   test_jevk5_probe_contract_recorded — the probe is id "TSG" with port-naming evidence
import { describe, expect, test } from "bun:test";
import * as path from "node:path";
import { jevk5Available, jevk5Probe, jevk5Url, JEVK5_URL_DEFAULT } from "./jevk5.ts";

const REPO = path.resolve(import.meta.dir, "..", "..", "..");

// ★ THE LIVE CHECK, once at load: a down server is a NAMED skip, never a silent pass.
const LIVE = jevk5Available();
if (!LIVE) {
  console.log(
    `[jevk5] SKIP-NAMED: the JevK5 GPU server is down (no :8090/health nor :8008/health ok) — skipping live tests; start systemone-server.py + llama-server to run them`,
  );
}

describe("jevk5: the GPU meaning gate (W5a)", () => {
  test("test_jevk5_url_default", () => {
    expect(jevk5Url({} as NodeJS.ProcessEnv)).toBe(JEVK5_URL_DEFAULT);
    expect(JEVK5_URL_DEFAULT).toBe("http://127.0.0.1:8090/v1/systemone");
  });

  test.skipIf(!LIVE)("test_jevk5_health_reachable", () => {
    // ★ If this runs, the server answered — the skip above is the only down path.
    expect(jevk5Available()).toBe(true);
  });

  test.skipIf(!LIVE)("test_jevk5_probe_contract_recorded", () => {
    const probe = jevk5Probe(REPO);
    expect(probe.id).toBe("TSG");
    expect(probe.rung).toBe("meaning");
    expect(probe.errorCode).toBe("GI_JEVK5_DOWN");
    const s = probe.up();
    expect(s.up).toBe(true);
    // ★ THE CONTRACT: the evidence names jevk5 + the port.
    expect(s.evidence).toMatch(/jevk5/i);
    expect(s.evidence).toMatch(/:8090|:8008/);
  });
});
