"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {ReactNode} from "react";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {
  PIECE_LIBRARY,
  createVisualMeasureSegments,
  createDefaultVisualMap,
  getActiveVisualMeasureSegment,
  getCurrentScoreEvent,
  getVisualBeatPosition,
  parseSymbtrScore,
  type PieceDefinition,
  type PieceLayer,
  type PiecePercussionLayer,
  type PieceScoreEvent,
  type PieceUsulHit,
  type PieceVisualStaffBand,
} from "@/data/pieces/hicazkarPesrev";
import {playArrangement, stopAll, type InstrumentType, type PercussionSymbol} from "@/engines/ses/engine";
import {USUL_DATA, getUsulBeatDuration} from "@/engines/usul/data";
import {ENSTRUMAN_LIST, MELODIC_INSTRUMENTS, PERCUSSION_INSTRUMENTS} from "@/lib/centralized";
import {tokens} from "@/shared/tokens";
import {
  SYMBTR_CATALOG_COUNT,
  getSymbTrEntryById,
  getSymbTrEntrySourceReferences,
  searchSymbTrCatalog,
  type SymbTrCatalogEntry,
} from "@/data/symbtr/catalog";
import {
  getSymbTrPdfLayout,
  getSymbTrPdfLayoutVerificationStatus,
  getSymbTrVerifiedPdfMeasureBoxes,
} from "@/data/symbtr/layout";
import {getPieceExternalReferences} from "@/data/references/piece-external-references";

interface SampleSlotStatus {
  category: "melodic" | "percussion";
  instrumentId: string;
  installed: boolean;
  symbol: PercussionSymbol | null;
}

interface SampleApiResponse {
  slots?: SampleSlotStatus[];
}

const DEFAULT_PIECE = PIECE_LIBRARY[0];
const MIN_BPM = 40;
const MAX_BPM = 180;
const MELODIC_MIX_GAIN_CEILING = 0.34;
const ADDED_MELODIC_LAYER_GAIN = 0.1;
const VISUAL_GUIDE_TICKS = [0, 0.25, 0.5, 0.75, 1] as const;

interface CustomPieceDraft {
  title: string;
  composer: string;
  makam: string;
  form: string;
  catalogId: string;
  scoreImages: CustomScoreImage[];
}

interface CustomScoreImage {
  name: string;
  size: number;
  type: string;
  url: string;
}

type DisplayUsulHit = Pick<PieceUsulHit, "beat" | "isAccent" | "syllable" | "timeValue"> & {
  symbol: PercussionSymbol | "";
};

function clampBpm(value: number, fallbackBpm: number = DEFAULT_PIECE.bpm): number {
  if (!Number.isFinite(value)) return fallbackBpm;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value)));
}

function getInstrumentLabel(instrumentId: InstrumentType): string {
  const instrument = ENSTRUMAN_LIST.find((item) => item.id === instrumentId);
  return instrument?.nameTr ?? instrumentId;
}

