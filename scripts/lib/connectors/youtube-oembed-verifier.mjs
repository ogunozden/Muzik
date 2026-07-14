import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const CONNECTOR_ID = "youtube-oembed";
export const CONNECTOR_TYPE = "youtube-oembed-verifier";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const INBOX_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "external-source-inbox.json");

export function tokenCoverage(field, haystack) {
  if (!field || !haystack) return 0;
  const tokens = field.toLowerCase().split(/\s+/).filter(Boolean);
  const text = haystack.toLowerCase();
  const found = tokens.filter(t => text.includes(t));
  return tokens.length > 0 ? found.length / tokens.length : 0;
}

export function scoreOembedTitle(group, oembedData) {
  const text = [oembedData?.title, oembedData?.author_name, oembedData?.provider_name].filter(Boolean).join(' ');
  const titleCoverage = tokenCoverage(group.title, text);
  const composerCoverage = tokenCoverage(group.composer, text);
  const makamCoverage = tokenCoverage(group.makam, text);
  const usulCoverage = tokenCoverage(group.usul, text);
  const formCoverage = tokenCoverage(group.form, text);
  const metadataScore = Math.min(100, Math.round(
    titleCoverage * 50 + composerCoverage * 25 + makamCoverage * 10 + usulCoverage * 10 + formCoverage * 5
  ));
  return {
    score: metadataScore,
    titleCoverage, composerCoverage, makamCoverage, usulCoverage, formCoverage,
    completeEvidence: titleCoverage >= 0.9 && composerCoverage >= 0.75,
  };
}

export async function fetchOembed(youtubeUrl, timeoutMs = 8000) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'MuzikExternalSourceVerifier/1.0' },
    });
    clearTimeout(timeout);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export function findYouTubeUrl(group, candidateUrl = null) {
  if (candidateUrl && (
    candidateUrl.includes('youtube.com') ||
    candidateUrl.includes('youtu.be')
  )) {
    return candidateUrl;
  }
  try {
    if (existsSync(INBOX_FILE)) {
      const inbox = JSON.parse(readFileSync(INBOX_FILE, 'utf8'));
      const sources = inbox.sources || inbox;
      const match = sources.find(s =>
        (s.provider === 'youtube' || s.sourceProvider === 'YouTube') &&
        s.catalogId === group.catalogId
      );
      if (match) return match.sourceUrl || match.url;
    }
  } catch {}
  return null;
}

export async function verifyYouTubeOEmbedGroup({group, provider, checkedAt, timeoutMs=8000, candidateUrl=null, cache, acceptedThreshold=80}) {
  const youtubeUrl = findYouTubeUrl(group, candidateUrl);
  const cacheKey = `${group.catalogId}:youtube-oembed:${youtubeUrl || 'no-url'}`;
  const cached = cache?.entries?.[cacheKey];
  if (cached) return {...cached, cacheHit: true};

  if (!youtubeUrl) {
    const result = {
      cacheKey,
      cacheHit: false,
      catalogId: group.catalogId,
      providerProfileId: provider.id,
      connector: provider.connector,
      status: "deferred",
      statusReason: "no-youtube-url-available",
      checkedAt,
      searchQuery: '',
      searchUrl: null,
      resultCount: 0,
      networkRequest: false,
      best: null,
      candidates: [],
      catalog: { makam: group.makam, form: group.form, usul: group.usul, title: group.title, composer: group.composer },
      safety: { directAutoAttach: false, mediaDownload: false, sourceContentCopied: false },
    };
    if (cache) {
      cache.entries = {...(cache.entries ?? {}), [cacheKey]: result};
    }
    return result;
  }

  const oembedData = await fetchOembed(youtubeUrl, timeoutMs);

  if (!oembedData) {
    const result = {
      cacheKey,
      cacheHit: false,
      catalogId: group.catalogId,
      providerProfileId: provider.id,
      connector: provider.connector,
      status: "rejected",
      statusReason: "oembed-fetch-failed",
      checkedAt,
      searchQuery: youtubeUrl,
      searchUrl: youtubeUrl,
      resultCount: 0,
      networkRequest: true,
      best: null,
      candidates: [],
      catalog: { makam: group.makam, form: group.form, usul: group.usul, title: group.title, composer: group.composer },
      safety: { directAutoAttach: false, mediaDownload: false, sourceContentCopied: false },
    };
    if (cache) {
      cache.entries = {...(cache.entries ?? {}), [cacheKey]: result};
    }
    return result;
  }

  const confidence = scoreOembedTitle(group, oembedData);
  const acceptedReady = Boolean(confidence.completeEvidence && confidence.score >= (acceptedThreshold ?? 80));

  const best = {
    url: youtubeUrl,
    title: oembedData.title,
    author_name: oembedData.author_name,
    confidence,
  };

  const result = {
    cacheKey,
    cacheHit: false,
    catalogId: group.catalogId,
    providerProfileId: provider.id,
    connector: provider.connector,
    status: acceptedReady ? "accepted-ready" : "needs-review",
    statusReason: acceptedReady ? "oembed-title-match" : "oembed-title-partial-match",
    checkedAt,
    searchQuery: youtubeUrl,
    searchUrl: youtubeUrl,
    resultCount: 1,
    networkRequest: true,
    best,
    candidates: [best],
    catalog: { makam: group.makam, form: group.form, usul: group.usul, title: group.title, composer: group.composer },
    safety: { directAutoAttach: false, mediaDownload: false, sourceContentCopied: false },
  };

  if (cache) {
    cache.entries = {...(cache.entries ?? {}), [cacheKey]: result};
  }

  return result;
}
