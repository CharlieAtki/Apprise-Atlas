/**
 * Comparing and keying references.
 *
 * The distinction that matters here is between a reference and the thing it points
 * *into*. `markdown:section/docs/x.md#policy` addresses a heading, but the document is
 * what either exists or does not. Keeping the two separable is what lets validation
 * tell "there is no such document" from "that document has no such heading" — two
 * problems with different fixes, and the reason `unresolved-reference` and
 * `unknown-fragment` are different codes.
 */
import { type AtlasRef } from "./ref.schema.js";
import { formatRef } from "./format.js";

/** The full canonical string, fragment included. Stable enough to use as a Map key. */
export function refKey(ref: AtlasRef): string {
  return formatRef(ref);
}

/** The reference with any fragment removed. */
export function withoutFragment(ref: AtlasRef): AtlasRef {
  return ref.fragment === undefined
    ? ref
    : { provider: ref.provider, kind: ref.kind, externalId: ref.externalId };
}

/** The canonical string of the item this reference points into, fragment ignored. */
export function refTarget(ref: AtlasRef): string {
  return formatRef(withoutFragment(ref));
}

export function sameRef(a: AtlasRef, b: AtlasRef): boolean {
  return refKey(a) === refKey(b);
}

export function sameTarget(a: AtlasRef, b: AtlasRef): boolean {
  return refTarget(a) === refTarget(b);
}
