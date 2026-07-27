#!/usr/bin/env node
/**
 * BIR VURMALI KLASORUNU SOUNDFONT BOLGELERINDEN URETIR.
 *
 * ── NEDEN VAR ───────────────────────────────────────────────────────────
 * `bendir/` ve `kudum/` klasorleri iki CompMusic icra kaydindan kesilmisti
 * (olcumle bulundu, r=1,0000) ve o kayitlar **CC BY-NC 4.0** — ticari
 * kullanim kisitli. Ney'de yasanan sorunun aynisi.
 *
 * `bendir` icin depoda ticarete ACIK bir alternatif var: Art Libre lisansli
 * `TURKISH-ARAB3.sf2` icindeki `Syrian Bendir` preset'i. Bu betik o
 * bolgelerden dum/tek/ke uretir.
 *
 * (`kudum` icin alternatif YOK: dort soundfont'un 113+ preset'i tarandi,
 *  `kudum` preset'i hic gecmiyor.)
 *
 * ── ESLEME NEDEN BU ─────────────────────────────────────────────────────
 * Esleme tahminle degil, IKI kanita dayanir:
 *
 * 1. Kaynagin kendi adlandirmasi: `bass` · `slp` (slap) · `riml` (rim LEFT).
 * 2. Projenin otoritesi — "Turk Musikisinde Usuller ve Kudum" s.14:
 *    **dum sag el** (kuvvetli), **tek/ke sol el** (hafif).
 *
 *    dum -> bass   : adi "bass"; olculen pes band 13,25 (en yuksek),
 *                    parlaklik 0,026 (en dusuk) — yani en dolu, en pes vurus.
 *    tek -> slp1   : "slap", orta-baskin (orta 4,73 / pes 2,00).
 *    ke  -> riml   : "rim LEFT" = sol el; olculen rms 0,0100, yani tek'ten
 *                    (0,0168) DAHA HAFIF — kaynagin s.14'teki tarifiyle
 *                    tutarli.
 *
 * ── VURGU NEDEN AYRI KAYIT ──────────────────────────────────────────────
 * Preset dinamik katmanlar tasiyor (`_p` / `_mf` / `_ff`). Vurguyu tek bir
 * kaydin kazancini artirarak taklit etmek yerine GERCEK yuksek dinamik kaydi
 * kullanilir — gercek sampler'larin yaptigi budur ve kazanc artirmanin
 * veremeyecegi tini farkini verir.
 *
 * ── NORMALIZE NEDEN CIFT BAZINDA ────────────────────────────────────────
 * Iki dosya AYRI ayri normalize edilseydi, vurgunun "daha gurultulu" olma
 * ozelligi silinirdi. Bu yuzden cift TEK bir katsayiyla olceklenir: vurgulu
 * olan hedefe oturur, normal olan kaynaktaki dinamik farki KORUYARAK altinda
 * kalir.
 *
 * Kullanim:
 *   node scripts/render-soundfont-percussion.mjs \
 *     --sf2 all-samples/TURKISH-ARAB3.sf2 --preset "Syrian Bendir" --out bendir \
 *     --map "dum=Bass_p/bass_ff,tek=slp1_mf/slp1_ff,ke=riml_mf/riml_ff"
 */
import fs from "node:fs";
import path from "node:path";
import {collectPresetZones, readSoundFont, readZoneSamples} from "./lib/soundfont.mjs";

/** Cikti uzunlugu — mevcut vurmali dosyalarin evi (0,27–0,46 s) ile uyumlu. */
const OUTPUT_SECONDS = 0.5;
const FADE_OUT_SECONDS = 0.08;
/** Vurgulu dosyanin tepe hedefi; normal olan orani KORUYARAK altinda kalir. */
const ACCENT_PEAK = 0.89;

function parseArguments(argv) {
  const options = {sf2: null, preset: null, out: null, map: null, dryRun: false};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--sf2") options.sf2 = argv[++i];
    else if (argv[i] === "--preset") options.preset = argv[++i];
    else if (argv[i] === "--out") options.out = argv[++i];
    else if (argv[i] === "--map") options.map = argv[++i];
    else if (argv[i] === "--dry-run") options.dryRun = true;
  }
  return options;
}

