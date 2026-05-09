import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

const sampleScore = {
  id: 1,
  title: "Nihavend Peşrev",
  composer: null,
  makam: "nihavend",
  usul: "duyek",
  form: null,
  notesData: [],
  userId: null,
  createdAt: null,
  updatedAt: null,
};

describe("/api/scores route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns scores with the archive response shape", async () => {
    const from = vi.fn().mockResolvedValue([sampleScore]);
    vi.mocked(db.select).mockReturnValue({ from } as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ scores: [sampleScore] });
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
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("creates a score with the editor response shape", async () => {
    const returning = vi.fn().mockResolvedValue([sampleScore]);
    const values = vi.fn().mockReturnValue({ returning });
    vi.mocked(db.insert).mockReturnValue({ values } as never);

    const request = new Request("http://localhost/api/scores", {
      method: "POST",
      body: JSON.stringify({
        title: sampleScore.title,
        makam: sampleScore.makam,
        usul: sampleScore.usul,
        notesData: sampleScore.notesData,
      }),
    }) as NextRequest;

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ score: sampleScore });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        title: sampleScore.title,
        makam: sampleScore.makam,
        usul: sampleScore.usul,
        notesData: sampleScore.notesData,
      })
    );
  });
});
