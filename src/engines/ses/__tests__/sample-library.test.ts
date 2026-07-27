import {existsSync, readFileSync, readdirSync, statSync} from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {SAMPLE_SLOTS} from "../sample-library";

const samplesRoot = path.join(process.cwd(), "public", "samples");

/**
 * BILINCLI OLARAK BOS BIRAKILAN KLASORLER (PLAN.md §11.3)
 *
 * Su an BOS — ve bu iyi haber. Tarihce, listenin ne ise yaradigini gosteriyor:
 *
 *  · Eskiden burada `knownMissingNeySlots` vardi (ney'in 26 eksik yuvasi).
 *    F5'te ney soundfont'tan yeniden uretildi ve **36/36 doldu**.
 *  · Sonra kisa sure `tanpura` yazdi: 36 dosyanin 35'i yanlis perde caliyordu
 *    ve kaynak olculemedigi icin onarilamiyordu. Sonunda saz projeden
 *    tamamen cikarildi (§11.7), klasor de gitti.
 *
 * Liste bos kalsa bile DURUYOR: bir klasorun sessizce bosalmasi asagidaki
 * kapida durur ve buraya gerekce yazmayi zorunlu kilar.
 *
 * ── BURAYA BIR KLASOR EKLERSEN: `.gitkeep` KOY ──────────────────────────
 * Git BOS DIZIN IZLEMEZ. Tanpura'da tam bu tuzaga dusuldu: dosyalar
 * `git rm` ile silindi, yerel makinede bos klasor durmaya devam etti ve
 * testler gecti — ama CI'nin temiz klonunda klasor HIC YOKTU ve provenance
 * kaydi "oksuz" cikip CI'yi kirdi.
 *
 * Yani filesystem okuyan bir test, yerelde CI'da VAR OLAMAYACAK bir sebeple
 * gecebilir. Bilincli bos birakilan bir klasorun temiz klonda da var olmasi
 * gerekiyorsa icine izlenen bir dosya (`.gitkeep`) konmalidir.
 */
const INTENTIONALLY_EMPTY_FOLDERS = new Set<string>();

function walkFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(fullPath);
    return fullPath;
  });
}

function toSampleRelativePath(fullPath: string): string {
  return path.relative(samplesRoot, fullPath).replace(/\\/g, "/");
}

