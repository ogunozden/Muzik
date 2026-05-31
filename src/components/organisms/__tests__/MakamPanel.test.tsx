import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { MakamPanel } from "../MakamPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/atoms/Button", () => ({
  Button: vi.fn(({ ariaLabel, onPress, children, variant, size }: { ariaLabel: string; onPress?: () => void; children: React.ReactNode; variant?: string; size?: string }) =>
    React.createElement("button", { type: "button", "data-testid": "mock-button", "aria-label": ariaLabel, onClick: onPress, "data-variant": variant, "data-size": size }, children)
  ),
}));

vi.mock("@/components/molecules/LabeledSelect", () => ({
  LabeledSelect: vi.fn(({ label, ariaLabel, items, value, onChange, placeholder }: { label: string; ariaLabel: string; items: Array<{ key: string; label: string }>; value?: string; onChange?: (key: string) => void; placeholder?: string }) =>
    React.createElement("div", { "data-testid": "mock-labeled-select", "data-label": label },
      React.createElement("select", { "aria-label": ariaLabel, "data-value": value, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange?.(e.target.value), placeholder },
        items.map((item) => React.createElement("option", { key: item.key, value: item.key }, item.label))
      )
    )
  ),
}));

vi.mock("@/shared/tokens", () => ({
  tokens: {
    colors: {
      primary: { base: "bg-primary", hover: "hover-primary", light: "bg-primary-light" },
      secondary: { base: "bg-secondary", hover: "hover-secondary" },
      accent: { base: "bg-accent", hover: "hover-accent" },
      background: { surface: "bg-surface", base: "bg-base" },
      border: { base: "border-base" },
      text: { primary: "text-primary", secondary: "text-secondary" },
    },
    radius: { md: "rounded-md", lg: "rounded-lg", sm: "rounded-sm", full: "rounded-full" },
    spacing: { sm: "p-2" },
  },
}));

describe("MakamPanel", () => {
  const defaultProps = {
    makamSelectAriaLabel: "Makam seçiniz",
    instrumentSelectAriaLabel: "Enstrüman seçiniz",
    scaleDisplayAriaLabel: "Scale display",
    playButtonAriaLabel: "Çal",
    makamItems: [
      { key: "rast", label: "Rast" },
      { key: "hicaz", label: "Hicaz" },
    ],
    instrumentItems: [
      { key: "ney", label: "Ney" },
      { key: "ud", label: "Ud" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Renders LabeledSelect with label 'Makam', correct ariaLabel, items, value, onChange, placeholder", () => {
    it("should render LabeledSelect with label 'makam.makam'", () => {
      render(React.createElement(MakamPanel, defaultProps));
      const selects = screen.getAllByTestId("mock-labeled-select");
      const makamSelect = selects.find((s) => s.getAttribute("data-label") === "makam.makam");
      expect(makamSelect).toBeDefined();
    });

    it("should pass correct ariaLabel to LabeledSelect", () => {
      render(React.createElement(MakamPanel, defaultProps));
      const select = screen.getByRole("combobox", {name: /Makam seçiniz/i});
      expect(select).toBeDefined();
    });

    it("should pass makamItems to LabeledSelect", () => {
      render(React.createElement(MakamPanel, defaultProps));
      const options = screen.getAllByRole("option");
      const makamOptions = options.filter((o) => o.textContent === "Rast" || o.textContent === "Hicaz");
      expect(makamOptions.length).toBe(2);
    });

    it("should render with correct placeholder", () => {
      render(React.createElement(MakamPanel, defaultProps));
      const select = screen.getByRole("combobox", {name: /Makam seçiniz/i});
      expect(select.getAttribute("placeholder")).toBe("makam.makamPlaceholder");
    });
  });

  describe("Renders play Button with variant='accent', size='sm', correct ariaLabel, onPress=onPlay", () => {
    it("should render Button with variant='accent'", () => {
      render(React.createElement(MakamPanel, defaultProps));
      const button = screen.getByTestId("mock-button");
      expect(button.getAttribute("data-variant")).toBe("accent");
    });

    it("should render Button with size='sm'", () => {
      render(React.createElement(MakamPanel, defaultProps));
      const button = screen.getByTestId("mock-button");
      expect(button.getAttribute("data-size")).toBe("sm");
    });

    it("should render Button with correct ariaLabel", () => {
      render(React.createElement(MakamPanel, defaultProps));
      const button = screen.getByTestId("mock-button");
      expect(button.getAttribute("aria-label")).toBe(defaultProps.playButtonAriaLabel);
    });
  });

  describe("onPlay callback is called when play button is pressed", () => {
    it("should call onPlay when button is clicked", () => {
      const onPlay = vi.fn();
      render(React.createElement(MakamPanel, { ...defaultProps, onPlay }));
      const button = screen.getByTestId("mock-button");
      fireEvent.click(button);
      expect(onPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe("onMakamChange callback is called when select changes (via LabeledSelect onChange)", () => {
    it("should call onMakamChange when select value changes", () => {
      const onMakamChange = vi.fn();
      render(React.createElement(MakamPanel, { ...defaultProps, selectedMakam: "rast", onMakamChange }));
      const select = screen.getByRole("combobox", {name: /Makam seçiniz/i});
      fireEvent.change(select, { target: { value: "hicaz" } });
      expect(onMakamChange).toHaveBeenCalledWith("hicaz");
    });
  });

  describe("scaleDisplay is NOT rendered when scaleDisplay prop is undefined", () => {
    it("should not render scaleDisplay section when prop is undefined", () => {
      render(React.createElement(MakamPanel, { ...defaultProps, scaleDisplay: undefined }));
      const container = document.querySelector('[aria-label="Scale display"]');
      expect(container).toBeNull();
    });
  });

  describe("scaleDisplay IS rendered when scaleDisplay prop is provided (name + notes array)", () => {
    it("should render scaleDisplay name", () => {
      const scaleDisplay = { name: "Rast Makam", notes: ["C", "D", "E", "F", "G"] };
      render(React.createElement(MakamPanel, { ...defaultProps, scaleDisplay }));
      expect(screen.getByText("Rast Makam")).toBeDefined();
    });

    it("should render all notes", () => {
      const scaleDisplay = { name: "Rast Makam", notes: ["C", "D", "E", "F", "G"] };
      render(React.createElement(MakamPanel, { ...defaultProps, scaleDisplay }));
      scaleDisplay.notes.forEach((note) => {
        expect(screen.getByText(note)).toBeDefined();
      });
    });
  });

  describe("scaleDisplay container has aria-label matching scaleDisplayAriaLabel", () => {
    it("should have correct aria-label on container", () => {
      const scaleDisplay = { name: "Rast Makam", notes: ["C"] };
      render(React.createElement(MakamPanel, { ...defaultProps, scaleDisplay }));
      const container = document.querySelector('[aria-label="Scale display"]');
      expect(container).not.toBeNull();
    });
  });

  describe("Each note in scaleDisplay.notes is rendered as a span with correct classes", () => {
    it("should render notes as spans", () => {
      const scaleDisplay = { name: "Rast Makam", notes: ["C", "D"] };
      render(React.createElement(MakamPanel, { ...defaultProps, scaleDisplay }));
      const notes = screen.getByText("C");
      expect(notes.tagName).toBe("SPAN");
    });
  });

  describe("Renders with custom className", () => {
    it("should apply custom className to root element", () => {
      const { container } = render(React.createElement(MakamPanel, { ...defaultProps, className: "custom-class" }));
      expect((container.firstChild as HTMLElement)?.className).toContain("custom-class");
    });
  });
});
