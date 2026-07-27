#!/usr/bin/env node
/**
 * BIR ENSTRUMANIN 36 KROMATIK YUVASINI SOUNDFONT'TAN URETIR.
 *
 * ── NEDEN VAR ───────────────────────────────────────────────────────────
 * `public/samples/` altindaki melodik klasorlerin cogu depodaki sf2
 * dosyalarindan uretilmis ama URETEN BETIK DEPODA YOKTU — yani ciktilar
 * yeniden uretilemiyor, denetlenemiyordu. Bu betik o boslugu kapatir.
 *
 * Dogrudan tetikleyicisi `ney` oldu: eski `ney/` klasoru **CC BY-NC 4.0**
 * lisansli bir Freesound paketinden geliyordu; ticari kullanimi kisitli
 * oldugu icin projenin geri kalaniyla (Art Libre / CC-BY 4.0) uyumsuzdu.
 *
 * ── YONTEM ──────────────────────────────────────────────────────────────
 * 1. sf2'nin preset -> enstruman -> ornek bolgeleri okunur.
 * 2. Her bolgenin perdesi **OLCULUR** — ne baslik ne tek bir dedektor yeter:
 *    - Basliktaki kok perde bir IDDIADIR. `NEY-YEN-1-C`in sekiz bolgesi de
 *      tam +2 oktav, `Moss_Nay`in bircogu bir oktav sapmali cikti.
 *    - YIN+HPS uzlasmasi da yetmez; ikisi BIRLIKTE bir oktav kacabiliyor.
 *      Oktav, harmonik dizi kanitiyla ayrica cozulur (`resolveFundamental`).
 *    Uzlasmayan bolge kaynak olarak KULLANILMAZ.
 * 3. Her hedef yuva icin perdesi en yakin kaynak secilir ve hedefe **tam
 *    oturana kadar** yeniden orneklenir (kapali dongu: uret -> olc -> duzelt).
 * 4. YALNIZ dogrulanan yuva diske yazilir; dogrulanamayan yuvaya DOKUNULMAZ.
 *
 * ── NEDEN IKI PRESET ────────────────────────────────────────────────────
 * Olculdu (36 yuvaya gereken gerilme, oktav cozumu SONRASI):
 *
 *     Moss_Nay + NEY_05   : kaynak 22 · ort 0,65 · EN COK 2,23 · >3 yt 0/36
 *     yedi preset karisik : kaynak 42 · ort 0,47 · EN COK 2,23 · >3 yt 0/36
 *
 * Yedi preset'e cikmak EN COK gerilmeyi hic iyilestirmiyor (2,23'te ayni
 * kaliyor, cunku sinir en pes yuva C3) — yalnizca ortalamayi 0,65'ten
 * 0,47'ye cekiyor. Bunun bedeli YEDI ayri kayit tinisini karistirmak olurdu.
 * Iki preset yeter.
 *
 * Kiyas: eski Freesound paketi 7 benzersiz perde tasiyordu (B3–Fs5) ve 36
 * yuvanin 16'si aralik disinda, 11 yarim tona varan gerilmeyle uretiliyordu.
 *
 * Kullanim:
 *   node scripts/render-soundfont-instrument.mjs \
 *     --sf2 all-samples/TURKISH-ARAB3.sf2 --presets "Moss_Nay,NEY_05" --out ney
 *   ... --dry-run   (hicbir sey yazmaz, yalnizca raporlar)
 */
import fs from "node:fs";
import path from "node:path";
import {centsBetween, detectPitchConsensus, readWavMono} from "./lib/pitch-detect.mjs";
import {collectPresetZones, readSoundFont, readZoneSamples, resolveFundamental} from "./lib/soundfont.mjs";

/**
 * Uzlasilan perdeyi OKTAV acisindan da coz.
 *
 * YIN ve HPS birlikte bir oktav kacabilir — nefeslide temel cok zayif oldugu
 * icin sik olur ve **kapali dongu bunu yakalayamaz**: ayni yanli dedektor
 * hem kaynagi hem uretileni olctugu icin hata dongu icinde birbirini goturur.
 * Bu yuzden harmonik dizi kanitiyla ayrica cozulur (bkz. `resolveFundamental`).
 */
function measurePitch(mono, rate, options) {
  const detected = detectPitchConsensus(mono, rate, options);
  if (!detected.agreed || detected.hz === null) return null;
  return resolveFundamental(mono, rate, detected.hz);
}

