"use client";

import {tokens} from "@/shared/tokens";
import {Select} from "@/components/atoms/Select";

interface LabeledSelectProps {
  label: string;
  ariaLabel: string;
  items: Array<{key: string; label: string}>;
  value?: string;
  onChange?: (key: string) => void;
  placeholder?: string;
  className?: string;
}

export function LabeledSelect({
  label,
  ariaLabel,
  items,
  value,
  onChange,
  placeholder,
  className = "",
}: LabeledSelectProps) {
  const selectId = `labeled-select-${ariaLabel.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={selectId} className={`text-sm ${tokens.colors.text.secondary}`}>{label}</label>
      <Select
        id={selectId}
        ariaLabel={ariaLabel}
        items={items}
        selectedKeys={new Set(value ? [value] : [])}
        onSelectionChange={(keys) => onChange?.(Array.from(keys)[0] as string)}
        placeholder={placeholder}
      />
    </div>
  );
}
