import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

const pathnameMock = vi.hoisted(() => ({value: "/archive"}));
vi.mock("next/navigation", () => ({
  usePathname: () => pathnameMock.value,
}));

import {HubTabs} from "../HubTabs";

const TABS = [
  {href: "/archive", label: "Arşiv"},
  {href: "/samples", label: "Sesler"},
];

describe("HubTabs", () => {
  it("renders all tabs inside a labelled navigation region", () => {
    pathnameMock.value = "/archive";
    render(<HubTabs label="Kütüphane" tabs={TABS} />);

    const nav = screen.getByRole("navigation", {name: "Kütüphane"});
    expect(nav).toBeDefined();
    expect(screen.getByRole("link", {name: "Arşiv"})).toBeDefined();
    expect(screen.getByRole("link", {name: "Sesler"})).toBeDefined();
  });

  it("marks the active tab with aria-current, including nested routes", () => {
    pathnameMock.value = "/archive/detail/1";
    render(<HubTabs label="Kütüphane" tabs={TABS} />);

    expect(screen.getByRole("link", {name: "Arşiv"}).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", {name: "Sesler"}).getAttribute("aria-current")).toBeNull();
  });

  it("does not crash when the pathname is unavailable", () => {
    pathnameMock.value = null as unknown as string;
    render(<HubTabs label="Kütüphane" tabs={TABS} />);
    expect(screen.getByRole("navigation", {name: "Kütüphane"})).toBeDefined();
  });

  it("picks the longest matching href as active (nested hub)", () => {
    const nestedTabs = [
      {href: "/archive", label: "Arşiv"},
      {href: "/archive/featured", label: "Öne çıkan"},
    ];
    pathnameMock.value = "/archive/featured/item";
    render(<HubTabs label="Kütüphane" tabs={nestedTabs} />);
    expect(screen.getByRole("link", {name: "Öne çıkan"}).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", {name: "Arşiv"}).getAttribute("aria-current")).toBeNull();
  });

  it("renders with no active tab when pathname does not match", () => {
    pathnameMock.value = "/unknown";
    render(<HubTabs label="Kütüphane" tabs={TABS} />);
    expect(screen.getByRole("link", {name: "Arşiv"}).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", {name: "Sesler"}).getAttribute("aria-current")).toBeNull();
  });

  it("applies active styling via tokens", () => {
    pathnameMock.value = "/samples";
    render(<HubTabs label="Kütüphane" tabs={TABS} />);
    const active = screen.getByRole("link", {name: "Sesler"});
    expect(active.className).toContain("bg-[var(--color-primary-500)]");
  });
});
