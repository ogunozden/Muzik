import {describe, expect, it} from "vitest";
import {MAKAM_DATA, resolveCorpusKeyForMakam} from "../data";
import makamCorpus from "../__generated__/makam-corpus.json";

/**
 * Makam -> korpus anahtari cozumlemesi SABITLENIR (D14).
 *
 * Onceki surumde eslesme bulanikti (Levenshtein <= 1, benzersizse kabul).
 * Benzersizlik kontrolu BELIRSIZLIGI engelliyordu ama YANLISLIGI degil:
 * korpus buyudukce bir 1-edit cakismasi sessizce YANLIS makamin koma dizisini
 * ve ariza imzasini baglayabilirdi — log yok, test yok.
 *
 * Olcum: 48 makamin 40'i dogrudan adla cozumleniyor, 6'sinin korpusta
 * karsiligi hic yok, ve BULANIK esleseme muhtac olan yalniz IKI makam vardi
 * (nihavend/nihavent, bayati/beyati). Bu yuzden bulanik esleme kaldirildi ve
 * yerine `usul/data.ts`teki gibi ACIK alias tablosu kondu.
 *
 * Asagidaki tablo her makamin hangi korpus anahtarina bagli oldugunu
 * KILITLER; korpus degisince bilincli guncellenmesi gerekir.
 */

const EXPECTED_RESOLUTION: Record<string, string | null> = {
  rast: "rast",
  huseyni: "huseyni",
  nihavend: "nihavent", // yazim varyanti (alias)
  hicaz: "hicaz",
  ussak: "ussak",
  saba: "saba",
  segah: "segah",
  bayati: "beyati", // yazim varyanti (alias)
  hicazkürdi: null, // korpusta yok
  kürdi: "kurdi",
  hüzzam: "huzzam",
  gerdaniye: "gerdaniye",
  hisar: "hisar",
  hisarbuselik: "hisarbuselik",
  buselik: "buselik",
  cargah: "cargah",
  acemasiran: "acemasiran",
  acembuselik: null, // korpusta yok
  karcığar: "karcigar",
  uzzal: null, // korpusta yok
  zirefkend: null, // korpusta yok (nameTr "Zirenkend")
  tahir: "tahir",
  nikriz: "nikriz",
  sultaniyegah: "sultaniyegah",
  yegah: "yegah",
  dügah: "dugah",
  mahur: "mahur",
  bestenigar: "bestenigar",
  müstear: "mustear",
  irakeyn: null, // korpusta yok
  rehavi: "rehavi",
  muhayyer: "muhayyer",
  hümayun: null, // korpusta yok
  isfahan: "isfahan",
  arazbar: "arazbar",
  hicazkar: "hicazkar",
  ferahfeza: "ferahfeza",
  neva: "neva",
  kurdilihicazkar: "kurdilihicazkar",
  suzinak: "suzinak",
  sehnaz: "sehnaz",
  acemkurdi: "acemkurdi",
  evic: "evic",
  ferahnak: "ferahnak",
  evcara: "evcara",
  muhayyerkurdi: "muhayyerkurdi",
  suzidil: "suzidil",
  gulizar: "gulizar",
};

describe("makam -> korpus anahtari cozumlemesi (D14)", () => {
  it("her makam BEKLENEN korpus anahtarina baglanir", () => {
    for (const makam of MAKAM_DATA) {
      expect(EXPECTED_RESOLUTION, `${makam.id} tabloda tanimli`).toHaveProperty(makam.id);
      expect(resolveCorpusKeyForMakam(makam) ?? null, `${makam.id} cozumlemesi`).toBe(
        EXPECTED_RESOLUTION[makam.id],
      );
    }
  });

  it("tablo MAKAM_DATA ile birebir ortusur (sarkma yok)", () => {
    expect(Object.keys(EXPECTED_RESOLUTION).sort()).toEqual(MAKAM_DATA.map((m) => m.id).sort());
  });

  it("cozumlenen her anahtar korpusta GERCEKTEN vardir", () => {
    const makams = makamCorpus.makams as Record<string, unknown>;
    const komaScales = makamCorpus.komaScales as Record<string, unknown>;

    for (const key of Object.values(EXPECTED_RESOLUTION)) {
      if (!key) continue;
      expect(Boolean(makams[key]) || Boolean(komaScales[key]), `korpus anahtari "${key}"`).toBe(true);
    }
  });

  it("kaynagi olmayan makam SESSIZCE baska bir makama baglanmaz", () => {
    const unresolved = MAKAM_DATA.filter((makam) => !resolveCorpusKeyForMakam(makam));

    expect(unresolved.map((makam) => makam.id).sort()).toEqual(
      ["acembuselik", "hicazkürdi", "hümayun", "irakeyn", "uzzal", "zirefkend"].sort(),
    );
    for (const makam of unresolved) {
      expect(makam.komaScale, `${makam.id}: koma dizisi bagli olmamali`).toBeUndefined();
    }
  });
});
