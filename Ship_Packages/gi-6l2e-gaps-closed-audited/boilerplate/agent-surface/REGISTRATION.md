# AGENT SURFACE — how the GI extension registers on omp

The deployed bundle: `~/.omp/agent/extensions/graph-intelligence/index.js`
(the omp loader reads `~/.omp/agent/extensions/<name>/index.js` or `extensions/<name>.ts`).

## The registration contract
`registerGiOmpTools(pi, cwdOf)` — `pi` is the omp extension API; `cwdOf` is the INJECTED
session-cwd resolver (the runtime provides it; callers must pass it — see `extension.ts:402`).

It registers 6 tools (+ the `graph-code-audit` alias):
`graph-probe` · `graph-query` · `bug-hunt` · `aether-code-audit` · `gi-consumption` · `gi-decide`.

## The hooks
`pi.on("tool_call")` — the graph gate (`src/omp/gate-hook.ts`): on a structural edit without a graph
query, it fires GRAPH_GATE_DRIFT (T0 pass → T1 advise → T2 block → T3 abort). A `ripwire` /
`graph-query` call on the edited symbol resets the drift. Fail-OPEN (never bricks a write).

## To load
A NEW omp session picks up the bundle (extensions load at session construction). The `cwdOf` +
`pi` are supplied by the runtime — no config key is required beyond the file landing in
`~/.omp/agent/extensions/graph-intelligence/`.
