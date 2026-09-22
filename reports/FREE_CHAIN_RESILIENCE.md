# THE RESILIENT JUDGE CHAIN — never-fail fallback across every free rung
## muse-on-ZEN · muse-on-GO · poolside-direct · openrouter · nvidia — one dies, fall to the next

**Date:** 2026-09-22 · **Wiring:** `agent_plugin_boilerplates/free-key-pipeline-boilerplate/` · **Consumer:** `ocr` (the code-audit gate) + every agent that needs a judge.
**Measured today:** zen-free WORKS (proven: `RAIL_OK` + an ocr scan `status:success`); openrouter-nemotron WORKS (proven: a live completion); poolside-direct returns `{"error":"usage limit exceeded"}` when the 5/window budget is spent (spacing matters — rapid probes burn it); GO needs the key cycler.

---

# §0 · THE OPERATOR'S LAW

```
"MAKE SURE THE GO/ZEN/POOLSIDE INTELLIGENT FUCKING FALLBACK CHAIN IS WORKING CORRECTLY AND
 PROPERLY FUCKING HARDENED. THIS CAN NEVER FUCKING GO DOWN OR FAIL LIKE THIS!!!
 ONE FUCKING DIES FALL BACK TO THE NEXT!!!"
```
**THE REQUIREMENT: ONE DEAD RUNG IS INVISIBLE TO THE CALLER. The chain falls silently to the next, and the JUDGE always answers.**

---

# §1 · ★ THE FULL RUNG LADDER (all 8, ordered)

```
   #  RUNG                                    PROVIDER      COST   MEASURED TODAY
   ─────────────────────────────────────────────────────────────────────────
   1  muse-spark-1.3-contributor-free         zen (4098)    FREE   ✓ WORKS
   2  muse-spark-1.3-contributor              GO (/zen/go)  PAID   needs the GO cycler
   3  poolside/laguna-s-2.1                   poolside      FREE   5/window budget
   4  poolside/laguna-xs-2.1                  poolside      FREE   5/window budget
   5  poolside/laguna-s-2.1:free              openrouter    FREE   ✓ (a separate pool)
   6  poolside/laguna-xs-2.1:free             openrouter    FREE   ✓ (a separate pool)
   7  nvidia/nemotron-3.5-lightning-30b-a3b   nvidia        FREE   needs NVIDIA_API_KEY
   8  nvidia/nemotron-3.5-lightning:free      openrouter    FREE   ✓ WORKS (proven today)

★ THE ocr SKILL'S CHAIN HAS ONLY 5 RUNGS (1,3,5,4,6). IT OMITS GO-muse (2) + BOTH nvidia
  RUNGS (7,8) — which is why "all five die → BLOCKED" happened. THE FIX IS RUNGS 2, 7, 8.
★ THE ORDER IS BY PREFERENCE: the cheapest-quality-first (muse xhigh), then the strong
  lagunas (high), then the fast nvidias. A rung that dies FALLS; a rung that answers WINS.
```

# §2 · ★ THE NEVER-FAIL STATE MACHINE (per call)

```
   the caller asks the chain for a verdict
              │
              ▼
   ┌──────────────────────┐
   │ THE LIVENESS PROBE   │  is the rung RECENTLY KNOWN GOOD?
   │ (skip the dead ones) │  a rung exiled <45s ago is SKIPPED
   └──────────┬───────────┘
              ▼
   for each rung NOT exiled:
       ├─ the RATE GATE (the rpm-ledger token bucket) — over budget → skip
       ├─ the CALL (with the stall guard: no event 60s = dead)
       ├─ 429 / hard error → record429 (45s exile) → NEXT RUNG
       ├─ degenerate-done → NEXT RUNG
       └─ a real answer → ★ RETURN IT (the caller never knows a rung fell)
              │
              ▼
   ┌──────────────────────────────────────────────────────┐
   │ ★ THE ALL-EXILED ESCAPE: if EVERY rung is exiled,     │
   │   UN-EXILE the oldest and TRY IT ANYWAY.             │
   │   (The anyOk escape — all-gates-closed must still     │
   │   ATTEMPT; a wait is better than a refusal.)          │
   └──────────────────────────────────────────────────────┘
              │
              ▼
   ONLY if every rung truly cannot answer: THE LOUD END (one error, the full shape).
   ★ AND THE LOUD END IS A RESULT THE CALLER CAN ACT ON — never a silent hang.
```

