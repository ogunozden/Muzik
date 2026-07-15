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

function corpusDefaultBpm(nameTr: string): number | undefined {
  const tempo = CORPUS_USULS[normalizeUsulNameForCorpus(nameTr)]?.tempoMedian;
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
  return strokes.map(([beat, symbol, timeValue]) => [beat + offset, symbol, timeValue]);
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
const EVFER_VELVELE: Stroke[] = [
  [1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5], [3, "tek", 1], [4, "ka", 1],
  DU(5), ME(5.5), [6, "dum", 1], [7, "hek", 1], [8, "hek", 2],
]; // s.53
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

export const USUL_DATA: Usul[] = [
  // --- Kucuk usuller ---
  makeUsul("nimsofyan", "Nimsofyan", "Nimsofyan", 2, "4", [[1, "dum", 1], [2, "tek", 1]],
    [[1, "dum", 1], [2, "te", 0.5], [2.5, "ke", 0.5]]), // s.11
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
  makeUsul("darb", "Darb", "Darb", 6, "4", [[1, "dum", 2], [3, "tek", 2], [5, "tek", 2]]), // s.29
  makeUsul("devirhindi", "Devr-i Hindi", "Devr-i Hindi", 7, "8", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "tek", 2],
  ], DEVRI_HINDI_VELVELE), // s.34
  makeUsul("devirituran", "Devr-i Turan", "Devr-i Turan", 7, "8", [
    [1, "dum", 2], [3, "tek", 2], [5, "tek", 3],
  ], DEVRI_TURAN_VELVELE), // s.37 (yaygin mertebesi 7/16; 7/8 de gosterilir)
  makeUsul("duyek", "Düyek", "Duyek", 8, "8", DUYEK, DUYEK_VELVELE), // s.40 (birinci mertebe 8/8)
  makeUsul("agirduyek", "Ağırdüyek", "Agir Duyek", 8, "4", DUYEK, DUYEK_VELVELE), // s.40: duyek 2. mertebesi
  makeUsul("musemmen", "Müsemmen", "Musemmen", 8, "8", [[1, "dum", 3], [4, "tek", 2], [6, "tek", 3]], MUSEMMEN_VELVELE), // s.44
  makeUsul("aksak", "Aksak", "Aksak", 9, "8", AKSAK, AKSAK_VELVELE), // s.47
  makeUsul("ciftesofyan", "Çiftesofyan", "Cifte Sofyan", 9, "8", AKSAK, AKSAK_VELVELE), // s.46: aksagin yurukce vurulusu
  makeUsul("agiraksak", "Ağır Aksak", "Agir Aksak", 9, "4", AKSAK, AKSAK_VELVELE), // s.46-47: aksak 2. mertebesi
  makeUsul("evfer", "Evfer", "Evfer", 9, "8", [
    [1, "dum", 2], [3, "te", 1], [4, "ke", 1], [5, "dum", 2], [7, "tek", 1], [8, "tek", 2],
  ], EVFER_VELVELE), // s.53: aksaktan farki son iki tek'in deger degisimi
  makeUsul("oynak", "Oynak", "Oynak", 9, "8", [
    [1, "dum", 1], [2, "tek", 1], [3, "tek", 1], [4, "dum", 2], [6, "tek", 2], [8, "tek", 2],
  ], OYNAK_VELVELE), // s.63 (darp) + Gonul s.102 (velvele)
  makeUsul("aksaksemai", "Aksaksemâî", "Aksak Semai", 10, "8", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // s.67
  // Curcuna = 10/8 (gercek notasyon). Kitap (s.66) onu Aksak Semai'nin 10/16
  // mertebesi sayar ama SymbTr v3 korpusundaki curcuna eserlerinin TAMAMI 10/8
  // notalidir; pedagoji de 10/8 der (darp: 3+2+2+3 = Düm2 Te1 Kâ2 Düm2 Tek2
  // Tek1, Aksak Semai ile ayni desen — kaynaklar ikisini esitler; curcuna
  // livelier/hizli karakterdir). 10/16 curcuna'yi 2x hizli caliyordu.
  makeUsul("curcuna", "Curcuna", "Curcuna", 10, "8", AKSAK_SEMAI, AKSAK_SEMAI_VELVELE), // s.66-67 + korpus 10/8
  makeUsul("lenkfahte", "Lenk Fahte", "Lenk Fahte", 10, "4", [
    [1, "dum", 2], [3, "tek", 3], [6, "dum", 1], [7, "tek", 2], [9, "te", 1], [10, "ke", 1],
  ], LENK_FAHTE_VELVELE), // s.76 (darp) + Gonul s.102 (velvele)
  makeUsul("frenkcin", "Frenkçin", "Frenkcin", 12, "4", [
    [1, "dum", 1], [2, "dum", 2], [4, "dum", 1], [5, "dum", 2],
    [7, "tek", 1], [8, "ka", 1], [9, "tek", 1], [10, "ka", 1], [11, "tek", 1], [12, "ka", 1],
  ], FRENKCIN_VELVELE), // s.85 (darp) + Gonul s.103 (velvele)
  makeUsul("nimcember", "Nim Çember", "Nim Cember", 12, "8", [
    [1, "dum", 2], [3, "te", 1], [4, "ke", 1], [5, "dum", 2],
    [7, "ta", 2], [9, "hek", 2], [11, "te", 1], [12, "ke", 1],
  ], NIM_CEMBER_VELVELE), // s.90 (darp) + Gonul s.103 (velvele)
  makeUsul("devrirevan", "Devrirevan", "Devr-i Revan", 14, "8", [
    [1, "dum", 3], [4, "dum", 2], [6, "tek", 2], [8, "dum", 3], [11, "tek", 2], [13, "tek", 2],
  ]), // s.101
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
  makeUsul("darbiturki", "Darb-ı Türkı", "Darb-i Turki", 18, "4", [
    [1, "dum", 2], [3, "dum", 2], [5, "tek", 2], [7, "dum", 4],
    [11, "tek", 4], [15, "tek", 1], [16, "ka", 1], [17, "tek", 1], [18, "ka", 1],
  ]), // s.131 (1. sekil; kitap: ON SEKIZ zamanli — onceki 20/4 kaydi yanlisti)
  makeUsul("fahte", "Fahte", "Fahte", 20, "4", FAHTE, FAHTE_VELVELE), // s.139 (darp) + Gonul s.105
  makeUsul("cember", "Çember", "Cember", 24, "4", CEMBER, CEMBER_VELVELE), // s.157
  makeUsul("devrikebir", "Devr-i Kebir", "Devr-i Kebir", 28, "4", DEVRI_KEBIR, DEVRI_KEBIR_VELVELE), // s.181
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
  ]), // s.234: bes usulun zinciri (16+20+24+28+32 = 120; onceki 88/4 kaydi yanlisti)
];

export function getUsulById(id: string): Usul | undefined {
  return USUL_DATA.find((usul) => usul.id === id);
}

export function getUsulBeatDuration(usul: Usul, bpm: number): number {
  const beatUnit = parseInt(usul.unit);
  return (60 / bpm) * (4 / beatUnit);
}
