import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import UsulPage from "../page";
import {useEditorStore} from "@/store/editorStore";

const initAudioMock = vi.hoisted(() => vi.fn(async () => true));
const preloadRhythmMock = vi.hoisted(() => vi.fn(async () => true));
const playRhythmMock = vi.hoisted(() => vi.fn(() => new Promise<void>(() => undefined)));
const stopAllMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/ui/layout/UnifiedLayout", () => ({
  UnifiedLayout: ({children}: {children: ReactNode}) => <main>{children}</main>,
}));

vi.mock("@/engines/ses/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/engines/ses/engine")>();

  return {
    ...actual,
    initAudio: initAudioMock,
    preloadRhythm: preloadRhythmMock,
    playRhythm: playRhythmMock,
    stopAll: stopAllMock,
  };
});

describe("UsulPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollTo = vi.fn();
    useEditorStore.setState({
      selectedUsulId: "",
      selectedUsulObj: null,
      selectedPercussionInstrument: "kudum",
      bpm: 120,
    });
  });

  it("starts playback only after audio init + preload, with unit-aware scheduling", async () => {
    render(<UsulPage />);

    const playButton = await screen.findByRole("button", {name: "Ritmi Çal"});
    fireEvent.click(playButton);

    await waitFor(() => expect(screen.getByRole("button", {name: "Dur"})).toBeDefined());
    expect(screen.getByText("Sürekli çalıyor")).toBeDefined();
    expect(screen.getByText(/Düm \(1\. vuruş\)/)).toBeDefined();
    expect(initAudioMock).toHaveBeenCalledTimes(1);
    // Gorsel sayac baslamadan once sample'lar isinir (ses/gorsel senkron kaniti).
    expect(preloadRhythmMock).toHaveBeenCalledTimes(1);
    // Olcu birimi ses motoruna da gecer: 8'lik usullerde 2x ayrismanin onlemi.
    expect(playRhythmMock).toHaveBeenCalledWith(
      4,
      expect.any(Array),
      120,
      "kudum",
      "4",
    );
  });

  it("plays the velvele pattern when the velvele toggle is enabled", async () => {
    render(<UsulPage />);

    const velveleToggle = await screen.findByRole("checkbox", {name: "Velvele"});
    fireEvent.click(velveleToggle);
    fireEvent.click(screen.getByRole("button", {name: "Ritmi Çal"}));

    await waitFor(() => expect(playRhythmMock).toHaveBeenCalled());
    // Sofyan ana deseni 3 darb, velvelesi 5 darbdir (s.18): Dum Te Ke Tek Ka.
    const symbols = (playRhythmMock.mock.calls[0] as unknown[])[1] as Array<{symbol: string}>;
    expect(symbols).toHaveLength(5);
    expect(symbols.map((s) => s.symbol)).toEqual(["dum", "te", "ke", "tek", "ka"]);
  });
});
