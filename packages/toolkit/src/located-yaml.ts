import {
  problem,
  type Loaded,
  failed,
  loaded,
  type Problem,
  type ProblemLocation,
} from "@apprise/atlas-core";
import { LineCounter, parseDocument, type Document, type ParsedNode } from "yaml";
type NodeWithRange = ParsedNode & { range?: readonly number[] };

type Schema<T> = {
  safeParse(value: unknown):
    | { readonly success: true; readonly data: T }
    | {
        readonly success: false;
        readonly error: {
          readonly issues: readonly {
            readonly path: readonly PropertyKey[];
            readonly message: string;
          }[];
        };
      };
};

export type LocatedYaml<T> = {
  readonly result: Loaded<T>;
  readonly at: (path: readonly (string | number)[]) => ProblemLocation;
};

function locationAt(
  document: Document.Parsed,
  counter: LineCounter,
  file: string,
  path: readonly (string | number)[],
): ProblemLocation {
  let node: NodeWithRange | undefined;
  for (let length = path.length; length >= 0 && node === undefined; length -= 1) {
    node = document.getIn([...path.slice(0, length)], true) as NodeWithRange | undefined;
  }
  const offset = node?.range?.[0] ?? document.contents?.range?.[0] ?? 0;
  const position = counter.linePos(offset);
  return position === undefined ? { file } : { file, line: position.line, column: position.col };
}

/** Parse YAML and preserve enough source information for callers to locate semantic errors. */
export function parseLocatedYaml<T>(text: string, file: string, schema: Schema<T>): LocatedYaml<T> {
  const counter = new LineCounter();
  const document = parseDocument(text, { lineCounter: counter });
  const at = (path: readonly (string | number)[]): ProblemLocation =>
    locationAt(document, counter, file, path);

  if (document.errors.length > 0) {
    const problems: Problem[] = document.errors.map((error) =>
      problem(
        "unparseable",
        at([]),
        `${file} cannot be parsed as YAML: ${error.message}. Correct the YAML syntax.`,
      ),
    );
    return { result: failed(problems), at };
  }

  const parsed = schema.safeParse(document.toJS());
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) =>
      problem(
        "schema-violation",
        at(issue.path.map((part) => (typeof part === "symbol" ? String(part) : part))),
        `${file} is invalid at ${issue.path.length === 0 ? "the document root" : issue.path.join(".")}: ${issue.message}. Correct that value.`,
      ),
    );
    return { result: failed(problems), at };
  }

  return { result: loaded(parsed.data), at };
}
