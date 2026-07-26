import path from "node:path";
import {readZipEntry} from "./zip-entry-reader.mjs";

/**
 * OLCU NUMARASI TABANI (PLAN.md §3/G5).
 *
 * Dogrulanmis PDF olcu kutulari, olcu numarasinin NASIL hesaplandigina
 * bagimlidir. Taban degisirse 18.334 kutunun bir kismi baska olcuye isaret
 * eder. Bu sabit, kutularin hangi tabana gore dogrulandigini KAYDEDER; taban
 * degistiginde `isVerificationCurrent` eski kayitlari bayatlamis sayar ve
 * kutular **gorunur sekilde** dusher. Sessiz kayma yerine gorunur kayip.
 *
 *   offset-ceil-v1 — `Math.ceil(Offset)`; SymbTr `Offset` sutunundan turetilir.
 *                    G4 olcumu: tempo isareti olmayan eserlerde %98,58 dogru,
 *                    olanlarda %83,56 (kod-52'nin hayalet suresi `Offset`
 *                    eksenini kaydiriyor).
 *   meter-walk-v2  — `MeterMap` KANONIK eksende yurunerek bulunur (G6 hedefi).
 *
 * `src/data/symbtr/layout.ts` ayni sabiti tanimlar; `layout.test.ts` ikisinin
 * esitligini test eder — TS ile `.mjs` arasinda kayma olamaz.
 */
export const MEASURE_INDEX_BASES = ["offset-ceil-v1", "meter-walk-v2"];
export const CURRENT_MEASURE_INDEX_BASIS = "offset-ceil-v1";

export function getSymbTrTxtArchiveMemberPath(catalogId) {
  return `txt_v3/${catalogId}.txt`;
}

export function getSymbTrMeasureIndexSummaryFromRaw({
  catalogId,
  rawText,
  sourceArchiveMemberPath = getSymbTrTxtArchiveMemberPath(catalogId),
}) {
  const measureIndexes = new Set();
  let noteEventCount = 0;

  for (const line of rawText.split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;

    const columns = line.split("\t");
    if (columns.length < 13 || columns[1] !== "9") continue;

    const offsetUnits = Number(columns[12]);
    if (!Number.isFinite(offsetUnits) || offsetUnits <= 0) continue;

    noteEventCount += 1;
    measureIndexes.add(Math.max(1, Math.ceil(offsetUnits)));
  }

  const sortedMeasureIndexes = Array.from(measureIndexes).sort((left, right) => left - right);
  const maxMeasureIndex = sortedMeasureIndexes.at(-1) ?? 0;
  const missingMeasureIndexes = Array.from({length: maxMeasureIndex}, (_, index) => index + 1).filter(
    (measureIndex) => !measureIndexes.has(measureIndex),
  );

  return {
    catalogId,
    sourceArchiveMemberPath,
    noteEventCount,
    measureIndexes: sortedMeasureIndexes,
    measureCount: sortedMeasureIndexes.length,
    maxMeasureIndex,
    missingMeasureIndexes,
  };
}

export function getSymbTrMeasureIndexSummary({
  catalogId,
  txtZipPath = path.join(process.cwd(), "symb", "txt_v3.zip"),
}) {
  const sourceArchiveMemberPath = getSymbTrTxtArchiveMemberPath(catalogId);
  const rawBuffer = readZipEntry(txtZipPath, sourceArchiveMemberPath);

  // SymbTr v3 text files can be Windows/Turkish encoded. Offset columns are
  // ASCII, so latin1 decoding preserves tabs, line breaks and numeric fields.
  return getSymbTrMeasureIndexSummaryFromRaw({
    catalogId,
    rawText: rawBuffer.toString("latin1"),
    sourceArchiveMemberPath,
  });
}
