import {readFile} from "node:fs/promises";
import path from "node:path";
import {buildCurationState, type CurationStat, type ExternalReferenceSource} from "@/app/api/external-references/curation-state";
import {
  ReferencesCurationDetail,
  type ExternalReferenceState,
} from "@/features/references/ReferencesCurationDetail";

export const dynamic = "force-dynamic";

const PROJECT_ROOT = process.cwd();
const COVERAGE_ROOT = path.join(PROJECT_ROOT, "output", "external-reference-coverage");
const REFERENCES_ROOT = path.join(PROJECT_ROOT, "src", "data", "references");

interface AutoAttachedManifest {
  matcherVersion?: string;
  references?: Array<{
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
  }>;
}

interface MappingManifest {
  generatedAt?: string;
  summary?: Record<string, unknown>;
  mappings?: Array<{
    status?: string;
    candidate?: {
      source?: ExternalReferenceSource;
    };
  }>;
  candidates?: Array<{
    source?: ExternalReferenceSource;
  }>;
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

type ReadOnlyDetailReference = NonNullable<
  NonNullable<ExternalReferenceState["curation"]>["autoAttachedReferences"]
>[number];
type ReadOnlyDetailInput = {
  catalogId?: string;
  sourceId?: string;
  catalog?: ReadOnlyDetailReference["catalog"];
  source?: {
    id?: string;
    label?: string;
    provider?: string;
    url?: string;
    title?: string;
    author?: string;
    thumbnailUrl?: string;
    access?: string;
    verification?: string;
    verifiedAt?: string;
  } | null;
  embedState?: unknown;
  status?: string;
  rank?: number;
  confidenceScore?: number;
  confidenceLevel?: string;
  matchReasons?: string[];
  conflicts?: string[];
  attachedAt?: string;
};

async function readJsonOrNull<T>(filePath: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function sanitizeReadOnlyReference(reference: ReadOnlyDetailInput): ReadOnlyDetailReference {
  const embedState = typeof reference.embedState === "object" && reference.embedState !== null
    ? reference.embedState as {embedType?: string; canEmbed?: boolean; fallbackUrl?: string}
    : null;

  return {
    catalogId: reference.catalogId,
    sourceId: reference.sourceId,
    catalog: reference.catalog,
    source: reference.source
      ? {
          id: reference.source.id,
          label: reference.source.label,
          provider: reference.source.provider,
          url: reference.source.url,
          title: reference.source.title,
          author: reference.source.author,
          thumbnailUrl: reference.source.thumbnailUrl,
          access: reference.source.access,
          verification: reference.source.verification,
          verifiedAt: reference.source.verifiedAt,
        }
      : null,
    status: reference.status,
    rank: reference.rank,
    confidenceScore: reference.confidenceScore,
    confidenceLevel: reference.confidenceLevel,
    matchReasons: reference.matchReasons,
    conflicts: reference.conflicts,
    attachedAt: reference.attachedAt,
    embedState: embedState
      ? {
          embedType: embedState.embedType,
          canEmbed: embedState.canEmbed,
          fallbackUrl: embedState.fallbackUrl,
        }
      : null,
  };
}

async function buildReadOnlyDetailState(catalogId: string): Promise<ExternalReferenceState> {
  const [
    mapping,
    autoAttached,
    feedback,
    manualCorrections,
    researchProfiles,
    embedStates,
    qualityStats,
  ] = await Promise.all([
    readJsonOrNull<MappingManifest>(path.join(COVERAGE_ROOT, "mapped-external-reference-candidates.json")),
    readJsonOrNull<AutoAttachedManifest>(path.join(REFERENCES_ROOT, "auto-attached-references.json")),
    readJsonOrNull<FeedbackManifest>(path.join(REFERENCES_ROOT, "source-feedback-events.json")),
    readJsonOrNull<ManualCorrectionsManifest>(path.join(REFERENCES_ROOT, "manual-source-corrections.json")),
    readJsonOrNull<ResearchProfilesManifest>(path.join(REFERENCES_ROOT, "research-source-profiles.json")),
    readJsonOrNull<EmbedStatesManifest>(path.join(REFERENCES_ROOT, "embed-states.json")),
    readJsonOrNull<QualityStatsManifest>(path.join(REFERENCES_ROOT, "source-quality-stats.generated.json")),
  ]);
  const curationState = buildCurationState({
    mapping,
    autoAttached,
    feedback,
    manualCorrections,
    researchProfiles,
    embedStates,
    qualityStats,
  });
  const references = (curationState.autoAttachedReferences ?? [])
    .filter((reference) => reference.catalogId === catalogId)
    .map((reference) => sanitizeReadOnlyReference(reference));

  return {
    curation: {
      autoAttachedReferences: references,
    },
  };
}

export default async function ReferencesCurationDetailPage({
  params,
}: {
  params: Promise<{catalogId: string}>;
}) {
  const {catalogId} = await params;
  const decodedCatalogId = decodeURIComponent(catalogId);
  const initialState = await buildReadOnlyDetailState(decodedCatalogId);

  return (
    <ReferencesCurationDetail
      catalogId={decodedCatalogId}
      initialState={initialState}
      initialMessage="Read-only kabul edilmiş kaynak snapshot yüklendi. Feedback ve manuel düzeltme operasyonları ops token ister."
    />
  );
}
