"use client";

import {useEffect, useState} from "react";
import {tokens} from "@/shared/tokens";

export const PLAYBACK_VOLUME_STORAGE_KEY = "playback.volume";
export const DEFAULT_PLAYBACK_VOLUME = 1;

export function clampPlaybackVolume(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_PLAYBACK_VOLUME;
}

export function readStoredPlaybackVolume(): number {
  if (typeof window === "undefined") return DEFAULT_PLAYBACK_VOLUME;
  try {
    const raw = window.localStorage.getItem(PLAYBACK_VOLUME_STORAGE_KEY);
    if (raw === null) return DEFAULT_PLAYBACK_VOLUME;
    return clampPlaybackVolume(Number(raw));
  } catch {
    return DEFAULT_PLAYBACK_VOLUME;
  }
}

/**
 * Master playback volume (0..1). `localStorage` ile kalici; yoksa 1.
 * Uc calisma yuzeyi de (studio, follow, rhythm) bu kaynagi kullanir —
 * "hardcode yok" ilkesi gibi, ses seviyesi tek tanimdan gelir.
 */
export function usePlaybackVolume(): [number, (volume: number) => void] {
  const [volume, setVolume] = useState<number>(readStoredPlaybackVolume);

  useEffect(() => {
    try {
      window.localStorage.setItem(PLAYBACK_VOLUME_STORAGE_KEY, String(volume));
    } catch {
      // Kalicilik istege bagli; calma asla bu yuzden bozulmaz.
    }
  }, [volume]);

  return [volume, setVolume];
}

export function VolumeControl({
  volume,
  onVolumeChange,
  label = "Ses seviyesi",
}: {
  volume: number;
  onVolumeChange: (volume: number) => void;
  label?: string;
}) {
  const percent = Math.round(clampPlaybackVolume(volume) * 100);

  return (
    <label className={`grid gap-1 text-sm ${tokens.colors.text.secondary}`}>
      <span className="text-xs font-semibold uppercase">Ses</span>
      <span className="flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          aria-label={label}
          onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
          className="w-28 accent-[var(--color-primary-600)]"
        />
        <span className="w-9 text-right text-xs tabular-nums">{percent}%</span>
      </span>
    </label>
  );
}
