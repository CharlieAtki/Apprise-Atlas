import {
  failed,
  loaded,
  parseRef,
  problem,
  type Loaded,
  type Provider,
  type Relationship,
  type SourceLocation,
  type SourceRecord,
  type Workspace,
} from "@apprise/atlas-core";
import GithubSlugger from "github-slugger";
import { remark } from "remark";
import remarkFrontmatter from "remark-frontmatter";
import { parseDocument } from "yaml";

type Position = {
  readonly start: { readonly line: number; readonly offset: number };
  readonly end: { readonly offset: number };
};
type Node = {
  readonly type: string;
  readonly value?: string;
  readonly url?: string;
  readonly depth?: number;
  readonly children?: readonly Node[];
  readonly position?: Position;
};
type RelationshipDeclaration = {
  readonly type: string;
  readonly to: string;
  readonly line: number;
};

type MarkdownAttributes = {
  readonly atlasRelationships?: readonly RelationshipDeclaration[];
  readonly referencedBy?: readonly string[];
};

function recordAttributes(record: SourceRecord): MarkdownAttributes {
  return record.attributes as MarkdownAttributes;
}

function basename(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1).replace(/\.md$/, "");
}

function normalise(path: string): string | undefined {
  const parts: string[] = [];
  for (const part of path.replaceAll("\\", "/").split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) return undefined;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}

function parent(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function resolveAsset(documentPath: string, url: string): string | undefined {
  if (url.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith("/"))
    return undefined;
  return normalise(`${parent(documentPath)}/${url.split("#", 1)[0] ?? ""}`);
}

function textOf(node: Node): string {
  if (node.value !== undefined) return node.value;
  return (node.children ?? []).map(textOf).join("");
}

function at(
  file: string,
  line: number | undefined,
): { readonly file: string; readonly line?: number; readonly column?: number } {
  return line === undefined ? { file } : { file, line, column: 1 };
}

function yamlNodeLine(yaml: Node, value: string, offset: number | undefined): number {
  const start = yaml.position?.start.line ?? 1;
  return offset === undefined ? start : start + value.slice(0, offset).split("\n").length;
}

function withTitle(title: string | undefined): { readonly title?: string } {
  return title === undefined ? {} : { title };
}

function frontMatter(
  root: Node,
  file: string,
): {
  readonly title?: string;
  readonly relationships: readonly RelationshipDeclaration[];
  readonly problems: readonly ReturnType<typeof problem>[];
} {
  const yaml = root.children?.find((node) => node.type === "yaml");
  if (yaml?.value === undefined) return { relationships: [], problems: [] };
  const document = parseDocument(yaml.value);
  if (document.errors.length > 0) {
    return {
      relationships: [],
      problems: document.errors.map((error) =>
        problem(
          "unparseable",
          at(file, yaml.position?.start.line),
          `${file} has invalid YAML front matter: ${error.message}. Correct the front matter.`,
        ),
      ),
    };
  }
  const value = document.toJS();
  if (value === null || typeof value !== "object" || Array.isArray(value))
    return { relationships: [], problems: [] };
  const frontmatter = value as Record<string, unknown>;
  const atlas = frontmatter["atlas"];
  if (atlas === undefined)
    return {
      ...withTitle(typeof frontmatter["title"] === "string" ? frontmatter["title"] : undefined),
      relationships: [],
      problems: [],
    };
  if (atlas === null || typeof atlas !== "object" || Array.isArray(atlas)) {
    return {
      relationships: [],
      problems: [
        problem(
          "schema-violation",
          at(file, yaml.position?.start.line),
          `${file} has an atlas front-matter field that is not an object. Use atlas.relationships.`,
        ),
      ],
    };
  }
  const relationships = (atlas as Record<string, unknown>)["relationships"];
  if (relationships === undefined)
    return {
      ...withTitle(typeof frontmatter["title"] === "string" ? frontmatter["title"] : undefined),
      relationships: [],
      problems: [],
    };
  if (!Array.isArray(relationships)) {
    return {
      relationships: [],
      problems: [
        problem(
          "schema-violation",
          at(file, yaml.position?.start.line),
          `${file} has atlas.relationships that is not an array. Use a list of { type, to } entries.`,
        ),
      ],
    };
  }
  const declarations: RelationshipDeclaration[] = [];
  const problems: ReturnType<typeof problem>[] = [];
  for (const [index, entry] of relationships.entries()) {
    const node = document.getIn(["atlas", "relationships", index], true) as
      { readonly range?: readonly number[] } | undefined;
    const line = yamlNodeLine(yaml, yaml.value, node?.range?.[0]);
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      problems.push(
        problem(
          "schema-violation",
          { file, line, column: 1 },
          `${file} atlas.relationships entry ${index + 1} is not an object. Use { type, to }.`,
        ),
      );
      continue;
    }
    const declaration = entry as Record<string, unknown>;
    if (
      typeof declaration["type"] !== "string" ||
      declaration["type"].length === 0 ||
      typeof declaration["to"] !== "string" ||
      declaration["to"].length === 0
    ) {
      problems.push(
        problem(
          "schema-violation",
          { file, line, column: 1 },
          `${file} atlas.relationships entry ${index + 1} needs non-empty type and to values. Correct the relationship.`,
        ),
      );
      continue;
    }
    declarations.push({ type: declaration["type"], to: declaration["to"], line });
  }
  return {
    ...withTitle(typeof frontmatter["title"] === "string" ? frontmatter["title"] : undefined),
    relationships: declarations,
    problems,
  };
}

function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  for (const child of node.children ?? []) walk(child, visit);
}

