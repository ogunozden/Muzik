"use client";

import {tokens} from "@/shared/tokens";

/**
 * Döngü bölgesi kontrolu (W3.8): olcu araligi secimi + dongu acma.
 * Saf gosterim; durum ust bilesenden gelir.
 */
export function LoopRegionControl({
  enabled,
  startMeasure,
  endMeasure,
  maxMeasure,
  onEnabledChange,
  onStartMeasureChange,
  onEndMeasureChange,
}: {
  enabled: boolean;
  startMeasure: number;
  endMeasure: number;
  maxMeasure: number;
  onEnabledChange: (enabled: boolean) => void;
  onStartMeasureChange: (measure: number) => void;
  onEndMeasureChange: (measure: number) => void;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border-default)] bg-white p-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--color-text-primary)]">
        <input
          type="checkbox"
          aria-label="Döngü"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          className="h-4 w-4 accent-[var(--color-primary-600)]"
        />
        Döngü
      </label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className={`grid gap-1 text-xs ${tokens.colors.text.secondary}`}>
          Başlangıç ölçüsü
          <input
            type="number"
            min={1}
            max={maxMeasure}
            value={startMeasure}
            aria-label="Döngü başlangıç ölçüsü"
            onChange={(event) => onStartMeasureChange(Number(event.target.value))}
            className="rounded-md border border-[var(--color-border-default)] bg-white px-2 py-1 text-sm text-[var(--color-text-primary)]"
          />
        </label>
        <label className={`grid gap-1 text-xs ${tokens.colors.text.secondary}`}>
          Bitiş ölçüsü
          <input
            type="number"
            min={1}
            max={maxMeasure}
            value={endMeasure}
            aria-label="Döngü bitiş ölçüsü"
            onChange={(event) => onEndMeasureChange(Number(event.target.value))}
            className="rounded-md border border-[var(--color-border-default)] bg-white px-2 py-1 text-sm text-[var(--color-text-primary)]"
          />
        </label>
      </div>
      <p className={`mt-1 text-xs ${tokens.colors.text.secondary}`}>
        Bölge: {startMeasure}–{endMeasure} / {maxMeasure} ölçü
      </p>
    </div>
  );
}
