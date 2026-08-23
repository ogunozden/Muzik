import {describe, expect, it} from "vitest";
import {
  getMakamById,
  getMakamGuclu,
  getMakamKarar,
  komaToFrequency,
  getMakamKomaFrequencies,
  MAKAM_DATA,
} from "../data";
import makamCorpus from "../__generated__/makam-corpus.json";
import aeuReference from "../__generated__/aeu-reference.json";

/**
 * Otantik 53-EDO (Holder komasi / AEU) makam dizisi sozlesme testleri.
 *
 * Koma dizisi SymbTr `Koma53` sutunundan OTONOM turetilir (elle degil); bu
 * degismezler hem turetmenin muzikal DOGRULUGUNU (karakteristik mikrotonal
 * perdeler) hem de 12-TET yaklasik OLMADIGINI kanitlar. Kaynak: derive-makam-
 * corpus.mjs + tomato/makam_information.py (karar+perde 53-TET referans).
 */
describe("makam koma dizisi (53-EDO, korpus-turevli)", () => {
  const CENTS_PER_KOMA = 1200 / 53;

  const degreeNear = (makamId: string, koma: number, tol = 1) =>
    getMakamById(makamId)?.komaScale?.degrees.find((d) => Math.abs(d.koma - koma) <= tol);

  it("hicaz'in OTANTIK alcak ikilisini tasir (~113c, 12-TET'te imkansiz)", () => {
    const second = degreeNear("hicaz", 5); // 5 koma ≈ 113 cent (Nim Hicaz)
    expect(second, "hicaz alcak ikili derecesi").toBeDefined();
    // 12-TET olsaydi 100c (minor 2nd) olurdu; koma-tabanli oldugu icin degil.
    expect(second!.cents).toBeGreaterThan(104);
    expect(second!.cents).toBeLessThan(140);
  });

  it("ussak ve huseyni'nin notr (koma-bemol) ikilisini tasir (~158c)", () => {
    for (const makamId of ["ussak", "huseyni"]) {
      const second = degreeNear(makamId, 7); // 7 koma ≈ 158 cent (Segah perdesi)
      expect(second, `${makamId} notr ikili`).toBeDefined();
      // Ne 100c (minor) ne 200c (major) — tam ortada, mikrotonal.
      expect(second!.cents).toBeGreaterThan(140);
      expect(second!.cents).toBeLessThan(176);
    }
  });

  it("rast'in notr ucluyu tasir (~385c, 12-TET major ucluden 400c degil)", () => {
    const third = degreeNear("rast", 17); // 17 koma ≈ 385 cent
    expect(third, "rast notr uclu").toBeDefined();
    expect(third!.cents).toBeGreaterThan(360);
    expect(third!.cents).toBeLessThan(400); // 12-TET major 3rd (400c) ALTINDA
  });

  it("her dizi karar (koma 0) ile baslar, artan ve tekildir", () => {
    for (const makam of MAKAM_DATA) {
      const scale = makam.komaScale;
      if (!scale) continue;
      expect(scale.degrees[0].koma, `${makam.id}: ilk derece karar`).toBe(0);
      const komas = scale.degrees.map((d) => d.koma);
      const sorted = [...komas].sort((a, b) => a - b);
      expect(komas, `${makam.id}: artan sirali`).toEqual(sorted);
      expect(new Set(komas).size, `${makam.id}: tekil dereceler`).toBe(komas.length);
      for (const d of scale.degrees) {
        expect(d.koma).toBeGreaterThanOrEqual(0);
        expect(d.koma).toBeLessThan(53);
        expect(d.cents, `${makam.id}: cent = koma×1200/53`).toBe(Math.round(d.koma * CENTS_PER_KOMA));
      }
      expect(scale.kararPC).toBeGreaterThanOrEqual(0);
      expect(scale.kararPC).toBeLessThan(53);
      expect(scale.kararAgreement).toBeGreaterThan(0.4);
    }
  });

  it("korpustan yeterli makam kapsanir (>= 20 koma dizisi)", () => {
    const withKoma = MAKAM_DATA.filter((m) => m.komaScale);
    expect(withKoma.length).toBeGreaterThanOrEqual(20);
  });
});

