import { describe, expect, it } from "vitest";

import {
  loaded,
  problem,
  type Provider,
  type Relationship,
  type SourceRecord,
} from "@apprise/atlas-core";

import { InMemoryWorkspaceFs } from "./adapters/in-memory-workspace-fs.js";
import { validateWorkspace } from "./validate-workspace.js";

function sourceRecord(kind: string, externalId: string, fragment?: string): SourceRecord {
  return {
    ref: { provider: "test", kind, externalId, ...(fragment === undefined ? {} : { fragment }) },
    title: externalId,
    provenance: { sourcePath: "docs/source.md" },
    attributes: {},
  };
}

function provider(
  records: readonly SourceRecord[],
  relationships: readonly Relationship[] = [],
): Provider {
  return {
    id: "test",
    async discover(): Promise<readonly []> {
      return [];
    },
    async project() {
      return loaded([...records]);
    },
    async relate() {
      return loaded([...relationships]);
    },
  };
}

function workspace(
  walkthrough: string,
  sources = "  - provider: test\n    path: docs",
): InMemoryWorkspaceFs {
  return new InMemoryWorkspaceFs({
    "atlas.config.yaml": `atlasConfigVersion: 1\nsources:\n${sources}\nwalkthroughs: atlas/walkthroughs\n`,
    "atlas/walkthroughs/demo.yaml": walkthrough,
  });
}

const walkthroughWithReferences = `atlasWalkthroughVersion: 1
id: demo
title: Demo
scenes:
  - id: unknown-fragment
    title: Unknown fragment
    ref: test:section/docs/guide.md#missing
  - id: wrong-kind
    title: Wrong kind
    ref: test:decision/docs/decision.md
  - id: unresolved
    title: Unresolved
    ref: test:document/docs/guid.md
`;

describe("validate workspace", () => {
  it("classifies valid walkthrough references without losing their YAML locations", async () => {
    const result = await validateWorkspace(workspace(walkthroughWithReferences), [
      provider([
        sourceRecord("section", "docs/guide.md", "present"),
        sourceRecord("document", "docs/decision.md"),
        sourceRecord("document", "docs/guide.md"),
      ]),
    ]);

    expect(result.problems).toMatchObject([
      { code: "unknown-fragment", file: "atlas/walkthroughs/demo.yaml", line: 7 },
      { code: "wrong-kind", file: "atlas/walkthroughs/demo.yaml", line: 10 },
      { code: "unresolved-reference", file: "atlas/walkthroughs/demo.yaml", line: 13 },
    ]);
    expect(result.problems[2]?.message).toContain("test:document/docs/guide.md");
  });

  it("names an unregistered configured provider at the provider field", async () => {
    const result = await validateWorkspace(
      workspace(
        "id: demo\ntitle: Demo\nscenes:\n  - id: narrative\n    title: Narrative\n",
        "  - provider: missing\n    path: docs",
      ),
      [],
    );

    expect(result.problems).toMatchObject([
      { code: "unavailable-provider", file: "atlas.config.yaml", line: 3, column: 15 },
    ]);
  });

  it("requires each mapped source relationship to have its inverse declaration", async () => {
    const left = sourceRecord("document", "docs/left.md");
    const right = sourceRecord("document", "docs/right.md");
    const relationships = ["documents", "justifies", "verifies", "observes"].map(
      (type, index): Relationship => ({
        from: left.ref,
        type,
        to: right.ref,
        origin: "source",
        provenance: { sourcePath: "docs/left.md", sourceLine: index + 1 },
      }),
    );
    const result = await validateWorkspace(
      workspace("id: demo\ntitle: Demo\nscenes:\n  - id: narrative\n    title: Narrative\n"),
      [provider([left, right], relationships)],
    );

    expect(result.problems.filter((entry) => entry.code === "asymmetric-link")).toHaveLength(4);
  });

  it("accepts declared inverse relationships and exempts inferred and runtime links", async () => {
    const left = sourceRecord("document", "docs/left.md");
    const right = sourceRecord("document", "docs/right.md");
    const reciprocal: Relationship[] = [
      {
        from: left.ref,
        type: "documents",
        to: right.ref,
        origin: "source",
        provenance: { sourcePath: "docs/left.md" },
      },
      {
        from: right.ref,
        type: "documented-by",
        to: left.ref,
        origin: "explicit",
        provenance: { sourcePath: "docs/right.md" },
      },
      {
        from: left.ref,
        type: "verifies",
        to: right.ref,
        origin: "inferred",
        provenance: { sourcePath: "docs/left.md" },
      },
      {
        from: left.ref,
        type: "observes",
        to: right.ref,
        origin: "runtime",
        provenance: { sourcePath: "docs/left.md" },
      },
    ];
    const result = await validateWorkspace(
      workspace("id: demo\ntitle: Demo\nscenes:\n  - id: narrative\n    title: Narrative\n"),
      [provider([left, right], reciprocal)],
    );

    expect(result.problems.filter((entry) => entry.code === "asymmetric-link")).toHaveLength(0);
  });

  it("retains a usable graph when a provider reports a loading error", async () => {
    const partial: Provider = {
      id: "test",
      async discover(): Promise<readonly []> {
        return [];
      },
      async project() {
        return loaded(
          [sourceRecord("document", "docs/guide.md")],
          [
            problem(
              "unreadable-file",
              { file: "docs/broken.md" },
              "docs/broken.md cannot be read.",
            ),
          ],
        );
      },
    };
    const result = await validateWorkspace(
      workspace("id: demo\ntitle: Demo\nscenes:\n  - id: narrative\n    title: Narrative\n"),
      [partial],
    );

    expect(result.value?.index.records()).toHaveLength(1);
    expect(result.problems).toMatchObject([{ code: "unreadable-file", file: "docs/broken.md" }]);
  });
});
