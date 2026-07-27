#!/usr/bin/env node
/**
 * NEY SAMPLE YUVALARINI KAYNAK KAYITLARDAN URETIR (TODO D1).
 *
 * ── COZULEN KUSUR ───────────────────────────────────────────────────────
 * `public/samples/ney/` altindaki 10 dosyanin **5'i yanlis perde etiketi**
 * tasiyordu (autocorrelation ile olculdu):
 *
 *     As4.wav -> gercekte B3   (bir oktav + bir yarim ton pes)
 *     C5.wav  -> gercekte Cs4  (bir oktav + bir yarim ton pes)
 *     Cs4.wav -> gercekte D4
 *     D3.wav  -> gercekte D4   (bir oktav tiz)
 *     Ds4.wav -> gercekte E4
 *
 * Bu sessiz bir hata DEGILDI: `samples.ts` sample'i secerken dosya adini
 * DOGRU VARSAYIP `playbackRate = istenen / etiketlenen` hesapliyor. Etiket
 * yanlissa hiz 1.0 kaliyor ve ney bambaska bir perde caliyor.
 *
 * ── YONTEM ──────────────────────────────────────────────────────────────
 * 1. Kaynak kayitlarin perdesi autocorrelation ile OLCULUR (varsayilmaz).
 * 2. Her hedef yuva icin, perdesi en yakin kaynak secilir.
 * 3. Kaynak, hedef frekansa TAM oturacak sekilde yeniden orneklenir
 *    (kubik interpolasyon). Boylece dosya adi ile icerik ARTIK UYUSUR ve
 *    motorun `playbackRate` matematigi dogru calisir.
 * 4. Sabit uzunluk + kisa fade; mevcut format korunur (48 kHz / 24-bit).
 *
 * Kaynak kayitlar ~30 cent pes (A=432 civari); yeniden ornekleme bunu da
 * duzeltir, cunku hedef frekans esit-tamperamandan hesaplanir.
 *
 * ── LISANS ──────────────────────────────────────────────────────────────
 * Kaynak: Freesound paketi 27726, `_bliind` — **CC BY-NC 4.0**.
 * Atif zorunlu; TICARI KULLANIM KISITLI. `public/samples/README.md`e islendi.
 */
import fs from "node:fs";
import path from "node:path";
import {centsBetween, detectPitchConsensus, readWavMono} from "./lib/pitch-detect.mjs";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "all-samples", "27726__bliind__ney-flute-sound-samples");
const OUTPUT_DIR = path.join(ROOT, "public", "samples", "ney");

const NOTE_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];
/** Mevcut yuva duzeni: C3..B5 kromatik (36 yuva). */
const FIRST_MIDI = 48; // C3
const SLOT_COUNT = 36;

