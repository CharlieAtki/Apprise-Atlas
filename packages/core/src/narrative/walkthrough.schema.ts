/**
 * A walkthrough: the one thing Atlas is authoritative for.
 *
 * Widened from docs/dev/plan.md §6.4, which could not express the file chosen as the
 * acceptance test. Three things the real artefact needs and the original shape lacked:
 *
 *  - `eyebrow`, a kicker above the title, present on every scene.
 *  - `narrative` and `notes` as separate fields. They have different audiences — one is
 *    said to the room, the other is read by the presenter — and real scenes carry both.
 *  - `see`, because a scene can have a visual *and* point somewhere else.
 *
 * `display` is to the presenter what `attributes` is to the domain: opaque, renderer
 * specific, never inspected here. It absorbs presentational cues such as a motif
 * without core acquiring an opinion about them.
 *
 * References are held as strings rather than parsed AtlasRefs. Parsing belongs to the
 * loader, which knows the file and line and can therefore report the exact character a
 * malformed reference failed at — and keeping strings here leaves the schema
 * representable as JSON Schema for editor completion.
 */
import { z } from "zod";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SceneSchema = z.object({
  id: z.string().regex(SLUG, "scene id must be lowercase words separated by hyphens"),
  /** Absent means this is a narrative scene: it has no source, only words. */
  ref: z.string().min(1).optional(),
  /** Kicker shown above the title. */
  eyebrow: z.string().min(1).optional(),
  title: z.string().min(1),
  /** Audience-facing prose. Said to the room. */
  narrative: z.string().min(1).optional(),
  /** Presenter-facing. Not shown to the audience, and not a place for documentation. */
  notes: z.string().min(1).optional(),
  /** Secondary references: things to open alongside the scene's own subject. */
  see: z.array(z.string().min(1)).default([]),
  /** Opaque presentational hints. Core never reads inside this. */
  display: z.record(z.string(), z.unknown()).default({}),
});

export type Scene = z.output<typeof SceneSchema>;
export type SceneInput = z.input<typeof SceneSchema>;

export const WalkthroughSchema = z.object({
  /** Bumped only for a breaking change to this file's shape. */
  atlasWalkthroughVersion: z.literal(1).default(1),
  id: z.string().regex(SLUG, "walkthrough id must be lowercase words separated by hyphens"),
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  scenes: z.array(SceneSchema).min(1, "a walkthrough needs at least one scene"),
});

export type Walkthrough = z.output<typeof WalkthroughSchema>;
export type WalkthroughInput = z.input<typeof WalkthroughSchema>;
