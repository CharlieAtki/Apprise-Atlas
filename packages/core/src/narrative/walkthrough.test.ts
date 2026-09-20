import { describe, expect, it } from "vitest";

import { duplicateSceneIds, isNarrativeScene, sceneReferences } from "./scene.js";
import { SceneSchema, WalkthroughSchema } from "./walkthrough.schema.js";

describe("scene", () => {
  it("derives whether a scene is narrative from its reference rather than a declared kind", () => {
    const referential = SceneSchema.parse({ id: "gateway", title: "T", ref: "likec4:view/x" });
    const narrative = SceneSchema.parse({ id: "close", title: "T" });

    expect(isNarrativeScene(referential)).toBe(false);
    expect(isNarrativeScene(narrative)).toBe(true);
    expect(referential).not.toHaveProperty("kind");
  });

  it("keeps presenter notes and audience narrative as separate fields", () => {
    const scene = SceneSchema.parse({
      id: "live-application",
      title: "Watch the governed path live",
      narrative: "Return to the synthetic workspace and look for the beats you have just seen.",
      notes: "Open the demo guide, switch to the desktop application, run the first workflow.",
    });

    expect(scene.narrative).not.toBe(scene.notes);
    expect(scene.notes).toContain("desktop application");
  });

  it("lists a scene's own subject before anything it merely points at", () => {
    const scene = SceneSchema.parse({
      id: "handoff",
      title: "T",
      ref: "likec4:view/x",
      see: ["markdown:document/docs/demos/nhs-care.md"],
    });

    expect(sceneReferences(scene)).toEqual([
      "likec4:view/x",
      "markdown:document/docs/demos/nhs-care.md",
    ]);
  });

  it("lists secondary references on a narrative scene that has no subject of its own", () => {
    const scene = SceneSchema.parse({
      id: "handoff",
      title: "T",
      see: ["markdown:document/docs/demos/nhs-care.md"],
    });

    expect(sceneReferences(scene)).toEqual(["markdown:document/docs/demos/nhs-care.md"]);
  });

  it("rejects a scene id that is not a lowercase hyphenated slug", () => {
    expect(SceneSchema.safeParse({ id: "One Governed Door", title: "T" }).success).toBe(false);
    expect(SceneSchema.safeParse({ id: "one-governed-door", title: "T" }).success).toBe(true);
  });

  it("reports scene ids that collide, so a walkthrough cannot address one twice", () => {
    const scenes = [
      SceneSchema.parse({ id: "a", title: "T" }),
      SceneSchema.parse({ id: "b", title: "T" }),
      SceneSchema.parse({ id: "a", title: "T" }),
    ];

    expect(duplicateSceneIds(scenes)).toEqual(["a"]);
  });
});

describe("walkthrough", () => {
  it("refuses a walkthrough with no scenes at all", () => {
    expect(WalkthroughSchema.safeParse({ id: "x", title: "T", scenes: [] }).success).toBe(false);
  });

  /**
   * The acceptance test in miniature. Every field here is taken from
   * portal/src/demo/scenes.ts in SovereignAgenticArchitecture — the eyebrow, the
   * audience narrative, the presenter cue, the secondary reference and the
   * presentational motif. If this shape cannot be expressed, the widening in
   * walkthrough.schema.ts is wrong.
   */
  it("expresses every field the real hand-written presenter scenes carry", () => {
    const walkthrough = WalkthroughSchema.parse({
      id: "sovereign-story",
      title: "Sovereign Agentic Architecture",
      description: "How a governed model request moves through the platform.",
      scenes: [
        {
          id: "small-models",
          eyebrow: "Where the idea began",
          title: "We started with small models",
          narrative: "We were fine-tuning small language models for specific domains.",
          display: { motif: "origin" },
        },
        {
          id: "one-governed-door",
          ref: "likec4:view/flow_permitted_path_walkthrough",
          eyebrow: "The architectural answer",
          title: "Keep intent local. Govern every journey outward.",
          narrative: "Begin with one memorable rule.",
        },
        {
          id: "nhs-workspace",
          ref: "markdown:asset/portal/static/img/demo/nhs-clinical-workspace.png",
          eyebrow: "The product",
          title: "A governed clinical workspace",
        },
        {
          id: "live-application",
          eyebrow: "Make the story concrete",
          title: "Watch the governed path live",
          narrative: "Return to the synthetic NHS workspace.",
          notes: "Open the NHS Care demo guide, then switch to the desktop application.",
          see: ["markdown:document/docs/demos/nhs-care.md"],
          display: { motif: "handoff" },
        },
      ],
    });

    expect(walkthrough.scenes).toHaveLength(4);
    expect(walkthrough.scenes[0]?.display["motif"]).toBe("origin");
    expect(walkthrough.scenes[3]?.see).toEqual(["markdown:document/docs/demos/nhs-care.md"]);
    expect(walkthrough.scenes.filter(isNarrativeScene)).toHaveLength(2);
  });

  it("defaults its version so an authored file need not repeat it", () => {
    const walkthrough = WalkthroughSchema.parse({
      id: "x",
      title: "T",
      scenes: [{ id: "a", title: "T" }],
    });

    expect(walkthrough.atlasWalkthroughVersion).toBe(1);
  });
});
