// openSessionStore — T-1 + T-3.
// Caller may only open ITS session store. Cross-session = GI_SCOPE_REFUSED.

import * as fs from "node:fs";
import * as path from "node:path";
import {
  sessionKey,
  sessionStorePath,
} from "../scoping/index.ts";
import {
  findGiSessionByStorePath,
  upsertGiSession,
} from "./gi-registry.ts";

export class GiScopeError extends Error {
  readonly code = "GI_SCOPE_REFUSED";
  constructor(message: string) {
    super(message);
    this.name = "GiScopeError";
  }
}

export interface OpenSessionStoreInput {
  sessionId: string;
  scopeRoot: string;
  /** Defaults to sessionId. A different caller is a cross-session open. */
  callerSessionId?: string;
}

export interface OpenSessionStoreResult {
  storePath: string;
  ownerKey: string;
  created: boolean;
}

export function openSessionStore(input: OpenSessionStoreInput): OpenSessionStoreResult {
  const ownerKey = sessionKey(input.sessionId);
  const callerKey = sessionKey(input.callerSessionId ?? input.sessionId);
  if (callerKey !== ownerKey) {
    throw new GiScopeError(
      `GI_SCOPE_REFUSED: session ${callerKey} cannot open store owned by ${ownerKey}`,
    );
  }
  const storePath = sessionStorePath(input.scopeRoot, input.sessionId);
  const existing = findGiSessionByStorePath(storePath);
  if (existing && existing.session_id !== ownerKey) {
    throw new GiScopeError(
      `GI_SCOPE_REFUSED: store ${storePath} owned by ${existing.session_id}; caller ${callerKey}`,
    );
  }
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const created = !fs.existsSync(storePath);
  if (created) fs.writeFileSync(storePath, "");
  upsertGiSession({
    sessionId: ownerKey,
    scopeRoot: input.scopeRoot,
    storePath,
  });
  return { storePath, ownerKey, created };
}
