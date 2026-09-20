/**
 * Where a projected fact came from.
 *
 * "Everything Atlas renders is a projection with visible provenance" is the rule that
 * keeps the product honest, and it is enforced here rather than left to discipline: a
 * provenance that names neither a path nor a URL does not parse. A record that cannot
 * say where it came from is a bug, not a display choice.
 */
import { z } from "zod";

export const ProvenanceSchema = z
  .object({
    /** Workspace-relative path, for a source read from the repository. */
    sourcePath: z.string().min(1).optional(),
    /** For a source fetched or queried from an external system. */
    sourceUrl: z.string().min(1).optional(),
    /** Commit, page version or revision the fact was read at. */
    sourceVersion: z.string().min(1).optional(),
    /** `sha256:` followed by 64 lowercase hex characters. Providers compute it; core
     * only checks the shape, because hashing needs a runtime core is not allowed. */
    contentHash: z
      .string()
      .regex(/^sha256:[0-9a-f]{64}$/, "content hash must be sha256:<64 hex characters>")
      .optional(),
    /** The query that produced the fact, for a source that is asked rather than read. */
    query: z.string().min(1).optional(),
    /** 1-based line within `sourcePath`, when the fact came from a specific line. */
    sourceLine: z.number().int().positive().optional(),
    /** ISO 8601. Present when the fact can go stale — anything queried or fetched. */
    retrievedAt: z.string().min(1).optional(),
  })
  .refine((p) => p.sourcePath !== undefined || p.sourceUrl !== undefined, {
    message: "provenance must name a source: give either sourcePath or sourceUrl",
  });

export type Provenance = z.output<typeof ProvenanceSchema>;
