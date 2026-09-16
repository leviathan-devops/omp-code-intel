// src/advisor.ts — W4-C v1 advisor (trajectory rule-scan, default OFF).
//
// HONEST SCOPE (v1): `advisor.model` selects a FUTURE llm-backed reader; TODAY
// there is NO model call. The advisor IS the rule-scan: the SAME rule lexicon
// as ttsr (compileRules reuse) is run over the session trajectory
// (JSON.stringify(input.trajectory ?? []).slice(0, 20000)), and hits are
// pushed into the existing messages.transform store via pushViolations() with
// keys prefixed `advisor:<key>`. The marker therefore reads
// `[omp-intel rule advisor:<key>]` via the NORMAL reminder path
// (reminderLine in the next "experimental.chat.messages.transform"), consumed
// on read exactly like W2 tool-scan violations. Wiring (index.ts): default OFF
// — opts.advisor unset (or model unset) yields {} so no "session.userQuery.post"
// key is registered; only `opts.advisor?.model` truthy registers the hook.

import { compileRules, scan, pushViolations } from "./ttsr";
import type { OmpIntelOptions } from "./shim";

export function advisorHooks(opts: OmpIntelOptions): Record<string, (input: any, output: any) => Promise<any>> {
  if (!opts.advisor?.model) return {};
  return {
    "session.userQuery.post": async (input: any, output: any) => {
      // Null-safe + stringify-safe: null input, circular trajectory, or
      // BigInt payloads degrade to unchanged output — an observer hook must
      // never reject the query pipeline.
      try {
        if (input == null || typeof input !== "object") return output;
        const compiled = compileRules(opts.ttsr?.rules ?? []);
        // Bound BEFORE stringify: cap items + per-item length so a giant
        // trajectory never pays full JSON.stringify cost; scan() windows
        // head+tail itself, so no post-slice here (a head-only slice would
        // push trailing violations past the window = false negative).
        const traj = Array.isArray(input.trajectory) ? input.trajectory.slice(0, 50) : [];
        let text: string;
        try {
          text = JSON.stringify(traj, (_k, v) => (typeof v === "string" ? v.slice(0, 500) : v));
        } catch {
          return output;
        }
        const hits = scan(compiled, text);
        if (hits.length > 0 && typeof input.sessionID === "string" && input.sessionID.length > 0)
          pushViolations(
            input.sessionID,
            hits.map((h) => ({ key: `advisor:${h.key}`, body: h.body })),
            typeof input.callID === "string" ? input.callID : undefined,
          );
        return output;
      } catch {
        return output;
      }
    },
  };
}
