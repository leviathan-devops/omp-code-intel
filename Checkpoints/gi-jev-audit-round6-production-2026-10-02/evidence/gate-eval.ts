// THE COMPREHENSIVE GATE EVAL — the full smoke-gate decision (detector -> judge -> enforce).
import { checkSmokeTestFirewall } from "/home/leviathan/.omp/wt/graph-intelligence-66dfa4c/pbk-anchor2/src/firewalls/semantic-smoke-firewall.ts";
import { smokeCandidate, askGateDecision, enforceGate } from "/home/leviathan/.omp/wt/graph-intelligence-66dfa4c/pbk-anchor2/src/ext/tool-gate.ts";
const D = "docker", T = "tmux";
const LEGIT: string[] = [
  `python3 -c "import json; d=json.load(open('x.json')); print(d['k'])"`,
  `cd /x && python3 -c "import json, collections; d=json.load(open('kg.json')); print(len(d))"`,
  `node /home/leviathan/x/prove.mjs 2>&1 | tail -5`,
  `bun test ./tests/st-gi-jev-gate.test.ts`,
  `bun run build 2>&1 | tail -1`,
  `cd /x; grep -n "activateSurface" -A22 electron/agent-display.js | head -26`,
  `curl -s -m 5 http://127.0.0.1:8090/health`,
  `ls -la; du -sh forensic; find . -name "*.json" | head`,
  `sed -i "s#node_modules/ws/wrapper.mjs#node_modules/ws/index.mjs#g" run.mjs`,
  `cp ~/.omp/agent/x.js $CP/tooling/x.js; mkdir -p $CP/pine-ide`,
  `sha256sum dist/index.js; cat /tmp/x.sha`,
  `${D} ps -a --format "{{.Names}}"; ${D} logs --tail 50 pbk`,
  `cd /x && export PLUTUS_L1_PATH=/y && time node script.mjs`,
  `git status --short; git diff --stat`,
  `sleep 2; WIN=$(DISPLAY=:3 xdotool search --name "V" | head -1); import -window "$WIN" /tmp/p.png`,
  `python3 scripts/crop.py /tmp/a.png /tmp/b.png 0 0 875`,
  `bunx tsc --noEmit 2>&1 | tail -3`,
  `jq '.name' package.json; wc -l src/*.ts`,
  `nvidia-smi --query-gpu=memory.used --format=csv`,
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
  `sh -c 'node -e x'`, `bash -c 'python3 -c x'`, `zsh -c 'echo hi'`,
  `node --eval "process.exit(0)"`,
  `${D} exec -it pbk bash`, `${D} run --rm img bash -c 'x'`,
  `${T} send-keys -t x 'y' Enter`,
  `omp run -p 'echo hi'`,
];
type C = [string, "allow" | "block"];
const CASES: C[] = [...LEGIT.map(c => [c, "allow"] as C), ...SMOKE.map(c => [c, "block"] as C)];
let ok = 0; const fps: string[] = []; const fns: string[] = [];
for (const [cmd, want] of CASES) {
  const fw = await checkSmokeTestFirewall({ toolName: "bash", sessionId: "eval", agentName: "eval", mode: "", args: { command: cmd }, commandStr: cmd });
  let got: "allow" | "block" = "allow";
  if ((fw as { action?: string }).action === "BLOCK") {
    const cand = smokeCandidate(String((fw as { category?: string }).category || "INLINE"), cmd);
    const jv = await askGateDecision(cand, "flagged category: " + (fw as { category?: string }).category + "\nthe command:\n" + cmd.slice(0, 4000));
    got = enforceGate(cand, jv).action === "refuse" ? "block" : "allow";
  }
  const good = got === want; ok += good ? 1 : 0;
  if (!good && want === "allow") fps.push(cmd);
  if (!good && want === "block") fns.push(cmd);
}
console.log("\n  ===== " + ok + "/" + CASES.length + " =====");
console.log("  FALSE POSITIVES (legit blocked): " + fps.length);
for (const f of fps) console.log("    FP: " + f.slice(0, 100));
console.log("  FALSE NEGATIVES (smoke allowed): " + fns.length);
for (const f of fns) console.log("    FN: " + f.slice(0, 100));
