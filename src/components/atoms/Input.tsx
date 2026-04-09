"use client";

import {Input as HeroUIInput, InputProps as HeroUIInputProps} from "@heroui/react";
import {tokens} from "@/lib/tokens";

interface CustomInputProps extends Omit<HeroUIInputProps, "className"> {
  label?: string;
  ariaLabel: string;
  className?: string;
}

export function Input({
  label,
  ariaLabel,
  className = "",
  ...props
}: CustomInputProps) {
  return (
    <HeroUIInput
      {...props}
      label={label}
      aria-label={ariaLabel}
      className={`${tokens.colors.background.surface} ${tokens.radius.md} ${className}`}
    />
  );
}
