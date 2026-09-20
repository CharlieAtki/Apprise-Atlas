/**
 * The repository, as far as anything in Atlas is concerned.
 *
 * This lives in core rather than the application layer on purpose. A provider receives
 * the capability to read files instead of reaching for one, which is what lets a
 * provider depend on core alone — so a third party writing one takes a single small
 * package, and the contract test kit never has to boot the application layer.
 *
 * Core defines the shape of this capability but never implements it. The Node
 * implementation and the in-memory one both live in the toolkit.
 */
import { type AtlasConfig } from "../workspace/config.schema.js";

export interface WorkspaceFs {
  /** Absolute path of the workspace root, for messages only. Never join against it. */
  readonly root: string;

  /** Rejects if the path cannot be read; callers turn that into an `unreadable-file`. */
  readFile(relativePath: string): Promise<string>;

  exists(relativePath: string): Promise<boolean>;

  /**
   * Workspace-relative paths matching a glob, in a stable order.
   *
   * Atlas currently supports recursive-extension globs for Markdown, YAML and LikeC4
   * source files. A general glob engine is deliberately deferred.
   */
  list(pattern: string): Promise<readonly string[]>;
}

export interface Workspace {
  readonly fs: WorkspaceFs;
  readonly config: AtlasConfig;
}
