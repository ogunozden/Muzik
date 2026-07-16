/**
 * derive-makam-seyir.mjs — Gönül "Türk Müziği Solfej-Makam-Usûl-Dikte
 * Alıştırmaları" (neupress) s.307+ seyir listesinden (119 makam) otoriter seyir
 * tariflerini çıkarır ve MAKAM_DATA id'leriyle eşler. Çıktı:
 * src/engines/makam/__generated__/makam-seyir.generated.json
 *
 * Kaynak metin (gonul.txt) korpus gibi gitignore'da OLMADIĞI için bu script'in
 * girdisi ARGV ile verilir; committed JSON test/CI kaynağıdır (kaynak-metin repo
 * dışında kalır). İlke: UYDURMA YOK — metin birebir kaynaktan, yalnız temizlenir.
 *
 * Kullanım: node scripts/derive-makam-seyir.mjs <gonul.txt yolu>
 */

import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const gonulPath = process.argv[2];
if (!gonulPath || !fs.existsSync(gonulPath)) {
  console.error("Kullanım: node scripts/derive-makam-seyir.mjs <gonul.txt yolu>");
  process.exit(1);
}

const normalize = (s) =>
  String(s)
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (m) => ({ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u"})[m] ?? m)
    .replace(/[âîû]/g, (m) => ({â: "a", î: "i", û: "u"})[m] ?? m)
    .replace(/[^a-z0-9]/g, "");

// Gönül yazımı -> MAKAM_DATA id normalize eşitliği kurulamayan alias'lar.
const ALIAS = {
  beyati: "bayati",
  huseyni: "huseyni",
  zirefkend: "zirefkend",
  acembuselik: "acembuselik",
  acemkurdi: "acemkurdi",
};

// Yön etiketini normalize et: cikici / inici / cikici-inici / inici-cikici.
function parseDirection(raw) {
  const n = normalize(raw);
  const hasC = n.includes("cikici");
  const hasI = n.includes("inici");
  if (hasC && hasI) return n.indexOf("inici") < n.indexOf("cikici") ? "İnici-Çıkıcı" : "Çıkıcı-İnici";
  if (hasC) return "Çıkıcı";
  if (hasI) return "İnici";
  return null; // ilk parantez yön değil (perde bilgisi) → bu giriş atlanır
}

const raw = fs.readFileSync(gonulPath, "utf8").split("\n");
// Seyir listesi "... 1. Rast (...)" ile başlar (satır içinde, "TEMEL MAKAMLAR"
// sonrası); son giriş ~"119.".
const startIdx = raw.findIndex((l) => /(?:^|\s)1\.\s+Rast\s*\(/.test(l));
if (startIdx < 0) {
  console.error("Seyir bölümü başlangıcı (1. Rast) bulunamadı.");
  process.exit(1);
}
const section = raw
  .slice(startIdx, startIdx + 260)
  .join(" ")
  .replace(/-\s*\d{2,3}\s*-/g, " ") // sayfa numaraları
  .replace(/TÜRK MÜZİĞİ SOLFEJ-MAKAM-USÛL-DİKTE ALIŞTIRMALARI/g, " ")
  .replace(/Mehmet GÖNÜL/g, " ")
  .replace(/TEMEL MAKAMLAR/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Marker: {no}. {Makam Adı} — ad, ilk parantezden önceki büyük-harfle başlayan
// 1-3 kelime. Parantezleri lookahead ile birak; yon/alt-isim/perde ayrimini
// parseLeadingParens yapar (yon her zaman ILK parantez degil, or. Rehavi: ilk
// parantez alt-isim "(Râhevî)", yon ikinci parantezde).
// (?:\.[a-z])? = alt-numarali aile girdileri (or. "20.a. Hicaz", "20.b. Uzzâl" —
// Hicaz ailesi bir "20." baslik altinda alt-harflenir).
const wordCh = "A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû'’.\\-";
const markerRe = new RegExp(
  `(?:^|\\s)(\\d{1,3})(?:\\.[a-zçğıöşü])?\\.\\s+([A-ZÇĞİÖŞÜ][${wordCh}]*(?:\\s+[A-ZÇĞİÖŞÜ][${wordCh}]*){0,2})\\s*(?=\\()`,
  "g",
);

// Ad sonrasindaki bitisik parantezleri (alt-isim, yon, perde) sirayla ayikla;
// icinde yon (cikici/inici) olan parantezi bul, metni tum onde-gelen
// parantezlerden SONRA dondur.
function parseLeadingParens(rest) {
  let t = rest.trimStart();
  const parens = [];
  while (t.startsWith("(")) {
    let depth = 0;
    let i = 0;
    for (; i < t.length; i += 1) {
      if (t[i] === "(") depth += 1;
      else if (t[i] === ")") {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
    }
    if (depth !== 0) break; // dengesiz paren → durdur
    parens.push(t.slice(0, i));
    t = t.slice(i).trimStart();
    if (parens.length >= 4) break; // en fazla 4 onde-gelen parantez tara
  }
  let dir = null;
  for (const p of parens) {
    const d = parseDirection(p);
    if (d) {
      dir = d;
      break;
    }
  }
  return {dir, text: t};
}

const marks = [];
let m;
while ((m = markerRe.exec(section))) {
  marks.push({idx: m.index, end: markerRe.lastIndex, num: Number(m[1]), name: m[2].trim()});
}

const entries = [];
for (let i = 0; i < marks.length; i += 1) {
  const cur = marks[i];
  const next = marks[i + 1];
  const rest = section.slice(cur.end, next ? next.idx : cur.end + 1400);
  const {dir, text: afterParens} = parseLeadingParens(rest);
  if (!dir) continue; // yon bulunamadi → güvenilir değil, atla
  let text = afterParens.replace(/\s+/g, " ").trim();
  // Bolum basligina tasma: son TEMEL MAKAM girdisi (Kürdî) sonrasi "MÜREKKEP
  // MAKAMLAR" basligi + bolum girisi metne karisiyor → basliktan kes.
  text = text.replace(/\s*MÜREKKEP MAKAMLAR.*$/, "").trim();
  text = text.replace(/\s*\/?\s*[IVX]{1,4}\s+Selim.*$/, "").trim();
  if (text.length < 25) continue;
  entries.push({num: cur.num, name: cur.name, yon: dir, metin: text});
}

// MAKAM_DATA id + name (TÜRKÇE-KARAKTERLİ id dahil — kritik).
const dataSrc = fs.readFileSync(path.join(ROOT, "src/engines/makam/data.ts"), "utf8");
const makams = [...dataSrc.matchAll(/\bid:\s*"([^"]+)"\s*,\s*\n\s*name:\s*"([^"]+)"/g)].map((x) => ({
  id: x[1].trim(),
  name: x[2],
}));

// Gönül girişlerini normalize-ada göre indeksle (ilk gelen kazanır).
const byNorm = new Map();
for (const e of entries) {
  const key = ALIAS[normalize(e.name)] ?? normalize(e.name);
  if (!byNorm.has(key)) byNorm.set(key, e);
}

const seyir = {};
const matched = [];
for (const mk of makams) {
  const key = normalize(mk.id);
  const e = byNorm.get(key) ?? byNorm.get(ALIAS[normalize(mk.name)] ?? normalize(mk.name));
  if (e) {
    seyir[mk.id] = {yon: e.yon, metin: e.metin};
    matched.push(`${mk.id}←${e.num}.${e.name}`);
  }
}

const output = {
  _source: "Mehmet Gönül, Türk Müziği Solfej-Makam-Usûl-Dikte Alıştırmaları (neupress), s.307+ seyir listesi",
  _generatedBy: "scripts/derive-makam-seyir.mjs",
  _note: "Otoriter seyir tarifleri; metin birebir kaynaktan (temizlenmiş). Uydurma yok.",
  seyir,
};

const outPath = path.join(ROOT, "src/engines/makam/__generated__/makam-seyir.generated.json");
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

console.log(`Gönül girişi ayrıştırıldı: ${entries.length}`);
console.log(`MAKAM_DATA makamı: ${makams.length} | EŞLEŞEN seyir: ${matched.length}`);
console.log("EŞLEŞEN:", matched.join(", "));
console.log("EŞLEŞMEYEN:", makams.filter((mk) => !seyir[mk.id]).map((mk) => mk.id).join(", "));
