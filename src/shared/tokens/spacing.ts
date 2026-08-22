/**
 * Design System - Spacing Tokens
 * 
 * 4pt base scale with semantic naming
 * Reference: src/lib/design-system/theme.css
 */

export const spacing = {
  // Base scale (4pt increments)
  0: "0",
  px: "1px",
  0.5: "0.125rem",  // 2px
  1: "0.25rem",      // 4px
  1.5: "0.375rem",   // 6px
  2: "0.5rem",       // 8px
  2.5: "0.625rem",   // 10px
  3: "0.75rem",      // 12px
  3.5: "0.875rem",   // 14px
  4: "1rem",         // 16px
  5: "1.25rem",      // 20px
  6: "1.5rem",       // 24px
  7: "1.75rem",      // 28px
  8: "2rem",         // 32px
  9: "2.25rem",      // 36px
  10: "2.5rem",      // 40px
  12: "3rem",        // 48px
  14: "3.5rem",      // 56px
  16: "4rem",        // 64px
  20: "5rem",        // 80px
  24: "6rem",        // 96px
  
  // Semantic padding (for backward compatibility)
  padding: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
  28: "7rem",        // 112px
  32: "8rem",        // 128px
  
  // Semantic spacing names
  xs: "0.25rem",     // 4px - tight gaps
  sm: "0.5rem",      // 8px - small gaps
  md: "1rem",        // 16px - default gaps
  lg: "1.5rem",      // 24px - large gaps
  xl: "2rem",        // 32px - section gaps
  "2xl": "3rem",     // 48px - big section gaps
  "3xl": "4rem",     // 64px - page section gaps
  
  // Component-specific spacing
  component: {
    gap: "1rem",           // gap-4
    padding: "1.5rem",     // p-6
    paddingSm: "0.75rem",   // p-3
    paddingLg: "2rem",      // p-8
  },
  
  // Section spacing
  section: {
    tight: "1rem",          // my-4
    default: "1.5rem",      // my-6
    relaxed: "2rem",        // my-8
    spacious: "3rem",       // my-12
    hero: "4rem",           // my-16
  },
  
  // Page layout
  page: {
    paddingX: "1.5rem",     // px-6
    paddingY: "1.5rem",     // py-6
    maxWidth: "80rem",      // max-w-5xl
  },
  
  // Container widths
  container: {
    xs: "20rem",    // 320px
    sm: "24rem",    // 384px
    md: "28rem",    // 448px
    lg: "32rem",    // 512px
    xl: "36rem",    // 576px
    "2xl": "42rem", // 672px
    "3xl": "48rem", // 768px
    "4xl": "56rem", // 896px
    "5xl": "64rem", // 1024px
    "6xl": "72rem", // 1152px
    "7xl": "80rem", // 1280px
  },
} as const;

// Transitions
// Z-index scale
// CSS class mappings