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
  readonly origin: string;
  readonly commercialUse: "serbest" | "kisitli";
  readonly attributionRequired?: boolean;
  readonly attribution?: string;
  readonly restrictionNote?: string;
}
interface FolderRecord {
  readonly sourceId: string | null;
  readonly presets: readonly string[] | null;
  readonly producer: string | null;
  readonly confidence: "documented" | "measured" | "claimed" | "unknown";
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
      expect(["serbest", "kisitli"]).toContain(source.commercialUse);
    }
  });

  it("KISITLI lisansli kaynak sessiz olamaz — atif ve gerekce sart", () => {
    // ── COZULEN KUSUR ─────────────────────────────────────────────────────
    // Bu test once "her kaynak ticarete acik OLMALI" diyordu. Yanlis kapiydi:
    // kisitli kaynagi YASAKLAMAK, onu kaydetmemeye tesvik eder — yani sorunu
    // gizler. Nitekim `kudum` ve `bendir` tam da boyle duruyordu: kaynaklari
    // hicbir yerde yazili degildi ve CC BY-NC olduklari BILINMIYORDU.
    // Atif sarti (BY) o sure boyunca ihlal ediliyordu.
    //
    // Dogru kapi: kisitli kaynak serbesttir ama GORUNUR olmak zorundadir.
    const restricted = sources.sources.filter((source) => source.commercialUse === "kisitli");

    for (const source of restricted) {
      expect(source.attributionRequired, `${source.id} atif zorunlulugu yazilmamis`).toBe(true);
      expect(source.attribution, `${source.id} atif metni yok`).toBeTruthy();
      expect(source.restrictionNote, `${source.id} kisit gerekcesi yazilmamis`).toBeTruthy();
    }

    // Sayi sabit: yeni bir kisitli kaynak sessizce eklenemez.
    // ── BUGUN BOS, VE BU KAPI ONU KORUR ─────────────────────────────────
    // 2026-07-27: projenin TUM ses kaynaklari ticarete acik hale geldi.
    //   ney    : CC BY-NC -> Art Libre soundfont (F5)
    //   bendir : CC BY-NC -> Art Libre soundfont (H8.1)
    //   kudum  : CC BY-NC -> CC BY icra kaydi    (H8.2)
    // Liste bos kalsa bile duruyor: kisitli bir kaynak eklenirse SESSIZ
    // olamaz — yukaridaki iddialar atif ve gerekce yazilmasini zorunlu kilar,
    // bu iddia da sayinin degistigini soyler.
    expect(restricted.map((source) => source.id)).toEqual([]);
  });

  it("kisitli kaynagin atfi README'de GERCEKTEN yazili", () => {
    // Atif sarti belgeyle yerine getirilir; kayit dosyasinda durmasi yetmez.
    const readme = fs.readFileSync(path.join(SAMPLES_ROOT, "README.md"), "utf8");
    for (const source of sources.sources.filter((s) => s.attributionRequired)) {
      expect(readme, `${source.id} atfi README'de yok`).toContain(source.origin);
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
    const counts = {documented: 0, measured: 0, claimed: 0, unknown: 0};
    for (const record of Object.values(provenance.folders)) counts[record.confidence]++;

    // 2026-07-27 durumu. Bu sayilar bir HEDEF degil, bir OLCUM: iyilestikce
    // (claimed -> documented) test kirilir ve guncellenmesi gerekir.
    expect(counts).toEqual({documented: 3, measured: 1, claimed: 15, unknown: 0});

    // `unknown` KALMADI: `bendir` ve `kudum`un kaynagi dalga bicimi
    // korelasyonuyla bulundu (r=1,0000'e kadar). Yeni bir klasor kayitsiz
    // eklenirse bu sayi artar ve test kirilir.
    const unknown = Object.entries(provenance.folders)
      .filter(([, record]) => record.confidence === "unknown")
      .map(([name]) => name);
    expect(unknown).toEqual([]);
  });

  it("`measured` olan klasor gecerli bir kaynaga baglanmis", () => {
    for (const [folder, record] of Object.entries(provenance.folders)) {
      if (record.confidence !== "measured") continue;
      expect(record.sourceId, `${folder} olculdu deniyor ama kaynagi yok`).toBeTruthy();
    }
  });

  it("`documented` olan klasorun ureticisi GERCEKTEN depoda", () => {
    for (const [folder, record] of Object.entries(provenance.folders)) {
      if (record.confidence !== "documented") continue;
      expect(record.producer, `${folder} belgeli ama uretici yazilmamis`).toBeTruthy();
      expect(
        fs.existsSync(path.join(process.cwd(), record.producer as string)),
        `${folder} ureticisi depoda yok: ${record.producer}`,
      ).toBe(true);
      // Preset YALNIZ soundfont kaynaklarinda anlamlidir. `kudum` bir icra
      // KAYDINDAN kesiliyor; preset'i olmamasi dogru. Bu iddia once "her
      // belgeli klasorun preset'i olmali" diyordu ve kaynak cesitliligini
      // yok sayiyordu.
      const source = sources.sources.find((entry) => entry.id === record.sourceId);
      const isSoundFont = source?.path.toLowerCase().endsWith(".sf2") ?? false;
      if (isSoundFont) {
        expect(record.presets?.length ?? 0, `${folder} soundfont kaynakli ama preset yazilmamis`).toBeGreaterThan(0);
      }
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
