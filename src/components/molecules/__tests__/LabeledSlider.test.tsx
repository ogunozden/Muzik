import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LabeledSlider } from "../LabeledSlider";

vi.mock("@/lib/tokens", () => ({
  tokens: {
    colors: {
      primary: {
        base: "bg-[#5C4033] text-white",
        hover: "hover:bg-[#4A3428]",
        light: "bg-[#8B7355] text-white",
      },
      secondary: {
        base: "bg-[#8B7355] text-white",
        hover: "hover:bg-[#725F46]",
      },
      text: {
        primary: "text-[#1A1A1A]",
        secondary: "text-[#6B6B6B]",
      },
      border: {
        base: "border-[#E5E0D8]",
      },
    },
    spacing: {
      xs: "p-1",
      sm: "p-2",
      md: "p-4",
    },
    radius: {
      sm: "rounded-sm",
      md: "rounded-md",
    },
  },
}));

describe("LabeledSlider", () => {
  describe("Rendering", () => {
    it("renders label text", () => {
      render(
        <LabeledSlider
          label="Volume"
          ariaLabel="Volume slider"
        />
      );
      expect(screen.getByText("Volume")).toBeDefined();
    });

    it("renders Slider with aria-label", () => {
      render(
        <LabeledSlider
          label="Volume"
          ariaLabel="Volume slider"
        />
      );
      const slider = screen.getByTestId("mock-slider");
      expect(slider).toBeDefined();
      expect(slider.getAttribute("aria-label")).toBe("Volume slider");
    });

    it("renders with custom className", () => {
      const { container } = render(
        <LabeledSlider
          label="Volume"
          ariaLabel="Volume slider"
          className="custom-wrapper-class"
        />
      );
      expect((container.firstChild as HTMLElement)?.classList.contains("custom-wrapper-class")).toBe(true);
    });
  });

  describe("Props forwarding", () => {
    it("forwards minValue, maxValue, step, value props to Slider", () => {
      render(
        <LabeledSlider
          label="Volume"
          ariaLabel="Volume slider"
          minValue={0}
          maxValue={100}
          step={5}
          value={50}
        />
      );
      const slider = screen.getByTestId("mock-slider");
      expect(slider.getAttribute("min")).toBe("0");
      expect(slider.getAttribute("max")).toBe("100");
      expect(slider.getAttribute("step")).toBe("5");
      expect(slider.getAttribute("value")).toBe("50");
    });

    it("forwards onChange handler to Slider", () => {
      const onChange = vi.fn();
      render(
        <LabeledSlider
          label="Volume"
          ariaLabel="Volume slider"
          onChange={onChange}
        />
      );
      const slider = screen.getByTestId("mock-slider");
      fireEvent.change(slider, { target: { value: 75 } });
      expect(onChange).toHaveBeenCalled();
    });

    it("forwards isDisabled prop to Slider", () => {
      render(
        <LabeledSlider
          label="Volume"
          ariaLabel="Volume slider"
          isDisabled={true}
        />
      );
      const slider = screen.getByTestId("mock-slider");
      expect(slider.hasAttribute("disabled")).toBe(true);
    });
  });
});
