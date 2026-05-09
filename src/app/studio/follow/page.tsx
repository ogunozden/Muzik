"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {ReactNode} from "react";
import {UnifiedLayout} from "@/components/layout/UnifiedLayout";
import {
  HICAZKAR_PESREV,
  getCurrentScoreEvent,
  parseSymbtrScore,
  type PieceLayer,
  type PiecePercussionLayer,
  type PieceScoreEvent,
} from "@/data/pieces/hicazkarPesrev";
import {playArrangement, stopAll, type InstrumentType, type PercussionSymbol} from "@/engines/ses/engine";
import {USUL_DATA, getUsulBeatDuration} from "@/engines/usul/data";
import {tokens} from "@/lib/tokens";

interface SampleSlotStatus {
  category: "melodic" | "percussion";
  instrumentId: string;
  installed: boolean;
  symbol: PercussionSymbol | null;
}

interface SampleApiResponse {
  slots?: SampleSlotStatus[];
}

const piece = HICAZKAR_PESREV;

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
  const [events, setEvents] = useState<PieceScoreEvent[]>([]);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [sampleSlots, setSampleSlots] = useState<SampleSlotStatus[] | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);

  const animationRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  const usul = useMemo(() => USUL_DATA.find((item) => item.id === piece.usulId), []);
  const beatDuration = usul ? getUsulBeatDuration(usul, piece.bpm) : 60 / piece.bpm;
  const totalDuration = events.reduce((max, event) => Math.max(max, event.startTime + event.duration), 0);
  const totalBeats = events.reduce((max, event) => Math.max(max, event.startBeat + event.durationBeats), 0);
  const currentBeat = playbackPosition / beatDuration;
  const progress = totalDuration > 0 ? Math.min(100, (playbackPosition / totalDuration) * 100) : 0;
  const currentEvent = getCurrentScoreEvent(events, playbackPosition);
  const currentSection = getSectionAt(events, playbackPosition);

  const availableMelodicLayers = useMemo<PieceLayer[]>(() => {
    if (!sampleSlots) return [];
    return piece.melodicLayers.filter((layer) => hasMelodicSamples(sampleSlots, layer.instrument));
  }, [sampleSlots]);

  const availablePercussionLayers = useMemo<PiecePercussionLayer[]>(() => {
    if (!sampleSlots) return [];
    return piece.percussionLayers.filter((layer) =>
      hasPercussionSamples(sampleSlots, layer.instrument, piece.requiredPercussionSymbols),
    );
  }, [sampleSlots]);

  const removedLayerLabels = useMemo(() => {
    if (!sampleSlots) return [];

    const availableMelodicIds = new Set(availableMelodicLayers.map((layer) => layer.id));
    const availablePercussionIds = new Set(availablePercussionLayers.map((layer) => layer.id));

    return [
      ...piece.melodicLayers.filter((layer) => !availableMelodicIds.has(layer.id)).map((layer) => layer.label),
      ...piece.percussionLayers.filter((layer) => !availablePercussionIds.has(layer.id)).map((layer) => layer.label),
    ];
  }, [availableMelodicLayers, availablePercussionLayers, sampleSlots]);

  const sectionMarkers = useMemo(() => events.filter((event) => event.section), [events]);

  const stopPlayback = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    animationRef.current = null;
    stopTimerRef.current = null;
    stopAll();
    setIsPlaying(false);
    setPlaybackPosition(0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadScore() {
      try {
        const response = await fetch(piece.symbtrRawUrl, {cache: "force-cache"});
        if (!response.ok) throw new Error("SymbTr skoru yüklenemedi");

        const raw = await response.text();
        if (!cancelled) {
          setEvents(parseSymbtrScore(raw, piece.bpm));
        }
      } catch (error) {
        if (!cancelled) setScoreError((error as Error).message);
      }
    }

    void loadScore();

    return () => {
      cancelled = true;
    };
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
    if (!usul || isPlaying || events.length === 0 || availableMelodicLayers.length === 0) return;

    stopAll();
    setIsPlaying(true);
    setPlaybackPosition(0);

    const notes = events
      .filter((event) => !event.isRest && event.midiNumber !== null)
      .flatMap((event) =>
        availableMelodicLayers.map((layer) => ({
          midiNumber: event.midiNumber!,
          targetFrequency: event.targetFrequency ?? undefined,
          startTime: event.startTime + layer.delay,
          duration: Math.max(event.duration * 0.92, 0.05),
          gain: layer.gain,
          instrument: layer.instrument,
        })),
      );

    const percussionLayer = availablePercussionLayers[0];
    const percussionHits = percussionLayer
      ? Array.from({length: Math.ceil(totalBeats / usul.beats)}).flatMap((_, cycleIndex) =>
          usul.symbols
            .filter((symbol): symbol is typeof symbol & {symbol: PercussionSymbol} => symbol.symbol !== "")
            .map((symbol) => {
              const startBeat = cycleIndex * usul.beats + symbol.beat - 1;
              if (startBeat >= totalBeats) return null;

              return {
                startTime: startBeat * beatDuration,
                beatDuration,
                symbol: symbol.symbol,
                isAccent: symbol.isAccent,
                percussionInstrument: percussionLayer.instrument,
              };
            })
            .filter((hit) => hit !== null),
        )
      : [];

    const scheduledDuration = await playArrangement(notes, percussionHits, availableMelodicLayers[0].instrument);

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
    availableMelodicLayers,
    availablePercussionLayers,
    beatDuration,
    events,
    isPlaying,
    stopPlayback,
    totalBeats,
    usul,
  ]);

  return (
    <UnifiedLayout>
      <div className={`mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 ${tokens.colors.background.base}`}>
        <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">{piece.displayTitle}</h1>
            <p className={`mt-2 text-sm ${tokens.colors.text.secondary}`}>
              {piece.composer} · {piece.makam} · {piece.form} · {piece.usul} {piece.meter}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              aria-label={isPlaying ? "Durdur" : "Parçayı çal"}
              onClick={isPlaying ? stopPlayback : playPiece}
              disabled={!isPlaying && (events.length === 0 || !sampleSlots || availableMelodicLayers.length === 0)}
              className="inline-flex cursor-pointer items-center justify-center rounded-md bg-[var(--color-primary-500)] px-4 py-2 font-medium text-white transition-colors hover:bg-[var(--color-primary-600)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPlaying ? "Durdur" : "Parçayı Çal"}
            </button>
            <Pill>{piece.bpm} BPM</Pill>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Panel>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Kaynak nota</p>
                  <p className={`text-sm ${tokens.colors.text.primary}`}>
                    Neyzen görsel sayfaları, SymbTr sembolik skor verisi
                  </p>
                </div>
                <div className="flex gap-2">
                  <a className="text-sm text-[var(--color-primary-600)] underline" href={piece.sourcePageUrl} target="_blank" rel="noreferrer">
                    Nota kaynağı
                  </a>
                  <a className="text-sm text-[var(--color-primary-600)] underline" href={piece.symbtrPageUrl} target="_blank" rel="noreferrer">
                    SymbTr
                  </a>
                </div>
              </div>

              <div className="max-h-[680px] overflow-auto rounded border border-[var(--color-border-subtle)] bg-white">
                {piece.scorePageUrls.map((url, index) => (
                  // eslint-disable-next-line @next/next/no-img-element -- Keep the source notation image untouched; optimization can alter remote GIF rendering.
                  <img
                    key={url}
                    src={url}
                    alt={`${piece.displayTitle} kaynak nota sayfası ${index + 1}`}
                    className="mx-auto block w-full max-w-[980px] border-b border-[var(--color-border-subtle)] bg-white"
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                ))}
              </div>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel>
                <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Takip</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className={`text-2xl font-bold ${tokens.colors.text.primary}`}>{currentSection}</p>
                    <p className={`mt-1 text-sm ${tokens.colors.text.secondary}`}>
                      {currentEvent?.isRest ? "Es" : currentEvent?.sourcePitch ?? "Hazır"} · {formatTime(playbackPosition)} / {formatTime(totalDuration)}
                    </p>
                    <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
                      {currentEvent?.koma53 !== null && currentEvent?.koma53 !== undefined
                        ? `Koma53 ${currentEvent.koma53} · ${formatFrequency(currentEvent.targetFrequency)}`
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
                <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Çalınan katmanlar</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {availableMelodicLayers.map((layer) => (
                    <Pill key={layer.id} tone="secondary">{layer.label}</Pill>
                  ))}
                  {availablePercussionLayers.map((layer) => (
                    <Pill key={layer.id} tone="secondary">{layer.label}</Pill>
                  ))}
                </div>

                {removedLayerLabels.length > 0 && (
                  <p className="mt-4 text-sm text-[var(--color-error)]">
                    Sample bulunmadığı için kaldırıldı: {removedLayerLabels.join(", ")}
                  </p>
                )}

                {(sampleError || scoreError) && (
                  <p className="mt-4 text-sm text-[var(--color-error)]">
                    {sampleError ?? scoreError}
                  </p>
                )}
            </Panel>

            <Panel>
                <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Devr-i Kebir vuruşları</p>
                <div className="mt-3 grid grid-cols-7 gap-1.5">
                  {usul?.symbols.map((symbol) => {
                    const beatIndex = symbol.beat - 1;
                    const active = Math.floor(currentBeat % usul.beats) === beatIndex;

                    return (
                      <div
                        key={`${symbol.beat}-${symbol.symbol}`}
                        className={`rounded border px-2 py-2 text-center text-xs ${
                          active && isPlaying
                            ? "border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]"
                            : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        <span className="block font-semibold">{symbol.beat}</span>
                        <span>{symbol.symbol || "-"}</span>
                      </div>
                    );
                  })}
                </div>
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
