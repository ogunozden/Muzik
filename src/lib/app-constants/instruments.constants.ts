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
  { id: "kanun" as InstrumentType, nameTr: "Kanun", nameEn: "Kanun" },
  { id: "bağlama" as InstrumentType, nameTr: "Bağlama", nameEn: "Baglama" },
  { id: "tambur" as InstrumentType, nameTr: "Tambur", nameEn: "Tambur" },
  { id: "santur" as InstrumentType, nameTr: "Santur", nameEn: "Santur" },
  { id: "lavta" as InstrumentType, nameTr: "Lavta", nameEn: "Lavta" },
  { id: "rebab" as InstrumentType, nameTr: "Rebab", nameEn: "Rebab" },
  { id: "miskal" as InstrumentType, nameTr: "Miskal", nameEn: "Miskal" },
  { id: "bendir" as InstrumentType, nameTr: "Bendir", nameEn: "Bendir" },
  { id: "kudum" as InstrumentType, nameTr: "Kudüm", nameEn: "Kudum" },
  { id: "davul" as InstrumentType, nameTr: "Davul", nameEn: "Davul" },
  { id: "def" as InstrumentType, nameTr: "Def", nameEn: "Def" },
  { id: "darbuka" as InstrumentType, nameTr: "Darbuka", nameEn: "Darbuka" },
  { id: "zilli_def" as InstrumentType, nameTr: "Zilli Def", nameEn: "Frame Drum With Zils" },
  { id: "kaşık" as InstrumentType, nameTr: "Kaşık", nameEn: "Spoons" },
  { id: "zil" as InstrumentType, nameTr: "Zil", nameEn: "Cymbal" },
  { id: "nakkare" as InstrumentType, nameTr: "Nakkare", nameEn: "Nakkare" },
] as const;

/**
 * Melodik enstrümanlar
 */
export const MELODIC_INSTRUMENTS: InstrumentType[] = [
  "ney",
  "ud",
  "kemençe",
  "tanpura",
  "kanun",
  "bağlama",
  "tambur",
  "santur",
  "lavta",
  "rebab",
  "miskal",
] as const;

/**
 * Vurmalı enstrümanlar
 */
export const PERCUSSION_INSTRUMENTS: InstrumentType[] = [
  "bendir",
  "kudum",
  "davul",
  "def",
  "darbuka",
  "zilli_def",
  "kaşık",
  "zil",
  "nakkare",
] as const;

/**
 * Enstrüman verileri
 */
export const INSTRUMENTS_DATA: Enstruman[] = [
  { id: "ud", name: "Ud", nameTr: "Ud", soundType: "plucked_string" },
  { id: "kemençe", name: "Kemençe", nameTr: "Kemençe", soundType: "bowed_string" },
  { id: "ney", name: "Ney", nameTr: "Ney", soundType: "wind" },
  { id: "tanpura", name: "Tanpura", nameTr: "Tanpura", soundType: "plucked_string" },
  { id: "kanun", name: "Kanun", nameTr: "Kanun", soundType: "plucked_zither" },
  { id: "bağlama", name: "Baglama", nameTr: "Bağlama", soundType: "plucked_string" },
  { id: "tambur", name: "Tambur", nameTr: "Tambur", soundType: "plucked_string" },
  { id: "santur", name: "Santur", nameTr: "Santur", soundType: "hammered_zither" },
  { id: "lavta", name: "Lavta", nameTr: "Lavta", soundType: "plucked_string" },
  { id: "rebab", name: "Rebab", nameTr: "Rebab", soundType: "bowed_string" },
  { id: "miskal", name: "Miskal", nameTr: "Miskal", soundType: "wind" },
  { id: "davul", name: "Davul", nameTr: "Davul", soundType: "percussion" },
  { id: "def", name: "Def", nameTr: "Def", soundType: "percussion" },
  { id: "bendir", name: "Bendir", nameTr: "Bendir", soundType: "percussion" },
  { id: "kudum", name: "Kudüm", nameTr: "Kudüm", soundType: "percussion" },
  { id: "darbuka", name: "Darbuka", nameTr: "Darbuka", soundType: "percussion" },
  { id: "zilli_def", name: "Zilli Def", nameTr: "Zilli Def", soundType: "percussion" },
  { id: "kaşık", name: "Kasik", nameTr: "Kaşık", soundType: "percussion" },
  { id: "zil", name: "Zil", nameTr: "Zil", soundType: "percussion" },
  { id: "nakkare", name: "Nakkare", nameTr: "Nakkare", soundType: "percussion" },
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
