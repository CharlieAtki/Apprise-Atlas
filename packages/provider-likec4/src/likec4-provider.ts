import {
  failed,
  loaded,
  problem,
  refKey,
  type Loaded,
  type Provider,
  type SourceLocation,
  type SourceRecord,
  type Workspace,
} from "@apprise/atlas-core";
import { LikeC4 } from "likec4";

function isLikeC4File(path: string): boolean {
  return path.endsWith(".c4") || path.endsWith(".likec4");
}

function optionalText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim().length > 0 ? value : undefined;
  if (
    value !== null &&
    typeof value === "object" &&
    "text" in value &&
    typeof value.text === "string"
  )
    return value.text.trim().length > 0 ? value.text : undefined;
  return undefined;
}

function sourceProblem(path: string, message: string) {
  const detail = message.split("\n", 1)[0]?.trim() || "the parser reported an error";
  return problem(
    "unparseable",
    { file: path },
    `${path} has an invalid LikeC4 model: ${detail}. Correct the model source.`,
  );
}

async function sourceFiles(
  workspace: Workspace,
  location: SourceLocation,
): Promise<readonly string[]> {
  if (isLikeC4File(location.path)) return [location.path];
  const [c4, likec4] = await Promise.all([
    workspace.fs.list(`${location.path}/**/*.c4`),
    workspace.fs.list(`${location.path}/**/*.likec4`),
  ]);
  return [...new Set([...c4, ...likec4])].sort();
}

/** Projects LikeC4's computed views and model elements without resolving cross-source links. */
export class LikeC4Provider implements Provider {
  readonly id = "likec4";

  async discover(workspace: Workspace): Promise<readonly SourceLocation[]> {
    const candidates = ["architecture", "likec4", "model.c4", "model.likec4"];
    const locations: SourceLocation[] = [];
    for (const path of candidates) {
      if (await workspace.fs.exists(path)) {
        locations.push({ provider: this.id, path, options: {} });
      }
    }
    return locations;
  }

  async project(workspace: Workspace, location: SourceLocation): Promise<Loaded<SourceRecord[]>> {
    let files: readonly string[];
    try {
      files = await sourceFiles(workspace, location);
    } catch {
      return failed([
        problem(
          "unreadable-file",
          { file: location.path },
          `${location.path} cannot be listed. Check that it exists and is readable.`,
        ),
      ]);
    }
    if (files.length === 0) {
      return failed([sourceProblem(location.path, "it contains no .c4 or .likec4 files")]);
    }

    let source: string;
    try {
      source = (await Promise.all(files.map((file) => workspace.fs.readFile(file)))).join("\n");
    } catch {
      return failed([
        problem(
          "unreadable-file",
          { file: location.path },
          `${location.path} contains a LikeC4 file that cannot be read. Check that it is readable.`,
        ),
      ]);
    }

    try {
      const likec4 = await LikeC4.fromSource(source, { logger: false, printErrors: false });
      const errors = likec4.getErrors();
      if (errors.length > 0) {
        return failed(errors.map((error) => sourceProblem(location.path, error.message)));
      }
      const model = await likec4.computedModel();
      const records: SourceRecord[] = [
        ...[...model.views()].map((view) => ({
          ref: { provider: this.id, kind: "view", externalId: String(view.id) },
          title: view.titleOrId,
          ...(optionalText(view.description) === undefined
            ? {}
            : { summary: optionalText(view.description), text: optionalText(view.description) }),
          provenance: { sourcePath: location.path },
          attributes: {
            likec4ViewPath: view.viewPath,
            likec4ViewMode: view.mode,
            likec4Tags: view.tags,
          },
        })),
        ...[...model.elements()].map((element) => ({
          ref: { provider: this.id, kind: "element", externalId: String(element.id) },
          title: element.title,
          ...(optionalText(element.summary) === undefined
            ? {}
            : { summary: optionalText(element.summary) }),
          ...(optionalText(element.description) === undefined
            ? {}
            : { text: optionalText(element.description) }),
          provenance: { sourcePath: location.path },
          attributes: {
            likec4Kind: String(element.kind),
            likec4Tags: element.tags,
            ...(optionalText(element.technology) === undefined
              ? {}
              : { likec4Technology: optionalText(element.technology) }),
          },
        })),
      ];
      return loaded(records.sort((a, b) => refKey(a.ref).localeCompare(refKey(b.ref))));
    } catch (error) {
      const message = error instanceof Error ? error.message : "the parser failed unexpectedly";
      return failed([sourceProblem(location.path, message)]);
    }
  }
}
