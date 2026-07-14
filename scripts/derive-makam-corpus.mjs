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
const OUTPUT = path.join(PROJECT_ROOT, "src", "engines", "makam", "__generated__", "makam-corpus.json");
const MIN_PIECES = 3;

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

export function buildMakamCorpusSummary() {
  const root = ROOT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!root) {
    throw new Error(`SymbTr MusicXML korpusu bulunamadi. 'npm run fetch:symbtr-v3' calistirin.\n${ROOT_CANDIDATES.join("\n")}`);
  }
  return {
    source: "SymbTr v3.0 (Zenodo 15470412, CC-BY 4.0), MusicXML <key> bloklari",
    generatedFrom: path.relative(PROJECT_ROOT, root).replace(/\\/g, "/"),
    minPieces: MIN_PIECES,
    makams: deriveMakamSignatures(root),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summary = buildMakamCorpusSummary();
  mkdirSync(path.dirname(OUTPUT), {recursive: true});
  writeFileSync(OUTPUT, JSON.stringify(summary, null, 2) + "\n");
  console.log(`[derive-makam-corpus] ${Object.keys(summary.makams).length} makam -> ${path.relative(PROJECT_ROOT, OUTPUT)}`);
}
