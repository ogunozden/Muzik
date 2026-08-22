import {Makam, MakamKeyAccidental, MakamKomaScale} from "@/core/domain/models";
import makamCorpus from "@/engines/makam/__generated__/makam-corpus.json";
import makamSeyir from "@/engines/makam/__generated__/makam-seyir.generated.json";

/**
 * Makamin OTANTIK koma arizasi + 53-EDO koma dizisi elle yazilmaz; SymbTr
 * korpusundan turetilmis `makam-corpus.json`den (npm run derive:makam-corpus)
 * makam adiyla eslenerek baglanir. Yalniz editoryal METIN (aciklama,
 * characteristic) yazili kalir; ariza, koma dizisi, `intervals`, karar ve
 * guclu otonom/kaynaklidir.
 *
 * Elle yazilan `dominant` alani KALDIRILDI (D4): 48 makamin 11'inde deger
 * makamin kendi dizisinde bile yoktu (ussak "E", huseyni "A", segah "D") ve
 * UI'da "Güçlü: E" diye ogrenciye basiliyordu. Yerine `getMakamGuclu()` —
 * `komaScale.gucluPerde` (Aydemir 2010 + korpus).
 */
type MakamCorpusEntry = {display: string; total: number; consensus: number; keySignature: MakamKeyAccidental[]};
export const CORPUS_MAKAMS = makamCorpus.makams as Record<string, MakamCorpusEntry>;
export const CORPUS_KOMA_SCALES = (makamCorpus.komaScales ?? {}) as Record<string, MakamKomaScale>;
// Otoriter seyir tarifleri (Gonul s.307+; pdftotext ile cikarildi). Makam
// id'siyle eslenir; editoryal `description`in aksine kaynakli/tam seyirdir.
export const SEYIR_METINLERI = (makamSeyir.seyir ?? {}) as Record<string, {yon: string; metin: string}>;

export function normalizeMakamName(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"})[m] ?? m)
    .replace(/[âîû]/g, (m) => ({â: "a", î: "i", û: "u"})[m] ?? m)
    .replace(/[ýðþ]/g, (m) => ({ý: "i", ð: "g", þ: "s"})[m] ?? m)
    .replace(/[^a-z0-9]/g, "");
}

/**
 * SymbTr korpusu bazi makamlari farkli yazar (ayni makam, ortografik varyant);
 * engine adi korpus anahtarina ACIK tabloyla koprulenir — `usul/data.ts`teki
 * `CORPUS_NAME_ALIASES` ile ayni desen (D14).
 *
 * Onceki surumde bu is bulanik eslesmeyle (Levenshtein <= 1, benzersizse kabul)
 * yapiliyordu. Benzersizlik kontrolu BELIRSIZLIGI engelliyordu ama YANLISLIGI
 * degil: korpus buyudukce bir 1-edit cakismasi sessizce YANLIS makamin koma
 * dizisini ve ariza imzasini baglayabilirdi. Olcum, tum makinenin yalnizca
 * ASAGIDAKI IKI kayit icin calistigini gosterdi (48 makamin 40'i zaten
 * dogrudan adla cozumleniyor, 6'sinin korpusta karsiligi hic yok).
 *
 * Anahtar: normalize edilmis engine adi. Deger: korpus anahtari.
 */
export const CORPUS_NAME_ALIASES: Record<string, string> = {
  nihavend: "nihavent",
  bayati: "beyati",
};

// Korpus anahtar kumesi: ariza (makams) VE koma dizisi (komaScales) anahtarlarinin
// BIRLESIMI — bazi makamlarda (buselik/cargah) yalniz komaScales girdisi var,
// makams yok; yalniz makams'a bakmak koma'yi baglamayi kacirir (2026-07 bug fix).
export const CORPUS_KEY_HAS_DATA = (key: string): boolean =>
  Boolean(CORPUS_MAKAMS[key]) || Boolean(CORPUS_KOMA_SCALES[key]);

/**
 * Makam adini korpus anahtarina cozumler: once tam ad, sonra id, sonra ACIK
 * alias tablosu. Karsiligi yoksa `undefined` — makam korpus verisi ALMAZ
 * (sessizce baska bir makama baglanmaz). Cozumleme `corpus-resolution.test.ts`
 * ile makam basina kilitlidir.
 */
export function resolveCorpusKeyForMakam(makam: Makam): string | undefined {
  const norm = normalizeMakamName(makam.nameTr);
  if (CORPUS_KEY_HAS_DATA(norm)) return norm;

  const idNorm = normalizeMakamName(makam.id);
  if (CORPUS_KEY_HAS_DATA(idNorm)) return idNorm;

  const alias = CORPUS_NAME_ALIASES[norm] ?? CORPUS_NAME_ALIASES[idNorm];
  return alias && CORPUS_KEY_HAS_DATA(alias) ? alias : undefined;
}

export function attachCorpusData(makam: Makam): Makam {
  const seyir = SEYIR_METINLERI[makam.id];
  const base = seyir ? {...makam, seyir} : makam;
  const key = resolveCorpusKeyForMakam(makam);
  if (!key) return base;
  const entry = CORPUS_MAKAMS[key]; // yalniz komaScales'te olan makamda undefined olabilir
  const komaScale = CORPUS_KOMA_SCALES[key];
  // 12-TET `intervals` artik korpus koma dizisinden OTONOM turetilir (elle
  // yazilan yerine); temiz heptatoni cikmazsa el-yazimina duser. Otantik perde
  // komaScale'de; bu, 12-TET notasyon izdusumu.
  const intervals = komaScale?.intervals12 ?? makam.intervals;
  return {
    ...base,
    intervals,
    ...(entry ? {keySignature: entry.keySignature, keySignatureConsensus: entry.consensus} : {}),
    ...(komaScale ? {komaScale} : {}),
    ...(seyir ? {seyir} : {}),
  };
}
