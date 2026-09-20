import { readdir, readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

import type { WorkspaceFs } from "@apprise/atlas-core";

function toPosix(path: string): string {
  return path.split(sep).join("/");
}

function isInside(root: string, candidate: string): boolean {
  const between = relative(root, candidate);
  return between === "" || (!between.startsWith("..") && !between.includes(`${sep}..${sep}`));
}

function suffixFor(pattern: string): string {
  const match = /^.+\/\*\*\/\*\.(md|yaml|yml|c4|likec4)$/.exec(pattern);
  if (match?.[1] === undefined) throw new Error(`unsupported workspace glob: ${pattern}`);
  return `.${match[1]}`;
}

export class NodeWorkspaceFs implements WorkspaceFs {
  readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private absolute(relativePath: string): string {
    const absolute = resolve(this.root, relativePath);
    if (!isInside(this.root, absolute)) throw new Error(`path escapes workspace: ${relativePath}`);
    return absolute;
  }

  async readFile(relativePath: string): Promise<string> {
    return readFile(this.absolute(relativePath), "utf8");
  }

  async exists(relativePath: string): Promise<boolean> {
    const absolute = this.absolute(relativePath);
    try {
      await stat(absolute);
      return true;
    } catch {
      return false;
    }
  }

  async list(pattern: string): Promise<readonly string[]> {
    const suffix = suffixFor(pattern);
    const prefix = pattern.slice(0, pattern.indexOf("/**/"));
    const start = this.absolute(prefix);
    const paths: string[] = [];
    const visit = async (directory: string): Promise<void> => {
      const entries = await readdir(directory, { withFileTypes: true });
      await Promise.all(
        entries.map(async (entry) => {
          const absolute = resolve(directory, entry.name);
          if (entry.isDirectory()) await visit(absolute);
          else if (entry.isFile() && entry.name.endsWith(suffix))
            paths.push(toPosix(relative(this.root, absolute)));
        }),
      );
    };
    await visit(start);
    return paths.sort();
  }
}
