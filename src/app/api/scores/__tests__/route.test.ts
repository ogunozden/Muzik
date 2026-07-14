import {afterAll, beforeEach, describe, expect, it} from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type {NextRequest} from "next/server";
import {resetDatabaseForTests} from "@/core/infrastructure/persistence/database";

const DB_PATH = path.join(os.tmpdir(), `muzik-scores-test-${process.pid}.db`);
process.env.MUZIK_DB_PATH = DB_PATH;

import {GET, POST} from "../route";

function cleanDatabase(): void {
  resetDatabaseForTests();
  for (const suffix of ["", "-wal", "-shm"]) {
    try {
      fs.rmSync(DB_PATH + suffix);
    } catch {
      // dosya yoksa sorun degil
    }
  }
}

describe("/api/scores route", () => {
  beforeEach(cleanDatabase);
  afterAll(cleanDatabase);

  it("returns scores with the archive response shape", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({scores: []});
  });

  it("rejects create requests with missing required fields", async () => {
    const request = new Request("http://localhost/api/scores", {
      method: "POST",
      body: JSON.stringify({title: "Eksik eser"}),
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
        title: "Nihavend Peşrev",
        makam: "nihavend",
        usul: "duyek",
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
    expect(typeof body.score.id).toBe("string");
    expect(body.score.id.length).toBeGreaterThan(0);
    expect(body.score.createdAt).toEqual(expect.any(String));
    expect(body.score.updatedAt).toEqual(expect.any(String));
  });

  it("persists created scores so a subsequent GET returns them", async () => {
    const request = new Request("http://localhost/api/scores", {
      method: "POST",
      body: JSON.stringify({
        title: "Rast Peşrev",
        makam: "rast",
        usul: "duyek",
        notesData: [{pitch: "C4", duration: 0.5, startTime: 0}],
      }),
    }) as NextRequest;

    await POST(request);
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scores).toHaveLength(1);
    expect(body.scores[0]).toMatchObject({title: "Rast Peşrev", makam: "rast"});
  });
});
