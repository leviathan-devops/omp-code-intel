export {
  ScopeBindingManager,
  assertAliasNamespace,
  type EcosystemSpec,
  type RegistrySurface,
  type ScopeBinding,
} from "./scope-binding.ts";
export { ScopeResolver, scoreProjectRoots, type SessionActivity, type ActivityReader } from "./scope-resolver.ts";
export { makeDbPath, type DbPathSpec } from "./db-path.ts";
export { getStoreDb, closeStoreDb, upsertRow, runWithRetry, withImmediateTx } from "./scoped-store.ts";
export { sessionKey, readSessionState, writeSessionState, tickSessionBudget } from "./session-state.ts";
export {
  GI_STATE_DIR,
  GI_ECOSYSTEM,
  GI_WAVE_PREFIX,
  GI_LABEL,
  GiPathError,
  sessionStorePath,
  assertSessionStorePath,
  forbiddenSharedProjectStore,
  forbiddenGlobalHomeGraph,
} from "./gi-session-path.ts";
export { createGiBinding, emptyRegistry, GI_TMP_DIR } from "./gi-ecosystem.ts";
