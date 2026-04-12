/**
 * Legacy Tokens - Geriye Uyumluluk
 * 
 * Eski token kullanımları için geriye uyumlu export.
 * Yeni kodlarda doğrudan '@/lib/design-system' veya '@/lib' kullanılmalıdır.
 */

import { 
  colors as designColors,
  spacing as designSpacing,
  typography as designTypography,
  radius as designRadius,
  shadows as designShadows,
} from "./design-system";

/**
 * Eski token formatı - geriye uyumlu
 */
export const tokens = {
  colors: {
    primary: {
      base: `bg-[${designColors.primary.DEFAULT}] text-white`,
      hover: `hover:bg-[${designColors.primary.DEFAULT}]/90`,
      light: `bg-[${designColors.secondary.DEFAULT}] text-white`,
    },
    secondary: {
      base: `bg-[${designColors.secondary.DEFAULT}] text-white`,
      hover: `hover:bg-[${designColors.secondary.DEFAULT}]/90`,
    },
    accent: {
      base: `bg-[${designColors.accent.DEFAULT}] text-white`,
      hover: `hover:bg-[${designColors.accent.DEFAULT}]/90`,
    },
    background: {
      base: designColors.background.base,
      surface: designColors.background.surface,
    },
    text: {
      primary: designColors.text.primary,
      secondary: designColors.text.secondary,
    },
    border: {
      base: `border-[${designColors.border.DEFAULT}]`,
    },
    feedback: {
      error: designColors.feedback.error,
      success: designColors.feedback.success,
    },
  },
  spacing: {
    xs: designSpacing.padding.xs,
    sm: designSpacing.padding.sm,
    md: designSpacing.padding.md,
    lg: designSpacing.padding.lg,
    xl: designSpacing.padding.xl,
  },
  radius: {
    sm: designRadius.DEFAULT.sm,
    md: designRadius.DEFAULT.md,
    lg: designRadius.DEFAULT.lg,
    full: designRadius.DEFAULT.full,
  },
} as const;

// Design system export'ları
export { designColors, designSpacing, designTypography, designRadius, designShadows };
