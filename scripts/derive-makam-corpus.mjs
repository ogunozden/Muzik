#!/usr/bin/env node
// Makam ariza (key-signature) yapisini SymbTr korpusundan OTONOM turetir.
//
// Amac: makam verisi elle-girilmis Bati-yaklasik `intervals` yerine, gercek
// notasyondan gelen OTANTIK koma arizasina dayansin ("full otonom"). Her
// MusicXML eserinin <key> blogu makamin perde arizalarini tasir (orn. Rast:
// B quarter-flat, F sharp). Bu script makam-adi -> ariza konsensusunu cikarir
// ve committed bir JSON'a yazar; makam verisi ona baglanir/dogrulanir (korpus
// CI'da yok, ozet JSON kaynak-of-truth'tur).
//
// Kaynak: SymbTr v3.0 (Zenodo 15470412, CC-BY 4.0), MusicXML <key> bloklari.
import {existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ROOT_CANDIDATES = [
  path.join(PROJECT_ROOT, "symb", "SymbTr-3.0", "MusicXML"),
  path.join(PROJECT_ROOT, "symb", "SymbTr-2.0.0", "MusicXML"),
];
// Koma dizisi txt formatindan turetilir (`Koma53` sutunu her notanin 53-EDO
// perdesini tasir; MusicXML <key> yalniz ariza verir). v3 txt oncelikli.
const TXT_ROOT_CANDIDATES = [
  path.join(PROJECT_ROOT, "symb", "SymbTr-3.0", "txt"),
  path.join(PROJECT_ROOT, "symb", "SymbTr-2.0.0", "txt"),
];
const OUTPUT = path.join(PROJECT_ROOT, "src", "engines", "makam", "__generated__", "makam-corpus.json");
const MIN_PIECES = 3;

// 53-EDO (Holder komasi / AEU sistemi): 1 oktav = 53 koma, 1 koma = 1200/53 c.
const KOMA_PER_OCTAVE = 53;
const CENTS_PER_KOMA = 1200 / KOMA_PER_OCTAVE;
// Karar-goreli dizide bir perde-sinifini "dizi derecesi" saymak icin asgari
// kullanim payi; sus/gecis notalarini eler, ana dereceleri tutar.
const SCALE_DEGREE_MIN_SHARE = 0.03;

// SymbTr dosya adlari ascii transliterasyon kullanir (makam ilk token);
// makam verisindeki nameTr ile eslesme icin ayni sade bicime indiririz.
export function normalizeMakamName(name) {
  return String(name)
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"}[m]))
    .replace(/[âîû]/g, (m) => ({â: "a", î: "i", û: "u"}[m]))
    .replace(/[ýðþ]/g, (m) => ({ý: "i", ð: "g", þ: "s"}[m]))
    .replace(/[^a-z0-9]/g, "");
}

// <key> blogundaki (step, alter, accidental) uclulerini sirasiyla cikarir.
export function parseKeySignature(xml) {
  const keyBlock = xml.match(/<key>([\s\S]*?)<\/key>/);
  if (!keyBlock) return null;
  const accidentals = [];
  const stepRegex =
    /<key-step>\s*([A-G])\s*<\/key-step>\s*(?:<key-alter>\s*([-\d.]+)\s*<\/key-alter>\s*)?<key-accidental>\s*([^<\s]+)\s*<\/key-accidental>/g;
  for (const match of keyBlock[1].matchAll(stepRegex)) {
    accidentals.push({step: match[1], alter: match[2] ?? "", accidental: match[3]});
  }
  return accidentals;
}

function canonicalSignature(accidentals) {
  return accidentals.map((a) => `${a.step}:${a.accidental}`).join(",");
}

export function deriveMakamSignatures(root) {
  const perMakam = new Map(); // key -> {display, total, sigs: Map<canon, {count, accidentals}>}
  for (const file of readdirSync(root)) {
    if (!file.endsWith(".xml")) continue;
    const makamToken = file.split("--")[0];
    if (!makamToken) continue;
    let xml;
    try {
      xml = readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }
    const accidentals = parseKeySignature(xml);
    if (!accidentals) continue;
    const key = normalizeMakamName(makamToken);
    if (!key) continue;
    if (!perMakam.has(key)) perMakam.set(key, {display: makamToken, total: 0, sigs: new Map()});
    const entry = perMakam.get(key);
    entry.total += 1;
    const canon = canonicalSignature(accidentals);
    if (!entry.sigs.has(canon)) entry.sigs.set(canon, {count: 0, accidentals});
    entry.sigs.get(canon).count += 1;
  }

  const result = {};
  for (const key of Array.from(perMakam.keys()).sort()) {
    const entry = perMakam.get(key);
    if (entry.total < MIN_PIECES) continue;
    const sigs = Array.from(entry.sigs.values()).sort((a, b) => b.count - a.count);
    const top = sigs[0];
    result[key] = {
      display: entry.display,
      total: entry.total,
      consensus: Math.round((top.count / entry.total) * 100) / 100,
      keySignature: top.accidentals,
    };
  }
  return result;
}

// --- Koma dizisi turetimi (53-EDO) ---------------------------------------
// SymbTr txt: sekmeyle ayrilmis; sutunlar Sira,Kod,Nota53,NotaAE,Koma53,...
// Kod=9 satiri seslenen bir notadir; Koma53 (indeks 4) 53-EDO mutlak perde.
const TXT_KOD_NOTE = "9";
const TXT_COL_KOD = 1;
const TXT_COL_KOMA53 = 4;

// Bir eserin seslenen notalarinin mutlak koma perdelerini (sirali) dondurur.
export function parsePieceKomas(text) {
  const komas = [];
  const lines = text.split(/\r?\n/);
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split("\t");
    if (cols.length <= TXT_COL_KOMA53 || cols[TXT_COL_KOD] !== TXT_KOD_NOTE) continue;
    const koma = Number.parseInt(cols[TXT_COL_KOMA53], 10);
    if (Number.isFinite(koma)) komas.push(koma);
  }
  return komas;
}

