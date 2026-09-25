// THE REAL RUNTIME TEST — drive the DEPLOYED bundle's registered tools against a REAL project.
const calls = { tools: {} };
const pi = {
  registerTool: (d) => { calls.tools[d.name] = d; },
  on: () => {}, registerCommand: () => {}, registerAgent: () => {},
  zod: new Proxy({}, { get: () => () => ({ optional: () => ({}) }) }),
  config: { get: () => undefined }, log: () => {},
};
const m = await import('/root/.omp/agent/extensions/graph-intelligence/index.js');
await (m.default ?? m.registerGiOmpTools)(pi);
console.log('TOOLS:', Object.keys(calls.tools).join(', '));
console.log('---');
// drive each against the REAL project
const ROOT = '/workspace/realproj';
const ctx = { cwd: ROOT, sessionID: 'sesRealTest0000000001' };
const t = (name) => calls.tools[name];
async function drive(name, params) {
  const tool = t(name);
  if (!tool) { console.log(`${name}: NOT REGISTERED`); return; }
  const t0 = Date.now();
  try {
    const r = await tool.execute('id', params, undefined, undefined, ctx);
    const txt = (r?.content?.[0]?.text ?? JSON.stringify(r?.details ?? r) ?? '').slice(0, 600);
    console.log(`${name} (${Date.now()-t0}ms):\n${txt}\n`);
  } catch (e) { console.log(`${name}: THREW ${String(e).slice(0,300)}\n`); }
}
await drive('graph-probe', { i: 'probe the real project', action: 'status', scopeRoot: ROOT });
await drive('graph-query', { i: 'who calls cosineSimilarity', verb: 'who-calls', target: 'cosineSimilarity', scopeRoot: ROOT });
await drive('gi-consumption', { i: 'the register', subject: 'cosineSimilarity', scopeRoot: ROOT });