describe("sample asset inventory", () => {
  const sampleFiles = walkFiles(samplesRoot);
  const actualWav = sampleFiles
    .map(toSampleRelativePath)
    .filter((relativePath) => relativePath.toLowerCase().endsWith(".wav"))
    .sort();
  const expectedWav = SAMPLE_SLOTS.map((slot) => slot.relativePath).sort();

  it("does not ship unexpected wav files or obsolete placeholder files", () => {
    const expectedSet = new Set(expectedWav);
    const extras = actualWav.filter((relativePath) => !expectedSet.has(relativePath));
    const nonWav = sampleFiles
      .map(toSampleRelativePath)
      .filter((relativePath) => !relativePath.toLowerCase().endsWith(".wav"))
      .sort();

    expect(extras).toEqual([]);
    // WAV disinda YALNIZ bu uc dosya bulunabilir. Liste kasitli olarak
    // dardir: klasore sizacak baska bir sey (yedek, .DS_Store, gecici cikti)
    // burada durur.
    //   README.md       — kaynak/lisans anlatimi
    //   sources.json    — kaynak arsivlerin kimligi + lisansi (H3)
    //   provenance.json — her klasorun uretim kaydi + hek aramasi (H4/H5)
    expect(nonWav).toEqual(["README.md", "provenance.json", "sources.json"]);
  });

  it("keeps installed wav files non-empty and decodable as RIFF/WAVE assets", () => {
    for (const relativePath of actualWav) {
      const fullPath = path.join(samplesRoot, ...relativePath.split("/"));
      const fileStat = statSync(fullPath);
      const header = readFileSync(fullPath).subarray(0, 12);

      expect(fileStat.size, relativePath).toBeGreaterThan(44);
      expect(header.subarray(0, 4).toString("ascii"), relativePath).toBe("RIFF");
      expect(header.subarray(8, 12).toString("ascii"), relativePath).toBe("WAVE");
    }
  });

  it("eksik yuva YALNIZ bilincli bos birakilan klasorlerde", () => {
    const actualSet = new Set(actualWav);
    const missing = expectedWav.filter((relativePath) => !actualSet.has(relativePath));

    // Bir klasorun sessizce bosalmasi bu kapida durur: eksik her yuva,
    // gerekcesi yazili bir klasore ait olmali.
    const unexpected = missing.filter(
      (relativePath) => !INTENTIONALLY_EMPTY_FOLDERS.has(relativePath.split("/")[0]),
    );
    expect(unexpected).toEqual([]);

    // Ters yon: bilincli bos klasor gercekten TAMAMEN bos olmali; yarim dolu
    // bir klasor "bilincli" degil, kazadir.
    for (const folder of INTENTIONALLY_EMPTY_FOLDERS) {
      const present = actualWav.filter((relativePath) => relativePath.startsWith(`${folder}/`));
      expect(present, `${folder} bilincli bos ama dosya var`).toEqual([]);
    }
  });

  it("reports audio data chunk size for each sample (placeholder detection)", () => {
    const zeroDataFiles: string[] = [];
    for (const relativePath of actualWav) {
      const fullPath = path.join(samplesRoot, ...relativePath.split("/"));
      const buf = readFileSync(fullPath);
      if (buf.length < 5000) zeroDataFiles.push(relativePath);
    }
    const totalActual = actualWav.length;
    const totalReal = totalActual - zeroDataFiles.length;
    const percentReal = totalActual > 0 ? Math.round((totalReal / totalActual) * 100) : 0;
    console.log(`[sample-audit] ${totalReal}/${totalActual} files have audio data (${percentReal}% real, ${zeroDataFiles.length} placeholders)`);
    if (zeroDataFiles.length > 0) {
      console.log(`[sample-audit] Placeholder files (< 5000 bytes): ${zeroDataFiles.slice(0, 5).join(", ")}... (${zeroDataFiles.length} total)`);
    }
  });
  /**
   * Vurmali sample TEK VURUS icermeli (K1).
   *
   * Bulunan: kudum'un dum/ke/tek kayitlari ~10ms ve ~310ms'de IKI vurus
   * iceriyordu — kudum motorun VARSAYILAN vurmalisi oldugu icin usul bozuk
   * caliniyordu ("teklerde iki vurus geliyor", 2026-07-14). Kod tarafinda bir
   * zarf-kirpma workaround'uyla ortulmustu; kok neden dosyalardaydi.
   * `scripts/trim-percussion-samples.mjs --write` uc dosyayi ilk vurusa kirpti.
   *
   * Gercek vurusu dogal rezonanstan ayiran esikler (olculdu):
   *   gercek ikinci vurus : aralik 290-300ms, yukselis 5.0-7.9x
   *   rezonans (zil/davul): aralik 30-260ms,  yukselis 1.2-3.3x
   */
  it("her vurmali sample TEK vurus icerir", () => {
    const WINDOW_MS = 10;
    const MIN_STRIKE_GAP_MS = 200;
    const MIN_STRIKE_RISE = 4;
    const percussionFiles = new Set([
      "dum.wav", "dum-accent.wav", "tek.wav", "tek-accent.wav",
      "ke.wav", "ke-accent.wav", "hek.wav", "hek-accent.wav",
    ]);

    function strikeCount(fullPath: string): number {
      const buf = readFileSync(fullPath);
      if (buf.toString("ascii", 0, 4) !== "RIFF") return 1;
      let offset = 12;
      let channels = 0;
      let sampleRate = 0;
      let dataOffset = 0;
      let dataLength = 0;
      while (offset + 8 <= buf.length) {
        const id = buf.toString("ascii", offset, offset + 4);
        const size = buf.readUInt32LE(offset + 4);
        if (id === "fmt ") {
          channels = buf.readUInt16LE(offset + 10);
          sampleRate = buf.readUInt32LE(offset + 12);
        } else if (id === "data") {
          dataOffset = offset + 8;
          dataLength = size;
        }
        offset += 8 + size + (size % 2);
      }
      if (!channels || !dataLength) return 1;

      const bytesPerFrame = channels * 2;
      const frames = Math.floor(dataLength / bytesPerFrame);
      const window = Math.max(1, Math.floor((sampleRate * WINDOW_MS) / 1000));
      const envelope: number[] = [];
      for (let start = 0; start + window <= frames; start += window) {
        let peak = 0;
        for (let i = 0; i < window; i += 1) {
          const v = Math.abs(buf.readInt16LE(dataOffset + (start + i) * bytesPerFrame)) / 32768;
          if (v > peak) peak = v;
        }
        envelope.push(peak);
      }
      const max = Math.max(...envelope, 0);
      if (max <= 0) return 1;

      const candidates: number[] = [];
      let armed = true;
      for (let i = 0; i < envelope.length; i += 1) {
        if (armed && envelope[i] > max * 0.5) {
          candidates.push(i);
          armed = false;
        } else if (!armed && envelope[i] < max * 0.35) {
          armed = true;
        }
      }
      if (candidates.length === 0) return 1;

      let strikes = 1;
      let last = candidates[0];
      for (const index of candidates.slice(1)) {
        const floor = Math.min(...envelope.slice(Math.max(0, index - 3), index));
        const rise = envelope[index] / Math.max(floor, 1e-4);
        if ((index - last) * WINDOW_MS >= MIN_STRIKE_GAP_MS && rise >= MIN_STRIKE_RISE) {
          strikes += 1;
          last = index;
        }
      }
      return strikes;
    }

    const multiStrike: string[] = [];
    let checked = 0;
    for (const relativePath of actualWav) {
      const fileName = relativePath.split("/").pop() ?? "";
      if (!percussionFiles.has(fileName)) continue;
      checked += 1;
      if (strikeCount(path.join(samplesRoot, ...relativePath.split("/"))) > 1) multiStrike.push(relativePath);
    }

    expect(checked, "denetlenen vurmali sample").toBeGreaterThanOrEqual(50);
    expect(multiStrike, "birden fazla vurus iceren sample").toEqual([]);
  });
});
