import {
  WalkthroughSchema,
  failed,
  loaded,
  problem,
  type Loaded,
  type Problem,
  type ProblemLocation,
  type Walkthrough,
  type WorkspaceFs,
  parseRef,
} from "@apprise/atlas-core";

import { parseLocatedYaml } from "./located-yaml.js";

export type LocatedWalkthrough = {
  readonly walkthrough: Walkthrough;
  readonly file: string;
  readonly at: (path: readonly (string | number)[]) => ProblemLocation;
};

function filenameStem(path: string): string {
  const filename = path.slice(path.lastIndexOf("/") + 1);
  return filename.replace(/\.(yaml|yml)$/, "");
}

async function listWalkthroughFiles(
  fs: WorkspaceFs,
  directory: string,
): Promise<readonly string[]> {
  const [yaml, yml] = await Promise.all([
    fs.list(`${directory}/**/*.yaml`),
    fs.list(`${directory}/**/*.yml`),
  ]);
  return [...new Set([...yaml, ...yml])].sort();
}

function referenceProblems(
  walkthrough: Walkthrough,
  file: string,
  at: (path: readonly (string | number)[]) => { file: string; line?: number; column?: number },
): Problem[] {
  const problems: Problem[] = [];
  for (const [sceneIndex, scene] of walkthrough.scenes.entries()) {
    const references = [
      ...(scene.ref === undefined ? [] : [["ref", scene.ref] as const]),
      ...scene.see.map((reference, seeIndex) => [["see", seeIndex] as const, reference] as const),
    ];
    for (const [path, reference] of references) {
      const parsed = parseRef(reference);
      if (!parsed.ok) {
        problems.push(
          problem(
            "malformed-reference",
            at(["scenes", sceneIndex, ...path]),
            `${file} scene "${scene.id}" names "${reference}", but ${parsed.error.reason}. Correct the reference.`,
          ),
        );
      }
    }
  }
  return problems;
}

export async function loadWalkthroughs(
  fs: WorkspaceFs,
  directory: string,
): Promise<Loaded<Walkthrough[]>> {
  const result = await loadLocatedWalkthroughs(fs, directory);
  return result.value === undefined
    ? { value: undefined, problems: result.problems }
    : loaded(
        result.value.map(({ walkthrough }) => walkthrough),
        result.problems,
      );
}

export async function loadLocatedWalkthroughs(
  fs: WorkspaceFs,
  directory: string,
): Promise<Loaded<LocatedWalkthrough[]>> {
  let files: readonly string[];
  try {
    files = await listWalkthroughFiles(fs, directory);
  } catch {
    return failed([
      problem(
        "unreadable-file",
        { file: directory },
        `${directory} cannot be listed. Check that it exists and is readable.`,
      ),
    ]);
  }

  const values: LocatedWalkthrough[] = [];
  const problems: Problem[] = [];
  const ids = new Map<string, string>();
  for (const file of files) {
    let text: string;
    try {
      text = await fs.readFile(file);
    } catch {
      problems.push(
        problem("unreadable-file", { file }, `${file} cannot be read. Check that it is readable.`),
      );
      continue;
    }

    const located = parseLocatedYaml(text, file, WalkthroughSchema);
    if (located.result.value === undefined) {
      problems.push(...located.result.problems);
      continue;
    }
    const walkthrough = located.result.value;
    const semanticProblems = referenceProblems(walkthrough, file, located.at);
    if (walkthrough.id !== filenameStem(file)) {
      semanticProblems.push(
        problem(
          "id-filename-mismatch",
          located.at(["id"]),
          `${file} declares walkthrough id "${walkthrough.id}", but its filename requires "${filenameStem(file)}". Rename the file or the id so they match.`,
        ),
      );
    }
    const firstFile = ids.get(walkthrough.id);
    if (firstFile !== undefined) {
      semanticProblems.push(
        problem(
          "duplicate-id",
          located.at(["id"]),
          `${file} declares walkthrough id "${walkthrough.id}", already declared by ${firstFile}. Rename one walkthrough.`,
        ),
      );
    }
    if (semanticProblems.length > 0) {
      problems.push(...semanticProblems);
      continue;
    }
    ids.set(walkthrough.id, file);
    values.push({ walkthrough, file, at: located.at });
  }

  return loaded(values, problems);
}
