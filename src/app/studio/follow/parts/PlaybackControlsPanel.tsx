"use client";

import {VolumeControl} from "@/shared/ui/organisms/VolumeControl";
import {LoopRegionControl} from "./LoopRegionControl";
import {TransposeControl} from "./TransposeControl";
import {clamp} from "./follow-helpers";

/**
 * Calma kontrolcüleri paketi (W3.7-W3.9): volume + dongu bolgesi + transpoze.
 * Saf gosterim; tum durum ve kapsamlar ust bilesenden gelir.
 */
export function PlaybackControlsPanel({
  volume,
  onVolumeChange,
  loopEnabled,
  onLoopEnabledChange,
  loopStartMeasure,
  loopEndMeasure,
  maxMeasure,
  onLoopStartMeasureChange,
  onLoopEndMeasureChange,
  transposeKoma,
  onTransposeKomaChange,
}: {
  volume: number;
  onVolumeChange: (volume: number) => void;
  loopEnabled: boolean;
  onLoopEnabledChange: (enabled: boolean) => void;
  loopStartMeasure: number;
  loopEndMeasure: number;
  maxMeasure: number;
  onLoopStartMeasureChange: (measure: number) => void;
  onLoopEndMeasureChange: (measure: number) => void;
  transposeKoma: number;
  onTransposeKomaChange: (koma: number) => void;
}) {
  return (
    <>
      <VolumeControl volume={volume} onVolumeChange={onVolumeChange} />
      <LoopRegionControl
        enabled={loopEnabled}
        startMeasure={loopStartMeasure}
        endMeasure={loopEndMeasure}
        maxMeasure={maxMeasure}
        onEnabledChange={onLoopEnabledChange}
        onStartMeasureChange={(value) =>
          onLoopStartMeasureChange(clamp(Number.isFinite(value) ? value : 1, 1, maxMeasure))
        }
        onEndMeasureChange={(value) =>
          onLoopEndMeasureChange(clamp(Number.isFinite(value) ? value : maxMeasure, 1, maxMeasure))
        }
      />
      <TransposeControl value={transposeKoma} onChange={onTransposeKomaChange} />
    </>
  );
}
