/**
 * Spacing - Merkezi Boşluk Tokenları
 * 
 * KULLANIM:
 * import { spacing } from '@/lib';
 * 
 * <div className={spacing.padding.lg}>
 *   <div className={spacing.gap.md}>
 *     {children}
 *   </div>
 * </div>
 */

export const spacing = {
  // ============================================
  // PADDING - İç Boşluk
  // ============================================
  padding: {
    none: "p-0",
    xs: "p-1",      // 4px
    sm: "p-2",      // 8px
    md: "p-3",      // 12px
    lg: "p-4",      // 16px
    xl: "p-6",      // 24px
    xxl: "p-8",     // 32px
  },

  // ============================================
  // PADDING X - Yatay İç Boşluk
  // ============================================
  paddingX: {
    none: "px-0",
    xs: "px-1",
    sm: "px-2",
    md: "px-3",
    lg: "px-4",
    xl: "px-6",
    xxl: "px-8",
  },

  // ============================================
  // PADDING Y - Dikey İç Boşluk
  // ============================================
  paddingY: {
    none: "py-0",
    xs: "py-1",
    sm: "py-2",
    md: "py-3",
    lg: "py-4",
    xl: "py-6",
    xxl: "py-8",
  },

  // ============================================
  // MARGIN - Dış Boşluk
  // ============================================
  margin: {
    none: "m-0",
    auto: "m-auto",
    xs: "m-1",
    sm: "m-2",
    md: "m-4",
    lg: "m-6",
    xl: "m-8",
  },

  // ============================================
  // MARGIN Y - Dikey Dış Boşluk
  // ============================================
  marginY: {
    none: "my-0",
    auto: "my-auto",
    xs: "my-1",
    sm: "my-2",
    md: "my-4",
    lg: "my-6",
    xl: "my-8",
    xxl: "my-12",
  },

  // ============================================
  // GAP - Flex/Grid Arası Boşluk
  // ============================================
  gap: {
    none: "gap-0",
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
    xl: "gap-6",
    xxl: "gap-8",
  },

  // ============================================
  // GAP X - Yatay Flex/Grid Boşluk
  // ============================================
  gapX: {
    none: "gap-x-0",
    xs: "gap-x-1",
    sm: "gap-x-2",
    md: "gap-x-3",
    lg: "gap-x-4",
    xl: "gap-x-6",
    xxl: "gap-x-8",
  },

  // ============================================
  // GAP Y - Dikey Flex/Grid Boşluk
  // ============================================
  gapY: {
    none: "gap-y-0",
    xs: "gap-y-1",
    sm: "gap-y-2",
    md: "gap-y-3",
    lg: "gap-y-4",
    xl: "gap-y-6",
    xxl: "gap-y-8",
  },

  // ============================================
  // SECTION - Bölüm Arası Boşluk
  // ============================================
  section: {
    none: "my-0",
    tight: "my-4",
    default: "my-6",
    relaxed: "my-8",
    spacious: "my-12",
    hero: "my-16",
    expansive: "my-20",
  },

  // ============================================
  // CONTAINER - Container Genişlikleri
  // ============================================
  container: {
    none: "",
    narrow: "max-w-4xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
    full: "max-w-full",
  },

  // ============================================
  // CONTAINER PADDING - Container İç Padding
  // ============================================
  containerPadding: {
    none: "px-0",
    sm: "px-4",
    md: "px-6",
    lg: "px-8",
  },
} as const;

export type Spacing = typeof spacing;
