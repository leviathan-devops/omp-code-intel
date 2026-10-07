// PORTED FROM the archived upstream skill tree/firewall/readonly.ts — verbatim bytes; SEAM: none expected (lexicon-types sibling already ported).
/**
 * readonly.ts — THE BASH_LOCKDOWN_LEXICON (W3, the T.E.B enforcement layer)
 *
 * The bug hunter's AND the auditor's bash tool.before hook (the L2 spec §7.2:3083-3313).
 * The input: the bash command string. The decision: ALLOW_READ | BLOCKED.
 * The hook intercepts every bash call BEFORE the shell sees it — a BLOCK throws before
 * any process spawns, so there is NO execution path at all (the anti-misfire property, R3.4).
 *
 * THE DETECTION-VS-DECISION LAW (§7.1:3059): the matchers below are mechanical DETECTORS ONLY —
 * they classify the command; the DECISION is the BASH_DECISION state machine at the bottom
 * (PARSED -> ALLOW_READ | BLOCKED). A matcher that returns a verdict would be a SLOP-SIG-2
 * (regex-only classifier) — REJECTED by the ISE soft-warn firewall.
 *
 * THE ORDER LOCK (§7.2.4:3230): BYPASS -> EXECUTION -> MUTATION -> READ — the first BLOCK
 * family that fires wins; ALLOW requires the READ family AND the zero-metacharacter condition
 * AND the correct git/sed routing. An input matching NO family fails CLOSED to BLOCKED
 * (the BASH_UNKNOWN family) — there is no third state.
 */

import type { BashLockdownDecision, LexiconContext } from './lexicon-types.js';
import { BASH_ERROR_MESSAGE, makeLexiconDecision } from './lexicon-types.js';

/**
 * THE READ FAMILY (the L2 spec §7.2:3143-3145) — the ALLOW set.
 * A command is READ only when its first token is here AND the metacharacter scan is clean
 * AND the git/sed second-token routing passes.
 */
export const READ_VERBS: ReadonlySet<string> = new Set([
  'rg', 'grep', 'find', 'cat', 'ls', 'wc', 'stat', 'head', 'tail',
  'cut', 'sort', 'uniq', 'diff', 'sha256sum', 'basename', 'dirname',
  'realpath', 'file', 'strings',
]);

/** The read-only git sub-verbs (the second-token routing, §7.2:3157). */
const GIT_READ_SUBVERBS: ReadonlySet<string> = new Set(['diff', 'log', 'status', 'show']);
/** The mutation git sub-verbs (the second-token routing, §7.2:3157). */
const GIT_MUTATION_SUBVERBS: ReadonlySet<string> = new Set([
  'add', 'commit', 'push', 'reset', 'checkout', 'clean', 'stash', 'apply',
]);

/**
 * THE EXECUTION FAMILY (the L2 spec §7.2:3151-3154) — the code-execution verb set.
 * 'printf' is added explicitly: the 6.2 proofCase at line 2580 mandates
 * {cmd: "printf '%s' x", expected: 'BLOCK', family: 'BASH_EXECUTION'} — printf synthesizes
 * output rather than reading (the echo/cat/printf rule at §7.2:3170).
 */
export const EXECUTION_VERBS: ReadonlySet<string> = new Set([
  'node', 'bun', 'bunx', 'npm', 'npx', 'pnpm', 'yarn', 'deno', 'tsx',
  'python', 'python3', 'pip', 'pip3', 'ruby', 'perl', 'php', 'java',
  'go', 'rustc', 'cargo', 'gcc', 'clang', 'make', 'sh', 'bash', 'zsh',
  'fish', 'ksh', 'tcsh', 'eval', 'exec', 'source', '.', 'opencode',
  'tsc', 'esbuild', 'vite', 'next', 'nest', 'printf',
]);

/**
 * THE MUTATION FAMILY (the L2 spec §7.2:3160-3166).
 * sed/awk/perl are BLOCKED ENTIRELY (the -i in-place mutations + the pipeline ubiquity) —
 * EXCEPT the exact two-token prefix 'sed -n' (the line-range printer, a pure read)
 * with the quoted-range carve-out below (§7.2:3168, 3203-3211).
 */
export const MUTATION_VERBS: ReadonlySet<string> = new Set([
  'touch', 'rm', 'mv', 'cp', 'mkdir', 'rmdir', 'chmod', 'chown', 'chattr',
  'ln', 'install', 'tee', 'truncate', 'dd', 'patch', 'tar', 'unzip', 'gunzip',
  'git', 'sed', 'awk',
]);

/**
 * THE BYPASS METACHARACTER CLASS (§7.2:3172-3180) — CLOSED BY CONSTRUCTION.
 * Every shell-splitting character enumerated; the newline included (the continuation trick:
 * a backslash-newline or a bare newline splits the "command" into a sequence).
 * This is the load-bearing family: 'cat file | python -c' has a READ verb first —
 * only BYPASS catches the pipe (§7.2:3182).
 */
