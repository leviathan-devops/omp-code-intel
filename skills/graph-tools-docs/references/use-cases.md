# Use cases — which tool/verb for which question

- "Is the service alive / which session am I?" → graph-probe (echo round-trip).
- "Who calls X?" → graph-query who-calls. "What breaks if I change X?" → would-break (+ gate FULL for the cancel verdict).
- "What does X affect?" → impact (upstream + hint=next chain). "Blast radius of X?" → blast-radius.
- "Can I delete X?" → safe-delete (callers + reaches + uses + testReach in ONE result).
- "How does A reach B?" → chain. "What's dead?" → unwired. "Prove claim C?" → verify (CLOSED shapes only).
- "What MUST this implement / which rules fire / show violations / consistency?" → must-implement/rule/violations/consistency.
- "Find live defects in this tree" → bug-hunt hunt (full loop + report). "Quick dead-code census?" → bug-hunt status.
- "Audit god-nodes / cycles / dead-code / contracts on the graph?" → aether-code-audit with the matching template (default R28-sro-graph).
- "Use the graphify graph, not corbell" → add `substrate: graphify` + absolute `targetPath` to any graph-query verb.
- "All Go keys down — what serves LLM calls?" → Go fallback rung 2 openrouter laguna (automatic per-call; snapshot via goFallbackSnapshot).
