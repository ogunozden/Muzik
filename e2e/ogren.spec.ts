import {test, expect} from "@playwright/test";

/**
 * Rehberli ogrenme akisi (/ogren) — kritik kullanici yolu E2E.
 * Birim testleri (src/features/learn/__tests__) mantigi kapsar; bu spec gercek
 * tarayicida gezinme + localStorage kaliciligini dogrular.
 */
test.describe("Rehberli ogrenme akisi", () => {
  // Playwright her teste izole context (bos localStorage) verir; ayrica
  // temizlemeye gerek yok. addInitScript(clear) reload'da da calisir ve
  // kalicilik testini bozar — bu yuzden kullanilmaz.
  test.beforeEach(async ({page}) => {
    await page.goto("/ogren");
  });

  test("ilk adim en kucuk usulu (Nimsofyan) gosterir", async ({page}) => {
    await expect(page.getByRole("heading", {name: "Nimsofyan"})).toBeVisible();
    await expect(page.getByText(/0 \/ 26 ogrenildi/)).toBeVisible();
    await expect(page.getByRole("progressbar", {name: "Ogrenme ilerlemesi"})).toHaveAttribute(
      "aria-valuemax",
      "26",
    );
  });

  test("'Sonraki' ilerletir, tamamlandi sayar ve reload sonrasi kalir", async ({page}) => {
    await page.getByRole("button", {name: "Sonraki usul"}).click();
    await expect(page.getByRole("heading", {name: "Semai"})).toBeVisible();
    await expect(page.getByText(/1 \/ 26 ogrenildi/)).toBeVisible();

    // localStorage kaliciligi: reload sonrasi ilerleme sayisi korunur.
    await page.reload();
    await expect(page.getByText(/1 \/ 26 ogrenildi/)).toBeVisible();
  });

  test("klavye ok tusuyla adim gezinme calisir", async ({page}) => {
    await page.getByRole("region", {name: "Rehberli usul ogrenme akisi"}).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", {name: "Semai"})).toBeVisible();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("heading", {name: "Nimsofyan"})).toBeVisible();
  });

  test("seviye haritasindan uzak bir adima atlama", async ({page}) => {
    await page.getByRole("button", {name: /^Curcuna/}).click();
    await expect(page.getByRole("heading", {name: "Curcuna"})).toBeVisible();
  });

  test("'Ogrendim' isaretleme ilerlemeyi artirir", async ({page}) => {
    await page.getByRole("button", {name: "Ogrendim olarak isaretle"}).click();
    await expect(page.getByText(/1 \/ 26 ogrenildi/)).toBeVisible();
  });
});
