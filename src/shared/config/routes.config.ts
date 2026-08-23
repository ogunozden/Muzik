/**
 * Routes Configuration - Rota Tanımları
 * Merkezi route/path yapılandırması
 */

/**
 * Route tipleri
 */
export type RoutePath =
  | "home"
  | "studio"
  | "studioFollow"
  | "studioScoreEngine"
  | "references"
  | "referencesCuration"
  | "archive"
  | "rhythm"
  | "ogren"
  | "samples"
  | "makam"
  | "usul"
  | "nota"
  | "notaEditor"
  | "recording"
  | "sesler"
  | "eserTakip"
  | "apiSamples"
  | "notFound";

/**
 * Tüm route tanımları
 */
export const routes = {
  home: "/",
  studio: "/studio",
  studioFollow: "/studio/follow",
  studioScoreEngine: "/studio/score-engine",
  references: "/references",
  referencesCuration: "/references/curation",
  archive: "/archive",
  rhythm: "/rhythm",
  ogren: "/ogren",
  samples: "/samples",
  makam: "/makam",
  usul: "/usul",
  nota: "/nota",
  notaEditor: "/nota-editor",
  recording: "/recording",
  sesler: "/sesler",
  eserTakip: "/eser-takip",
  apiSamples: "/api/samples",
  notFound: "/404",
} as const satisfies Record<RoutePath, string>;
