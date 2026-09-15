# GI OVERNIGHT AUTORESEARCH LOOP — 2026-09-14 (8h, same-session + log)

Operator scope: "everything". Wake: keep current session + log.

## FROZEN BASELINE (the numbers to beat)
- Source: `.omp/BASELINE-2026-09-14.json` + `/tmp/gi-accuracy-store.sqlite`
- Parser recall 1.000 (1637 nodes, 0 missed) — DO NOT REGRESS
- Populate 238 files: 2035 nodes / 1857 edges / 0 dangling dst
- who-calls macro-P 0.523 / macro-R 0.568 (8 symbols vs ripwire --callers)
- Query p50 0.2ms; populate ~8.6-12s host (3890 open-close cycles = bottleneck)
- ST 22/22 + populate ST 4/4 (needs --timeout 120000)
- Container: gi-omp-w7 alive (zhipu GLM-5.3-Flash), study tree staged, who-calls rows=6 proven, blast rows token PENDING

## LOOP ROUNDS (each: change -> ST -> host accuracy -> container TUI -> log)
1. R1: redeploy v11 dists to gi-omp-w7, re-run blast-radius openStore TUI (close PENDING)
2. R2: batch-insert populate (single connection per pass) — target populate <3s, counts frozen
3. R3: method/constructor call-site attribution (obj.foo( / this.foo() — ripwire FN class
4. R4: line numbers on nodes (declaration line) — fork schema parity
5. R5: chain verb port (fork BFS, MAX_DEPTH 64) + unwired verb port (NOT EXISTS query)
6. R6: bug-hunt status read (findings count over session store, read-only)
7. R7: file-vs-fn dual-label who-calls (report both; P/R on fn labels)
8. R8: full re-baseline + report

## LAWS
- Every round: ST 22/22 (+populate 4/4) BEFORE container deploy. Zero regressions or revert.
- Every accuracy claim: macro-P/R vs ripwire ground truth on the frozen 8-symbol set.
- Every container claim: tool-result token (rows=, QUERY_INVALID, GI_*), never prose.
- cwd-not-defined class: every new tool path re-verified in TUI (host ST cannot catch ctx bugs).
- Log each round to context_management/RUNNING_BUILD_LOG.md immediately.
- Process `gi-overnight-8h` (pid 211572, sleep 28800) is the session watchdog only.
