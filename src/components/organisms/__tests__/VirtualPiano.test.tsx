import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { VirtualPiano } from "../VirtualPiano";

vi.mock("@/shared/tokens", () => ({
  tokens: {
    colors: {
      primary: { base: "bg-primary", hover: "hover-primary", light: "bg-primary-light" },
      secondary: { base: "bg-secondary", hover: "hover-secondary" },
      accent: { base: "bg-accent", hover: "hover-accent" },
      background: { surface: "bg-surface", base: "bg-base" },
      border: { base: "border-base" },
      text: { primary: "text-primary", secondary: "text-secondary" },
    },
    radius: { md: "rounded-md", lg: "rounded-lg", sm: "rounded-sm", full: "rounded-full" },
    spacing: { sm: "p-2" },
  },
}));

vi.mock("@/engines/ses/engine", () => ({
  playNote: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/constants", () => ({
  PIANO_CONFIG: {
    totalOctaves: 3,
    whiteKeyWidth: 40,
    whiteKeyHeight: 140,
    blackKeyWidth: 24,
    blackKeyHeight: 90,
    startOctave: 3,
  },
}));

vi.mock("@/engines/nota/data", () => ({
  PIANO_KEYS: {
    white: [
      { midiNumber: 48, noteName: "C", octave: 3, isBlack: false },
      { midiNumber: 50, noteName: "D", octave: 3, isBlack: false },
      { midiNumber: 52, noteName: "E", octave: 3, isBlack: false },
      { midiNumber: 53, noteName: "F", octave: 3, isBlack: false },
      { midiNumber: 55, noteName: "G", octave: 3, isBlack: false },
      { midiNumber: 57, noteName: "A", octave: 3, isBlack: false },
      { midiNumber: 59, noteName: "B", octave: 3, isBlack: false },
      { midiNumber: 60, noteName: "C", octave: 4, isBlack: false },
      { midiNumber: 62, noteName: "D", octave: 4, isBlack: false },
      { midiNumber: 64, noteName: "E", octave: 4, isBlack: false },
      { midiNumber: 65, noteName: "F", octave: 4, isBlack: false },
      { midiNumber: 67, noteName: "G", octave: 4, isBlack: false },
      { midiNumber: 69, noteName: "A", octave: 4, isBlack: false },
      { midiNumber: 71, noteName: "B", octave: 4, isBlack: false },
      { midiNumber: 72, noteName: "C", octave: 5, isBlack: false },
    ],
    black: [
      { midiNumber: 49, noteName: "C#", octave: 3, isBlack: true },
      { midiNumber: 51, noteName: "D#", octave: 3, isBlack: true },
      { midiNumber: 54, noteName: "F#", octave: 3, isBlack: true },
      { midiNumber: 56, noteName: "G#", octave: 3, isBlack: true },
      { midiNumber: 58, noteName: "A#", octave: 3, isBlack: true },
      { midiNumber: 61, noteName: "C#", octave: 4, isBlack: true },
      { midiNumber: 63, noteName: "D#", octave: 4, isBlack: true },
      { midiNumber: 66, noteName: "F#", octave: 4, isBlack: true },
      { midiNumber: 68, noteName: "G#", octave: 4, isBlack: true },
      { midiNumber: 70, noteName: "A#", octave: 4, isBlack: true },
    ],
  },
  midiToNoteName: vi.fn((midiNumber: number) => {
    const noteNames: Record<number, string> = {
      48: "C3", 49: "C#3", 50: "D3", 51: "D#3", 52: "E3", 53: "F3", 54: "F#3", 55: "G3", 56: "G#3", 57: "A3", 58: "A#3", 59: "B3",
      60: "C4", 61: "C#4", 62: "D4", 63: "D#4", 64: "E4", 65: "F4", 66: "F#4", 67: "G4", 68: "G#4", 69: "A4", 70: "A#4", 71: "B4",
      72: "C5",
    };
    return noteNames[midiNumber] || `Note${midiNumber}`;
  }),
}));

