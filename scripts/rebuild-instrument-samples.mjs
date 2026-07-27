#!/usr/bin/env node
/**
 * BIR ENSTRUMANIN YUVALARINI KENDI DOGRU DOSYALARINDAN YENIDEN URETIR
 * (PLAN.md §10/F1).
 *
 * ── COZULEN KUSUR ───────────────────────────────────────────────────────
 * Bazi klasorlerde soundfont render'i yanlis cikmis: dosya adi bir perdeyi
 * soyluyor, icerik baskasini caliyor. Motor dosya adini DOGRU VARSAYIP
 * `playbackRate = istenen / etiketlenen` hesapladigi icin (`samples.ts`),
 * yanlis etiketli yuva duyulur bicimde yanlis perde calar.
 *
 * ── YONTEM ──────────────────────────────────────────────────────────────
 * 1. Her dosyanin perdesi OLCULUR — uc bagimsiz yontemin en az IKISI
 *    uzlasmadan sonuc kabul edilmez (bkz. `detectRobust`).
 * 2. Etiketiyle UYUSAN dosyalar "saglam kaynak" sayilir.
 * 3. Kalan yuvalar en yakin saglam kaynaktan yeniden orneklenerek uretilir;
 *    hedefe oturana kadar kapali dongu (uret → olc → duzelt).
 * 4. YALNIZ dogrulanan yuva diske yazilir. Dogrulanamayan yuvaya
 *    DOKUNULMAZ ve sayisi rapor edilir.
 *
 * Saglam kaynak yoksa **hicbir sey yapilmaz** — uydurma uretilmez.
 *
 * ── TANPURA: BILINCLI OLARAK DISARIDA ───────────────────────────────────
 * `tanpura` bu betikle ONARILAMAZ. Cok telli bir dem sazi oldugu ve telleri
 * bir oktav arayla gerildigi icin spektrumu iki harmonik dizinin ust uste
 * binmesidir; uc yontem de tutarli bir temel frekans veremiyor. Olcemedigimiz
 * seyi yeniden yazmayiz — dosyalar oldugu gibi birakilmistir ve borc
 * `sample-pitch-labels.test.ts` icinde gorunur tutulur.
 *
 * Kullanim:  node scripts/rebuild-instrument-samples.mjs lavta ud
 */
import fs from "node:fs";
import path from "node:path";
import {centsBetween, detectHps, detectYin, readWavMono} from "./lib/pitch-detect.mjs";

const SAMPLES_ROOT = path.join(process.cwd(), "public", "samples");
const NOTE_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];
const FIRST_MIDI = 48;
const SLOT_COUNT = 36;
/** Saglam kaynak sayilmak icin etikete yakinlik. */
const SOURCE_TOLERANCE_CENTS = 45;

const midiToFrequency = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const slotName = (midi) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

/**
 * TEPE ARALIGI yontemi — UCUNCU OY.
 *
 * Esit aralikli spektrum tepeleri bir harmonik dizidir ve aralik temel
 * frekansa esittir; temelde hic enerji olmasa bile bir tahmin uretir. Telli
 * seslerde YIN'in oktav kacirdigi, HPS'in harmonige tirmandigi durumlarda
 * berabere bozan oy olarak degerlidir.
 *
 * SINIRI: sinyalde IKI harmonik dizi ust uste binmisse (ornegin bir oktav
 * arayla gerilmis dem telleri) tepe farklari hem f hem f/2 icerir ve medyan
 * hangisi cok ise onu secer. Bu yuzden TEK BASINA hakem yapilamaz.
 */
