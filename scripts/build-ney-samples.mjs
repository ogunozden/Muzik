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

function readWav(file) {
  const buffer = fs.readFileSync(file);
  const channels = buffer.readUInt16LE(22);
  const rate = buffer.readUInt32LE(24);
  const bits = buffer.readUInt16LE(34);

  let offset = 12;
  while (offset < buffer.length - 8) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "data") {
      const bytesPerSample = bits / 8;
      const frames = Math.floor(size / (bytesPerSample * channels));
      const mono = new Float32Array(frames);
      for (let i = 0; i < frames; i++) {
        const p = offset + 8 + i * bytesPerSample * channels;
        let value = 0;
        if (bits === 24) value = ((buffer[p + 2] << 24) | (buffer[p + 1] << 16) | (buffer[p] << 8)) / 2147483648;
        else if (bits === 16) value = buffer.readInt16LE(p) / 32768;
        else if (bits === 32) value = buffer.readInt32LE(p) / 2147483648;
        mono[i] = value;
      }
      return {mono, rate};
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`data chunk yok: ${file}`);
}

/** Autocorrelation ile temel frekans. Varsayim yok — olcum. */
function detectFundamental(mono, rate) {
  const start = Math.floor(mono.length * 0.35);
  const length = Math.min(Math.floor(rate * 0.5), mono.length - start);
  const x = mono.subarray(start, start + length);

  let mean = 0;
  for (let i = 0; i < length; i++) mean += x[i];
  mean /= length;

  let energy = 0;
  for (let i = 0; i < length; i++) energy += (x[i] - mean) ** 2;

  const minLag = Math.floor(rate / 1200);
  const maxLag = Math.floor(rate / 110);
  let bestLag = -1;
  let bestScore = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i + lag < length; i++) sum += (x[i] - mean) * (x[i + lag] - mean);
    const score = sum / energy;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  return bestLag > 0 ? {hz: rate / bestLag, confidence: bestScore} : null;
}

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
const sources = [];
for (const file of fs.readdirSync(SOURCE_DIR).filter((name) => name.endsWith(".wav")).sort()) {
  const {mono, rate} = readWav(path.join(SOURCE_DIR, file));
  const detected = detectFundamental(mono, rate);
  if (!detected || detected.confidence < 0.8) {
    console.warn(`[atlandi] ${file} — perde guveni dusuk`);
    continue;
  }
  sources.push({file, mono, rate, hz: detected.hz, confidence: detected.confidence});
}

if (sources.length === 0) throw new Error("kaynak kayit bulunamadi");
console.log(`kaynak kayit: ${sources.length}`);
for (const source of sources) {
  console.log(`  ${source.file.padEnd(30)} ${source.hz.toFixed(1).padStart(7)} Hz  guven=${source.confidence.toFixed(2)}`);
}

// ── 2) Her yuvayi en yakin kaynaktan URET ───────────────────────────────
fs.mkdirSync(OUTPUT_DIR, {recursive: true});
const report = [];

for (let index = 0; index < SLOT_COUNT; index++) {
  const midi = FIRST_MIDI + index;
  const targetHz = midiToFrequency(midi);
  const name = slotName(midi);

  // Perde olarak en yakin kaynak (oktav farki cent cinsinden olculur).
  let best = sources[0];
  let bestDistance = Infinity;
  for (const source of sources) {
    const distance = Math.abs(1200 * Math.log2(targetHz / source.hz));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = source;
    }
  }

  const outputFrames = Math.floor(best.rate * OUTPUT_SECONDS);
  // Kararli bolgeden basla (uflemenin ilk gurultusunu atla).
  const startFrame = Math.floor(best.mono.length * 0.2);
  const usable = best.mono.subarray(startFrame);

  // KAPALI DONGU: tek seferlik perde olcumune GUVENME.
  //
  // Kaynaklarda vibrato var; hangi 0,5 s pencerenin olculdugune gore tespit
  // 50 centten fazla oynayabiliyor (en dusuk guvenli kayit `ney-11`de bir
  // yarim tonluk sapma uretmisti). Bu yuzden urettigimiz sesi YENIDEN OLCUP
  // adimi duzeltiyoruz; hedefe oturana kadar tekrar.
  let step = targetHz / best.hz;
  let rendered = null;
  let achievedCents = null;

  for (let attempt = 0; attempt < 6; attempt++) {
    const needed = Math.ceil(outputFrames * step) + 4;
    const slice = usable.subarray(0, Math.min(needed, usable.length));
    rendered = resample(slice, step, outputFrames);

    const measured = detectFundamental(rendered, best.rate);
    if (!measured) break;
    achievedCents = 1200 * Math.log2(measured.hz / targetHz);
    if (Math.abs(achievedCents) <= 6) break;
    // Olculen sapma kadar adimi duzelt.
    step *= targetHz / measured.hz;
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
    shiftCents: Math.round(1200 * Math.log2(step)),
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
