#!/usr/bin/env node
// Vurmali sample'lari TEK VURUSA kirpar (K1).
//
// Sorun: `public/samples/**` altindaki bazi vurmali dosyalar bir DEGIL birden
// fazla vurus iceriyor — kayit, tekrarli bir desenden tek vurus izole edilmeden
// kesilmis. Ses motoru bunlari tek darp diye caldigi icin usul bozuluyor:
// kullanicinin "teklerde iki vurus geliyor" raporunun kaynagi budur.
//
// Olcum (10 ms tepe-zarfi, 64 vurmali dosya):
//   zilli-def/dum-accent  8 vurus @0,260,380,440,550,640,670,870ms
//   zil/ke-accent         4 vurus
//   davul/dum-accent      3 vurus
//   zil/dum-accent        3 vurus
//   kudum/dum, ke, tek    2'ser vurus @~10ms ve ~310ms
// Kudum, motorun VARSAYILAN vurmalisidir (usul sazi) — vurgusuz uc dosyasinin
// hepsi bozuk, yani en cok calinanlar.
//
// Cozum: ilk vurusun onset'ini bul, IKINCI onset'ten hemen once kes, sonuna
// kisa bir fade uygula. Yeni kayit GEREKMEZ; islem deterministik ve
// tersinirdir (dosyalar git'te takipli).
//
// Kullanim:
//   node scripts/trim-percussion-samples.mjs            # rapor (dry-run)
//   node scripts/trim-percussion-samples.mjs --write    # dosyalari kirp

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SAMPLES_ROOT = path.join(PROJECT_ROOT, "public", "samples");

const WRITE = process.argv.includes("--write");
/** Zarf penceresi (ms). Vurmali transient'i ayirt etmeye yeter. */
const WINDOW_MS = 10;
/** Yeni bir vurus sayilmasi icin tepe orani. */
const ONSET_RATIO = 0.5;
/** "Vadi" esigi — bunun altina inmeden yeni onset sayilmaz. */
const VALLEY_RATIO = 0.35;
/**
 * GERCEK ikinci vurusu, dogal rezonanstan ayiran iki olcut.
 *
 * Olcum (ayni 10 ms zarf uzerinde, aralik + yukselis orani):
 *   kudum/dum   300ms  5.0x  <- gercek ikinci vurus
 *   kudum/ke    290ms  6.2x  <- gercek
 *   kudum/tek   300ms  7.9x  <- gercek
 *   davul/dum-accent   110ms 1.3x | 30ms 2.1x   <- rezonans
 *   zil/dum-accent     110ms 1.3x | 30ms 2.1x   <- rezonans
 *   zil/ke-accent      100ms 1.7x | 30ms 2.0x   <- rezonans
 *   zilli-def/dum-acc  260ms 2.6x | ... | 30ms 3.3x <- zil cinlamasi
 *
 * Gercek vurus HEM uzak HEM keskin; rezonans ikisinden en az birini saglamaz.
 * Bu esikler olmadan zil 1600ms'den 70ms'ye kirpiliyor ve sample yok oluyordu.
 */
const MIN_STRIKE_GAP_MS = 200;
const MIN_STRIKE_RISE = 4;
/** Kesimden once birakilan pay (ms) — dogal sonumu kirpmamak icin. */
const TAIL_KEEP_MS = 40;
/** Kesim sonundaki fade (ms) — tik sesini onler. */
const FADE_MS = 8;

function readWav(file) {
  const buffer = fs.readFileSync(file);
  if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;

  let offset = 12;
  let fmt = null;
  let dataOffset = 0;
  let dataLength = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      fmt = {
        channels: buffer.readUInt16LE(offset + 10),
        sampleRate: buffer.readUInt32LE(offset + 12),
        bitsPerSample: buffer.readUInt16LE(offset + 22),
      };
    } else if (id === "data") {
      dataOffset = offset + 8;
      dataLength = size;
    }
    offset += 8 + size + (size % 2);
  }
  if (!fmt || !dataLength || fmt.bitsPerSample !== 16) return null;

  return {buffer, fmt, dataOffset, dataLength};
}

/** 10 ms'lik pencerelerde tepe genlik zarfi (0..1). */
function peakEnvelope(wav) {
  const {buffer, fmt, dataOffset, dataLength} = wav;
  const bytesPerFrame = fmt.channels * 2;
  const frames = Math.floor(dataLength / bytesPerFrame);
  const window = Math.max(1, Math.floor((fmt.sampleRate * WINDOW_MS) / 1000));
  const envelope = [];

  for (let start = 0; start + window <= frames; start += window) {
    let peak = 0;
    for (let i = 0; i < window; i += 1) {
      const sample = Math.abs(buffer.readInt16LE(dataOffset + (start + i) * bytesPerFrame)) / 32768;
      if (sample > peak) peak = sample;
    }
    envelope.push(peak);
  }
  return envelope;
}

/**
 * Zarftaki onset indeksleri. Bir onset, tepenin `ONSET_RATIO`sunu asan ve
 * oncesinde `VALLEY_RATIO` altina inilmis bir yukselistir.
 */
