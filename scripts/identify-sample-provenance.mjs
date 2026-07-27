#!/usr/bin/env node
/**
 * BIR SES KLASORUNUN KAYNAGINI OLCUMLE BULUR.
 *
 * ── NEDEN YENIDEN YAZILDI ───────────────────────────────────────────────
 * Onceki tarama 10 klasoru "eslesmedi" diye birakti ve kayit `claimed`
 * kaldi. Iki eksigi vardi, ikisi de olculdu:
 *
 * 1. **Dosyalarin YARISI taranmamisti.** `sources.json` dort soundfont
 *    listeliyordu; diskte SEKIZ var. `Proteus{1,3}_Instruments.sf2` ve
 *    `Proteus{1,3}_Presets.sf2` hic acilmamisti.
 *
 * 2. **Hiz farki hesaba katilmamisti.** Melodik dosyalar bolgenin
 *    YENIDEN ORNEKLENMIS halidir (`playbackRate = istenen / kok perde`).
 *    Ham korelasyon yalnizca oranin 1,0 oldugu — yani kok perdeye denk
 *    gelen — tek dosyada tutar. `ud`/`kanun`/`tambur`/`kemence`nin
 *    1,0000 vermesi tam da buydu: sansa kok perdeye denk gelmislerdi.
 *
 * ── NASIL ARAR ──────────────────────────────────────────────────────────
 * Korelasyonu her olasi hizda denemek pahalidir (bolge x hiz x gecikme).
 * Onun yerine hiz OLCUMDEN turetilir:
 *
 *     beklenen hiz = (dosyanin temel frekansi) / (bolgenin temel frekansi)
 *
 * Iki taraf da `resolveFundamental` ile olculur (oktav belirsizligi
 * cozulmus halde), bolge o oranla yeniden orneklenir, sonra gecikme
 * aramali normalize capraz korelasyon uygulanir. Perdesiz (vurmali)
 * dosyalarda oran 1,0 alinir.
 *
 * ── NE IDDIA ETMEZ ──────────────────────────────────────────────────────
 * Esik altinda kalan klasor icin cevap "kaynagi yok" DEGIL, "bu arsivde
 * bulunamadi"dir. Soundfont'un sentez zincirinden (zarf/filtre) gecmis bir
 * ses ham bolgeyle birebir tutmayabilir (ADR 0001).
 *
 * Kullanim:
 *   node scripts/identify-sample-provenance.mjs --folders baglama,lavta
 *   node scripts/identify-sample-provenance.mjs --all --json out.json
 */
import fs from "node:fs";
import path from "node:path";
import {collectPresetZones, listPresets, readSoundFont, readZoneSamples, resolveFundamental} from "./lib/soundfont.mjs";
import {detectPitchConsensus, readWavMono} from "./lib/pitch-detect.mjs";

const SOUNDFONT_DIR = path.join(process.cwd(), "all-samples");
const SAMPLES_DIR = path.join(process.cwd(), "public", "samples");
/** Bu esigin ustu "ayni kaynak" sayilir; altinda iddia edilmez. */
const MATCH_THRESHOLD = 0.90;
/** Karsilastirma penceresi — fade ve kuyruk disarida kalsin. */
const COMPARE_SECONDS = 0.35;
/** Perde oraninin cevresinde taranan ince aralik (yariton cinsinden). */
const RATE_SEARCH_SEMITONES = [0, -0.5, 0.5, -1, 1, -12, 12];

function parseArguments(argv) {
  const options = {folders: null, all: false, json: null, limit: 0};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--folders") options.folders = argv[++i].split(",").map((value) => value.trim());
    else if (argv[i] === "--all") options.all = true;
    else if (argv[i] === "--json") options.json = argv[++i];
    else if (argv[i] === "--limit") options.limit = Number(argv[++i]);
  }
  return options;
}

/** Dogrusal ara degerlemeli yeniden ornekleme. */
function resample(mono, ratio, maxOut) {
  const count = Math.min(maxOut, Math.floor(mono.length / ratio) - 1);
  if (count <= 0) return new Float32Array(0);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    out[i] = mono[index] * (1 - fraction) + (mono[index + 1] ?? mono[index]) * fraction;
  }
  return out;
}

