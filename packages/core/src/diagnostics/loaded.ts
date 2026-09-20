/**
 * Tolerant loading.
 *
 * Atlas returns a usable value alongside the problems found in it, rather than throwing
 * at the first one. A walkthrough with one broken reference is still a walkthrough worth
 * rendering, and a user fixing five problems should see all five, not the first.
 *
 * The one invariant: a missing value is always accompanied by an error explaining why.
 */
import { type Problem } from "./problem.schema.js";
import { hasErrors } from "./problem.js";

export type Loaded<T> = {
  /** Absent only when nothing usable could be produced. */
  readonly value: T | undefined;
  readonly problems: readonly Problem[];
};

/** A value that was produced, with any problems found along the way. */
export function loaded<T>(value: T, problems: readonly Problem[] = []): Loaded<T> {
  return { value, problems };
}

/**
 * Nothing usable could be produced. Requires at least one error, because a caller
 * seeing no value and no error has no way to tell the user what went wrong.
 */
export function failed<T>(problems: readonly Problem[]): Loaded<T> {
  if (!hasErrors(problems)) {
    throw new Error(
      "failed() requires at least one error problem: an absent value must always be explained",
    );
  }
  return { value: undefined, problems };
}

/** Add problems to an already-loaded result without disturbing its value. */
export function withProblems<T>(result: Loaded<T>, more: readonly Problem[]): Loaded<T> {
  return more.length === 0 ? result : { ...result, problems: [...result.problems, ...more] };
}

/**
 * Collect many results into one, dropping the entries that produced nothing and
 * keeping every problem. This is the shape of "return every walkthrough it could
 * understand even when one is unparseable".
 */
export function collect<T>(results: readonly Loaded<T>[]): Loaded<T[]> {
  const values: T[] = [];
  const problems: Problem[] = [];
  for (const result of results) {
    if (result.value !== undefined) values.push(result.value);
    problems.push(...result.problems);
  }
  return { value: values, problems };
}
