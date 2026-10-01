// THE THRESHOLD SWEEP — collect the judge's p_refuse per case (3 reps), then find the bar that
// separates smoke from legit with the fewest errors. The bar is DERIVED, not picked.
import { checkSmokeTestFirewall } from "/home/leviathan/.omp/wt/graph-intelligence-66dfa4c/pbk-anchor2/src/firewalls/semantic-smoke-firewall.ts";
import { smokeCandidate, askGateDecision } from "/home/leviathan/.omp/wt/graph-intelligence-66dfa4c/pbk-anchor2/src/ext/tool-gate.ts";
const D = "docker", T = "tmux";
const LEGIT: string[] = [
  `python3 -c "import json; d=json.load(open('x.json')); print(d['k'])"`,
  `cd /x && python3 -c "import json, collections; d=json.load(open('kg.json')); print(len(d))"`,
  `node /home/leviathan/x/prove.mjs 2>&1 | tail -5`,
  `bun test ./tests/st-gi-jev-gate.test.ts`,
  `bun run build 2>&1 | tail -1`,
  `cd /x; grep -n activateSurface -A22 electron/agent-display.js | head -26`,
  `curl -s -m 5 http://127.0.0.1:8090/health`,
  `ls -la; du -sh forensic; find . -name "*.json" | head`,
  `sed -i "s#ws/wrapper.mjs#ws/index.mjs#g" run.mjs`,
  `cp ~/.omp/agent/x.js $CP/tooling/x.js; mkdir -p $CP/pine-ide`,
  `sha256sum dist/index.js; cat /tmp/x.sha`,
  `cd /x && export PLUTUS_L1_PATH=/y && time node script.mjs`,
  `git status --short; git diff --stat`,
  `python3 scripts/crop.py /tmp/a.png /tmp/b.png 0 0 875`,
  `bunx tsc --noEmit 2>&1 | tail -3`,
  `cd /x && python3 - <<'PY'
import json
d=json.load(open('x.json'))
print(d)
PY`,
];
const SMOKE: string[] = [
  `node -e 'console.log(1)'`, `nodejs -e 'console.log(1)'`, `bun -e 'x'`,
  `python -c 'print(1)'`, `python2 -c 'print 1'`, `python3 -c 'print(1)'`, `python3.11 -c 'print(1)'`,
  `perl -e 'print 1'`, `ruby -e 'puts 1'`, `php -r 'echo 1;'`,
  `deno eval 'console.log(1)'`, `tsx -e 'console.log(1)'`,
  `sh -c 'node -e x'`, `bash -c 'python3 -c x'`,
  `node --eval "process.exit(0)"`, `omp run -p 'echo hi'`,
];
const ROWS: Array<{ want: string; ps: number[] }> = [];
for (const [cmd, want] of [...LEGIT.map(c => [c, "serve"]), ...SMOKE.map(c => [c, "refuse"])] as Array<[string, string]>) {
  const ps: number[] = [];
  for (let i = 0; i < 3; i++) {
    const fw = await checkSmokeTestFirewall({ toolName: "bash", sessionId: "ev", agentName: "ev", mode: "", args: { command: cmd }, commandStr: cmd });
    if ((fw as { action?: string }).action !== "BLOCK") { ps.push(-1); continue; }  // not detected
    const cand = smokeCandidate(String((fw as { category?: string }).category || "INLINE"), cmd);
    const jv = await askGateDecision(cand, "flagged category: " + (fw as { category?: string }).category + "\nthe command:\n" + cmd.slice(0, 4000));
    ps.push(jv.choice === "refuse" ? jv.confidence : 1 - jv.confidence);
  }
  ROWS.push({ want, ps });
}
console.log("\n  case-classify: p_refuse x3  (want)");
for (let i = 0; i < ROWS.length; i++) {
  const r = ROWS[i];
  console.log(`  ${r.want.padEnd(6)} [${r.ps.map(p => p.toFixed(2)).join(", ")}]`);
}
console.log("\n  ===== THE THRESHOLD SWEEP (block if p_refuse >= bar) =====");
for (const bar of [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9]) {
  let fp = 0, fn = 0;
  for (const r of ROWS) for (const p of r.ps) {
    const blocked = p >= bar;
    if (blocked && r.want === "serve") fp++;
    if (!blocked && r.want === "refuse") fn++;
  }
  console.log(`  bar=${bar.toFixed(2)}  FP=${fp}  FN=${fn}  (of ${ROWS.length * 3} trials)`);
}
