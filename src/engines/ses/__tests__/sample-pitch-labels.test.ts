import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {centsBetween, detectPitchConsensus, readWavMono} from "../../../../scripts/lib/pitch-detect.mjs";

/**
 * SAMPLE DOSYA ADI ICERIKLE UYUSUYOR MU? (PLAN.md §10/F0-F1)
 *
 * Bu test bir kusurun ardindan yazildi ve yazilirken IKI KEZ kendisi
 * yanildi; ikisi de burada kayitli, cunku ders olcum aracina guvenmemek:
 *
 *  1. `ney/` altindaki 10 dosyanin 5'i yanlis perde etiketi tasiyordu
 *     (`As4.wav` gercekte B3). Sessiz degil DUYULAN bir hataydi: motor
 *     dosya adini dogru varsayip `playbackRate = istenen / etiketlenen`
 *     hesapliyor (`samples.ts`), etiket yanlissa hiz 1.0 kaliyor.
 *
 *  2. Testin ILK dedektoru serbest otokorelasyondu ve alt-harmonige
 *     kilitlendi (`Ds5` 623 Hz iken 76 Hz). IKINCI denemesi "beklenen
 *     perdede korelasyon yuksek mi" idi ve YANLIS ETIKETLI dosyayi
 *     ONAYLADI — harmonik zengin seste yarim periyot lag'inde de
 *     korelasyon yuksek cikiyor.
 *
 *  3. UCUNCU yanilgi olcumde degil ONARIMDA idi: yeniden uretilen yuvalar
 *     sabit 1,6 s uzunlukta isteniyordu, ama kaynak `step` kati hizla
 *     okundugu icin erken tukeniyor ve kalan cerceveler SIFIRLA doluyordu.
 *     `tanpura/C5` sesin %14'unden sonrasi sessizdi; lavta'da 19, ud'da 7,
 *     baglama'da 3 dosya ayni sekilde kirikti. Ustelik betik dogrulanmayan
 *     ciktiyi da yaziyor, sonra hepsini "uretildi" diye sayiyordu.
 *
 *  4. DORDUNCU yanilgi bir gerekce uydurmakti: `tanpura` icin "tepeler esit
 *     aralikli, o halde aralik = temel" denip aralik yontemi TEK BASINA
 *     hakem yapilmisti. Tepeler yazdirilinca gerekce coktu — `C3` tepeleri
 *     132'nin 2,5 ve 3,5 kati da iceriyor, yani sinyalde bir oktav asagida
 *     ikinci bir dizi var (dem telleri). Aralik f ile f/2 arasinda belirsiz.
 *
 * Bu yuzden artik **iki bagimsiz yontem** (YIN + HPS) kullaniliyor ve
 * uyusmadiklarinda sonuc "bilmiyorum" oluyor. Bilmemek, yanlis bilmekten
 * iyidir — ozellikle dosya yeniden yazmak soz konusuysa.
 */

const SAMPLES_ROOT = path.join(process.cwd(), "public", "samples");
const NOTE_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];
const TOLERANCE_CENTS = 45;
/** Bunun altindaki genlik "sessiz" sayilir (24-bit tabaninin cok ustunde). */
const SILENCE_FLOOR = 1e-4;

/**
 * Enstruman basina beklenti — **olculdu, varsayilmadi**.
 *
 * `minAgreement`: iki yontemin uzlastigi dosya orani. Dusuk olmasi
 * enstrumanin TINISI yuzunden (telli/vurmali seslerde temel zayif),
 * dosyalarin bozuk oldugu anlamina GELMEZ.
 *
 * `verified: false` olanlar bilincli olarak DOGRULANMIYOR: olcum guvenilir
 * degil, dolayisiyla ne "dogru" ne "yanlis" diyebiliyoruz. Gizlenmiyor —
 * burada listeleniyor ki gorunur kalsin.
 */
