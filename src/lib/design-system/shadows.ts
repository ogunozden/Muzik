/**
 * Design System - Shadow Tokens
 * Merkezi gölge tanımları
 */

export const shadows = {
  // Temel gölge değerleri
  DEFAULT: {
    none: "shadow-none",
    sm: "shadow-sm",
    DEFAULT: "shadow",
    md: "shadow-md",
    lg: "shadow-lg",
    xl: "shadow-xl",
    "2xl": "shadow-2xl",
  },
  
  // Özel gölgeler
  card: {
    DEFAULT: "shadow-sm",
    hover: "shadow-md",
    active: "shadow-lg",
  },
  
  // Z-index değerleri
  zIndex: {
    dropdown: "z-10",
    sticky: "z-20",
    fixed: "z-30",
    modalBackdrop: "z-40",
    modal: "z-50",
    toast: "z-60",
    tooltip: "z-70",
  },
} as const;

export type ShadowToken = typeof shadows;
