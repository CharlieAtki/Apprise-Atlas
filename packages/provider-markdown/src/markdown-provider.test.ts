import { AtlasConfigSchema, type Workspace } from "@apprise/atlas-core";
import { InMemoryWorkspaceFs } from "@apprise/atlas-toolkit/testing";
import { describe, expect, it } from "vitest";

import { MarkdownProvider } from "./markdown-provider.js";

function workspace(files: Readonly<Record<string, string>>): Workspace {
  return {
    fs: new InMemoryWorkspaceFs(files),
    config: AtlasConfigSchema.parse({ sources: [{ provider: "markdown", path: "docs" }] }),
  };
}

describe("Markdown provider", () => {
  it("projects documents, Docusaurus-compatible heading anchors, ADRs and local assets", async () => {
    const provider = new MarkdownProvider();
    const result = await provider.project(
      workspace({
        ".adr-dir": "docs/adr\n",
        "docs/adr/0001-title.md":
          "---\ntitle: A Decision\n---\n# A Decision\n## Same\nText\n## Same\n![Diagram](../image.png)\n",
        "docs/image.png": "binary represented as text",
      }),
      { provider: "markdown", path: "docs", options: {} },
    );

    expect(result.problems).toEqual([]);
    expect(result.value?.map((record) => record.ref.kind)).toEqual([
      "document",
      "decision",
      "section",
      "section",
      "section",
      "asset",
    ]);
    expect(
      result.value
        ?.filter((record) => record.ref.kind === "section")
        .map((record) => record.ref.fragment),
    ).toEqual(["a-decision", "same", "same-1"]);
    expect(result.value?.find((record) => record.ref.kind === "asset")?.attributes).toEqual({
      referencedBy: ["docs/adr/0001-title.md"],
    });
  });

  it("turns front-matter declarations into source relationships without resolving them", async () => {
    const provider = new MarkdownProvider();
    const projected = await provider.project(
      workspace({
        "docs/guide.md":
          "---\natlas:\n  relationships:\n    - type: documents\n      to: likec4:element/governance.gateway\n---\n# Guide\n",
      }),
      { provider: "markdown", path: "docs", options: {} },
    );

    const related = await provider.relate(projected.value ?? []);

    expect(related.problems).toEqual([]);
    expect(related.value).toMatchObject([
      {
        type: "documents",
        origin: "source",
        to: { provider: "likec4", kind: "element", externalId: "governance.gateway" },
      },
    ]);
  });

  it("reports malformed front-matter relationships as loading errors", async () => {
    const provider = new MarkdownProvider();
    const projected = await provider.project(
      workspace({ "docs/guide.md": "---\natlas:\n  relationships: wrong\n---\n# Guide\n" }),
      { provider: "markdown", path: "docs", options: {} },
    );

    expect(projected.value).toEqual([]);
    expect(projected.problems[0]?.code).toBe("schema-violation");
  });
});
