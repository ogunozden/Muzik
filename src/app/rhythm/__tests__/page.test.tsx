import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import UsulPage from "../page";
import {useEditorStore} from "@/store/editorStore";

const loopControllerMock = vi.hoisted(() => ({
  getPositionBeats: vi.fn(() => 0.5),
  getCycleCount: vi.fn(() => 1),
  getOutputLatencySeconds: vi.fn(() => 0),
  stop: vi.fn(),
}));
const startRhythmLoopMock = vi.hoisted(() => vi.fn(async () => loopControllerMock));
const stopAllMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/ui/layout/UnifiedLayout", () => ({
  UnifiedLayout: ({children}: {children: ReactNode}) => <main>{children}</main>,
}));

vi.mock("@/engines/ses/engine", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/engines/ses/engine")>();

  return {
    ...actual,
    startRhythmLoop: startRhythmLoopMock,
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

  it("starts the seamless audio-clock loop with unit-aware arguments", async () => {
    render(<UsulPage />);

    const playButton = await screen.findByRole("button", {name: "Ritmi Çal"});
    fireEvent.click(playButton);

    await waitFor(() => expect(screen.getByRole("button", {name: "Dur"})).toBeDefined());
    expect(screen.getByText("Sürekli çalıyor")).toBeDefined();
    expect(screen.getByText(/Düm \(1\. vuruş\)/)).toBeDefined();
    // Olcu birimi motora gecer; dongu bayragi acik baslar (dikissiz dongu).
    expect(startRhythmLoopMock).toHaveBeenCalledWith(4, expect.any(Array), 120, "kudum", "4", true);
  });

  it("stops the loop controller when Dur is pressed", async () => {
    render(<UsulPage />);

    fireEvent.click(await screen.findByRole("button", {name: "Ritmi Çal"}));
    await screen.findByRole("button", {name: "Dur"});
    fireEvent.click(screen.getByRole("button", {name: "Dur"}));

    await waitFor(() => expect(screen.getByRole("button", {name: "Ritmi Çal"})).toBeDefined());
    expect(loopControllerMock.stop).toHaveBeenCalled();
    expect(stopAllMock).toHaveBeenCalled();
  });

  it("plays the velvele pattern when the velvele toggle is enabled", async () => {
    render(<UsulPage />);

    const velveleToggle = await screen.findByRole("checkbox", {name: "Velvele"});
    fireEvent.click(velveleToggle);
    fireEvent.click(screen.getByRole("button", {name: "Ritmi Çal"}));

    await waitFor(() => expect(startRhythmLoopMock).toHaveBeenCalled());
    // Sofyan ana deseni 3 darb, velvelesi 5 darbdir (s.18): Dum Te Ke Tek Ka.
    const symbols = (startRhythmLoopMock.mock.calls[0] as unknown[])[1] as Array<{symbol: string}>;
    expect(symbols).toHaveLength(5);
    expect(symbols.map((s) => s.symbol)).toEqual(["dum", "te", "ke", "tek", "ka"]);
  });
});
