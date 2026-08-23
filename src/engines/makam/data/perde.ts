import {Makam} from "@/core/domain/models";

/**
 * AEU perde adlarinin Turkce ortografisi. Kaynak anahtarlar ASCII-normalize
 * gelir (`dugah`, `cargah`, `sehnaz`); bu tablo YALNIZ YAZIMDIR — muzikal
 * iddia tasimaz. Tabloda olmayan anahtar oldugu gibi doner (uydurma yok).
 */
export const PERDE_DISPLAY_NAMES: Record<string, string> = {
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
 * Eski `dominant` alani elle yazilmisti ve 11/48 makamda makamin KENDI
 * dizisinde bile yoktu (ussak "E", huseyni "A", segah "D"). Kaldirildi;
 * deger artik `komaScale.gucluPerde`den gelir (Aydemir 2010 + korpus).
 */
export function getMakamGuclu(makam: Makam): MakamPerdeRef | null {
  const perde = makam.komaScale?.gucluPerde;
  return perde ? {perde, label: formatPerdeName(perde), source: "corpus+aeu"} : null;
}
