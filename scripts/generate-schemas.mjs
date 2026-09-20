/**
 * Writes the generated JSON Schema documents to schemas/.
 *
 * Lives here rather than in core because core may not touch a filesystem. Run by
 * `xc schema`; CI runs it and then fails if the working tree is dirty, which is what
 * makes the published format reference impossible to drift from the schemas that
 * define it.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { toJsonSchemas } from "../packages/core/dist/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(repoRoot, "schemas");

await mkdir(outDir, { recursive: true });

for (const { name, schema } of toJsonSchemas()) {
  const target = join(outDir, `${name}.json`);
  await writeFile(target, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
  console.log(`wrote schemas/${name}.json`);
}
