// GI-OMP session store path — W0 interface.
// Spec T-1 / AP-1 / AP-2: isolation unit = session; workspace = root.
// A per-project store.sqlite (no /sessions/{sid24}/) is a LEAK. Refuse it.
// A global ~/.omp/graph-intelligence/store.sqlite is a LEAK. Refuse it.

import * as os from "node:os";
import * as path from "node:path";
import { sessionKey } from "./session-state.ts";

export const GI_STATE_DIR = ".omp/graph-intelligence";
export const GI_ECOSYSTEM = "gi-omp";
export const GI_WAVE_PREFIX = "gi-";
export const GI_LABEL = "GI-OMP";

export class GiPathError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "GiPathError";
    this.code = code;
  }
}

const SESSION_STORE_RE = /\/sessions\/[A-Za-z0-9_-]{8,24}\/store\.sqlite$/;

export function sessionStorePath(scopeRoot: string, sessionId: string): string {
  if (!scopeRoot || !path.isAbsolute(scopeRoot)) {
    throw new GiPathError("GI_PATH_DENIED", "GI_PATH_DENIED: scopeRoot must be absolute");
  }
  let sid = sessionKey(sessionId);
  if (!sid) {
    throw new GiPathError("GI_PATH_DENIED", "GI_PATH_DENIED: sessionKey empty");
  }
  if (sid.length < 8) sid = (sid + "xxxxxxxx").slice(0, 8);
  const p = path.join(scopeRoot, GI_STATE_DIR, "sessions", sid, "store.sqlite");
  assertSessionStorePath(p);
  return p;
}

/** AP-1/AP-2 mechanical refuse. Call before any sqlite open. */
export function assertSessionStorePath(p: string): void {
  const norm = p.replace(/\\/g, "/");
  if (isGlobalHomeGraph(norm)) {
    throw new GiPathError(
      "GI_GLOBAL_HOME_GRAPH",
      `GI_GLOBAL_HOME_GRAPH: session store must not be ${norm}`,
    );
  }
  if (!SESSION_STORE_RE.test(norm)) {
    throw new GiPathError(
      "GI_SHARED_PROJECT_STORE",
      `GI_SHARED_PROJECT_STORE: path must include /sessions/{sid24}/store.sqlite, got ${p}`,
    );
  }
}

export function forbiddenSharedProjectStore(scopeRoot: string): string {
  return path.join(scopeRoot, GI_STATE_DIR, "store.sqlite");
}

export function forbiddenGlobalHomeGraph(): string {
  const home = process.env.HOME ?? os.homedir();
  return path.join(home, ".omp/graph-intelligence/store.sqlite");
}

function isGlobalHomeGraph(norm: string): boolean {
  const home = (process.env.HOME ?? os.homedir()).replace(/\\/g, "/");
  const banned = path.posix.join(home, ".omp/graph-intelligence/store.sqlite");
  return norm === banned;
}
