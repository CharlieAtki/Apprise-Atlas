import {
  failed,
  formatRef,
  loaded,
  parseRef,
  problem,
  refKey,
  sameRef,
  sceneReferences,
  sortProblems,
  suggest,
  type AtlasRef,
  type Loaded,
  type Problem,
  type ProblemLocation,
  type Provider,
  type Provenance,
  type Relationship,
  type SourceRecord,
  type Walkthrough,
  type Workspace,
  type WorkspaceFs,
} from "@apprise/atlas-core";

import { buildIndex, GeneratedLocalIndex } from "./generated-local-index.js";
import { loadLocatedConfig } from "./load-config.js";
import { loadLocatedWalkthroughs } from "./load-walkthroughs.js";

const RECIPROCAL_TYPES: Readonly<Record<string, string>> = {
  documents: "documented-by",
  "documented-by": "documents",
  justifies: "justified-by",
  "justified-by": "justifies",
  verifies: "verified-by",
  "verified-by": "verifies",
  observes: "observed-as",
  "observed-as": "observes",
};

export type WorkspaceValidation = {
  readonly index: GeneratedLocalIndex;
  readonly walkthroughs: readonly Walkthrough[];
};

function sourceLocation(provenance: Provenance): ProblemLocation {
  return {
    file: provenance.sourcePath ?? provenance.sourceUrl ?? "unknown",
    ...(provenance.sourceLine === undefined ? {} : { line: provenance.sourceLine }),
  };
}

function relationshipOrder(a: Relationship, b: Relationship): number {
  const aKey = `${refKey(a.from)}\u0000${a.type}\u0000${refKey(a.to)}\u0000${a.origin}`;
  const bKey = `${refKey(b.from)}\u0000${b.type}\u0000${refKey(b.to)}\u0000${b.origin}`;
  return aKey.localeCompare(bKey);
}

function referenceProblem(
  ref: AtlasRef,
  at: ProblemLocation,
  owner: string,
  index: GeneratedLocalIndex,
): Problem | undefined {
  const target = formatRef(ref);
  const records = index.records();
  if (records.some((record) => refKey(record.ref) === refKey(ref))) return undefined;

  const sameKind = records.filter(
    (record) =>
      record.ref.provider === ref.provider &&
      record.ref.kind === ref.kind &&
      record.ref.externalId === ref.externalId,
  );
  if (sameKind.length > 0) {
    const fragments = sameKind
      .flatMap((record) => (record.ref.fragment === undefined ? [] : [record.ref.fragment]))
      .sort();
    const suggested = ref.fragment === undefined ? undefined : suggest(ref.fragment, fragments);
    const available = fragments.length === 0 ? "no fragments" : fragments.join(", ");
    const correction =
      ref.fragment === undefined
        ? `Add a fragment from: ${available}.`
        : suggested === undefined
          ? `Choose one of: ${available}.`
          : `Did you mean #${suggested}?`;
    return problem(
      "unknown-fragment",
      at,
      `${owner} names ${target}, but ${ref.provider}:${ref.kind}/${ref.externalId} has ${available}. ${correction}`,
    );
  }

  const sameIdentity = records.filter(
    (record) => record.ref.provider === ref.provider && record.ref.externalId === ref.externalId,
  );
  if (sameIdentity.length > 0) {
    const kinds = [...new Set(sameIdentity.map((record) => record.ref.kind))].sort();
    return problem(
      "wrong-kind",
      at,
      `${owner} names ${target}, but ${ref.provider}/${ref.externalId} exists as ${kinds.map((kind) => `${ref.provider}:${kind}/${ref.externalId}`).join(", ")}. Use one of those kinds.`,
    );
  }

  const nearest = suggest(
    target,
    records.map((record) => formatRef(record.ref)),
  );
  return problem(
    "unresolved-reference",
    at,
    `${owner} names ${target}, but no indexed record has that reference.${nearest === undefined ? " Add the target or correct the reference." : ` Did you mean ${nearest}?`}`,
  );
}

function reciprocalProblems(relationships: readonly Relationship[]): Problem[] {
  const problems: Problem[] = [];
  for (const relationship of relationships) {
    if (relationship.origin !== "source" && relationship.origin !== "explicit") continue;
    const inverseType = RECIPROCAL_TYPES[relationship.type];
    if (inverseType === undefined) continue;
    const hasInverse = relationships.some(
      (candidate) =>
        (candidate.origin === "source" || candidate.origin === "explicit") &&
        candidate.type === inverseType &&
        sameRef(candidate.from, relationship.to) &&
        sameRef(candidate.to, relationship.from),
    );
    if (!hasInverse) {
      problems.push(
        problem(
          "asymmetric-link",
          {
            file:
              relationship.provenance.sourcePath ?? relationship.provenance.sourceUrl ?? "unknown",
            ...(relationship.provenance.sourceLine === undefined
              ? {}
              : { line: relationship.provenance.sourceLine }),
          },
          `${formatRef(relationship.from)} declares ${relationship.type} ${formatRef(relationship.to)}, but ${formatRef(relationship.to)} does not declare ${inverseType} ${formatRef(relationship.from)}. Add the reciprocal relationship.`,
        ),
      );
    }
  }
  return problems;
}

