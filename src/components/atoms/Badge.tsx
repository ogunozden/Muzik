"use client";

import {Badge as HeroUIBadge, BadgeProps as HeroUIBadgeProps} from "@heroui/react";
import {tokens} from "@/lib/tokens";

type BadgeColor = "primary" | "secondary" | "accent" | "success" | "warning" | "danger";

interface CustomBadgeProps {
  color?: BadgeColor;
  ariaLabel: string;
  className?: string;
  children?: React.ReactNode;
}

const colorClasses: Record<BadgeColor, string> = {
  primary: tokens.colors.primary.base,
  secondary: tokens.colors.secondary.base,
  accent: tokens.colors.accent.base,
  success: "bg-[#388E3C] text-white",
  warning: "bg-[#F57C00] text-white",
  danger: "bg-[#D32F2F] text-white",
};

const heroColorMap: Record<BadgeColor, HeroUIBadgeProps["color"]> = {
  primary: "primary",
  secondary: "secondary",
  accent: "secondary",
  success: "success",
  warning: "warning",
  danger: "danger",
};

export function Badge({
  color = "primary",
  ariaLabel,
  className = "",
  children,
}: CustomBadgeProps) {
  return (
    <HeroUIBadge
      color={heroColorMap[color]}
      aria-label={ariaLabel}
      className={`${colorClasses[color]} ${tokens.radius.full} px-2 py-0.5 text-xs ${className}`}
    >
      {children}
    </HeroUIBadge>
  );
}