const OUTPUT_SECONDS = 1.6; // mevcut dosyalarla ayni
const FADE_IN_SECONDS = 0.012;
const FADE_OUT_SECONDS = 0.18;

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function slotName(midi) {
  return `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

/** Kubik (Catmull-Rom) interpolasyonla yeniden ornekleme. */
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
      0.5 *
      (2 * p1 +
        (-p0 + p2) * fraction +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * fraction * fraction +
        (-p0 + 3 * p1 - 3 * p2 + p3) * fraction * fraction * fraction);
  }
  return output;
}

function writeWav24Stereo(file, mono, rate) {
  const frames = mono.length;
  const blockAlign = 3 * 2;
  const dataSize = frames * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(2, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * blockAlign, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(24, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < frames; i++) {
    const clamped = Math.max(-1, Math.min(1, mono[i]));
    const value = Math.round(clamped * 8388607);
    const base = 44 + i * blockAlign;
    for (const channel of [0, 1]) {
      const p = base + channel * 3;
      buffer[p] = value & 0xff;
      buffer[p + 1] = (value >> 8) & 0xff;
      buffer[p + 2] = (value >> 16) & 0xff;
    }
  }
  fs.writeFileSync(file, buffer);
}

// ── 1) Kaynaklarin perdesini OLC ────────────────────────────────────────
// IKI YONTEM UZLASMASI ZORUNLU.
//
// Bu betigin ONCEKI surumu tek dedektore (YIN) guveniyordu ve YANLIS yuvalar
// uretti: `B4` -202 cent, `C5` -214 cent. Sebep ince: kapali dongu, urettigi
// sesi kaynagi olcen dedektorun KENDISIYLE dogruluyordu. Kaynak perdesi
// yanlis olcuLdugunde hata dongu icinde birbirini goturuyor, gercekte
// kaliyordu. Klasik asiri uyum.
//
// Artik YIN (zaman alani) ve HPS (frekans alani) hemfikir degilse kaynak
// REFERANS OLARAK KULLANILMAZ.
const sources = [];
for (const file of fs.readdirSync(SOURCE_DIR).filter((name) => name.endsWith(".wav")).sort()) {
  const wav = readWavMono(fs.readFileSync(path.join(SOURCE_DIR, file)));
  if (!wav) continue;

  const detected = detectPitchConsensus(wav.mono, wav.rate);
  if (!detected.agreed || detected.hz === null) {
    const yin = detected.yin === null ? "?" : detected.yin.toFixed(1);
    const hps = detected.hps === null ? "?" : detected.hps.toFixed(1);
    console.warn(`[atlandi] ${file} — YIN ${yin} Hz ile HPS ${hps} Hz uyusmuyor`);
    continue;
  }
  sources.push({file, mono: wav.mono, rate: wav.rate, hz: detected.hz});
}

if (sources.length === 0) throw new Error("uzlasilan kaynak kayit yok");
console.log(`uzlasilan kaynak kayit: ${sources.length}`);
for (const source of sources) {
  console.log(`  ${source.file.padEnd(30)} ${source.hz.toFixed(1).padStart(7)} Hz`);
}

// ── 2) Her yuvayi en yakin kaynaktan URET ───────────────────────────────
fs.mkdirSync(OUTPUT_DIR, {recursive: true});
const report = [];

for (let index = 0; index < SLOT_COUNT; index++) {
  const midi = FIRST_MIDI + index;
  const targetHz = midiToFrequency(midi);
  const name = slotName(midi);

  // Adaylar perde yakinligina gore sirali. TEK adayla yetinmiyoruz: bir
  // kaynaktan uretilen ses DOGRULANAMAZSA sirdaki aday denenir. Onceki
  // surumde dongu dogrulayamayinca SESSIZCE kabul ediyordu ve `Fs4` -197
  // cent ile diske yaziliyordu.
  const candidates = [...sources].sort(
    (left, right) =>
      Math.abs(centsBetween(targetHz, left.hz)) - Math.abs(centsBetween(targetHz, right.hz)),
  );

  let best = null;
  let rendered = null;
  let achievedCents = null;
  let verified = false;

  for (const candidate of candidates.slice(0, 4)) {
    const outputFrames = Math.floor(candidate.rate * OUTPUT_SECONDS);
    const startFrame = Math.floor(candidate.mono.length * 0.2);
    const usable = candidate.mono.subarray(startFrame);

    let attemptStep = targetHz / candidate.hz;
    let attemptRendered = null;
    let attemptCents = null;
    let attemptVerified = false;

    // KAPALI DONGU — dogrulamasi da UZLASMALI.
    for (let attempt = 0; attempt < 6; attempt++) {
      const needed = Math.ceil(outputFrames * attemptStep) + 4;
      const slice = usable.subarray(0, Math.min(needed, usable.length));
      attemptRendered = resample(slice, attemptStep, outputFrames);

      const measured = detectPitchConsensus(attemptRendered, candidate.rate);
      if (!measured.agreed || measured.hz === null) break;

      attemptCents = centsBetween(measured.hz, targetHz);
      if (Math.abs(attemptCents) <= 10) {
        attemptVerified = true;
        break;
      }
      attemptStep *= targetHz / measured.hz;
    }

    // Ilk adayin ciktisini yedek olarak tut, ama DOGRULANANI tercih et.
    if (best === null || attemptVerified) {
      best = candidate;
      rendered = attemptRendered;
      achievedCents = attemptCents;
      verified = attemptVerified;
    }
    if (attemptVerified) break;
  }

  if (!verified) {
    const shown = achievedCents === null ? "olculemedi" : `${achievedCents.toFixed(0)} cent`;
    console.warn(`[DOGRULANMADI] ${name} <- ${best.file} (${shown}) — dosya yazildi ama kapi gecmedi`);
  }

  // Normalize + fade
  let peak = 0;
  for (const value of rendered) peak = Math.max(peak, Math.abs(value));
  const normalize = peak > 0 ? 0.89 / peak : 1;
  const fadeIn = Math.floor(best.rate * FADE_IN_SECONDS);
  const fadeOut = Math.floor(best.rate * FADE_OUT_SECONDS);
  for (let i = 0; i < rendered.length; i++) {
    let gain = normalize;
    if (i < fadeIn) gain *= i / fadeIn;
    const fromEnd = rendered.length - 1 - i;
    if (fromEnd < fadeOut) gain *= fromEnd / fadeOut;
    rendered[i] *= gain;
  }

  writeWav24Stereo(path.join(OUTPUT_DIR, `${name}.wav`), rendered, best.rate);
  report.push({
    slot: name,
    targetHz: Number(targetHz.toFixed(2)),
    source: best.file,
    sourceHz: Number(best.hz.toFixed(2)),
    shiftCents: Math.round(centsBetween(targetHz, best.hz)),
    verified,
    residualCents: achievedCents === null ? null : Math.round(achievedCents),
  });
}

console.log("");
console.log(`uretilen yuva: ${report.length}`);
const biggest = [...report].sort((a, b) => Math.abs(b.shiftCents) - Math.abs(a.shiftCents)).slice(0, 5);
console.log("en cok kaydirilan 5 yuva:");
for (const row of biggest) {
  console.log(`  ${row.slot.padEnd(5)} <- ${row.source.padEnd(30)} ${row.shiftCents > 0 ? "+" : ""}${row.shiftCents} cent`);
}
