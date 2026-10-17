import path from "node:path";
import { assessLayer, loadLayerFixture } from "../src/gi/layer-health";

const dir = process.argv[2];
if (dir === undefined || dir.length === 0) {
  console.error("usage: bun scripts/layer-health.ts <fixture-dir>");
  process.exit(2);
}

const health = assessLayer(loadLayerFixture(path.resolve(dir)));
console.log(health.line);
process.exit(health.color === "RED" ? 1 : 0);
