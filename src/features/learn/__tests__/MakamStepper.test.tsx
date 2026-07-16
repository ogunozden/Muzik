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
});
