# AGENTS.md — Apprise Atlas root

Single instruction file for this repository. Rules live here once; other documents link
to them rather than restating them.

## What Atlas is

Atlas indexes a repository's existing artefacts — a LikeC4 architecture model, Markdown
documentation, ADRs, API specifications — into a reference graph, and serves an explorer,
a walkthrough presenter and an agent-facing context bundle from that one index.

**Atlas is a projection.** It is authoritative only for walkthroughs, explicit
cross-source relationships, claims and evidence, and its own configuration. It is never
authoritative for the artefacts it displays. Anything rendered must be able to name its
source; a record that cannot is a bug, not a display choice.

## Authorities

| Concern | Authority |
|---|---|
| Scope, stack and architecture decisions | `docs/dev/plan.md` |
| Accepted decisions and their rationale | `docs/adr/` |
| Repository tasks and the CI gate | `README.md` `## Tasks` (run by `xc`) |
| Every domain shape | the matching `*.schema.ts` in `packages/core` |

Do not restate these elsewhere. Link to them.

## Package ownership

| Package | Owns | May depend on |
|---|---|---|
| `@apprise/atlas-core` | Domain rules and shapes: references, projection, graph, narrative, assurance, ports | `zod` **only** |
| `@apprise/atlas-toolkit` | Use cases, index building, query layer, and Atlas's own local I/O adapters | core, `yaml` |
| `@apprise/atlas-provider-markdown` | Markdown, front matter, ADR convention, assets | core |
| `@apprise/atlas-provider-likec4` | LikeC4 views and elements | core; `likec4` as a **peer** |
| `@apprise/atlas-cli` | Command-line delivery | core, toolkit, both providers |

## Non-negotiable seams

1. `core` imports no `node:*` builtin and no package but `zod`. If a function could fail
   because of something outside the process, it belongs in `toolkit`.
2. Providers depend on `core` only. They never import `toolkit`, each other, or the CLI.
3. All filesystem access in `toolkit` is quarantined in `src/adapters/`. Nothing outside
   that directory imports `node:*`.
4. No package imports the CLI.
5. One public entry per package (`src/index.ts`). Deep imports are forbidden.
   `@apprise/atlas-toolkit/testing` is the only declared secondary entry.

`xc validate` enforces these with dependency-cruiser. A rule you have never seen fail is
a rule you do not have — when you add one, break it once on purpose first.

## Shapes are Zod schemas, not declarations

One file per shape, named `*.schema.ts`, exporting `XSchema` and
`export type X = z.output<typeof XSchema>`. There is no other place a domain shape may be
declared, and ESLint rejects `interface`/`type` declarations inside `*.schema.ts`.

**Ports are exempt, on purpose.** `Provider`, `KnowledgeIndex`, `ObservationSource` and
`WorkspaceFs` are behavioural contracts, not data shapes. They are hand-written
`interface`s in `core/src/ports/`, and the lint rule does not reach them. Do not convert
them to Zod function schemas.

Use `z.output` for the domain and `z.input` for anything authored by hand — the two
diverge the moment a schema has a `.default()`. `xc schema` regenerates
`schemas/*.json`; CI fails if the working tree is dirty afterwards.

## Diagnostics

Loading is **tolerant**: return a usable value alongside the problems found in it. Never
throw to report a problem a user can act on.

- **Errors** prevent an entity from being understood — unreadable, unparseable, duplicate
  id. They come from loading.
- **Warnings** indicate a stale or mistyped reference in an otherwise usable entity. They
  come from validation.

`--strict` changes **only** the exit code. Rendered output is byte-identical either way,
and `renderProblems` takes no `strict` parameter so this cannot drift.

Every message names **both ends** of the problem and suggests a fix. "unresolved
reference" is not an acceptable message; naming the scene, the target, the nearest
existing candidate and the remedy is.

## Testing

- `*.test.ts` is a Vitest unit test. `*.spec.ts` is reserved for Playwright.
- Test names are **full sentences stating the rule**, not the function under test:
  `it('names both the scene that holds the reference and the document that does not contain it')`.
- Domain and provider tests are in-memory and white-box. No fixture files — use
  `LikeC4.fromSource()`, inline YAML strings, and the in-memory `WorkspaceFs`.
- `fixtures/` exists only for CLI and end-to-end tests, because Atlas's input is a
  repository and those tests need one.
- The acceptance test in `fixtures/sovereign-slice/` is never skipped.

## Dependencies

Pin every dependency exactly — no `^`, no `~`. Adding a runtime dependency to `core` or
to a provider is an architectural change: raise it before doing it.

## Verification

`xc ci` is the gate, and CI runs exactly that command. It chains format, lint,
dependency-cruiser, typecheck, schema-drift, test, build, and a Node smoke test of the
built ESM.

## Do not

- Do not add a second definition of a shape that a `*.schema.ts` already owns.
- Do not use `any` without a comment justifying it.
- Do not use default exports.
- Do not commit generated LikeC4 output or build artefacts.
- Do not make `core` aware of what a provider's `attributes` mean.
- Do not promote a warning to an error to make a demo pass.

## Git

Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Branches
`feature/`, `fix/`, `chore/`. Open a pull request; do not push to `main`.
