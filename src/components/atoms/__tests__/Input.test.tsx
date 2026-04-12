import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { Input } from "../Input";

vi.mock("@heroui/react", () => ({
  Input: vi.fn(({ label, className, isDisabled, ...props }) => 
    React.createElement("div", { className, "data-testid": "mock-input-container" },
      label && React.createElement("label", null, label),
      React.createElement("input", { ...props, disabled: isDisabled, "data-testid": "mock-input" })
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

describe("Input", () => {
  it("1. Renders with label text", () => {
    render(<Input label="Test Label" ariaLabel="test" />);
    expect(screen.getByText("Test Label")).toBeTruthy();
  });

  it("2. Renders with aria-label attribute", () => {
    render(<Input ariaLabel="custom-aria-label" />);
    const input = screen.getByTestId("mock-input");
    expect(input.getAttribute("aria-label")).toBe("custom-aria-label");
  });

  it("3. Renders with custom className", () => {
    render(<Input ariaLabel="test" className="custom-class" />);
    const container = screen.getByTestId("mock-input-container");
    expect(container.className).toContain("custom-class");
  });

  it("4. Forwards type prop", () => {
    render(<Input ariaLabel="test" type="email" />);
    const input = screen.getByTestId("mock-input");
    expect(input.getAttribute("type")).toBe("email");
  });

  it("5. Forwards isDisabled prop", () => {
    render(<Input ariaLabel="test" isDisabled />);
    const input = screen.getByTestId("mock-input");
    expect(input.getAttribute("disabled")).toBe("");
  });

  it("6. Forwards placeholder prop", () => {
    render(<Input ariaLabel="test" placeholder="Enter text..." />);
    const input = screen.getByTestId("mock-input");
    expect(input.getAttribute("placeholder")).toBe("Enter text...");
  });

  it("7. Forwards onChange handler", () => {
    const handleChange = vi.fn();
    render(<Input ariaLabel="test" onChange={handleChange} />);
    const input = screen.getByTestId("mock-input");
    fireEvent.change(input, { target: { value: "hello" } });
    expect(handleChange).toHaveBeenCalled();
  });

  it("8. Forwards value prop", () => {
    render(<Input ariaLabel="test" value="initial value" />);
    const input = screen.getByTestId("mock-input") as HTMLInputElement;
    expect(input.value).toBe("initial value");
  });
});
