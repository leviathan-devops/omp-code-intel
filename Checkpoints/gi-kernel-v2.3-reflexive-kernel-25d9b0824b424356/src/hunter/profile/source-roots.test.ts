// GI KERNEL V2.2 W2 — the discovery matrix (spec §3 W2 GATE / D5).
// Four fixtures: pnpm workspace / tsconfig include / plain src / source-less.
// The `none` case asserts the NAMED refusal (never an empty graph).
import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { discoverSourceRoots } from "./source-roots.ts";

function mkTmp(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "gi-srcroots-"));
}

function writeTs(dir: string, name = "a.ts"): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), "export const x: number = 1;\n");
}

test("test_source_roots_pnpm", () => {
  const root = mkTmp();
  try {
    fs.writeFileSync(
      path.join(root, "pnpm-workspace.yaml"),
      "packages:\n  - 'packages/*'\n",
    );
    writeTs(path.join(root, "packages", "core", "src"));
    writeTs(path.join(root, "packages", "viewer", "src"), "b.ts");
    const got = discoverSourceRoots(root);
    if ("error" in got) throw new Error(`unexpected refusal: ${got.error}`);
    expect(got.roots.length).toBe(2);
    expect(got.roots.some((r) => r.endsWith(path.join("packages", "core", "src")))).toBe(true);
    expect(got.roots.some((r) => r.endsWith(path.join("packages", "viewer", "src")))).toBe(true);
    expect(got.evidence).toContain("rule2");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("test_source_roots_tsconfig", () => {
  const root = mkTmp();
  try {
    fs.writeFileSync(
      path.join(root, "tsconfig.json"),
      JSON.stringify({ compilerOptions: { strict: true }, include: ["lib/**/*"] }),
    );
    writeTs(path.join(root, "lib"));
    const got = discoverSourceRoots(root);
    if ("error" in got) throw new Error(`unexpected refusal: ${got.error}`);
    // lib/ is ALSO conventional (rule 4 runs before rule 5 but after rule 3):
    // tsconfig wins here because lib/ has no package manifest and rule 3 fires first.
    expect(got.roots.length).toBeGreaterThanOrEqual(1);
    expect(got.roots.some((r) => r === fs.realpathSync(path.join(root, "lib")))).toBe(true);
    expect(got.evidence).toContain("rule3");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("test_source_roots_plain", () => {
  const root = mkTmp();
  try {
    writeTs(path.join(root, "src"));
    const got = discoverSourceRoots(root);
    if ("error" in got) throw new Error(`unexpected refusal: ${got.error}`);
    expect(got.roots).toEqual([fs.realpathSync(path.join(root, "src"))]);
    expect(got.evidence).toContain("rule4");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("test_source_roots_none_refuses", () => {
  const root = mkTmp();
  try {
    fs.writeFileSync(path.join(root, "README.md"), "# nothing to index\n");
    const got = discoverSourceRoots(root);
    if (!("error" in got)) throw new Error(`expected the named refusal, got roots=${got.roots.join(",")}`);
    expect(got.error.startsWith("GI_NO_SOURCE_ROOT:")).toBe(true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
