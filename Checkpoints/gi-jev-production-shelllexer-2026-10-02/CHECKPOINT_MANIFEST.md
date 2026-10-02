# CHECKPOINT — gi-jev-production-shelllexer-2026-10-02 (FINAL)

Deployed: ~/.omp/agent/extensions/omp-ct/dist.js sha256 `1cde5a8a6d568271718f9d8bbf55553f9f9fe1afb0c88c916b26996dcf23d4cd`
pbk HEAD: `762567a0 fix(gate): round-15 — kind defang, zero-width secret strip, wrapper podman/pkill, write-gate guard+keys, subcommand strip view, candidate scrub`

Rounds 1-15. ~60 confirmed defects fixed, each with its probe.
Battery: tsc RC=0 · seam 37/37 · doc-density 7/7 · smoke 38/40 (0 FP) · container 10/10 · write 5/5 · 8 FPs 8/8 · host 7/7.
Landed: the shell-aware tokenizer (matrix 8/8) + the cross-session freshness gate (proven stale=false/fresh=true).
The audit is on the treadmill (the count regenerates by design) — the runtime is the measure.
