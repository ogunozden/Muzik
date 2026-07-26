import {
  type Ticks,
  ZERO_TICKS,
  addTicks,
  cmpTicks,
  floorDivTicks,
  modTicks,
  subTicks,
  ticksFromFraction,
} from "@/core/time/ticks";
import {type DurationFraction, type SymbtrRow, rowAdvance} from "./rows";

/**
 * MERTEBE HARITASI (PLAN.md §2.2 / §3 G2).
 *
 * Bugunku motorda olcu numarasi TAHMIN ediliyor (`Math.ceil(offsetUnits)`) ve
 * yazili mertebe hic okunmuyor. Oysa mertebe, `Pay/Payda` ekseni (tam nota
 * kesri) ile `Offset` ekseni (yazili olcu) arasindaki DONUSUM CARPANIdir:
 *
 *     offsetDelta = (Pay/Payda) / mertebe(tamNota cinsinden)
 *
 * Bu carpan olmadan iki eksen birbirine cevrilemez; L1 (bar-asan nota bolme)
 * bu yuzden inmedi.
 *
 * ── KAYNAKLAR ────────────────────────────────────────────────────────────
 * Baslangic mertebesi TXT'de YOKTUR; `mu2` kardes dosyasinin 1. satirindan
 * gelir (sutun 0/1 = Pay/Payda). Cagiran taraf onu verir.
 * Eser ici degisim TXT kod-51 satirlarindadir (README v2 madde 5).
 *
 * ── OLCULEN ──────────────────────────────────────────────────────────────
 * · Kod-51 iceren dosya: **128 / 3000**. Kalan 2872 eser tek mertebelidir.
 * · Kod-51 satiri Offset'i **hicbir zaman** ilerletmez (382/382).
 * · Kod-51 her zaman olcu basina denk GELMEZ (orn. offset 9,111111). Bu
 *   yuzden segment "kismi olcu" ile bitebilir; bu durum gizlenmez,
 *   `endsMidMeasure` ile raporlanir.
 * · `mu2` satir-1'de dejenere mertebe var (`1/0`) — mertebesiz/serbest eser.
 *   O eserlerde olcu izgarasi KURULMAZ, `null` doner (emniyet valfi).
 */

export interface MeterSegment {
  /** Segmentin basladigi kanonik tick konumu. */
  readonly startTick: Ticks;
  /** Segmentin ilk olcusunun 1 tabanli numarasi. */
  readonly startMeasure: number;
  readonly meter: DurationFraction;
  /** Mertebenin tick karsiligi — bir olcunun uzunlugu. */
  readonly measureTicks: Ticks;
  /** Bu segmenti acan `rows` dizini; `null` ise baslangic (mu2'den). */
  readonly sourceRowIndex: number | null;
  /** Segment tam olcuyle bitmiyorsa `true` — veri boyle, duzeltilmez. */
  readonly endsMidMeasure: boolean;
}

export interface MeterMap {
  readonly segments: readonly MeterSegment[];
  /** Sureli satirlarin toplami — eserin kanonik uzunlugu. */
  readonly totalTicks: Ticks;
  /** Yazili mertebe degisim sayisi (kod-51 satirlarindan gecerli olanlar). */
  readonly changeCount: number;
}

export interface MeasurePosition {
  /** 1 tabanli olcu numarasi. */
  readonly measure: number;
  /** Olcu icindeki konum (tick). */
  readonly tickInMeasure: Ticks;
  readonly segment: MeterSegment;
}

/** Mertebeyi tick'e cevirir. Payda tick eksenini bolmuyorsa `null`. */
export function meterToTicks(meter: DurationFraction): Ticks | null {
  if (!Number.isInteger(meter.numerator) || !Number.isInteger(meter.denominator)) return null;
  if (meter.numerator <= 0 || meter.denominator <= 0) return null;
  return ticksFromFraction(meter.numerator, meter.denominator);
}

/**
 * Satirlari yurur ve mertebe segmentlerini kurar.
 *
 * `initialMeter` gecersizse (`1/0` gibi dejenere ya da tick eksenine
 * girmeyen payda) **`null`** doner — olcu izgarasi UYDURULMAZ. Serbest/gazel
 * eserler bu yoldan gecer ve `measureIndex` uretmez.
 */
