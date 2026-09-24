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
  // ★ F-44 FIX (2026-09-24): scopeRoot flows into path.join, which normalizes `..` — `/allowed/../../etc` escapes the intended tree while still passing the session regex downstream. Require canonical absolute form (no `..` segments).
  // ★ F-274 FIX (2026-09-24): same bypass class as ua.ts — the split used path.sep only while Node accepts `/` on Windows. Both separators + NUL reject.
  if (!path.isAbsolute(input.scopeRoot) || input.scopeRoot.split(/[\\/]/).includes("..") || input.scopeRoot.includes("\0")) {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot must be a canonical absolute path, got ${JSON.stringify(input.scopeRoot)}`);
  }
  const storePath = sessionStorePath(input.scopeRoot, input.sessionId);
  const existing = findGiSessionByStorePath(storePath);
  if (existing && existing.session_id !== ownerKey) {
    throw new GiScopeError(
      `GI_SCOPE_REFUSED: store ${storePath} owned by ${existing.session_id}; caller ${callerKey}`,
    );
  }
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  // ★ F-128 FIX (2026-09-24): the TOCTOU truncate. `existsSync` then a plain
  //   `writeFileSync` (flag 'w') TRUNCATES if another writer created the store between
  //   the check and the write. The 'wx' flag creates exclusively — EEXIST means a peer
  //   won the race, which is success (the store exists), never a truncate.
  let created = false;
  try {
    fs.writeFileSync(storePath, "", { flag: "wx" });
    created = true;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  // ★ F-43 FIX (2026-09-24): the pre-create registry check raced a concurrent opener — an unconditional upsert could overwrite another session's row. Re-verify after winning the create; never overwrite a foreign owner.
  const current = findGiSessionByStorePath(storePath);
  if (current && current.session_id !== ownerKey) {
    throw new GiScopeError(
      `GI_SCOPE_REFUSED: store ${storePath} owned by ${current.session_id}; caller ${callerKey}`,
    );
  }
  if (!current) {
    upsertGiSession({
      sessionId: ownerKey,
      scopeRoot: input.scopeRoot,
      storePath,
    });
  }
  return { storePath, ownerKey, created };
}
