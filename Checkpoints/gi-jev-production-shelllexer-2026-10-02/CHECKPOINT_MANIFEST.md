# CHECKPOINT — gi-jev-production-shelllexer-2026-10-02

Deployed: ~/.omp/agent/extensions/omp-ct/dist.js sha256 `baf361fb57d92e075d7ad84258303fe3c01ce46e4c7f5556cad75a158663648d`
pbk HEAD: `8f2619e0 fix(gate): freshness-gate the cwd-global evidence artifact — a stale cross-session artifact no longer clears a fresh claim`

Battery: tsc RC=0 · seam 37/37 · doc-density 7/7 · smoke 38/40 (0 FP) · container 10/10 · write 5/5 · 8 FPs 8/8 · host 7/7
New: shell-strip.ts (the shell-aware tokenizer, matrix 8/8) + the cross-session freshness gate (proven stale=false/fresh=true).
