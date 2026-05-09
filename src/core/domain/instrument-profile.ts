export type InstrumentFamily = "melodic" | "percussion" | "drone";

export interface SampleSlot {
  note: string;
  url: string;
  rootFrequency?: number;
}

export interface InstrumentProfile {
  id: string;
  name: string;
  family: InstrumentFamily;
  sampleSlots: SampleSlot[];
  synthFallback: boolean;
  tuningProfile?: string;
}
