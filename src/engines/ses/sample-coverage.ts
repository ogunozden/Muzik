export interface SampleSlotStatusLike {
  category: "melodic" | "percussion";
  instrumentId: string;
  instrumentName: string;
  installed?: boolean;
}

export interface InstrumentSampleCoverage {
  instrumentId: string;
  instrumentName: string;
  category: "melodic" | "percussion";
  totalSlots: number;
  installedSlots: number;
  missingSlots: number;
  playable: boolean;
  usesSynthFallback: boolean;
}

export interface SampleCoverageSummary {
  totalSlots: number;
  installedSlots: number;
  missingSlots: number;
  instrumentCount: number;
  playableInstrumentCount: number;
  synthFallbackInstrumentCount: number;
  melodicInstrumentCount: number;
  percussionInstrumentCount: number;
  instruments: InstrumentSampleCoverage[];
}

export function summarizeSampleCoverage(slots: readonly SampleSlotStatusLike[]): SampleCoverageSummary {
  const groups = new Map<string, InstrumentSampleCoverage>();

  for (const slot of slots) {
    const current = groups.get(slot.instrumentId) ?? {
      instrumentId: slot.instrumentId,
      instrumentName: slot.instrumentName,
      category: slot.category,
      totalSlots: 0,
      installedSlots: 0,
      missingSlots: 0,
      playable: false,
      usesSynthFallback: false,
    };

    current.totalSlots += 1;
    if (slot.installed) {
      current.installedSlots += 1;
    } else {
      current.missingSlots += 1;
    }
    current.playable = current.installedSlots > 0 || current.category === "melodic";
    current.usesSynthFallback = current.missingSlots > 0 && current.category === "melodic";
    groups.set(slot.instrumentId, current);
  }

  const instruments = Array.from(groups.values()).sort((left, right) =>
    left.instrumentName.localeCompare(right.instrumentName, "tr"),
  );
  const totalSlots = instruments.reduce((total, item) => total + item.totalSlots, 0);
  const installedSlots = instruments.reduce((total, item) => total + item.installedSlots, 0);

  return {
    totalSlots,
    installedSlots,
    missingSlots: totalSlots - installedSlots,
    instrumentCount: instruments.length,
    playableInstrumentCount: instruments.filter((item) => item.playable).length,
    synthFallbackInstrumentCount: instruments.filter((item) => item.usesSynthFallback).length,
    melodicInstrumentCount: instruments.filter((item) => item.category === "melodic").length,
    percussionInstrumentCount: instruments.filter((item) => item.category === "percussion").length,
    instruments,
  };
}