function makeLayerId(instrument: InstrumentType, existingIds: Set<string>): string {
  const base = instrument.replace(/[^a-zA-Z0-9_-]/g, "-");
  let candidate = base;
  let index = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

function formatBeatLabel(beat: number): string {
  return Number.isInteger(beat) ? beat.toString() : beat.toFixed(1);
}

function hasMelodicSamples(slots: SampleSlotStatus[], instrument: InstrumentType): boolean {
  return slots.some((slot) => slot.installed && slot.category === "melodic" && slot.instrumentId === instrument);
}

function hasPercussionSamples(
  slots: SampleSlotStatus[],
  instrument: InstrumentType,
  requiredSymbols: readonly PercussionSymbol[],
): boolean {
  return requiredSymbols.every((symbol) =>
    slots.some(
      (slot) =>
        slot.installed &&
        slot.category === "percussion" &&
        slot.instrumentId === instrument &&
        slot.symbol === symbol,
    ),
  );
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function formatFrequency(frequency: number | null | undefined): string {
  if (!frequency) return "Hazır";
  return `${frequency.toFixed(2)} Hz`;
}

function isHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function makeVisualPieceSignature(title: string, images: readonly CustomScoreImage[]): string {
  const imageKeys = images.map((image) => `${image.name}:${image.size}`).sort().join("|");
  return `local-images:${title.toLocaleLowerCase("tr-TR")}:${imageKeys}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getPlaybackEventPosition(eventCount: number, currentEventPosition: number, progressPercent: number): number {
  if (eventCount <= 0) return -1;
  if (currentEventPosition >= 0) return clamp(currentEventPosition, 0, eventCount - 1);
  return clamp(Math.floor((progressPercent / 100) * eventCount), 0, eventCount - 1);
}

function estimateScorePageIndex(scorePageCount: number, totalBeats: number, currentBeat: number): number {
  if (scorePageCount <= 0) return -1;
  if (totalBeats <= 0 || currentBeat < 0) return 0;
  return clamp(Math.floor((clamp(currentBeat, 0, totalBeats) / totalBeats) * scorePageCount), 0, scorePageCount - 1);
}

function estimateScorePageProgress(scorePageCount: number, totalBeats: number, currentBeat: number, pageIndex: number): number {
  if (scorePageCount <= 0 || totalBeats <= 0 || currentBeat < 0 || pageIndex < 0) return 0;

  const beatsPerPage = totalBeats / scorePageCount;
  const pageStart = pageIndex * beatsPerPage;
  const raw = ((clamp(currentBeat, 0, totalBeats) - pageStart) / Math.max(beatsPerPage, 1)) * 100;
  return clamp(raw, 0, 100);
}

function getActiveVisualBand(
  bands: readonly PieceVisualStaffBand[] | undefined,
  currentBeat: number,
): PieceVisualStaffBand | null {
  if (!bands || bands.length === 0 || !Number.isFinite(currentBeat)) return null;

  return (
    bands.find((band) => currentBeat >= band.startBeat && currentBeat < band.endBeat) ??
    bands.find((band) => currentBeat <= band.endBeat) ??
    bands[bands.length - 1] ??
    null
  );
}

function formatCatalogSegment(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

function getCatalogEntryDisplay(entry: SymbTrCatalogEntry): string {
  return [
    formatCatalogSegment(entry.makam),
    formatCatalogSegment(entry.form),
    formatCatalogSegment(entry.usul),
    formatCatalogSegment(entry.title),
    formatCatalogSegment(entry.composer),
  ].join(" · ");
}

function getMelodicGainScale(layers: PieceLayer[]): number {
  const totalGain = layers.reduce((total, layer) => total + layer.gain, 0);
  if (totalGain <= MELODIC_MIX_GAIN_CEILING) return 1;
  return MELODIC_MIX_GAIN_CEILING / totalGain;
}

function assertParseableSymbtrScore(raw: string, bpm: number): void {
  if (parseSymbtrScore(raw, bpm).length === 0) {
    throw new Error("SymbTr skoru okunamadı: nota olayı bulunamadı.");
  }
}

function getSectionAt(events: PieceScoreEvent[], elapsedSeconds: number): string {
  let section = events.find((event) => event.section)?.section ?? "1. HANE";

  for (const event of events) {
    if (event.startTime > elapsedSeconds) break;
    if (event.section) section = event.section;
  }

  return section;
}

function Panel({className = "", children}: {className?: string; children: ReactNode}) {
  return (
    <div className={`${tokens.colors.background.surface} ${tokens.colors.border.base} rounded-md border p-4 ${className}`}>
      {children}
    </div>
  );
}

function Pill({tone = "primary", children}: {tone?: "primary" | "secondary" | "success"; children: ReactNode}) {
  const toneClass =
    tone === "success"
      ? "bg-[#388E3C] text-white"
      : tone === "secondary"
        ? "border border-[var(--color-border-base)] text-[var(--color-text-primary)]"
        : "bg-[var(--color-primary-500)] text-white";

  return <span className={`${toneClass} inline-flex rounded-full px-2.5 py-1 text-sm`}>{children}</span>;
}

export default function EserTakipPage() {
  const [pieceLibrary, setPieceLibrary] = useState<PieceDefinition[]>(() => [...PIECE_LIBRARY]);
  const [selectedPieceId, setSelectedPieceId] = useState<string>(DEFAULT_PIECE.id);
  const selectedPiece = useMemo(
    () => pieceLibrary.find((libraryPiece) => libraryPiece.id === selectedPieceId) ?? pieceLibrary[0],
    [pieceLibrary, selectedPieceId],
  );
  const [rawScore, setRawScore] = useState("");
  const [bpm, setBpm] = useState<number>(DEFAULT_PIECE.bpm);
  const [customPieceDraft, setCustomPieceDraft] = useState<CustomPieceDraft>({
    title: "",
    composer: "",
    makam: "",
    form: "",
    catalogId: "",
    scoreImages: [],
  });
  const [pieceMessage, setPieceMessage] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [isAddingPiece, setIsAddingPiece] = useState(false);
  const [layerInstrument, setLayerInstrument] = useState<InstrumentType>("ney");
  const [percussionInstrument, setPercussionInstrument] = useState<InstrumentType>("kudum");
  const [melodicLayers, setMelodicLayers] = useState<PieceLayer[]>(() => [...DEFAULT_PIECE.melodicLayers]);
  const [percussionLayers, setPercussionLayers] = useState<PiecePercussionLayer[]>(() => [...DEFAULT_PIECE.percussionLayers]);
  const [layerMessage, setLayerMessage] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [sampleSlots, setSampleSlots] = useState<SampleSlotStatus[] | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  const animationRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const isAddingPieceRef = useRef(false);

  const usul = useMemo(() => USUL_DATA.find((item) => item.id === selectedPiece.usulId), [selectedPiece.usulId]);
  const beatDuration = usul ? getUsulBeatDuration(usul, bpm) : 60 / bpm;
  const playbackKoma53Offset = selectedPiece.playbackAhenk?.koma53Offset ?? 0;
  const parsedEvents = useMemo(
    () => (rawScore ? parseSymbtrScore(rawScore, bpm, playbackKoma53Offset) : []),
    [bpm, playbackKoma53Offset, rawScore],
  );
  const events = parsedEvents;
  const totalDuration = events.reduce((max, event) => Math.max(max, event.startTime + event.duration), 0);
  const totalBeats = events.reduce((max, event) => Math.max(max, event.startBeat + event.durationBeats), 0);
  const currentBeat = playbackPosition / beatDuration;
  const progress = totalDuration > 0 ? Math.min(100, (playbackPosition / totalDuration) * 100) : 0;
  const currentEvent = getCurrentScoreEvent(events, playbackPosition);
  const currentPlaybackKoma53 =
    currentEvent?.koma53 !== null && currentEvent?.koma53 !== undefined
      ? currentEvent.koma53 + playbackKoma53Offset
      : null;
  const currentEventPosition = currentEvent
    ? events.findIndex((event) => event.index === currentEvent.index && event.startTime === currentEvent.startTime)
    : -1;
  const playbackEventPosition = getPlaybackEventPosition(events.length, currentEventPosition, progress);
  const currentScorePageIndex = estimateScorePageIndex(
    selectedPiece.scorePageUrls.length,
    totalBeats,
    currentBeat,
  );
  const currentScorePageProgress = estimateScorePageProgress(
    selectedPiece.scorePageUrls.length,
    totalBeats,
    currentBeat,
    currentScorePageIndex,
  );
  const visualStaffBands = selectedPiece.visualMap?.staffBands;
  const activeVisualBand = getActiveVisualBand(visualStaffBands, currentBeat);
  const activeVisualPageIndex = activeVisualBand?.pageIndex ?? currentScorePageIndex;
  const activeVisualBandProgress = activeVisualBand
    ? clamp(((currentBeat - activeVisualBand.startBeat) / Math.max(activeVisualBand.endBeat - activeVisualBand.startBeat, 1)) * 100, 0, 100)
    : currentScorePageProgress;
  const activeVisualBeatPosition = activeVisualBand ? getVisualBeatPosition(activeVisualBand, currentBeat) : null;
  const visualMeasureSegments = useMemo(
    () => createVisualMeasureSegments(events, visualStaffBands ?? []),
    [events, visualStaffBands],
  );
  const activeVisualMeasureSegment = getActiveVisualMeasureSegment(visualMeasureSegments, currentBeat);
  const visibleScoreStart = Math.max(0, (playbackEventPosition >= 0 ? playbackEventPosition : 0) - 8);
  const visibleScoreEvents =
    events.length === 0
      ? []
      : events.slice(
          visibleScoreStart,
          Math.min(events.length, visibleScoreStart + 24),
        );
  const currentSection = getSectionAt(events, playbackPosition);
  const referenceSources = (
    selectedPiece.symbtrCatalogId
      ? getPieceExternalReferences(selectedPiece.symbtrCatalogId)
      : selectedPiece.referenceSources ?? []
  ).filter((source) => isHttpUrl(source.url));
  const selectedSymbTrEntry = selectedPiece.symbtrCatalogId
    ? getSymbTrEntryById(selectedPiece.symbtrCatalogId)
    : null;
  const selectedSymbTrSourceReferences = selectedSymbTrEntry
    ? getSymbTrEntrySourceReferences(selectedSymbTrEntry)
    : [];
  const selectedSymbTrPdfLayout = selectedPiece.symbtrCatalogId
    ? getSymbTrPdfLayout(selectedPiece.symbtrCatalogId)
    : null;
  const selectedSymbTrPdfLayoutVerificationStatus = selectedPiece.symbtrCatalogId
    ? getSymbTrPdfLayoutVerificationStatus(selectedPiece.symbtrCatalogId)
    : null;
  const selectedSymbTrVerifiedPdfMeasureBoxes = selectedPiece.symbtrCatalogId
    ? getSymbTrVerifiedPdfMeasureBoxes(selectedPiece.symbtrCatalogId)
    : [];
  const activeVerifiedPdfMeasureBox =
    selectedSymbTrVerifiedPdfMeasureBoxes.find(
      (box) => box.measureIndex === activeVisualMeasureSegment?.measureIndex,
    ) ?? null;
  const catalogResults = useMemo(
    () => searchSymbTrCatalog(catalogQuery, catalogQuery.trim() ? 8 : 0),
    [catalogQuery],
  );

  const layerSampleMessages = useMemo(() => {
    if (!sampleSlots) return [];

    return [
      ...melodicLayers
        .filter((layer) => !hasMelodicSamples(sampleSlots, layer.instrument))
        .map((layer) => `${layer.label}: sample yok, sentez kullanılır`),
      ...percussionLayers
        .filter((layer) => !hasPercussionSamples(sampleSlots, layer.instrument, selectedPiece.requiredPercussionSymbols))
        .map((layer) => `${layer.label}: bazı vuruş sample'ları yok, sentez tamamlar`),
    ];
  }, [melodicLayers, percussionLayers, sampleSlots, selectedPiece.requiredPercussionSymbols]);

  const sectionMarkers = useMemo(() => events.filter((event) => event.section), [events]);
  const playbackUsulHits = useMemo<DisplayUsulHit[]>(() => {
    if (!usul) return [];
    return (selectedPiece.usulHits ?? usul.symbols).map((hit) => ({
      beat: hit.beat,
      symbol: hit.symbol,
      isAccent: hit.isAccent,
      timeValue: hit.timeValue,
      syllable: "syllable" in hit ? hit.syllable : hit.symbol || "-",
    }));
  }, [selectedPiece.usulHits, usul]);
  const currentCycleBeat = usul ? (currentBeat % usul.beats) + 1 : 0;
  const activeUsulHit = playbackUsulHits.find(
    (hit) => currentCycleBeat >= hit.beat && currentCycleBeat < hit.beat + Math.max(hit.timeValue ?? 1, 0.5),
  );
  const melodicInstrumentItems = useMemo(
    () =>
      ENSTRUMAN_LIST.filter((instrument) => (MELODIC_INSTRUMENTS as readonly string[]).includes(instrument.id)).map(
        (instrument) => ({
          id: instrument.id as InstrumentType,
          label: instrument.nameTr,
        }),
      ),
    [],
  );
  const percussionInstrumentItems = useMemo(
    () =>
      ENSTRUMAN_LIST.filter((instrument) => (PERCUSSION_INSTRUMENTS as readonly string[]).includes(instrument.id)).map(
        (instrument) => ({
          id: instrument.id as InstrumentType,
          label: instrument.nameTr,
        }),
      ),
    [],
  );

  const stopPlayback = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    animationRef.current = null;
    stopTimerRef.current = null;
    stopAll();
    setIsPlaying(false);
    setPlaybackPosition(0);
  }, []);

  const handleBpmChange = useCallback((value: number) => {
    stopPlayback();
    setBpm(clampBpm(value, selectedPiece.bpm));
  }, [selectedPiece.bpm, stopPlayback]);

  const selectPiece = useCallback((pieceId: string) => {
    const nextPiece = pieceLibrary.find((libraryPiece) => libraryPiece.id === pieceId);
    if (!nextPiece) return;

    stopPlayback();
    setRawScore("");
    setScoreError(null);
    setBpm(nextPiece.bpm);
    setMelodicLayers([...nextPiece.melodicLayers]);
    setPercussionLayers([...nextPiece.percussionLayers]);
    setLayerMessage(null);
    setSelectedPieceId(pieceId);
    setPieceMessage(null);
  }, [pieceLibrary, stopPlayback]);

  const updateCustomPieceDraft = useCallback((field: "title" | "composer" | "makam" | "form", value: string) => {
    setCustomPieceDraft((draft) => ({...draft, [field]: value}));
  }, []);

  const applyCatalogEntry = useCallback((entry: SymbTrCatalogEntry) => {
    setCustomPieceDraft((draft) => ({
      ...draft,
      title: formatCatalogSegment(entry.title),
      composer: formatCatalogSegment(entry.composer),
      makam: formatCatalogSegment(entry.makam),
      form: formatCatalogSegment(entry.form),
      catalogId: entry.id,
    }));
    setPieceMessage(`${entry.id} katalog bilgisi forma işlendi; nota görseli ekleyince parça seçilebilir.`);
  }, []);

  const handleCustomScoreImages = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const acceptedImages = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (acceptedImages.length !== files.length) {
      setPieceMessage("Parça eklemek için yalnızca PNG, JPG, GIF veya WebP görselleri seç.");
    }

    setCustomPieceDraft((draft) => {
      const existing = new Set(draft.scoreImages.map((image) => `${image.name}:${image.size}`));
      const nextImages = acceptedImages
        .filter((file) => !existing.has(`${file.name}:${file.size}`))
        .map((file) => ({
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
        }));

      return {...draft, scoreImages: [...draft.scoreImages, ...nextImages]};
    });
  }, []);

  const removeCustomScoreImage = useCallback((name: string, size: number) => {
    setCustomPieceDraft((draft) => {
      const removed = draft.scoreImages.find((image) => image.name === name && image.size === size);
      if (removed) URL.revokeObjectURL(removed.url);
      return {
        ...draft,
        scoreImages: draft.scoreImages.filter((image) => image.name !== name || image.size !== size),
      };
    });
  }, []);

  const addCustomPiece = useCallback(() => {
    if (isAddingPieceRef.current) return;

    const title = customPieceDraft.title.trim();

    if (!title || customPieceDraft.scoreImages.length === 0) {
      setPieceMessage("Parça eklemek için eser adı ve en az bir nota görseli gerekli.");
      return;
    }

    const visualPieceSignature = customPieceDraft.catalogId
      ? `symbtr-catalog:${customPieceDraft.catalogId}`
      : makeVisualPieceSignature(title, customPieceDraft.scoreImages);
    if (pieceLibrary.some((libraryPiece) => libraryPiece.sourcePageUrl === visualPieceSignature)) {
      setPieceMessage(customPieceDraft.catalogId ? "Bu SymbTr katalog eseri zaten parça listesinde." : "Bu görsel parça zaten parça listesinde.");
      return;
    }

    isAddingPieceRef.current = true;
    setIsAddingPiece(true);

    stopPlayback();
    const customPiece: PieceDefinition = {
      id: `visual-${Date.now()}`,
      title,
      displayTitle: title,
      composer: customPieceDraft.composer.trim() || "Kullanıcı",
      makam: customPieceDraft.makam.trim() || selectedPiece.makam,
      form: customPieceDraft.form.trim() || "Görsel çalışma",
      usul: selectedPiece.usul,
      usulId: selectedPiece.usulId,
      meter: selectedPiece.meter,
      bpm,
      symbtrCatalogId: customPieceDraft.catalogId || undefined,
      symbtrRawUrl: "",
      symbtrPageUrl: "",
      sourcePageUrl: visualPieceSignature,
      referenceSources: [],
      scorePageUrls: customPieceDraft.scoreImages.map((image) => image.url),
      visualMap: createDefaultVisualMap(customPieceDraft.scoreImages.length, {
        notes: "Kullanıcı görselleri için varsayılan satır bantları otomatik üretildi; kesin ölçü hizalaması sonradan düzenlenebilir.",
      }),
      melodicLayers: selectedPiece.melodicLayers,
      percussionLayers: selectedPiece.percussionLayers,
      requiredPercussionSymbols: selectedPiece.requiredPercussionSymbols,
    };

    setRawScore("");
    setScoreError(null);
    setBpm(customPiece.bpm);
    setMelodicLayers([...customPiece.melodicLayers]);
    setPercussionLayers([...customPiece.percussionLayers]);
    setLayerMessage(null);
    setPieceLibrary((pieces) => [...pieces, customPiece]);
    setSelectedPieceId(customPiece.id);
    setCustomPieceDraft({
      title: "",
      composer: "",
      makam: "",
      form: "",
      catalogId: "",
      scoreImages: [],
    });
    setPieceMessage(`${title} görsellerle eklendi ve takip için seçildi.`);
    isAddingPieceRef.current = false;
    setIsAddingPiece(false);
  }, [bpm, customPieceDraft, pieceLibrary, selectedPiece, stopPlayback]);

  const addMelodicLayer = useCallback(() => {
    stopPlayback();
    if (melodicLayers.some((layer) => layer.instrument === layerInstrument)) {
      setLayerMessage(`${getInstrumentLabel(layerInstrument)} zaten ezgi katmanlarında var.`);
      return;
    }

    setMelodicLayers((layers) => {
      const existingIds = new Set(layers.map((layer) => layer.id));
      return [
        ...layers,
        {
          id: makeLayerId(layerInstrument, existingIds),
          label: getInstrumentLabel(layerInstrument),
          instrument: layerInstrument,
          gain: ADDED_MELODIC_LAYER_GAIN,
          delay: layers.length * 0.012,
        },
      ];
    });
    setLayerMessage("Ezgi katmanları otomatik miks dengesiyle çalınır.");
  }, [layerInstrument, melodicLayers, stopPlayback]);

  const removeMelodicLayer = useCallback((id: string) => {
    stopPlayback();
    setMelodicLayers((layers) => (layers.length <= 1 ? layers : layers.filter((layer) => layer.id !== id)));
  }, [stopPlayback]);

  const addPercussionLayer = useCallback(() => {
    stopPlayback();
    if (percussionLayers.some((layer) => layer.instrument === percussionInstrument)) {
      setLayerMessage(`${getInstrumentLabel(percussionInstrument)} zaten vuruş katmanlarında var.`);
      return;
    }

    setPercussionLayers([
      {
        id: makeLayerId(percussionInstrument, new Set()),
        label: getInstrumentLabel(percussionInstrument),
        instrument: percussionInstrument,
      },
    ]);
    setLayerMessage("Vuruş enstrümanı değiştirildi; vurmalı katmanlar üst üste bindirilmez.");
  }, [percussionInstrument, percussionLayers, stopPlayback]);

  const removePercussionLayer = useCallback((id: string) => {
    stopPlayback();
    setPercussionLayers((layers) => layers.filter((layer) => layer.id !== id));
  }, [stopPlayback]);

  useEffect(() => {
    let cancelled = false;

    async function loadScore() {
      if (!selectedPiece.symbtrRawUrl) {
        setRawScore("");
        setScoreError(null);
        return;
      }

      try {
        const response = await fetch(selectedPiece.symbtrRawUrl, {cache: "force-cache"});
        if (!response.ok) throw new Error("SymbTr skoru yüklenemedi");

        const raw = await response.text();
        assertParseableSymbtrScore(raw, selectedPiece.bpm);

        if (!cancelled) {
          setRawScore(raw);
          setScoreError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setRawScore("");
          setScoreError((error as Error).message);
        }
      }
    }

    void loadScore();

    return () => {
      cancelled = true;
    };
  }, [selectedPiece]);

  useEffect(() => {
    let cancelled = false;

    async function loadSamples() {
      try {
        const response = await fetch("/api/samples", {cache: "no-store"});
        if (!response.ok) throw new Error("Sample listesi okunamadı");

        const data = (await response.json()) as SampleApiResponse;
        if (!cancelled) setSampleSlots(data.slots ?? []);
      } catch (error) {
        if (!cancelled) setSampleError((error as Error).message);
      }
    }

    void loadSamples();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

  const playPiece = useCallback(async () => {
    if (!usul || isPlaying || events.length === 0 || melodicLayers.length === 0) return;

    stopAll();
    setIsPlaying(true);
    setPlaybackPosition(0);

    const melodicGainScale = getMelodicGainScale(melodicLayers);
    const notes = events
      .filter((event) => !event.isRest && event.midiNumber !== null)
      .flatMap((event) =>
        melodicLayers.map((layer) => ({
          midiNumber: event.midiNumber!,
          targetFrequency: event.targetFrequency ?? undefined,
          startTime: event.startTime + layer.delay,
          duration: Math.max(event.duration * 0.92, 0.05),
          gain: Math.max(0.025, layer.gain * melodicGainScale),
          instrument: layer.instrument,
        })),
      );

    const percussionHits = percussionLayers.flatMap((percussionLayer) =>
      Array.from({length: Math.ceil(totalBeats / usul.beats)}).flatMap((_, cycleIndex) =>
        playbackUsulHits
          .filter((symbol): symbol is typeof symbol & {symbol: PercussionSymbol} => symbol.symbol !== "")
          .map((symbol) => {
            const startBeat = cycleIndex * usul.beats + symbol.beat - 1;
            if (startBeat >= totalBeats) return null;

            return {
              startTime: startBeat * beatDuration,
              beatDuration: beatDuration * (symbol.timeValue ?? 1),
              symbol: symbol.symbol,
              isAccent: symbol.isAccent,
              percussionInstrument: percussionLayer.instrument,
            };
          })
          .filter((hit) => hit !== null),
      ),
    );

    const scheduledDuration = await playArrangement(notes, percussionHits, melodicLayers[0].instrument);

    if (scheduledDuration <= 0) {
      stopPlayback();
      return;
    }

    const startAt = performance.now();
    const animate = () => {
      setPlaybackPosition((performance.now() - startAt) / 1000);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    stopTimerRef.current = window.setTimeout(stopPlayback, (scheduledDuration + 0.4) * 1000);
  }, [
    beatDuration,
    events,
    isPlaying,
    melodicLayers,
    percussionLayers,
    playbackUsulHits,
    stopPlayback,
    totalBeats,
    usul,
  ]);

  return (
    <UnifiedLayout>
      <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 ${tokens.colors.background.base}`}>
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">{selectedPiece.displayTitle}</h1>
            <p className={`mt-2 text-sm ${tokens.colors.text.secondary}`}>
              {selectedPiece.composer} · {selectedPiece.makam} · {selectedPiece.form} · {selectedPiece.usul} {selectedPiece.meter}
              {selectedPiece.playbackAhenk ? ` · Ahenk: ${selectedPiece.playbackAhenk.label}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-label={isPlaying ? "Durdur" : "Parçayı çal"}
              onClick={isPlaying ? stopPlayback : playPiece}
              disabled={!isPlaying && (events.length === 0 || melodicLayers.length === 0)}
              className="inline-flex cursor-pointer items-center justify-center rounded-md bg-[var(--color-primary-500)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPlaying ? "Durdur" : "Parçayı Çal"}
            </button>
            {selectedPiece.playbackAhenk && <Pill tone="secondary">{selectedPiece.playbackAhenk.referencePitch}</Pill>}
            <Pill>{bpm} BPM</Pill>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <Panel className="min-w-0">
              <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Kaynak nota</p>
                  <p className={`text-sm ${tokens.colors.text.primary}`}>
                    Görsel nota sayfaları; varsa SymbTr sembolik skor verisiyle otomatik takip
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap gap-2">
                  {referenceSources.length > 0 ? (
                    referenceSources.map((source) => (
                      <a
                        key={source.id}
                        className="text-sm text-[var(--color-primary-600)] underline"
                        href={source.url}
                        title={source.title ?? source.label}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {source.label}
                      </a>
                    ))
                  ) : (
                    <>
                      {isHttpUrl(selectedPiece.sourcePageUrl) && (
                        <a className="text-sm text-[var(--color-primary-600)] underline" href={selectedPiece.sourcePageUrl} target="_blank" rel="noreferrer">
                          Nota kaynağı
                        </a>
                      )}
                      {isHttpUrl(selectedPiece.symbtrPageUrl) && (
                        <a className="text-sm text-[var(--color-primary-600)] underline" href={selectedPiece.symbtrPageUrl} target="_blank" rel="noreferrer">
                          SymbTr
                        </a>
                      )}
                      {selectedPiece.referenceRecordingUrl && (
                        <a className="text-sm text-[var(--color-primary-600)] underline" href={selectedPiece.referenceRecordingUrl} target="_blank" rel="noreferrer">
                          Referans kayıt
                        </a>
                      )}
                    </>
                  )}
                </div>
                {selectedSymbTrSourceReferences.length > 0 && (
                  <details className="mt-3 w-full min-w-0 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm">
                    <summary className="cursor-pointer font-medium text-[var(--color-text-primary)]">
                      Yerel SymbTr kaynakları: {selectedSymbTrSourceReferences.filter((source) => source.access === "local-archive").length} format
                    </summary>
                    <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                      {selectedSymbTrSourceReferences.map((source) => (
                        <div
                          key={source.id}
                          className="min-w-0 rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate font-medium text-[var(--color-text-primary)]">{source.label}</span>
                            <span className="text-xs text-[var(--color-text-secondary)]">{source.canonical ? "kanonik" : "referans"}</span>
                          </div>
                          {source.archiveMemberPath ? (
                            <p className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--color-text-secondary)]" title={source.archiveMemberPath}>
                              {source.archiveMemberPath}
                            </p>
                          ) : source.url ? (
                            <a
                              className="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-[var(--color-primary-600)] underline"
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {source.url}
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              <div className="max-h-[680px] overflow-auto rounded border border-[var(--color-border-subtle)] bg-white">
                {selectedPiece.scorePageUrls.length > 0 ? (
                  selectedPiece.scorePageUrls.map((url, index) => {
                    const activePage = activeVisualPageIndex === index;
                    const pageBands = selectedPiece.visualMap?.staffBands.filter((band) => band.pageIndex === index) ?? [];
                    const pageMeasureSegments = visualMeasureSegments.filter((segment) => segment.pageIndex === index);

                    return (
                      <div
                        key={url}
                        aria-current={activePage ? "page" : undefined}
                        className={`relative border-b bg-white ${
                          activePage
                            ? "border-[var(--color-primary-400)] ring-2 ring-inset ring-[var(--color-primary-300)]"
                            : "border-[var(--color-border-subtle)]"
                        }`}
                      >
                        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-white/95 px-3 py-2 text-xs backdrop-blur">
                          <span className="font-medium text-[var(--color-text-primary)]">{index + 1}. sayfa</span>
                          <span className={activePage ? "text-[var(--color-primary-700)]" : tokens.colors.text.secondary}>
                            {activePage ? "aktif takip" : "bekliyor"}
                          </span>
                        </div>
                        {activePage && (
                          <div className="h-1 bg-[var(--color-primary-100)]">
                            <div
                              className="h-full bg-[var(--color-primary-500)] transition-[width]"
                              style={{width: `${activeVisualBandProgress}%`}}
                            />
                          </div>
                        )}
                        <div className="relative mx-auto max-w-[980px]">
                          {pageBands.map((band) => {
                            const activeBand = activeVisualBand?.id === band.id;
                            return (
                              <div
                                key={band.id}
                                aria-hidden="true"
                                className={`pointer-events-none absolute z-10 rounded-sm border transition-colors ${
                                  activeBand
                                    ? "border-[var(--color-primary-500)] bg-[var(--color-primary-100)]/35 shadow-[0_0_0_1px_var(--color-primary-300)]"
                                    : "border-transparent"
                                }`}
                                style={{
                                  left: `${band.leftPercent}%`,
                                  width: `${band.widthPercent}%`,
                                  top: `${band.topPercent}%`,
                                  height: `${band.heightPercent}%`,
                                }}
                              >
                                {activeBand && VISUAL_GUIDE_TICKS.map((tick) => (
                                  <span
                                    key={tick}
                                    className="absolute top-0 h-full w-px bg-[var(--color-primary-300)]/55"
                                    style={{left: `${tick * 100}%`}}
                                  />
                                ))}
                              </div>
                            );
                          })}
                          {pageMeasureSegments.map((segment) => {
                            const activeMeasure = activeVisualMeasureSegment?.id === segment.id;
                            return (
                              <div
                                key={segment.id}
                                aria-hidden="true"
                                className={`pointer-events-none absolute z-20 rounded-sm border-l transition-colors ${
                                  activeMeasure
                                    ? "border-l-[var(--color-primary-700)] bg-[var(--color-primary-200)]/25"
                                    : "border-l-[var(--color-primary-300)]/70 bg-transparent"
                                }`}
                                style={{
                                  left: `${segment.leftPercent}%`,
                                  width: `${segment.widthPercent}%`,
                                  top: `${segment.topPercent}%`,
                                  height: `${segment.heightPercent}%`,
                                }}
                              />
                            );
                          })}
                          {activePage && activeVisualBand && activeVisualBeatPosition && (
                            <div
                              aria-hidden="true"
                              className="pointer-events-none absolute z-20 -translate-x-1/2"
                              style={{
                                left: `${activeVisualBeatPosition.xPercent}%`,
                                top: `${activeVisualBand.topPercent}%`,
                                height: `${activeVisualBand.heightPercent}%`,
                              }}
                            >
                              <span className="block h-full w-0.5 rounded-full bg-[var(--color-primary-700)] shadow-[0_0_0_2px_rgba(255,255,255,0.92)]" />
                              <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[var(--color-primary-700)] shadow-[0_0_0_2px_rgba(255,255,255,0.92)]" />
                            </div>
                          )}
                          {/* eslint-disable-next-line @next/next/no-img-element -- Keep the source notation image untouched; optimization can alter remote GIF rendering. */}
                          <img
                            src={url}
                            alt={`${selectedPiece.displayTitle} kaynak nota sayfası ${index + 1}`}
                            className="block w-full bg-white"
                            loading={index === 0 ? "eager" : "lazy"}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="grid min-h-48 place-items-center px-4 text-center text-sm text-[var(--color-text-secondary)]">
                    Bu parça için nota görseli eklenmedi; takip SymbTr olay şeridi üzerinden yapılır.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Sayfa eşleme</p>
                    <p className={`text-sm ${tokens.colors.text.secondary}`}>
                      Vuruş ilerlemesi görsel sayfa ve satır bantlarına bağlanır; aktif satır kaynak notada işaretlenir.
                    </p>
                  </div>
                  <Pill tone={currentEvent ? "success" : "secondary"}>
                    {activeVisualPageIndex >= 0 ? `${activeVisualPageIndex + 1}. sayfa / ${selectedPiece.scorePageUrls.length}` : "Görsel yok"}
                  </Pill>
                </div>
                {activeVisualBand && (
                  <div className="mt-3 rounded-md border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] px-3 py-2 text-sm text-[var(--color-primary-700)]">
                    Aktif satır: {activeVisualBand.label} · {formatBeatLabel(activeVisualBand.startBeat + 1)}-{formatBeatLabel(activeVisualBand.endBeat)}. vuruş
                  </div>
                )}
                {activeVisualBeatPosition && (
                  <div className="mt-2 rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                    Takip noktası: {activeVisualBeatPosition.label} · x {Math.round(activeVisualBeatPosition.xPercent)}% / y {Math.round(activeVisualBeatPosition.yPercent)}% · satır %{Math.round(activeVisualBeatPosition.progressPercent)}
                  </div>
                )}
                {activeVisualMeasureSegment && (
                  <div className="mt-2 rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                    Aktif ölçü: {activeVisualMeasureSegment.measureIndex}. ölçü · {formatBeatLabel(activeVisualMeasureSegment.startBeat + 1)}-{formatBeatLabel(activeVisualMeasureSegment.endBeat)}. vuruş
                  </div>
                )}
                {selectedSymbTrPdfLayout && (
                  <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    PDF vektör ölçü adayları: {selectedSymbTrPdfLayout.summary.measureCandidateCount} aday · {selectedSymbTrPdfLayout.summary.staffRowCount} porte satırı · doğrulama bekliyor.
                    <p className="mt-1 text-xs text-amber-800">
                      Kaynak: {selectedSymbTrPdfLayout.source.archiveMemberPath}. Bu veriler kesin ölçü kutusu olarak işaretlenmez.
                    </p>
                    {selectedSymbTrPdfLayoutVerificationStatus && (
                      <p className="mt-1 text-xs text-amber-800">
                        Doğrulanmış PDF ölçü kutusu: {selectedSymbTrPdfLayoutVerificationStatus.verifiedMeasureBoxCount} · durum {selectedSymbTrPdfLayoutVerificationStatus.status}.
                      </p>
                    )}
                    {activeVerifiedPdfMeasureBox && (
                      <p className="mt-1 text-xs font-medium text-emerald-800">
                        Aktif doğrulanmış PDF ölçüsü: {activeVerifiedPdfMeasureBox.measureIndex}. ölçü · {activeVerifiedPdfMeasureBox.method} · {activeVerifiedPdfMeasureBox.reviewer}.
                      </p>
                    )}
                  </div>
                )}
                {selectedSymbTrPdfLayout && selectedSymbTrVerifiedPdfMeasureBoxes.length > 0 && (
                  <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase text-emerald-900">Doğrulanmış PDF ölçü haritası</p>
                      <span className="text-xs text-emerald-800">
                        {selectedSymbTrVerifiedPdfMeasureBoxes.length} kutu · {selectedSymbTrPdfLayout.source.archiveMemberPath}
                      </span>
                    </div>
                    <div
                      aria-label="Doğrulanmış PDF ölçü kutuları"
                      className="relative mt-3 w-full overflow-hidden rounded-sm border border-emerald-300 bg-white"
                      style={{
                        aspectRatio: `${selectedSymbTrPdfLayout.pageSize.width} / ${selectedSymbTrPdfLayout.pageSize.height}`,
                      }}
                    >
                      {selectedSymbTrVerifiedPdfMeasureBoxes.map((box) => {
                        const activeBox = activeVerifiedPdfMeasureBox?.measureIndex === box.measureIndex;

                        return (
                          <div
                            key={`verified-pdf-measure-${box.measureIndex}`}
                            aria-hidden="true"
                            className={`pointer-events-none absolute rounded-[2px] border ${
                              activeBox
                                ? "border-emerald-700 bg-emerald-300/35 shadow-[0_0_0_2px_rgba(255,255,255,0.9)]"
                                : "border-emerald-500/80 bg-emerald-200/20"
                            }`}
                            style={{
                              left: `${box.leftPercent}%`,
                              top: `${box.topPercent}%`,
                              width: `${box.widthPercent}%`,
                              height: `${box.heightPercent}%`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {selectedPiece.scorePageUrls.length > 0 && (
                  <div className="mt-3 grid gap-2" style={{gridTemplateColumns: `repeat(${selectedPiece.scorePageUrls.length}, minmax(0, 1fr))`}}>
                    {selectedPiece.scorePageUrls.map((url, index) => {
                      const activePage = activeVisualPageIndex === index;
                      return (
                        <div
                          key={`page-map-${url}`}
                          className={`overflow-hidden rounded border text-center text-xs ${
                            activePage
                              ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                              : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)]"
                          }`}
                        >
                          <div className="px-2 py-2">{index + 1}. sayfa</div>
                          <div className="h-1 bg-[var(--color-bg-muted)]">
                            <div
                              className="h-full bg-[var(--color-primary-500)] transition-[width]"
                              style={{width: activePage ? `${activeVisualBandProgress}%` : "0%"}}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Yakın notalar</p>
                  <span className={`text-xs ${tokens.colors.text.secondary}`}>
                    {currentEvent ? `${currentEvent.index}. olay` : "Hazır"}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {visibleScoreEvents.length > 0 ? visibleScoreEvents.map((event) => {
                    const active = currentEvent?.index === event.index && currentEvent.startTime === event.startTime;

                    return (
                      <div
                        key={`${event.index}-${event.startTime}`}
                        aria-current={active ? "true" : undefined}
                        className={`min-w-40 rounded-md border p-2 text-sm transition-colors ${
                          active
                            ? "border-[var(--color-primary-500)] bg-[var(--color-primary-100)] text-[var(--color-primary-700)] shadow-sm"
                            : "border-[var(--color-border-subtle)] bg-white text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px] tabular-nums">
                          <span>#{event.index}</span>
                          <span>{(event.startBeat + 1).toFixed(event.startBeat % 1 === 0 ? 0 : 2)}. vuruş</span>
                        </div>
                    <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
                      <span className="text-xl" aria-hidden="true">{event.notationSymbol}</span>
                      <span>{event.isRest ? "Es" : event.solfegePitch ?? event.sourcePitch}</span>
                    </p>
                    <p className="mt-1 text-xs">
                      SymbTr {event.sourcePitch} · {event.playbackPitch ?? "Sustain"} · {event.durationBeats.toFixed(event.durationBeats % 1 === 0 ? 0 : 2)} süre
                    </p>
                      </div>
                );
                  }) : (
                    <div className="min-w-full rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-4 text-sm text-[var(--color-text-secondary)]">
                      Bu parça görsel nota olarak eklendi; otomatik olay şeridi için daha sonra MusicXML veya SymbTr eşlemesi bağlanabilir.
                    </div>
                  )}
                </div>
              </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel>
                <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Takip</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className={`text-2xl font-bold ${tokens.colors.text.primary}`}>{currentSection}</p>
                    <p className="mt-2 flex items-center gap-3 text-4xl font-bold text-[var(--color-primary-700)]" aria-live="polite">
                      <span className="text-5xl leading-none" aria-hidden="true">
                        {currentEvent?.notationSymbol ?? "♩"}
                      </span>
                      <span>{currentEvent?.isRest ? "Es" : currentEvent?.solfegePitch ?? "Hazır"}</span>
                    </p>
                    <p className={`mt-2 text-sm ${tokens.colors.text.secondary}`}>
                      {currentEvent
                        ? `${currentEvent.index}. olay · ${(currentEvent.startBeat + 1).toFixed(currentEvent.startBeat % 1 === 0 ? 0 : 2)}. vuruş`
                        : "Parça çalmaya hazır"} · {formatTime(playbackPosition)} / {formatTime(totalDuration)}
                    </p>
                    <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                      {activeVisualPageIndex >= 0
                        ? `Görsel ${activeVisualPageIndex + 1}. sayfa / ${selectedPiece.scorePageUrls.length} · satır ilerleme %${Math.round(activeVisualBandProgress)} · ölçü ${activeVisualMeasureSegment?.measureIndex ?? "-"}`
                        : "Görsel sayfa eklenmedi"}
                    </p>
                    <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                      {usul
                        ? `Usul ${usul.name} · ${selectedPiece.meter} · darp ${activeUsulHit?.syllable ?? activeUsulHit?.symbol ?? "-"} (${formatBeatLabel(currentCycleBeat)}. vuruş)`
                        : "Usul eşleşmesi yok"}
                    </p>
                    {currentEvent && (
                      <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                        SymbTr {currentEvent.sourcePitch} · Batı perde {currentEvent.playbackPitch ?? "Sustain"}
                      </p>
                    )}
                    <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                      {currentEvent?.koma53 !== null && currentEvent?.koma53 !== undefined
                        ? `SymbTr Koma53 ${currentEvent.koma53} · Çalım Koma53 ${currentPlaybackKoma53} · ${formatFrequency(currentEvent.targetFrequency)}`
                        : "Koma53 bekleniyor"}
                    </p>
                  </div>
                  <Pill tone={isPlaying ? "success" : "secondary"}>{isPlaying ? "Çalıyor" : "Hazır"}</Pill>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary-500)] transition-[width]"
                    style={{width: `${progress}%`}}
                  />
                </div>

                <div className="mt-5 grid grid-cols-4 gap-2">
                  {Array.from({length: Math.max(1, Math.ceil(totalBeats / 28))}).map((_, index) => {
                    const start = index * 28;
                    const active = currentBeat >= start && currentBeat < start + 28;

                    return (
                      <div
                        key={index}
                        className={`rounded-md border px-3 py-2 text-sm ${
                          active
                            ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                            : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {index + 1}. devir
                      </div>
                    );
                  })}
                </div>
            </Panel>

            <Panel>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Hız</p>
                    <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
                      Tempo değişince nota süreleri ve vuruş çizgisi birlikte yeniden hesaplanır.
                    </p>
                  </div>
                  <Pill>{bpm} BPM</Pill>
                </div>
                <input
                  aria-label="BPM"
                  type="range"
                  min={MIN_BPM}
                  max={MAX_BPM}
                  step={1}
                  value={bpm}
                  onChange={(event) => handleBpmChange(Number(event.target.value))}
                  className="mt-4 w-full accent-[var(--color-primary-500)]"
                />
                <div className="mt-3 flex items-center gap-3">
                  <input
                    aria-label="BPM değeri"
                    type="number"
                    min={MIN_BPM}
                    max={MAX_BPM}
                    value={bpm}
                    onChange={(event) => handleBpmChange(Number(event.target.value))}
                    className="w-24 rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)]"
                  />
                  <span className={`text-xs ${tokens.colors.text.secondary}`}>{MIN_BPM}-{MAX_BPM} BPM</span>
                </div>
            </Panel>

            <Panel>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Parça ekle</p>
                    <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
                      Bu bölüm takip edilecek eserin nota görsellerini ekler; TXT bağlantısı gerekmez.
                    </p>
                  </div>
                  <Pill tone="secondary">{pieceLibrary.length} parça</Pill>
                </div>

                <label className="mt-3 grid gap-1 text-sm">
                  <span className={tokens.colors.text.secondary}>Aktif parça</span>
                  <select
                    aria-label="Aktif parça seç"
                    value={selectedPiece.id}
                    onChange={(event) => selectPiece(event.target.value)}
                    className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
                  >
                    {pieceLibrary.map((libraryPiece) => (
                      <option key={libraryPiece.id} value={libraryPiece.id}>
                        {libraryPiece.displayTitle} · {libraryPiece.composer}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="mt-4 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">SymbTr katalog</p>
                      <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                        {SYMBTR_CATALOG_COUNT} yerel eser; sonuçlar kanonik ID ile tekilleştirilir.
                      </p>
                    </div>
                    {customPieceDraft.catalogId && <Pill tone="success">Eşlendi</Pill>}
                  </div>
                  <label className="mt-3 grid gap-1 text-sm">
                    <span className={tokens.colors.text.secondary}>Katalog ara</span>
                    <input
                      aria-label="SymbTr katalog ara"
                      value={catalogQuery}
                      onChange={(event) => setCatalogQuery(event.target.value)}
                      className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
                      placeholder="Makam, usul, eser adı veya besteci"
                    />
                  </label>
                  {catalogResults.length > 0 && (
                    <div className="mt-3 grid gap-2">
                      {catalogResults.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          aria-label={`Katalogdan doldur ${entry.id}`}
                          onClick={() => applyCatalogEntry(entry)}
                          className="rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-left text-sm hover:border-[var(--color-primary-300)]"
                        >
                          <span className="block font-medium text-[var(--color-text-primary)]">{getCatalogEntryDisplay(entry)}</span>
                          <span className={`mt-1 block text-xs ${tokens.colors.text.secondary}`}>
                            {entry.id} · {entry.formats.join(", ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className={tokens.colors.text.secondary}>Eser adı</span>
                    <input
                      aria-label="Eser adı"
                      value={customPieceDraft.title}
                      onChange={(event) => updateCustomPieceDraft("title", event.target.value)}
                      className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
                      placeholder="Örn. Rast Peşrev"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className={tokens.colors.text.secondary}>Besteci</span>
                    <input
                      aria-label="Besteci"
                      value={customPieceDraft.composer}
                      onChange={(event) => updateCustomPieceDraft("composer", event.target.value)}
                      className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
                      placeholder="Opsiyonel"
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className={tokens.colors.text.secondary}>Makam</span>
                    <input
                      aria-label="Makam"
                      value={customPieceDraft.makam}
                      onChange={(event) => updateCustomPieceDraft("makam", event.target.value)}
                      className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
                      placeholder={selectedPiece.makam}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span className={tokens.colors.text.secondary}>Form</span>
                    <input
                      aria-label="Form"
                      value={customPieceDraft.form}
                      onChange={(event) => updateCustomPieceDraft("form", event.target.value)}
                      className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
                      placeholder="Eser"
                    />
                  </label>
                  <label className="col-span-2 grid gap-1 text-sm">
                    <span className={tokens.colors.text.secondary}>Nota görselleri</span>
                    <input
                      aria-label="Nota görselleri"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      onChange={(event) => {
                        handleCustomScoreImages(event.currentTarget.files);
                        event.currentTarget.value = "";
                      }}
                      className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                {customPieceDraft.scoreImages.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {customPieceDraft.scoreImages.map((image) => (
                      <div
                        key={`${image.name}-${image.size}`}
                        className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border-subtle)] bg-white px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-[var(--color-text-primary)]">{image.name}</span>
                        <button
                          type="button"
                          onClick={() => removeCustomScoreImage(image.name, image.size)}
                          className="shrink-0 text-[var(--color-error)]"
                        >
                          Kaldır
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={addCustomPiece}
                  disabled={isAddingPiece}
                  className="mt-4 w-full rounded-md bg-[var(--color-primary-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-600)]"
                >
                  {isAddingPiece ? "Ekleniyor" : "Parçayı ekle ve seç"}
                </button>
                {pieceMessage && (
                  <div className="mt-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                    {pieceMessage}
                  </div>
                )}
            </Panel>

            <Panel>
                <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Çalınan katmanlar</p>
                <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
                  Aynı enstrüman ikinci kez eklenmez; ezgi katmanları çalarken toplam gain {MELODIC_MIX_GAIN_CEILING.toFixed(2)} tavanına göre dengelenir. Vurmalı çalgı tek katman olarak değiştirilir.
                </p>
                <div className="mt-3 grid gap-3">
                  <div className="flex gap-2">
                    <select
                      aria-label="Melodik enstrüman ekle"
                      value={layerInstrument}
                      onChange={(event) => setLayerInstrument(event.target.value as InstrumentType)}
                      className="min-w-0 flex-1 rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
                    >
                      {melodicInstrumentItems.map((instrument) => (
                        <option key={instrument.id} value={instrument.id}>{instrument.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addMelodicLayer}
                      className="rounded-md bg-[var(--color-primary-500)] px-3 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-600)]"
                    >
                      Ekle
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <select
                      aria-label="Vurmalı enstrüman ekle"
                      value={percussionInstrument}
                      onChange={(event) => setPercussionInstrument(event.target.value as InstrumentType)}
                      className="min-w-0 flex-1 rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm"
                    >
                      {percussionInstrumentItems.map((instrument) => (
                        <option key={instrument.id} value={instrument.id}>{instrument.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={addPercussionLayer}
                      className="rounded-md border border-[var(--color-border-default)] px-3 py-2 text-sm font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-bg-muted)]"
                    >
                      Değiştir
                    </button>
                  </div>
                </div>

                {layerMessage && (
                  <div className="mt-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
                    {layerMessage}
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {melodicLayers.map((layer) => (
                    <div key={layer.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border-subtle)] px-3 py-2 text-sm">
                      <span>{layer.label} · ezgi</span>
                      <button
                        type="button"
                        onClick={() => removeMelodicLayer(layer.id)}
                        disabled={melodicLayers.length <= 1}
                        className="text-[var(--color-error)] disabled:opacity-40"
                      >
                        Kaldır
                      </button>
                    </div>
                  ))}
                  {percussionLayers.map((layer) => (
                    <div key={layer.id} className="flex items-center justify-between gap-3 rounded-md border border-[var(--color-border-subtle)] px-3 py-2 text-sm">
                      <span>{layer.label} · vuruş</span>
                      <button
                        type="button"
                        onClick={() => removePercussionLayer(layer.id)}
                        className="text-[var(--color-error)]"
                      >
                        Kaldır
                      </button>
                    </div>
                  ))}
                </div>

                {layerSampleMessages.length > 0 && (
                  <div className="mt-4 space-y-1 text-sm text-[var(--color-text-secondary)]">
                    {layerSampleMessages.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                )}

                {(sampleError || scoreError) && (
                  <p className="mt-4 text-sm text-[var(--color-error)]">
                    {sampleError ?? scoreError}
                  </p>
                )}
            </Panel>

            {sectionMarkers.length > 0 && (
              <Panel>
                  <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Bölümler</p>
                  <div className="mt-3 space-y-2">
                    {sectionMarkers.map((event) => (
                      <div key={event.index} className="flex items-center justify-between text-sm">
                        <span className={tokens.colors.text.primary}>{event.section}</span>
                        <span className={tokens.colors.text.secondary}>{formatTime(event.startTime)}</span>
                      </div>
                    ))}
                  </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </UnifiedLayout>
  );
}
