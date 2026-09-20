import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { formatRef } from "./format.js";
import { refKey, refTarget, sameTarget, withoutFragment } from "./identity.js";
import { parseRef } from "./parse.js";
import { AtlasRefSchema } from "./ref.schema.js";

function parsed(input: string) {
  const result = parseRef(input);
  if (!result.ok) throw new Error(`expected ${input} to parse: ${result.error.reason}`);
  return result.ref;
}

describe("reference grammar", () => {
  it("keeps a file path literal so a reference reads like the thing it points at", () => {
    const ref = parsed("markdown:section/docs/governance.md#policy-evaluation");

    expect(ref).toEqual({
      provider: "markdown",
      kind: "section",
      externalId: "docs/governance.md",
      fragment: "policy-evaluation",
    });
  });

  it("treats every slash after the kind as part of the identifier", () => {
    expect(parsed("markdown:document/docs/a/b/c.md").externalId).toBe("docs/a/b/c.md");
  });

  it("keeps a dotted name literal, because that is how a model spells it", () => {
    expect(parsed("likec4:element/governance.gateway").externalId).toBe("governance.gateway");
  });

  it("reads a reference with no fragment as having none rather than an empty one", () => {
    expect(parsed("markdown:document/docs/a.md")).not.toHaveProperty("fragment");
  });

  it("splits on the first hash, so an escaped hash stays inside the identifier", () => {
    const ref = parsed("markdown:document/docs/c%23sharp.md#intro");

    expect(ref.externalId).toBe("docs/c#sharp.md");
    expect(ref.fragment).toBe("intro");
  });
});

describe("reference parse failures", () => {
  it("reports the character offset at which parsing failed", () => {
    const result = parseRef("Markdown:document/a.md");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.offset).toBe(0);
      expect(result.error.reason).toContain("Markdown");
    }
  });

  it("rejects a reference with no provider separator", () => {
    const result = parseRef("docs/governance.md");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toContain("provider");
  });

  it("rejects a reference with no kind separator", () => {
    const result = parseRef("markdown:document");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toContain("kind");
  });

  it("rejects a reference that names a kind but no identifier", () => {
    const result = parseRef("markdown:document/");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toContain("identifier");
  });

  it("rejects a reference that ends in a hash naming no fragment", () => {
    const result = parseRef("markdown:document/a.md#");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.reason).toContain("fragment");
  });

  it("rejects an empty reference", () => {
    expect(parseRef("").ok).toBe(false);
  });
});

describe("reference identity", () => {
  it("separates the thing addressed from the thing it points into", () => {
    const ref = parsed("markdown:section/docs/governance.md#policy-evaluation");

    expect(refKey(ref)).toBe("markdown:section/docs/governance.md#policy-evaluation");
    expect(refTarget(ref)).toBe("markdown:section/docs/governance.md");
  });

  it("treats two references into the same document as the same target", () => {
    const a = parsed("markdown:section/docs/x.md#one");
    const b = parsed("markdown:section/docs/x.md#two");

    expect(sameTarget(a, b)).toBe(true);
    expect(refKey(a)).not.toBe(refKey(b));
  });

  it("returns a reference unchanged when it has no fragment to remove", () => {
    const ref = parsed("markdown:document/docs/x.md");

    expect(withoutFragment(ref)).toBe(ref);
  });
});

describe("reference laws", () => {
  // The identifier and fragment arbitraries deliberately include the characters the
  // grammar has to escape.
  const segment = fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/);
  const free = fc
    .string({ minLength: 1, maxLength: 24 })
    .filter((s) => s.trim().length > 0 && !s.includes("\n"));

  it("round-trips every reference through format and parse", () => {
    fc.assert(
      fc.property(segment, segment, free, fc.option(free, { nil: undefined }), (p, k, id, frag) => {
        const ref = AtlasRefSchema.parse({
          provider: p,
          kind: k,
          externalId: id,
          ...(frag === undefined ? {} : { fragment: frag }),
        });

        const result = parseRef(formatRef(ref));
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.ref).toEqual(ref);
      }),
      { numRuns: 300 },
    );
  });

  it("round-trips every canonical string through parse and format", () => {
    fc.assert(
      fc.property(segment, segment, free, (p, k, id) => {
        const canonical = formatRef({ provider: p, kind: k, externalId: id });
        const result = parseRef(canonical);

        expect(result.ok).toBe(true);
        if (result.ok) expect(formatRef(result.ref)).toBe(canonical);
      }),
      { numRuns: 300 },
    );
  });
});
