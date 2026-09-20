# @apprise/atlas-core

**Bounded contexts:** Reference, Projection, Graph, Narrative, Assurance — plus the ports
the application layer implements against.

**Owns:** every domain shape in Atlas, and the rules that decide whether a value is
well formed.

**May depend on:** `zod`, and nothing else. No `node:*` builtin, no provider, no
application code.

**Philosophy:** core is a set of rules about shapes. If a function here could fail because
of something outside the process — a file that is missing, a network that is down, a
model that will not parse — it belongs in `@apprise/atlas-toolkit` instead. Core decides
whether something is *valid*, never whether it is *available*.

Core also never learns what a provider's `attributes` mean. The moment it does, the
provider boundary has leaked and a third party can no longer write a provider without
changing core.
