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
  | "referencesCuration"
  | "archive"
  | "rhythm"
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
  referencesCuration: "/references/curation",
  archive: "/archive",
  rhythm: "/rhythm",
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
  referencesCuration: {
    path: routes.referencesCuration,
    name: "referencesCuration",
    titleKey: "nav.referencesCuration",
    description: "3000 eserlik katalog için batch kaynak kürasyon kuyruğu",
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
    titleKey: "nav.samples",
    description: "Enstrüman ve ses seçimi",
  },
  makam: {
    path: routes.makam,
    name: "makam",
    titleKey: "nav.makam",
    description: "Makam çalışma yönlendirmesi",
  },
  usul: {
    path: routes.usul,
    name: "usul",
    titleKey: "nav.usul",
    description: "Usul çalışma yönlendirmesi",
  },
  nota: {
    path: routes.nota,
    name: "nota",
    titleKey: "nav.nota",
    description: "Nota çalışma yönlendirmesi",
  },
  notaEditor: {
    path: routes.notaEditor,
    name: "notaEditor",
    titleKey: "nav.notaEditor",
    description: "Nota editör yönlendirmesi",
  },
  recording: {
    path: routes.recording,
    name: "recording",
    titleKey: "nav.recording",
    description: "Kayıt çalışma yönlendirmesi",
  },
  sesler: {
    path: routes.sesler,
    name: "sesler",
    titleKey: "nav.sesler",
    description: "Sesler yönlendirmesi",
  },
  eserTakip: {
    path: routes.eserTakip,
    name: "eserTakip",
    titleKey: "nav.eserTakip",
    description: "Eser takip yönlendirmesi",
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
