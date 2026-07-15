#!/usr/bin/env node
// Usul METRIK-VURGU PROFILINI SymbTr korpusundan OTONOM turetir.
//
// Neden: usul darp/velvele VURUS DESENLERI hicbir makine-okunur kaynakta yok
// (arastirma: CompMusic 2 usul multimedya, SymbTr melodi-only, mus2 kapali,
// OCR kitap duzyazi+gorsel). Dolayisiyla strokes ELLE (kitaptan) yazilir.
//
// MUADIL ARASTIRMASI (kullanici direktifi "tam oturtamiyorsan muadilini bul"):
// korpus melodilerinin SURE-AGIRLIKLI onset yogunlugu usulun metrik-agirlik
// dagilimini verir. ANCAK bu profil darp (DUM/tek) desenini GUVENILIR sekilde
// kodlamaz: (1) compound usullerde (aksak 9/8) duz cikar; (2) faz belirsizligi
// (anacrusis) mutlak DUM konumunu kaydirir; (3) sofyan/duyek gibi basit
// usullerde bile pik hep beat-1'e oturmaz. Raw/agirlikli/onset/bitis binleme
// denendi — hicbiri tutarli degil. SONUC: bu bir DOGRULAMA KAPISI DEGIL,
// TANILAYICI korpus referansidir. Usul strokes'un dogrulugu kitap-aktarimi +
// dosum-degismezi testleriyle (data.test) garanti; meter+tempo ise ZATEN
// korpustan turetilir (usul-corpus-meters.json). Bkz. docs/adr/0003.
//
// Kaynak: SymbTr txt (Pay/Payda=sure, Offset=BITIS konumu -> onset=offset-sure)
// + usul-corpus-meters.json (konsensus mertebe).
import {existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const TXT_ROOT_CANDIDATES = [
  path.join(PROJECT_ROOT, "symb", "SymbTr-3.0", "txt"),
  path.join(PROJECT_ROOT, "symb", "SymbTr-2.0.0", "txt"),
];
const METERS_JSON = path.join(PROJECT_ROOT, "src", "engines", "usul", "__generated__", "usul-corpus-meters.json");
const OUTPUT = path.join(PROJECT_ROOT, "src", "engines", "usul", "__generated__", "usul-accent-profile.json");
const MIN_PIECES = 5;

const TXT_COL_KOD = 1;
const TXT_COL_PAY = 6;
const TXT_COL_PAYDA = 7;
const TXT_COL_OFFSET = 12;
const TXT_KOD_NOTE = "9";

export function normalizeUsulName(name) {
  return String(name)
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"}[m]))
    .replace(/[âîû]/g, (m) => ({â: "a", î: "i", û: "u"}[m]))
    .replace(/[ýðþ]/g, (m) => ({ý: "i", ð: "g", þ: "s"}[m]))
    .replace(/[^a-z0-9]/g, "");
}

// Bir eserin sure-agirlikli onset'lerini usul cycle'i icinde `beats` kovaya
// yerlestirir (cycle = beats/unit tam-nota). Uzun nota = guclu metrik konum.
function accumulatePiece(text, beats, unit, bins) {
  const cycle = beats / unit;
  for (const line of text.split(/\r?\n/).slice(1)) {
    const cols = line.split("\t");
    if (cols.length <= TXT_COL_OFFSET || cols[TXT_COL_KOD] !== TXT_KOD_NOTE) continue;
    const offset = Number.parseFloat(cols[TXT_COL_OFFSET]);
    const pay = Number.parseFloat(cols[TXT_COL_PAY]);
    const payda = Number.parseFloat(cols[TXT_COL_PAYDA]);
    if (!Number.isFinite(offset) || !Number.isFinite(pay) || !Number.isFinite(payda) || payda === 0) continue;
    const duration = pay / payda;
    // Offset notanin BITIS/kumulatif konumudur; ONSET = Offset - sure. (Aksi
    // halde profil bir nota kayar, downbeat beat-2'ye dusermis gibi gorunur.)
    const onset = offset - duration;
    const position = ((onset % cycle) + cycle) % cycle;
    const beat = Math.floor((position / cycle) * beats + 1e-9) % beats;
    bins[beat] += duration;
  }
}

export function deriveUsulAccentProfiles(txtRoot, consensusMeter) {
  const perUsul = new Map(); // key -> {display, beats, unit, pieceCount, bins}
  for (const file of readdirSync(txtRoot)) {
    if (!file.endsWith(".txt")) continue;
    const token = file.split("--")[2];
    if (!token) continue;
    const key = normalizeUsulName(token);
    const meter = consensusMeter(key);
    if (!meter) continue;
    const {beats, unit} = meter;
    if (!perUsul.has(key)) {
      perUsul.set(key, {display: token, beats, unit, pieceCount: 0, bins: new Array(beats).fill(0)});
    }
    const entry = perUsul.get(key);
    try {
      accumulatePiece(readFileSync(path.join(txtRoot, file), "latin1"), beats, unit, entry.bins);
      entry.pieceCount += 1;
    } catch {
      /* okunamayan dosyayi atla */
    }
  }

  const result = {};
  for (const key of Array.from(perUsul.keys()).sort()) {
    const entry = perUsul.get(key);
    if (entry.pieceCount < MIN_PIECES) continue;
    const total = entry.bins.reduce((a, b) => a + b, 0);
    if (total <= 0) continue;
    const profile = entry.bins.map((b) => Math.round((b / total) * 1000) / 10); // yuzde, 0.1 hassas
    const max = Math.max(...profile);
    result[key] = {
      display: entry.display,
      beats: entry.beats,
      unit: entry.unit,
      pieceCount: entry.pieceCount,
      profile,
      // Beat-1 (downbeat, evrensel DUM) en guclu metrik konum mu? (>=0.9×max)
      downbeatIsPeak: profile[0] >= max * 0.9,
    };
  }
  return result;
}

export function buildUsulAccentSummary() {
  const txtRoot = TXT_ROOT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!txtRoot) {
    throw new Error(`SymbTr txt korpusu bulunamadi:\n${TXT_ROOT_CANDIDATES.join("\n")}`);
  }
  const meters = JSON.parse(readFileSync(METERS_JSON, "utf8")).usuls;
  const consensusMeter = (key) => {
    const entry = meters[key];
    if (!entry) return null;
    const top = Object.entries(entry.meters).sort((a, b) => b[1] - a[1])[0][0]; // "9/8"
    const [beats, unit] = top.split("/").map((x) => Number.parseInt(x, 10));
    return Number.isFinite(beats) && Number.isFinite(unit) ? {beats, unit} : null;
  };
  return {
    source: "SymbTr txt (sure-agirlikli onset yogunlugu) + usul-corpus-meters.json",
    method: "duration-weighted onset density per beat; downbeat (beat-1 DUM) validation",
    minPieces: MIN_PIECES,
    usuls: deriveUsulAccentProfiles(txtRoot, consensusMeter),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summary = buildUsulAccentSummary();
  mkdirSync(path.dirname(OUTPUT), {recursive: true});
  writeFileSync(OUTPUT, JSON.stringify(summary, null, 2) + "\n");
  const usuls = Object.values(summary.usuls);
  const peaks = usuls.filter((u) => u.downbeatIsPeak).length;
  console.log(`[derive-usul-accent-profile] ${usuls.length} usul; downbeat-pik: ${peaks}/${usuls.length} -> ${path.relative(PROJECT_ROOT, OUTPUT)}`);
}
