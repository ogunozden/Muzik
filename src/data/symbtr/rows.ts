import {type Ticks, ZERO_TICKS, ticksFromFraction} from "@/core/time/ticks";

/**
 * SymbTr TXT SATIR OKUYUCUSU (PLAN.md §3/G2).
 *
 * Sozlesme: **hicbir satir atilmaz.** Mevcut `parser.ts` 19 satir kodundan
 * yalniz `9`'u okuyor ve 47.140 satiri (bunlarin 31.605'i SURE TASIYAN)
 * sessizce dusuruyor. Bu modul her satiri tipli bir olaya cevirir; anlamini
 * bilmedigimiz kod bile `code` alaniyla ve ham sutunlariyla tasinir.
 *
 * Bu dosya TUKETICISIZDIR — `parser.ts` dokunulmadi. Goc adim adim yapilir.
 *
 * ────────────────────────────────────────────────────────────────────────
 * OLCULEN GERCEKLER (SymbTr-3.0, 3000 dosya, 1.211.994 satir)
 *
 * 1) ZAMAN ILERLETME KURALI — istisnasiz:
 *      Bir satir zamani ilerletir  <=>  Pay>0 && Payda>0 && kod !== 51
 *    `Pay=0` olup Offset'i ilerleten satir sayisi: **0** (1,2 milyon satirda).
 *    Kod 51'in Pay/Payda'si SURE DEGIL, MERTEBEDIR (README v2 madde 5) ve
 *    olcumde 382 satirin hicbiri Offset'i ilerletmemistir.
 *
 * 2) OFFSET FORMULU — dosyanin kendi beyaniyla dogrulandi:
 *      offsetDelta = (Pay/Payda) / yaziliMertebe(tamNota)
 *    Ornek: `1/8` suresi 13/8'lik mertebede 0,076920; 14/8'de 0,071430;
 *    10/8'de 0,100000 ilerletiyor. (G3 bunu 3000 eserde kapiya baglar.)
 *
 * 3) KOD ANLAMLARI — MusicXML kardes dosyalariyla HIZALANARAK turetildi
 *    (uydurulmadi; 444 dosya / 133.241 nota hizalandi):
 *      kod 8  -> grace/carpma   (%100 `<grace>`, n=1336) — %91'i suresiz
 *      kod 12 -> tril           (%98 `<trill-mark>`, n=61)
 *      kod 23 -> mordent        (%100 `<mordent>`, n=10)
 *      kod 24 -> mordent        (%100 `<mordent>`, n=3)
 *      kod 7  -> tremolo        (%100 `<tremolo>`, n=3 + bagimsiz 2. hizalamada n=2)
 *      kod 1,4,10,11,16,28,32,43,44 -> sureli perdeli nota (ayirt edici sus yok)
 *      kod 0, 14 -> suresiz isaret
 *      kod 51 -> mertebe/usul degisimi (README v2 madde 5)
 *      kod 52 -> TEMPO isareti (asagida)
 *    Anlami kanitlanmayan kodlar icin BURADA anlam URETILMEZ; `code` ham
 *    tasinir, karar tuketiciye birakilir.
 *
 * 5) KOD 52 = TEMPO ISARETI, KANONIK ZAMANI ILERLETMEZ.
 *    `mu2` kardes formati bu kodu kendi kendine belgeliyor:
 *      `52 <bos> 1 8 168` -> "sekizlik = 168". Pay/Payda VURUS BIRIMI,
 *      sonraki sayi BPM. TXT'de ayni sekil: Pay/Payda + `LNS` = BPM,
 *      ve `Ms` sutunu **her zaman 0** (yani gercek sure uretmiyor).
 *
 *    Ancak TXT'nin `Offset` sutunu bu satirin Pay/Payda'sini YINE DE ekliyor.
 *    Hangisinin kanonik oldugu 2999 eserde olculdu — "eserin toplam suresi
 *    TAM OLCUye oturuyor mu?" testiyle:
 *      kod-52 HARIC : 2274 eser tam olcu (%75,8)
 *      kod-52 DAHIL :  629 eser tam olcu (%21,0)
 *      yalniz HARIC dogru: 1672 eser · yalniz DAHIL dogru: 27 eser  (62:1)
 *    Sonuc: kanonik zaman kod-52'yi KATMAZ; `Offset` sutununu yeniden uretmek
 *    icin KATMAK gerekir. PLAN §2.3'teki `RowAdvance {canonical, offsetReplay}`
 *    ayrimi tam olarak bu yuzden vardir (G3 bunu kapiya baglar).
 *
 *    Bu modul kararı VERMEZ: kod-52 satiri `timed` olarak, `code: 52` ile
 *    tasinir; hangi eksene katilacagini tuketici secer.
 *
 * 4) SUTUN YENIDEN KULLANIMI satir tipine gore degisir:
 *      kod 9  -> LNS = calinan sure yuzdesi (README v2 madde 4), Bas = gurluk
 *      kod 51 -> LNS = usul kimligi, Pay/Payda = yeni mertebe
 *      kod 52 -> LNS = tempo gorunumlu sayi (54..127)
 */

