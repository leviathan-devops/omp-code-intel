// PORTED FROM fork-v143/live-tree/graph-intelligence/subagents/trident-bug-hunter/tools/bug-hunt.ts:1-101
// OMP SEAM ADAPTATION: the fork-plugin tool wrapper + the bare zod schema are
// dropped (banned in OMP code); registration flows through GiExtensionAPI
// (pi.registerTool + pi.zod, plain describe/default forms, no refinements).
// Status is the verbatim GI session-store read; hunt runs the REAL harness
// (createMicroLoop: recon/map/scan/trace/strike/report) under hunt-lock.
// Fail-closed: INCONCLUSIVE is a RESULT (named error), never a throw.
// DEVIATION (named): the machine is created INSIDE the try and torn down in
// the finally (db close + actor stop + lock release) — the fork leaks the
// actor/db; the owned-lifecycle law (R19) says the caller owns teardown.
import path from "node:path";
import { acquireHuntLock, releaseHuntLock } from "../harness/hunt-lock.ts";
import { createMicroLoop } from "../harness/micro-loop-machine.ts";
import type { ReportWriter } from "../harness/report.ts";
import type { GraphAdapter } from "../graph/interface.ts";
import type { ProjectProfile } from "../profile/schema.ts";
import type { CompiledPredicate } from "../lexicon/templates.ts";
import { GiScopeError, openSessionStore } from "../../omp/store-open.ts";
import { GiPathError } from "../../scoping/index.ts";
import { countTypedNodes, unwiredNodes } from "../../omp/typed-write.ts";
import { populateSessionStore } from "../../omp/populate.ts";

/** The tool's arg surface (fork spec section 5.2 — the FULL surface exposed). */
export interface BugHuntArgs {
  targetPath: string;
  profilePath: string;
  /** ★ F-303 (2026-09-24): the containment root the caller context supplies. When
   *  present, BOTH targetPath and profilePath must resolve inside it — the hunt path
   *  otherwise accepted `/etc` (an existing directory anywhere on the filesystem). */
  scopeRoot?: string;
  model?: string;
  provider?: string;
  maxTokens?: number;
}

/** The tool's result — the run's outcome (the S2 pass token rides reportPath). */
export interface BugHuntResult {
  runId: string;
  state: "done" | "inconclusive";
  findingsCount: number;
  reportPath: string | null;
  fixOrder: string[];
  error: string | null;
}

/** The host-proof seam: adapter/profile/battery/reportWriter ride straight into
 *  createMicroLoop — the REAL actors still run (recon/map/scan/trace/strike/
 *  report); the overrides only replace the substrate/battery sources. */
export interface BugHuntLoopOverrides {
  adapter?: GraphAdapter;
  profile?: ProjectProfile;
  battery?: CompiledPredicate[];
  reportWriter?: ReportWriter;
}

