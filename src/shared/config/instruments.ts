/**
 * Instruments — TEK MERKEZ (ENGINEERING_RULESET: "Hardcode yok")
 *
 * Enstrüman kimlikleri, adları ve sınıflandırmaları burada tanımlanır.
 * `src/lib/app-constants` ve `src/engines/ses/profiles` yalnızca re-export eder.
 * Yeni enstrüman eklemek için tek dosya: burası.
 */

import type {InstrumentType} from "@/engines/ses/profiles";

export type {InstrumentType} from "@/engines/ses/profiles";

/**
 * Enstrüman listesi — merkezi katalog
 */
export const INSTRUMENTS = [
  {id: "ney" as InstrumentType, nameTr: "Ney", nameEn: "Ney"},
  {id: "ud" as InstrumentType, nameTr: "Ud", nameEn: "Ud"},
  {id: "kemençe" as InstrumentType, nameTr: "Kemençe", nameEn: "Kemençe"},
  {id: "kanun" as InstrumentType, nameTr: "Kanun", nameEn: "Kanun"},
  {id: "bağlama" as InstrumentType, nameTr: "Bağlama", nameEn: "Baglama"},
  {id: "tambur" as InstrumentType, nameTr: "Tambur", nameEn: "Tambur"},
  {id: "santur" as InstrumentType, nameTr: "Santur", nameEn: "Santur"},
  {id: "lavta" as InstrumentType, nameTr: "Lavta", nameEn: "Lavta"},
  {id: "rebab" as InstrumentType, nameTr: "Rebab", nameEn: "Rebab"},
  {id: "miskal" as InstrumentType, nameTr: "Miskal", nameEn: "Miskal"},
  {id: "bendir" as InstrumentType, nameTr: "Bendir", nameEn: "Bendir"},
  {id: "kudum" as InstrumentType, nameTr: "Kudüm", nameEn: "Kudum"},
  {id: "davul" as InstrumentType, nameTr: "Davul", nameEn: "Davul"},
  {id: "def" as InstrumentType, nameTr: "Def", nameEn: "Def"},
  {id: "darbuka" as InstrumentType, nameTr: "Darbuka", nameEn: "Darbuka"},
  {id: "zilli_def" as InstrumentType, nameTr: "Zilli Def", nameEn: "Frame Drum With Zils"},
  {id: "kaşık" as InstrumentType, nameTr: "Kaşık", nameEn: "Spoons"},
  {id: "zil" as InstrumentType, nameTr: "Zil", nameEn: "Cymbal"},
  {id: "nakkare" as InstrumentType, nameTr: "Nakkare", nameEn: "Nakkare"},
] as const;

/**
 * Melodik enstrümanlar
 */
export const MELODIC_INSTRUMENTS: readonly InstrumentType[] = [
  "ney",
  "ud",
  "kemençe",
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
export const PERCUSSION_INSTRUMENTS: readonly InstrumentType[] = [
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
