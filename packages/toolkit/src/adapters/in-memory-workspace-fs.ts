import type { WorkspaceFs } from "@apprise/atlas-core";

function normalise(path: string): string {
  const parts: string[] = [];
  for (const part of path.replaceAll("\\", "/").split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (parts.length === 0) throw new Error(`path escapes workspace: ${path}`);
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}

function suffixFor(pattern: string): string {
  const match = /^.+\/\*\*\/\*\.(md|yaml|yml|c4|likec4)$/.exec(pattern);
  if (match?.[1] === undefined) throw new Error(`unsupported workspace glob: ${pattern}`);
  return `.${match[1]}`;
}

/** In-memory WorkspaceFs for provider and toolkit tests; values are UTF-8 text files. */
export class InMemoryWorkspaceFs implements WorkspaceFs {
  readonly root: string;
  private readonly files: ReadonlyMap<string, string>;

  constructor(files: Readonly<Record<string, string>>, root = "/workspace") {
    this.root = root;
    this.files = new Map(Object.entries(files).map(([path, text]) => [normalise(path), text]));
  }

  async readFile(relativePath: string): Promise<string> {
    const value = this.files.get(normalise(relativePath));
    if (value === undefined) throw new Error(`file does not exist: ${relativePath}`);
    return value;
  }

  async exists(relativePath: string): Promise<boolean> {
    const path = normalise(relativePath);
    return (
      this.files.has(path) || [...this.files.keys()].some((file) => file.startsWith(`${path}/`))
    );
  }

  async list(pattern: string): Promise<readonly string[]> {
    const suffix = suffixFor(pattern);
    const prefix = normalise(pattern.slice(0, pattern.indexOf("/**/")));
    const matchingDirectory = [...this.files.keys()].some((path) => path.startsWith(`${prefix}/`));
    if (!matchingDirectory) throw new Error(`directory does not exist: ${prefix}`);
    return [...this.files.keys()]
      .filter((path) => path.startsWith(`${prefix}/`) && path.endsWith(suffix))
      .sort();
  }
}