const INSTRUMENTS: Array<{name: string; verified: boolean; minAgreement: number; note?: string}> = [
  // Esikler 0,25 s pencereyle OLCULEN degerlerin biraz altina konuldu
  // (olculen: kemence/tambur/ud/lavta 1,00 · kanun 0,92 · miskal/santur 0,83 ·
  //  ney 0,81 · baglama 0,64 · rebab 0,25).
  {name: "kemence", verified: true, minAgreement: 0.9},
  {name: "tambur", verified: true, minAgreement: 0.9},
  // ney lisans sebebiyle YENIDEN URETILDI (CC BY-NC -> Art Libre soundfont).
  // Uzlasma 1,00 -> 0,81 DUSTU ve bu bilincli kabul edilen bir bedeldir:
  // yeni kaynagin pes bolgesinde (Moss_Nay D3–G3) temel frekans cok zayif,
  // bu yuzden YIN ile HPS 7 dosyada uzlasamiyor. **Sapan dosya yok.**
  // Olculemeyen 7 dosya elde BIRAKILMADI, bagimsiz kanitla dogrulandi:
  //   · 6'sinda tepe araligi etiketle 45 cent icinde ortusuyor,
  //   · `C5`te aralik bir oktav pes okudu ama spektrum dogrudan bakildiginda
  //     temel 524 Hz'de GUCLU (261'deki tepe alt-harmonik).
  // Kiyas: eski Freesound ney'i 1,00 uzlasma veriyordu ama 36 yuvanin 16'si
  // kayit araligi DISINDA, 11 yarim tona varan gerilmeyle uretilmisti.
  {name: "ney", verified: true, minAgreement: 0.75},
  {name: "ud", verified: true, minAgreement: 0.9},
  {name: "lavta", verified: true, minAgreement: 0.9},
  {name: "kanun", verified: true, minAgreement: 0.85},
  {name: "miskal", verified: true, minAgreement: 0.75},
  {name: "santur", verified: true, minAgreement: 0.75},
  // Uzlasma orani DUSUK cunku yeniden ornekleme tiniyi degistirdi — ama
  // olculebilen her dosya adiyla ayni perdede.
  {name: "baglama", verified: true, minAgreement: 0.55},
  {name: "rebab", verified: true, minAgreement: 0.2, note: "bir oktav tizdi, duzeltildi"},
  // `tanpura` PROJEDEN CIKARILDI (asagidaki nota bak).
];

/**
 * `tanpura` 2026-07-27'de LISTEDEN CIKARILDI (PLAN.md §11.7).
 *
 * 36 dosyanin 35'i yanlis perde caliyordu ve kaynak Proteus `Tamburas`
 * preset'inin dort bolgesinin HICBIRI olculemiyordu — yani onarim imkansizdi.
 * Ayrica tanpura bir Hint sazidir; Turk muziginin dem sazi degildir ve
 * projede zaten `tambur` var.
 *
 * Dosyalar, klasor ve enstruman kaydi kaldirildi.
 */

function midiFromSlotName(name: string): number | null {
  const match = name.match(/^([A-G]s?)(-?\d)$/);
  if (!match) return null;
  const index = NOTE_NAMES.indexOf(match[1]);
  return index < 0 ? null : (Number(match[2]) + 1) * 12 + index;
}

function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface Scan {
  total: number;
  agreed: number;
  mismatches: string[];
}

function scanInstrument(folder: string): Scan {
  const files = fs.readdirSync(folder).filter((name) => name.endsWith(".wav"));
  const mismatches: string[] = [];
  let agreed = 0;

  for (const file of files) {
    const slot = file.replace(/\.wav$/, "");
    const midi = midiFromSlotName(slot);
    if (midi === null) continue;

    const wav = readWavMono(fs.readFileSync(path.join(folder, file)));
    if (!wav) continue;

    // Pencere 0,25 s: HPS'in DFT maliyeti pencereyle dogru orantili ve
    // 36 dosya x 11 enstruman testi dakikalara cikariyordu. Kapi ayni,
    // maliyet dortte bir.
    const detected = detectPitchConsensus(wav.mono, wav.rate, {seconds: 0.25});
    if (!detected.agreed || detected.hz === null) continue;

    agreed++;
    const cents = centsBetween(detected.hz, midiToFrequency(midi));
    if (Math.abs(cents) > TOLERANCE_CENTS) {
      mismatches.push(`${slot}: ${detected.hz.toFixed(1)} Hz (${cents > 0 ? "+" : ""}${cents.toFixed(0)} cent)`);
    }
  }

  return {total: files.length, agreed, mismatches};
}

