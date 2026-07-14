import {Makam, MakamKeyAccidental} from "@/types";
import {NOTE_NAMES} from "@/lib/app-constants";
import makamCorpus from "./__generated__/makam-corpus.json";

/**
 * Makamin OTANTIK koma arizasi elle yazilmaz; SymbTr korpusundan turetilmis
 * `makam-corpus.json`den (npm run derive:makam-corpus) makam adiyla eslenerek
 * baglanir. Editoryal alanlar (aciklama, dominant) yazili kalir; ariza otonom.
 */
type MakamCorpusEntry = {display: string; total: number; consensus: number; keySignature: MakamKeyAccidental[]};
const CORPUS_MAKAMS = makamCorpus.makams as Record<string, MakamCorpusEntry>;

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

function findCorpusEntry(makam: Makam): MakamCorpusEntry | undefined {
  const norm = normalizeMakamName(makam.nameTr);
  const exact = CORPUS_MAKAMS[norm] ?? CORPUS_MAKAMS[normalizeMakamName(makam.id)];
  if (exact) return exact;
  // Tek-harf yazim varyanti: yalniz BENZERSIZ aday varsa kabul (guvenli).
  const near = Object.keys(CORPUS_MAKAMS).filter((key) => withinOneEdit(key, norm));
  return near.length === 1 ? CORPUS_MAKAMS[near[0]] : undefined;
}

function attachCorpusKeySignature(makam: Makam): Makam {
  const entry = findCorpusEntry(makam);
  if (!entry) return makam;
  return {...makam, keySignature: entry.keySignature, keySignatureConsensus: entry.consensus};
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
    id: " çargah",
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
];

// Otantik ariza korpustan baglanir (otonom); editoryal metin yazili kalir.
export const MAKAM_DATA: Makam[] = MAKAM_BASE.map(attachCorpusKeySignature);

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
