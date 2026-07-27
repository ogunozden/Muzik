#!/usr/bin/env node
/**
 * BIR ICRA KAYDINDAN VURMALI DARPLARINI KESER.
 *
 * ── NEDEN VAR ───────────────────────────────────────────────────────────
 * `kudum/` klasoru bir CompMusic icra kaydindan kesilmisti (olcumle bulundu,
 * r=1,0000) ve o kayit **CC BY-NC 4.0** tasiyordu — ticari kullanim kisitli,
 * ustelik kudum uygulamanin VARSAYILAN vurmalisi.
 *
 * Soundfont'ta alternatif YOK: dort dosyanin 113+ preset'i tarandi, `kudum`
 * preset'i hic gecmiyor. Cozum baska bir icra kaydindan geldi — bu kez
 * **CC BY 4.0** (ticari kullanim serbest).
 *
 * ── KESIM NOKTALARI NEDEN ACIK YAZILIYOR ────────────────────────────────
 * Kesim, bir icradan darp SECMEK demektir ve bu bir yargidir. Yargiyi
 * gizlememek icin zaman damgalari komut satirinda ACIK verilir: uretim
 * birebir tekrarlanabilir ve secim denetlenebilir olur. "Su saniyedeki vurus"
 * demek, "uygun bir vurus buldum" demekten dogrulanabilir bir iddiadir.
 *
 * ── VURGU NEDEN AYRI VURUS ──────────────────────────────────────────────
 * Vurgu, tek kaydin kazancini artirarak taklit edilmez; icradaki DAHA GUCLU
 * bir vurus secilir. Cift TEK katsayiyla normalize edilir ki aradaki gercek
 * dinamik fark korunsun (ayri ayri normalize etmek onu silerdi).
 *
 * Kullanim:
 *   node scripts/cut-percussion-from-recording.mjs \
 *     --source all-samples/115397__xserra__kudum.wav --out kudum \
 *     --cut "dum=20.05/10.59,tek=23.36/28.84,ke=28.52/55.84"
 */
import fs from "node:fs";
import path from "node:path";
import {readWavMono} from "./lib/pitch-detect.mjs";

const OUTPUT_SECONDS = 0.25;
const FADE_OUT_SECONDS = 0.05;
const ACCENT_PEAK = 0.89;
/** Vurus basi bu esigin ustune ciktigi ilk ornekte baslar. */
const ONSET_THRESHOLD = 0.05;

function parseArguments(argv) {
  const options = {source: null, out: null, cut: null, dryRun: false};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source") options.source = argv[++i];
    else if (argv[i] === "--out") options.out = argv[++i];
    else if (argv[i] === "--cut") options.cut = argv[++i];
    else if (argv[i] === "--dry-run") options.dryRun = true;
  }
  return options;
}

/**
 * Verilen saniyenin CIVARINDAKI vurus basini bulup sabit uzunlukta keser.
 *
 * Zaman damgasi elle verildigi icin birkac milisaniye kayabilir; bu yuzden
 * ham konumdan degil, o konumun hemen oncesinde/sonrasinda bulunan GERCEK
 * yukselen kenardan baslanir. Yoksa ciktinin basinda sessizlik ya da onceki
 * vurusun kuyrugu kalirdi.
 */
function cutAt(mono, rate, seconds) {
  const search = Math.floor(seconds * rate);
  const from = Math.max(0, search - Math.floor(rate * 0.02));
  const to = Math.min(mono.length, search + Math.floor(rate * 0.05));

  let peak = 0;
  for (let i = from; i < to; i++) peak = Math.max(peak, Math.abs(mono[i]));

  let start = from;
  while (start < to && Math.abs(mono[start]) < peak * ONSET_THRESHOLD) start++;

  const count = Math.min(Math.floor(rate * OUTPUT_SECONDS), mono.length - start);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = mono[start + i];

  const fade = Math.min(Math.floor(rate * FADE_OUT_SECONDS), count);
  for (let i = 0; i < fade; i++) out[count - 1 - i] *= i / fade;
  return {hit: out, start};
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

const rootMeanSquare = (signal) => {
  let sum = 0;
  for (const value of signal) sum += value * value;
  return Math.sqrt(sum / signal.length);
};

const options = parseArguments(process.argv.slice(2));
if (!options.source || !options.out || !options.cut) {
  console.error('kullanim: --source <wav> --out <klasor> --cut "dum=20.05/10.59,..."');
  process.exit(1);
}

const source = readWavMono(fs.readFileSync(options.source));
if (!source) {
  console.error(`okunamadi: ${options.source}`);
  process.exit(1);
}

const outputDir = path.join(process.cwd(), "public", "samples", options.out);
if (!options.dryRun) fs.mkdirSync(outputDir, {recursive: true});

for (const entry of options.cut.split(",")) {
  const [symbol, marks] = entry.split("=");
  const [normalAt, accentAt] = (marks ?? "").split("/").map(Number);
  if (!symbol || !Number.isFinite(normalAt) || !Number.isFinite(accentAt)) {
    console.error(`[atlandi] gecersiz kesim: ${entry}`);
    continue;
  }

  const normal = cutAt(source.mono, source.rate, normalAt);
  const accent = cutAt(source.mono, source.rate, accentAt);

  // Cift TEK katsayiyla — dinamik fark korunur.
  let pairPeak = 0;
  for (const value of accent.hit) pairPeak = Math.max(pairPeak, Math.abs(value));
  for (const value of normal.hit) pairPeak = Math.max(pairPeak, Math.abs(value));
  const gain = pairPeak > 0 ? ACCENT_PEAK / pairPeak : 1;
  for (let i = 0; i < normal.hit.length; i++) normal.hit[i] *= gain;
  for (let i = 0; i < accent.hit.length; i++) accent.hit[i] *= gain;

  console.log(
    `${symbol.padEnd(4)} <- ${normalAt.toFixed(2)}s / ${accentAt.toFixed(2)}s   ` +
      `rms ${rootMeanSquare(normal.hit).toFixed(4)} -> ${rootMeanSquare(accent.hit).toFixed(4)} ` +
      `(vurgu ${(rootMeanSquare(accent.hit) / (rootMeanSquare(normal.hit) || 1)).toFixed(2)}x)`,
  );

  if (options.dryRun) continue;
  writeWavMono16(path.join(outputDir, `${symbol}.wav`), normal.hit, source.rate);
  writeWavMono16(path.join(outputDir, `${symbol}-accent.wav`), accent.hit, source.rate);
}
