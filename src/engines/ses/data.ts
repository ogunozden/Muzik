import {Enstruman} from "@/types";

export const ENSTRUMAN_DATA: Enstruman[] = [
  {id: "ud", name: "Ud", nameTr: "Ud", soundType: "plucked_string"},
  {id: "kemençe", name: "Kemençe", nameTr: "Kemençe", soundType: "bowed_string"},
  {id: "ney", name: "Ney", nameTr: "Ney", soundType: "wind"},
  {id: "tanpura", name: "Tanpura", nameTr: "Tanpura", soundType: "plucked_string"},
  {id: "kanun", name: "Kanun", nameTr: "Kanun", soundType: "plucked_zither"},
  {id: "bağlama", name: "Baglama", nameTr: "Bağlama", soundType: "plucked_string"},
  {id: "tambur", name: "Tambur", nameTr: "Tambur", soundType: "plucked_string"},
  {id: "santur", name: "Santur", nameTr: "Santur", soundType: "hammered_zither"},
  {id: "lavta", name: "Lavta", nameTr: "Lavta", soundType: "plucked_string"},
  {id: "rebab", name: "Rebab", nameTr: "Rebab", soundType: "bowed_string"},
  {id: "miskal", name: "Miskal", nameTr: "Miskal", soundType: "wind"},
  {id: "davul", name: "Davul", nameTr: "Davul", soundType: "percussion"},
  {id: "def", name: "Def", nameTr: "Def", soundType: "percussion"},
  {id: "bendir", name: "Bendir", nameTr: "Bendir", soundType: "percussion"},
  {id: "kudum", name: "Kudum", nameTr: "Kudüm", soundType: "percussion"},
  {id: "darbuka", name: "Darbuka", nameTr: "Darbuka", soundType: "percussion"},
  {id: "zilli_def", name: "Zilli Def", nameTr: "Zilli Def", soundType: "percussion"},
  {id: "kaşık", name: "Kasik", nameTr: "Kaşık", soundType: "percussion"},
  {id: "zil", name: "Zil", nameTr: "Zil", soundType: "percussion"},
  {id: "nakkare", name: "Nakkare", nameTr: "Nakkare", soundType: "percussion"},
];

export function getEnstrumanById(id: string): Enstruman | undefined {
  return ENSTRUMAN_DATA.find((e) => e.id === id);
}
