import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { runCli } from "./index.js";

const brokenReferences = fileURLToPath(
  new URL("../../../fixtures/broken-references/", import.meta.url),
);
const sovereignSlice = fileURLToPath(
  new URL("../../../fixtures/sovereign-slice/", import.meta.url),
);

describe("atlas validate", () => {
  it("renders a stable JSON diagnostic report and only strict changes its exit status", async () => {
    const ordinary = await runCli(["validate", "--format", "json"], brokenReferences);
    const strict = await runCli(["validate", "--strict", "--format", "json"], brokenReferences);

    expect(ordinary.exitCode).toBe(0);
    expect(strict.exitCode).toBe(1);
    expect(strict.stdout).toBe(ordinary.stdout);
    expect(JSON.parse(ordinary.stdout)).toMatchObject({
      summary: { errors: 0, warnings: 4 },
      problems: [
        { code: "unknown-fragment", file: "atlas/walkthroughs/demo.yaml", line: 7 },
        { code: "wrong-kind", file: "atlas/walkthroughs/demo.yaml", line: 10 },
        { code: "unresolved-reference", file: "atlas/walkthroughs/demo.yaml", line: 13 },
        { code: "asymmetric-link", file: "docs/guide.md", line: 4 },
      ],
    });
  });

  it("renders located human diagnostics and rejects malformed invocations with the complete usage", async () => {
    const result = await runCli(["validate"], brokenReferences);
    const invalid = await runCli(["show", "not-a-reference"], brokenReferences);

    expect(result.stdout).toContain(
      "atlas/walkthroughs/demo.yaml:7:10 [warning] unknown-fragment:",
    );
    expect(invalid).toEqual({
      exitCode: 2,
      stdout: "",
      stderr:
        "Usage:\n  atlas validate [--strict] [--format json]\n  atlas list <kind> [--strict] [--format json]\n  atlas show <ref> [--strict] [--format json]\n",
    });
  });

  it("accepts the curated Sovereign slice with strict validation and projects both providers", async () => {
    const result = await runCli(["validate", "--strict", "--format", "json"], sovereignSlice);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      summary: { errors: 0, warnings: 0 },
      problems: [],
    });
  });

  it("lists canonical kind matches and shows records with their incident relationships", async () => {
    const list = await runCli(["list", "element", "--format", "json"], sovereignSlice);
    const show = await runCli(
      ["show", "likec4:element/governance.gateway", "--format", "json"],
      sovereignSlice,
    );

    expect(list.exitCode).toBe(0);
    expect(
      JSON.parse(list.stdout).records.map(
        (record: { ref: { externalId: string } }) => record.ref.externalId,
      ),
    ).toEqual(["governance", "governance.gateway"]);
    expect(show.exitCode).toBe(0);
    expect(JSON.parse(show.stdout)).toMatchObject({
      record: { ref: { provider: "likec4", kind: "element", externalId: "governance.gateway" } },
      relationships: [
        {
          type: "describes",
          to: { provider: "likec4", kind: "element", externalId: "governance.gateway" },
        },
      ],
      unresolved: null,
    });
    expect((await runCli(["list", "element"], sovereignSlice)).stdout).toContain(
      "likec4:element/governance.gateway\tPolicy gateway",
    );
  });

  it("returns structured guidance for a syntactically valid record that is absent", async () => {
    const result = await runCli(
      ["show", "likec4:view/flow_permitted_path_walkthroug", "--format", "json"],
      sovereignSlice,
    );

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout)).toMatchObject({
      record: null,
      relationships: [],
      unresolved: {
        ref: { provider: "likec4", kind: "view", externalId: "flow_permitted_path_walkthroug" },
        suggestion: "likec4:view/flow_permitted_path_walkthrough",
      },
    });
  });

  it("reports the walkthrough source location and suggestion after a LikeC4 view is renamed", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "atlas-sovereign-"));
    try {
      await cp(sovereignSlice, workspace, { recursive: true });
      const modelPath = join(workspace, "architecture", "model.c4");
      const model = await readFile(modelPath, "utf8");
      await writeFile(
        modelPath,
        model.replace("flow_permitted_path_walkthrough", "flow_permitted_path_walkthrough_renamed"),
      );

      const result = await runCli(["validate", "--strict", "--format", "json"], workspace);
      const report = JSON.parse(result.stdout) as {
        readonly problems: readonly {
          readonly code: string;
          readonly file: string;
          readonly line: number;
          readonly column: number;
          readonly message: string;
        }[];
      };

      expect(result.exitCode).toBe(1);
      expect(report.problems).toContainEqual(
        expect.objectContaining({
          code: "unresolved-reference",
          file: "atlas/walkthroughs/sovereign-story.yaml",
          line: 12,
          column: 10,
        }),
      );
      expect(
        report.problems.find((entry) => entry.code === "unresolved-reference")?.message,
      ).toContain("Did you mean likec4:view/flow_permitted_path_walkthrough_renamed?");
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });
});
