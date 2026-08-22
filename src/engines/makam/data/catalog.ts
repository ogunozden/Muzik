import {Makam} from "@/core/domain/models";
import {NOTE_NAMES} from "@/shared/config/music-constants";
import {attachCorpusData} from "./core";

export const MAKAM_BASE: Makam[] = [
  { id: "rast", name: "Rast", nameTr: "Rast", nameEn: "Rast", tonic: "C", intervals: [2, 2, 1, 2, 2, 2, 1], characteristic: "Rast perdesi", description: "Türk musikisinin en temel makamlarından biri. Geniş ve görkemli bir ses sahibidir." },
  { id: "huseyni", name: "Hüseyni", nameTr: "Hüseyni", nameEn: "Hüseyni", tonic: "C", intervals: [2, 2, 1, 2, 1, 2, 2], characteristic: "Hüseyni perdesi", description: "Hüzünlü ve tesirli bir makam. Duygusal ifadeler için sıkça kullanılır." },
  { id: "nihavend", name: "Nihavend", nameTr: "Nihavend", nameEn: "Nihavend", tonic: "C", intervals: [1, 2, 2, 1, 2, 2, 2], characteristic: "Nihavend perdesi", description: "Türk musikisinde en çok kullanılan makamlardan biri. Dramamatik bir karakteri vardır." },
  { id: "hicaz", name: "Hicaz", nameTr: "Hicaz", nameEn: "Hicaz", tonic: "C", intervals: [1, 3, 1, 2, 1, 2, 2], characteristic: "Hicaz perdesi", description: "Doğu karakteri güçlü bir makam. Hicaz kürdi ve Uşşak ile karşılaştırılır." },
  { id: "ussak", name: "Uşşak", nameTr: "Uşşak", nameEn: "Ussak", tonic: "C", intervals: [2, 1, 2, 2, 1, 2, 2], characteristic: "Uşşak perdesi", description: "Yumuşak ve akıcı bir makam. Hicaz ailesine mensuptur." },
  { id: "saba", name: "Saba", nameTr: "Saba", nameEn: "Saba", tonic: "C", intervals: [1, 2, 1, 2, 3, 2, 1], characteristic: "Saba perdesi", description: "Karakteristik ve ayırt edici bir makam. Dede Efendi eserlerinde sıkça kullanılır." },
  { id: "segah", name: "Segah", nameTr: "Segah", nameEn: "Segah", tonic: "C", intervals: [3, 1, 2, 1, 2, 2, 1], characteristic: "Segah perdesi", description: "Tiz ve keskin bir karaktere sahip makam. İlahi ve nefes müziğinde yaygındır." },
  { id: "bayati", name: "Bayati", nameTr: "Bayati", nameEn: "Bayati", tonic: "C", intervals: [2, 1, 2, 2, 1, 2, 2], characteristic: "Bayati perdesi", description: "Yumuşak ve zarif bir makam. Şarkı formunda sıkça kullanılır." },
  { id: "hicazkürdi", name: "Hicaz Kürdi", nameTr: "Hicaz Kürdi", nameEn: "Hicaz Kurdi", tonic: "C", intervals: [1, 3, 1, 2, 2, 1, 2], characteristic: "Hicaz perdesi", description: "Hicaz ailesinin önemli bir kolu. Duygusal ve derin bir karaktere sahiptir." },
  { id: "kürdi", name: "Kürdi", nameTr: "Kürdi", nameEn: "Kurdi", tonic: "C", intervals: [1, 2, 1, 2, 2, 1, 3], characteristic: "Kürdi perdesi", description: "Yatay ve içli bir makam. Tasavvuf musikisinde sıkça kullanılır." },
  { id: "hüzzam", name: "Hüzzam", nameTr: "Hüzzam", nameEn: "Huzzam", tonic: "C", intervals: [1, 2, 2, 2, 1, 2, 2], characteristic: "Hüzzam perdesi", description: "Acı ve hüzünlü bir makam. Hicaz ailesiyle bağlantılıdır." },
  { id: "gerdaniye", name: "Gerdaniye", nameTr: "Gerdaniye", nameEn: "Gerdaniye", tonic: "C", intervals: [2, 1, 2, 2, 1, 2, 2], characteristic: "Gerdaniye perdesi", description: "Geniş ve görkemli bir makam. Gerdaniye perdesi karakteristik ses verir." },
  { id: "hisar", name: "Hisar", nameTr: "Hisar", nameEn: "Hisar", tonic: "C", intervals: [1, 2, 2, 2, 1, 2, 2], characteristic: "Hisar perdesi", description: "Hicaz ailesine mensup bir makam. Orta ses bölgesinde çalınır." },
  { id: "hisarbuselik", name: "Hisar Buselik", nameTr: "Hisarbûselik", nameEn: "Hisar Buselik", tonic: "C", intervals: [2, 1, 2, 2, 1, 2, 2], characteristic: "Hisar perdesi (4. derece hicaz)", description: "Hisar (Hicaz dörtlüsü) + Bûselik (Kürdi beşlisi) birleşik makamı. 4. derecedeki Hisar perdesi karakteristik. Çıkıcı-inici seyir; güçlü hüseyni. Korpus: 25 eser." },
  { id: "buselik", name: "Buselik", nameTr: "Buselik", nameEn: "Buselik", tonic: "C", intervals: [2, 2, 2, 2, 2, 1, 1], characteristic: "Buselik perdesi", description: "Neşeli ve canlı bir makam. Şarkı formlarında sıkça kullanılır." },
  { id: "cargah", name: "Çargah", nameTr: "Çargah", nameEn: "Cargah", tonic: "C", intervals: [2, 2, 1, 2, 2, 2, 1], characteristic: "Çargah perdesi", description: "Türk musikisinin en temel makamlarından biri. Beşliler sistemine dayanır." },
  { id: "acemasiran", name: "Acemaşiran", nameTr: "Acemaşiran", nameEn: "Acemasiran", tonic: "C", intervals: [2, 1, 2, 1, 2, 2, 2], characteristic: "Acem perdesi", description: "Acem ailesinin önemli bir makamı. Farsça eserlerde sıkça kullanılır." },
  { id: "acembuselik", name: "Acem Buselik", nameTr: "Acem Buselik", nameEn: "Acem Buselik", tonic: "C", intervals: [2, 1, 2, 2, 2, 2, 1], characteristic: "Acem perdesi", description: "Acem ve buselik ailelerinin birleşimi. Zengin bir ifade aralığına sahiptir." },
  { id: "karcığar", name: "Karcığar", nameTr: "Karcığar", nameEn: "Karcigar", tonic: "C", intervals: [1, 3, 2, 1, 2, 1, 2], characteristic: "Karcığar perdesi", description: "Karakteristik ve ayırt edici bir makam. Seyir karakteri dikkat çekicidir." },
  { id: "uzzal", name: "Uzzal", nameTr: "Uzzal", nameEn: "Uzzal", tonic: "C", intervals: [1, 3, 1, 3, 1, 2, 1], characteristic: "Uzzal perdesi", description: "Hicaz ailesinin en önemli makamlarından biri. Derin ve etkileyici bir karaktere sahiptir." },
  { id: "zirefkend", name: "Zirenkend", nameTr: "Zirenkend", nameEn: "Zirenkend", tonic: "C", intervals: [1, 2, 2, 2, 1, 3, 1], characteristic: "Zirenkend perdesi", description: "Az kullanılan ama karakteristik bir makam." },
  { id: "tahir", name: "Tahir", nameTr: "Tahir", nameEn: "Tahir", tonic: "C", intervals: [2, 2, 1, 2, 1, 2, 2], characteristic: "Tahir perdesi", description: "Yumuşak ve akıcı bir makam." },
  { id: "nikriz", name: "Nikriz", nameTr: "Nikriz", nameEn: "Nikriz", tonic: "C", intervals: [2, 2, 2, 1, 2, 1, 2], characteristic: "Nikriz perdesi", description: "Canlı ve neşeli bir makam." },
  { id: "sultaniyegah", name: "Sultaniyegah", nameTr: "Sultaniyegah", nameEn: "Sultaniyegah", tonic: "C", intervals: [2, 2, 2, 1, 2, 2, 1], characteristic: "Sultaniye perdesi", description: "Sultanların makamı. Görkemli ve heybetli bir karaktere sahiptir." },
  { id: "yegah", name: "Yegah", nameTr: "Yegah", nameEn: "Yegah", tonic: "C", intervals: [1, 3, 2, 2, 1, 2, 1], characteristic: "Yegah perdesi", description: "Alçak ve derin bir makam. Nefesli çalgılar için uygundur." },
  { id: "dügah", name: "Dügah", nameTr: "Dügah", nameEn: "Dügah", tonic: "C", intervals: [2, 2, 1, 2, 2, 1, 2], characteristic: "Dügah perdesi", description: "Orta ses bölgesinde çalınan yumuşak bir makam." },
  { id: "mahur", name: "Mahur", nameTr: "Mahur", nameEn: "Mahur", tonic: "C", intervals: [2, 2, 2, 1, 2, 2, 1], characteristic: "Mahur perdesi", description: "Batı musicasi etkisinde gelişen bir makam." },
  { id: "bestenigar", name: "Bestenigar", nameTr: "Bestenigar", nameEn: "Bestenigar", tonic: "C", intervals: [1, 2, 2, 2, 1, 2, 2], characteristic: "Bestenigar perdesi", description: "Saray müziğinde önemli bir makam." },
  { id: "müstear", name: "Müstear", nameTr: "Müstear", nameEn: "Müsteär", tonic: "C", intervals: [1, 2, 2, 2, 1, 3, 1], characteristic: "Müstear perdesi", description: "Karışık ve ilginç bir makam." },
  { id: "irakeyn", name: "Irakeyn", nameTr: "Irakeyn", nameEn: "Irakeyn", tonic: "C", intervals: [2, 1, 3, 1, 2, 2, 1], characteristic: "Irak perdesi", description: "Irak ve çevresinde kullanılan bir makam." },
  { id: "rehavi", name: "Rehavi", nameTr: "Rehavi", nameEn: "Rehavi", tonic: "C", intervals: [2, 1, 2, 2, 2, 1, 2], characteristic: "Rehavi perdesi", description: "Yumuşak ve dinlendirici bir makam." },
  { id: "muhayyer", name: "Muhayyer", nameTr: "Muhayyer", nameEn: "Muhayyer", tonic: "C", intervals: [2, 2, 1, 2, 2, 2, 1], characteristic: "Muhayyer perdesi", description: "Türk musikisinin en önemli makamlarından biri. Gür ve coşkulu bir karaktere sahiptir." },
  { id: "hümayun", name: "Hümayun", nameTr: "Hümayun", nameEn: "Hümayun", tonic: "C", intervals: [1, 3, 1, 2, 2, 2, 1], characteristic: "Hümayun perdesi", description: "Sultanların makamı. İork ve heybetli bir karaktere sahiptir." },
  { id: "isfahan", name: "Isfahan", nameTr: "Isfahan", nameEn: "Isfahan", tonic: "C", intervals: [1, 2, 2, 2, 1, 2, 2], characteristic: "Isfahan perdesi", description: "Acem ailesinden gelen yumuşak ve zarif bir makam." },
  { id: "arazbar", name: "Arazbar", nameTr: "Arazbar", nameEn: "Arazbar", tonic: "C", intervals: [1, 2, 2, 2, 1, 2, 2], characteristic: "Arazbar perdesi", description: "Acı ve hüzünlü bir makam. Hicaz ailesiyle bağlantılıdır." },
  // E9: Korpus-destekli ek makamlar (koma+intervals SymbTr'den baglanir; karar/guclu hizali).
  // huzzam/kurdi/karcigar app'te zaten var (normalize-eslesme ile korpus koma aliyor).
  { id: "hicazkar", name: "Hicazkâr", nameTr: "Hicazkâr", nameEn: "Hicazkar", tonic: "C", intervals: [2, 1, 3, 1, 1, 3, 1], characteristic: "Rast perdesi", description: "Hicaz ailesinden, rast perdesinde karar kılan mürekkep makam." },
  { id: "ferahfeza", name: "Ferahfezâ", nameTr: "Ferahfezâ", nameEn: "Ferahfeza", tonic: "C", intervals: [2, 1, 2, 2, 1, 2, 2], characteristic: "Yegâh perdesi", description: "Nihavend ailesinden, geniş ve ferah seyirli mürekkep makam." },
  // P1.2: Yaygın eksik makamlar (korpus koma + Gönül karar-teyitli; seyir otomatik).
  { id: "neva", name: "Nevâ", nameTr: "Nevâ", nameEn: "Neva", tonic: "C", intervals: [2, 2, 2, 1, 2, 2, 1], characteristic: "Dügâh perdesi", description: "Uşşak ailesinden; nevâ perdesinde güçlü, dügâh'ta karar kılar." },
  { id: "kurdilihicazkar", name: "Kürdîlihicazkâr", nameTr: "Kürdîlihicazkâr", nameEn: "Kurdilihicazkar", tonic: "C", intervals: [1, 2, 2, 2, 1, 2, 2], characteristic: "Rast perdesi", description: "Batı minör dizisine yakın; şarkı formunda en yaygın makamlardan." },
  { id: "suzinak", name: "Sûzinâk", nameTr: "Sûzinâk", nameEn: "Suzinak", tonic: "C", intervals: [2, 1, 3, 1, 2, 2, 1], characteristic: "Rast perdesi", description: "Rast ve hicaz renklerini birleştiren makam; rast'ta karar kılar." },
  { id: "sehnaz", name: "Şehnaz", nameTr: "Şehnaz", nameEn: "Sehnaz", tonic: "C", intervals: [1, 1, 2, 1, 2, 2, 3], characteristic: "Dügâh perdesi", description: "Hicaz ailesinden, tiz bölgede parlak seyirli makam." },
  { id: "acemkurdi", name: "Acemkürdî", nameTr: "Acemkürdî", nameEn: "Acemkurdi", tonic: "C", intervals: [1, 2, 2, 2, 1, 2, 2], characteristic: "Dügâh perdesi", description: "Kürdî ailesinden; acem perdesi vurgulu, dügâh'ta karar kılar." },
  { id: "evic", name: "Eviç", nameTr: "Eviç", nameEn: "Evic", tonic: "C", intervals: [1, 2, 2, 1, 2, 2, 2], characteristic: "Irak perdesi", description: "Irak perdesinde karar kılan, segah ailesiyle ilişkili makam." },
  // P1.3: TIER-1 makamlar (koma korpus + karar Gönül-teyitli; seyir otomatik).
  { id: "ferahnak", name: "Ferahnâk", nameTr: "Ferahnâk", nameEn: "Ferahnak", tonic: "C", intervals: [1, 2, 2, 2, 1, 2, 2], characteristic: "Irak perdesi", description: "Irak perdesinde Segâh'lı karar kılan makam (korpus + Gönül No.64)." },
  { id: "evcara", name: "Evcârâ", nameTr: "Evcârâ", nameEn: "Evcara", tonic: "C", intervals: [1, 1, 3, 1, 1, 4, 1], characteristic: "Irak perdesi", description: "Eviç açıp ırak'ta yedenli karar eden mürekkep makam (Gönül No.67)." },
  { id: "muhayyerkurdi", name: "Muhayyer Kürdî", nameTr: "Muhayyer Kürdî", nameEn: "Muhayyer Kurdi", tonic: "C", intervals: [1, 2, 2, 2, 1, 2, 2], characteristic: "Muhayyer perdesi", description: "Muhayyer üzerinde Uşşak/Kürdî açıp dügâh'ta (Kürdî) karar eder (Gönül No.112)." },
  { id: "suzidil", name: "Sûzidil", nameTr: "Sûzidil", nameEn: "Suzidil", tonic: "C", intervals: [2, 1, 1, 4, 1, 2, 1], characteristic: "Hüseyni perdesi", description: "Hüseynîde Hicaz Zirgüle gösterip aşîrân'da karar eden makam (Gönül No.38)." },
  { id: "gulizar", name: "Gülizâr", nameTr: "Gülizâr", nameEn: "Gulizar", tonic: "C", intervals: [2, 2, 2, 1, 2, 2, 1], characteristic: "Hüseyni perdesi", description: "Hüseynî seslerde seyredip yerinde (dügâh) karar kılan makam (Gönül No.108)." },
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
