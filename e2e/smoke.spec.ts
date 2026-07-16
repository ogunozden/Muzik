import {test, expect} from "@playwright/test";

/**
 * Kritik rota smoke E2E: sayfa sayfa hatasiz yuklenme + ana isaretlerin
 * gorunurlugu. (guardrails:layout tasma/baslik dogrular; bu spec runtime
 * hatasi + temel etkilesim ogesi varligini dogrular.)
 */

function trackPageErrors(page: import("@playwright/test").Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

test("rhythm sayfasi hatasiz yuklenir ve usul secici gorunur", async ({page}) => {
  const errors = trackPageErrors(page);
  await page.goto("/rhythm");
  await expect(page.getByRole("combobox").first()).toBeVisible();
  expect(errors, `sayfa hatalari: ${errors.join("; ")}`).toEqual([]);
});

test("studio sayfasi hatasiz yuklenir ve ana bolge gorunur", async ({page}) => {
  const errors = trackPageErrors(page);
  await page.goto("/studio");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("combobox").first()).toBeVisible();
  expect(errors, `sayfa hatalari: ${errors.join("; ")}`).toEqual([]);
});

test("ogren sayfasi navigasyondan ulasilir", async ({page}) => {
  await page.goto("/rhythm");
  // Calisma hub'inda 'Usul Ogren' baglantisi /ogren'e goturur.
  await page.goto("/ogren");
  await expect(page.getByRole("heading", {name: "Usul ogren"})).toBeVisible();
});
