// ★ THE KEV PROBE — THE MEANING GATE, SERVED LOCALLY (in place of the remote Jev).
//
// WHY THIS EXISTS (the operator's directive, 2026-09-23): the TSG rung's meaning judgment
// calls TypeSafe's /v1/systemone, which is BLOCKED — the org has no API credits (HTTP 402).
// **KEV is the same contract, locally**: `onnx-community/kev-0.6b-ONNX` is the 0.6B member of
// the Kev family (a LoRA + pointer head on Qwen3-0.6B-Base) that serves TypeSafe's public
// `/v1/systemone` shape. Wiring it in place of Jev makes the meaning gate run WITHOUT credits,
// WITHOUT a network, and WITHOUT the remote key.
//
// ★ THE SHAPE: `kevProbe(scopeRoot)` returns a `ConsumerProbe` with **id "TSG"** — it IS the
// meaning gate — so registering it REPLACES the tsg-binary probe and the TSG rung is CONSUMED.
//
// THE MEASURED DEFECT IT MUST AVOID (EN-6L2E-15): a pointer head whose delimiter ids were
// sanitized emits ALL ZEROS, whose softmax is a UNIFORM distribution. A uniform answer is a
// DEFECT, never a verdict — this probe THROWS on it rather than reporting `match`.
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import type { ConsumerProbe, LayerFact } from "../layer-registry.ts";

const KEV_CLI_REL = "scripts/kev-decide.ts";
const KEV_MODEL = "onnx-community/kev-0.6b-ONNX";

/** The lazily-resolved CLI path (the repo root owns it). */
export function resolveKevCli(scopeRoot: string): string | null {
  const p = path.join(scopeRoot, KEV_CLI_REL);
  return fs.existsSync(p) ? p : null;
}

/** The transformers.js package that carries the ONNX runtime — the model's loader. */
export function resolveKevRuntime(scopeRoot: string): string | null {
  const p = path.join(scopeRoot, "node_modules", "@huggingface", "transformers", "package.json");
  return fs.existsSync(p) ? p : null;
}

/** The CLI's JSON answer shape. */
export interface KevCliAnswer {
  ok: boolean;
  model?: string;
  ms?: number;
  tokens?: number;
  answers?: number[][];
  best?: number[];
  labels?: string[][];
  error?: string;
}

/** ★ A UNIFORM DISTRIBUTION IS A DEFECT. With N options the uniform value is 1/N; within a
 *  tolerance, every option equal means the pointer head found nothing to point at (the
 *  all-zero-logit class). This is the guard that turns a silent wrong answer into a LOUD one.
 *  ★ F-556 NOTE (2026-09-24, REAL-DEFERRED): tol=1e-3 is UNCALIBRATED — it pins the exact
 *  all-zero-logit class only. A wider near-uniform tolerance (e.g. 0.05) needs measured
 *  model-variance data and would flip the battery-pinned [0.26,0.24,0.25,0.25]→false pin
 *  (st-redteam-kernel.test.ts); deferred to a calibration run with labeled provenance. */
export function isUniform(dist: readonly number[], tol = 1e-3): boolean {
  if (dist.length === 0) return true;
  const eq = 1 / dist.length;
  return dist.every((x) => Math.abs(x - eq) < tol);
}

/** ★ THE MEANING QUESTION (the DPL1's own token: `"meaning":"match"` / `"meaning":"drift"`). */
const MEANING_QUESTION = {
  instr: "Does the named symbol behave as its name and role say it does?",
  options: ["match", "drift", "unclear"],
};

/** ★ THE CONTEXT ASSEMBLER: the STATE Kev judges. Bounded — the model's limit is 8,192 tokens
 *  and the training used 384/1,024. The subject + the repo root's identity is the honest
 *  minimum; a caller may enrich it, never a fabricate a snippet. */
function buildState(scopeRoot: string, subject: string): string {
  const base = path.basename(scopeRoot);
  return [
    `Repository: ${base}`,
    `Subject under review: ${subject}`,
    `The subject is a symbol in this repository's decision path. Judge whether the symbol's`,
    `implementation matches its declared name and role. Answer "unclear" when the name alone`,
    `does not determine the behavior.`,
  ].join("\n");
}

