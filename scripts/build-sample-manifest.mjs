#!/usr/bin/env node
/**
 * COMMIT'LI SES DOSYALARININ HASH MANIFESTOSUNU URETIR.
 *
 * ── NEDEN VAR ───────────────────────────────────────────────────────────
 * `provenance.json` bir KLASORUN kaynagini anlatir ("ney: TURKISH-ARAB3,
 * Moss_Nay preset'i, su betikle uretildi"). Ama iddia klasore degil aslinda
 * O ANKI DOSYALARA aittir.
 *
 * Acik burada: `/samples` sayfasindan bir dosya YUKLENDIGINDE dosya
 * degisiyor, provenance kaydi ise oldugu gibi kaliyor. Yani bir studyo
 * kaydi yuklendiginde uygulama onun icin hala "soundfont'tan uretildi"
 * demeye devam ederdi — YANLIS bir iddia.
 *
 * Cozum kayit tutmak degil OLCMEK: her commit'li dosyanin sha256'si burada
 * durur. Diskteki dosya tutmuyorsa, provenance kaydi o dosyayi KAPSAMIYOR
 * demektir ve arayuz bunu soyler. Calisma zamaninda hicbir yere yazmaya
 * gerek kalmaz; kanit dosyasi da uygulama tarafindan degistirilmez.
 *
 * FAZ D (studyo kayitlari) geldiginde dogru davranis kendiliginden olusur:
 * yuklenen dosya manifestoyu tutmaz -> "kullanici dosyasi, kaynak kaydi
 * bunu kapsamiyor" gorunur. Kayit kalici olarak benimsenecekse manifesto
 * bu betikle yeniden uretilir ve provenance elle guncellenir.
 *
 * Kullanim:
 *   node scripts/build-sample-manifest.mjs            # yazar
 *   node scripts/build-sample-manifest.mjs --check    # yalniz dogrular
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SAMPLES_ROOT = path.join(process.cwd(), "public", "samples");
const MANIFEST_PATH = path.join(SAMPLES_ROOT, "manifest.json");

const isCheckOnly = process.argv.includes("--check");

function listSampleFiles() {
  const files = [];
  for (const folder of fs.readdirSync(SAMPLES_ROOT)) {
    const folderPath = path.join(SAMPLES_ROOT, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    for (const name of fs.readdirSync(folderPath)) {
      if (name.endsWith(".wav")) files.push(`${folder}/${name}`);
    }
  }
  return files.sort();
}

const entries = {};
for (const relativePath of listSampleFiles()) {
  const buffer = fs.readFileSync(path.join(SAMPLES_ROOT, relativePath));
  entries[relativePath] = {
    sha256: crypto.createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.length,
  };
}

const manifest = {
  $comment: [
    "COMMIT'LI SES DOSYALARININ KIMLIGI.",
    "",
    "`provenance.json` bir klasorun kaynagini anlatir; bu dosya o iddianin",
    "HANGI dosyalar icin gecerli oldugunu sabitler. Diskteki dosya buradaki",
    "sha256'yi tutmuyorsa provenance kaydi onu KAPSAMAZ — arayuz bunu",
    "'kullanici dosyasi' olarak gosterir.",
    "",
    "Uretici: scripts/build-sample-manifest.mjs (npm run samples:manifest).",
    "Ses dosyalari bilerek degistiyse birlikte yeniden uretilir.",
  ],
  fileCount: Object.keys(entries).length,
  files: entries,
};

if (isCheckOnly) {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error("manifest.json yok — once `npm run samples:manifest` calistir.");
    process.exit(1);
  }
  const existing = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const drifted = Object.keys(entries).filter(
    (key) => existing.files?.[key]?.sha256 !== entries[key].sha256,
  );
  const missing = Object.keys(existing.files ?? {}).filter((key) => !(key in entries));

  if (drifted.length === 0 && missing.length === 0) {
    console.log(`manifest guncel: ${manifest.fileCount} dosya`);
    process.exit(0);
  }
  for (const key of drifted) console.error(`  degismis / manifestoda yok: ${key}`);
  for (const key of missing) console.error(`  manifestoda var, diskte yok: ${key}`);
  console.error(`\n${drifted.length + missing.length} sapma. Bilerek degistiyse: npm run samples:manifest`);
  process.exit(1);
}

fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`yazildi: public/samples/manifest.json (${manifest.fileCount} dosya)`);