/** SymbTr TXT basligi — 13 sutun, korpusun tamaminda sabit. */
export const SYMBTR_COLUMNS = [
  "Sira",
  "Kod",
  "Nota53",
  "NotaAE",
  "Koma53",
  "KomaAE",
  "Pay",
  "Payda",
  "Ms",
  "LNS",
  "Bas",
  "Soz1",
  "Offset",
] as const;

/** README v2 madde 5: usul/mertebe gecisi satiri. */
export const METER_CHANGE_CODE = 51;

/**
 * Tempo isareti. `mu2` esdegeri: `52 <bos> 1 8 168` = "sekizlik = 168".
 * Kanonik zamani ILERLETMEZ (bkz. dosya basligi §5); ama TXT `Offset`
 * sutunu suresini yine de ekler.
 */
export const TEMPO_MARK_CODE = 52;

/**
 * SUSLEME KIMLIKLERI (PLAN.md §4/B1).
 *
 * MusicXML kardes dosyalariyla HIZALANARAK turetildi — uydurulmadi.
 * Hizalama: 444 dosya / 133.241 nota; her kodun XML karsiligindaki
 * `<ornaments>` ogeleri sayildi.
 *
 *   kod  8 → carpma    %100 `<grace>`         n=1336  (ayrica 2. bagimsiz
 *                                              hizalamada da %100)
 *   kod 12 → tril      %98  `<trill-mark>`    n=61
 *   kod 23 → mordent   %100 `<mordent>`       n=10
 *   kod 24 → mordent   %100 `<mordent>`       n=3
 *   kod  7 → tremolo   %100 `<tremolo>`       n=3   (2. hizalamada da %100)
 *
 * Kucuk orneklem (23/24/7) ikinci bir bagimsiz hizalamayla dogrulandi;
 * yine de kesinlik derecesi `confidence` ile tasinir.
 */
export const ORNAMENT_BY_CODE: ReadonlyMap<number, {kind: SymbtrOrnament; confidence: "high" | "low"}> = new Map([
  [8, {kind: "grace", confidence: "high"}],
  [12, {kind: "trill", confidence: "high"}],
  [23, {kind: "mordent", confidence: "low"}],
  [24, {kind: "mordent", confidence: "low"}],
  [7, {kind: "tremolo", confidence: "low"}],
]);

export type SymbtrOrnament = "grace" | "trill" | "mordent" | "tremolo";

