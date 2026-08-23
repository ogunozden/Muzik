#!/usr/bin/env node
/**
 * BIR KUDUM KAYDINDA `hek` (IKI ELIN BIRLIKTE VURUSU) ARAR.
 *
 * ── IKI KEZ YANLIS OLCTUM; UCUNCUSU KONTROLLU ───────────────────────────
 *
 * **1. deneme (H10) — yukselme suresi.** "Iki el birlikte vurursa iki kase
 * BIRLIKTE yukselir" varsayimi. Kontrol olarak `dum`u olctugumde o da
 * 0 ms/0 ms verdi: kaseler kuplajli, tek vurus da digerini uyandiriyor.
 * Olcut ayirt edici degildi -> SONUCSUZ yazildi.
 *
 * **2. deneme — bant enerji dengesi.** Baskin frekansi arayip iki "bant"
 * buldum: 135 Hz ve 275 Hz. Uc aday kontrolu 4,5 kat asti, gecikmeleri
 * 0–1 ms'ydi; "hek bulundu" diyecektim. Once su kontrolu yaptim:
 *
 *     darp        alt tepe   ust tepe   oran
 *     dum @20,05   133,00     246,75    1,855
 *     tek @23,36   145,75     274,00    1,880
 *     ke  @28,52   145,50     273,75    1,881
 *
 * **HER darp iki tepe gosteriyordu ve oran hep ~1,87.** Bunlar iki kase
 * degil, TEK davulun iki moduydu. 275 Hz, tek'in ikinci modu. Yani
 * "denge" iki eli degil, vurus YERINI olcuyordu.
 *
 * ── DOGRU OLCUM ─────────────────────────────────────────────────────────
 * Gercek kase frekanslari kontrol darplarinin ALT tepelerindedir:
 *
 *     dum kasesi ~134 Hz   ·   tek kasesi ~146 Hz   ·   ayrim 12 Hz
 *
 * Ikisi yalnizca 12 Hz ayri — bu yuzden "baskin tepe" aramasi onlari
 * ayirt edemiyordu. 180 ms pencere 5,6 Hz cozunurluk verir; 12 Hz'lik
 * ayrim 2,1 cozunurluk birimidir, yani AYIRT EDILEBILIR.
 *
 * Olculen sey: `log2(|tek kasesi| / |dum kasesi|)`.
 *   cok negatif -> dum kasesi calisiyor
 *   cok pozitif -> tek kasesi calisiyor
 *   SIFIRA YAKIN -> iki kase birlikte = `hek`
 *
 * Olcutun GUCU kontrolle gosterilir: dum'lar ve tek/ke'ler birbirinden
 * ayrilmiyorsa olcut zaten ise yaramaz ve betik bunu soyler.
 *
 * ── NE IDDIA ETMEZ ──────────────────────────────────────────────────────
 * Bosluga dusen vurus yoksa cevap "hek yoktur" DEGIL, "bu kayitta yok"tur.
 * Ayirt edilemezse turetilmis dosya yerinde kalir (ADR 0001).
 *
 * Kullanim:
 *   node scripts/probe-hek-in-recording.mjs \
 *     --source all-samples/115397__xserra__kudum.wav \
 *     --control-dum "20.05,10.59" --control-tek "23.36,28.84,28.52,55.84"
 */
import fs from "node:fs";
import {readWavMono} from "./lib/pitch-detect.mjs";

/** Vurus tespiti icin enerji esigi (tepe enerjisinin orani). */
const ONSET_RATIO = Number(process.env.HEK_ONSET_RATIO ?? 0.06);
/** Iki vurus arasi en kucuk mesafe — ayni vurusun tekrar sayilmasini onler. */
const MIN_GAP_SECONDS = 0.25;
/** Darbin olculdugu pencere. 12 Hz'lik kase ayrimini cozecek kadar uzun. */
const WINDOW_SECONDS = 0.18;
/** Kase temel frekanslarinin aranacagi aralik. */
const KETTLE_RANGE = [110, 170];

