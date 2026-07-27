/**
 * BIR YUVANIN SESI GERCEKTEN O PERDEDEN KAYDEDILDI MI? (PLAN.md §10/F2)
 *
 * Melodik klasorlerin hepsi 36 kromatik yuva (C3..B5) tasir, ama bu yuvalarin
 * hepsi gercek kayit DEGILDIR: kaynak paketin kaydettigi en pes ve en tiz
 * perdenin DISINDA kalan yuvalar, en yakin kayittan gerilerek uretilmistir.
 *
 * Germek mesru — motor zaten `playbackRate` ile bunu yapar. Ama gerilmis ses
 * enstrumanin o perdedeki gercek tinisi DEGILDIR: formantlar da kayar, yani
 * bir oktav asagi gerilmis ney "kalin ney" gibi degil, yavaslatilmis ney gibi
 * duyulur. Bu bilgi kullanicidan saklanmamali.
 *
 * ── NEDEN "ENSTRUMANIN SES SAHASI" DEMIYORUZ ────────────────────────────
 * Bir sazin organolojik ses sahasi (neyin ahengi, baglamanin duzeni) kaynak
 * gerektiren bir musiki bilgisidir. Elimizde her enstruman icin boyle bir
 * kaynak YOK ve ADR 0001 uyarinca uydurulmaz. Bunun yerine OLCULEBILEN sey
 * bildirilir: **kaynak kayitlarin kapsadigi perde araligi**. Kaynagi
 * olculmemis enstruman icin cevap "bilinmiyor"dur — "sinirsiz" degil.
 */
import type {InstrumentType} from "./instruments";

export interface RecordedPitchRange {
  /** Kaynak pakette OLCULEN en pes perde (MIDI). */
  readonly minMidi: number;
  /** Kaynak pakette OLCULEN en tiz perde (MIDI). */
  readonly maxMidi: number;
  /** Kanit — bu araligin nereden geldigi. */
  readonly evidence: string;
}

/**
 * Yalniz KAYNAGI OLCULMUS enstrumanlar burada. Eksik olan "sinirsiz" degil,
 * "bilinmiyor" demektir (bkz. `describeMelodicSampleUse`).
 *
 * `ney`: `all-samples/27726__bliind__ney-flute-sound-samples/` altindaki 13
 * kayit YIN+HPS uzlasmasiyla olculdu — 10'unda uzlasma saglandi, 7 benzersiz
 * perde cikti; en pes B3 (243,2 Hz), en tiz Fs5 (737,5 Hz).
 */
export const RECORDED_MELODIC_RANGES: Partial<Record<InstrumentType, RecordedPitchRange>> = {
  ney: {
    minMidi: 59, // B3
    maxMidi: 78, // Fs5
    evidence: "Freesound paketi 27726 (_bliind), 10 uzlaşan kayıt · B3 243,2 Hz – Fs5 737,5 Hz",
  },
};

export type MelodicSampleUse =
  /** Perde, kaynak kayitlarin kapsadigi araligin ICINDE. */
  | {readonly kind: "recorded-span"}
  /** Perde araligin DISINDA — ses gerilerek uretilmis. */
  | {readonly kind: "extrapolated"; readonly semitonesBeyond: number; readonly evidence: string}
  /** Kaynak araligi olculmemis — iddia edilmiyor. */
  | {readonly kind: "unknown"};

/**
 * Bir yuvanin sesi gercek kayit araliginda mi, disinda mi?
 *
 * "unknown" bilinerek dondurulur: olcmedigimiz seyi "guvenli" diye
 * isaretlemek, yanlis bilgiden daha sinsi olurdu.
 */
export function describeMelodicSampleUse(
  instrument: InstrumentType,
  midiNumber: number,
): MelodicSampleUse {
  const range = RECORDED_MELODIC_RANGES[instrument];
  if (!range) return {kind: "unknown"};

  if (midiNumber < range.minMidi) {
    return {kind: "extrapolated", semitonesBeyond: range.minMidi - midiNumber, evidence: range.evidence};
  }
  if (midiNumber > range.maxMidi) {
    return {kind: "extrapolated", semitonesBeyond: midiNumber - range.maxMidi, evidence: range.evidence};
  }
  return {kind: "recorded-span"};
}

/** UI'da gosterilecek tek cumle; arali icindeyse `null`. */
export function describeExtrapolation(instrument: InstrumentType, midiNumber: number): string | null {
  const use = describeMelodicSampleUse(instrument, midiNumber);
  if (use.kind !== "extrapolated") return null;

  const direction = midiNumber < (RECORDED_MELODIC_RANGES[instrument]?.minMidi ?? 0) ? "pes" : "tiz";
  return `kayıt dışı bölge — en yakın gerçek kayıttan ${use.semitonesBeyond} yarım ton ${direction}e gerildi (${use.evidence})`;
}
