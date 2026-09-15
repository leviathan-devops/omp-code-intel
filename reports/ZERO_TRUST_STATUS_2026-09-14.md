# GI-OMP — ZERO-TRUST STATUS REPORT — 2026-09-14 (final, post-CT-port)

**Scope:** GI-OMP product tree + OMP container infrastructure + bug-hunter port readiness + corbell/graphify forensics.
**Method:** first-hand reads this turn; every claim re-checked or labeled. Verdicts: PROVEN (re-run/cited this turn) / STALE (predates current code) / UNVERIFIED / REFUTED.
**Artifacts:** `.omp/BASELINE-2026-09-14.json`, `.omp/accuracy-store-v11.sqlite`, `context_management/RUNNING_BUILD_LOG.md`, scout payloads `agent://En38GraphifyAbsorb`, `agent://ParagonCacheAbsorb`, `agent://BugHunterBibles`.

---

## A. CONTAINER INFRASTRUCTURE — mimo CT parity port (SHIPPED, E2E PROVEN)

### What was wrong (the operator's question, answered)

OMP containers were spawned by `container-testing.ts` setup with `docker run … sleep infinity` + tmux + pipe-pane + bare `omp` launch. That is ALL it did. Compared to the mimo engine (`/home/leviathan/OPENCODE_WORKSPACE/.mimocode/ct/mimo-ct-engine.ts`, 864 lines):

| Step | mimo-ct engine | OMP (before) | OMP (now) |
|---|---|---|---|
| Auth provisioning | live-key into vault via 600-mode temp + docker cp | NOTHING (relied on image bake) | NATIVE PROVISION: openrouter credential inserted into omp vault from the image's own auth store + revision bump |
| Model pin | "image config decides the model; tool never injects --model" | NOTHING (baked config: zhipu default; grok smol dead) | modelRoles.default+smol pinned to openrouter laguna free at setup |
| Adopt | `adopt=true` skips rm+run (preserves in-container state) | none (always rm+run) | PORTED |
| Trust dialog | Enter when "trust this folder" renders | none (TUI could stall on it) | PORTED |
| Status bar wait | waitForStatusBar 15×1s, returned in result | none | PORTED (setup returns `bar:` line) |
| pipe-pane | 5-attempt retry + stream reset | single attempt, no reset | PORTED |
| docker.sock | `-v /var/run/docker.sock` for nested builds | none | PORTED (host-socket conditional) |
| Key-binding law (§12) | per-container key pin; `key_binding_broken` loud | N/A (no key pool wired) | open — needs operator key decision |

### Where omp hides its auth (the discovery chain, all read this turn)

- `omp auth-broker import` = CLIProxy OAuth ONLY (access_token/refresh_token); refuses API keys ("missing access_token or refresh_token" — verbatim).
- The real vault: `/root/.omp/agent/agent.db` → `auth_credentials (provider, credential_type, data, identity_key)`; API keys = `credential_type='api_key'`, `data={"key":…,"source":"login"}`; `auth_change_revision` row must bump.
- Env fallback works too: `OPENROUTER_API_KEY=… omp models openrouter` → 525 models (PROVEN).
- **The plan-supplied key source:** the image's baked `/root/.local/share/opencode/auth.json` carries `{nvidia, openrouter, opencode-go}` — the operator's named source; read in-container, never printed.

### E2E evidence

- w7 TUI welcome: `Laguna S 2.1 (fr…` / `openrouter`; status bar `π > ◒ Laguna S 2.1 (free) > … ▶─6%─┃262K─`
- w7 serve: `omp -p "Reply with exactly: LAGUNA_LIVE_OK"` → `LAGUNA_LIVE_OK` (6.0s)
- **Fresh container gi-omp-w8** (never booted omp, no ~/.omp): exact shipped payload → `PROVISION openrouter-credential:inserted model:roles-created`; config.yml = laguna default; `omp models openrouter` 525 env-free; `omp -p` → `W8_LAGUNA_OK` (6.8s)
- Found+dixed during test: fresh containers lack `/root/.omp/agent/` → `os.makedirs` + CREATE-IF-NOT-EXISTS schema bootstrap added; re-test green.

Dists: GI `34b9d7df93f9429d8b399` / trident `b98b0ace7055a80eb61f3` — deployed host + w7.

---

## B. "FULL GI FUNCTIONALITY MAP" — EXACT SITUATIONS (provenance per row)

