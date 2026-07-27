import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {ZERO_TICKS, ticksFromFraction} from "@/core/time/ticks";
import {decodeWindows1254} from "../encoding";
import {buildMeterMap, measureAt, meterToTicks, readMu2WrittenMeter} from "../meter-map";
import {SYMBTR_COLUMNS, readSymbtrRows} from "../rows";
import {buildUsulMap, readMu2UsulDeclarations, usulAt} from "../usul-map";
import {CORPUS_TIMEOUT_MS} from "./corpus-gate";

const FIXTURE_TXT = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "txt");
const FIXTURE_MU2 = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "mu2");
const CORPUS = path.join(process.cwd(), "symb", "SymbTr-3.0");

const HEADER = SYMBTR_COLUMNS.join("\t");

function line(values: Partial<Record<(typeof SYMBTR_COLUMNS)[number], string | number>>): string {
  return SYMBTR_COLUMNS.map((column) => String(values[column] ?? "")).join("\t");
}

function note(pay: number, payda: number): string {
  return line({Sira: 1, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: pay, Payda: payda});
}

describe("MeterMap (G2) — olcu izgarasi tahminle DEGIL, mertebeyle kurulur", () => {
  it("tek mertebeli eserde olcu numarasi yurunerek bulunur", () => {
    // 4/4 = 1 tam nota. Sekiz adet ceyreklik = iki tam olcu.
    const raw = [HEADER, ...Array.from({length: 8}, () => note(1, 4))].join("\n");
    const map = buildMeterMap(readSymbtrRows(raw).rows, {numerator: 4, denominator: 4});

    expect(map).not.toBeNull();
    if (!map) return;
    expect(map.segments).toHaveLength(1);
    expect(map.changeCount).toBe(0);
    expect(map.totalTicks).toBe(ticksFromFraction(2, 1));
    expect(map.segments[0].endsMidMeasure).toBe(false);

    expect(measureAt(map, ZERO_TICKS)?.measure).toBe(1);
    expect(measureAt(map, ticksFromFraction(3, 4)!)?.measure).toBe(1);
    expect(measureAt(map, ticksFromFraction(1, 1)!)?.measure).toBe(2); // tam bar cizgisi
    expect(measureAt(map, ticksFromFraction(7, 4)!)?.measure).toBe(2);
  });

  it("9/8 mertebede olcu ceyrekliklerden DEGIL mertebeden turer", () => {
    const map = buildMeterMap(readSymbtrRows([HEADER, note(1, 8)].join("\n")).rows, {numerator: 9, denominator: 8});

    expect(map?.segments[0].measureTicks).toBe(ticksFromFraction(9, 8));
    // 4/4 varsayimi olsaydi 9 adet 1/8 = 1,125 tam nota -> 2. olcu derdi.
    expect(measureAt(map!, ticksFromFraction(8, 8)!)?.measure).toBe(1);
    expect(measureAt(map!, ticksFromFraction(9, 8)!)?.measure).toBe(2);
  });

  it("eser ici mertebe degisimi yeni segment acar", () => {
    const raw = [
      HEADER,
      note(1, 1), // 4/4 birinci olcu
      line({Sira: 2, Kod: 51, Pay: 3, Payda: 4, LNS: 4}),
      note(3, 4), // 3/4 ikinci olcu
      note(3, 4), // 3/4 ucuncu olcu
    ].join("\n");
    const map = buildMeterMap(readSymbtrRows(raw).rows, {numerator: 4, denominator: 4});

    expect(map?.segments).toHaveLength(2);
    expect(map?.changeCount).toBe(1);
    expect(map?.segments[1].meter).toEqual({numerator: 3, denominator: 4});
    expect(map?.segments[1].startMeasure).toBe(2);
    expect(measureAt(map!, ticksFromFraction(1, 1)!)?.measure).toBe(2);
    expect(measureAt(map!, ticksFromFraction(7, 4)!)?.measure).toBe(3);
  });

  it("AYNI mertebenin tekrari segment ACMAZ (usul devri isaretcisi)", () => {
    // Korpusta sik: ayni 9/8 defalarca yazilir; bunlar mertebe degisimi degil.
    const raw = [
      HEADER,
      note(9, 8),
      line({Sira: 2, Kod: 51, Pay: 9, Payda: 8, LNS: 0, Bas: 114}),
      note(9, 8),
    ].join("\n");
    const map = buildMeterMap(readSymbtrRows(raw).rows, {numerator: 9, denominator: 8});

    expect(map?.segments).toHaveLength(1);
    expect(map?.changeCount).toBe(0);
  });

  it("mertebe ortasinda degisim GIZLENMEZ", () => {
    const raw = [
      HEADER,
      note(1, 2), // 4/4'un yarisi
      line({Sira: 2, Kod: 51, Pay: 3, Payda: 4}),
      note(3, 4),
    ].join("\n");
    const map = buildMeterMap(readSymbtrRows(raw).rows, {numerator: 4, denominator: 4});

    expect(map?.segments[0].endsMidMeasure).toBe(true);
    // Kismi olcu de bir olcu sayilir; sonraki segment 2'den baslar.
    expect(map?.segments[1].startMeasure).toBe(2);
  });

  it("MERTEBESIZ eserde izgara KURULMAZ — `null` doner (emniyet valfi)", () => {
    const rows = readSymbtrRows([HEADER, note(1, 4)].join("\n")).rows;

    expect(buildMeterMap(rows, {numerator: 1, denominator: 0})).toBeNull();
    expect(buildMeterMap(rows, {numerator: 0, denominator: 4})).toBeNull();
    // Tick eksenini bolmeyen payda da izgara kurmaz.
    expect(meterToTicks({numerator: 1, denominator: 11})).toBeNull();
  });

  it("kod-52 tempo isareti olcu izgarasini KAYDIRMAZ", () => {
    // G3 olcumu: kod-52 kanonik zamana katilirsa eserlerin yalniz %21'i tam
    // olcuye oturuyor; katilmazsa %75,8. Izgara KANONIK eksende yurunur.
    const raw = [HEADER, note(1, 1), line({Sira: 2, Kod: 52, Pay: 1, Payda: 8, LNS: 127}), note(1, 1)].join("\n");
    const map = buildMeterMap(readSymbtrRows(raw).rows, {numerator: 4, denominator: 4});

    expect(map?.totalTicks).toBe(ticksFromFraction(2, 1)); // 1/8 tempo satiri KATILMADI
    expect(map?.segments[0].endsMidMeasure).toBe(false);
    // Tempo satiri katilsaydi bu nota 3. olcuye kayardi.
    expect(measureAt(map!, ticksFromFraction(1, 1)!)?.measure).toBe(2);
  });
});