const NOTE_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"];
const FIRST_MIDI = 48; // C3
const SLOT_COUNT = 36; // C3..B5

const OUTPUT_SECONDS = 1.6;
const FADE_IN_SECONDS = 0.012;
const FADE_OUT_SECONDS = 0.18;
/** Kapali dongu bu kadar cente oturana kadar dener. */
const VERIFY_TOLERANCE_CENTS = 10;
/** Bundan kisa cikti kullanilmaz — kirpik ses, sessiz kuyruktan iyi degil. */
const MINIMUM_SECONDS = 0.45;

const midiToFrequency = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const slotName = (midi) => `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;

function midiFromSlot(name) {
  const match = name.match(/^([A-G]s?)(-?\d)$/);
  if (!match) return null;
  const index = NOTE_NAMES.indexOf(match[1]);
  return index < 0 ? null : (Number(match[2]) + 1) * 12 + index;
}

function parseArguments(argv) {
  const options = {sf2: null, presets: [], out: null, dryRun: false, verbose: false};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--sf2") options.sf2 = argv[++i];
    else if (argv[i] === "--presets") options.presets = argv[++i].split(",").map((s) => s.trim()).filter(Boolean);
    else if (argv[i] === "--out") options.out = argv[++i];
    else if (argv[i] === "--dry-run") options.dryRun = true;
    else if (argv[i] === "--verbose") options.verbose = true;
  }
  return options;
}

/** Kubik (Catmull-Rom) interpolasyon — diger sample betikleriyle ayni cekirdek. */
export function resample(input, step, outputLength) {
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

function writeWav24Stereo(file, mono, rate) {
  const blockAlign = 3 * 2;
  const dataSize = mono.length * blockAlign;
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

  for (let i = 0; i < mono.length; i++) {
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

function normalizeWithFades(rendered, rate) {
  let peak = 0;
  for (const value of rendered) peak = Math.max(peak, Math.abs(value));
  const gain = peak > 0 ? 0.89 / peak : 1;
  const fadeIn = Math.max(1, Math.floor(rate * FADE_IN_SECONDS));
  const fadeOut = Math.max(1, Math.floor(rate * FADE_OUT_SECONDS));

  for (let i = 0; i < rendered.length; i++) {
    let scale = gain;
    if (i < fadeIn) scale *= i / fadeIn;
    const fromEnd = rendered.length - 1 - i;
    if (fromEnd < fadeOut) scale *= fromEnd / fadeOut;
    rendered[i] *= scale;
  }
  return rendered;
}

const options = parseArguments(process.argv.slice(2));
if (!options.sf2 || options.presets.length === 0 || !options.out) {
  console.error("kullanim: --sf2 <dosya> --presets \"A,B\" --out <klasor> [--dry-run]");
  process.exit(1);
}

const soundFont = readSoundFont(options.sf2);

// ── 1) Kaynaklari OLC ───────────────────────────────────────────────────
const sources = [];
let unmeasured = 0;
for (const preset of options.presets) {
  const zones = collectPresetZones(soundFont, preset);
  if (zones.length === 0) {
    console.error(`[uyari] preset bulunamadi ya da bos: ${preset}`);
    continue;
  }
  for (const zone of zones) {
    const wav = readZoneSamples(soundFont, zone);
    if (!wav) continue;
    const hz = measurePitch(wav.mono, wav.rate);
    if (hz === null) {
      unmeasured++;
      continue;
    }
    sources.push({preset, name: zone.name, hz, mono: wav.mono, rate: wav.rate});
  }
}

if (sources.length === 0) {
  console.error("uzlasilan kaynak yok — hicbir sey yazilmadi");
  process.exit(1);
}
console.log(`kaynak: ${sources.length} olculebilen bolge (${unmeasured} bolgede uzlasma yok, kullanilmadi)`);

// ── 2) Her yuvayi URET ──────────────────────────────────────────────────
const outputDir = path.join(process.cwd(), "public", "samples", options.out);
if (!options.dryRun) fs.mkdirSync(outputDir, {recursive: true});

const report = [];
let written = 0;
let failed = 0;

for (let index = 0; index < SLOT_COUNT; index++) {
  const midi = FIRST_MIDI + index;
  const targetHz = midiToFrequency(midi);
  const name = slotName(midi);

  const candidates = [...sources].sort(
    (left, right) => Math.abs(centsBetween(targetHz, left.hz)) - Math.abs(centsBetween(targetHz, right.hz)),
  );

  let accepted = null;
  for (const source of candidates.slice(0, 4)) {
    let step = targetHz / source.hz;
    let rendered = null;
    let residualCents = null;
    let verified = false;

    for (let attempt = 0; attempt < 6; attempt++) {
      // Cikti uzunlugu KAYNAGIN sunabildigi kadar. Sabit uzunluk istemek,
      // kaynak `step` kati hizla okundugunda kalan cerceveleri sifirla
      // doldurur — bu kusur bir kez 53 dosyayi bozdu.
      const available = Math.floor((source.mono.length - 2) / step);
      const outputFrames = Math.min(Math.floor(source.rate * OUTPUT_SECONDS), available);
      if (outputFrames < Math.floor(source.rate * MINIMUM_SECONDS)) break;

      rendered = resample(source.mono, step, outputFrames);
      const measured = measurePitch(rendered, source.rate);
      if (measured === null) break;

      residualCents = centsBetween(measured, targetHz);
      if (Math.abs(residualCents) <= VERIFY_TOLERANCE_CENTS) {
        verified = true;
        break;
      }
      step *= targetHz / measured;
    }

    if (verified && rendered) {
      accepted = {source, rendered, residualCents, shiftCents: centsBetween(targetHz, source.hz)};
      break;
    }
  }

  if (!accepted) {
    failed++;
    report.push({slot: name, ok: false});
    console.warn(`[DOGRULANMADI] ${name} — dokunulmadi`);
    continue;
  }

  const seconds = accepted.rendered.length / accepted.source.rate;
  if (!options.dryRun) {
    writeWav24Stereo(
      path.join(outputDir, `${name}.wav`),
      normalizeWithFades(accepted.rendered, accepted.source.rate),
      accepted.source.rate,
    );
  }
  written++;
  report.push({
    slot: name,
    ok: true,
    source: `${accepted.source.preset}/${accepted.source.name}`,
    shiftSemitones: accepted.shiftCents / 100,
    residualCents: accepted.residualCents,
    seconds,
  });
}

// ── 3) Rapor ────────────────────────────────────────────────────────────
const good = report.filter((row) => row.ok);
const shifts = good.map((row) => Math.abs(row.shiftSemitones));
console.log(
  `\n${options.out}: ${written}/${SLOT_COUNT} yuva DOGRULANARAK ${options.dryRun ? "uretilebilir" : "yazildi"}` +
    (failed ? `, ${failed} yuva dogrulanamadi ve DOKUNULMADI` : ""),
);
if (good.length > 0) {
  console.log(
    `gerilme: ortalama ${(shifts.reduce((a, b) => a + b, 0) / shifts.length).toFixed(2)} yarim ton · ` +
      `en cok ${Math.max(...shifts).toFixed(2)} · en kisa cikti ${Math.min(...good.map((r) => r.seconds)).toFixed(2)} s`,
  );
  const byPreset = new Map();
  for (const row of good) {
    const preset = row.source.split("/")[0];
    byPreset.set(preset, (byPreset.get(preset) ?? 0) + 1);
  }
  console.log(`preset dagilimi: ${[...byPreset].map(([p, n]) => `${p} ${n}`).join(" · ")}`);

  if (options.verbose) {
    console.log("\nyuva  gerilme  kalan  sure   kaynak");
    for (const row of good) {
      console.log(
        `${row.slot.padEnd(5)} ${row.shiftSemitones >= 0 ? "+" : ""}${row.shiftSemitones.toFixed(2).padStart(5)}  ` +
          `${row.residualCents.toFixed(0).padStart(4)}c  ${row.seconds.toFixed(2)}s  ${row.source}`,
      );
    }
  }
}

// Yazilan dosyalari BAGIMSIZ olarak bir kez daha oku ve olc — bellekteki
// tampon degil, DISKTEKI dosya dogrulansin.
if (!options.dryRun && written > 0) {
  let mismatch = 0;
  for (const row of good) {
    const midi = midiFromSlot(row.slot);
    if (midi === null) continue;
    const wav = readWavMono(fs.readFileSync(path.join(outputDir, `${row.slot}.wav`)));
    if (!wav) continue;
    const detected = measurePitch(wav.mono, wav.rate, {seconds: 0.25});
    if (detected === null) continue;
    if (Math.abs(centsBetween(detected, midiToFrequency(midi))) > 45) mismatch++;
  }
  console.log(`diskten yeniden olcum: ${mismatch === 0 ? "sapan yok" : `${mismatch} DOSYA SAPIYOR`}`);
}
