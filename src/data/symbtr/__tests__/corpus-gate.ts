import fs from "node:fs";
import path from "node:path";

/**
 * CANLI KORPUS KAPILARININ ORTAK ZEMINI (PLAN.md §11/H2)
 *
 * SymbTr korpusu (`symb/`, 3000 eser) **gitignored**:
 * yuzlerce megabayt ucuncu parti veri, depoya konmaz. Bu yuzden korpusa
 * dayanan kapilar korpus yoksa ATLANIR.
 *
 * ── NEDEN BURADA TOPLANDI ───────────────────────────────────────────────
 * Korpus yolu ON dosyada tekrar ediyordu ve her biri kendi `existsSync`
 * kontrolunu yapiyordu. Tek yerde toplanmasinin somut sebebi su: kapilarin
 * CI'da atlandigi **kimsenin gorunurunde degildi** — atlanan kapi sayisini
 * saymak icin dosyalari taramak gerekiyordu.
 */

export const CORPUS_ROOT = path.join(process.cwd(), "symb", "SymbTr-3.0");
export const CORPUS_TXT = path.join(CORPUS_ROOT, "txt");
export const CORPUS_MU2 = path.join(CORPUS_ROOT, "mu2");

/** Korpus bu makinede var mi? Yoksa korpusa dayanan kapilar atlanir. */
export const hasCorpus = fs.existsSync(CORPUS_ROOT);

/**
 * Korpusun VARLIGI zorunlu mu? (CI bunu `1` yapar.)
 *
 * ── COZULEN KUSUR ───────────────────────────────────────────────────────
 * Kapilar korpus yoksa **sessizce** atlaniyordu ve korpus CI'da hic
 * indirilmiyordu. Sonuc: 13 kapi aylardir CI'da hic kosmadi, ama CI hep
 * yesil gorundu. Bir refactor parser'i bozsa kimse duymayacakti.
 *
 * Bu bayrak atlamayi GORUNUR yapar: CI'da korpus indirilemezse
 * `corpus-gate.test.ts` kirmizi olur — kapilar sessizce yok sayilmaz.
 * Gelistirici makinesinde bayrak kapali oldugu icin korpussuz calismak
 * hala mumkun.
 */
export const requiresCorpus = process.env.REQUIRE_CORPUS === "1";

/**
 * Korpus kapilarina verilecek ACIK zaman asimi.
 *
 * ── NEDEN GENEL DEGERDEN AYRI ───────────────────────────────────────────
 * `vitest.config` genel `testTimeout: 20000` kullaniyor ve bu, hizli olmasi
 * beklenen birim testler icin dogru bir kapi: takilan bir test asilı kalmak
 * yerine hizlica duser. Ama korpus kapilari 3000 eseri tarar; onlar icin ayni
 * deger yanlis bir kapidir.
 *
 * ── DEGER NASIL SECILDI (olculdu, tahmin edilmedi) ──────────────────────
 * Paralel kosuda olculen sureler (2026-07-27):
 *
 *     barline-split  7,5 s / 6,2 s      meter-map     4,9 s / 3,8 s
 *     offset-replay  4,4 s / 3,6 s      repeat-struct 3,4 / 2,9 / 2,4 s
 *     ornaments      2,4 s              rows          2,4 s / 2,0 s
 *     ticks          2,0 s
 *
 * En yavas kapi **7,5 s**. Ama ayni kapi `test:coverage` altinda **44 s**
 * surdu — enstrumantasyon yaklasik **6 kat** yavaslatiyor. Genel 20 s degeri
 * bu yuzden coverage kosusunda DETERMINISTIK olarak dusuyordu (rastgelelik
 * degil, yuk). Kusur CI'da gorunmuyordu cunku orada korpus yok ve test zaten
 * atlaniyor — yani hatanin kendisi, kapilarin CI'da kosmamasinin golgesinde
 * saklanmisti.
 *
 * Secilen deger olculen en kotu halin (44 s) yaklasik **3 kati**. Amac takilan
 * bir testi sonsuza kadar beklemek degil; yuk altindaki gercek sureye yer
 * acmak.
 */
export const CORPUS_TIMEOUT_MS = 120_000;

/** Korpustaki `.txt` eser dosyalari (yoksa bos dizi). */
export function listCorpusPieces(): string[] {
  if (!hasCorpus || !fs.existsSync(CORPUS_TXT)) return [];
  return fs.readdirSync(CORPUS_TXT).filter((name) => name.endsWith(".txt")).sort();
}
