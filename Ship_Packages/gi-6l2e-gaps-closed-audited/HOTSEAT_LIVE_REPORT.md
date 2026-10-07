# HOTSEAT — the LIVE probe of the DEPLOYED artifact (2026-10-03)

Stance: the deployed OMP extension `~/.omp/agent/extensions/graph-intelligence/index.js`
(sha256 `879cbbf80b9d968216fca4da34065ad5c4fe21979d527956842876688f18b741`) driven directly —
imported and exercised against the live GI tree.

## 1 · THE BUNDLE IMPORTS (11 exports)
```
$ bun run /tmp/hotseat-probe.mjs
EXPORTS: GI_TOOL_NAMES,GI_TOOL_NAMES_ALIASES,default,ensureAuditRoot,graphProbeWipeAudited,
         ledgerDirConfined,parseTargetRoots,registerGiOmpTools,settlementLedgerConfined,
         substrateNeedsPopulate,writeWipeAudit
TOOL_NAMES: ["graph-probe","graph-query","bug-hunt","aether-code-audit","gi-consumption","gi-decide"]
```

## 2 · THE TOOL SURFACE REGISTERS (7 tools)
```
$ bun run /tmp/hotseat-live.mjs
★ registerGiOmpTools(pi, cwdOf) RETURNED: ["graph-probe","graph-query","bug-hunt","aether-code-audit","gi-consumption","gi-decide"]
REGISTERED: 7 tools: graph-probe,graph-query,bug-hunt,aether-code-audit,graph-code-audit,gi-consumption,gi-decide
```
`cwdOf` is the INJECTED 2nd parameter (`src/omp/extension.ts:402`) — the runtime provides it; a probe
that omits it fails with `cwdOf is not a function` (a PROBE error, not a defect — adjudicated).

## 3 · gi-consumption EXECUTES LIVE (real data from the deployed artifact)
```
★ gi-consumption LIVE RESULT:
consumed:6/8 rungs=context,decision,knowledge,meaning,settlement GI_LAYER_UNCONSUMED=L4_C2KG,ABIDE
subject=populateSessionStore
L5_CORBELL   CONSUMED  rung=settlement  facts=14
L6_GRAPHIFY  CONSUMED  rung=settlement  facts=8
L4_C2KG      GI_LAYER_UNCONSUMED  rung=context  facts=0
L3_UA        CONSUMED  rung=context  facts=1
L2_ARSUMBRIS CONSUMED  rung=knowledge  facts=50
L1_SEMANTICA CONSUMED  rung=decision  facts=1
```

## 4 · THE NAMED-REFUSAL CONTRACT (loud-fail, live)
```
parseTargetRoots([root])  -> GI_TARGET_ROOTS_INVALID: parseTargetRoots needs a '|'-separated string
substrateNeedsPopulate(…) -> GI_SHARED_PROJECT_STORE: path must include /sessions/{sid24}/store.sqlite
ledgerDirConfined(root)   -> GI_LEDGER_CONFINE_INVALID: needs two string paths
settlementLedgerConfined(root,root) -> {"ok":false,"error":"GI_LEDGER_DENIED: settlement ledger outside the audit target root"}
```
Every malformed call is REFUSED with a NAMED error + the remedy — never a silent wrong answer.

## 5 · THE VERIFYING GATES
| gate | command | reading |
|---|---|---|
| the predicate | `bun scripts/consumption-audit.ts . --gate` | `union=8/8` · PREDICATE PASSED · EXIT-0 |
| the 6L2E suite | `bun test tests/st-gi-6l2e.test.ts` | 30 pass / 0 fail |
| the hotseat suite | `bun test tests/st-gi-v21-hotseat.test.ts` | 12 pass / 0 fail |
| the typecheck | `bunx tsc --noEmit` | EXIT-0 |
| the null guard | `/tmp/c2kg-null-probe/probe.ts` | `NULL_GUARD_OK facts=0` (null AND 42) |
| sha | source vs deployed | `879cbbf80b9d9682` == `879cbbf80b9d9682` |

**THE VERDICT:** the deployed artifact LOADS, REGISTERS its full tool surface, EXECUTES a tool against
the live tree, and honors the loud-fail contract. No silent no-op, no hang, no wrong answer observed.
