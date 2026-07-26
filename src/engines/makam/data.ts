import {Makam, MakamKeyAccidental, MakamKomaScale} from "@/types";
import {NOTE_NAMES} from "@/lib/app-constants";
import {midiToFrequency, noteNameToMidi} from "@/engines/nota/data";
import makamCorpus from "./__generated__/makam-corpus.json";
import makamSeyir from "./__generated__/makam-seyir.generated.json";

/**
 * Makamin OTANTIK koma arizasi + 53-EDO koma dizisi elle yazilmaz; SymbTr
 * korpusundan turetilmis `makam-corpus.json`den (npm run derive:makam-corpus)
 * makam adiyla eslenerek baglanir. Yalniz editoryal METIN (aciklama,
 * characteristic) yazili kalir; ariza, koma dizisi, `intervals`, karar ve
 * guclu otonom/kaynaklidir.
 *
 * Elle yazilan `dominant` alani KALDIRILDI (D4): 48 makamin 11'inde deger
 * makamin kendi dizisinde bile yoktu (ussak "E", huseyni "A", segah "D") ve
 * UI'da "Güçlü: E" diye ogrenciye basiliyordu. Yerine `getMakamGuclu()` —
 * `komaScale.gucluPerde` (Aydemir 2010 + korpus).
 */
type MakamCorpusEntry = {display: string; total: number; consensus: number; keySignature: MakamKeyAccidental[]};
const CORPUS_MAKAMS = makamCorpus.makams as Record<string, MakamCorpusEntry>;
const CORPUS_KOMA_SCALES = (makamCorpus.komaScales ?? {}) as Record<string, MakamKomaScale>;
// Otoriter seyir tarifleri (Gonul s.307+; pdftotext ile cikarildi). Makam
// id'siyle eslenir; editoryal `description`in aksine kaynakli/tam seyirdir.
const SEYIR_METINLERI = (makamSeyir.seyir ?? {}) as Record<string, {yon: string; metin: string}>;
const KOMA_PER_OCTAVE = makamCorpus.komaPerOctave ?? 53;

function normalizeMakamName(name: string): string {
  return name
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"})[m] ?? m)
    .replace(/[âîû]/g, (m) => ({â: "a", î: "i", û: "u"})[m] ?? m)
    .replace(/[ýðþ]/g, (m) => ({ý: "i", ð: "g", þ: "s"})[m] ?? m)
    .replace(/[^a-z0-9]/g, "");
}

/**
 * SymbTr korpusu bazi makamlari farkli yazar (ayni makam, ortografik varyant);
 * engine adi korpus anahtarina ACIK tabloyla koprulenir — `usul/data.ts`teki
 * `CORPUS_NAME_ALIASES` ile ayni desen (D14).
 *
 * Onceki surumde bu is bulanik eslesmeyle (Levenshtein <= 1, benzersizse kabul)
 * yapiliyordu. Benzersizlik kontrolu BELIRSIZLIGI engelliyordu ama YANLISLIGI
 * degil: korpus buyudukce bir 1-edit cakismasi sessizce YANLIS makamin koma
 * dizisini ve ariza imzasini baglayabilirdi. Olcum, tum makinenin yalnizca
 * ASAGIDAKI IKI kayit icin calistigini gosterdi (48 makamin 40'i zaten
 * dogrudan adla cozumleniyor, 6'sinin korpusta karsiligi hic yok).
 *
 * Anahtar: normalize edilmis engine adi. Deger: korpus anahtari.
 */
const CORPUS_NAME_ALIASES: Record<string, string> = {
  nihavend: "nihavent",
  bayati: "beyati",
};

// Korpus anahtar kumesi: ariza (makams) VE koma dizisi (komaScales) anahtarlarinin
// BIRLESIMI — bazi makamlarda (buselik/cargah) yalniz komaScales girdisi var,
// makams yok; yalniz makams'a bakmak koma'yi baglamayi kacirir (2026-07 bug fix).
const CORPUS_KEY_HAS_DATA = (key: string): boolean =>
  Boolean(CORPUS_MAKAMS[key]) || Boolean(CORPUS_KOMA_SCALES[key]);

/**
 * Makam adini korpus anahtarina cozumler: once tam ad, sonra id, sonra ACIK
 * alias tablosu. Karsiligi yoksa `undefined` — makam korpus verisi ALMAZ
 * (sessizce baska bir makama baglanmaz). Cozumleme `corpus-resolution.test.ts`
 * ile makam basina kilitlidir.
 */
