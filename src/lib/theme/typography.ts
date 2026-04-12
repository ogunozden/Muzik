/**
 * Typography - Merkezi Tipografi Tokenları
 * 
 * KULLANIM:
 * import { typography } from '@/lib';
 * 
 * <h1 className={`${typography.size.xl} ${typography.weight.bold}`}>
 *   Başlık
 * </h1>
 */

export const typography = {
  // ============================================
  // SIZE - Font Boyutları
  // ============================================
  size: {
    xs: "text-xs",       // 12px
    sm: "text-sm",       // 14px
    base: "text-base",   // 16px
    lg: "text-lg",       // 18px
    xl: "text-xl",       // 20px
    "2xl": "text-2xl",  // 24px
    "3xl": "text-3xl",  // 30px
    "4xl": "text-4xl",  // 36px
    "5xl": "text-5xl",  // 48px
    "6xl": "text-6xl",  // 60px
  },

  // ============================================
  // WEIGHT - Font Ağırlıkları
  // ============================================
  weight: {
    thin: "font-thin",
    extralight: "font-extralight",
    light: "font-light",
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
    extrabold: "font-extrabold",
    black: "font-black",
  },

  // ============================================
  // LINE HEIGHT - Satır Yüksekliği
  // ============================================
  lineHeight: {
    none: "leading-none",      // 1
    tight: "leading-tight",    // 1.25
    snug: "leading-snug",     // 1.375
    normal: "leading-normal",  // 1.5
    relaxed: "leading-relaxed",// 1.625
    loose: "leading-loose",   // 2
  },

  // ============================================
  // ALIGN - Metin Hizalama
  // ============================================
  align: {
    left: "text-left",
    center: "text-center",
    right: "text-right",
    justify: "text-justify",
  },

  // ============================================
  // TRANSFORM - Metin Dönüştürme
  // ============================================
  transform: {
    normal: "normal-case",
    uppercase: "uppercase",
    lowercase: "lowercase",
    capitalize: "capitalize",
  },

  // ============================================
  // TRACKING - Harf Aralığı
  // ============================================
  tracking: {
    tighter: "tracking-tighter",
    tight: "tracking-tight",
    normal: "tracking-normal",
    wide: "tracking-wide",
    wider: "tracking-wider",
    widest: "tracking-widest",
  },

  // ============================================
  // DECORATION - Metin Dekorasyonu
  // ============================================
  decoration: {
    none: "no-underline",
    underline: "underline",
    overline: "overline",
    "line-through": "line-through",
  },

  // ============================================
  // STYLE - Font Style
  // ============================================
  style: {
    normal: "not-italic",
    italic: "italic",
    oblique: "oblique",
  },

  // ============================================
  // WHITESPACE - Boşluk Davranışı
  // ============================================
  whitespace: {
    normal: "whitespace-normal",
    nowrap: "whitespace-nowrap",
    pre: "whitespace-pre",
    preWrap: "whitespace-pre-wrap",
    preLine: "whitespace-pre-line",
  },

  // ============================================
  // COMBINED HEADING - Başlık Kombinasyonları
  // ============================================
  heading: {
    h1: "text-4xl font-bold leading-tight tracking-tight",
    h2: "text-3xl font-semibold leading-tight",
    h3: "text-2xl font-semibold leading-snug",
    h4: "text-xl font-medium leading-snug",
    h5: "text-lg font-medium leading-normal",
    h6: "text-base font-medium leading-normal",
  },

  // ============================================
  // COMBINED BODY - Gövde Metin Kombinasyonları
  // ============================================
  body: {
    sm: "text-sm leading-relaxed",
    base: "text-base leading-relaxed",
    lg: "text-lg leading-relaxed",
  },

  // ============================================
  // COMBINED LABEL - Etiket Kombinasyonları
  // ============================================
  label: {
    sm: "text-xs font-medium leading-tight",
    base: "text-sm font-medium leading-tight",
    lg: "text-base font-medium leading-tight",
  },
} as const;

export type Typography = typeof typography;
