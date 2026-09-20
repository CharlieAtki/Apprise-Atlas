/**
 * Rules about problems: which codes are errors, how a list of them is ordered, and
 * what a run's exit code should be.
 *
 * Severity is derived from the code rather than supplied alongside it, so there is one
 * definition of "which codes stop an entity being understood" and a caller cannot
 * report the same code at two different severities.
 */
import {
  type Problem,
  type ProblemCode,
  type ProblemSummary,
  type Severity,
  ProblemCodeSchema,
} from "./problem.schema.js";

const SEVERITY_BY_CODE = {
  "unreadable-file": "error",
  unparseable: "error",
  "schema-violation": "error",
  "duplicate-id": "error",
  "id-filename-mismatch": "error",
  "malformed-reference": "error",
  "unavailable-provider": "error",

  "unresolved-reference": "warning",
  "wrong-kind": "warning",
  "unknown-fragment": "warning",
  "asymmetric-link": "warning",
} as const satisfies Record<ProblemCode, Severity>;

export function severityOf(code: ProblemCode): Severity {
  return SEVERITY_BY_CODE[code];
}

export type ProblemLocation = {
  readonly file: string;
  readonly line?: number;
  readonly column?: number;
};

/**
 * The only way a problem should be constructed, so severity cannot disagree with code.
 */
export function problem(code: ProblemCode, at: ProblemLocation, message: string): Problem {
  return {
    code,
    severity: severityOf(code),
    message,
    file: at.file,
    ...(at.line === undefined ? {} : { line: at.line }),
    ...(at.column === undefined ? {} : { column: at.column }),
  };
}

export function hasErrors(problems: readonly Problem[]): boolean {
  return problems.some((p) => p.severity === "error");
}

export function hasWarnings(problems: readonly Problem[]): boolean {
  return problems.some((p) => p.severity === "warning");
}

export function summarise(problems: readonly Problem[]): ProblemSummary {
  let errors = 0;
  let warnings = 0;
  for (const p of problems) {
    if (p.severity === "error") errors += 1;
    else warnings += 1;
  }
  return { errors, warnings };
}

/**
 * `--strict` changes only this. Rendered output is identical either way, which is why
 * the renderer never receives the flag. See AGENTS.md.
 */
export function exitCode(problems: readonly Problem[], strict: boolean): number {
  const { errors, warnings } = summarise(problems);
  return errors > 0 || (strict && warnings > 0) ? 1 : 0;
}

const CODE_ORDER: readonly ProblemCode[] = ProblemCodeSchema.options;

/**
 * File, then line, then column, then code. Deterministic ordering is what makes the
 * CLI's output safe to assert against in a golden test.
 */
export function sortProblems(problems: readonly Problem[]): Problem[] {
  return [...problems].sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    const lineA = a.line ?? 0;
    const lineB = b.line ?? 0;
    if (lineA !== lineB) return lineA - lineB;
    const colA = a.column ?? 0;
    const colB = b.column ?? 0;
    if (colA !== colB) return colA - colB;
    return CODE_ORDER.indexOf(a.code) - CODE_ORDER.indexOf(b.code);
  });
}
