/**
 * What a repository told Atlas about itself.
 *
 * Sources are a list rather than named `architecture` / `docs` / `decisions` fields,
 * because LikeC4 and Markdown are the first providers, not permanent boundaries. A new
 * provider should need no change here.
 *
 * The canonical file is `atlas.config.yaml`, not `.ts`: the published CLI is plain Node
 * ESM and Node cannot import a TypeScript file. Configuration is data, and YAML gives
 * located schema errors through machinery Atlas already has.
 */
import { z } from "zod";

import { SEGMENT_PATTERN } from "../reference/grammar.js";

export const SourceLocationSchema = z.object({
  /** Which provider reads this location. */
  provider: z.string().regex(SEGMENT_PATTERN, "provider must be lowercase and hyphenated"),
  /** Workspace-relative path to the directory or file the provider should read. */
  path: z.string().min(1),
  /** Provider-specific settings, opaque to core. */
  options: z.record(z.string(), z.unknown()).default({}),
});
export type SourceLocation = z.output<typeof SourceLocationSchema>;

export const AtlasConfigSchema = z.object({
  /** Bumped only for a breaking change to this file's shape. */
  atlasConfigVersion: z.literal(1).default(1),
  sources: z.array(SourceLocationSchema).min(1, "configure at least one source"),
  /**
   * Where authored walkthroughs live. Configurable from the start because `init`
   * scaffolds it, which makes it public API at the first release — renaming it later
   * would break every consumer.
   */
  walkthroughs: z.string().min(1).default("atlas/walkthroughs"),
});

export type AtlasConfig = z.output<typeof AtlasConfigSchema>;
export type AtlasConfigInput = z.input<typeof AtlasConfigSchema>;
