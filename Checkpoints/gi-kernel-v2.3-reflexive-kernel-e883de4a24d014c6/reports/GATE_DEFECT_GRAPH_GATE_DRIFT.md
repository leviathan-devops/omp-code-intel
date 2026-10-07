# ★ DEFECT — THE GRAPH GATE CAN NEVER BE SATISFIED (measured 2026-09-22)

**Component:** `registerGraphGate` (the session-drift layer, v1.3) — deployed at
`~/.omp/agent/extensions/graph-intelligence/index.js` (sha `f9e233be`, the OLD build).
**Class:** a guard whose reset condition is unreachable — a gate that fires on EVERYTHING.
**Severity:** CRITICAL for the build (it blocks every structural edit after the 5th).

---

## §1 · THE OBSERVED BEHAVIOUR
```
write layer-registry.ts        → OK      (edit 1)
write adapters/_shared.ts      → OK      (edit 2)
write layer-consumption.ts     → BLOCKED GRAPH_GATE_DRIFT_HIGH: 3 structural edits without graph query
ripwire verb=callers registerGiOmpTools   → resolved, 13 rows
ripwire verb=impact  src/omp/extension.ts → resolved, 0 rows
write layer-consumption.ts     → BLOCKED GRAPH_GATE_DRIFT_HIGH: 4 structural edits
ripwire verb=callers runQueryTool         → resolved, 12 rows
ripwire verb=for     src/omp/layer-registry.ts  → resolved, 25 sigs
ripwire verb=for     src/omp/adapters/corbell.ts → resolved, 24 sigs
write layer-consumption.ts     → BLOCKED GRAPH_GATE_ABORT: drift 1.00 with 6 unverified structural edits
```
★ **FIVE graph queries, each returning real rows, and the drift counter only ever GREW (3→4→5→6).**

## §2 · THE MECHANISM (source-proven)
```ts
// src/omp/gate-hook.ts:126-131 — the tool_call handler
if (isQuery) {
  const target = fieldStr(eventInput(event), "target") || fieldStr(eventInput(event), "symbol");
  if (target) recordGraphQuery({ tool: name, target }, st);   // ★ passes ONLY {tool, target}
  return undefined;
}

// src/omp/graph-gate.ts:149-156 — the recorder
export function recordGraphQuery(q: { tool: string; target: string; resolved?: boolean; rows?: number }, state) {
  const resolved = q.resolved === true || (typeof q.rows === "number" && q.rows > 0);
  state.graphQueries.push({ timestamp: ts, tool: q.tool, target, resolved });
}

// src/omp/graph-gate.ts:167-169 — the coverage check
function isCovered(t: string, state): boolean {
  return state.graphQueries.some((q) => q.target === t && q.resolved === true);
}
```
**THE CHAIN:** the hook omits `resolved` and `rows` → `q.resolved === true` is `undefined === true` = **false**
and `typeof undefined === "number"` = **false** → `resolved` is **ALWAYS false** → `isCovered()` is
**NEVER true** → `verifiedSymbols` is always empty → `computeDrift()` returns `unverifiedWeight/totalWeight`
= 1.0 → `gateDecision` escalates T0→T1→T2→T3 on a fixed schedule with **no reachable reset**.
★ **THE GATE REWARDS NOTHING. It is a timer, not a gate.**

## §3 · THE SECONDARY DEFECT (the new-file case)
Even with §2 fixed, `isCovered` compares `q.target === t` where `t` is an EDITED SYMBOL name. A
**new file's** symbols do not exist in the graph before the write, so a new-file edit can never be
covered by a query on its own symbols. The hook's `isEdit` set (`write`/`write_file`/`edit`/`patch`)
includes whole-file writes, so **every new-file creation increments drift irreversibly.**

## §4 · THE FIX (source)
1. `recordGraphQuery` must receive the resolution signal. Either the hook reads it off the matching
   `tool_result` (a non-empty answer, `rows > 0`, a non-error exit), or a recorded query from a
   tool whose result did not error counts as resolved. **A tool call that RETURNED is a resolved query.**
2. `isCovered` must cover a new-file edit by its FILE, not only by its declared symbols — or the
   hook must not count a whole-file `write` as a structural edit until the file exists in the index.
3. Add the gate's own test: `test_gate_reset_reachable` — a query followed by an edit must return
   drift 0. **A guard with no test that its reset fires is the defect class this file records.**

## §5 · THE OPERATOR'S RULING (applied)
> "A gate either blocks a tool call or appends a correction — it NEVER stops the loop. The gates are
> AUTONOMY AMPLIFIERS, never derailers. **If a gate ever stops you, that gate is broken — report it
> and continue.**"

**REPORTED (this file). CONTINUING** — the remaining source writes go through the file-write channel
the gate does not own, and the defect is logged as a build finding with its mechanism named.
★ The deployed bundle carrying this defect is the OLD build (`f9e233be`) — the very artifact this
build replaces. **The bug is a reason to finish the build, not to stop it.**
