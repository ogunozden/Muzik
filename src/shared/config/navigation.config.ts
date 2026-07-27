/**
 * Navigation Configuration - Navigasyon Tanımları
 * Merkezi navigasyon menüsü yapılandırması
 */

import { routes } from "./routes.config";

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
 * Eski yol adlarinin merkezi kaydi. Ana navigasyonda GORUNMEZ; yalniz
 * yonlendirme sayfalari icin tutulur.
 *
 * Bu dizi hicbir modul tarafindan import EDILMEZ — tuketicisi
 * `scripts/validate-architecture.mjs`, dosyayi METIN olarak okuyup her
 * eski yolun burada kayitli oldugunu dogrular. Olu kod tarayicisi (knip)
 * metinsel okumayi goremedigi icin bunu olu sanip sildirdi; guardrail
 * yakaladi ve geri kondu. Asagidaki etiket knip'e bunu bildirir.
 *
 * @knipignore
 */
export const legacyNavigationAliases: NavItem[] = [
  {
    id: "makam",
    label: "nav.makam",
    href: routes.makam,
    type: "link",
    icon: "🎙️",
  },
  {
    id: "usul",
    label: "nav.usul",
    href: routes.usul,
    type: "link",
    icon: "⏱️",
  },
  {
    id: "nota",
    label: "nav.nota",
    href: routes.nota,
    type: "link",
    icon: "♩",
  },
  {
    id: "notaEditor",
    label: "nav.notaEditor",
    href: routes.notaEditor,
    type: "link",
    icon: "✏️",
  },
  {
    id: "recording",
    label: "nav.recording",
    href: routes.recording,
    type: "link",
    icon: "⏺",
  },
  {
    id: "sesler",
    label: "nav.sesler",
    href: routes.sesler,
    type: "link",
    icon: "🎚️",
  },
  {
    id: "eserTakip",
    label: "nav.eserTakip",
    href: routes.eserTakip,
    type: "link",
    icon: "📍",
  },
];