export function detectByPeakSpacing(mono, rate, {minHz = 60, maxHz = 2500} = {}) {
  const start = Math.floor(mono.length * 0.3);
  const length = Math.min(Math.floor(rate * 0.35), mono.length - start);
  if (length <= 0) return null;

  const decimation = Math.max(1, Math.floor(rate / 12000));
  const sampleRate = rate / decimation;
  const count = Math.floor(length / decimation);
  const signal = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    signal[i] = mono[start + i * decimation] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (count - 1)));
  }

  const magnitudes = [];
  const steps = Math.round(centsBetween(maxHz, minHz) / 8);
  for (let step = 0; step <= steps; step++) {
    const hz = minHz * Math.pow(2, (step * 8) / 1200);
    if (hz > maxHz) break;
    const omega = (2 * Math.PI * hz) / sampleRate;
    let re = 0;
    let im = 0;
    for (let i = 0; i < count; i++) {
      re += signal[i] * Math.cos(omega * i);
      im += signal[i] * Math.sin(omega * i);
    }
    magnitudes.push({hz, mag: Math.sqrt(re * re + im * im) / count});
  }

  const peaks = [];
  for (let i = 2; i < magnitudes.length - 2; i++) {
    const m = magnitudes[i];
    if (
      m.mag > magnitudes[i - 1].mag && m.mag > magnitudes[i + 1].mag &&
      m.mag > magnitudes[i - 2].mag && m.mag > magnitudes[i + 2].mag
    ) peaks.push(m);
  }
  if (peaks.length < 3) return null;

  peaks.sort((a, b) => b.mag - a.mag);
  const strongest = peaks.slice(0, 10).sort((a, b) => a.hz - b.hz);

  const differences = [];
  for (let i = 1; i < strongest.length; i++) differences.push(strongest[i].hz - strongest[i - 1].hz);
  if (differences.length < 2) return null;

  const sorted = [...differences].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  if (median <= 0) return null;

  // Medyanin yakininda olanlarin ortalamasi — harmonik ATLAMALARINI eler.
  const near = differences.filter((d) => Math.abs(d - median) / median < 0.15);
  if (near.length < 2) return null;
  return near.reduce((sum, d) => sum + d, 0) / near.length;
}

/**
 * Uc yontemden EN AZ IKISI hemfikirse perde kabul edilir.
 *
 * ── TEK BASINA ARALIK YONTEMI NEDEN YETMEZ ──────────────────────────────
 * Bir ara `tanpura` icin aralik yontemini TEK BASINA yeterli saymistim;
 * gerekce "tepeler esit aralikli, temelde enerji yok" idi. Tepeler tek tek
 * yazdirilinca bu gerekce COKTU:
 *
 *     C3.wav tepeleri: 330  463  526  657  791  1053 ...
 *                      = 132'nin 2,5 · 3,5 · 4 · 5 · 6 · 8 kati
 *
 * Yarim-tam sayi harmonikler, sinyalde 132'nin YARISINDA (~66 Hz) ikinci bir
 * periyot oldugunu gosterir. Tanpura cok telli bir dem sazidir ve tipik
 * akordunda teller bir oktav arayla gerilir; spektrum iki harmonik dizinin
 * ust uste binmesidir. Bu durumda "aralik" f ile f/2 arasinda BELIRSIZDIR
 * ve medyan hangisini secerse onu verir — olcum degil, kura.
 *
 * Bu yuzden aralik yontemi UCUNCU OY olarak kalir, hakem olamaz. Uzlasma
 * saglanamayan enstrumanin dosyalarina DOKUNULMAZ.
 */
function detectRobust(mono, rate) {
  const candidates = [detectYin(mono, rate), detectHps(mono, rate), detectByPeakSpacing(mono, rate)]
    .filter((hz) => hz !== null && Number.isFinite(hz));
  if (candidates.length < 2) return null;

  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      if (Math.abs(centsBetween(candidates[i], candidates[j])) <= 55) {
        return (candidates[i] + candidates[j]) / 2;
      }
    }
  }
  return null;
}

/**
 * ANTI-ALIAS ALCAK GECIREN (pencerelenmis sinc FIR).
 *
 * Perde YUKARI kaydirilirken (step > 1) kaynagin `Nyquist / step` ustundeki
 * icerigi Nyquist'ten geri katlanir ve INHARMONIK curultuye donusur. Tanpura
 * gibi ust harmonikleri cok guclu tinilerde (cevari koprusu) bu, spektrumun
 * esit araliklarini bozar — yani hem tiniyi hem OLCUMU bozar.
 */
