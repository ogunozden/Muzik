import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import UsulPage from "../page";
import {useEditorStore} from "@/store/editorStore";

const initAudioMock = vi.hoisted(() => vi.fn(async () => true));
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

  it("shows the rhythm as playing immediately while percussion samples are still scheduling", async () => {
    render(<UsulPage />);

    const playButton = await screen.findByRole("button", {name: "Ritmi Çal"});
    fireEvent.click(playButton);

    await waitFor(() => expect(screen.getByRole("button", {name: "Dur"})).toBeDefined());
    expect(screen.getByText("Çalıyor")).toBeDefined();
    expect(screen.getByText("1. DUM")).toBeDefined();
    expect(initAudioMock).toHaveBeenCalledTimes(1);
    expect(playRhythmMock).toHaveBeenCalledWith(
      4,
      expect.any(Array),
      120,
      "kudum",
    );
  });
});