describe("VirtualPiano", () => {
  const defaultProps = {
    onNoteOn: vi.fn(),
    onNoteOff: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Renders white piano keys from PIANO_KEYS.white", () => {
    it("should render white keys", () => {
      render(React.createElement(VirtualPiano, defaultProps));
      const whiteButtons = screen.getAllByRole("button");
      expect(whiteButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Renders black piano keys from PIANO_KEYS.black", () => {
    it("should render black keys", () => {
      render(React.createElement(VirtualPiano, defaultProps));
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(10);
    });

    it("should position black keys between their neighboring white keys", () => {
      render(React.createElement(VirtualPiano, defaultProps));

      expect(screen.getByRole("button", { name: /Do diyez 3\. oktav siyah tuş/i }).style.left).toBe("28px");
      expect(screen.getByRole("button", { name: /Re diyez 3\. oktav siyah tuş/i }).style.left).toBe("68px");
      expect(screen.getByRole("button", { name: /Fa diyez 3\. oktav siyah tuş/i }).style.left).toBe("148px");
      expect(screen.getByRole("button", { name: /Sol diyez 3\. oktav siyah tuş/i }).style.left).toBe("188px");
      expect(screen.getByRole("button", { name: /La diyez 3\. oktav siyah tuş/i }).style.left).toBe("228px");
    });
  });

  describe("Each white key button has aria-label from whiteKeyAriaLabel(noteName, octave)", () => {
    it("should render white key with correct aria-label", () => {
      render(React.createElement(VirtualPiano, defaultProps));
      const buttons = screen.getAllByRole("button");
      const c3Button = buttons.find((btn) => btn.getAttribute("aria-label") === "Do 3. oktav beyaz tuş");
      expect(c3Button).toBeDefined();
    });
  });

  describe("Each black key button has aria-label from blackKeyAriaLabel(noteName, octave)", () => {
    it("should render black key with correct aria-label", () => {
      render(React.createElement(VirtualPiano, defaultProps));
      const buttons = screen.getAllByRole("button");
      const cSharp3Button = buttons.find((btn) => btn.getAttribute("aria-label") === "Do diyez 3. oktav siyah tuş");
      expect(cSharp3Button).toBeDefined();
    });
  });

  describe("activeNotes prop changes key styling (accent color when midiNumber in activeNotes)", () => {
    it("should apply accent styling to active white key", () => {
      render(React.createElement(VirtualPiano, { ...defaultProps, activeNotes: [48] }));
      const button = screen.getByRole("button", { name: /Do 3\. oktav beyaz tuş/i });
      expect(button.className).toContain("bg-accent");
    });
  });

  describe("onNoteOn callback is called when a white key is pressed", () => {
    it("should call onNoteOn when white key is pressed", () => {
      render(React.createElement(VirtualPiano, defaultProps));
      const button = screen.getByRole("button", { name: /Do 3\. oktav beyaz tuş/i });
      fireEvent.mouseDown(button);
      expect(defaultProps.onNoteOn).toHaveBeenCalledWith(48);
    });
  });

  describe("onNoteOff callback is called when a white key is released (mouseLeave)", () => {
    it("should call onNoteOff on mouseLeave", () => {
      render(React.createElement(VirtualPiano, defaultProps));
      const button = screen.getByRole("button", { name: /Do 3\. oktav beyaz tuş/i });
      fireEvent.mouseLeave(button);
      expect(defaultProps.onNoteOff).toHaveBeenCalledWith(48);
    });
  });

  describe("Renders with custom whiteKeyAriaLabel function", () => {
    it("should use custom whiteKeyAriaLabel", () => {
      const customLabel = vi.fn((noteName: string, octave: number) => `White key ${noteName}${octave}`);
      render(React.createElement(VirtualPiano, { ...defaultProps, whiteKeyAriaLabel: customLabel }));
      const button = screen.getByRole("button", { name: /White key C3/i });
      expect(button).toBeDefined();
    });
  });

  describe("Renders with custom blackKeyAriaLabel function", () => {
    it("should use custom blackKeyAriaLabel", () => {
      const customLabel = vi.fn((noteName: string, octave: number) => `Black key ${noteName}${octave}`);
      render(React.createElement(VirtualPiano, { ...defaultProps, blackKeyAriaLabel: customLabel }));
      const button = screen.getByRole("button", { name: /Black key C#3/i });
      expect(button).toBeDefined();
    });
  });

  describe("Piano wrapper div has correct styling classes", () => {
    it("should have inline-block class on wrapper", () => {
      const { container } = render(React.createElement(VirtualPiano, defaultProps));
      expect((container.firstChild as HTMLElement)?.className).toContain("inline-block");
    });
  });
});
