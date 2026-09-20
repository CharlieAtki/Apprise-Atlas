/**
 * Runtime observation of a system Atlas describes.
 *
 * Declared now, implemented by nothing — see docs/dev/plan.md §10. Atlas is never the
 * source of runtime truth; it projects what a backend already holds, with the mapping
 * from model element to runtime identity living in the repository as an ordinary
 * `observed-as` relationship.
 *
 * An Observation is meant to resolve to Evidence for a Claim, not to a parallel status
 * system. Telemetry answers "has this been verified live", which the Assurance context
 * already asks.
 */
import { type AtlasRef } from "../reference/ref.schema.js";

export interface TimeWindow {
  /** ISO 8601. */
  readonly from: string;
  readonly to: string;
}

export interface Observation {
  readonly subject: AtlasRef;
  /** "request-rate", "error-rate", "latency-p95", "last-seen", … */
  readonly measure: string;
  readonly value: number | string;
  readonly window: TimeWindow;
  /** Where this was read from, and when. Runtime facts expire. */
  readonly sourceUrl: string;
  readonly retrievedAt: string;
}

export interface ObservationSource {
  readonly id: string;
  observe(refs: readonly AtlasRef[], window: TimeWindow): Promise<readonly Observation[]>;
}
