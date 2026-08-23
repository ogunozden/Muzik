"use client";

import React from "react";

type SelectionKeys = Set<string> | Iterable<string>;

type CustomSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "children" | "value" | "onChange"
> & {
  label?: string;
  ariaLabel: string;
  className?: string;
  items?: Array<{key: string; label: string}>;
  groups?: Array<{label: string; items: Array<{key: string; label: string}>}>;
  selectedKeys?: SelectionKeys;
  onSelectionChange?: (keys: Set<string>) => void;
  isDisabled?: boolean;
  placeholder?: string;
};

export function Select({
  label,
  ariaLabel,
  className = "",
  items,
  groups,
  selectedKeys,
  onSelectionChange,
  isDisabled,
  placeholder,
  id,
  ...props
}: CustomSelectProps) {
  const selectedValue =
    selectedKeys && selectedKeys !== "all"
      ? String(Array.from(selectedKeys)[0] ?? "")
      : "";

  return (
    <div
      aria-label={ariaLabel}
      data-placeholder={placeholder}
      className={className}
      data-testid="mock-select"
    >
      {label && <span data-testid="mock-label">{label}</span>}
      <select
        {...props}
        id={id}
        aria-label={ariaLabel}
        className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-text-primary)]"
        data-testid="mock-items"
        disabled={props.disabled || isDisabled}
        value={selectedValue}
        onChange={(event) => onSelectionChange?.(new Set(event.target.value ? [event.target.value] : []))}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {groups && groups.length > 0
          ? groups.map((group) => (
              <optgroup key={group.label} label={group.label} data-testid={`group-${group.label}`}>
                {group.items.map((item) => (
                  <option key={item.key} value={item.key} data-testid={`item-${item.key}`}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))
          : (items ?? []).map((item) => (
              <option key={item.key} value={item.key} data-testid={`item-${item.key}`}>
                {item.label}
              </option>
            ))}
      </select>
    </div>
  );
}
