/**
 * Rehberli ogrenme mufredati — USUL-MERKEZLI ilerleme (kucuk -> buyuk usul).
 *
 * Tasarim (kullanici karari, 2026-07-16): sifirdan ogrenen icin usul ekseninde
 * kademeli akis. Her adim bir usulu darp + velvele + calim ile ogretir; kullanici
 * "ogrendim/tekrar" isaretler (ilerleme localStorage'da).
 *
 * Icerik ilkesi (HARD CODE/UYDURMA YOK): adim notlari yalniz FAKTUEL/yapisal
 * bilgi icerir (usulun rolu, formu, yaygin kullanimi). Zaman/vurgu sayilari
 * UI'da getUsulGrouping ile CANLI turetilir — nota burada tekrar yazilmaz.
 * Mufredat, ansiklopedideki (/rhythm) 94 usulun kanonik ogretim alt kumesidir;
 * nadir/yapisal usuller rehbere alinmaz, ansiklopedide kalir.
 *
 * usulId'lerin USUL_DATA'da var oldugu testle dogrulanir (curriculum.test.ts).
 */

export interface LearningStep {
  /** USUL_DATA'daki usul id'si. */
  usulId: string;
  /** Kisa, faktuel ogretim notu (TR). */
  note: string;
}

export interface LearningLevel {
  id: string;
  /** Seviye basligi (TR). */
  title: string;
  /** Seviyenin bir cumlelik ozeti (TR). */
  summary: string;
  steps: LearningStep[];
}

export const CURRICULUM: LearningLevel[] = [
  {
    id: "temel",
    title: "Temel usuller",
    summary: "En kucuk usullerle basla: Dum ve Tek'i hisset.",
    steps: [
      {usulId: "nimsofyan", note: "En kucuk usul. Tum kucuk usullerin cekirdegi; Dum ve Tek ile basliyoruz."},
      {usulId: "semai", note: "Uc zamanli temel usul; semai formunun olcusudur."},
      {usulId: "sofyan", note: "En yaygin kucuk usul. Ilahi, sarki ve turkulerde cok kullanilir."},
    ],
  },
  {
    id: "aksak-orta",
    title: "Aksak ve orta usuller",
    summary: "Esit olmayan bolunusler ve alti-yedi zamanli usuller.",
    steps: [
      {usulId: "turkaksagi", note: "Aksak ailesinin temel usulu; halk muziginde cok yaygin."},
      {usulId: "yuruksemai", note: "Alti zamanli yuruk usul; sarki ve saz eserlerinde yaygin."},
      {usulId: "devirhindi", note: "Yedi zamanli usul; sarki formunda kullanilir."},
    ],
  },
  {
    id: "sekizli-dokuzlu",
    title: "Sekizli ve dokuzlu usuller",
    summary: "Sarki formunun bel kemigi: Duyek ve Aksak.",
    steps: [
      {usulId: "duyek", note: "Sarki formunun en yaygin usullerinden. Dum-Tek-Tek cekirdekli."},
      {usulId: "musemmen", note: "Sekiz zamanin Duyek'ten farkli bir bolunusu."},
      {usulId: "aksak", note: "Cok yaygin aksak usul; halk ve sanat muziginde genis kullanim."},
      {usulId: "evfer", note: "Mevlevi ilahi ve ayinlerinde kullanilan usul."},
    ],
  },
  {
    id: "onlu",
    title: "Onlu ve on ikili usuller",
    summary: "Curcuna'nin canliligi ve Cenber ailesinin girisi.",
    steps: [
      {usulId: "curcuna", note: "Canli, oynak usul; oyun havalari ve sarkilarda."},
      {usulId: "aksaksemai", note: "Sanat muziginin agir formlarinda kullanilan usul."},
      {usulId: "frenkcin", note: "On iki zamanli usul."},
      {usulId: "nimcember", note: "Cenber ailesinin kucuk olculu usulu."},
    ],
  },
  {
    id: "orta-buyuk",
    title: "Orta buyuk usuller",
    summary: "On uc zamandan yirmi zamana; buyuk formlara hazirlik.",
    steps: [
      {usulId: "nimevsat", note: "On uc zamanli usul; Evsat'in kucuk olcusu."},
      {usulId: "devrirevan", note: "On dort zamanli usul; sarki ve ilahilerde."},
      {usulId: "cifteduyek", note: "Iki Duyek'in birlesimi; on alti zamanli."},
      {usulId: "fahte", note: "Klasik buyuk usul; beste ve kar formlarinda."},
    ],
  },
  {
    id: "buyuk-beste",
    title: "Buyuk beste usulleri",
    summary: "Klasik kar ve beste formlarinin buyuk usulleri; Zincir ile kapanis.",
    steps: [
      {usulId: "cember", note: "Klasik buyuk usullerden; beste formunda."},
      {usulId: "devrikebir", note: "Klasik beste formunun buyuk usullerinden."},
      {usulId: "remel", note: "Kar ve beste formlarinda kullanilan buyuk usul."},
      {usulId: "muhammes", note: "Klasik beste formunun buyuk usulu."},
      {usulId: "hafif", note: "Klasik buyuk formlarin usulu."},
      {usulId: "berafsan", note: "Buyuk olculu klasik usul (Berefsan)."},
      {usulId: "sakil", note: "Kirk sekiz zamanli buyuk usul."},
      {usulId: "zincir", note: "Art arda zincirlenen usullerden olusan en buyuk usul (120 zaman)."},
    ],
  },
];

/** Duz adim listesi (seviye sinirlarindan bagimsiz gezinme icin). */
export const CURRICULUM_STEPS: ReadonlyArray<LearningStep & {levelId: string; levelTitle: string}> =
  CURRICULUM.flatMap((level) =>
    level.steps.map((step) => ({...step, levelId: level.id, levelTitle: level.title})),
  );

export const TOTAL_STEPS = CURRICULUM_STEPS.length;
