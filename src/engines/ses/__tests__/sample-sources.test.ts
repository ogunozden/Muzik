import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";

/**
 * SES KAYNAKLARININ KIMLIGI VE HER KLASORUN PROVENANCE'I (PLAN.md §11/H3-H5)
 *
 * ── COZULEN KUSUR ───────────────────────────────────────────────────────
 * `all-samples/` gitignored (200 MB+ ucuncu parti ikili) ve 0 dosyasi
 * izleniyor. F5'te "ney artik yeniden uretilebilir" yazmistim; bu iddia
 * yalnizca uretimi yapan makinede dogruydu, cunku kaynagin ne oldugu depoda
 * hicbir yerde kayitli degildi.
 *
 * Ayrica 20 ses klasorunden **yalniz biri** (`ney`) belgeliydi. Digerlerinin
 * uretim parametreleri hicbir yerde yoktu; README yalnizca preset ADINI
 * yaziyordu ve IKI klasor (`bendir`, `kudum`) orada bile yoktu — ustelik
 * `kudum` uygulamanin VARSAYILAN vurmalisi.
 *
 * ── BU TESTIN AMACI ─────────────────────────────────────────────────────
 * Klasorleri "belgeli" gostermek DEGIL. Belgesizligi **sayilabilir** kilmak:
 * bir klasor sessizce kayitsiz kalamaz, kayit bayatlayamaz.
 */

const SAMPLES_ROOT = path.join(process.cwd(), "public", "samples");

interface SourceRecord {
  readonly id: string;
  readonly path: string;
  readonly sha256: string;
  readonly license: string;
  readonly commercialUse: string;
}
interface FolderRecord {
  readonly sourceId: string | null;
  readonly presets: readonly string[] | null;
  readonly producer: string | null;
  readonly confidence: "documented" | "claimed" | "unknown";
}

const sources = JSON.parse(fs.readFileSync(path.join(SAMPLES_ROOT, "sources.json"), "utf8")) as {
  sources: SourceRecord[];
};
const provenance = JSON.parse(fs.readFileSync(path.join(SAMPLES_ROOT, "provenance.json"), "utf8")) as {
  folders: Record<string, FolderRecord>;
  hekSearch: {twoHandStrokeFound: boolean; kudumPresetExists: boolean};
};

function sampleFolders(): string[] {
  return fs
    .readdirSync(SAMPLES_ROOT, {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

describe("Ses kaynaklarının kimliği (H3)", () => {
  it("her kaynagin lisansi ve ticari kullanim durumu yazili", () => {
    expect(sources.sources.length).toBeGreaterThan(0);
    for (const source of sources.sources) {
      expect(source.license, `${source.id} lisanssiz`).toBeTruthy();
      expect(source.sha256, `${source.id} hash'siz`).toMatch(/^[0-9a-f]{64}$/);
      // Projenin butun ses klasorleri ticarete acik olmali — ney'in CC BY-NC
      // borcu F5'te tam bu yuzden kapatildi. Yeni bir kisitli kaynak
      // eklenirse burada durur.
      expect(source.commercialUse, `${source.id} ticari kullanimi kisitli`).toBe("serbest");
    }
  });

  it("kaynak YERELDE varsa hash TUTMALI", () => {
    // Kaynak yoksa (CI, temiz klon) iddia yok — ama sessiz de degil: asagidaki
    // sayim testi kaynagin bulunup bulunmadigini raporlar.
    for (const source of sources.sources) {
      const file = path.join(process.cwd(), source.path);
      if (!fs.existsSync(file)) continue;

      const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
      expect(
        digest,
        `${source.path} beklenen surum DEGIL. Sample'lar bu dosyadan uretildi; ` +
          "farkli bir surum, uretimi tekrarlanamaz kilar.",
      ).toBe(source.sha256);
    }
  }, 120_000);
});

describe("Her klasörün provenance kaydı (H4)", () => {
  it("KAYITSIZ klasor yok — her klasorun bir kaydi var", () => {
    const folders = sampleFolders();
    const missing = folders.filter((name) => !(name in provenance.folders));
    expect(missing).toEqual([]);

    // Ters yon: kaydi olup klasoru olmayan da kalmasin (bayat kayit).
    const orphan = Object.keys(provenance.folders).filter((name) => !folders.includes(name));
    expect(orphan).toEqual([]);
  });

  it("kayitlar gecerli bir kaynaga isaret ediyor", () => {
    const ids = new Set(sources.sources.map((source) => source.id));
    for (const [folder, record] of Object.entries(provenance.folders)) {
      if (record.sourceId === null) continue;
      expect(ids.has(record.sourceId), `${folder} bilinmeyen kaynaga isaret ediyor`).toBe(true);
    }
  });

  it("belgesizlik SAYILIYOR — sessizce artamaz", () => {
    const counts = {documented: 0, claimed: 0, unknown: 0};
    for (const record of Object.values(provenance.folders)) counts[record.confidence]++;

    // 2026-07-27 durumu. Bu sayilar bir HEDEF degil, bir OLCUM: iyilestikce
    // (claimed -> documented) test kirilir ve guncellenmesi gerekir.
    expect(counts).toEqual({documented: 1, claimed: 16, unknown: 2});

    // `unknown` olanlar adiyla sabit: yeni bir klasor kayitsiz eklenemez.
    const unknown = Object.entries(provenance.folders)
      .filter(([, record]) => record.confidence === "unknown")
      .map(([name]) => name)
      .sort();
    expect(unknown).toEqual(["bendir", "kudum"]);
  });

  it("`documented` olan klasorun ureticisi GERCEKTEN depoda", () => {
    for (const [folder, record] of Object.entries(provenance.folders)) {
      if (record.confidence !== "documented") continue;
      expect(record.producer, `${folder} belgeli ama uretici yazilmamis`).toBeTruthy();
      expect(
        fs.existsSync(path.join(process.cwd(), record.producer as string)),
        `${folder} ureticisi depoda yok: ${record.producer}`,
      ).toBe(true);
      expect(record.presets?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("Kaynak /samples sayfasında görünür (H4)", () => {
  it("API kaydi disari veriyor ve sayfa uc guven duzeyini de yaziyor", () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "api", "samples", "route.ts"),
      "utf8",
    );
    expect(route).toContain("provenance.json");
    expect(route).toContain("provenance: folderProvenance");

    const page = fs.readFileSync(path.join(process.cwd(), "src", "app", "samples", "page.tsx"), "utf8");
    // Kaynagi bilinmeyen klasor bos gecilmemeli — ekranda soylenmeli.
    expect(page).toContain("Kaynak bilinmiyor");
    // "Iddia" ile "belgeli" ayrimi kullaniciya da gorunmeli.
    expect(page).toContain("üretim parametreleri kayıtlı değil");
    expect(page).toContain("yeniden üretilebilir");
  });
});

describe("hek araması ölçülmüş olmalı (H5)", () => {
  it("kaynakta gercek hek YOK — ve bu OLCUMLE kayitli", () => {
    // Onceki iddia yalnizca dosya adina bakiyordu. Artik kaynagin ic yapisi
    // taranmis durumda: 354 benzersiz bolge adi, iki-el vurusu yok, en yakin
    // sozluksel eslesme (`Finger Flam`) olculdugunde cok vuruslu cikti.
    expect(provenance.hekSearch.twoHandStrokeFound).toBe(false);

    // Ek bulgu: soundfont'ta `kudum` preset'i hic yok. `hek`in kudum
    // terminolojisi olmasi, bu paketlerde bulunmamasini aciklar.
    expect(provenance.hekSearch.kudumPresetExists).toBe(false);
  });
});
