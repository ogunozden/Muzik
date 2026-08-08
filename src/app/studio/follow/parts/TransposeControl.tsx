"use client";

import {tokens} from "@/shared/tokens";

export const TRANSPOSE_KOMA_MIN = -12;
export const TRANSPOSE_KOMA_MAX = 12;

/**
 * Transpoze kontrolu (W3.9): 53-EDO KOMA adimlariyla kaydirma.
 *
 * 12-TET yarim-ton kaydirmasi makam aralik yapisini bozardigi icin buradaki
 * transpoze, projenin AHENK mekanizmasiyla ayni yolu kullanir: eserin tum
 * perdeleri ayni koma sayisi kadar otelenir, araliklar korunur (otantik).
 */
export function TransposeControl({
  value,
  min = TRANSPOSE_KOMA_MIN,
  max = TRANSPOSE_KOMA_MAX,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  const clamped = Math.min(max, Math.max(min, value));

  return (
    <div className="rounded-md border border-[var(--color-border-default)] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-semibold uppercase ${tokens.colors.text.secondary}`}>Transpoze</p>
        <span className="text-sm font-semibold tabular-nums text-[var(--color-text-primary)]">
          {clamped > 0 ? `+${clamped}` : clamped} koma
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          aria-label="Transpoze azalt"
          disabled={clamped <= min}
          onClick={() => onChange(clamped - 1)}
          className="rounded-md border border-[var(--color-border-default)] px-3 py-1 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-40"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Transpoze artır"
          disabled={clamped >= max}
          onClick={() => onChange(clamped + 1)}
          className="rounded-md border border-[var(--color-border-default)] px-3 py-1 text-sm font-semibold text-[var(--color-text-primary)] disabled:opacity-40"
        >
          +
        </button>
        {clamped !== 0 && (
          <button
            type="button"
            aria-label="Transpoze sıfırla"
            onClick={() => onChange(0)}
            className="ml-auto rounded-md border border-[var(--color-border-default)] px-2 py-1 text-xs text-[var(--color-text-secondary)]"
          >
            Sıfırla
          </button>
        )}
      </div>
    </div>
  );
}
