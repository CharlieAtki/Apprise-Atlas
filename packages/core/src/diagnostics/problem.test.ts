import { describe, expect, it } from "vitest";

import { ProblemSchema, ValidationReportSchema } from "./problem.schema.js";
import { exitCode, problem, severityOf, sortProblems, summarise } from "./problem.js";

describe("problem", () => {
  it("derives severity from the code so the same code cannot be reported two ways", () => {
    expect(severityOf("unparseable")).toBe("error");
    expect(severityOf("unresolved-reference")).toBe("warning");

    const built = problem("unresolved-reference", { file: "a.yaml" }, "anything");
    expect(built.severity).toBe("warning");
  });

  it("makes an unavailable configured provider a loading error", () => {
    expect(severityOf("unavailable-provider")).toBe("error");
  });

  it("validates the machine-readable report shape from the same diagnostic truth", () => {
    expect(
      ValidationReportSchema.safeParse({
        problems: [problem("unresolved-reference", { file: "atlas/walkthroughs/demo.yaml" }, "m")],
        summary: { errors: 0, warnings: 1 },
      }).success,
    ).toBe(true);
  });

  it("treats a problem about a whole file as having no line or column", () => {
    const built = problem("unreadable-file", { file: "a.yaml" }, "cannot read a.yaml");

    expect(built).not.toHaveProperty("line");
    expect(built).not.toHaveProperty("column");
    expect(ProblemSchema.safeParse(built).success).toBe(true);
  });

  it("rejects a problem that cannot say which file it is about", () => {
    const result = ProblemSchema.safeParse({
      code: "unparseable",
      severity: "error",
      message: "broken",
      file: "",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative line, because locations are one-based", () => {
    const at = { code: "unparseable", severity: "error", message: "m", file: "a.yaml" };

    expect(ProblemSchema.safeParse({ ...at, line: 0 }).success).toBe(false);
    expect(ProblemSchema.safeParse({ ...at, line: 1 }).success).toBe(true);
  });

  it("sorts problems by file, then line, then column, then code", () => {
    const sorted = sortProblems([
      problem("unparseable", { file: "b.yaml", line: 1 }, "m"),
      problem("unresolved-reference", { file: "a.yaml", line: 9, column: 2 }, "m"),
      problem("unparseable", { file: "a.yaml", line: 9, column: 1 }, "m"),
      problem("duplicate-id", { file: "a.yaml", line: 2 }, "m"),
    ]);

    expect(sorted.map((p) => [p.file, p.line, p.column])).toEqual([
      ["a.yaml", 2, undefined],
      ["a.yaml", 9, 1],
      ["a.yaml", 9, 2],
      ["b.yaml", 1, undefined],
    ]);
  });

  it("orders a file-level problem before a located one in the same file", () => {
    const sorted = sortProblems([
      problem("unresolved-reference", { file: "a.yaml", line: 4 }, "m"),
      problem("unreadable-file", { file: "a.yaml" }, "m"),
    ]);

    expect(sorted[0]?.code).toBe("unreadable-file");
  });

  it("counts errors and warnings separately", () => {
    const summary = summarise([
      problem("unparseable", { file: "a.yaml" }, "m"),
      problem("unresolved-reference", { file: "a.yaml" }, "m"),
      problem("unresolved-reference", { file: "b.yaml" }, "m"),
    ]);

    expect(summary).toEqual({ errors: 1, warnings: 2 });
  });

  it("fails the exit code on a warning only when strict is asked for", () => {
    const warnings = [problem("unresolved-reference", { file: "a.yaml" }, "m")];

    expect(exitCode(warnings, false)).toBe(0);
    expect(exitCode(warnings, true)).toBe(1);
  });

  it("fails the exit code on an error whether or not strict is asked for", () => {
    const errors = [problem("unparseable", { file: "a.yaml" }, "m")];

    expect(exitCode(errors, false)).toBe(1);
    expect(exitCode(errors, true)).toBe(1);
  });

  it("succeeds on an empty problem list under strict", () => {
    expect(exitCode([], true)).toBe(0);
  });
});
