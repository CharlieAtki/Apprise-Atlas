import { AtlasConfigSchema, type Workspace } from "@apprise/atlas-core";
import { InMemoryWorkspaceFs } from "@apprise/atlas-toolkit/testing";
import { describe, expect, it } from "vitest";

import { LikeC4Provider } from "./likec4-provider.js";

const source = `specification {
  element system
  element component
}

model {
  governance = system 'Governance' {
    gateway = component 'Governance Gateway' 'Governs requests'
  }
}

views {
  view flow_permitted_path_walkthrough of governance {
    include *
  }
}
`;

function workspace(files: Readonly<Record<string, string>>): Workspace {
  return {
    fs: new InMemoryWorkspaceFs(files),
    config: AtlasConfigSchema.parse({ sources: [{ provider: "likec4", path: "architecture" }] }),
  };
}

describe("LikeC4 provider", () => {
  it("projects stable view and element references from a configured directory", async () => {
    const provider = new LikeC4Provider();
    const result = await provider.project(workspace({ "architecture/model.c4": source }), {
      provider: "likec4",
      path: "architecture",
      options: {},
    });

    expect(result.problems).toEqual([]);
    expect(result.value?.map((record) => record.ref)).toEqual([
      { provider: "likec4", kind: "element", externalId: "governance" },
      { provider: "likec4", kind: "element", externalId: "governance.gateway" },
      { provider: "likec4", kind: "view", externalId: "flow_permitted_path_walkthrough" },
      { provider: "likec4", kind: "view", externalId: "index" },
    ]);
    expect(result.value?.[1]).toMatchObject({
      provenance: { sourcePath: "architecture" },
      attributes: { likec4Kind: "component", likec4Tags: [] },
      summary: "Governs requests",
      text: "Governs requests",
    });
    expect(provider.relate).toBeUndefined();
  });

  it("reads both LikeC4 extensions in stable source order", async () => {
    const provider = new LikeC4Provider();
    const result = await provider.project(
      workspace({
        "architecture/spec.c4":
          "specification { element system }\nmodel { system = system 'System' }\n",
        "architecture/views.likec4": "views { view index of system { include * } }\n",
      }),
      { provider: "likec4", path: "architecture", options: {} },
    );

    expect(result.value?.map((record) => record.ref.externalId)).toEqual(["system", "index"]);
  });

  it("projects a configured LikeC4 file without requiring a directory source", async () => {
    const provider = new LikeC4Provider();
    const result = await provider.project(workspace({ "model.likec4": source }), {
      provider: "likec4",
      path: "model.likec4",
      options: {},
    });

    expect(result.problems).toEqual([]);
    expect(result.value?.[0]?.provenance).toEqual({ sourcePath: "model.likec4" });
    expect(
      result.value?.find((record) => record.ref.kind === "view")?.ref.fragment,
    ).toBeUndefined();
  });

  it("discovers established architecture roots and root model files in a stable order", async () => {
    const provider = new LikeC4Provider();
    const result = await provider.discover(
      workspace({
        "architecture/model.c4": source,
        "likec4/model.likec4": source,
        "model.c4": source,
        "model.likec4": source,
      }),
    );

    expect(result.map((location) => location.path)).toEqual([
      "architecture",
      "likec4",
      "model.c4",
      "model.likec4",
    ]);
  });

  it("returns a tolerant unparseable error instead of records for an invalid model", async () => {
    const provider = new LikeC4Provider();
    const result = await provider.project(
      workspace({ "architecture/model.c4": "model { this is not LikeC4" }),
      { provider: "likec4", path: "architecture", options: {} },
    );

    expect(result.value).toBeUndefined();
    expect(result.problems.some((entry) => entry.code === "unparseable")).toBe(true);
  });
});
