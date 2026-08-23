/**
 * Enstruman gorsel yuzey konfigurasyonlari — TEK MERKEZI TANIM.
 *
 * Kural: enstruman gorsel paleti (tone/accent/detail) ve tekrar eden yuzey
 * siniflari bilesen icinde literal olarak yazilmaz; buradan gelir.
 * Enstruman kimligi (`InstrumentType`) katalogdan gelir, gorsel yuzey bu
 * katmanin sozlesmesidir.
 */

export type MelodicInstrument =
  | "ney"
  | "ud"
  | "kemençe"
  | "kanun"
  | "bağlama"
  | "tambur"
  | "santur"
  | "lavta"
  | "rebab"
  | "miskal";

export type InstrumentSurfaceLayout = "string" | "zither" | "bowed" | "wind" | "pipes";

export interface InstrumentSurfaceConfig {
  name: string;
  layout: InstrumentSurfaceLayout;
  tone: string;
  accent: string;
  detail: string;
  stringCount: number;
}

export const MELODIC_INSTRUMENT_SURFACES: Record<MelodicInstrument, InstrumentSurfaceConfig> = {
  ney: {name: "Ney", layout: "wind", tone: "oklch(72% 0.08 83)", accent: "oklch(43% 0.08 65)", detail: "oklch(30% 0.05 55)", stringCount: 7},
  ud: {name: "Ud", layout: "string", tone: "oklch(49% 0.11 45)", accent: "oklch(80% 0.10 78)", detail: "oklch(28% 0.06 38)", stringCount: 6},
  kemençe: {name: "Kemençe", layout: "bowed", tone: "oklch(43% 0.09 31)", accent: "oklch(75% 0.08 72)", detail: "oklch(24% 0.05 28)", stringCount: 3},
  kanun: {name: "Kanun", layout: "zither", tone: "oklch(60% 0.11 79)", accent: "oklch(84% 0.12 94)", detail: "oklch(35% 0.08 58)", stringCount: 12},
  bağlama: {name: "Bağlama", layout: "string", tone: "oklch(48% 0.12 58)", accent: "oklch(78% 0.11 82)", detail: "oklch(29% 0.06 44)", stringCount: 7},
  tambur: {name: "Tambur", layout: "string", tone: "oklch(41% 0.08 52)", accent: "oklch(74% 0.10 78)", detail: "oklch(25% 0.05 44)", stringCount: 6},
  santur: {name: "Santur", layout: "zither", tone: "oklch(58% 0.09 83)", accent: "oklch(85% 0.10 98)", detail: "oklch(36% 0.06 66)", stringCount: 14},
  lavta: {name: "Lavta", layout: "string", tone: "oklch(44% 0.09 48)", accent: "oklch(76% 0.10 72)", detail: "oklch(27% 0.05 40)", stringCount: 6},
  rebab: {name: "Rebab", layout: "bowed", tone: "oklch(40% 0.08 26)", accent: "oklch(72% 0.08 60)", detail: "oklch(23% 0.05 24)", stringCount: 3},
  miskal: {name: "Miskal", layout: "pipes", tone: "oklch(68% 0.07 76)", accent: "oklch(45% 0.09 96)", detail: "oklch(30% 0.06 86)", stringCount: 11},
};

/**
 * Tekrar eden yuzey siniflari. `oklch(...)` degerleri yalniz BU katmanda
 * yasamaya devam eder; bilesenler bu sabitlere referans verir.
 */
export const INSTRUMENT_SURFACE_CLASSES = {
  frameString:
    "relative min-w-[720px] overflow-hidden rounded-lg border border-white/50 p-5 shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.28)]",
  frameZither:
    "relative min-w-[760px] overflow-hidden rounded-lg border border-white/50 p-5 shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.3)]",
  frameBowed:
    "relative min-w-[520px] overflow-hidden rounded-lg border border-white/50 p-5 shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.25)]",
  keyBase:
    "relative z-20 flex h-10 min-w-11 items-center justify-center rounded-md border text-xs font-semibold transition-colors select-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]",
  keyInset: "shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.55)]",
  keyUp:
    "border-white/70 bg-[var(--color-tertiary-50)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] active:bg-[var(--color-secondary-100)]",
  stringLine: "h-px bg-white/55 shadow-[0_1px_0_oklch(0%_0_0_/_0.18)]",
  windBody: "absolute left-7 right-7 top-1/2 h-16 -translate-y-1/2 rounded-full border border-black/15 bg-[oklch(88%_0.04_84_/_0.45)]",
  windHole: "h-5 w-5 rounded-full bg-black/30 shadow-[inset_0_1px_2px_oklch(0%_0_0_/_0.3)]",
  pipeBody: "w-full rounded-t-md border border-black/10 bg-[oklch(88%_0.04_84_/_0.5)] shadow-[inset_0_1px_0_oklch(100%_0_0_/_0.45)]",
} as const;