describe("komaToFrequency (53-EDO -> Hz)", () => {
  it("karar (koma 0) referans frekansi verir, oktav (koma 53) 2 katidir", () => {
    expect(komaToFrequency(440, 0)).toBeCloseTo(440, 6);
    expect(komaToFrequency(440, 53)).toBeCloseTo(880, 6);
  });

  it("bir koma = 2^(1/53) orani (~22.64 cent)", () => {
    const ratio = komaToFrequency(440, 1) / 440;
    expect(ratio).toBeCloseTo(Math.pow(2, 1 / 53), 9);
    const cents = 1200 * Math.log2(ratio);
    expect(cents).toBeCloseTo(1200 / 53, 6);
  });
});

describe("getMakamKomaFrequencies", () => {
  it("otantik dizi frekanslarini uretir: karar tonic, son perde oktav", () => {
    const freqs = getMakamKomaFrequencies(getMakamById("hicaz")!);
    expect(freqs).not.toBeNull();
    expect(freqs!.length).toBe(getMakamById("hicaz")!.komaScale!.degrees.length + 1);
    // Son deger ust karar (ilk perdenin tam oktavi).
    expect(freqs![freqs!.length - 1]).toBeCloseTo(freqs![0] * 2, 6);
    for (const f of freqs!) expect(f).toBeGreaterThan(0);
  });

  it("koma dizisi olmayan (korpus disi) makamda null doner", () => {
    const noKoma = MAKAM_DATA.find((m) => !m.komaScale);
    if (noKoma) expect(getMakamKomaFrequencies(noKoma)).toBeNull();
  });
});

/**
 * HARDCODE -> OTONOM sozlesmesi: makam `intervals` (12-TET) artik elle
 * yazilmaz, koma dizisinden turetilir; `dominant` turetilemedigi icin (yapisal
 * teori notasi) en azindan korpusta belirgin bir derece oldugu DOGRULANIR.
 */
describe("makam 12-TET intervals korpus-turevi (hardcode -> otonom)", () => {
  const komaScales = makamCorpus.komaScales as Record<string, {intervals12: number[] | null}>;

  it("kapsanan makamlarda `intervals` korpus intervals12 ile ayni (el-yazimi degil)", () => {
    let checked = 0;
    for (const makam of MAKAM_DATA) {
      const derived = makam.komaScale?.intervals12;
      if (!derived) continue;
      expect(makam.intervals, `${makam.id}: intervals korpustan`).toEqual(derived);
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });

  it("turetilen her intervals12 gecerli heptatoni: 7 adim, toplam 12, pozitif", () => {
    let count = 0;
    for (const entry of Object.values(komaScales)) {
      if (!entry.intervals12) continue;
      expect(entry.intervals12).toHaveLength(7);
      expect(entry.intervals12.reduce((a, b) => a + b, 0)).toBe(12);
      for (const step of entry.intervals12) expect(step).toBeGreaterThan(0);
      count += 1;
    }
    expect(count).toBeGreaterThanOrEqual(60);
  });

  it("kaynakli guclu, korpus koma dizisinde KOMA hassasiyetinde bir derecedir (D4)", () => {
    // Eski kapi el-yazimi `dominant`i "dizide ±1 YARIM-TON var mi" diye
    // kontrol ediyordu — ~100 cent tolerans, neredeyse her degerin gectigi bir
    // kapi; testin kendi yorumu da turetilemedigini itiraf ediyordu. Guclu
    // artik KAYNAKLI (`komaScale.gucluPerde`; Aydemir 2010 + korpus), bu yuzden
    // dogrulama AEU perde tablosu uzerinden ±1 KOMA (~23 cent) yapilir.
    const perdeKoma = aeuReference.perdeKoma as Record<string, number>;
    let validated = 0;

    for (const makam of MAKAM_DATA) {
      const karar = getMakamKarar(makam);
      const guclu = getMakamGuclu(makam);
      if (!karar || !guclu || !makam.komaScale) continue;

      const kararKoma = perdeKoma[karar.perde];
      const gucluKoma = perdeKoma[guclu.perde];
      expect(kararKoma, `${makam.id}: karar ${karar.perde} AEU tablosunda`).toBeDefined();
      expect(gucluKoma, `${makam.id}: guclu ${guclu.perde} AEU tablosunda`).toBeDefined();

      const interval = (((gucluKoma - kararKoma) % 53) + 53) % 53;
      const present = makam.komaScale.degrees.some(
        (degree) => Math.abs(degree.koma - interval) <= 1 || Math.abs(degree.koma - interval) >= 52,
      );
      expect(present, `${makam.id}: guclu araligi ${interval}k korpus dizisinde`).toBe(true);
      validated += 1;
    }

    expect(validated, "kaynakli guclusu dogrulanan makam").toBeGreaterThanOrEqual(30);
  });
});
