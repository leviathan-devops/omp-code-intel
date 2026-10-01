import { isBypassWrite } from "/home/leviathan/.omp/wt/graph-intelligence-66dfa4c/pbk-anchor2/src/middleware/container-gate.ts";
const D = "docker";
const CASES: Array<[string,string,string,boolean]> = [
  ["a test that MENTIONS it in a string", "/x/t.test.ts", "const c = `" + D + " exec foo`;", false],
  ["a test that SPAWNS it", "/x/t.test.ts", "spawnSync(\"" + D + "\", [\"exec\", \"x\"])", true],
  ["a test with the verbiage only", "/x/t.test.ts", "// this tests the " + D + " gate", false],
  ["a NON-test file mentioning it", "/x/README.md", D + " exec", false],
  ["a legit test (no container)", "/x/t.test.ts", "expect(add(1,2)).toBe(3)", false],
];
let ok=0;
for (const [label,path,content,want] of CASES) {
  const got = isBypassWrite(path, content);
  const good = got===want; ok+=good?1:0;
  console.log(`  ${good?"OK ":"XX "} ${label.padEnd(38)} bypass=${String(got).padEnd(5)} (want ${want})`);
}
console.log(`\n  === ${ok}/${CASES.length} ===`);