export function resolveCorpusKeyForMakam(makam: Makam): string | undefined {
  const norm = normalizeMakamName(makam.nameTr);
  if (CORPUS_KEY_HAS_DATA(norm)) return norm;

  const idNorm = normalizeMakamName(makam.id);
  if (CORPUS_KEY_HAS_DATA(idNorm)) return idNorm;

  const alias = CORPUS_NAME_ALIASES[norm] ?? CORPUS_NAME_ALIASES[idNorm];
  return alias && CORPUS_KEY_HAS_DATA(alias) ? alias : undefined;
}

function attachCorpusData(makam: Makam): Makam {
  const seyir = SEYIR_METINLERI[makam.id];
  const base = seyir ? {...makam, seyir} : makam;
  const key = resolveCorpusKeyForMakam(makam);
  if (!key) return base;
  const entry = CORPUS_MAKAMS[key]; // yalniz komaScales'te olan makamda undefined olabilir
  const komaScale = CORPUS_KOMA_SCALES[key];
  // 12-TET `intervals` artik korpus koma dizisinden OTONOM turetilir (elle
  // yazilan yerine); temiz heptatoni cikmazsa el-yazimina duser. Otantik perde
  // komaScale'de; bu, 12-TET notasyon izdusumu.
  const intervals = komaScale?.intervals12 ?? makam.intervals;
  return {
    ...base,
    intervals,
    ...(entry ? {keySignature: entry.keySignature, keySignatureConsensus: entry.consensus} : {}),
    ...(komaScale ? {komaScale} : {}),
    ...(seyir ? {seyir} : {}),
  };
}

/**
 * 53-EDO koma -> frekans: freq = kararHz × 2^(koma/53). Otantik makam perdesi
 * (12-TET yaklasik degil); Holder komasi = 1200/53 ≈ 22.64 cent.
 */
export function komaToFrequency(kararHz: number, koma: number): number {
  return kararHz * Math.pow(2, koma / KOMA_PER_OCTAVE);
}

/**
 * Makamin otantik koma dizisini SES FREKANSLARINA cevirir. Karar, makamin
 * nominal tonic perdesine demirlenir (register icin); dereceler korpus-turevli
 * gercek mikrotonal araliklari verir. Ustteki karar (oktav) da eklenir.
 * komaScale yoksa (korpus disi) null.
 */
export function getMakamKomaFrequencies(makam: Makam, octave = 4): number[] | null {
  if (!makam.komaScale || makam.komaScale.degrees.length === 0) return null;
  const kararHz = midiToFrequency(noteNameToMidi(makam.tonic, octave));
  const freqs = makam.komaScale.degrees.map((degree) => komaToFrequency(kararHz, degree.koma));
  freqs.push(komaToFrequency(kararHz, KOMA_PER_OCTAVE)); // ust karar (oktav)
  return freqs;
}

/**
 * 12-TET bir klavye tusunu (midiNumber) makamin OTANTIK koma perde-izgarasina
 * SNAP eder: tusun karara gore cent'i hesaplanir, oktav-ici en yakin dizi
 * derecesine (koma perdesi) kaydirilir, oktav ekseni korunur. Boylece piyano
 * makam-farkindalikli calar (hicaz'in 113c ikilisi gibi). komaScale yoksa null
 * (12-TET calinir). Bkz. playNoteAtFrequency.
 */
export function snapMidiToMakamFrequency(makam: Makam, midiNumber: number, octaveAnchor = 4): number | null {
  const scale = makam.komaScale;
  if (!scale || scale.degrees.length === 0) return null;
  const kararHz = midiToFrequency(noteNameToMidi(makam.tonic, octaveAnchor));
  const centsFromKarar = 1200 * Math.log2(midiToFrequency(midiNumber) / kararHz);
  const octaveOffset = Math.floor(centsFromKarar / 1200);
  const centsInOctave = centsFromKarar - octaveOffset * 1200; // 0..1200
  const candidates = [...scale.degrees.map((degree) => degree.cents), 1200]; // + ust karar
  let nearest = candidates[0];
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = Math.abs(candidate - centsInOctave);
    if (distance < bestDistance) {
      bestDistance = distance;
      nearest = candidate;
    }
  }
  return kararHz * Math.pow(2, (octaveOffset * 1200 + nearest) / 1200);
}