function lowPass(input, cutoffRatio) {
  if (cutoffRatio >= 0.5) return input;
  const taps = 63;
  const middle = (taps - 1) / 2;
  const kernel = new Float64Array(taps);
  let sum = 0;
  for (let i = 0; i < taps; i++) {
    const x = i - middle;
    const sinc = x === 0 ? 2 * cutoffRatio : Math.sin(2 * Math.PI * cutoffRatio * x) / (Math.PI * x);
    // Blackman penceresi — yan lob bastirmasi icin.
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (taps - 1));
    kernel[i] = sinc * w;
    sum += kernel[i];
  }
  for (let i = 0; i < taps; i++) kernel[i] /= sum;

  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let acc = 0;
    for (let k = 0; k < taps; k++) {
      const j = i + k - middle;
      if (j >= 0 && j < input.length) acc += input[j] * kernel[k];
    }
    output[i] = acc;
  }
  return output;
}

function resample(input, step, outputLength) {
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const position = i * step;
    const index = Math.floor(position);
    const fraction = position - index;
    const p0 = input[Math.max(0, index - 1)] ?? 0;
    const p1 = input[index] ?? 0;
    const p2 = input[index + 1] ?? 0;
    const p3 = input[index + 2] ?? 0;
    output[i] =
      0.5 * (2 * p1 + (-p0 + p2) * fraction +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * fraction * fraction +
        (-p0 + 3 * p1 - 3 * p2 + p3) * fraction * fraction * fraction);
  }
  return output;
}

function wavFormat(file) {
  const buffer = fs.readFileSync(file);
  return {channels: buffer.readUInt16LE(22), rate: buffer.readUInt32LE(24), bits: buffer.readUInt16LE(34)};
}

function writeWavLike(file, mono, format) {
  const {rate, channels, bits} = format;
  const bytesPerSample = bits / 8;
  const blockAlign = bytesPerSample * channels;
  const dataSize = mono.length * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bits, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  const maxValue = Math.pow(2, bits - 1) - 1;
  for (let i = 0; i < mono.length; i++) {
    const value = Math.round(Math.max(-1, Math.min(1, mono[i])) * maxValue);
    const base = 44 + i * blockAlign;
    for (let channel = 0; channel < channels; channel++) {
      const p = base + channel * bytesPerSample;
      if (bits === 24) {
        buffer[p] = value & 0xff;
        buffer[p + 1] = (value >> 8) & 0xff;
        buffer[p + 2] = (value >> 16) & 0xff;
      } else if (bits === 16) buffer.writeInt16LE(value, p);
      else if (bits === 32) buffer.writeInt32LE(value, p);
    }
  }
  fs.writeFileSync(file, buffer);
}

/**
 * IMPORT-GUVENLIK: ana dongu yalniz betik DOGRUDAN calistirildiginda isler.
 *
 * Bir dogrulama betigi `detectByPeakSpacing`i import etti ve bu dosyanin
 * ust-seviye dongusu YENIDEN CALISTI — tanpura ikinci kez yeniden uretildi.
 * Sessiz bir yan etkiydi; kapatildi.
 */
const invokedDirectly = process.argv[1] !== undefined &&
  path.basename(process.argv[1]) === "rebuild-instrument-samples.mjs";

