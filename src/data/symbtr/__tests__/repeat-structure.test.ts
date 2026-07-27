import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";

const CORPUS = path.join(process.cwd(), "symb", "SymbTr-3.0");

/**
 * TEKRAR ISARETLERI — HANGI KAYNAK NEYI TASIYOR (PLAN.md §4/B5).
 *
 * Uc format ayni eseri farkli sekilde tutuyor ve bu FARK olculebilir:
 *
 *   TXT       tekrarlar ACILMIS — notalar tekrar tekrar yazilmis
 *   MusicXML  tekrarlar KORUNMUS — `<repeat direction=…>` isareti duruyor
 *   mu2       kod-21 yapisal isaret, ama tekrarla BIREBIR ORTUSMUYOR
 *
 * Bu dosya uc iddiayi da canli korpusta sabitler. Kod degisikligi degil,
 * KAYNAK DAVRANISININ kaydi: motor hangi formattan ne bekleyecegini bilsin.
 */
describe("Tekrar yapisi (B5) — kaynaklar arasi fark", () => {
  const hasCorpus = fs.existsSync(CORPUS);

  function corpusPairs(): Array<{txtPitched: number; xmlNotes: number; repeats: number}> {
    const txtDir = path.join(CORPUS, "txt");
    const xmlDir = path.join(CORPUS, "MusicXML");
    const pairs: Array<{txtPitched: number; xmlNotes: number; repeats: number}> = [];

    for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
      const xmlPath = path.join(xmlDir, file.replace(/\.txt$/, ".xml"));
      if (!fs.existsSync(xmlPath)) continue;

      const txtPitched = fs
        .readFileSync(path.join(txtDir, file), "utf8")
        .split(/\r?\n/)
        .slice(1)
        .filter((line) => (line.split("\t")[2] ?? "").trim() !== "").length;

      const xml = fs.readFileSync(xmlPath, "utf8");
      const xmlNotes = (xml.match(/<note[\s>]/g) ?? []).length;
      const repeats = (xml.match(/<repeat\b/g) ?? []).length;

      if (txtPitched > 0 && xmlNotes > 0) pairs.push({txtPitched, xmlNotes, repeats});
    }
    return pairs;
  }

  it.skipIf(!hasCorpus)("TXT tekrarlari ACAR — MusicXML'den belirgin sekilde uzun", () => {
    const pairs = corpusPairs();
    const withRepeats = pairs.filter((pair) => pair.repeats > 0);
    const expanded = withRepeats.filter((pair) => pair.txtPitched / pair.xmlNotes > 1.05);

    expect(pairs.length).toBeGreaterThan(2900);
    expect(withRepeats.length).toBeGreaterThan(1900);

    // Olculdu: %97,8 · oran medyani 1,745
    expect(expanded.length / withRepeats.length).toBeGreaterThan(0.95);

    const ratios = withRepeats.map((pair) => pair.txtPitched / pair.xmlNotes).sort((a, b) => a - b);
    expect(ratios[Math.floor(ratios.length / 2)]).toBeGreaterThan(1.5);
  });

  it.skipIf(!hasCorpus)("MusicXML tekrar isaretini KORUR — otoritatif kaynak budur", () => {
    const totalRepeats = corpusPairs().reduce((sum, pair) => sum + pair.repeats, 0);

    // `importer.ts` bunlari zaten `repeat`/`ending` kaynak ozelligi olarak
    // okuyor (D2). Sayinin sifirdan buyuk olmasi o yolun canli oldugunu
    // gosterir.
    expect(totalRepeats).toBeGreaterThan(9000);
  });

  it.skipIf(!hasCorpus)("mu2 kod-21 tekrar isareti SAYILMAZ — ortusme yalniz %32", () => {
    const mu2Dir = path.join(CORPUS, "mu2");
    const xmlDir = path.join(CORPUS, "MusicXML");
    let files = 0;
    let exact = 0;

    for (const file of fs.readdirSync(mu2Dir).filter((name) => name.endsWith(".mu2"))) {
      const xmlPath = path.join(xmlDir, file.replace(/\.mu2$/, ".xml"));
      if (!fs.existsSync(xmlPath)) continue;

      const code21 = fs
        .readFileSync(path.join(mu2Dir, file), "latin1")
        .split(/\r?\n/)
        .slice(1)
        .filter((line) => line.split("\t")[0]?.trim() === "21").length;
      const repeats = (fs.readFileSync(xmlPath, "utf8").match(/<repeat\b/g) ?? []).length;

      files++;
      if (code21 === repeats) exact++;
    }

    expect(files).toBeGreaterThan(2900);
    // KANIT: birebir esitlik yalniz ~%32. Buyukluk mertebesi ayni
    // (11.985 / 9.932) ama kod-21 daha genis bir yapisal isaret sinifi.
    // Bu yuzden `mu2` kod-21 "tekrar" OLARAK ADLANDIRILMAZ.
    expect(exact / files).toBeLessThan(0.5);
    expect(exact / files).toBeGreaterThan(0.25);
  });
});
