import {readFile} from "node:fs/promises";
import path from "node:path";
import {
  ReferencesOperationsDashboard,
  type ExternalReferenceMapping,
  type ExternalReferenceState,
  type ExternalSourceInboxItem,
} from "@/features/references/ReferencesOperationsDashboard";

export const dynamic = "force-dynamic";

const PROJECT_ROOT = process.cwd();
const INBOX_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "external-source-inbox.json");
const MAPPING_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "mapped-external-reference-candidates.json");
const COVERAGE_SUMMARY_FILE = path.join(PROJECT_ROOT, "output", "external-reference-coverage", "summary.json");
const MAX_SNAPSHOT_INBOX_ITEMS = 80;
const MAX_SNAPSHOT_MAPPING_ITEMS = 120;

interface RawInboxFile {
  sources?: ExternalSourceInboxItem[];
}

interface RawMappingFile {
  generatedAt?: string;
  summary?: ExternalReferenceState["mapping"]["summary"];
  mappings?: ExternalReferenceMapping[];
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function sanitizeInboxSource(source: ExternalSourceInboxItem): ExternalSourceInboxItem {
  return {
    id: source.id,
    catalogId: source.catalogId,
    provider: source.provider,
    title: source.title,
    sourceProvider: source.sourceProvider,
    checkedAt: source.checkedAt,
    observed: source.observed,
  };
}

function sanitizeMapping(mapping: ExternalReferenceMapping): ExternalReferenceMapping {
  return {
    inboxId: mapping.inboxId,
    catalogId: mapping.catalogId,
    status: mapping.status,
    confidenceScore: mapping.confidenceScore,
    confidenceGap: mapping.confidenceGap,
    reason: mapping.reason,
    evidence: mapping.evidence,
    candidate: mapping.candidate?.source
      ? {
          source: {
            title: mapping.candidate.source.title,
            provider: mapping.candidate.source.provider,
          },
        }
      : undefined,
  };
}

async function loadReadOnlySnapshot(): Promise<ExternalReferenceState> {
  const [inbox, mapping, coverage] = await Promise.all([
    readJsonFile<RawInboxFile>(INBOX_FILE, {sources: []}),
    readJsonFile<RawMappingFile>(MAPPING_FILE, {generatedAt: undefined, summary: {}, mappings: []}),
    readJsonFile<ExternalReferenceState["coverage"]>(COVERAGE_SUMMARY_FILE, null),
  ]);

  const sources = inbox.sources ?? [];
  const mappings = mapping.mappings ?? [];

  return {
    inbox: {
      sourceCount: sources.length,
      sources: sources.slice(-MAX_SNAPSHOT_INBOX_ITEMS).reverse().map(sanitizeInboxSource),
    },
    mapping: {
      generatedAt: mapping.generatedAt ?? null,
      summary: mapping.summary ?? {},
      mappings: mappings.slice(0, MAX_SNAPSHOT_MAPPING_ITEMS).map(sanitizeMapping),
    },
    coverage,
  };
}

export default async function ReferencesPage() {
  const initialState = await loadReadOnlySnapshot();

  return (
    <ReferencesOperationsDashboard
      initialState={initialState}
      initialMessage="Salt-okunur kaynak operasyon snapshot yüklendi. Stage, map, sync ve audit işlemleri ops token ister."
    />
  );
}