/**
 * Gecikme aramali normalize capraz korelasyonun EN IYI degeri.
 *
 * Normalize edilir cunku kazanc farki kaynak kimligini degistirmez: ayni
 * kayit iki kat sessiz yazilmis olabilir, yine ayni kayittir.
 */
function bestCorrelation(needle, haystack, maxLag) {
  let best = 0;
  let bestLag = 0;
  const length = Math.min(needle.length, haystack.length);
  if (length < 64) return {score: 0, lag: 0};

  for (let lag = 0; lag <= maxLag && lag + length <= haystack.length; lag++) {
    let dot = 0;
    let normNeedle = 0;
    let normHay = 0;
    for (let i = 0; i < length; i++) {
      const a = needle[i];
      const b = haystack[lag + i];
      dot += a * b;
      normNeedle += a * a;
      normHay += b * b;
    }
    const denominator = Math.sqrt(normNeedle * normHay);
    if (denominator <= 0) continue;
    const score = Math.abs(dot / denominator);
    if (score > best) {
      best = score;
      bestLag = lag;
    }
  }
  return {score: best, lag: bestLag};
}

// ── LOG-FREKANS KAYDIRMA ARAMASI ────────────────────────────────────────
//
// Perde gudumlu hiz tahmini bu klasorlerde CALISMIYOR: `baglama` · `lavta`
// · `santur` · `rebab` dosyalarinin perdesi olculemiyor (bilinen bulgu —
// sapma 137–241 cent, uzlasma yok). Perde bilinmeden hiz bilinmez, hiz
// bilinmeden ham korelasyon anlamsizdir.
//
// Cikis yolu su ozdeslik: **log-frekans ekseninde yeniden ornekleme bir
// OTELEMEDIR.** Sesi `r` katsayisiyla hizlandirmak butun tepeleri
// `log2(r)` kadar sagi kaydirir, sekli degistirmez. Dolayisiyla iki sesin
// log-spektrumlarini eksen boyunca capraz korelasyona sokmak hem EN IYI
// HIZI hem BENZERLIGI tek geciste verir — 49 hizi tek tek denemeye gerek
// kalmaz (o yol 3299 bolge x 49 hiz ile pratikte kosulamazdi).

/** Yariton basina bu kadar bolme — 12 = ~8 cent cozunurluk. */
const BINS_PER_SEMITONE = 4;
const LOG_SPECTRUM_LOW_HZ = 60;
const LOG_SPECTRUM_HIGH_HZ = 8000;

function logSpectrum(mono, rate) {
  const bins = Math.floor(Math.log2(LOG_SPECTRUM_HIGH_HZ / LOG_SPECTRUM_LOW_HZ) * 12 * BINS_PER_SEMITONE);
  const count = Math.min(mono.length, Math.floor(rate * 0.25));
  const spectrum = new Float32Array(bins);
  for (let bin = 0; bin < bins; bin++) {
    const hz = LOG_SPECTRUM_LOW_HZ * Math.pow(2, bin / (12 * BINS_PER_SEMITONE));
    if (hz >= rate / 2) break;
    const omega = (2 * Math.PI * hz) / rate;
    let re = 0;
    let im = 0;
    // Adim atlayarak ornekle — cozunurluk yeter, maliyet dusler.
    const stride = Math.max(1, Math.floor(count / 4096));
    for (let i = 0; i < count; i += stride) {
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (count - 1));
      re += mono[i] * window * Math.cos(omega * i);
      im += mono[i] * window * Math.sin(omega * i);
    }
    spectrum[bin] = Math.log1p(Math.sqrt(re * re + im * im));
  }
  // Ortalamayi cikar: kazanc farki benzerligi etkilemesin.
  const mean = spectrum.reduce((sum, value) => sum + value, 0) / bins;
  for (let bin = 0; bin < bins; bin++) spectrum[bin] -= mean;
  return spectrum;
}