describe("readMu2WrittenMeter — baslangic mertebesi mu2 satir-1'de", () => {
  it("Pay/Payda okur", () => {
    expect(readMu2WrittenMeter("9\t8\tPay\tPayda\n")).toEqual({numerator: 9, denominator: 8});
    expect(readMu2WrittenMeter("4\t4\tPay\tPayda\r\n")).toEqual({numerator: 4, denominator: 4});
  });

  it("dejenere `1/0` mertebesiz demektir — `null`", () => {
    expect(readMu2WrittenMeter("1\t0\tPay\tPayda\n")).toBeNull();
    expect(readMu2WrittenMeter("")).toBeNull();
  });
});

describe("Windows-1254 cozucu — usul/makam adlari", () => {
  it("Turkce harfleri dogru cozer", () => {
    // Olculen ham baytlar: 41 F0 FD 72 61 6B 73 61 6B
    const bytes = Uint8Array.from([0x41, 0xf0, 0xfd, 0x72, 0x61, 0x6b, 0x73, 0x61, 0x6b]);

    expect(decodeWindows1254(bytes)).toBe("Ağıraksak");
    // latin1 okumasi bozuk sonuc verir — bu testin varlik sebebi.
    expect(Buffer.from(bytes).toString("latin1")).toBe("Aðýraksak");
  });

  it("cp1254'un cp1252'den ayrildigi alti nokta", () => {
    expect(decodeWindows1254(Uint8Array.from([0xd0, 0xdd, 0xde, 0xf0, 0xfd, 0xfe]))).toBe("ĞİŞğış");
  });

  it("ASCII degismez", () => {
    expect(decodeWindows1254("Duyek 8/8")).toBe("Duyek 8/8");
  });
});