/** Run the micro-loop to completion and return the result — fail-closed. */
export async function spawnBugHunterLoop(args: BugHuntArgs & BugHuntLoopOverrides): Promise<BugHuntResult> {
  // ★ F-73 FIX (2026-09-24): the hunt path passed user-supplied target/profile straight to
  //   the lock + the loop (the status path validates scopeRoot; the hunt path did not — a
  //   `../../etc/passwd`-style target could aim the lock writer outside the scope). Fail closed
  //   here: canonicalize, require an existing directory target + an existing profile file.
  //   The lock is taken on the ABSOLUTE target (one dir = one lock; relative spellings shared
  //   nothing before). The fs import is dynamic so the tool layer never grows a static dep.
  const fsDyn = await import('node:fs');
  const absTarget: string = path.resolve(args.targetPath);
  // ★ F-303 FIX (2026-09-24): SCOPE CONTAINMENT. F-251/F-252 canonicalized but never
  //   BOUNDED — `/etc` (or any existing dir) passed the isDirectory check, and any
  //   existing file passed the profile check. When the caller supplies scopeRoot, both
  //   resolved paths must be inside it (symlink-aware: realpath both sides first).
  const scopeReal = args.scopeRoot ? fsDyn.realpathSync(path.resolve(args.scopeRoot)) : null;
  const scopePrefix = scopeReal === null ? null : (scopeReal === path.sep ? path.sep : scopeReal + path.sep);
  const inScope = (real: string): boolean => scopeReal === null || real === scopeReal || (scopePrefix !== null && real.startsWith(scopePrefix));
  let targetOk = false;
  try { targetOk = fsDyn.statSync(absTarget).isDirectory(); } catch { targetOk = false; }
  if (!targetOk) {
    throw new Error(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} (no existing directory at ${absTarget} — the hunt target must be a real directory inside the scope)`);
  }
  if (scopeReal !== null) {
    // ★ F-409 FIX (2026-09-24): fail-closed on realpath failure — if we cannot resolve the
    // ★ real path, we cannot confirm containment, so reject rather than checking the logical path.
    let targetReal: string;
    try {
      targetReal = fsDyn.realpathSync(absTarget);
    } catch {
      throw new Error(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} cannot resolve for scope check (scope=${scopeReal} realpath failed — chmod/fix permissions or remove broken symlinks)`);
    }
    if (!inScope(targetReal)) {
      throw new Error(`HUNT_SCOPE_INVALID: targetPath=${args.targetPath} resolves outside the scope root (scope=${scopeReal} target=${targetReal})`);
    }
  }
  if (typeof args.profilePath === 'string' && args.profilePath.length > 0) {
    const absProfile: string = path.resolve(args.profilePath);
    if (!fsDyn.existsSync(absProfile)) {
      throw new Error(`HUNT_SCOPE_INVALID: profilePath=${args.profilePath} (nothing at ${absProfile} — the profile must exist)`);
    }
  }
  acquireHuntLock(absTarget);
  try {
    // ★ F-251 FIX (2026-09-24): the machine rides the VALIDATED absolute target —
    //   the lock (above) and the loop (here) now share one path, so relative
    //   spellings can no longer split them onto different dirs.
    // ★ F-252 FIX (2026-09-24): profilePath rides the same fail-closed shape as
    //   targetPath — resolve + require an existing FILE (a traversal that escapes
    //   the scope no longer passes a bare existence check on the raw string).
    const absProfile: string | undefined = typeof args.profilePath === 'string' && args.profilePath.length > 0 ? path.resolve(args.profilePath) : undefined;
    if (absProfile !== undefined) {
      let profileOk = false;
      try { profileOk = fsDyn.statSync(absProfile).isFile(); } catch { profileOk = false; }
      if (!profileOk) {
        throw new Error(`HUNT_SCOPE_INVALID: profilePath=${args.profilePath} (nothing at ${absProfile} — the profile must exist)`);
      }
      // ★ F-303b FIX (2026-09-24): the profile obeys the SAME containment as the target.
      if (scopeReal !== null) {
        // ★ F-409 FIX (2026-09-24): fail-closed on realpath failure (same pattern as targetPath)
        let profileReal: string;
        try {
          profileReal = fsDyn.realpathSync(absProfile);
        } catch {
          throw new Error(`HUNT_SCOPE_INVALID: profilePath=${args.profilePath} cannot resolve for scope check (scope=${scopeReal} realpath failed — chmod/fix permissions or remove broken symlinks)`);
        }
        if (!inScope(profileReal)) {
          throw new Error(`HUNT_SCOPE_INVALID: profilePath=${args.profilePath} resolves outside the scope root (scope=${scopeReal} profile=${profileReal})`);
        }
      }
    }
    // ★ F-252b FIX (2026-09-24): build the options object as a SINGLE typed literal — the
    //   spread union widened `profilePath` to `string | undefined`, which the required
    //   MicroLoopOptions.profilePath rejects. `absProfile` is set whenever the caller passed one.
    const machine = createMicroLoop({
      targetPath: absTarget,
      profilePath: absProfile ?? "",
      ...(args.adapter ? { adapter: args.adapter } : {}),
      ...(args.profile ? { profile: args.profile } : {}),
      ...(args.battery ? { battery: args.battery } : {}),
      ...(args.reportWriter ? { reportWriter: args.reportWriter } : {}),
    });
    try {
      machine.start({ type: "START" });
      await machine.done();
      const { result } = machine.getSnapshot();
      const out: BugHuntResult = {
        runId: result.runId,
        state: result.state,
        findingsCount: result.findingsCount,
        reportPath: result.reportPath,
        fixOrder: result.fixOrder,
        error: result.error,
      };
      if (out.state === "inconclusive") {
        console.error(`[bug-hunt] HUNT_INCONCLUSIVE runId=${out.runId} error=${out.error ?? "unknown"} (fail-closed RESULT, never a throw)`);
      }
      return out;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`[bug-hunt] HUNT_INCONCLUSIVE error=${message} (the machine threw — mapped to the fail-closed RESULT)`);
      return {
        runId: `hunt-failed-${Date.now()}`,
        state: "inconclusive",
        findingsCount: 0,
        reportPath: null,
        fixOrder: [],
        error: message,
      };
    } finally {
      try {
        machine.context.db?.close();
      } catch {
        /* the idempotent close */
      }
      // ★ F-17 FIX (2026-09-24): the stop() is guarded — an unguarded throw in the finally
      //   would mask the original error (the R16 cleanup law).
      try { machine.stop(); } catch { /* the idempotent stop */ }
    }
  } finally {
    try {
      releaseHuntLock(absTarget);
    } catch (e: unknown) {
      console.error(`[bug-hunt] HUNT_LOCK_RELEASE_FAILED target=${args.targetPath} error=${e instanceof Error ? e.message : String(e)} (loud, never masking the hunt RESULT)`);
    }
  }
}

