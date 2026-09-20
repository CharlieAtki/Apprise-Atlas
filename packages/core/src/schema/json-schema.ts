/**
 * Generated JSON Schema for every shape that crosses a boundary.
 *
 * The published format reference is generated from these schemas rather than written
 * beside them, because a hand-written schema document is a second truth and it will
 * drift. CI regenerates and fails if the working tree changed.
 *
 * Two artefacts per authored shape, still one definition:
 *  - `io: "input"` describes what a person may write, so a field with a default is
 *    optional. This is what editor completion should use.
 *  - `io: "output"` describes what Atlas produces once defaults are applied. This is
 *    what a consumer parsing the index should use.
 *
 * Core returns the documents; writing them to disk is the toolchain's job, since core
 * may not touch a filesystem.
 */
import { z } from "zod";

import { ClaimSchema } from "../assurance/claim.schema.js";
import { ProblemSchema, ValidationReportSchema } from "../diagnostics/problem.schema.js";
import { RelationshipSchema } from "../graph/relationship.schema.js";
import { IndexListReportSchema, IndexShowReportSchema } from "../graph/query-report.schema.js";
import { WalkthroughSchema } from "../narrative/walkthrough.schema.js";
import { SourceRecordSchema } from "../projection/source-record.schema.js";
import { AtlasRefSchema } from "../reference/ref.schema.js";
import { AtlasConfigSchema } from "../workspace/config.schema.js";

export type JsonSchemaDocument = {
  readonly name: string;
  readonly schema: unknown;
};

export function toJsonSchemas(): readonly JsonSchemaDocument[] {
  return [
    // Authored by hand: editors and humans need the input shape.
    { name: "walkthrough", schema: z.toJSONSchema(WalkthroughSchema, { io: "input" }) },
    { name: "atlas-config", schema: z.toJSONSchema(AtlasConfigSchema, { io: "input" }) },

    // Produced by Atlas: consumers parse the output shape.
    { name: "problem", schema: z.toJSONSchema(ProblemSchema, { io: "output" }) },
    { name: "validation-report", schema: z.toJSONSchema(ValidationReportSchema, { io: "output" }) },
    { name: "atlas-ref", schema: z.toJSONSchema(AtlasRefSchema, { io: "output" }) },
    { name: "source-record", schema: z.toJSONSchema(SourceRecordSchema, { io: "output" }) },
    { name: "relationship", schema: z.toJSONSchema(RelationshipSchema, { io: "output" }) },
    { name: "index-list-report", schema: z.toJSONSchema(IndexListReportSchema, { io: "output" }) },
    { name: "index-show-report", schema: z.toJSONSchema(IndexShowReportSchema, { io: "output" }) },
    { name: "claim", schema: z.toJSONSchema(ClaimSchema, { io: "output" }) },
  ];
}
