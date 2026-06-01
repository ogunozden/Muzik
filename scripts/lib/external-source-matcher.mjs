export function normalizeText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function slugify(value) {
  return normalizeText(value).replace(/\s+/g, "-").replace(/^-+|-+$/g, "");
}

function tokens(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function tokenCoverage(needle, haystack) {
  const needleTokens = tokens(needle);
  if (needleTokens.length === 0) return 0;
  const haystackText = normalizeText(haystack);
  const matched = needleTokens.filter((token) => haystackText.includes(token)).length;
  return matched / needleTokens.length;
}

function canonicalEntryText(entry) {
  return normalizeText(`${entry.makam} ${entry.form} ${entry.usul} ${entry.title} ${entry.composer} ${entry.lyricist ?? ""} ${entry.id}`);
}

function metadataText(source) {
  const metadata = source.metadata ?? {};
  return [
    metadata.htmlTitle,
    metadata.htmlDescription,
    metadata.htmlAuthor,
    metadata.oembedTitle,
    metadata.oembedAuthor,
    metadata.oembedProvider,
  ].join(" ");
}

function metadataSignals(source) {
  return Array.isArray(source.metadata?.signals) ? source.metadata.signals.filter(Boolean) : [];
}

function compareCatalogField(sourceValue, catalogValue) {
  const normalizedSource = normalizeText(sourceValue);
  const normalizedCatalog = normalizeText(catalogValue);
  if (!normalizedSource || !normalizedCatalog) return "missing";
  if (normalizedSource === normalizedCatalog) return "exact";
  if (normalizedSource.includes(normalizedCatalog) || normalizedCatalog.includes(normalizedSource)) return "contains";
  return "mismatch";
}

export function scoreCatalogEntry(source, entry) {
  const observed = source.observed ?? {};
  const sourceTitle = source.title ?? observed.title ?? "";
  const sourceText = normalizeText(
    [
      sourceTitle,
      source.url,
      observed.title,
      observed.makam,
      observed.form,
      observed.usul,
      observed.composer,
      observed.lyricist,
      observed.lyrics,
      source.sourceProvider,
      metadataText(source),
    ].join(" "),
  );
  const entryText = canonicalEntryText(entry);
  const explicitCatalogId = source.catalogId === entry.id;
  const mismatches = [];
  const reasons = [];
  let score = explicitCatalogId ? 120 : 0;

  for (const [field, weight] of [
    ["makam", 35],
    ["form", 25],
    ["usul", 35],
  ]) {
    if (!observed[field]) continue;
    const comparison = compareCatalogField(observed[field], entry[field]);
    if (comparison === "exact") {
      score += weight;
      reasons.push(`${field}:exact`);
    } else if (comparison === "contains") {
      score += Math.round(weight * 0.7);
      reasons.push(`${field}:contains`);
    } else if (comparison === "mismatch") {
      score -= Math.round(weight * 0.8);
      mismatches.push(`${field}:${observed[field]} != ${entry[field]}`);
    }
  }

  const titleCoverage = Math.max(tokenCoverage(entry.title, sourceText), tokenCoverage(observed.title, entryText));
  const composerCoverage = Math.max(tokenCoverage(entry.composer, sourceText), tokenCoverage(observed.composer, entryText));
  const lyricistCoverage = Math.max(tokenCoverage(entry.lyricist, sourceText), tokenCoverage(observed.lyricist, entryText));
  const lyricsCoverage = tokenCoverage(entry.title, observed.lyrics);
  const metadataTitleCoverage = Math.max(
    tokenCoverage(entry.title, source.metadata?.htmlTitle),
    tokenCoverage(entry.title, source.metadata?.oembedTitle),
  );
  const metadataAuthorCoverage = Math.max(
    tokenCoverage(entry.composer, source.metadata?.htmlAuthor),
    tokenCoverage(entry.composer, source.metadata?.oembedAuthor),
  );
  score += Math.round(titleCoverage * 60);
  score += Math.round(composerCoverage * 45);
  score += Math.round(lyricistCoverage * 25);
  score += Math.round(lyricsCoverage * 15);
  score += Math.round(metadataTitleCoverage * 20);
  score += Math.round(metadataAuthorCoverage * 12);

  if (titleCoverage >= 0.7) reasons.push("title:token-match");
  if (composerCoverage >= 0.6) reasons.push("composer:token-match");
  if (lyricistCoverage >= 0.6) reasons.push("lyricist:token-match");
  if (lyricsCoverage >= 0.5) reasons.push("lyrics:title-token-match");
  if (metadataTitleCoverage >= 0.7) reasons.push("metadata-title:token-match");
  if (metadataAuthorCoverage >= 0.6) reasons.push("metadata-author:token-match");
  for (const signal of metadataSignals(source)) {
    reasons.push(`metadata-signal:${signal}`);
  }

  return {
    entry,
    score,
    mismatches,
    reasons,
  };
}

export function inferProvider(source) {
  if (source.provider && source.provider !== "auto") return source.provider;

  try {
    const hostname = new URL(source.url).hostname;
    if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) return "youtube";
    if (hostname.endsWith("github.com")) return "github";
  } catch {
    return "score";
  }

  return "score";
}

