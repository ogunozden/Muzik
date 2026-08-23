"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {getCurrentScoreEvent, parseSymbtrScore, type PieceDefinition} from "@/data/pieces/hicazkarPesrev";
import {
  createVisualMeasureSegments,
  getActiveVisualMeasureSegment,
  getVisualBeatPosition,
  isExactVisualMap,
} from "@/data/pieces/visual-map";
import {getHeardPlaybackPosition, normalizePercussionSymbol, playArrangement, stopAll, type InstrumentType, type PercussionSymbol} from "@/engines/ses/engine";
import {USUL_DATA, getUsulBeatDuration} from "@/engines/usul/data";
import {usePlaybackVolume} from "@/shared/ui/organisms/VolumeControl";
import {
  buildLoopRegion,
  clamp,
  estimateScorePageIndex,
  estimateScorePageProgress,
  getActiveVisualBand,
  getMelodicGainScale,
  getPlaybackEventPosition,
  getSectionAt,
  hasMelodicSamples,
  hasPercussionSamples,
  repeatNotesForLoop,
  wrapPlaybackPosition,
  type DisplayUsulHit,
  type SampleApiResponse,
  type SampleSlotStatus,
} from "@/app/studio/follow/parts/follow-helpers";
import type {PieceLayer, PiecePercussionLayer} from "@/data/pieces/hicazkarPesrev";

type UseFollowPlaybackOptions = {
  selectedPiece: PieceDefinition;
  rawScore: string;
  bpm: number;
  melodicLayers: readonly PieceLayer[];
  percussionLayers: readonly PiecePercussionLayer[];
  mutedLayerIds: readonly string[];
  soloLayerId: string | null;
};