for (const instrument of (invokedDirectly ? process.argv.slice(2) : [])) {
  const folder = path.join(SAMPLES_ROOT, instrument);
  if (!fs.existsSync(folder)) {
    console.error(`[yok] ${instrument}`);
    continue;
  }

  // 1) Mevcut dosyalari olc; etiketiyle UYUSANLAR saglam kaynak.
  const healthy = [];
  const broken = [];
  for (let index = 0; index < SLOT_COUNT; index++) {
    const midi = FIRST_MIDI + index;
    const file = path.join(folder, `${slotName(midi)}.wav`);
    if (!fs.existsSync(file)) {
      broken.push({midi, reason: "yok"});
      continue;
    }
    const wav = readWavMono(fs.readFileSync(file));
    if (!wav) {
      broken.push({midi, reason: "okunamadi"});
      continue;
    }
    const hz = detectRobust(wav.mono, wav.rate);
    if (hz === null) {
      broken.push({midi, reason: "olculemedi"});
      continue;
    }
    const cents = centsBetween(hz, midiToFrequency(midi));
    if (Math.abs(cents) <= SOURCE_TOLERANCE_CENTS) {
      healthy.push({midi, hz, mono: wav.mono, rate: wav.rate, format: wavFormat(file)});
    } else {
      broken.push({midi, reason: `${cents.toFixed(0)} cent`, hz, mono: wav.mono, rate: wav.rate, format: wavFormat(file)});
    }
  }

  console.log(`${instrument}: saglam ${healthy.length}/${SLOT_COUNT} · bozuk ${broken.length}`);
  if (healthy.length === 0) {
    console.log(`  -> saglam kaynak YOK, uydurma uretilmez — DOKUNULMADI`);
    continue;
  }
  if (broken.length === 0) {
    console.log(`  -> hepsi zaten dogru`);
    continue;
  }

  // 2) Bozuk yuvalari en yakin saglam kaynaktan uret.
  let rebuilt = 0;
  let unverified = 0;
  for (const slot of broken) {
    const targetHz = midiToFrequency(slot.midi);
    const candidates = [...healthy].sort(
      (a, b) => Math.abs(centsBetween(targetHz, a.hz)) - Math.abs(centsBetween(targetHz, b.hz)),
    );

    let written = false;
    for (const source of candidates.slice(0, 3)) {
      let step = targetHz / source.hz;
      let rendered = null;
      let verified = false;

      for (let attempt = 0; attempt < 6; attempt++) {
        // Perde yukari kayarken once ANTI-ALIAS, sonra yeniden ornekleme.
        const filtered = step > 1 ? lowPass(source.mono, 0.5 / step) : source.mono;

        // Cikti uzunlugu kaynagin SUNABILDIGI kadar. Onceki surum bunu sabit
        // 1,6 s aliyordu; kaynak `step` katı hizla okundugu icin erken
        // tukeniyor ve kalan cerceveler SIFIRLA doluyordu — `tanpura/C5`
        // sesin %14'unden sonrasi sessizdi. Sessizlikle doldurmak, kisa ama
        // GERCEK ses vermekten kotudur.
        const available = Math.floor((filtered.length - 2) / step);
        const outputFrames = Math.min(Math.floor(source.rate * 1.6), available);
        if (outputFrames < Math.floor(source.rate * 0.25)) break; // 0,25 s alti kullanilamaz

        rendered = resample(filtered, step, outputFrames);

        const measured = detectRobust(rendered, source.rate);
        if (measured === null) break;
        const cents = centsBetween(measured, targetHz);
        if (Math.abs(cents) <= 12) {
          verified = true;
          break;
        }
        step *= targetHz / measured;
      }

      // YALNIZ DOGRULANAN yazilir. Onceki surum dogrulanmayani da yaziyor,
      // sonra hepsini "uretildi" diye sayiyordu — sessiz kusur tam buradaydi.
      if (verified && rendered) {
        // Erken kesilen kuyruk "tak" diye bitmesin.
        const fade = Math.min(Math.floor(source.rate * 0.06), rendered.length);
        for (let i = 0; i < fade; i++) rendered[rendered.length - 1 - i] *= i / fade;
        writeWavLike(path.join(folder, `${slotName(slot.midi)}.wav`), rendered, source.format);
        written = true;
        break;
      }
    }
    if (written) rebuilt++;
    else unverified++;
  }
  console.log(
    `  -> ${rebuilt} yuva DOGRULANARAK uretildi` +
      (unverified ? `, ${unverified} yuva dogrulanamadi ve DOKUNULMADI` : ""),
  );
}
