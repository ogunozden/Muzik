import externalReferencePolicy from "./external-reference-policy.json";

export type ExternalReferenceProvider = "score" | "symbtr" | "youtube" | "archive" | "github";
export type ExternalReferenceAccess = "external-link" | "metadata-only" | "embed-allowed";
export type ExternalReferenceVerification = "manual" | "oembed" | "catalog" | "manifest";

export interface ExternalReferenceSource {
  id: string;
  label: string;
  provider: ExternalReferenceProvider;
  url: string;
  title?: string;
  author?: string;
  thumbnailUrl?: string;
  access: ExternalReferenceAccess;
  verification: ExternalReferenceVerification;
  verifiedAt: string;
  notes?: string;
}

export interface ExternalReferenceCoverage {
  totalCatalogEntries: number;
  catalogEntriesWithReferences: number;
  missingCatalogEntryCount: number;
  referenceCount: number;
}

export const EXTERNAL_REFERENCE_POLICY = {
  ...externalReferencePolicy,
  idPattern: new RegExp(externalReferencePolicy.idPatternSource),
} as const;

function normalizeUrlForIdentity(value: string): string | null {
  try {
    const url = new URL(value);
    url.hash = "";

    if (url.hostname === "youtu.be") {
      return `https://www.youtube.com/watch?v=${url.pathname.replace("/", "")}`.toLocaleLowerCase("en-US");
    }

    if (url.hostname.endsWith("youtube.com") && url.searchParams.has("v")) {
      return `https://www.youtube.com/watch?v=${url.searchParams.get("v")}`.toLocaleLowerCase("en-US");
    }

    url.searchParams.sort();
    return url.toString().replace(/\/$/, "").toLocaleLowerCase("en-US");
  } catch {
    return null;
  }
}

export function getExternalReferenceIdentity(source: ExternalReferenceSource): string {
  return `${source.provider}:${normalizeUrlForIdentity(source.url) ?? source.url.trim().toLocaleLowerCase("en-US")}`;
}

export function validateExternalReferenceSource(source: ExternalReferenceSource): string[] {
  const errors: string[] = [];
  const normalizedUrl = normalizeUrlForIdentity(source.url);
  const parsedRawUrl = (() => {
    try {
      return new URL(source.url);
    } catch {
      return null;
    }
  })();

  if (!EXTERNAL_REFERENCE_POLICY.idPattern.test(source.id)) {
    errors.push(`Invalid reference id: ${source.id}`);
  }

  if (!source.label.trim()) {
    errors.push(`Reference ${source.id} has an empty label`);
  }

  if (!normalizedUrl || !parsedRawUrl) {
    errors.push(`Reference ${source.id} has an invalid URL`);
  } else {
    if (!EXTERNAL_REFERENCE_POLICY.allowedUrlProtocols.includes(parsedRawUrl.protocol as "https:")) {
      errors.push(`Reference ${source.id} must use HTTPS`);
    }
  }

  if (source.access === "embed-allowed" && source.verification === "manual") {
    errors.push(`Reference ${source.id} cannot be embedded with manual-only verification`);
  }

  if (source.provider === "youtube" && source.verification !== "oembed") {
    errors.push(`YouTube reference ${source.id} must be verified with oEmbed metadata`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(source.verifiedAt)) {
    errors.push(`Reference ${source.id} must use YYYY-MM-DD verifiedAt`);
  }

  return errors;
}

export function dedupeExternalReferenceSources(
  sources: readonly ExternalReferenceSource[],
): ExternalReferenceSource[] {
  const seen = new Set<string>();
  const uniqueSources: ExternalReferenceSource[] = [];

  for (const source of sources) {
    const identity = getExternalReferenceIdentity(source);
    if (seen.has(identity)) continue;
    seen.add(identity);
    uniqueSources.push(source);
  }

  return uniqueSources;
}

export function validateExternalReferenceManifest(
  manifest: Readonly<Record<string, readonly ExternalReferenceSource[]>>,
): string[] {
  return Object.entries(manifest).flatMap(([catalogId, sources]) => {
    const seenIds = new Set<string>();
    const sourceErrors = sources.flatMap((source) => {
      const errors = validateExternalReferenceSource(source).map((error) => `${catalogId}: ${error}`);
      if (seenIds.has(source.id)) {
        errors.push(`${catalogId}: Duplicate reference id ${source.id}`);
      }
      seenIds.add(source.id);
      return errors;
    });

    const uniqueCount = dedupeExternalReferenceSources(sources).length;
    if (uniqueCount !== sources.length) {
      sourceErrors.push(`${catalogId}: Duplicate reference URL identity`);
    }

    return sourceErrors;
  });
}

export function getExternalReferenceCoverage(
  manifest: Readonly<Record<string, readonly ExternalReferenceSource[]>>,
  totalCatalogEntries: number,
): ExternalReferenceCoverage {
  const catalogEntriesWithReferences = Object.values(manifest).filter((sources) => sources.length > 0).length;

  return {
    totalCatalogEntries,
    catalogEntriesWithReferences,
    missingCatalogEntryCount: Math.max(0, totalCatalogEntries - catalogEntriesWithReferences),
    referenceCount: Object.values(manifest).reduce((total, sources) => total + sources.length, 0),
  };
}
