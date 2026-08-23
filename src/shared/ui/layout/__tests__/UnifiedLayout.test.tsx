import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({t: (key: string) => key}),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/studio",
}));

import {UnifiedLayout} from "../UnifiedLayout";

describe("UnifiedLayout accessibility", () => {
  it("exposes the primary landmark regions", () => {
    render(
      <UnifiedLayout>
        <p>içerik</p>
      </UnifiedLayout>,
    );

    expect(screen.getByRole("banner")).toBeDefined();
    expect(screen.getByRole("navigation", {name: "Main navigation"})).toBeDefined();
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByRole("contentinfo")).toBeDefined();
  });

  it("provides a skip-to-content link targeting the main region", () => {
    render(
      <UnifiedLayout>
        <p>içerik</p>
      </UnifiedLayout>,
    );

    const skip = screen.getByRole("link", {name: "İçeriğe geç"});
    expect(skip.getAttribute("href")).toBe("#main-content");
    expect(screen.getByRole("main").getAttribute("id")).toBe("main-content");
  });

  it("marks the active navigation item with aria-current", () => {
    render(
      <UnifiedLayout>
        <p>içerik</p>
      </UnifiedLayout>,
    );

    const current = document.querySelector('[aria-current="page"]');
    expect(current).not.toBeNull();
  });

  it("groups navigation into the three information-architecture hubs (F7)", () => {
    render(
      <UnifiedLayout>
        <p>içerik</p>
      </UnifiedLayout>,
    );

    // Hub etiketleri i18n key olarak render edilir (mock t = identity)
    expect(screen.getByText("nav.hubStudio")).toBeDefined();
    expect(screen.getByText("nav.hubCuration")).toBeDefined();
    expect(screen.getByText("nav.hubLibrary")).toBeDefined();

    // Her hub bir menu tasir ve alt yuzeyler menuitem olarak listelenir
    const menus = screen.getAllByRole("menu");
    expect(menus.length).toBe(3);
    expect(screen.getAllByRole("menuitem").length).toBeGreaterThanOrEqual(8);
  });

  it("renders brand link to home with correct href", () => {
    render(
      <UnifiedLayout>
        <p>içerik</p>
      </UnifiedLayout>,
    );
    const brand = screen.getByLabelText("Muzik - Türk Müziği Platformu");
    expect(brand.getAttribute("href")).toBe("/");
  });

  it("handles details/summary hub dropdown for active child", () => {
    render(
      <UnifiedLayout>
        <p>içerik</p>
      </UnifiedLayout>,
    );
    const details = document.querySelector("details");
    expect(details).not.toBeNull();
    const summary = details?.querySelector("summary");
    expect(summary).toBeDefined();
  });

  it("renders footer with year and app name", () => {
    render(
      <UnifiedLayout>
        <p>içerik</p>
      </UnifiedLayout>,
    );
    expect(screen.getByText(/© 2026/)).toBeDefined();
  });
});
