import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {CanonicalScorePrototype} from "../CanonicalScorePrototype";

const playArrangementMock = vi.hoisted(() => vi.fn(async () => ({durationSeconds: 1, baseTime: 0})));
const stopAllMock = vi.hoisted(() => vi.fn());
/**
 * Ses saati sahtesi (D6). Uretimde konum `heardContextTime` uzerinden
 * AudioContext'ten okunur (getOutputTimestamp / outputLatency); jsdom'da
 * AudioContext yok.
 *
 * DUVAR SAATI kullanmiyoruz: tam suite yuku altinda rAF frame'leri aclik
 * cekince test flaky oluyordu. Her cagride sabit bir adim ilerleten sayac,
 * imlecin ilerledigini planlayiciya bagimli olmadan dogrular.
 */
const HEARD_STEP_SECONDS = 0.25;
const heardClock = vi.hoisted(() => ({calls: 0}));

vi.mock("@/engines/ses/engine", () => ({
  playArrangement: playArrangementMock,
  getHeardPlaybackPosition: () => {
    heardClock.calls += 1;
    return heardClock.calls * HEARD_STEP_SECONDS;
  },
  stopAll: stopAllMock,
}));

describe("CanonicalScorePrototype", () => {
  beforeEach(() => {
    playArrangementMock.mockClear();
    stopAllMock.mockClear();
    heardClock.calls = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders a clean canonical score surface with active note lineage", () => {
    render(<CanonicalScorePrototype />);

    expect(screen.getByRole("heading", {name: "Skor Motoru"})).toBeDefined();
    expect(screen.getByRole("img", {name: "Canonical score engine VexFlow temiz nota yüzeyi"})).toBeDefined();
    expect(screen.getByText("score-engine-demo:hicazkar-pesrev:m1:n2")).toBeDefined();
    expect(screen.getAllByText("symbolic-confirmed").length).toBeGreaterThan(0);
    expect(screen.getByTestId("canonical-vex-map").textContent).toContain(
      "score-engine-demo:hicazkar-pesrev:m1:n2:f#/5:q:plain:#4",
    );
    expect(screen.getByTestId("canonical-vex-map").textContent).toContain(
      "score-engine-demo:hicazkar-pesrev:m1:n5:bb/5:16:plain:b5",
    );
    expect(screen.getByTestId("score-render-systems").textContent).toContain(
      "score-engine-demo:hicazkar-pesrev:m1:system:1",
    );
    expect(screen.getByTestId("score-glyph-class-map").textContent).toContain("section-label:1. HANE");
    expect(screen.getByTestId("score-glyph-class-map").textContent).toContain("usul-label:Devr-i Kebir");
    expect(screen.getByTestId("score-glyph-class-map").textContent).toContain("key-signature-source:missing");
    expect(screen.getByTestId("score-key-signature-policy").textContent).toContain("kaynak eksik");
    expect(screen.getByLabelText("Çalınan enstrüman")).toBeDefined();
    expect(screen.getAllByText("Ud").length).toBeGreaterThan(0);
  });

  it("toggles notation layers on the workbench surface", () => {
    render(<CanonicalScorePrototype />);

    const accidentalsButton = screen.getByRole("button", {name: /Arıza/});
    expect(accidentalsButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(accidentalsButton);

    expect(accidentalsButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("maps rests and dotted source durations before engraving", () => {
    render(<CanonicalScorePrototype />);
    const mapText = screen.getByTestId("canonical-vex-map").textContent ?? "";

    expect(mapText).toContain("score-engine-demo:hicazkar-pesrev:m1:n4:g/5:8:dotted:none");
    expect(mapText).toContain("score-engine-demo:hicazkar-pesrev:m4:n16:b/4:qr:plain:none");
  });

  it("schedules playback from canonical note ids", async () => {
    render(<CanonicalScorePrototype />);

    fireEvent.click(screen.getByRole("button", {name: "Motoru Çal"}));

    await waitFor(() => expect(playArrangementMock).toHaveBeenCalled());
    const calls = playArrangementMock.mock.calls as unknown as [
      Array<{noteId: string; measureId: string}>,
    ][];

    expect(calls[0][0][0]).toMatchObject({
      noteId: "score-engine-demo:hicazkar-pesrev:m1:n2",
      measureId: "score-engine-demo:hicazkar-pesrev:m1",
      instrument: "ud",
    });
  });

  it("advances the active note id while playback is running", async () => {
    playArrangementMock.mockResolvedValueOnce({durationSeconds: 3, baseTime: 0});

    render(<CanonicalScorePrototype />);

    fireEvent.click(screen.getByRole("button", {name: "Motoru Çal"}));

    await waitFor(() => expect(playArrangementMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("score-engine-demo:hicazkar-pesrev:m1:n3")).toBeDefined(), {
      timeout: 1400,
    });
  });
});
