/**
 * Design System - Component Tokens
 * 
 * Reusable component patterns
 * Reference: src/lib/design-system/theme.css
 */

// ============================================
// BUTTON
// ============================================

export const button = {
  // Sizes
  size: {
    xs: {
      height: "1.75rem",    // 28px
      paddingX: "0.5rem",   // px-2
      fontSize: "0.75rem",  // text-xs
    },
    sm: {
      height: "2rem",       // 32px
      paddingX: "0.75rem",  // px-3
      fontSize: "0.875rem", // text-sm
    },
    md: {
      height: "2.5rem",     // 40px
      paddingX: "1rem",     // px-4
      fontSize: "0.875rem",  // text-sm
    },
    lg: {
      height: "3rem",       // 48px
      paddingX: "1.25rem", // px-5
      fontSize: "1rem",     // text-base
    },
    xl: {
      height: "3.5rem",     // 56px
      paddingX: "1.5rem",   // px-6
      fontSize: "1rem",     // text-base
    },
  },
  
  // Variants
  variant: {
    primary: {
      bg: "var(--color-primary-500)",
      bgHover: "var(--color-primary-600)",
      bgActive: "var(--color-primary-700)",
      text: "var(--color-text-inverse)",
      border: "transparent",
    },
    secondary: {
      bg: "var(--color-secondary-500)",
      bgHover: "var(--color-secondary-600)",
      bgActive: "var(--color-secondary-700)",
      text: "var(--color-text-primary)",
      border: "transparent",
    },
    outline: {
      bg: "transparent",
      bgHover: "var(--color-bg-muted)",
      bgActive: "var(--color-border-subtle)",
      text: "var(--color-text-primary)",
      border: "var(--color-border-default)",
    },
    ghost: {
      bg: "transparent",
      bgHover: "var(--color-bg-muted)",
      bgActive: "var(--color-border-subtle)",
      text: "var(--color-text-secondary)",
      border: "transparent",
    },
    link: {
      bg: "transparent",
      bgHover: "transparent",
      bgActive: "transparent",
      text: "var(--color-primary-500)",
      border: "transparent",
    },
  },
  
  // Border radius
  radius: {
    none: "0",
    sm: "var(--radius-sm)",
    DEFAULT: "var(--radius-md)",
    lg: "var(--radius-lg)",
    full: "var(--radius-full)",
  },
  
  // Transition
  transition: "background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast)",
} as const;

// ============================================
// INPUT
// ============================================

export const input = {
  // Sizes
  size: {
    sm: {
      height: "2rem",       // 32px
      paddingX: "0.75rem",  // px-3
      fontSize: "0.875rem", // text-sm
    },
    md: {
      height: "2.5rem",     // 40px
      paddingX: "1rem",    // px-4
      fontSize: "0.875rem", // text-sm
    },
    lg: {
      height: "3rem",       // 48px
      paddingX: "1.25rem", // px-5
      fontSize: "1rem",     // text-base
    },
  },
  
  // States
  state: {
    default: {
      bg: "var(--color-bg-surface)",
      border: "var(--color-border-default)",
      text: "var(--color-text-primary)",
      placeholder: "var(--color-text-tertiary)",
    },
    hover: {
      border: "var(--color-border-strong)",
    },
    focus: {
      border: "var(--color-primary-400)",
      ring: "var(--shadow-focus)",
    },
    error: {
      border: "var(--color-error)",
      ring: "0 0 0 3px oklch(55% 0.15 25 / 0.2)",
    },
    disabled: {
      bg: "var(--color-bg-muted)",
      text: "var(--color-text-disabled)",
      cursor: "not-allowed",
    },
  },
  
  // Transition
  transition: "border-color var(--transition-fast), background-color var(--transition-fast)",
} as const;

// ============================================
// CARD
// ============================================

