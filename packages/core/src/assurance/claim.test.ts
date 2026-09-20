import { describe, expect, it } from "vitest";

import { ClaimSchema, EvidenceSchema } from "./claim.schema.js";

const subject = { provider: "likec4", kind: "element", externalId: "governance.gateway" };

describe("claim", () => {
  it("keeps maturity and verification as independent axes", () => {
    const implementedButUnproven = ClaimSchema.parse({
      subject,
      maturity: "implemented",
      verification: "design",
    });
    const plannedButTested = ClaimSchema.parse({
      subject,
      maturity: "planned",
      verification: "automated",
    });

    expect(implementedButUnproven.maturity).toBe("implemented");
    expect(implementedButUnproven.verification).toBe("design");
    expect(plannedButTested.maturity).toBe("planned");
    expect(plannedButTested.verification).toBe("automated");
  });

  it("defaults evidence to empty, so an unproven claim is expressible rather than impossible", () => {
    const claim = ClaimSchema.parse({ subject, maturity: "planned", verification: "design" });

    expect(claim.evidence).toEqual([]);
  });

  it("records a test as evidence, pinned when it lives in another repository", () => {
    const evidence = EvidenceSchema.parse({
      kind: "test",
      path: "internal/policy/eval_test.go",
      pinned: "0ad691dfbb9095d7b2d786a53ef22afdd7a1e9c6",
    });

    expect(evidence).toEqual({
      kind: "test",
      path: "internal/policy/eval_test.go",
      pinned: "0ad691dfbb9095d7b2d786a53ef22afdd7a1e9c6",
    });
  });

  it("records a live observation as evidence carrying when it was seen", () => {
    const evidence = EvidenceSchema.parse({
      kind: "run",
      url: "https://tempo.internal/trace/abc123",
      at: "2026-09-20T14:00:00Z",
    });

    expect(evidence.kind).toBe("run");
  });

  it("rejects an evidence kind it does not know how to interpret", () => {
    expect(EvidenceSchema.safeParse({ kind: "vibes", path: "x" }).success).toBe(false);
  });

  it("rejects a maturity outside the published vocabulary", () => {
    expect(
      ClaimSchema.safeParse({ subject, maturity: "nearly", verification: "design" }).success,
    ).toBe(false);
  });
});
