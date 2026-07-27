import {type Ticks, TICKS_PER_WHOLE, ZERO_TICKS, addTicks, cmpTicks, subTicks} from "@/core/time/ticks";
import {getTupletContext} from "@/data/score-engine/notation";
import {type MeterMap, buildMeterMap, measureAt, meterToTicks} from "./meter-map";
import {type DurationFraction, readSymbtrRows, rowAdvance} from "./rows";
import type {SymbtrScoreEvent} from "./parser";

/**
 * BAR CIZGISINI ASAN NOTALARI BOLER (PLAN.md §3/G7, eski ad L1).
 *
 * Gravurde bir nota bar cizgisini asamaz: iki parcaya bolunur ve BAGLA
 * birlestirilir. Motor bunu yapmadigi icin bir olcu eksik, sonraki fazla
 * kaliyordu.
 *
 * ── NEDEN SIMDI YAPILABILIYOR ───────────────────────────────────────────
 * Bu is daha once denendi ve GERI ALINDI: olcu izgarasi `Offset` sutunundan
 * tahmin ediliyordu ve o sutun kendi icinde tutarsizdi, dolayisiyla bolme
 * noktalari sacma yerlere dusuyordu. G6'dan sonra izgara YAZILI MERTEBEDEN
 * yurunuyor; bolme noktasi artik kaynaktan turuyor.
 *
 * ── OLCULEN KAPSAM (G4, 2999 eser) ──────────────────────────────────────
 * Bar asan nota: **5.787 / 1.157.450 (%0,50)**. Olcu doluluğu %93,13.
 * Bolme bu iki sayiyi da duzeltir; toplam SURE ve calinan NOTA SAYISI
 * degismez (parcalar bagla tek nota olarak duyulur).
 *
 * ── SOZLESME ────────────────────────────────────────────────────────────
 * · Calma yolu bu fonksiyonu CAGIRMAZ — `parseSymbtrScore` ciktisi butun
 *   notalari tasimaya devam eder. Bolme yalniz GRAVUR/kanonik yolda olur.
 * · Parcalar `barlineTie` ile isaretlenir: `"start"` → `"continue"`* →
 *   `"stop"`. Tek parcali (bolunmemis) notada `null`.
 * · Sure toplami korunur: parcalarin toplami orijinal sureye ESITTIR
 *   (tick ekseninde tam esitlik, epsilon yok).
 */

export type BarlineTie = "start" | "continue" | "stop";

export interface BarlineSplitResult {
  readonly events: readonly SymbtrScoreEvent[];
  /** Bolunen orijinal nota sayisi. */
  readonly splitCount: number;
  /** Bolmeden sonra olusan ek parca sayisi. */
  readonly addedPartCount: number;
}

/** Bolunmus notanin parcalarini uretir. Tek parca cikarsa bolme yapilmamistir. */
function splitDurationAtBarlines(start: Ticks, duration: Ticks, map: MeterMap): Ticks[] {
  const parts: Ticks[] = [];
  let cursor = start;
  let remaining = duration;

  // En fazla `duration / enKucukOlcu` adim; sonsuz donguye karsi guvenlik.
  while (cmpTicks(remaining, ZERO_TICKS) > 0) {
    const at = measureAt(map, cursor);
    if (!at) break;

    const measureEnd = addTicks(subTicks(cursor, at.tickInMeasure), at.segment.measureTicks);
    const toBarline = subTicks(measureEnd, cursor);

    if (cmpTicks(remaining, toBarline) <= 0) {
      parts.push(remaining);
      break;
    }

    parts.push(toBarline);
    cursor = measureEnd;
    remaining = subTicks(remaining, toBarline);
  }

  return parts.length > 0 ? parts : [duration];
}

function tieAt(index: number, total: number): BarlineTie | null {
  if (total <= 1) return null;
  if (index === 0) return "start";
  return index === total - 1 ? "stop" : "continue";
}

/**
 * Bar cizgisini asan notalari boler.
 *
 * `writtenMeter` tick eksenine girmiyorsa (mertebesiz eser) olaylar
 * DOKUNULMADAN geri doner — izgara yoksa bolme noktasi da yoktur.
 */
