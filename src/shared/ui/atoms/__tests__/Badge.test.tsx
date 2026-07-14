import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge";

vi.mock("@/shared/tokens", () => ({
  tokens: {
    colors: {
      primary: { base: "bg-[#5C4033] text-white" },
      secondary: { base: "bg-[#8B7355] text-white" },
      accent: { base: "bg-[#8B7355] text-white" },
    },
    radius: { full: "rounded-full" },
  },
}));

describe("Badge", () => {
  describe("Rendering", () => {
    it("renders with default color (primary)", () => {
      render(<Badge ariaLabel="test">Content</Badge>);
      const badge = screen.getByTestId("mock-badge");
      expect(badge).toBeDefined();
      expect(badge.getAttribute("data-color")).toBe("primary");
    });

    it("renders with primary color", () => {
      render(<Badge ariaLabel="test" color="primary">Primary</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe("primary");
    });

    it("renders with secondary color", () => {
      render(<Badge ariaLabel="test" color="secondary">Secondary</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe("secondary");
    });

    it("renders with accent color", () => {
      render(<Badge ariaLabel="test" color="accent">Accent</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe("accent");
    });

    it("renders with success color", () => {
      render(<Badge ariaLabel="test" color="success">Success</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe("success");
    });

    it("renders with warning color", () => {
      render(<Badge ariaLabel="test" color="warning">Warning</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe("warning");
    });

    it("renders with danger color", () => {
      render(<Badge ariaLabel="test" color="danger">Danger</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe("danger");
    });

    it("renders with custom ariaLabel passed to aria-label", () => {
      render(<Badge ariaLabel="custom-aria-label">Content</Badge>);
      const badge = screen.getByTestId("mock-badge");
      expect(badge.getAttribute("aria-label")).toBe("custom-aria-label");
    });

    it("renders with custom className", () => {
      render(<Badge ariaLabel="test" className="custom-class">Content</Badge>);
      const badge = screen.getByTestId("mock-badge");
      expect(badge.className).toContain("custom-class");
    });

    it("renders with children content", () => {
      render(<Badge ariaLabel="test">Children Content</Badge>);
      expect(screen.getByText("Children Content")).toBeDefined();
    });
  });

  describe("Semantic color data", () => {
    const semanticColorMap: Record<string, string> = {
      primary: "primary",
      secondary: "secondary",
      accent: "accent",
      success: "success",
      warning: "warning",
      danger: "danger",
    };

    it("keeps primary semantic color", () => {
      render(<Badge ariaLabel="test" color="primary">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(semanticColorMap.primary);
    });

    it("keeps secondary semantic color", () => {
      render(<Badge ariaLabel="test" color="secondary">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(semanticColorMap.secondary);
    });

    it("keeps accent color semantic", () => {
      render(<Badge ariaLabel="test" color="accent">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(semanticColorMap.accent);
    });

    it("keeps success semantic color", () => {
      render(<Badge ariaLabel="test" color="success">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(semanticColorMap.success);
    });

    it("keeps warning semantic color", () => {
      render(<Badge ariaLabel="test" color="warning">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(semanticColorMap.warning);
    });

    it("keeps danger semantic color", () => {
      render(<Badge ariaLabel="test" color="danger">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(semanticColorMap.danger);
    });
  });
});