export const card = {
  // Padding
  padding: {
    none: "0",
    sm: "var(--space-3)",
    DEFAULT: "var(--space-4)",
    lg: "var(--space-6)",
    xl: "var(--space-8)",
  },
  
  // Border
  border: {
    default: "1px solid var(--color-border-subtle)",
    strong: "1px solid var(--color-border-default)",
    none: "none",
  },
  
  // Shadow
  shadow: {
    none: "none",
    sm: "var(--shadow-sm)",
    DEFAULT: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
  },
  
  // Radius
  radius: {
    none: "0",
    sm: "var(--radius-sm)",
    DEFAULT: "var(--radius-lg)",
    lg: "var(--radius-xl)",
    "2xl": "var(--radius-2xl)",
  },
  
  // Background
  bg: {
    surface: "var(--color-bg-surface)",
    elevated: "var(--color-bg-elevated)",
    muted: "var(--color-bg-muted)",
  },
} as const;

// ============================================
// LABEL
// ============================================

export const label = {
  // Sizes
  size: {
    sm: {
      fontSize: "var(--text-xs)",
      fontWeight: 500,
      marginBottom: "var(--space-1)",
    },
    md: {
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      marginBottom: "var(--space-1-5)",
    },
    lg: {
      fontSize: "var(--text-base)",
      fontWeight: 500,
      marginBottom: "var(--space-2)",
    },
  },
  
  // Required indicator
  required: {
    color: "var(--color-error)",
    marginLeft: "var(--space-1)",
  },
} as const;

// ============================================
// BADGE
// ============================================

export const badge = {
  // Sizes
  size: {
    sm: {
      height: "1.25rem",    // 20px
      paddingX: "0.375rem", // px-1.5
      fontSize: "0.625rem", // text-xs
    },
    md: {
      height: "1.5rem",     // 24px
      paddingX: "0.5rem",   // px-2
      fontSize: "0.75rem",  // text-xs
    },
    lg: {
      height: "1.75rem",    // 28px
      paddingX: "0.625rem", // px-2.5
      fontSize: "0.875rem", // text-sm
    },
  },
  
  // Variants
  variant: {
    default: {
      bg: "var(--color-bg-muted)",
      text: "var(--color-text-secondary)",
    },
    primary: {
      bg: "var(--color-primary-100)",
      text: "var(--color-primary-700)",
    },
    secondary: {
      bg: "var(--color-secondary-100)",
      text: "var(--color-secondary-700)",
    },
    success: {
      bg: "var(--color-success-light)",
      text: "var(--color-success-dark)",
    },
    warning: {
      bg: "var(--color-warning-light)",
      text: "var(--color-warning-dark)",
    },
    error: {
      bg: "var(--color-error-light)",
      text: "var(--color-error-dark)",
    },
  },
  
  // Radius
  radius: {
    DEFAULT: "var(--radius-full)",
  },
} as const;

// ============================================
// DIVIDER
// ============================================

export const divider = {
  // Width
  width: {
    DEFAULT: "1px",
    0: "0",
    2: "2px",
  },
  
  // Style
  style: {
    solid: "solid",
    dashed: "dashed",
    dotted: "dotted",
  },
  
  // Color
  color: {
    DEFAULT: "var(--color-border-default)",
    subtle: "var(--color-border-subtle)",
    strong: "var(--color-border-strong)",
  },
} as const;

// ============================================
// USÜL SYMBOLS
// ============================================