| Capability | Exact situation it was used in | Evidence (verbatim) |
|---|---|---|
| populate | 238-file live-tree index into session store; hardened through 11 iterations | `POPULATE {files:238,nodes:2035,edges:1857}` + `dangling: 0`; 24.6s→0.5s after R2 batch |
| parser recall | `parseExports` recall measurement over the same tree | `0.366` → `1.000` (1637 nodes, 0 missed) |
| who-calls | TUI: `graph-query verb=who-calls target=runQuery` (v6/v12/v13 stores); host P/R vs ripwire | TUI `rows=6` (supremacy-brief.ts, likec4-drift.ts, detectR17Drift, query-registration.ts, runQueryTool, tools/graph-query.ts); MACRO-P 0.523/R 0.568; fn-only 0.982/0.568 |
| blast-radius | TUI: `verb=blast-radius target=openStore`; SQL cross-check in-container | `rows=135 root=openStore depth=6` (14 stream occurrences) |
| would-break | host factory call with proposed signature | `callers=17 argsUnknown=true` (honest; no per-call metadata) |
| chain (R5) | TUI v13 + ST: `verb=chain from=runQueryTool to=runQuery` | TUI `rows=1`; ST `rows=1` runQueryTool→runQuery |
| unwired (R5) | host: `verb=unwired` on frozen v11 store | `rows=1259` |
| bug-hunt status (R6) | TUI v13: `bug-hunt action=status` | `state=done findingsCount=1183 fixOrderCount=20`; stub never fired |
| graph-probe | TUI both containers; wipe-refusal adversarial | `PROBE_TOOL_OK` + sessionID; `GI_CLEAR_REFUSED` (registry held 3 rows) |
| gate OFF/STEER/FULL | dual-container TUI (v1) + host ST (v2) | `GRAPH_GATE_SIGNATURE_BREAK` / `[GATE STEER]` / `GATE_TOKENS_ABSENT` |
| GI_SCOPE_REFUSED | TUI cross-session open | tool result `GI_SCOPE_REFUSED` |
| storage corruption | TUI after store overwrite | `GI_STORE_CORRUPT` |
| QUERY_INVALID | TUI bad verb | `QUERY_INVALID` MATCH@1039747 |
| EN-38 guard | ST 129MiB + under-budget | `GRAPHIFY_GRAPH_TOO_LARGE` throw; under-budget parses |
| cwd-class bug | found in TUI (`GI_QUERY_FAIL: ReferenceError: cwd is not defined` ×9) → fixed → re-proven | fixed at extension.ts:83; post-fix `rows=6`, zero new hits |
| graph-code-audit | renamed this turn; still honest stub | `GI_AUDIT_NOT_WIRED` |
| extension on host | boot log + models cmd | `[gi-omp] registered graph-probe, graph-query, bug-hunt, graph-code-audit` (next session), `[code-retrieval] registered ripwire, opengrok` |

