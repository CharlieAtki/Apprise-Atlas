import { describe, expect, it } from "vitest";

import { suggest } from "./suggest.js";

describe("suggest", () => {
  it("finds the candidate a renamed identifier most likely meant", () => {
    const result = suggest("flow_permitted_path_walkthrough", [
      "flow_governed_request_overview",
      "flow_permitted_path_walkthru",
      "deployment_reuse_walkthrough",
    ]);

    expect(result).toBe("flow_permitted_path_walkthru");
  });

  it("offers nothing when no candidate is close enough to be worth suggesting", () => {
    const result = suggest("governance-gateway", ["totally", "unrelated", "identifiers"]);

    expect(result).toBeUndefined();
  });

  it("never suggests the target itself, since the caller already knows it is missing", () => {
    const result = suggest("landscape", ["landscape"]);

    expect(result).toBeUndefined();
  });

  it("offers nothing when there are no candidates at all", () => {
    expect(suggest("landscape", [])).toBeUndefined();
  });

  it("holds short identifiers to a tighter budget than long ones", () => {
    // One edit out of three characters is a different word; one edit out of twenty
    // is a typo.
    expect(suggest("abc", ["xyz"])).toBeUndefined();
    expect(suggest("governance-gateway-view", ["governance-gateway-veiw"])).toBe(
      "governance-gateway-veiw",
    );
  });

  it("returns the closest candidate rather than the first acceptable one", () => {
    // "landsc4p3" is two edits away, "landscape2" is one; both are within budget.
    const result = suggest("landscape", ["landsc4p3", "landscape2"]);

    expect(result).toBe("landscape2");
  });

  it("resolves a tie to the candidate seen first, so the output is stable", () => {
    const result = suggest("landscap", ["landscape", "landscapz"]);

    expect(result).toBe("landscape");
  });
});