export const usulSymbols = {
  // Symbol sizes
  size: {
    sm: {
      width: "1.5rem",      // 24px
      height: "1.5rem",     // 24px
      fontSize: "0.875rem", // text-sm
    },
    md: {
      width: "2rem",        // 32px
      height: "2rem",       // 32px
      fontSize: "1rem",     // text-base
    },
    lg: {
      width: "2.5rem",      // 40px
      height: "2.5rem",     // 40px
      fontSize: "1.25rem",  // text-xl
    },
    xl: {
      width: "3rem",        // 48px
      height: "3rem",       // 48px
      fontSize: "1.5rem",    // text-2xl
    },
  },
  
  // Symbol colors
  color: {
    dum: "var(--color-usul-dum)",  // Primary - dümbelek
    tek: "var(--color-usul-tek)",  // Secondary - tef
    ke: "var(--color-usul-ke)",   // Dark - ke
  },
  
  // Font weight for symbols
  fontWeight: {
    dum: 700,  // Bold
    tek: 500,  // Medium
    ke: 400,   // Normal
  },
} as const;

// ============================================
// CSS CLASS MAPPINGS
// ============================================

export const componentClasses = {
  button: {
    base: "inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    size: {
      xs: "h-7 px-2 text-xs",
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-5 text-base",
      xl: "h-14 px-6 text-base",
    },
    variant: {
      primary: "bg-[var(--color-primary-500)] text-white hover:bg-[var(--color-primary-600)] focus-visible:ring-[var(--color-primary-400)]",
      secondary: "bg-[var(--color-secondary-500)] text-[var(--color-text-primary)] hover:bg-[var(--color-secondary-600)]",
      outline: "border border-[var(--color-border-default)] bg-transparent hover:bg-[var(--color-bg-muted)]",
      ghost: "bg-transparent hover:bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]",
      link: "bg-transparent hover:underline text-[var(--color-primary-500)]",
    },
    radius: {
      none: "rounded-none",
      sm: "rounded-sm",
      DEFAULT: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-full",
    },
  },
  
  input: {
    base: "flex w-full bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-tertiary)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
    size: {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-5 text-base",
    },
    state: {
      default: "border border-[var(--color-border-default)]",
      error: "border border-[var(--color-error)] ring-2 ring-[oklch(55%_0.15_25_/_0.2)]",
    },
  },
  
  card: {
    base: "bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] rounded-lg",
    padding: {
      none: "",
      sm: "p-3",
      DEFAULT: "p-4",
      lg: "p-6",
      xl: "p-8",
    },
    shadow: {
      none: "",
      sm: "shadow-sm",
      DEFAULT: "shadow-md",
      lg: "shadow-lg",
    },
  },
  
  label: {
    base: "text-sm font-medium text-[var(--color-text-primary)]",
  },
  
  badge: {
    base: "inline-flex items-center font-medium",
    size: {
      sm: "h-5 px-1.5 text-xs",
      md: "h-6 px-2 text-xs",
      lg: "h-7 px-2.5 text-sm",
    },
    variant: {
      default: "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]",
      primary: "bg-[var(--color-primary-100)] text-[var(--color-primary-700)]",
      secondary: "bg-[var(--color-secondary-100)] text-[var(--color-secondary-700)]",
      success: "bg-[var(--color-success-light)] text-[var(--color-success-dark)]",
      warning: "bg-[var(--color-warning-light)] text-[var(--color-warning-dark)]",
      error: "bg-[var(--color-error-light)] text-[var(--color-error-dark)]",
    },
    radius: {
      DEFAULT: "rounded-full",
    },
  },
  
  usulSymbol: {
    base: "inline-flex items-center justify-center font-bold tabular-nums",
    size: {
      sm: "w-6 h-6 text-sm",
      md: "w-8 h-8 text-base",
      lg: "w-10 h-10 text-xl",
      xl: "w-12 h-12 text-2xl",
    },
    color: {
      dum: "text-[var(--color-usul-dum)]",
      tek: "text-[var(--color-usul-tek)]",
      ke: "text-[var(--color-usul-ke)]",
    },
  },
} as const;

export type ButtonTokens = typeof button;
export type InputTokens = typeof input;
export type CardTokens = typeof card;
export type LabelTokens = typeof label;
export type BadgeTokens = typeof badge;
export type UsulSymbolTokens = typeof usulSymbols;
export type ComponentClasses = typeof componentClasses;
