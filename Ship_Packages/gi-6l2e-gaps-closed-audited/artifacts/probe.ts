import { c2kgProbe } from "/home/leviathan/JARVIS_WORKSPACE/Shared_Workspace/Graph_Intelligence/src/omp/adapters/c2kg.ts";
try {
  const facts = c2kgProbe("/tmp/c2kg-null-probe").facts("anything");
  console.log("NULL_GUARD_OK facts=" + facts.length);
} catch (e) {
  console.log("NULL_GUARD_THREW " + (e instanceof Error ? e.message.slice(0,80) : String(e)));
}
