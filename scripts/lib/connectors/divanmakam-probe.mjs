import { chromium } from "playwright";

export const CONNECTOR_ID = "divanmakam";
export const CONNECTOR_TYPE = "known-site-search-url";

export function tokenCoverage(field, haystack) {
  if (!field || !haystack) return 0;
  const tokens = field.toLowerCase().split(/\s+/).filter(Boolean);
  const text = haystack.toLowerCase();
  const found = tokens.filter(t => text.includes(t));
  return tokens.length > 0 ? found.length / tokens.length : 0;
}

export function scoreKnownSitePage(group, probe) {
  const text = probe.text;
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

export async function probePage(url, timeoutMs) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(500);
    const htmlTitle = await page.title();
    const ogTitle = await page.$eval('meta[property="og:title"]', el => el.content).catch(() => '');
    const ogDescription = await page.$eval('meta[property="og:description"]', el => el.content).catch(() => '');
    return { url, htmlTitle, ogTitle, ogDescription, text: [htmlTitle, ogTitle, ogDescription].filter(Boolean).join(' ') };
  } catch {
    return { url, htmlTitle: '', ogTitle: '', ogDescription: '', text: '', error: true };
  } finally {
    await browser.close();
  }
}

export async function searchDivanMakam(query, timeoutMs) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(500);
    const html = await page.content();
    const links = [];
    const regex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"/gi;
    let m;
    while ((m = regex.exec(html)) !== null) {
      if (m[1].includes('divanmakam.com')) links.push(m[1]);
    }
    if (links.length === 0) {
      const altRegex = /<a[^>]*href="(https?:\/\/[^"]+)"/gi;
      while ((m = altRegex.exec(html)) !== null) {
        if (m[1].includes('divanmakam.com')) links.push(m[1]);
      }
    }
    return [...new Set(links)];
  } catch {
    return [];
  } finally {
    await browser.close();
  }
}

export async function verifyDivanMakamGroup({group, provider, checkedAt, timeoutMs=8000, maxResponseBytes=262144, rows=3, cache, rateLimitState, respectRateLimit, acceptedThreshold=80}) {
  const query = `site:divanmakam.com "${group.title}" "${group.composer}"`;
  const cacheKey = `${group.catalogId}:${provider.id}:${query}`;
  const cached = cache?.entries?.[cacheKey];
  if (cached) return {...cached, cacheHit: true};

  const links = await searchDivanMakam(query, timeoutMs);

  const scored = [];
  for (const url of links.slice(0, rows)) {
    const probe = await probePage(url, timeoutMs);
    const confidence = scoreKnownSitePage(group, probe);
    scored.push({
      url,
      title: probe.ogTitle || probe.htmlTitle,
      bodyText: '',
      confidence,
    });
  }
  scored.sort((a, b) => b.confidence.score - a.confidence.score);

  const best = scored[0] ?? null;
  const acceptedReady = Boolean(best?.confidence.completeEvidence && best.confidence.score >= (acceptedThreshold ?? 80));

  const result = {
    cacheKey,
    cacheHit: false,
    catalogId: group.catalogId,
    providerProfileId: provider.id,
    connector: provider.connector,
    status: acceptedReady ? "accepted-ready" : scored.length > 0 ? "needs-review" : "rejected",
    statusReason: acceptedReady ? "known-site-metadata-complete" : scored.length > 0 ? "known-site-metadata-incomplete" : "no-search-result",
    checkedAt,
    searchQuery: query,
    searchUrl: `site:divanmakam.com ${group.title} ${group.composer}`,
    resultCount: scored.length,
    networkRequest: true,
    best: best ?? null,
    candidates: scored.slice(0, rows),
    catalog: { makam: group.makam, form: group.form, usul: group.usul, title: group.title, composer: group.composer },
    safety: { directAutoAttach: false, mediaDownload: false, sourceContentCopied: false },
  };

  if (cache) {
    cache.entries = {...(cache.entries ?? {}), [cacheKey]: result};
  }

  return result;
}
