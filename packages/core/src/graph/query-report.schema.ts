/**
 * Machine-readable graph query results.
 *
 * Query delivery is allowed to choose its human presentation, but JSON callers need
 * one schema-owned contract rather than CLI-local objects that drift from the index.
 */
import { z } from "zod";

import { ProblemSchema, ProblemSummarySchema } from "../diagnostics/problem.schema.js";
import { SourceRecordSchema } from "../projection/source-record.schema.js";
import { AtlasRefSchema } from "../reference/ref.schema.js";
import { RelationshipSchema } from "./relationship.schema.js";

export const IndexListReportSchema = z.object({
  problems: z.array(ProblemSchema),
  summary: ProblemSummarySchema,
  records: z.array(SourceRecordSchema),
});
export type IndexListReport = z.output<typeof IndexListReportSchema>;

export const UnresolvedQuerySchema = z.object({
  ref: AtlasRefSchema,
  suggestion: z.string().min(1).optional(),
});
export type UnresolvedQuery = z.output<typeof UnresolvedQuerySchema>;

const IndexShowCommonSchema = z.object({
  problems: z.array(ProblemSchema),
  summary: ProblemSummarySchema,
  relationships: z.array(RelationshipSchema),
});

/** A graph query either resolved a record or has structured guidance to one that did not. */
export const IndexShowReportSchema = z.union([
  IndexShowCommonSchema.extend({
    record: SourceRecordSchema,
    unresolved: z.null(),
  }),
  IndexShowCommonSchema.extend({
    record: z.null(),
    unresolved: UnresolvedQuerySchema,
  }),
]);
export type IndexShowReport = z.output<typeof IndexShowReportSchema>;
