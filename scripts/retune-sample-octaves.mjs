#!/usr/bin/env node
/**
 * TAM OKTAV KAYMASI OLAN SAMPLE'LARI DUZELTIR (PLAN.md §10/F1).
 *
 * ── BULGU ───────────────────────────────────────────────────────────────
 * Iki bagimsiz yontem (YIN + HPS) uzlastiginda:
 *
 *     baglama : olculebilen 24 dosyanin **24'u** tam bir oktav PES
 *     rebab   : olculebilen 24 dosyanin **24'u** tam bir oktav TIZ
 *
 * Oktav cikarildiktan sonra kalan sapmanin standart sapmasi **4 cent**.
 * Yani perde SINIFI tam dogru, yalniz oktav yanlis — bu bir render/etiket
 * hatasidir, olcum gurultusu degil. Rastgele hata tek yonlu ve tek degerli
 * olmaz.
 *
 * Motor dosya adini dogru varsayip `playbackRate = istenen / etiketlenen`
 * hesapladigi icin (bkz. `samples.ts`), bu enstrumanlar bugun **bir oktav
 * yanlis caliyor**.
 *
 * ── NE YAPILMAZ ─────────────────────────────────────────────────────────
 * `lavta` (kalan sd 126 cent) ve `tanpura` (hicbir dosyada uzlasma yok)
 * DEGISTIRILMEZ. Olcum guvenilir degilse dosyaya dokunulmaz — "bilmiyorum"
 * demek, yanlis bilmekten iyidir.
 *
 * Kullanim:  node scripts/retune-sample-octaves.mjs baglama rebab
 */
import fs from "node:fs";
import path from "node:path";
import {centsBetween, detectPitchConsensus, readWavMono} from "./lib/pitch-detect.mjs";

const ROOT = process.cwd();
const SAMPLES_ROOT = path.join(ROOT, "public", "samples");
const NOTE_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];

/** Tam oktav sayilmasi icin kalan sapma bu esigin altinda olmali. */
const OCTAVE_RESIDUAL_TOLERANCE_CENTS = 35;

function midiFromSlot(name) {
  const match = name.match(/^([A-G]s?)(-?\d)$/);
  if (!match) return null;
  const index = NOTE_NAMES.indexOf(match[1]);
  return index < 0 ? null : (Number(match[2]) + 1) * 12 + index;
}

function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Kubik interpolasyonla yeniden ornekleme (ney ureticisiyle ayni cekirdek). */
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

/** Kaynak WAV bicimini KORUYARAK yazar (kanal/oran/bit ayni kalir). */
function writeWavLike(file, mono, template) {
  const {rate, channels, bits} = template;
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
    const clamped = Math.max(-1, Math.min(1, mono[i]));
    const value = Math.round(clamped * maxValue);
    const base = 44 + i * blockAlign;
    for (let channel = 0; channel < channels; channel++) {
      const p = base + channel * bytesPerSample;
      if (bits === 24) {
        buffer[p] = value & 0xff;
        buffer[p + 1] = (value >> 8) & 0xff;
        buffer[p + 2] = (value >> 16) & 0xff;
      } else if (bits === 16) {
        buffer.writeInt16LE(value, p);
      } else if (bits === 32) {
        buffer.writeInt32LE(value, p);
      }
    }
  }
  fs.writeFileSync(file, buffer);
}

function wavFormat(file) {
  const buffer = fs.readFileSync(file);
  return {channels: buffer.readUInt16LE(22), rate: buffer.readUInt32LE(24), bits: buffer.readUInt16LE(34)};
}

const instruments = process.argv.slice(2);
if (instruments.length === 0) {
  console.error("kullanim: node scripts/retune-sample-octaves.mjs <enstruman> [...]");
  process.exit(1);
}

for (const instrument of instruments) {
  const folder = path.join(SAMPLES_ROOT, instrument);
  if (!fs.existsSync(folder)) {
    console.error(`[yok] ${instrument}`);
    continue;
  }

  const files = fs.readdirSync(folder).filter((name) => name.endsWith(".wav") && midiFromSlot(name.replace(/\.wav$/, "")));

  // 1) Once TUM dosyayi olc — toplu karar ver, tek dosyaya bakip acele etme.
  const measured = [];
  for (const file of files) {
    const midi = midiFromSlot(file.replace(/\.wav$/, ""));
    const wav = readWavMono(fs.readFileSync(path.join(folder, file)));
    if (!wav) continue;
    const detected = detectPitchConsensus(wav.mono, wav.rate);
    if (!detected.agreed || detected.hz === null) continue;

    const cents = centsBetween(detected.hz, midiToFrequency(midi));
    const octaves = Math.round(cents / 1200);
    measured.push({file, midi, cents, octaves, residual: cents - octaves * 1200});
  }

  if (measured.length === 0) {
    console.log(`${instrument}: hicbir dosyada uzlasma yok — DOKUNULMADI`);
    continue;
  }

  // 2) Baskin oktav kaymasi butun klasore mi ait?
  const counts = new Map();
  for (const row of measured) counts.set(row.octaves, (counts.get(row.octaves) ?? 0) + 1);
  const [dominantOctave, dominantCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const residualSd = Math.sqrt(
    measured.reduce((sum, row) => sum + row.residual ** 2, 0) / measured.length,
  );

  console.log(
    `${instrument}: uzlasan ${measured.length}/${files.length} · baskin oktav ${dominantOctave} (${dominantCount}/${measured.length}) · kalan sd ${residualSd.toFixed(0)}c`,
  );

  if (dominantOctave === 0) {
    console.log(`  -> zaten dogru oktavda, DOKUNULMADI`);
    continue;
  }
  if (dominantCount !== measured.length || residualSd > OCTAVE_RESIDUAL_TOLERANCE_CENTS) {
    console.log(`  -> kayma TUTARLI DEGIL (sd ${residualSd.toFixed(0)}c), DOKUNULMADI`);
    continue;
  }

  // 3) Tutarli tam oktav kaymasi: her dosyayi hedefine tasi.
  let fixed = 0;
  for (const row of measured) {
    const source = path.join(folder, row.file);
    const wav = readWavMono(fs.readFileSync(source));
    const format = wavFormat(source);
    // `octaves` KADAR ters yone kaydir. Tam oktav oldugu icin oran tam 2^n.
    // `octaves` NEGATIFI kadar kaydir: olculen hedeften bir oktav PESSE
    // (octaves = -1) sesi TIZLESTIRMEK gerekir, yani step = 2.
    const step = Math.pow(2, -row.octaves);
    const outputFrames = Math.floor(wav.mono.length / step);
    const rendered = resample(wav.mono, step, outputFrames);
    writeWavLike(source, rendered, format);
    fixed++;
  }
  console.log(`  -> ${fixed} dosya ${dominantOctave > 0 ? "bir oktav PES" : "bir oktav TIZ"}e tasindi`);
}
