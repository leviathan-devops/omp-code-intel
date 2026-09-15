// GI-OMP ecosystem identity — boilerplate ScopeBindingManager.
// Sibling to trident-omp / ripwire / opengrok. Foreign ids loud-refuse.

import { ScopeBindingManager, type RegistrySurface, type ScopeBinding } from "./scope-binding.ts";
import { GI_ECOSYSTEM, GI_LABEL, GI_STATE_DIR, GI_WAVE_PREFIX } from "./gi-session-path.ts";

export const GI_TMP_DIR = "/tmp/gi-omp-tmp";

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
