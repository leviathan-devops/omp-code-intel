# OMP CODE INTEL SERIES — EVAL RE-ENTRY (S5) ARCHITECTURE DEEP DIVE v1

**Series:** OMP Code Intel (same lineage as `OMP_Code_Intel_Engineering_Report_v4.md`; this is a
subsystem deep dive, so it takes its own counter at v1).

**Project:** `mimo-code-intel` v0.2.0 · **Date:** 2026-09-14 · **Author:** Trident Agent
**Baseline:** donor `research/sep11-aether-hw` @ `f38ce911` · **Commit:** `cc40d62c` (tag `v0.2.0`)
**Container:** `mimo-intel-v2-t3b` · **Image:** `mimo-ct:master`

---

## ONE-PARAGRAPH SUMMARY

The eval re-entry bridge lets code running inside a MiMo `eval` kernel cell call the plugin's own
code-intelligence tools. It is a **file-based RPC** over a single directory: the kernel-side stub
(`PREAMBLE_PY` / `PREAMBLE_JS`, injected into the driver process before the first user cell) writes
a JSON request named by a random 16-hex id and polls for a JSON reply; the host-side watcher
(`src/eval/rpc.ts` `startWatcher`) watches that directory and serves each request by calling the
plugin's own `read`/`grep` implementations — which enforce project-root confinement and
`O_NOFOLLOW`, so the sandbox gets **tool-grade access, not filesystem access**. Four bounds define
the contract: a 1 MiB request cap, a 1 MiB reply cap, a 10 s deadline on both sides, and at most 8
in-flight plus 8 detached dispatches; every refusal is a **named** token (`RPC_TIMEOUT`,
`RPC_UNKNOWN_TOOL:<name>`, `RPC_UNKNOWN_TOOL:oversize`, `RPC_UNKNOWN_TOOL:malformed`) so the model
never sees a bare stack trace. It is verified live (S5: `intel_read` returns file bytes inside a
py kernel), at script-test level (`v2w1.st.ts` row), and it carries two real defects found and
fixed during this close-out (a pruned harness dir producing a raw `FileNotFoundError`, and a
reaper racing fresh replies).

---

## 1. WHY THIS EXISTS — THE SEAL

```
┌────────────────────────────────────────────────────────────────────────┐
│ WITHOUT re-entry:                  WITH re-entry:                      │
│   eval cell = sealed arithmetic         eval cell can ASK the plugin   │
│   open(f.ts) = raw filesystem       intel_read(f.ts) = plugin read     │
│   no tag, no confinement,             path-confined, symlink-refusing, │
│   no symbol map, no grep hygiene      size-capped, named errors        │
│                                                                        │
│ The seal is not broken for the filesystem -                            │
│ it is opened for TOOL CALLS ONLY, through one folder.                  │
└────────────────────────────────────────────────────────────────────────┘
```

The plugin's value is not "a Python process can read a file" — Python could always do that. The
value is that Python gets the SAME reading the agent gets: the shadow read's tagged header and
symbol map when the shadow is enabled, the plugin's confinement rules, and the plugin's error
vocabulary. `intel_grep` goes further: it runs the native grep through the plugin's own ReDoS
guard and root-confinement filter (`src/index.ts:206-247`).

## 2. THE PLAIN-LANGUAGE VERSION (no jargon)

Picture a kitchen with a service hatch between two rooms. The cook in the far room cannot reach
the pantry, but can write an order slip and slide it through the hatch. The cook in the near room
reads the slip, fetches the item THEMSELVES (deciding what is allowed to leave), and slides the
tray back.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Python room                        Plugin room                         │
│    writes an order slip  ──►   the hatch (a folder)                    │
│    waits for the tray   ◄──   fills the order                          │
│                                                                        │
│ Python never touches the pantry itself - it only asks,                 │
│ and the plugin decides what it is allowed to hand over.                │
└────────────────────────────────────────────────────────────────────────┘
```

In five steps, in the words of the code:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1  Python calls intel_read('work/data.txt')                            │
│    -> secrets.token_hex(8) makes a unique id                           │
│    -> writes <id>.req.tmp, then RENAMES it to <id>.req                 │
│       (rename = a half-written request can never be read)              │
│    -> creates the folder first if it is missing                        │
│                                                                        │
│ 2  The plugin is watching that folder (fs.watch + a 100ms poll)        │
│    -> reads the slip (1 MiB cap), the id must be hex, the              │
│       name must be one of {read, grep}; anything else is nacked        │
│       with a NAMED error the stub re-raises                            │
│                                                                        │
│ 3  The plugin runs ITS OWN read: project-root confinement plus         │
│    O_NOFOLLOW (a symlink cannot climb out), then writes the            │
│    answer to <id>.res via tmp + hard link, so an existing              │
│    file is never silently overwritten (EEXIST is surfaced)             │
│                                                                        │
│ 4  Python polls every 5ms, sees <id>.res, checks the id                │
│    matches its own, deletes it, and returns the text                   │
│                                                                        │
│ 5  No answer in 10s?  -> RPC_TIMEOUT (raised in Python)                │
│    Folder gone?      -> makedirs first; if that fails, the             │
│                         SAME named RPC_TIMEOUT, never a raw            │
│                         Python FileNotFoundError                       │
└────────────────────────────────────────────────────────────────────────┘
```

