/**
 * Legacy Routes — TEK MERKEZ (ENGINEERING_RULESET: "Hardcode yok")
 *
 * Eski yol adlarının tek kaynağı. 7 redirect sayfası ve
 * `navigation.config.ts` `legacyNavigationAliases` buradan beslenir.
 * Yeni legacy eklemek için tek dosya: burası.
 */

import {routes} from "./routes.config";

export const LEGACY_ROUTE_MAP = {
  makam: routes.studio,
  usul: routes.rhythm,
  nota: routes.studio,
  "nota-editor": routes.studio,
  recording: routes.studio,
  sesler: routes.samples,
  "eser-takip": routes.studioFollow,
} as const;

export type LegacyRouteId = keyof typeof LEGACY_ROUTE_MAP;

export function getLegacyRedirect(path: string): string | null {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return (LEGACY_ROUTE_MAP as Record<string, string>)[normalized] ?? null;
}
