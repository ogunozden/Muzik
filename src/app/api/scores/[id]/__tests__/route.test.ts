import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { DELETE, GET, PUT } from "../route";

vi.mock("@/lib/json-store", () => {
  let store: Record<string, unknown>[] = [
    {
      id: "mock-uuid-1",
      title: "Nihavend Peşrev",
      composer: null,
      makam: "nihavend",
      usul: "duyek",
      form: null,
      notesData: [{pitch: "C4", duration: 0.5, velocity: 100, startTime: 0}],
      userId: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
  return {
    readJson: vi.fn(async () => store),
    writeJson: vi.fn(async (_path: string, data: Record<string, unknown>[]) => {
      store = data;
    }),
    generateId: vi.fn(() => "mock-uuid-new"),
  };
});

const context = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("/api/scores/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a single score by id", async () => {
    const response = await GET(
      new Request("http://localhost/api/scores/mock-uuid-1") as NextRequest,
      context("mock-uuid-1")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.score).toMatchObject({ title: "Nihavend Peşrev" });
  });

  it("returns 404 for non-existent id", async () => {
    const response = await GET(
      new Request("http://localhost/api/scores/non-existent") as NextRequest,
      context("non-existent")
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Eser bulunamadı" });
  });

  it("updates a score and returns updated", async () => {
    const request = new Request("http://localhost/api/scores/mock-uuid-1", {
      method: "PUT",
      body: JSON.stringify({ title: "Güncel eser" }),
    }) as NextRequest;

    const response = await PUT(request, context("mock-uuid-1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.score.title).toBe("Güncel eser");
  });

  it("rejects updates with no allowed fields", async () => {
    const request = new Request("http://localhost/api/scores/mock-uuid-1", {
      method: "PUT",
      body: JSON.stringify({ userId: 42 }),
    }) as NextRequest;

    const response = await PUT(request, context("mock-uuid-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Güncellenecek alan bulunamadı");
  });

  it("rejects updates with invalid notesData", async () => {
    const request = new Request("http://localhost/api/scores/mock-uuid-1", {
      method: "PUT",
      body: JSON.stringify({ notesData: [{ pitch: "C4", startTime: 0 }] }),
    }) as NextRequest;

    const response = await PUT(request, context("mock-uuid-1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("notesData");
  });

  it("deletes a score and returns message plus deleted score", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/scores/mock-uuid-1") as NextRequest,
      context("mock-uuid-1")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe("Eser silindi");
    expect(body.score.id).toBe("mock-uuid-1");
  });

  it("returns 404 when deleting non-existent score", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/scores/non-existent") as NextRequest,
      context("non-existent")
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ error: "Eser bulunamadı" });
  });
});
