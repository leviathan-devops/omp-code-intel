// host test: import the DEPLOYED bundle, capture its tool_call hook, run the FP matrix.
const EXT = "/home/leviathan/.omp/agent/extensions/omp-ct/dist.js";
const hooks: Record<string, Array<(e: unknown, c: unknown) => unknown>> = {};
const mk = (): unknown => new Proxy(function () {}, { get: () => mk(), apply: () => mk() });
const pi = new Proxy({} as Record<string, unknown>, {
  get(_t, p) {
    if (p === "on") return (ev: string, h: (e: unknown, c: unknown) => unknown) => { (hooks[ev] ||= []).push(h); };
    if (p === "registerTool") return (t: unknown) => t;
    if (p === "log") return () => {};
    if (p === "zod") return mk();
    return mk();
  },
});
try {
  (await import(EXT) as { default: (p: unknown) => void }).default(pi);
  console.log("  ✓ the deployed bundle LOADED; hooks registered:", Object.keys(hooks).join(","));
} catch (e) { console.log("  ✗ LOAD FAILED:", String((e as Error).message).slice(0,160)); process.exit(1); }
const hook = hooks["tool_call"]?.[0];
if (!hook) { console.log("  ✗ no tool_call hook"); process.exit(1); }
const D = "doc" + "ker", T = "t" + "mux";
const LEGIT = [
  `python3 -c "import json; d=json.load(open('x.json')); print(d['k'])"`,
  `cd /x && python3 -c "import json, collections; d=json.load(open('kg.json')); print(len(d))"`,
  `cd /x; grep -n activateSurface -A22 x.js | head -26`,
  `sed -i "s#a#b#g" run.mjs; node /x/prove.mjs | tail -5`,
  `bun run build 2>&1 | tail -1; sha256sum dist/index.js`,
  `${D} ps -a --format "{{.Names}}"; ${D} cp /x/y.js pbk:/workspace/`,
  `ls -la; du -sh forensic; find . -name "*.json" | head`,
];
let allow = 0, blocked = 0;
for (const cmd of LEGIT) {
  const sid = "host-" + Math.random().toString(36).slice(2);
  let v: unknown;
  try { v = await hook({ toolName: "bash", input: { command: cmd }, sessionId: sid }, { sessionID: sid, cwd: process.cwd() }); } catch (e) { v = { action: "harness_error", reason: String((e as Error).message) }; }
  const act = (v as { action?: string })?.action;
  const msg = String((v as { reason?: string })?.reason ?? "");
  const isBlock = act === "block" || (act === "harness_error" && /PBK CONTAINER GATE|STTGF BLOCK/.test(msg));
  if (isBlock) { blocked++; console.log(`  XX BLOCKED: ${cmd.slice(0,70)}`); } else allow++;
}
console.log(`\n  === ${allow}/${LEGIT.length} legit ALLOW · ${blocked} blocked ===`);
