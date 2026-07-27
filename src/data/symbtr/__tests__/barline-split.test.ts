import fs from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {getTupletContext} from "@/data/score-engine/notation";
import {splitEventsAtBarlines} from "../barline-split";
import {decodeWindows1254} from "../encoding";
import {readMu2WrittenMeter} from "../meter-map";
import {parseSymbtrScore} from "../parser";
import {SYMBTR_COLUMNS} from "../rows";
import {CORPUS_TIMEOUT_MS} from "./corpus-gate";

const FIXTURE_TXT = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "txt");
const FIXTURE_MU2 = path.join(__dirname, "..", "..", "score-engine", "__tests__", "fixtures", "symbtr", "mu2");
const CORPUS = path.join(process.cwd(), "symb", "SymbTr-3.0");

const HEADER = SYMBTR_COLUMNS.join("\t");

function line(values: Partial<Record<(typeof SYMBTR_COLUMNS)[number], string | number>>): string {
  return SYMBTR_COLUMNS.map((column) => String(values[column] ?? "")).join("\t");
}

function note(pay: number, payda: number, sira: number): string {
  return line({Sira: sira, Kod: 9, Nota53: "Do5", NotaAE: "C5", Koma53: 318, Pay: pay, Payda: payda});
}

function split(raw: string, meter: {numerator: number; denominator: number} | null) {
  const events = parseSymbtrScore(raw, 60, 0, {writtenMeter: meter});
  return {before: events, ...splitEventsAtBarlines(events, raw, meter)};
}

describe("splitEventsAtBarlines (G7)", () => {
  it("bar cizgisini asan nota IKIYE bolunur ve bagla isaretlenir", () => {
    // 4/4 = 1 tam nota. Once 3/4, sonra 1/2: ikincisi bar cizgisini asar.
    const raw = [HEADER, note(3, 4, 1), note(1, 2, 2)].join("\n");
    const result = split(raw, {numerator: 4, denominator: 4});

    expect(result.splitCount).toBe(1);
    expect(result.addedPartCount).toBe(1);
    expect(result.events).toHaveLength(3);

    const [first, partA, partB] = result.events;
    expect(first.barlineTie).toBeNull();
    expect(partA.barlineTie).toBe("start");
    expect(partB.barlineTie).toBe("stop");

    // Ilk parca olcuyu TAMAMLAR (1/4), ikincisi sonraki olcuye tasar (1/4).
    expect(partA.durationFraction).toEqual({numerator: 1, denominator: 4});
    expect(partB.durationFraction).toEqual({numerator: 1, denominator: 4});
    expect(partA.measureIndex).toBe(1);
    expect(partB.measureIndex).toBe(2);
  });

  it("SURE TOPLAMI korunur — bolme sure yaratmaz/yok etmez", () => {
    const raw = [HEADER, note(3, 4, 1), note(1, 2, 2), note(7, 8, 3)].join("\n");
    const result = split(raw, {numerator: 4, denominator: 4});

    const before = result.before.reduce((total, event) => total + event.durationBeats, 0);
    const after = result.events.reduce((total, event) => total + event.durationBeats, 0);

    expect(after).toBeCloseTo(before, 9);
  });

  it("iki olcuden fazlasini asan nota UCE bolunur (`continue`)", () => {
    // 1/4'luk mertebede 3/4'luk nota uc olcuye yayilir.
    const raw = [HEADER, note(3, 4, 1)].join("\n");
    const result = split(raw, {numerator: 1, denominator: 4});

    expect(result.events).toHaveLength(3);
    expect(result.events.map((event) => event.barlineTie)).toEqual(["start", "continue", "stop"]);
    expect(result.events.map((event) => event.measureIndex)).toEqual([1, 2, 3]);
  });

  it("bar cizgisinde TAM biten nota BOLUNMEZ", () => {
    const raw = [HEADER, note(1, 1, 1), note(1, 1, 2)].join("\n");
    const result = split(raw, {numerator: 4, denominator: 4});

    expect(result.splitCount).toBe(0);
    expect(result.events).toHaveLength(2);
    expect(result.events.every((event) => event.barlineTie === null)).toBe(true);
  });

  it("MERTEBESIZ eserde olaylar DOKUNULMADAN doner", () => {
    const raw = [HEADER, note(3, 4, 1), note(1, 2, 2)].join("\n");
    const result = split(raw, null);

    expect(result.splitCount).toBe(0);
    expect(result.events).toEqual(result.before);
  });

  it("eser ici mertebe degisimi bolme noktasini KAYDIRIR", () => {
    const raw = [
      HEADER,
      note(1, 1, 1), // 4/4 birinci olcu tam
      line({Sira: 2, Kod: 51, Pay: 1, Payda: 4}), // artik olcu = 1/4
      note(1, 2, 3), // 1/2 nota -> 1/4 + 1/4 olarak iki olcuye
    ].join("\n");
    const result = split(raw, {numerator: 4, denominator: 4});

    expect(result.splitCount).toBe(1);
    const parts = result.events.filter((event) => event.barlineTie !== null);
    expect(parts).toHaveLength(2);
    expect(parts[0].durationFraction).toEqual({numerator: 1, denominator: 4});
    expect(parts[1].durationFraction).toEqual({numerator: 1, denominator: 4});
  });
});