Honest labels on the same map: macro-P 0.523 all-label **dilutes by unit** (file-node import-site labels vs ripwire's fn names) — the fn-only P 0.982 shows the edge attribution is near-exact where units match; recall 0.568 = method/constructor sites = the STILL-OPEN parity defect (see D). `chain`/`unwired`/`hunt-status` are LIVE; `graph-code-audit` is a stub by scope; corbell is NOT in the OMP loop.

---

## C. CORBELL + GRAPHIFY — what is actually wrong (scout forensics)

**corbell (ParagonCacheAbsorb: A1–A12, all VERIFIED in checkpoint src):**
- A1 `corbell init` template clobber → guard + profile-derived config (corbell-adapter.ts:253-302)
- **A2 = the exact bug hit live this week:** "repo-dot scans 0 … `repo: ./live-tree` vs `../live-tree` → RELATIVE-ROOT emit `root: ..`, `repo: ..`" (:375-403). The canonical adapter AUTO-EMITS a correct workspace.yaml; hand-written config is the failure mode.
- **A3 = hit live:** "version int fails pydantic → emit version 1 quoted" (:393)
- **A4 = hit live:** "Tree-sitter misleading, 0 files → scaffolding-only GRAPH_EMPTY ZERO code nodes … false-clean" (:347-360). The banner is a detector artifact; the real state was 0 files scanned. Our corrected build proved it: 1949 methods / 9387 edges / 41.4s.
- A5 scope: whole-tree vs src (excludes Checkpoints etc.) — our 238-file run (1949 methods) matches the expected shape.
- A10 BUSY/orphans → exec-space + 8× backoff + WARM SKIP.

**graphify (En38GraphifyAbsorb: G1–G21):** G1 = the OOM (sync whole-file JSON.parse, no guard) → the EN-38 fix (128MiB stat-guard + 8MiB yield + loud `GRAPHIFY_GRAPH_TOO_LARGE`) — **both halves now ported to OMP** (`parseGraphJsonGuarded` + `parseGraphJsonGuardedAsync`, ST 2/2). G7 lifecycle, G10/G11 referential closure (our 0-dangling + file-qualified ids already satisfy), G12/G15 loud counts, G4 cache-tree excludes (next: add graphify-out/corbell-data/MASTER_CONTEXT/Checkpoints to populate excludes).
**G21 (the load-bearing one):** `whoCalls includes awaits edges and returns raw ids … NO FIX in checkpoint — still present` → "the checkpoint DELIBERATELY leaves this open, which is exactly why OMP still shows it… needs a NEW fix, not a port." Our 0.568 recall gap is that defect's descendant.

---

## D. BUG HUNTER — specs absorbed; port plan (BugHunterBibles)

23-step ordered plan (scout, cross-verified against fork file:line): profile-schema→loader→typed-DDL→adapter-shim→rule-card→templates→compiler→compiled-store→findings-store→engine→calibration→recon→map(legacy-only)→scan→trace(legacy-only)→strike→report→micro-loop+bug-hunt→query-tool 7-verb→firewalls→bus+warhead→lsp→report-writer(local). EXCLUDE: corbell-CLI, ix, embeddings, mcp/ui/docs, likec4, extraction/l6, semantic-predicates/cypher, auditor, native-ast. Proof criteria: 1md+1binding hunt → runId→MAP→SCAN→TRACE→STRIKE→REPORT md+HUNT_DONE, verbs read store, re-hunt same ids (K20.3). Status: **plan complete; NOT executed** (that's the next build wave).

## E. TOOL FUNCTIONING (operator-mandated report)

- **ripwire (native tool):** VALIDATION-REFUSED pre-transport in ALL 3 scouts — `Validation failed for tool "ripwire": - i: i must be concise intent (was missing)` despite `i` supplied. NOT `RIPWIRE_MISSING` (binary fine; CLI works — used for all ground truth). Root cause: wrapper REQUIRED `i`. **FIXED** (i→optional in both JS copies + both TS sources; `node --check` OK both). Effective next OMP session.
- **opengrok (native tool):** same validation refusal. REST probe: `/api/v1/system/ping` **200**, `/api/v1/search?full=…` **200 ANONYMOUS**, `/api/v1/projects` **401** and `/api/v1/configuration` **401** — the scouts tested only the 401 metadata endpoint and reported "auth-gated". Search (the primary op) works. Token file `etc/webapp_api_token` exists (65B, uid-1111, 0600) but is unreadable by the host user; `OPENGROK_TOKEN` unset. One source twin (`opengrok/projects/code-retrieval/index.ts`) is container-owned and NOT writable by the host user — patched the three writable copies; that twin needs a chmod/chown pass.
- Both failures were loud and named — no silent fallback occurred; ground truth came from grep+read as reported.

## F. CLAIM AUDIT (this report)

| Claim | Evidence | Verdict |
|---|---|---|
| CT native port shipped | source read + builds + E2E w8 | PROVEN |
| laguna default live | w7 screenshot + 2 serve proofs | PROVEN |
| graph-code-audit rename | src grep + bundle grep + ST | PROVEN |
| i-optional fix | `node --check` + grep 4 files | PROVEN (3/4; 1 blocked by perms) |
| EN-38 yield + guard | source read + ST 2/2 | PROVEN |
| corbell/graphify fixes exist in checkpoints | scout file:line, verbatim tokens | PROVEN (read-cited) |
| G21 = our 0.568 ancestor | scout conclusion + our measurements | VERIFIED-WITH-CAVEATS (lineage inferred, flagged) |
| bug hunter port plan | scout inventory vs fork | VERIFIED (plan; not executed) |
| whole-battery green | last runs: fast 25/25 + populate 4/4 | STALE (predates today's edits; re-run pending) |

## G. RISKS / OPEN

1. **Re-run the full ST battery** post-edits (fast + populate) — last green run predates the yield/rename/CT changes.
2. **G21 fix** (who-calls id-space: calls-vs-awaits decision, method-site resolution, name resolution, chain bound) — the real recall lever; new work, no port.
3. **Key-pool wiring** (§12 pin-per-session) needs operator key decision; container currently rides the image-baked openrouter key.
4. **opengrok token** — fill/derive for the 401 endpoints OR accept search-only.
5. **`opengrok/projects/code-retrieval/index.ts` twin** — chmod/chown to finish the i-fix across all four files.
6. **OMP session reload** for the native-tool fixes to take effect.
7. Checkpoint-vs-live: our GG-BUG-2 parser came from the fork (v1.4.3), NOT the checkpoint (grep-verified absent there) — do not "re-port" it.
