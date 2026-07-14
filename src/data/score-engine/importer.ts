import fs from "node:fs";
import path from "node:path";
import type {PieceDefinition} from "@/data/pieces/hicazkarPesrev";
import {HICAZKAR_PESREV} from "@/data/pieces/hicazkarPesrev";
import {parseSymbtrScore, type SymbtrScoreEvent} from "@/data/symbtr/parser";
import type {CanonicalScoreDocument, CanonicalSourceFeature} from "./canonical-score";
import {buildCanonicalScoreFromSymbtrEvents} from "./canonical-score";
import {buildSymbtrPdfSourceAnchors} from "./canonical-score-anchors";
import {SCORE_ENGINE_DOCUMENT_PIECES} from "./calibration";
import {evaluateCanonicalScoreQuality, type CanonicalScoreQualityReport} from "./quality";
import {summarizeCanonicalValidation, validateCanonicalScore, type CanonicalValidationSummary} from "./validator";

export interface SymbtrCanonicalImportInput {
  raw: string;
  piece?: PieceDefinition;
  scoreId?: string;
  sourceReference?: string;
  sourceKind?: "local" | "remote" | "user-upload";
}

export interface SymbtrCanonicalImportResult {
  document: CanonicalScoreDocument;
  summary: CanonicalValidationSummary;
  failedEventCount: number;
  partial: boolean;
}

export interface CanonicalDocumentListItem {
  id: string;
  catalogId: string | null;
  title: string;
  composer: string;
  makam: string;
  usul: string;
  meter: string;
  bpm: number;
  sourceKind: CanonicalScoreDocument["sourceKind"];
  eventCount: number;
  measureCount: number;
  validation: CanonicalValidationSummary;
  quality: CanonicalScoreQualityReport;
}

const USER_SYMBTR_PIECE: PieceDefinition = {
  ...HICAZKAR_PESREV,
  id: "user-symbtr-import",
  title: "User SymbTr Import",
  displayTitle: "Kullanıcı SymbTr İçe Aktarım",
  composer: "Kullanıcı kaynağı",
  makam: "Belirsiz",
  form: "Belirsiz",
  usul: "Belirsiz",
  usulId: "unknown",
  meter: "4/4",
  bpm: 72,
  symbtrCatalogId: undefined,
  symbtrRawUrl: "",
  symbtrPageUrl: "",
  sourcePageUrl: "",
  referenceRecordingUrl: undefined,
  referenceSources: [],
  scorePageUrls: [],
  visualMap: undefined,
  usulHits: [],
};

const LOCAL_SYMBTR_ROOT = path.join(process.cwd(), "symb", "SymbTr-2.0.0");

function getCatalogIdCandidates(catalogId: string | undefined): string[] {
  if (!catalogId) return [];
  const candidates = new Set<string>([catalogId]);
  const alias = catalogId.replace(/----(?:tanburi_)?(?:buyuk_|kucuk_)?/, "----");
  candidates.add(alias);
  return Array.from(candidates);
}

function readFirstExistingLocalSymbtrFile(
  catalogId: string | undefined,
  folder: string,
  extension: string,
): {path: string; raw: string} | null {
  for (const candidate of getCatalogIdCandidates(catalogId)) {
    const filePath = path.join(LOCAL_SYMBTR_ROOT, folder, `${candidate}.${extension}`);
    if (!fs.existsSync(filePath)) continue;
    return {
      path: filePath,
      raw: fs.readFileSync(filePath, "utf8"),
    };
  }
  return null;
}

function normalizeFeatureIdPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unknown";
}