function parseArguments(argv) {
  const options = {source: null, controlDum: [], controlTek: [], top: 25};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--source") options.source = argv[++i];
    else if (argv[i] === "--control-dum") options.controlDum = argv[++i].split(",").map(Number);
    else if (argv[i] === "--control-tek") options.controlTek = argv[++i].split(",").map(Number);
    else if (argv[i] === "--top") options.top = Number(argv[++i]);
  }
  return options;
}

/** Tek nokta DFT genligi (Hann pencereli). */
function magnitudeAt(mono, rate, hz) {
  const count = mono.length;
  if (count < 64) return 0;
  const omega = (2 * Math.PI * hz) / rate;
  let re = 0;
  let im = 0;
  for (let i = 0; i < count; i++) {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (count - 1));
    re += mono[i] * window * Math.cos(omega * i);
    im += mono[i] * window * Math.sin(omega * i);
  }
  return Math.sqrt(re * re + im * im) / count;
}

function peakBetween(mono, rate, lowHz, highHz, step = 0.25) {
  let best = {hz: 0, magnitude: 0};
  for (let hz = lowHz; hz <= highHz; hz += step) {
    const magnitude = magnitudeAt(mono, rate, hz);
    if (magnitude > best.magnitude) best = {hz, magnitude};
  }
  return best;
}

const options = parseArguments(process.argv.slice(2));
if (!options.source || options.controlDum.length === 0 || options.controlTek.length === 0) {
  console.error('kullanim: --source <wav> --control-dum "20.05,..." --control-tek "23.36,..."');
  process.exit(1);
}

const source = readWavMono(fs.readFileSync(options.source));
if (!source) {
  console.error(`okunamadi: ${options.source}`);
  process.exit(1);
}
const {mono, rate} = source;

function sliceAt(seconds) {
  const start = Math.max(0, Math.floor(seconds * rate));
  const count = Math.min(Math.floor(rate * WINDOW_SECONDS), mono.length - start);
  return mono.subarray(start, start + count);
}

// ── 1. KASE FREKANSLARI KONTROLDEN TURETILIR (sabit sayi YAZILMAZ) ──────
const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const dumHz = average(options.controlDum.map((at) => peakBetween(sliceAt(at), rate, ...KETTLE_RANGE).hz));
const tekHz = average(options.controlTek.map((at) => peakBetween(sliceAt(at), rate, ...KETTLE_RANGE).hz));
const resolutionHz = 1 / WINDOW_SECONDS;

console.log("KASE FREKANSLARI (kontrol darplarindan olculdu)");
console.log(`  dum kasesi : ${dumHz.toFixed(2)} Hz`);
console.log(`  tek kasesi : ${tekHz.toFixed(2)} Hz`);
console.log(`  ayrim      : ${Math.abs(tekHz - dumHz).toFixed(2)} Hz`);
console.log(`  pencere cozunurlugu ${resolutionHz.toFixed(1)} Hz -> ayrim ${(Math.abs(tekHz - dumHz) / resolutionHz).toFixed(2)} birim`);

if (Math.abs(tekHz - dumHz) < resolutionHz) {
  console.log("\nAyrim cozunurlugun ALTINDA — bu pencerede iki kase ayirt EDILEMEZ.");
  console.log("SONUC: olculemedi.");
  process.exit(0);
}

/** Vurusun hangi kaseye ait oldugunu soyleyen sayi; 0 = iki kase esit. */
const tiltOf = (at) => {
  const slice = sliceAt(at);
  const dum = magnitudeAt(slice, rate, dumHz);
  const tek = magnitudeAt(slice, rate, tekHz);
  if (dum <= 0 || tek <= 0) return null;
  return Math.log2(tek / dum);
};

