import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { InMemoryWorkspaceFs } from "./in-memory-workspace-fs.js";
import { NodeWorkspaceFs } from "./node-workspace-fs.js";

describe("in-memory workspace filesystem", () => {
  it("lists the supported glob subset in stable workspace-relative order", async () => {
    const fs = new InMemoryWorkspaceFs({
      "docs/z.md": "z",
      "docs/a.md": "a",
      "docs/a.yaml": "yaml",
    });

    await expect(fs.list("docs/**/*.md")).resolves.toEqual(["docs/a.md", "docs/z.md"]);
  });

  it("lists LikeC4 source extensions through the same bounded glob contract", async () => {
    const fs = new InMemoryWorkspaceFs({
      "architecture/model.c4": "model",
      "architecture/views.likec4": "views",
    });

    await expect(fs.list("architecture/**/*.c4")).resolves.toEqual(["architecture/model.c4"]);
    await expect(fs.list("architecture/**/*.likec4")).resolves.toEqual([
      "architecture/views.likec4",
    ]);
  });

  it("rejects a path that escapes the workspace", async () => {
    const fs = new InMemoryWorkspaceFs({ "docs/a.md": "a" });

    await expect(fs.readFile("../secret.txt")).rejects.toThrow("escapes workspace");
    await expect(fs.exists("../secret.txt")).rejects.toThrow("escapes workspace");
  });
});

describe("Node workspace filesystem", () => {
  it("honours the same stable glob contract as the in-memory filesystem", async () => {
    const root = await mkdtemp(join(tmpdir(), "atlas-workspace-"));
    try {
      await mkdir(join(root, "docs"));
      await mkdir(join(root, "architecture"));
      await writeFile(join(root, "docs", "z.md"), "z");
      await writeFile(join(root, "docs", "a.md"), "a");
      await writeFile(join(root, "architecture", "model.c4"), "model");
      await writeFile(join(root, "architecture", "views.likec4"), "views");
      const fs = new NodeWorkspaceFs(root);

      await expect(fs.list("docs/**/*.md")).resolves.toEqual(["docs/a.md", "docs/z.md"]);
      await expect(fs.list("architecture/**/*.c4")).resolves.toEqual(["architecture/model.c4"]);
      await expect(fs.list("architecture/**/*.likec4")).resolves.toEqual([
        "architecture/views.likec4",
      ]);
      await expect(fs.readFile("../secret.txt")).rejects.toThrow("escapes workspace");
      await expect(fs.exists("../secret.txt")).rejects.toThrow("escapes workspace");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
