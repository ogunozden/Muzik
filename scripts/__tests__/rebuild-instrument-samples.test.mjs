import {describe, expect, it} from "vitest";
import {detectByPeakSpacing, lowPass, resample} from "../rebuild-instrument-samples.mjs";
import {centsBetween, detectYin} from "../lib/pitch-detect.mjs";

/**
 * YENIDEN URETIMIN SAYISAL CEKIRDEGI (PLAN.md §10/F1)
 *
 * Bu dosyadaki fonksiyonlar bir gun **53 sample dosyasini bozdu** ve kusur
 * sessizdi: dosyalar dogru perdedeydi, dogru uzunluktaydi, sadece sesin
 * buyuk kismi SIFIRDI. Cikti dosyalarina bakan kapi bunu ancak sonradan
 * eklenen "sessiz kuyruk" iddiasiyla yakalayabildi. Bu test cekirdegi
 * DOGRUDAN olcer — kusur bir daha dosyalara ulasmadan yakalansin diye.
 *
 * ── TESTI YAZARKEN OGRENILEN ────────────────────────────────────────────
 * Ilk surumde perde kaymasi `detectByPeakSpacing` ile olculuyordu ve testler
 * dustu. Sebep kodda degil TESTTEYDI: saf sinus TEK bilesenlidir, tepe
 * araligi yontemi ise harmonik dizi ister. Ustelik gurultusuz sentetik
 * sinyalde Hann yan loblari en guclu 10 tepeye giriyor — gercek kayitta o
 * yerleri gercek kismi sesler doldurur. Ders: olcum aracini olculecek seye
 * gore sec; saf ton icin YIN, harmonik dizi icin tepe araligi.
 */

const RATE = 8000;

/** Bilinen frekansta saf sinus — girdi varsayilmaz, uretilir. */
function tone(hz, seconds = 0.5, rate = RATE) {
  const count = Math.floor(rate * seconds);
  const signal = new Float32Array(count);
  for (let i = 0; i < count; i++) signal[i] = Math.sin((2 * Math.PI * hz * i) / rate);
  return signal;
}

/** Gercek bir calgi gibi: cok harmonikli, hafif gurultulu. */
function harmonicSeries(fundamentals, {seconds = 2, noise = 0.02} = {}) {
  const count = Math.floor(RATE * seconds);
  const signal = new Float32Array(count);
  // Deterministik "gurultu" — testin her kosuda ayni sonucu vermesi icin.
  let seed = 12345;
  const nextNoise = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x3fffffff - 1;
  };

  for (let i = 0; i < count; i++) {
    for (const fundamental of fundamentals) {
      for (let harmonic = 1; harmonic <= 8; harmonic++) {
        signal[i] += Math.sin((2 * Math.PI * fundamental * harmonic * i) / RATE) / harmonic;
      }
    }
    signal[i] += nextNoise() * noise;
  }
  return signal;
}

/** Ortadaki bolumun RMS'i — kenar etkilerinden uzak. */
function rms(signal) {
  const from = Math.floor(signal.length * 0.25);
  const to = Math.floor(signal.length * 0.75);
  let sum = 0;
  for (let i = from; i < to; i++) sum += signal[i] * signal[i];
  return Math.sqrt(sum / (to - from));
}

/** Sesin bittigi nokta / toplam uzunluk. 1'e yakin olmali. */
function filledRatio(signal) {
  let lastAudible = 0;
  for (let i = 0; i < signal.length; i++) {
    if (Math.abs(signal[i]) > 1e-4) lastAudible = i;
  }
  return lastAudible / signal.length;
}

describe("lowPass — anti-alias alçak geçiren", () => {
  it("kesim altindaki tonu korur", () => {
    // cutoffRatio 0,25 -> 2000 Hz; 500 Hz gecmeli.
    expect(rms(lowPass(tone(500), 0.25))).toBeGreaterThan(0.6);
  });

  it("kesim ustundeki tonu en az 20 dB bastirir", () => {
    const passed = rms(lowPass(tone(500), 0.25));
    const stopped = rms(lowPass(tone(3500), 0.25));
    expect(stopped).toBeLessThan(passed / 10);
  });

  it("kesim >= Nyquist ise girdiyi AYNEN dondurur", () => {
    // Perde asagi kayarken (step <= 1) katlanma yok; bosuna suzmemeli.
    const input = tone(500);
    expect(lowPass(input, 0.5)).toBe(input);
  });

  it("DC kazanci 1 — suzgec seviyeyi kaydirmaz", () => {
    const constant = new Float32Array(400).fill(0.5);
    expect(lowPass(constant, 0.2)[200]).toBeCloseTo(0.5, 3);
  });
});

