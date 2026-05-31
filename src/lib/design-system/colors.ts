/**
 * Design System - Color Tokens
 * Merkezi renk tanımları
 */

export const colors = {
  // Ana renkler - Primary palette
  primary: {
    DEFAULT: "var(--color-primary-500)",
    light: "var(--color-primary-100)",
    dark: "var(--color-primary-700)",
  },
  
  // İkincil renkler - Secondary palette
  secondary: {
    DEFAULT: "var(--color-secondary-500)",
    light: "var(--color-secondary-100)",
    dark: "var(--color-secondary-700)",
  },
  
  // Vurgu rengi - Accent palette
  accent: {
    DEFAULT: "var(--color-accent)",
    light: "var(--color-accent-light)",
    dark: "var(--color-accent-dark)",
  },
  
  // Arka plan - Background
  background: {
    base: "var(--color-bg-base)",
    surface: "var(--color-bg-surface)",
    elevated: "var(--color-bg-elevated)",
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
    DEFAULT: "var(--color-border-default)",
    light: "var(--color-border-subtle)",
    dark: "var(--color-border-strong)",
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
    dum: "var(--color-primary-500)",
    tek: "var(--color-secondary-500)",
    ke: "var(--color-accent)",
  },
} as const;

export type ColorToken = typeof colors;
export type ColorCategory = keyof ColorToken;
