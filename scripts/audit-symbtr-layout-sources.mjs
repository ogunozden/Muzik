import { readFileSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

const root = process.cwd();
const symbRoot = path.join(root, "symb");
const xmlZipPath = path.join(symbRoot, "xml_v3.zip");
const pdfZipPath = path.join(symbRoot, "pdf_v3.zip");

function readUInt16(buffer, offset) {
  return buffer.readUInt16LE(offset);
}

function readUInt32(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function findEndOfCentralDirectory(buffer) {
  const signature = 0x06054b50;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32(buffer, offset) === signature) {
      return offset;
    }
  }

  throw new Error("ZIP end of central directory not found.");
}

function readZipEntries(zipPath) {
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
    const uncompressedSize = readUInt32(buffer, offset + 24);
    const fileNameLength = readUInt16(buffer, offset + 28);
    const extraLength = readUInt16(buffer, offset + 30);
    const commentLength = readUInt16(buffer, offset + 32);
    const localHeaderOffset = readUInt32(buffer, offset + 42);
    const fullName = buffer.toString("utf8", offset + 46, offset + 46 + fileNameLength);

    entries.push({
      compressedSize,
      compressionMethod,
      fullName,
      localHeaderOffset,
      uncompressedSize,
      zipBuffer: buffer,
    });

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function readEntryText(entry) {
  const buffer = entry.zipBuffer;
  const offset = entry.localHeaderOffset;

  if (readUInt32(buffer, offset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local file header for ${entry.fullName}.`);
  }

  const fileNameLength = readUInt16(buffer, offset + 26);
  const extraLength = readUInt16(buffer, offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  const decompressed = entry.compressionMethod === 0 ? compressed : inflateRawSync(compressed);

  return decompressed.toString("utf8");
}

function basenameWithoutExtension(fullName) {
  return path.basename(fullName).replace(/\.[^.]+$/, "").toLocaleLowerCase("en-US");
}

function auditMusicXmlEntry(entry) {
  const xml = readEntryText(entry);
  const measureCount = (xml.match(/<measure\b/g) || []).length;
  const printCount = (xml.match(/<print\b/g) || []).length;
  const systemLayoutCount = (xml.match(/<system-layout\b/g) || []).length;
  const measureLayoutCount = (xml.match(/<measure-layout\b/g) || []).length;
  const explicitBreakCount = (xml.match(/<print\b[^>]*(?:new-page|new-system)="yes"/g) || []).length;
  const hasMeasureCoordinates = /<measure\b[^>]*(?:default-x|default-y)=/.test(xml);
  const hasNoteCoordinates = /<note\b[\s\S]*?(?:default-x|default-y)=/.test(xml);

  return {
    id: basenameWithoutExtension(entry.fullName),
    fullName: entry.fullName,
    measureCount,
    printCount,
    systemLayoutCount,
    measureLayoutCount,
    explicitBreakCount,
    hasDefaultsPageLayout: /<page-layout\b/.test(xml),
    hasMeasureCoordinates,
    hasNoteCoordinates,
  };
}

function summarize(entries) {
  const withPrint = entries.filter((entry) => entry.printCount > 0);
  const withSystemLayout = entries.filter((entry) => entry.systemLayoutCount > 0);
  const withMeasureLayout = entries.filter((entry) => entry.measureLayoutCount > 0);
  const withMeasureCoordinates = entries.filter((entry) => entry.hasMeasureCoordinates);
  const withNoteCoordinates = entries.filter((entry) => entry.hasNoteCoordinates);
  const withExplicitBreaks = entries.filter((entry) => entry.explicitBreakCount > 0);
  const withPageLayout = entries.filter((entry) => entry.hasDefaultsPageLayout);

  return {
    entryCount: entries.length,
    withPageLayout: withPageLayout.length,
    withPrint: withPrint.length,
    withSystemLayout: withSystemLayout.length,
    withMeasureLayout: withMeasureLayout.length,
    withExplicitBreaks: withExplicitBreaks.length,
    withMeasureCoordinates: withMeasureCoordinates.length,
    withNoteCoordinates: withNoteCoordinates.length,
    examplesWithPrint: withPrint.slice(0, 5).map((entry) => entry.fullName),
    examplesWithMeasureCoordinates: withMeasureCoordinates.slice(0, 5).map((entry) => entry.fullName),
  };
}

const xmlEntries = readZipEntries(xmlZipPath).filter((entry) => entry.fullName.toLowerCase().endsWith(".xml"));
const pdfIds = new Set(
  readZipEntries(pdfZipPath)
    .filter((entry) => entry.fullName.toLowerCase().endsWith(".pdf"))
    .map((entry) => basenameWithoutExtension(entry.fullName)),
);
const auditedXmlEntries = xmlEntries.map(auditMusicXmlEntry);
const xmlIds = new Set(auditedXmlEntries.map((entry) => entry.id));
const missingPdfIds = [...xmlIds].filter((id) => !pdfIds.has(id));
const missingXmlIds = [...pdfIds].filter((id) => !xmlIds.has(id));

console.log(JSON.stringify(
  {
    source: {
      xmlZip: path.relative(root, xmlZipPath),
      pdfZip: path.relative(root, pdfZipPath),
    },
    musicXml: summarize(auditedXmlEntries),
    pdf: {
      entryCount: pdfIds.size,
      missingForXmlEntries: missingPdfIds.slice(0, 10),
      missingForXmlCount: missingPdfIds.length,
      missingXmlForPdfEntries: missingXmlIds.slice(0, 10),
      missingXmlForPdfCount: missingXmlIds.length,
    },
    conclusion:
      "SymbTr v3 MusicXML provides page defaults and measure order, but this audit checks whether it contains measure-level coordinates or explicit system/page breaks needed for true visual measure boxes.",
  },
  null,
  2,
));
