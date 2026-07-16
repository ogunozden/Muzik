import {describe, it, expect, vi, beforeEach} from "vitest";
import {renderHook, act, waitFor} from "@testing-library/react";

const playScaleAtFrequencies = vi.fn(async (..._args: unknown[]) => {});
const stopAll = vi.fn();
vi.mock("@/engines/ses/engine", () => ({
  playScaleAtFrequencies: (...args: unknown[]) => playScaleAtFrequencies(...args),
  stopAll: () => stopAll(),
}));

import {useMakamPlayback} from "../useMakamPlayback";
import {getMakamById} from "@/engines/makam/data";

const rast = getMakamById("rast")!;

describe("useMakamPlayback", () => {
  beforeEach(() => {
    playScaleAtFrequencies.mockClear();
    stopAll.mockClear();
  });

  it("play → gam koma frekanslarıyla çalınır, sonunda isPlaying düşer", async () => {
    const {result} = renderHook(() => useMakamPlayback());
    expect(result.current.isPlaying).toBe(false);
    await act(async () => {
      await result.current.play(rast);
    });
    expect(playScaleAtFrequencies).toHaveBeenCalledTimes(1);
    // Frekans dizisi (ilk arg) boş olmamalı — koma perde dizisi.
    expect((playScaleAtFrequencies.mock.calls[0][0] as unknown as number[]).length).toBeGreaterThan(4);
    expect(result.current.isPlaying).toBe(false);
  });

  it("çalarken ikinci play çağrısı yok sayılır (guard)", async () => {
    let resolvePlay: () => void = () => {};
    playScaleAtFrequencies.mockImplementationOnce(() => new Promise<void>((r) => (resolvePlay = r)));
    const {result} = renderHook(() => useMakamPlayback());
    act(() => {
      void result.current.play(rast);
    });
    await waitFor(() => expect(result.current.isPlaying).toBe(true));
    await act(async () => {
      await result.current.play(rast); // guard: yok sayilmali
    });
    expect(playScaleAtFrequencies).toHaveBeenCalledTimes(1);
    act(() => resolvePlay());
  });

  it("stop → stopAll çağrılır ve isPlaying temizlenir", async () => {
    playScaleAtFrequencies.mockImplementationOnce(() => new Promise<void>(() => {})); // asla bitmeyen
    const {result} = renderHook(() => useMakamPlayback());
    act(() => {
      void result.current.play(rast);
    });
    await waitFor(() => expect(result.current.isPlaying).toBe(true));
    act(() => result.current.stop());
    expect(stopAll).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(false);
  });
});
