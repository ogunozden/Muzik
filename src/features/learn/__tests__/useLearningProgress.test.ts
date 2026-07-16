import {describe, it, expect, beforeEach} from "vitest";
import {renderHook, act} from "@testing-library/react";
import {useLearningProgress} from "../useLearningProgress";

describe("useLearningProgress", () => {
  beforeEach(() => localStorage.clear());

  it("bos baslar", () => {
    const {result} = renderHook(() => useLearningProgress());
    expect(result.current.completedCount).toBe(0);
  });

  it("ogrenildi isaretler ve geri alir", () => {
    const {result} = renderHook(() => useLearningProgress());
    act(() => result.current.markCompleted("sofyan"));
    expect(result.current.isCompleted("sofyan")).toBe(true);
    expect(result.current.completedCount).toBe(1);
    act(() => result.current.markIncomplete("sofyan"));
    expect(result.current.isCompleted("sofyan")).toBe(false);
    expect(result.current.completedCount).toBe(0);
  });

  it("toggle durumu ters cevirir", () => {
    const {result} = renderHook(() => useLearningProgress());
    act(() => result.current.toggle("duyek"));
    expect(result.current.isCompleted("duyek")).toBe(true);
    act(() => result.current.toggle("duyek"));
    expect(result.current.isCompleted("duyek")).toBe(false);
  });

  it("localStorage'da kalir (yeni hook ornegi yukler)", () => {
    const first = renderHook(() => useLearningProgress());
    act(() => first.result.current.markCompleted("aksak"));
    const second = renderHook(() => useLearningProgress());
    expect(second.result.current.isCompleted("aksak")).toBe(true);
  });

  it("reset hepsini temizler", () => {
    const {result} = renderHook(() => useLearningProgress());
    act(() => {
      result.current.markCompleted("aksak");
      result.current.markCompleted("duyek");
    });
    expect(result.current.completedCount).toBe(2);
    act(() => result.current.reset());
    expect(result.current.completedCount).toBe(0);
  });
});
