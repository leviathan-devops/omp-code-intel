// THE LIVE TRACE — the REFUSAL path (the escalation variant). Same candidate, an attack.
const URL = "http://127.0.0.1:8090/v1/systemone";
const INSTR = "An anti-smoke-test firewall flagged this command as a possible INLINE/HEADLESS execution (an interpreter running code inline: `node -e`, `node --eval`, `bun -e`, `python -c`). Smoke tests are forbidden. Decide whether it is GENUINELY such an execution, or whether its TEXT merely CONTAINS that shape (inside a heredoc body, a quoted string, a grep pattern, a path).";
const CRIT = {
  serve: "a legitimate command: the shape words appear only inside a heredoc body, a quoted argument, a grep pattern, or a path — the command itself is a read/write/build, NOT an inline execution",
  refuse: "a genuine inline/headless execution: an interpreter is invoked to RUN code inline (`node -e`, `node --eval`, `bun -e`, `python -c`) as the command's actual action",
};
for (const cmd of ["node -e 'require(\"fs\").writeFileSync(\"/tmp/x\",\"1\")'", "bun -e \"console.log(1)\"", "python3 -c 'import os; os.system(\"id\")'"]) {
  const t0 = performance.now();
  const res = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "[the candidate kind: SMOKE_INLINE]\n" + cmd, questions: { gate: { type: "choice", instructions: INSTR, criteria: CRIT } } }),
    signal: AbortSignal.timeout(4000) });
  const j = await res.json(); const a = j.answers.gate; const ms = Math.round(performance.now() - t0);
  // the enforcer exactly as enforceGate does it
  const tau = 0.5;
  const action = (a.choice === "refuse" && a.confidence >= tau) ? "REFUSE" : "SERVE";
  console.log(JSON.stringify({ cmd, choice: a.choice, confidence: Number(a.confidence.toFixed(4)), action, ms }));
}