/**
 * AEU perde adlarinin Turkce ortografisi. Kaynak anahtarlar ASCII-normalize
 * gelir (`dugah`, `cargah`, `sehnaz`); bu tablo YALNIZ YAZIMDIR — muzikal
 * iddia tasimaz. Tabloda olmayan anahtar oldugu gibi doner (uydurma yok).
 */
const PERDE_DISPLAY_NAMES: Record<string, string> = {
  yegah: "Yegâh",
  "huseyni asiran": "Hüseyni Aşîran",
  acemasiran: "Acemaşîran",
  irak: "Irak",
  rast: "Rast",
  zirgule: "Zirgüle",
  dugah: "Dügâh",
  kurdi: "Kürdî",
  segah: "Segâh",
  buselik: "Bûselik",
  cargah: "Çârgâh",
  "nim hicaz": "Nîm Hicaz",
  hicaz: "Hicaz",
  neva: "Nevâ",
  hisar: "Hisar",
  huseyni: "Hüseyni",
  acem: "Acem",
  evic: "Eviç",
  mahur: "Mâhur",
  gerdaniye: "Gerdaniye",
  sehnaz: "Şehnaz",
  muhayyer: "Muhayyer",
  sunbule: "Sünbüle",
  "tiz segah": "Tîz Segâh",
  "tiz buselik": "Tîz Bûselik",
  "tiz cargah": "Tîz Çârgâh",
  "tiz hicaz": "Tîz Hicaz",
  "tiz neva": "Tîz Nevâ",
  "tiz huseyni": "Tîz Hüseyni",
  "tiz acem": "Tîz Acem",
  "tiz evic": "Tîz Eviç",
  "tiz gerdaniye": "Tîz Gerdaniye",
};

export function formatPerdeName(perde: string): string {
  return PERDE_DISPLAY_NAMES[perde] ?? perde;
}

export interface MakamPerdeRef {
  /** AEU perde anahtari (ASCII-normalize; `perdeKoma` tablosunda cozumlenir). */
  perde: string;
  /** Turkce ortografiyle gosterim adi. */
  label: string;
  /** Kanit zinciri: korpus kararPerde/gucluPerde + AEU perde tablosu. */
  source: "corpus+aeu";
}

/**
 * Makamin KARAR (durak) perdesi — KAYNAKLI (D3).
 *
 * `tonic` alanini KULLANMAZ: o alan calma register cipasidir (48 makamin
 * hepsinde "C") ve nazari karar DEGILDIR. Karar `komaScale.kararPerde`den
 * gelir; korpus son-nota modundan turetilip AEU perde tablosuna baglanmistir.
 * Kaynagi olmayan makamda `null` doner — deger uydurulmaz.
 */
export function getMakamKarar(makam: Makam): MakamPerdeRef | null {
  const perde = makam.komaScale?.kararPerde;
  return perde ? {perde, label: formatPerdeName(perde), source: "corpus+aeu"} : null;
}

/**
 * Makamin GUCLU perdesi — KAYNAKLI (D4).
 *
 * Eski `dominant` alani elle yazilmisti ve 11/48 makamda makamin kendi
 * dizisinde bile yoktu (ussak "E", huseyni "A", segah "D"). Kaldirildi;
 * deger artik `komaScale.gucluPerde`den gelir (Aydemir 2010 + korpus).
 */
export function getMakamGuclu(makam: Makam): MakamPerdeRef | null {
  const perde = makam.komaScale?.gucluPerde;
  return perde ? {perde, label: formatPerdeName(perde), source: "corpus+aeu"} : null;
}