# §3 · ★ THE HARDENING (never go down)

```
THE FAILURE MODE THAT BIT US (today): the 4098 adapter was NOT RUNNING → the whole chain's
rung 1 was dead → ocr reported BLOCKED → the ship proceeded.

THE FIX — THREE HARDENING LAYERS:

  LAYER 1 · THE PROCESS IS SUPERVISED
    a systemd --user unit for the adapter (currently a bare hub start — it died
    with a reboot). Restart=always survives everything. Same for the proxy (:4097).

  LAYER 2 · THE CALLER PROBES BEFORE IT TRUSTS
    before any judge call, the chain HEALTH-CHECKS rung 1 (curl the adapter).
    if dead → START IT → re-probe. Only then call.
    ★ NEVER "the rail is refused, ship anyway". A dead rung is a TASK.

  LAYER 3 · THE CHAIN ITSELF IS THE SAFETY NET
    even if rung 1 dies, rungs 2-8 answer. THE JUDGE NEVER FAILS.
    ★ THIS IS WHY THE LADDER MUST CARRY ALL 8 — a 5-rung chain has a cliff.
```

# §4 · ★ THE WIRING CHANGES (the exact edits)

## 4.1 · THE ocr CONFIG (`~/.opencodereview/config.json`)

```
★ ADD THE 3 MISSING RUNGS to `custom_providers` (the ocr skill's chain omits them):
  "poolside-laguna-s":           ✓ present (direct, wire id poolside/laguna-s-2.1)
  "poolside-laguna-xs":          ✓ present
  "openrouter-laguna-s-free":    ✓ present
  "openrouter-laguna-xs-free":   ✓ present
  "muse-free":                   ✓ present (4098 adapter)
  ── MISSING ──
  "opencode-go-muse":            { url: http://127.0.0.1:4097/zen/go/v1, api_key_cmd: go-key.sh,
                                   model: muse-spark-1.3-contributor }
  "nvidia-nemotron":             { url: https://integrate.api.nvidia.com/v1,
                                   api_key_cmd: nvidia-key.sh, model: nvidia/nemotron-3.5-lightning-30b-a3b }
  "openrouter-nemotron-free":    { url: https://openrouter.ai/api/v1,
                                   api_key_cmd: openrouter-key.sh, model: nvidia/nemotron-3.5-lightning:free }
```

## 4.2 · ★ THE CHAIN RUNNER (the never-fail wrapper)

**THE PROBLEM: `ocr` has NO auto-fallback (the skill says so). The chain is walked by HAND — and the skill's 5-rung list has a cliff. THE FIX: a wrapper script that walks ALL 8 rungs and reports the first PASS.**

```bash
#!/usr/bin/env bash
# ocr-chain — walk every judge rung; the first that returns JSON wins. Never fail on a dead rung.
set -uo pipefail
RUNGS=(muse-free opencode-go-muse poolside-laguna-s poolside-laguna-xs \
       openrouter-laguna-s-free openrouter-laguna-xs-free nvidia-nemotron openrouter-nemotron-free)
for provider in "${RUNGS[@]}"; do
  echo "[ocr-chain] trying $provider" >&2
  out=$(timeout 900 ocr review --provider "$provider" --effort high --format json 2>/dev/null)
  if printf '%s' "$out" | grep -qE '"status"\s*:\s*"(complete|partial|success)"'; then
    printf '%s' "$out"                     # ★ the winner
    echo "[ocr-chain] SERVED BY $provider" >&2
    exit 0
  fi
  echo "[ocr-chain] $provider failed → next" >&2
done
echo "[ocr-chain] ALL RUNGS DEAD — BLOCKED" >&2
exit 1
```
**★ THE RUBRIC: NEVER stop at the first rung. A dead rung is a skip, not a verdict.**

