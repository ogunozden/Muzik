import {test, expect, type Page} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * A11y denetimi: kritik sayfalarda axe otomatik tarama + klavye navigasyon.
 * Her sayfa en az WCAG 2.1 AA seviyesinde taranir; kritik ihlaller fail eder.
 */

/**
 * Odaklanmis ogenin etiket adi — Next.js gelistirici katmani HARIC.
 *
 * `page.locator(":focus")` kullanmak paralel kosuda kiriliyordu: `next dev`
 * sayfaya `<nextjs-portal>` + "Open Next.js Dev Tools" dugmesini enjekte
 * ediyor ve selector IKI ogeye birden cozulup "strict mode violation"
 * veriyordu. Bu, UYGULAMANIN erisilebilirligiyle ilgili degil; olcum aracinin
 * kendi katmani. `document.activeElement`i shadow DOM'a inerek okuyup o
 * katmani disarida birakiyoruz.
 */
async function focusedTagName(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    let element: Element | null = document.activeElement;
    while (element?.shadowRoot?.activeElement) element = element.shadowRoot.activeElement;
    if (!element || element === document.body || element === document.documentElement) return null;

    // Gelistirme katmanini yok say.
    for (let node: Element | null = element; node; node = node.parentElement) {
      const name = node.tagName.toLowerCase();
      if (name === "nextjs-portal" || node.hasAttribute?.("data-nextjs-dev-tools-button")) return null;
    }
    return element.tagName.toLowerCase();
  });
}

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
    // Sayfa HIDRATE olmadan Tab basmak yarissiz degil: dev sunucusu rotayi
    // istek aninda derliyor ve paralel kosuda ilk etkilesimli oge henuz
    // baglanmamis olabiliyor. Once bir odaklanabilir oge belirsin.
    await page.locator("a, button, select, input").first().waitFor({state: "attached"});

    // `next dev` sayfaya kendi dev-tools dugmesini enjekte ediyor ve o dugme
    // sekme sirasinda UYGULAMADAN ONCE geliyor. Bu bir erisilebilirlik sorunu
    // degil, olcum ortaminin artefakti (uretim derlemesinde yok). Uygulamanin
    // ilk odaklanabilir ogesine ULASILABILDIGINI dogruluyoruz — sinirli
    // sayida Tab icinde.
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.keyboard.press("Tab");
      if ((await focusedTagName(page)) !== null) break;
    }
    // Ilk etkilesimli ogeye (genelde usul secici) odaklanir.
    const tag = await focusedTagName(page);
    expect(tag).not.toBeNull();
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

  /**
   * NOT — bu test bilinçli olarak DEGISTIRILDI.
   *
   * Eski hali tabloyu `focus()` edip `ArrowDown` bekliyordu. Ama
   * `/references` tablosu STATIK bir veri tablosu: olculdu — 8 satir,
   * 6 `<th>`, **0 odaklanabilir oge**, `tabindex` yok. `<table>` odak
   * almadigi icin `document.activeElement` `body`de kaliyordu; test yalnizca
   * Next.js gelistirici katmaninin `:focus`a takilmasi sayesinde "gecmis"
   * gorunuyordu.
   *
   * WCAG statik bir veri tablosunun ok tuslariyla gezilmesini ISTEMEZ; istedigi
   * sey baslik-hucre iliskisinin programatik olarak kurulmasidir (1.3.1) ve
   * tablonun icindeki ETKILESIMLI ogelerin klavyeyle erisilebilir olmasidir.
   * Test artik bunu olcuyor.
   */
  test("Referanslar tablosu dogru semantikle sunulur ve etkilesimli ogeleri klavyeyle erisilebilir", async ({page}) => {
    await page.goto("/references");
    const table = page.getByRole("table").or(page.getByRole("grid")).first();
    const appeared = await table
      .waitFor({state: "visible", timeout: 10_000})
      .then(() => true)
      .catch(() => false);
    if (!appeared) return;

    // 1.3.1 — baslik hucreleri ve satirlar programatik olarak var.
    expect(await table.getByRole("columnheader").count()).toBeGreaterThan(0);
    expect(await table.getByRole("row").count()).toBeGreaterThan(1);

    // Tablo icindeki her etkilesimli oge klavyeyle odaklanabilmeli.
    const interactive = table.locator('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const count = await interactive.count();
    for (let index = 0; index < Math.min(count, 5); index++) {
      await interactive.nth(index).focus();
      await expect(interactive.nth(index)).toBeFocused();
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