describe("resample — yeniden örnekleme", () => {
  // Perde testleri 44,1 kHz'de: 8 kHz'de 800 Hz'in periyodu yalnizca 10
  // ornek surer ve YIN'in kendi cozunurlugu (~13 cent) olcumu domine eder —
  // o zaman yeniden ornekleyiciyi degil dedektoru olcmus oluruz.
  const PITCH_RATE = 44100;

  // Sapma Hz ile degil CENT ile olculur — boru hattinin tamami cent
  // kullaniyor (etiket kapisi 45, betigin kendi dogrulamasi 12 cent).
  // Buradaki 10 cent, betigin kapisindan daha SIKI olsun diye secildi.
  const TOLERANCE_CENTS = 10;

  it("step > 1 perdeyi YUKARI tasir", () => {
    const source = tone(400, 1, PITCH_RATE);
    const rendered = resample(source, 2, Math.floor((source.length - 2) / 2));
    expect(Math.abs(centsBetween(detectYin(rendered, PITCH_RATE), 800))).toBeLessThan(TOLERANCE_CENTS);
  });

  it("step < 1 perdeyi ASAGI tasir", () => {
    const source = tone(800, 1, PITCH_RATE);
    const rendered = resample(source, 0.5, source.length);
    expect(Math.abs(centsBetween(detectYin(rendered, PITCH_RATE), 400))).toBeLessThan(TOLERANCE_CENTS);
  });

  it("KAYNAK SINIRI ASILIRSA kuyruk sifirla dolar — cagiranin sorumlulugu", () => {
    // Bugun 53 dosyayi bozan davranisin TA KENDISI. Duzeltme burada degil
    // cagirandaydi (cikti uzunlugu kaynakla sinirlandi); yine de davranis
    // sabitlensin ki "resample kendi halleder" diye yanlis varsayilmasin.
    const source = tone(400, 0.5);
    const tooLong = resample(source, 2, source.length); // 2 kat fazla istendi
    expect(filledRatio(tooLong)).toBeLessThan(0.55);
  });

  it("kaynakla SINIRLI istendiginde kuyruk sessiz DEGIL", () => {
    // Betikteki duzeltmenin kurali: outputFrames <= (kaynak - 2) / step.
    const source = tone(400, 0.5);
    const step = 2;
    const rendered = resample(source, step, Math.floor((source.length - 2) / step));
    expect(filledRatio(rendered)).toBeGreaterThan(0.99);
  });
});

describe("detectByPeakSpacing — üçüncü oy", () => {
  it("tek harmonik dizide temeli bulur", () => {
    const detected = detectByPeakSpacing(harmonicSeries([300]), RATE, {minHz: 100, maxHz: 3000});
    expect(detected).toBeGreaterThan(290);
    expect(detected).toBeLessThan(310);
  });

  it("IKI dizi ust uste binince ALTTAKINI verir — hakem yapilmamasinin sebebi", () => {
    // Tanpura'nin tam durumu: dem telleri bir oktav arayla gerilir, spektrum
    // iki harmonik dizinin toplamidir. Yontem burada 300'u degil **150**'yi
    // verir — yani etiketlenen perdeye gore bir oktav PES okur. Tanpura
    // klasorunde YIN'in "bir oktav asagi kaciyor" dedigim davranisinin
    // kaynagi da buydu; yanlis olan YIN degil, benim tek oya guvenmemdi.
    const detected = detectByPeakSpacing(harmonicSeries([300, 150]), RATE, {minHz: 100, maxHz: 3000});
    expect(detected).toBeGreaterThan(140);
    expect(detected).toBeLessThan(160);
  });

  it("tepe bulunamayan sinyalde null doner — uydurmaz", () => {
    expect(detectByPeakSpacing(new Float32Array(100), RATE)).toBeNull();
  });
});
