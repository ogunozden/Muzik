"use client";

import type {HTMLAttributes} from "react";
import {tokens} from "@/lib/tokens";

type BadgeColor = "default" | "primary" | "secondary" | "accent" | "success" | "warning" | "danger";
type BadgeSize = "sm" | "md";
type BadgeVariant = "solid" | "outline";

interface CustomBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  color?: BadgeColor;
  size?: BadgeSize;
  variant?: BadgeVariant;
  ariaLabel?: string;
  className?: string;
  children?: React.ReactNode;
}

const colorClasses: Record<BadgeColor, string> = {
  default: "bg-[var(--color-bg-muted)] text-[var(--color-text-primary)]",
  primary: tokens.colors.primary.base,
  secondary: tokens.colors.secondary.base,
  accent: tokens.colors.accent.base,
  success: "bg-[var(--color-success)] text-white",
  warning: "bg-[var(--color-warning)] text-[var(--color-text-primary)]",
  danger: "bg-[var(--color-error)] text-white",
};

export function Badge({
  color = "primary",
  size = "md",
  variant = "solid",
  ariaLabel,
  className = "",
  children,
  ...props
}: CustomBadgeProps) {
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  const outlineClass = variant === "outline" ? "bg-transparent border border-current" : "";
  const ariaLabelValue = ariaLabel ?? props["aria-label"];

  return (
    <span
      {...props}
      data-color={color}
      data-testid="mock-badge"
      aria-label={ariaLabelValue}
      className={`${colorClasses[color]} ${outlineClass} ${tokens.radius.full} ${sizeClass} ${className}`}
    >
      {children}
    </span>
  );
}