const MAKAM_BASE: Makam[] = [
  {
    id: "rast",
    name: "Rast",
    nameTr: "Rast",
    nameEn: "Rast",
    tonic: "C",
    intervals: [2, 2, 1, 2, 2, 2, 1],
    characteristic: "Rast perdesi",
    description: "Türk musikisinin en temel makamlarından biri. Geniş ve görkemli bir ses sahibidir.",
  },
  {
    id: "huseyni",
    name: "Hüseyni",
    nameTr: "Hüseyni",
    nameEn: "Hüseyni",
    tonic: "C",
    intervals: [2, 2, 1, 2, 1, 2, 2],
    characteristic: "Hüseyni perdesi",
    description: "Hüzünlü ve tesirli bir makam. Duygusal ifadeler için sıkça kullanılır.",
  },
  {
    id: "nihavend",
    name: "Nihavend",
    nameTr: "Nihavend",
    nameEn: "Nihavend",
    tonic: "C",
    intervals: [1, 2, 2, 1, 2, 2, 2],
    characteristic: "Nihavend perdesi",
    description: "Türk musikisinde en çok kullanılan makamlardan biri. Dramamatik bir karakteri vardır.",
  },
  {
    id: "hicaz",
    name: "Hicaz",
    nameTr: "Hicaz",
    nameEn: "Hicaz",
    tonic: "C",
    intervals: [1, 3, 1, 2, 1, 2, 2],
    characteristic: "Hicaz perdesi",
    description: "Doğu karakteri güçlü bir makam. Hicaz kürdi ve Uşşak ile karşılaştırılır.",
  },
  {
    id: "ussak",
    name: "Uşşak",
    nameTr: "Uşşak",
    nameEn: "Ussak",
    tonic: "C",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    characteristic: "Uşşak perdesi",
    description: "Yumuşak ve akıcı bir makam. Hicaz ailesine mensuptur.",
  },
  {
    id: "saba",
    name: "Saba",
    nameTr: "Saba",
    nameEn: "Saba",
    tonic: "C",
    intervals: [1, 2, 1, 2, 3, 2, 1],
    characteristic: "Saba perdesi",
    description: "Karakteristik ve ayırt edici bir makam. Dede Efendi eserlerinde sıkça kullanılır.",
  },
  {
    id: "segah",
    name: "Segah",
    nameTr: "Segah",
    nameEn: "Segah",
    tonic: "C",
    intervals: [3, 1, 2, 1, 2, 2, 1],
    characteristic: "Segah perdesi",
    description: "Tiz ve keskin bir karaktere sahip makam. İlahi ve nefes müziğinde yaygındır.",
  },
  {
    id: "bayati",
    name: "Bayati",
    nameTr: "Bayati",
    nameEn: "Bayati",
    tonic: "C",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    characteristic: "Bayati perdesi",
    description: "Yumuşak ve zarif bir makam. Şarkı formunda sıkça kullanılır.",
  },
  {
    id: "hicazkürdi",
    name: "Hicaz Kürdi",
    nameTr: "Hicaz Kürdi",
    nameEn: "Hicaz Kurdi",
    tonic: "C",
    intervals: [1, 3, 1, 2, 2, 1, 2],
    characteristic: "Hicaz perdesi",
    description: "Hicaz ailesinin önemli bir kolu. Duygusal ve derin bir karaktere sahiptir.",
  },
  {
    id: "kürdi",
    name: "Kürdi",
    nameTr: "Kürdi",
    nameEn: "Kurdi",
    tonic: "C",
    intervals: [1, 2, 1, 2, 2, 1, 3],
    characteristic: "Kürdi perdesi",
    description: "Yatay ve içli bir makam. Tasavvuf musikisinde sıkça kullanılır.",
  },
  {
    id: "hüzzam",
    name: "Hüzzam",
    nameTr: "Hüzzam",
    nameEn: "Huzzam",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    characteristic: "Hüzzam perdesi",
    description: "Acı ve hüzünlü bir makam. Hicaz ailesiyle bağlantılıdır.",
  },
  {
    id: "gerdaniye",
    name: "Gerdaniye",
    nameTr: "Gerdaniye",
    nameEn: "Gerdaniye",
    tonic: "C",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    characteristic: "Gerdaniye perdesi",
    description: "Geniş ve görkemli bir makam. Gerdaniye perdesi karakteristik ses verir.",
  },
  {
    id: "hisar",
    name: "Hisar",
    nameTr: "Hisar",
    nameEn: "Hisar",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    characteristic: "Hisar perdesi",
    description: "Hicaz ailesine mensup bir makam. Orta ses bölgesinde çalınır.",
  },
  {
    id: "hisarbuselik",
    name: "Hisar Buselik",
    nameTr: "Hisarbûselik",
    nameEn: "Hisar Buselik",
    tonic: "C",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    characteristic: "Hisar perdesi (4. derece hicaz)",
    description: "Hisar (Hicaz dörtlüsü) + Bûselik (Kürdi beşlisi) birleşik makamı. 4. derecedeki Hisar perdesi karakteristik. Çıkıcı-inici seyir; güçlü hüseyni. Korpus: 25 eser.",
  },
  {
    id: "buselik",
    name: "Buselik",
    nameTr: "Buselik",
    nameEn: "Buselik",
    tonic: "C",
    intervals: [2, 2, 2, 2, 2, 1, 1],
    characteristic: "Buselik perdesi",
    description: "Neşeli ve canlı bir makam. Şarkı formlarında sıkça kullanılır.",
  },
  {
    id: "cargah",
    name: "Çargah",
    nameTr: "Çargah",
    nameEn: "Cargah",
    tonic: "C",
    intervals: [2, 2, 1, 2, 2, 2, 1],
    characteristic: "Çargah perdesi",
    description: "Türk musikisinin en temel makamlarından biri. Beşliler sistemine dayanır.",
  },
  {
    id: "acemasiran",
    name: "Acemaşiran",
    nameTr: "Acemaşiran",
    nameEn: "Acemasiran",
    tonic: "C",
    intervals: [2, 1, 2, 1, 2, 2, 2],
    characteristic: "Acem perdesi",
    description: "Acem ailesinin önemli bir makamı. Farsça eserlerde sıkça kullanılır.",
  },
  {
    id: "acembuselik",
    name: "Acem Buselik",
    nameTr: "Acem Buselik",
    nameEn: "Acem Buselik",
    tonic: "C",
    intervals: [2, 1, 2, 2, 2, 2, 1],
    characteristic: "Acem perdesi",
    description: "Acem ve buselik ailelerinin birleşimi. Zengin bir ifade aralığına sahiptir.",
  },
  {
    id: "karcığar",
    name: "Karcığar",
    nameTr: "Karcığar",
    nameEn: "Karcigar",
    tonic: "C",
    intervals: [1, 3, 2, 1, 2, 1, 2],
    characteristic: "Karcığar perdesi",
    description: "Karakteristik ve ayırt edici bir makam. Seyir karakteri dikkat çekicidir.",
  },
  {
    id: "uzzal",
    name: "Uzzal",
    nameTr: "Uzzal",
    nameEn: "Uzzal",
    tonic: "C",
    intervals: [1, 3, 1, 3, 1, 2, 1],
    characteristic: "Uzzal perdesi",
    description: "Hicaz ailesinin en önemli makamlarından biri. Derin ve etkileyici bir karaktere sahiptir.",
  },
  {
    id: "zirefkend",
    name: "Zirenkend",
    nameTr: "Zirenkend",
    nameEn: "Zirenkend",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 3, 1],
    characteristic: "Zirenkend perdesi",
    description: "Az kullanılan ama karakteristik bir makam.",
  },
  {
    id: "tahir",
    name: "Tahir",
    nameTr: "Tahir",
    nameEn: "Tahir",
    tonic: "C",
    intervals: [2, 2, 1, 2, 1, 2, 2],
    characteristic: "Tahir perdesi",
    description: "Yumuşak ve akıcı bir makam.",
  },
  {
    id: "nikriz",
    name: "Nikriz",
    nameTr: "Nikriz",
    nameEn: "Nikriz",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 1, 2],
    characteristic: "Nikriz perdesi",
    description: "Canlı ve neşeli bir makam.",
  },
  {
    id: "sultaniyegah",
    name: "Sultaniyegah",
    nameTr: "Sultaniyegah",
    nameEn: "Sultaniyegah",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 2, 1],
    characteristic: "Sultaniye perdesi",
    description: "Sultanların makamı. Görkemli ve heybetli bir karaktere sahiptir.",
  },
  {
    id: "yegah",
    name: "Yegah",
    nameTr: "Yegah",
    nameEn: "Yegah",
    tonic: "C",
    intervals: [1, 3, 2, 2, 1, 2, 1],
    characteristic: "Yegah perdesi",
    description: "Alçak ve derin bir makam. Nefesli çalgılar için uygundur.",
  },
  {
    id: "dügah",
    name: "Dügah",
    nameTr: "Dügah",
    nameEn: "Dügah",
    tonic: "C",
    intervals: [2, 2, 1, 2, 2, 1, 2],
    characteristic: "Dügah perdesi",
    description: "Orta ses bölgesinde çalınan yumuşak bir makam.",
  },
  {
    id: "mahur",
    name: "Mahur",
    nameTr: "Mahur",
    nameEn: "Mahur",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 2, 1],
    characteristic: "Mahur perdesi",
    description: "Batı musicasi etkisinde gelişen bir makam.",
  },
  {
    id: "bestenigar",
    name: "Bestenigar",
    nameTr: "Bestenigar",
    nameEn: "Bestenigar",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    characteristic: "Bestenigar perdesi",
    description: "Saray müziğinde önemli bir makam.",
  },
  {
    id: "müstear",
    name: "Müstear",
    nameTr: "Müstear",
    nameEn: "Müsteär",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 3, 1],
    characteristic: "Müstear perdesi",
    description: "Karışık ve ilginç bir makam.",
  },
  {
    id: "irakeyn",
    name: "Irakeyn",
    nameTr: "Irakeyn",
    nameEn: "Irakeyn",
    tonic: "C",
    intervals: [2, 1, 3, 1, 2, 2, 1],
    characteristic: "Irak perdesi",
    description: "Irak ve çevresinde kullanılan bir makam.",
  },
  {
    id: "rehavi",
    name: "Rehavi",
    nameTr: "Rehavi",
    nameEn: "Rehavi",
    tonic: "C",
    intervals: [2, 1, 2, 2, 2, 1, 2],
    characteristic: "Rehavi perdesi",
    description: "Yumuşak ve dinlendirici bir makam.",
  },
  {
    id: "muhayyer",
    name: "Muhayyer",
    nameTr: "Muhayyer",
    nameEn: "Muhayyer",
    tonic: "C",
    intervals: [2, 2, 1, 2, 2, 2, 1],
    characteristic: "Muhayyer perdesi",
    description: "Türk musikisinin en önemli makamlarından biri. Gür ve coşkulu bir karaktere sahiptir.",
  },
  {
    id: "hümayun",
    name: "Hümayun",
    nameTr: "Hümayun",
    nameEn: "Hümayun",
    tonic: "C",
    intervals: [1, 3, 1, 2, 2, 2, 1],
    characteristic: "Hümayun perdesi",
    description: "Sultanların makamı. İork ve heybetli bir karaktere sahiptir.",
  },
  {
    id: "isfahan",
    name: "Isfahan",
    nameTr: "Isfahan",
    nameEn: "Isfahan",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    characteristic: "Isfahan perdesi",
    description: "Acem ailesinden gelen yumuşak ve zarif bir makam.",
  },
  {
    id: "arazbar",
    name: "Arazbar",
    nameTr: "Arazbar",
    nameEn: "Arazbar",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    characteristic: "Arazbar perdesi",
    description: "Acı ve hüzünlü bir makam. Hicaz ailesiyle bağlantılıdır.",
  },
  // E9: Korpus-destekli ek makamlar (koma+intervals SymbTr'den baglanir; karar/guclu hizali).
  // huzzam/kurdi/karcigar app'te zaten var (normalize-eslesme ile korpus koma aliyor).
  {
    id: "hicazkar",
    name: "Hicazkâr",
    nameTr: "Hicazkâr",
    nameEn: "Hicazkar",
    tonic: "C",
    intervals: [2, 1, 3, 1, 1, 3, 1],
    characteristic: "Rast perdesi",
    description: "Hicaz ailesinden, rast perdesinde karar kılan mürekkep makam.",
  },
  {
    id: "ferahfeza",
    name: "Ferahfezâ",
    nameTr: "Ferahfezâ",
    nameEn: "Ferahfeza",
    tonic: "C",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    characteristic: "Yegâh perdesi",
    description: "Nihavend ailesinden, geniş ve ferah seyirli mürekkep makam.",
  },
  // P1.2: Yaygın eksik makamlar (korpus koma + Gönül karar-teyitli; seyir otomatik).
  {
    id: "neva",
    name: "Nevâ",
    nameTr: "Nevâ",
    nameEn: "Neva",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 2, 1],
    characteristic: "Dügâh perdesi",
    description: "Uşşak ailesinden; nevâ perdesinde güçlü, dügâh'ta karar kılar.",
  },
  {
    id: "kurdilihicazkar",
    name: "Kürdîlihicazkâr",
    nameTr: "Kürdîlihicazkâr",
    nameEn: "Kurdilihicazkar",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    characteristic: "Rast perdesi",
    description: "Batı minör dizisine yakın; şarkı formunda en yaygın makamlardan.",
  },
  {
    id: "suzinak",
    name: "Sûzinâk",
    nameTr: "Sûzinâk",
    nameEn: "Suzinak",
    tonic: "C",
    intervals: [2, 1, 3, 1, 2, 2, 1],
    characteristic: "Rast perdesi",
    description: "Rast ve hicaz renklerini birleştiren makam; rast'ta karar kılar.",
  },
  {
    id: "sehnaz",
    name: "Şehnaz",
    nameTr: "Şehnaz",
    nameEn: "Sehnaz",
    tonic: "C",
    intervals: [1, 1, 2, 1, 2, 2, 3],
    characteristic: "Dügâh perdesi",
    description: "Hicaz ailesinden, tiz bölgede parlak seyirli makam.",
  },
  {
    id: "acemkurdi",
    name: "Acemkürdî",
    nameTr: "Acemkürdî",
    nameEn: "Acemkurdi",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    characteristic: "Dügâh perdesi",
    description: "Kürdî ailesinden; acem perdesi vurgulu, dügâh'ta karar kılar.",
  },
  {
    id: "evic",
    name: "Eviç",
    nameTr: "Eviç",
    nameEn: "Evic",
    tonic: "C",
    intervals: [1, 2, 2, 1, 2, 2, 2],
    characteristic: "Irak perdesi",
    description: "Irak perdesinde karar kılan, segah ailesiyle ilişkili makam.",
  },
  // P1.3: TIER-1 makamlar (koma korpus + karar Gönül-teyitli; seyir otomatik).
  {
    id: "ferahnak",
    name: "Ferahnâk",
    nameTr: "Ferahnâk",
    nameEn: "Ferahnak",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    characteristic: "Irak perdesi",
    description: "Irak perdesinde Segâh'lı karar kılan makam (korpus + Gönül No.64).",
  },
  {
    id: "evcara",
    name: "Evcârâ",
    nameTr: "Evcârâ",
    nameEn: "Evcara",
    tonic: "C",
    intervals: [1, 1, 3, 1, 1, 4, 1],
    characteristic: "Irak perdesi",
    description: "Eviç açıp ırak'ta yedenli karar eden mürekkep makam (Gönül No.67).",
  },
  {
    id: "muhayyerkurdi",
    name: "Muhayyer Kürdî",
    nameTr: "Muhayyer Kürdî",
    nameEn: "Muhayyer Kurdi",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    characteristic: "Muhayyer perdesi",
    description: "Muhayyer üzerinde Uşşak/Kürdî açıp dügâh'ta (Kürdî) karar eder (Gönül No.112).",
  },
  {
    id: "suzidil",
    name: "Sûzidil",
    nameTr: "Sûzidil",
    nameEn: "Suzidil",
    tonic: "C",
    intervals: [2, 1, 1, 4, 1, 2, 1],
    characteristic: "Hüseyni perdesi",
    description: "Hüseynîde Hicaz Zirgüle gösterip aşîrân'da karar eden makam (Gönül No.38).",
  },
  {
    id: "gulizar",
    name: "Gülizâr",
    nameTr: "Gülizâr",
    nameEn: "Gulizar",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 2, 1],
    characteristic: "Hüseyni perdesi",
    description: "Hüseynî seslerde seyredip yerinde (dügâh) karar kılan makam (Gönül No.108).",
  },
];

// Otantik ariza + koma dizisi korpustan baglanir (otonom); editoryal metin
// yazili kalir.
export const MAKAM_DATA: Makam[] = MAKAM_BASE.map(attachCorpusData);

export function getMakamById(id: string): Makam | undefined {
  return MAKAM_DATA.find((m) => m.id === id);
}

export function getMakamScale(makam: Makam): string[] {
  const tonicIndex = NOTE_NAMES.indexOf(makam.tonic as typeof NOTE_NAMES[number]);
  const scale: string[] = [makam.tonic];

  let currentIndex = tonicIndex;
  for (const interval of makam.intervals.slice(0, 7)) {
    currentIndex = (currentIndex + interval) % 12;
    scale.push(NOTE_NAMES[currentIndex]);
  }

  return scale;
}
