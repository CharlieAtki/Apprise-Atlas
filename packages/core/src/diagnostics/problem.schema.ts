/**
 * The shape of everything Atlas reports to a user or a machine.
 *
 * A problem crosses a process boundary through `--format json`, so it is a schema
 * rather than a hand-written type: consumers parse it, and their CI depends on it.
 */
import { z } from "zod";

export const SeveritySchema = z.enum(["error", "warning"]);
export type Severity = z.output<typeof SeveritySchema>;

/**
 * Stable identifiers, part of the published contract. A consumer branches on the code;
 * it should never have to match on English prose. Adding one is a public API change.
 *
 * Loading codes describe an entity that could not be understood. Validation codes
 * describe a usable entity holding a stale or mistyped reference. See AGENTS.md.
 */
export const ProblemCodeSchema = z.enum([
  // Loading — the entity cannot be understood.
  "unreadable-file",
  "unparseable",
  "schema-violation",
  "duplicate-id",
  "id-filename-mismatch",
  "malformed-reference",
  "unavailable-provider",

  // Validation — the entity is usable, but a reference in it does not resolve.
  "unresolved-reference",
  "wrong-kind",
  "unknown-fragment",
  "asymmetric-link",
]);
export type ProblemCode = z.output<typeof ProblemCodeSchema>;

export const ProblemSchema = z.object({
  code: ProblemCodeSchema,
  severity: SeveritySchema,
  /**
   * The complete sentence shown to a person. It names both ends of the problem and
   * says what to do about it; "unresolved reference" on its own is not acceptable.
   */
  message: z.string().min(1),
  /** Workspace-relative path. A problem always belongs to a file. */
  file: z.string().min(1),
  /** 1-based. Absent when the problem concerns the file as a whole. */
  line: z.number().int().positive().optional(),
  /** 1-based. Absent unless a line is present. */
  column: z.number().int().positive().optional(),
});
export type Problem = z.output<typeof ProblemSchema>;

/** Stable totals accompanying diagnostics sent across a process boundary. */
export const ProblemSummarySchema = z.object({
  errors: z.number().int().nonnegative(),
  warnings: z.number().int().nonnegative(),
});
export type ProblemSummary = z.output<typeof ProblemSummarySchema>;

/** The machine-readable result emitted by validation commands. */
export const ValidationReportSchema = z.object({
  problems: z.array(ProblemSchema),
  summary: ProblemSummarySchema,
});
export type ValidationReport = z.output<typeof ValidationReportSchema>;
