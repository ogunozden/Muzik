"use client";

import type {InputHTMLAttributes} from "react";
import {tokens} from "@/shared/tokens";

interface CustomInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: string;
  ariaLabel?: string;
  isDisabled?: boolean;
  className?: string;
}

export function Input({
  label,
  ariaLabel,
  isDisabled,
  className = "",
  id,
  ...props
}: CustomInputProps) {
  const inputId = id ?? (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined);
  const ariaLabelValue = ariaLabel ?? props["aria-label"];

  return (
    <div
      className={`flex flex-col gap-1 ${tokens.colors.background.surface} ${tokens.radius.md} ${className}`}
      data-testid="mock-input-container"
    >
      {label && (
        <label htmlFor={inputId} className={`text-sm ${tokens.colors.text.secondary}`}>
          {label}
        </label>
      )}
      <input
        {...props}
        id={inputId}
        aria-label={ariaLabelValue}
        disabled={props.disabled || isDisabled}
        className={`w-full rounded-md border ${tokens.colors.border.base} bg-white px-3 py-2 text-sm ${tokens.colors.text.primary}`}
        data-testid="mock-input"
      />
    </div>
  );
}
