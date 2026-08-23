import {describe, expect, it} from "vitest";
import {INSTRUMENT_PROFILES} from "../profiles";
import {SAMPLE_SLOTS} from "../sample-library";
import {INSTRUMENTS, MELODIC_INSTRUMENTS, PERCUSSION_INSTRUMENTS} from "@/shared/config/instruments";

describe("instrument catalog consistency", () => {
  it("has an audio profile for every listed instrument", () => {
    const profileIds = new Set(Object.keys(INSTRUMENT_PROFILES));

    for (const instrument of INSTRUMENTS) {
      expect(profileIds.has(instrument.id)).toBe(true);
    }
  });

  it("keeps melodic and percussion categories aligned with audio profiles", () => {
    for (const instrumentId of MELODIC_INSTRUMENTS) {
      expect(INSTRUMENT_PROFILES[instrumentId].type).toBe("melodic");
    }

    for (const instrumentId of PERCUSSION_INSTRUMENTS) {
      expect(INSTRUMENT_PROFILES[instrumentId].type).toBe("percussion");
    }
  });

  it("creates sample upload slots for every instrument category", () => {
    const slotInstrumentIds = new Set(SAMPLE_SLOTS.map((slot) => slot.instrumentId));

    for (const instrument of INSTRUMENTS) {
      expect(slotInstrumentIds.has(instrument.id)).toBe(true);
    }
  });
});
