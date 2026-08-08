#!/usr/bin/env node
/**
 * PDF metin katmanindan nota basi anchor'lari cikarir (W4.1 P1).
 * Salt-okunur analiz: `output/symbtr-layout-review/note-anchors.generated.json`
 * yazar; layout/verification manifestine DOKUNMAZ. Tesisatci:
 * `npm run extract:symbtr-note-anchors`.
 */

import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  parseCliOptions,
  readPdfContentStreams,
  readZipArchive,
  readZipEntry,
  parseLineSegments,
  uniqueStaffLines,
  groupStaffRows,
  percentage,
} from "./extract-symbtr-pdf-measures.mjs";
import {
  calibrateRowsSequential,
  countWrittenEventsFromMusicXml,
  extractNoteAnchors,
  parseFontWidths,
} from "./lib/symbtr-pdf-note-anchor.mjs";

const ROOT = process.cwd();
const PDF_ZIP_PATH = path.join(ROOT, "symb", "pdf_v3.zip");
const DEFAULT_OUT_PATH = path.join(ROOT, "output", "symbtr-layout-review", "note-anchors.generated.json");

const pdfArchive = readZipArchive(PDF_ZIP_PATH);
const pdfEntriesByCatalogId = new Map(
  pdfArchive.entries
    .filter((entry) => entry.fullName.toLowerCase().endsWith(".pdf"))
    .map((entry) => [path.basename(entry.fullName).replace(/\.pdf$/i, ""), entry]),
);

function extractNoteAnchorEntry(catalogId, {minRatio}) {
  const pdfEntry = pdfEntriesByCatalogId.get(catalogId);
  if (!pdfEntry) throw new Error(`PDF entry not found: ${catalogId}`);
  const pdfBuffer = readZipEntry(pdfArchive, pdfEntry.fullName);
  const pdfText = pdfBuffer.toString("latin1");
  const pageSizeMatch = pdfText.match(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/);
  const pageSize = {width: Number(pageSizeMatch?.[1] ?? 595.22), height: Number(pageSizeMatch?.[2] ?? 842)};
  const objects = new Map();
  const objectPattern = /(\d+) 0 obj([\s\S]*?)endobj/g;
  let objectMatch;
  while ((objectMatch = objectPattern.exec(pdfText))) objects.set(Number(objectMatch[1]), objectMatch[2]);
  const pageBody = [...objects.values()].find((body) => /\/Type\s*\/Page\b/.test(body));
  const resourcesRef = pageBody?.match(/\/Resources\s+(\d+) 0 R/)?.[1];
  const fontWidths = parseFontWidths(objects, resourcesRef ? objects.get(Number(resourcesRef)) : null);
  const content = readPdfContentStreams(pdfBuffer).join("\n");
  const segments = parseLineSegments(content);
  const staffRows = groupStaffRows(uniqueStaffLines(segments));
  if (staffRows.length === 0) {
    return {catalogId, status: "no-staff-rows", staffRowCount: 0, anchorCount: 0, eventCount: 0, ratio: null};
  }

  const anchors = extractNoteAnchors({content, staffRows, pageSize, fontWidths});
  const xmlPath = path.join(ROOT, "symb", "SymbTr-3.0", "MusicXML", `${catalogId}.xml`);
  const written = existsSync(xmlPath)
    ? countWrittenEventsFromMusicXml(readFileSync(xmlPath, "utf8"))
    : {writtenEvents: [], measureStarts: [], writtenMeasureCount: 0, totalBeats: 0};

  const overallRatio = written.writtenEvents.length > 0 ? anchors.length / written.writtenEvents.length : null;
  const matched = calibrateRowsSequential({anchors, writtenEvents: written.writtenEvents, staffRows});
  const calibrations = matched.results
    .filter((item) => item.reason === "calibrated")
    .map((item) => ({rowIndex: item.rowIndex, pairs: item.pairs, medianResidual: item.medianResidual}));
  const calibratedRowCount = calibrations.length;
  const status =
    overallRatio !== null && (overallRatio < 0.7 || overallRatio > 1.35)
      ? "count-mismatch"
      : calibratedRowCount / staffRows.length >= 0.5
        ? "calibrated"
        : "weak";

  const entry = {
    catalogId,
    status,
    staffRowCount: staffRows.length,
    anchorCount: anchors.length,
    eventCount: written.writtenEvents.length,
    overallRatio: overallRatio !== null ? Number(overallRatio.toFixed(3)) : null,
    writtenMeasureCount: written.writtenMeasureCount,
    calibratedRowCount,
    outlierCount: matched.results.reduce((sum, item) => sum + item.dropped, 0),
    medianResiduals: matched.results.filter((item) => item.medianResidual !== null).map((item) => item.medianResidual),
    minRatio,
    staffRows: staffRows.map((row) => ({
      rowIndex: row.rowIndex,
      leftPercent: percentage(row.left, pageSize.width),
      topPercent: percentage(pageSize.height - row.top, pageSize.height),
      widthPercent: percentage(row.right - row.left, pageSize.width),
    })),
    anchorsByRow: staffRows.map((row) => ({
      rowIndex: row.rowIndex,
      anchors: anchors
        .filter((anchor) => anchor.rowIndex === row.rowIndex)
        .map((anchor) => ({x: anchor.x, xPercent: anchor.xPercent, glyphs: anchor.glyphs})),
    })),
    calibrations,
  };
  return entry;
}