/** The minimal structural seam — satisfied by GiExtensionAPI. Declared locally
 *  so the tools dir never imports the omp extension layer back (no cycle). */
export interface BugHuntToolApi {
  zod: {
    string: () => { optional: () => unknown };
    enum: (v: [string, ...string[]]) => unknown;
    object: (shape: Record<string, unknown>) => unknown;
  };
  registerTool: (tool: {
    name: string;
    description: string;
    parameters: unknown;
    execute: (...args: unknown[]) => Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> }>;
  }) => void;
}

function textResult(text: string, details: Record<string, unknown>) {
  return { content: [{ type: "text" as const, text }], details };
}

/** The leading NAMED token of a fail-closed message ("PROFILE_INVALID: ..." →
 *  "PROFILE_INVALID") for the tool-result error field. */
function namedCode(message: string): string {
  const idx = message.indexOf(":");
  const head = (idx === -1 ? message : message.slice(0, idx)).trim();
  return head.length > 0 ? head : "HUNT_INCONCLUSIVE";
}

/** THE TOOL CREATOR — the omp extension registration consumes this (it calls
 *  pi.registerTool through the GiExtensionAPI seam). action=status is the
 *  verbatim GI session-store read; action=hunt runs spawnBugHunterLoop. */
export function createBugHuntTool(pi: BugHuntToolApi, opts: { cwdOf: (ctx?: { cwd?: string; sessionID?: string }) => string }): void {
  const zstr = () => pi.zod.string();
  const obj = (shape: Record<string, unknown>) => pi.zod.object(shape);
  const cwdOf = opts.cwdOf;
  pi.registerTool({
    name: "bug-hunt",
    description: "GI-OMP bug hunter. action=status reads the session store (unwired count + fix order); action=hunt runs the REAL micro-loop (recon/map/scan/trace/strike/report) under hunt-lock — fail-closed INCONCLUSIVE as RESULT.",
    parameters: obj({ i: zstr().optional(), action: pi.zod.enum(["hunt", "status"]), targetPath: zstr().optional(), profilePath: zstr().optional() }),
    execute: async (_id, params, _sig, _upd, ctx) => {
      const p = (params && typeof params === "object" ? params : {}) as { action?: string; targetPath?: string; profilePath?: string };
      const callerId = String((ctx as { sessionID?: string } | undefined)?.sessionID ?? "omp-default-session");
      const scopeRoot = cwdOf(ctx && typeof ctx === "object" && "cwd" in ctx ? ctx as { cwd?: string } : undefined);
      if (String(p.action ?? "").toLowerCase() === "hunt") {
        const targetPath = typeof p.targetPath === "string" && p.targetPath.length > 0 ? p.targetPath : scopeRoot;
        const profilePath = typeof p.profilePath === "string" && p.profilePath.length > 0 ? p.profilePath : path.join(scopeRoot, "profile.yaml");
        try {
          const result = await spawnBugHunterLoop({ targetPath, profilePath, scopeRoot });
          if (result.state === "inconclusive") {
            const message = result.error ?? "HUNT_INCONCLUSIVE";
            return textResult(`${message}`, {
              ok: false,
              state: "inconclusive",
              error: namedCode(message),
              runId: result.runId,
              findingsCount: 0,
              reportPath: null,
              fixOrder: [],
              action: "hunt",
            });
          }
          return textResult(`HUNT_DONE runId=${result.runId} findingsCount=${result.findingsCount} reportPath=${result.reportPath ?? "null"}`, {
            ok: true,
            token: "HUNT_DONE",
            state: "done",
            runId: result.runId,
            findingsCount: result.findingsCount,
            reportPath: result.reportPath,
            fixOrder: result.fixOrder,
            action: "hunt",
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          console.error(`[bug-hunt] hunt tool failed LOUD (fail-closed RESULT): ${message}`);
          return textResult(`${message}`, { ok: false, state: "inconclusive", error: namedCode(message), action: "hunt" });
        }
      }
      try {
        const opened = openSessionStore({ sessionId: callerId, scopeRoot, callerSessionId: callerId });
        if (countTypedNodes(opened.storePath) === 0) {
          populateSessionStore(opened.storePath, scopeRoot);
        }
        // V21 W9: a legacy store with lineless rows refuses loudly (LINELESS_NODE)
        // — status surfaces that as a named store-health note, never a fabricated
        // line and never a silent drop.
        let u: ReturnType<typeof unwiredNodes> = [];
        let linelessNote = "";
        try {
          u = unwiredNodes(opened.storePath);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg.includes("LINELESS_NODE")) {
            linelessNote = ` store-note=${msg.slice(0, 120)}`;
          } else {
            throw e;
          }
        }
        const fixOrder = u.slice(0, 20).map((r) => `${r.name} (${r.file}:${r.line})`);
        return textResult(`state=done findingsCount=${u.length} fixOrderCount=${fixOrder.length}${linelessNote}`, {
          ok: true,
          state: "done",
          findingsCount: u.length,
          fixOrder,
          action: p.action ?? "status",
        });
      } catch (e) {
        // ★ F-33 FIX (2026-09-24): `"code" in err` throws TypeError when the caught
        //   value is a primitive (string/number/null) — `in` requires an object.
        //   Narrow first; primitives fall through to GI_QUERY_FAIL.
        const errObj = (typeof e === 'object' && e !== null ? e : {}) as GiScopeError | GiPathError;
        const code = (typeof errObj === 'object' && errObj !== null && 'code' in errObj && typeof errObj.code === 'string') ? String(errObj.code) : "GI_QUERY_FAIL";
        return textResult(`${code}: ${String(e)}`, { ok: false, error: code });
      }
    },
  });
}