function findOnsets(envelope) {
  const peak = Math.max(...envelope);
  if (peak <= 0) return [];

  const candidates = [];
  let armed = true;
  for (let i = 0; i < envelope.length; i += 1) {
    if (armed && envelope[i] > peak * ONSET_RATIO) {
      candidates.push(i);
      armed = false;
    } else if (!armed && envelope[i] < peak * VALLEY_RATIO) {
      armed = true;
    }
  }
  if (candidates.length === 0) return [];

  // Ilk aday her zaman gercek vurustur; sonrakiler HEM aralik HEM keskinlik
  // esigini gecmeli, yoksa dogal rezonanstir (bkz. sabitlerin uzerindeki olcum).
  const strikes = [candidates[0]];
  for (const index of candidates.slice(1)) {
    const gapMs = (index - strikes[strikes.length - 1]) * WINDOW_MS;
    const floor = Math.min(...envelope.slice(Math.max(0, index - 3), index));
    const rise = envelope[index] / Math.max(floor, 1e-4);
    if (gapMs >= MIN_STRIKE_GAP_MS && rise >= MIN_STRIKE_RISE) strikes.push(index);
  }
  return strikes;
}

function trimWav(wav, cutFrames) {
  const {buffer, fmt, dataOffset, dataLength} = wav;
  const bytesPerFrame = fmt.channels * 2;
  const keepBytes = Math.min(dataLength, cutFrames * bytesPerFrame);
  const out = Buffer.from(buffer.subarray(0, dataOffset + keepBytes));

  // Sondaki fade — kesim tiki olmasin.
  const fadeFrames = Math.min(cutFrames, Math.floor((fmt.sampleRate * FADE_MS) / 1000));
  for (let i = 0; i < fadeFrames; i += 1) {
    const frame = cutFrames - fadeFrames + i;
    const gain = 1 - i / fadeFrames;
    for (let channel = 0; channel < fmt.channels; channel += 1) {
      const at = dataOffset + frame * bytesPerFrame + channel * 2;
      out.writeInt16LE(Math.round(out.readInt16LE(at) * gain), at);
    }
  }

  // RIFF ve data chunk boyutlarini duzelt.
  out.writeUInt32LE(out.length - 8, 4);
  out.writeUInt32LE(keepBytes, dataOffset - 4);
  return out;
}

function collectSampleFiles() {
  const files = [];
  for (const entry of fs.readdirSync(SAMPLES_ROOT, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(SAMPLES_ROOT, entry.name);
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith(".wav")) files.push({instrument: entry.name, file, full: path.join(dir, file)});
    }
  }
  return files;
}

// Yalniz VURMALI klasorler: melodik enstrumanlarda uzun/gec zirve DOGALDIR
// (ney gibi nefeslilerde tini yavas kurulur) — onlara dokunmayiz.
const PERCUSSION_FILE_NAMES = new Set([
  "dum.wav",
  "dum-accent.wav",
  "tek.wav",
  "tek-accent.wav",
  "ke.wav",
  "ke-accent.wav",
  "hek.wav",
  "hek-accent.wav",
]);

function main() {
  if (!fs.existsSync(SAMPLES_ROOT)) {
    console.error(`[trim] ${SAMPLES_ROOT} yok.`);
    process.exit(1);
  }

  const candidates = collectSampleFiles().filter((entry) => PERCUSSION_FILE_NAMES.has(entry.file));
  const trimmed = [];
  let clean = 0;

  for (const entry of candidates) {
    const wav = readWav(entry.full);
    if (!wav) continue;

    const envelope = peakEnvelope(wav);
    const onsets = findOnsets(envelope);
    if (onsets.length <= 1) {
      clean += 1;
      continue;
    }

    const secondOnsetMs = onsets[1] * WINDOW_MS;
    const cutMs = Math.max(WINDOW_MS, secondOnsetMs - TAIL_KEEP_MS);
    const cutFrames = Math.floor((wav.fmt.sampleRate * cutMs) / 1000);
    const beforeMs = (wav.dataLength / (wav.fmt.channels * 2) / wav.fmt.sampleRate) * 1000;

    trimmed.push({
      name: `${entry.instrument}/${entry.file}`,
      onsets: onsets.map((index) => index * WINDOW_MS),
      beforeMs: Math.round(beforeMs),
      afterMs: Math.round(cutMs),
    });

    if (WRITE) fs.writeFileSync(entry.full, trimWav(wav, cutFrames));
  }

  console.log(`[trim] vurmali sample: ${candidates.length} | tek vurus: ${clean} | COKLU VURUS: ${trimmed.length}`);
  for (const item of trimmed) {
    console.log(
      `  ${item.name.padEnd(26)} vuruslar @${item.onsets.join(",")}ms  ` +
        `${item.beforeMs}ms -> ${item.afterMs}ms`,
    );
  }
  if (!WRITE) {
    console.log("[trim] DRY-RUN — dosyalar degismedi. Uygulamak icin: --write");
  } else {
    console.log(`[trim] ${trimmed.length} dosya kirpildi.`);
  }
}

main();
