"use client";

import {Slider, SliderProps} from "@heroui/react";
import {tokens} from "@/lib/tokens";

interface LabeledSliderProps extends Omit<SliderProps, "className"> {
  label: string;
  ariaLabel: string;
  className?: string;
}

export function LabeledSlider({
  label,
  ariaLabel,
  className = "",
  ...props
}: LabeledSliderProps) {
  const sliderId = `labeled-slider-${ariaLabel.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={sliderId} className={`text-sm ${tokens.colors.text.secondary}`}>{label}</label>
      <Slider
        {...props}
        id={sliderId}
        aria-label={ariaLabel}
        className={`max-w-md ${tokens.colors.primary.light}`}
      />
    </div>
  );
}
