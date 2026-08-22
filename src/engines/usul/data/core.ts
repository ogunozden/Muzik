import {Usul, UsulSymbol} from "@/core/domain/models";
import corpusMeters from "@/engines/usul/__generated__/usul-corpus-meters.json";

// Karakteristik tempo korpustan (kod-52 medyani) OTONOM baglanir; usulun kendi
// adindan eslenerek slider araligina (40..200, 10'luk adim) kirpilir/yuvarlanir.
const CORPUS_USULS = corpusMeters.usuls as Record<string, {tempoMedian: number | null}>;

export function normalizeUsulNameForCorpus(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .replace(/\(.*?\)/g, " ")
    .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"})[m] ?? m)
    .replace(/[âîû]/g, (m) => ({â: "a", î: "i", û: "u"})[m] ?? m)
    .replace(/[ýðþ]/g, (m) => ({ý: "i", ð: "g", þ: "s"})[m] ?? m)
    .replace(/[^a-z0-9]/g, "");
}

// SymbTr korpusu bazi usulleri farkli yazar (ayni usul, ortografik varyant);
// engine adi korpus anahtarina koprulenir. Tempo yine KORPUSTAN gelir —
// uydurma yok, yalnizca yazim uzlastirmasi. Karsiligi olmayan (or. agirsemai)
// tempsuz kalir (bos birakma > uydurma).
const CORPUS_NAME_ALIASES: Record<string, string> = {
  berafsan: "berefsan",
  nimberafsan: "nimberefsan",
  cember: "cenber",
  zincir: "zencir",
  darbifeth: "darbifetih",
  frengifer: "firengifer",
};

export function corpusDefaultBpm(nameTr: string): number | undefined {
  const key = normalizeUsulNameForCorpus(nameTr);
  const resolved = key in CORPUS_USULS ? key : CORPUS_NAME_ALIASES[key];
  const tempo = resolved ? CORPUS_USULS[resolved]?.tempoMedian : undefined;
  if (!tempo || !Number.isFinite(tempo)) return undefined;
  return Math.min(200, Math.max(40, Math.round(tempo / 10) * 10));
}

export type Stroke = [beat: number, symbol: UsulSymbol["symbol"], timeValue: number, syllable?: string];

// Kuvvetli darplar (s.14): dum/ta sag el, hek IKI ELIN BIRLIKTE vurusu.
// `hek` eskiden burada yoktu; kaynak onu kuvvetli sayarken hic vurgulanmiyordu
// ve hafif `tek` ailesine calmiyordu (D7).
export const ACCENTED: ReadonlySet<string> = new Set(["dum", "ta", "hek"]);

/**
 * Darp dizisini `UsulSymbol`lere cevirir.
 *
 * `mainBeats` verilirse (velvele donusumunde) ANA DARBA denk DUSMEYEN vuruslar
 * `isOrnament` isaretlenir. Ses motoru susleme kismasini artik bu bayraktan
 * yapar; eskiden `timeValue < 1` sezgiseliyle tahmin ediyordu ve Gonul
 * velvelelerindeki dolgunun cogu `timeValue: 1` yazili oldugu icin tam gainle
 * caliyordu (1.400 darbin 748'i timeValue===1) — "ana iskelet one ciksin"
 * niyeti yarim kaliyordu (D9).
 */
export function toSymbols(strokes: readonly Stroke[], mainBeats?: ReadonlySet<number>): UsulSymbol[] {
  return strokes.map(([beat, symbol, timeValue, syllable]) => ({
    beat,
    symbol,
    isAccent: ACCENTED.has(symbol),
    timeValue,
    ...(mainBeats ? {isOrnament: !mainBeats.has(beat)} : {}),
    ...(syllable ? {syllable} : {}),
  }));
}

// Velvele kisayollari: DU = kisa dum hecesi ("dü", sag el), ME = sol elin
// donus vurusu (ses ailesi ke). Kitap velvele satirlarindaki heceler
// `syllable` olarak korunur; ses eslemesi sembol uzerinden yapilir.
export const DU = (beat: number, timeValue = 0.5): Stroke => [beat, "dum", timeValue, "Dü"];
export const ME = (beat: number, timeValue = 0.5): Stroke => [beat, "ke", timeValue, "Me"];

export function toStressPattern(beats: number, symbols: readonly UsulSymbol[]): number[] {
  const stress = new Array<number>(beats).fill(0);
  for (const symbol of symbols) {
    const index = Math.floor(symbol.beat) - 1;
    if (index >= 0 && index < beats && symbol.isAccent) stress[index] = 1;
  }
  return stress;
}

export function shift(strokes: readonly Stroke[], offset: number): Stroke[] {
  return strokes.map(([beat, symbol, timeValue, syllable]) =>
    syllable !== undefined ? [beat + offset, symbol, timeValue, syllable] : [beat + offset, symbol, timeValue],
  );
}

export function makeUsul(
  id: string,
  name: string,
  nameEn: string,
  beats: number,
  unit: string,
  strokes: readonly Stroke[],
  velvele?: readonly Stroke[],
): Usul {
  const symbols = toSymbols(strokes);
  const defaultBpm = corpusDefaultBpm(name);
  // Velvele vuruslarindan ANA DARBA denk gelmeyenler susleme sayilir (D9).
  const mainBeats: ReadonlySet<number> = new Set(strokes.map(([beat]) => beat));
  return {
    id,
    name,
    nameTr: name,
    nameEn,
    beats,
    unit,
    symbols,
    stressPattern: toStressPattern(beats, symbols),
    ...(velvele ? {velvele: toSymbols(velvele, mainBeats)} : {}),
    ...(defaultBpm ? {defaultBpm} : {}),
  };
}

/**
 * Usulun vurgu gruplamasi (accent grouping) — darptaki kuvvetli vuruslarin
 * (dum/ta) baslattigi bolumlerin zaman uzunluklari. Orn. Aksak (dum b1, b5) ->
 * [4, 5]. Gruplama darptan TURETILIR (ekstra veri degil); yapisal usullerde
 * yalniz 1. dum kesin oldugundan tek grup dondurur (durustce eksik).
 */
export function getUsulGrouping(usul: Usul): number[] {
  const accents = usul.symbols.filter((s) => s.isAccent).map((s) => s.beat);
  // Bolum sinirlari: beat 1 + kuvvetli vurus (dum/ta) konumlari. Usul zayif
  // baslarsa (orn. nimevsat tek-ka...) 1. bolum ilk dum'e kadar uzanir.
  const boundaries = accents[0] === 1 ? accents : [1, ...accents];
  if (boundaries.length === 0) return [usul.beats];
  const groups: number[] = [];
  for (let i = 0; i < boundaries.length; i += 1) {
    const start = boundaries[i];
    const end = i + 1 < boundaries.length ? boundaries[i + 1] : usul.beats + 1;
    groups.push(Math.round((end - start) * 100) / 100);
  }
  return groups;
}

export function getUsulBeatDuration(usul: Usul, bpm: number): number {
  const beatUnit = parseInt(usul.unit);
  return (60 / bpm) * (4 / beatUnit);
}
