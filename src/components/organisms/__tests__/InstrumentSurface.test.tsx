import {beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import {InstrumentSurface, MELODIC_INSTRUMENT_SURFACES} from "../InstrumentSurface";
import {playNote} from "@/engines/ses/engine";
import {MELODIC_INSTRUMENTS} from "@/lib/app-constants";

vi.mock("@/shared/tokens", () => ({
  tokens: {
    colors: {
      background: {base: "bg-base", surface: "bg-surface"},
      text: {primary: "text-primary", secondary: "text-secondary"},
      border: {base: "border-base"},
    },
    radius: {md: "rounded-md"},
  },
}));

vi.mock("@/engines/ses/engine", () => ({
  playNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/engines/nota/data", () => {
  const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const keys = Array.from({length: 36}).map((_, index) => {
    const midiNumber = 48 + index;
    const noteName = noteNames[index % 12];
    return {
      midiNumber,
      noteName,
      octave: Math.floor(midiNumber / 12) - 1,
      isBlack: noteName.includes("#"),
    };
  });

  return {
    PIANO_KEYS: {
      white: keys.filter((key) => !key.isBlack),
      black: keys.filter((key) => key.isBlack),
    },
    midiToNoteName: vi.fn((midiNumber: number) => {
      const noteName = noteNames[(midiNumber - 48) % 12];
      const octave = Math.floor(midiNumber / 12) - 1;
      return `${noteName}${octave}`;
    }),
  };
});

describe("InstrumentSurface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("has a visual surface for every melodic instrument in the catalog", () => {
    expect(Object.keys(MELODIC_INSTRUMENT_SURFACES).sort()).toEqual([...MELODIC_INSTRUMENTS].sort());
  });

  it("renders a configured surface for every melodic instrument", () => {
    for (const [instrument, config] of Object.entries(MELODIC_INSTRUMENT_SURFACES)) {
      const {unmount} = render(React.createElement(InstrumentSurface, {instrument: instrument as never}));
      const surface = screen.getByTestId("instrument-surface");

      expect(surface.getAttribute("data-instrument")).toBe(instrument);
      expect(surface.getAttribute("data-layout")).toBe(config.layout);
      expect(screen.getByText(config.name)).toBeDefined();
      expect(screen.getAllByTestId("instrument-note")).toHaveLength(36);

      unmount();
    }
  });

  it("renders Kanun as a zither surface instead of a piano surface", () => {
    render(React.createElement(InstrumentSurface, {instrument: "kanun"}));

    const surface = screen.getByTestId("instrument-surface");
    expect(surface.getAttribute("data-instrument")).toBe("kanun");
    expect(surface.getAttribute("data-layout")).toBe("zither");
    expect(screen.queryByLabelText(/Virtual piano keyboard/i)).toBeNull();
  });

  it("plays the selected instrument when a note is pressed", () => {
    const onNoteOn = vi.fn();
    render(React.createElement(InstrumentSurface, {instrument: "kanun", onNoteOn}));

    fireEvent.mouseDown(screen.getByRole("button", {name: /Kanun C3 note/i}));

    expect(onNoteOn).toHaveBeenCalledWith(48);
    expect(playNote).toHaveBeenCalledWith(48, 0.5, "kanun");
  });

  it("calls note off when the active note is released", () => {
    const onNoteOff = vi.fn();
    render(React.createElement(InstrumentSurface, {instrument: "ney", onNoteOff}));

    fireEvent.mouseUp(screen.getByRole("button", {name: /Ney C3 note/i}));

    expect(onNoteOff).toHaveBeenCalledWith(48);
  });
});
