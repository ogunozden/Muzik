#!/usr/bin/env node
// `hek` darbi icin sample TURETIR (K4) — uydurmaz.
//
// Kaynak: "Turk Musikisinde Usuller ve Kudum" s.14 ("OLCULERIN VURULMASI"):
//   dum/ta  -> SAG el, kuvvetli vurus
//   tek/te  -> SOL el, hafif vurus
//   hek     -> IKI ELIN BIRLIKTE vurusu
//
// `hek`in kendi kaydi yok. Ama tanimi tam olarak "sag el + sol el ayni anda"
// oldugu icin, AYNI sazin `dum` ve `tek` kayitlarini ust uste toplamak bu
// tanimin birebir gerceklenmesidir — yeni bir ses UYDURMAK degil, kaynagin
// yazdigi seyi sentezlemek. Uretilen dosyalar bu gerekceyle isaretlidir;
// gercek `hek` kaydi elde edilirse dogrudan uzerine yazilabilir.
//
// Korpusta 36 `hek` darbi var (Berefsan / Muhammes / Remel velveleleri).
// Onceden `hek` once `tek`e (en hafif aile), sonra `dum`a esleniyordu; ikisi de
// yaklasimdi.
//
// Kullanim:
//   node scripts/derive-hek-samples.mjs          # rapor (dry-run)
//   node scripts/derive-hek-samples.mjs --write  # hek.wav / hek-accent.wav yaz

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const SAMPLES_ROOT = path.join(PROJECT_ROOT, "public", "samples");
const WRITE = process.argv.includes("--write");

/**
 * Iki el GERCEK toplamla birlestirilir (akustikte olan budur), sonra kirpma
 * olmasin diye tepe `PEAK_CEILING`e normalize edilir. Sabit bir kazancla
 * olceklemek yerine normalize etmek gerekiyor: sazlarin dum/tek seviyeleri
 * cok farkli, tek kazanc bazi dosyalari kirpiyordu (kasik 1.44, zil 1.30,
 * darbuka 1.33 tepe). Rolatif dinamik dosya ICINDE korunur; sazlar arasi
 * denge zaten motorun `gainBySymbol` tablosunda.
 */
const PEAK_CEILING = 0.95;

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

/** Kanonik 16-bit PCM WAV yazar. */
function writeWav(file, fmt, samples) {
  const dataBytes = samples.length * 2;
  const out = Buffer.alloc(44 + dataBytes);
  out.write("RIFF", 0, "ascii");
  out.writeUInt32LE(36 + dataBytes, 4);
  out.write("WAVE", 8, "ascii");
  out.write("fmt ", 12, "ascii");
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); // PCM
  out.writeUInt16LE(fmt.channels, 22);
  out.writeUInt32LE(fmt.sampleRate, 24);
  out.writeUInt32LE(fmt.sampleRate * fmt.channels * 2, 28);
  out.writeUInt16LE(fmt.channels * 2, 32);
  out.writeUInt16LE(16, 34);
  out.write("data", 36, "ascii");
  out.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < samples.length; i += 1) {
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i]))), 44 + i * 2);
  }
  return WRITE ? (fs.writeFileSync(file, out), out.length) : out.length;
}

function toSamples(wav) {
  const count = Math.floor(wav.dataLength / 2);
  const samples = new Float64Array(count);
  for (let i = 0; i < count; i += 1) samples[i] = wav.buffer.readInt16LE(wav.dataOffset + i * 2);
  return samples;
}

function mix(rightHand, leftHand) {
  const length = Math.max(rightHand.length, leftHand.length);
  const out = new Float64Array(length);
  let max = 0;
  for (let i = 0; i < length; i += 1) {
    out[i] = (rightHand[i] ?? 0) + (leftHand[i] ?? 0);
    max = Math.max(max, Math.abs(out[i]));
  }

  const ceiling = PEAK_CEILING * 32768;
  if (max > ceiling) {
    const scale = ceiling / max;
    for (let i = 0; i < length; i += 1) out[i] *= scale;
  }
  return out;
}

function peak(samples) {
  let max = 0;
  for (const value of samples) max = Math.max(max, Math.abs(value));
  return max / 32768;
}

function main() {
  const rows = [];
  for (const entry of fs.readdirSync(SAMPLES_ROOT, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(SAMPLES_ROOT, entry.name);
    const has = (name) => fs.existsSync(path.join(dir, name));
    if (!has("dum.wav") || !has("tek.wav")) continue;

    for (const [suffix, label] of [["", "hek"], ["-accent", "hek-accent"]]) {
      const dumFile = path.join(dir, `dum${suffix}.wav`);
      const tekFile = path.join(dir, `tek${suffix}.wav`);
      if (!fs.existsSync(dumFile) || !fs.existsSync(tekFile)) continue;

      const dum = readWav(dumFile);
      const tek = readWav(tekFile);
      if (!dum || !tek) continue;
      if (dum.fmt.channels !== tek.fmt.channels || dum.fmt.sampleRate !== tek.fmt.sampleRate) {
        console.warn(`[hek] ${entry.name}: dum/tek formatlari farkli, atlandi`);
        continue;
      }

      const mixed = mix(toSamples(dum), toSamples(tek));
      const target = path.join(dir, `${label}.wav`);
      const bytes = writeWav(target, dum.fmt, mixed);
      rows.push({
        name: `${entry.name}/${label}.wav`,
        ms: Math.round((mixed.length / dum.fmt.channels / dum.fmt.sampleRate) * 1000),
        peak: peak(mixed),
        bytes,
      });
    }
  }

  console.log(
    `[hek] ${rows.length} dosya ${WRITE ? "yazildi" : "uretilecek"} ` +
      `(dum + tek gercek toplami, tepe ${PEAK_CEILING} tavanina normalize):`,
  );
  for (const row of rows) {
    console.log(`  ${row.name.padEnd(26)} ${row.ms}ms  tepe ${row.peak.toFixed(3)}  ${row.bytes} bayt`);
  }
  if (!WRITE) console.log("[hek] DRY-RUN — dosya yazilmadi. Uygulamak icin: --write");
}

main();