function extractTextSourceFeatures(raw: string): CanonicalSourceFeature[] {
  const features: CanonicalSourceFeature[] = [];
  const lines = raw.split(/\r?\n/).slice(1);
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    const columns = line.split("\t");
    const code = columns[1];
    if (code !== "51") continue;
    const pay = columns[6]?.trim();
    const payda = columns[7]?.trim();
    const label = columns[11]?.trim();
    features.push({
      id: `txt-meter:${index + 2}`,
      kind: "meter",
      label: label || "SymbTr meter row",
      source: "symbtr-txt",
      status: "source-proven",
      value: pay && payda ? `${pay}/${payda}` : "unknown",
      evidence: `TXT Kod=51 row ${index + 2}`,
    });
  }
  return features;
}

export function extractMusicXmlSourceFeatures(raw: string, evidencePath: string): CanonicalSourceFeature[] {
  const features: CanonicalSourceFeature[] = [];
  const keyMatches = raw.matchAll(
    /<key-step>\s*([^<\s]+)\s*<\/key-step>\s*<key-accidental>\s*([^<\s]+)\s*<\/key-accidental>/g,
  );
  for (const match of keyMatches) {
    const step = match[1];
    const accidental = match[2];
    features.push({
      id: `musicxml-key:${normalizeFeatureIdPart(step)}:${normalizeFeatureIdPart(accidental)}`,
      kind: "key-signature",
      label: `${step} ${accidental}`,
      source: "symbtr-musicxml",
      status: "source-proven",
      value: `${step}:${accidental}`,
      evidence: `MusicXML <key-accidental> ${path.basename(evidencePath)}`,
    });
  }

  // Tuplet/time-modification (E1 kalan cekirdegi): kaynak-feature olarak
  // ithal edilir; renderer tuplet grubunu henuz cizmedigi icin durum
  // `unsupported`tir — ENGRAVING_POLICY bolum 1 geregi sembol uydurulmaz,
  // ama kaynakta var oldugu kanit olarak kaybolmaz (V1.10.2 sozlesmesi).
  const tupletCounts = new Map<string, number>();
  const tupletMatches = raw.matchAll(
    /<time-modification>\s*<actual-notes>\s*(\d+)\s*<\/actual-notes>\s*<normal-notes>\s*(\d+)\s*<\/normal-notes>/g,
  );
  for (const match of tupletMatches) {
    const ratio = `${match[1]}:${match[2]}`;
    tupletCounts.set(ratio, (tupletCounts.get(ratio) ?? 0) + 1);
  }
  for (const [ratio, count] of tupletCounts) {
    features.push({
      id: `musicxml-tuplet:${normalizeFeatureIdPart(ratio)}`,
      kind: "unsupported-symbol",
      label: `tuplet ${ratio}`,
      source: "symbtr-musicxml",
      status: "unsupported",
      value: ratio,
      evidence: `MusicXML <time-modification> x${count} ${path.basename(evidencePath)}`,
    });
  }

  return features;
}

export function extractMu2SourceFeatures(raw: string, evidencePath: string): CanonicalSourceFeature[] {
  const features: CanonicalSourceFeature[] = [];
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const columns = line.split("\t");
    const code = columns[0]?.trim();
    if (code === "50") {
      const marker = columns.find((column) => /[A-G]\d[^\s/]+/.test(column))?.trim();
      if (!marker) continue;
      for (const keyMarker of marker.split("/").filter(Boolean)) {
        const match = keyMarker.match(/^([A-G])\d(.+)$/);
        if (!match) continue;
        const [, step, accidental] = match;
        features.push({
          id: `mu2-key:${normalizeFeatureIdPart(step)}:${normalizeFeatureIdPart(accidental)}`,
          kind: "key-signature",
          label: keyMarker,
          source: "symbtr-mu2",
          status: "source-proven",
          value: `${step}:${accidental}`,
          evidence: `mu2 code 50 ${path.basename(evidencePath)} row ${index + 1}`,
        });
      }
      continue;
    }
    if (code === "51") {
      const pay = columns[2]?.trim();
      const payda = columns[3]?.trim();
      const label = columns[7]?.trim();
      features.push({
        id: `mu2-meter:${index + 1}`,
        kind: "meter",
        label: label || "mu2 meter row",
        source: "symbtr-mu2",
        status: "source-proven",
        value: pay && payda ? `${pay}/${payda}` : "unknown",
        evidence: `mu2 code 51 ${path.basename(evidencePath)} row ${index + 1}`,
      });
      continue;
    }
    // mu2 ikincil isaret kolonu (kolon 8): `^` caret slur/bag adayidir
    // (korpusta 776 adet). Kaynakli olarak canonical feature'a girer; renderer
    // slur cizmedigi icin durum `unsupported` — sembol uydurulmaz ama kaynak
    // kaniti kaybolmaz (F8.7 alternatif-kaynak stratejisi; E1 sozlesmesi).
    const secondaryMarker = columns[8]?.trim();
    if (secondaryMarker === "^") {
      features.push({
        id: `mu2-caret:${index + 1}`,
        kind: "unsupported-symbol",
        label: "slur/tie caret marker",
        source: "symbtr-mu2",
        status: "unsupported",
        value: "^",
        evidence: `mu2 secondary marker ${path.basename(evidencePath)} row ${index + 1}`,
      });
    }
  }
  return features;
}

