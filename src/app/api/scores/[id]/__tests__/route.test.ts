import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { DELETE, GET, PUT } from "../route";
import { db } from "@/db";

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

const sampleScore = {
  id: 1,
  title: "Nihavend Peşrev",
  composer: null,
  makam: "nihavend",
  usul: "duyek",
  form: null,
  notesData: [{pitch: "C4", duration: 0.5, velocity: 100, startTime: 0}],
  userId: null,
  createdAt: null,
  updatedAt: null,
};

const context = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe("/api/scores/[id] route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awaits dynamic params and returns a single score", async () => {
    const where = vi.fn().mockResolvedValue([sampleScore]);
    const from = vi.fn().mockReturnValue({ where });
    vi.mocked(db.select).mockReturnValue({ from } as never);

    const response = await GET(
      new Request("http://localhost/api/scores/1") as NextRequest,
      context("1")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ score: sampleScore });
    expect(where).toHaveBeenCalled();
  });

  it("rejects invalid ids before querying the database", async () => {
    const response = await GET(
      new Request("http://localhost/api/scores/not-a-number") as NextRequest,
      context("not-a-number")
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Geçersiz ID" });
    expect(db.select).not.toHaveBeenCalled();
  });

  it("updates a score and returns the updated score shape", async () => {
    const updatedScore = { ...sampleScore, title: "Güncel eser" };
    const returning = vi.fn().mockResolvedValue([updatedScore]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    vi.mocked(db.update).mockReturnValue({ set } as never);

    const request = new Request("http://localhost/api/scores/1", {
      method: "PUT",
      body: JSON.stringify({ title: updatedScore.title }),
    }) as NextRequest;

    const response = await PUT(request, context("1"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ score: updatedScore });
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ title: updatedScore.title, updatedAt: expect.any(Date) }));
  });

  it("rejects updates with no allowed fields", async () => {
    const request = new Request("http://localhost/api/scores/1", {
      method: "PUT",
      body: JSON.stringify({ userId: 42 }),
    }) as NextRequest;

    const response = await PUT(request, context("1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("Güncellenecek alan bulunamadı");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects updates with invalid notesData", async () => {
    const request = new Request("http://localhost/api/scores/1", {
      method: "PUT",
      body: JSON.stringify({ notesData: [{ pitch: "C4", startTime: 0 }] }),
    }) as NextRequest;

    const response = await PUT(request, context("1"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("notesData");
    expect(db.update).not.toHaveBeenCalled();
  });

  it("deletes a score and returns message plus deleted score", async () => {
    const returning = vi.fn().mockResolvedValue([sampleScore]);
    const where = vi.fn().mockReturnValue({ returning });
    vi.mocked(db.delete).mockReturnValue({ where } as never);

    const response = await DELETE(
      new Request("http://localhost/api/scores/1") as NextRequest,
      context("1")
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ message: "Eser silindi", score: sampleScore });
  });
});
