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
 * `ney`: `all-samples/TURKISH-ARAB3.sf2` icindeki `Moss_Nay` ve `NEY_05`
 * preset'lerinin ornek bolgeleri olculdu (YIN+HPS uzlasmasi, ardindan
 * harmonik dizi kanitiyla oktav cozumu) — 22 bolgede uzlasma saglandi;
 * en pes D3 (148,8 Hz), en tiz C6 (1064,7 Hz).
 *
 * Onceki kaynak (Freesound 27726, CC BY-NC) B3–Fs5 kapsiyordu ve 36 yuvanin
 * 16'si aralik disindaydi. Yeni kaynakta aralik disinda kalan yalniz C3 ve
 * Cs3 — hem lisans hem kapsam iyilesti.
 */
export const RECORDED_MELODIC_RANGES: Partial<Record<InstrumentType, RecordedPitchRange>> = {
  ney: {
    minMidi: 50, // D3
    maxMidi: 84, // C6
    evidence: "TURKISH-ARAB3.sf2 · Moss_Nay + NEY_05, 22 uzlaşan bölge · D3 148,8 Hz – C6 1064,7 Hz",
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

/**
 * `hek` — iki elin birlikte vuruşu (Kudum kitabı s.14, PLAN.md §10/F3 & §11/H5).
 *
 * Kaynak paketlerde gerçek bir `hek` kaydı YOK — 354 bölge tarandı, en yakın
 * sözlüksel eşleşme `Finger Flam` ölçülünce kaydırılmış flam çıktı (hek ise
 * eşzamanlı). Kudum kaydında da ayrım ölçülünce bulunamadı (dağılım sürekli).
 * Bu yüzden `hek` dum+tek toplamından **türetilmeye devam eder** ve UI'da
 * `Türetilmiş ses — gerçek kayıt değil, dum+tek toplamı` rozetiyle görünür.
 * Detay `public/samples/provenance.json → hekSearch` ve
 * `hekSearch.kudumRecordingProbe` içinde veri olarak durur (FAZ D dış girdi).
 */
export const HEK_PROVENANCE = {
  symbol: "hek" as const,
  derivedFrom: "dum + tek toplamı" as const,
  label: "Türetilmiş ses — gerçek kayıt değil, dum+tek toplamı" as const,
  hekSearchRef: "provenance.json → hekSearch" as const,
  detailRef: "hekSearch.kudumRecordingProbe" as const,
  scannedPresets: 354,
  twoHandStrokeFound: false,
  kudumPresetExists: false,
} as const;

export function describeHekProvenance(): typeof HEK_PROVENANCE {
  return HEK_PROVENANCE;
}
