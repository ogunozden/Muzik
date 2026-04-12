/**
 * Component Tokens - Merkezi Komponent Tokenları
 * 
 * KULLANIM:
 * import { componentTokens } from '@/lib';
 * 
 * <button className={componentTokens.button.primary.md}>
 *   Buton
 * </button>
 */

import type {InstrumentType} from "@/engines/ses/instruments";

// ============================================
// BUTTON TOKENS
// ============================================
export const buttonTokens = {
  variant: {
    primary: {
      base: "bg-[var(--color-primary)] text-white",
      hover: "hover:bg-[var(--color-primary-dark)]",
      active: "active:bg-[var(--color-primary-dark)]",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
    secondary: {
      base: "bg-[var(--color-secondary)] text-white",
      hover: "hover:bg-[var(--color-secondary-dark)]",
      active: "active:bg-[var(--color-secondary-dark)]",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
    accent: {
      base: "bg-[var(--color-accent)] text-white",
      hover: "hover:bg-[var(--color-accent-dark)]",
      active: "active:bg-[var(--color-accent-dark)]",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
    ghost: {
      base: "bg-transparent text-[var(--color-text-primary)]",
      hover: "hover:bg-[var(--color-border)]",
      active: "active:bg-[var(--color-border-dark)]",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
    outline: {
      base: "border-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent",
      hover: "hover:bg-[var(--color-primary)] hover:text-white",
      active: "active:bg-[var(--color-primary-dark)]",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
    danger: {
      base: "bg-[var(--color-error)] text-white",
      hover: "hover:opacity-90",
      active: "active:opacity-80",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
    success: {
      base: "bg-[var(--color-success)] text-white",
      hover: "hover:opacity-90",
      active: "active:opacity-80",
      disabled: "disabled:opacity-50 disabled:cursor-not-allowed",
    },
  },
  size: {
    xs: "px-2 py-1 text-xs gap-1 rounded-md",
    sm: "px-3 py-1.5 text-sm gap-1.5 rounded-md",
    md: "px-4 py-2 text-base gap-2 rounded-lg",
    lg: "px-6 py-3 text-lg gap-2.5 rounded-xl",
    xl: "px-8 py-4 text-xl gap-3 rounded-xl",
    icon: {
      xs: "p-1 rounded-md",
      sm: "p-1.5 rounded-md",
      md: "p-2 rounded-lg",
      lg: "p-3 rounded-xl",
    },
  },
} as const;

// ============================================
// INPUT TOKENS
// ============================================
export const inputTokens = {
  variant: {
    default: {
      base: "border border-[var(--color-border)] bg-white text-[var(--color-text-primary)]",
      focus: "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none",
      error: "border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]/20",
      disabled: "disabled:bg-[var(--color-background)] disabled:text-[var(--color-text-disabled)] disabled:cursor-not-allowed",
    },
    filled: {
      base: "bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-primary)]",
      focus: "focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none",
      error: "border-[var(--color-error)] focus:border-[var(--color-error)]",
      disabled: "disabled:bg-[var(--color-background)] disabled:cursor-not-allowed",
    },
    flushed: {
      base: "border-b-2 border-[var(--color-border)] bg-transparent text-[var(--color-text-primary)] rounded-none",
      focus: "focus:border-[var(--color-primary)] focus:outline-none",
      error: "border-b-[var(--color-error)]",
      disabled: "disabled:opacity-50",
    },
  },
  size: {
    sm: "px-2 py-1 text-sm",
    md: "px-3 py-2 text-base",
    lg: "px-4 py-3 text-lg",
  },
} as const;

// ============================================
// CARD TOKENS
// ============================================
export const cardTokens = {
  variant: {
    default: {
      base: "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl",
      hover: "hover:shadow-md transition-shadow",
    },
    elevated: {
      base: "bg-[var(--color-surface)] rounded-xl shadow-md",
      hover: "hover:shadow-lg transition-shadow",
    },
    outline: {
      base: "border-2 border-[var(--color-border)] rounded-xl bg-transparent",
      hover: "hover:border-[var(--color-primary)] transition-colors",
    },
    ghost: {
      base: "bg-transparent",
      hover: "",
    },
  },
  padding: {
    none: "p-0",
    sm: "p-3",
    md: "p-4",
    lg: "p-6",
    xl: "p-8",
  },
} as const;

// ============================================
// BADGE TOKENS
// ============================================
export const badgeTokens = {
  color: {
    default: {
      solid: "bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]",
      dot: "bg-[var(--color-error)]",
    },
    primary: {
      solid: "bg-[var(--color-primary)] text-white",
      dot: "bg-[var(--color-primary)]",
    },
    secondary: {
      solid: "bg-[var(--color-secondary)] text-white",
      dot: "bg-[var(--color-secondary)]",
    },
    accent: {
      solid: "bg-[var(--color-accent)] text-white",
      dot: "bg-[var(--color-accent)]",
    },
    success: {
      solid: "bg-[var(--color-success)] text-white",
      dot: "bg-[var(--color-success)]",
    },
    warning: {
      solid: "bg-[var(--color-warning)] text-white",
      dot: "bg-[var(--color-warning)]",
    },
    error: {
      solid: "bg-[var(--color-error)] text-white",
      dot: "bg-[var(--color-error)]",
    },
  },
  size: {
    sm: "px-1.5 py-0.5 text-xs rounded-full",
    md: "px-2 py-1 text-sm rounded-full",
    lg: "px-3 py-1.5 text-base rounded-full",
  },
} as const;

// ============================================
// STATUS INDICATOR TOKENS
// ============================================
export const statusTokens = {
  active: {
    bg: "bg-[var(--color-success)]",
    text: "text-white",
    pulse: "animate-pulse",
  },
  inactive: {
    bg: "bg-[var(--color-text-disabled)]",
    text: "text-white",
    pulse: "",
  },
  recording: {
    bg: "bg-[var(--color-error)]",
    text: "text-white",
    pulse: "animate-pulse",
  },
  processing: {
    bg: "bg-[var(--color-warning)]",
    text: "text-white",
    pulse: "animate-pulse",
  },
  loading: {
    bg: "bg-[var(--color-primary)]",
    text: "text-white",
    pulse: "animate-pulse",
  },
} as const;

// ============================================
// USUL TOKENS - Türk Müziği Usül Sembolleri
// ============================================
export const usulTokens = {
  symbol: {
    dum: {
      glyph: "●",
      color: "text-[var(--color-primary)]",
      bg: "bg-[var(--color-primary)]",
      size: {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
      },
    },
    tek: {
      glyph: "●",
      color: "text-[var(--color-secondary)]",
      bg: "bg-[var(--color-secondary)]",
      size: {
        sm: "w-3 h-3",
        md: "w-4 h-4",
        lg: "w-6 h-6",
      },
    },
    ke: {
      glyph: "◐",
      color: "text-[var(--color-accent)]",
      bg: "bg-[var(--color-accent)]",
      size: {
        sm: "w-2 h-2",
        md: "w-3 h-3",
        lg: "w-5 h-5",
      },
    },
  },
  beatLine: {
    color: "bg-[var(--color-border)]",
    height: "h-0.5",
  },
  rest: {
    glyph: "−",
    color: "text-[var(--color-text-disabled)]",
  },
} as const;

// ============================================
// INSTRUMENT TOKENS - Enstrüman Renkleri
// ============================================
export const instrumentTokens = {
  color: {
    ud: {
      primary: "text-[#8B4513]",
      bg: "bg-[#8B4513]",
    },
    kemençe: {
      primary: "text-[#4A4A4A]",
      bg: "bg-[#4A4A4A]",
    },
    ney: {
      primary: "text-[#8FBC8F]",
      bg: "bg-[#8FBC8F]",
    },
    tanpura: {
      primary: "text-[#DAA520]",
      bg: "bg-[#DAA520]",
    },
    davul: {
      primary: "text-[#CD853F]",
      bg: "bg-[#CD853F]",
    },
    def: {
      primary: "text-[#D2691E]",
      bg: "bg-[#D2691E]",
    },
    bendir: {
      primary: "text-[#BC8F8F]",
      bg: "bg-[#BC8F8F]",
    },
    kudum: {
      primary: "text-[#708090]",
      bg: "bg-[#708090]",
    },
  } as Record<InstrumentType, {primary: string; bg: string}>,
} as const;

// ============================================
// LAYOUT TOKENS
// ============================================
export const layoutTokens = {
  section: {
    hero: {
      paddingY: "py-16 md:py-20 lg:py-24",
      paddingX: "px-6",
      maxWidth: "max-w-3xl",
    },
    content: {
      paddingY: "py-10 md:py-12",
      paddingX: "px-6",
      maxWidth: "max-w-6xl",
    },
    compact: {
      paddingY: "py-6 md:py-8",
      paddingX: "px-4",
      maxWidth: "max-w-4xl",
    },
  },
} as const;

// ============================================
// TYPE EXPORTS
// ============================================
export type ButtonVariant = keyof typeof buttonTokens.variant;
export type ButtonSize = keyof typeof buttonTokens.size;
export type InputVariant = keyof typeof inputTokens.variant;
export type InputSize = keyof typeof inputTokens.size;
export type CardVariant = keyof typeof cardTokens.variant;
export type BadgeColor = keyof typeof badgeTokens.color;
export type StatusType = keyof typeof statusTokens;
