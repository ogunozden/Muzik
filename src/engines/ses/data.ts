import {Enstruman} from "@/types";

export const ENSTRUMAN_DATA: Enstruman[] = [
  {id: "ud", name: "Ud", nameTr: "Ud", soundType: "plucked_string"},
  {id: "kemençe", name: "Kemençe", nameTr: "Kemençe", soundType: "bowed_string"},
  {id: "ney", name: "Ney", nameTr: "Ney", soundType: "wind"},
  {id: "tanpura", name: "Tanpura", nameTr: "Tanpura", soundType: "plucked_string"},
  {id: "davul", name: "Davul", nameTr: "Davul", soundType: "percussion"},
  {id: "def", name: "Def", nameTr: "Def", soundType: "percussion"},
];

export function getEnstrumanById(id: string): Enstruman | undefined {
  return ENSTRUMAN_DATA.find((e) => e.id === id);
}