function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const minRatio = Math.max(0.5, Math.min(1, Number(options.get("min-ratio") ?? 0.6)));
  const requestedCatalogIds = options.has("all")
    ? Array.from(pdfEntriesByCatalogId.keys()).sort()
    : [options.get("catalog-id") ?? "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey"];
  const limit = Number.isInteger(Number(options.get("limit"))) && Number(options.get("limit")) > 0
    ? Number(options.get("limit"))
    : requestedCatalogIds.length;
  const catalogIds = requestedCatalogIds.slice(0, limit);
  const entries = [];
  const failures = [];

  for (const catalogId of catalogIds) {
    try {
      entries.push(extractNoteAnchorEntry(catalogId, {minRatio}));
    } catch (error) {
      failures.push({catalogId, error: error instanceof Error ? error.message : String(error)});
    }
  }

  const byStatus = {};
  for (const entry of entries) byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
  const calibratedEntries = entries.filter((entry) => entry.status === "calibrated");
  const ratioDistribution = {
    under0_8: calibratedEntries.filter((entry) => entry.overallRatio !== null && entry.overallRatio < 0.8).length,
    between0_8and1_2: calibratedEntries.filter((entry) => entry.overallRatio !== null && entry.overallRatio >= 0.8 && entry.overallRatio <= 1.2).length,
    over1_2: calibratedEntries.filter((entry) => entry.overallRatio !== null && entry.overallRatio > 1.2).length,
  };
  const summary = {
    generatedAt: new Date().toISOString(),
    scope: catalogIds.length,
    extractedEntryCount: entries.length,
    failureCount: failures.length,
    failures,
    byStatus,
    calibratedEntryCount: calibratedEntries.length,
    calibratedRowRatioDistribution: ratioDistribution,
    sampleEntries: entries.slice(0, 5).map((entry) => ({
      catalogId: entry.catalogId,
      status: entry.status,
      staffRowCount: entry.staffRowCount,
      anchorCount: entry.anchorCount,
      eventCount: entry.eventCount,
      overallRatio: entry.overallRatio,
      calibratedRowCount: entry.calibratedRowCount,
    })),
  };

  const outputPath = options.get("out") ? path.resolve(ROOT, options.get("out")) : DEFAULT_OUT_PATH;
  mkdirSync(path.dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, `${JSON.stringify({summary, entries}, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length > 0 && !options.has("all")) {
    console.error(JSON.stringify({failures}, null, 2));
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

export {extractNoteAnchorEntry};
