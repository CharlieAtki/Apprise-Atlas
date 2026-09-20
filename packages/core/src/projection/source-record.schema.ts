/**
 * One projected item from one source: a view, an element, a document, a section, an
 * ADR, an asset.
 *
 * `attributes` is deliberately opaque. Core never learns what a LikeC4 tag or a
 * front-matter key means — the moment it does, the provider boundary has leaked and a
 * third party can no longer write a provider without changing core.
 */
import { z } from "zod";

import { AtlasRefSchema } from "../reference/ref.schema.js";
import { ProvenanceSchema } from "./provenance.schema.js";

export const SourceRecordSchema = z.object({
  ref: AtlasRefSchema,
  title: z.string().min(1),
  summary: z.string().optional(),
  /** Searchable body text, when the provider has any. */
  text: z.string().optional(),
  /** Never optional. See ProvenanceSchema. */
  provenance: ProvenanceSchema,
  /** Provider-specific and opaque to the domain. */
  attributes: z.record(z.string(), z.unknown()).default({}),
});

export type SourceRecord = z.output<typeof SourceRecordSchema>;
/** The authoring shape, before defaults are applied. Use this for anything hand-written. */
export type SourceRecordInput = z.input<typeof SourceRecordSchema>;
