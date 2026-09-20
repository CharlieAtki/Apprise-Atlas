/**
 * Reading a canonical reference string.
 *
 * Parsing reports the offset at which it gave up, not just that it failed. The caller
 * knows which file and line the string came from; together those produce a message that
 * points at the character the author needs to change.
 *
 * This returns a result rather than throwing, and rather than a Problem, because core
 * does not know what file the string was read from. The caller attaches the location.
 */
import { type AtlasRef } from "./ref.schema.js";
import { decodeComponent, isSegment } from "./grammar.js";

export type RefParseError = {
  /** 0-based index into the input at which parsing failed. */
  readonly offset: number;
  /** A phrase completing "…, but ", suitable for embedding in a larger sentence. */
  readonly reason: string;
};

export type RefParseResult =
  | { readonly ok: true; readonly ref: AtlasRef }
  | { readonly ok: false; readonly error: RefParseError };

function failure(offset: number, reason: string): RefParseResult {
  return { ok: false, error: { offset, reason } };
}

export function parseRef(input: string): RefParseResult {
  if (input.length === 0) {
    return failure(0, "a reference cannot be empty");
  }

  const colon = input.indexOf(":");
  if (colon === -1) {
    return failure(input.length, 'it has no ":" separating the provider from the rest');
  }

  const provider = input.slice(0, colon);
  if (!isSegment(provider)) {
    return failure(0, `"${provider}" is not a valid provider name`);
  }

  const rest = input.slice(colon + 1);
  const slash = rest.indexOf("/");
  if (slash === -1) {
    return failure(input.length, 'it has no "/" separating the kind from the identifier');
  }

  const kind = rest.slice(0, slash);
  if (!isSegment(kind)) {
    return failure(colon + 1, `"${kind}" is not a valid kind`);
  }

  const remainder = rest.slice(slash + 1);
  const hash = remainder.indexOf("#");

  const rawExternalId = hash === -1 ? remainder : remainder.slice(0, hash);
  if (rawExternalId.length === 0) {
    return failure(colon + 1 + slash + 1, "it has no identifier after the kind");
  }

  if (hash === -1) {
    return {
      ok: true,
      ref: { provider, kind, externalId: decodeComponent(rawExternalId) },
    };
  }

  const rawFragment = remainder.slice(hash + 1);
  if (rawFragment.length === 0) {
    return failure(input.length, 'it ends with "#" but names no fragment');
  }

  return {
    ok: true,
    ref: {
      provider,
      kind,
      externalId: decodeComponent(rawExternalId),
      fragment: decodeComponent(rawFragment),
    },
  };
}
