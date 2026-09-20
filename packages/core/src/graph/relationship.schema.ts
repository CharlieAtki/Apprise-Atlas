/**
 * A link between two addressable things.
 *
 * `origin` is what lets the interface distinguish a maintained fact from a suggestion,
 * and it is the reason a later inference or telemetry feature can be added without
 * anyone losing track of which facts a human actually asserted.
 *
 * `validFrom` and `validUntil` exist although nothing emits `runtime` yet. A derived
 * fact is true for a window, not forever: "this endpoint is unused", observed three
 * months ago, is not stale information but actively dangerous advice.
 */
import { z } from "zod";

import { AtlasRefSchema } from "../reference/ref.schema.js";
import { ProvenanceSchema } from "../projection/provenance.schema.js";

export const RelationshipOriginSchema = z.enum([
  /** The source system said so itself. */
  "source",
  /** A human wrote it down in the repository. */
  "explicit",
  /** Atlas worked it out. Always a suggestion, never authoritative. */
  "inferred",
  /** Observed from a running system. Carries a validity window. */
  "runtime",
]);
export type RelationshipOrigin = z.output<typeof RelationshipOriginSchema>;

export const RelationshipSchema = z.object({
  from: AtlasRefSchema,
  /** "documented-by", "justified-by", "verified-by", "observed-as", … */
  type: z.string().min(1),
  to: AtlasRefSchema,
  origin: RelationshipOriginSchema,
  /**
   * Required, unlike docs/dev/plan.md §6.3. Without it an asymmetric-link warning can
   * only say "A and B disagree" instead of naming the file and line that declared the
   * one-sided half, which is the difference between a complaint and a fix.
   */
  provenance: ProvenanceSchema,
  /** Inferred relationships only. */
  confidence: z.number().min(0).max(1).optional(),
  validFrom: z.string().min(1).optional(),
  validUntil: z.string().min(1).optional(),
});

export type Relationship = z.output<typeof RelationshipSchema>;
