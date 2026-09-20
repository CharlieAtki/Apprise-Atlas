/**
 * Writing a canonical reference string.
 *
 * `parseRef(formatRef(ref))` must return the same reference for every reference, and
 * `formatRef(parseRef(s).ref)` must return the same string for every canonical string.
 * Those two laws are what let a reference be stored as a struct, written into YAML as
 * text, and compared as either.
 */
import { type AtlasRef } from "./ref.schema.js";
import { encodeExternalId, encodeFragment } from "./grammar.js";

export function formatRef(ref: AtlasRef): string {
  const base = `${ref.provider}:${ref.kind}/${encodeExternalId(ref.externalId)}`;
  return ref.fragment === undefined ? base : `${base}#${encodeFragment(ref.fragment)}`;
}