export function inferSourceProvider(source) {
  if (source.sourceProvider) return source.sourceProvider;

  try {
    return new URL(source.url).hostname.replace(/^www\./, "");
  } catch {
    return "external";
  }
}

export function buildReferenceId(source, provider) {
  if (source.referenceId) return slugify(source.referenceId);

  const providerSlug = slugify(inferSourceProvider(source)).split("-").slice(0, 3).join("-");
  const titleSlug = slugify(source.title ?? source.observed?.title ?? source.url).split("-").slice(0, 8).join("-");
  const suffix = provider === "youtube" ? "recording" : provider === "score" ? "score" : provider;

  return [providerSlug, titleSlug, suffix].filter(Boolean).join("-");
}

export function buildSource(source, provider, status) {
  const labelByProvider = {
    archive: "Arşiv kaynağı",
    github: "Kod/veri kaynağı",
    score: "Nota kaynağı",
    symbtr: "SymbTr",
    youtube: "Referans kayıt",
  };
  const verification = provider === "youtube" ? (source.oembedVerified ? "oembed" : "manual") : (source.verification ?? "manual");

  return {
    id: buildReferenceId(source, provider),
    label: source.label ?? labelByProvider[provider] ?? "Harici kaynak",
    provider,
    url: source.url,
    title: source.title ?? source.observed?.title,
    author: source.author,
    thumbnailUrl: source.thumbnailUrl,
    metadata: source.metadata,
    access: source.access ?? "external-link",
    verification,
    verifiedAt: source.checkedAt,
    notes:
      source.notes ??
      `${status === "accepted" ? "Bulk source mapping accepted" : "Bulk source mapping requires review"} against the SymbTr catalog entry.`,
  };
}

export function classifyMapping(best, secondBest, source) {
  const gap = best.score - (secondBest?.score ?? 0);
  const hasBlockingMismatch = best.mismatches.length > 0;
  const provider = inferProvider(source);

  if (provider === "youtube" && !source.oembedVerified) {
    return {
      status: "needs-review",
      reason: "YouTube source needs oEmbed metadata before it can be accepted.",
    };
  }

  if (hasBlockingMismatch) {
    return {
      status: "needs-review",
      reason: `Catalog metadata mismatch: ${best.mismatches.join("; ")}`,
    };
  }

  if (source.catalogId && best.entry.id === source.catalogId && best.score >= 170) {
    return {
      status: "accepted",
      reason: "Explicit catalog id and metadata agree.",
    };
  }

  if (best.score >= 125 && gap >= 20) {
    return {
      status: "accepted",
      reason: "High-confidence automatic catalog match.",
    };
  }

  if (best.score >= 70) {
    return {
      status: "needs-review",
      reason: "Partial catalog match needs human review.",
    };
  }

  return {
    status: "rejected",
    reason: "No reliable catalog match found.",
  };
}

export function mapInboxSource(source, catalogEntries) {
  const ranked = catalogEntries
    .map((entry) => scoreCatalogEntry(source, entry))
    .sort((left, right) => right.score - left.score || left.entry.id.localeCompare(right.entry.id, "en"));
  const best = ranked[0];
  const secondBest = ranked[1];
  const classification = classifyMapping(best, secondBest, source);
  const provider = inferProvider(source);
  const referenceSource = buildSource(source, provider, classification.status);

  return {
    inboxId: source.id ?? referenceSource.id,
    catalogId: best.entry.id,
    status: classification.status,
    checkedAt: source.checkedAt,
    confidenceScore: best.score,
    confidenceGap: best.score - (secondBest?.score ?? 0),
    reason: classification.reason,
    evidence: {
      title: source.observed?.title ?? source.title ?? "",
      makam: source.observed?.makam ?? "",
      form: source.observed?.form ?? "",
      usul: source.observed?.usul ?? "",
      composer: source.observed?.composer ?? "",
      lyricist: source.observed?.lyricist ?? "",
      lyrics: source.observed?.lyrics ?? "",
      sourceProvider: inferSourceProvider(source),
      metadataSignals: metadataSignals(source),
    },
    alternatives: ranked.slice(0, 5).map((candidate) => ({
      catalogId: candidate.entry.id,
      score: candidate.score,
      mismatches: candidate.mismatches,
      reasons: candidate.reasons,
    })),
    candidate: {
      catalogId: best.entry.id,
      status: classification.status,
      checkedAt: source.checkedAt,
      evidence: {
        title: source.observed?.title ?? source.title ?? "",
        makam: source.observed?.makam ?? "",
        form: source.observed?.form ?? "",
        usul: source.observed?.usul ?? "",
        composer: source.observed?.composer ?? "",
        lyricist: source.observed?.lyricist ?? "",
        lyrics: source.observed?.lyrics ?? "",
        sourceProvider: inferSourceProvider(source),
        metadataSignals: metadataSignals(source),
      },
      source: referenceSource,
    },
  };
}
