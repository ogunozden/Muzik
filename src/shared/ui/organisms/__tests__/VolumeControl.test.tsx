import {fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {
  DEFAULT_PLAYBACK_VOLUME,
  PLAYBACK_VOLUME_STORAGE_KEY,
  VolumeControl,
  clampPlaybackVolume,
  readStoredPlaybackVolume,
} from "../VolumeControl";

describe("playback volume", () => {
  afterEach(() => {
    window.localStorage.clear();
  });

  it("clamps volume to 0..1 with sane default", () => {
    expect(clampPlaybackVolume(2)).toBe(1);
    expect(clampPlaybackVolume(-1)).toBe(0);
    expect(clampPlaybackVolume(0.5)).toBe(0.5);
    expect(clampPlaybackVolume(Number.NaN)).toBe(DEFAULT_PLAYBACK_VOLUME);
  });

  it("reads stored volume; invalid values fall back to default", () => {
    expect(readStoredPlaybackVolume()).toBe(1);

    window.localStorage.setItem(PLAYBACK_VOLUME_STORAGE_KEY, "0.4");
    expect(readStoredPlaybackVolume()).toBeCloseTo(0.4);

    window.localStorage.setItem(PLAYBACK_VOLUME_STORAGE_KEY, "12");
    expect(readStoredPlaybackVolume()).toBe(1);
  });

  it("renders slider percentage and reports 0..1 changes", () => {
    const onChange = vi.fn();
    render(<VolumeControl volume={0.5} onVolumeChange={onChange} />);

    const slider = screen.getByRole("slider", {name: "Ses seviyesi"}) as HTMLInputElement;
    expect(slider.value).toBe("50");
    expect(screen.getByText("50%")).toBeDefined();

    fireEvent.change(slider, {target: {value: "25"}});
    expect(onChange).toHaveBeenCalledWith(0.25);
  });

  it("handles localStorage errors gracefully", () => {
    const originalGetItem = window.localStorage.getItem;
    window.localStorage.getItem = () => {
      throw new Error("storage fail");
    };
    expect(readStoredPlaybackVolume()).toBe(DEFAULT_PLAYBACK_VOLUME);
    window.localStorage.getItem = originalGetItem;
  });

  it("clamps edge values and infinity", () => {
    expect(clampPlaybackVolume(Number.POSITIVE_INFINITY)).toBe(DEFAULT_PLAYBACK_VOLUME);
    expect(clampPlaybackVolume(Number.NEGATIVE_INFINITY)).toBe(DEFAULT_PLAYBACK_VOLUME);
    expect(clampPlaybackVolume(0)).toBe(0);
    expect(clampPlaybackVolume(1)).toBe(1);
  });

  it("persists volume via usePlaybackVolume hook", async () => {
    const {usePlaybackVolume} = await import("../VolumeControl");
    const TestComp = () => {
      const [vol, setVol] = usePlaybackVolume();
      return <button onClick={() => setVol(0.7)}>vol:{vol}</button>;
    };
    const {getByRole} = render(<TestComp />);
    expect(getByRole("button").textContent).toContain("vol:");
    fireEvent.click(getByRole("button"));
    expect(window.localStorage.getItem(PLAYBACK_VOLUME_STORAGE_KEY)).toBe("0.7");
  });
});
