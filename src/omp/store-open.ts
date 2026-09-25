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
  // ★ F-342 FIX (2026-09-24): resolve the root AFTER the shape checks — a symlink at scopeRoot (or a swapped component) made every later mkdir/write follow it outside the intended tree. A dangling/unresolvable root is refused, never used raw.
  let resolvedScopeRoot: string;
  try {
    resolvedScopeRoot = fs.realpathSync(input.scopeRoot);
  } catch {
    throw new GiScopeError(`GI_SCOPE_REFUSED: scopeRoot does not resolve: ${JSON.stringify(input.scopeRoot)}`);
  }
  const storePath = sessionStorePath(resolvedScopeRoot, input.sessionId);
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
    // ★ F-1210 FIX (2026-09-25): this opener CREATED the file (wx won) but lost the registry
    //   race — throwing without cleanup orphaned the store (future openers get EEXIST with no
    //   matching row). Remove the file we created before refusing LOUD. Best-effort: an unlink
    //   failure warns, never masks the GI_SCOPE_REFUSED verdict.
    if (created) {
      try { fs.unlinkSync(storePath); } catch (e) { console.warn(`[store-open] orphan cleanup failed for ${storePath}: ${e instanceof Error ? e.message : String(e)}`); }
    }
    throw new GiScopeError(
      `GI_SCOPE_REFUSED: store ${storePath} owned by ${current.session_id}; caller ${callerKey}`,
    );
  }
  if (!current) {
    upsertGiSession({
      sessionId: ownerKey,
      scopeRoot: resolvedScopeRoot,
      storePath,
    });
  }
  // ★ F-1047 FIX (2026-09-25, run-13 HIGH): check-then-upsert raced — two concurrent openers
  // ★ could both observe `!current` and the loser silently overwrote the winner's row (the
  // ★ F-896 class: losing a race must not fall through). Verify-after-write: re-read the row
  // ★ just written; a foreign owner means this opener lost — refuse LOUD.
  const written = findGiSessionByStorePath(storePath);
  if (written && written.session_id !== ownerKey) {
    // ★ R19-HIGH FIX (2026-09-25): when THIS opener CREATED the file and then lost the upsert
    //   race, the throw left an ORPHAN — a store file on disk with no registry row, which the
    //   next opener reads as "someone else's store" and the first branch already knows to clean
    //   (the F-1210 unlink). Same discipline here: a file this call created and cannot claim is
    //   removed before the refusal, so the loser leaves NOTHING behind.
    if (created) {
      try { fs.unlinkSync(storePath); } catch (e) { console.warn(`[store-open] orphan cleanup failed for ${storePath}: ${e instanceof Error ? e.message : String(e)}`); }
    }
    throw new GiScopeError(
      `GI_SCOPE_REFUSED: store ${storePath} raced to ${written.session_id}; caller ${callerKey} lost`,
    );
  }
  // ★ R20-HIGH FIX (2026-09-25): if the upsert did not PERSIST, `findGiSessionByStorePath` returns
  //   null and the old code fell straight through to a `created: true` success — a store file with
  //   NO registry row (the caller believes it owns a session the registry has never heard of).
  //   Verify-after-write must FAIL LOUD on a missing row, not report success.
  if (!written) {
    if (created) {
      try { fs.unlinkSync(storePath); } catch (e) { console.warn(`[store-open] orphan cleanup failed for ${storePath}: ${e instanceof Error ? e.message : String(e)}`); }
    }
    throw new GiScopeError(`GI_SCOPE_REFUSED: store ${storePath} was not persisted to the registry (upsert wrote no row for ${ownerKey})`);
  }
  return { storePath, ownerKey, created };
}
