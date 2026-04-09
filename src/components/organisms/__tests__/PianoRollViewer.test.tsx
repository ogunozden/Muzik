import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { PianoRollViewer } from "../PianoRollViewer";

vi.mock("@/components/molecules/PlaybackControls", () => ({
  PlaybackControls: vi.fn(({ onPlay, onStop, onClear, isPlaying, playAriaLabel, stopAriaLabel, clearAriaLabel }: { onPlay: () => void; onStop: () => void; onClear: () => void; isPlaying: boolean; playAriaLabel: string; stopAriaLabel: string; clearAriaLabel: string }) =>
    React.createElement("div", { "data-testid": "mock-playback-controls" },
      React.createElement("button", { onClick: onPlay, "data-aria-label": playAriaLabel }, playAriaLabel),
      React.createElement("button", { onClick: onStop, "data-aria-label": stopAriaLabel }, stopAriaLabel),
      React.createElement("button", { onClick: onClear, "data-aria-label": clearAriaLabel }, clearAriaLabel),
      React.createElement("span", { "data-is-playing": isPlaying }, isPlaying ? "playing" : "stopped")
    )
  ),
}));

vi.mock("@/lib/tokens", () => ({
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

vi.mock("@/lib/constants", () => ({
  PIANO_CONFIG: {
    totalOctaves: 3,
    startOctave: 3,
    whiteKeyWidth: 40,
    whiteKeyHeight: 140,
    blackKeyWidth: 24,
    blackKeyHeight: 90,
  },
  NOTE_NAMES: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
}));

interface NotaEvent {
  pitch: string;
  startTime: number;
  duration: number;
  velocity?: number;
}

describe("PianoRollViewer", () => {
  const defaultProps = {
    notes: [] as NotaEvent[],
    playAriaLabel: "Play",
    stopAriaLabel: "Stop",
    clearAriaLabel: "Clear",
    emptyStateAriaLabel: "No notes",
    onPlay: vi.fn(),
    onStop: vi.fn(),
    onClear: vi.fn(),
    isPlaying: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Renders PlaybackControls with all correct props passed", () => {
    it("should render PlaybackControls", () => {
      render(React.createElement(PianoRollViewer, defaultProps));
      expect(screen.getByTestId("mock-playback-controls")).toBeDefined();
    });

    it("should pass correct props to PlaybackControls", () => {
      render(React.createElement(PianoRollViewer, defaultProps));
      expect(screen.getByText("Play")).toBeDefined();
      expect(screen.getByText("Stop")).toBeDefined();
      expect(screen.getByText("Clear")).toBeDefined();
    });
  });

  describe("When notes is empty array → renders emptyStateAriaLabel text in a span", () => {
    it("should render empty state text when notes is empty", () => {
      render(React.createElement(PianoRollViewer, defaultProps));
      expect(screen.getByText("No notes")).toBeDefined();
    });

    it("should render empty state in a span element", () => {
      render(React.createElement(PianoRollViewer, defaultProps));
      const span = screen.getByText("No notes");
      expect(span.tagName).toBe("SPAN");
    });
  });

  describe("When notes has items → renders the piano roll grid div", () => {
    it("should render piano roll grid when notes exist", () => {
      const notes = [{ pitch: "C4", startTime: 0, duration: 1000 }];
      render(React.createElement(PianoRollViewer, { ...defaultProps, notes }));
      const grid = document.querySelector(".border.border-red-500");
      expect(grid).not.toBeNull();
    });
  });

  describe("Renders playback position line when playbackPosition >= 0", () => {
    it("should render playback line when playbackPosition is 0", () => {
      const notes = [{ pitch: "C4", startTime: 0, duration: 1000 }];
      render(React.createElement(PianoRollViewer, { ...defaultProps, notes, playbackPosition: 0 }));
      const playbackLine = document.querySelector(".absolute.top-0.w-0\\.5");
      expect(playbackLine).not.toBeNull();
    });

    it("should render playback line when playbackPosition is positive", () => {
      const notes = [{ pitch: "C4", startTime: 0, duration: 1000 }];
      render(React.createElement(PianoRollViewer, { ...defaultProps, notes, playbackPosition: 5 }));
      const playbackLine = document.querySelector(".absolute.top-0.w-0\\.5");
      expect(playbackLine).not.toBeNull();
    });
  });

  describe("Does NOT render playback position line when playbackPosition < 0", () => {
    it("should not render playback line when playbackPosition is -1", () => {
      const notes = [{ pitch: "C4", startTime: 0, duration: 1000 }];
      render(React.createElement(PianoRollViewer, { ...defaultProps, notes, playbackPosition: -1 }));
      const playbackLine = document.querySelector(".absolute.top-0.w-0\\.5");
      expect(playbackLine).toBeNull();
    });
  });

  describe("Each note in notes array is rendered as a note div with correct position", () => {
    it("should render note divs with correct styling", () => {
      const notes = [
        { pitch: "C4", startTime: 0, duration: 1000 },
        { pitch: "D4", startTime: 1000, duration: 500 },
      ];
      render(React.createElement(PianoRollViewer, { ...defaultProps, notes }));
      const noteDivs = document.querySelectorAll(".absolute.rounded-sm");
      expect(noteDivs.length).toBe(2);
    });
  });

  describe("Grid rows are rendered for each octave and noteName", () => {
    it("should render grid rows", () => {
      const notes = [{ pitch: "C4", startTime: 0, duration: 1000 }];
      render(React.createElement(PianoRollViewer, { ...defaultProps, notes }));
      const gridRows = document.querySelectorAll(".absolute.left-0.right-0.border-b");
      expect(gridRows.length).toBe(36);
    });
  });

  describe("Note labels are rendered for each noteName", () => {
    it("should render note labels", () => {
      const notes = [{ pitch: "C4", startTime: 0, duration: 1000 }];
      render(React.createElement(PianoRollViewer, { ...defaultProps, notes }));
      expect(screen.getByText("C")).toBeDefined();
      expect(screen.getByText("C#")).toBeDefined();
    });
  });

  describe("Note divs have correct style: left, top, width, height, backgroundColor", () => {
    it("should have absolute and rounded-sm classes", () => {
      const notes = [{ pitch: "C4", startTime: 0, duration: 1000 }];
      render(React.createElement(PianoRollViewer, { ...defaultProps, notes }));
      const noteDivs = document.querySelectorAll(".absolute.rounded-sm");
      noteDivs.forEach((div) => {
        expect(div.className).toContain("absolute");
        expect(div.className).toContain("rounded-sm");
      });
    });
  });

  describe("Renders with custom className", () => {
    it("should apply custom className to root element", () => {
      const { container } = render(React.createElement(PianoRollViewer, { ...defaultProps, className: "custom-class" }));
      expect(container.firstChild?.className).toContain("custom-class");
    });
  });

  describe("Forwards width and height to the container div", () => {
    it("should apply custom width and height", () => {
      const { container } = render(React.createElement(PianoRollViewer, { ...defaultProps, width: 600, height: 200 }));
      const outerDiv = container.querySelector('[role="img"]');
      expect(outerDiv?.getAttribute("style")).toContain("width");
      expect(outerDiv?.getAttribute("style")).toContain("height");
    });
  });

  describe("Renders outer div with role='img' and aria-label", () => {
    it("should have role='img' and aria-label", () => {
      render(React.createElement(PianoRollViewer, defaultProps));
      const imgDiv = document.querySelector('[role="img"]');
      expect(imgDiv).not.toBeNull();
      expect(imgDiv?.getAttribute("aria-label")).toBe("No notes");
    });
  });
});
