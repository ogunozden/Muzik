import catalogData from "./catalog.generated.json";

export type SymbTrFormat = "txt" | "mid" | "xml" | "mu2" | "pdf";
export type SymbTrSourceAccess = "local-archive" | "external-link";

export interface SymbTrCatalogEntry {
  id: string;
  makam: string;
  form: string;
  usul: string;
  title: string;
  composer: string;
  formats: SymbTrFormat[];
}

export interface SymbTrSourceReference {
  id: string;
  label: string;
  access: SymbTrSourceAccess;
  canonical: boolean;
  format?: SymbTrFormat;
  archivePath?: string;
  archiveMemberPath?: string;
  url?: string;
}

export interface SymbTrCatalogSourceCoverage {
  totalEntries: number;
  entriesWithAllFormats: number;
  missingFormatEntries: Array<{
    id: string;
    missingFormats: SymbTrFormat[];
  }>;
}

export const SYMBTR_CATALOG = catalogData.entries as SymbTrCatalogEntry[];
export const SYMBTR_CATALOG_COUNT = catalogData.count;
export const SYMBTR_UPSTREAM_REPOSITORY_URL = "https://github.com/MTG/SymbTr";

const SYMBTR_FORMAT_ORDER: readonly SymbTrFormat[] = ["txt", "mid", "xml", "mu2", "pdf"];
const SYMBTR_FORMAT_LABELS: Record<SymbTrFormat, string> = {
  txt: "SymbTr TXT",
  mid: "MIDI",
  xml: "MusicXML",
  mu2: "Mus2",
  pdf: "PDF nota",
};

export function getSymbTrEntryById(id: string): SymbTrCatalogEntry | undefined {
  return SYMBTR_CATALOG.find((entry) => entry.id === id);
}

function getOrderedFormats(formats: readonly SymbTrFormat[]): SymbTrFormat[] {
  const available = new Set(formats);
  return SYMBTR_FORMAT_ORDER.filter((format) => available.has(format));
}

export function getSymbTrEntrySourceReferences(entry: SymbTrCatalogEntry): SymbTrSourceReference[] {
  const localArchiveReferences = getOrderedFormats(entry.formats).map((format) => ({
    id: `${entry.id}:${format}`,
    label: SYMBTR_FORMAT_LABELS[format],
    access: "local-archive" as const,
    canonical: true,
    format,
    archivePath: `symb/${format}_v3.zip`,
    archiveMemberPath: `${format}_v3/${entry.id}.${format}`,
  }));

  return [
    ...localArchiveReferences,
    {
      id: `${entry.id}:symbtr-upstream`,
      label: "MTG/SymbTr GitHub",
      access: "external-link",
      canonical: false,
      url: SYMBTR_UPSTREAM_REPOSITORY_URL,
    },
  ];
}

export function getSymbTrCatalogSourceCoverage(
  entries: readonly SymbTrCatalogEntry[] = SYMBTR_CATALOG,
): SymbTrCatalogSourceCoverage {
  const missingFormatEntries = entries
    .map((entry) => {
      const available = new Set(entry.formats);
      return {
        id: entry.id,
        missingFormats: SYMBTR_FORMAT_ORDER.filter((format) => !available.has(format)),
      };
    })
    .filter((entry) => entry.missingFormats.length > 0);

  return {
    totalEntries: entries.length,
    entriesWithAllFormats: entries.length - missingFormatEntries.length,
    missingFormatEntries,
  };
}

function normalizeCatalogSearchValue(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

export function searchSymbTrCatalog(query: string, limit = 20): SymbTrCatalogEntry[] {
  const normalized = normalizeCatalogSearchValue(query);
  if (!normalized) return SYMBTR_CATALOG.slice(0, limit);

  return SYMBTR_CATALOG
    .filter((entry) =>
      [entry.id, entry.makam, entry.form, entry.usul, entry.title, entry.composer]
        .some((value) => normalizeCatalogSearchValue(value).includes(normalized)),
    )
    .slice(0, limit);
}
