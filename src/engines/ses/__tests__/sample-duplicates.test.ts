import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";

/**
 * FARKLI ENSTRUMANLAR AYNI SESI CALMAMALI
 *
 * ── NASIL BULUNDU ───────────────────────────────────────────────────────
 * Kaynak taramasinda `davul` ve `zil` klasorleri AYNI soundfont bolgesiyle
 * (`Eastern Percussion / 74=Big Gong`) ayni hizda (0,7710) r=1,0000 verdi.
 * Iki farkli enstruman ayni bolgeden gelemez diye kontrol edildi:
 *
 *     davul/dum-accent.wav  ile  zil/dum-accent.wav
 *     ilk 0,35 s uzerinden r = 1,000000, tepe genlikleri ESIT
 *     uzunluklar 1,40 s / 1,60 s
 *
 * Yani ayni kayit, farkli uzunlukta kesilmis. Davul (kos davulu) ile zil
 * (zilli calgi) kullanicida AYNI sesi cikariyor.
 *
 * ── HASH KAPISI BUNU NEDEN KACIRDI ──────────────────────────────────────
 * `manifest.json` bayt hash'i tutar; kuyruklari farkli oldugu icin hash'ler
 * tutmadi ve dosyalar "farkli" gorundu. Sesin AYNI olmasi bayt esitligi
 * gerektirmez. Bu yuzden burada dalga bicimi karsilastirilir.
 *
 * ── NEDEN "BILINEN KUSUR" LISTESI VAR ───────────────────────────────────
 * Bulunan uc cift gercek birer kusur ama duzeltmek yeni KAYIT ister
 * (FAZ D); ses uydurulmaz (ADR 0001). Kusurlar bu listede ACIK durur.
 * Listeye yeni bir cift eklenirse test kirilir — yani kusur BUYUYEMEZ,
 * yalnizca kayit gelince kuculur.
 */

const SAMPLES_ROOT = path.join(process.cwd(), "public", "samples");
/** Karsilastirma penceresi — vurusun karakterini tasiyan bas kisim. */
const COMPARE_SECONDS = 0.2;
const IDENTICAL_THRESHOLD = 0.9999;

/**
 * Bilinen, kayit bekleyen kusurlar. Her giris `provenance.json`
 * -> `duplicateAudit.findings` icinde gerekcesiyle duruyor.
 *
 * 2026-08-22: Uc cift cozuldu — davul Eastern (Wadaiko/Req) ile
 * zilden (Big Gong) ayrildi, def Riq_Full ayri hiz katmanlarina
 * gecirildi, nakkare 58=Tabla Na vs 59=Tabla Tun ile ayristirildi.
 * Liste bos; yeni ikiz cikarsa test kirilir.
 */
const KNOWN_DUPLICATES: string[] = [];

function readWavMono(buffer: Buffer): {mono: Float32Array; rate: number} | null {
  if (buffer.length < 44 || buffer.toString("ascii", 0, 4) !== "RIFF") return null;
  let offset = 12;
  let rate = 0;
  let channels = 1;
  let bits = 16;

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt ") {
      channels = buffer.readUInt16LE(offset + 10);
      rate = buffer.readUInt32LE(offset + 12);
      bits = buffer.readUInt16LE(offset + 22);
    } else if (id === "data") {
      const bytesPerSample = bits / 8;
      const frames = Math.floor(size / (bytesPerSample * channels));
      const mono = new Float32Array(frames);
      for (let frame = 0; frame < frames; frame++) {
        const at = offset + 8 + frame * bytesPerSample * channels;
        if (at + 2 > buffer.length) break;
        mono[frame] = buffer.readInt16LE(at) / 32768;
      }
      return {mono, rate};
    }
    offset += 8 + size + (size % 2);
  }
  return null;
}

