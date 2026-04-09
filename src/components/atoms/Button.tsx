"use client";

import {Button as HeroUIButton, ButtonProps as HeroUIButtonProps} from "@heroui/react";
import {tokens} from "@/lib/tokens";

interface CustomButtonProps extends Omit<HeroUIButtonProps, "className" | "variant" | "size"> {
  variant?: "primary" | "secondary" | "accent" | "bordered" | "light";
  size?: "xs" | "sm" | "md" | "lg";
  ariaLabel: string;
  className?: string;
}

const variantClasses: Record<string, string> = {
  primary: `${tokens.colors.primary.base} ${tokens.colors.primary.hover}`,
  secondary: `${tokens.colors.secondary.base} ${tokens.colors.secondary.hover}`,
  accent: `${tokens.colors.accent.base} ${tokens.colors.accent.hover}`,
  bordered: `border ${tokens.colors.border.base} ${tokens.colors.text.primary}`,
  light: tokens.colors.primary.light,
};

const sizeClasses: Record<string, string> = {
  xs: "px-2 py-0.5 text-xs",
  sm: "px-3 py-1 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  ariaLabel,
  className = "",
  ...props
}: CustomButtonProps) {
  return (
    <HeroUIButton
      {...props}
      aria-label={ariaLabel}
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${tokens.radius.md} ${className}`}
    />
  );
}
