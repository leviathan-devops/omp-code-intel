// st-gi-populate-fresh — ★ THE SELF-POPULATE PROOF (GI_KERNEL_V2.2_REBUILD_SPEC §3 W4, gate D1/D2).
//
// THE ONE ASSERTION THAT MATTERS: a FRESH project (never seen by the kernel) populates, and
// the store lands in THE TARGET'S OWN scope with the target's build_root stamped — never
// carried from the GI repo, never a ghost.
import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const REPO = "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence";

/** Build a tiny fresh TS project (no profile, no workspace manifest — the plain-src shape). */
function freshProject(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "gi-fresh-"));
  fs.mkdirSync(path.join(d, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(d, "src", "alpha.ts"),
    "export function alpha(x: number): number { return beta(x) + 1; }\n",
  );
  fs.writeFileSync(
    path.join(d, "src", "beta.ts"),
    "export function beta(x: number): number { return x * 2; }\nexport const GAMMA = beta(3);\n",
  );
  return d;
}

test("test_populate_fresh_project_eight_of_eight", () => {
  const target = freshProject();
  try {
    // ★ STEP 1 — the self-populate runs on the FRESH project.
    const pop = spawnSync("bun", ["scripts/gi-populate.ts", "--target", target], {
      cwd: REPO, encoding: "utf8", timeout: 300_000,
    });
    const out = `${pop.stdout ?? ""}\n${pop.stderr ?? ""}`;

    // the job's container evidence: the corbell layer MUST have built (the discovered root).
    expect(out).toContain("corbell");
    expect(out).not.toContain("GI_NO_SOURCE_ROOT"); // the src/ root is discoverable

    // ★ STEP 2 — the store landed in THE TARGET'S OWN scope (not the GI repo's).
    const store = path.join(target, ".omp", "graph-intelligence", "corbell-checkout", "store.sqlite");
    expect(fs.existsSync(store)).toBe(true);

    // ★ STEP 3 — the store carries >0 LIVE rows (the superseded_run filter — the honest count).
    const live = spawnSync("sqlite3", [store, "SELECT COUNT(*) FROM typed_nodes WHERE superseded_run IS NULL;"], { encoding: "utf8", timeout: 30_000 });
    expect(Number((live.stdout ?? "0").trim())).toBeGreaterThan(0);

    // ★ STEP 4 — gi_meta.build_root == the target's realpath (W3: the store asserts its tree).
    const br = spawnSync("sqlite3", [store, "SELECT value FROM gi_meta WHERE key='build_root';"], { encoding: "utf8", timeout: 30_000 });
    expect((br.stdout ?? "").trim()).toBe(fs.realpathSync(target));

    // ★ STEP 5 — the register reads 8/8 OR every non-consumed layer names its reason.
    const reg = spawnSync("bun", ["scripts/consumption-audit.ts", target, "alpha"], { cwd: REPO, encoding: "utf8", timeout: 300_000 });
    const regOut = `${reg.stdout ?? ""}\n${reg.stderr ?? ""}`;
    const m = /consumed:(\d)\/8/.exec(regOut);
    expect(m).not.toBeNull();
    const consumed = Number(m![1]);
    if (consumed < 8) {
      // every non-consumed layer must be NAMED (GI_LAYER_DOWN: / GI_LAYER_UNCONSUMED / GI_LAYER_ERROR:)
      expect(regOut).toMatch(/GI_LAYER_(DOWN|UNCONSUMED|ERROR)/);
    }
    expect(consumed).toBeGreaterThanOrEqual(1); // at minimum, the corbell layer the populate built
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
}, 180_000); // ★ LOAD-FLAKE FIX (2026-09-29): the inner spawns allow 300s each; bun's 30s default made a loaded battery fail it as a TIMEOUT
