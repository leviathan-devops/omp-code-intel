# THE GI KERNEL CLEANUP PLAN
## 7 of 8 systems are garbage. What to DELETE, what to KEEP, what to REBUILD.

**Date:** 2026-09-22 · **Baseline:** `jarvis/gi-main` @ `13fe056` · **Measured:** corbell is INSTALLED but unused; 6 of 8 systems are ABSENT from PATH; 12 of 23 kernel modules are unreachable; the store describes the WRONG TREE.
**Companion:** `GI_kernel_v21_SIX_ITEM_AUDIT.md` (the evidence) · `FREE_CHAIN_RESILIENCE.md` (the sibling fix).

---

# §0 · THE VERDICT (one screen)

```
THE PROJECT, GRADED:   the MACHINERY is sound (362 tests, a working write/edit gate).
                       THE INTELLIGENCE — the entire point — IS GARBAGE.
★ OF THE 8 SYSTEMS (6 graph layers + 2 enforcement kernels): 1 PARTIALLY WORKS.
    L6 graphify   PARTIAL  — the store exists (15 MB graph.json), but describes src/hunter
                             (the PRE-V2 tree); 851 of 1266 nodes are the wrong tree.
    L5 corbell    INSTALLED, UNUSED — /home/leviathan/.local/bin/corbell EXISTS. The spec
                             named it the PRIMARY macro layer. It is wired to NOTHING.
    L1 semantica  ABSENT   — not on PATH. (The MCP server exists; the CLI does not.)
    L2 arsumbris  ABSENT   — not on PATH.
    L3 underst-any ABSENT  — not on PATH.
    L4 c2kg       ABSENT   — not on PATH.
    TSG           ABSENT   — interface-only; no LoadUnit impl.
    Abide         ABSENT   — not on PATH; 10.3% Jev call rate.
★ 7 OF 8 = GARBAGE. THE OPERATOR IS RIGHT.
```

# §1 · ★ THE PER-SYSTEM DISPOSITION (delete · keep · rebuild)

| # | System | The measured state | THE DISPOSITION | Why |
|---|---|---|---|---|
| **L6 graphify** | 15 MB graph.json; 851/1266 nodes = src/hunter (wrong tree) | ★ **REBUILD THE STORE, KEEP THE TOOL** | the extractor works; the SCOPE is wrong. Re-populate from the LIVE tree. |
| **L5 corbell** | INSTALLED at `~/.local/bin/corbell`, wired to NOTHING | ★ **WIRE IT (or delete it)** | the spec's PRIMARY macro layer, ignored. Wire it or stop claiming it. |
| **L1 semantica** | MCP server present; CLI absent; 0 callers | ★ **DELETE THE CLAIM, KEEP THE MCP** | it cannot be a "decision layer" with 0 callers. Either wire the MCP or drop the layer. |
| **L2 arsumbris** | absent from PATH | ★ **DELETE** | there is no L2. Remove it from every doc. |
| **L3 understand-any** | absent from PATH | ★ **DELETE** | there is no L3. Remove it. |
| **L4 c2kg** | absent from PATH | ★ **DELETE** | there is no L4. Remove it. |
| **TSG** | interface-only, no impl | ★ **DELETE (park the design)** | a load unit with no implementation is a doc, not a system. |
| **Abide (L1 Jev)** | absent from PATH; 10.3% call rate | ★ **DELETE or REPLACE** | a judge that skips 9 of 10 calls is not enforcing. |
| **the 6-layer CLAIM** | "the 6-layer graph stack" | ★ **CUT TO 2 (corbell + graphify)** | a 6-layer stack with 1 layer is a lie. Claim 2. |

# §2 · ★ THE DELETION LIST (the exact files/dirs)

```
DELETE (the accretion — 62% of the commits were repairing this):
  · the 12 UNREACHABLE kernel modules (measured: dead roots) — 4,000+ lines:
      src/omp/enforcement.ts · kernel-v2.ts · fire-gate.ts · fire-ledger.ts · oracle.ts ·
      policy-store.ts · calibration.ts · rsi.ts · graph-facts.ts · evidence-producer.ts ·
      hard-deps.ts · jev.ts
    ★ OR: wire them. THERE IS NO THIRD OPTION. A module nothing imports is DELETED or WIRED.
  · the 29 DOCS COMMITS' output that describes the unbuilt (the operators manual's banned
    pattern documented AS a feature; the "12-verb false ceiling")
  · the Checkpoints/ tree from the GRAPH (71.6% of the graph is dead copies) — exclude
    Checkpoints/ from every populate
  · the phantom file names (st-gi-v2.1-firegate.test.ts — never existed; the spec carried it)

KEEP:
  · src/omp/extension.ts · gate-hook.ts · gate-middleware.ts · graph-gate.ts · typed-write.ts ·
    store-open.ts · gi-registry.ts · populate*.ts · ripwire-bridge.ts   (the 11 REACHABLE)
  · tests/ (the 362 — but re-subject them: T1 LIVE-SUBJECT LAW)
  · packages/gi-kernel-v2.1/ (the spec — but TRIM it to what is buildable)
  · the 3 autopsies + the 5 new docs (the honest record)
```

# §3 · ★ THE REBUILD (the ONE thing that matters)

