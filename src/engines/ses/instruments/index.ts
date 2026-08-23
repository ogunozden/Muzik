import { MELODIC_PROFILES } from "@/engines/ses/instruments/melodic";
import { PERCUSSION_PROFILES } from "@/engines/ses/instruments/percussion";
import type { InstrumentProfile, InstrumentType } from "@/engines/ses/instruments/types";

export const INSTRUMENT_PROFILES: Record<InstrumentType, InstrumentProfile> = {
  ...MELODIC_PROFILES,
  ...PERCUSSION_PROFILES,
} as Record<InstrumentType, InstrumentProfile>;

export { isPercussionSymbol } from "@/engines/ses/instruments/types";
export type { InstrumentType, PercussionSymbol, InstrumentProfile, Formant } from "@/engines/ses/instruments/types";
export { MELODIC_PROFILES } from "@/engines/ses/instruments/melodic";
export { PERCUSSION_PROFILES } from "@/engines/ses/instruments/percussion";

export {
  initAudio,
  preloadInstrumentSamples,
  preloadPercussionSymbolSamples,
  preloadPercussionSamples,
  playInstrumentNote,
  playScaleWithInstrument,
  playScaleFrequencies,
  playInstrumentNoteScheduled,
} from "@/engines/ses/instruments/playback";

export {
  buildRhythmSchedule,
  playRhythmWithPercussion,
  playPercussionSymbolScheduled,
  startRhythmLoop,
  seamlessRetuneStart,
  heardContextTime,
} from "@/engines/ses/instruments/rhythm";
export type { RhythmScheduleHit, RhythmLoopController, OutputTimingContext, RhythmSymbolInput } from "@/engines/ses/instruments/rhythm";

export { getAudioContext, stopAll } from "@/engines/ses/core";
export { clearSampleCache } from "@/engines/ses/samples";
