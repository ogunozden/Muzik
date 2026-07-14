import {tokens} from "@/shared/tokens";

/**
 * Kalici (sticky) workbench durum cubugu (F7.1): validator, kalite ve aktif
 * konum durumu her zaman gorunur kalir. Ortak hub yerlesim dilinin parcasi.
 */
export function WorkbenchStatusBar({
  validatorOk,
  qualityStatus,
  qualityScore,
  activeMeasureLabel,
  activeEventIndex,
  totalEvents,
}: {
  validatorOk: boolean;
  qualityStatus: "ready" | "needs-review" | "blocked";
  qualityScore: number;
  activeMeasureLabel: string;
  activeEventIndex: number;
  totalEvents: number;
}) {
  const qualityTone =
    qualityStatus === "ready"
      ? "var(--color-primary-600)"
      : qualityStatus === "blocked"
        ? "var(--color-error)"
        : "var(--color-text-primary)";

  return (
    <div
      role="status"
      aria-label="Workbench durumu"
      className="sticky bottom-0 z-30 mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] px-4 py-2 text-sm shadow-sm"
    >
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" style={{color: validatorOk ? "var(--color-primary-600)" : "var(--color-error)"}}>
          ●
        </span>
        <span className={tokens.colors.text.secondary}>Validator</span>
        <span className="font-semibold text-[var(--color-text-primary)]">
          {validatorOk ? "geçti" : "inceleme"}
        </span>
      </span>
      <span className="inline-flex items-center gap-2">
        <span className={tokens.colors.text.secondary}>Kalite</span>
        <span className="font-semibold" style={{color: qualityTone}}>
          {qualityScore}/100 · {qualityStatus}
        </span>
      </span>
      <span className="inline-flex items-center gap-2">
        <span className={tokens.colors.text.secondary}>Aktif</span>
        <span className="font-semibold text-[var(--color-text-primary)]">
          {activeMeasureLabel} · {activeEventIndex ? `${activeEventIndex}/${totalEvents}` : "-"}
        </span>
      </span>
    </div>
  );
}