const pitchClass = (koma) => ((koma % KOMA_PER_OCTAVE) + KOMA_PER_OCTAVE) % KOMA_PER_OCTAVE;
const komaToSemitone = (koma) => Math.round((koma * 12) / KOMA_PER_OCTAVE);

/**
 * 12-TET `intervals` dizisini koma dizisinden OTONOM turetir: karar (0) +
 * en guclu 6 karar-disi/oktav-disi derece en yakin yarim-tona izdusurulur.
 * Temiz bir 7-nota heptatoni cikarsa dondurur; cikmazsa null (el-yazimina
 * duselir). Not: makam kromatik olabilir; bu, 12-TET NOTASYON izdusumudur —
 * otantik perde komaScale'dedir.
 */
function deriveIntervals12(degrees) {
  const byShare = [...degrees].sort((a, b) => b.share - a.share);
  const semis = new Set();
  for (const d of byShare) {
    const s = komaToSemitone(d.koma);
    if (s <= 0 || s >= 12) continue; // 0 = karar, 12 = oktav
    semis.add(s);
    if (semis.size >= 6) break;
  }
  if (semis.size < 6) return null;
  const scale = [0, ...Array.from(semis).sort((a, b) => a - b)]; // 7 nota
  const intervals = [];
  for (let i = 1; i < scale.length; i += 1) intervals.push(scale[i] - scale[i - 1]);
  intervals.push(12 - scale[scale.length - 1]); // son perde -> oktav
  return intervals.length === 7 ? intervals : null;
}

/**
 * Guclu (dominant) ADAYI: 4.-5. derece bolgesindeki (koma ~18..34) en cok
 * kullanilan derece. Guclu frekansla KESIN turetilemez (yapisal teori notasi);
 * bu yalniz el-yazimi dominant'i DOGRULAMAK icin referans olarak tutulur.
 */
function deriveGucluCandidate(degrees) {
  const region = degrees.filter((d) => d.koma >= 18 && d.koma <= 34);
  if (region.length === 0) return null;
  const top = region.sort((a, b) => b.share - a.share)[0];
  return {koma: top.koma, cents: Math.round(top.koma * CENTS_PER_KOMA)};
}

