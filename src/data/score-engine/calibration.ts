import {
  HICAZKAR_PESREV,
  type PieceDefinition,
  type PieceLayer,
  type PiecePercussionLayer,
} from "@/data/pieces/hicazkarPesrev";
import {getSymbTrEntryById, type SymbTrCatalogEntry} from "@/data/symbtr/catalog";

const SYMBTR_RAW_TXT_BASE_URL = "https://raw.githubusercontent.com/MTG/SymbTr/master/txt";

export const SCORE_ENGINE_CALIBRATION_CATALOG_IDS = [
  "acem--ilahi--duyek--aldanma_dunya--zekai_dede",
  "acem--ilahi--nimevsat--calabim_bir--haci_bayram_veli",
  "acem--kupe--duyek--zulfunu--ahmet_avni_konuk",
  "acem--selam--devrikebir--asik-i_ger--huseyin_fahreddin_dede",
  "acemasiran--sarki--aksak--oldu_gonul--dede_efendi",
] as const;

function formatCatalogLabel(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function createCalibrationPieceDefinition(entry: SymbTrCatalogEntry): PieceDefinition {
  return {
    id: `calibration-${entry.id}`,
    title: formatCatalogLabel(entry.title),
    displayTitle: formatCatalogLabel(entry.title),
    composer: formatCatalogLabel(entry.composer),
    makam: formatCatalogLabel(entry.makam),
    form: formatCatalogLabel(entry.form),
    usul: formatCatalogLabel(entry.usul),
    usulId: entry.usul,
    meter: "auto",
    bpm: 72,
    symbtrCatalogId: entry.id,
    symbtrRawUrl: `${SYMBTR_RAW_TXT_BASE_URL}/${entry.id}.txt`,
    symbtrPageUrl: "https://github.com/MTG/SymbTr",
    sourcePageUrl: "https://github.com/MTG/SymbTr",
    referenceSources: [],
    scorePageUrls: [],
    visualMap: undefined,
    playbackAhenk: undefined,
    usulHits: [],
    melodicLayers: HICAZKAR_PESREV.melodicLayers as readonly PieceLayer[],
    percussionLayers: HICAZKAR_PESREV.percussionLayers as readonly PiecePercussionLayer[],
    requiredPercussionSymbols: [],
  };
}

export const SCORE_ENGINE_CALIBRATION_PIECES = SCORE_ENGINE_CALIBRATION_CATALOG_IDS
  .map((catalogId) => getSymbTrEntryById(catalogId))
  .filter((entry): entry is SymbTrCatalogEntry => Boolean(entry))
  .map(createCalibrationPieceDefinition);

export const SCORE_ENGINE_DOCUMENT_PIECES = [
  HICAZKAR_PESREV,
  ...SCORE_ENGINE_CALIBRATION_PIECES,
] as const satisfies readonly PieceDefinition[];

export function getScoreEngineDocumentPiece(documentId: string): PieceDefinition | undefined {
  const decodedId = decodeURIComponent(documentId);
  return SCORE_ENGINE_DOCUMENT_PIECES.find(
    (piece) => `score:${piece.id}` === decodedId || piece.id === decodedId || piece.symbtrCatalogId === decodedId,
  );
}
