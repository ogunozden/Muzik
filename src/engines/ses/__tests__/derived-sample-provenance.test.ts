import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {SAMPLE_SLOTS} from "../sample-library";

/**
 * TURETILMIS SES GERCEK KAYIT DIYE SUNULMASIN (PLAN.md §10/F3)
 *
 * `hek` iki elin birlikte vurusudur (Kudum kitabi s.14). Elimizdeki vurmali
 * paketlerinin HICBIRINDE gercek bir `hek` kaydi yok — arandi, bulunamadi.
 * Bu yuzden dosyalar `scripts/derive-hek-samples.mjs` ile dum+tek toplamindan
 * uretiliyor.
 *
 * Turetmek mesru bir yaklasimdir. Iddia etmek degildir. Bu test, turetimin
 * *gorunur* kaldigini sabitler: `derivedFrom` alani dolu olmali, API onu
 * disari vermeli, `/samples` sayfasi onu ekranda soylemeli.
 *
 * Gercek bir `hek` kaydi bulunup dosyalarin uzerine yazilirsa BU TEST KIRILIR
 * ve `derivedFrom`un kaldirilmasi gerektigini hatirlatir.
 */

const DERIVED_SYMBOL = "hek";

describe("Türetilmiş sample'ın kaynağı görünür kalmalı (F3)", () => {
  const percussionSlots = SAMPLE_SLOTS.filter((slot) => slot.category === "percussion");

  it("hek yuvalarinin hepsi turetilmis olarak isaretli", () => {
    const hekSlots = percussionSlots.filter((slot) => slot.symbol === DERIVED_SYMBOL);

    expect(hekSlots.length).toBeGreaterThan(0);
    const unmarked = hekSlots.filter((slot) => !slot.derivedFrom).map((slot) => slot.key);
    expect(unmarked).toEqual([]);
  });

  it("gercek kayittan gelen darplar turetilmis DIYE isaretlenmemis", () => {
    // Ters yon de onemli: her seye "turetilmis" demek de bilgiyi yok eder.
    const wronglyMarked = percussionSlots
      .filter((slot) => slot.symbol !== DERIVED_SYMBOL && slot.derivedFrom)
      .map((slot) => slot.key);

    expect(wronglyMarked).toEqual([]);
  });

  it("turetim aciklamasi kaynagini adiyla soyluyor", () => {
    const hekSlot = percussionSlots.find((slot) => slot.symbol === DERIVED_SYMBOL);

    // "turetildi" demek yetmez; NEDEN turetildigi degil ama NEDEN uretildigi
    // okunabilir olmali ki kullanici kendi kararini verebilsin.
    expect(hekSlot?.derivedFrom).toContain("dum");
    expect(hekSlot?.derivedFrom).toContain("tek");
  });

  it("API turetim bilgisini disari veriyor", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src", "app", "api", "samples", "route.ts"), "utf8");

    // Iki dal var (dosya var / yok); ikisi de tasimali, yoksa eksik dosyada
    // uyari kayboluyordu.
    const occurrences = route.split("derivedFrom").length - 1;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });

  it("/samples sayfasi turetim uyarisini ekranda gosteriyor", () => {
    const samplesDir = path.join(process.cwd(), "src", "app", "samples");
    const allSamplesCode = fs
      .readdirSync(samplesDir, {recursive: true, withFileTypes: true} as never)
      .filter((e: never) => (e as {isFile: () => boolean}).isFile())
      .map((e: never) => {
        const entry = e as {parentPath: string; name: string};
        return fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8");
      })
      .join("\n");

    expect(allSamplesCode).toContain("slot.derivedFrom");
    expect(allSamplesCode).toContain("Türetilmiş ses");
    // "gercek kayit degil" ifadesi acik olmali — kullanici tahmin etmesin.
    expect(allSamplesCode).toContain("gerçek kayıt değil");
  });

  it("gercek bir hek kaydi bulunmadigi hala dogru", () => {
    // Bu iddia bir gun degisebilir. Degistiginde test KIRILSIN ki turetimi
    // birakip gercegi kullanalim.
    const packRoot = path.join(process.cwd(), "all-samples");
    if (!fs.existsSync(packRoot)) return;

    const found: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/hek/i.test(entry.name)) found.push(full);
      }
    };
    walk(packRoot);

    expect(found).toEqual([]);
  });
});