**The one-sentence version:** the sandbox gets a phone line to the plugin, and the plugin decides
what goes down the line.

## 3. THE MECHANISM — PROTOCOL AND LAYOUT

```
┌────────────────────────────────────────────────────────────────────────┐
│ ON-DISK CONTRACT   <intelHome>/eval-rpc/                               │
├────────────────────────────────────────────────────────────────────────┤
│ <id>.req          JSON {id, name, args}   (name in {read,grep})        │
│ <id>.res          JSON {ok, result|error} (only successful writes)     │
│ <id>.req.tmp      transient rename source (stub side)                  │
│ <id>.res.<hex>.tmp  transient link source (host side)                  │
│ <id> = 16 hex chars, generated by the stub (secrets/crypto)            │
├────────────────────────────────────────────────────────────────────────┤
│ DIRECTORY GUARD    ensureRpcDir()  (src/eval/rpc.ts:174)               │
│   base must not be a symlink; dir created 0700; must be a              │
│   directory; opened O_DIRECTORY|O_NOFOLLOW; uid must match             │
│   the process uid; chmod 0700 re-asserted. Any failure ->              │
│   RpcDirHijack (loud), never a silent fallback.                        │
└────────────────────────────────────────────────────────────────────────┘
```

| element | value | anchor |
|---|---|---|
| request dir name | `eval-rpc` | `src/eval/rpc.ts:20` (`RPC_DIR`) |
| stub poll interval | 5 ms | `RPC_POLL_MS` = 5, `src/eval/rpc.ts:21` |
| deadline (both sides) | 10 000 ms | `RPC_TIMEOUT_MS` = 10000, `src/eval/rpc.ts:22` |
| request cap | 1 000 000 B | `readReqCapped`, `src/eval/rpc.ts:135-152` |
| reply cap | 1 000 000 B | `writeRes`, `src/eval/rpc.ts:415-424` |
| in-flight bound | 8 | `handle()` guard, `src/eval/rpc.ts:264` |
| detached bound | 8 | `trackDetached`, `src/eval/rpc.ts:263-290` |
| orphan-reply grace | 15 000 ms | `RES_GRACE_MS`, `src/eval/rpc.ts:513` |
| host poll interval | 100 ms | `setInterval`, `src/eval/rpc.ts:514` |
| preamble deadline | 15 000 ms | `src/eval/kernels.ts:207` |
| envelope buffer tripwire | 8 MB | `readEnvelope`, `src/eval/kernels.ts:465-476` |

## 4. THE FLOW, ALL FOUR SURFACES

