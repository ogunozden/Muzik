#!/usr/bin/env node
// Usul mertebelerini (beats/unit) SymbTr korpusundan OTONOM turetir.
//
// Amac: usul verisi elle-girilmis mertebelerle hatali olmasin ("HARD CODE
// YAPMA"). Curcuna hatasi (10/16 yerine 10/8) tam da elle-guessing yuzunden
// olustu. Bu script 3000 gercek eserin kod-51 basligindan usul-adi -> mertebe
// histogramini cikarir ve committed bir JSON'a yazar; ilgili test USUL_DATA'yi
// buna karsi dogrular (korpus CI'da yok, ozet JSON kaynak-of-truth'tur).
//
// Kaynak: SymbTr v3.0 (Zenodo 15470412, CC-BY 4.0). Sadece kod-51'in pay/payda
// alanlari okunur (nota verisi degil).
import {existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ROOT_CANDIDATES = [
  path.join(PROJECT_ROOT, "symb", "SymbTr-3.0", "mu2"),
  path.join(PROJECT_ROOT, "symb", "SymbTr-2.0.0", "mu2"),
];
const OUTPUT = path.join(PROJECT_ROOT, "src", "engines", "usul", "__generated__", "usul-corpus-meters.json");

// Usul adini id-benzeri sade bicime indirir; usul verisindeki nameTr ile AYNI
// normalizasyonu test tarafinda kullaniriz, boylece eslesme addan turer (elle
// sozluk yok). Parantez icerigi (mertebe notu) ve baglac/tire atilir.
export function normalizeUsulName(name) {
  return String(name)
    .toLocaleLowerCase("tr")
    .replace(/\(.*?\)/g, " ")
    .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"}[m]))
    .replace(/[âîû]/g, (m) => ({â: "a", î: "i", û: "u"}[m]))
    // SymbTr mu2 dosyalari latin1/Win-1254; Turkce ı/ğ/ş bu okumada ý/ð/þ'ye
    // donusur. Hem gercek Turkce (nameTr) hem mojibake ayni ascii'ye insin ki
    // eslesme addan tursun.
    .replace(/[ýðþ]/g, (m) => ({ý: "i", ð: "g", þ: "s"}[m]))
    .replace(/[^a-z0-9]/g, "");
}

function resolveCorpusRoot() {
  const root = ROOT_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!root) {
    throw new Error(
      `SymbTr mu2 korpusu bulunamadi. Once 'npm run fetch:symbtr-v3' calistirin. Arananlar:\n${ROOT_CANDIDATES.join("\n")}`,
    );
  }
  return root;
}

export function deriveCorpusMeters(root) {
  const histogram = new Map(); // normalizedName -> {display, total, meters: {"10/8": n}}
  for (const file of readdirSync(root)) {
    if (!file.endsWith(".mu2")) continue;
    let raw;
    try {
      raw = readFileSync(path.join(root, file), "latin1");
    } catch {
      continue;
    }
    const meterRow = raw.split(/\r?\n/).find((line) => line.startsWith("51\t"));
    if (!meterRow) continue;
    const columns = meterRow.split("\t");
    const usulName = (columns[7] || "").trim();
    const pay = (columns[2] || "").trim();
    const payda = (columns[3] || "").trim();
    if (!usulName || !/^\d+$/.test(pay) || !/^\d+$/.test(payda)) continue;
    const key = normalizeUsulName(usulName);
    if (!key) continue;
    const meter = `${pay}/${payda}`;
    if (!histogram.has(key)) histogram.set(key, {display: usulName, total: 0, meters: {}});
    const entry = histogram.get(key);
    entry.total += 1;
    entry.meters[meter] = (entry.meters[meter] || 0) + 1;
  }
  // Deterministik sirala (isim -> alfabetik; mertebeler sayiya gore azalan).
  const sorted = {};
  for (const key of Array.from(histogram.keys()).sort()) {
    const entry = histogram.get(key);
    const meters = Object.fromEntries(Object.entries(entry.meters).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
    sorted[key] = {display: entry.display, total: entry.total, meters};
  }
  return sorted;
}

export function buildCorpusMeterSummary() {
  const root = resolveCorpusRoot();
  return {
    source: "SymbTr v3.0 (Zenodo 15470412, CC-BY 4.0), mu2 kod-51 pay/payda",
    generatedFrom: path.relative(PROJECT_ROOT, root).replace(/\\/g, "/"),
    usuls: deriveCorpusMeters(root),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const summary = buildCorpusMeterSummary();
  mkdirSync(path.dirname(OUTPUT), {recursive: true});
  writeFileSync(OUTPUT, JSON.stringify(summary, null, 2) + "\n");
  const usulCount = Object.keys(summary.usuls).length;
  console.log(`[derive-usul-corpus-meters] ${usulCount} usul adi -> ${path.relative(PROJECT_ROOT, OUTPUT)}`);
}
