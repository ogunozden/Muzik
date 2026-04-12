import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { UsulPanel } from "../UsulPanel";

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

vi.mock("@/lib/tokens", () => ({
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

describe("UsulPanel", () => {
  const defaultProps = {
    usulSelectAriaLabel: "Usul seçiniz",
    symbolGridAriaLabel: "Symbol grid",
    playButtonAriaLabel: "Çal",
    usulItems: [
      { key: "sofyan", label: "Sofyan" },
      { key: "aksaksemai", label: "Aksak Semai" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Renders LabeledSelect with label 'Usul', correct ariaLabel, items, value, onChange, placeholder", () => {
    it("should render LabeledSelect with label from i18n", () => {
      render(React.createElement(UsulPanel, defaultProps));
      const select = screen.getByTestId("mock-labeled-select");
      expect(select).toBeDefined();
      expect(select.getAttribute("data-label")).toBeTruthy();
    });

    it("should pass correct ariaLabel to LabeledSelect", () => {
      render(React.createElement(UsulPanel, defaultProps));
      const select = screen.getByRole("combobox");
      expect(select.getAttribute("aria-label")).toBe(defaultProps.usulSelectAriaLabel);
    });

    it("should pass usulItems to LabeledSelect", () => {
      render(React.createElement(UsulPanel, defaultProps));
      const options = screen.getAllByRole("option");
      expect(options.length).toBe(2);
      expect(options[0].textContent).toBe("Sofyan");
      expect(options[1].textContent).toBe("Aksak Semai");
    });
  });

  describe("Renders play Button with variant='accent', size='sm', correct ariaLabel, onPress=onPlay", () => {
    it("should render Button with variant='accent'", () => {
      render(React.createElement(UsulPanel, defaultProps));
      const button = screen.getByTestId("mock-button");
      expect(button.getAttribute("data-variant")).toBe("accent");
    });

    it("should render Button with size='sm'", () => {
      render(React.createElement(UsulPanel, defaultProps));
      const button = screen.getByTestId("mock-button");
      expect(button.getAttribute("data-size")).toBe("sm");
    });

    it("should render Button with correct ariaLabel", () => {
      render(React.createElement(UsulPanel, defaultProps));
      const button = screen.getByTestId("mock-button");
      expect(button.getAttribute("aria-label")).toBe(defaultProps.playButtonAriaLabel);
    });
  });

  describe("onPlay callback is called when play button is pressed", () => {
    it("should call onPlay when button is clicked", () => {
      const onPlay = vi.fn();
      render(React.createElement(UsulPanel, { ...defaultProps, onPlay }));
      const button = screen.getByTestId("mock-button");
      fireEvent.click(button);
      expect(onPlay).toHaveBeenCalledTimes(1);
    });
  });

  describe("onUsulChange callback is called when select changes", () => {
    it("should call onUsulChange when select value changes", () => {
      const onUsulChange = vi.fn();
      render(React.createElement(UsulPanel, { ...defaultProps, selectedUsul: "sofyan", onUsulChange }));
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "aksaksemai" } });
      expect(onUsulChange).toHaveBeenCalledWith("aksaksemai");
    });
  });

  describe("symbols grid is NOT rendered when symbols is undefined", () => {
    it("should not render symbols grid when symbols is undefined", () => {
      render(React.createElement(UsulPanel, { ...defaultProps, symbols: undefined }));
      const container = document.querySelector('[aria-label="Symbol grid"]');
      expect(container).toBeNull();
    });
  });

  describe("symbols grid is NOT rendered when symbols is empty array", () => {
    it("should not render symbols grid when symbols is empty array", () => {
      render(React.createElement(UsulPanel, { ...defaultProps, symbols: [] }));
      const container = document.querySelector('[aria-label="Symbol grid"]');
      expect(container).toBeNull();
    });
  });

  describe("symbols grid IS rendered when symbols has items", () => {
    it("should render symbols container when symbols exist", () => {
      const symbols: Array<{ beat: number; symbol: "dum" | "tek" | "ke"; isAccent: boolean; timeValue: number }> = [
        { beat: 1, symbol: "dum", isAccent: true, timeValue: 2 },
        { beat: 2, symbol: "tek", isAccent: false, timeValue: 1 },
      ];
      render(React.createElement(UsulPanel, { ...defaultProps, symbols }));
      const container = document.querySelector('[aria-label="Symbol grid"]');
      expect(container).not.toBeNull();
    });
  });

  describe("Renders with custom className", () => {
    it("should apply custom className to root element", () => {
      const { container } = render(React.createElement(UsulPanel, { ...defaultProps, className: "custom-class" }));
      expect((container.firstChild as HTMLElement)?.className).toContain("custom-class");
    });
  });
});
