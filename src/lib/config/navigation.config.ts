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
 * Navigasyon yapılandırması
 */
export const navigation: NavItem[] = [
  {
    id: "home",
    label: "nav.home",
    href: routes.home,
    type: "link",
    icon: "🏠",
  },
  {
    id: "studio",
    label: "nav.studio",
    href: routes.studio,
    type: "link",
    icon: "🎼",
  },
  {
    id: "studioFollow",
    label: "nav.studioFollow",
    href: routes.studioFollow,
    type: "link",
    icon: "🎧",
  },
  {
    id: "rhythm",
    label: "nav.rhythm",
    href: routes.rhythm,
    type: "link",
    icon: "🥁",
  },
  {
    id: "archive",
    label: "nav.archive",
    href: routes.archive,
    type: "link",
    icon: "📚",
  },
  {
    id: "samples",
    label: "nav.sounds",
    href: routes.samples,
    type: "link",
    icon: "🎹",
  },
];

/**
 * Footer linkleri
 */
export const footerLinks = [
  { id: "archive", label: "Arşiv", href: routes.archive },
  { id: "studio", label: "Studio", href: routes.studio },
  { id: "rhythm", label: "Ritim", href: routes.rhythm },
  { id: "samples", label: "Sesler", href: routes.samples },
];

export type NavigationConfig = typeof navigation;
