// paragon-runtime-encryption — public surface.
export { resolveConfig, type StoreConfig, type ResolvedConfig } from "./config";
export {
  GENESIS,
  canonicalPayload,
  signPayload,
  signRecord,
  verifyRecord,
  verifyHooks,
  type SignableFields,
} from "./signing";
export {
  KernelStore,
  loadKey,
  mintKey,
  ensureStoreDir,
  cmpRun,
  runLe,
  runGt,
  KEY_BYTES,
  type RecordInput,
  type StoredRecord,
  type LedgerFiring,
  type LedgerOutcome,
  type ChainBreak,
} from "./store";
