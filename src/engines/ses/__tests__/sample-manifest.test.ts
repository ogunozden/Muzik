import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {SAMPLE_SLOTS} from "../sample-library";

/**
 * KAYNAK IDDIASI HANGI DOSYALARI KAPSIYOR? (FAZ D girisi)
 *
 * `provenance.json` bir KLASORUN kaynagini anlatir ("ney: TURKISH-ARAB3,
 * Moss_Nay preset'i"). Ama iddia klasore degil, o anki DOSYALARA aittir.
 *
 * ── KAPATILAN ACIK ──────────────────────────────────────────────────────
 * `/samples` sayfasindan bir dosya yuklendiginde dosya degisiyor, provenance
 * kaydi oldugu gibi kaliyordu. Yani beklenen studyo kayitlari (FAZ D)
 * geldiginde uygulama onlar icin hala "soundfont'tan uretildi" diyecekti —
 * kaynagi YANLIS bildiren bir ekran.
 *
 * `manifest.json` her commit'li dosyanin sha256'sini tutar; API diskteki
 * dosyayla karsilastirip `matchesManifest` doner. Tutmuyorsa arayuz
 * "kaynak kaydi bu dosyayi kapsamiyor" uyarisini gosterir.
 *
 * ── BU TEST NEYI SABITLER ───────────────────────────────────────────────
 * 1. Manifest gercekten guncel (her commit'li ses dosyasi kayitli ve hash
 *    tutuyor) — bayat manifest sessizce yanlis "kapsam disi" uretirdi.
 * 2. Manifest yalniz var olan dosyalari listeliyor.
 * 3. API ve arayuz alani gercekten disari veriyor/gosteriyor — F2'de tam da
 *    bu unutulmustu (uyari yalniz kart duzenine konmus, tabloda gorunmuyordu).
 */

const SAMPLES_ROOT = path.join(process.cwd(), "public", "samples");
const MANIFEST_PATH = path.join(SAMPLES_ROOT, "manifest.json");

interface Manifest {
  fileCount: number;
  files: Record<string, {sha256: string; bytes: number}>;
}

function readManifest(): Manifest {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
}

function listSampleFiles(): string[] {
  const files: string[] = [];
  for (const folder of fs.readdirSync(SAMPLES_ROOT)) {
    const folderPath = path.join(SAMPLES_ROOT, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;
    for (const name of fs.readdirSync(folderPath)) {
      if (name.endsWith(".wav")) files.push(`${folder}/${name}`);
    }
  }
  return files.sort();
}

describe("Ses manifestosu — kaynak iddiasinin kapsami", () => {
  it("manifest var ve her ses dosyasini kapsiyor", () => {
    const manifest = readManifest();
    const onDisk = listSampleFiles();

    expect(onDisk.length).toBeGreaterThan(0);
    expect(Object.keys(manifest.files).sort()).toEqual(onDisk);
    expect(manifest.fileCount).toBe(onDisk.length);
  });

  it("kayitli hash'ler diskteki dosyalarla TUTUYOR", () => {
    const manifest = readManifest();
    const mismatched: string[] = [];

    for (const [relativePath, entry] of Object.entries(manifest.files)) {
      const buffer = fs.readFileSync(path.join(SAMPLES_ROOT, relativePath));
      const actual = crypto.createHash("sha256").update(buffer).digest("hex");
      if (actual !== entry.sha256 || buffer.length !== entry.bytes) mismatched.push(relativePath);
    }

    // Bayat manifest, degismemis dosyalari "kapsam disi" gosterirdi —
    // yani dogru kaynak bilgisini sessizce gecersiz kilardi.
    expect(mismatched).toEqual([]);
  });

  it("her kurulu yuva manifestoda kayitli", () => {
    const manifest = readManifest();
    const installedButUnlisted = SAMPLE_SLOTS.filter((slot) => {
      const filePath = path.join(SAMPLES_ROOT, ...slot.relativePath.split("/"));
      return fs.existsSync(filePath) && !(slot.relativePath in manifest.files);
    }).map((slot) => slot.relativePath);

    expect(installedButUnlisted).toEqual([]);
  });

  it("API alani disari veriyor, sayfa gosteriyor", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "api", "samples", "route.ts"),
      "utf8",
    );
    expect(route).toContain("matchesManifest");
    expect(route).toContain("manifest.json");

    const samplesDir = path.join(process.cwd(), "src", "app", "samples");
    const allSamplesCode = fs
      .readdirSync(samplesDir, {recursive: true, withFileTypes: true} as Parameters<typeof fs.readdirSync>[1])
      .filter((e: unknown) => (e as {isFile: () => boolean}).isFile())
      .map((e: unknown) => {
        const entry = e as {parentPath: string; name: string};
        return fs.readFileSync(path.join(entry.parentPath, entry.name), "utf8");
      })
      .join("\n");
    expect(allSamplesCode).toContain("slot.matchesManifest === false");
    expect(allSamplesCode).toContain("Kaynak kaydı bu dosyayı kapsamıyor");
  });

  it("uretici betik depoda ve script olarak bagli", () => {
    expect(fs.existsSync(path.join(process.cwd(), "scripts", "build-sample-manifest.mjs"))).toBe(true);

    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts["samples:manifest"]).toContain("build-sample-manifest.mjs");
  });
});
