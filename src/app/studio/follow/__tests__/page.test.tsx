import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import type {ReactNode} from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {koma53ToFrequency} from "@/data/pieces/hicazkarPesrev";
import EserTakipPage from "../page";

const playArrangementMock = vi.hoisted(() => vi.fn(async () => 1));
const stopAllMock = vi.hoisted(() => vi.fn());
const layoutMockState = vi.hoisted(() => ({
  verifiedBoxes: [] as Array<{
    rowIndex: number;
    candidateIndexInRow: number;
    x: number;
    y: number;
    width: number;
    height: number;
    leftPercent: number;
    topPercent: number;
    widthPercent: number;
    heightPercent: number;
    measureIndex: number;
    confidence: "verified";
    verifiedAt: string;
    reviewer: string;
    method: "human-reviewed" | "visual-regression";
    sourceCandidateRowIndex: number;
    sourceCandidateIndexInRow: number;
  }>,
}));

vi.mock("@/components/layout/UnifiedLayout", () => ({
  UnifiedLayout: ({children}: {children: ReactNode}) => <main>{children}</main>,
}));

vi.mock("@/engines/ses/engine", () => ({
  playArrangement: playArrangementMock,
  stopAll: stopAllMock,
}));

vi.mock("@/data/symbtr/layout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/data/symbtr/layout")>();

  return {
    ...actual,
    getSymbTrVerifiedPdfMeasureBoxes: (catalogId: string) =>
      catalogId === "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey"
        ? layoutMockState.verifiedBoxes
        : actual.getSymbTrVerifiedPdfMeasureBoxes(catalogId),
    getSymbTrPdfLayoutVerificationStatus: (catalogId: string) => {
      const status = actual.getSymbTrPdfLayoutVerificationStatus(catalogId);

      if (
        catalogId === "hicazkar--pesrev--devrikebir----tanburi_buyuk_osman_bey" &&
        layoutMockState.verifiedBoxes.length > 0
      ) {
        return {
          ...status,
          verifiedMeasureBoxCount: layoutMockState.verifiedBoxes.length,
          status: "verified" as const,
        };
      }

      return status;
    },
  };
});

const SCORE_FIXTURE = [
  "Sira\tKod\tNota53\tNotaAE\tKoma53\tKomaAE\tPay\tPayda\tMs\tLNS\tBas\tSoz1\tOffset",
  "1\t51\t\t\t0\t0\t28\t4\t0\t60\t0\tDevr-i Kebîr\t0.0",
  "2\t9\tFa5#4\tF5#4\t344\t344\t1\t4\t833\t95\t96\t1. HANE\t0.0357142857143",
  "3\t9\tLa5\tA5\t358\t358\t1\t4\t833\t95\t96\t\t0.0714285714286",
  "4\t9\tSol5\tG5\t352\t352\t3\t16\t625\t95\t96\t\t0.0982142857143",
].join("\n");

function mockFetch(scoreFixtures: Record<string, string> = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = input.toString();

    if (url.includes("/api/samples")) {
      return new Response(JSON.stringify({slots: []}), {
        headers: {"Content-Type": "application/json"},
        status: 200,
      });
    }

    const matchingFixture = Object.entries(scoreFixtures).find(([urlPart]) => url.includes(urlPart))?.[1];
    return new Response(matchingFixture ?? SCORE_FIXTURE, {status: 200});
  });
}

