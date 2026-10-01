import { containerGate } from "/home/leviathan/.omp/wt/graph-intelligence-66dfa4c/pbk-anchor2/src/middleware/container-gate.ts";
const gate = containerGate();
const D = "docker", T = "tmux";
const CASES: Array<[string,string,string]> = [
  ["exec (BYPASS)",      `${D} exec -it pbk bash`,                    "block"],
  ["run (BYPASS)",       `${D} run --rm img bash -c 'x'`,             "block"],
  ["attach (BYPASS)",    `${D} attach pbk`,                           "block"],
  ["rm -f (destroys)",   `${D} rm -f pbk`,                            "block"],
  ["cp (STAGE)",         `${D} cp /tmp/x.js pbk:/workspace/`,         "pass"],
  ["ps -a (READ)",       `${D} ps -a --format "{{.Names}}"`,       "pass"],
  ["logs (READ)",        `${D} logs --tail 50 pbk`,                   "pass"],
  ["inspect (READ)",     `${D} inspect pbk`,                          "pass"],
  ["HEREDOC WRITING a file that MENTIONS it", `cat > /tmp/t.ts <<'TS'\nconst x = "${D} exec foo";\nTS`, "pass"],
  ["send-keys (BYPASS)", `${T} send-keys -t x 'y' Enter`,             "block"],
];
let ok=0;
for (const [label,cmd,want] of CASES) {
  let v: unknown;
  try { v = await gate({ toolName:"bash", input:{command:cmd}, sessionId:"probe" } as never); } catch(e){ v={action:"threw",reason:String(e)}; }
  const got = (v as {action?:string})?.action === "block" ? "block":"pass";
  const good = got===want; ok+=good?1:0;
  console.log(`  ${good?"OK ":"XX "} ${label.padEnd(42)} want=${want.padEnd(5)} got=${got}`);
}
console.log(`\n  === ${ok}/${CASES.length} ===`);
