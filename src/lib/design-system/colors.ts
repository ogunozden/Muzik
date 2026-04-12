/**
 * Design System - Color Tokens
 * Merkezi renk tanımları
 */

export const colors = {
  // Ana renkler - Primary palette
  primary: {
    DEFAULT: "var(--color-primary)",
    light: "var(--color-primary-light)",
    dark: "var(--color-primary-dark)",
  },
  
  // İkincil renkler - Secondary palette
  secondary: {
    DEFAULT: "var(--color-secondary)",
    light: "var(--color-secondary-light)",
    dark: "var(--color-secondary-dark)",
  },
  
  // Vurgu rengi - Accent palette
  accent: {
    DEFAULT: "var(--color-accent)",
    light: "var(--color-accent-light)",
    dark: "var(--color-accent-dark)",
  },
  
  // Arka plan - Background
  background: {
    base: "var(--color-background)",
    surface: "var(--color-surface)",
    elevated: "var(--color-elevated)",
  },
  
  // Metin - Text
  text: {
    primary: "var(--color-text-primary)",
    secondary: "var(--color-text-secondary)",
    disabled: "var(--color-text-disabled)",
    inverse: "var(--color-text-inverse)",
  },
  
  // Kenarlık - Border
  border: {
    DEFAULT: "var(--color-border)",
    light: "var(--color-border-light)",
    dark: "var(--color-border-dark)",
  },
  
  // Geri bildirim - Feedback
  feedback: {
    error: "var(--color-error)",
    warning: "var(--color-warning)",
    success: "var(--color-success)",
    info: "var(--color-info)",
  },
  
  // Usül sembolleri - Rhythm symbols
  usul: {
    dum: "var(--color-primary)",
    tek: "var(--color-secondary)",
    ke: "var(--color-accent)",
  },
} as const;

export type ColorToken = typeof colors;
export type ColorCategory = keyof ColorToken;
