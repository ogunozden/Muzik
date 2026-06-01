import {SYMBTR_CATALOG, type SymbTrCatalogEntry, type SymbTrFormat} from "@/data/symbtr/catalog";

export interface CurationReference {
  catalogId?: string;
  sourceId?: string;
  profileId?: string;
  status?: string;
  rank?: number;
  confidenceScore?: number;
  confidenceLevel?: string;
  matchReasons?: string[];
  conflicts?: string[];
  attachedAt?: string;
  matcherVersion?: string;
}

export interface CatalogMetadata {
  id: string;
  makam: string;
  form: string;
  usul: string;
  title: string;
  composer: string;
  formats: SymbTrFormat[];
}

export interface ExternalReferenceSource {
  id?: string;
  label?: string;
  provider?: string;
  url?: string;
  title?: string;
  access?: string;
  verification?: string;
  verifiedAt?: string;
  notes?: string;
}

interface CurationReferenceView extends CurationReference {
  catalog?: CatalogMetadata | null;
  source?: ExternalReferenceSource | null;
  feedbackEvents?: unknown[];
  manualCorrection?: unknown | null;
  embedState?: unknown | null;
}

export interface CurationStat {
  profileId?: string;
  acceptedCount?: number;
  removedCount?: number;
  deletedCount?: number;
  correctedCount?: number;
  mismatchCount?: number;
  embedSuccessCount?: number;
  embedFailureCount?: number;
}

interface MappingManifest {
  mappings?: Array<{candidate?: {source?: ExternalReferenceSource}}>;
  candidates?: Array<{source?: ExternalReferenceSource}>;
}

interface AutoAttachedManifest {
  matcherVersion?: string;
  references?: CurationReference[];
}

interface FeedbackManifest {
  events?: unknown[];
}

interface ManualCorrectionsManifest {
  corrections?: unknown[];
}

interface ResearchProfilesManifest {
  profiles?: unknown[];
}

interface EmbedStatesManifest {
  states?: unknown[];
}

interface QualityStatsManifest {
  generatedAt?: string | null;
  stats?: CurationStat[];
}

export interface BuildCurationStateInput {
  mapping: MappingManifest | null;
  autoAttached: AutoAttachedManifest | null;
  feedback: FeedbackManifest | null;
  manualCorrections: ManualCorrectionsManifest | null;
  researchProfiles: ResearchProfilesManifest | null;
  embedStates: EmbedStatesManifest | null;
  qualityStats: QualityStatsManifest | null;
}

function formatCatalogValue(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function toCatalogMetadata(entry: SymbTrCatalogEntry): CatalogMetadata {
  return {
    id: entry.id,
    makam: formatCatalogValue(entry.makam),
    form: formatCatalogValue(entry.form),
    usul: formatCatalogValue(entry.usul),
    title: formatCatalogValue(entry.title),
    composer: formatCatalogValue(entry.composer),
    formats: entry.formats,
  };
}

const CATALOG_LOOKUP = new Map<string, CatalogMetadata>(
  SYMBTR_CATALOG.map((entry) => [entry.id, toCatalogMetadata(entry)]),
);

export function getCatalogMetadata(catalogId: string | undefined): CatalogMetadata | null {
  return catalogId ? CATALOG_LOOKUP.get(catalogId) ?? null : null;
}

function referenceKey(value: {catalogId?: unknown; sourceId?: unknown}): string {
  return `${String(value.catalogId ?? "")}:${String(value.sourceId ?? "")}`;
}

function buildSourceLookup(mapping: MappingManifest | null): Map<string, ExternalReferenceSource> {
  const sources = new Map<string, ExternalReferenceSource>();

  for (const mappingItem of mapping?.mappings ?? []) {
    const source = mappingItem.candidate?.source;
    if (source?.id) sources.set(source.id, source);
  }

  for (const candidate of mapping?.candidates ?? []) {
    const source = candidate.source;
    if (source?.id) sources.set(source.id, source);
  }

  return sources;
}

function getReferenceCountByStatus(references: CurationReference[], status: string): number {
  return references.filter((reference) => reference.status === status).length;
}

export function buildCurationState({
  mapping,
  autoAttached,
  feedback,
  manualCorrections,
  researchProfiles,
  embedStates,
  qualityStats,
}: BuildCurationStateInput) {
  const references = autoAttached?.references ?? [];
  const feedbackEvents = feedback?.events ?? [];
  const corrections = manualCorrections?.corrections ?? [];
  const states = embedStates?.states ?? [];
  const stats = qualityStats?.stats ?? [];
  const sourceLookup = buildSourceLookup(mapping);
  const referenceViews: CurationReferenceView[] = references.map((reference) => ({
    ...reference,
    catalog: getCatalogMetadata(reference.catalogId),
    source: reference.sourceId ? sourceLookup.get(reference.sourceId) ?? null : null,
    feedbackEvents: feedbackEvents.filter((event) => (
      typeof event === "object" &&
      event !== null &&
      referenceKey(event) === referenceKey(reference)
    )),
    manualCorrection: corrections.find((correction) => (
      typeof correction === "object" &&
      correction !== null &&
      referenceKey(correction) === referenceKey(reference)
    )) ?? null,
    embedState: states.find((state) => (
      typeof state === "object" &&
      state !== null &&
      "sourceId" in state &&
      state.sourceId === reference.sourceId
    )) ?? null,
  }));

  return {
    summary: {
      autoAttachedCount: references.length,
      removedCount: getReferenceCountByStatus(references, "user-removed"),
      deleteRequestedCount: getReferenceCountByStatus(references, "delete-requested"),
      deletedCount: getReferenceCountByStatus(references, "deleted"),
      conflictCount: references.filter((reference) => reference.confidenceLevel === "conflict" || (reference.conflicts?.length ?? 0) > 0).length,
      feedbackEventCount: feedbackEvents.length,
      manualCorrectionCount: corrections.length,
      researchSourceProfileCount: researchProfiles?.profiles?.length ?? 0,
      embedStateCount: states.length,
      sourceQualityStatCount: stats.length,
      matcherVersion: autoAttached?.matcherVersion ?? null,
      statsGeneratedAt: qualityStats?.generatedAt ?? null,
    },
    autoAttachedReferences: referenceViews.slice(0, 160),
    feedbackEvents: feedbackEvents.slice(-80).reverse(),
    manualCorrections: corrections.slice(0, 160),
    researchSourceProfiles: researchProfiles?.profiles ?? [],
    embedStates: states.slice(0, 160),
    sourceQualityStats: stats,
  };
}