describe("UsulMap (G2) — usul ADI mu2'den gelir", () => {
  it("acilis beyani + degisimler hizalanir", () => {
    const raw = [
      HEADER,
      note(9, 8),
      line({Sira: 2, Kod: 51, Pay: 6, Payda: 8, LNS: 87}),
      note(6, 8),
    ].join("\n");
    const mu2 = ["9\t8\tPay\tPayda", "51\t\t9\t8\t\t\t\tAksak", "51\t\t6\t8\t\t\t\tYürüksemâî"].join("\n");
    const map = buildUsulMap(readSymbtrRows(raw).rows, readMu2UsulDeclarations(mu2));

    expect(map.aligned).toBe(true);
    expect(map.segments).toHaveLength(2);
    expect(map.segments[0].name).toBe("Aksak");
    expect(map.segments[0].nameSource).toBe("mu2-aligned");
    expect(map.segments[1].name).toBe("Yürüksemâî");
    expect(map.segments[1].usulId).toBe(87);
    expect(map.segments[1].startTick).toBe(ticksFromFraction(9, 8));

    expect(usulAt(map, ZERO_TICKS)?.name).toBe("Aksak");
    expect(usulAt(map, ticksFromFraction(9, 8)!)?.name).toBe("Yürüksemâî");
  });

  it("sayilar tutmuyorsa ad UYDURULMAZ", () => {
    const raw = [HEADER, note(9, 8), line({Sira: 2, Kod: 51, Pay: 6, Payda: 8, LNS: 87})].join("\n");
    // mu2'de yalniz bir beyan var; +1 kurali tutmuyor.
    const map = buildUsulMap(readSymbtrRows(raw).rows, readMu2UsulDeclarations("9\t8\n51\t\t9\t8\t\t\t\tAksak"));

    expect(map.aligned).toBe(false);
    expect(map.segments.every((segment) => segment.nameSource === "unknown")).toBe(true);
    expect(map.segments.every((segment) => segment.name === null)).toBe(true);
  });
});

describe("FIXTURE'LAR — gercek eserlerde uctan uca", () => {
  const cases: Array<{txt: string; meter: {numerator: number; denominator: number}; usul: string}> = [
    {txt: "dilkeshaveran--seyir--duyek--1--erol_bingol", meter: {numerator: 8, denominator: 8}, usul: "Düyek"},
    {txt: "hicaz--turku--aksak--ote_yakaya--kutahya", meter: {numerator: 9, denominator: 8}, usul: "Aksak"},
    {txt: "yeni_cargah--pesrev--devrikebir----", meter: {numerator: 4, denominator: 4}, usul: "Devr-i Kebîr"},
  ];

  it.each(cases)("$txt — mertebe ve usul kaynaktan okunur", ({txt, meter, usul}) => {
    const mu2Raw = decodeWindows1254(fs.readFileSync(path.join(FIXTURE_MU2, `${txt}.mu2`)));
    const rows = readSymbtrRows(fs.readFileSync(path.join(FIXTURE_TXT, `${txt}.txt`), "utf8")).rows;

    expect(readMu2WrittenMeter(mu2Raw)).toEqual(meter);

    const usulMap = buildUsulMap(rows, readMu2UsulDeclarations(mu2Raw));
    expect(usulMap.segments[0].name).toBe(usul);

    const meterMap = buildMeterMap(rows, meter);
    expect(meterMap).not.toBeNull();
    expect(measureAt(meterMap!, ZERO_TICKS)?.measure).toBe(1);
  });

  it("devrikebir: usul 28 zamanli ama YAZILI mertebe 4/4 — iki eksen ayri", () => {
    const name = "yeni_cargah--pesrev--devrikebir----";
    const mu2Raw = decodeWindows1254(fs.readFileSync(path.join(FIXTURE_MU2, `${name}.mu2`)));
    const rows = readSymbtrRows(fs.readFileSync(path.join(FIXTURE_TXT, `${name}.txt`), "utf8")).rows;
    const meterMap = buildMeterMap(rows, readMu2WrittenMeter(mu2Raw)!);
    const usulMap = buildUsulMap(rows, readMu2UsulDeclarations(mu2Raw));

    // Yazili olcu 1 tam nota; usul adi devrikebir. Ikisi ayni sey DEGIL.
    expect(meterMap?.segments[0].measureTicks).toBe(ticksFromFraction(1, 1));
    expect(usulMap.segments[0].name).toBe("Devr-i Kebîr");
  });

  it("mertebesiz eser (`serbest`) izgara kurmaz", () => {
    const name = "saba--miraciye--serbest--pes_heman--nayi_osman_dede";
    const mu2Raw = decodeWindows1254(fs.readFileSync(path.join(FIXTURE_MU2, `${name}.mu2`)));
    const rows = readSymbtrRows(fs.readFileSync(path.join(FIXTURE_TXT, `${name}.txt`), "utf8")).rows;
    const meter = readMu2WrittenMeter(mu2Raw);

    expect(meter).toBeNull();
    expect(buildMeterMap(rows, {numerator: 1, denominator: 0})).toBeNull();
  });
});

