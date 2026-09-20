import { describe, expect, it } from "vitest";

import { problem } from "./problem.js";
import { collect, failed, loaded, withProblems } from "./loaded.js";

describe("loaded", () => {
  it("keeps a usable value alongside the problems that were found in it", () => {
    const result = loaded({ id: "governance" }, [
      problem("unresolved-reference", { file: "a.yaml", line: 3 }, "m"),
    ]);

    expect(result.value).toEqual({ id: "governance" });
    expect(result.problems).toHaveLength(1);
  });

  it("never returns an undefined value without an error problem explaining why", () => {
    expect(() => failed([problem("unresolved-reference", { file: "a.yaml" }, "m")])).toThrow();
    expect(() => failed([])).toThrow();

    const result = failed([problem("unparseable", { file: "a.yaml" }, "m")]);
    expect(result.value).toBeUndefined();
  });

  it("returns every value it could understand even when one entry produced nothing", () => {
    const result = collect([
      loaded("first"),
      failed<string>([problem("unparseable", { file: "b.yaml" }, "m")]),
      loaded("third"),
    ]);

    expect(result.value).toEqual(["first", "third"]);
    expect(result.problems).toHaveLength(1);
  });

  it("keeps the problems of an entry that produced nothing", () => {
    const result = collect([failed<string>([problem("unparseable", { file: "b.yaml" }, "m")])]);

    expect(result.value).toEqual([]);
    expect(result.problems[0]?.file).toBe("b.yaml");
  });

  it("adds problems without disturbing the value already loaded", () => {
    const original = loaded("value");
    const extended = withProblems(original, [problem("wrong-kind", { file: "a.yaml" }, "m")]);

    expect(extended.value).toBe("value");
    expect(extended.problems).toHaveLength(1);
    expect(original.problems).toHaveLength(0);
  });
});
