import {
  exitCode,
  formatRef,
  isSegment,
  parseRef,
  sortProblems,
  suggest,
  summarise,
  type IndexListReport,
  type IndexShowReport,
  type Problem,
  type Relationship,
  type SourceRecord,
  type ValidationReport,
} from "@apprise/atlas-core";
import { LikeC4Provider } from "@apprise/atlas-provider-likec4";
import { MarkdownProvider } from "@apprise/atlas-provider-markdown";
import { NodeWorkspaceFs, validateWorkspace } from "@apprise/atlas-toolkit";

type CommandResult = {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
};

type Format = "human" | "json";
type ParsedCommand =
  | { readonly command: "validate"; readonly strict: boolean; readonly format: Format }
  | {
      readonly command: "list";
      readonly kind: string;
      readonly strict: boolean;
      readonly format: Format;
    }
  | {
      readonly command: "show";
      readonly reference: string;
      readonly strict: boolean;
      readonly format: Format;
    };

function usage(): string {
  return [
    "Usage:",
    "  atlas validate [--strict] [--format json]",
    "  atlas list <kind> [--strict] [--format json]",
    "  atlas show <ref> [--strict] [--format json]",
    "",
  ].join("\n");
}

export function renderProblems(problems: readonly Problem[]): string {
  return sortProblems(problems)
    .map((entry) => {
      const location = `${entry.file}${entry.line === undefined ? "" : `:${entry.line}${entry.column === undefined ? "" : `:${entry.column}`}`}`;
      return `${location} [${entry.severity}] ${entry.code}: ${entry.message}`;
    })
    .join("\n");
}

function parseCommand(args: readonly string[]): ParsedCommand | undefined {
  const [command, ...rest] = args;
  if (command !== "validate" && command !== "list" && command !== "show") return undefined;
  let strict = false;
  let format: Format = "human";
  const positional: string[] = [];
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--strict") {
      strict = true;
      continue;
    }
    if (argument === "--format" && rest[index + 1] === "json") {
      format = "json";
      index += 1;
      continue;
    }
    if (argument?.startsWith("--")) return undefined;
    if (argument !== undefined) positional.push(argument);
  }
  if (command === "validate" && positional.length === 0) return { command, strict, format };
  if (command === "list" && positional.length === 1 && isSegment(positional[0] ?? "")) {
    return { command, kind: positional[0] ?? "", strict, format };
  }
  if (command === "show" && positional.length === 1) {
    return { command, reference: positional[0] ?? "", strict, format };
  }
  return undefined;
}

function renderList(records: readonly SourceRecord[]): string {
  return records.map((record) => `${formatRef(record.ref)}\t${record.title}`).join("\n");
}

function renderRelationship(relationship: Relationship): string {
  return `${formatRef(relationship.from)} ${relationship.type} ${formatRef(relationship.to)}`;
}

function renderShow(report: IndexShowReport): string {
  if (report.record === null) {
    const requested = report.unresolved?.ref;
    const suggestion = report.unresolved?.suggestion;
    return `${requested === undefined ? "Reference" : formatRef(requested)} is not indexed.${suggestion === undefined ? "" : ` Did you mean ${suggestion}?`}`;
  }
  const source = report.record.provenance.sourcePath ?? report.record.provenance.sourceUrl;
  const relationships = report.relationships.map(renderRelationship);
  return [
    `${formatRef(report.record.ref)}\t${report.record.title}`,
    `source: ${source}`,
    ...(relationships.length === 0 ? [] : ["relationships:", ...relationships]),
  ].join("\n");
}

function withDiagnostics(problems: readonly Problem[], data: string): string {
  const diagnostics = renderProblems(problems);
  return [diagnostics, data].filter((section) => section.length > 0).join("\n");
}

function newline(output: string): string {
  return output.length === 0 ? "" : `${output}\n`;
}

async function validation(cwd: string) {
  return validateWorkspace(new NodeWorkspaceFs(cwd), [
    new MarkdownProvider(),
    new LikeC4Provider(),
  ]);
}

/** Runs Atlas's read-only validation and graph query delivery surface. */
export async function runCli(args: readonly string[], cwd: string): Promise<CommandResult> {
  const parsed = parseCommand(args);
  if (parsed === undefined) return { exitCode: 2, stdout: "", stderr: usage() };
  if (parsed.command === "show" && !parseRef(parsed.reference).ok) {
    return { exitCode: 2, stdout: "", stderr: usage() };
  }

  const result = await validation(cwd);
  const problems = sortProblems(result.problems);
  const summary = summarise(problems);
  if (parsed.command === "validate") {
    const report: ValidationReport = { problems, summary };
    return {
      exitCode: exitCode(problems, parsed.strict),
      stdout:
        parsed.format === "json"
          ? `${JSON.stringify(report)}\n`
          : newline(renderProblems(problems)),
      stderr: "",
    };
  }

  const index = result.value?.index;
  if (parsed.command === "list") {
    const records = (index?.records() ?? []).filter((record) => record.ref.kind === parsed.kind);
    const report: IndexListReport = { problems, summary, records };
    return {
      exitCode: exitCode(problems, parsed.strict),
      stdout:
        parsed.format === "json"
          ? `${JSON.stringify(report)}\n`
          : newline(withDiagnostics(problems, renderList(records))),
      stderr: "",
    };
  }

  const reference = parseRef(parsed.reference);
  if (!reference.ok) return { exitCode: 2, stdout: "", stderr: usage() };
  const record = index === undefined ? undefined : await index.resolve(reference.ref);
  const suggestion =
    record === undefined
      ? suggest(
          formatRef(reference.ref),
          (index?.records() ?? []).map((candidate) => formatRef(candidate.ref)),
        )
      : undefined;
  const report: IndexShowReport =
    record === undefined
      ? {
          problems,
          summary,
          record: null,
          relationships: [],
          unresolved: { ref: reference.ref, ...(suggestion === undefined ? {} : { suggestion }) },
        }
      : {
          problems,
          summary,
          record,
          relationships: index === undefined ? [] : [...(await index.neighbours(reference.ref))],
          unresolved: null,
        };
  return {
    exitCode: record === undefined ? 1 : exitCode(problems, parsed.strict),
    stdout:
      parsed.format === "json"
        ? `${JSON.stringify(report)}\n`
        : newline(withDiagnostics(problems, renderShow(report))),
    stderr: "",
  };
}
