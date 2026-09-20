/**
 * The single public entry for @apprise/atlas-core. Deep imports are forbidden; see
 * AGENTS.md.
 */

// Diagnostics
export {
  ProblemSchema,
  ProblemCodeSchema,
  ProblemSummarySchema,
  SeveritySchema,
  ValidationReportSchema,
  type Problem,
  type ProblemCode,
  type ProblemSummary,
  type Severity,
  type ValidationReport,
} from "./diagnostics/problem.schema.js";

export {
  exitCode,
  hasErrors,
  hasWarnings,
  problem,
  severityOf,
  sortProblems,
  summarise,
  type ProblemLocation,
} from "./diagnostics/problem.js";

export { collect, failed, loaded, withProblems, type Loaded } from "./diagnostics/loaded.js";
export { suggest } from "./diagnostics/suggest.js";

// Generated schema documents
export { toJsonSchemas, type JsonSchemaDocument } from "./schema/json-schema.js";

// Reference
export { AtlasRefSchema, type AtlasRef } from "./reference/ref.schema.js";
export { parseRef, type RefParseError, type RefParseResult } from "./reference/parse.js";
export { formatRef } from "./reference/format.js";
export { refKey, refTarget, sameRef, sameTarget, withoutFragment } from "./reference/identity.js";
export {
  encodeExternalId,
  encodeFragment,
  decodeComponent,
  isSegment,
  SEGMENT_PATTERN,
} from "./reference/grammar.js";

// Workspace
export {
  AtlasConfigSchema,
  SourceLocationSchema,
  type AtlasConfig,
  type AtlasConfigInput,
  type SourceLocation,
} from "./workspace/config.schema.js";

// Projection
export { ProvenanceSchema, type Provenance } from "./projection/provenance.schema.js";
export {
  SourceRecordSchema,
  type SourceRecord,
  type SourceRecordInput,
} from "./projection/source-record.schema.js";

// Graph
export {
  RelationshipSchema,
  RelationshipOriginSchema,
  type Relationship,
  type RelationshipOrigin,
} from "./graph/relationship.schema.js";
export {
  IndexListReportSchema,
  IndexShowReportSchema,
  UnresolvedQuerySchema,
  type IndexListReport,
  type IndexShowReport,
  type UnresolvedQuery,
} from "./graph/query-report.schema.js";

// Narrative
export {
  SceneSchema,
  WalkthroughSchema,
  type Scene,
  type SceneInput,
  type Walkthrough,
  type WalkthroughInput,
} from "./narrative/walkthrough.schema.js";
export { duplicateSceneIds, isNarrativeScene, sceneReferences } from "./narrative/scene.js";

// Assurance
export {
  ClaimSchema,
  EvidenceSchema,
  MaturitySchema,
  VerificationSchema,
  type Claim,
  type ClaimInput,
  type Evidence,
  type Maturity,
  type Verification,
} from "./assurance/claim.schema.js";

// Ports — behavioural contracts, implemented outside core.
export type { Workspace, WorkspaceFs } from "./ports/workspace-fs.js";
export type { Provider } from "./ports/provider.js";
export type { KnowledgeIndex, KnowledgeQuery, KnowledgeResult } from "./ports/knowledge-index.js";
export type { Observation, ObservationSource, TimeWindow } from "./ports/observation-source.js";
