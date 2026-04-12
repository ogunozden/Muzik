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
    id: "makam",
    label: "nav.makam",
    href: routes.makam,
    type: "link",
    icon: "🎼",
  },
  {
    id: "usul",
    label: "nav.usul",
    href: routes.usul,
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
    id: "tutorial",
    label: "nav.tutorial",
    href: routes.tutorial,
    type: "link",
    icon: "📖",
  },
  {
    id: "ensemble",
    label: "nav.ensemble",
    href: routes.ensemble,
    type: "link",
    icon: "🎻",
  },
  {
    id: "sounds",
    label: "nav.sounds",
    href: routes.sesler,
    type: "link",
    icon: "🎹",
  },
];

/**
 * Footer linkleri
 */
export const footerLinks = [
  { id: "archive", label: "Arşiv", href: routes.archive },
  { id: "tutorial", label: "Eğitim", href: routes.tutorial },
  { id: "ensemble", label: "Ensemble", href: routes.ensemble },
  { id: "sounds", label: "Sesler", href: routes.sesler },
];

export type NavigationConfig = typeof navigation;