describe("EserTakipPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch());
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    Object.defineProperty(URL, "createObjectURL", {
      value: vi.fn((file: File) => `blob:test/${file.name}`),
      configurable: true,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      value: vi.fn(),
      configurable: true,
    });
    playArrangementMock.mockClear();
    stopAllMock.mockClear();
    layoutMockState.verifiedBoxes = [];
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds another piece from notation images instead of requiring a txt link", async () => {
    render(<EserTakipPage />);

    const image = new File(["image"], "rast-pesrev.png", {type: "image/png"});
    fireEvent.change(screen.getByLabelText("Eser adı"), {target: {value: "Rast Deneme Peşrev"}});
    fireEvent.change(screen.getByLabelText("Nota görselleri"), {target: {files: [image]}});
    fireEvent.click(screen.getByRole("button", {name: "Parçayı ekle ve seç"}));

    await waitFor(() => expect(screen.getByRole("heading", {name: "Rast Deneme Peşrev"})).toBeDefined());
    expect(screen.getByText("Rast Deneme Peşrev görsellerle eklendi ve takip için seçildi.")).toBeDefined();
    expect(screen.getByText(/Aktif satır: 1\. sayfa üst satır/)).toBeDefined();
    expect(screen.queryByLabelText("SymbTr TXT bağlantısı")).toBeNull();
  });

  it("fills visual piece metadata from the local SymbTr catalog without adding duplicates by URL", () => {
    render(<EserTakipPage />);

    fireEvent.change(screen.getByLabelText("SymbTr katalog ara"), {target: {value: "aldanma dunya"}});
    fireEvent.click(
      screen.getByRole("button", {
        name: /Katalogdan doldur acem--ilahi--duyek--aldanma_dunya--zekai_dede/,
      }),
    );

    expect(screen.getByDisplayValue("Aldanma Dunya")).toBeDefined();
    expect(screen.getByDisplayValue("Zekai Dede")).toBeDefined();
    expect(screen.getByDisplayValue("Acem")).toBeDefined();
    expect(screen.getByDisplayValue("İlahi")).toBeDefined();
    expect(
      screen.getByText(
        "acem--ilahi--duyek--aldanma_dunya--zekai_dede katalog bilgisi forma işlendi; nota görseli ekleyince parça seçilebilir.",
      ),
    ).toBeDefined();
  });

  it("shows deterministic local SymbTr archive sources for catalog-backed pieces", async () => {
    render(<EserTakipPage />);

    fireEvent.change(screen.getByLabelText("SymbTr katalog ara"), {target: {value: "aldanma dunya"}});
    fireEvent.click(
      screen.getByRole("button", {
        name: /Katalogdan doldur acem--ilahi--duyek--aldanma_dunya--zekai_dede/,
      }),
    );

    const image = new File(["image"], "aldanma-dunya.png", {type: "image/png"});
    fireEvent.change(screen.getByLabelText("Nota görselleri"), {target: {files: [image]}});
    fireEvent.click(screen.getByRole("button", {name: "Parçayı ekle ve seç"}));

    await waitFor(() => expect(screen.getByRole("heading", {name: "Aldanma Dunya"})).toBeDefined());
    expect(screen.getByRole("link", {name: "SymbTr v3 Zenodo"})).toBeDefined();
    expect(screen.getByRole("link", {name: "MTG/SymbTr GitHub"})).toBeDefined();
    expect(screen.getByText("Yerel SymbTr kaynakları: 5 format")).toBeDefined();
    expect(screen.getByText("SymbTr TXT")).toBeDefined();
    expect(screen.getByText("MusicXML")).toBeDefined();
    expect(screen.getByText("PDF nota")).toBeDefined();
    expect(screen.getByText("txt_v3/acem--ilahi--duyek--aldanma_dunya--zekai_dede.txt")).toBeDefined();
  });

  it("requires at least one notation image before adding a visual piece", () => {
    render(<EserTakipPage />);

    fireEvent.change(screen.getByLabelText("Eser adı"), {target: {value: "Görselsiz Parça"}});
    fireEvent.click(screen.getByRole("button", {name: "Parçayı ekle ve seç"}));

    expect(screen.getByText("Parça eklemek için eser adı ve en az bir nota görseli gerekli.")).toBeDefined();
    expect(screen.getByRole("heading", {name: "Hicazkar Peşrev"})).toBeDefined();
  });

  it("rejects non-image files for visual piece import", () => {
    render(<EserTakipPage />);

    const textFile = new File(["txt"], "nota.txt", {type: "text/plain"});
    fireEvent.change(screen.getByLabelText("Nota görselleri"), {target: {files: [textFile]}});

    expect(screen.getByText("Parça eklemek için yalnızca PNG, JPG, GIF veya WebP görselleri seç.")).toBeDefined();
  });

  it("rejects duplicate visual pieces instead of adding the same images twice", async () => {
    render(<EserTakipPage />);

    const image = new File(["image"], "rast-pesrev.png", {type: "image/png"});
    fireEvent.change(screen.getByLabelText("Eser adı"), {target: {value: "Rast Deneme Peşrev"}});
    fireEvent.change(screen.getByLabelText("Nota görselleri"), {target: {files: [image]}});
    fireEvent.click(screen.getByRole("button", {name: "Parçayı ekle ve seç"}));

    await waitFor(() => expect(screen.getByRole("heading", {name: "Rast Deneme Peşrev"})).toBeDefined());

    fireEvent.change(screen.getByLabelText("Eser adı"), {target: {value: "Rast Deneme Peşrev"}});
    fireEvent.change(screen.getByLabelText("Nota görselleri"), {target: {files: [image]}});
    fireEvent.click(screen.getByRole("button", {name: "Parçayı ekle ve seç"}));

    expect(screen.getByText("Bu görsel parça zaten parça listesinde.")).toBeDefined();
    expect(screen.getByText("2 parça")).toBeDefined();
  });

  it("does not add more than one visual piece on rapid double submit", async () => {
    render(<EserTakipPage />);

    const image = new File(["image"], "cift-tik.png", {type: "image/png"});
    fireEvent.change(screen.getByLabelText("Eser adı"), {target: {value: "Çift Tık Deneme"}});
    fireEvent.change(screen.getByLabelText("Nota görselleri"), {target: {files: [image]}});

    const submitButton = screen.getByRole("button", {name: "Parçayı ekle ve seç"});
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    await waitFor(() => expect(screen.getByRole("heading", {name: "Çift Tık Deneme"})).toBeDefined());
    expect(screen.getByText("2 parça")).toBeDefined();
  });

  it("allows tempo adjustment from the BPM number field", () => {
    render(<EserTakipPage />);

    fireEvent.change(screen.getByLabelText("BPM değeri"), {target: {value: "96"}});

    expect(screen.getAllByText("96 BPM").length).toBeGreaterThan(0);
  });

  it("renders notes with Turkish solfege names and real notation symbols", async () => {
    render(<EserTakipPage />);

    await screen.findAllByText("Fa♯4/5");

    expect(screen.getAllByText("Fa♯4/5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("La5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("♩").length).toBeGreaterThan(0);
    expect(screen.getAllByText("♪.").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SymbTr F5#4/).length).toBeGreaterThan(0);
  });

  it("allows adding melodic layers and changing the single percussion layer", () => {
    render(<EserTakipPage />);

    fireEvent.change(screen.getByLabelText("Melodik enstrüman ekle"), {target: {value: "ney"}});
    fireEvent.click(screen.getByRole("button", {name: "Ekle"}));

    fireEvent.change(screen.getByLabelText("Vurmalı enstrüman ekle"), {target: {value: "def"}});
    fireEvent.click(screen.getByRole("button", {name: "Değiştir"}));

    expect(screen.getByText("Ney · ezgi")).toBeDefined();
    expect(screen.getByText("Def · vuruş")).toBeDefined();
    expect(screen.queryByText("Kudüm · vuruş")).toBeNull();
    expect(screen.getByText("Vuruş enstrümanı değiştirildi; vurmalı katmanlar üst üste bindirilmez.")).toBeDefined();
  });

  it("prevents duplicate melodic layers that would stack the same sound", () => {
    render(<EserTakipPage />);

    fireEvent.change(screen.getByLabelText("Melodik enstrüman ekle"), {target: {value: "ney"}});
    fireEvent.click(screen.getByRole("button", {name: "Ekle"}));
    fireEvent.click(screen.getByRole("button", {name: "Ekle"}));

    expect(screen.getByText("Ney · ezgi")).toBeDefined();
    expect(screen.getByText("Ney zaten ezgi katmanlarında var.")).toBeDefined();
  });

  it("normalizes melodic layer gains before scheduling arrangement playback", async () => {
    render(<EserTakipPage />);

    await screen.findAllByText("Fa♯4/5");
    fireEvent.click(screen.getByRole("button", {name: "Parçayı çal"}));

    await waitFor(() => expect(playArrangementMock).toHaveBeenCalled());
    const calls = playArrangementMock.mock.calls as unknown as [Array<{gain: number}>][];
    const scheduledNotes = calls[0][0];
    const firstEventGainTotal = scheduledNotes.slice(0, 3).reduce((total, note) => total + note.gain, 0);

    expect(firstEventGainTotal).toBeLessThanOrEqual(0.34);
  });

  it("schedules the default piece with the reference ahenk and Devr-i Kebir darb starts", async () => {
    render(<EserTakipPage />);

    await screen.findAllByText("Fa♯4/5");
    fireEvent.click(screen.getByRole("button", {name: "Parçayı çal"}));

    await waitFor(() => expect(playArrangementMock).toHaveBeenCalled());
    const calls = playArrangementMock.mock.calls as unknown as [
      Array<{targetFrequency?: number}>,
      Array<{startTime: number; symbol: string; isAccent: boolean}>,
    ][];
    const scheduledNotes = calls[0][0];
    const percussionHits = calls[0][1];

    expect(scheduledNotes[0].targetFrequency).toBeCloseTo(koma53ToFrequency(353), 5);
    expect(percussionHits[0]).toMatchObject({startTime: 0, symbol: "dum", isAccent: true});
    expect(percussionHits[1]).toMatchObject({symbol: "dum"});
    expect(percussionHits[1].startTime).toBeCloseTo((3 - 1) * (60 / 72), 5);
    expect(percussionHits.some((hit) => hit.symbol === "tek" && hit.startTime === 60 / 72)).toBe(false);
  });

  it("keeps visual page tracking and usul cue inside the main follow context", async () => {
    render(<EserTakipPage />);

    await screen.findByText(/Aktif ölçü: 1\. ölçü/);

    expect(screen.getByText(/Ahenk: Kız Neyi - 4 Ses - A/)).toBeDefined();
    expect(screen.getByText("Rast=A4")).toBeDefined();
    expect(screen.getByText("Sayfa eşleme")).toBeDefined();
    expect(screen.getByText("Yakın notalar")).toBeDefined();
    expect(screen.getByText(/Aktif satır: 1\. sayfa üst satır/)).toBeDefined();
    expect(screen.getByText(/Takip noktası: 1\. sayfa üst satır · x 6% \/ y 22%/)).toBeDefined();
    expect(screen.getByText("Yerel SymbTr kaynakları: 5 format")).toBeDefined();
    expect(screen.getByText(/PDF vektör ölçü adayları: 49 aday · 10 porte satırı/)).toBeDefined();
    expect(screen.getByText(/Bu veriler kesin ölçü kutusu olarak işaretlenmez/)).toBeDefined();
    expect(screen.getByText(/Doğrulanmış PDF ölçü kutusu: 0 · durum unreviewed-candidates/)).toBeDefined();
    expect(screen.getAllByText("1. sayfa / 3").length).toBeGreaterThan(0);
    expect(screen.getByText(/Usul Devr-i Kebir · 28\/4 · darp Dü-üm/)).toBeDefined();
    expect(screen.queryByText("Devr-i Kebir vuruşları")).toBeNull();
  });

  it("surfaces manifest-approved PDF measure boxes separately from candidates", async () => {
    layoutMockState.verifiedBoxes = [
      {
        rowIndex: 0,
        candidateIndexInRow: 0,
        x: 14.22,
        y: 712.08,
        width: 166.854,
        height: 21,
        leftPercent: 2.389,
        topPercent: 12.936,
        widthPercent: 28.032,
        heightPercent: 2.494,
        measureIndex: 1,
        confidence: "verified",
        verifiedAt: "2026-05-10",
        reviewer: "visual-regression",
        method: "visual-regression",
        sourceCandidateRowIndex: 0,
        sourceCandidateIndexInRow: 0,
      },
    ];

    render(<EserTakipPage />);

    await screen.findByText(/Doğrulanmış PDF ölçü kutusu: 1 · durum verified/);

    expect(screen.getByText(/Aktif doğrulanmış PDF ölçüsü: 1\. ölçü/)).toBeDefined();
    expect(screen.getByText("Doğrulanmış PDF ölçü haritası")).toBeDefined();
    expect(screen.getByLabelText("Doğrulanmış PDF ölçü kutuları")).toBeDefined();
  });
});
