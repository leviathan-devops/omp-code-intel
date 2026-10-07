# THE LIVE HOST REFLEX — THE READINESS EVIDENCE (2026-09-29)
THE RUNG: the LIVE HOST SESSION (a fresh omp TUI in the GI repo, `gi-live-reflex`, pid 4020617).
THE TRIGGER: a REAL write through the session's write tool (no agent action, no harness).
THE VERBATIM OBSERVATION (the session's own output):
```
The write landed (34 bytes), and the reflexive LSP fired on it after the edit returned:
┌──────────┬────────────────┬──────────────────────────────────────────────────────────────────────┐
│ severity │ channel        │ datum                                                                │
├──────────┼────────────────┼──────────────────────────────────────────────────────────────────────┤
│ warning  │ gi-lsp/unwired │ liveReflexProbe — 0 callers, no inbound edges in the graph store     │
│ warning  │ jg/state       │ no session-id file — extension has not run (remedy: start a ticket)  │
│ info     │ gi-lsp/meaning │ meaning drift, confidence 0.554 · noul 0.446 ·                       │
│          │                │ judge jevk5-4b-v0.2-Q8_0 @ :8090 (104ms)                             │
└──────────┴────────────────┴──────────────────────────────────────────────────────────────────────┘
```
## WHAT THIS PROVES (each a distinct link)
1. **THE REFLEX ON THE HOST** — the runtime spawned the LSP and the diagnostics arrived AFTER the
   edit returned, with NO agent action. (Previously proven only in the container.)
2. **THE JEVK5 JUDGE IS LIVE** — the `gi-lsp/meaning` card carries a REAL confidence (0.554) +
   noul (0.446) + the judge's identity + latency (`jevk5-4b-v0.2-Q8_0 @ :8090 (104ms)`) — the
   TSG→meaning route fired against the local decision model.
3. **THE SECOND SERVER** — `jg/state` (the Jev Gates LSP) also fired from the same registration
   surface — the multi-server config works.
4. **THE PREDICATE'S MIDDLE AXIS** — `layersRoutedThroughLsp`: the meaning card routes through the
   JEV layer (the judge) — the live routing is now OBSERVED, not measured-by-construction.

## THE READINESS FIX THAT MADE IT POSSIBLE (found by the operator's question)
The project override (`<repo>/.omp/lsp.json`) carried the CONTAINER's path (`/gi/scripts/gi-lsp.ts`)
— a fresh HOST session would have failed to start the server. FIXED to the host's absolute path
(and the user-level config agrees). The file was root-owned (the container wrote it via the mount)
— rewritten via sudo with the host's ownership.
