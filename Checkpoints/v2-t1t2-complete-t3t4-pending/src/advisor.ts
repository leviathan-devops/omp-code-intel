// src/advisor.ts — W4-C v1 advisor (trajectory rule-scan, default OFF).
//
// HONEST SCOPE (v1): `advisor.model` selects a FUTURE llm-backed reader; TODAY
// there is NO model call. The advisor IS the rule-scan: the SAME rule lexicon
// as ttsr (compileRules reuse) is run over the session trajectory
// (JSON.stringify(input.trajectory ?? []).slice(0, 20000)), and hits are
// pushed into the existing messages.transform store via pushViolations() with
// keys prefixed `advisor:<key>`. The marker therefore reads
// `[mimo-intel rule advisor:<key>]` via the NORMAL reminder path
// (reminderLine in the next "experimental.chat.messages.transform"), consumed
// on read exactly like W2 tool-scan violations. Wiring (index.ts): default OFF
// — opts.advisor unset (or model unset) yields {} so no "session.userQuery.post"
// key is registered; only `opts.advisor?.model` truthy registers the hook.

import { compileRules, scan, pushViolations } from "./ttsr";
import type { MimoIntelOptions } from "./shim";

export function advisorHooks(opts: MimoIntelOptions): Record<string, (input: any, output: any) => Promise<any>> {
  if (!opts.advisor?.model) return {};
  return {
    "session.userQuery.post": async (input: any, output: any) => {
      const compiled = compileRules(opts.ttsr?.rules ?? []);
      const text = JSON.stringify(input.trajectory ?? []).slice(0, 20000);
      const hits = scan(compiled, text);
      if (hits.length > 0)
        pushViolations(input.sessionID, hits.map((h) => ({ key: `advisor:${h.key}`, body: h.body })));
      return output;
    },
  };
}
