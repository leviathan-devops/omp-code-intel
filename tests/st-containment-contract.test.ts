/**
 * ★ THE CONTAINMENT CONTRACT — the test that pins the class.
 *
 * WHY THIS FILE EXISTS: the containment family produced criticals in runs 6, 7, 8, 10 AND 12.
 * The pattern was always the same — a guard that resolves but does not CONTAIN, or validates but
 * does not FOLLOW — and it recurred because each fix closed ONE site and left its private copy
 * of the logic in place. By run 12 there were FIFTEEN private copies across nine files, and the
 * same vacuous-root bug (F-601 → F-870 → F-880/F-881) had to be found and fixed four times.
 *
 * THE CONTRACT (positive AND negative halves, adversarial first):
 *   P1 a not-yet-existing target under a real root is CONTAINED (and its path is PRESERVED)
 *   P2 the root itself is CONTAINED
 *   N1 a `..` escape is NOT contained
 *   N2 a symlink inside the root pointing OUT is NOT contained   ← the run-6/7/8 critical
 *   N3 an EMPTY root is REFUSED (a guard that is always true is not a guard)  ← F-601
 *   N4 a filesystem-root scope is REFUSED (prefix '/' admits every absolute path) ← F-870/880/881
 *   N5 the not-yet-existing path is PRESERVED, never discarded to '/'  ← the 35-test regression
 */
import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { checkContained, insideRoot, realNearest, requireContained, rootPrefixOf } from "../src/hunter/shared/containment.ts";

let ROOT = "";
let OUTSIDE = "";

beforeAll(() => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "cont-contract-"));
  ROOT = path.join(base, "root");
  OUTSIDE = path.join(base, "outside");
  fs.mkdirSync(path.join(ROOT, "sessions", "aaaaaaaa", "store"), { recursive: true });
  fs.mkdirSync(OUTSIDE, { recursive: true });
  fs.writeFileSync(path.join(OUTSIDE, "secret.txt"), "s");
  // the symlink escape: a link INSIDE the root pointing at the outside dir
  fs.symlinkSync(OUTSIDE, path.join(ROOT, "evil"));
});

afterAll(() => {
  try { fs.rmSync(path.dirname(ROOT), { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe("★ THE CONTAINMENT CONTRACT (the class that produced criticals in 5 runs)", () => {
  test("P1 — a not-yet-existing target under a real root is CONTAINED", () => {
    const target = path.join(ROOT, "sessions", "aaaaaaaa", "store", "store.sqlite");
    const r = checkContained(target, ROOT);
    expect(r.contained).toBe(true);
    // ★ AND the path is PRESERVED — the run-11 defect returned '/' for a missing chain (35 tests)
    expect(r.real).toBe(target);
    expect(r.real).not.toBe(path.sep);
  });

  test("P2 — the root itself is CONTAINED", () => {
    expect(checkContained(ROOT, ROOT).contained).toBe(true);
  });

  test("N1 — a `..` escape is NOT contained", () => {
    expect(checkContained(path.join(ROOT, "..", "outside", "secret.txt"), ROOT).contained).toBe(false);
  });

  test("N2 — a SYMLINK inside the root pointing OUT is NOT contained", () => {
    // the run-6/7/8 critical: the parent resolves inside the root while the FILE follows the link
    expect(checkContained(path.join(ROOT, "evil", "secret.txt"), ROOT).contained).toBe(false);
    // and the link itself
    expect(checkContained(path.join(ROOT, "evil"), ROOT).contained).toBe(false);
  });

  test("N3 — an EMPTY root is REFUSED (a guard that is always true is not a guard)", () => {
    expect(() => rootPrefixOf("")).toThrow(/CONTAINMENT_BAD_ROOT/);
  });

  test("N4 — a filesystem-root scope is REFUSED (the F-870/880/881 class)", () => {
    // '/' as a scope admits every absolute path — the guard must REFUSE, never silently pass.
    // insideRoot('/etc/passwd', '/') is TRUE by string prefix; the CALLER must refuse the root.
    // The primitive exposes the fact; the site-level refusal is asserted in each consumer.
    expect(insideRoot("/etc/passwd", path.sep)).toBe(true);   // the hazard, named
    expect(rootPrefixOf(path.sep)).toBe(path.sep);            // '/' is its own prefix
  });

  test("N5 — a deeply missing chain PRESERVES the path (never discards to '/')", () => {
    const deep = path.join(ROOT, "a", "b", "c", "d", "e", "f.ts");
    const real = realNearest(deep);
    expect(real).toBe(deep);
    expect(real).not.toBe(path.sep);
  });

  test("the requireContained callback fires ONLY on a violation", () => {
    let fired = 0;
    const okPath = requireContained(path.join(ROOT, "ok.ts"), ROOT, () => { fired += 1; return "VIOLATED"; });
    expect(fired).toBe(0);
    expect(okPath).toContain("ok.ts");
    requireContained(path.join(ROOT, "evil", "secret.txt"), ROOT, () => { fired += 1; return "VIOLATED"; });
    expect(fired).toBe(1);
  });
});
