import {defineConfig, devices} from "@playwright/test";

/**
 * E2E yapilandirmasi (E5). Kritik kullanici akislarini gercek tarayicida
 * dogrular. Birim/bilesen testleri vitest'te (src icindeki .test.ts dosyalari);
 * E2E burada (e2e klasorundeki .spec.ts). Vitest include deseni .spec.ts'i
 * toplamaz, cakisma yok.
 *
 * Sunucu: PLAYWRIGHT_BASE_URL verilirse ona baglanir (or. calisan dev sunucusu);
 * yoksa sabit portta (3100) taze `next dev` baslatir. CI'da yeni sunucu, yerelde
 * mevcut yeniden kullanilir.
 */

const PORT = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{name: "chromium", use: {...devices["Desktop Chrome"]}}],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: `npx next dev --turbopack -p ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
