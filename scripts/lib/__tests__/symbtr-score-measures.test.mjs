import {existsSync} from "node:fs";
import path from "node:path";
import {describe, expect, it} from "vitest";
import {
  getSymbTrMeasureIndexSummary,
  getSymbTrMeasureIndexSummaryFromRaw,
} from "../symbtr-score-measures.mjs";

const HICAZKAR_CATALOG_ID = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";

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
      noteEventCount: 279,
      measureCount: 28,
      maxMeasureIndex: 28,
      missingMeasureIndexes: [],
    });
  });
});
