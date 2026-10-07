import { classify } from "../src/hunter/firewall/readonly.ts";
const attacks: [string, string][] = [
  ["dollar-paren in DQ",   "grep \"$(rm -rf /)\" file"],
  ["backtick in DQ",       "grep \"`id`\" file"],
  ["var in DQ",            "grep \"$HOME\" file"],
  ["sort -o attached",     "sort in -o/tmp/out"],
  ["sort -o attached 2",   "sort -o/tmp/out"],
  ["unterminated sq",      "cat foo' | python -c x"],
  ["unterminated sq 2",    "grep 'a; rm -rf /"],
  ["sort --out\"put\"=",    "sort --out\"put\"=/tmp/out f"],
  ["find -e\"x\"ec",        "find . -e\"x\"ec touch /tmp/pwn {} +"],
  ["sed pipe-smuggle",     "sed -n '1p' foo|bar"],
  ["git attached -o",      "git log -o/tmp/out"],
  ["git quote-concat",     "git log --out\"put\"=/tmp/out"],
];
const controls: [string, string][] = [
  ["sq quoted pipe",       "grep 'a|b' file.txt"],
  ["dq plain string",      "grep \"hello world\" file.txt"],
  ["find name",            "find . -name '*.ts'"],
  ["sort plain",           "sort input.txt"],
  ["sort -k2",             "sort -k2 input.txt"],
  ["git log",              "git log --oneline -5"],
  ["sed -n range",         "sed -n '1,20p' file.txt"],
  ["cat",                  "cat README.md"],
  ["grep -rn",             "grep -rn 'x' src/"],
];
let bad = 0;
console.log("== ATTACKS (verdict must NOT be ALLOW_READ) ==");
for (const [id, cmd] of attacks) {
  const d = classify(cmd);
  const ok = d.verdict !== "ALLOW_READ";
  if (!ok) bad++;
  console.log("  " + (ok ? "BLOCKED" : "*** LEAKED") + "  [" + d.pattern + "] " + id);
}
console.log("== CONTROLS (verdict must be ALLOW_READ) ==");
for (const [id, cmd] of controls) {
  const d = classify(cmd);
  const ok = d.verdict === "ALLOW_READ";
  if (!ok) bad++;
  console.log("  " + (ok ? "READ-OK" : "*** MISFIRE [" + d.pattern + "]") + "  " + id);
}
console.log(bad === 0 ? "*** FINAL: 0 leaks / 0 misfires (" + attacks.length + " attacks / " + controls.length + " controls)" : "*** FINAL: " + bad + " FAILURES");