// Makam basina KARAR-GORELI koma dizisini turetir. Karar (durak/tonik), eser
// sonlari makamin kararinda biter kabulu ile son-nota perde-sinifinin modu
// alinarak OTONOM bulunur; dizi dereceleri karara gore normalize edilir
// (transpozisyondan bagimsiz). Bati-yaklasik degil, korpusun gercek 53-EDO
// perdeleri. tomato/makam_information.py'a karsi dogrulanir.
export function deriveMakamKomaScales(txtRoot) {
  const perMakam = new Map(); // key -> {display, pieceCount, noteCount, finalPCs:Map, absHist:Map}
  for (const file of readdirSync(txtRoot)) {
    if (!file.endsWith(".txt")) continue;
    const makamToken = file.split("--")[0];
    if (!makamToken) continue;
    let komas;
    try {
      komas = parsePieceKomas(readFileSync(path.join(txtRoot, file), "latin1"));
    } catch {
      continue;
    }
    if (komas.length === 0) continue;
    const key = normalizeMakamName(makamToken);
    if (!key) continue;
    if (!perMakam.has(key)) {
      perMakam.set(key, {display: makamToken, pieceCount: 0, noteCount: 0, finalPCs: new Map(), absHist: new Map()});
    }
    const entry = perMakam.get(key);
    entry.pieceCount += 1;
    for (const koma of komas) {
      const pc = pitchClass(koma);
      entry.absHist.set(pc, (entry.absHist.get(pc) || 0) + 1);
      entry.noteCount += 1;
    }
    const finalPC = pitchClass(komas[komas.length - 1]);
    entry.finalPCs.set(finalPC, (entry.finalPCs.get(finalPC) || 0) + 1);
  }

  const result = {};
  for (const key of Array.from(perMakam.keys()).sort()) {
    const entry = perMakam.get(key);
    if (entry.pieceCount < MIN_PIECES) continue;
    // Karar = son-nota perde-sinifinin modu (eserlerin cogunlukla bittigi perde).
    const finals = Array.from(entry.finalPCs.entries()).sort((a, b) => b[1] - a[1]);
    const kararPC = finals[0][0];
    const kararAgreement = Math.round((finals[0][1] / entry.pieceCount) * 100) / 100;
    // Karar-goreli histogram: derece = (pc - karar) mod 53.
    const relHist = new Map();
    for (const [pc, n] of entry.absHist) {
      const degree = ((pc - kararPC) % KOMA_PER_OCTAVE + KOMA_PER_OCTAVE) % KOMA_PER_OCTAVE;
      relHist.set(degree, (relHist.get(degree) || 0) + n);
    }
    const degrees = Array.from(relHist.entries())
      .map(([koma, n]) => ({koma, cents: Math.round(koma * CENTS_PER_KOMA), share: n / entry.noteCount}))
      .filter((d) => d.share >= SCALE_DEGREE_MIN_SHARE)
      .sort((a, b) => a.koma - b.koma)
      .map((d) => ({koma: d.koma, cents: d.cents, share: Math.round(d.share * 1000) / 1000}));
    result[key] = {
      display: entry.display,
      pieceCount: entry.pieceCount,
      noteCount: entry.noteCount,
      kararPC,
      kararAgreement,
      degrees,
      intervals12: deriveIntervals12(degrees),
      guclu: deriveGucluCandidate(degrees),
    };
  }
  return result;
}

export function buildMakamCorpusSummary() {
  const root = ROOT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!root) {
    throw new Error(`SymbTr MusicXML korpusu bulunamadi. 'npm run fetch:symbtr-v3' calistirin.\n${ROOT_CANDIDATES.join("\n")}`);
  }
  const txtRoot = TXT_ROOT_CANDIDATES.find((candidate) => existsSync(candidate));
  return {
    source: "SymbTr v3.0 (Zenodo 15470412, CC-BY 4.0); ariza=MusicXML <key>, koma dizisi=txt Koma53 (53-EDO/AEU)",
    generatedFrom: path.relative(PROJECT_ROOT, root).replace(/\\/g, "/"),
    minPieces: MIN_PIECES,
    komaPerOctave: KOMA_PER_OCTAVE,
    centsPerKoma: Math.round(CENTS_PER_KOMA * 1000) / 1000,
    makams: deriveMakamSignatures(root),
    komaScales: txtRoot ? deriveMakamKomaScales(txtRoot) : {},
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summary = buildMakamCorpusSummary();
  mkdirSync(path.dirname(OUTPUT), {recursive: true});
  writeFileSync(OUTPUT, JSON.stringify(summary, null, 2) + "\n");
  console.log(`[derive-makam-corpus] ${Object.keys(summary.makams).length} makam -> ${path.relative(PROJECT_ROOT, OUTPUT)}`);
}
