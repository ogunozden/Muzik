import {describe, it, expect, beforeEach, vi} from "vitest";
import React from "react";
import {render, screen, fireEvent} from "@testing-library/react";
import {LearningStepper} from "../LearningStepper";

// Ses motoru jsdom'da yok — sahte controller. UsulNotation SVG'sini de sadelestir.
vi.mock("@/engines/ses/engine", () => ({
  startRhythmLoop: vi.fn(async () => ({
    getPositionBeats: () => 0,
    getCycleCount: () => 1,
    getOutputLatencySeconds: () => 0,
    retune: () => {},
    stop: () => {},
  })),
  stopAll: vi.fn(),
}));

vi.mock("@/shared/ui/organisms/UsulNotation", () => ({
  UsulNotation: React.forwardRef(function MockNotation() {
    return React.createElement("div", {"data-testid": "usul-notation"});
  }),
}));

describe("LearningStepper", () => {
  beforeEach(() => localStorage.clear());

  it("ilk adimi (en kucuk usul) gosterir", () => {
    render(<LearningStepper />);
    // getByRole/getByText bulunamazsa firlatir — varlik icin yeterli.
    expect(screen.getByRole("heading", {name: "Nimsofyan"})).toBeDefined();
    expect(screen.getByText(/0 \/ 26 ogrenildi/)).toBeDefined();
  });

  it("'Sonraki' adimi ilerletir ve tamamlandi sayar", () => {
    render(<LearningStepper />);
    fireEvent.click(screen.getByRole("button", {name: "Sonraki usul"}));
    expect(screen.getByRole("heading", {name: "Semai"})).toBeDefined();
    expect(screen.getByText(/1 \/ 26 ogrenildi/)).toBeDefined();
  });

  it("'Ogrendim' isaretleme ilerlemeyi artirir", () => {
    render(<LearningStepper />);
    fireEvent.click(screen.getByRole("button", {name: "Ogrendim olarak isaretle"}));
    expect(screen.getByText(/1 \/ 26 ogrenildi/)).toBeDefined();
  });

  it("'Onceki' ilk adimda devre disi", () => {
    render(<LearningStepper />);
    const prev = screen.getByRole("button", {name: "Onceki usul"}) as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
  });

  it("progressbar dogru azami degeri tasir", () => {
    render(<LearningStepper />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuemax")).toBe("26");
    expect(bar.getAttribute("aria-valuenow")).toBe("0");
  });
});