/** Iki log-spektrumu eksen boyunca kaydirarak en iyi ortusmeyi bulur. */
function bestLogShift(target, candidate, maxShiftBins) {
  let best = {score: -1, shiftBins: 0};
  for (let shift = -maxShiftBins; shift <= maxShiftBins; shift++) {
    let dot = 0;
    let normTarget = 0;
    let normCandidate = 0;
    let overlap = 0;
    for (let bin = 0; bin < target.length; bin++) {
      const other = bin + shift;
      if (other < 0 || other >= candidate.length) continue;
      dot += target[bin] * candidate[other];
      normTarget += target[bin] * target[bin];
      normCandidate += candidate[other] * candidate[other];
      overlap++;
    }
    if (overlap < target.length * 0.5) continue;
    const denominator = Math.sqrt(normTarget * normCandidate);
    if (denominator <= 0) continue;
    const score = dot / denominator;
    if (score > best.score) best = {score, shiftBins: shift};
  }
  return {...best, ratio: Math.pow(2, best.shiftBins / (12 * BINS_PER_SEMITONE))};
}

/** Dosyanin (varsa) olculen temel frekansi; perdesizse null. */
function measureFundamental(mono, rate) {
  const consensus = detectPitchConsensus(mono, rate);
  if (!consensus || !consensus.agrees || !Number.isFinite(consensus.hz)) return null;
  return resolveFundamental(mono, rate, consensus.hz);
}

