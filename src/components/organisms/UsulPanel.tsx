/**
 * UsulPanel - Usul Selection and Visualization
 * 
 * Dinamik vuruş takibi ile birlikte
 */

"use client";

import {memo, useState} from "react";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/atoms/Button";
import {LabeledSelect} from "@/components/molecules/LabeledSelect";
import {UsulSymbol as UsulSymbolType} from "@/types";
import {UsulNotation} from "@/components/ui/UsulNotation";

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

function UsulPanelComponent({
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
}: UsulPanelProps) {
  const {t} = useTranslation();
  const [notationMode, setNotationMode] = useState<"visual" | "notation">("notation");

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
          {/* Notation Toggle */}
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
              Vuruşlar
            </span>
            <div style={{display: "flex", gap: "var(--space-1)"}}>
              <button
                onClick={() => setNotationMode("visual")}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  borderRadius: "0.25rem",
                  ...(notationMode === "visual" 
                    ? {
                        backgroundColor: "var(--color-primary-100)",
                        color: "var(--color-primary-700)",
                        border: "none",
                      }
                    : {
                        backgroundColor: "transparent",
                        color: "var(--color-text-tertiary)",
                        border: "1px solid var(--color-border-default)",
                      }
                  ),
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Görsel
              </button>
              <button
                onClick={() => setNotationMode("notation")}
                style={{
                  padding: "0.25rem 0.5rem",
                  fontSize: "0.75rem",
                  borderRadius: "0.25rem",
                  ...(notationMode === "notation" 
                    ? {
                        backgroundColor: "var(--color-primary-100)",
                        color: "var(--color-primary-700)",
                        border: "none",
                      }
                    : {
                        backgroundColor: "transparent",
                        color: "var(--color-text-tertiary)",
                        border: "1px solid var(--color-border-default)",
                      }
                  ),
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                Nota
              </button>
            </div>
          </div>

          {/* Notation View - Ana gösterim */}
          <div style={{overflowX: "auto"}}>
            <UsulNotation
              symbols={symbols}
              unit={unit}
              beats={beats}
              isPlaying={isPlaying}
              currentBeat={currentBeat}
              size="md"
              className="mx-auto"
            />
          </div>
        </section>
      )}
      
      {/* Oynat Butonu */}
      <Button
        variant="accent"
        size="md"
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
}

export const UsulPanel = memo(UsulPanelComponent);
