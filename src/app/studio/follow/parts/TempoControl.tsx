import {tokens} from "@/shared/tokens";
import {Panel, Pill} from "./FollowPrimitives";
import {MAX_BPM, MIN_BPM} from "./follow-helpers";

/**
 * Eser Takip tempo (BPM) kontrolu (M8.3 JSX bolme). Slider + sayi girisi;
 * tempo degisince nota sureleri ve vurus cizgisi ust bilesende yeniden
 * hesaplanir.
 */
export function TempoControl({bpm, onBpmChange}: {bpm: number; onBpmChange: (value: number) => void}) {
  return (
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
        onChange={(event) => onBpmChange(Number(event.target.value))}
        className="mt-4 w-full accent-[var(--color-primary-500)]"
      />
      <div className="mt-3 flex items-center gap-3">
        <input
          aria-label="BPM değeri"
          type="number"
          min={MIN_BPM}
          max={MAX_BPM}
          value={bpm}
          onChange={(event) => onBpmChange(Number(event.target.value))}
          className="w-24 rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)]"
        />
        <span className={`text-xs ${tokens.colors.text.secondary}`}>
          {MIN_BPM}-{MAX_BPM} BPM
        </span>
      </div>
    </Panel>
  );
}
