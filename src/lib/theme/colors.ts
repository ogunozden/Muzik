/**
 * Colors - Merkezi Renk Tokenları
 * 
 * KULLANIM:
 * import { colors } from '@/lib';
 * 
 * <div className={colors.background.surface}>
 *   <h1 className={colors.text.primary}>Başlık</h1>
 * </div>
 */

export const colors = {
  // ============================================
  // PRIMARY - Ana Marka Rengi
  // ============================================
  primary: {
    DEFAULT: "var(--color-primary)",
    light: "var(--color-primary-light)",
    dark: "var(--color-primary-dark)",
    bg: "bg-[var(--color-primary)]",
    text: "text-[var(--color-primary)]",
    border: "border-[var(--color-primary)]",
    hover: "hover:bg-[var(--color-primary)]/90",
  },

  // ============================================
  // SECONDARY - İkincil Renk
  // ============================================
  secondary: {
    DEFAULT: "var(--color-secondary)",
    light: "var(--color-secondary-light)",
    dark: "var(--color-secondary-dark)",
    bg: "bg-[var(--color-secondary)]",
    text: "text-[var(--color-secondary)]",
    border: "border-[var(--color-secondary)]",
    hover: "hover:bg-[var(--color-secondary)]/90",
  },

  // ============================================
  // ACCENT - Vurgu Rengi
  // ============================================
  accent: {
    DEFAULT: "var(--color-accent)",
    light: "var(--color-accent-light)",
    dark: "var(--color-accent-dark)",
    bg: "bg-[var(--color-accent)]",
    text: "text-[var(--color-accent)]",
    border: "border-[var(--color-accent)]",
    hover: "hover:bg-[var(--color-accent)]/90",
  },

  // ============================================
  // BACKGROUND - Arka Plan Renkleri
  // ============================================
  background: {
    base: "bg-[var(--color-background)]",
    surface: "bg-[var(--color-surface)]",
    elevated: "bg-[var(--color-elevated)]",
  },

  // ============================================
  // TEXT - Metin Renkleri
  // ============================================
  text: {
    primary: "text-[var(--color-text-primary)]",
    secondary: "text-[var(--color-text-secondary)]",
    disabled: "text-[var(--color-text-disabled)]",
    inverse: "text-[var(--color-text-inverse)]",
    link: "text-[var(--color-primary)] hover:underline",
  },

  // ============================================
  // BORDER - Kenarlık Renkleri
  // ============================================
  border: {
    DEFAULT: "border-[var(--color-border)]",
    light: "border-[var(--color-border-light)]",
    dark: "border-[var(--color-border-dark)]",
  },

  // ============================================
  // FEEDBACK - Geri Bildirim Renkleri
  // ============================================
  feedback: {
    error: {
      DEFAULT: "text-[var(--color-error)]",
      bg: "bg-[var(--color-error)]",
      text: "text-white",
      border: "border-[var(--color-error)]",
    },
    success: {
      DEFAULT: "text-[var(--color-success)]",
      bg: "bg-[var(--color-success)]",
      text: "text-white",
      border: "border-[var(--color-success)]",
    },
    warning: {
      DEFAULT: "text-[var(--color-warning)]",
      bg: "bg-[var(--color-warning)]",
      text: "text-white",
      border: "border-[var(--color-warning)]",
    },
    info: {
      DEFAULT: "text-[var(--color-info)]",
      bg: "bg-[var(--color-info)]",
      text: "text-white",
      border: "border-[var(--color-info)]",
    },
  },

  // ============================================
  // USUL - Usül Sembol Renkleri
  // ============================================
  usul: {
    dum: "text-[var(--color-primary)]",
    tek: "text-[var(--color-secondary)]",
    ke: "text-[var(--color-accent)]",
  },
} as const;

export type Colors = typeof colors;
