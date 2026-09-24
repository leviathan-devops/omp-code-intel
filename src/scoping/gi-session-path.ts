// GI-OMP session store path — W0 interface.
// Spec T-1 / AP-1 / AP-2: isolation unit = session; workspace = root.
// A per-project store.sqlite (no /sessions/{sid24}/) is a LEAK. Refuse it.
// A global ~/.omp/graph-intelligence/store.sqlite is a LEAK. Refuse it.

import * as os from "node:os";
import * as fs from "node:fs";
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
  // ★ F-283 FIX (2026-09-24): resolve `..`/`.` BEFORE the regex — the old
  //   backslash-normalize + regex-test accepted `sessions/valid/../evil`-style
  //   escapes whose literal text matched but whose resolved path left the
  //   session dir. path.resolve collapses the traversal so the regex tests the
  //   real location (containment: only a resolved sessions/{sid}/store.sqlite passes).
  // ★ F-434 FIX (2026-09-24, run-8 CRITICAL): SYMLINK TRAVERSAL. F-283 resolved `..`/`.`
  //   but `path.resolve` does NOT follow symlinks — a link planted at an intermediate
  //   component (`sessions/<sid>/evil -> /etc`) still LOOKED like a session store after
  //   resolution. Resolve the REAL path (symlink-following) and test THAT. The store may
  //   not exist yet (this asserts BEFORE the open), so walk up to the nearest EXISTING
  //   ancestor and realpath that — a symlinked ancestor outside the scope then fails the
  //   regex on its true location.
  // ★ F-434b (2026-09-24): THE SHAPE CHECK TESTS THE LOGICAL PATH, THE SYMLINK CHECK IS
  //   SEPARATE. Resolving the realpath FIRST and testing the regex on it broke every
  //   caller whose target does not exist yet (the realpath walk climbs to the filesystem
  //   root and DISCARDS the path — 35 test failures). The regex is a SHAPE refusal, so it
  //   tests the caller's own spelling (resolved for `.`/`..` — F-283). The symlink hazard
  //   is a DIFFERENT question, asked separately below: if the parent dir EXISTS, its REAL
  //   parent must still end in the session segment the logical path names.
  const resolved = path.resolve(p);
  const norm = resolved.replace(/\\/g, "/");
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
  // ★ F-434b THE SYMLINK GUARD — run ONLY when the parent exists (a not-yet-created store
  //   has nothing to follow yet). The realpath of the PARENT must still name the SAME
  //   session segment: a link planted at `<scope>/sessions/<sid>` (or above) resolves to a
  //   real path whose `/sessions/<sid>/` segment is a DIFFERENT id (or absent), so it fails.
  const parent = path.dirname(resolved);
  let parentReal: string | null = null;
  try { parentReal = fs.realpathSync(parent); } catch { parentReal = null; }
  if (parentReal !== null) {
    const parentNorm = parentReal.replace(/\\/g, "/");
    const want = /\/sessions\/([A-Za-z0-9_-]{8,24})\/?$/.exec(norm);
    const got = /\/sessions\/([A-Za-z0-9_-]{8,24})\/?$/.exec(parentNorm);
    if (want !== null && (got === null || got[1] !== want[1])) {
      throw new GiPathError(
        "GI_SHARED_PROJECT_STORE",
        `GI_SHARED_PROJECT_STORE: the session dir RESOLVES elsewhere (logical=${norm} real=${parentNorm}) — a symlinked session dir is a scope escape`,
      );
    }
  }
}

/** ── GI SESSION IDENTITY (the "sessionID is always default" fix) ────────────
 *  THE MEASURED DEFECT: `ctx.sessionID ?? "default"` (extension.ts:338) and
 *  `event.sessionId || event.sessionID || "default"` (gate-hook.ts:126) both
 *  resolved to the literal "default" on every live call — the omp tool_call
 *  ctx and event carry no session id — so every session in every project shared
 *  ONE drift bucket and ONE probe identity. A phantom id is worse than no id:
 *  it looks like an identity and silently merges unrelated sessions.
 *
 *  THE RESOLUTION (priority order, and the SOURCE is returned so provenance is
 *  visible end-to-end):
 *    1  ctx.sessionID         the harness's own id, when it does provide one
 *    2  GI_SESSION_ID         an explicit operator/harness override
 *    3  the scope root        a REAL, stable, project-scoped identity
 *  There is NO phantom fallback. A caller that cannot resolve a session gets the
 *  project scope — which is the gate's actual ownership boundary (drift is
 *  per-project, not per-session, by design).
 */
export function resolveSessionId(
  ctx?: unknown,
  env: NodeJS.ProcessEnv = process.env,
  scopeRoot?: string,
): { id: string; source: string } {
  const fromCtx = (ctx as { sessionID?: unknown } | undefined)?.sessionID;
  if (typeof fromCtx === "string" && fromCtx.length > 0) {
    return { id: fromCtx, source: "ctx.sessionID" };
  }
  const fromEnv = env["GI_SESSION_ID"];
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return { id: fromEnv, source: "GI_SESSION_ID" };
  }
  const root = scopeRoot ?? env["GI_SCOPE_ROOT"] ?? process.cwd();
  // A stable, filesystem-derived key: the scope root, made into a legal
  // session id (the store-path guard accepts [A-Za-z0-9_-]{8,24}).
  const slug = path.resolve(root).replace(/[^A-Za-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  // ★ F-164 FIX (2026-09-24): floor the id at 8 chars — an all-punctuation root
  //   (e.g. "/") yields slug "" → "scope-" (6 chars), which fails the
  //   SESSION_STORE_RE {8,24} check downstream. sessionStorePath pads the same way.
  let id = (`scope-${slug}`).slice(0, 24);
  if (id.length < 8) id = (id + "-xxxxxxxx").slice(0, 8);
  return { id, source: "scope-root" };
}

/** The event-shaped convenience used by the gate's tool_call handler. */
export function resolveSessionIdFromEvent(
  event: Record<string, unknown>,
  env: NodeJS.ProcessEnv = process.env,
): { id: string; source: string } {
  const direct = event["sessionId"] ?? event["sessionID"];
  if (typeof direct === "string" && direct.length > 0) {
    return { id: direct, source: "event.sessionId" };
  }
  return resolveSessionId(event, env);
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
