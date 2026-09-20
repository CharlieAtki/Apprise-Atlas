# @apprise/atlas-provider-markdown

**Bounded context:** Markdown projection.

**Owns:** Markdown documents, sections, decisions, local assets and source-declared
front-matter relationships.

**May depend on:** core and its parsing dependencies. It never imports toolkit, another
provider or the CLI.

This package projects records with provenance. It never decides whether a reference
resolves; that is validation's job.
