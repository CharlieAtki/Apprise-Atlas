# Apprise Atlas

In the world of the Agentic SDLC, vibe-coded HTML demos and unmaintainable docs, we need
something easier to use: Atlas.

Atlas indexes a repository's existing engineering artefacts — a LikeC4 architecture model,
Markdown documentation, ADRs, API specifications — into one reference graph, and serves
three audiences from it:

- a developer **exploring** an unfamiliar system,
- a developer **presenting** it, without rebuilding it in slides or a throwaway demo,
- a coding **agent** that needs a bounded, provenance-carrying bundle of context.

Atlas is a projection. LikeC4 owns the architecture, Markdown owns the prose, ADRs own the
decisions, and the running system owns its behaviour. Atlas owns the walkthroughs, the
explicit links between those sources, and nothing else.

> **Status: pre-alpha.** The CLI validates and queries a repository's Markdown, LikeC4
> views and walkthroughs; the explorer and authoring experience are still to come. The scope
> and stack are settled in [`docs/dev/plan.md`](docs/dev/plan.md).

## Repository layout

| Path | Holds |
|---|---|
| `packages/` | The publishable packages — `core`, `toolkit`, the providers, the CLI |
| `docs/dev/` | Scope, technical plan and contributor notes |
| `docs/adr/` | Accepted decisions and their rationale |
| `fixtures/` | Sample repositories used by CLI and end-to-end tests |

Contributor rules live in [`AGENTS.md`](AGENTS.md).

## Development

The toolchain comes from Bun. A Nix dev shell is available but not required.

```bash
bun install
```

Tasks below are run with [`xc`](https://github.com/joerdav/xc). Every one is an ordinary
code block, so they can be copied and pasted without installing anything.

## Tasks

### install

Install workspace dependencies.

```bash
bun install --frozen-lockfile
```

### format

Rewrite files to the Prettier style.

```bash
bunx prettier --write .
```

### format-check

```bash
bunx prettier --check .
```

### lint

```bash
bunx eslint .
```

### lint-md

```bash
bunx markdownlint-cli2
```

### validate

Enforce the package boundaries in AGENTS.md. Grows a second stage — self-validation with
Atlas's own CLI — once the CLI exists.

```bash
if [ -d packages ] && [ -n "$(ls -A packages 2>/dev/null)" ]; then
  bunx depcruise packages --config .dependency-cruiser.cjs
else
  echo "no packages yet; boundary rules have nothing to check"
fi
```

### typecheck

```bash
bunx tsc --build --verbose
```

### test

```bash
bunx vitest run --passWithNoTests
```

### build

```bash
if [ -d packages ] && [ -n "$(ls -A packages 2>/dev/null)" ]; then
  bunx tsc --build
else
  echo "no packages yet"
fi
```

### schema

Regenerate the JSON Schema documents in `schemas/` from the Zod schemas that define
them. CI runs this and then fails if the working tree changed, which is what stops the
published format reference drifting from the schemas.

Requires: build

```bash
node scripts/generate-schemas.mjs
```

### smoke

Run the built output under Node rather than Bun. Without this, "publishes
Node-compatible ESM" is an unverified claim.

```bash
if [ -f packages/cli/dist/index.js ]; then
  node --input-type=module -e "await Promise.all(['core', 'toolkit', 'provider-markdown', 'provider-likec4', 'cli'].map((name) => import('./packages/' + name + '/dist/index.js'))); console.log('node esm ok')"
else
  echo "nothing built yet"
fi
```

### ci

The composite gate. CI runs this command and nothing else.

Requires: format-check, lint, lint-md, validate, typecheck, test, build, schema, smoke

```bash
echo "gate green"
```

## Licence

MIT. See [LICENSE](LICENSE).
