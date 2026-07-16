/**
 * Rehberli ogrenme mufredati — MAKAM ekseni (basit -> murekkep makam).
 *
 * Usul ekseninin (curriculum.ts) esidi ikinci eksen. Her adim bir makami koma
 * perde dizisi + otoriter seyir metni + gam calimi ile ogretir. Yalniz seyir'i
 * OLAN 24 makam alinir (her adimda tam kaynakli veri: koma [korpus] + seyir
 * [Gonul s.307+]); seyir'i olmayan 10 makam ansiklopedide (/studio) kalir.
 *
 * Icerik ilkesi (UYDURMA YOK): koma/karar/guclu/seyir kaynaktan gelir ve UI'da
 * gosterilir; adim `note`'lari yalniz GENEL/faktuel cerceve (makam ailesi,
 * karakter) icerir — spesifik nota/perde iddiasi burada tekrarlanmaz.
 *
 * makamId'lerin MAKAM_DATA'da var oldugu ve seyir tasidigi testle dogrulanir.
 */

export interface MakamLearningStep {
  makamId: string;
  note: string;
}

export interface MakamLearningLevel {
  id: string;
  title: string;
  summary: string;
  steps: MakamLearningStep[];
}

export const MAKAM_CURRICULUM: MakamLearningLevel[] = [
  {
    id: "temel",
    title: "Temel (basit) makamlar",
    summary: "Cogu makamin cikis noktasi olan sade diziler.",
    steps: [
      {makamId: "rast", note: "Turk muziginin temel makami; bircok makamin cikis noktasi."},
      {makamId: "ussak", note: "En yaygin basit makamlardan; sade ve icli karakter."},
      {makamId: "huseyni", note: "Halk ve sanat muziginde cok kullanilan basit makam."},
      {makamId: "buselik", note: "Buselik dizili basit makam; nihavend ile akraba."},
      {makamId: "segah", note: "Kendine ozgu mikrotonal rengiyle temel makamlardan."},
    ],
  },
  {
    id: "yaygin",
    title: "Yaygin makamlar",
    summary: "Genis repertuvarda siklikla gecen makamlar.",
    steps: [
      {makamId: "hicaz", note: "Hicaz dizisiyle; en taninmis makamlardan, genis kullanim."},
      {makamId: "saba", note: "Kendine ozgu seyri ve icli karakteriyle bilinir."},
      {makamId: "bayati", note: "Ussak ailesinden; yaygin kullanilir."},
      {makamId: "nihavend", note: "Sed (gocurulmus) makam; bati minor dizisine yakin renk."},
      {makamId: "mahur", note: "Rast ailesinden, parlak karakterli makam."},
    ],
  },
  {
    id: "sed",
    title: "Sed ve tiz bolge makamlari",
    summary: "Gocurulmus diziler ve tiz bolgede seyreden makamlar.",
    steps: [
      {makamId: "nikriz", note: "Nikriz beslisiyle olusan sed makam."},
      {makamId: "acemasiran", note: "Acemasiran perdesinde karar; sed makam."},
      {makamId: "gerdaniye", note: "Rast ailesinden, tiz bolgede seyreder."},
      {makamId: "muhayyer", note: "Huseyni ailesinden, tiz karakterli makam."},
      {makamId: "tahir", note: "Huseyni'ye yakin; inici seyirli makam."},
    ],
  },
  {
    id: "murekkep",
    title: "Murekkep makamlar",
    summary: "Birden cok makami birlestiren, klasik repertuvarin zengin makamlari.",
    steps: [
      {makamId: "uzzal", note: "Hicaz ailesinden murekkep makam."},
      {makamId: "bestenigar", note: "Saba ile iliskili murekkep makam."},
      {makamId: "isfahan", note: "Bayati/Huseyni ailesinden murekkep makam."},
      {makamId: "acembuselik", note: "Buselik ailesinden murekkep makam."},
      {makamId: "yegah", note: "Yegah perdesinde karar; genis seyirli makam."},
      {makamId: "sultaniyegah", note: "Yegah bolgesinde seyreden murekkep makam."},
      {makamId: "hisar", note: "Huseyni ailesinden murekkep makam."},
      {makamId: "zirefkend", note: "Klasik repertuvarda gecen murekkep makam."},
      {makamId: "arazbar", note: "Klasik eserlerde kullanilan murekkep makam."},
    ],
  },
];

export const MAKAM_CURRICULUM_STEPS: ReadonlyArray<
  MakamLearningStep & {levelId: string; levelTitle: string}
> = MAKAM_CURRICULUM.flatMap((level) =>
  level.steps.map((step) => ({...step, levelId: level.id, levelTitle: level.title})),
);

export const MAKAM_TOTAL_STEPS = MAKAM_CURRICULUM_STEPS.length;
