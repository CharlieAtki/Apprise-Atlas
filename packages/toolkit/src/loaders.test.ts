import { AtlasConfigSchema } from "@apprise/atlas-core";
import { describe, expect, it } from "vitest";

import { InMemoryWorkspaceFs } from "./adapters/in-memory-workspace-fs.js";
import { loadConfig } from "./load-config.js";
import { parseLocatedYaml } from "./located-yaml.js";
import { loadWalkthroughs } from "./load-walkthroughs.js";

describe("located YAML", () => {
  it("locates a nested schema violation at the value that needs correction", () => {
    const result = parseLocatedYaml(
      "sources:\n  - provider: markdown\n    path: 4\n",
      "atlas.config.yaml",
      AtlasConfigSchema,
    ).result;

    expect(result.problems[0]).toMatchObject({ code: "schema-violation", line: 3, column: 11 });
  });

  it("reports invalid YAML as an unparseable file", () => {
    const result = parseLocatedYaml("sources: [", "atlas.config.yaml", AtlasConfigSchema).result;

    expect(result.value).toBeUndefined();
    expect(result.problems[0]?.code).toBe("unparseable");
  });
});

describe("walkthrough loading", () => {
  it("retains valid files while reporting duplicate and malformed walkthroughs", async () => {
    const fs = new InMemoryWorkspaceFs({
      "atlas/walkthroughs/one.yaml":
        "id: one\ntitle: One\nscenes:\n  - id: start\n    title: Start\n",
      "atlas/walkthroughs/two.yml":
        "id: one\ntitle: Two\nscenes:\n  - id: start\n    title: Start\n",
      "atlas/walkthroughs/bad.yaml":
        "id: bad\ntitle: Bad\nscenes:\n  - id: start\n    title: Start\n    ref: bad-reference\n",
    });

    const result = await loadWalkthroughs(fs, "atlas/walkthroughs");

    expect(result.value?.map((walkthrough) => walkthrough.id)).toEqual(["one"]);
    expect(result.problems.map((entry) => entry.code)).toEqual([
      "malformed-reference",
      "id-filename-mismatch",
      "duplicate-id",
    ]);
  });

  it("requires the filename and walkthrough id to agree", async () => {
    const fs = new InMemoryWorkspaceFs({
      "atlas/walkthroughs/file-name.yaml":
        "id: another-name\ntitle: Name\nscenes:\n  - id: start\n    title: Start\n",
    });

    const result = await loadWalkthroughs(fs, "atlas/walkthroughs");

    expect(result.value).toEqual([]);
    expect(result.problems[0]).toMatchObject({
      code: "id-filename-mismatch",
      file: "atlas/walkthroughs/file-name.yaml",
    });
  });
});

describe("configuration loading", () => {
  it("applies schema defaults after reading atlas.config.yaml", async () => {
    const fs = new InMemoryWorkspaceFs({
      "atlas.config.yaml": "sources:\n  - provider: markdown\n    path: docs\n",
    });

    const result = await loadConfig(fs);

    expect(result.value).toMatchObject({
      atlasConfigVersion: 1,
      walkthroughs: "atlas/walkthroughs",
    });
  });
});