```
┌────────────────────────────────────────────────────────────────────────┐
│ KERNEL SIDE (inside the driver process)                                │
├────────────────────────────────────────────────────────────────────────┤
│ 1 driver spawn: setsid python3 -u <home>/driver_py.py                  │
│ 2 ensureSpawned queues the preamble as creationDeferred                │
│    (src/eval/kernels.ts:384-407) - a tracked promise, so               │
│    the per-lang gate guarantees no user cell overtakes it              │
│ 3 preamble = PREAMBLE_PY defines intel_read/intel_grep/_intel_call     │
│    failure policy: warn once, mark preambleDone, NEVER wedge           │
│    the queue (a kernel without re-entry still runs cells)              │
│ 4 runCell re-asserts cwd per cell (src/eval/kernels.ts:408+)           │
│    and FAILS LOUD if the chdir assert fails                            │
│ 5 envelope: <<<MCI:<nonce>>> + base64 code; replies parsed             │
│    with ok/nonce checks; 8MB tripwire closes the state                 │
└────────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────────┐
│ HOST SIDE (the plugin process)                                         │
├────────────────────────────────────────────────────────────────────────┤
│ startWatcher(dir, dispatch)   src/eval/rpc.ts:217                      │
│   fs.watch(dir)            -> handle(filename)                         │
│   setInterval 100ms        -> handle(each *.req)                       │
│   handle(): stopped? .req? basename? seen? inflight<8?                 │
│             detached<8?  -> claim (seen) -> id hex? no =>              │
│             unlink+nack; symlink? unlink+release                       │
│   readReqCapped: O_NOFOLLOW, must be a file, <=1MB                     │
│   parse: JSON object, name non-empty, id==filename id,                 │
│          name in {read,grep}  -> else nack(name|malformed)             │
│   job: Promise.race(dispatch, 10s timer)                               │
│        success -> writeRes({ok:true,result})                           │
│        failure -> writeRes({ok:false,error})                           │
│        timeout -> writeRes({ok:false,error:'RPC_TIMEOUT'})             │
│                   + detach the late call (bounded to 8)                │
│   release(): unlink .req, drop seen, inflight--                        │
│   poll reaper: unclaimed .res older than 15s -> unlink                 │
│   stop(): stopped=true, clearInterval, watcher.close,                  │
│           Promise.allSettled(pending)                                  │
└────────────────────────────────────────────────────────────────────────┘
```

```
┌────────────────────────────────────────────────────────────────────────┐
│ DISPATCH SIDE (what the plugin will actually do)                       │
├────────────────────────────────────────────────────────────────────────┤
│ read  (src/index.ts:154-183)                                           │
│   root = cwd; root '/' refused; confined(root,p);                      │
│   openSync O_RDONLY|O_NOFOLLOW; must be a regular file;                │
│   realpath via /proc/self/fd/<fd> on linux; re-check the               │
│   real path is inside root; read <=1_000_001 B; return text            │
│   ANY failure -> RPC_UNKNOWN_TOOL:read (opaque, no leak)               │
├────────────────────────────────────────────────────────────────────────┤
│ grep  (src/index.ts:184-249)                                           │
│   pattern validated: non-empty, <=200 chars, no control                │
│   bytes, compiles, and passes a ReDoS-shape denylist;                  │
│   path confined + realpath-checked; native grep raced                  │
│   against a 10s timer; output filtered to lines that are               │
│   either blank or a [path]#tag header INSIDE root                      │
├────────────────────────────────────────────────────────────────────────┤
│ anything else -> RPC_UNKNOWN_TOOL:<name>                               │
└────────────────────────────────────────────────────────────────────────┘
```

## 5. FAILURE MODES (every path, and what the model sees)

| condition | detection | token the model sees |
|---|---|---|
| no `MIMO_INTEL_RPC_DIR` env | stub head | `RPC_TIMEOUT` (raised) |
| folder missing/pruned | stub + host both `makedirs`/`ensureRpcDir` | recovered silently; if it fails, `RPC_TIMEOUT` |
| request name not read/grep | host parse | `{ok:false,error:'RPC_UNKNOWN_TOOL:<name>'}` → raised in the cell |
| request JSON malformed | host parse | `RPC_UNKNOWN_TOOL:malformed` |
| request > 1 MiB | `readReqCapped` | `RPC_UNKNOWN_TOOL:oversize` |
| reply > 1 MiB | `writeRes` | `RPC_UNKNOWN_TOOL:oversize` |
| request id not hex | `handle()` | file unlinked, no reply (stub times out) |
| request is a symlink | `lstatSync` | unlinked, no reply (stub times out) |
| dispatch slower than 10 s | host timer | `RPC_TIMEOUT` reply + late call detached |
| 8 dispatches already running | `inflight>=8` | request waits for the next poll tick |
| 8 late calls still unsettled | `detached>=8` | new work is refused (shed load, never pile up) |
| drive stdin lost mid-write | `writeRequest` | `KERNEL_MISSING: <lang> driver stdin lost` |
| driver stdout closes | `readEnvelope` | `KERNEL_MISSING: <lang> driver closed stdout` |
| cell output exceeds 8 MB | `readEnvelope` tripwire | named error; state evicted (retry with smaller output) |
| preamble throws | `ensureSpawned` | warn once, kernel keeps working WITHOUT re-entry |
| preamble times out (15 s) | `execInner` | `EVAL_ERROR: preamble timeout`; later cells skip it |

