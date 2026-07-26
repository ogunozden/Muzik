import {describe, it, expect, beforeEach, vi} from "vitest";
import {render, screen, fireEvent} from "@testing-library/react";
import {MakamStepper} from "../MakamStepper";

// Ses motoru jsdom'da yok — gam calmayi sahtele.
vi.mock("@/engines/ses/engine", () => ({
  playScaleAtFrequencies: vi.fn(async () => {}),
  stopAll: vi.fn(),
}));

describe("MakamStepper", () => {
  beforeEach(() => localStorage.clear());

  it("ilk adimi (temel makam Rast) gosterir", () => {
    render(<MakamStepper />);
    expect(screen.getByRole("heading", {name: "Rast"})).toBeDefined();
    expect(screen.getByText(/0 \/ 24 ogrenildi/)).toBeDefined();
  });

  it("'Sonraki' adimi ilerletir ve tamamlandi sayar", () => {
    render(<MakamStepper />);
    fireEvent.click(screen.getByRole("button", {name: "Sonraki makam"}));
    expect(screen.getByRole("heading", {name: "Uşşak"})).toBeDefined();
    expect(screen.getByText(/1 \/ 24 ogrenildi/)).toBeDefined();
  });

  it("seyir tarifi gosterilir", () => {
    render(<MakamStepper />);
    // Rast seyir metni "Rast" perdesini anar (otoriter Gonul metni).
    expect(screen.getByText(/Seyir tarifi/)).toBeDefined();
  });

  it("'Onceki' ilk adimda devre disi", () => {
    render(<MakamStepper />);
    const prev = screen.getByRole("button", {name: "Onceki makam"}) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it("progressbar dogru azami degeri (24) tasir", () => {
    render(<MakamStepper />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuemax")).toBe("24");
  });

  /**
   * D3/D4 regresyonu — EKRANA BASILAN degerin dogrulugu.
   *
   * Eskiden `Karar: {makam.tonic}` yaziliyordu ve `tonic` 48 makamin HEPSINDE
   * "C" oldugu icin Rast, Hicaz, Segah, Evic — hepsi "Karar: C" gosteriyordu.
   * `Güçlü` ise elle yazilmis `dominant`tan geliyordu (Rast icin "G", Ussak
   * icin "E"; 11/48 makamda deger makamin kendi dizisinde bile yoktu).
   */
  describe("karar/guclu ekranda kaynakli gosterilir (D3/D4)", () => {
    it("Rast icin karar ve guclu perde ADIYLA basilir", () => {
      render(<MakamStepper />);

      expect(screen.getByText("Karar: Rast")).toBeDefined();
      expect(screen.getByText("Güçlü: Nevâ")).toBeDefined();
    });

    it("Ussak icin karar dugah, guclu nevadir", () => {
      render(<MakamStepper />);
      fireEvent.click(screen.getByRole("button", {name: "Sonraki makam"}));

      expect(screen.getByText("Karar: Dügâh")).toBeDefined();
      expect(screen.getByText("Güçlü: Nevâ")).toBeDefined();
    });

    it("hicbir adimda 'Karar: C' YAZMAZ", () => {
      render(<MakamStepper />);

      for (let step = 0; step < 24; step += 1) {
        expect(screen.queryByText("Karar: C"), `adim ${step + 1}`).toBeNull();
        const next = screen.queryByRole("button", {name: "Sonraki makam"}) as HTMLButtonElement | null;
        if (!next || next.disabled) break;
        fireEvent.click(next);
      }
    });
  });
});