/** ★ R19-HIGH: THE FORMAT-AND-CONTROL CLASS — codepoints that make a command DISPLAY
 *  differently from its BYTES (the Trojan-Source class): the bidi overrides/isolates reorder what
 *  an operator reads, the zero-width family hides characters entirely. Checked in BOTH scan arms
 *  below — a READ verb takes the narrow arm and would otherwise never see them.
 *  NOT the C0 controls: that range includes SPACE and TAB, and refusing those would block every
 *  read with an argument separator. Only the codepoints that are invisible-but-load-bearing. */
const FORMAT_CONTROL_CHARS: ReadonlySet<string> = new Set([
  ...Array.from({ length: 5 }, (_, i) => String.fromCharCode(0x202a + i)),   // LRE RLE PDF LRO RLO
  ...Array.from({ length: 4 }, (_, i) => String.fromCharCode(0x2066 + i)),   // LRI RLI FSI PDI
  '\u200e', '\u200f',                                                      // LRM RLM (bidi marks — the R20-HIGH gap)
  '\u200b', '\u200c', '\u200d', '\u2060', '\ufeff',                    // zero-width family
  '\u00ad',                                                                 // soft hyphen
]);

const BYPASS_METACHARACTERS: ReadonlySet<string> = new Set([
  '|', ';', '&', '>', '<', '(', ')', '*', '?', '[', ']', '{', '}',
  '#', '!', '%', '~', '$', '`', '\\', '\'', '"', '\n',
  ...FORMAT_CONTROL_CHARS,
]);

