import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-blink-features=AutomationControlled",
    "--disable-dev-shm-usage",
  ],
});
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  viewport: { width: 1366, height: 768 },
});

async function search(query) {
  const page = await context.newPage();
  try {
    const url = "https://search.brave.com/search?q=" + encodeURIComponent(query);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    const links = await page.evaluate(() => {
      const seen = new Set();
      return Array.from(document.querySelectorAll(".result-content a[href^='http']"))
        .map(a => a.getAttribute("href"))
        .filter(href => {
          if (!href || href.includes("brave.com") || href.includes("hackerone")) return false;
          if (seen.has(href)) return false;
          seen.add(href);
          return true;
        })
        .slice(0, 5);
    });
    console.log(`  "${query}" → ${links.length} links`);
    links.forEach(l => console.log("   ", l));
    return links;
  } catch (e) {
    console.error(`  Error: ${e.message}`);
    return [];
  } finally {
    await page.close();
  }
}

// Actual provider query format
console.log("=== Proper site: query ===");
await search('site:divanmakam.com "aldanma_dunya" "zekai_dede"');

console.log("\n=== Composer-only fallback ===");
await search('site:divanmakam.com zekai_dede');

console.log("\n=== Title-only fallback ===");
await search('site:divanmakam.com aldanma_dunya');

await context.close();
await browser.close();
process.exit(0);
