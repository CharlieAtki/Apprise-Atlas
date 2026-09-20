/**
 * The character rules of the canonical reference string.
 *
 * A reference has to survive being written by hand in YAML front matter, read in a pull
 * request diff, and grepped for. That rules out opaque identifiers and it rules out any
 * encoding a person cannot type. So the grammar keeps the common case literal — file
 * paths and dotted names pass through untouched — and escapes only the two characters
 * that would otherwise be ambiguous.
 *
 *   provider ":" kind "/" externalId [ "#" fragment ]
 *
 *   likec4:view/system-landscape
 *   likec4:element/governance.gateway
 *   markdown:section/docs/governance.md#policy-evaluation
 */

/** Provider and kind are closed vocabularies: lowercase, no separators, no surprises. */
export const SEGMENT_PATTERN = /^[a-z][a-z0-9-]*$/;

export function isSegment(value: string): boolean {
  return SEGMENT_PATTERN.test(value);
}

/**
 * `#` starts the fragment and `%` starts an escape, so those two are the only
 * characters an externalId cannot contain literally. `/` and `.` are deliberately
 * literal, because a path that reads as a path is the whole point.
 */
export function encodeExternalId(value: string): string {
  return value.replaceAll("%", "%25").replaceAll("#", "%23");
}

export function encodeFragment(value: string): string {
  return value.replaceAll("%", "%25").replaceAll("#", "%23");
}

/**
 * Decodes only the escapes this grammar produces. A stray `%` that is not a valid
 * escape is left alone rather than treated as an error, because a reference is more
 * useful slightly wrong than rejected outright — validation will report it as
 * unresolved, which points the reader at the same fix.
 */
export function decodeComponent(value: string): string {
  return value.replaceAll(/%(25|23)/g, (_match, code: string) => (code === "25" ? "%" : "#"));
}
