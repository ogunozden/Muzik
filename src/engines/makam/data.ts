import {Makam, MakamKeyAccidental, MakamKomaScale} from "@/types";
import {NOTE_NAMES} from "@/lib/app-constants";
import {midiToFrequency, noteNameToMidi} from "@/engines/nota/data";
import makamCorpus from "./__generated__/makam-corpus.json";
import makamSeyir from "./__generated__/makam-seyir.generated.json";

/**
 * Makamin OTANTIK koma arizasi + 53-EDO koma dizisi elle yazilmaz; SymbTr
 * korpusundan turetilmis `makam-corpus.json`den (npm run derive:makam-corpus)
 * makam adiyla eslenerek baglanir. Editoryal alanlar (aciklama, dominant)
 * yazili kalir; ariza ve koma dizisi otonom.
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

// Levenshtein mesafesi <= 1 mi? (yazim varyantlari icin: Nihavend/Nihavent,
// Bayati/Beyati gibi tek-harf farklari). Elle eslesme sozlugu yerine otonom.
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length - short.length > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i += 1;
      j += 1;
      continue;
    }
    if (++edits > 1) return false;
    if (short.length === long.length) {
      i += 1;
      j += 1; // ikame
    } else {
      j += 1; // silme/ekleme
    }
  }
  return edits + (long.length - j) + (short.length - i) <= 1;
}

// Makam adini korpus anahtarina cozumler (ariza ve koma dizisi ayni eslemeyi
// paylasir): once tam ad/id, sonra BENZERSIZ tek-harf yazim varyanti.
function resolveCorpusKey(makam: Makam): string | undefined {
  const norm = normalizeMakamName(makam.nameTr);
  if (CORPUS_MAKAMS[norm]) return norm;
  const idNorm = normalizeMakamName(makam.id);
  if (CORPUS_MAKAMS[idNorm]) return idNorm;
  const near = Object.keys(CORPUS_MAKAMS).filter((key) => withinOneEdit(key, norm));
  return near.length === 1 ? near[0] : undefined;
}

function attachCorpusData(makam: Makam): Makam {
  const seyir = SEYIR_METINLERI[makam.id];
  const base = seyir ? {...makam, seyir} : makam;
  const key = resolveCorpusKey(makam);
  if (!key) return base;
  const entry = CORPUS_MAKAMS[key];
  const komaScale = CORPUS_KOMA_SCALES[key];
  // 12-TET `intervals` artik korpus koma dizisinden OTONOM turetilir (elle
  // yazilan yerine); temiz heptatoni cikmazsa el-yazimina duser. Otantik perde
  // komaScale'de; bu, 12-TET notasyon izdusumu.
  const intervals = komaScale?.intervals12 ?? makam.intervals;
  return {
    ...base,
    intervals,
    keySignature: entry.keySignature,
    keySignatureConsensus: entry.consensus,
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

const MAKAM_BASE: Makam[] = [
  {
    id: "rast",
    name: "Rast",
    nameTr: "Rast",
    nameEn: "Rast",
    tonic: "C",
    intervals: [2, 2, 1, 2, 2, 2, 1],
    dominant: "G",
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
    dominant: "A",
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
    dominant: "D",
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
    dominant: "E",
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
    dominant: "E",
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
    dominant: "F",
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
    dominant: "D",
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
    dominant: "A",
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
    dominant: "E",
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
    dominant: "D",
    characteristic: "Kürdi perdesi",
    description: "Yatay ve içli bir makam. Tasavvuf musikisinde sıkça kullanılır.",
  },
  {
    id: "nevaber",
    name: "Nevaber",
    nameTr: "Nevaber",
    nameEn: "Nevaber",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 2, 1],
    dominant: "F",
    characteristic: "Nevaber perdesi",
    description: "Neva familyasından gelen yumuşak bir makam.",
  },
  {
    id: "nevadur",
    name: "Nevadür",
    nameTr: "Nevadür",
    nameEn: "Nevadur",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 1, 2],
    dominant: "F",
    characteristic: "Nevaber perdesi",
    description: "Nevaber'in farklı bir şekli. Daha geniş bir ifade aralığına sahiptir.",
  },
  {
    id: "hüzzam",
    name: "Hüzzam",
    nameTr: "Hüzzam",
    nameEn: "Huzzam",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    dominant: "A",
    characteristic: "Hüzzam perdesi",
    description: "Acı ve hüzünlü bir makam. Hicaz ailesiyle bağlantılıdır.",
  },
  {
    id: "uerite",
    name: "Ureyş",
    nameTr: "Ureyş",
    nameEn: "Ureysh",
    tonic: "C",
    intervals: [2, 1, 2, 1, 2, 2, 2],
    dominant: "G",
    characteristic: "Ureyş perdesi",
    description: "Canlı ve neşeli bir makam. Düğün ve eğlence müziğinde kullanılır.",
  },
  {
    id: "gerdaniye",
    name: "Gerdaniye",
    nameTr: "Gerdaniye",
    nameEn: "Gerdaniye",
    tonic: "C",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    dominant: "G",
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
    dominant: "E",
    characteristic: "Hisar perdesi",
    description: "Hicaz ailesine mensup bir makam. Orta ses bölgesinde çalınır.",
  },
  {
    id: "hisarbuselik",
    name: "Hisar Buselik",
    nameTr: "Hisar Buselik",
    nameEn: "Hisar Buselik",
    tonic: "C",
    intervals: [1, 2, 2, 2, 2, 2, 1],
    dominant: "E",
    characteristic: "Hisar perdesi",
    description: "Buselik ailesinden gelen bir makam. Yumuşak bir karakteri vardır.",
  },
  {
    id: "buselik",
    name: "Buselik",
    nameTr: "Buselik",
    nameEn: "Buselik",
    tonic: "C",
    intervals: [2, 2, 2, 2, 2, 1, 1],
    dominant: "G",
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
    dominant: "D",
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
    dominant: "G",
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
    dominant: "G",
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
    dominant: "F",
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
    dominant: "E",
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
    dominant: "D",
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
    dominant: "F",
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
    dominant: "G",
    characteristic: "Nikriz perdesi",
    description: "Canlı ve neşeli bir makam.",
  },
  {
    id: "Güldeste",
    name: "Güldeste",
    nameTr: "Güldeste",
    nameEn: "Güldeste",
    tonic: "C",
    intervals: [2, 2, 1, 2, 2, 1, 2],
    dominant: "G",
    characteristic: "Güldeste perdesi",
    description: "Gül gibi açılan bir makam. Şarkı formlarında kullanılır.",
  },
  {
    id: "dilçin",
    name: "Dilçin",
    nameTr: "Dilçin",
    nameEn: "Dilchin",
    tonic: "C",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    dominant: "G",
    characteristic: "Dilçin perdesi",
    description: "Yumuşak ve zarif bir makam.",
  },
  {
    id: "sultaniyegah",
    name: "Sultaniyegah",
    nameTr: "Sultaniyegah",
    nameEn: "Sultaniyegah",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 2, 1],
    dominant: "F",
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
    dominant: "D",
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
    dominant: "G",
    characteristic: "Dügah perdesi",
    description: "Orta ses bölgesinde çalınan yumuşak bir makam.",
  },
  {
    id: "segahira",
    name: "Segahira",
    nameTr: "Segahira",
    nameEn: "Segahira",
    tonic: "C",
    intervals: [3, 1, 2, 2, 1, 2, 1],
    dominant: "D",
    characteristic: "Segah perdesi",
    description: "Segah'ın genişletilmiş hali.",
  },
  {
    id: "hincin",
    name: "Hıncın",
    nameTr: "Hıncın",
    nameEn: "Hincin",
    tonic: "C",
    intervals: [1, 3, 1, 2, 1, 2, 2],
    dominant: "E",
    characteristic: "Hicaz perdesi",
    description: "Hicaz'ın biraz daha hızlı seyreden versiyonu.",
  },
  {
    id: "mahur",
    name: "Mahur",
    nameTr: "Mahur",
    nameEn: "Mahur",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 2, 1],
    dominant: "G",
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
    dominant: "D",
    characteristic: "Bestenigar perdesi",
    description: "Saray müziğinde önemli bir makam.",
  },
  {
    id: "tarzannef",
    name: "Tarzannef",
    nameTr: "Tarzannef",
    nameEn: "Tarzannef",
    tonic: "C",
    intervals: [2, 1, 2, 1, 2, 1, 3],
    dominant: "E",
    characteristic: "Tarzannef perdesi",
    description: "Zarif ve ince bir makam.",
  },
  {
    id: "müstear",
    name: "Müstear",
    nameTr: "Müstear",
    nameEn: "Müsteär",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 3, 1],
    dominant: "E",
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
    dominant: "G",
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
    dominant: "F",
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
    dominant: "G",
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
    dominant: "E",
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
    dominant: "D",
    characteristic: "Isfahan perdesi",
    description: "Acem ailesinden gelen yumuşak ve zarif bir makam.",
  },
  {
    id: "zengule",
    name: "Zengule",
    nameTr: "Zengule",
    nameEn: "Zengule",
    tonic: "C",
    intervals: [2, 1, 2, 2, 1, 2, 2],
    dominant: "G",
    characteristic: "Zengule perdesi",
    description: "Zengin ve dolgun bir makam. Şarkı formlarında sıkça kullanılır.",
  },
  {
    id: "arazbar",
    name: "Arazbar",
    nameTr: "Arazbar",
    nameEn: "Arazbar",
    tonic: "C",
    intervals: [1, 2, 2, 2, 1, 2, 2],
    dominant: "D",
    characteristic: "Arazbar perdesi",
    description: "Acı ve hüzünlü bir makam. Hicaz ailesiyle bağlantılıdır.",
  },
  // --- Korpus-destekli ek makamlar (E9, 2026-07-16) ---
  // GERCEKTEN YENI makamlar (app'te yoktu). Koma dizisi + intervals SymbTr
  // korpusundan attachCorpusData ile otomatik baglanir; karar/guclu korpus
  // kararPerde/gucluPerde ile HIZALI. NOT: huzzam/kurdi/karcigar app'te ZATEN
  // vardi (Turkce-karakterli id: "hüzzam"/"kürdi"/"karcığar", normalize-eslesme
  // ile korpus koma'yi zaten aliyorlar); dubleyi onlemek icin eklenmedi.
  {
    id: "hicazkar",
    name: "Hicazkâr",
    nameTr: "Hicazkâr",
    nameEn: "Hicazkar",
    tonic: "C",
    intervals: [2, 1, 3, 1, 1, 3, 1],
    dominant: "G",
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
    dominant: "G",
    characteristic: "Yegâh perdesi",
    description: "Nihavend ailesinden, geniş ve ferah seyirli mürekkep makam.",
  },
  // --- P1.2: yaygın eksik makamlar (korpus koma + Gönül karar-teyitli) ---
  // Koma/intervals SymbTr korpusundan (attachCorpusData); karar Gönül s.307+ seyir
  // nesriyle teyitli; güçlü konvansiyonel 5. derece; seyir Gönül'den otomatik bağlanır.
  {
    id: "neva",
    name: "Nevâ",
    nameTr: "Nevâ",
    nameEn: "Neva",
    tonic: "C",
    intervals: [2, 2, 2, 1, 2, 2, 1],
    dominant: "G",
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
    dominant: "G",
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
    dominant: "G",
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
    dominant: "F",
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
    dominant: "G",
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
    dominant: "F#",
    characteristic: "Irak perdesi",
    description: "Irak perdesinde karar kılan, segah ailesiyle ilişkili makam.",
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
