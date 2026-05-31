import path from "node:path";
import {readZipEntry} from "./zip-entry-reader.mjs";

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
