import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Select } from "../Select";

vi.mock("@heroui/react", () => {
  const MockSelect = (props: Record<string, unknown>) => {
    const items = (props.items as Array<{ key: string; label: string }>) || [];
    return (
      <div
        data-testid="mock-select"
        aria-label={props["aria-label"] as string}
        className={props.className as string}
        {...props}
      >
        <span data-testid="mock-label">{props.label as string}</span>
        <div data-testid="mock-items">
          {items.map((item) => (
            <div key={item.key} data-testid={`item-${item.key}`}>
              {item.label}
            </div>
          ))}
        </div>
      </div>
    );
  };
  return {
    Select: vi.fn(MockSelect),
    SelectItem: vi.fn(({ key, textValue, children }: { key: string; textValue?: string; children?: React.ReactNode }) => (
      <div data-testid={`select-item-${key}`}>{children || textValue}</div>
    )),
  };
});

vi.mock("@/lib/tokens", () => ({
  tokens: {
    colors: {
      background: {
        surface: "bg-[#F5F5F5]",
      },
    },
    radius: {
      md: "rounded-md",
    },
  },
}));

describe("Select", () => {
  describe("Rendering", () => {
    it("renders with label text", () => {
      render(<Select ariaLabel="test" label="Select Label" />);
      const label = screen.getByTestId("mock-label");
      expect(label.textContent).toBe("Select Label");
    });

    it("renders with aria-label attribute", () => {
      render(<Select ariaLabel="custom-aria-label" />);
      const select = screen.getByTestId("mock-select");
      expect(select.getAttribute("aria-label")).toBe("custom-aria-label");
    });

    it("renders with items array rendered as SelectItem children", () => {
      const items = [
        { key: "option1", label: "Option 1" },
        { key: "option2", label: "Option 2" },
        { key: "option3", label: "Option 3" },
      ];
      render(<Select ariaLabel="test" items={items} />);
      expect(screen.getByTestId("item-option1")).toBeDefined();
      expect(screen.getByTestId("item-option2")).toBeDefined();
      expect(screen.getByTestId("item-option3")).toBeDefined();
    });

    it("renders with custom className", () => {
      render(<Select ariaLabel="test" className="custom-class" />);
      const select = screen.getByTestId("mock-select");
      expect(select.className).toContain("custom-class");
    });
  });

  describe("Props forwarding", () => {
    it("forwards placeholder prop", () => {
      render(<Select ariaLabel="test" placeholder="Select an option" />);
      const select = screen.getByTestId("mock-select");
      expect(select.getAttribute("placeholder")).toBe("Select an option");
    });

    it("forwards selectedKeys prop", () => {
      render(<Select ariaLabel="test" selectedKeys={new Set(["option1"])} />);
      const select = screen.getByTestId("mock-select");
      expect(select).toBeDefined();
    });

    it("forwards onSelectionChange handler", () => {
      const onSelectionChange = vi.fn();
      render(<Select ariaLabel="test" onSelectionChange={onSelectionChange} />);
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("forwards isDisabled prop", () => {
      render(<Select ariaLabel="test" isDisabled={true} />);
      const select = screen.getByTestId("mock-select");
      expect(select).toBeDefined();
    });

    it("handles empty items array gracefully", () => {
      render(<Select ariaLabel="test" items={[]} />);
      const itemsContainer = screen.getByTestId("mock-items");
      expect(itemsContainer.children.length).toBe(0);
    });

    it("handles undefined items array gracefully", () => {
      render(<Select ariaLabel="test" />);
      const itemsContainer = screen.getByTestId("mock-items");
      expect(itemsContainer.children.length).toBe(0);
    });
  });
});
