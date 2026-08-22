/**
 * Navigation Configuration - Navigasyon Tanımları
 * Merkezi navigasyon menüsü yapılandırması
 */

import {routes} from "./routes.config";
import {LEGACY_ROUTE_MAP} from "./legacy-routes";

/**
 * Nav item tipleri
 */
export type NavItemType = "link" | "dropdown" | "divider";

/**
 * Nav item arayüzü
 */
export interface NavItem {
  id: string;
  label: string; // i18n key
  href?: string;
  icon?: string; // emoji veya icon name
  type: NavItemType;
  badge?: string;
  children?: NavItem[];
}

/**
 * Primary navigation 3 hub'a gruplanir (F7 bilgi mimarisi): Çalışma, Kürasyon,
 * Kütüphane. Her hub bir dropdown; alt yüzeyler children olarak listelenir.
 * Guardrail'in aradıği `id`/`href` ciftleri children icinde korunur.
 * Legacy alias'lar routes.config + redirect sayfalarinda kalir.
 */
export const navigation: NavItem[] = [
  {
    id: "hubStudio",
    label: "nav.hubStudio",
    type: "dropdown",
    icon: "🎼",
    children: [
      {id: "studioScoreEngine", label: "nav.studioScoreEngine", href: routes.studioScoreEngine, type: "link", icon: "🧬"},
      {id: "studioFollow", label: "nav.studioFollow", href: routes.studioFollow, type: "link", icon: "🎧"},
      {id: "studio", label: "nav.studio", href: routes.studio, type: "link", icon: "🎼"},
      {id: "rhythm", label: "nav.rhythm", href: routes.rhythm, type: "link", icon: "🥁"},
      {id: "ogren", label: "nav.ogren", href: routes.ogren, type: "link", icon: "🎓"},
    ],
  },
  {
    id: "hubCuration",
    label: "nav.hubCuration",
    type: "dropdown",
    icon: "🧭",
    children: [
      {id: "referencesCuration", label: "nav.referencesCuration", href: routes.referencesCuration, type: "link", icon: "🧭"},
      {id: "references", label: "nav.references", href: routes.references, type: "link", icon: "🔗"},
    ],
  },
  {
    id: "hubLibrary",
    label: "nav.hubLibrary",
    type: "dropdown",
    icon: "📚",
    children: [
      {id: "archive", label: "nav.archive", href: routes.archive, type: "link", icon: "📚"},
      {id: "samples", label: "nav.samples", href: routes.samples, type: "link", icon: "🎹"},
    ],
  },
];

/**
 * Eski yol adlarinin merkezi kaydi. TEK KAYNAK: `legacy-routes.ts` LEGACY_ROUTE_MAP.
 * Ana navigasyonda GORUNMEZ; yalniz yonlendirme sayfalari icin tutulur.
 *
 * Artik HARDCODE degil — LEGACY_ROUTE_MAP’tan turetilir, guardrail tek kaynagi dogrular.
 * Olu kod tarayicisi (knip) bunu olu sanmasin diye @knipignore korunur.
 *
 * @knipignore
 */
const LEGACY_ALIAS_META: Record<string, {id: string; label: string; icon: string}> = {
  makam: {id: "makam", label: "nav.makam", icon: "🎙️"},
  usul: {id: "usul", label: "nav.usul", icon: "⏱️"},
  nota: {id: "nota", label: "nav.nota", icon: "♩"},
  "nota-editor": {id: "notaEditor", label: "nav.notaEditor", icon: "✏️"},
  recording: {id: "recording", label: "nav.recording", icon: "⏺"},
  sesler: {id: "sesler", label: "nav.sesler", icon: "🎚️"},
  "eser-takip": {id: "eserTakip", label: "nav.eserTakip", icon: "📍"},
};

export const legacyNavigationAliases: NavItem[] = Object.entries(LEGACY_ROUTE_MAP).map(([legacyPath, href]) => {
  const meta = LEGACY_ALIAS_META[legacyPath] ?? {id: legacyPath, label: `nav.${legacyPath}`, icon: "📍"};
  return {id: meta.id, label: meta.label, href, type: "link" as const, icon: meta.icon};
});
