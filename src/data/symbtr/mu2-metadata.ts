/**
 * `mu2` KUNYE BLOGU (PLAN.md §4/B3).
 *
 * SymbTr'in `mu2` kardes dosyalari her eserin kunyesini tasiyor ve motor
 * bugun bunlarin **hicbirini** okumuyor: makam adi, usul adi, form, bestekar,
 * guftekar, eser adi, tur. Uygulama bu bilgileri dosya ADINDAN cikariyor
 * (`makam--form--usul--baslik--bestekar`), yani kisaltilmis ve aksansiz
 * halinden.
 *
 * ── OLCULEN KAPSAM (3000 mu2 dosyasi) ───────────────────────────────────
 *   kod 50 → makam adi (+ donanim)   3000/3000
 *   kod 51 → usul adi                3000/3000
 *   kod 52 → tempo                   3000/3000   (bkz. `tempo-map.ts`)
 *   kod 57 → form                    3000/3000
 *   kod 58 → bestekar                3000/3000
 *   kod 59 → guftekar                3000/3000
 *   kod 60 → eser adi                3000/3000
 *   kod 63 → tur (TSM / THM)         3000/3000
 *   kod 62 → tek harf (H / E)        3000/3000   — ANLAMI KANITLANMADI
 *   kod 56 → 10 dosyada, degeri bos  — ANLAMI KANITLANMADI
 *
 * Korpusta **163 farkli makam adi** ve **135 farkli usul adi** var.
 *
 * ── ANLAMI URETILMEYEN ALANLAR ──────────────────────────────────────────
 * Kod 62 ile kod 63 birebir ortusuyor (`H`↔`TSM` 2644, `E`↔`THM` 356), ama
 * `H`/`E` harflerinin neyi kisalttigi belgelenmemis. Bu yuzden 62 HAM
 * tasinir, adlandirilmaz. Ayni sekilde kod 56 ve tanimadigimiz her kod
 * `unknown` listesinde ham durur — atilmaz, uydurulmaz.
 *
 * ── DONANIM (kod 50, sutun 8) ───────────────────────────────────────────
 * `B4b2/F5#3` gibi degerler makamin DONANIMIdir (kararsal tek perde degil).
 * Bu alan `importer.ts` tarafindan zaten `mu2-key` kaniti olarak okunuyor;
 * burada ham metin olarak tasinir, yeniden yorumlanmaz.
 */

/** `mu2` govdesindeki kunye satir kodlari (olculdu). */
export const MU2_METADATA_CODES = {
  makam: 50,
  usul: 51,
  tempo: 52,
  form: 57,
  composer: 58,
  lyricist: 59,
  title: 60,
  genre: 63,
} as const;

export interface Mu2UnknownMetadataRow {
  readonly code: number;
  /** Satirin tum sutunlari, ham. */
  readonly columns: readonly string[];
}

export interface Mu2Metadata {
  /** Kod 50, sutun 7. */
  readonly makam: string | null;
  /** Kod 50, sutun 8 — makamin DONANIMI (`B4b2/F5#3` gibi). */
  readonly keySignature: string | null;
  /** Kod 51, sutun 7 — ilk (acilis) usul beyani. */
  readonly usul: string | null;
  /** Kod 57. */
  readonly form: string | null;
  /** Kod 58. */
  readonly composer: string | null;
  /** Kod 59. */
  readonly lyricist: string | null;
  /** Kod 60. */
  readonly title: string | null;
  /** Kod 63 — `TSM` / `THM`. */
  readonly genre: string | null;
  /**
   * Anlami kanitlanmamis kunye satirlari (kod 56, 62, ...). Atilmaz,
   * adlandirilmaz; tuketici karar verir.
   */
  readonly unknown: readonly Mu2UnknownMetadataRow[];
}

const KNOWN_CODES = new Set<number>(Object.values(MU2_METADATA_CODES));
/** Kunye blogu araligi — nota/olcu satirlarindan ayirmak icin. */
const METADATA_CODE_MIN = 50;
const METADATA_CODE_MAX = 69;

function textAt(columns: readonly string[], index: number): string | null {
  const value = columns[index]?.trim();
  return value ? value : null;
}

/**
 * `mu2` kunye blogunu okur.
 *
 * `mu2Raw` **cozulmus** metin olmali (`decodeWindows1254`); bu fonksiyon
 * kodlama donusumu yapmaz. Ham `latin1` verilirse Turkce harfler bozuk
 * gelir (`Ağıraksak` yerine `Aðýraksak`).
 *
 * Ayni kod birden fazla kez gecerse **ILKI** alinir: kod 51 eser icinde
 * usul degisimleriyle tekrar eder ve acilis beyani ilk satirdir
 * (bkz. `usul-map.ts` hizalama kurali).
 */
export function readMu2Metadata(mu2Raw: string): Mu2Metadata {
  const firstByCode = new Map<number, readonly string[]>();
  const unknown: Mu2UnknownMetadataRow[] = [];

  for (const line of mu2Raw.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;

    const columns = line.split("\t");
    const code = Number(columns[0]?.trim());
    if (!Number.isInteger(code)) continue;
    if (code < METADATA_CODE_MIN || code > METADATA_CODE_MAX) continue;

    if (!firstByCode.has(code)) firstByCode.set(code, columns);
    if (!KNOWN_CODES.has(code) && unknown.length < 32) unknown.push({code, columns});
  }

  const at = (code: number, column: number): string | null => {
    const columns = firstByCode.get(code);
    return columns ? textAt(columns, column) : null;
  };

  return {
    makam: at(MU2_METADATA_CODES.makam, 7),
    keySignature: at(MU2_METADATA_CODES.makam, 8),
    usul: at(MU2_METADATA_CODES.usul, 7),
    form: at(MU2_METADATA_CODES.form, 7),
    composer: at(MU2_METADATA_CODES.composer, 7),
    lyricist: at(MU2_METADATA_CODES.lyricist, 7),
    title: at(MU2_METADATA_CODES.title, 7),
    genre: at(MU2_METADATA_CODES.genre, 7),
    unknown,
  };
}
