"use client";

import React from "react";
import {tokens} from "@/shared/tokens";

interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "bordered" | "outline" | "light" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  ariaLabel?: string;
  isDisabled?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: `${tokens.colors.primary.base} ${tokens.colors.primary.hover}`,
  secondary: `${tokens.colors.secondary.base} ${tokens.colors.secondary.hover}`,
  accent: `${tokens.colors.accent.base} ${tokens.colors.accent.hover}`,
  bordered: `border ${tokens.colors.border.base} ${tokens.colors.text.primary}`,
  outline: `border ${tokens.colors.border.base} ${tokens.colors.text.primary} bg-transparent hover:bg-[var(--color-bg-muted)]`,
  light: tokens.colors.primary.light,
  danger: "bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90",
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
  isDisabled,
  className = "",
  children,
  onPress,
  ...props
}: CustomButtonProps & { onPress?: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  const disabled = props.disabled || isDisabled;
  const ariaLabelValue = ariaLabel ?? props["aria-label"];
  const baseClasses = "inline-flex items-center justify-center font-medium transition-colors cursor-pointer border-0 disabled:cursor-not-allowed disabled:opacity-60";
  const finalClassName = `${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} rounded-md ${className}`;

  return (
    <button
      {...props}
      disabled={disabled}
      onClick={onPress || props.onClick}
      aria-label={ariaLabelValue}
      className={finalClassName}
    >
      {children}
    </button>
  );
}
