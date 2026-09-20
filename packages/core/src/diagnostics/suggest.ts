/**
 * Nearest-candidate suggestion.
 *
 * Every validation message has to say what to do about the problem, and for a mistyped
 * or renamed identifier the useful thing to say is which existing one the author
 * probably meant. "no view with that id" is a complaint; "the closest is
 * flow_permitted_path_walkthru" is a fix.
 */

/** Levenshtein distance, bounded so a hopeless comparison stops early. */
function distance(a: string, b: string, limit: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i, ...new Array<number>(b.length).fill(0)];
    let best = current[0] ?? i;

    for (let j = 1; j <= b.length; j += 1) {
      const substitution = (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      const insertion = (current[j - 1] ?? 0) + 1;
      const deletion = (previous[j] ?? 0) + 1;
      const cost = Math.min(substitution, insertion, deletion);
      current[j] = cost;
      if (cost < best) best = cost;
    }

    if (best > limit) return limit + 1;
    previous = current;
  }

  return previous[b.length] ?? limit + 1;
}

/**
 * The closest candidate to `target`, or undefined when none is close enough to be
 * worth suggesting. A bad suggestion is worse than none: it sends the reader to
 * rename the wrong thing.
 */
export function suggest(
  target: string,
  candidates: Iterable<string>,
  maxDistance?: number,
): string | undefined {
  // Roughly a third of the identifier may differ. Short names get a tighter budget,
  // because at three characters every candidate is "close".
  const limit = maxDistance ?? Math.max(1, Math.floor(target.length / 3));

  let best: string | undefined;
  let bestDistance = limit + 1;

  for (const candidate of candidates) {
    if (candidate === target) continue;
    const d = distance(target, candidate, limit);
    // Ties go to the first candidate seen, so the result is stable for a given input
    // order and a golden test can assert it.
    if (d <= limit && d < bestDistance) {
      best = candidate;
      bestDistance = d;
    }
  }

  return best;
}