## 4.3 · ★ THE RUNG-1 PREFLIGHT (the fix for today's outage)

```bash
# BEFORE the chain: ensure rung 1's adapter is up (the exact failure that bit us).
if ! curl -sf -m 3 -o /dev/null http://127.0.0.1:4098/zen/v1/models; then
  echo "[ocr-chain] rung 1 adapter DOWN — starting it" >&2
  systemctl --user start zen-free-adapter.service 2>/dev/null \
    || hub start zen-free-adapter ready:{port:4098}
  sleep 2
fi
```
**★ A DEAD RUNG IS A TASK, NOT A VERDICT. The chain ensures its rung 1 before it calls.**

## 4.4 · THE HEALTH PROBE (the verification)

```bash
# each rung answers? (the ladder test — run before trusting the chain)
K=$(bash ~/.omp/agent/bin/poolside-key.sh)
curl -s -m 20 -o /dev/null -w "poolside-s: %{http_code}\n" -X POST https://inference.poolside.ai/v1/chat/completions \
  -H "Authorization: Bearer $K" -H 'Content-Type: application/json' \
  -d '{"model":"poolside/laguna-s-2.1","messages":[{"role":"user","content":"ok"}],"max_tokens":5}'
# 200 = healthy · 429 = the 5/window budget is spent (SPACING — do not hammer)
```

# §5 · ★ THE PER-RUNG BUDGETS (why "infinite" 429s still happen)

```
★ THE OPERATOR'S LAW: "both infinite usage, only on 5/24 rate limit".
★ THE MECHANISM: the limit is a RATE, not an amount. It resets; it never runs out.
  BUT RAPID PROBES BURN THE WINDOW — 5 quick calls exhaust it and the 6th 429s.
★ THE FIX: THE TOKEN-BUCKET GATE (already in the boilerplate: `rpm-ledger.ts`).
  Client-side, before the call: one call per window per rung. NO retry storms.
THE PROFILES (the boilerplate's measured values):
  zen      200/min  · nvidia  40/min  · openrouter 20/min  · poolside  5/window
★ THE WAVE-DEFECT (measured in one incident): 7 agents' first calls in one 40ms window
  → the 429 storm → 178/191 calls on the free rung → a 1596s wall.
  THE LEDGER EXISTS TO PREVENT EXACTLY THIS. ENABLE IT.
```

# §6 · THE ACCEPTANCE (what "hardened" means)

```
[ ] the adapter runs as a systemd unit (Restart=always), NOT a bare hub start
[ ] the chain carries ALL 8 rungs (a 5-rung chain has a cliff)
[ ] the rung-1 preflight ensures the adapter before the call
[ ] the token-bucket ledger gates every rung (no retry storms)
[ ] THE ADVERSARIAL PROOF: kill rung 1 → the chain still answers (via rung 3-8)
[ ] THE ADVERSARIAL PROOF: kill rungs 1-5 → the chain answers via rung 8 (openrouter nemotron)
[ ] a rung 429 → 45s exile → the NEXT rung answers, silently
[ ] the LOUD END only fires when ALL 8 truly cannot answer, and it names each rung's error
★ A CHAIN THAT HAS NEVER BEEN TESTED WITH A DEAD RUNG IS NOT HARDENED. Kill rungs and prove it.
```

# §7 · THE HONEST RESIDUAL

```
MEASURED WORKING TODAY:  zen-free (rung 1, the RAIL_OK proof + the ocr scan) ·
                         openrouter nemotron (rung 8, a live completion) · both keys present
MEASURED 429 (not dead): poolside direct + openrouter laguna — the RATE window, not the account.
                         The operator confirms they are functional at 5/window. SPACING + the
                         token-bucket ledger is the fix, not a key change.
ABSENT (needs a key):    rung 2 (GO) needs the go-key cycler · rung 7 (nvidia) needs NVIDIA_API_KEY
THE FRONTIER:            the wrapper script (§4.2) + the preflight (§4.3) + the systemd unit (§3)
                         for the adapter do not exist yet. They are 3 files.
```
