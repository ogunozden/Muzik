import {type Ticks, ZERO_TICKS, addTicks, wholeNotesOf} from "@/core/time/ticks";
import {meterToTicks} from "./meter-map";
import {type DurationFraction, METER_CHANGE_CODE, type SymbtrRow, TEMPO_MARK_CODE} from "./rows";

/**
 * OFFSET YENIDEN URETIM KAPISI (PLAN.md §2.3 / §3 G3).
 *
 * Bu modulun isi bir sey uretmek degil, bir sey KANITLAMAK: motorun zaman
 * modeli dogruysa, SymbTr TXT'nin `Offset` sutununu satir satir yeniden
 * uretebilmeli. Uretebiliyorsa mertebe/sure/olcu iliskisi anlasilmis
 * demektir; uretemiyorsa gocun geri kalani kum ustunde durur.
 *
 * ── IKI EKSEN, TEK YURUYUS ──────────────────────────────────────────────
 * Kalici bir "mod" enum'u YOK. Her satir iki sayi birden verir:
 *
 *     canonical    — muzikal zaman (kod-52 KATILMAZ)
 *     offsetReplay — TXT `Offset` sutunu (kod-52 KATILIR)
 *
 * Ikisinin de gerekli oldugu OLCULDU:
 *   · `Offset` sutununu yeniden uretme: kod-52 DAHIL %99,6 · HARIC %25,4
 *   · "eser tam olcuye oturuyor mu": kod-52 HARIC %75,8 · DAHIL %21,0
 * Yani `Offset` sutunu tempo isaretinin nominal suresini iceriyor, muzikal
 * zaman icermiyor. Tek eksen secmek iki durumdan birini bozardi.
 *
 * ── OLCULEN SONUC (2999 eser; mertebesi okunabilen tumu) ────────────────
 *   birebir eslesen: **2987 / 2999 (%99,6)**   — PLAN §3/G3 kapisi
 *   hata medyani 3,3e-6 · p95 3,3e-5  (dosya 7 anlamli hane yaziyor)
 *   eslesmeyen 12 eserin 11'i `Offset` sutunu DONMUS dosyalar (cogu
 *   `serbest`/`gazel`); 1'i (`hicaz_uzzal--zeybek--aksak----izmir`) mu2 ile
 *   TXT'nin celistigi tek dosya: mu2 `9/4` diyor, `Offset` sutunu `9/8` ile
 *   yazilmis. Ikisi de KAYNAK verinin ozelligi, duzeltilmiyor.
 */

/** Bir satirin iki eksende ne kadar ilerlettigi. */
export interface RowAdvance {
  /** Muzikal zaman — tempo isareti (kod 52) KATILMAZ. */
  readonly canonical: Ticks;
  /** TXT `Offset` sutunu yeniden uretimi — tempo isareti KATILIR. */
  readonly offsetReplay: Ticks;
}

const NO_ADVANCE: RowAdvance = {canonical: ZERO_TICKS, offsetReplay: ZERO_TICKS};

/**
 * Tek fonksiyon, iki sayi (PLAN §2.3). Kalici mod yok, dallanma yok.
 *
 * Kod-51 satiri `rows.ts` tarafindan zaten `meter-change` olarak tiplendigi
 * icin buraya `timed` olarak gelmez; yine de savunmaci kontrol duruyor.
 */
export function rowAdvance(row: SymbtrRow): RowAdvance {
  if (row.kind !== "timed") return NO_ADVANCE;
  if (row.code === METER_CHANGE_CODE) return NO_ADVANCE;

  if (row.code === TEMPO_MARK_CODE) {
    return {canonical: ZERO_TICKS, offsetReplay: row.duration};
  }
  return {canonical: row.duration, offsetReplay: row.duration};
}

export interface ReplayedRow {
  readonly rowIndex: number;
  /** Satirin BITISINDEKI kanonik konum. */
  readonly canonicalTicks: Ticks;
  /** Satirin bitisindeki yeniden uretilmis `Offset` degeri (yazili olcu). */
  readonly replayedOffsetUnits: number;
  /** Dosyanin `Offset` sutunundaki deger. */
  readonly fileOffsetUnits: number | null;
  /** Bu satirda gecerli olan olcu uzunlugu. */
  readonly measureTicks: Ticks;
}

export interface OffsetReplayResult {
  readonly rows: readonly ReplayedRow[];
  /** `Offset` degeri olan ve karsilastirilan satir sayisi. */
  readonly compared: number;
  readonly matched: number;
  readonly maxAbsoluteError: number;
  /** Butun karsilastirilan satirlar toleransin icinde mi? */
  readonly exact: boolean;
  /** Eserin kanonik uzunlugu (kod-52 haric). */
  readonly canonicalTicks: Ticks;
  /** Kanonik uzunluk / son olcu uzunlugu — tam sayi ise eser tam olcuye oturur. */
  readonly canonicalMeasures: number;
}

/**
 * Dosya `Offset` sutununu ~7 anlamli haneyle yaziyor; karsilastirma bu yuzden
 * GORELI olmali. Mutlak taban, sifira yakin degerler icin.
 */
export const OFFSET_RELATIVE_TOLERANCE = 2e-6;
const OFFSET_ABSOLUTE_FLOOR = 2e-6;

export function offsetTolerance(expected: number): number {
  return Math.max(OFFSET_ABSOLUTE_FLOOR, Math.abs(expected) * OFFSET_RELATIVE_TOLERANCE);
}

/**
 * Satirlari yurur ve `Offset` sutununu yeniden uretir.
 *
 * `initialMeter` tick eksenine girmiyorsa (mertebesiz eser, `1/0`) **`null`**
 * doner — olcu ekseni olmayan eserde `Offset` yeniden uretilemez, uydurulmaz.
 */
export function replaySymbtrOffsets(
  rows: readonly SymbtrRow[],
  initialMeter: DurationFraction,
): OffsetReplayResult | null {
  let measureTicks = meterToTicks(initialMeter);
  if (measureTicks === null) return null;

  const replayed: ReplayedRow[] = [];
  let canonical: Ticks = ZERO_TICKS;
  let replayOffsetUnits = 0;
  let compared = 0;
  let matched = 0;
  let maxAbsoluteError = 0;

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (row.kind === "meter-change") {
      const next = row.meter === null ? null : meterToTicks(row.meter);
      if (next !== null) measureTicks = next;
      continue;
    }

    const advance = rowAdvance(row);
    if (advance.offsetReplay === ZERO_TICKS && advance.canonical === ZERO_TICKS) continue;

    canonical = addTicks(canonical, advance.canonical);
    // Her adimin payi TAM tamsayi bolumunden geliyor; birikim yalniz burada
    // float'a dusuyor ve dosyanin kendi hassasiyetinin (7 hane) cok altinda.
    replayOffsetUnits += advance.offsetReplay / measureTicks;

    if (row.offsetUnits !== null) {
      compared++;
      const error = Math.abs(replayOffsetUnits - row.offsetUnits);
      if (error > maxAbsoluteError) maxAbsoluteError = error;
      if (error <= offsetTolerance(row.offsetUnits)) matched++;
    }

    replayed.push({
      rowIndex: index,
      canonicalTicks: canonical,
      replayedOffsetUnits: replayOffsetUnits,
      fileOffsetUnits: row.offsetUnits,
      measureTicks,
    });
  }

  return {
    rows: replayed,
    compared,
    matched,
    maxAbsoluteError,
    exact: compared > 0 && matched === compared,
    canonicalTicks: canonical,
    canonicalMeasures: wholeNotesOf(canonical) / wholeNotesOf(measureTicks),
  };
}
