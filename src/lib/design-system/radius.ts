/**
 * Design System - Border Radius Tokens
 * Merkezi köşe yuvarlama tanımları
 */

export const radius = {
  // Temel radius değerleri
  DEFAULT: {
    none: "rounded-none",
    sm: "rounded-sm",       // 2px
    DEFAULT: "rounded",      // 4px
    md: "rounded-md",        // 6px
    lg: "rounded-lg",        // 8px
    xl: "rounded-xl",        // 12px
    "2xl": "rounded-2xl",    // 16px
    "3xl": "rounded-3xl",    // 24px
    full: "rounded-full",
  },
  
  // Usul specific - Düm vuruşu (büyük)
  usulDum: "rounded-full",
  
  // Usul specific - Tek/Ke vuruşu (küçük)
  usulTek: "rounded-sm",
  
  // Kart radius
  card: "rounded-xl",
  
  // Buton radius
  button: {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
    full: "rounded-full",
  },
  
  // Input radius
  input: {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
  },
} as const;

export type RadiusToken = typeof radius;
