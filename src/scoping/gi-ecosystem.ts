// GI-OMP ecosystem identity — boilerplate ScopeBindingManager.
// Sibling to gi-omp / ripwire / opengrok. Foreign ids loud-refuse.

import { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { ScopeBindingManager, type RegistrySurface, type ScopeBinding } from "./scope-binding.ts";
import { GI_ECOSYSTEM, GI_LABEL, GI_STATE_DIR, GI_WAVE_PREFIX } from "./gi-session-path.ts";

// ★ F-819 FIX (2026-09-24): "/tmp/gi-omp-tmp" was POSIX-only (no /tmp on Windows)
//   AND a predictable shared path (a pre-planted symlink at it diverted writes —
//   TOCTOU). The base is now the platform temp dir. CALLERS must not write directly
//   under it — makeGiTmpDir() mints a per-call unique dir (mkdtemp = O_EXCL atomic,
//   0700) so a planted entry can never be followed. The const stays (binding-spec
//   compat) as the PARENT only.
export const GI_TMP_DIR = join(tmpdir(), "gi-omp-tmp");

/** Mint a fresh unique scratch dir under GI_TMP_DIR (atomic, 0700). Refuses LOUD
 *  on a symlink plant at the base (lstat never follows; the extension.ts:578
 *  audit-root pattern). mkdtemp throw (ENOENT/EACCES) propagates fail-closed.
 *  * F-1008 FIX (2026-09-25): pre-check + mkdir + mkdtemp is not atomic - a local plant
 *  swapping GI_TMP_DIR for a symlink inside the window diverted the mint under an
 *  attacker target (mkdtemp O_EXCL guards only the final component, never the parent;
 *  STALE class). No userspace atomic primitive exists, so the enforcement is
 *  verify-after-create: the base is re-lstat'd after mkdir AND after mkdtemp, and the
 *  minted dir's realpath must stay contained; any failure removes the mint and refuses
 *  LOUD. Residual: a swap landing after the final check but before first use - bounded to
 *  path confusion, never disclosure (the mint is 0700, so a foreign parent owner still
 *  cannot read inside it). PROBE: symlink GI_TMP_DIR mid-window (simulated by planting
 *  before the call) -> GI_TMP_PLANT, no dir left behind. */
export function makeGiTmpDir(prefix = "gi-"): string {
  let pre: { isSymbolicLink(): boolean } | null = null;
  try { pre = lstatSync(GI_TMP_DIR); } catch { pre = null; }
  if (pre && pre.isSymbolicLink()) {
    throw new Error(`GI_TMP_PLANT: scratch base ${GI_TMP_DIR} is a symlink plant — refusing`);
  }
  // ★ R19-HIGH FIX (2026-09-25): no `mode` was set — the base inherited the process umask
  //   (commonly 022 → 0o755, WORLD-READABLE). Every mint under it is 0700, so payloads were
  //   never directly readable, but a world-searchable/cross-user-writable base is itself the
  //   plant surface this function defends against (a foreign writer needs+w to swap the
  //   entry). The base is now 0700 explicitly, matching the mint's own discipline.
  mkdirSync(GI_TMP_DIR, { recursive: true, mode: 0o700 });
  // * F-1008: re-check after mkdir - a plant swapped in during/after mkdir is caught here.
  let mid: { isSymbolicLink(): boolean } | null = null;
  try { mid = lstatSync(GI_TMP_DIR); } catch { mid = null; }
  if (mid && mid.isSymbolicLink()) {
    throw new Error(`GI_TMP_PLANT: scratch base ${GI_TMP_DIR} became a symlink plant during mkdir — refusing`);
  }
  const dir = mkdtempSync(join(GI_TMP_DIR, prefix));
  // * F-1008: verify-after-create - a plant landing between the mid-check and mkdtemp is
  //   caught here: base-symlink OR dir-outside-base => remove the mint, refuse LOUD.
  let planted = false;
  try { planted = lstatSync(GI_TMP_DIR).isSymbolicLink(); } catch { planted = false; }
  let contained = false;
  try {
    const realDir = realpathSync(dir);
    const realBase = realpathSync(GI_TMP_DIR);
    contained = realDir === realBase || realDir.startsWith(realBase + sep);
  } catch { contained = false; }
  if (planted || !contained) {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort cleanup */ }
    throw new Error(`GI_TMP_PLANT: scratch base ${GI_TMP_DIR} failed post-mint verification (planted=${planted} contained=${contained}) — minted dir removed, refusing`);
  }
  return dir;
}

export function createGiBinding(registry: RegistrySurface): ScopeBinding {
  const mgr = new ScopeBindingManager();
  return mgr.register({
    ecosystem: GI_ECOSYSTEM,
    stateDir: GI_STATE_DIR,
    wavePrefix: GI_WAVE_PREFIX,
    generateMode: "sync",
    label: GI_LABEL,
    registry,
    tmpDir: GI_TMP_DIR,
  });
}

export function emptyRegistry(): RegistrySurface {
  return { findWaveBySession: () => null };
}