```
THE THESIS: the graph must SERVE THE LIVE CODE. Everything else is secondary.

THE 5-WAVE REBUILD (dependency-ordered):

  W0 · ★ REBUILD THE STORE FROM THE LIVE TREE
       delete graphify-out; populate from <repo>/src (NOT the worktree's src/hunter);
       exclude Checkpoints/; verify: oracle.ts/fire-gate.ts/fire-ledger.ts have nodes.
       GATE: `SELECT COUNT(*) WHERE file LIKE '%oracle.ts%'` > 0
       ★ WITHOUT THIS, EVERY OTHER GATE ANSWERS ABOUT THE WRONG CODE.

  W1 · ★ WIRE CORBELL (the installed-but-unused macro layer)
       corbell is at ~/.local/bin/corbell. Wire it as the L1 substrate (or delete the claim).
       GATE: `graph-query` answers a macro-layer question from corbell.

  W2 · ★ THE SCOPE GATE (GT-2) — the empty-vs-wrong-scope fix
       graph-query returns GI_STORE_SCOPE_MISMATCH, never rows=0, for an out-of-tree target.
       GATE: a query for a symbol outside the store → GI_STORE_SCOPE_MISMATCH
       ★ THIS ONE CHANGE PREVENTS F-66..F-69 (7 derailments).

  W3 · ★ THE FRESHNESS GATE (GT-3) — a stale store is DOWN
       storeFreshness runs on every query; populated_at < newest source mtime → GI_STORE_STALE.
       GATE: a store older than a source edit → GI_STORE_STALE

  W4 · ★ THE AUDIT GATE (GT-1) — the completion sink closes
       pi.on("tool_call") on goal(op=complete) → read the ledger → block unless PASS.
       GATE: a goal(complete) with a FAIL ledger → block:true
       ★ + WIRE THE CHAIN (§FREE_CHAIN_RESILIENCE) so the audit always runs.

  W5 · CUT THE CLAIM TO 2 LAYERS + DELETE THE 6 ABSENT
       the docs say "corbell + graphify" (2 layers). The other 4 + TSG + Abide move to
       PROPOSED (a roadmap), never "shipped".

★ W0 IS FIRST — every other gate reads the store. A gate over the wrong tree proves nothing.
```

# §4 · ★ THE STOP-THE-BLEEDING (do this FIRST — 30 minutes)

```
BEFORE the rebuild, STOP THE THING THAT KEEPS HAPPENING:

  1 MARK THE BROKEN STATE HONESTLY — the docs currently claim a 6-layer stack. Rewrite the
    banner: "1 of 6 layers populated; the graph describes a pre-V2 tree; the gate has never
    armed." (An honest broken banner beats a dishonest working one.)
  2 EXCLUDE Checkpoints/ FROM THE GRAPH — stops the 71.6% archive pollution at the source.
  3 STOP THE GRAPH-GATE DRIFT MESSAGES — the gate fired ONCE and misreports its count ("1
    structural edits" vs the n>=3 that fired). Either fix the message or disable the drift
    layer until W2/W3 land. A gate that fires 1x in 40k lines policing the agent is noise.
  4 REBUILD + REDEPLOY THE BUNDLE (21-35h stale — every fix is unloaded).
  5 ★ WIRE THE CHAIN (the sibling doc) so the audit gate NEVER blocks on a dead rung.
```

# §5 · ★ THE HONEST CEILING

```
WHAT SURVIVES THE CLEANUP:  a WORKING 2-layer graph intelligence (corbell macro + graphify
                            micro), serving the LIVE tree, with the scope + freshness + audit
                            gates armed — roughly 150 lines of NEW code and 4,000 lines of
                            DELETED accretion.
WHAT DOES NOT:              the 6-layer stack is a 2-layer stack. The 8 systems are 2 systems
                            + a roadmap. THE HONEST CLAIM IS SMALLER AND REAL.
★ THE CHOICE: BUILD A 2-LAYER GRAPH THAT WORKS, OR KEEP DESCRIBING 8 THAT DO NOT.
  Every measured fact says the second is what has been happening for 7 days.
```

# §6 · THE WAVE SEQUENCE (the board)

| Wave | Deliverable | The files | The gate |
|---|---|---|---|
| W-STOP | the honest banner + Checkpoints excluded + the bundle rebuilt | the docs + populate + the dist | the bundle sha == the source build |
| W0 | the store rebuilt from the LIVE tree | populate-graphify.ts + the store | oracle.ts has nodes |
| W1 | corbell wired (or the claim deleted) | gi-registry.ts + populate-corbell.ts | a macro query answers |
| W2 | the scope gate | typed-write.ts | GI_STORE_SCOPE_MISMATCH |
| W3 | the freshness gate | typed-write.ts | GI_STORE_STALE |
| W4 | the audit gate + the chain | extension.ts + ocr-chain.sh | a goal(complete) blocks on FAIL |
| W5 | the claim cut to 2 layers | the docs | the banner says 2 |

# §7 · THE HONEST RESIDUAL

```
WHAT THIS PLAN IS:   the decision — what to delete, keep, rebuild — grounded in the 6-desk audit.
WHAT IS NOT DONE:    nothing is executed. NO CODE (the standing order).
THE FIRST ACTION:    W-STOP (30 min): the honest banner + the Checkpoints exclusion + the rebuild.
★ AND THE SIBLING:   the chain (FREE_CHAIN_RESILIENCE.md) must land with W4 — the audit gate
                     is worthless if its rail is dead, which is EXACTLY what happened today.
```
