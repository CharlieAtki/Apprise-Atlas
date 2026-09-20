import { describe, expect, it } from "vitest";

import { IndexShowReportSchema } from "./query-report.schema.js";

const record = {
  ref: { provider: "markdown", kind: "document", externalId: "docs/guide.md" },
  title: "Guide",
  provenance: { sourcePath: "docs/guide.md" },
};

describe("index show report", () => {
  it("requires exactly one of a resolved record and an unresolved query", () => {
    const common = {
      problems: [],
      summary: { errors: 0, warnings: 0 },
      relationships: [],
    };

    expect(
      IndexShowReportSchema.safeParse({
        ...common,
        record,
        unresolved: null,
      }).success,
    ).toBe(true);
    expect(
      IndexShowReportSchema.safeParse({
        ...common,
        record: null,
        unresolved: { ref: record.ref },
      }).success,
    ).toBe(true);
    expect(
      IndexShowReportSchema.safeParse({
        ...common,
        record: null,
        unresolved: null,
      }).success,
    ).toBe(false);
  });
});
