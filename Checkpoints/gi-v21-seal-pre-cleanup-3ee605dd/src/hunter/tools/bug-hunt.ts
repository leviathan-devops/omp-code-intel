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
  acquireHuntLock(args.targetPath);
  try {
    const machine = createMicroLoop({
      targetPath: args.targetPath,
      profilePath: args.profilePath,
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
      machine.stop();
    }
  } finally {
    try {
      releaseHuntLock(args.targetPath);
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
          const result = await spawnBugHunterLoop({ targetPath, profilePath });
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
        const err = e as GiScopeError | GiPathError;
        const code = "code" in err ? String(err.code) : "GI_QUERY_FAIL";
        return textResult(`${code}: ${String(e)}`, { ok: false, error: code });
      }
    },
  });
}