export function buildMeterMap(rows: readonly SymbtrRow[], initialMeter: DurationFraction): MeterMap | null {
  const initialTicks = meterToTicks(initialMeter);
  if (initialTicks === null) return null;

  const segments: MeterSegment[] = [];
  let current: {
    startTick: Ticks;
    startMeasure: number;
    meter: DurationFraction;
    measureTicks: Ticks;
    sourceRowIndex: number | null;
  } = {
    startTick: ZERO_TICKS,
    startMeasure: 1,
    meter: initialMeter,
    measureTicks: initialTicks,
    sourceRowIndex: null,
  };

  let position: Ticks = ZERO_TICKS;
  let changeCount = 0;

  const closeSegment = (endTick: Ticks): void => {
    const span = subTicks(endTick, current.startTick);
    const wholeMeasures = floorDivTicks(span, current.measureTicks);
    const remainder = modTicks(span, current.measureTicks);
    const endsMidMeasure = cmpTicks(remainder, ZERO_TICKS) !== 0;

    segments.push({
      startTick: current.startTick,
      startMeasure: current.startMeasure,
      meter: current.meter,
      measureTicks: current.measureTicks,
      sourceRowIndex: current.sourceRowIndex,
      endsMidMeasure,
    });

    // Kismi olcu de BIR olcu sayilir — mertebe degisiminde nota yazimindaki
    // davranis budur; aksi halde sonraki segment ayni numaradan baslardi.
    current = {
      ...current,
      startMeasure: current.startMeasure + wholeMeasures + (endsMidMeasure ? 1 : 0),
    };
  };

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];

    if (row.kind === "timed") {
      // KANONIK eksen: tempo isareti (kod 52) olcu izgarasini KAYDIRMAZ.
      // G3 bunu 2999 eserde olctu — kod-52 katilirsa eserlerin yalniz %21'i
      // tam olcuye oturuyor, katilmazsa %75,8.
      position = addTicks(position, rowAdvance(row).canonical);
      continue;
    }

    if (row.kind !== "meter-change" || row.meter === null) continue;

    const nextTicks = meterToTicks(row.meter);
    if (nextTicks === null) continue; // tick eksenine girmeyen mertebe: yok say, satir yine de `rows` icinde duruyor

    // Ayni mertebenin tekrari segment ACMAZ (korpusta sik: usul devri
    // isaretcisi olarak ayni 9/8 tekrar tekrar yaziliyor).
    if (cmpTicks(nextTicks, current.measureTicks) === 0) continue;

    closeSegment(position);
    current = {
      startTick: position,
      startMeasure: current.startMeasure,
      meter: row.meter,
      measureTicks: nextTicks,
      sourceRowIndex: index,
    };
    changeCount++;
  }

  closeSegment(position);

  return {segments, totalTicks: position, changeCount};
}

/**
 * Kanonik tick konumunun hangi olcuye dustugunu soyler.
 *
 * Bu, `Math.ceil(offsetUnits)` tahmininin YERINE gecer: olcu, sureden
 * turetilmez; mertebe haritasi yurunerek bulunur.
 */
export function measureAt(map: MeterMap, tick: Ticks): MeasurePosition | null {
  if (map.segments.length === 0) return null;
  if (cmpTicks(tick, ZERO_TICKS) < 0) return null;

  let segment = map.segments[0];
  for (const candidate of map.segments) {
    if (cmpTicks(candidate.startTick, tick) <= 0) segment = candidate;
    else break;
  }

  const offsetInSegment = subTicks(tick, segment.startTick);
  return {
    measure: segment.startMeasure + floorDivTicks(offsetInSegment, segment.measureTicks),
    tickInMeasure: modTicks(offsetInSegment, segment.measureTicks),
    segment,
  };
}

/**
 * `mu2` dosyasinin 1. satirindan yazili mertebeyi okur.
 *
 * Format (olculdu, 2999 dosya): satir-1 sekmeyle ayrilmis; sutun 0 = Pay,
 * sutun 1 = Payda, sonrasinda `Pay`/`Payda` basliklari geliyor.
 * En sik degerler: `4/4` (501), `9/8` (478), `8/8` (444), `10/8` (387).
 * Dejenere `1/0` satirlari mertebesiz eserlerdir — `null` doner.
 */
export function readMu2WrittenMeter(mu2Raw: string): DurationFraction | null {
  const firstLine = mu2Raw.split(/\r?\n/).find((line) => line.trim() !== "");
  if (!firstLine) return null;

  const columns = firstLine.split("\t");
  const numerator = Number(columns[0]?.trim());
  const denominator = Number(columns[1]?.trim());

  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return null;
  if (numerator <= 0 || denominator <= 0) return null;

  return {numerator, denominator};
}
