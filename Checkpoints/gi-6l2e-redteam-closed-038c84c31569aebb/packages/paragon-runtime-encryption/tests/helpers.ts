// Shared test rig: throwaway store + kernel key per test file run.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { KernelStore, mintKey, type StoreConfig } from "../src/index";

/** Fresh isolated store. Caller owns close() + dir teardown lives in /tmp. */
export function freshStore(over: Partial<StoreConfig> = {}): { store: KernelStore; dir: string; cfg: StoreConfig } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paragon-test-"));
  const keyPath = path.join(dir, "vault", ".kernel.key");
  mintKey(keyPath);
  const cfg: StoreConfig = {
    storePath: path.join(dir, "vault", "store.sqlite"),
    keyPath,
    recordTable: "reflex",
    ledgerTable: "reflex_evidence",
    idColumn: "reflex_id",
    ...over,
  };
  const store = KernelStore.open(cfg);
  return { store, dir, cfg };
}

export function rmDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

export const THEATRICAL = "app:reflex:theatrical:claim-without-span";
export const STRUCTURAL = "app:reflex:dumb:blind-structural-edit";
