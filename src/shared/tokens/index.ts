/**
 * Shared Tokens — TEK MERKEZ (ENGINEERING_RULESET: "Tek token kaynagi shared/tokens")
 *
 * Bu dosya artık DESIGN SYSTEM'in gerçek kaynağıdır.
 * `src/lib/design-system` yalnızca geriye dönük shim olarak re-export eder.
 * CSS değişkenlerinin tek gerçeği `shared/tokens/theme.css`’tir.
 */
import {colors as designColors} from "./colors";
import {radius as designRadius} from "./radius";
import {spacing as designSpacing} from "./spacing";

export const tokens = {
  colors: {
    primary: {
      base: "bg-[var(--color-primary-500)] text-white",
      hover: "hover:bg-[var(--color-primary-600)] text-white",
      light: "bg-[var(--color-primary-100)] text-[var(--color-primary-700)]",
    },
    // WCAG AA: `--color-secondary-500` (#925d00) uzerinde KOYU metin 3,28
    // veriyordu (esik 4,5) — axe taramasi yakaladi. Beyaz metin ayni zeminde
    // 5,54 veriyor; marka rengi degismeden esik asiliyor.
    secondary: {
      base: "bg-[var(--color-secondary-500)] text-white",
      hover: "hover:bg-[var(--color-secondary-600)] text-white",
    },
    accent: {
      base: "bg-[var(--color-accent)] text-white",
      hover: "hover:bg-[var(--color-primary-600)] text-white",
    },
    background: {
      base: "bg-[var(--color-bg-base)]",
      surface: "bg-[var(--color-bg-surface)]",
    },
    text: {
      primary: "text-[var(--color-text-primary)]",
      secondary: "text-[var(--color-text-secondary)]",
    },
    border: {
      base: "border-[var(--color-border-default)]",
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

export {designColors, designRadius, designSpacing};
export {colors} from "./colors";
export {spacing} from "./spacing";
export {radius} from "./radius";
