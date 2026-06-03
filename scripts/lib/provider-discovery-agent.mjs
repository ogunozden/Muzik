import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { execSync } from "node:child_process";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CATALOG_FILE = path.join(PROJECT_ROOT, "src", "data", "symbtr", "catalog.generated.json");
const INBOX_FILE = path.join(PROJECT_ROOT, "src", "data", "references", "external-source-inbox.json");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output", "external-source-discovery");
const RESULTS_FILE = path.join(OUTPUT_DIR, "provider-discovery-results.json");

const DISCOVERY_PROFILES = [
  { id: "divanmakam", queryPrefix: "site:divanmakam.com", enabled: true },
  { id: "ogm-materyal", queryPrefix: "site:ogmmateryal.eba.gov.tr", enabled: true },
  { id: "salihbora", queryPrefix: "site:salihbora.com", enabled: true },
];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensurePlaywrightBrowser() {
  try {
    const result = execSync("npx playwright install chromium", {
      stdio: "pipe",
      timeout: 120000,
      encoding: "utf8",
    });
    if (result.includes("already installed")) return;
    console.log("[discovery-agent] Chromium installed via Playwright");
  } catch {
    console.warn("[discovery-agent] Could not auto-install Chromium (may already be present)");
  }
}

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
      if (m[1].startsWith('http') && !m[1].includes('duckduckgo')) links.push(m[1]);
    }
    if (links.length === 0) {
      const altRegex = /<a[^>]*href="(https?:\/\/[^"]+)"/gi;
      while ((m = altRegex.exec(html)) !== null) {
        if (!m[1].includes('duckduckgo') && m[1].length > 20) links.push(m[1]);
      }
    }
    return [...new Set(links)].slice(0, 5);
  } catch (err) {
    console.error(`[discovery-agent] searchDuckDuckGo error for "${query.slice(0, 60)}":`, err.message);
    return [];
  } finally {
    await browser.close();
  }
}

async function searchGoogle(query) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1000);
    const html = await page.content();
    const links = [];
    const regex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>/gi;
    let m;
    while ((m = regex.exec(html)) !== null) {
      const url = m[1];
      if (!url.includes('google.com') && !url.includes('google.') && !url.includes('accounts.google') && url.length > 20) {
        links.push(url);
      }
    }
    return [...new Set(links)].slice(0, 5);
  } catch (err) {
    console.error(`[discovery-agent] searchGoogle error for "${query.slice(0, 60)}":`, err.message);
    return [];
  } finally {
    await browser.close();
  }
}

async function searchWithFallback(query) {
  const urls = await searchDuckDuckGo(query);
  if (urls.length > 0) return urls;
  console.log(`[discovery-agent] DuckDuckGo yielded 0 results for "${query.slice(0, 60)}", falling back to Google`);
  return searchGoogle(query);
}

export function getCatalogEntries(catalog) {
  return Array.isArray(catalog) ? catalog : (catalog.entries ?? []);
}

export function buildSearchQuery(entry, profile) {
  const parts = [profile.queryPrefix];
  if (entry.title && entry.title !== "1") parts.push(`"${entry.title}"`);
  if (entry.composer) parts.push(`"${entry.composer}"`);
  return parts.join(" ");
}

export function isAlreadyInInbox(inbox, catalogId, url) {
  return inbox.some(e => e.catalogId === catalogId && e.sourceUrl === url);
}

export async function main() {
  ensurePlaywrightBrowser();

  const rawCatalog = JSON.parse(readFileSync(CATALOG_FILE, "utf8"));
  const catalog = getCatalogEntries(rawCatalog);
  const inbox = existsSync(INBOX_FILE) ? JSON.parse(readFileSync(INBOX_FILE, "utf8")) : [];

  const limit = 5;
  const entries = catalog.slice(0, limit);
  const results = [];

  for (const entry of entries) {
    for (const profile of DISCOVERY_PROFILES) {
      if (!profile.enabled) continue;
      const query = buildSearchQuery(entry, profile);
      if (!query.includes('"') && entry.title === "1") continue;

      const urls = await searchWithFallback(query);
      for (const url of urls) {
        if (isAlreadyInInbox(inbox, entry.id, url)) continue;
        inbox.push({
          id: `${entry.id}:${profile.id}:${Date.now()}`,
          catalogId: entry.id,
          sourceUrl: url,
          sourceTitle: "",
          provider: profile.id,
          status: "pending",
          submittedAt: new Date().toISOString(),
          notes: `auto-discovered via ${profile.id}`,
        });
        results.push({ catalogId: entry.id, provider: profile.id, url, query });
      }
      await delay(2000);
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  writeFileSync(INBOX_FILE, JSON.stringify(inbox, null, 2));
  console.log(`[discovery-agent] Processed ${limit} entries, found ${results.length} URLs, inbox now ${inbox.length} entries`);
}

const modulePath = path.resolve(fileURLToPath(import.meta.url));
const entryPoint = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPoint === modulePath) {
  main().catch(console.error);
}
