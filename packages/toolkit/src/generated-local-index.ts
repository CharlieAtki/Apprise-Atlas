import {
  formatRef,
  loaded,
  problem,
  refKey,
  sameRef,
  type AtlasRef,
  type KnowledgeIndex,
  type KnowledgeQuery,
  type KnowledgeResult,
  type Loaded,
  type Relationship,
  type SourceRecord,
} from "@apprise/atlas-core";

function provenanceLocation(record: SourceRecord): { file: string; line?: number } {
  return {
    file: record.provenance.sourcePath ?? record.provenance.sourceUrl ?? "unknown",
    ...(record.provenance.sourceLine === undefined ? {} : { line: record.provenance.sourceLine }),
  };
}

function relationshipOrder(a: Relationship, b: Relationship): number {
  const aKey = `${refKey(a.from)}\u0000${a.type}\u0000${refKey(a.to)}\u0000${a.origin}`;
  const bKey = `${refKey(b.from)}\u0000${b.type}\u0000${refKey(b.to)}\u0000${b.origin}`;
  return aKey.localeCompare(bKey);
}

function score(record: SourceRecord, query: string): number {
  if (query.length === 0) return 0;
  const reference = formatRef(record.ref).toLowerCase();
  if (reference === query) return 4;
  if (reference.includes(query)) return 3;
  if (record.title.toLowerCase().includes(query)) return 2;
  if (`${record.summary ?? ""}\n${record.text ?? ""}`.toLowerCase().includes(query)) return 1;
  return -1;
}

/**
 * Deterministic local implementation of the read-only graph query port.
 *
 * Construction happens through buildIndex(), which records collisions as tolerant
 * loading problems before this immutable query object is exposed to consumers.
 */
export class GeneratedLocalIndex implements KnowledgeIndex {
  private readonly byRef: ReadonlyMap<string, SourceRecord>;
  private readonly edges: readonly Relationship[];

  constructor(records: readonly SourceRecord[], relationships: readonly Relationship[]) {
    this.byRef = new Map(records.map((record) => [refKey(record.ref), record]));
    this.edges = [...relationships].sort(relationshipOrder);
  }

  async resolve(ref: AtlasRef): Promise<SourceRecord | undefined> {
    return this.byRef.get(refKey(ref));
  }

  async search(query: KnowledgeQuery): Promise<readonly KnowledgeResult[]> {
    const needle = query.text.trim().toLowerCase();
    const results = [...this.byRef.values()]
      .map((record) => ({ record, score: score(record, needle) }))
      .filter((result) => result.score >= 0)
      .sort(
        (a, b) => b.score - a.score || refKey(a.record.ref).localeCompare(refKey(b.record.ref)),
      );
    return results.slice(0, query.limit === undefined ? undefined : Math.max(0, query.limit));
  }

  async neighbours(ref: AtlasRef): Promise<readonly Relationship[]> {
    return this.edges.filter((edge) => sameRef(edge.from, ref) || sameRef(edge.to, ref));
  }

  records(): readonly SourceRecord[] {
    return [...this.byRef.values()].sort((a, b) => refKey(a.ref).localeCompare(refKey(b.ref)));
  }

  relationships(): readonly Relationship[] {
    return this.edges;
  }
}

/**
 * Builds an immutable index. The caller owns input ordering, so a workspace can retain
 * the first configured source when two providers claim the same canonical reference.
 */
export function buildIndex(
  records: readonly SourceRecord[],
  relationships: readonly Relationship[],
): Loaded<GeneratedLocalIndex> {
  const accepted: SourceRecord[] = [];
  const problems: ReturnType<typeof problem>[] = [];
  const seen = new Map<string, SourceRecord>();
  for (const record of records) {
    const key = refKey(record.ref);
    const first = seen.get(key);
    if (first !== undefined) {
      problems.push(
        problem(
          "duplicate-id",
          provenanceLocation(record),
          `${provenanceLocation(record).file} projects ${key}, already projected by ${provenanceLocation(first).file}. Rename one source record so the reference is unique.`,
        ),
      );
      continue;
    }
    seen.set(key, record);
    accepted.push(record);
  }
  return loaded(new GeneratedLocalIndex(accepted, relationships), problems);
}
