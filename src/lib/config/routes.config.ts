/**
 * Routes Configuration - Rota Tanımları
 * Merkezi route/path yapılandırması
 */

/**
 * Route tipleri
 */
export type RoutePath = 
  | "home"
  | "makam"
  | "usul"
  | "nota"
  | "notaEditor"
  | "archive"
  | "recording"
  | "tutorial"
  | "ensemble"
  | "sesler"
  | "apiSamples"
  | "notFound";

/**
 * RouteName - Route isimleri (RoutePath ile aynı)
 */
export type RouteName = RoutePath;

/**
 * Route arayüzü
 */
export interface Route {
  path: string;
  name: RoutePath;
  titleKey: string; // i18n translation key
  description?: string;
}

/**
 * Tüm route tanımları
 */
export const routes = {
  home: "/",
  makam: "/makam",
  usul: "/usul",
  nota: "/nota",
  notaEditor: "/nota-editor",
  archive: "/archive",
  recording: "/recording",
  tutorial: "/tutorial",
  ensemble: "/ensemble",
  sesler: "/sesler",
  apiSamples: "/api/samples",
  notFound: "/404",
} as const satisfies Record<RoutePath, string>;

/**
 * Route metadata
 */
export const routeMetadata: Record<RoutePath, Route> = {
  home: {
    path: routes.home,
    name: "home",
    titleKey: "nav.home",
  },
  makam: {
    path: routes.makam,
    name: "makam",
    titleKey: "nav.makam",
    description: "Makam keşfi ve çalma",
  },
  usul: {
    path: routes.usul,
    name: "usul",
    titleKey: "nav.usul",
    description: "Usül vuruş gösterimi ve çalma",
  },
  nota: {
    path: routes.nota,
    name: "nota",
    titleKey: "nav.nota",
  },
  notaEditor: {
    path: routes.notaEditor,
    name: "notaEditor",
    titleKey: "nav.notaEditor",
    description: "Nota girişi ve düzenleme",
  },
  archive: {
    path: routes.archive,
    name: "archive",
    titleKey: "nav.archive",
    description: "Nota arşivi",
  },
  recording: {
    path: routes.recording,
    name: "recording",
    titleKey: "nav.recording",
  },
  tutorial: {
    path: routes.tutorial,
    name: "tutorial",
    titleKey: "nav.tutorial",
    description: "Müzik eğitimi",
  },
  ensemble: {
    path: routes.ensemble,
    name: "ensemble",
    titleKey: "nav.ensemble",
    description: "Çoklu kullanıcı çalma",
  },
  sesler: {
    path: routes.sesler,
    name: "sesler",
    titleKey: "nav.sounds",
    description: "Enstrüman ve ses seçimi",
  },
  apiSamples: {
    path: routes.apiSamples,
    name: "apiSamples",
    titleKey: "API Samples",
  },
  notFound: {
    path: routes.notFound,
    name: "notFound",
    titleKey: "common.notFound",
  },
};

/**
 * Path'den route name'e dönüşüm
 */
export function getRouteByPath(path: string): Route | undefined {
  return Object.values(routeMetadata).find((route) => route.path === path);
}

export type RoutesConfig = typeof routes;
