import { discoverSourceRoots } from "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/src/hunter/profile/source-roots.ts";
import * as fs from "node:fs"; import * as os from "node:os"; import * as path from "node:path";
const mk = (setup: (d: string) => void) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "probe-")); setup(d); return d; };
const t = (name: string, d: string) => {
  const r = discoverSourceRoots(d);
  const out = "error" in r ? `ERR ${r.error.slice(0, 60)}` : `roots=${r.roots.length} [${r.evidence.slice(0, 50)}]`;
  console.log(`  ${name.padEnd(28)} → ${out}`);
};
// rule 2: pnpm workspace
t("R2 pnpm-workspace", mk((d) => { fs.writeFileSync(path.join(d, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'\n"); fs.mkdirSync(path.join(d, "packages/a/src"), { recursive: true }); fs.writeFileSync(path.join(d, "packages/a/src/x.ts"), "export const x=1;"); }));
// rule 2b: package.json workspaces
t("R2b pkg-workspaces", mk((d) => { fs.writeFileSync(path.join(d, "package.json"), JSON.stringify({ workspaces: ["libs/*"] })); fs.mkdirSync(path.join(d, "libs/b/src"), { recursive: true }); fs.writeFileSync(path.join(d, "libs/b/src/y.ts"), "export const y=1;"); }));
// rule 3: tsconfig include
t("R3 tsconfig-include", mk((d) => { fs.writeFileSync(path.join(d, "tsconfig.json"), JSON.stringify({ include: ["app/**/*.ts"] })); fs.mkdirSync(path.join(d, "app"), { recursive: true }); fs.writeFileSync(path.join(d, "app/z.ts"), "export const z=1;"); }));
// rule 4: plain src
t("R4 plain-src", mk((d) => { fs.mkdirSync(path.join(d, "src"), { recursive: true }); fs.writeFileSync(path.join(d, "src/a.ts"), "export const a=1;"); }));
// rule 4b: lib
t("R4b lib", mk((d) => { fs.mkdirSync(path.join(d, "lib"), { recursive: true }); fs.writeFileSync(path.join(d, "lib/a.ts"), "export const a=1;"); }));
// rule 5: nested walk (no src/, .ts deep)
t("R5 nested-walk", mk((d) => { fs.mkdirSync(path.join(d, "deep/nest"), { recursive: true }); fs.writeFileSync(path.join(d, "deep/nest/a.ts"), "export const a=1;"); }));
// none
t("NONE (empty)", mk(() => {}));
// adversarial: only .js, no .ts
t("ADV only-js", mk((d) => { fs.mkdirSync(path.join(d, "src"), { recursive: true }); fs.writeFileSync(path.join(d, "src/a.js"), "module.exports=1;"); }));
// adversarial: profile sources key (rule 1)
t("R1 profile-sources", mk((d) => { fs.mkdirSync(path.join(d, ".omp/graph-intelligence"), { recursive: true }); fs.writeFileSync(path.join(d, ".omp/graph-intelligence/profile.yaml"), "sources:\n  - custom\n"); fs.mkdirSync(path.join(d, "custom"), { recursive: true }); fs.writeFileSync(path.join(d, "custom/a.ts"), "export const a=1;"); }));
