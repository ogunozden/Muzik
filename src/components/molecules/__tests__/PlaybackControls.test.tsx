import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaybackControls } from "../PlaybackControls";

vi.mock("@/components/atoms/Button", () => ({
  Button: vi.fn(({ children, onPress, variant, ariaLabel, className, ...props }) => 
    <button 
      data-testid="mock-button" 
      aria-label={ariaLabel}
      data-variant={variant}
      onClick={onPress}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

describe("PlaybackControls", () => {
  it("1. Renders play Button (variant='primary') when isPlaying=false", () => {
    render(
      <PlaybackControls
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onClear={vi.fn()}
        isPlaying={false}
        playAriaLabel="Play"
        stopAriaLabel="Stop"
        clearAriaLabel="Clear"
      />
    );
    const buttons = screen.getAllByTestId("mock-button");
    const playButton = buttons.find(btn => btn.getAttribute("data-variant") === "primary");
    expect(playButton).toBeDefined();
    expect(playButton?.textContent).toBe("Play");
  });

  it("2. Renders stop Button (variant='accent') when isPlaying=true", () => {
    render(
      <PlaybackControls
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onClear={vi.fn()}
        isPlaying={true}
        playAriaLabel="Play"
        stopAriaLabel="Stop"
        clearAriaLabel="Clear"
      />
    );
    const buttons = screen.getAllByTestId("mock-button");
    const stopButton = buttons.find(btn => btn.getAttribute("data-variant") === "accent");
    expect(stopButton).toBeDefined();
    expect(stopButton?.textContent).toBe("Stop");
  });

  it("3. Always renders clear Button (variant='bordered')", () => {
    render(
      <PlaybackControls
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onClear={vi.fn()}
        isPlaying={false}
        playAriaLabel="Play"
        stopAriaLabel="Stop"
        clearAriaLabel="Clear"
      />
    );
    const buttons = screen.getAllByTestId("mock-button");
    const clearButton = buttons.find(btn => btn.getAttribute("data-variant") === "bordered");
    expect(clearButton).toBeDefined();
    expect(clearButton?.textContent).toBe("Clear");
  });

  it("4. Calls onPlay when play button is pressed (check Button onPress prop)", () => {
    const handlePlay = vi.fn();
    render(
      <PlaybackControls
        onPlay={handlePlay}
        onStop={vi.fn()}
        onClear={vi.fn()}
        isPlaying={false}
        playAriaLabel="Play"
        stopAriaLabel="Stop"
        clearAriaLabel="Clear"
      />
    );
    const playButton = screen.getAllByTestId("mock-button")[0];
    fireEvent.click(playButton);
    expect(handlePlay).toHaveBeenCalledTimes(1);
  });

  it("5. Calls onStop when stop button is pressed (check Button onPress prop)", () => {
    const handleStop = vi.fn();
    render(
      <PlaybackControls
        onPlay={vi.fn()}
        onStop={handleStop}
        onClear={vi.fn()}
        isPlaying={true}
        playAriaLabel="Play"
        stopAriaLabel="Stop"
        clearAriaLabel="Clear"
      />
    );
    const stopButton = screen.getAllByTestId("mock-button")[0];
    fireEvent.click(stopButton);
    expect(handleStop).toHaveBeenCalledTimes(1);
  });

  it("6. Calls onClear when clear button is pressed (check Button onPress prop)", () => {
    const handleClear = vi.fn();
    render(
      <PlaybackControls
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onClear={handleClear}
        isPlaying={false}
        playAriaLabel="Play"
        stopAriaLabel="Stop"
        clearAriaLabel="Clear"
      />
    );
    const clearButton = screen.getAllByTestId("mock-button")[1];
    fireEvent.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it("7. Renders with custom className", () => {
    render(
      <PlaybackControls
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onClear={vi.fn()}
        isPlaying={false}
        playAriaLabel="Play"
        stopAriaLabel="Stop"
        clearAriaLabel="Clear"
        className="custom-playback-class"
      />
    );
    const container = screen.getAllByTestId("mock-button")[0].parentElement;
    expect(container?.className).toContain("custom-playback-class");
  });

  it("8. Renders playAriaLabel, stopAriaLabel, clearAriaLabel as button aria-label and children", () => {
    render(
      <PlaybackControls
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onClear={vi.fn()}
        isPlaying={false}
        playAriaLabel="Play Music"
        stopAriaLabel="Stop Music"
        clearAriaLabel="Clear All"
      />
    );
    const buttons = screen.getAllByTestId("mock-button");
    expect(buttons[0].getAttribute("aria-label")).toBe("Play Music");
    expect(buttons[1].getAttribute("aria-label")).toBe("Clear All");
    expect(screen.getByText("Play Music")).toBeDefined();
    expect(screen.getByText("Clear All")).toBeDefined();
  });
});
