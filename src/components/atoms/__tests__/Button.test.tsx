import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Button } from "../Button";

vi.mock("@heroui/react", () => ({
  Button: vi.fn(({ children, onPress, isDisabled, className, ...props }) => 
    React.createElement("button", { 
      ...props, 
      onClick: onPress, 
      disabled: isDisabled,
      className,
      "data-testid": "mock-button" 
    }, children)
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

describe("Button", () => {
  it("1. Renders with default variant 'primary' and default size 'md'", () => {
    render(<Button ariaLabel="test">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-primary");
    expect(button.className).toContain("hover-primary");
    expect(button.className).toContain("px-4 py-2");
  });

  it("2. Renders with variant 'secondary' → className includes secondary classes", () => {
    render(<Button variant="secondary" ariaLabel="test">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-secondary");
    expect(button.className).toContain("hover-secondary");
  });

  it("3. Renders with variant 'accent' → className includes accent classes", () => {
    render(<Button variant="accent" ariaLabel="test">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-accent");
    expect(button.className).toContain("hover-accent");
  });

  it("4. Renders with variant 'bordered' → className includes bordered classes", () => {
    render(<Button variant="bordered" ariaLabel="test">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("border");
    expect(button.className).toContain("border-base");
    expect(button.className).toContain("text-primary");
  });

  it("5. Renders with variant 'light' → className includes light classes", () => {
    render(<Button variant="light" ariaLabel="test">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("bg-primary-light");
  });

  it("6. Renders with size 'xs' → className includes xs classes", () => {
    render(<Button size="xs" ariaLabel="test">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("px-2 py-0.5 text-xs");
  });

  it("7. Renders with size 'sm' → className includes sm classes", () => {
    render(<Button size="sm" ariaLabel="test">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("px-3 py-1 text-sm");
  });

  it("8. Renders with size 'lg' → className includes lg classes", () => {
    render(<Button size="lg" ariaLabel="test">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("px-6 py-3 text-lg");
  });

  it("9. Renders with custom ariaLabel passed as aria-label", () => {
    render(<Button ariaLabel="custom-label">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-label")).toBe("custom-label");
  });

  it("10. Renders with custom className appended", () => {
    render(<Button ariaLabel="test" className="custom-class">Click</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("custom-class");
  });

  it("11. Renders with children content", () => {
    render(<Button ariaLabel="test">Button Content</Button>);
    expect(screen.getByText("Button Content")).toBeTruthy();
  });

  it("12. Forwards onPress handler to HeroUIButton", () => {
    const handlePress = vi.fn();
    render(<Button ariaLabel="test" onPress={handlePress}>Click</Button>);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(handlePress).toHaveBeenCalledTimes(1);
  });

  it("13. Forwards isDisabled prop to HeroUIButton", () => {
    render(<Button ariaLabel="test" isDisabled>Click</Button>);
    const button = screen.getByRole("button");
    expect(button.getAttribute("disabled")).toBe("");
  });
});