describe("Sample etiketleri icerikle uyusmali (F1)", () => {
  it("KAPSAM: perde tasiyan her klasor bu testin icinde", () => {
    // ── COZULEN RISK ──────────────────────────────────────────────────────
    // Yukaridaki `INSTRUMENTS` listesi ELLE yazili. Birisi
    // `public/samples/` altina yeni bir melodik klasor koyup listeye eklemeyi
    // unutursa, o klasorun perdeleri HIC dogrulanmaz ve kimse fark etmez.
    //
    // Bu tam olarak `tanpura`da yasandi: klasor aylarca "dogrulanamiyor"
    // etiketiyle durdu, 36 dosyanin 35'i yanlis perde caliyordu.
    //
    // Bu kapi listeyi klasorlerle KARSILASTIRIR: kapsam disi kalan melodik
    // klasor olamaz.
    const percussionFolders = new Set([
      "kudum", "bendir", "davul", "def", "darbuka", "zilli-def", "kasik", "zil", "nakkare",
    ]);
    const covered = new Set(INSTRUMENTS.map((instrument) => instrument.name));

    const uncovered = fs
      .readdirSync(SAMPLES_ROOT, {withFileTypes: true})
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => !percussionFolders.has(name) && !covered.has(name))
      .sort();

    expect(uncovered).toEqual([]);
  });

  for (const instrument of INSTRUMENTS) {
    const folder = path.join(SAMPLES_ROOT, instrument.name);
    const exists = fs.existsSync(folder);

    it.skipIf(!exists)(`${instrument.name} — 36 kromatik yuva dolu`, () => {
      const files = new Set(fs.readdirSync(folder));
      const missing: string[] = [];
      for (let midi = 48; midi < 84; midi++) {
        const name = `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}.wav`;
        if (!files.has(name)) missing.push(name);
      }
      expect(missing).toEqual([]);
    });

    // Perde DOGRU olup dosya yine de bozuk olabilir: yeniden uretim sirasinda
    // kaynak erken tukenip kalan cerceveler sifirla dolduruldugunda etiket ve
    // perde tutar ama ses ortasinda BITER. Gercekten olan buydu — bu kapi
    // konmadan once `tanpura/C5` sesin %14'unden sonrasi sessizdi.
    it.skipIf(!exists)(`${instrument.name} — hicbir dosyanin kuyrugu sessiz degil`, () => {
      const truncated: string[] = [];
      for (const file of fs.readdirSync(folder).filter((name) => name.endsWith(".wav"))) {
        const wav = readWavMono(fs.readFileSync(path.join(folder, file)));
        if (!wav) continue;

        let lastAudible = 0;
        for (let i = 0; i < wav.mono.length; i++) {
          if (Math.abs(wav.mono[i]) > SILENCE_FLOOR) lastAudible = i;
        }
        const filled = lastAudible / wav.mono.length;
        if (filled < 0.9) truncated.push(`${file} %${(filled * 100).toFixed(0)}`);
      }
      expect(truncated).toEqual([]);
    }, 60_000);

    if (!instrument.verified) {
      it.skipIf(!exists)(`${instrument.name} — DOGRULANAMIYOR (${instrument.note})`, () => {
        // Iddia: bu enstrumanda olcum hala guvenilmez. Bir gun guvenilir
        // hale gelirse bu test KIRILIR ve listeden cikarilmasi gerektigini
        // hatirlatir. Borc gorunur kalsin diye boyle.
        const scan = scanInstrument(folder);
        expect(scan.agreed / scan.total).toBeLessThan(0.55);
      }, 90_000);
      continue;
    }

    it.skipIf(!exists)(`${instrument.name} — uzlasilan her dosya adiyla ayni perdede`, () => {
      const scan = scanInstrument(folder);

      expect(scan.agreed / scan.total).toBeGreaterThanOrEqual(instrument.minAgreement);
      expect(scan.mismatches).toEqual([]);
    }, 90_000);
  }
});
