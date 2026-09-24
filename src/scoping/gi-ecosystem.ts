// GI-OMP ecosystem identity — boilerplate ScopeBindingManager.
// Sibling to trident-omp / ripwire / opengrok. Foreign ids loud-refuse.

import { lstatSync, mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
 *  audit-root pattern). mkdtemp throw (ENOENT/EACCES) propagates fail-closed. */
export function makeGiTmpDir(prefix = "gi-"): string {
  let pre: { isSymbolicLink(): boolean } | null = null;
  try { pre = lstatSync(GI_TMP_DIR); } catch { pre = null; }
  if (pre && pre.isSymbolicLink()) {
    throw new Error(`GI_TMP_PLANT: scratch base ${GI_TMP_DIR} is a symlink plant — refusing`);
  }
  mkdirSync(GI_TMP_DIR, { recursive: true });
  return mkdtempSync(join(GI_TMP_DIR, prefix));
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
