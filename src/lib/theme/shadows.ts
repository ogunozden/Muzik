/**
 * Shadows - Merkezi Gölge Tokenları
 * 
 * KULLANIM:
 * import { shadows } from '@/lib';
 * 
 * <div className={shadows.md}>
 *   İçerik
 * </div>
 */

export const shadows = {
  // ============================================
  // DEFAULT - Temel Gölge Değerleri
  // ============================================
  none: "shadow-none",
  sm: "shadow-sm",
  DEFAULT: "shadow",
  md: "shadow-md",
  lg: "shadow-lg",
  xl: "shadow-xl",
  "2xl": "shadow-2xl",
  inner: "shadow-inner",

  // ============================================
  // Z-INDEX - Katmanlama Değerleri
  // ============================================
  zIndex: {
    dropdown: "z-10",
    sticky: "z-20",
    fixed: "z-30",
    modalBackdrop: "z-40",
    modal: "z-50",
    popover: "z-50",
    toast: "z-60",
    tooltip: "z-70",
  },

  // ============================================
  // ELEVATION - Yükseltilmiş Yüzey Gölgeleri
  // ============================================
  elevation: {
    low: "shadow-sm",
    medium: "shadow-md",
    high: "shadow-lg",
    highest: "shadow-xl",
  },

  // ============================================
  // CARD - Kart Gölgeleri
  // ============================================
  card: {
    DEFAULT: "shadow-sm",
    hover: "hover:shadow-md",
    active: "shadow-lg",
  },
} as const;

export type Shadows = typeof shadows;
