import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET, POST } from "../route";

vi.mock("@/lib/json-store", () => {
  let store: unknown[] = [];
  return {
    readJson: vi.fn(async () => store),
    writeJson: vi.fn(async (_path: string, data: unknown) => {
      store = data as unknown[];
    }),
    generateId: vi.fn(() => "mock-uuid-12345"),
  };
});

const sampleScore = {
  id: "mock-uuid-12345",
  title: "Nihavend Peşrev",
  composer: null,
  makam: "nihavend",
  usul: "duyek",
  form: null,
  notesData: [{pitch: "C4", duration: 0.5, velocity: 100, startTime: 0}],
  userId: null,
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

describe("/api/scores route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns scores with the archive response shape", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ scores: [] });
  });

  it("rejects create requests with missing required fields", async () => {
    const request = new Request("http://localhost/api/scores", {
      method: "POST",
      body: JSON.stringify({ title: "Eksik eser" }),
    }) as NextRequest;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Zorunlu alanlar eksik");
  });

  it("rejects create requests when notesData is not a note event array", async () => {
    const request = new Request("http://localhost/api/scores", {
      method: "POST",
      body: JSON.stringify({
        title: sampleScore.title,
        makam: sampleScore.makam,
        usul: sampleScore.usul,
        notesData: [{pitch: "C4", duration: 0}],
      }),
    }) as NextRequest;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("notesData");
  });

  it("creates a score with timestamps and ignores body userId", async () => {
    const request = new Request("http://localhost/api/scores", {
      method: "POST",
      body: JSON.stringify({
        title: "Nihavend Peşrev",
        makam: "nihavend",
        usul: "duyek",
        notesData: [{pitch: "C4", duration: 0.5, velocity: 100, startTime: 0}],
        userId: 42,
      }),
    }) as NextRequest;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.score).toMatchObject({
      title: "Nihavend Peşrev",
      makam: "nihavend",
      usul: "duyek",
      userId: null,
    });
    expect(body.score.id).toBe("mock-uuid-12345");
    expect(body.score.createdAt).toEqual(expect.any(String));
    expect(body.score.updatedAt).toEqual(expect.any(String));
  });
});
