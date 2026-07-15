import {describe, expect, it} from "vitest";
import makamCorpus from "../__generated__/makam-corpus.json";
import aeuReference from "../__generated__/aeu-reference.json";

/**
 * Otonom korpus koma dizisini OTORITER referansa karsi capraz-dogrular (A2 /
 * F13.4). Kaynak: tomato (AEU perde->koma) + Aydemir 2010 (karar/guclu). Bu,
 * korpus-turevi dizinin bagimsiz bir teori kaynagiyla tutarli oldugunu kanitlar
 * (curcuna-tipi hatalari yakalar). Aralik KARAR-GORELI oldugu icin offset/ahenk
 * bagimsizdir.
 */
type KomaScale = {kararPC: number; degrees: {koma: number; cents: number}[]};
type TonicDominant = {tonic: string; dominant: string};

const KOMA_PER_OCTAVE = 53;
const komaScales = makamCorpus.komaScales as Record<string, KomaScale>;
const perdeKoma = aeuReference.perdeKoma as Record<string, number>;
const tonicDominant = aeuReference.makamTonicDominant as Record<string, TonicDominant>;

const normalize = (name: string) =>
  name
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"})[m] ?? m)
    .replace(/\s/g, "")
    .replace(/[^a-z0-9]/g, "");

// Korpus anahtari -> aeu-reference makam anahtari (ikisi de sade)
function findReference(corpusKey: string): TonicDominant | undefined {
  for (const [name, td] of Object.entries(tonicDominant)) {
    if (normalize(name) === corpusKey) return td;
  }
  return undefined;
}

describe("makam koma dizisi <-> AEU referans capraz-dogrulama (A2)", () => {
  it("her makamin tomato/Aydemir GUCLU araligi korpusta bir derece (karar-goreli)", () => {
    let validated = 0;
    for (const [corpusKey, scale] of Object.entries(komaScales)) {
      const ref = findReference(corpusKey);
      if (!ref) continue;
      const tonicKoma = perdeKoma[ref.tonic];
      const dominantKoma = perdeKoma[ref.dominant];
      if (tonicKoma === undefined || dominantKoma === undefined) continue;

      const dominantInterval = (((dominantKoma - tonicKoma) % KOMA_PER_OCTAVE) + KOMA_PER_OCTAVE) % KOMA_PER_OCTAVE;
      const present = scale.degrees.some(
        (d) => Math.abs(d.koma - dominantInterval) <= 1 || Math.abs(d.koma - dominantInterval) >= KOMA_PER_OCTAVE - 1,
      );
      expect(present, `${corpusKey}: guclu araligi ${dominantInterval}k korpusta`).toBe(true);
      validated += 1;
    }
    expect(validated, "capraz-dogrulanan makam sayisi").toBeGreaterThanOrEqual(20);
  });

  it("AEU perde tablosu tutarli: rast=0, tanini=9, dortlu=22, beshli=31, oktav=53", () => {
    expect(perdeKoma.rast).toBe(0);
    expect(perdeKoma.dugah).toBe(9); // tanini (tam ses)
    expect(perdeKoma.cargah).toBe(22); // dortlu
    expect(perdeKoma.neva).toBe(31); // beshli (guclu adayi)
    expect(perdeKoma.gerdaniye).toBe(53); // oktav
  });

  it("her referans makam tonic ve dominant perde tabloda cozumlenebilir", () => {
    for (const [name, td] of Object.entries(tonicDominant)) {
      expect(perdeKoma[td.tonic], `${name}: tonic ${td.tonic}`).toBeDefined();
      expect(perdeKoma[td.dominant], `${name}: dominant ${td.dominant}`).toBeDefined();
    }
  });
});