export function splitEventsAtBarlines(
  events: readonly SymbtrScoreEvent[],
  raw: string,
  writtenMeter: DurationFraction | null,
): BarlineSplitResult {
  if (!writtenMeter || meterToTicks(writtenMeter) === null) {
    return {events, splitCount: 0, addedPartCount: 0};
  }

  const rows = readSymbtrRows(raw).rows;
  const map = buildMeterMap(rows, writtenMeter);
  if (!map) return {events, splitCount: 0, addedPartCount: 0};

  // KRITIK: konum, olaylardan degil SATIRLARDAN yurunur.
  //
  // `parseSymbtrScore` yalniz kod-9 uretiyor; korpusta ise kod 1/7/8/10/11/12/
  // 23/24... satirlari da zaman ilerletiyor (31.605 sureli satir). Konumu
  // olaylarin surelerini toplayarak bulmak, ilk boyle satirdan SONRAKI tum
  // bar cizgilerini kaydiriyordu — olculdu: bolunen nota %0,51 yerine %2,07
  // cikiyordu. Bar cizgisi kaynagin KANONIK zamanindan gelmeli.
  const startBySira = new Map<number, Ticks>();
  let walk: Ticks = ZERO_TICKS;
  for (const row of rows) {
    if (row.kind === "timed" && row.sira !== null) startBySira.set(row.sira, walk);
    walk = addTicks(walk, rowAdvance(row).canonical);
  }

  const output: SymbtrScoreEvent[] = [];
  let splitCount = 0;
  let addedPartCount = 0;

  for (const event of events) {
    // `durationBeats` ceyreklik cinsinden; tick eksenine tam cevrilir cunku
    // kaynak `durationFraction` zaten tam nota kesridir.
    const duration = ticksOfFraction(event.durationFraction);
    const position = startBySira.get(event.index);
    if (duration === null || position === undefined) {
      output.push(event);
      continue;
    }

    // TRIOLE BOLUNMEZ (C4). Bir triole notasi bar cizgisini asarsa parcalari
    // triole sisteminin DISINDA sureler olur (orn. 1/48) ve K2'nin kurdugu
    // tuplet notasyonu bozulur. Olculdu: 5.984 bolunen notanin yalniz **23'u**
    // (%0,38) triole. Gravurde triole braketi bar cizgisini asabilir; parcalara
    // ayirmak ise gecerli bir gosterim URETMEZ. Bu yuzden butun birakiliyor.
    const parts = getTupletContext(event.durationFraction)
      ? [duration]
      : splitDurationAtBarlines(position, duration, map);
    if (parts.length === 1) {
      output.push({...event, measureIndex: measureAt(map, position)?.measure ?? event.measureIndex});
      continue;
    }

    splitCount++;
    addedPartCount += parts.length - 1;

    let partStart = position;
    const beatsPerTick = event.durationBeats / duration;
    const secondsPerTick = event.duration / duration;

    for (let index = 0; index < parts.length; index++) {
      const partTicks = parts[index];
      const partBeats = partTicks * beatsPerTick;

      output.push({
        ...event,
        startBeat: event.startBeat + (partStart - position) * beatsPerTick,
        durationBeats: partBeats,
        durationFraction: fractionOfTicks(partTicks),
        startTime: event.startTime + (partStart - position) * secondsPerTick,
        duration: partTicks * secondsPerTick,
        measureIndex: measureAt(map, partStart)?.measure ?? event.measureIndex,
        barlineTie: tieAt(index, parts.length),
      });

      partStart = addTicks(partStart, partTicks);
    }
  }

  return {events: output, splitCount, addedPartCount};
}

/** `Pay/Payda` -> tick. Kaynak kesri zaten tam nota kesridir. */
function ticksOfFraction(fraction: DurationFraction): Ticks | null {
  const {numerator, denominator} = fraction;
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return null;
  if (numerator <= 0 || denominator <= 0) return null;
  return meterToTicks({numerator, denominator});
}

/**
 * Tick -> sadelestirilmis TAM NOTA kesri.
 *
 * `value / TICKS_PER_WHOLE` zaten tam bir kesirdir (tick cozunurlugu
 * korpustaki tum paydalarin EKOK'u); sadelestirme yalniz okunabilirlik icin.
 */
function fractionOfTicks(value: Ticks): DurationFraction {
  const gcd = (left: number, right: number): number => (right === 0 ? left : gcd(right, left % right));
  const divisor = gcd(value as number, TICKS_PER_WHOLE) || 1;

  return {numerator: (value as number) / divisor, denominator: TICKS_PER_WHOLE / divisor};
}
