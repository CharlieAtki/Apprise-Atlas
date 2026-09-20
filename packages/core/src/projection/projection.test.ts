import { describe, expect, it } from "vitest";

import { RelationshipSchema } from "../graph/relationship.schema.js";
import { ProvenanceSchema } from "./provenance.schema.js";
import { SourceRecordSchema } from "./source-record.schema.js";

const fromFile = { sourcePath: "docs/governance.md" };

describe("provenance", () => {
  it("refuses a provenance that cannot name where the fact came from", () => {
    expect(ProvenanceSchema.safeParse({}).success).toBe(false);
    expect(ProvenanceSchema.safeParse({ sourceVersion: "abc123" }).success).toBe(false);
  });

  it("accepts a fact read from the repository and one queried from a backend", () => {
    expect(ProvenanceSchema.safeParse(fromFile).success).toBe(true);
    expect(
      ProvenanceSchema.safeParse({
        sourceUrl: "https://tempo.internal/api/traces",
        query: 'service.name="apprise-api"',
        retrievedAt: "2026-09-20T14:00:00Z",
      }).success,
    ).toBe(true);
  });

  it("rejects a content hash that is not sha256 in lowercase hex", () => {
    expect(ProvenanceSchema.safeParse({ ...fromFile, contentHash: "abc" }).success).toBe(false);
    expect(
      ProvenanceSchema.safeParse({ ...fromFile, contentHash: `sha256:${"a".repeat(64)}` }).success,
    ).toBe(true);
  });
});

describe("source record", () => {
  it("refuses a source record that cannot name its source", () => {
    const result = SourceRecordSchema.safeParse({
      ref: { provider: "markdown", kind: "document", externalId: "docs/a.md" },
      title: "A",
      provenance: {},
    });

    expect(result.success).toBe(false);
  });

  it("defaults attributes to empty so a provider need not supply them", () => {
    const result = SourceRecordSchema.parse({
      ref: { provider: "markdown", kind: "document", externalId: "docs/a.md" },
      title: "A",
      provenance: fromFile,
    });

    expect(result.attributes).toEqual({});
  });

  it("carries provider-specific attributes through without inspecting them", () => {
    const result = SourceRecordSchema.parse({
      ref: { provider: "likec4", kind: "element", externalId: "governance.gateway" },
      title: "Governance Gateway",
      provenance: { sourcePath: "architecture/model.c4" },
      attributes: { maturity: "implemented", nested: { anything: [1, 2] } },
    });

    expect(result.attributes["nested"]).toEqual({ anything: [1, 2] });
  });
});

describe("relationship", () => {
  const link = {
    from: { provider: "likec4", kind: "element", externalId: "governance.gateway" },
    type: "documented-by",
    to: { provider: "markdown", kind: "document", externalId: "docs/governance.md" },
    origin: "explicit" as const,
    provenance: { sourcePath: "atlas/relationships.yaml", sourceLine: 12 },
  };

  it("requires provenance so a one-sided link can name the file that declared it", () => {
    const { provenance, ...withoutProvenance } = link;

    expect(RelationshipSchema.safeParse(withoutProvenance).success).toBe(false);
    expect(RelationshipSchema.parse(link).provenance.sourceLine).toBe(12);
  });

  it("accepts a relationship whose validity window is open at both ends", () => {
    expect(RelationshipSchema.parse(link)).not.toHaveProperty("validFrom");
  });

  it("carries a validity window on a fact observed from a running system", () => {
    const observed = RelationshipSchema.parse({
      ...link,
      type: "observed-as",
      origin: "runtime",
      validFrom: "2026-09-20T00:00:00Z",
      validUntil: "2026-09-20T01:00:00Z",
    });

    expect(observed.origin).toBe("runtime");
    expect(observed.validUntil).toBe("2026-09-20T01:00:00Z");
  });

  it("rejects a confidence outside the range a probability can take", () => {
    expect(RelationshipSchema.safeParse({ ...link, confidence: 1.5 }).success).toBe(false);
    expect(RelationshipSchema.safeParse({ ...link, confidence: 0.8 }).success).toBe(true);
  });
});
