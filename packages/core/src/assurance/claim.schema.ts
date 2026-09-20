/**
 * What is claimed about something, and what proves it.
 *
 * Maturity and verification are independent axes. A component can be fully implemented
 * and verified only by design; a planned one can have an automated contract test. The
 * two must be read together — "implemented · automated" is not the same claim as
 * "implemented · live".
 *
 * Schemas only in this pass: nothing reports gaps and nothing renders status yet. They
 * are defined now because retrofitting them would mean touching the shape everything
 * else already depends on.
 */
import { z } from "zod";

import { AtlasRefSchema } from "../reference/ref.schema.js";

/** Whether the thing exists. */
export const MaturitySchema = z.enum([
  "implemented",
  "prototype",
  "planned",
  "scaffold",
  "external",
]);
export type Maturity = z.output<typeof MaturitySchema>;

/** How strongly its existence has been proven. */
export const VerificationSchema = z.enum([
  /** Observed end to end against a running system. */
  "live",
  /** Executable tests cover the claim, with no matching live proof recorded. */
  "automated",
  /** Source establishes the shape; executable proof is incomplete. */
  "source",
  /** Architectural intent only. */
  "design",
]);
export type Verification = z.output<typeof VerificationSchema>;

export const EvidenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("test"),
    path: z.string().min(1),
    /** Revision the path was checked at, when it lives outside this repository. */
    pinned: z.string().min(1).optional(),
  }),
  z.object({ kind: z.literal("source"), ref: AtlasRefSchema }),
  z.object({
    kind: z.literal("run"),
    url: z.string().min(1),
    at: z.string().min(1),
  }),
  z.object({ kind: z.literal("design"), ref: AtlasRefSchema }),
]);
export type Evidence = z.output<typeof EvidenceSchema>;

export const ClaimSchema = z.object({
  subject: AtlasRefSchema,
  maturity: MaturitySchema,
  verification: VerificationSchema,
  evidence: z.array(EvidenceSchema).default([]),
});

export type Claim = z.output<typeof ClaimSchema>;
export type ClaimInput = z.input<typeof ClaimSchema>;
