import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {inflateRawSync, inflateSync} from "node:zlib";

const root = process.cwd();
const symbRoot = path.join(root, "symb");
const pdfZipPath = path.join(symbRoot, "pdf_v3.zip");
const DEFAULT_CATALOG_ID = "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey";
const DEFAULT_GENERATED_AT = "2026-05-10";

export function parseCliOptions(args) {
  const options = new Map();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) continue;

    const [key, inlineValue] = arg.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      options.set(key, inlineValue);
      continue;
    }

    const next = args[index + 1];
    if (next && !next.startsWith("--")) {
      options.set(key, next);
      index += 1;
    } else {
      options.set(key, "true");
    }
  }

  return options;
}

export function readUInt16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

export function readUInt32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

export function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === signature) {
      return offset;
    }
  }

  throw new Error("ZIP end of central directory not found.");
}

export function readZipArchive(zipPath) {
  const buffer = readFileSync(zipPath);
  const endOffset = findEndOfCentralDirectory(buffer);
  const entryCount = readUInt16(buffer, endOffset + 10);
  const centralDirectoryOffset = readUInt32(buffer, endOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < entryCount; index += 1) {
    if (readUInt32(buffer, offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory header at ${offset}.`);
    }

    const compressionMethod = readUInt16(buffer, offset + 10);
    const compressedSize = readUInt32(buffer, offset + 20);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const fullName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    entries.push({
      compressionMethod,
      compressedSize,
      fullName,
      localHeaderOffset,
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return {buffer, entries};
}

export function readZipEntry(archive, entryName) {
  const entry = archive.entries.find((candidate) => candidate.fullName === entryName);

  if (!entry) {
    throw new Error(`ZIP entry not found: ${entryName}`);
  }

  const localFileNameLength = readUInt16(archive.buffer, entry.localHeaderOffset + 26);
  const localExtraLength = readUInt16(archive.buffer, entry.localHeaderOffset + 28);
  const dataStart = entry.localHeaderOffset + 30 + localFileNameLength + localExtraLength;
  const compressed = archive.buffer.subarray(dataStart, dataStart + entry.compressedSize);

  return entry.compressionMethod === 0 ? compressed : inflateRawSync(compressed);
}

export function readPdfContentStreams(pdfBuffer) {
  const pdfText = pdfBuffer.toString("latin1");
  const objectPattern = /(\d+) 0 obj/g;
  const streams = [];
  let match;

  while ((match = objectPattern.exec(pdfText))) {
    const objectStart = match.index;
    const objectEnd = pdfText.indexOf("endobj", objectStart);
    if (objectEnd < 0) continue;

    const objectText = pdfText.slice(objectStart, objectEnd);
    if (!objectText.includes("stream")) continue;

    const length = Number(objectText.match(/\/Length\s+(\d+)/)?.[1] ?? 0);
    const streamStartMarker = pdfText.indexOf("stream", objectStart);
    let streamStart = streamStartMarker + "stream".length;

    if (pdfBuffer[streamStart] === 13 && pdfBuffer[streamStart + 1] === 10) {
      streamStart += 2;
    } else if (pdfBuffer[streamStart] === 10 || pdfBuffer[streamStart] === 13) {
      streamStart += 1;
    }

    const streamEnd = length > 0 ? streamStart + length : pdfText.indexOf("endstream", streamStart);
    let streamData = pdfBuffer.subarray(streamStart, streamEnd);

    if (objectText.includes("/FlateDecode")) {
      try {
        streamData = inflateSync(streamData);
      } catch {
        streamData = inflateRawSync(streamData);
      }
    }

    streams.push(streamData.toString("latin1"));
  }

  return streams;
}

export function parsePageSize(pdfBuffer) {
  const pdfText = pdfBuffer.toString("latin1");
  const mediaBoxMatch = pdfText.match(/\/MediaBox\s*\[\s*0\s+0\s+([0-9.]+)\s+([0-9.]+)\s*\]/);

  return {
    width: Number(mediaBoxMatch?.[1] ?? 595.22),
    height: Number(mediaBoxMatch?.[2] ?? 842),
  };
}

export function parseLineSegments(contentText) {
  const tokens = [...contentText.matchAll(/-?\d*\.\d+|-?\d+|[A-Za-z*]+/g)].map((match) => match[0]);
  const segments = [];
  const stack = [];
  let currentPoint = null;
  let lineWidth = 1;

  for (const token of tokens) {
    if (/^-?\d/.test(token)) {
      stack.push(Number(token));
      continue;
    }

    if (token === "w") {
      lineWidth = stack.pop() ?? lineWidth;
      stack.length = 0;
      continue;
    }

    if (token === "m") {
      const y = stack.pop();
      const x = stack.pop();
      currentPoint = Number.isFinite(x) && Number.isFinite(y) ? {x, y} : null;
      stack.length = 0;
      continue;
    }

    if (token === "l") {
      const y = stack.pop();
      const x = stack.pop();
      if (currentPoint && Number.isFinite(x) && Number.isFinite(y)) {
        segments.push({x1: currentPoint.x, y1: currentPoint.y, x2: x, y2: y, lineWidth});
        currentPoint = {x, y};
      }
      stack.length = 0;
      continue;
    }

    if (token === "re" && stack.length >= 4) {
      const height = stack.pop();
      const width = stack.pop();
      const y = stack.pop();
      const x = stack.pop();
      segments.push(
        {x1: x, y1: y, x2: x + width, y2: y, lineWidth},
        {x1: x + width, y1: y, x2: x + width, y2: y + height, lineWidth},
        {x1: x + width, y1: y + height, x2: x, y2: y + height, lineWidth},
        {x1: x, y1: y + height, x2: x, y2: y, lineWidth},
      );
    }

    stack.length = 0;
  }

  return segments;
}

export function round(value) {
  return Number(value.toFixed(3));
}

export function percentage(value, total) {
  return Number(((value / total) * 100).toFixed(3));
}

function assertInsideProject(targetPath) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(targetPath);
  const relativePath = path.relative(resolvedRoot, resolvedTarget);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to write outside project: ${resolvedTarget}`);
  }

  return resolvedTarget;
}

function toProjectPath(targetPath) {
  return targetPath.split(path.sep).join("/");
}

export function catalogIdFromPdfEntry(fullName) {
  return path.basename(fullName).replace(/\.pdf$/i, "");
}

export function uniqueStaffLines(segments) {
  const lines = segments
    .filter((segment) => Math.abs(segment.y1 - segment.y2) < 0.05)
    .map((segment) => ({
      x1: Math.min(segment.x1, segment.x2),
      x2: Math.max(segment.x1, segment.x2),
      y: segment.y1,
    }))
    .filter((line) => line.x2 - line.x1 > 400 && line.x1 > 5)
    .sort((left, right) => right.y - left.y);

  const unique = [];

  for (const line of lines) {
    const existing = unique.find((candidate) => Math.abs(candidate.y - line.y) < 0.5);
    if (existing) {
      existing.x1 = Math.min(existing.x1, line.x1);
      existing.x2 = Math.max(existing.x2, line.x2);
    } else {
      unique.push({...line});
    }
  }

  return unique;
}

export function groupStaffRows(staffLines) {
  const rows = [];
  let index = 0;

  while (index <= staffLines.length - 5) {
    const candidate = staffLines.slice(index, index + 5);
    const gaps = candidate.slice(0, -1).map((line, gapIndex) => line.y - candidate[gapIndex + 1].y);
    const isStaff = gaps.every((gap) => gap >= 3.5 && gap <= 6.5);

    if (isStaff) {
      rows.push({
        rowIndex: rows.length,
        top: round(candidate[0].y),
        bottom: round(candidate[4].y),
        left: round(Math.min(...candidate.map((line) => line.x1))),
        right: round(Math.max(...candidate.map((line) => line.x2))),
        staffLineY: candidate.map((line) => round(line.y)),
      });
      index += 5;
    } else {
      index += 1;
    }
  }

  return rows;
}

export function extractMeasureCandidates(segments, staffRows, pageSize) {
  const verticalSegments = segments
    .filter((segment) => Math.abs(segment.x1 - segment.x2) < 0.05)
    .map((segment) => ({
      x: segment.x1,
      y1: Math.min(segment.y1, segment.y2),
      y2: Math.max(segment.y1, segment.y2),
    }))
    .filter((segment) => segment.y2 - segment.y1 >= 15 && segment.y2 - segment.y1 <= 30);
  const boxes = [];

  for (const row of staffRows) {
    const detectedBoundaries = verticalSegments
      .filter((segment) => Math.abs(segment.y2 - row.top) <= 1.2 && Math.abs(segment.y1 - row.bottom) <= 1.2)
      .map((segment) => round(segment.x))
      .sort((left, right) => left - right);
    const boundaries = [row.left, ...detectedBoundaries, row.right]
      .sort((left, right) => left - right)
      .filter((value, boundaryIndex, all) => boundaryIndex === 0 || Math.abs(value - all[boundaryIndex - 1]) > 1);

    for (let boundaryIndex = 0; boundaryIndex < boundaries.length - 1; boundaryIndex += 1) {
      const left = boundaries[boundaryIndex];
      const right = boundaries[boundaryIndex + 1];
      if (right - left < 10) continue;

      boxes.push({
        rowIndex: row.rowIndex,
        candidateIndexInRow: boxes.filter((box) => box.rowIndex === row.rowIndex).length,
        x: round(left),
        y: round(row.bottom),
        width: round(right - left),
        height: round(row.top - row.bottom),
        leftPercent: percentage(left, pageSize.width),
        topPercent: percentage(pageSize.height - row.top, pageSize.height),
        widthPercent: percentage(right - left, pageSize.width),
        heightPercent: percentage(row.top - row.bottom, pageSize.height),
        confidence: "pdf-vector-candidate",
      });
    }
  }

  return boxes;
}

const pdfArchive = readZipArchive(pdfZipPath);
const pdfEntriesByCatalogId = new Map(
  pdfArchive.entries
    .filter((entry) => entry.fullName.toLowerCase().endsWith(".pdf"))
    .map((entry) => [catalogIdFromPdfEntry(entry.fullName), entry]),
);
const extractionWarning = "Candidates are extracted from staff-wide vertical vector lines. Human or visual regression review is required before treating them as verified measure boxes.";

export function extractLayoutEntry(catalogId) {
  const pdfEntry = pdfEntriesByCatalogId.get(catalogId);

  if (!pdfEntry) {
    throw new Error(`PDF entry not found for catalog id: ${catalogId}`);
  }

  const pdfBuffer = readZipEntry(pdfArchive, pdfEntry.fullName);
  const pageSize = parsePageSize(pdfBuffer);
  const contentText = readPdfContentStreams(pdfBuffer).join("\n");
  const segments = parseLineSegments(contentText);
  const staffRows = groupStaffRows(uniqueStaffLines(segments));
  const measureCandidates = extractMeasureCandidates(segments, staffRows, pageSize);

  return {
    catalogId,
    source: {
      archivePath: toProjectPath(path.relative(root, pdfZipPath)),
      archiveMemberPath: pdfEntry.fullName,
    },
    pageSize,
    staffRows: staffRows.map((row) => ({
      ...row,
      leftPercent: percentage(row.left, pageSize.width),
      topPercent: percentage(pageSize.height - row.top, pageSize.height),
      widthPercent: percentage(row.right - row.left, pageSize.width),
      heightPercent: percentage(row.top - row.bottom, pageSize.height),
    })),
    measureCandidates,
    summary: {
      staffRowCount: staffRows.length,
      measureCandidateCount: measureCandidates.length,
      extraction: "pdf-vector-candidate",
      warning: extractionWarning,
    },
  };
}

export function parsePositiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function main() {
  const options = parseCliOptions(process.argv.slice(2));

  function buildExtractionSummary() {
    const candidateEntryCount = layoutEntries.filter((entry) => entry.measureCandidates.length > 0).length;

    return {
      generatedAt: options.get("generated-at") ?? DEFAULT_GENERATED_AT,
      sourceArchivePath: toProjectPath(path.relative(root, pdfZipPath)),
      requestedEntryCount: catalogIds.length,
      extractedEntryCount: layoutEntries.length,
      candidateEntryCount,
      zeroCandidateEntryCount: layoutEntries.length - candidateEntryCount,
      totalMeasureCandidateCount: layoutEntries.reduce(
        (total, entry) => total + entry.measureCandidates.length,
        0,
      ),
      failureCount: failures.length,
      failures,
      sampleEntries: layoutEntries.slice(0, 5).map((entry) => ({
        catalogId: entry.catalogId,
        staffRowCount: entry.summary.staffRowCount,
        measureCandidateCount: entry.summary.measureCandidateCount,
      })),
      warning: extractionWarning,
    };
  }

  function compactSummary(summary, extra = {}) {
    return {
      ...extra,
      requestedEntryCount: summary.requestedEntryCount,
      extractedEntryCount: summary.extractedEntryCount,
      candidateEntryCount: summary.candidateEntryCount,
      zeroCandidateEntryCount: summary.zeroCandidateEntryCount,
      totalMeasureCandidateCount: summary.totalMeasureCandidateCount,
      failureCount: summary.failureCount,
      warning: summary.warning,
    };
  }

const requestedCatalogIds = options.has("all")
  ? Array.from(pdfEntriesByCatalogId.keys()).sort()
  : [options.get("catalog-id") ?? DEFAULT_CATALOG_ID];
const limit = parsePositiveInteger(options.get("limit"), requestedCatalogIds.length);
const catalogIds = requestedCatalogIds.slice(0, limit);
const failures = [];
const layoutEntries = [];

for (const selectedCatalogId of catalogIds) {
  try {
    layoutEntries.push(extractLayoutEntry(selectedCatalogId));
  } catch (error) {
    failures.push({
      catalogId: selectedCatalogId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

if (!options.has("all") && failures.length > 0) {
  console.error(JSON.stringify({failures}, null, 2));
  process.exit(1);
}

const extractionSummary = buildExtractionSummary();
const summaryOutputTarget = options.get("summary-output");
let summaryOutputPath = null;

if (summaryOutputTarget) {
  summaryOutputPath = assertInsideProject(path.resolve(root, summaryOutputTarget));
  mkdirSync(path.dirname(summaryOutputPath), {recursive: true});
  writeFileSync(summaryOutputPath, `${JSON.stringify(extractionSummary, null, 2)}\n`);
}

const writeTarget = options.get("write");

if (writeTarget) {
  const outputPath = assertInsideProject(path.resolve(root, writeTarget));
  const generatedLayout = {
    schemaVersion: 1,
    generatedAt: options.get("generated-at") ?? DEFAULT_GENERATED_AT,
    sourceArchivePath: toProjectPath(path.relative(root, pdfZipPath)),
    extraction: "pdf-vector-candidate",
    warning: extractionWarning,
    entries: Object.fromEntries(layoutEntries.map((entry) => [entry.catalogId, entry])),
  };

  mkdirSync(path.dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, `${JSON.stringify(generatedLayout, null, 2)}\n`);
  console.log(JSON.stringify(
    compactSummary(extractionSummary, {
      written: toProjectPath(path.relative(root, outputPath)),
      writtenEntryCount: layoutEntries.length,
      summaryWritten: summaryOutputPath ? toProjectPath(path.relative(root, summaryOutputPath)) : null,
    }),
    null,
    2,
  ));
  process.exit(0);
}

if (options.has("all")) {
  console.log(JSON.stringify(
    summaryOutputPath
      ? compactSummary(extractionSummary, {
          summaryWritten: toProjectPath(path.relative(root, summaryOutputPath)),
        })
      : extractionSummary,
    null,
    2,
  ));
} else {
  console.log(JSON.stringify(
    layoutEntries[0],
    null,
    2,
  ));
}
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