// ── 2. OLCUTUN GUCU GOSTERILIR ──────────────────────────────────────────
console.log("\nKONTROL — olcut dum'u tek/ke'den ayirabiliyor mu?");
const dumTilts = [];
const tekTilts = [];
for (const at of options.controlDum) {
  const tilt = tiltOf(at);
  if (tilt === null) continue;
  dumTilts.push(tilt);
  console.log(`  dum    @${at.toFixed(2).padStart(6)}s  egim ${tilt >= 0 ? "+" : ""}${tilt.toFixed(3)}`);
}
for (const at of options.controlTek) {
  const tilt = tiltOf(at);
  if (tilt === null) continue;
  tekTilts.push(tilt);
  console.log(`  tek/ke @${at.toFixed(2).padStart(6)}s  egim ${tilt >= 0 ? "+" : ""}${tilt.toFixed(3)}`);
}

const dumCeiling = Math.max(...dumTilts);
const tekFloor = Math.min(...tekTilts);
console.log(`\n  dum tarafinin ust siniri : ${dumCeiling.toFixed(3)}`);
console.log(`  tek tarafinin alt siniri : ${tekFloor.toFixed(3)}`);

if (dumCeiling >= tekFloor) {
  console.log("\n  Iki kontrol grubu ORTUSUYOR — olcut ayirt edici degil.");
  console.log("SONUC: olculemedi.");
  process.exit(0);
}
console.log(`  Gruplar AYRIK. Aradaki bosluk (${dumCeiling.toFixed(3)}, ${tekFloor.toFixed(3)}) —`);
console.log("  iki kase birlikte calisan bir vurus buraya duser.");

// ── 3. TUM VURUSLAR TARANIR ─────────────────────────────────────────────
function findOnsets() {
  const hop = Math.floor(rate * 0.01);
  const frame = Math.floor(rate * 0.02);
  const energies = [];
  for (let i = 0; i + frame < mono.length; i += hop) {
    let sum = 0;
    for (let k = 0; k < frame; k++) sum += mono[i + k] * mono[i + k];
    energies.push({at: i / rate, energy: sum / frame});
  }
  const peak = energies.reduce((max, entry) => Math.max(max, entry.energy), 0);
  const onsets = [];
  let lastAt = -Infinity;
  for (let i = 1; i < energies.length; i++) {
    const rising = energies[i].energy > energies[i - 1].energy * 1.8;
    if (energies[i].energy >= peak * ONSET_RATIO && rising && energies[i].at - lastAt >= MIN_GAP_SECONDS) {
      onsets.push(energies[i].at);
      lastAt = energies[i].at;
    }
  }
  return onsets;
}

const onsets = findOnsets();
const scored = onsets
  .map((at) => ({at, tilt: tiltOf(at)}))
  .filter((entry) => entry.tilt !== null)
  .sort((left, right) => Math.abs(left.tilt) - Math.abs(right.tilt));

const inGap = scored.filter((entry) => entry.tilt > dumCeiling && entry.tilt < tekFloor);

console.log(`\nKAYITTAKI ${onsets.length} VURUS — bosluga en yakin ${options.top} tanesi`);
for (const entry of scored.slice(0, options.top)) {
  const where = entry.tilt <= dumCeiling ? "dum tarafi" : entry.tilt >= tekFloor ? "tek tarafi" : "BOSLUKTA";
  console.log(`  @${entry.at.toFixed(2).padStart(6)}s  egim ${entry.tilt >= 0 ? "+" : ""}${entry.tilt.toFixed(3).padStart(7)}  ${where}`);
}

console.log("\nSONUC");
if (inGap.length === 0) {
  console.log(`  ${onsets.length} vurusun HICBIRI bosluga dusmuyor — hepsi tek kase.`);
  console.log("  Bu kayitta `hek` YOK. Turetilmis dosya yerinde kalir.");
  console.log("\n  (Olcut guclu: dum ve tek/ke kontrolerini temiz ayiriyor. Yani bu");
  console.log("   bir 'olcemedim' degil, 'olctum ve bulunmadi' sonucudur.)");
} else {
  console.log(`  ${inGap.length} vurus iki kasenin ARASINDA — hek adayi:`);
  for (const entry of inGap) console.log(`    @${entry.at.toFixed(2)}s  egim ${entry.tilt.toFixed(3)}`);
}
