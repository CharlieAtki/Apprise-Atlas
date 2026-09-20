import { describe, expect, it } from "vitest";

import { type Relationship, type SourceRecord } from "@apprise/atlas-core";

import { buildIndex } from "./generated-local-index.js";

function record(
  externalId: string,
  title = externalId,
  attributes: Record<string, unknown> = {},
): SourceRecord {
  return {
    ref: { provider: "test", kind: "document", externalId },
    title,
    text: `${title} body`,
    provenance: { sourcePath: `docs/${externalId}.md` },
    attributes,
  };
}

describe("generated local index", () => {
  it("resolves exact records and returns relationships touching either endpoint", async () => {
    const left = record("left");
    const right = record("right");
    const edge: Relationship = {
      from: left.ref,
      type: "documents",
      to: right.ref,
      origin: "source",
      provenance: { sourcePath: "docs/left.md", sourceLine: 4 },
    };
    const result = buildIndex([left, right], [edge]);

    expect(await result.value?.resolve(left.ref)).toEqual(left);
    expect(await result.value?.neighbours(right.ref)).toEqual([edge]);
  });

  it("searches deterministically by relevance and honours the requested limit", async () => {
    const result = buildIndex(
      [
        record("architecture", "Architecture guide"),
        record("architecture-notes", "Notes"),
        record("other", "Architecture appendix"),
      ],
      [],
    );

    const matches = await result.value?.search({ text: "architecture", limit: 2 });

    expect(matches?.map(({ record: value }) => value.ref.externalId)).toEqual([
      "architecture",
      "architecture-notes",
    ]);
  });

  it("keeps the first canonical reference and locates later collisions", () => {
    const first = record("guide", "First", { privateProviderValue: true });
    const duplicate = {
      ...record("guide", "Second"),
      provenance: { sourcePath: "other/guide.md", sourceLine: 8 },
    } satisfies SourceRecord;
    const result = buildIndex([first, duplicate], []);

    expect(result.value?.records()).toEqual([first]);
    expect(result.problems).toMatchObject([
      { code: "duplicate-id", file: "other/guide.md", line: 8 },
    ]);
    expect(result.value?.records()[0]?.attributes).toEqual({ privateProviderValue: true });
  });
});
