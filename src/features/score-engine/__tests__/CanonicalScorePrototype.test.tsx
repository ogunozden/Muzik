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
 * KOK NEDEN (2026-08-08, iki kez flaky): konum ZAMAN-TABANLI oldugunda ve
 * tam suite yuku altinda rAF frame'leri seyrek dustugunde, orneklenen konum
 * n3'UN PENCERESININ USTUNE atliyordu (n3 hicbir poll'da gorunmuyordu).
 * Cozum: mock, n3'UN PENCERESI ICINDE SABIT bir konum dondurur — tek bir
 * gec kalmis frame bile testi gecirir; pencere kacirma imkansizdir.
 */
// Demo dokuman m1 pencereleri: n2 [0, 0.833), n3 [0.833, 1.667), n4 [1.667, ...).
// 1.0 sn, n3'un ORTASIDIR — ornekleme seyrek olsa bile tek frame n3'u gosterir.
const PLAYBACK_PROBE_POSITION = 1.0;

vi.mock("@/engines/ses/engine", () => ({
  playArrangement: playArrangementMock,
  getHeardPlaybackPosition: () => PLAYBACK_PROBE_POSITION,
  stopAll: stopAllMock,
}));

describe("CanonicalScorePrototype", () => {
  beforeEach(() => {
    playArrangementMock.mockClear();
    stopAllMock.mockClear();
    // rAF'i makro-task zamanlayicisina bagla: jsdom rAF'i, islemci acligi
    // altinda (tam suite paralel yuku) 5 sn boyunca hic frame uretmeyebiliyor
    // ve imlec hic ilerlemiyordu — test flaky kaliyordu. setTimeout(16ms)
    // macrotask olarak kuyruga girer; yuk altinda bile kesin ateşlenir.
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16) as unknown as number,
    );
    vi.stubGlobal("cancelAnimationFrame", (id: number) => window.clearTimeout(id));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders a clean canonical score surface with active note lineage", () => {
    render(<CanonicalScorePrototype renderer="vexflow" />);

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
    render(<CanonicalScorePrototype renderer="vexflow" />);

    const accidentalsButton = screen.getByRole("button", {name: /Arıza/});
    expect(accidentalsButton.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(accidentalsButton);

    expect(accidentalsButton.getAttribute("aria-pressed")).toBe("false");
  });

  it("maps rests and dotted source durations before engraving", () => {
    render(<CanonicalScorePrototype renderer="vexflow" />);
    const mapText = screen.getByTestId("canonical-vex-map").textContent ?? "";

    expect(mapText).toContain("score-engine-demo:hicazkar-pesrev:m1:n4:g/5:8:dotted:none");
    expect(mapText).toContain("score-engine-demo:hicazkar-pesrev:m4:n16:b/4:qr:plain:none");
  });

  it("schedules playback from canonical note ids", async () => {
    render(<CanonicalScorePrototype renderer="vexflow" />);

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

    render(<CanonicalScorePrototype renderer="vexflow" />);

    fireEvent.click(screen.getByRole("button", {name: "Motoru Çal"}));

    await waitFor(() => expect(playArrangementMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("score-engine-demo:hicazkar-pesrev:m1:n3")).toBeDefined(), {
      timeout: 5000,
    });
  });
});
