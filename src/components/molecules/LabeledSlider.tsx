"use client";

import type {InputHTMLAttributes} from "react";
import {tokens} from "@/lib/tokens";

interface LabeledSliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "type" | "value" | "onChange" | "size"> {
  label: string;
  ariaLabel: string;
  className?: string;
  value?: number;
  minValue?: number;
  maxValue?: number;
  step?: number;
  size?: "sm" | "md";
  isDisabled?: boolean;
  onChange?: (value: number) => void;
}

export function LabeledSlider({
  label,
  ariaLabel,
  className = "",
  value,
  minValue,
  maxValue,
  step,
  size = "md",
  isDisabled,
  onChange,
  ...props
}: LabeledSliderProps) {
  const sliderId = `labeled-slider-${ariaLabel.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={sliderId} className={`text-sm ${tokens.colors.text.secondary}`}>{label}</label>
      <input
        {...props}
        type="range"
        id={sliderId}
        aria-label={ariaLabel}
        data-testid="mock-slider"
        min={minValue}
        max={maxValue}
        step={step}
        value={value ?? ""}
        disabled={props.disabled || isDisabled}
        onChange={(event) => onChange?.(Number(event.target.value))}
        className={`${size === "sm" ? "h-1.5" : "h-2"} max-w-md accent-[var(--color-primary)] ${tokens.colors.primary.light}`}
      />
    </div>
  );
}
