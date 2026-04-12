/**
 * Design System - Main Index
 * 
 * Merkezi design tokens ve utilities
 * Usage:
 *   import { colors, typography, spacing } from '@/lib/design-system'
 *   import '@/lib/design-system/theme.css'
 */

// Core design tokens
export { colors } from "./colors";
export { typography } from "./typography";
export { spacing, borderRadius, shadows, transitions, zIndex, spacingClasses } from "./spacing";
export { radius } from "./radius";

// Component utilities
export * from "./components";

// ============================================
// EXTENDED TOKENS
// ============================================

/**
 * Extended color tokens with OKLCH values
 * For custom styling beyond CSS variables
 */
export const extendedTokens = {
  colors: {
    primary: {
      50: "oklch(96% 0.01 45)",
      100: "oklch(92% 0.02 45)",
      200: "oklch(85% 0.04 45)",
      300: "oklch(75% 0.06 45)",
      400: "oklch(60% 0.08 45)",
      500: "oklch(48% 0.10 45)",
      600: "oklch(38% 0.10 45)",
      700: "oklch(30% 0.10 45)",
      800: "oklch(22% 0.08 45)",
      900: "oklch(15% 0.06 45)",
    },
    secondary: {
      50: "oklch(97% 0.02 85)",
      100: "oklch(93% 0.04 85)",
      200: "oklch(85% 0.08 85)",
      300: "oklch(75% 0.12 85)",
      400: "oklch(62% 0.15 85)",
      500: "oklch(52% 0.16 85)",
      600: "oklch(42% 0.14 85)",
      700: "oklch(34% 0.12 85)",
      800: "oklch(26% 0.10 85)",
      900: "oklch(20% 0.08 85)",
    },
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    "2xl": "3rem",
    "3xl": "4rem",
  },
  radius: {
    sm: "0.25rem",
    DEFAULT: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    full: "9999px",
  },
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * CSS variable string oluşturur
 */
export function cssVar(name: string): string {
  return `var(--${name})`;
}

/**
 * Oklch'den CSS string'e dönüştürür
 */
export function oklch(l: number, c: number, h: number): string {
  return `oklch(${l}% ${c} ${h})`;
}

/**
 * Lightness'e göre metin rengi döndürür
 */
export function getContrastText(lightness: number): "white" | "black" {
  return lightness < 60 ? "white" : "black";
}

// ============================================
// DESIGN CONTEXT
// ============================================

/**
 * Design context - proje için önemli kararlar
 */
export const designContext = {
  /** Marka kişiliği */
  brand: {
    adjectives: ["Öğretici", "Geleneksel", "Dinamik"],
    tone: "Sakin ama canlı",
  },
  /** Tema */
  theme: "light",
  /** Renk yaklaşımı */
  colorApproach: "Toprak tonları - sıcak, doğal",
  /** Tipografi yaklaşımı */
  typographyApproach: "Okunabilir, temiz, odaklanmayı destekleyen",
  /** Anti-patterns */
  antiPatterns: [
    "Aşırı animasyon",
    "Kalabalık layout",
    "Göz yorucu renkler",
    "Gereksiz dekorasyon",
  ],
} as const;

export type DesignContext = typeof designContext;