describe("CANLI KORPUS", () => {
  const hasCorpus = fs.existsSync(CORPUS);

  it.skipIf(!hasCorpus)("mu2 usul beyanlari TXT kod-51 sayisiyla +1 kuraliyla hizalanir", () => {
    const txtDir = path.join(CORPUS, "txt");
    const mu2Dir = path.join(CORPUS, "mu2");
    let alignedCount = 0;
    let total = 0;
    const attachedNames = new Set<string>();
    const declaredNames = new Set<string>();

    for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
      const mu2Path = path.join(mu2Dir, file.replace(/\.txt$/, ".mu2"));
      if (!fs.existsSync(mu2Path)) continue;

      total++;
      const rows = readSymbtrRows(fs.readFileSync(path.join(txtDir, file), "utf8")).rows;
      const declarations = readMu2UsulDeclarations(decodeWindows1254(fs.readFileSync(mu2Path)));
      for (const declaration of declarations) if (declaration.name) declaredNames.add(declaration.name);

      const map = buildUsulMap(rows, declarations);
      if (map.aligned) alignedCount++;
      for (const segment of map.segments) if (segment.name) attachedNames.add(segment.name);
    }

    expect(total).toBeGreaterThan(2900);
    // Olculdu: 2814/3000 dosyada mu2 = txt + 1.
    expect(alignedCount).toBeGreaterThanOrEqual(2800);

    // Korpusun tasidigi usul adi sayisi — motor bugun HICBIRINI okumuyor.
    expect(declaredNames.size).toBeGreaterThanOrEqual(130);
    expect(declaredNames.has("Düyek")).toBe(true);
    expect(declaredNames.has("Aksak")).toBe(true);
    expect(declaredNames.has("Ağıraksak")).toBe(true);

    // Konuma BAGLANABILEN adlar daha az (122): hizalama tutmayan ~186 dosyada
    // ad UYDURULMUYOR. Fark bilincli ve gorunur.
    expect(attachedNames.size).toBeGreaterThanOrEqual(120);
    expect(attachedNames.size).toBeLessThan(declaredNames.size);
  }, CORPUS_TIMEOUT_MS);

  it.skipIf(!hasCorpus)("yazili mertebe okunabilen her eserde izgara kurulur", () => {
    const txtDir = path.join(CORPUS, "txt");
    const mu2Dir = path.join(CORPUS, "mu2");
    let withMeter = 0;
    let unmetered = 0;
    let built = 0;

    for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
      const mu2Path = path.join(mu2Dir, file.replace(/\.txt$/, ".mu2"));
      if (!fs.existsSync(mu2Path)) continue;

      const meter = readMu2WrittenMeter(decodeWindows1254(fs.readFileSync(mu2Path)));
      if (meter === null) {
        unmetered++;
        continue;
      }
      withMeter++;
      const rows = readSymbtrRows(fs.readFileSync(path.join(txtDir, file), "utf8")).rows;
      if (buildMeterMap(rows, meter) !== null) built++;
    }

    expect(withMeter).toBeGreaterThan(2900);
    expect(built).toBe(withMeter);
    // Mertebesiz eserler var ve GIZLENMIYOR.
    expect(unmetered).toBeGreaterThan(0);
  }, CORPUS_TIMEOUT_MS);
});
