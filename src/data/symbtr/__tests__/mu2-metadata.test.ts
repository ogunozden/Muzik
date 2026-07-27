import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {ticksFromFraction} from "@/core/time/ticks";
import {decodeWindows1254} from "../encoding";
import {MU2_METADATA_CODES, readMu2Metadata} from "../mu2-metadata";
import {SYMBTR_COLUMNS, readSymbtrRows} from "../rows";
import {buildTempoMap, readMu2TempoDeclarations, tempoAt} from "../tempo-map";

const FIXTURE_MU2 = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "mu2");
const FIXTURE_TXT = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "txt");
const CORPUS = path.join(process.cwd(), "symb", "SymbTr-3.0");

const HEADER = SYMBTR_COLUMNS.join("\t");

function line(values: Partial<Record<(typeof SYMBTR_COLUMNS)[number], string | number>>): string {
  return SYMBTR_COLUMNS.map((column) => String(values[column] ?? "")).join("\t");
}

function mu2Fixture(name: string): string {
  return decodeWindows1254(fs.readFileSync(path.join(FIXTURE_MU2, `${name}.mu2`)));
}

describe("readMu2Metadata (B3) — kunye artik okunuyor", () => {
  it("gercek eserde tum kunye alanlarini cozer", () => {
    const metadata = readMu2Metadata(mu2Fixture("yeni_cargah--pesrev--devrikebir----"));

    // Kunye adi dosya adindan FARKLI: dosya `yeni_cargah`, kunye `Çargâh(Yeni)`.
    // Bu tam olarak B3'un degeri — ad artik kaynaktan geliyor, dosya adindan degil.
    expect(metadata.makam).toBe("Çargâh(Yeni)");
    expect(metadata.usul).toBe("Devr-i Kebîr");
    expect(metadata.form).toBe("Peşrev");
    expect(metadata.genre).toBe("TSM");
    expect(metadata.title).not.toBeNull();
  });

  it("Turkce harfler DOGRU cozuluyor — latin1 bozardi", () => {
    const metadata = readMu2Metadata(mu2Fixture("hicaz--turku--aksak--ote_yakaya--kutahya"));

    expect(metadata.usul).toBe("Aksak");
    // Dosya adi aksansiz (`hicaz`), kunye ise tam.
    expect(metadata.makam).toMatch(/Hicaz/i);
    expect(metadata.genre).toBe("THM");
  });

  it("kod 51 birden fazla kez gecse de ACILIS beyani alinir", () => {
    const raw = [
      "9\t8\tPay\tPayda",
      "51\t\t9\t8\t\t\t\tAksak",
      "51\t\t6\t8\t\t\t\tYürüksemâî",
    ].join("\n");

    expect(readMu2Metadata(raw).usul).toBe("Aksak");
  });

  it("ANLAMI KANITLANMAYAN kodlar adlandirilmaz, ham tasinir", () => {
    const raw = ["9\t8\tPay\tPayda", "62\t\t\t\t\t\t\tH", "56\t\t\t\t\t\t\t"].join("\n");
    const metadata = readMu2Metadata(raw);

    expect(metadata.unknown.map((row) => row.code).sort()).toEqual([56, 62]);
    // `H`/`E` harflerinin neyi kisalttigi belgelenmemis — alan adi verilmedi.
    expect(Object.keys(metadata)).not.toContain("62");
    expect(metadata.unknown.find((row) => row.code === 62)?.columns[7]).toBe("H");
  });

  it("bos girdide her alan null — uydurma yok", () => {
    const metadata = readMu2Metadata("9\t8\tPay\tPayda\n");

    expect(metadata.makam).toBeNull();
    expect(metadata.usul).toBeNull();
    expect(metadata.composer).toBeNull();
    expect(metadata.unknown).toEqual([]);
  });

  it("kod haritasi olculen degerlerle sabit", () => {
    expect(MU2_METADATA_CODES).toEqual({
      makam: 50,
      usul: 51,
      tempo: 52,
      form: 57,
      composer: 58,
      lyricist: 59,
      title: 60,
      genre: 63,
    });
  });

  it("CANLI KORPUS: 3000/3000 dosyada kunye tam", () => {
    const mu2Dir = path.join(CORPUS, "mu2");
    if (!fs.existsSync(mu2Dir)) return;

    const files = fs.readdirSync(mu2Dir).filter((name) => name.endsWith(".mu2"));
    const makams = new Set<string>();
    const usuls = new Set<string>();
    let complete = 0;

    for (const file of files) {
      const metadata = readMu2Metadata(decodeWindows1254(fs.readFileSync(path.join(mu2Dir, file))));
      if (metadata.makam) makams.add(metadata.makam);
      if (metadata.usul) usuls.add(metadata.usul);
      if (metadata.makam && metadata.usul && metadata.form && metadata.composer && metadata.title && metadata.genre) {
        complete++;
      }
    }

    expect(files.length).toBe(3000);
    expect(complete).toBe(3000);
    // Olculdu: 163 makam adi. Motor bugun HICBIRINI okumuyordu.
    expect(makams.size).toBeGreaterThanOrEqual(160);
    // Usulde 124: bu ACILIS beyanlarinin kumesi. Korpusun TUM kod-51
    // satirlarinda 135 farkli ad var; aradaki 11'i yalniz eser ICI usul
    // degisimlerinde geciyor (bkz. `usul-map.ts`). Iki sayi ayri seyler.
    expect(usuls.size).toBeGreaterThanOrEqual(120);
    expect(makams.has("Acemaşîrân")).toBe(true);
  });
});

