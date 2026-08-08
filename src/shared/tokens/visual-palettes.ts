/**
 * Gorsel palette'ler — TEK MERKEZI TANIM (ENGINEERING_RULESET: "Hardcode yok").
 *
 * Bilesenlerde renk literal'i (#hex / rgb / oklch) YAZILMAZ; bu katmandan
 * gelir. `theme.css` CSS degiskenleri (var tabanli kullanim) ve bu TS
 * sabitleri (canvas/SVG attribute baglami) birlikte tema kaynagidir.
 */

/** UsulNotation porte renkleri (2026-07-14 tasariminin sabit gorunumu). */
export const USUL_NOTATION_COLORS = {
  staff: "#8D6E63",
  grid: "#D7CCC8",
  dum: "#8B4513",
  tek: "#2E5D4B",
  ke: "#9E7540",
  playing: "#D84315",
  playhead: "#D84315",
  beatNumber: "#8D6E63",
  label: "#5D4037",
} as const;

/** ScoreEngine workbench (ScoreSurface) canvas/SVG renkleri. */
export const SCORE_SURFACE_COLORS = {
  /** Segno glyph rengi (Teslim bolumu isareti). */
  segnoInk: "#1e40af",
  /** Yuzey kagidi zemini. */
  paper: "#fffefd",
  /** Kagitta arka plan izgara cizgisi. */
  paperGrid: "#f0ebe4",
  /** Aktif sistem vurgu dolgusu. */
  activeSystemFill: "#f8eee6",
  /** Staff / section marker cercevesi. */
  staffStroke: "#9a4f2e",
  /** Sistem (olcu) etiketi metni. */
  systemLabel: "#87644b",
  /** Header etiketleri (USUL / KEY) + section marker metni. */
  headerLabel: "#5f2b13",
  /** Aktif imlec, halka ve callout (senkron vurgusu). */
  active: "#2f8a45",
  /** Kanit rozeti dolgusu. */
  evidenceFill: "#f8eee6",
  /** Kanit rozeti cercevesi. */
  evidenceStroke: "#d9c8b8",
  /** Kanit rozeti metni. */
  evidenceText: "#72513b",
} as const;

/** Browser meta `theme-color` degeri (Next viewport metadata). */
export const BRAND_THEME_COLOR = "#8B5A2B";
