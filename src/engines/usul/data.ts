import {Usul, UsulSymbol} from "@/types";
import corpusMeters from "./__generated__/usul-corpus-meters.json";

// Karakteristik tempo korpustan (kod-52 medyani) OTONOM baglanir; usulun kendi
// adindan eslenerek slider araligina (40..200, 10'luk adim) kirpilir/yuvarlanir.
const CORPUS_USULS = corpusMeters.usuls as Record<string, {tempoMedian: number | null}>;

function normalizeUsulNameForCorpus(name: string): string {
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

function corpusDefaultBpm(nameTr: string): number | undefined {
  const key = normalizeUsulNameForCorpus(nameTr);
  const resolved = key in CORPUS_USULS ? key : CORPUS_NAME_ALIASES[key];
  const tempo = resolved ? CORPUS_USULS[resolved]?.tempoMedian : undefined;
  if (!tempo || !Number.isFinite(tempo)) return undefined;
  return Math.min(200, Math.max(40, Math.round(tempo / 10) * 10));
}

/**
 * Usul ana-darb desenleri — KAYNAKLI VERI (2026-07-14 duzeltmesi).
 *
 * Kaynak: "Turk Musikisinde Usuller ve Kudum" (ITU TMDK Ercumend Berker
 * Kutuphanesi nushasi; Sadettin Heper aktarimli) — repo'daki `symb/` altinda
 * taranmis PDF olarak mevcut. Her usulun "ZAMAN VE VURGULARI" bolumundeki
 * ana darb dizilisi sayfa referansiyla birebir aktarildi; velvele alinmadi.
 * Onceki surumdeki desenler jenerik dolguydu (her vurusa bir darb) ve
 * kitapla eslesmiyordu; Darb-i Fetih ile Zincir tamamen bostu.
 *
 * Kitapta bulunmayan tek kayit Curcuna'dir: kitap Aksak Semai bolumunde
 * (s.66) 10/16 mertebesine Curcuna dendigini yazar; desen oradan alinir.
 * Cifte Duyek kitapta iki duyekin ardarda vurulusu olarak tanimlanir
 * (s.109); Zincir (s.234) bes buyuk usulun zinciridir:
 * Cifte Duyek(16) + Fahte(20) + Cember(24) + Devr-i Kebir(28) + Berefsan(32) = 120.
 *
 * Darp turleri (s.14 "OLCULERIN VURULMASI"): dum/ta sag el (kuvvetli),
 * tek/te/ke/ka sol el (hafif; te-ke yarim degerli ikili, ka uzun), hek iki
 * elin birlikte vurusu. `timeValue` darbin kitaptaki zaman degeridir; her
 * desende timeValue toplami usulun zaman adedine esittir (test guvencesi).
 */

type Stroke = [beat: number, symbol: UsulSymbol["symbol"], timeValue: number, syllable?: string];

const ACCENTED: ReadonlySet<string> = new Set(["dum", "ta"]);

function toSymbols(strokes: readonly Stroke[]): UsulSymbol[] {
  return strokes.map(([beat, symbol, timeValue, syllable]) => ({
    beat,
    symbol,
    isAccent: ACCENTED.has(symbol),
    timeValue,
    ...(syllable ? {syllable} : {}),
  }));
}

// Velvele kisayollari: DU = kisa dum hecesi ("dü", sag el), ME = sol elin
// donus vurusu (ses ailesi ke). Kitap velvele satirlarindaki heceler
// `syllable` olarak korunur; ses eslemesi sembol uzerinden yapilir.
const DU = (beat: number, timeValue = 0.5): Stroke => [beat, "dum", timeValue, "Dü"];
const ME = (beat: number, timeValue = 0.5): Stroke => [beat, "ke", timeValue, "Me"];

function toStressPattern(beats: number, symbols: readonly UsulSymbol[]): number[] {
  const stress = new Array<number>(beats).fill(0);
  for (const symbol of symbols) {
    const index = Math.floor(symbol.beat) - 1;
    if (index >= 0 && index < beats && symbol.isAccent) stress[index] = 1;
  }
  return stress;
}

function shift(strokes: readonly Stroke[], offset: number): Stroke[] {
  return strokes.map(([beat, symbol, timeValue, syllable]) =>
    syllable !== undefined ? [beat + offset, symbol, timeValue, syllable] : [beat + offset, symbol, timeValue],
  );
}

function makeUsul(
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
  return {
    id,
    name,
    nameTr: name,
    nameEn,
    beats,
    unit,
    symbols,
    stressPattern: toStressPattern(beats, symbols),
    ...(velvele ? {velvele: toSymbols(velvele)} : {}),
    ...(defaultBpm ? {defaultBpm} : {}),
  };
}

// Paylasilan cekirdek desenler (mertebeler ve birlesik usuller bunlardan kurulur).
const DUYEK: Stroke[] = [[1, "dum", 1], [2, "tek", 2], [4, "tek", 1], [5, "dum", 2], [7, "tek", 2]]; // s.40
const CIFTE_DUYEK: Stroke[] = [...DUYEK, ...shift(DUYEK, 8)]; // s.109: iki duyek ardarda
const AKSAK: Stroke[] = [[1, "dum", 2], [3, "te", 1], [4, "ke", 1], [5, "dum", 2], [7, "tek", 2], [9, "tek", 1]]; // s.47
const AKSAK_SEMAI: Stroke[] = [[1, "dum", 2], [3, "te", 1], [4, "ka", 2], [6, "dum", 2], [8, "tek", 2], [10, "tek", 1]]; // s.67
const YURUK_SEMAI: Stroke[] = [[1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 1], [5, "tek", 2]]; // s.25
// Velveleler (ayni sayfalardaki VELVELESI satirlari). Yalniz sekli net
// okunanlar aktarildi; kalanlar icin bkz. TODO "velvele 2. asama".
const YURUK_SEMAI_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], [3, "ka", 1], DU(4), ME(4.5), [5, "tek", 0.5], [5.5, "ka", 1.5],
]; // s.25
const DUYEK_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "hek", 1], [8, "te", 0.5], [8.5, "ke", 0.5],
]; // s.40
const AKSAK_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "hek", 1], [8, "tek", 2],
]; // s.47
const EVFER: Stroke[] = [
  [1, "dum", 2], [3, "te", 1], [4, "ke", 1], [5, "dum", 2], [7, "tek", 1], [8, "tek", 2],
]; // s.53: aksaktan farki son iki tek'in deger degisimi
const EVFER_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "hek", 1], [8, "hek", 2],
]; // s.53
const MUSEMMEN: Stroke[] = [[1, "dum", 3], [4, "tek", 2], [6, "tek", 3]]; // s.44 (3+2+3 = Düüüm Teek Teeek)
const MUSEMMEN_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 1], [5, "ka", 1],
  DU(6), ME(6.5), [7, "tek", 0.5], [7.5, "ka", 1.5],
]; // s.44-45
const DEVRI_HINDI_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 1], [5, "ka", 1], [6, "tek", 1], [7, "ka", 1],
]; // s.34
const DEVRI_TURAN_VELVELE: Stroke[] = [
  DU(1), ME(1.5), DU(2), ME(2.5), [3, "dum", 2], [5, "tek", 2], [7, "tek", 1],
]; // s.37
// Aksak Semâî velvelesi: DÜM TE KE TEK KÂ TE KE DÜ ME DÜM TEEK TEK. Kaynak:
// Gönül "Türk Mûsikîsi Usûlleri" s.102 (temiz tipografik; Kudüm kitabi s.67
// capraz-referans). Curcuna ayni desendedir (ayni darp). F11.7.
const AKSAK_SEMAI_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 0.5], [3.5, "ka", 0.5],
  [4, "te", 0.5], [4.5, "ke", 0.5], DU(5, 0.5), ME(5.5, 0.5), [6, "dum", 2], [8, "tek", 2], [10, "tek", 1],
]; // Gonul s.102
// Oynak velvelesi (3+6): DÜM TEK TEK DÜM TE KE TEK KÂ TEK KÂ. Gonul s.102.
const OYNAK_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "tek", 1], [7, "ka", 1], [8, "tek", 1], [9, "ka", 1],
]; // Gonul s.102
// Nim Çember velvelesi (4+6+2): DÜM TE KE TEK KÂ DÜM DÜM TEK TE KE TEK KÂ TEK KÂ.
const NIM_CEMBER_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "dum", 1],
  [6, "dum", 1], [7, "tek", 1], [8, "te", 0.5], [8.5, "ke", 0.5], [9, "tek", 1], [10, "ka", 1], [11, "tek", 1], [12, "ka", 1],
]; // Gonul s.103
// Frenkçin velvelesi: DÜM DÜÜM DÜ ME DÜ ME DÜM TE KE TEK KÂ TEK KÂ.
const FRENKCIN_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "dum", 2], DU(4), ME(4.5), DU(5), ME(5.5), [6, "dum", 1],
  [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1], [10, "tek", 1], [11, "ka", 2],
]; // Gonul s.103
// Raksan velvelesi (Raksan 2, 5+5+5): uc esit grup (DÜM TE KE TEK KÂ TE KE).
const RAKSAN_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "dum", 1], [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1], [10, "te", 0.5], [10.5, "ke", 0.5],
  [11, "dum", 1], [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1], [15, "te", 0.5], [15.5, "ke", 0.5],
]; // Gonul s.104
// Lenk Fahte velvelesi (6+4): DÜM DÜM TE KE TEK KÂ DÜ ME TEK KÂ TEK KÂ.
// Darp-capali: DÜÜM->DÜM DÜM, TEEEK->TE KE TEK KÂ, DÜM->DÜ ME, kalan TEK KÂ.
const LENK_FAHTE_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 1], [5, "ka", 1],
  DU(6), ME(6.5), [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1],
]; // Gonul s.102
// Nim Hafif velvelesi (4+4+4+4): darp-capali 4 grup.
// DÜM TE KE TEK KÂ | DÜM TE KE TEK KÂ | DÜ ME DÜ ME TE KE TE KE | TEK KÂ DÜM TE KE TEK KÂ
const NIM_HAFIF_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  [5, "dum", 1], [6, "te", 0.5], [6.5, "ke", 0.5], [7, "tek", 1], [8, "ka", 1],
  DU(9), ME(9.5), DU(10), ME(10.5), [11, "te", 0.5], [11.5, "ke", 0.5], [12, "te", 0.5], [12.5, "ke", 0.5],
  [13, "tek", 0.5], [13.5, "ka", 0.5], [14, "dum", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "tek", 0.5], [16.5, "ka", 0.5],
]; // Gonul s.107
// Nim Berefşan velvelesi: DÜM TEK KÂ | DÜM TE KE TEK KÂ TE KE | DÜM TE KE |
// DÜ ME DÜ ME | TE KE TE KE TEK KÂ. Darp DÜM'lerine hizali (Gonul s.107).
const NIM_BERAFSAN_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], [3, "ka", 1],
  [4, "dum", 1], [5, "te", 0.5], [5.5, "ke", 0.5], [6, "tek", 1], [7, "ka", 1], [8, "te", 0.5], [8.5, "ke", 0.5],
  [9, "dum", 1], [10, "te", 0.5], [10.5, "ke", 0.5], DU(11), ME(11.5), DU(12), ME(12.5),
  [13, "te", 0.5], [13.5, "ke", 0.5], [14, "te", 0.5], [14.5, "ke", 0.5], [15, "tek", 1], [16, "ka", 1],
]; // Gonul s.107
// Fahte velvelesi (4+6+6+4): darp-capali. DÜM DÜ ME DÜM DÜM | TEK TE KE TEK KÂ
// TEK KÂ | DÜ ME DÜM TEK DÜ ME TE KE TEK KÂ | TEK KÂ TEK KÂ (Gonul s.105).
const FAHTE_VELVELE: Stroke[] = [
  [1, "dum", 1], DU(2), ME(2.5), [3, "dum", 1], [4, "dum", 1],
  [5, "tek", 1], [6, "te", 0.5], [6.5, "ke", 0.5], [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1],
  DU(11), ME(11.5), [12, "dum", 1], [13, "tek", 1], DU(14), ME(14.5), [15, "te", 0.5], [15.5, "ke", 0.5], [16, "tek", 0.5], [16.5, "ka", 0.5],
  [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1],
]; // Gonul s.105
// Çember velvelesi (4+4+6+6+4 = 4+Fahte): darp-capali. DÜM TE KE TEK KÂ |
// DÜM DÜ ME DÜM DÜM | TEK TE KE TEK KÂ TEK KÂ | DÜ ME DÜM TEK TE KE TEK KÂ |
// TEK KÂ TEK KÂ (Gonul s.106).
const CEMBER_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  [5, "dum", 1], DU(6), ME(6.5), [7, "dum", 1], [8, "dum", 1],
  [9, "tek", 1], [10, "te", 0.5], [10.5, "ke", 0.5], [11, "tek", 1], [12, "ka", 1], [13, "tek", 1], [14, "ka", 1],
  DU(15), ME(15.5), [16, "dum", 1], [17, "tek", 1], [18, "te", 0.5], [18.5, "ke", 0.5], [19, "tek", 1], [20, "ka", 1],
  [21, "tek", 1], [22, "ka", 1], [23, "tek", 1], [24, "ka", 1],
]; // Gonul s.106
const FAHTE: Stroke[] = [
  [1, "dum", 2], [3, "dum", 1], [4, "dum", 1], [5, "tek", 2], [7, "tek", 2],
  [9, "tek", 2], [11, "dum", 2], [13, "ta", 2], [15, "hek", 2],
  [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1],
]; // s.139 (1. sekil)
const CEMBER: Stroke[] = [
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "dum", 1], [8, "dum", 1],
  [9, "tek", 2], [11, "tek", 2], [13, "tek", 2], [15, "dum", 2],
  [17, "ta", 2], [19, "hek", 2], [21, "tek", 1], [22, "ka", 1], [23, "tek", 1], [24, "ka", 1],
]; // s.157
// Devr-i Kebîr velvelesi (6+4+4+6+4+4): darp-capali, Gonul s.108.
const DEVRI_KEBIR_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "tek", 1], DU(3), ME(3.5), [4, "dum", 1], [5, "tek", 1], [6, "te", 0.5], [6.5, "ke", 0.5],
  [7, "dum", 1], [8, "tek", 1], [9, "te", 0.5], [9.5, "ke", 0.5], [10, "dum", 1],
  [11, "tek", 2], [13, "tek", 2],
  [15, "hek", 1], [16, "tek", 2], [18, "hek", 1], [19, "te", 0.5], [19.5, "ke", 0.5], [20, "tek", 0.5], [20.5, "ka", 0.5],
  DU(21), ME(21.5), DU(22), ME(22.5), [23, "te", 0.5], [23.5, "ke", 0.5], [24, "te", 0.5], [24.5, "ke", 0.5],
  DU(25), ME(25.5), DU(26), ME(26.5), [27, "tek", 0.5], [27.5, "ka", 0.5], [28, "tek", 0.5], [28.5, "ka", 0.5],
]; // Gonul s.108
// Hafif velvelesi (4+4+4+4+4+4+4+4, 32/4): 8 grup, darp-capali. Gonul s.109.
// DÜM TE KE TEK KÂ | DÜM TE KE TEK KÂ | DÜ ME DÜ ME TEK KÂ | DÜM TE KE TEK KÂ |
// DÜ ME DÜ ME TEK KÂ | DÜM TE KE TEK KÂ | HEK TE KE TEK KÂ | TEK KÂ TEK KÂ
const HAFIF_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  [5, "dum", 1], [6, "te", 0.5], [6.5, "ke", 0.5], [7, "tek", 1], [8, "ka", 1],
  DU(9), ME(9.5), DU(10), ME(10.5), [11, "tek", 1], [12, "ka", 1],
  [13, "dum", 1], [14, "te", 0.5], [14.5, "ke", 0.5], [15, "tek", 1], [16, "ka", 1],
  DU(17), ME(17.5), DU(18), ME(18.5), [19, "tek", 1], [20, "ka", 1],
  [21, "dum", 1], [22, "te", 0.5], [22.5, "ke", 0.5], [23, "tek", 1], [24, "ka", 1],
  [25, "hek", 1], [26, "te", 0.5], [26.5, "ke", 0.5], [27, "tek", 1], [28, "ka", 1],
  [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // Gonul s.109
const DEVRI_KEBIR: Stroke[] = [
  [1, "dum", 2], [3, "dum", 2], [5, "tek", 2], [7, "dum", 1], [8, "tek", 1],
  [9, "te", 0.5], [9.5, "ke", 0.5], [10, "dum", 1], [11, "tek", 2], [13, "tek", 2],
  [15, "tek", 2], [17, "dum", 2], [19, "dum", 2], [21, "ta", 2], [23, "hek", 2],
  [25, "tek", 1], [26, "ka", 1], [27, "tek", 1], [28, "ka", 1],
]; // s.181 (1. sekil)
const BERAFSAN: Stroke[] = [
  [1, "dum", 4], [5, "tek", 2], [7, "dum", 4], [11, "tek", 2], [13, "dum", 4],
  [17, "dum", 2], [19, "tek", 2], [21, "dum", 2], [23, "dum", 2],
  [25, "ta", 2], [27, "hek", 2], [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // s.208
const BEREFSAN_VELVELE: Stroke[] = [
  // 1. satir (16): Düüm Düüm Teek | te ke te ke | tek kâ tek kâ | Dü Me | dü me dü me
  [1, "dum", 2, "Düüm"], [3, "dum", 2, "Düüm"], [5, "tek", 2, "Teek"],
  [7, "te", 0.5], [7.5, "ke", 0.5], [8, "te", 0.5], [8.5, "ke", 0.5],
  [9, "tek", 1], [10, "ka", 1], [11, "tek", 1], [12, "ka", 1],
  DU(13, 1), ME(14, 1), DU(15), ME(15.5), DU(16), ME(16.5),
  // 2. satir (16): te ke te ke | tek kâ tek kâ | Heek Hek | te ke | tek kâ tek kâ tek kâ
  [17, "te", 0.5], [17.5, "ke", 0.5], [18, "te", 0.5], [18.5, "ke", 0.5],
  [19, "tek", 1], [20, "ka", 1], [21, "tek", 1], [22, "ka", 1],
  [23, "hek", 2, "Heek"], [25, "hek", 1, "Hek"], [26, "te", 0.5], [26.5, "ke", 0.5],
  [27, "tek", 1], [28, "ka", 1], [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // Gonul s.110
const MUHAMMES: Stroke[] = [
  // 8+8+8+8 (Kâr, Beste ve Pesrevlerde)
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 2],
  [9, "dum", 2], [11, "dum", 2], [13, "tek", 2], [15, "tek", 1], [16, "ka", 1],
  [17, "dum", 2], [19, "tek", 2], [21, "tek", 1], [22, "ka", 1], [23, "dum", 2],
  [25, "ta", 2], [27, "hek", 2], [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // Gonul s.110
const MUHAMMES_VELVELE: Stroke[] = [
  // 1. satir (16): Düm Düm Tek | te ke | tek kâ tek kâ | Dü Me | dü me dü me | tek kâ tek kâ
  [1, "dum", 1, "Düm"], [2, "dum", 1, "Düm"], [3, "tek", 1],
  [4, "te", 0.5], [4.5, "ke", 0.5], [5, "tek", 1], [6, "ka", 1], [7, "tek", 1], [8, "ka", 1],
  DU(9, 1), ME(10, 1), DU(11), ME(11.5), DU(12), ME(12.5),
  [13, "tek", 1], [14, "ka", 1], [15, "tek", 1], [16, "ka", 1],
  // 2. satir (16): Heek Heek Hek | te ke | tek kâ | dü me dü me | te ke te ke | tek kâ tek kâ
  [17, "hek", 2, "Heek"], [19, "hek", 2, "Heek"], [21, "hek", 1, "Hek"],
  [22, "te", 0.5], [22.5, "ke", 0.5], [23, "tek", 1], [24, "ka", 1],
  DU(25), ME(25.5), DU(26), ME(26.5),
  [27, "te", 0.5], [27.5, "ke", 0.5], [28, "te", 0.5], [28.5, "ke", 0.5],
  [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
]; // Gonul s.110
const DEVRI_REVAN: Stroke[] = [
  // 3+4+3+4 (14/8, Mevlevi): Düüüm Düüm Teek | Düüüm Teek Teek
  [1, "dum", 3], [4, "dum", 2], [6, "tek", 2], [8, "dum", 3], [11, "tek", 2], [13, "tek", 2],
]; // s.101 (Kudum) + Gonul s.104
const DEVRI_REVAN_VELVELE: Stroke[] = [
  // 3+4+3+4 (14/8, birim sekizlik): Düm Tek Kâ | Dü Me Tek Kâ | dü me Dü Me | Tek Kâ Tek Kâ
  [1, "dum", 1, "Düm"], [2, "tek", 1], [3, "ka", 1],
  DU(4, 1), ME(5, 1), [6, "tek", 1], [7, "ka", 1],
  DU(8), ME(8.5), DU(9, 1), ME(10, 1),
  [11, "tek", 1], [12, "ka", 1], [13, "tek", 1], [14, "ka", 1],
]; // Gonul s.104
const DARBITURKI: Stroke[] = [
  // 6+4+4+4 (Gonul s.105): Teek Tek Kâ Tek Kâ | Düüm Düüm | Teek Tek Kâ | Düüm Düm Düm
  [1, "tek", 2], [3, "tek", 1], [4, "ka", 1], [5, "tek", 1], [6, "ka", 1],
  [7, "dum", 2], [9, "dum", 2], [11, "tek", 2], [13, "tek", 1], [14, "ka", 1],
  [15, "dum", 2], [17, "dum", 1], [18, "dum", 1],
]; // Gonul s.105
const TURKI_DARB_VELVELE: Stroke[] = [
  // 6+4+4+4 (18/4): Tek te ke Tek Kâ Tek Kâ | Düm dü me Düm te ke | Düm te ke Tek Kâ | Düm dü me Düm Düm
  [1, "tek", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "tek", 1], [6, "ka", 1],
  [7, "dum", 1], DU(8), ME(8.5), [9, "dum", 1], [10, "te", 0.5], [10.5, "ke", 0.5],
  [11, "dum", 1], [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1],
  [15, "dum", 1], DU(16), ME(16.5), [17, "dum", 1], [18, "dum", 1],
]; // Gonul s.106
const NIM_DEVIR: Stroke[] = [
  // 6+4+4+4 (18/4): Düüm Düüm Teek | Düüm Düüm | Tââ Heek | Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "dum", 2], [5, "tek", 2], [7, "dum", 2], [9, "dum", 2],
  [11, "ta", 2], [13, "hek", 2], [15, "tek", 1], [16, "ka", 1], [17, "tek", 1], [18, "ka", 1],
]; // Gonul s.106
const NIM_DEVIR_VELVELE: Stroke[] = [
  // 18/4: Düm te ke Düm Tâ Hek | te ke Dü Me Düm Tâ Hek | te ke Tek Kâ Tek Kâ Tek Kâ
  [1, "dum", 1, "Düm"], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "dum", 1, "Düm"], [4, "ta", 1], [5, "hek", 1],
  [6, "te", 0.5], [6.5, "ke", 0.5], DU(7, 1), ME(8, 1), [9, "dum", 1, "Düm"], [10, "ta", 1], [11, "hek", 1],
  [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1], [15, "tek", 1], [16, "ka", 1], [17, "tek", 1], [18, "ka", 1],
]; // Gonul s.106
// Cifte Duyek (16/4) — Gonul darp'i "iki duyek ardarda"dan (CIFTE_DUYEK, zincir
// bileseni) FARKLI okunur; yeni usul icin Gonul s.105 dizgisi kullanilir.
const CIFTE_DUYEK_16: Stroke[] = [
  // 8+8 (Gonul s.105): Düüm Teeeek(bagli 4) Teek | Düüm Düüm Teek Tek Kâ
  [1, "dum", 2], [3, "tek", 4], [7, "tek", 2], [9, "dum", 2], [11, "dum", 2], [13, "tek", 2], [15, "tek", 1], [16, "ka", 1],
]; // Gonul s.105
const CIFTE_DUYEK_VELVELE: Stroke[] = [
  // 16/4 (Velvele-1): Düm te ke Tek Kâ | te ke Tek Kâ | te ke Dü Me dü me | Düm Tek te ke Tek Kâ
  [1, "dum", 1, "Düm"], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  [5, "te", 0.5], [5.5, "ke", 0.5], [6, "tek", 1], [7, "ka", 1],
  [8, "te", 0.5], [8.5, "ke", 0.5], DU(9, 1), ME(10, 1), DU(11), ME(11.5),
  [12, "dum", 1, "Düm"], [13, "tek", 1], [14, "te", 0.5], [14.5, "ke", 0.5], [15, "tek", 1], [16, "ka", 1],
]; // Gonul s.105 (Velvele-1)
const FERI_MUHAMMES: Stroke[] = [
  // 4+4+4+4 (16/4): Düüm Tek Kâ | Düüm Teek | Düm Tek dü me Düm | Tâ Hek te ke te ke
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 2],
  [9, "dum", 1], [10, "tek", 1], DU(11), ME(11.5), [12, "dum", 1],
  [13, "ta", 1], [14, "hek", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "te", 0.5], [16.5, "ke", 0.5],
]; // Gonul s.104
const FERI_MUHAMMES_VELVELE: Stroke[] = [
  // 16/4: Düm Düm Tek te ke | Tek Kâ Tek Kâ | dü me dü me te ke te ke | Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "dum", 1], [3, "tek", 1], [4, "te", 0.5], [4.5, "ke", 0.5],
  [5, "tek", 1], [6, "ka", 1], [7, "tek", 1], [8, "ka", 1],
  DU(9), ME(9.5), DU(10), ME(10.5), [11, "te", 0.5], [11.5, "ke", 0.5], [12, "te", 0.5], [12.5, "ke", 0.5],
  [13, "tek", 1], [14, "ka", 1], [15, "tek", 1], [16, "ka", 1],
]; // Gonul s.104
const NIM_EVSAT: Stroke[] = [
  // 5+4+4 (13/8, birim sekizlik): Tek Kâ Tek Kââ | Düüüüm | Düüüüm
  [1, "tek", 1], [2, "ka", 1], [3, "tek", 1], [4, "ka", 2], [6, "dum", 4], [10, "dum", 4],
]; // Gonul s.104
const NIM_EVSAT_VELVELE: Stroke[] = [
  // 5+4+4 (13/8): Tek Kâ Tek Kâ te ke | Düm te ke Tek Kâ | dü me Düm Tek te ke
  [1, "tek", 1], [2, "ka", 1], [3, "tek", 1], [4, "ka", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "dum", 1], [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1],
  DU(10), ME(10.5), [11, "dum", 1], [12, "tek", 1], [13, "te", 0.5], [13.5, "ke", 0.5],
]; // Gonul s.104
const SARKI_DEVRI_REVAN: Stroke[] = [
  // 3+4+4+2 (13/8): Düm Tek Kâ | Düüm Teek | Düüm Teek | Tek Kâ
  [1, "dum", 1], [2, "tek", 1], [3, "ka", 1], [4, "dum", 2], [6, "tek", 2],
  [8, "dum", 2], [10, "tek", 2], [12, "tek", 1], [13, "ka", 1],
]; // Gonul s.104
const SARKI_DEVRI_REVAN_VELVELE: Stroke[] = [
  // 3+4+4+2 (13/8): Düm Tek Kâ | Düm te ke Tek Kâ | dü me Düm Teek | Tek Kâ
  [1, "dum", 1], [2, "tek", 1], [3, "ka", 1], [4, "dum", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "tek", 1], [7, "ka", 1], DU(8), ME(8.5), [9, "dum", 1], [10, "tek", 2], [12, "tek", 1], [13, "ka", 1],
]; // Gonul s.104
const BEKTASI_DEVRI_REVAN: Stroke[] = [
  // 4+5+4 (13/8): Düüm Tek Kâ | Düüm Teek Tek | Düüm Tek Kâ
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 2], [9, "tek", 1],
  [10, "dum", 2], [12, "tek", 1], [13, "ka", 1],
]; // Gonul s.104
const BEKTASI_DEVRI_REVAN_VELVELE: Stroke[] = [
  // 4+5+4 (13/8): Düm te ke Tek Kâ | dü me Düm Teek | te ke Düm te ke Tek Kâ
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "tek", 2], [9, "te", 0.5], [9.5, "ke", 0.5],
  [10, "dum", 1], [11, "te", 0.5], [11.5, "ke", 0.5], [12, "tek", 1], [13, "ka", 1],
]; // Gonul s.104
const TEK_VURUS: Stroke[] = [
  // 5+6 (11/8): Düüm Teek Tek | Düüm Teek Teek
  [1, "dum", 2], [3, "tek", 2], [5, "tek", 1], [6, "dum", 2], [8, "tek", 2], [10, "tek", 2],
]; // Gonul s.103
const TEK_VURUS_VELVELE: Stroke[] = [
  // 5+6 (11/8): Düm te ke Tek Kâ te ke | Düm te ke Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "dum", 1], [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1], [10, "tek", 1], [11, "ka", 1],
]; // Gonul s.103
const IKIZ_AKSAK: Stroke[] = [
  // 7+5 (12/8): Düm Tek Tek Düüm Teek | Düüm Teek Tek
  [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "tek", 2],
  [8, "dum", 2], [10, "tek", 2], [12, "tek", 1],
]; // Gonul s.103
const IKIZ_AKSAK_VELVELE: Stroke[] = [
  // 7+5 (12/8): Düm Tek Tek Düm te ke Tek Kâ | dü me Düm Teek Tek
  [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 1], [5, "te", 0.5], [5.5, "ke", 0.5], [6, "tek", 1], [7, "ka", 1],
  DU(8), ME(8.5), [9, "dum", 1], [10, "tek", 2], [12, "tek", 1],
]; // Gonul s.103
const CENGI_HARBI: Stroke[] = [
  // 2+2+3+3 (10/4): Düm Tek | Düm Tek | Düm Tek Tek | Düm Tek Tek
  [1, "dum", 1], [2, "tek", 1], [3, "dum", 1], [4, "tek", 1], [5, "dum", 1],
  [6, "tek", 1], [7, "tek", 1], [8, "dum", 1], [9, "tek", 1], [10, "tek", 1],
]; // Gonul s.103 (velvelesiz — mehter usulu)
const NIM_SAKIL: Stroke[] = [
  // 4+6+6+4+4 (24/4, Ver.1): Düüm Tek Kâ | Düüm Tek Kâ Tek Kâ | Düüm Tek Kâ te ke Düm | Taa Heek | Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1],
  [11, "dum", 2], [13, "tek", 1], [14, "ka", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "dum", 1],
  [17, "ta", 2], [19, "hek", 2], [21, "tek", 1], [22, "ka", 1], [23, "tek", 1], [24, "ka", 1],
]; // Gonul s.107 (Ver.1)
const NIM_SAKIL_VELVELE: Stroke[] = [
  // 4+6+6+4+4 (24/4, Velvele 1): darp gruplarina dosum
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "tek", 1], [8, "te", 0.5], [8.5, "ke", 0.5], [9, "tek", 1], [10, "ka", 1],
  [11, "dum", 1], [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1], DU(15), ME(15.5), [16, "dum", 1],
  [17, "tek", 1], [18, "te", 0.5], [18.5, "ke", 0.5], [19, "tek", 1], [20, "ka", 1],
  [21, "tek", 1], [22, "ka", 1], [23, "tek", 1], [24, "ka", 1],
]; // Gonul s.107 (Velvele 1)
const EVSAT: Stroke[] = [
  // 5+4+4+5+4+4 (26/4): Tek Kâ Tek Kââ | Düüm Teek | Düüm Düüm | Teek Tek Kââ | Düüüüm | Düüüüm
  [1, "tek", 1], [2, "ka", 1], [3, "tek", 1], [4, "ka", 2], [6, "dum", 2], [8, "tek", 2],
  [10, "dum", 2], [12, "dum", 2], [14, "tek", 2], [16, "tek", 1], [17, "ka", 2],
  [19, "dum", 4], [23, "dum", 4],
]; // Gonul s.107
const EVSAT_VELVELE: Stroke[] = [
  // 5+4+4+5+4+4 (26/4): Düm Düm te ke Tek Kâ | dü me dü me te ke te ke | Tek Kâ Tek Kâ |
  //                     Tek Kâ dü me dü me dü me | Tek Kâ Tek Kâ | Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 1], [5, "ka", 1],
  DU(6), ME(6.5), DU(7), ME(7.5), [8, "te", 0.5], [8.5, "ke", 0.5], [9, "te", 0.5], [9.5, "ke", 0.5],
  [10, "tek", 1], [11, "ka", 1], [12, "tek", 1], [13, "ka", 1],
  [14, "tek", 1], [15, "ka", 1], DU(16), ME(16.5), DU(17), ME(17.5), DU(18), ME(18.5),
  [19, "tek", 1], [20, "ka", 1], [21, "tek", 1], [22, "ka", 1],
  [23, "tek", 1], [24, "ka", 1], [25, "tek", 1], [26, "ka", 1],
]; // Gonul s.107
const BESTE_DEVRI_REVAN: Stroke[] = [
  // 5+4+4+5+4+4 (26/4): Düüüüüm(5) Düüüüm(4) Teeeek(4) Düüüüüm(5) Teeeek(4) Teeeek(4)
  [1, "dum", 5], [6, "dum", 4], [10, "tek", 4], [14, "dum", 5], [19, "tek", 4], [23, "tek", 4],
]; // Gonul s.108
const BESTE_DEVRI_REVAN_VELVELE: Stroke[] = [
  // 5+4+4+5+4+4 (26/4): her grup Düm/Hek te ke Tek Kâ (+te ke) dolgusu; G3/G6 Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1], [5, "te", 0.5], [5.5, "ke", 0.5],
  [6, "dum", 1], [7, "te", 0.5], [7.5, "ke", 0.5], [8, "tek", 1], [9, "ka", 1],
  [10, "tek", 1], [11, "ka", 1], [12, "tek", 1], [13, "ka", 1],
  [14, "dum", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "tek", 1], [17, "ka", 1], [18, "te", 0.5], [18.5, "ke", 0.5],
  [19, "hek", 1], [20, "te", 0.5], [20.5, "ke", 0.5], [21, "tek", 1], [22, "ka", 1],
  [23, "tek", 1], [24, "ka", 1], [25, "tek", 1], [26, "ka", 1],
]; // Gonul s.108
const REMEL: Stroke[] = [
  // 4+6+4+6+2+4+2 (28/4): Düüm Tek Kâ | Düüm Tek Kâ Tek Kâ | Düüm Tek Kâ | Düüm Düüm Teek | Dü Me | Düm Düm Teek | Tek Kâ
  [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1],
  [11, "dum", 2], [13, "tek", 1], [14, "ka", 1], [15, "dum", 2], [17, "dum", 2], [19, "tek", 2],
  DU(21, 1), ME(22, 1), [23, "dum", 1], [24, "dum", 1], [25, "tek", 2], [27, "tek", 1], [28, "ka", 1],
]; // Gonul s.109
const REMEL_VELVELE: Stroke[] = [
  // 28/4: Düm Düm te ke te ke Tek Kâ Tek Kâ | dü me dü me te ke te ke Tek Kâ Tek Kâ | Heek Heek Hek te ke Tek Kâ Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "te", 0.5], [4.5, "ke", 0.5], [5, "tek", 1], [6, "ka", 1], [7, "tek", 1], [8, "ka", 1],
  DU(9), ME(9.5), DU(10), ME(10.5), [11, "te", 0.5], [11.5, "ke", 0.5], [12, "te", 0.5], [12.5, "ke", 0.5], [13, "tek", 1], [14, "ka", 1], [15, "tek", 1], [16, "ka", 1],
  [17, "hek", 2], [19, "hek", 2], [21, "hek", 1], [22, "te", 0.5], [22.5, "ke", 0.5], [23, "tek", 1], [24, "ka", 1], [25, "tek", 1], [26, "ka", 1], [27, "tek", 1], [28, "ka", 1],
]; // Gonul s.109
const FRENGIFER: Stroke[] = [
  // 6+6+4+4+4+4 (28/4): Düm Düüüüm | Düüm Düüüüm | Düüm Teek | Düüm Düüm | Taa Heek | Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "dum", 4], [7, "dum", 2], [9, "dum", 4], [13, "dum", 2], [15, "tek", 2],
  [17, "dum", 2], [19, "dum", 2], [21, "ta", 2], [23, "hek", 2], [25, "tek", 1], [26, "ka", 1], [27, "tek", 1], [28, "ka", 1],
]; // Gonul s.109
const FRENGIFER_VELVELE: Stroke[] = [
  // 6+6+4+4+4+4 (28/4): G1/G2 Düüm Düm te ke Tek Kâ; G3+G4 ve G5+G6 = Dü Me dü me dü me Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "dum", 1], [4, "te", 0.5], [4.5, "ke", 0.5], [5, "tek", 1], [6, "ka", 1],
  [7, "dum", 2], [9, "dum", 1], [10, "te", 0.5], [10.5, "ke", 0.5], [11, "tek", 1], [12, "ka", 1],
  DU(13, 1), ME(14, 1), DU(15), ME(15.5), DU(16), ME(16.5), [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1],
  DU(21, 1), ME(22, 1), DU(23), ME(23.5), DU(24), ME(24.5), [25, "tek", 1], [26, "ka", 1], [27, "tek", 1], [28, "ka", 1],
]; // Gonul s.109
const HEZEC: Stroke[] = [
  // 6+4+4+4+4 (22/4): Düüm Düm Düm Teek | Düm Düm Teek | Düüm Teek | Düüm Teek | Tek Kâ Tek Kâ
  [1, "dum", 2], [3, "dum", 1], [4, "dum", 1], [5, "tek", 2], [7, "dum", 1], [8, "dum", 1], [9, "tek", 2],
  [11, "dum", 2], [13, "tek", 2], [15, "dum", 2], [17, "tek", 2], [19, "tek", 1], [20, "ka", 1], [21, "tek", 1], [22, "ka", 1],
]; // Gonul s.106
const HEZEC_VELVELE: Stroke[] = [
  // 6+4+4+4+4 (22/4): Düm Düm te ke te ke Tek Kâ | dü me dü me te ke te ke | Tek Kâ te ke | Tek Kâ te ke | Tek Kâ Tek Kâ Tek Kâ
  [1, "dum", 1], [2, "dum", 1], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "te", 0.5], [4.5, "ke", 0.5], [5, "tek", 1], [6, "ka", 1],
  DU(7), ME(7.5), DU(8), ME(8.5), [9, "te", 0.5], [9.5, "ke", 0.5], [10, "te", 0.5], [10.5, "ke", 0.5],
  [11, "tek", 1], [12, "ka", 1], [13, "te", 0.5], [13.5, "ke", 0.5], [14, "tek", 1], [15, "ka", 1], [16, "te", 0.5], [16.5, "ke", 0.5],
  [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1], [21, "tek", 1], [22, "ka", 1],
]; // Gonul s.106

export const USUL_DATA: Usul[] = [
  // --- Kucuk usuller ---
  makeUsul("nimsofyan", "Nimsofyan", "Nimsofyan", 2, "4", [[1, "dum", 1], [2, "tek", 1]],
    [[1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5]]), // s.11
  makeUsul("yuruksofyan", "Yürük Sofyan", "Yuruk Sofyan", 2, "4", [[1, "dum", 1], [2, "tek", 1]],
    [[1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5]]), // Ozalp/Karadeniz: Nim Sofyan'in diger adi (Yürük/Tek Sofyan)
  makeUsul("semai", "Semai", "Semai", 3, "4", [[1, "dum", 1], [2, "tek", 1], [3, "tek", 1]],
    [[1, "dum", 1], [2, "tek", 1], [3, "te", 0.5], [3.5, "ke", 0.5]]), // s.15
  makeUsul("sofyan", "Sofyan", "Sofyan", 4, "4", [[1, "dum", 2], [3, "te", 1], [4, "ke", 1]],
    [[1, "dum", 2], [3, "te", 0.5], [3.5, "ke", 0.5], [4, "tek", 0.5], [4.5, "ka", 0.5]]), // s.18
  makeUsul("turkaksagi", "Türk Aksağı", "Turkish Aksak", 5, "8", [[1, "dum", 2], [3, "tek", 2], [5, "tek", 1]],
    [DU(1), ME(1.5), [2, "dum", 1], [3, "hek", 1], [4, "tek", 2]]), // s.20
  makeUsul("zafer", "Zafer", "Zafer", 5, "8", [[1, "dum", 1], [2, "tek", 2], [4, "dum", 1], [5, "tek", 1]],
    [[1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 1.5], [4, "dum", 1], [5, "tek", 1]]), // s.23
  makeUsul("yuruksemai", "Yürüksemâî", "Yuruk Semai", 6, "8", YURUK_SEMAI, YURUK_SEMAI_VELVELE), // s.25
  makeUsul("senginsemai", "Sengin Semai", "Sengin Semai", 6, "4", YURUK_SEMAI, YURUK_SEMAI_VELVELE), // s.25: YS 2. mertebesi
  makeUsul("agirsemai", "Ağır Semai", "Agir Semai", 6, "2", YURUK_SEMAI, YURUK_SEMAI_VELVELE), // s.25: YS 3. mertebesi (agir semai)
  makeUsul("agirsenginsemai", "Ağır Sengin Semai", "Agir Sengin Semai", 6, "2", YURUK_SEMAI, YURUK_SEMAI_VELVELE), // Sengin Semai ailesi 6/2 mertebe; ayni darp
  makeUsul("darb", "Darb", "Darb", 6, "4", [[1, "dum", 2], [3, "tek", 2], [5, "tek", 2]]), // s.29
  makeUsul("devirhindi", "Devr-i Hindi", "Devr-i Hindi", 7, "8", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "tek", 2],
  ], DEVRI_HINDI_VELVELE), // s.34
  makeUsul("devirituran", "Devr-i Turan", "Devr-i Turan", 7, "8", [
    [1, "dum", 2], [3, "tek", 2], [5, "tek", 3],
  ], DEVRI_TURAN_VELVELE), // s.37 (yaygin mertebesi 7/16; 7/8 de gosterilir)
  makeUsul("duyek", "Düyek", "Duyek", 8, "8", DUYEK, DUYEK_VELVELE), // s.40 (birinci mertebe 8/8)
  makeUsul("agirduyek", "Ağırdüyek", "Agir Duyek", 8, "4", DUYEK, DUYEK_VELVELE), // s.40: duyek 2. mertebesi
  makeUsul("musemmen", "Müsemmen", "Musemmen", 8, "8", MUSEMMEN, MUSEMMEN_VELVELE), // s.44
  makeUsul("musemmenii", "Müsemmen II", "Musemmen II", 8, "8", MUSEMMEN, MUSEMMEN_VELVELE), // TDV: Musemmen kanonik 8/8; 2. mertebe etiketi ayni darp
  makeUsul("katikofti", "Katıkofti", "Katikofti", 8, "8", MUSEMMEN, MUSEMMEN_VELVELE), // Adana Musiki Dernegi ?pnum=363: "Müsemmen (Katakofti)" = ayni usul
  makeUsul("aksak", "Aksak", "Aksak", 9, "8", AKSAK, AKSAK_VELVELE), // s.47
  makeUsul("ciftesofyan", "Çiftesofyan", "Cifte Sofyan", 9, "8", AKSAK, AKSAK_VELVELE), // s.46: aksagin yurukce vurulusu
  makeUsul("agiraksak", "Ağır Aksak", "Agir Aksak", 9, "4", AKSAK, AKSAK_VELVELE), // s.46-47: aksak 2. mertebesi
  makeUsul("evfer", "Evfer", "Evfer", 9, "8", EVFER, EVFER_VELVELE), // s.53: aksaktan farki son iki tek'in deger degisimi
  makeUsul("agirevfer", "Ağır Evfer", "Agir Evfer", 9, "4", EVFER, EVFER_VELVELE), // TDV evfer: 2. mertebe 9/4 (= Mevlevi evferi)
  makeUsul("mevlevievferi", "Mevlevî Evferi", "Mevlevi Evferi", 9, "4", EVFER, EVFER_VELVELE), // TDV: 2. mertebeye agir evfer/Mevlevi evferi denir; Mevlevi ayini 2./4. selam
  makeUsul("raksaksagi", "Raks Aksağı", "Raks Aksagi", 9, "8", [
    [1, "dum", 2], [3, "tek", 3], [6, "dum", 2], [8, "tek", 2], // Düüm Teeek Düüm Teek (2+3+2+2)
  ]), // TDV raks-aksagi + dergipark: 2+3+2+2; velvele kaynakta net cikarilamadi -> darp-only
  makeUsul("aydin", "Aydın", "Aydin", 9, "8", [
    [1, "dum", 2], [3, "tek", 2], [5, "dum", 2], [7, "tek", 3], // Düüm Teek Düüm Teeek (2+2+2+3)
  ]), // usuller.com (Devr-i Bendir) nota gorseli + SymbTr 9/8; velvele net degerlenmedi -> darp-only
  makeUsul("oynak", "Oynak", "Oynak", 9, "8", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "tek", 2], [8, "tek", 2],
  ], OYNAK_VELVELE), // s.63 (darp) + Gonul s.102 (velvele)
  makeUsul("aksaksemai", "Aksaksemâî", "Aksak Semai", 10, "8", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // s.67
  makeUsul("agiraksaksemai", "Ağır Aksak Semâî", "Agir Aksak Semai", 10, "4", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // Adana ?pnum=369: Aksak Semai'nin 10/4 agir mertebesi, ayni darp
  makeUsul("aksaksemaiii", "Aksak Semâî III", "Aksak Semai III", 10, "2", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // Aksak Semai 3. mertebe (10/2), ayni darp
  makeUsul("aksaksemaievferi", "Aksaksemâî Evferi", "Aksak Semai Evferi", 10, "8", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // SymbTr .mu2 duzum=212221 = Aksak Semai darpi birebir; ayni darp
  // Curcuna = 10/8 (gercek notasyon). Kitap (s.66) onu Aksak Semai'nin 10/16
  // mertebesi sayar ama SymbTr v3 korpusundaki curcuna eserlerinin TAMAMI 10/8
  // notalidir; pedagoji de 10/8 der (darp: 3+2+2+3 = Düm2 Te1 Kâ2 Düm2 Tek2
  // Tek1, Aksak Semai ile ayni desen — kaynaklar ikisini esitler; curcuna
  // livelier/hizli karakterdir). 10/16 curcuna'yi 2x hizli caliyordu.
  makeUsul("curcuna", "Curcuna", "Curcuna", 10, "8", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // s.66-67 + korpus 10/8
  makeUsul("devrisureyyasofyani", "Devr-i Süreyyâ Sofyanî", "Devr-i Sureyya Sofyani", 10, "16", [[1, "dum", 5], [6, "tek", 2], [8, "tek", 3]]), // SymbTr clustering [5,2,3] otoriter (onceki Curcuna esitlemesi ritimle celisiyordu); darp yapisal
  makeUsul("lenkfahte", "Lenk Fahte", "Lenk Fahte", 10, "4", [
    [1, "dum", 2], [3, "tek", 3], [6, "dum", 1], [7, "tek", 2], [9, "te", 1], [10, "ke", 1],
  ], LENK_FAHTE_VELVELE), // s.76 (darp) + Gonul s.102 (velvele)
  makeUsul("cengiharbi", "Çeng-i Harbî", "Cengi Harbi", 10, "4", CENGI_HARBI), // Gonul s.103 (2+2+3+3); velvelesiz mehter usulu, korpusta repertuvari var
  makeUsul("tekvurus", "Tek Vuruş", "Tek Vurus", 11, "8", TEK_VURUS, TEK_VURUS_VELVELE), // Gonul s.103 (5+6); korpusta repertuvari var
  makeUsul("frenkcin", "Frenkçin", "Frenkcin", 12, "4", [
    [1, "dum", 1], [2, "dum", 2], [4, "dum", 1], [5, "dum", 2],
    [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1], [11, "tek", 1], [12, "ka", 1],
  ], FRENKCIN_VELVELE), // s.85 (darp) + Gonul s.103 (velvele)
  makeUsul("nimcember", "Nim Çember", "Nim Cember", 12, "8", [
    [1, "dum", 2], [3, "te", 1], [4, "ke", 1], [5, "dum", 2],
    [7, "ta", 2], [9, "hek", 2], [11, "te", 1], [12, "ke", 1],
  ], NIM_CEMBER_VELVELE), // s.90 (darp) + Gonul s.103 (velvele)
  makeUsul("ikizaksak", "İkiz Aksak", "Ikiz Aksak", 12, "8", IKIZ_AKSAK, IKIZ_AKSAK_VELVELE), // Gonul s.103 (7+5); korpusta repertuvari var
  makeUsul("nimevsat", "Nim Evsat", "Nim Evsat", 13, "8", NIM_EVSAT, NIM_EVSAT_VELVELE), // Gonul s.104 (5+4+4); korpusta repertuvari var
  makeUsul("sarkidevrirevani", "Şarkı Devr-i Revânî", "Sarki Devr-i Revani", 13, "8", SARKI_DEVRI_REVAN, SARKI_DEVRI_REVAN_VELVELE), // Gonul s.104 (3+4+4+2)
  makeUsul("bektasidevrirevani", "Bektâşî Devr-i Revânî", "Bektasi Devr-i Revani", 13, "8", BEKTASI_DEVRI_REVAN, BEKTASI_DEVRI_REVAN_VELVELE), // Gonul s.104 (4+5+4)
  makeUsul("devrirevan", "Devrirevan", "Devr-i Revan", 14, "8", DEVRI_REVAN, DEVRI_REVAN_VELVELE), // s.101 (darp, Mevlevi) + Gonul s.104 (velvele)
  makeUsul("ayindevrirevani", "Âyin Devr-i Revânî", "Ayin Devr-i Revani", 14, "8", DEVRI_REVAN, DEVRI_REVAN_VELVELE), // Mevlevi ayinlerinde ayni devr-i revan; korpusta ayri repertuvar
  makeUsul("devrirevanihindi", "Devr-i Revân-ı Hindî", "Devr-i Revan-i Hindi", 14, "8", DEVRI_REVAN, DEVRI_REVAN_VELVELE), // Devr-i Revan'in Hindi alt-turu (14/8, 12 eser); ayni Devr-i Revan darpi
  makeUsul("raksan", "Raksan", "Raksan", 15, "8", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "te", 1], [7, "ka", 2],
    [9, "dum", 2], [11, "tek", 2], [13, "te", 1], [14, "ka", 2],
  ], RAKSAN_VELVELE), // s.103 (darp) + Gonul s.104 (velvele, Raksan 2)
  // --- Buyuk usuller ---
  makeUsul("nimberafsan", "Nim Berafsan", "Nim Berefsan", 16, "4", [
    [1, "dum", 2], [3, "tek", 1], [4, "dum", 2], [6, "tek", 1], [7, "dum", 2],
    [9, "dum", 1], [10, "tek", 1], [11, "dum", 1], [12, "dum", 1], [13, "tek", 2],
    [15, "tek", 1], [16, "ka", 1],
  ], NIM_BERAFSAN_VELVELE), // s.121 (darp) + Gonul s.107 (velvele)
  makeUsul("nimhafif", "Nim Hafif", "Nim Hafif", 16, "4", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 2], [5, "dum", 1], [6, "tek", 1], [7, "tek", 2],
    [9, "dum", 1], [10, "tek", 1], [11, "dum", 1], [12, "dum", 1],
    [13, "ta", 1], [14, "hek", 1], [15, "te", 0.5], [15.5, "ke", 0.5], [16, "te", 0.5], [16.5, "ke", 0.5],
  ], NIM_HAFIF_VELVELE), // s.227 (darp) + Gonul s.107 (velvele)
  makeUsul("darbiturki", "Darb-ı Türkı", "Darb-i Turki", 18, "4", DARBITURKI, TURKI_DARB_VELVELE), // Gonul s.105 (darp 6+4+4+4) + s.106 (velvele)
  makeUsul("turkdarbi", "Türk Darbı", "Turk Darbi", 18, "4", DARBITURKI, TURKI_DARB_VELVELE), // Türk Darbı = Darb-ı Türkî (ayni usul, kelime sirasi)
  makeUsul("cifteduyek", "Çifte Düyek", "Cifte Duyek", 16, "4", CIFTE_DUYEK_16, CIFTE_DUYEK_VELVELE), // Gonul s.105 (8+8); korpusta repertuvari var
  makeUsul("ferimuhammes", "Fer'î Muhammes", "Feri Muhammes", 16, "4", FERI_MUHAMMES, FERI_MUHAMMES_VELVELE), // Gonul s.104 (4+4+4+4)
  makeUsul("fer", "Fer", "Fer", 16, "4", FERI_MUHAMMES, FERI_MUHAMMES_VELVELE), // Gonul s.104: Fer = Fer'î Muhammes (ayni desen)
  makeUsul("nimdevir", "Nim Devir", "Nim Devir", 18, "4", NIM_DEVIR, NIM_DEVIR_VELVELE), // Gonul s.106 (6+4+4+4); korpusta repertuvari var

  makeUsul("fahte", "Fahte", "Fahte", 20, "4", FAHTE, FAHTE_VELVELE), // s.139 (darp) + Gonul s.105
  // Durak Evferi = Türk Aksağı(5) + 4 Sofyan(16) = 21 (TDV + sufi.gen.tr belgeli
  // yapi). Bilesenlerin GERCEK darpindan kuruldu (zincir gibi); dini muside na't/durak.
  makeUsul("durakevferi", "Durak Evferi", "Durak Evferi", 21, "4", [
    [1, "dum", 2], [3, "tek", 2], [5, "tek", 1], // Türk Aksağı
    [6, "dum", 2], [8, "te", 1], [9, "ke", 1], // Sofyan 1
    [10, "dum", 2], [12, "te", 1], [13, "ke", 1], // Sofyan 2
    [14, "dum", 2], [16, "te", 1], [17, "ke", 1], // Sofyan 3
    [18, "dum", 2], [20, "te", 1], [21, "ke", 1], // Sofyan 4
  ]), // TDV: 21 zamanli; yapi = Türk Aksağı + 4 Sofyan
  makeUsul("hezec", "Hezeç", "Hezec", 22, "4", HEZEC, HEZEC_VELVELE), // Gonul s.106 (6+4+4+4+4); korpus repertuvari yok, pedagojik
  makeUsul("cember", "Çember", "Cember", 24, "4", CEMBER, CEMBER_VELVELE), // s.157
  makeUsul("agircenber", "Ağır Çenber", "Agir Cenber", 24, "2", CEMBER, CEMBER_VELVELE), // TDV/Ozkan: Cenber'in 2. mertebesi (24/2), ayni darp
  makeUsul("nimsakil", "Nim Sakîl", "Nim Sakil", 24, "4", NIM_SAKIL, NIM_SAKIL_VELVELE), // Gonul s.107 (4+6+6+4+4); korpusta repertuvari var
  makeUsul("evsat", "Evsat", "Evsat", 26, "4", EVSAT, EVSAT_VELVELE), // Gonul s.107 (5+4+4+5+4+4); korpusta repertuvari var
  makeUsul("bestedevrirevani", "Beste Devr-i Revânî", "Beste Devr-i Revani", 26, "4", BESTE_DEVRI_REVAN, BESTE_DEVRI_REVAN_VELVELE), // Gonul s.108 (5+4+4+5+4+4); korpusta repertuvari var
  makeUsul("devrikebir", "Devr-i Kebir", "Devr-i Kebir", 28, "4", DEVRI_KEBIR, DEVRI_KEBIR_VELVELE), // s.181
  makeUsul("remel", "Remel", "Remel", 28, "4", REMEL, REMEL_VELVELE), // Gonul s.109 (4+6+4+6+2+4+2); korpusta repertuvari var
  makeUsul("firengifer", "Frengifer", "Frengifer", 28, "4", FRENGIFER, FRENGIFER_VELVELE), // Gonul s.109 (6+6+4+4+4+4); korpusta repertuvari var
  makeUsul("hafif", "Hafif", "Hafif", 32, "4", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 2], [5, "dum", 1], [6, "tek", 1], [7, "tek", 2],
    [9, "dum", 2], [11, "tek", 1], [12, "ka", 1], [13, "dum", 1], [14, "tek", 1], [15, "tek", 2],
    [17, "dum", 2], [19, "tek", 1], [20, "ka", 1], [21, "dum", 1], [22, "dum", 1],
    [23, "tek", 1], [24, "te", 0.5], [24.5, "ke", 0.5],
    [25, "dum", 1], [26, "tek", 1], [27, "te", 0.5], [27.5, "ke", 0.5],
    [28, "dum", 1], [29, "ta", 1], [30, "hek", 1],
    [31, "te", 0.5], [31.5, "ke", 0.5], [32, "te", 0.5], [32.5, "ke", 0.5],
  ], HAFIF_VELVELE), // s.199 (darp) + Gonul s.109 (velvele)
  makeUsul("muhammes", "Muhammes", "Muhammes", 32, "4", MUHAMMES, MUHAMMES_VELVELE), // Gonul s.110 (8+8+8+8)
  makeUsul("berafsan", "Berafsan", "Berefsan", 32, "4", BERAFSAN, BEREFSAN_VELVELE), // s.208 (darp) + Gonul s.110 (velvele)
  // Sakil = 48 zamanli, Beste yapiminda en buyuk usullerden. Heper Kudum kitabi
  // "ZAMAN VE VURGULARI" tablosundan (repo symb/…KUDUM OCR) birebir; toplam=48.
  // Kitap: "usulun bunyesinde zaten velvele mevcuttur" -> darp-only.
  makeUsul("sakil", "Sakîl", "Sakil", 48, "4", [
    [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 2], [7, "tek", 1], [8, "ka", 1],
    [9, "tek", 1], [10, "ka", 1], [11, "dum", 2], [13, "tek", 1], [14, "ka", 1], [15, "dum", 1],
    [16, "tek", 2], [18, "tek", 2], [20, "dum", 2], [22, "dum", 2], [24, "dum", 2],
    [26, "tek", 2], [28, "dum", 2], [30, "tek", 2], [32, "tek", 2], [34, "tek", 2],
    [36, "dum", 2], [38, "tek", 1], [39, "ka", 1], [40, "dum", 1], [41, "dum", 1], [42, "tek", 1],
    [43, "dum", 1], [44, "tek", 1], [45, "ke", 1], [46, "dum", 1], [47, "ta", 1], [48, "hek", 1],
  ]), // Heper "Turk Musikisinde Usuller ve Kudum" (repo symb/) Sakil ZAMAN VE VURGULARI
  // Havi = 64 zamanli. Heper kitabi s.220 "ZAMAN VE VURGULARI" 1.sekil (8 satir
  // x 8 zaman); te-ke onaltilik (0.25) veya sekizlik (0.5). Toplam=64.
  makeUsul("havi", "Hâvî", "Havi", 64, "4", [
    // s1: Düm2 Tek Kâ | düm te ke dü(0.5) tek te ke dü | Tek2
    [1, "dum", 2], [3, "tek", 1], [4, "ka", 1], [5, "dum", 0.5], [5.5, "tek", 0.5], [6, "te", 0.25], [6.25, "ke", 0.25], [6.5, "dum", 0.5], [7, "tek", 2],
    // s2
    [9, "dum", 2], [11, "tek", 1], [12, "ka", 1], [13, "tek", 1], [14, "ka", 1], [15, "dum", 2],
    // s3
    [17, "tek", 1], [18, "ka", 1], [19, "tek", 1], [20, "ka", 1], [21, "dum", 0.5], [21.5, "tek", 0.5], [22, "te", 0.25], [22.25, "ke", 0.25], [22.5, "dum", 0.5], [23, "tek", 2],
    // s4
    [25, "dum", 2], [27, "dum", 2], [29, "tek", 1], [30, "ka", 1], [31, "tek", 1], [32, "ka", 1],
    // s5
    [33, "dum", 2], [35, "tek", 1], [36, "ka", 1], [37, "dum", 1], [38, "dum", 1], [39, "tek", 1], [40, "te", 0.5], [40.5, "ke", 0.5],
    // s6
    [41, "dum", 1], [42, "tek", 1], [43, "te", 0.5], [43.5, "ke", 0.5], [44, "dum", 1], [45, "ta", 1], [46, "hek", 1], [47, "te", 0.5], [47.5, "ke", 0.5], [48, "te", 0.5], [48.5, "ke", 0.5],
    // s7
    [49, "dum", 1], [50, "tek", 1], [51, "tek", 2], [53, "dum", 1], [54, "tek", 1], [55, "tek", 2],
    // s8
    [57, "dum", 1], [58, "tek", 1], [59, "dum", 1], [60, "dum", 1], [61, "ta", 1], [62, "hek", 1], [63, "te", 0.5], [63.5, "ke", 0.5], [64, "te", 0.5], [64.5, "ke", 0.5],
  ]), // Heper s.220 (1.sekil); tam=64
  // Darbeyn = iki buyuk usulun ardarda vurulusu (mürekkep sinif). En yaygin/
  // standart bicim: Devr-i Kebir (28) + Berefsan (32) = 60 (TDV Darbeyn maddesi;
  // ITU tezi 22 eser incelemesi). Zincir gibi bilesenlerin darbindan kurulur.
  makeUsul("darbeyn", "Darbeyn", "Darbeyn", 60, "4", [
    ...DEVRI_KEBIR,
    ...shift(BERAFSAN, 28),
  ]), // TDV Darbeyn + ITU tezi: Devr-i Kebir + Berefsan; korpus 60/4
  makeUsul("darbifeth", "Darb-ı Feth", "Darb-i Fetih", 88, "4", [
    [1, "dum", 2], [3, "tek", 1], [4, "tek", 1], [5, "dum", 2], [7, "tek", 1], [8, "tek", 1],
    [9, "tek", 1], [10, "ka", 1], [11, "dum", 2], [13, "tek", 1], [14, "tek", 1], [15, "dum", 2],
    [17, "tek", 2], [19, "dum", 2], [21, "tek", 2], [23, "dum", 2],
    [25, "tek", 1], [26, "ka", 1], [27, "dum", 1], [28, "te", 0.5], [28.5, "ke", 0.5], [29, "tek", 2], [31, "tek", 2],
    [33, "dum", 2], [35, "tek", 1], [36, "ka", 1], [37, "tek", 1], [38, "ka", 1], [39, "dum", 2],
    [41, "tek", 1], [42, "ka", 1], [43, "dum", 1], [44, "te", 0.5], [44.5, "ke", 0.5], [45, "tek", 2], [47, "dum", 2],
    [49, "dum", 2], [51, "dum", 2], [53, "tek", 1], [54, "ka", 1], [55, "tek", 1], [56, "ka", 1],
    [57, "dum", 2], [59, "tek", 1], [60, "ka", 1], [61, "dum", 1], [62, "dum", 1],
    [63, "tek", 1], [64, "te", 0.5], [64.5, "ke", 0.5],
    [65, "dum", 1], [66, "tek", 1], [67, "te", 0.5], [67.5, "ke", 0.5],
    [68, "dum", 1], [69, "ta", 1], [70, "hek", 1],
    [71, "te", 0.5], [71.5, "ke", 0.5], [72, "te", 0.5], [72.5, "ke", 0.5],
    [73, "dum", 1], [74, "tek", 1], [75, "tek", 2], [77, "dum", 1], [78, "tek", 1], [79, "tek", 2],
    [81, "dum", 1], [82, "tek", 1], [83, "dum", 1], [84, "dum", 1],
    [85, "ta", 1], [86, "hek", 1],
    [87, "te", 0.5], [87.5, "ke", 0.5], [88, "te", 0.5], [88.5, "ke", 0.5],
  ]), // s.228 (1. sekil; son 16 zaman = Nim Hafif dizilisi)
  makeUsul("zincir", "Zincir", "Zincir", 120, "4", [
    ...CIFTE_DUYEK,
    ...shift(FAHTE, 16),
    ...shift(CEMBER, 36),
    ...shift(DEVRI_KEBIR, 60),
    ...shift(BERAFSAN, 88),
  ], [
    // velvele de bilesen velvelelerinden kurulur (darp ile ayni offsetler)
    ...DUYEK_VELVELE,
    ...shift(DUYEK_VELVELE, 8),
    ...shift(FAHTE_VELVELE, 16),
    ...shift(CEMBER_VELVELE, 36),
    ...shift(DEVRI_KEBIR_VELVELE, 60),
    ...shift(BEREFSAN_VELVELE, 88),
  ]), // s.234: bes usulun zinciri (16+20+24+28+32 = 120; onceki 88/4 kaydi yanlisti)
  // --- SymbTr ritim-otoriter, darp ONAYLANMAMIS (yapisal) ---
  // usul_extended.json (SymbTr-extras) clustering'inden sure dizisi OTORITER;
  // ancak dum/tek stroke tipi hicbir makine-okunur kaynakta yok (deneysel
  // kanit: sureden turetme duyek/aksaksemai/yuruksemai'de yanlis). 1. dum
  // kesin, kalan tek yapisal; geleneksel nota geldiginde duzeltilecek.
  makeUsul("azeriyuruksemai", "Âzerî Yürüksemâî", "Azeri Yuruksemai", 6, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 1], [5, "tek", 2]]),
  makeUsul("bektasiraksani", "Bektâşî Raksânı", "Bektasi Raksani", 15, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 2], [6, "tek", 2], [8, "tek", 1], [9, "tek", 2], [11, "tek", 2], [13, "tek", 2], [15, "tek", 1]]),
  makeUsul("bulgardarbi", "Bulgar Darbı", "Bulgar Darbi", 8, "8", [[1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "tek", 2], [6, "tek", 1], [7, "tek", 1], [8, "tek", 1]]),
  makeUsul("devriaryan", "Devr-i Âryân", "Devr-i Aryan", 14, "8", [[1, "dum", 4], [5, "tek", 6], [11, "tek", 4]]),
  makeUsul("devrihindiii", "Devr-i Hindî II", "Devr-i Hindi II", 7, "8", [[1, "dum", 3], [4, "tek", 2], [6, "tek", 2]]),
  makeUsul("devrisureyya", "Devr-i Süreyyâ", "Devr-i Sureyya", 10, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 1], [5, "tek", 2], [7, "tek", 2], [9, "tek", 2]]),
  makeUsul("devrituranii", "Devr-i Turan II", "Devr-i Turan II", 14, "16", [[1, "dum", 4], [5, "tek", 4], [9, "tek", 6]]),
  makeUsul("iraksak", "İraksak", "Iraksak", 18, "8", [[1, "dum", 2], [3, "tek", 4], [7, "tek", 2], [9, "tek", 4], [13, "tek", 6]]),
  makeUsul("muasser", "Muasser", "Muasser", 10, "4", [[1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "tek", 1], [5, "tek", 2], [7, "tek", 2], [9, "tek", 1], [10, "tek", 1]]),
  makeUsul("nazliduyek", "Nazlı Düyek", "Nazli Duyek", 12, "8", [[1, "dum", 1], [2, "tek", 4], [6, "tek", 1], [7, "tek", 3], [10, "tek", 3]]),
  makeUsul("raksaksagiii", "Raks Aksağı II", "Raks Aksagi II", 18, "16", [[1, "dum", 4], [5, "tek", 6], [11, "tek", 4], [15, "tek", 4]]),
  makeUsul("sturkaksagi", "S. Türk Aksağı", "S. Turk Aksagi", 10, "4", [[1, "dum", 4], [5, "tek", 4], [9, "tek", 2]]),
  makeUsul("yuruksemaiii", "Yürüksemâî II", "Yuruksemai II", 6, "8", [[1, "dum", 1], [2, "tek", 2], [4, "tek", 1], [5, "tek", 2]]),
  // .mu2 code-14 duzum'unden (usul_extended clustering'i bos olanlar); ayni yapisal kural.
  makeUsul("dolap", "Dolap", "Dolap", 12, "8", [[1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "tek", 2], [6, "tek", 1], [7, "tek", 2], [9, "tek", 2], [11, "tek", 2]]),
  makeUsul("gulsen", "Gülşen", "Gulsen", 6, "8", [[1, "dum", 3], [4, "tek", 1], [5, "tek", 1], [6, "tek", 1]]),
  makeUsul("cevher", "Cevher", "Cevher", 10, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 2], [6, "tek", 2], [8, "tek", 1], [9, "tek", 2]]),
  makeUsul("bektasiraksi", "Bektâşî Raksı", "Bektasi Raksi", 8, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 2], [6, "tek", 2], [8, "tek", 1]]),
  makeUsul("bektasiraksievferi", "Bektâşî Raksı Evferi", "Bektasi Raksi Evferi", 16, "8", [[1, "dum", 2], [3, "tek", 1], [4, "tek", 2], [6, "tek", 2], [8, "tek", 2], [10, "tek", 2], [12, "tek", 2], [14, "tek", 1], [15, "tek", 2]]),
  makeUsul("murekkepsofyan", "Mürekkep Sofyan", "Murekkep Sofyan", 12, "8", [[1, "dum", 1], [2, "tek", 2], [4, "tek", 1], [5, "tek", 2], [7, "tek", 2], [9, "tek", 1], [10, "tek", 2], [12, "tek", 1]]),
  makeUsul("turkmen", "Türkmen", "Turkmen", 18, "8", [[1, "dum", 2], [3, "tek", 2], [5, "tek", 2], [7, "tek", 2], [9, "tek", 2], [11, "tek", 2], [13, "tek", 2], [15, "tek", 2], [17, "tek", 2]]),
  makeUsul("kcurcuna", "K. Curcuna", "K. Curcuna", 10, "8", [[1, "dum", 5], [6, "tek", 2], [8, "tek", 3]]),
];

// Darp'i SymbTr clustering'inden turetilen, dum/tek stroke tipi ONAYLANMAMIS
// usuller: sure/ritim otoriter (SymbTr), 1. dum kesin, kalan tek yapisal
// varsayilan. Gelenksel nota (Heper/Ozkan) ile dogrulanmali. UI bunlari isaretler.
export const PROVISIONAL_USUL_IDS: ReadonlySet<string> = new Set([
  "azeriyuruksemai", "bektasiraksani", "bulgardarbi", "devriaryan", "devrihindiii",
  "devrisureyya", "devrituranii", "iraksak", "muasser", "nazliduyek", "raksaksagiii",
  "sturkaksagi", "yuruksemaiii", "dolap", "gulsen", "cevher", "bektasiraksi",
  "bektasiraksievferi", "murekkepsofyan", "turkmen", "kcurcuna", "devrisureyyasofyani",
]);

export function getUsulById(id: string): Usul | undefined {
  return USUL_DATA.find((usul) => usul.id === id);
}

export function getUsulBeatDuration(usul: Usul, bpm: number): number {
  const beatUnit = parseInt(usul.unit);
  return (60 / bpm) * (4 / beatUnit);
}
