# Actions reference — every verb/action with exact behavior (extension.ts:45-141)

- who-calls(target): callers file:line (top 20) → `rows=N` + head + `ripwire: --callers` summary. Details: rows/names/callers/substrate/ripwire.
- blast-radius(target): downstream nodes → `rows= root= depth=` + `ripwire: --impact`.
- would-break(target, proposed): breaking importers → `callers= argsUnknown=` + `ripwire: edit-check`.
- unwired(): zero-inbound modules (top 20) → `rows=` + head + `ripwire: dead-code`.
- chain(from→to): call path steps `from -> to [kind]` → `rows=` + `ripwire: path` (no `to` → leg `skipped`).
- impact(target): upstream closure depth≤8 → `impact_reaches=N` + ledger `sym@depthD (f:l) via P` + `hint=` + ripwire impact.
- safe-delete(target): `safe_delete: sym callers=N reaches=M uses=K testReach=T` + head + ripwire safe-delete.
- gate(target, dial=STEER|FULL): caller advisory via gateAdvisory + ripwire edit-check note. FULL signature-break → cancel `GRAPH_GATE_SIGNATURE_BREAK`; STEER → `[GATE STEER]`; no store → `GI_NO_STORE` ALLOW+warn.
- verify(claim): CLOSED language calls(A,B)/uses(SYM)/unused(SYM)/contains(FILE,"LIT")/defines(FILE,SYM)/reaches(SYM,FILTER). Empty → `VERIFY_INVALID`. Else `verify: <summary>` ok:true, or named `claim refused` / `VERIFY_FAILED` / `RIPWIRE_ABSENT`.
- must-implement/rule/violations/consistency(symbol): coverage delegation via runQueryTool READ-ONLY over THIS session store → `rows=N` + JSON. No typed-write twin (no regression to the 9 above).
- bug-hunt hunt/status: see tools.md (loop vs census).
- aether-code-audit (template): one template sweep → AUDIT_DONE; degraded GI_AUDIT_NOT_WIRED.
