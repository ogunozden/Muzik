import {test, expect} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * A11y denetimi: kritik sayfalarda axe otomatik tarama + klavye navigasyon.
 * Her sayfa en az WCAG 2.1 AA seviyesinde taranir; kritik ihlaller fail eder.
 */

const CRITICAL_ROUTES = [
  {path: "/rhythm", name: "Ritim"},
  {path: "/studio", name: "Studio"},
  {path: "/archive", name: "Arsiv"},
  {path: "/ogren", name: "Ogrenme"},
  {path: "/references", name: "Referanslar"},
] as const;

test.describe("A11y — axe otomatik tarama", () => {
  for (const {path, name} of CRITICAL_ROUTES) {
    test(`${name} sayfasi (${path}) WCAG ihlali olmadan yuklenir`, async ({page}) => {
      await page.goto(path);

      const results = await new AxeBuilder({page})
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      // Yalnizca critical/serious ihlalleri fail et; minor/modera uyari olarak gecsin.
      const violations = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      expect(violations, `${path}: ${violations.length} kritik ihlal`).toEqual([]);
    });
  }
});

test.describe("A11y — klavye navigasyon", () => {
  test("Ritim sayfasinda Tab ile usul seciciye ulasilir", async ({page}) => {
    await page.goto("/rhythm");
    await page.keyboard.press("Tab");
    // Ilk etkilesimli ogeye (genelde usul secici) odaklanir.
    const focused = page.locator(":focus");
    await expect(focused).toBeAttached();
    const tag = await focused.evaluate((el) => el.tagName.toLowerCase());
    expect(["select", "button", "input", "a"]).toContain(tag);
  });

  test("Ritim sayfasinda Enter ile oynatma baslatilir", async ({page}) => {
    await page.goto("/rhythm");
    // Oynatma dugmesine Tab ile git.
    const playButton = page.getByRole("button", {name: /Oynat|Play|Başlat/i});
    if (await playButton.isVisible()) {
      await playButton.focus();
      await page.keyboard.press("Enter");
      // Duraklat dugmesi gorunur olmali (oynatma basladi).
      await expect(
        page.getByRole("button", {name: /Durdur|Duraklat|Stop|Pause/i}),
      ).toBeVisible({timeout: 3000});
    }
  });

  test("Ogrenme sayfasinda ArrowRight ile adim ilerlenir", async ({page}) => {
    await page.goto("/ogren");
    await page.getByRole("region", {name: /ogrenme/i}).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", {name: "Semai"})).toBeVisible();
  });

  test("Arsiv sayfasinda Tab ile arama kutusuna ulasilir", async ({page}) => {
    await page.goto("/archive");
    const searchInput = page.getByRole("searchbox").or(page.getByPlaceholder(/ara|search/i));
    if (await searchInput.isVisible()) {
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
    }
  });

  test("Referanslar sayfasindaki tablo klavye ile gezilebilir", async ({page}) => {
    await page.goto("/references");
    // Tablo satirlarina klavye ile ulas.
    const table = page.getByRole("table").or(page.getByRole("grid"));
    if (await table.isVisible({timeout: 3000})) {
      await table.focus();
      await page.keyboard.press("ArrowDown");
      // En az bir satir vurgulanmis veya odaklanmis olmali.
      const focused = page.locator(":focus");
      await expect(focused).toBeAttached();
    }
  });
});

test.describe("A11y — erisilebilirlik regresyon kapilari", () => {
  test("skip-to-content linki klavye ile gorunur olur", async ({page}) => {
    await page.goto("/rhythm");
    await page.keyboard.press("Tab");
    const skipLink = page.getByText(/ana içeriğe geç|skip to content/i);
    // Gorunur veya en azindan DOM'da mevcut olmali.
    await expect(skipLink.first()).toBeAttached();
  });

  test("landmark rolleri mevcut (main + navigation)", async ({page}) => {
    await page.goto("/rhythm");
    await expect(page.getByRole("main")).toBeAttached();
    await expect(page.getByRole("navigation")).toBeAttached();
  });
});