/** Loads, projects and validates one configured repository without writing an index file. */
export async function validateWorkspace(
  fs: WorkspaceFs,
  providers: readonly Provider[],
): Promise<Loaded<WorkspaceValidation>> {
  const configResult = await loadLocatedConfig(fs);
  const problems: Problem[] = [...configResult.problems];
  if (configResult.value === undefined) return failed(sortProblems(problems));

  const { config, at: configAt } = configResult.value;
  const workspace: Workspace = { fs, config };
  const walkthroughResult = await loadLocatedWalkthroughs(fs, config.walkthroughs);
  problems.push(...walkthroughResult.problems);
  const locatedWalkthroughs = walkthroughResult.value ?? [];

  const providersById = new Map(providers.map((provider) => [provider.id, provider]));
  const records: SourceRecord[] = [];
  const recordsByProvider = new Map<Provider, SourceRecord[]>();
  for (const [sourceIndex, location] of config.sources.entries()) {
    const provider = providersById.get(location.provider);
    if (provider === undefined) {
      problems.push(
        problem(
          "unavailable-provider",
          configAt(["sources", sourceIndex, "provider"]),
          `atlas.config.yaml configures provider "${location.provider}" for ${location.path}, but that provider is not registered. Install and register ${location.provider} before validating this source.`,
        ),
      );
      continue;
    }
    let projected: Loaded<SourceRecord[]>;
    try {
      projected = await provider.project(workspace, location);
    } catch {
      problems.push(
        problem(
          "unreadable-file",
          { file: location.path },
          `${location.path} cannot be projected by provider "${provider.id}". Check that the source is readable and the provider is configured correctly.`,
        ),
      );
      continue;
    }
    problems.push(...projected.problems);
    if (projected.value === undefined) continue;
    const ordered = [...projected.value].sort((a, b) => refKey(a.ref).localeCompare(refKey(b.ref)));
    records.push(...ordered);
    const providerRecords = recordsByProvider.get(provider) ?? [];
    providerRecords.push(...ordered);
    recordsByProvider.set(provider, providerRecords);
  }

  const recordIndex = buildIndex(records, []);
  problems.push(...recordIndex.problems);
  if (recordIndex.value === undefined) return failed(sortProblems(problems));
  const acceptedRecords = new Set(recordIndex.value.records());

  const relationships: Relationship[] = [];
  for (const [provider, providerRecords] of recordsByProvider) {
    if (provider.relate === undefined) continue;
    let related: Loaded<Relationship[]>;
    try {
      related = await provider.relate(
        providerRecords.filter((record) => acceptedRecords.has(record)),
      );
    } catch {
      problems.push(
        problem(
          "unreadable-file",
          { file: provider.id },
          `Provider "${provider.id}" cannot read its declared relationships. Check the provider source and configuration.`,
        ),
      );
      continue;
    }
    problems.push(...related.problems);
    if (related.value !== undefined) {
      relationships.push(...[...related.value].sort(relationshipOrder));
    }
  }

  const index = new GeneratedLocalIndex(recordIndex.value.records(), relationships);

  for (const located of locatedWalkthroughs) {
    for (const [sceneIndex, scene] of located.walkthrough.scenes.entries()) {
      for (const [referenceIndex, reference] of sceneReferences(scene).entries()) {
        const parsed = parseRef(reference);
        if (!parsed.ok) continue;
        const path =
          scene.ref !== undefined && referenceIndex === 0
            ? ["scenes", sceneIndex, "ref"]
            : [
                "scenes",
                sceneIndex,
                "see",
                scene.ref === undefined ? referenceIndex : referenceIndex - 1,
              ];
        const issue = referenceProblem(
          parsed.ref,
          located.at(path),
          `${located.file} scene "${scene.id}"`,
          index,
        );
        if (issue !== undefined) problems.push(issue);
      }
    }
  }

  for (const relationship of index.relationships()) {
    const owner = `${formatRef(relationship.from)} relationship "${relationship.type}"`;
    const fromIssue = referenceProblem(
      relationship.from,
      sourceLocation(relationship.provenance),
      owner,
      index,
    );
    const toIssue = referenceProblem(
      relationship.to,
      sourceLocation(relationship.provenance),
      owner,
      index,
    );
    if (fromIssue !== undefined) problems.push(fromIssue);
    if (toIssue !== undefined) problems.push(toIssue);
  }
  problems.push(...reciprocalProblems(index.relationships()));

  return loaded(
    {
      index,
      walkthroughs: locatedWalkthroughs.map(({ walkthrough }) => walkthrough),
    },
    sortProblems(problems),
  );
}
