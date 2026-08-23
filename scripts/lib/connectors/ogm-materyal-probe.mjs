import { chromium } from "playwright";

export const CONNECTOR_ID = "ogm-materyal";
export const CONNECTOR_TYPE = "known-site-search-url";

async function searchDuckDuckGo(query) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1000);
    const html = await page.content();
    const links = [];
    const regex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"/gi;
    let m;
    while ((m = regex.exec(html)) !== null) {
      if (m[1].startsWith('http') && !m[1].includes('duckduckgo') && m[1].includes('ogmmateryal.eba.gov.tr')) links.push(m[1]);
    }
    if (links.length === 0) {
      const altRegex = /<a[^>]*href="(https?:\/\/[^"]+)"/gi;
      while ((m = altRegex.exec(html)) !== null) {
        if (!m[1].includes('duckduckgo') && m[1].length > 20 && m[1].includes('ogmmateryal.eba.gov.tr')) links.push(m[1]);
      }
    }
    return [...new Set(links)].slice(0, 5);
  } catch (err) {
    console.error(`[ogm-materyal-probe] searchDuckDuckGo error for "${query.slice(0, 60)}":`, err.message);
    return [];
  } finally {
    await browser.close();
  }
}

export async function probePage(url, timeoutMs) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await page.waitForTimeout(500);
    const htmlTitle = await page.title();
    const bodyText = await page.$eval('body', el => el.innerText || '').catch(() => '');
    return { url, htmlTitle, bodyText: bodyText.slice(0, 2000), text: [htmlTitle, bodyText.slice(0, 1000)].filter(Boolean).join(' ') };
  } catch {
    return { url, htmlTitle: '', bodyText: '', text: '', error: true };
  } finally {
    await browser.close();
  }
}

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

function buildDiscoveryIdentity(catalogId, providerId, query) {
  return `${catalogId}:${providerId}:${query}`;
}

function buildSearchUrl(query) {
  return `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
}

export async function verifyOgmMateryalGroup({group, provider, checkedAt, timeoutMs=8000, rows=3, cache, acceptedThreshold=80, respectRateLimit = true, rateLimitState = null}) {
  const title = group.title && group.title !== "1" ? group.title : "";
  const composer = group.composer || "";
  const query = `site:ogmmateryal.eba.gov.tr "${title}" "${composer}"`;
  const cacheKey = buildDiscoveryIdentity(group.catalogId, provider.id, query);
  const cached = cache.entries?.[cacheKey];
  if (cached) return {...cached, cacheHit: true};

  const searchUrl = buildSearchUrl(query);

  if (respectRateLimit && rateLimitState) {
    const perSecond = Number(provider.rateLimitPerSecond ?? 0.5);
    if (perSecond > 0) {
      const intervalMs = Math.ceil(1000 / perSecond);
      const lastRequestAt = rateLimitState.lastRequestAtByProvider?.get?.(provider.id) ?? 0;
      const waitMs = Math.max(0, intervalMs - (Date.now() - lastRequestAt));
      if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
      if (rateLimitState.lastRequestAtByProvider?.set) {
        rateLimitState.lastRequestAtByProvider.set(provider.id, Date.now());
      }
    }
  }

  const urls = await searchDuckDuckGo(query);
  const targetUrls = urls.slice(0, rows);

  const probed = [];
  for (const url of targetUrls) {
    const probe = await probePage(url, timeoutMs);
    const scored = scoreKnownSitePage(group, probe);
    probed.push({
      url: probe.url,
      htmlTitle: probe.htmlTitle,
      bodyText: probe.bodyText,
      text: probe.text,
      error: probe.error || false,
      confidence: scored,
      sourceUrl: probe.url,
    });
  }

  probed.sort((left, right) => right.confidence.score - left.confidence.score);
  const best = probed[0] ?? null;

  const acceptedReady = Boolean(best?.confidence.completeEvidence && best.confidence.score >= acceptedThreshold);

  const result = {
    cacheKey,
    cacheHit: false,
    catalogId: group.catalogId,
    providerProfileId: provider.id,
    connector: provider.connector,
    status: acceptedReady ? "accepted-ready" : probed.length > 0 ? "needs-review" : "rejected",
    statusReason: acceptedReady ? "provider-metadata-complete" : probed.length > 0 ? "provider-metadata-incomplete" : "no-provider-result",
    checkedAt,
    searchQuery: query,
    searchUrl,
    resultCount: probed.length,
    networkRequest: true,
    best,
    candidates: probed.slice(0, rows),
    catalog: {
      makam: group.makam,
      form: group.form,
      usul: group.usul,
      title: group.title,
      composer: group.composer,
      priorityGroup: group.priorityGroup,
    },
    safety: {
      directAutoAttach: false,
      mediaDownload: false,
      sourceContentCopied: false,
    },
  };
  cache.entries = {...(cache.entries ?? {}), [cacheKey]: result};
  return result;
}
