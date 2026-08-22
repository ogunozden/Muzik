/**
 * UsulPanel - Usul Selection and Visualization
 * 
 * Dinamik vuruş takibi ile birlikte
 */

"use client";

import {forwardRef, memo} from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/shared/ui/atoms/Button";
import {LabeledSelect} from "@/shared/ui/molecules/LabeledSelect";
import {UsulSymbol as UsulSymbolType} from "@/core/domain/models";
import {UsulNotation, type UsulNotationHandle} from "@/shared/ui/organisms/UsulNotation";

interface UsulPanelProps {
  usulSelectAriaLabel: string;
  symbolGridAriaLabel: string;
  playButtonAriaLabel: string;
  usulItems: Array<{key: string; label: string}>;
  selectedUsul?: string;
  onUsulChange?: (key: string) => void;
  symbols?: UsulSymbolType[];
  onPlay?: () => void;
  beats?: number;
  unit?: string;
  isPlaying?: boolean;
  currentBeat?: number;
  className?: string;
}

const UsulPanelComponent = forwardRef<UsulNotationHandle, UsulPanelProps>(function UsulPanelComponent(
  {
    usulSelectAriaLabel,
    symbolGridAriaLabel,
    playButtonAriaLabel,
    usulItems,
    selectedUsul,
    onUsulChange,
    symbols,
    onPlay,
    beats = 4,
    unit = "4",
    isPlaying = false,
    currentBeat = -1,
    className = "",
  },
  notationRef,
) {
  const {t} = useTranslation();

  return (
    <div 
      className={className}
      style={{
        backgroundColor: "var(--color-bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--color-border-default)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {/* Usul Seçimi */}
      <LabeledSelect
        label={t("usul.usul")}
        ariaLabel={usulSelectAriaLabel}
        items={usulItems}
        value={selectedUsul}
        onChange={onUsulChange}
        placeholder={t("usul.usulPlaceholder")}
      />
      
      {/* Sembol Gösterimi */}
      {symbols && symbols.length > 0 && (
        <section 
          aria-label={symbolGridAriaLabel}
          style={{
            backgroundColor: "var(--color-bg-base)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
          }}
        >
          <div 
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-3)",
            }}
          >
            <span 
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}
            >
              Darp akışı
            </span>
            <span style={{fontSize: "0.75rem", color: "var(--color-text-secondary)"}}>
              {beats}/{unit}
            </span>
          </div>

          <UsulNotation
            ref={notationRef}
            symbols={symbols}
            unit={unit}
            beats={beats}
            isPlaying={isPlaying}
            currentBeat={currentBeat}
            size="md"
          />
        </section>
      )}
      
      {/* Oynat Butonu */}
      <Button
        variant="accent"
        size="sm"
        ariaLabel={playButtonAriaLabel}
        onPress={onPlay}
        className="w-full"
        style={{width: "100%"}}
      >
        {isPlaying ? (
          <span style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <span>■</span>
            {t("common.stop")}
          </span>
        ) : (
          <span style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <span>▶</span>
            {playButtonAriaLabel}
          </span>
        )}
      </Button>
    </div>
  );
});

export const UsulPanel = memo(UsulPanelComponent);
