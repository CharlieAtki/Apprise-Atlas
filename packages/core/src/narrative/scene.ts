/**
 * Rules about scenes.
 *
 * A scene's nature is derived from whether it carries a reference, never declared
 * alongside one. That removes a whole class of invalid state: a scene cannot claim to
 * be an architecture scene while pointing at a document.
 *
 * Core deliberately classifies no further than this. Whether a referenced thing is a
 * diagram, a document section or an image is answered by resolving the reference in the
 * index and reading what the provider said it was — core learning that `likec4` means
 * "architecture" would put provider semantics in the domain and break the boundary that
 * lets a third party add a provider without changing core.
 */
import { type Scene } from "./walkthrough.schema.js";

/**
 * A narrative scene has no source: it is a title, a transition or a conclusion, and its
 * words are the whole of it.
 */
export function isNarrativeScene(scene: Scene): boolean {
  return scene.ref === undefined;
}

/** Every reference a scene mentions, its own subject first, then anything in `see`. */
export function sceneReferences(scene: Scene): readonly string[] {
  return scene.ref === undefined ? scene.see : [scene.ref, ...scene.see];
}

/** Ids that appear more than once, in the order they first collide. */
export function duplicateSceneIds(scenes: readonly Scene[]): readonly string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const scene of scenes) {
    if (seen.has(scene.id) && !duplicates.includes(scene.id)) duplicates.push(scene.id);
    seen.add(scene.id);
  }
  return duplicates;
}
