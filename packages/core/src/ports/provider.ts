/**
 * How a source system is read into Atlas.
 *
 * Deliberately small. If a provider needs more than this, the extra belongs in a
 * record's `attributes`, not in the port — the test of whether this boundary is honest
 * is whether a third-party provider can do everything the built-in ones can.
 *
 * Note there is no `resolve(ref)`. Resolution is the index's job, not a provider's: a
 * provider projects records and then has no further opinions, which keeps it stateless
 * and keeps "does this reference resolve" answerable in one place.
 */
import { type Loaded } from "../diagnostics/loaded.js";
import { type Relationship } from "../graph/relationship.schema.js";
import { type SourceRecord } from "../projection/source-record.schema.js";
import { type SourceLocation } from "../workspace/config.schema.js";
import { type Workspace } from "./workspace-fs.js";

export interface Provider {
  /** Matches the `provider` segment of the references this provider produces. */
  readonly id: string;

  /**
   * Where this provider's sources are in a workspace that has not configured them.
   * Detect, do not dictate: report what is already there rather than requiring a layout.
   */
  discover(workspace: Workspace): Promise<readonly SourceLocation[]>;

  /** Read one configured location into records. Tolerant: partial results are expected. */
  project(workspace: Workspace, location: SourceLocation): Promise<Loaded<SourceRecord[]>>;

  /** Links the source itself declares, such as front matter naming an element. */
  relate?(records: readonly SourceRecord[]): Promise<Loaded<Relationship[]>>;
}
