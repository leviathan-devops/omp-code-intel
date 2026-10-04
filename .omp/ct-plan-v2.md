# THE CONTAINER TEST PLAN v2 — GI V2.3 (THE ADVERSARIAL SUITE)
Written BEFORE any interaction. The adversarial cases run FIRST; the happy path is LAST.

## 1. OBJECTIVE
Prove the GI V2.3 deliverable WORKS inside the container across its whole decision surface —
the LSP server's contract AND the OMP runtime's consumption — by attacking it with the FULL
evasion/edge/boundary corpus and requiring a SPECIFIC token in a TOOL RESULT for every case.
A case without its token is UNOBSERVED, never PASS.

## 2. TOOLS UNDER TEST (every changed file + its consumer)
- scripts/gi-lsp.ts (the stdio LSP server — the V2.3 surface)
- src/gi-lsp/cards.ts (the 5 card renderers)
- src/hunter/firewall/readonly.ts (the W6 firewall — 9 fixes this session)
- src/hunter/graph/{corbell-adapter,mechanical}.ts (the desks' + the scope-law/constructor fixes)
- src/hunter/diagnostics/{engine,semantic-predicates}.ts (S5 skip law + the infra-throw)
- src/hunter/harness/hunt-lock.ts (the fail-CLOSED probe)
- src/hunter/shared/db.ts + src/hunter/hooks/bus-hook.ts (the desks' store/bus family)
- the OMP runtime's write path (the edit -> the LSP query)

## 3. THE TEST SCENARIOS (adversarial FIRST, then the edge, then the happy path)

### PART A — THE LSP'S OWN SURFACE (a stdio client INSIDE the container, the REAL store)
A1 [ADVERSARIAL] THE BROKEN STORE: move the store away, then didOpen a .ts -> the server MUST
   emit a NAMED refusal (GI_NO_STORE / a scope-named diagnostic), NEVER a silent clean.
   passToken: `GI_NO_STORE` or `[gi-lsp/scope]` ; failToken: a silent zero-diagnostic reply.
A2 [ADVERSARIAL] THE FOREIGN STORE: a store whose build_root is a DIFFERENT tree -> the scope
   assertion MUST name the mismatch. passToken: `scope mismatch` ; failToken: a silent clean.
A3 [ADVERSARIAL] THE DOC-ONLY EDIT: didOpen a .md -> the server MUST be SILENT (0 diagnostics).
   passToken: `DIAGNOSTICS COUNT: 0` ; failToken: any [gi-lsp/ diagnostic on a .md.
A4 [ADVERSARIAL] THE MALFORMED URI + THE NONEXISTENT FILE: didOpen with a garbage URI and a
   path that does not exist -> NO crash, the server answers the NEXT request.
   passToken: `ALIVE AFTER MALFORMED` ; failToken: a crash / no reply.
A5 [ADVERSARIAL] THE RAPID BURST: 50 didChange cycles -> the server survives + the LAST reply
   arrives. passToken: `BURST OK` ; failToken: a timeout.
A6 [EDGE] THE HUGE FILE: a 10k-line .ts -> bounded (a reply within the budget), no hang.
   passToken: `HUGE OK` ; failToken: a timeout.
A7 [HAPPY PATH, LAST] THE REFLEX POSITIVE: didOpen a real repo .ts -> >=1 [gi-lsp/*] diagnostic
   with a file:line anchor. passToken: `[gi-lsp/` ; failToken: zero diagnostics.

### PART B — THE RUNTIME'S CONSUMPTION (the OMP TUI, the REAL write path)
B1 [ADVERSARIAL] THE BROKEN STORE IN THE RUNTIME: with the store moved away, drive a write ->
   the runtime's diagnostics MUST carry the named refusal, never silence-as-pass.
   passToken: `[gi-lsp/` ; failToken: no diagnostics reported.
B2 [ADVERSARIAL] THE DOC EDIT IN THE RUNTIME: drive a .md write -> NO gi-lsp diagnostic (the
   skip law). passToken: `no GI diagnostics` ; failToken: a [gi-lsp/ diagnostic on the .md.
B3 [HAPPY PATH] THE REFLEX: restore the store, drive a .ts write -> the runtime spawns the LSP
   and the GI diagnostics arrive with NO agent action.
   passToken: `diagnostics arrived after the edit returned` ; failToken: no spawn / no diagnostics.

## 4. THE AUTH PROBE (D.1, FIRST)
A model-backed turn must succeed before any verdict: the TUI answers a trivial prompt AND the
agent executes a tool call. passToken: a tool call in the session JSONL ; failToken: a 4xx/5xx.

## 5. THE EVIDENCE (the channels)
- the container's exec stdout (the harness's PASS/FAIL table)
- the OMP session JSONL (the runtime's own record: the tool calls + the diagnostics text)
- ps (the LSP child under the runtime)
- .omp/container-test-results.json (the per-scenario record + the overall verdict)

## 6. PASS CRITERIA (the Phase E circuit breaker — ALL must hold)
1. the SHA: the mounted tree's dist sha == the host's (one codebase)
2. the auth probe succeeded
3. EVERY scenario above executed (none skipped)
4. EVERY passToken matched IN A TOOL RESULT; EVERY failToken ABSENT
5. no circular passes (no token from agent prose)
6. no timeouts
7. the blast radius covered (every changed file has a covering scenario)
8. the adversarial cases behaved (each with its specific token)
9. the container alive at the end
10. the results artifact written
ZERO confirmed defects OR every defect listed with its mechanism + a fix + a retest.