export function kevProbe(scopeRoot: string): ConsumerProbe {
  const cli = resolveKevCli(scopeRoot);
  const runtime = resolveKevRuntime(scopeRoot);
  return {
    id: "TSG", // ★ the meaning gate's id — KEV SERVES IT (in place of the remote Jev)
    rung: "meaning",
    dependency: `the local KEV model (${KEV_MODEL}) via @huggingface/transformers — the meaning gate's local substitute for the remote Jev`,
    errorCode: "GI_ENFORCE_KEV",
    up: () => {
      if (runtime === null) {
        return { up: false, evidence: `${path.join(scopeRoot, "node_modules/@huggingface/transformers")} — ENOENT (the ONNX runtime is not installed)` };
      }
      if (cli === null) {
        return { up: false, evidence: `${path.join(scopeRoot, KEV_CLI_REL)} — ENOENT (the KEV CLI is absent)` };
      }
      return { up: true, evidence: `${cli} + ${runtime} (the local KEV meaning gate)` };
    },
    facts: (subject: string): LayerFact[] => {
      if (cli === null) throw new Error(`GI_ENFORCE_KEV: no KEV CLI at ${path.join(scopeRoot, KEV_CLI_REL)}`);
      let out: string;
      try {
        out = execFileSync(process.execPath, [cli, "--json", JSON.stringify({ state: buildState(scopeRoot, subject), questions: [MEANING_QUESTION] })], {
          encoding: "utf8",
          timeout: 120_000,
          maxBuffer: 8 * 1024 * 1024,
          cwd: scopeRoot,
        });
      } catch (e) {
        // the CLI's own stdout carries the NAMED error ("{ok:false,error:KEV_…}") — surface it.
        const err = e as { stdout?: unknown; message?: string };
        const tail = String(err.stdout ?? "").slice(-300);
        throw new Error(`GI_ENFORCE_KEV: the KEV CLI failed — ${tail.length > 0 ? tail : (err.message ?? String(e)).slice(0, 200)}`);
      }
      const line = out.split("\n").reverse().find((l) => l.trim().startsWith("{"));
      if (line === undefined) throw new Error(`GI_ENFORCE_KEV: the KEV CLI printed no JSON — output: ${out.slice(0, 200)}`);
      // ★ AUDIT HIGH (W5, 2026-09-23): the parse was UNPROTECTED — a debug line
      //   beginning with `{` or a truncated fragment threw a cryptic SyntaxError,
      //   bypassing the uniform guard above.
      let ans: KevCliAnswer;
      try {
        ans = JSON.parse(line) as KevCliAnswer;
      } catch (e) {
        throw new Error(`GI_ENFORCE_KEV: the KEV CLI printed invalid JSON — ${(e instanceof Error ? e.message : String(e)).slice(0, 120)} · the line: ${line.slice(0, 160)}`);
      }
      if (!ans.ok) throw new Error(`GI_ENFORCE_KEV: ${ans.error ?? "the KEV decision failed"}`);
      const dist = ans.answers?.[0];
      if (dist === undefined || dist.length === 0) throw new Error("GI_ENFORCE_KEV: the KEV decision carried no distribution");
      // ★ F-557 FIX (2026-09-24): finite-number guard — a CLI emitting NaN/Infinity slips past
      //   isUniform (every NaN comparison is false) and the argmax then defaults to index 0,
      //   manufacturing a verdict from garbage. Non-finite input is a DEFECT, never a verdict.
      if (!dist.every((x) => Number.isFinite(x))) {
        throw new Error(`GI_ENFORCE_KEV: the KEV decision carried a non-finite distribution ${JSON.stringify(dist)} — refusing to report a verdict`);
      }
      // ★ THE UNIFORM GUARD — a pointer head that points at nothing is a DEFECT, not a verdict.
      if (isUniform(dist)) {
        throw new Error(`GI_ENFORCE_KEV: KEV returned a UNIFORM distribution ${JSON.stringify(dist)} — the pointer head found no signal (the all-zero-logit class); refusing to report a verdict`);
      }
      const labels = ans.labels?.[0] ?? [];
      // ★ F-26 FIX (2026-09-24): the CLI's `best` index was trusted blindly — an out-of-range index mislabels the verdict. Clamp to the argmax.
      let best = ans.best?.[0] ?? 0;
      if (!Number.isInteger(best) || best < 0 || best >= dist.length) {
        let m = 0;
        for (let k = 1; k < dist.length; k++) if (dist[k]! > dist[m]!) m = k;
        best = m;
      }
      const verdict = best < labels.length ? (labels[best] ?? "unknown") : "unknown";
      return [
        {
          consumer: "TSG" as const,
          rung: "meaning" as const,
          subject,
          value: { meaning: verdict, distribution: dist, labels, ms: ans.ms ?? 0, model: ans.model ?? KEV_MODEL },
          source: `${cli}#kev(${verdict} p=${dist[best]?.toFixed(3)} · ${KEV_MODEL} · ${ans.ms ?? 0}ms)`,
        },
      ];
    },
  };
}
