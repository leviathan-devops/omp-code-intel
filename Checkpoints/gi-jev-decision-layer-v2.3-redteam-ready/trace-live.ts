// THE LIVE TRACE — one real judge call, every byte captured.
// Mirrors exactly what sttgf-gate.ts:89-95 does. No mocks.
const URL = "http://127.0.0.1:8090/v1/systemone";
const candidate = {
  kind: "SMOKE_INLINE",
  severity: "security",
  instructions:
    "An anti-smoke-test firewall flagged this command as a possible INLINE/HEADLESS execution " +
    "(an interpreter running code inline: `node -e`, `node --eval`, `bun -e`, `python -c`). Smoke " +
    "tests are forbidden. Decide whether it is GENUINELY such an execution, or whether its TEXT " +
    "merely CONTAINS that shape (inside a heredoc body, a quoted string, a grep pattern, a path).",
  criteria: {
    serve: "a legitimate command: the shape words appear only inside a heredoc body, a quoted argument, a grep pattern, or a path — the command itself is a read/write/build, NOT an inline execution",
    refuse: "a genuine inline/headless execution: an interpreter is invoked to RUN code inline (`node -e`, `node --eval`, `bun -e`, `python -c`) as the command's actual action",
  },
};

const cmd = "cat > /tmp/f.ts <<'EOF'\nconsole.log(1)\nnode -e 'x'\nEOF";

const body = {
  state: "[the candidate kind: " + candidate.kind + "]\n" + cmd,
  questions: { gate: { type: "choice", instructions: candidate.instructions, criteria: candidate.criteria } },
};

console.log("=== REQUEST (the exact body sent) ===");
console.log(JSON.stringify(body, null, 1));
const t0 = performance.now();
const res = await fetch(URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(4000),
});
const ms = Math.round(performance.now() - t0);
const raw = await res.text();
console.log("\n=== RESPONSE (status " + res.status + ", " + ms + "ms) ===");
console.log(raw);
const j = JSON.parse(raw);
const a = j.answers.gate;
console.log("\n=== PARSED ===");
console.log("choice=" + a.choice + " confidence=" + a.confidence + " probs=" + JSON.stringify(a.probabilities));
console.log("judge=" + (j.model ?? "jevk5-4b-v0.2-Q8_0"));