function isAdr(path: string, directories: readonly string[]): boolean {
  return directories.some((directory) => path === directory || path.startsWith(`${directory}/`));
}

export class MarkdownProvider implements Provider {
  readonly id = "markdown";

  async discover(workspace: Workspace): Promise<readonly SourceLocation[]> {
    const candidates = ["docs", "doc"];
    try {
      if (await workspace.fs.exists(".adr-dir")) {
        const adrDirectory = normalise((await workspace.fs.readFile(".adr-dir")).trim());
        if (adrDirectory !== undefined && adrDirectory !== "") candidates.push(adrDirectory);
      }
    } catch {
      // Discovery is advisory. The configured source will produce a located loading error.
    }
    const locations: SourceLocation[] = [];
    for (const path of [...new Set(candidates)]) {
      if (await workspace.fs.exists(path)) locations.push({ provider: this.id, path, options: {} });
    }
    return locations;
  }

  async project(workspace: Workspace, location: SourceLocation): Promise<Loaded<SourceRecord[]>> {
    let files: readonly string[];
    try {
      files = location.path.endsWith(".md")
        ? [location.path]
        : await workspace.fs.list(`${location.path}/**/*.md`);
    } catch {
      return failed([
        problem(
          "unreadable-file",
          { file: location.path },
          `${location.path} cannot be listed. Check that it exists and is readable.`,
        ),
      ]);
    }
    const adrDirectories: string[] = [];
    try {
      if (await workspace.fs.exists(".adr-dir")) {
        const directory = normalise((await workspace.fs.readFile(".adr-dir")).trim());
        if (directory !== undefined && directory !== "") adrDirectories.push(directory);
      }
    } catch {
      // A missing marker simply means no ADR-specific record is emitted.
    }

    const records: SourceRecord[] = [];
    const problems: ReturnType<typeof problem>[] = [];
    const assetReferrers = new Map<string, Set<string>>();
    for (const file of files) {
      let text: string;
      try {
        text = await workspace.fs.readFile(file);
      } catch {
        problems.push(
          problem(
            "unreadable-file",
            { file },
            `${file} cannot be read. Check that it is readable.`,
          ),
        );
        continue;
      }
      const root = remark().use(remarkFrontmatter, ["yaml"]).parse(text) as unknown as Node;
      const parsedFrontMatter = frontMatter(root, file);
      if (parsedFrontMatter.problems.length > 0) {
        problems.push(...parsedFrontMatter.problems);
        continue;
      }
      const headings = (root.children ?? []).filter(
        (node) => node.type === "heading" && node.position !== undefined,
      );
      const firstH1 = headings.find((heading) => heading.depth === 1);
      const title =
        parsedFrontMatter.title ?? (firstH1 === undefined ? basename(file) : textOf(firstH1));
      records.push({
        ref: { provider: this.id, kind: "document", externalId: file },
        title,
        text,
        provenance: { sourcePath: file },
        attributes:
          parsedFrontMatter.relationships.length === 0
            ? {}
            : { atlasRelationships: parsedFrontMatter.relationships },
      });
      if (isAdr(file, adrDirectories)) {
        records.push({
          ref: { provider: this.id, kind: "decision", externalId: file },
          title,
          text,
          provenance: { sourcePath: file },
          attributes: {},
        });
      }
      const slugger = new GithubSlugger();
      for (const [index, heading] of headings.entries()) {
        const headingTitle = textOf(heading);
        const fragment = slugger.slug(headingTitle);
        const sectionEnd = headings[index + 1]?.position?.start.offset ?? text.length;
        records.push({
          ref: { provider: this.id, kind: "section", externalId: file, fragment },
          title: headingTitle,
          text: text.slice(heading.position?.start.offset, sectionEnd),
          provenance: { sourcePath: file, sourceLine: heading.position?.start.line },
          attributes: {},
        });
      }
      walk(root, (node) => {
        if ((node.type === "link" || node.type === "image") && node.url !== undefined) {
          const asset = resolveAsset(file, node.url);
          if (asset !== undefined) {
            const referrers = assetReferrers.get(asset) ?? new Set<string>();
            referrers.add(file);
            assetReferrers.set(asset, referrers);
          }
        }
      });
    }
    for (const [asset, referrers] of [...assetReferrers.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      if (await workspace.fs.exists(asset)) {
        records.push({
          ref: { provider: this.id, kind: "asset", externalId: asset },
          title: basename(asset),
          provenance: { sourcePath: asset },
          attributes: { referencedBy: [...referrers].sort() },
        });
      }
    }
    return loaded(records, problems);
  }

  async relate(records: readonly SourceRecord[]): Promise<Loaded<Relationship[]>> {
    const relationships: Relationship[] = [];
    const problems: ReturnType<typeof problem>[] = [];
    for (const record of records) {
      if (record.ref.provider !== this.id || record.ref.kind !== "document") continue;
      for (const declaration of recordAttributes(record).atlasRelationships ?? []) {
        const target = parseRef(declaration.to);
        if (!target.ok) {
          problems.push(
            problem(
              "malformed-reference",
              {
                file: record.provenance.sourcePath ?? "unknown",
                line: declaration.line,
                column: 1,
              },
              `${record.provenance.sourcePath ?? "The document"} declares relationship target "${declaration.to}", but ${target.error.reason}. Correct the reference.`,
            ),
          );
          continue;
        }
        relationships.push({
          from: record.ref,
          type: declaration.type,
          to: target.ref,
          origin: "source",
          provenance: {
            sourcePath: record.provenance.sourcePath ?? "unknown",
            sourceLine: declaration.line,
          },
        });
      }
    }
    return loaded(relationships, problems);
  }
}
