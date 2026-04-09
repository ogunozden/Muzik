"use client";

import {memo} from "react";
import {tokens} from "@/lib/tokens";
import {Button} from "@/components/atoms/Button";
import {LabeledSelect} from "@/components/molecules/LabeledSelect";

interface UsulSymbol {
  symbol: string;
  count: number;
}

interface UsulPanelProps {
  usulSelectAriaLabel: string;
  symbolGridAriaLabel: string;
  playButtonAriaLabel: string;
  usulItems: Array<{key: string; label: string}>;
  selectedUsul?: string;
  onUsulChange?: (key: string) => void;
  symbols?: UsulSymbol[];
  onPlay?: () => void;
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
  className = "",
}: UsulPanelProps) {
  return (
    <div className={`flex flex-col gap-4 p-4 ${tokens.colors.background.surface} ${tokens.radius.lg} ${tokens.colors.border.base} border ${className}`}>
      <LabeledSelect
        label="Usul"
        ariaLabel={usulSelectAriaLabel}
        items={usulItems}
        value={selectedUsul}
        onChange={onUsulChange}
        placeholder="Usul seçin"
      />
      
      {symbols && symbols.length > 0 && (
        <section 
          className={`flex gap-2 p-3 ${tokens.colors.background.base} ${tokens.radius.md}`}
          aria-label={symbolGridAriaLabel}
        >
          {symbols.map((item, itemIdx) => (
            <div key={`${item.symbol}-${itemIdx}`} className="flex flex-col items-center">
              {Array.from({length: item.count}).map((_, countIdx) => (
                <span
                  key={`${item.symbol}-${itemIdx}-${countIdx}`}
                  className={`text-2xl ${tokens.colors.text.primary}`}
                >
                  {item.symbol}
                </span>
              ))}
            </div>
          ))}
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

export const UsulPanel = memo(UsulPanelComponent);
