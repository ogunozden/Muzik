/**
 * ANA MOTORUN ZAMAN CEKIRDEGI (PLAN.md §2.1 / §3 G1).
 *
 * Tek otoriter eksen: TAM NOTA'nin tamsayi bolunmesi. Float YOK.
 *
 * Neden: motorda zaman bugun `startBeat += durationBeats` ile float birikiyor.
 * Bu oturumda uc somut hasar uretti — `(0/0)*4 = NaN` bir eserin GERI KALANININ
 * tamamini cokertti (124 event), bar bolmesi `0.5999999999999999` gibi artiklar
 * uretti, ve her karsilastirma epsilon tasimak zorunda kaldi.
 *
 * `Ticks` MARKALI bir tiptir: duz `number` atanamaz. Float bir degerin bu eksene
 * girmesi DERLEME zamaninda reddedilir; kacak yol tek fonksiyondadir
 * (`wholeNotesOf`), o da yalniz adaptor katmani icindir.
 */

declare const TICK_BRAND: unique symbol;

/** Tam notanin tamsayi bolunmesi. Aritmetik `+`, `-`, `<` ile yapilir. */
export type Ticks = number & {readonly [TICK_BRAND]: true};

/**
 * Tick cozunurlugu = korpusta gorulen TUM paydalarin EKOK'u.
 *
 * Olculdu (SymbTr-3.0, 3000 TXT + 2999 mu2, tum satir kodlari):
 *   1 2 3 4 6 7 8 12 13 16 20 24 32 36 48 64 72 78 120 128
 *
 * 7 ve 13 mu2'nun mertebe/tempo satirlarindan (kod 51/52/56) geliyor; 78 = 2·3·13.
 * Yaygin aday olan 40320 bu ucunu BOLMUYOR — bu yuzden EKOK alindi.
 *
 * Tasma payi: korpusun en uzun eseri 1122,75 tam nota = 588.491.040 tick;
 * `Number.MAX_SAFE_INTEGER` (9,007e15) sinirinin ~15 milyonda biri.
 */
export const TICKS_PER_WHOLE = 524160;

export const ZERO_TICKS = 0 as Ticks;

/** Ham tamsayiyi Ticks'e yukseltir. Tamsayi degilse `null` (sessizce yuvarlamaz). */
export function ticksFromInteger(value: number): Ticks | null {
  return Number.isSafeInteger(value) ? (value as Ticks) : null;
}

/**
 * Kesirden tick. SymbTr `Pay/Payda` zaten TAM NOTA kesridir, bu yuzden
 * donusum kayipsizdir — payda `TICKS_PER_WHOLE`u bolmuyorsa `null` doner
 * (yuvarlama YAPILMAZ; cagiran taraf bunu kanitla raporlamali).
 */
export function ticksFromFraction(numerator: number, denominator: number): Ticks | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (!Number.isInteger(numerator) || !Number.isInteger(denominator)) return null;
  if (denominator <= 0 || numerator < 0) return null;
  if (TICKS_PER_WHOLE % denominator !== 0) return null;

  const value = numerator * (TICKS_PER_WHOLE / denominator);
  return Number.isSafeInteger(value) ? (value as Ticks) : null;
}

export function addTicks(left: Ticks, right: Ticks): Ticks {
  return (left + right) as Ticks;
}

export function subTicks(left: Ticks, right: Ticks): Ticks {
  return (left - right) as Ticks;
}

export function mulTicks(value: Ticks, factor: number): Ticks | null {
  if (!Number.isInteger(factor)) return null;
  const result = value * factor;
  return Number.isSafeInteger(result) ? (result as Ticks) : null;
}

export function cmpTicks(left: Ticks, right: Ticks): -1 | 0 | 1 {
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Tam bolum — epsilon YOK, tam tamsayi. */
export function floorDivTicks(value: Ticks, divisor: Ticks): number {
  return Math.floor(value / divisor);
}

/** Kalan — negatif girdide de pozitif kalan doner. */
export function modTicks(value: Ticks, divisor: Ticks): Ticks {
  return (((value % divisor) + divisor) % divisor) as Ticks;
}

export function sumTicks(values: readonly Ticks[]): Ticks {
  let total = 0;
  for (const value of values) total += value;
  return total as Ticks;
}

/**
 * TEK float cikisi. Yalniz ADAPTOR katmani cagirir (saniye, piksel, VexFlow).
 * Cekirdek mantik icinde kullanilirsa float birikimi geri gelir.
 */
export function wholeNotesOf(value: Ticks): number {
  return value / TICKS_PER_WHOLE;
}

/** Ceyreklik cinsinden — mevcut `durationBeats` ekseniyle koprulemek icin. */
export function quarterBeatsOf(value: Ticks): number {
  return (value * 4) / TICKS_PER_WHOLE;
}
