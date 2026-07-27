#!/usr/bin/env node
/**
 * E2E'yi URETIM DERLEMESINE karsi kosar (PLAN.md §5/C1.1).
 *
 * Neden gerekli: `next dev` sayfaya kendi gelistirici katmanini enjekte
 * ediyor (`<nextjs-portal>` + "Open Next.js Dev Tools" dugmesi) ve bu dugme
 * SEKME SIRASINDA uygulamadan ONCE geliyor. Klavye erisilebilirlik testleri
 * bu katmani atlamak zorunda kaliyor; yani gelistirme sunucusunda olculen
 * sey kullanicinin gordugu sey DEGIL.
 *
 * Uretim derlemesinde o katman yok — asil dogrulama budur.
 *
 * `cross-env` ya da kabuk-bagimli `&` arka plana atma kullanilmiyor:
 * Windows/POSIX ayrimi olmasin diye surecler Node'dan yonetiliyor.
 */
import {spawn, spawnSync} from "node:child_process";
import process from "node:process";

const PORT = Number(process.env.E2E_PROD_PORT ?? 3200);
const BASE_URL = `http://localhost:${PORT}`;
const READY_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 500;

const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function run(command, args, env = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {...process.env, ...env},
  });
  return result.status ?? 1;
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {method: "GET"});
      if (response.ok) return true;
    } catch {
      // Sunucu henuz ayakta degil; beklemeye devam.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
}

console.log("[e2e:prod] uretim derlemesi olusturuluyor…");
const buildStatus = run(npx, ["next", "build"]);
if (buildStatus !== 0) {
  console.error("[e2e:prod] `next build` basarisiz — e2e kosulmadi.");
  process.exit(buildStatus);
}

console.log(`[e2e:prod] uretim sunucusu baslatiliyor (port ${PORT})…`);
const server = spawn(npx, ["next", "start", "-p", String(PORT)], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
});

let exitCode = 1;
try {
  const ready = await waitForServer(BASE_URL, READY_TIMEOUT_MS);
  if (!ready) {
    console.error(`[e2e:prod] sunucu ${READY_TIMEOUT_MS} ms icinde yanit vermedi.`);
  } else {
    console.log("[e2e:prod] sunucu hazir; Playwright kosuyor…");
    // `PLAYWRIGHT_BASE_URL` verildiginde config kendi `webServer`ini
    // baslatmaz; bizim ayaga kaldirdigimiz URETIM sunucusuna baglanir.
    exitCode = run(npx, ["playwright", "test", ...process.argv.slice(2)], {PLAYWRIGHT_BASE_URL: BASE_URL});
  }
} finally {
  server.kill();
}

process.exit(exitCode);