## 6. EVIDENCE — WHAT IS ACTUALLY MEASURED

| claim | how it was measured | result |
|---|---|---|
| a py kernel can read through the plugin | live TUI `eval` typed tool part, S5 | output `hello-rpc` |
| the same path works with two cells | TUI S8 (`x = 41` then `print(x + 1)`) | output `42` |
| the deadline kill works | TUI A1 (`time.sleep(30)`, timeout 2) | tool part error `EVAL_TIMEOUT` |
| the mechanism is script-testable without the TUI | `tests/st/v2w1.st.ts` row `v2-rpc-read-inside-kernel` | cell1 intel_read(data.txt) then cell2 prints hello-rpc |
| the dir guard is exercised | `ensureRpcDir` lstat/uid/chmod path | hijack → loud `RPC_DIR_HIJACK`, never silent |
| js side is wired too (AP-9) | `getKm()` passes BOTH preambles | `src/index.ts:111-112` (`py: PREAMBLE_PY, js: PREAMBLE_JS`) |
| the fix for the pruned dir holds | re-run of S5 after `74c4dc96` | `hello-rpc` returned again |

## 7. THE TWO DEFECTS THIS SUBSYSTEM PRODUCED (AND THEIR FIXES)

```
┌────────────────────────────────────────────────────────────────────────┐
│ D1  raw FileNotFoundError out of intel_read   (74c4dc96)               │
│     trigger : the host pruned .mimocode/mimo-intel/eval-rpc            │
│               mid-session (workspace hygiene)                          │
│     symptom : the eval card showed a Python traceback naming           │
│               '<...>/eval-rpc/<id>.req.tmp'                            │
│     cause   : the stub assumed the dir it was handed exists            │
│     fix     : both stubs makedirs defensively; failure degrades        │
│               to the NAMED RPC_TIMEOUT                                 │
│     verify  : S5 re-run -> 'hello-rpc'                                 │
│                                                                        │
│ D2  orphan .res reaper raced fresh replies (9379ea50)                  │
│     trigger : release() cleared the in-flight claim BEFORE             │
│               writeRes() wrote the reply                               │
│     symptom : judge 'critical': a just-written reply could be          │
│               deleted before the stub's 5ms poll read it               │
│     fix     : handle-first poll + 15s mtime grace; the reaper          │
│               only touches unclaimed replies older than grace          │
│     verify  : judge re-run -> 0 critical/high on the commit            │
└────────────────────────────────────────────────────────────────────────┘
```

## 8. THE PLAN TO MAKE THIS FULLY OBSERVABLE (and the rest of the plugin with it)

Written as a separate plan artifact: `reports/Mimo_Code_Intel_Observability_Plan_ShowMe.md`.
For THIS subsystem the plan is short, because the gap is small:

| gap | work order | observable test (tokens) |
|---|---|---|
| no negative-path camera in the TUI | drive `intel_read` at a path outside root and at a 2 MiB file from a cell | PASS `RPC_UNKNOWN_TOOL:read` in the eval tool part; FAIL any raw path echo |
| no concurrency camera | fire 3 `intel_read` cells in one prompt | PASS three tool parts with distinct ids and correct bytes; FAIL `RPC_TIMEOUT` |
| no js-side camera | same two rows with `language: js` | PASS `hello-rpc` in a js cell; FAIL `RPC_CJS_ONLY`/`RPC_TIMEOUT` |
| reaper behaviour | kill a stub mid-flight (timeout 0.2s), then re-read | PASS `RPC_TIMEOUT` then a clean follow-up read; FAIL orphan `.res` left behind (inspect the dir) |

## 9. OPEN / DECIDED

**Decided:** file-based RPC over one directory, 5 ms poll, 10 s deadline, 1 MiB caps, 8+8
concurrency bounds, named errors on every path, sync-only stubs (documented in the file header:
"no async runtime to yield to inside a driver cell").

**Open:** (a) the stubs block the whole driver for up to 10 s per call — acceptable for code
intelligence, wrong for a latency-sensitive kernel; (b) `grep` inside a cell re-validates a ReDoS
denylist that duplicates the ttsr detector in shape — two guards, one of which will drift;
(c) replies are read by polling, not by notification, so a very busy directory costs CPU.

