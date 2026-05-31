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
  | "references"
  | "archive"
  | "rhythm"
  | "samples"
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
  studio: "/studio",
  studioFollow: "/studio/follow",
  references: "/references",
  archive: "/archive",
  rhythm: "/rhythm",
  samples: "/samples",
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
  studio: {
    path: routes.studio,
    name: "studio",
    titleKey: "nav.studio",
    description: "Nota çalışma, kayıt, playback ve arşive kaydetme",
  },
  studioFollow: {
    path: routes.studioFollow,
    name: "studioFollow",
    titleKey: "nav.studioFollow",
    description: "Kaynak nota üzerinden eser takip ve orkestra çalışma",
  },
  references: {
    path: routes.references,
    name: "references",
    titleKey: "nav.references",
    description: "Harici nota, kayıt ve arşiv kaynaklarını yönetme",
  },
  archive: {
    path: routes.archive,
    name: "archive",
    titleKey: "nav.archive",
    description: "Nota arşivi",
  },
  rhythm: {
    path: routes.rhythm,
    name: "rhythm",
    titleKey: "nav.rhythm",
    description: "Usül ve harici perküsyon çalışma",
  },
  samples: {
    path: routes.samples,
    name: "samples",
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
