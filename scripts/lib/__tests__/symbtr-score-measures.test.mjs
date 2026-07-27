import {existsSync, readFileSync, readdirSync} from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {TICKS_PER_WHOLE} from "@/core/time/ticks";
import {decodeWindows1254} from "@/data/symbtr/encoding";
import {CURRENT_MEASURE_INDEX_BASIS} from "@/data/symbtr/layout";
import {readMu2WrittenMeter} from "@/data/symbtr/meter-map";
import {parseSymbtrScore} from "@/data/symbtr/parser";
import {
  CURRENT_MEASURE_INDEX_BASIS as SCRIPT_BASIS,
  TICKS_PER_WHOLE as SCRIPT_TICKS_PER_WHOLE,
  getSymbTrMeasureIndexSummary,
  getSymbTrMeasureIndexSummaryFromRaw,
  readMu2WrittenMeter as scriptReadMu2WrittenMeter,
} from "../symbtr-score-measures.mjs";

const HICAZKAR_CATALOG_ID = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";
const FIXTURE_TXT = path.join(process.cwd(), "src", "data", "score-engine", "__tests__", "fixtures", "symbtr", "txt");
const FIXTURE_MU2 = path.join(process.cwd(), "src", "data", "score-engine", "__tests__", "fixtures", "symbtr", "mu2");

describe("SymbTr score measure index summaries", () => {
  it("derives contiguous measure indexes from SymbTr offset units", () => {
    const rawText = [
      "Sira\tKod\tNota53\tNotaAE\tKoma53\tKomaAE\tPay\tPayda\tMs\tLNS\tBas\tSoz1\tOffset",
      "1\t9\tDo5\tC5\t318\t318\t1\t4\t833\t95\t96\tA\t0.25",
      "2\t9\tRe5\tD5\t327\t327\t1\t4\t833\t95\t96\t\t1",
      "3\t9\tMi5\tE5\t340\t340\t1\t4\t833\t95\t96\t\t1.25",
      "4\t9\tFa5\tF5\t344\t344\t1\t4\t833\t95\t96\t\t2",
    ].join("\n");

    expect(
      getSymbTrMeasureIndexSummaryFromRaw({
        catalogId: "fixture",
        rawText,
      }),
    ).toMatchObject({
      catalogId: "fixture",
      noteEventCount: 4,
      measureIndexes: [1, 2],
      measureCount: 2,
      maxMeasureIndex: 2,
      missingMeasureIndexes: [],
    });
  });

  it("reports the Hicazkar reference score measure indexes from the local SymbTr archive", () => {
    const txtZip = path.join(process.cwd(), "symb", "txt_v3.zip");
    if (!existsSync(txtZip)) return; // skip in CI (symb/ is gitignored)
    const summary = getSymbTrMeasureIndexSummary({
      catalogId: HICAZKAR_CATALOG_ID,
      txtZipPath: path.join(process.cwd(), "symb", "txt_v3.zip"),
    });

    expect(summary).toMatchObject({
      catalogId: HICAZKAR_CATALOG_ID,
      sourceArchiveMemberPath: `txt_v3/${HICAZKAR_CATALOG_ID}.txt`,
      // Yazili mertebe `mu2_v3.zip`ten okunuyor -> yurunmus izgara.
      measureIndexBasis: "meter-walk-v2",
      noteEventCount: 279,
      measureCount: 28,
      maxMeasureIndex: 28,
      missingMeasureIndexes: [],
    });
  });
});

/**
 * TS ile `.mjs` ARASINDA KAYMA OLAMAZ (PLAN §3/G6).
 *
 * Projede TS runner yok (`tsx`/`ts-node`/`jiti` kurulu degil), bu yuzden
 * uretim betikleri olcu yurumesini `.mjs` icinde tekrar uygulamak zorunda.
 * Kopya kacinilmaz; SESSIZ AYRISMA degil. Bu blok iki uygulamayi ayni
 * girdilerle kosturup sonuclarin BIREBIR ayni oldugunu dogrular.
 */
describe("TS <-> .mjs esdegerligi", () => {
  it("sabitler ayni", () => {
    expect(SCRIPT_BASIS).toBe(CURRENT_MEASURE_INDEX_BASIS);
    expect(SCRIPT_TICKS_PER_WHOLE).toBe(TICKS_PER_WHOLE);
  });

  it("`mu2` mertebe okuyucusu ayni sonucu verir", () => {
    for (const raw of ["9\t8\tPay\tPayda\n", "4\t4\tPay\tPayda\n", "1\t0\tPay\tPayda\n", ""]) {
      expect(scriptReadMu2WrittenMeter(raw)).toEqual(readMu2WrittenMeter(raw));
    }
  });

  const fixtures = readdirSync(FIXTURE_TXT).filter((file) => file.endsWith(".txt")).sort();

  it.each(fixtures)("%s — iki uygulama AYNI olcu kumesini uretir", (file) => {
    const name = file.replace(/\.txt$/, "");
    const rawText = readFileSync(path.join(FIXTURE_TXT, file), "utf8");
    const writtenMeter = readMu2WrittenMeter(decodeWindows1254(readFileSync(path.join(FIXTURE_MU2, `${name}.mu2`))));

    const script = getSymbTrMeasureIndexSummaryFromRaw({catalogId: name, rawText, writtenMeter});
    const events = parseSymbtrScore(rawText, 60, 0, {writtenMeter});
    const typescript = [...new Set(events.map((event) => event.measureIndex).filter((value) => value !== null))].sort(
      (left, right) => left - right,
    );

    expect(script.measureIndexes).toEqual(typescript);
    expect(script.measureIndexBasis).toBe(writtenMeter ? "meter-walk-v2" : "offset-ceil-v1");
    expect(events[0]?.measureIndexBasis).toBe(script.measureIndexBasis);

    // `noteEventCount` yalniz YURUNMUS yolda karsilastirilabilir: eski
    // `offset-ceil-v1` yolu `Offset > 0` sarti aradigi icin, Offset sutunu
    // donmus mertebesiz eserlerde 0 sayar. Bu fark v1'in kendi ozelligi.
    if (writtenMeter) expect(script.noteEventCount).toBe(events.length);
  });

  it("mertebesiz eserde IKISI DE tahmine duser ve bunu bildirir", () => {
    const name = "saba--miraciye--serbest--pes_heman--nayi_osman_dede";
    const rawText = readFileSync(path.join(FIXTURE_TXT, `${name}.txt`), "utf8");
    const writtenMeter = readMu2WrittenMeter(decodeWindows1254(readFileSync(path.join(FIXTURE_MU2, `${name}.mu2`))));

    expect(writtenMeter).toBeNull();
    const script = getSymbTrMeasureIndexSummaryFromRaw({catalogId: name, rawText, writtenMeter});
    const events = parseSymbtrScore(rawText, 60, 0, {writtenMeter});

    expect(script.measureIndexBasis).toBe("offset-ceil-v1");
    expect(events[0].measureIndexBasis).toBe("offset-ceil-v1");
  });
});