/** "dum=Bass_p/bass_ff,tek=..." -> [{symbol, normal, accent}] */
function parseMapping(spec) {
  return spec.split(",").map((entry) => {
    const [symbol, zones] = entry.split("=");
    const [normal, accent] = (zones ?? "").split("/");
    if (!symbol || !normal || !accent) throw new Error(`gecersiz esleme: ${entry}`);
    return {symbol: symbol.trim(), normal: normal.trim(), accent: accent.trim()};
  });
}

/** Ilk duyulur ornekten baslayip sabit uzunlukta kes; kuyruga fade. */
function cutSingleHit(mono, rate) {
  let peak = 0;
  for (const value of mono) peak = Math.max(peak, Math.abs(value));

  let start = 0;
  while (start < mono.length && Math.abs(mono[start]) < peak * 0.02) start++;

  const count = Math.min(Math.floor(rate * OUTPUT_SECONDS), mono.length - start);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = mono[start + i];

  const fade = Math.min(Math.floor(rate * FADE_OUT_SECONDS), count);
  for (let i = 0; i < fade; i++) out[count - 1 - i] *= i / fade;
  return out;
}

function writeWavMono16(file, mono, rate) {
  const dataSize = mono.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < mono.length; i++) {
    const clamped = Math.max(-1, Math.min(1, mono[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buffer);
}

const options = parseArguments(process.argv.slice(2));
if (!options.sf2 || !options.preset || !options.out || !options.map) {
  console.error('kullanim: --sf2 <dosya> --preset "<ad>" --out <klasor> --map "dum=normal/accent,..."');
  process.exit(1);
}

const soundFont = readSoundFont(options.sf2);
const zones = new Map();
for (const zone of collectPresetZones(soundFont, options.preset)) {
  if (zones.has(zone.name)) continue;
  const wav = readZoneSamples(soundFont, zone);
  if (wav) zones.set(zone.name, wav);
}
if (zones.size === 0) {
  console.error(`preset bulunamadi ya da bos: ${options.preset}`);
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "public", "samples", options.out);
if (!options.dryRun) fs.mkdirSync(outputDir, {recursive: true});

for (const {symbol, normal, accent} of parseMapping(options.map)) {
  const normalZone = zones.get(normal);
  const accentZone = zones.get(accent);
  if (!normalZone || !accentZone) {
    console.error(`[atlandi] ${symbol}: bolge yok (${normal} / ${accent})`);
    continue;
  }
  if (normalZone.rate !== accentZone.rate) {
    console.error(`[atlandi] ${symbol}: cift farkli ornekleme oraninda`);
    continue;
  }

  const normalHit = cutSingleHit(normalZone.mono, normalZone.rate);
  const accentHit = cutSingleHit(accentZone.mono, accentZone.rate);

  // Cift TEK katsayiyla olceklenir — dinamik fark korunur (yukariya bak).
  let pairPeak = 0;
  for (const value of accentHit) pairPeak = Math.max(pairPeak, Math.abs(value));
  for (const value of normalHit) pairPeak = Math.max(pairPeak, Math.abs(value));
  const gain = pairPeak > 0 ? ACCENT_PEAK / pairPeak : 1;

  for (let i = 0; i < normalHit.length; i++) normalHit[i] *= gain;
  for (let i = 0; i < accentHit.length; i++) accentHit[i] *= gain;

  const rms = (signal) => {
    let sum = 0;
    for (const value of signal) sum += value * value;
    return Math.sqrt(sum / signal.length);
  };
  console.log(
    `${symbol.padEnd(4)} <- ${normal.padEnd(9)} / ${accent.padEnd(9)}  ` +
      `rms ${rms(normalHit).toFixed(4)} -> ${rms(accentHit).toFixed(4)} ` +
      `(vurgu ${(rms(accentHit) / (rms(normalHit) || 1)).toFixed(2)}x)`,
  );

  if (options.dryRun) continue;
  writeWavMono16(path.join(outputDir, `${symbol}.wav`), normalHit, normalZone.rate);
  writeWavMono16(path.join(outputDir, `${symbol}-accent.wav`), accentHit, accentZone.rate);
}
