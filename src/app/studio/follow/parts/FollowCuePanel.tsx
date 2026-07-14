import type {PieceScoreEvent} from "@/data/pieces/hicazkarPesrev";
import {tokens} from "@/shared/tokens";
import {Panel, Pill} from "./FollowPrimitives";
import {formatBeatLabel, formatFrequency, formatTime, type DisplayUsulHit} from "./follow-helpers";

/**
 * Eser Takip ana ipucu paneli (M8.3 JSX bolme): aktif bolum/nota, zaman,
 * gorsel sayfa/olcu, usul darbi, SymbTr/koma detayi, ilerleme cubugu ve
 * devir kutulari. Saf gosterim; tum durum ust bilesenden gelir.
 */
export interface FollowCueProps {
  currentSection: string;
  currentEvent: PieceScoreEvent | null | undefined;
  playbackPosition: number;
  totalDuration: number;
  activeVisualPageIndex: number;
  scorePageCount: number;
  visualTrackingIsExact: boolean;
  activeVisualBandProgress: number;
  activeMeasureIndex: number | null;
  usulName: string | null;
  meter: string;
  activeUsulHit: DisplayUsulHit | undefined;
  currentCycleBeat: number;
  currentPlaybackKoma53: number | string | null;
  isPlaying: boolean;
  progress: number;
  totalBeats: number;
  currentBeat: number;
}

export function FollowCuePanel({
  currentSection,
  currentEvent,
  playbackPosition,
  totalDuration,
  activeVisualPageIndex,
  scorePageCount,
  visualTrackingIsExact,
  activeVisualBandProgress,
  activeMeasureIndex,
  usulName,
  meter,
  activeUsulHit,
  currentCycleBeat,
  currentPlaybackKoma53,
  isPlaying,
  progress,
  totalBeats,
  currentBeat,
}: FollowCueProps) {
  return (
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
              ? `Görsel ${activeVisualPageIndex + 1}. sayfa / ${scorePageCount} · ${visualTrackingIsExact ? "satır ilerleme" : "yaklaşık satır"} %${Math.round(activeVisualBandProgress)} · ölçü ${activeMeasureIndex ?? "-"}`
              : "Görsel sayfa eklenmedi"}
          </p>
          <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
            {usulName
              ? `Usul ${usulName} · ${meter} · darp ${activeUsulHit?.syllable ?? activeUsulHit?.symbol ?? "-"} (${formatBeatLabel(currentCycleBeat)}. vuruş)`
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
  );
}
