# @apprise/atlas-toolkit

**Bounded contexts:** Workspace loading and local adapters.

**Owns:** use cases that read a configured repository, located YAML diagnostics, and
Atlas's Node and in-memory `WorkspaceFs` adapters.

**May depend on:** core and YAML. Node builtins are restricted to `src/adapters/`.

Toolkit never interprets provider-specific records or resolves references. Loading reports
errors; validation is a later use case.
