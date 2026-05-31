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
    DEFAULT: "var(--color-primary-500)",
    light: "var(--color-primary-100)",
    dark: "var(--color-primary-700)",
    bg: "bg-[var(--color-primary-500)]",
    text: "text-[var(--color-primary-700)]",
    border: "border-[var(--color-primary-500)]",
    hover: "hover:bg-[var(--color-primary-600)]",
  },

  // ============================================
  // SECONDARY - İkincil Renk
  // ============================================
  secondary: {
    DEFAULT: "var(--color-secondary-500)",
    light: "var(--color-secondary-100)",
    dark: "var(--color-secondary-700)",
    bg: "bg-[var(--color-secondary-500)]",
    text: "text-[var(--color-secondary-700)]",
    border: "border-[var(--color-secondary-500)]",
    hover: "hover:bg-[var(--color-secondary-600)]",
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
    base: "bg-[var(--color-bg-base)]",
    surface: "bg-[var(--color-bg-surface)]",
    elevated: "bg-[var(--color-bg-elevated)]",
  },

  // ============================================
  // TEXT - Metin Renkleri
  // ============================================
  text: {
    primary: "text-[var(--color-text-primary)]",
    secondary: "text-[var(--color-text-secondary)]",
    disabled: "text-[var(--color-text-disabled)]",
    inverse: "text-[var(--color-text-inverse)]",
    link: "text-[var(--color-primary-600)] hover:underline",
  },

  // ============================================
  // BORDER - Kenarlık Renkleri
  // ============================================
  border: {
    DEFAULT: "border-[var(--color-border-default)]",
    light: "border-[var(--color-border-subtle)]",
    dark: "border-[var(--color-border-strong)]",
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
    dum: "text-[var(--color-primary-700)]",
    tek: "text-[var(--color-secondary-700)]",
    ke: "text-[var(--color-accent)]",
  },
} as const;

export type Colors = typeof colors;