function listZones(file) {
  const soundFont = readSoundFont(file);
  const seen = new Set();
  const zones = [];
  for (const preset of listPresets(soundFont)) {
    for (const zone of collectPresetZones(soundFont, preset.name)) {
      const key = `${zone.sampleId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      zones.push({...zone, preset: preset.name, soundFont});
    }
  }
  return zones;
}

const NOTE_OFFSETS = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};

/** "As4.wav" -> 68. Ad cozulmezse null. */
function midiFromFileName(fileName) {
  const match = /^([A-G])(s?)(-?\d+)\.wav$/.exec(fileName);
  if (!match) return null;
  const [, letter, sharp, octave] = match;
  return (Number(octave) + 1) * 12 + NOTE_OFFSETS[letter] + (sharp ? 1 : 0);
}

/**
 * Klasoru en iyi temsil eden dosya.
 *
 * ── ONCEKI SECIM YANLISTI ───────────────────────────────────────────────
 * "Alfabetik siranin ortasi" alinmisti; bu melodik klasorde `Ds3` veriyordu
 * (register'in ortasi DEGIL, adlarin ortasi) ve vurmalida `ke-accent`.
 * Ikisinde de perde olculemedigi icin hiz aramasi HIC CALISMADI — negatif
 * sonuc bu yuzden gecersizdi.
 *
 * Dogrusu: melodikte perdenin en guvenilir olculdugu ORTA register (A4'e
 * en yakin yuva), vurmalida ailenin ana darbi (`dum`).
 */
/**
 * Klasoru temsil eden dosyalar — TEK dosya YETMEZ.
 *
 * ── OLCULEN TUZAK ───────────────────────────────────────────────────────
 * Once tek temsil dosyasi seciliyordu. Bir klasor birden cok bolgeden
 * uretilir (her tus araligina bir bolge) ve dosya, bolgenin KOK PERDESINE
 * denk geliyorsa hiz 1,0'dir; degilse gerilmistir.
 *
 * Sonuc: hangi dosyayi sectigine gore ayni klasor 1,0000 da verebiliyor
 * 0,60 da. `zilli-def` ilk secimle 1,0000, ikinci secimle 0,5958 verdi —
 * kaynak degismedi, benim ornegim degisti. Bu yuzden klasor basina birkac
 * dosya denenir ve EN IYISI alinir.
 */
function representativeFiles(folder, limit) {
  const dir = path.join(SAMPLES_DIR, folder);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".wav"));
  if (files.length === 0) return [];

  const pitched = files
    .map((name) => ({name, midi: midiFromFileName(name)}))
    .filter((entry) => entry.midi !== null)
    .sort((left, right) => left.midi - right.midi);

  if (pitched.length > 0) {
    // Register boyunca esit araliklarla ornekle: hangi yuvanin kok perdeye
    // denk geldigini bilmedigimiz icin yayarak arariz.
    const picked = [];
    for (let i = 0; i < limit; i++) {
      const index = Math.round(((pitched.length - 1) * i) / Math.max(1, limit - 1));
      if (!picked.includes(pitched[index].name)) picked.push(pitched[index].name);
    }
    return picked.map((name) => path.join(dir, name));
  }

  // Vurmalida darp ailesi zaten kucuk — hepsi denenir.
  return files.sort().slice(0, limit).map((name) => path.join(dir, name));
}

const options = parseArguments(process.argv.slice(2));
const folders = options.all
  ? fs.readdirSync(SAMPLES_DIR).filter((name) => fs.statSync(path.join(SAMPLES_DIR, name)).isDirectory())
  : options.folders;

if (!folders || folders.length === 0) {
  console.error("kullanim: --folders a,b  |  --all  [--json cikti.json]");
  process.exit(1);
}

const soundFontFiles = fs
  .readdirSync(SOUNDFONT_DIR, {recursive: true, withFileTypes: true})
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".sf2"))
  .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));

console.log(`soundfont dosyasi: ${soundFontFiles.length}`);

const allZones = [];
for (const file of soundFontFiles) {
  const zones = listZones(file);
  console.log(`  ${path.basename(file).padEnd(28)} ${String(zones.length).padStart(5)} bolge`);
  for (const zone of zones) allZones.push({...zone, file: path.basename(file)});
}
console.log(`toplam benzersiz bolge: ${allZones.length}`);

// ── BOLGE OZETLERI BIR KEZ HESAPLANIR ───────────────────────────────────
// Ilk surum bunlari HER KLASOR icin yeniden hesapliyordu: 3299 bolge x
// ~800 bin islem = klasor basina milyarlarca islem, pratikte kosmuyordu.
// Ozetler (log-spektrum ve seyreltilmis dalga) kucuk; tam ornek yalnizca
// kisa listeye kalan bolgeler icin yeniden okunur.
const DECIMATION = 16;

function decimateTo(mono, fromRate, toRate) {
  const step = (fromRate / toRate) * DECIMATION;
  const count = Math.floor(mono.length / step);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) out[i] = mono[Math.floor(i * step)];
  return out;
}

process.stdout.write("bolge ozetleri cikariliyor... ");
const zoneSummaries = [];
for (const zone of allZones) {
  const wav = readZoneSamples(zone.soundFont, zone);
  if (!wav || wav.mono.length < 128) continue;
  zoneSummaries.push({
    zone,
    rate: wav.rate,
    spectrum: logSpectrum(wav.mono, wav.rate),
    // Hedefin ornekleme orani bilinmiyor; ozet kendi oraninda tutulur ve
    // karsilastirmada hedefe gore yeniden seyreltilir.
    decimated: decimateTo(wav.mono, wav.rate, wav.rate),
    nativeRate: wav.rate,
  });
}
console.log(`${zoneSummaries.length} ozet hazir\n`);

const results = {};
const SAMPLES_PER_FOLDER = Number(process.env.SAMPLES_PER_FOLDER ?? 6);

for (const folder of folders) {
  const candidateFiles = representativeFiles(folder, SAMPLES_PER_FOLDER);
  if (candidateFiles.length === 0) {
    console.log(`${folder.padEnd(12)} — dosya yok, atlandi`);
    continue;
  }

  let folderBest = {score: 0};
  for (const file of candidateFiles) {
  const target = readWavMono(fs.readFileSync(file));
  if (!target) continue;

  const targetHz = measureFundamental(target.mono, target.rate);
  const compareCount = Math.min(Math.floor(target.rate * COMPARE_SECONDS), target.mono.length);
  const needle = target.mono.subarray(0, compareCount);

  // ── ELEME: log-spektrum kaydirmasiyla ucuz on siralama ────────────────
  // Zaman alaninda 3299 bolgeyi her hizda denemek pratikte kosulamaz.
  // Log-spektrum eslesmesi hem hizi hem kaba benzerligi ucuza verir; pahali
  // zaman-alani dogrulamasi yalnizca en iyi adaylara uygulanir.
  const targetSpectrum = logSpectrum(target.mono, target.rate);
  const maxShiftBins = 24 * BINS_PER_SEMITONE;

  // Kaba zaman-alani skoru: sinyal seyreltilerek ucuzlatilir. Bu eleme
  // sart — log-spektrum tek basina kullanildiginda `zilli-def`in BILINEN
  // 1,0000 eslesmesi listeden dusuyordu (hiz 1,0 olan gercek eslesmeyi
  // kaybetmek, aramayi bastan gecersiz kilar).
  const coarseNeedle = decimateTo(needle, target.rate, target.rate);

  const scored = [];
  const scanned = zoneSummaries.length;
  for (const summary of zoneSummaries) {
    const coarse = bestCorrelation(
      coarseNeedle,
      summary.nativeRate === target.rate
        ? summary.decimated
        : decimateTo(summary.decimated, summary.nativeRate / DECIMATION, target.rate / DECIMATION),
      Math.floor((target.rate * 0.03) / DECIMATION),
    );
    const shift = bestLogShift(targetSpectrum, summary.spectrum, maxShiftBins);
    scored.push({zone: summary.zone, summary, ...shift, coarseScore: coarse.score});
  }

  // Iki listenin BIRLESIMI: biri hiz-1 eslesmesini, oteki perde kaydirilmis
  // olani bulur. Tek listeye guvenmek digerini kor eder.
  const bySpectrum = [...scored].sort((left, right) => right.score - left.score).slice(0, 40);
  const byCoarse = [...scored].sort((left, right) => right.coarseScore - left.coarseScore).slice(0, 40);
  const shortlist = [...new Set([...byCoarse, ...bySpectrum])];

  // ── DOGRULAMA: en iyi adaylar zaman alaninda sinanir ──────────────────
  let best = {score: 0};
  for (const entry of shortlist) {
    // Tam ornek yalnizca burada okunur — kisa listede kalanlar icin.
    const wav = readZoneSamples(entry.zone.soundFont, entry.zone);
    if (!wav) continue;

    const ratios = new Set([entry.ratio * (wav.rate / target.rate), wav.rate / target.rate, 1]);
    if (targetHz) {
      const zoneHz = measureFundamental(wav.mono, wav.rate);
      if (zoneHz) {
        const base = (targetHz / zoneHz) * (wav.rate / target.rate);
        for (const semitones of RATE_SEARCH_SEMITONES) ratios.add(base * Math.pow(2, semitones / 12));
      }
    }

    for (const ratio of ratios) {
      if (!(ratio > 0.05 && ratio < 20)) continue;
      const candidate = resample(wav.mono, ratio, compareCount + Math.floor(wav.rate * 0.05));
      if (candidate.length < needle.length) continue;
      const {score, lag} = bestCorrelation(needle, candidate, Math.floor(target.rate * 0.03));
      if (score > best.score) {
        best = {
          score,
          lag,
          ratio,
          zone: entry.zone.name,
          preset: entry.zone.preset,
          file: entry.zone.file,
          spectrumScore: entry.score,
        };
      }
    }
  }

    if (best.score > folderBest.score) {
      folderBest = {...best, sampleFile: path.relative(process.cwd(), file), zonesScanned: scanned};
    }
    // Tam eslesme bulunduysa kalan dosyalari denemeye gerek yok.
    if (folderBest.score >= 0.9999) break;
  }

  const verdict = folderBest.score >= MATCH_THRESHOLD ? "ESLESTI" : "esik alti";
  console.log(
    `${folder.padEnd(12)} r=${folderBest.score.toFixed(4)}  ${verdict.padEnd(10)}` +
      (folderBest.zone
        ? `  ${folderBest.file} :: ${folderBest.preset} / ${folderBest.zone}` +
          `  (hiz ${folderBest.ratio.toFixed(4)}, ${path.basename(folderBest.sampleFile)})`
        : ""),
  );
  results[folder] = folderBest;
}

if (options.json) {
  fs.writeFileSync(options.json, `${JSON.stringify(results, null, 2)}\n`);
  console.log(`\nyazildi: ${options.json}`);
}
