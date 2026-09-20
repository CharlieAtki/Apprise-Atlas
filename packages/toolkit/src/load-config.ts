import {
  AtlasConfigSchema,
  failed,
  loaded,
  problem,
  type Loaded,
  type AtlasConfig,
  type ProblemLocation,
  type WorkspaceFs,
} from "@apprise/atlas-core";

import { parseLocatedYaml } from "./located-yaml.js";

export type LocatedConfig = {
  readonly config: AtlasConfig;
  readonly at: (path: readonly (string | number)[]) => ProblemLocation;
};

export async function loadLocatedConfig(
  fs: WorkspaceFs,
  path = "atlas.config.yaml",
): Promise<Loaded<LocatedConfig>> {
  let text: string;
  try {
    text = await fs.readFile(path);
  } catch {
    return failed([
      problem(
        "unreadable-file",
        { file: path },
        `${path} cannot be read. Check that it exists and is readable.`,
      ),
    ]);
  }

  const located = parseLocatedYaml(text, path, AtlasConfigSchema);
  return located.result.value === undefined
    ? { value: undefined, problems: located.result.problems }
    : loaded({ config: located.result.value, at: located.at }, located.result.problems);
}

export async function loadConfig(
  fs: WorkspaceFs,
  path = "atlas.config.yaml",
): Promise<Loaded<AtlasConfig>> {
  const result = await loadLocatedConfig(fs, path);
  return result.value === undefined
    ? { value: undefined, problems: result.problems }
    : loaded(result.value.config, result.problems);
}
