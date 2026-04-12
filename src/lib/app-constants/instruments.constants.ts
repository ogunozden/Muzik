/**
 * Instruments Constants - Enstrüman Tanımları
 * Merkezi enstrüman sabitleri
 */

import type { InstrumentType, PercussionSymbol } from "@/engines/ses/instruments";
import type { Enstruman } from "@/types";

/**
 * Enstrüman listesi
 */
export const INSTRUMENTS = [
  { id: "ney" as InstrumentType, nameTr: "Ney", nameEn: "Ney" },
  { id: "ud" as InstrumentType, nameTr: "Ud", nameEn: "Ud" },
  { id: "kemençe" as InstrumentType, nameTr: "Kemençe", nameEn: "Kemençe" },
  { id: "tanpura" as InstrumentType, nameTr: "Tanpura", nameEn: "Tanpura" },
  { id: "bendir" as InstrumentType, nameTr: "Bendir", nameEn: "Bendir" },
  { id: "kudum" as InstrumentType, nameTr: "Kudüm", nameEn: "Kudum" },
  { id: "davul" as InstrumentType, nameTr: "Davul", nameEn: "Davul" },
  { id: "def" as InstrumentType, nameTr: "Def", nameEn: "Def" },
] as const;

/**
 * Melodik enstrümanlar
 */
export const MELODIC_INSTRUMENTS: InstrumentType[] = [
  "ney",
  "ud",
  "kemençe",
  "tanpura",
] as const;

/**
 * Vurmalı enstrümanlar
 */
export const PERCUSSION_INSTRUMENTS: InstrumentType[] = [
  "bendir",
  "kudum",
  "davul",
  "def",
] as const;

/**
 * Enstrüman verileri
 */
export const INSTRUMENTS_DATA: Enstruman[] = [
  { id: "ud", name: "Ud", nameTr: "Ud", soundType: "plucked_string" },
  { id: "kemençe", name: "Kemençe", nameTr: "Kemençe", soundType: "bowed_string" },
  { id: "ney", name: "Ney", nameTr: "Ney", soundType: "wind" },
  { id: "tanpura", name: "Tanpura", nameTr: "Tanpura", soundType: "plucked_string" },
  { id: "davul", name: "Davul", nameTr: "Davul", soundType: "percussion" },
  { id: "def", name: "Def", nameTr: "Def", soundType: "percussion" },
  { id: "bendir", name: "Bendir", nameTr: "Bendir", soundType: "percussion" },
  { id: "kudum", name: "Kudüm", nameTr: "Kudüm", soundType: "percussion" },
] as const;

/**
 * Usül sembol gösterimleri
 */
export const USUL_SYMBOL_DISPLAY: Record<PercussionSymbol | "", string> = {
  dum: "●",
  tek: "○",
  ke: "◐",
  "": "",
} as const;

/**
 * Enstrüman tiplerini filtrele
 */
export function getInstrumentsByCategory(category: "melodic" | "percussion"): typeof INSTRUMENTS {
  const filtered = category === "melodic" 
    ? MELODIC_INSTRUMENTS 
    : PERCUSSION_INSTRUMENTS;
  
  return INSTRUMENTS.filter((inst) => filtered.includes(inst.id)) as unknown as typeof INSTRUMENTS;
}

/**
 * ID'ye göre enstrüman bul
 */
export function getInstrumentById(id: string): typeof INSTRUMENTS[number] | undefined {
  return INSTRUMENTS.find((inst) => inst.id === id);
}

/**
 * Usül sembol display değerini getir
 */
export function getUsulSymbolDisplay(symbol: PercussionSymbol | ""): string {
  return USUL_SYMBOL_DISPLAY[symbol] ?? "";
}

export type InstrumentsConstants = typeof INSTRUMENTS;