/** The sed -n quoted-range pattern — the carve-out's inner content (the sed range shape: 1,20p / 5p / 1,20). */
// ★ W9-AUDIT CRITICAL FIX (2026-09-28): the file slot was `(?:\s+\S+)?` — `\S+` EATS shell
//   metacharacters (`|`, `>`, `;`, `&`), so `sed -n '1p' foo|bar`, `foo>bar`, `foo;rm -rf /`
//   ALL matched and `scanMetacharacters` returned null (the bypass scan was skipped). The slot
//   is now PATH CHARSET ONLY — no metachar can survive the match, so a smuggling attempt falls
//   through to the fail-closed `return '\''` below (the W16-HIGH path).
// ★ W6-SWEEP-FIX-9 (2026-09-28): the file slot may NOT start with `-` — `sed -n '1p' -e`
//   matched the carve-out while sed parsed `-e` as a FLAG (the audit's HIGH: the carve-out
//   skipped the bypass scan into ALLOW_READ). A path that starts with a dash is `./-file`.
const SED_N_RANGE_RE = /^(['"])([0-9]+(?:,[0-9]+)?p?)\1(?:\s+[A-Za-z0-9._/+][A-Za-z0-9._/+-]*)?$/;

// ★ W6-SWEEP-FIX-11 (2026-09-28): NARROW_SPLITTERS is MODULE scope now — the audit's recurring
//   LOW (a per-call Set allocation on the hot hook path) plus a real need: the tokenizer's
//   escape handling (parseCommand) must consult the SAME constant the scan arms use. ONE
//   declaration, three consumers, zero drift.
const NARROW_SPLITTERS: ReadonlySet<string> = new Set(['|', ';', '&', '>', '<', '\n', '$', '`', '\\']);

/** The echo/printf family — printf routes to EXECUTION (the 6.2 proofCase); echo is the no-op edge case. */
const ECHO_VERB = 'echo';

/**
 * THE DETECTOR — the metacharacter scan over the ENTIRE command including the newline.
 * THE REGEX IS THE MECHANICAL DETECTOR ONLY (the char-class scan); THE DECISION is the
 * BASH_DECISION state machine below. The scan EXEMPTS the two sanctioned quote usages:
 * 1. the printf/echo family's quotes are routed by verb before the quote-metachar fires
 *    (the F3 reconciliation: printf -> BASH_EXECUTION per the 6.2 proofCase at 2580,
 *    the echo no-op edge per §7.2:3170);
 * 2. the exact 'sed -n' quoted-range carve-out (§7.2:3203-3211).
 * Every OTHER quote occurrence in ANY position = BYPASS.
 */
function scanMetacharacters(command: string, firstToken: string, secondToken: string, dequoted: string = command, unquoted: string = command): string | null {
  // The sed -n carve-out: 'sed -n' + exactly one quoted range argument (+ the optional file arg)
  // -> the quotes exempted. THE REGEX IS THE MECHANICAL DETECTOR ONLY (the sed-range shape:
  // '1,20p' / '5p' / '1,20' — the p is the sed print suffix, present in the C10.6 proof case);
  // THE DECISION is the BASH_DECISION state machine below.
  if (firstToken === 'sed' && secondToken === '-n') {
    // ★ F-1040b FIX (2026-09-25): rest was `command.slice(command.indexOf('-n') + 2)` —
    // ★ indexOf lands INSIDE the quotes for `sed "-n" '1,20p'` (rest = `" '1,20p'`),
    // ★ which missed the range regex AND tripped the startsWith-quote BLOCK. Strip the
    // ★ leading `sed <-n>` (bare or single/double-quoted) quote-aware; PROBED below.
    const rest = command.replace(/^\S+\s+(?:"-n"|'-n'|-n)\s*/, '');
    const m = SED_N_RANGE_RE.exec(rest);
    if (m) {
      // ★ W6-SWEEP-FIX-10 (2026-09-28): the carve-out returned null WITHOUT the format-control
      //   scan (the audit's MEDIUM: safety rested on the regex charset staying tight). The
      //   Trojan-Source class is quote/charset-independent — scan it here too.
      for (const ch of command) {
        if (FORMAT_CONTROL_CHARS.has(ch)) return ch;
      }
      return null; // the whole command is the sanctioned range read — no other metachars possible
    }
    // ★ W16-HIGH FIX: fail-closed — any other `sed -n` shape (unquoted script,
    //   -e/-E flags, quoted non-range like 's/x/y/') must BLOCK. Falling through
    //   to the narrow scan let `sed -n s/foo/bar/p file` and `sed -n -e ...`
    //   sail past (the narrow list ignores `/` and quotes) into ALLOW_READ.
    //   Only the exact quoted-range above is exempt; everything else is BYPASS.
    return '\'';
  }

  // THE BLOCK-VERB ARGUMENT-SYNTAX EXEMPTION (the F3 reconciliation, generalized):
  // the EXECUTION/MUTATION families' OWN argument syntax — the -e/-c script quotes, the parens,
  // the braces, the $1/$() variables, the printf formats, the quoted messages — routes by VERB:
  // the 6.2 proofCases mandate the FAMILY classification ('node -e "x()"' -> BASH_EXECUTION at
  // 2555, 'python -c "print(1)"' at 2557, 'sh -c "ls"' at 2560, "printf '%s' x" at 2580),
  // and the spec's own rationale (§7.2:3170) names the REDIRECTION as the echo/printf danger.
  // THE TRUE SPLITTERS — the characters that can smuggle a SECOND command (| ; & > < + the
  // newline) STILL fire BYPASS for the BLOCK verbs; the rest is the verb's argument syntax.
  // The A4 container scenario ('cat file | python -c x') keeps its BASH_BYPASS: cat is a READ
  // verb — the full scan below applies, the pipe fires.
  const blockVerbExemption = EXECUTION_VERBS.has(firstToken) || MUTATION_VERBS.has(firstToken) || firstToken === ECHO_VERB;
  // ★ F-1200 FIX (2026-09-25): the narrow splitter list lived as TWO inline literals
  // ★ (block-verb + READ-verb) drifting by copy-paste — one named constant so the two
  // ★ paths can never drift apart again. `(`, `)`, `{`, `}` are DELIBERATELY ABSENT:
  // ★ without `$`/backtick/quote they cannot substitute or split — `echo (hi)` prints
  // ★ literally, `node -e "x()"` is the verb's own argument syntax (already BLOCKED as
  // ★ BASH_EXECUTION, proofCase §6.2:2555). Adding parens would BLOCK harmless echo and
  // ★ only relabel execution-verbs BYPASS→BYPASS — zero security gain, real false positives.
  // ★ W9-REAUDIT FIX (2026-09-28): `\` added — a shell strips the backslash, so `--output\=x`
  //   and `-e\xec` were invisible to detection while the shell un-escaped them (the audit's
  //   HIGH). Quotes/globs remain the block-verb exemption's concern.
  if (blockVerbExemption) {
    // ★ F-13 FIX (2026-09-24): `$` and backtick ride the splitter list — without them
    // ★ `node -e "$(whoami)"` sailed through the exemption as pure argument syntax.
    for (const ch of command) {
      if (NARROW_SPLITTERS.has(ch)) return ch;
      // ★ R19-HIGH: the format/control class rides the NARROW arm too — this arm is where a READ
      //   verb lands, and a bidi-laced `cat` is exactly the disguise case.
      if (FORMAT_CONTROL_CHARS.has(ch)) return ch;
    }
    return null;
  }
  // ★ F-48 FIX (2026-09-24): the echo/printf-specific scan below was DEAD — echo
  // ★ matches blockVerbExemption via ECHO_VERB and printf via EXECUTION_VERBS, so
  // ★ both returned above and this branch never ran. Removed (the exemption's
  // ★ splitter scan — | ; & > < newline $ backtick — is the live guard for both).
  // ★ F-411 FIX (2026-09-24): READ verbs got the FULL BYPASS scan — quotes in
  // ★ ordinary arguments (`grep 'error' log.txt`, `find . -name '*.ts'`) fired
  // ★ BASH_BYPASS, blocking virtually every quoted read. READ verbs cannot execute
  // ★ code, so only the TRUE SPLITTERS fire (| ; & > < newline $ `) — same list
  // ★ as the block-verb exemption. The A4 pipe case (`cat file | python -c x`)
  // ★ still blocks via `|`.
  if (READ_VERBS.has(firstToken)) {
    // ★ W16-HIGH FIX: deny-list the dangerous read-verb options BEFORE the splitter
    //   scan. `find . -exec rm -rf / {} +` carries none of the narrow splitters
    //   (the `+` terminator is not one — only the `;` variant was caught), so the
    //   old path returned null and ALLOW_READ blessed an execution primitive.
    //   The `-exec...{} +` form executes; only the bare listing form is a read.
    // ★ W6-SWEEP FIX (2026-09-28): EVERY flag test reads the DEQUOTED command, and the READ
    //   arm's splitter scan reads the QUOTE-BLANKED one. The audit's re-run proved 5 residual
    //   leaks after the git-path fix: the shell concatenates adjacent quoted segments, so
    //   `sort --out"put"=/tmp/out`, `sort '-o' /tmp/out`, `diff --out"put"=a b`,
    //   `find . -e"x"ec …`, `find . -ex'e'c …` all EXECUTE the flag while the raw text never
    //   matched it; symmetrically a QUOTED `|` is DATA to the shell, so the splitter scan on
    //   the raw over-blocked `grep 'a|b' file` (the probe's misfire).
    // ★ W6-SWEEP-FIX-4 (2026-09-28): the audit's THIRD pass confirmed this is a CLASS, not a
    //   site: every READ verb carries exec/write HOOKS reachable through its options, and GNU
    //   getopt_long accepts unambiguous ABBREVIATIONS of the long form. `sort --compress-program=PROG`
    //   EXECUTES Prog (the CRITICAL: arbitrary code, no splitter); `sort --out=x` / `--o x` write
    //   via the abbreviation; `rg --pre <cmd>` runs a preprocessor (a READ verb with an exec hook);
    //   `uniq -- -a -b` turns dash-prefixed tokens into OPERANDS after `--`. The guards below:
    //   (a) EXEC hooks -> 'E' (an execution primitive, the same class as find -exec);
    //   (b) write flags -> '>' (the write metacharacter);
    //   (c) abbreviations -> accept the unambiguous prefixes getopt_long itself accepts.
    //   The CLASS is named as the residual (this list can never be closed by enumeration — the
    //   systemic fix is a per-verb OPTION allow-list, a design change, recorded in the audit).
    // ★ W6-SWEEP-FIX-6 (2026-09-28): the audit's FOURTH pass caught an OWN-GOAL — the diff
    //   pattern named flags that DO NOT EXIST (`GTYPE-group-name`/`xdl`), so it never fired.
    //   GNU diff has NO exec hook: its group-format flags FORMAT output; the only write flag is
    //   `--output`/`--to-file` (guarded below). The bogus guard is REMOVED, not patched.
    //   The exec hooks keep getopt_long's UNAMBIGUOUS ABBREVIATIONS (`--comp=` for
    //   `--compress-program` — sort's only `--co*` flag; `--pre` for rg's preprocessor).
    if (firstToken === 'sort' && /\s--(?:c|co|com|comp|compr|compre|compres|compress|compress-|compress-p|compress-pr|compress-pro|compress-prog|compress-progr|compress-progra|compress-program)(?:=|\s|$)/.test(dequoted)) return 'E';
    // ★ W6-SWEEP-FIX-7 (2026-09-28): the same ABBREVIATION rule as sort/git — `rg --pr=x`
    //   is `--pre` (rg's only `--pr*` family) and `--pre-g` is `--pre-glob` (the audit's HIGH).
    if (firstToken === 'rg' && /\s--(?:pr|pre)(?:=|\s|$)/.test(dequoted)) return 'E';
    if (firstToken === 'rg' && /\s--(?:pre-|pre-g|pre-gl|pre-glo|pre-glob)(?:=|\s|$)/.test(dequoted)) return 'E';
    if (firstToken === 'find' && /\s(-exec|-execdir|-delete|-fls|-fprintf|-fprint|-fprint0|-ok|-okdir)(?![\w-])/.test(dequoted)) return 'E';
    // ★ W9-REAUDIT FIX 3 (2026-09-28): the OTHER read verbs with a FILE-WRITE syntax were
    //   un-guarded (the audit's HIGH): `sort -o <file>` / `--output=<file>`,
    //   `diff --output=<file>` / `--to-file=<file>`, `uniq <in> <out>` (the positional
    //   2-operand form). Each routes to the `>` (write) metacharacter → BLOCKED.
    // ★ W6-SWEEP-FIX-2 (2026-09-28): `(?![A-Za-z])` accepts the ATTACHED value form —
    //   `sort in -o/tmp/out` (the audit's HIGH: the old `(?:\s|$)` tail missed `-o<path>`).
    // ★ W6-SWEEP-FIX-4: the long forms accept getopt_long's UNAMBIGUOUS ABBREVIATIONS (`--out=`,
    //   `--o x`) — the audit's HIGH; `-o` keeps the attached/clustered short form.
    if (firstToken === 'sort' && (/(?:^|\s)-[A-Za-z]*o(?![A-Za-z])/.test(dequoted) || /\s--(?:o|ou|out|outp|outpu|output)(?:=|\s|$)/.test(dequoted))) return '>';
    if (firstToken === 'diff' && /\s--(?:o|ou|out|outp|outpu|output|t|to|to-|to-f|to-fi|to-fil|to-file)(?:=|\s|$)/.test(dequoted)) return '>';
    // ★ W6-SWEEP-FIX-4: `uniq -- -a -b` — after a bare `--` EVERY token is an operand (even a
    //   dash-prefixed one); `-` filtering must stop at the `--` marker (the audit's HIGH).
    if (firstToken === 'uniq') {
      // ★ W6-SWEEP-FIX-10 (2026-09-28): `uniq file1 -- file2` — the operand BEFORE the `--`
      //   counts too (the audit's HIGH: slicing only the tail read 1 operand and skipped the
      //   write guard while the shell writes file2).
      const parts = dequoted.trim().split(/\s+/).slice(1);
      const dashDash = parts.indexOf('--');
      const before = dashDash >= 0 ? parts.slice(0, dashDash) : parts;
      const after = dashDash >= 0 ? parts.slice(dashDash + 1) : [];
      const operands = before.filter((t) => !t.startsWith('-')).concat(after);
      if (operands.length >= 2) return '>';
    }
    for (const ch of unquoted) {
      if (NARROW_SPLITTERS.has(ch)) return ch;
    }
    // ★ W6-SWEEP-FIX-8 (2026-09-28): the FORMAT/CONTROL scan reads the RAW command — a bidi
    //   override or a zero-width char is dangerous REGARDLESS of quoting (the shell does NOT
    //   neutralize it), and blanking the quoted span hid `cat 'a<U+202E>rm'` (the audit's HIGH:
    //   the Trojan-Source blind spot my own blanking introduced).
    for (const ch of command) {
      if (FORMAT_CONTROL_CHARS.has(ch)) return ch;
    }
    return null;
  }
  for (const ch of command) {
    if (BYPASS_METACHARACTERS.has(ch)) return ch;
  }
  return null;
}

/** THE PARSED COMMAND — the token split + the scan result. */
interface ParsedCommand {
  firstToken: string;
  secondToken: string;
  /** ★ W16-HIGH FIX: tokens[2..] ride the parse so routeGit can refuse trailing
   *  write flags (`git log --output=...`) — the old shape dropped them. */
  restTokens: string[];
  metacharacter: string | null;
}

/** THE PARSE STEP (§7.2:3107-3113) — the first-token split + the full-character metacharacter scan. */
function parseCommand(command: string): ParsedCommand {
  const trimmed = command.trimStart();
  // ★ F-1040 FIX (2026-09-25): shell-aware token split — `split(/\s+/)` broke quoted
  // ★ args (`sed "-n"` yielded secondToken `"-n"`, missing the -n carve-out; PROBED:
  // ★ `sed "-n" '1,20p'` → ["sed","\"-n\"","'1,20p'"]). Match quote-respecting tokens,
  // ★ then strip one layer of matching surrounding quotes so routing compares the VALUE
  // ★ (`-n`) while the metacharacter scan still sees the raw command string.
  // ★ W6-PROBE FIX (2026-09-28): the quote-AWARE REGEX desynced from the shell — it SPLIT
  //   shell-concatenated words, so `git log --out"put"=/tmp/out` became [--out, put,
  //   =/tmp/out] and NO piece carried the write flag to routeGit (the audit's HIGH #3;
  //   VERIFIED leaked by the W6 both-halves probe). The tokenizer is now a shell-faithful
  //   state machine: unquoted whitespace separates words; a quote char TOGGLES a quoting
  //   state and is DROPPED (the shell strips it), so adjacent segments CONCATENATE into one
  //   token (`--out"put"=/tmp/out` -> `--output=/tmp/out`) while a quoted arg with spaces
  //   stays ONE token (`'error message'` -> `error message`) and `sed "-n"` still yields `-n`.
  const tokens: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  // ★ W6-SWEEP FIX (2026-09-28): TWO shell-faithful views ride the same pass.
  //   `dequoted` = the shell's CONCATENATION view (quotes dropped, content kept) — the
  //   form a flag test must read (`sort --out"put"=x` -> `sort --output=x`;
  //   `find . -e"x"ec` -> `find . -exec`); the audit's re-run caught the residual class
  //   at the sites the git-path fix did not sweep (5 leaks, probe-proven).
  //   `unquoted` = quoted spans BLANKED — the form the READ arm's splitter scan needs,
  //   because a quoted `|` is DATA to the shell (`grep 'a|b' f` is a legit read, the
  //   audit-era over-block). EXECUTION verbs keep the RAW scan: their quoted content is
  //   CODE (`node -e "$(whoami)"`), so blanking it would reopen the F-13 hole.
  let dequoted = '';
  let unquoted = '';
  // ★ W6-SWEEP-FIX-11: an EMPTY quoted arg (`""`) is a real argv entry — the flag keeps the
  //   word alive across the quote so `git "" log` yields [git, '', log].
  let wordStarted = false;
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]!;
    if (quote !== null) {
      // inside quotes: the char is DATA — the concat view keeps it, the scan view blanks it
      // ★ W6-SWEEP-FIX-2 (2026-09-28): BUT a DOUBLE-quoted span still EXPANDS `$`, a backtick
      //   and `\` (the shell); SINGLE quotes alone are fully literal. Blanking both equally
      //   reopened the F-13 hole (`grep "$(rm -rf /)" f`) — the audit's CRITICAL on THIS fix.
      // ★ W6-SWEEP-FIX-8 (2026-09-28): a backslash ESCAPES the next char inside DOUBLE quotes,
      //   so `"a\"b"` does not close at the `\"` (the audit's HIGH: the desync could hide a
      //   real splitter or mis-route secondToken).
      if (quote === '"' && ch === '\\' && i + 1 < trimmed.length) {
        const nxt = trimmed[i + 1]!;
        cur += nxt;
        dequoted += nxt;
        unquoted += nxt === '$' || nxt === '`' || nxt === '\\' ? nxt : ' ';
        i++;
        continue;
      }
      const closing = ch === quote;
      const wasDouble = quote === '"';
      if (closing) quote = null;
      else cur += ch;
      dequoted += closing ? '' : ch;
      unquoted += wasDouble && (ch === '$' || ch === '`' || ch === '\\') ? ch : ' ';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; wordStarted = true; dequoted += ''; unquoted += ' '; continue; }
    // ★ W6-SWEEP-FIX-11 (2026-09-28): OUTSIDE quotes a backslash escapes the next char too —
    //   `cat foo\' | python -c x` enters a fake quote state at the escaped `'`, blanking the
    //   REAL `|` (the audit's CRITICAL on my own quote-aware view). The escaped char is literal:
    //   it stays in the concat view, and the splitter view keeps it only when it IS one.
    if (ch === '\\' && i + 1 < trimmed.length) {
      const nxt = trimmed[i + 1]!;
      cur += nxt;
      dequoted += nxt;
      unquoted += NARROW_SPLITTERS.has(nxt) ? ' ' : nxt;
      wordStarted = true;
      i++;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\v' || ch === '\f') {
      // ★ W6-SWEEP-FIX-11: an EMPTY quoted arg (`""`) is a real argv entry — dropping it
      //   shifted secondToken (`git "" log` read as [git,log]; the audit's HIGH).
      if (cur !== '' || wordStarted) { tokens.push(cur); cur = ''; wordStarted = false; }
      dequoted += ' ';
      unquoted += ch;
      continue;
    }
    cur += ch; dequoted += ch; unquoted += ch;
  }
  if (cur !== '') tokens.push(cur);
  // ★ W6-SWEEP-FIX-2 (2026-09-28): an UNTERMINATED quote left the tokenizer in the quoted
  //   branch to EOS, blanking every trailing splitter in `unquoted` — `cat foo' | python -c x`
  //   then read as ALLOW_READ (fail-OPEN; the audit's HIGH on this fix). A malformed command
  //   fails CLOSED: the open-quote char IS the reported bypass token.
  const unterminated = quote;
  const firstToken = tokens[0] ?? '';
  const secondToken = tokens[1] ?? '';
  const restTokens = tokens.slice(2);
  // The sed -n carve-out is detected BEFORE the scan so the sanctioned quotes are exempted.
  const metacharacter = unterminated ?? scanMetacharacters(trimmed, firstToken, secondToken, dequoted, unquoted);
  return { firstToken, secondToken, restTokens, metacharacter };
}

