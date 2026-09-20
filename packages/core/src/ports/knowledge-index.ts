/**
 * Retrieval over the reference graph.
 *
 * Implemented first by toolkit's immutable generated local index. The port is read-only:
 * building an index is an application use case, while consumers only retrieve from it.
 * That keeps a future temporal or managed index a substitution rather than a rewrite.
 */
import { type Relationship } from "../graph/relationship.schema.js";
import { type SourceRecord } from "../projection/source-record.schema.js";
import { type AtlasRef } from "../reference/ref.schema.js";

export interface KnowledgeQuery {
  readonly text: string;
  readonly limit?: number;
}

export interface KnowledgeResult {
  readonly record: SourceRecord;
  readonly score: number;
}

export interface KnowledgeIndex {
  resolve(ref: AtlasRef): Promise<SourceRecord | undefined>;
  search(query: KnowledgeQuery): Promise<readonly KnowledgeResult[]>;
  neighbours(ref: AtlasRef): Promise<readonly Relationship[]>;
}
