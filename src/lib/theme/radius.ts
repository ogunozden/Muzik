/**
 * Radius - Merkezi Border Radius Tokenları
 * 
 * KULLANIM:
 * import { radius } from '@/lib';
 * 
 * <div className={radius.md}>
 *   İçerik
 * </div>
 */

export const radius = {
  // ============================================
  // DEFAULT - Temel Radius Değerleri
  // ============================================
  none: "rounded-none",
  sm: "rounded-sm",
  DEFAULT: "rounded",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",

  // ============================================
  // AXIS - Yatay/Dikey Radius
  // ============================================
  top: {
    none: "rounded-t-none",
    sm: "rounded-t-sm",
    md: "rounded-t-md",
    lg: "rounded-t-lg",
    xl: "rounded-t-xl",
    full: "rounded-t-full",
  },
  bottom: {
    none: "rounded-b-none",
    sm: "rounded-b-sm",
    md: "rounded-b-md",
    lg: "rounded-b-lg",
    xl: "rounded-b-xl",
    full: "rounded-b-full",
  },
  left: {
    none: "rounded-l-none",
    sm: "rounded-l-sm",
    md: "rounded-l-md",
    lg: "rounded-l-lg",
    xl: "rounded-l-xl",
    full: "rounded-l-full",
  },
  right: {
    none: "rounded-r-none",
    sm: "rounded-r-sm",
    md: "rounded-r-md",
    lg: "rounded-r-lg",
    xl: "rounded-r-xl",
    full: "rounded-r-full",
  },

  // ============================================
  // CORNER - Köşe Bazlı Radius
  // ============================================
  tl: "rounded-tl-md",
  tr: "rounded-tr-md",
  bl: "rounded-bl-md",
  br: "rounded-br-md",

  // ============================================
  // COMPONENT - Komponent Bazlı Radius
  // ============================================
  button: {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
    full: "rounded-full",
  },
  input: {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
  },
  card: "rounded-xl",
  badge: "rounded-full",
  avatar: "rounded-full",
  chip: "rounded-full",
  modal: "rounded-2xl",
  dropdown: "rounded-lg",
} as const;

export type Radius = typeof radius;
