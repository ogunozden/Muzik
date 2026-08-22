import {tokens} from "@/shared/tokens";
import type {SampleCoverageSummary} from "@/app/samples/components/types";

export function SampleCoverage({coverage}: {coverage: SampleCoverageSummary | null}) {
  if (!coverage) return null;

  const cardClass = `border ${tokens.colors.border.base} ${tokens.radius.md} ${tokens.colors.background.surface} p-3`;

  return (
    <section className="mb-6 grid gap-3 md:grid-cols-4" aria-label="Sample coverage">
      <div className={cardClass}>
        <div className={`text-xs ${tokens.colors.text.secondary}`}>Çalınabilir enstrüman</div>
        <div className={`mt-1 text-xl font-semibold ${tokens.colors.text.primary}`}>
          {coverage.playableInstrumentCount} / {coverage.instrumentCount}
        </div>
      </div>
      <div className={cardClass}>
        <div className={`text-xs ${tokens.colors.text.secondary}`}>Sample slot</div>
        <div className={`mt-1 text-xl font-semibold ${tokens.colors.text.primary}`}>
          {coverage.installedSlots} / {coverage.totalSlots}
        </div>
      </div>
      <div className={cardClass}>
        <div className={`text-xs ${tokens.colors.text.secondary}`}>Synth fallback</div>
        <div className={`mt-1 text-xl font-semibold ${tokens.colors.text.primary}`}>
          {coverage.synthFallbackInstrumentCount}
        </div>
      </div>
      <div className={cardClass}>
        <div className={`text-xs ${tokens.colors.text.secondary}`}>Aileler</div>
        <div className={`mt-1 text-xl font-semibold ${tokens.colors.text.primary}`}>
          {coverage.melodicInstrumentCount} ezgi · {coverage.percussionInstrumentCount} vurmalı
        </div>
      </div>
    </section>
  );
}
