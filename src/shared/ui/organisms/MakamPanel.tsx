"use client";

import {memo} from "react";
import {useTranslation} from "react-i18next";
import {tokens} from "@/shared/tokens";
import {Button} from "@/shared/ui/atoms/Button";
import {LabeledSelect} from "@/shared/ui/molecules/LabeledSelect";

interface ScaleDisplay {
  name: string;
  notes: string[];
}

interface InstrumentOption {
  key: string;
  label: string;
}

interface MakamPanelProps {
  makamSelectAriaLabel: string;
  instrumentSelectAriaLabel: string;
  scaleDisplayAriaLabel: string;
  playButtonAriaLabel: string;
  makamItems: Array<{key: string; label: string}>;
  instrumentItems: InstrumentOption[];
  selectedMakam?: string;
  selectedInstrument?: string;
  onMakamChange?: (key: string) => void;
  onInstrumentChange?: (key: string) => void;
  scaleDisplay?: ScaleDisplay;
  onPlay?: () => void;
  className?: string;
}

function MakamPanelComponent({
  makamSelectAriaLabel,
  instrumentSelectAriaLabel,
  scaleDisplayAriaLabel,
  playButtonAriaLabel,
  makamItems,
  instrumentItems,
  selectedMakam,
  selectedInstrument,
  onMakamChange,
  onInstrumentChange,
  scaleDisplay,
  onPlay,
  className = "",
}: MakamPanelProps) {
  const {t} = useTranslation();
  
  return (
    <div className={`flex flex-col gap-4 p-4 ${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border ${className}`}>
      <LabeledSelect
        label={t("makam.makam")}
        ariaLabel={makamSelectAriaLabel}
        items={makamItems}
        value={selectedMakam}
        onChange={onMakamChange}
        placeholder={t("makam.makamPlaceholder")}
      />

      {instrumentItems.length > 0 && (
        <LabeledSelect
          label={t("makam.instrument")}
          ariaLabel={instrumentSelectAriaLabel}
          items={instrumentItems}
          value={selectedInstrument}
          onChange={onInstrumentChange}
          placeholder={t("makam.instrumentPlaceholder")}
        />
      )}
      
      {scaleDisplay && (
        <section 
          className={`flex flex-col gap-2 p-3 ${tokens.colors.background.base} ${tokens.radius.md}`}
          aria-label={scaleDisplayAriaLabel}
        >
          <span className={`text-sm font-semibold ${tokens.colors.text.primary}`}>
            {scaleDisplay.name}
          </span>
          <div className="flex gap-1 flex-wrap">
            {scaleDisplay.notes.map((note, idx) => (
              <span
                key={`scale-note-${scaleDisplay.name}-${note}-${idx}`}
                className={`px-2 py-1 ${tokens.colors.primary.light} ${tokens.radius.sm} text-xs text-white`}
              >
                {note}
              </span>
            ))}
          </div>
        </section>
      )}
      
      <Button
        variant="accent"
        size="sm"
        ariaLabel={playButtonAriaLabel}
        onPress={onPlay}
      >
        {playButtonAriaLabel}
      </Button>
    </div>
  );
}

export const MakamPanel = memo(MakamPanelComponent);
