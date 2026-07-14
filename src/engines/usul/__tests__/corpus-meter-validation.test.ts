import {describe, expect, it} from "vitest";
import {USUL_DATA} from "../data";
import corpusSummary from "../__generated__/usul-corpus-meters.json";

/**
 * OTONOM MERTEBE DOGRULAMASI ("HARD CODE YAPMA. FULL OTONOM OLSUN").
 *
 * Usul darp desenleri kitaptan yazilir (korpusta yok), ama MERTEBE (beats/unit)
 * SymbTr korpusundaki 3000 gercek eserin kod-51 basligindan turetilebilir.
 * Curcuna hatasi (10/16 -> 2x hizli) tam da elle-girilmis mertebeydi; bu kapi
 * onu yakalardi. Ozet JSON `npm run derive:usul-meters` ile uretilir ve
 * commit'lenir (korpus CI'da yok); burada USUL_DATA ona karsi dogrulanir.
 *
 * Kural: usulun kendi adindan (nameTr) turetilen anahtarla korpus kaydini
 * bul; ayni ZAMAN SAYISINA (beats) sahip eserler arasinda usulun MERTEBESI
 * (unit) cok nadirse (< %15) bu muhtemelen bir veri hatasidir -> FAIL.
 * Eslesme addan turer (elle sozluk yok); buyuk usuller korpusta kod-51
 * artefakti (4/4) uretttigi ve az kayitli usuller guvenilmez oldugu icin
 * yalniz ayni-beats kaydi >= 10 olanlar dogrulanir.
 */

// Script'teki normalizeUsulName ile ayni (gercek Turkce + SymbTr latin1
// mojibake ayni ascii'ye). Drift olursa yalniz kapsam duser, yanlis-pozitif
// olmaz.
function normalizeUsulName(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .replace(/\(.*?\)/g, " ")
    .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"})[m] ?? m)
    .replace(/[âîû]/g, (m) => ({â: "a", î: "i", û: "u"})[m] ?? m)
    .replace(/[ýðþ]/g, (m) => ({ý: "i", ð: "g", þ: "s"})[m] ?? m)
    .replace(/[^a-z0-9]/g, "");
}

const MIN_SAME_BEATS = 10;
const RARE_THRESHOLD = 0.15;

type CorpusEntry = {display: string; total: number; meters: Record<string, number>};
const corpus = corpusSummary.usuls as Record<string, CorpusEntry>;

function sameBeatsPieces(entry: CorpusEntry, beats: number): number {
  return Object.entries(entry.meters)
    .filter(([meter]) => meter.split("/")[0] === String(beats))
    .reduce((sum, [, count]) => sum + count, 0);
}

describe("usul mertebeleri korpusa karsi otonom dogrulanir", () => {
  it("no usul's meter contradicts the SymbTr corpus consensus", () => {
    const violations: string[] = [];
    let validated = 0;

    for (const usul of USUL_DATA) {
      const entry = corpus[normalizeUsulName(usul.nameTr)];
      if (!entry) continue;
      const sameBeats = sameBeatsPieces(entry, usul.beats);
      if (sameBeats < MIN_SAME_BEATS) continue;

      validated += 1;
      const dataMeter = `${usul.beats}/${usul.unit}`;
      const fraction = (entry.meters[dataMeter] ?? 0) / sameBeats;
      if (fraction < RARE_THRESHOLD) {
        violations.push(
          `${usul.id}: veri ${dataMeter} ama korpus ${entry.display} icin bu mertebe ` +
            `%${Math.round(fraction * 100)} (ayni-beats ${sameBeats} eser; gorulen: ${JSON.stringify(entry.meters)})`,
        );
      }
    }

    // Kapi bos olmasin: yeterince usul gercekten dogrulanmali.
    expect(validated).toBeGreaterThanOrEqual(10);
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("curcuna's 10/8 is corpus-backed (regresyon: 10/16 reddedilir)", () => {
    const entry = corpus[normalizeUsulName("Curcuna")];
    expect(entry).toBeDefined();
    const tenBeat = sameBeatsPieces(entry, 10);
    // 10/8 baskin; 10/16 (eski hatali deger) neredeyse yok.
    expect((entry.meters["10/8"] ?? 0) / tenBeat).toBeGreaterThan(0.85);
    expect((entry.meters["10/16"] ?? 0) / tenBeat).toBeLessThan(RARE_THRESHOLD);
  });
});
