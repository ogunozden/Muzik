import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  CORPUS_MU2,
  CORPUS_ROOT,
  CORPUS_TIMEOUT_MS,
  CORPUS_TXT,
  hasCorpus,
  requiresCorpus,
} from "./corpus-gate";

/**
 * KORPUS KAPILARI GERCEKTEN KOSTU MU? (PLAN.md §11/H1)
 *
 * ── COZULEN KUSUR ───────────────────────────────────────────────────────
 * Projenin en guclu kanitlari canli korpusa dayaniyor: `ticks` · `rows` ·
 * `meter-map` · `offset-replay` · `ornaments` · `repeat-structure` ·
 * `barline-split`. Toplam **13 kapi**. Hepsi `it.skipIf(!hasCorpus)` ile
 * korunuyordu ve korpus (`symb/`) gitignored.
 *
 * CI korpusu **hic indirmiyordu**. Yani o 13 kapi aylardir CI'da hic
 * kosmadi — ama CI hep yesildi. "1.192.643 olay", "5.802 bar-asan nota",
 * "%98,03 olcu dolulugu" yalnizca tek bir gelistirici makinesinde
 * dogrulaniyordu. Bir refactor parser'i bozsa CI yesil kalirdi.
 *
 * Bu, `docs/SECURITY-AUDIT.md`'deki dersin simetrigi: orada CI hep kirmiziydi
 * ve insanlara gormezden gelmeyi ogretiyordu; burada CI hep yesildi ve
 * **bakmadigi icin** yesildi. Ikisi de ayni sonucu verir — kapiya guven
 * kaybi.
 *
 * ── COZUM ───────────────────────────────────────────────────────────────
 * 1. CI korpusu indirir (`npm run corpus:fetch`, Zenodo 15470412, CC-BY 4.0,
 *    27 MB, onbellekli) — kapilar GERCEKTEN kosar.
 * 2. CI `REQUIRE_CORPUS=1` verir. Indirme basarisiz olursa bu test kirilir,
 *    yani atlama SESSIZ olamaz.
 *
 * Gelistirici makinesinde bayrak kapali: korpussuz calismak hala mumkun.
 */

describe("Korpus kapıları görünür olmalı (H1)", () => {
  it("REQUIRE_CORPUS=1 ise korpus GERCEKTEN var", () => {
    if (!requiresCorpus) {
      // Yerel makine: korpus zorunlu degil. Iddia yok, ama sessiz de degil —
      // testin adi ve bu dal, durumun bilincli oldugunu soyler.
      expect(requiresCorpus).toBe(false);
      return;
    }

    expect(
      hasCorpus,
      `REQUIRE_CORPUS=1 verildi ama korpus yok: ${CORPUS_ROOT}\n` +
        "CI'da `npm run corpus:fetch` adimi basarisiz olmus olabilir. " +
        "Korpus olmadan 13 kapi ATLANIR ve CI yanlislikla yesil gorunur.",
    ).toBe(true);
  });

  it.skipIf(!hasCorpus)("korpus beklenen kanallari ve eser sayisini tasiyor", () => {
    // Yarim inen bir arsiv "korpus var" gibi gorunup kapilari sessizce
    // zayiflatabilir; sayilar burada sabitlenir.
    expect(fs.existsSync(CORPUS_TXT)).toBe(true);
    expect(fs.existsSync(CORPUS_MU2)).toBe(true);

    const txtCount = fs.readdirSync(CORPUS_TXT).filter((name) => name.endsWith(".txt")).length;
    const mu2Count = fs.readdirSync(CORPUS_MU2).filter((name) => name.endsWith(".mu2")).length;

    expect(txtCount).toBe(3000);
    expect(mu2Count).toBe(3000);
  }, CORPUS_TIMEOUT_MS);

  it("korpusa bagli her kapi ACIK zaman asimi tasiyor", () => {
    // H2'de olculdu: korpus kapilari coverage altinda 44 s'ye kadar cikiyor,
    // genel `testTimeout` ise 20 s. Acik timeout verilmemis bir kapi coverage
    // kosusunda DETERMINISTIK olarak duser. Bu test, yeni eklenecek korpus
    // kapilarinin da timeout almasini zorunlu kilar.
    const testDirectories = [
      path.join(process.cwd(), "src", "data", "symbtr", "__tests__"),
      path.join(process.cwd(), "src", "core", "time", "__tests__"),
    ];

    const missing: string[] = [];
    for (const directory of testDirectories) {
      for (const file of fs.readdirSync(directory).filter((name) => name.endsWith(".test.ts"))) {
        const source = fs.readFileSync(path.join(directory, file), "utf8");
        const lines = source.split("\n");

        for (let index = 0; index < lines.length; index++) {
          const line = lines[index];
          const isSkipIfGate = line.includes("skipIf(!hasCorpus)");
          const isBareItLine = /^\s*it\(/.test(line) && !line.trimStart().startsWith("//");
          if (!isSkipIfGate && !isBareItLine) continue;

          // Bu `it(...)` blogunun kapanisini bul ve timeout tasiyor mu bak.
          const indent = line.length - line.trimStart().length;
          const plainClose = `${" ".repeat(indent)}});`;
          const timedClose = `${" ".repeat(indent)}}, CORPUS_TIMEOUT_MS);`;

          let cursor = index + 1;
          while (cursor < lines.length && lines[cursor] !== plainClose && lines[cursor] !== timedClose) {
            cursor++;
          }
          const block = lines.slice(index, cursor + 1).join("\n");
          // skipIf kapilari her zaman korpus kapisidir; cıplak `it(` bloklari
          // yalniz `readdirSync` + CORPUS kullaniyorsa korpus dongusudur
          // (2026-08-08: mu2-metadata/darp-grouping erken-return korumali
          // kapilari meta-kapidan kaciyordu — bu genisletme onlari yakalar).
          const isCorpusLoop = isSkipIfGate || (block.includes("readdirSync(") && block.includes("CORPUS"));
          if (isCorpusLoop && lines[cursor] === plainClose) missing.push(`${file}:${index + 1}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