/**
 * Perde ve sure tasiyan ama ANLAMI KANITLANMAYAN kodlar (PLAN.md §4/B2).
 *
 * MusicXML hizalamasinda bu kodlarin ayirt edici bir `<ornaments>` ogesi
 * YOKTU: duz nota gibi davraniyorlar (kod 10 ve 11 icin `(plain)` %80-100).
 * Sure tasiyorlar ve zamani ilerletiyorlar — bu KANITLI. Ama neden ayri bir
 * kod aldiklari belgelenmemis.
 *
 * Bunlar `note` olarak islenir ve `unresolvedCode: true` ile isaretlenir:
 * calinir/cizilir ama "anlami biliniyor" gibi sunulmaz.
 */
export const UNRESOLVED_PITCHED_CODES: ReadonlySet<number> = new Set([1, 4, 10, 11, 16, 28, 32, 43, 44]);

/** README v2 madde 4: es isareti `Koma53`/`KomaAE` sutununda `-1`. */
const REST_KOMA_MARKER = -1;

export interface DurationFraction {
  readonly numerator: number;
  readonly denominator: number;
}

interface SymbtrRowBase {
  /** Dosya govdesindeki 1 tabanli satir sirasi (baslik haric). */
  readonly lineNumber: number;
  /** `Sira` sutunu — dosyanin kendi numarasi. */
  readonly sira: number | null;
  /** `Kod` sutunu, ham. Anlami bilinmese de KAYBOLMAZ. */
  readonly code: number | null;
  /** `Offset` sutunu — notanin BITTIGI kumulatif YAZILI OLCU konumu. */
  readonly offsetUnits: number | null;
  /** Butun sutunlar, hic bir sey atilmadan. */
  readonly columns: readonly string[];
}

/** Zamani ilerleten satir: nota, es ya da sureli isaret. */
export interface TimedSymbtrRow extends SymbtrRowBase {
  readonly kind: "timed";
  readonly duration: Ticks;
  readonly durationFraction: DurationFraction;
  /** AEU perde adi (`NotaAE`). `null` ise es. */
  readonly pitchAeu: string | null;
  /** 53'luk perde adi (`Nota53`). */
  readonly pitchKoma53Name: string | null;
  readonly koma53: number | null;
  /** `LNS` — calinan surenin yuzdesi (README v2 madde 4). */
  readonly lnsPercent: number | null;
  /** `Bas` — gurluk. */
  readonly velocity: number | null;
  readonly lyric: string | null;
  readonly isRest: boolean;
  /**
   * MusicXML hizalamasiyla turetilmis susleme kimligi (B1). `null` ise
   * susleme yok ya da kanit yok.
   */
  readonly ornament: SymbtrOrnament | null;
  /** Susleme kimliginin kanit gucu — kucuk orneklemler `low`. */
  readonly ornamentConfidence: "high" | "low" | null;
  /**
   * Perde ve sure tasiyor ama kodun ANLAMI kanitlanmadi (B2). Nota olarak
   * islenir; "biliniyor" gibi sunulmaz.
   */
  readonly unresolvedCode: boolean;
}

/** Mertebe/usul gecisi (kod 51). Pay/Payda SURE DEGIL, MERTEBEDIR. */
export interface MeterChangeSymbtrRow extends SymbtrRowBase {
  readonly kind: "meter-change";
  readonly meter: DurationFraction | null;
  /** `LNS` sutunu — usul kimligi gorunumunde (382 satirin %98'inde dolu). */
  readonly usulId: number | null;
  /**
   * `Bas` sutunu. Eser BASINDAKI (`Sira=1`, `Offset=0`) kod-51 satirlarinda
   * kimlik LNS yerine burada gorunuyor; eser ICI gecislerde tersi. Hangisinin
   * otoritatif oldugu KANITLANMADI — ikisi de ham tasinir, secim tuketicinin.
   *
   * README v2 madde 5 usul ADInin `Soz1`de olacagini soyluyor; v3 korpusunda
   * `Soz1` kod-51 satirlarinin **382/382**'sinde BOS. Ad bu formattan gelmiyor.
   */
  readonly usulIdAlternate: number | null;
}

