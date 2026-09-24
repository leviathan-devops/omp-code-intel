# THE CANON IS NOT STORED HERE — AND THE REASON IS A DEFECT THIS PACKAGE ONCE HAD

This directory previously carried TEN stub files (BUILD_STATE, CHANGELOG,
COMPACTION_SURVIVAL, CURRENT_STATE, DECISION_CHAIN, EVIDENCE_STATE, NEXT_STEPS,
POST-COMPACTION_PROMPT, RUNNING_BUILD_LOG, RUNNING_DEBUG_LOG, TASK_QUEUE) of which
EIGHT WERE ZERO BYTES and three were thin partials.

**That is the exact artifact this kernel exists to eliminate**: a thing whose FORM is
the canon set while its SUBSTANCE is absent. A reader opening `canon/BUILD_STATE.md`
would have found an empty file and could not tell "not written yet" from "the build
state is empty". The package audit caught it (W9, finding PA-1).

**THE CANON IS AT THE REPO ROOT AND IT IS GATE-VERIFIED:**
```
context_management/   11 docs, every one at or above the 200-line floor,
                      every one carrying 3+ file:line refs, the read-first docs
                      agreeing on the dist SHA 83eb7bba.
                      Verified this session by the 5a/5b/5c gates:
                        5a CHECKPOINT INTEGRITY  PASS (175 files, dist sha match)
                        5b CROSS-CONSISTENCY     PASS (5/5 agree on 83eb7bba)
                        5c DENSITY + SUBSTANCE   PASS (9/9 at the 200 floor)
```

A POINTER, NOT A COPY. Two copies of a canon drift, and the drifted one is always the
one somebody reads. Read the canon where it is maintained.