export function useFollowPlayback(options: UseFollowPlaybackOptions) {
  const {selectedPiece, rawScore, bpm, melodicLayers, percussionLayers, mutedLayerIds, soloLayerId} = options;

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [volume, setVolume] = usePlaybackVolume();
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);
  const [loopStartMeasure, setLoopStartMeasure] = useState(1);
  const [loopEndMeasure, setLoopEndMeasure] = useState(Number.MAX_SAFE_INTEGER);
  const [transposeKoma, setTransposeKoma] = useState(0);
  const [sampleSlots, setSampleSlots] = useState<SampleSlotStatus[] | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);

  const animationRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const usul = useMemo(() => USUL_DATA.find((item) => item.id === selectedPiece.usulId), [selectedPiece.usulId]);
  const beatDuration = usul ? getUsulBeatDuration(usul, bpm) : 60 / bpm;
  const playbackKoma53Offset = (selectedPiece.playbackAhenk?.koma53Offset ?? 0) + transposeKoma;

  const parsedEvents = useMemo(() => (rawScore ? parseSymbtrScore(rawScore, bpm, playbackKoma53Offset) : []), [bpm, playbackKoma53Offset, rawScore]);
  const events = parsedEvents;
  const totalDuration = events.reduce((max, event) => Math.max(max, event.startTime + event.duration), 0);
  const totalBeats = events.reduce((max, event) => Math.max(max, event.startBeat + event.durationBeats), 0);
  const maxMeasureIndex = useMemo(() => Math.max(1, ...events.map((e) => e.measureIndex).filter((i): i is number => i !== null)), [events]);
  const loopRegion = useMemo(() => buildLoopRegion(events, loopStartMeasure, loopEndMeasure, maxMeasureIndex), [events, loopEndMeasure, loopStartMeasure, maxMeasureIndex]);
  const currentBeat = playbackPosition / beatDuration;
  const progress = totalDuration > 0 ? Math.min(100, (playbackPosition / totalDuration) * 100) : 0;
  const currentEvent = getCurrentScoreEvent(events, playbackPosition);
  const currentPlaybackKoma53 = currentEvent?.koma53 !== null && currentEvent?.koma53 !== undefined ? currentEvent.koma53 + playbackKoma53Offset : null;
  const currentEventPosition = currentEvent ? events.findIndex((e) => e.index === currentEvent.index && e.startTime === currentEvent.startTime) : -1;
  const playbackEventPosition = getPlaybackEventPosition(events.length, currentEventPosition, progress);
  const currentScorePageIndex = estimateScorePageIndex(selectedPiece.scorePageUrls.length, totalBeats, currentBeat);
  const currentScorePageProgress = estimateScorePageProgress(selectedPiece.scorePageUrls.length, totalBeats, currentBeat, currentScorePageIndex);
  const visualStaffBands = selectedPiece.visualMap?.staffBands;
  const activeVisualBand = getActiveVisualBand(visualStaffBands, currentBeat);
  const activeVisualPageIndex = activeVisualBand?.pageIndex ?? currentScorePageIndex;
  const activeVisualBandProgress = activeVisualBand ? clamp(((currentBeat - activeVisualBand.startBeat) / Math.max(activeVisualBand.endBeat - activeVisualBand.startBeat, 1)) * 100, 0, 100) : currentScorePageProgress;
  const activeVisualBeatPosition = activeVisualBand ? getVisualBeatPosition(activeVisualBand, currentBeat) : null;
  const activeVisualNoteLabel = currentEvent ? (currentEvent.isRest ? "Es" : (currentEvent.solfegePitch ?? currentEvent.sourcePitch)) : null;
  const visualMeasureSegments = useMemo(() => createVisualMeasureSegments(events, visualStaffBands ?? []), [events, visualStaffBands]);
  const activeVisualMeasureSegment = getActiveVisualMeasureSegment(visualMeasureSegments, currentBeat);
  const visibleScoreStart = Math.max(0, (playbackEventPosition >= 0 ? playbackEventPosition : 0) - 8);
  const visibleScoreEvents = events.length === 0 ? [] : events.slice(visibleScoreStart, Math.min(events.length, visibleScoreStart + 24));
  const currentSection = getSectionAt(events, playbackPosition);
  const visualTrackingIsExact = isExactVisualMap(selectedPiece.visualMap);
  const sectionMarkers = useMemo(() => events.filter((event) => event.section), [events]);
  const playbackUsulHits = useMemo<DisplayUsulHit[]>(() => { if (!usul) return []; return (selectedPiece.usulHits ?? usul.symbols).map((hit) => ({ beat: hit.beat, symbol: normalizePercussionSymbol(hit.symbol), isAccent: hit.isAccent, timeValue: hit.timeValue, syllable: hit.syllable ?? (hit.symbol || "-"), })); }, [selectedPiece.usulHits, usul]);
  const currentCycleBeat = usul ? (currentBeat % usul.beats) + 1 : 0;
  const activeUsulHit = playbackUsulHits.find((hit) => currentCycleBeat >= hit.beat && currentCycleBeat < hit.beat + Math.max(hit.timeValue ?? 1, 0.5));
  const layerSampleMessages = useMemo(() => { if (!sampleSlots) return [] as string[]; return [...melodicLayers.filter((l) => !hasMelodicSamples(sampleSlots, l.instrument)).map((l) => `${l.label}: sample yok, sentez kullanılır`), ...percussionLayers.filter((l) => !hasPercussionSamples(sampleSlots, l.instrument, selectedPiece.requiredPercussionSymbols)).map((l) => `${l.label}: bazı vuruş sample'ları yok, sentez tamamlar`)]; }, [melodicLayers, percussionLayers, sampleSlots, selectedPiece.requiredPercussionSymbols]);

  const stopPlayback = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    animationRef.current = null;
    stopTimerRef.current = null;
    stopAll();
    setIsPlaying(false);
    setPlaybackPosition(0);
  }, []);

  const resetLoopAndTranspose = useCallback(() => {
    setIsLoopEnabled(false);
    setLoopStartMeasure(1);
    setLoopEndMeasure(Number.MAX_SAFE_INTEGER);
    setTransposeKoma(0);
  }, []);

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
    const effectiveMelodicLayers =
      activeMelodicLayers.length > 0 ? activeMelodicLayers : melodicLayers.filter((layer) => !mutedSet.has(layer.id));
    const activePercussionLayers = soloLayerId
      ? percussionLayers.filter((layer) => layer.id === soloLayerId)
      : percussionLayers.filter((layer) => !mutedSet.has(layer.id));
    if (effectiveMelodicLayers.length === 0 && activePercussionLayers.length === 0) return;
    const looping = isLoopEnabled && loopRegion !== null;
    const sourceEvents =
      looping && loopRegion
        ? events.filter(
            (event) =>
              event.measureIndex !== null &&
              event.measureIndex >= loopRegion.startMeasure &&
              event.measureIndex <= loopRegion.endMeasure,
          )
        : events;
    if (sourceEvents.length === 0) return;
    stopAll();
    setIsPlaying(true);
    setPlaybackPosition(0);
    const melodicGainScale = getMelodicGainScale(effectiveMelodicLayers);
    let notes = sourceEvents
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
    if (looping && loopRegion) {
      notes = repeatNotesForLoop(notes, loopRegion.regionStartTime, loopRegion.regionDuration, totalDuration);
    }
    let percussionHits = activePercussionLayers.flatMap((percussionLayer) =>
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
    if (looping && loopRegion) {
      const regionHits = percussionHits.filter(
        (hit) => hit.startTime >= loopRegion.regionStartTime && hit.startTime < loopRegion.regionStartTime + loopRegion.regionDuration,
      );
      percussionHits = repeatNotesForLoop(regionHits, loopRegion.regionStartTime, loopRegion.regionDuration, totalDuration);
    }
    const {durationSeconds, baseTime} = await playArrangement(notes, percussionHits, effectiveMelodicLayers[0]?.instrument ?? "ud", {
      gainScale: volume,
    });
    if (durationSeconds <= 0) {
      stopPlayback();
      return;
    }
    const animate = () => {
      const heard = getHeardPlaybackPosition(baseTime);
      const position = looping && loopRegion ? wrapPlaybackPosition(heard, loopRegion.regionStartTime, loopRegion.regionDuration) : heard;
      setPlaybackPosition(Math.max(0, position));
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    stopTimerRef.current = window.setTimeout(stopPlayback, (durationSeconds + 0.4) * 1000);
  }, [
    beatDuration,
    events,
    isLoopEnabled,
    isPlaying,
    loopRegion,
    melodicLayers,
    mutedLayerIds,
    percussionLayers,
    playbackUsulHits,
    soloLayerId,
    stopPlayback,
    totalBeats,
    totalDuration,
    usul,
    volume,
  ]);

  return {
    isPlaying,
    setIsPlaying,
    playbackPosition,
    setPlaybackPosition,
    volume,
    setVolume,
    isLoopEnabled,
    setIsLoopEnabled,
    loopStartMeasure,
    setLoopStartMeasure,
    loopEndMeasure,
    setLoopEndMeasure,
    transposeKoma,
    setTransposeKoma,
    sampleSlots,
    sampleError,
    usul,
    beatDuration,
    playbackKoma53Offset,
    events,
    totalDuration,
    totalBeats,
    maxMeasureIndex,
    loopRegion,
    currentBeat,
    progress,
    currentEvent,
    currentPlaybackKoma53,
    currentEventPosition,
    playbackEventPosition,
    currentScorePageIndex,
    currentScorePageProgress,
    visualStaffBands,
    activeVisualBand,
    activeVisualPageIndex,
    activeVisualBandProgress,
    activeVisualBeatPosition,
    activeVisualNoteLabel,
    visualMeasureSegments,
    activeVisualMeasureSegment,
    visibleScoreEvents,
    currentSection,
    visualTrackingIsExact,
    sectionMarkers,
    playbackUsulHits,
    currentCycleBeat,
    activeUsulHit,
    layerSampleMessages,
    stopPlayback,
    playPiece,
    resetLoopAndTranspose,
  };
}