/** Zamani ilerletmeyen satir. Atilmaz; nedeniyle birlikte tasinir. */
export interface UntimedSymbtrRow extends SymbtrRowBase {
  readonly kind: "untimed";
  readonly reason: UntimedReason;
  readonly pitchAeu: string | null;
  readonly pitchKoma53Name: string | null;
  readonly koma53: number | null;
  readonly lyric: string | null;
  /**
   * Suresiz satirlar da susleme olabilir — kod-8 carpmalarinin **%91'i**
   * suresizdir ve `<grace>` olarak dogrulanmistir. Kimlik burada da tasinir.
   */
  readonly ornament: SymbtrOrnament | null;
  readonly ornamentConfidence: "high" | "low" | null;
}

export type UntimedReason =
  /** `Pay` ya da `Payda` sifir/gecersiz — kod 8 carpmalarinin %91'i boyle. */
  | "no-duration"
  /**
   * Payda `TICKS_PER_WHOLE`u bolmuyor — tick eksenine KAYIPSIZ giremez.
   * Korpusta olculen adet: 0. Sessizce yuvarlamak yerine burada goruntur.
   */
  | "unrepresentable-duration";

export type SymbtrRow = TimedSymbtrRow | MeterChangeSymbtrRow | UntimedSymbtrRow;

export interface SymbtrRowReadResult {
  readonly rows: readonly SymbtrRow[];
  /** Dosyanin baslik satiri, ham. */
  readonly header: readonly string[];
  readonly counts: {
    readonly total: number;
    readonly timed: number;
    readonly meterChange: number;
    readonly untimed: number;
    /** Bos ve okunamaz satirlar (govdede atlananlar). */
    readonly blank: number;
  };
  /** Kod bazinda satir sayisi — hangi kodun kac kez gectigi gorunur kalsin. */
  readonly countsByCode: ReadonlyMap<number, number>;
}

/**
 * Bir satirin IKI eksende ne kadar ilerlettigi (PLAN.md §2.3).
 *
 * Kalici bir "mod" enum'u YOK: tek fonksiyon, iki sayi. Hangi eksenin
 * kullanilacagini cagiran secer.
 */
export interface RowAdvance {
  /** Muzikal zaman — tempo isareti (kod 52) KATILMAZ. */
  readonly canonical: Ticks;
  /** TXT `Offset` sutunu yeniden uretimi — tempo isareti KATILIR. */
  readonly offsetReplay: Ticks;
}

const NO_ADVANCE: RowAdvance = {canonical: ZERO_TICKS, offsetReplay: ZERO_TICKS};

/**
 * Satirin zaman katkisi. Bu, satirin KENDI ozelligidir — bu yuzden burada
 * durur; `meter-map`, `usul-map` ve `offset-replay` ucu de bunu kullanir ve
 * boylece uc modul ayni zamani gorur.
 */
export function rowAdvance(row: SymbtrRow): RowAdvance {
  if (row.kind !== "timed") return NO_ADVANCE;
  if (row.code === METER_CHANGE_CODE) return NO_ADVANCE;

  if (row.code === TEMPO_MARK_CODE) {
    return {canonical: ZERO_TICKS, offsetReplay: row.duration};
  }
  return {canonical: row.duration, offsetReplay: row.duration};
}

function toFiniteNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toText(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/**
 * Es tespiti iki bagimsiz kanittan gelir:
 *   (a) README v2 madde 4 — `Koma53` = -1
 *   (b) `NotaAE` yok ya da `Es`/`Sus` yer-tutucusu
 * Ikisinden biri yeterlidir; korpusta ikisi de ayni satirlari isaretliyor.
 */
function isRestRow(pitchAeu: string | null, pitchKoma53Name: string | null, koma53: number | null): boolean {
  if (koma53 === REST_KOMA_MARKER) return true;
  if (pitchAeu === null || pitchKoma53Name === null) return true;
  return pitchAeu === "Es" || pitchAeu === "Sus" || pitchKoma53Name === "Es" || pitchKoma53Name === "Sus";
}

/**
 * TXT govdesindeki HER satiri tipli bir olaya cevirir.
 *
 * `parser.ts`'ten farki: burada `return events` ile satir DUSURULMEZ. Bos
 * satirlar bile `counts.blank` olarak sayilir, boylece "kac satir okundu"
 * sorusu her zaman denklesir.
 */
export function readSymbtrRows(raw: string): SymbtrRowReadResult {
  const lines = raw.split(/\r?\n/);
  const header = (lines[0] ?? "").split("\t");
  const rows: SymbtrRow[] = [];
  const countsByCode = new Map<number, number>();
  let blank = 0;

  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) {
      blank++;
      continue;
    }

    const columns = line.split("\t");
    const lineNumber = index;
    const sira = toFiniteNumber(columns[0]);
    const code = toFiniteNumber(columns[1]);
    const offsetUnits = toFiniteNumber(columns[12]);
    const base: SymbtrRowBase = {lineNumber, sira, code, offsetUnits, columns};

    if (code !== null) countsByCode.set(code, (countsByCode.get(code) ?? 0) + 1);

    const numerator = toFiniteNumber(columns[6]);
    const denominator = toFiniteNumber(columns[7]);

    // Kod 51: Pay/Payda MERTEBEDIR, sure degil. Olcumde 382 satirin hicbiri
    // Offset'i ilerletmemistir — bu yuzden sure yolundan ONCE ayrilir.
    if (code === METER_CHANGE_CODE) {
      rows.push({
        ...base,
        kind: "meter-change",
        meter:
          numerator !== null && denominator !== null && numerator > 0 && denominator > 0
            ? {numerator, denominator}
            : null,
        usulId: toFiniteNumber(columns[9]),
        usulIdAlternate: toFiniteNumber(columns[10]),
      });
      continue;
    }

    const pitchKoma53Name = toText(columns[2]);
    const pitchAeu = toText(columns[3]);
    const koma53 = toFiniteNumber(columns[4]);
    const lyric = toText(columns[11]);
    const ornamentEntry = code === null ? undefined : ORNAMENT_BY_CODE.get(code);
    const ornament = ornamentEntry?.kind ?? null;
    const ornamentConfidence = ornamentEntry?.confidence ?? null;

    if (numerator === null || denominator === null || numerator <= 0 || denominator <= 0) {
      rows.push({
        ...base,
        kind: "untimed",
        reason: "no-duration",
        pitchAeu,
        pitchKoma53Name,
        koma53,
        lyric,
        ornament,
        ornamentConfidence,
      });
      continue;
    }

    const duration = ticksFromFraction(numerator, denominator);
    if (duration === null) {
      rows.push({
        ...base,
        kind: "untimed",
        reason: "unrepresentable-duration",
        pitchAeu,
        pitchKoma53Name,
        koma53,
        lyric,
        ornament,
        ornamentConfidence,
      });
      continue;
    }

    const isRest = isRestRow(pitchAeu, pitchKoma53Name, koma53);
    rows.push({
      ...base,
      kind: "timed",
      duration,
      durationFraction: {numerator, denominator},
      pitchAeu: isRest ? null : pitchAeu,
      pitchKoma53Name: isRest ? null : pitchKoma53Name,
      koma53: isRest ? null : koma53,
      lnsPercent: toFiniteNumber(columns[9]),
      velocity: toFiniteNumber(columns[10]),
      lyric,
      isRest,
      ornament,
      ornamentConfidence,
      unresolvedCode: code !== null && UNRESOLVED_PITCHED_CODES.has(code),
    });
  }

  return {
    rows,
    header,
    counts: {
      total: rows.length,
      timed: rows.filter((row) => row.kind === "timed").length,
      meterChange: rows.filter((row) => row.kind === "meter-change").length,
      untimed: rows.filter((row) => row.kind === "untimed").length,
      blank,
    },
    countsByCode,
  };
}
