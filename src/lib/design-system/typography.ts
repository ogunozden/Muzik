/**
 * Design System - Typography Tokens
 * 
 * Fluid type scale with perfect fourth ratio (1.25)
 * Reference: src/lib/design-system/theme.css
 */

export const typography = {
  // Font families
  fontFamily: {
    DEFAULT: "var(--font-family)",
    display: "var(--font-family-display)",
    mono: "var(--font-family-mono)",
  },
  
  // Font sizes - Perfect fourth scale
  fontSize: {
    xs: { value: "0.75rem", lineHeight: "1rem" },     // 12px
    sm: { value: "0.875rem", lineHeight: "1.25rem" }, // 14px
    base: { value: "1rem", lineHeight: "1.5rem" },    // 16px
    lg: { value: "1.125rem", lineHeight: "1.625rem" },// 18px
    xl: { value: "1.25rem", lineHeight: "1.75rem" },  // 20px
    "2xl": { value: "1.5rem", lineHeight: "2rem" },   // 24px
    "3xl": { value: "1.875rem", lineHeight: "2.25rem" }, // 30px
    "4xl": { value: "2.25rem", lineHeight: "2.5rem" },   // 36px
    "5xl": { value: "3rem", lineHeight: "1.1" },         // 48px
  },
  
  // Font weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Letter spacing
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
    widest: "0.1em",
  },
  
  // Paragraph spacing
  paragraphSpacing: {
    none: "0",
    tight: "0.5em",
    normal: "1em",
    relaxed: "1.5em",
  },
  
  // Heading presets
  headings: {
    display: {
      fontFamily: "display",
      fontSize: "var(--text-5xl)",
      fontWeight: 700,
      lineHeight: 1.1,
      letterSpacing: "-0.025em",
    },
    h1: {
      fontSize: "var(--text-4xl)",
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: "-0.025em",
    },
    h2: {
      fontSize: "var(--text-3xl)",
      fontWeight: 600,
      lineHeight: 1.375,
    },
    h3: {
      fontSize: "var(--text-2xl)",
      fontWeight: 600,
      lineHeight: 1.375,
    },
    h4: {
      fontSize: "var(--text-xl)",
      fontWeight: 500,
      lineHeight: 1.375,
    },
  },
  
  // Body text presets
  body: {
    large: {
      fontSize: "var(--text-lg)",
      lineHeight: 1.625,
    },
    DEFAULT: {
      fontSize: "var(--text-base)",
      lineHeight: 1.5,
    },
    small: {
      fontSize: "var(--text-sm)",
      lineHeight: 1.5,
    },
  },
  
  // UI text presets
  ui: {
    label: {
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      letterSpacing: "0.025em",
      textTransform: "uppercase",
    },
    caption: {
      fontSize: "var(--text-xs)",
      lineHeight: 1.5,
    },
    button: {
      fontSize: "var(--text-sm)",
      fontWeight: 500,
      lineHeight: 1,
    },
    tab: {
      fontSize: "var(--text-sm)",
      fontWeight: 500,
    },
  },
} as const;

// CSS utility class mappings for the active UnoCSS Wind4 integration.