function resolveLocalSiblingSourceFeatures(piece: PieceDefinition, rawText: string): CanonicalSourceFeature[] {
  const features = extractTextSourceFeatures(rawText);
  const musicXml = readFirstExistingLocalSymbtrFile(piece.symbtrCatalogId, "MusicXML", "xml");
  if (musicXml) features.push(...extractMusicXmlSourceFeatures(musicXml.raw, musicXml.path));
  const mu2 = readFirstExistingLocalSymbtrFile(piece.symbtrCatalogId, "mu2", "mu2");
  if (mu2) features.push(...extractMu2SourceFeatures(mu2.raw, mu2.path));
  return features;
}

export function createSourceFingerprint(raw: string): string {
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, "0")}:${raw.length}`;
}

function formatMeterFromQuarterBeats(quarterBeats: number): string {
  if (!Number.isFinite(quarterBeats) || quarterBeats <= 0) return "4/4";

  const eighthBeats = quarterBeats * 2;
  if (Math.abs(eighthBeats - Math.round(eighthBeats)) < 0.001) {
    return `${Math.round(eighthBeats)}/8`;
  }

  const sixteenthBeats = quarterBeats * 4;
  if (Math.abs(sixteenthBeats - Math.round(sixteenthBeats)) < 0.001) {
    return `${Math.round(sixteenthBeats)}/16`;
  }

  return `${Math.max(1, Math.round(quarterBeats))}/4`;
}

export function inferMeterFromSymbtrEvents(
  events: readonly SymbtrScoreEvent[],
  fallbackMeter = "4/4",
): string {
  const spanCounts = new Map<string, {count: number; value: number}>();
  const measureMap = new Map<number, {start: number; end: number}>();

  for (const event of events) {
    const measureIndex = event.measureIndex ?? Math.max(1, Math.floor(event.startBeat / 4) + 1);
    const current = measureMap.get(measureIndex);
    const end = event.startBeat + event.durationBeats;
    if (!current) {
      measureMap.set(measureIndex, {start: event.startBeat, end});
      continue;
    }
    current.start = Math.min(current.start, event.startBeat);
    current.end = Math.max(current.end, end);
  }

  for (const measure of measureMap.values()) {
    const span = measure.end - measure.start;
    if (!Number.isFinite(span) || span <= 0) continue;
    const rounded = Math.round(span * 8) / 8;
    const key = rounded.toFixed(3);
    const current = spanCounts.get(key);
    spanCounts.set(key, {count: (current?.count ?? 0) + 1, value: rounded});
  }

  const dominant = Array.from(spanCounts.values()).sort((left, right) => right.count - left.count)[0];
  return dominant ? formatMeterFromQuarterBeats(dominant.value) : fallbackMeter;
}

export function parseSymbtrToCanonical(input: SymbtrCanonicalImportInput): SymbtrCanonicalImportResult {
  const piece = input.piece ?? USER_SYMBTR_PIECE;
  const events = parseSymbtrScore(input.raw, piece.bpm, piece.playbackAhenk?.koma53Offset ?? 0);
  const runtimePiece = piece.meter === "auto" ? {...piece, meter: inferMeterFromSymbtrEvents(events, "4/4")} : piece;
  const document = buildCanonicalScoreFromSymbtrEvents(runtimePiece, events, {
    scoreId: input.scoreId ?? `score:${runtimePiece.id}`,
    sourceFingerprint: createSourceFingerprint(input.raw),
    sourceFeatures: resolveLocalSiblingSourceFeatures(runtimePiece, input.raw),
    sourceReference: input.sourceReference ?? runtimePiece.symbtrCatalogId ?? runtimePiece.symbtrRawUrl,
    buildExtraSourceAnchors: buildSymbtrPdfSourceAnchors,
  });
  const issues = validateCanonicalScore(document);
  document.validationIssues = issues;

  return {
    document,
    summary: summarizeCanonicalValidation(issues),
    failedEventCount: issues.filter((issue) => issue.eventId && issue.severity === "error").length,
    partial: issues.some((issue) => issue.severity === "error"),
  };
}

export async function importPieceCanonicalDocument(
  piece: PieceDefinition,
  fetcher: typeof fetch = fetch,
): Promise<SymbtrCanonicalImportResult> {
  if (!piece.symbtrRawUrl) {
    throw new Error(`Piece ${piece.id} için SymbTr raw URL yok.`);
  }

  const response = await fetcher(piece.symbtrRawUrl);
  if (!response.ok) {
    throw new Error(`SymbTr kaynağı okunamadı: ${response.status}`);
  }

  return parseSymbtrToCanonical({
    raw: await response.text(),
    piece,
    scoreId: `score:${piece.id}`,
    sourceReference: piece.symbtrRawUrl,
    sourceKind: "remote",
  });
}

export async function listReachableCanonicalDocuments(
  fetcher: typeof fetch = fetch,
): Promise<CanonicalDocumentListItem[]> {
  const documents: CanonicalDocumentListItem[] = [];

  for (const piece of SCORE_ENGINE_DOCUMENT_PIECES) {
    try {
      const result = await importPieceCanonicalDocument(piece, fetcher);
      documents.push(toCanonicalDocumentListItem(result.document));
    } catch {
      documents.push({
        id: `score:${piece.id}`,
        catalogId: piece.symbtrCatalogId ?? null,
        title: piece.displayTitle,
        composer: piece.composer,
        makam: piece.makam,
        usul: piece.usul,
        meter: piece.meter,
        bpm: piece.bpm,
        sourceKind: "symbtr",
        eventCount: 0,
        measureCount: 0,
        validation: {ok: false, errorCount: 1, warningCount: 0, issueCount: 1},
        quality: {
          documentId: `score:${piece.id}`,
          status: "blocked",
          score: 0,
          metrics: [
            {
              id: "source-reachable",
              label: "Kaynak erisimi",
              status: "fail",
              value: "kapali",
              detail: "SymbTr TXT kaynagi okunamadi",
            },
          ],
        },
      });
    }
  }

  return documents;
}

export function toCanonicalDocumentListItem(document: CanonicalScoreDocument): CanonicalDocumentListItem {
  return {
    id: document.id,
    catalogId: document.catalogId,
    title: document.title,
    composer: document.composer,
    makam: document.makam,
    usul: document.usul,
    meter: document.meter,
    bpm: document.bpm,
    sourceKind: document.sourceKind,
    eventCount: document.events.length,
    measureCount: document.measures.length,
    validation: summarizeCanonicalValidation(document.validationIssues),
    quality: evaluateCanonicalScoreQuality(document),
  };
}