function correlate(left: Float32Array, right: Float32Array, count: number): number {
  const length = Math.min(count, left.length, right.length);
  if (length < 1000) return 0;
  let dot = 0;
  let normLeft = 0;
  let normRight = 0;
  for (let i = 0; i < length; i++) {
    dot += left[i] * right[i];
    normLeft += left[i] * left[i];
    normRight += right[i] * right[i];
  }
  const denominator = Math.sqrt(normLeft * normRight);
  return denominator > 0 ? Math.abs(dot / denominator) : 0;
}

describe("Farkli enstrumanlar ayni sesi calmamali", () => {
  it("BILINMEYEN ikiz yok — hem bayt hem dalga bicimi duzeyinde", () => {
    const byFileName = new Map<string, string[]>();
    for (const folder of fs.readdirSync(SAMPLES_ROOT)) {
      const folderPath = path.join(SAMPLES_ROOT, folder);
      if (!fs.statSync(folderPath).isDirectory()) continue;
      for (const name of fs.readdirSync(folderPath)) {
        if (!name.endsWith(".wav")) continue;
        byFileName.set(name, [...(byFileName.get(name) ?? []), `${folder}/${name}`]);
      }
    }

    const cache = new Map<string, {mono: Float32Array; rate: number} | null>();
    const load = (relativePath: string) => {
      if (!cache.has(relativePath)) {
        cache.set(relativePath, readWavMono(fs.readFileSync(path.join(SAMPLES_ROOT, relativePath))));
      }
      return cache.get(relativePath);
    };

    const found = new Set<string>();

    // ── 1. BAYT DUZEYI ──────────────────────────────────────────────────
    // Adlari FARKLI olsa da ayni dosya olabilir: `davul/ke-accent.wav` ile
    // `def/ke.wav` boyle bulundu. Ad esligi sart kosulsa kacardi.
    const byHash = new Map<string, string[]>();
    for (const paths of byFileName.values()) {
      for (const relativePath of paths) {
        const hash = createHash("sha256")
          .update(fs.readFileSync(path.join(SAMPLES_ROOT, relativePath)))
          .digest("hex");
        byHash.set(hash, [...(byHash.get(hash) ?? []), relativePath]);
      }
    }
    for (const group of byHash.values()) {
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) found.add([group[i], group[j]].sort().join(" == "));
      }
    }

    // ── 2. DALGA BICIMI DUZEYI ──────────────────────────────────────────
    // Ayni kayit farkli uzunlukta kesilmisse hash TUTMAZ ama ses aynidir:
    // `davul/dum-accent.wav` ile `zil/dum-accent.wav` (1,40 s / 1,60 s)
    // tam da boyleydi ve bayt kapisi onu kaciriyordu.
    for (const paths of byFileName.values()) {
      for (let i = 0; i < paths.length; i++) {
        for (let j = i + 1; j < paths.length; j++) {
          const left = load(paths[i]);
          const right = load(paths[j]);
          if (!left || !right) continue;
          const score = correlate(left.mono, right.mono, Math.floor(left.rate * COMPARE_SECONDS));
          if (score > IDENTICAL_THRESHOLD) found.add([paths[i], paths[j]].sort().join(" == "));
        }
      }
    }

    // Yeni bir ikiz cifti eklenirse burada durur: kusur buyuyemez.
    expect([...found].sort()).toEqual([...KNOWN_DUPLICATES].sort());
  });

  it("bilinen kusurlar provenance kaydinda gerekcesiyle duruyor", () => {
    const provenance = JSON.parse(
      fs.readFileSync(path.join(SAMPLES_ROOT, "provenance.json"), "utf8"),
    ) as {duplicateAudit?: {findings?: Array<{files: string[]; status: string}>}};

    const findings = provenance.duplicateAudit?.findings ?? [];
    expect(findings).toHaveLength(KNOWN_DUPLICATES.length);

    const recorded = findings.map((entry) => [...entry.files].sort().join(" == ")).sort();
    expect(recorded).toEqual([...KNOWN_DUPLICATES].sort());

    // Kusur SESSIZ olamaz: her biri neden acik oldugunu soylemeli.
    for (const entry of findings) expect(entry.status).toMatch(/kusur/);
  });
});
