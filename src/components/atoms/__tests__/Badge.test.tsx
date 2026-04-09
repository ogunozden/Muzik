import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "../Badge";

vi.mock("@heroui/react", () => {
  const MockBadge = (props: Record<string, unknown>) => (
    <span
      data-testid="mock-badge"
      aria-label={props["aria-label"] as string}
      className={props.className as string}
      data-color={props.color as string}
    >
      {props.children}
    </span>
  );
  return { Badge: vi.fn(MockBadge) };
});

vi.mock("@/lib/tokens", () => ({
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
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe("secondary");
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

  describe("HeroUI Color Mapping", () => {
    const heroColorMap: Record<string, string> = {
      primary: "primary",
      secondary: "secondary",
      accent: "secondary",
      success: "success",
      warning: "warning",
      danger: "danger",
    };

    it("maps primary to HeroUI primary color", () => {
      render(<Badge ariaLabel="test" color="primary">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(heroColorMap.primary);
    });

    it("maps secondary to HeroUI secondary color", () => {
      render(<Badge ariaLabel="test" color="secondary">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(heroColorMap.secondary);
    });

    it("maps accent to HeroUI secondary color", () => {
      render(<Badge ariaLabel="test" color="accent">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(heroColorMap.accent);
    });

    it("maps success to HeroUI success color", () => {
      render(<Badge ariaLabel="test" color="success">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(heroColorMap.success);
    });

    it("maps warning to HeroUI warning color", () => {
      render(<Badge ariaLabel="test" color="warning">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(heroColorMap.warning);
    });

    it("maps danger to HeroUI danger color", () => {
      render(<Badge ariaLabel="test" color="danger">Content</Badge>);
      expect(screen.getByTestId("mock-badge").getAttribute("data-color")).toBe(heroColorMap.danger);
    });
  });
});