describe("buildTempoMap (B7) — kirpilmis BPM KESIN gibi sunulmaz", () => {
  it("`mu2` varsa BPM oradan gelir — kirpilma yok", () => {
    const raw = [
      HEADER,
      line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 4}),
      line({Sira: 2, Kod: 52, Pay: 1, Payda: 8, Ms: 0, LNS: 127, Bas: 41}),
    ].join("\n");
    const mu2 = ["9\t8\tPay\tPayda", "52\t\t1\t8\t168"].join("\n");

    const map = buildTempoMap(readSymbtrRows(raw).rows, readMu2TempoDeclarations(mu2));

    expect(map.aligned).toBe(true);
    expect(map.marks).toHaveLength(1);
    expect(map.marks[0].bpm).toBe(168); // TXT'de 127 goruyordu
    expect(map.marks[0].source).toBe("mu2");
    expect(map.marks[0].clipped).toBe(false);
    expect(map.marks[0].beatUnit).toEqual({numerator: 1, denominator: 8});
    expect(map.clippedCount).toBe(0);
  });

  it("`mu2` yoksa TXT degeri KIRPILMIS olarak isaretlenir", () => {
    const raw = [HEADER, line({Sira: 1, Kod: 52, Pay: 1, Payda: 8, LNS: 127, Bas: 41})].join("\n");
    const map = buildTempoMap(readSymbtrRows(raw).rows);

    expect(map.marks[0].bpm).toBe(127);
    expect(map.marks[0].source).toBe("symbtr-txt");
    expect(map.marks[0].clipped).toBe(true);
    expect(map.clippedCount).toBe(1);
    // `127 + Bas = 168` UYDURULMADI: kural korpusta %12,7 yaniliyor.
    expect(map.marks[0].bpm).not.toBe(168);
  });

  it("127 altindaki TXT degeri kirpilmamis sayilir", () => {
    const raw = [HEADER, line({Sira: 1, Kod: 52, Pay: 1, Payda: 4, LNS: 90})].join("\n");
    const map = buildTempoMap(readSymbtrRows(raw).rows);

    expect(map.marks[0].bpm).toBe(90);
    expect(map.marks[0].clipped).toBe(false);
  });

  it("hizalama tutmazsa mu2'ye GUVENILMEZ", () => {
    const raw = [
      HEADER,
      line({Sira: 1, Kod: 52, Pay: 1, Payda: 8, LNS: 100}),
      line({Sira: 2, Kod: 52, Pay: 1, Payda: 8, LNS: 110}),
    ].join("\n");
    // mu2'de tek beyan var, TXT'de iki isaret -> hizalama YOK.
    const map = buildTempoMap(readSymbtrRows(raw).rows, readMu2TempoDeclarations("9\t8\n52\t\t1\t8\t168"));

    expect(map.aligned).toBe(false);
    expect(map.marks.every((mark) => mark.source === "symbtr-txt")).toBe(true);
  });

  it("tempo isareti kanonik konumda dogru yerlesir", () => {
    const raw = [
      HEADER,
      line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 1}),
      line({Sira: 2, Kod: 52, Pay: 1, Payda: 8, LNS: 90}),
      line({Sira: 3, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: 1, Payda: 1}),
    ].join("\n");
    const map = buildTempoMap(readSymbtrRows(raw).rows);

    // Tempo isareti kanonik zamani ilerletmedigi icin ilk notanin BITISINDE.
    expect(map.marks[0].startTick).toBe(ticksFromFraction(1, 1));
    expect(tempoAt(map, ticksFromFraction(1, 2)!)).toBeNull();
    expect(tempoAt(map, ticksFromFraction(3, 2)!)?.bpm).toBe(90);
  });

  it("CANLI KORPUS: mu2 tempolari kirpilmamis, TXT'ninki kirpik", () => {
    const txtDir = path.join(CORPUS, "txt");
    const mu2Dir = path.join(CORPUS, "mu2");
    if (!fs.existsSync(txtDir)) return;

    let mu2Sourced = 0;
    let txtClipped = 0;
    let aboveClipFromMu2 = 0;

    for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
      const mu2Path = path.join(mu2Dir, file.replace(/\.txt$/, ".mu2"));
      if (!fs.existsSync(mu2Path)) continue;

      const rows = readSymbtrRows(fs.readFileSync(path.join(txtDir, file), "utf8")).rows;
      const declarations = readMu2TempoDeclarations(decodeWindows1254(fs.readFileSync(mu2Path)));
      const map = buildTempoMap(rows, declarations);

      for (const mark of map.marks) {
        if (mark.source === "mu2") {
          mu2Sourced++;
          if ((mark.bpm ?? 0) > 127) aboveClipFromMu2++;
        }
        if (mark.clipped) txtClipped++;
      }
    }

    expect(mu2Sourced).toBeGreaterThan(1500);
    // KANIT: mu2, TXT'nin 7-bit sinirini asan tempolari tasiyor.
    expect(aboveClipFromMu2).toBeGreaterThan(0);

    // mu2 yolu BASKIN olmali: olculdu — 2.121 isaret mu2'den, 427'si TXT
    // yedeginden geliyor ve bunlarin 174'u kirpik. Yani belirsiz deger
    // azinlikta ve `clipped` ile ISARETLI; kesin gibi sunulmuyor.
    expect(mu2Sourced).toBeGreaterThan(txtClipped * 5);
    expect(txtClipped).toBeGreaterThan(0);
  });
});

describe("fixture'lar — kunye ve tempo birlikte", () => {
  const names = fs.readdirSync(FIXTURE_TXT).filter((file) => file.endsWith(".txt")).map((file) => file.replace(/\.txt$/, ""));

  it.each(names)("%s — kunye okunabiliyor", (name) => {
    const metadata = readMu2Metadata(mu2Fixture(name));

    expect(metadata.makam).not.toBeNull();
    expect(metadata.usul).not.toBeNull();
    expect(metadata.genre).toMatch(/^(TSM|THM)$/);
  });
});
