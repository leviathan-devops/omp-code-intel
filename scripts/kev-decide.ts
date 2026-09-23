// kev-decide — THE KEV CLI. A sync-invokable meaning gate for the GI kernel.
//
// ★ WHY A CLI: the kernel's `ConsumerProbe.facts(subject)` is SYNCHRONOUS and the tsg probe
// already invokes a CLI via `execFileSync` (`tsg grep --json …`). KEV is async (the ONNX
// graph runs through transformers.js), so the probe needs a process boundary — this file.
//
// Usage:
//   bun scripts/kev-decide.ts --state "<text>" --question "<text>" --options "a|b|c"
//   bun scripts/kev-decide.ts --json '{"state":"…","questions":[{instr,options}]}'
// Output (one JSON object on stdout):
//   {"ok":true,"model":"onnx-community/kev-0.6b-ONNX","ms":1428,"answers":[[0.85,0.004,…]],
//    "best":[0,1,0],"labels":[["billing",…]]}
// A failure prints {"ok":false,"error":"…"} and exits 1 — NEVER a uniform distribution
// presented as a verdict (the all-zero class measured 2026-09-23).
import { kevDecide, type KevQuestion } from "./kev-probe.ts";

function argOf(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 && i + 1 < process.argv.length ? (process.argv[i + 1] ?? null) : null;
}

/** Build the questions from either the --json form or the --question/--options form. */
function readQuestions(): { state: string; questions: KevQuestion[] } {
  const json = argOf("--json");
  if (json !== null) {
    const parsed = JSON.parse(json) as { state?: unknown; questions?: unknown };
    const state = typeof parsed.state === "string" ? parsed.state : "";
    const raw = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions: KevQuestion[] = raw.map((q) => {
      const o = q as { instr?: unknown; options?: unknown };
      return {
        instr: typeof o.instr === "string" ? o.instr : "",
        options: Array.isArray(o.options) ? o.options.map((x) => String(x)) : [],
      };
    });
    return { state, questions };
  }
  const state = argOf("--state") ?? "";
  const instr = argOf("--question") ?? "";
  const options = (argOf("--options") ?? "").split("|").filter((s) => s.length > 0);
  return { state, questions: [{ instr, options }] };
}

const t0 = Date.now();
try {
  const { state, questions } = readQuestions();
  if (state.length === 0 || questions.length === 0) {
    console.log(JSON.stringify({ ok: false, error: "KEV_USAGE: --state and a --question/--options (or --json) are required" }));
    process.exit(1);
  }
  const res = await kevDecide(state, questions);
  const best = res.answers.map((dist) => dist.indexOf(Math.max(...dist)));
  console.log(
    JSON.stringify({
      ok: true,
      model: "onnx-community/kev-0.6b-ONNX",
      ms: Date.now() - t0,
      tokens: res.tokenCount,
      answers: res.answers,
      best,
      labels: questions.map((q) => q.options),
    }),
  );
} catch (e) {
  console.log(JSON.stringify({ ok: false, error: `KEV_FAILED: ${e instanceof Error ? e.message : String(e)}` }));
  process.exit(1);
}
