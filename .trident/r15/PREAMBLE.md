★ THE PINNED-CONTRACT DISCIPLINE (learned the hard way in the R14 wave, 2026-09-25):

A reviewer's finding is a CLAIM. Your fix is ALSO a claim. BOTH must be adjudicated.

1. **READ THE CODE BEFORE YOU BELIEVE THE FINDING.** An LLM reviewer reads fragments; you
   read the whole file. If the finding misreads the code (wrong direction of an edge, a guard
   that exists elsewhere, a comment describing intent it does not have), it is a
   **NOT-A-BUG** — and you must PROVE it with a probe or a truth table, not an assertion.
2. **THE BATTERY IS THE CONTRACT.** Before landing a fix, ask: does this change any behaviour
   a test pins? If a test goes red, **THE FIX IS WRONG until the pin is deliberately
   re-specified** — and re-specifying a pin is an OPERATOR decision, never a drive-by edit.
   In the R14 wave TWO fixes had to be REVERTED for exactly this: one changed a rule's fire
   condition against a pinned corpus fixture; one closed a DB handle a test still reads.
3. **EVERY VERDICT CARRIES ITS EVIDENCE.** FIXED = the exact edit + `tsc --noEmit` exit 0.
   NOT-A-BUG = the probe output or truth table that disproves it. PROBE-ERROR = the reviewer's
   test shape was wrong (say which).
4. **NO PATCHING AROUND.** If a finding names a real invariant violation, fix the INVARIANT at
   the design level, not the site. Three conditionals means the guard is missing.
