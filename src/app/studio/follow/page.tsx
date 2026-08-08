"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {UnifiedLayout} from "@/shared/ui/layout/UnifiedLayout";
import {
  PIECE_LIBRARY,
  getCurrentScoreEvent,
  parseSymbtrScore,
  type PieceDefinition,
  type PieceLayer,
  type PiecePercussionLayer,
} from "@/data/pieces/hicazkarPesrev";
import {
  createDefaultVisualMap,
  createVisualMeasureSegments,
  getActiveVisualMeasureSegment,
  getVisualBeatPosition,
  isExactVisualMap,
} from "@/data/pieces/visual-map";
import {getHeardPlaybackPosition, normalizePercussionSymbol, playArrangement, stopAll, type InstrumentType, type PercussionSymbol} from "@/engines/ses/engine";
import {USUL_DATA, getUsulBeatDuration} from "@/engines/usul/data";
import {INSTRUMENTS, MELODIC_INSTRUMENTS, PERCUSSION_INSTRUMENTS} from "@/lib/app-constants";
import {tokens} from "@/shared/tokens";
import type {SymbTrCatalogEntry} from "@/data/symbtr/catalog";
import {useSymbtrPieceBundle} from "@/features/studio/useSymbtrPieceBundle";
import {useSymbtrCatalogSearch} from "@/features/studio/useSymbtrCatalogSearch";
import {Panel, Pill} from "./parts/FollowPrimitives";
import {FollowScorePanel} from "./parts/FollowScorePanel";
import {TempoControl} from "./parts/TempoControl";
import {FollowCuePanel} from "./parts/FollowCuePanel";
import {FollowLayersPanel} from "./parts/FollowLayersPanel";
import {FollowPieceAddPanel} from "./parts/FollowPieceAddPanel";
import {StudioTabs} from "@/features/studio/StudioTabs";
import {VolumeControl, usePlaybackVolume} from "@/shared/ui/organisms/VolumeControl";
import {
  ADDED_MELODIC_LAYER_GAIN,
  DEFAULT_PIECE,
  assertParseableSymbtrScore,
  clamp,
  clampBpm,
  estimateScorePageIndex,
  estimateScorePageProgress,
  formatCatalogSegment,
  formatTime,
  getActiveVisualBand,
  getInstrumentLabel,
  getMelodicGainScale,
  getPlaybackEventPosition,
  getSectionAt,
  hasMelodicSamples,
  hasPercussionSamples,
  isHttpUrl,
  makeLayerId,
  makeVisualPieceSignature,
  type CustomPieceDraft,
  type DisplayUsulHit,
  type SampleApiResponse,
  type SampleSlotStatus,
} from "./parts/follow-helpers";

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
  const [volume, setVolume] = usePlaybackVolume();
  /** Katman bazli sessize alma (id listesi). */
  const [mutedLayerIds, setMutedLayerIds] = useState<string[]>([]);
  /** Yalniz bu katman calar; tekrar tiklayinca temizlenir. */
  const [soloLayerId, setSoloLayerId] = useState<string | null>(null);

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
  const activeVisualNoteLabel = currentEvent
    ? currentEvent.isRest
      ? "Es"
      : currentEvent.solfegePitch ?? currentEvent.sourcePitch
    : null;
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
  const pieceBundle = useSymbtrPieceBundle(selectedPiece.symbtrCatalogId ?? null);
  const catalogSearch = useSymbtrCatalogSearch(catalogQuery);

  const referenceSources = (
    selectedPiece.symbtrCatalogId
      ? pieceBundle.data?.externalReferences ?? []
      : selectedPiece.referenceSources ?? []
  ).filter((source) => isHttpUrl(source.url));
  const selectedSymbTrSourceReferences = pieceBundle.data?.sourceReferences ?? [];
  const selectedSymbTrPdfLayout = pieceBundle.data?.layout ?? null;
  const selectedSymbTrPdfLayoutVerificationStatus =
    pieceBundle.data?.verificationStatus ?? null;
  const visualTrackingIsExact = isExactVisualMap(selectedPiece.visualMap);
  const selectedSymbTrVerifiedPdfMeasureBoxes =
    pieceBundle.data?.verifiedMeasureBoxes ?? [];
  const activeVerifiedPdfMeasureBox =
    selectedSymbTrVerifiedPdfMeasureBoxes.find(
      (box) => box.measureIndex === activeVisualMeasureSegment?.measureIndex,
    ) ?? null;
  const catalogResults = catalogSearch.data?.entries ?? [];
  const symbtrCatalogCount = pieceBundle.data?.catalogCount ?? catalogSearch.data?.catalogCount ?? null;

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
      // Nazariyat darplari (te/ka/ta/hek) calinabilir sample ailesine indirgenir.
      symbol: normalizePercussionSymbol(hit.symbol),
      isAccent: hit.isAccent,
      timeValue: hit.timeValue,
      syllable: hit.syllable ?? (hit.symbol || "-"),
    }));
  }, [selectedPiece.usulHits, usul]);
  const currentCycleBeat = usul ? (currentBeat % usul.beats) + 1 : 0;
  const activeUsulHit = playbackUsulHits.find(
    (hit) => currentCycleBeat >= hit.beat && currentCycleBeat < hit.beat + Math.max(hit.timeValue ?? 1, 0.5),
  );
  const melodicInstrumentItems = useMemo(
    () =>
      INSTRUMENTS.filter((instrument) => (MELODIC_INSTRUMENTS as readonly string[]).includes(instrument.id)).map(
        (instrument) => ({
          id: instrument.id as InstrumentType,
          label: instrument.nameTr,
        }),
      ),
    [],
  );
  const percussionInstrumentItems = useMemo(
    () =>
      INSTRUMENTS.filter((instrument) => (PERCUSSION_INSTRUMENTS as readonly string[]).includes(instrument.id)).map(
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
        notes: "Kullanıcı görselleri için varsayılan satır bantları otomatik üretildi; nota başı ve ölçü hizalaması doğrulanmış değildir.",
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

    const mutedSet = new Set(mutedLayerIds);
    const activeMelodicLayers = soloLayerId
      ? melodicLayers.filter((layer) => layer.id === soloLayerId)
      : melodicLayers.filter((layer) => !mutedSet.has(layer.id));
    // Solo secili ama katman kaldirilmis/aktif degilse sessiz olmayanlara
    // donulur; hicbir katman kalmadiysa calma baslamaz.
    const effectiveMelodicLayers =
      activeMelodicLayers.length > 0
        ? activeMelodicLayers
        : melodicLayers.filter((layer) => !mutedSet.has(layer.id));
    const activePercussionLayers = soloLayerId
      ? percussionLayers.filter((layer) => layer.id === soloLayerId)
      : percussionLayers.filter((layer) => !mutedSet.has(layer.id));
    if (effectiveMelodicLayers.length === 0 && activePercussionLayers.length === 0) return;

    stopAll();
    setIsPlaying(true);
    setPlaybackPosition(0);

    const melodicGainScale = getMelodicGainScale(effectiveMelodicLayers);
    const notes = events
      .filter((event) => !event.isRest && event.midiNumber !== null)
      .flatMap((event) =>
        effectiveMelodicLayers.map((layer) => ({
          midiNumber: event.midiNumber!,
          targetFrequency: event.targetFrequency ?? undefined,
          startTime: event.startTime + layer.delay,
          duration: Math.max(event.duration * 0.92, 0.05),
          gain: Math.max(0.025, layer.gain * melodicGainScale),
          instrument: layer.instrument,
        })),
      );

    const percussionHits = activePercussionLayers.flatMap((percussionLayer) =>
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

    const {durationSeconds, baseTime} = await playArrangement(
      notes,
      percussionHits,
      effectiveMelodicLayers[0]?.instrument ?? "ud",
      {gainScale: volume},
    );

    if (durationSeconds <= 0) {
      stopPlayback();
      return;
    }

    // Imlec SES SAATINDEN okunur (D6): `performance.now()` duvar saatidir, ses
    // ise `context.currentTime` uzerinden planlanir; ikisi ayristikca imlec
    // kayiyor ve cikis gecikmesi (~53 ms) hic dusulmuyordu. Ritim motorundaki
    // `heardContextTime` deseni burada da kullanilir.
    const animate = () => {
      setPlaybackPosition(getHeardPlaybackPosition(baseTime));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    stopTimerRef.current = window.setTimeout(stopPlayback, (durationSeconds + 0.4) * 1000);
  }, [
    beatDuration,
    events,
    isPlaying,
    melodicLayers,
    mutedLayerIds,
    percussionLayers,
    playbackUsulHits,
    soloLayerId,
    stopPlayback,
    totalBeats,
    usul,
    volume,
  ]);

  const toggleMuteLayer = useCallback((layerId: string) => {
    setMutedLayerIds((current) =>
      current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId],
    );
  }, []);

  const toggleSoloLayer = useCallback((layerId: string) => {
    setSoloLayerId((current) => (current === layerId ? null : layerId));
  }, []);

  return (
    <UnifiedLayout>
      <StudioTabs />
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
          <FollowScorePanel
            activeVerifiedPdfMeasureBox={activeVerifiedPdfMeasureBox}
            activeVisualBand={activeVisualBand}
            activeVisualBandProgress={activeVisualBandProgress}
            activeVisualBeatPosition={activeVisualBeatPosition}
            activeVisualMeasureSegment={activeVisualMeasureSegment}
            activeVisualNoteLabel={activeVisualNoteLabel}
            activeVisualPageIndex={activeVisualPageIndex}
            currentEvent={currentEvent}
            referenceSources={referenceSources}
            selectedPiece={selectedPiece}
            selectedSymbTrPdfLayout={selectedSymbTrPdfLayout}
            selectedSymbTrPdfLayoutVerificationStatus={selectedSymbTrPdfLayoutVerificationStatus}
            selectedSymbTrSourceReferences={selectedSymbTrSourceReferences}
            selectedSymbTrVerifiedPdfMeasureBoxes={selectedSymbTrVerifiedPdfMeasureBoxes}
            visibleScoreEvents={visibleScoreEvents}
            visualMeasureSegments={visualMeasureSegments}
            visualTrackingIsExact={visualTrackingIsExact}
          />

          <div className="flex flex-col gap-4">
            <FollowCuePanel
              currentSection={currentSection}
              currentEvent={currentEvent}
              playbackPosition={playbackPosition}
              totalDuration={totalDuration}
              activeVisualPageIndex={activeVisualPageIndex}
              scorePageCount={selectedPiece.scorePageUrls.length}
              visualTrackingIsExact={visualTrackingIsExact}
              activeVisualBandProgress={activeVisualBandProgress}
              activeMeasureIndex={activeVisualMeasureSegment?.measureIndex ?? null}
              usulName={usul?.name ?? null}
              meter={selectedPiece.meter}
              activeUsulHit={activeUsulHit}
              currentCycleBeat={currentCycleBeat}
              currentPlaybackKoma53={currentPlaybackKoma53}
              isPlaying={isPlaying}
              progress={progress}
              totalBeats={totalBeats}
              currentBeat={currentBeat}
            />

            <TempoControl bpm={bpm} onBpmChange={handleBpmChange} />

            <VolumeControl volume={volume} onVolumeChange={setVolume} />

            <FollowPieceAddPanel
              pieceLibrary={pieceLibrary}
              selectedPieceId={selectedPiece.id}
              selectedPieceMakam={selectedPiece.makam}
              onSelectPiece={selectPiece}
              symbtrCatalogCount={symbtrCatalogCount}
              customPieceDraft={customPieceDraft}
              catalogQuery={catalogQuery}
              onCatalogQueryChange={setCatalogQuery}
              catalogSearchIsLoading={catalogSearch.isLoading}
              catalogSearchError={catalogSearch.error}
              catalogResults={catalogResults}
              onApplyCatalogEntry={applyCatalogEntry}
              onUpdateDraftField={updateCustomPieceDraft}
              onScoreImagesSelected={handleCustomScoreImages}
              onRemoveScoreImage={removeCustomScoreImage}
              onAddPiece={addCustomPiece}
              isAddingPiece={isAddingPiece}
              pieceMessage={pieceMessage}
            />

            <FollowLayersPanel
              layerInstrument={layerInstrument}
              onLayerInstrumentChange={setLayerInstrument}
              percussionInstrument={percussionInstrument}
              onPercussionInstrumentChange={setPercussionInstrument}
              melodicInstrumentItems={melodicInstrumentItems}
              percussionInstrumentItems={percussionInstrumentItems}
              onAddMelodicLayer={addMelodicLayer}
              onChangePercussionLayer={addPercussionLayer}
              onRemoveMelodicLayer={removeMelodicLayer}
              onRemovePercussionLayer={removePercussionLayer}
              mutedLayerIds={mutedLayerIds}
              soloLayerId={soloLayerId}
              onToggleMuteLayer={toggleMuteLayer}
              onToggleSoloLayer={toggleSoloLayer}
              melodicLayers={melodicLayers}
              percussionLayers={percussionLayers}
              layerMessage={layerMessage}
              layerSampleMessages={layerSampleMessages}
              hasSampleSlots={Boolean(sampleSlots)}
              errorMessage={sampleError ?? scoreError ?? null}
            />

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