/** The git second-token routing — READ | MUTATION | null (the fail-closed for the unrecognized sub-verb).
 *  ★ W16-HIGH FIX: a READ sub-verb candidate carrying a trailing WRITE flag
 *  (`git log --output=/tmp/out`, `--upload-pack`, `--receive-pack`, `-o`) routes
 *  MUTATION — the old tokens[1]-only check allowed a file-write primitive that
 *  bypasses the `>` guard. The rest-token scan is lexical (exact `--flag` or
 *  `--flag=` prefix, never a substring), so `--output2` / paths containing the
 *  word cannot false-positive. */
const GIT_READ_WRITE_FLAGS: ReadonlySet<string> = new Set(['--output', '--upload-pack', '--receive-pack', '-o',
  // ★ W6-SWEEP-FIX-9 (2026-09-28): git's READ sub-verbs carry EXEC hooks too — `--ext-diff`
  //   runs an external diff driver, `--textconv` a textconv filter (the audit's HIGH: both
  //   execute with no splitter). They route MUTATION (the caller's BLOCKED family).
  '--ext-diff', '--textconv']);
function routeGit(secondToken: string, restTokens: string[] = []): 'READ' | 'MUTATION' | null {
  if (GIT_READ_SUBVERBS.has(secondToken)) {
    for (const tok of restTokens) {
      // ★ W6-PROBE FIX (2026-09-28): the shell CONCATENATES adjacent quoted/unquoted segments,
      //   so `--out"put"=/tmp/out` executes as `--output=/tmp/out` while the raw token never
      //   matched (the audit's HIGH #3; VERIFIED leaked by the W6 both-halves probe). The flag
      //   tests run on the DEQUOTED token (a shell strips " and ' during concatenation).
      const t = tok.replace(/["']/g, '');
      for (const flag of GIT_READ_WRITE_FLAGS) {
        // ★ W9-REAUDIT FIX (2026-09-28): the ATTACHED short form — getopt's `-o<path>`
        //   (`git log -o/tmp/out`) was missed by the exact/`=` tests. A SHORT flag
        //   (single dash, 2 chars) matches by PREFIX; a long flag (`--`) stays exact/`=`
        //   only (so `--output2` never false-positives).
        // ★ W6-SWEEP-FIX-4 (2026-09-28): the CLUSTERED form too — `git log -po/out` is `-p`
        //   + `-o<path>` (the audit's HIGH: the prefix test missed it). A single-dash token
        //   whose body CONTAINS the flag letter is a cluster (a `--` long form is excluded).
        const attachedShort = flag.length === 2 && t.startsWith(flag) && t.length > flag.length;
        const clusteredShort = flag.length === 2 && /^-[^-]/.test(t) && t.slice(1).includes(flag[1]!);
        // ★ W6-SWEEP-FIX-6 (2026-09-28): getopt_long accepts UNAMBIGUOUS ABBREVIATIONS of a long
        //   flag (`git log --out=/tmp/out` == `--output=`; the audit's HIGH). A prefix of >= 3
        //   chars is unambiguous in practice (`--o`/`--on` collide with `--oneline` and are NOT
        //   accepted — git would reject them as ambiguous too).
        let longAbbrev = false;
        if (flag.startsWith('--') && t.startsWith('--')) {
          const body = t.slice(2);
          const eq = body.indexOf('=');
          const key = eq >= 0 ? body.slice(0, eq) : body;
          // ★ W6-SWEEP-FIX-9 (2026-09-28): the threshold drops to 2 — `--ou` is already an
          //   UNAMBIGUOUS prefix of `--output` (git's only `--ou*` flag), and the prefix test
          //   is against the FLAG NAME, so `--oneline` cannot false-positive either way
          //   ('output'.startsWith('oneline') is false).
          if (key.length >= 2 && flag.slice(2).startsWith(key)) longAbbrev = true;
          if (eq < 0 && key === flag.slice(2)) longAbbrev = true;
        }
        if (t === flag || t.startsWith(flag + '=') || attachedShort || clusteredShort || longAbbrev) return 'MUTATION';
      }
    }
    return 'READ';
  }
  if (GIT_MUTATION_SUBVERBS.has(secondToken)) return 'MUTATION';
  return null; // 'git' alone or an unrecognized sub-verb — the fail-closed -> BLOCKED
}

/** The sed second-token routing — the 'sed -n' read-adjacent prefix vs the -i/other mutators. */
function routeSed(secondToken: string): 'READ' | 'MUTATION' {
  return secondToken === '-n' ? 'READ' : 'MUTATION';
}

/**
 * THE BASH_LOCKDOWN_LEXICON — the classify entry.
 *
 * THE STATE MACHINE (the DECISION layer, §7.2:3215-3228):
 *   PARSED --(BYPASS metacharacter)----------------------> BLOCKED (BASH_BYPASS)
 *   PARSED --(first token in EXECUTION_VERBS)-----------> BLOCKED (BASH_EXECUTION)
 *   PARSED --(first token in MUTATION_VERBS, git/sed routed)-> BLOCKED (BASH_MUTATION)
 *   PARSED --(first token in READ_VERBS + zero metachars)-> ALLOW_READ (BASH_READ)
 *   PARSED --(the bare-echo no-op edge case)------------> ALLOW_READ (BASH_READ)
 *   PARSED --(NO family matched)------------------------> BLOCKED (BASH_UNKNOWN)  [the fail-closed]
 *
 * THE ACT: a BLOCK throws the EXACT BASH_ERROR_MESSAGE (PRE-execution — the shell never
 * sees the command); an ALLOW returns the decision for the hook to execute.
 */
export function classify(command: string): BashLockdownDecision {
  // ★ W6-SWEEP-FIX-3 (2026-09-28): a NON-STRING caller (null / undefined / a number) threw a
  //   bare TypeError from the first string deref — a CRASH where this file's own "no third
  //   state" contract promises the BLOCKED fail-state (the audit's HIGH on the re-run).
  //   Malformed input now returns the SAME canonical BLOCKED decision as any unknown command.
  if (typeof command !== 'string') {
    // ★ W6-SWEEP-FIX-5 (2026-09-28): `String(command)` itself throws on an object with a
    //   throwing toString/Symbol.toPrimitive — the audit's MEDIUM: the guard must be TOTAL.
    let repr: string;
    try { repr = String(command); } catch { repr = '<unstringifiable>'; }
    return blocked('BASH_UNKNOWN', repr, repr);
  }
  const parsed = parseCommand(command);

  // THE ORDER LOCKED — BYPASS first (the widest class, §7.2:3230).
  if (parsed.metacharacter !== null) {
    return blocked('BASH_BYPASS', parsed.metacharacter, command);
  }

  const { firstToken, secondToken } = parsed;

  // THE EXECUTION FAMILY.
  if (EXECUTION_VERBS.has(firstToken)) {
    return blocked('BASH_EXECUTION', firstToken, command);
  }

  // THE MUTATION FAMILY — the git/sed second-token routing included.
  if (MUTATION_VERBS.has(firstToken)) {
    if (firstToken === 'git') {
      const routed = routeGit(secondToken, parsed.restTokens);
      if (routed === 'MUTATION') return blocked('BASH_MUTATION', firstToken, command);
      if (routed === null) return blocked('BASH_UNKNOWN', firstToken, command);
      // routed === 'READ' falls through to the READ check below (git diff/log/status/show).
    } else if (firstToken === 'sed') {
      if (routeSed(secondToken) === 'READ') {
        // The 'sed -n' prefix — the quoted-range carve-out already cleared the scan;
        // the read-adjacent classification requires the range to be present (handled in parse).
        if (parsed.metacharacter === null) return allowed('BASH_READ', firstToken, command);
      }
      return blocked('BASH_MUTATION', firstToken, command);
    } else {
      // awk/perl/touch/rm/... — always BLOCK.
      return blocked('BASH_MUTATION', firstToken, command);
    }
  }

  // THE READ FAMILY — only reached when no BLOCK fired.
  if (READ_VERBS.has(firstToken) || (firstToken === 'git' && routeGit(secondToken, parsed.restTokens) === 'READ')) {
    return allowed('BASH_READ', firstToken, command);
  }

  // THE BARE-ECHO NO-OP EDGE CASE (§7.2:3170) — zero metachars already proven by the BYPASS pass.
  if (firstToken === ECHO_VERB) {
    return allowed('BASH_READ', firstToken, command);
  }

  // THE FAIL-CLOSED — the unknown verb.
  return blocked('BASH_UNKNOWN', firstToken, command);
}

/** THE ALLOW construction — the decision + the MPSE triplet recorded (no triplet = no decision). */
function allowed(pattern: string, token: string, command: string): BashLockdownDecision {
  // ★ F-1041 FIX (2026-09-25): synced constructor — state/triplet derive from
  // ★ verdict/mPSE (the F-850 desync class), never independently assigned literals.
  return makeLexiconDecision({
    verdict: 'ALLOW_READ', pattern, token, message: '',
    mPSE: { Pattern: pattern, State: 'PARSED->ALLOW_READ', Evidence: command },
  }) as BashLockdownDecision;
}

/** THE BLOCK construction — the decision + the EXACT message + the MPSE triplet; the hook throws. */
function blocked(pattern: string, token: string, command: string): BashLockdownDecision {
  // ★ F-1041 FIX (2026-09-25): synced constructor (see allowed above).
  return makeLexiconDecision({
    verdict: 'BLOCKED', pattern, token, message: BASH_ERROR_MESSAGE,
    mPSE: {
      Pattern: pattern,
      State: 'PARSED->BLOCKED',
      Evidence: `${command} | matched token: ${token}`,
    },
  }) as BashLockdownDecision;
}

/** THE HOOK — the tool.before entry: the BLOCK throws BEFORE the shell (no execution path at all). */
export function enforceBashLockdown(command: string, _ctx?: LexiconContext): BashLockdownDecision {
  const decision = classify(command);
  if (decision.verdict === 'BLOCKED') {
    throw new Error(BASH_ERROR_MESSAGE);
  }
  return decision;
}
