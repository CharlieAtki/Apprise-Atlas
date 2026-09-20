/**
 * The address of anything Atlas can point at.
 *
 * Every addressable item in Atlas is an AtlasRef, whatever provider it came from. This
 * is the seam that lets a later knowledge graph, telemetry mapping or action model
 * extend the product rather than rewrite it: if a new thing can be given a reference,
 * everything that already traverses references can reach it.
 *
 * Deviation from docs/dev/plan.md §6.1, deliberate: there is no `version` field. The
 * plan gave AtlasRef a `version` while also giving Provenance a `sourceVersion`, which
 * is the same fact in two places. A reference is an address; where a record came from
 * and at which revision is Provenance's job. Addressing a specific version can be added
 * to the grammar later without breaking existing references.
 */
import { z } from "zod";

import { SEGMENT_PATTERN } from "./grammar.js";

export const AtlasRefSchema = z.object({
  /** Which adapter owns this item: "likec4", "markdown", … */
  provider: z.string().regex(SEGMENT_PATTERN, "provider must be lowercase and hyphenated"),
  /** What sort of thing it is within that provider: "view", "element", "document", … */
  kind: z.string().regex(SEGMENT_PATTERN, "kind must be lowercase and hyphenated"),
  /** Stable within the provider. A file path, a fully qualified name, a view id. */
  externalId: z.string().min(1),
  /** A heading anchor, or the element a view scene focuses. */
  fragment: z.string().min(1).optional(),
});

export type AtlasRef = z.output<typeof AtlasRefSchema>;