describe("FIXTURE'LAR — gercek eserlerde", () => {
  const files = fs.readdirSync(FIXTURE_TXT).filter((file) => file.endsWith(".txt")).sort();

  it.each(files)("%s — sure ve nota kimligi korunur", (file) => {
    const name = file.replace(/\.txt$/, "");
    const raw = fs.readFileSync(path.join(FIXTURE_TXT, file), "utf8");
    const meter = readMu2WrittenMeter(decodeWindows1254(fs.readFileSync(path.join(FIXTURE_MU2, `${name}.mu2`))));
    const result = split(raw, meter);

    // KAPI: toplam sure DEGISMEZ.
    const before = result.before.reduce((total, event) => total + event.durationBeats, 0);
    const after = result.events.reduce((total, event) => total + event.durationBeats, 0);
    expect(after).toBeCloseTo(before, 6);

    // KAPI: CALINAN nota sayisi degismez — bagli parcalar tek nota sayilir.
    const soundedAfter = result.events.filter((event) => event.barlineTie === null || event.barlineTie === "start");
    expect(soundedAfter).toHaveLength(result.before.length);

    // Parca sayisi = orijinal + eklenen.
    expect(result.events.length).toBe(result.before.length + result.addedPartCount);
  });
});

describe("KAPI — canli korpus (PLAN §3/G7)", () => {
  const hasCorpus = fs.existsSync(CORPUS);

  it.skipIf(!hasCorpus)("olcu doluluğu artar, toplam sure DEGISMEZ", () => {
    const txtDir = path.join(CORPUS, "txt");
    const mu2Dir = path.join(CORPUS, "mu2");

    let pieces = 0;
    let splitNotes = 0;
    let totalNotes = 0;
    let durationMismatch = 0;
    let soundedMismatch = 0;

    for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
      const mu2Path = path.join(mu2Dir, file.replace(/\.txt$/, ".mu2"));
      if (!fs.existsSync(mu2Path)) continue;

      const meter = readMu2WrittenMeter(decodeWindows1254(fs.readFileSync(mu2Path)));
      if (meter === null) continue;

      const raw = fs.readFileSync(path.join(txtDir, file), "utf8");
      const events = parseSymbtrScore(raw, 60, 0, {writtenMeter: meter});
      const result = splitEventsAtBarlines(events, raw, meter);

      pieces++;
      totalNotes += events.length;
      splitNotes += result.splitCount;

      const before = events.reduce((total, event) => total + event.durationBeats, 0);
      const after = result.events.reduce((total, event) => total + event.durationBeats, 0);
      if (Math.abs(after - before) > 1e-6) durationMismatch++;

      const sounded = result.events.filter((event) => event.barlineTie === null || event.barlineTie === "start");
      if (sounded.length !== events.length) soundedMismatch++;
    }

    expect(pieces).toBe(2999);

    // KAPI 1: hicbir eserde toplam sure degismedi.
    expect(durationMismatch).toBe(0);
    // KAPI 2: hicbir eserde CALINAN nota sayisi degismedi.
    expect(soundedMismatch).toBe(0);

    // KAPI 3: bolunen nota sayisi, BAGIMSIZ olculen bar-asan nota sayisiyla
    // BIREBIR ayni. (G4 tanimi: `measureAt(baslangic) !== measureAt(bitis-1)`.
    // Bu, bolme algoritmasindan tamamen farkli bir yoldan hesaplanir.)
    //
    // Bu esitlik bir hata YAKALADI: konum once olaylarin surelerinden
    // toplaniyordu, ama `parseSymbtrScore` yalniz kod-9 uretiyor. Korpustaki
    // 31.605 sureli kod-9-disi satir atlandigi icin ilk boyle satirdan sonraki
    // TUM bar cizgileri kayiyordu ve bolunen nota %2,07 cikiyordu.
    // 5.984 (ilk hal) -> 5.961 (C4: triole kaynagi bolunmuyor)
    //               -> 5.773 (C4.1: sahte triole ureten bolme de yapilmiyor)
    //               -> 5.802 (G9: olay akisi kod-9 disi sureli satirlari da
    //                         iceriyor, dolayisiyla bar asan nota da arti)
    expect(splitNotes).toBe(5802);
    expect(splitNotes / totalNotes).toBeCloseTo(0.0049, 4);
    // G9: olay akisi 1.163.593 -> 1.192.643 (kod-9 disi sureli satirlar
    // artik akista; +29.050 olay).
    expect(totalNotes).toBe(1_192_643);
  }, CORPUS_TIMEOUT_MS);

  it.skipIf(!hasCorpus)("TRIOLE notasi bar cizgisinde BOLUNMEZ (C4)", () => {
    const txtDir = path.join(CORPUS, "txt");
    const mu2Dir = path.join(CORPUS, "mu2");
    let splitSourceTuplets = 0;
    let tupletShapedFragments = 0;

    for (const file of fs.readdirSync(txtDir).filter((name) => name.endsWith(".txt"))) {
      const mu2Path = path.join(mu2Dir, file.replace(/\.txt$/, ".mu2"));
      if (!fs.existsSync(mu2Path)) continue;
      const meter = readMu2WrittenMeter(decodeWindows1254(fs.readFileSync(mu2Path)));
      if (meter === null) continue;

      const raw = fs.readFileSync(path.join(txtDir, file), "utf8");
      const events = parseSymbtrScore(raw, 60, 0, {writtenMeter: meter});
      const result = splitEventsAtBarlines(events, raw, meter);

      // Bolunen ORIJINAL notalari bul.
      const splitSources = new Set(
        result.events.filter((part) => part.barlineTie === "start").map((part) => part.index),
      );
      for (const original of events) {
        if (splitSources.has(original.index) && getTupletContext(original.durationFraction)) splitSourceTuplets++;
      }

      for (const part of result.events) {
        if (part.barlineTie !== null && getTupletContext(part.durationFraction)) tupletShapedFragments++;
      }
    }

    // KAPI: KAYNAGI triole olan nota artik HIC bolunmuyor.
    // Once 23 taneydi; parcalari triole sisteminin disina dusuyordu.
    expect(splitSourceTuplets).toBe(0);

    // C4.1: triole OLMAYAN bir nota bolununce parcasi triole SEKLINDE bir
    // kesre denk gelebiliyordu (orn. 12/8'de 1/12) ve cizimde SAHTE TRIOLE
    // gorunuyordu. Olculmustu: 376 parca. Artik boyle bir bolme yapilmiyor.
    expect(tupletShapedFragments).toBe(0);
  }, CORPUS_TIMEOUT_MS);
});
