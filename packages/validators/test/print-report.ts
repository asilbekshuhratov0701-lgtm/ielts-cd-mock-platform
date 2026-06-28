import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateExamFile, formatReport } from "../src/exam-import.ts";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
  const json = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  console.log(`\n=== ${file} ===`);
  console.log(formatReport(validateExamFile(json)));
}
